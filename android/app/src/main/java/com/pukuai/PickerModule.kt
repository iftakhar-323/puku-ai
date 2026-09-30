package com.pukuai

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.io.File
import java.io.FileOutputStream

class PickerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var pendingPromise: Promise? = null

    companion object {
        private const val REQUEST_PICK_MEDIA = 49102
    }

    private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode == REQUEST_PICK_MEDIA) {
                val promise = pendingPromise
                pendingPromise = null
                if (promise == null) return

                if (resultCode != Activity.RESULT_OK || data?.data == null) {
                    // User cancelled or no file selected
                    promise.resolve(null)
                    return
                }

                val uri: Uri = data.data ?: run {
                    promise.resolve(null)
                    return
                }

                Thread {
                    try {
                        var displayName = "file_${System.currentTimeMillis()}"
                        var fileSize: Long = 0

                        reactContext.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                            if (cursor.moveToFirst()) {
                                val nameIdx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                                if (nameIdx != -1) {
                                    val name = cursor.getString(nameIdx)
                                    if (!name.isNullOrEmpty()) displayName = name
                                }
                                val sizeIdx = cursor.getColumnIndex(OpenableColumns.SIZE)
                                if (sizeIdx != -1) {
                                    fileSize = cursor.getLong(sizeIdx)
                                }
                            }
                        }

                        val mimeType = reactContext.contentResolver.getType(uri) ?: "application/octet-stream"

                        val inputStream = reactContext.contentResolver.openInputStream(uri)
                        val bytes = inputStream?.readBytes() ?: ByteArray(0)
                        inputStream?.close()

                        if (fileSize == 0L) fileSize = bytes.size.toLong()

                        // Cache local copy so React Native Image / local paths work seamlessly
                        val cleanName = displayName.replace("[^a-zA-Z0-9._-]".toRegex(), "_")
                        val cacheFile = File(reactContext.cacheDir, "picked_${System.currentTimeMillis()}_$cleanName")
                        FileOutputStream(cacheFile).use { it.write(bytes) }

                        val base64Str = Base64.encodeToString(bytes, Base64.NO_WRAP)

                        val result = Arguments.createMap().apply {
                            putString("uri", Uri.fromFile(cacheFile).toString())
                            putString("name", displayName)
                            putString("type", mimeType)
                            putDouble("size", fileSize.toDouble())
                            putString("base64", base64Str)
                        }
                        promise.resolve(result)
                    } catch (e: Exception) {
                        promise.reject("PICKER_ERROR", e.message, e)
                    }
                }.start()
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = "PukuPicker"

    @ReactMethod
    fun pickMedia(options: ReadableMap?, promise: Promise) {
        val currentAct = reactContext.currentActivity
        if (currentAct == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }

        if (pendingPromise != null) {
            pendingPromise?.resolve(null)
            pendingPromise = null
        }

        pendingPromise = promise

        try {
            val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                type = "*/*"
                addCategory(Intent.CATEGORY_OPENABLE)
            }
            val chooser = Intent.createChooser(intent, "Select Any File or Photo")
            currentAct.startActivityForResult(chooser, REQUEST_PICK_MEDIA)
        } catch (e: Exception) {
            pendingPromise = null
            promise.reject("PICKER_LAUNCH_ERROR", e.message, e)
        }
    }
}
