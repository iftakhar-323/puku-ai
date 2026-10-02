package com.pukuai

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Base64
import androidx.core.content.FileProvider
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
    private var currentPhotoPath: String? = null

    companion object {
        private const val REQUEST_PICK_MEDIA = 49102
        private const val REQUEST_TAKE_PHOTO = 49103
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
            } else if (requestCode == REQUEST_TAKE_PHOTO) {
                val promise = pendingPromise
                pendingPromise = null
                if (promise == null) return

                val photoPath = currentPhotoPath
                currentPhotoPath = null

                if (resultCode != Activity.RESULT_OK || photoPath == null) {
                    if (photoPath != null) {
                        try { File(photoPath).delete() } catch (_: Exception) {}
                    }
                    promise.resolve(null)
                    return
                }

                Thread {
                    try {
                        val file = File(photoPath)
                        if (!file.exists() || file.length() == 0L) {
                            promise.resolve(null)
                            return@Thread
                        }

                        val bytes = file.readBytes()
                        val base64Str = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        val displayName = file.name
                        val mimeType = "image/jpeg"

                        val result = Arguments.createMap().apply {
                            putString("uri", Uri.fromFile(file).toString())
                            putString("name", displayName)
                            putString("type", mimeType)
                            putDouble("size", file.length().toDouble())
                            putString("base64", base64Str)
                        }
                        promise.resolve(result)
                    } catch (e: Exception) {
                        promise.reject("CAMERA_ERROR", e.message, e)
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

    @ReactMethod
    fun takePhoto(options: ReadableMap?, promise: Promise) {
        val currentAct = reactContext.currentActivity
        if (currentAct == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }

        if (pendingPromise != null) {
            pendingPromise?.resolve(null)
            pendingPromise = null
        }

        try {
            val photoFile = File.createTempFile("camera_${System.currentTimeMillis()}_", ".jpg", reactContext.cacheDir)
            currentPhotoPath = photoFile.absolutePath

            val photoUri: Uri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                photoFile
            )

            pendingPromise = promise

            val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            currentAct.startActivityForResult(intent, REQUEST_TAKE_PHOTO)
        } catch (e: Exception) {
            pendingPromise = null
            currentPhotoPath?.let {
                try { File(it).delete() } catch (_: Exception) {}
            }
            currentPhotoPath = null
            promise.reject("CAMERA_LAUNCH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun uploadAttachment(
        url: String,
        filePath: String,
        fileName: String,
        mimeType: String,
        token: String?,
        promise: Promise
    ) {
        Thread {
            var connection: java.net.HttpURLConnection? = null
            try {
                val cleanPath = if (filePath.startsWith("file://")) {
                    Uri.parse(filePath).path ?: filePath.removePrefix("file://")
                } else {
                    filePath
                }
                val file = File(cleanPath)
                if (!file.exists()) {
                    promise.reject("FILE_NOT_FOUND", "File not found at $cleanPath")
                    return@Thread
                }

                val boundary = "===" + System.currentTimeMillis() + "==="
                val lineEnd = "\r\n"
                val twoHyphens = "--"

                val targetUrl = java.net.URL(url)
                connection = (targetUrl.openConnection() as java.net.HttpURLConnection).apply {
                    doInput = true
                    doOutput = true
                    useCaches = false
                    requestMethod = "POST"
                    setRequestProperty("Connection", "Keep-Alive")
                    setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
                    setRequestProperty("Accept", "application/json")
                    if (!token.isNullOrEmpty()) {
                        setRequestProperty("Authorization", "Bearer $token")
                    }
                }

                val outputStream = java.io.DataOutputStream(connection.outputStream)

                // Multipart Part for 'file'
                outputStream.writeBytes(twoHyphens + boundary + lineEnd)
                outputStream.writeBytes("Content-Disposition: form-data; name=\"file\"; filename=\"$fileName\"$lineEnd")
                val effectiveMime = if (mimeType.isNotEmpty()) mimeType else "application/octet-stream"
                outputStream.writeBytes("Content-Type: $effectiveMime$lineEnd")
                outputStream.writeBytes(lineEnd)

                val fileInputStream = java.io.FileInputStream(file)
                val buffer = ByteArray(8192)
                var bytesRead: Int
                while (fileInputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                }
                fileInputStream.close()

                outputStream.writeBytes(lineEnd)
                outputStream.writeBytes(twoHyphens + boundary + twoHyphens + lineEnd)
                outputStream.flush()
                outputStream.close()

                val responseCode = connection.responseCode
                val inputStream = if (responseCode in 200..299) {
                    connection.inputStream
                } else {
                    connection.errorStream ?: connection.inputStream
                }

                val responseText = inputStream.bufferedReader().use { it.readText() }

                if (responseCode !in 200..299) {
                    promise.reject("UPLOAD_FAILED", "Server error ($responseCode): $responseText")
                    return@Thread
                }

                val json = org.json.JSONObject(responseText)
                val attJson = json.optJSONObject("attachment") ?: json

                val result = Arguments.createMap().apply {
                    putString("id", attJson.optString("id"))
                    putString("name", attJson.optString("name", fileName))
                    putString("r2Key", attJson.optString("r2Key"))
                    putString("mime", attJson.optString("mime", effectiveMime))
                    putInt("bytes", attJson.optInt("bytes", file.length().toInt()))
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("UPLOAD_ERROR", e.message, e)
            } finally {
                connection?.disconnect()
            }
        }.start()
    }
}
