package com.pukuai

import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Locale
import java.util.UUID

class TtsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var tts: TextToSpeech? = null
    private var isReady = false
    private val mainHandler = Handler(Looper.getMainLooper())
    // Calls made before init finishes (or while re-initializing) replay once ready.
    private val pendingSpeak = mutableListOf<String>()

    override fun getName(): String = "PukuTts"

    private fun sendEvent(eventName: String, params: Any?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (_: Exception) {}
    }

    private fun ensureInitialized() {
        if (tts != null) return
        tts = TextToSpeech(reactContext) { status ->
            isReady = status == TextToSpeech.SUCCESS
            if (isReady) {
                tts?.language = Locale.getDefault()
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {
                        sendEvent("onTtsStart", null)
                    }

                    override fun onDone(utteranceId: String?) {
                        sendEvent("onTtsDone", null)
                    }

                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        sendEvent("onTtsError", null)
                    }
                })
                val queued = pendingSpeak.toList()
                pendingSpeak.clear()
                queued.forEach { speakNow(it) }
            } else {
                sendEvent("onTtsError", null)
            }
        }
    }

    private fun speakNow(text: String) {
        val utteranceId = UUID.randomUUID().toString()
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun speak(text: String, promise: Promise) {
        mainHandler.post {
            try {
                ensureInitialized()
                if (isReady) {
                    speakNow(text)
                } else {
                    pendingSpeak.add(text)
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("TTS_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        mainHandler.post {
            try {
                tts?.stop()
                pendingSpeak.clear()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("TTS_ERROR", e.message, e)
            }
        }
    }
}
