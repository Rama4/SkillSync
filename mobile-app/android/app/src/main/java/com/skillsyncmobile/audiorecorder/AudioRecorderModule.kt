package com.skillsyncmobile.audiorecorder

import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.IOException
import java.util.*

class AudioRecorderModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    private var mediaRecorder: MediaRecorder? = null
    private var mediaPlayer: MediaPlayer? = null
    private var currentFilePath: String? = null
    private var isRecording = false
    private var isPlaying = false
    private var recordingStartTime: Long = 0
    private var durationTimer: Timer? = null

    override fun getName(): String = "AudioRecorderModule"

    // Check if RECORD_AUDIO permission is granted
    @ReactMethod
    fun checkPermission(promise: Promise) {
        val hasPermission = ContextCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        
        promise.resolve(hasPermission)
    }

    // Get the current status of the recorder
    @ReactMethod
    fun getStatus(promise: Promise) {
        val status = Arguments.createMap().apply {
            putBoolean("isRecording", isRecording)
            putBoolean("isPlaying", isPlaying)
            putString("currentFilePath", currentFilePath)
            if (isRecording) {
                putDouble("duration", (System.currentTimeMillis() - recordingStartTime) / 1000.0)
            }
        }
        promise.resolve(status)
    }

    // Start recording with options
    @ReactMethod
    fun startRecording(options: ReadableMap, promise: Promise) {
        if (isRecording) {
            promise.reject("ALREADY_RECORDING", "Recording is already in progress")
            return
        }

        // Check permission first
        if (ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            promise.reject("PERMISSION_DENIED", "RECORD_AUDIO permission not granted")
            return
        }

        try {
            // Generate filename
            val filename = options.getString("filename") 
                ?: "recording_${System.currentTimeMillis()}.m4a"
            
            // Get output directory (app's cache or files directory)
            val outputDir = options.getString("outputDir") 
                ?: reactApplicationContext.cacheDir.absolutePath
            
            currentFilePath = "$outputDir/$filename"

            // Ensure directory exists
            File(outputDir).mkdirs()

            // Configure MediaRecorder
            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(reactApplicationContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            mediaRecorder?.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                
                // Audio quality settings
                val sampleRate = if (options.hasKey("sampleRate")) 
                    options.getInt("sampleRate") else 44100
                val bitRate = if (options.hasKey("bitRate")) 
                    options.getInt("bitRate") else 128000
                val channels = if (options.hasKey("channels")) 
                    options.getInt("channels") else 1
                
                setAudioSamplingRate(sampleRate)
                setAudioEncodingBitRate(bitRate)
                setAudioChannels(channels)
                setOutputFile(currentFilePath)

                prepare()
                start()
            }

            isRecording = true
            recordingStartTime = System.currentTimeMillis()
            
            // Start duration timer to emit events
            startDurationTimer()

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("filePath", currentFilePath)
            }
            promise.resolve(result)

        } catch (e: IOException) {
            cleanupRecorder()
            promise.reject("RECORDING_ERROR", "Failed to start recording: ${e.message}")
        } catch (e: Exception) {
            cleanupRecorder()
            promise.reject("RECORDING_ERROR", "Unexpected error: ${e.message}")
        }
    }

    // Stop recording and return file path
    @ReactMethod
    fun stopRecording(promise: Promise) {
        if (!isRecording) {
            promise.reject("NOT_RECORDING", "No recording in progress")
            return
        }

        try {
            stopDurationTimer()
            
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            isRecording = false

            val duration = (System.currentTimeMillis() - recordingStartTime) / 1000.0
            
            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("filePath", currentFilePath)
                putDouble("duration", duration)
            }
            promise.resolve(result)

        } catch (e: Exception) {
            cleanupRecorder()
            promise.reject("STOP_ERROR", "Failed to stop recording: ${e.message}")
        }
    }

    // Cancel recording (stop and delete file)
    @ReactMethod
    fun cancelRecording(promise: Promise) {
        if (!isRecording) {
            promise.resolve(true)
            return
        }

        try {
            stopDurationTimer()
            
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            isRecording = false

            // Delete the file
            currentFilePath?.let { path ->
                File(path).delete()
            }
            currentFilePath = null

            promise.resolve(true)

        } catch (e: Exception) {
            cleanupRecorder()
            promise.reject("CANCEL_ERROR", "Failed to cancel recording: ${e.message}")
        }
    }

    // Start playback
    @ReactMethod
    fun startPlayback(filePath: String, promise: Promise) {
        if (isPlaying) {
            promise.reject("ALREADY_PLAYING", "Playback is already in progress")
            return
        }

        val file = File(filePath)
        if (!file.exists()) {
            promise.reject("FILE_NOT_FOUND", "Audio file not found: $filePath")
            return
        }

        try {
            mediaPlayer = MediaPlayer().apply {
                setDataSource(filePath)
                setOnCompletionListener {
                    this@AudioRecorderModule.isPlaying = false
                    sendEvent("onPlaybackComplete", Arguments.createMap().apply {
                        putString("filePath", filePath)
                    })
                }
                setOnErrorListener { _, what, extra ->
                    this@AudioRecorderModule.isPlaying = false
                    sendEvent("onPlaybackError", Arguments.createMap().apply {
                        putInt("errorCode", what)
                        putInt("errorExtra", extra)
                    })
                    true
                }
                prepare()
                start()
            }
            
            isPlaying = true

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putInt("duration", mediaPlayer?.duration ?: 0)
            }
            promise.resolve(result)

        } catch (e: Exception) {
            cleanupPlayer()
            promise.reject("PLAYBACK_ERROR", "Failed to start playback: ${e.message}")
        }
    }

    // Stop playback
    @ReactMethod
    fun stopPlayback(promise: Promise) {
        if (!isPlaying) {
            promise.resolve(true)
            return
        }

        try {
            mediaPlayer?.apply {
                stop()
                release()
            }
            mediaPlayer = null
            isPlaying = false
            promise.resolve(true)

        } catch (e: Exception) {
            cleanupPlayer()
            promise.reject("STOP_PLAYBACK_ERROR", "Failed to stop playback: ${e.message}")
        }
    }

    // Pause playback
    @ReactMethod
    fun pausePlayback(promise: Promise) {
        if (!isPlaying || mediaPlayer == null) {
            promise.reject("NOT_PLAYING", "No playback in progress")
            return
        }

        try {
            mediaPlayer?.pause()
            isPlaying = false
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PAUSE_ERROR", "Failed to pause playback: ${e.message}")
        }
    }

    // Resume playback
    @ReactMethod
    fun resumePlayback(promise: Promise) {
        if (mediaPlayer == null) {
            promise.reject("NO_PLAYER", "No media player initialized")
            return
        }

        try {
            mediaPlayer?.start()
            isPlaying = true
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RESUME_ERROR", "Failed to resume playback: ${e.message}")
        }
    }

    // Delete audio file
    @ReactMethod
    fun deleteFile(filePath: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (file.exists()) {
                val deleted = file.delete()
                promise.resolve(deleted)
            } else {
                promise.resolve(true) // File doesn't exist, consider it deleted
            }
        } catch (e: Exception) {
            promise.reject("DELETE_ERROR", "Failed to delete file: ${e.message}")
        }
    }

    // Get audio file info
    @ReactMethod
    fun getFileInfo(filePath: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File not found: $filePath")
                return
            }

            // Get duration using MediaPlayer
            val player = MediaPlayer()
            player.setDataSource(filePath)
            player.prepare()
            val duration = player.duration
            player.release()

            val result = Arguments.createMap().apply {
                putString("filePath", filePath)
                putDouble("size", file.length().toDouble())
                putInt("duration", duration)
                putBoolean("exists", true)
            }
            promise.resolve(result)

        } catch (e: Exception) {
            promise.reject("FILE_INFO_ERROR", "Failed to get file info: ${e.message}")
        }
    }

    // Private helper methods
    private fun startDurationTimer() {
        durationTimer = Timer()
        durationTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                if (isRecording) {
                    val duration = (System.currentTimeMillis() - recordingStartTime) / 1000.0
                    sendEvent("onRecordingProgress", Arguments.createMap().apply {
                        putDouble("duration", duration)
                    })
                }
            }
        }, 0, 500) // Emit every 500ms
    }

    private fun stopDurationTimer() {
        durationTimer?.cancel()
        durationTimer = null
    }

    private fun cleanupRecorder() {
        stopDurationTimer()
        try {
            mediaRecorder?.release()
        } catch (e: Exception) {
            // Ignore cleanup errors
        }
        mediaRecorder = null
        isRecording = false
    }

    private fun cleanupPlayer() {
        try {
            mediaPlayer?.release()
        } catch (e: Exception) {
            // Ignore cleanup errors
        }
        mediaPlayer = null
        isPlaying = false
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // Required for event emitter
    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for RN built-in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required for RN built-in Event Emitter Calls
    }

    // Cleanup when module is destroyed
    override fun invalidate() {
        super.invalidate()
        cleanupRecorder()
        cleanupPlayer()
    }
}
