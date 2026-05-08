package com.rajarsheechatterjee.TikTokTTS

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.media.PlaybackParams
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import okhttp3.*
import okio.ByteString
import org.json.JSONObject
import java.security.MessageDigest
import java.util.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentSkipListSet
import java.util.concurrent.atomic.AtomicInteger

class TikTokTTSModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var audioTrack: AudioTrack? = null
    private val client = OkHttpClient()
    
    private val bufferMap = ConcurrentHashMap<String, ByteArray>()
    private val preloadingTexts = Collections.synchronizedList(mutableListOf<String>())
    private val currentlySynthesizing = ConcurrentSkipListSet<String>()
    private val openWebSockets = Collections.synchronizedSet(mutableSetOf<WebSocket>())
    
    private val activeWebSockets = AtomicInteger(0)
    private var isPlaying = false
    private var isPaused = false
    private var currentVoice: String? = null
    private var queueSize: Int = 3
    private var currentRate: Float = 1.0f
    private var currentPitch: Float = 1.0f
    private var isStopped = false
    private var waitingForHash: String? = null

    override fun getName(): String = "TikTokTTS"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun getHash(text: String, voice: String?): String {
        val input = "${voice ?: ""}:$text"
        val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    @ReactMethod
    fun updateQueue(sentences: ReadableArray, voice: String) {
        this.currentVoice = voice
        synchronized(preloadingTexts) {
            preloadingTexts.clear()
            for (i in 0 until sentences.size()) {
                preloadingTexts.add(sentences.getString(i))
            }
        }
        processQueues()
    }

    @ReactMethod
    fun speak(text: String, voice: String, queueSize: Int, rate: Double, pitch: Double) {
        this.currentVoice = voice
        this.queueSize = queueSize
        this.currentRate = rate.toFloat()
        this.currentPitch = pitch.toFloat()
        this.isStopped = false
        
        val hash = getHash(text, voice)
        val audioData = bufferMap[hash]
        if (audioData != null) {
            playAudio(audioData)
        } else {
            waitingForHash = hash
            if (!currentlySynthesizing.contains(hash)) {
                activeWebSockets.incrementAndGet()
                currentlySynthesizing.add(hash)
                startWebSocket(text, voice, hash)
            }
        }
    }

    @ReactMethod
    fun pause() {
        audioTrack?.pause()
        isPaused = true
    }

    @ReactMethod
    fun resume() {
        if (isPaused) {
            audioTrack?.play()
            isPaused = false
        }
    }

    @ReactMethod
    fun stop() {
        isStopped = true
        audioTrack?.stop()
        audioTrack?.release()
        audioTrack = null
        bufferMap.clear()
        preloadingTexts.clear()
        currentlySynthesizing.clear()
        activeWebSockets.set(0)
        isPlaying = false
        isPaused = false
        waitingForHash = null

        synchronized(openWebSockets) {
            for (ws in openWebSockets) {
                ws.close(1001, "Stopped")
            }
            openWebSockets.clear()
        }
        retryMap.clear()
    }

    private fun processQueues() {
        if (isStopped || currentVoice == null) return

        synchronized(preloadingTexts) {
            while (activeWebSockets.get() < queueSize && preloadingTexts.isNotEmpty()) {
                val nextText = preloadingTexts.firstOrNull { 
                    val hash = getHash(it, currentVoice)
                    !bufferMap.containsKey(hash) && !currentlySynthesizing.contains(hash)
                } ?: break
                
                val hash = getHash(nextText, currentVoice)
                activeWebSockets.incrementAndGet()
                currentlySynthesizing.add(hash)
                startWebSocket(nextText, currentVoice!!, hash)
            }
        }
    }

    private val retryMap = ConcurrentHashMap<String, Int>()

    private fun startWebSocket(text: String, voice: String, hash: String) {
        val url = "wss://sami-normal-sg.capcutapi.com/internal/api/v1/ws?device_id=7486429558272460289&iid=7486431924195657473&app_id=359289&region=VN&update_version_code=5.7.1.2101&version_code=5.7.1&appKey=ddjeqjLGMn&device_type=macos&device_platform=macos"
        
        val request = Request.Builder().url(url).build()
        val ws = client.newWebSocket(request, object : WebSocketListener() {
            private var pcmBuffer = mutableListOf<Byte>()

            override fun onOpen(webSocket: WebSocket, response: Response) {
                openWebSockets.add(webSocket)
                val message = createTikTokMessage(text, voice)
                webSocket.send(message)
                if (waitingForHash == hash) {
                    sendEvent("TikTokTTS_onStart", null)
                }
            }

            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                if (isStopped) {
                    webSocket.close(1000, null)
                    return
                }
                val data = bytes.toByteArray()
                try {
                    val textStr = String(data)
                    if (textStr.contains("\"event\"")) {
                        onMessage(webSocket, textStr)
                        return
                    }
                } catch (e: Exception) {}
                pcmBuffer.addAll(data.toList())
            }

            override fun onMessage(webSocket: WebSocket, textMsg: String) {
                if (isStopped) {
                    webSocket.close(1000, null)
                    return
                }
                try {
                    val json = JSONObject(textMsg)
                    if (json.has("event")) {
                        val event = json.getString("event")
                        if (event == "TaskFailed") {
                            val code = if (json.has("status_code")) json.getInt("status_code") else -1
                            val msg = if (json.has("status_text")) json.getString("status_text") else "Unknown"
                            handleFailure(webSocket, hash, "TaskFailed: $code - $msg")
                        } else if (event == "TaskEnd" || event == "TaskFinished") {
                            handleSuccess(webSocket, hash, pcmBuffer.toByteArray())
                        }
                    }
                } catch (e: Exception) {
                    // Not JSON, ignore
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                handleFailure(webSocket, hash, t.message ?: "Connection Failure")
            }

            private fun handleSuccess(webSocket: WebSocket, hash: String, data: ByteArray) {
                webSocket.close(1000, null)
                openWebSockets.remove(webSocket)
                currentlySynthesizing.remove(hash)
                retryMap.remove(hash)
                activeWebSockets.decrementAndGet()
                bufferMap[hash] = data
                if (waitingForHash == hash) {
                    waitingForHash = null
                    playAudio(data)
                }
                processQueues()
            }

            private fun handleFailure(webSocket: WebSocket, hash: String, errorMsg: String) {
                webSocket.close(1000, null)
                openWebSockets.remove(webSocket)
                val retries = retryMap[hash] ?: 0
                if (retries < 3 && !isStopped) {
                    retryMap[hash] = retries + 1
                    // Retry after a short delay
                    Timer().schedule(object : TimerTask() {
                        override fun run() {
                            if (!isStopped) {
                                startWebSocket(text, voice, hash)
                            } else {
                                cleanup()
                            }
                        }
                    }, 100)
                } else {
                    cleanup()
                    if (waitingForHash == hash) {
                        waitingForHash = null
                        sendEvent("TikTokTTS_onError", Arguments.createMap().apply {
                            putString("message", errorMsg)
                        })
                        // Skip to next
                        sendEvent("TikTokTTS_onDone", null)
                    }
                }
            }

            private fun cleanup() {
                currentlySynthesizing.remove(hash)
                retryMap.remove(hash)
                activeWebSockets.decrementAndGet()
                processQueues()
            }
        })
    }

    private fun createTikTokMessage(text: String, voice: String): String {
        val payload = JSONObject().apply {
            put("audio_config", JSONObject().apply {
                put("bit_rate", 128000)
                put("format", "pcm")
                put("sample_rate", 24000)
            })
            put("speaker", voice)
            put("text", text.trim())
        }

        return JSONObject().apply {
            put("appkey", "ddjeqjLGMn")
            put("event", "StartTask")
            put("namespace", "TTS")
            put("payload", payload.toString())
            put("token", "WTV6R2t6V3ZwNUIwQkFETutGxuveRZ9iTmOBC/a3wzMS7zzza86Ky9nIfYhyeoSiWYP1ZO04X7X1+RThg/zczU6u8ga3dTIJpduvWpCqrmr0Kv7BJf6tcGFgevJ/Jaa1slHj/l4NUJ/eCesl1dYBYQ51oKbuFnZjF7qXVWzsoz326XwRdNEmOufSHnuW+kuy+sS7K/sn3gVWsCC4XFi+FYntDxrVTYS/Pv2LtBgpgULmib5+5kMq2ZuJfCDYvq4NthciciB6KUCf1sOsu7VD/27Tquz8Q58NYALFvX85bjvxQJOz0iV3oUiip0RyqR1ltZPNI/LgN2OGCphyCgOJdlUUdgIbSJpaKL+5PMTM4yBuwCU4QPbYYzTs9x2ZA+7zt41ng+i5+EPtePyDjR4VFTz+7zglLw/E+KqN/nscyqLCyrumn4YgfQ3JYnSnz1WLE6q3aD175yweKBj9f9jyqxnLVmEYy9VjmoxuYNRgVmfT6M17bT9iL0PJTlJ6UqKHuNRT6ubv37ZSr961Gw+RJhyLUDBt8AD1B8YDdF4OImS+LgGjfujaY1agc4tfrnk4V4YcAXyTRlYwLMC9ATDp9CbiBrlMBmYm88gwGaTR9pbI2KcQ4Kg86jZYc6CxNM34sbMG/1LlmqvqLe+E3IG6ebOmyVbL+kYK70c1fT5TcmzVwX5O3JGkHHtFoeCmd4Eyyov6QsO1Jewx0gpjp05dqw==")
            put("version", "sdk_v1")
        }.toString()
    }

    private fun playAudio(audioData: ByteArray) {
        if (isStopped) return
        
        // Stop current audio if playing
        audioTrack?.stop()
        audioTrack?.release()
        
        isPlaying = true
        isPaused = false

        val sampleRate = 24000
        val minBufferSize = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        audioTrack = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(Math.max(audioData.size, minBufferSize))
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()

        audioTrack?.write(audioData, 0, audioData.size)
        
        // Apply playback params for Android 6.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val params = PlaybackParams()
                params.speed = currentRate
                params.pitch = currentPitch
                audioTrack?.playbackParams = params
            } catch (e: Exception) {
                // Ignore if failed to set params
            }
        }
        
        // 16-bit PCM = 2 bytes per sample. Marker is position in frames.
        val frames = audioData.size / 2
        audioTrack?.setNotificationMarkerPosition(frames)
        
        audioTrack?.setPlaybackPositionUpdateListener(object : AudioTrack.OnPlaybackPositionUpdateListener {
            override fun onMarkerReached(track: AudioTrack?) {
                track?.stop()
                track?.release()
                if (track == audioTrack) {
                    audioTrack = null
                    isPlaying = false
                    sendEvent("TikTokTTS_onDone", null)
                }
            }

            override fun onPeriodicNotification(track: AudioTrack?) {}
        })

        audioTrack?.play()
    }
}
