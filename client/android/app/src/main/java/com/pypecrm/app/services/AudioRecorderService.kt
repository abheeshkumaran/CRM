package com.pypecrm.app.services

import android.content.Context
import android.media.AudioManager
import android.media.MediaRecorder
import android.os.Build
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class AudioRecorderService(private val context: Context) {
    private var recorder: MediaRecorder? = null
    private var isRecording = false
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var currentRecordingFile: File? = null

    fun startRecording(leadId: String, currentPhoneNum: String): File? {
        if (isRecording) {
            Log.w("AudioRecorder", "Already recording.")
            return null
        }

        try {
            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val fileName = "CRM_Call_${leadId}_${currentPhoneNum}_${timestamp}.mp4"
            currentRecordingFile = File(context.cacheDir, fileName)

            // Revert to standard hardware-friendly mode
            audioManager.mode = AudioManager.MODE_NORMAL
            // We keep speakerphone state unmodified here to avoid disrupting the call flow.
            // If the accessibility service workaround fails, we will force speakerphone ON in the fallback.
            val mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            try {
                recorder = mediaRecorder.apply {
                    // Use VOICE_RECOGNITION - works with Accessibility Service workaround to capture both sides
                    setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
                    setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                    setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                    setAudioSamplingRate(44100)
                    setAudioEncodingBitRate(96000)
                    setOutputFile(currentRecordingFile!!.absolutePath)
                    
                    prepare()
                    start()
                }
                
                isRecording = true
                Log.d("AudioRecorder", "Started standard recording: ${currentRecordingFile!!.absolutePath}")
                return currentRecordingFile
            } catch (e: Exception) {
                Log.e("AudioRecorder", "Failed to start with VOICE_RECOGNITION, trying MIC with speakerphone", e)
                // Single fallback for communication
                try {
                    // Force speakerphone ON so the MIC can pick up the other person's voice
                    audioManager.isSpeakerphoneOn = true
                    
                    mediaRecorder.reset()
                    mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC)
                    mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                    mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                    mediaRecorder.setOutputFile(currentRecordingFile!!.absolutePath)
                    mediaRecorder.prepare()
                    mediaRecorder.start()
                    isRecording = true
                    return currentRecordingFile
                } catch (e2: Exception) {
                    Log.e("AudioRecorder", "All recording attempts failed", e2)
                    return null
                }
            }
        } catch (e: Exception) {
            Log.e("AudioRecorder", "General failure", e)
            return null
        }
    }

    fun stopRecording() {
        if (!isRecording) return

        try {
            recorder?.apply {
                stop()
                release()
            }
        } catch (e: Exception) {
            Log.e("AudioRecorder", "Failed to stop recording cleanly", e)
        } finally {
            recorder = null
            isRecording = false
            Log.d("AudioRecorder", "Stopped recording call.")
        }
    }
}
