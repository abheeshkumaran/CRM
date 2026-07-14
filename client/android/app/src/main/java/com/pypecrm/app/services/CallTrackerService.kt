package com.pypecrm.app.services

import android.app.*
import android.content.*
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.pypecrm.app.MainActivity
import com.pypecrm.app.data.AppDatabase
import com.pypecrm.app.data.CallBufferEntity
import com.pypecrm.app.data.SyncQueueEntry
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class CallTrackerService : Service() {

    private val NOTIFICATION_ID = 101
    private val CHANNEL_ID = "call_tracker_channel"
    
    private var isCallActive = false
    private var callStartTime: Long = 0
    private var currentNumber: String? = null
    private var isOutgoing = false
    private var currentSessionId: String? = null
    private lateinit var recorderService: AudioRecorderService
    private var currentCallFile: java.io.File? = null

    override fun onCreate() {
        super.onCreate()
        recorderService = AudioRecorderService(applicationContext)
        createNotificationChannel()
        val initialNotification = createNotification("Call Tracker Active", "Waiting for calls...")
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, initialNotification, ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
            } else {
                startForeground(NOTIFICATION_ID, initialNotification)
            }
        } catch (e: Exception) {
            Log.e("CallTracker", "Critical: Failed to start foreground service", e)
            // Fallback: Try starting without specific types if possible
            try {
                startForeground(NOTIFICATION_ID, initialNotification)
            } catch (e2: Exception) {
                Log.e("CallTracker", "Total failure to start foreground", e2)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        val number = intent?.getStringExtra("number")
        val isOutgoingIntent = intent?.getBooleanExtra("is_outgoing", false) ?: false

        when (action) {
            "ACTION_START_TRACKING" -> {
                startTrackingLogic(number, isOutgoingIntent)
            }
            "ACTION_STOP_TRACKING" -> {
                stopTracking()
            }
        }

        return START_STICKY
    }

    private fun startTrackingLogic(number: String?, isOutgoing: Boolean) {
        if (isCallActive) return
        this.currentNumber = number
        this.isOutgoing = isOutgoing
        this.callStartTime = System.currentTimeMillis()
        this.isCallActive = true

        val crmPrefs = applicationContext.getSharedPreferences("crm_prefs", Context.MODE_PRIVATE)
        val pendingId = crmPrefs.getString("pending_session_id", null)

        if (pendingId != null) {
            this.currentSessionId = pendingId
            crmPrefs.edit().remove("pending_session_id").apply()
        } else {
            this.currentSessionId = java.util.UUID.randomUUID().toString()
        }

        val sessId = this.currentSessionId
        if (sessId != null && number != null) {
            val db = AppDatabase.getDatabase(applicationContext)
            CoroutineScope(Dispatchers.IO).launch {
                db.callBufferDao().insert(CallBufferEntity(
                    callSessionId = sessId,
                    phoneNumber = number,
                    startTime = callStartTime,
                    type = if (isOutgoing) "OUTGOING" else "INCOMING"
                ))
            }
        }

        if (number != null) {
            currentCallFile = recorderService.startRecording("lead", number)
        }

        updateNotification("Call Tracking Active", "Monitoring call with ${number ?: "Unknown"}")
    }

    private fun stopTracking() {
        if (isCallActive) {
            val finalNumber = currentNumber
            val wasOutgoing = isOutgoing
            val sessionId = currentSessionId
            // Use callStartTime as the authoritative timestamp (captured at call start, not post-call)
            val capturedStartTime = callStartTime
            val duration = (System.currentTimeMillis() - capturedStartTime) / 1000

            recorderService.stopRecording()
            val recordingFile = currentCallFile
            
            CoroutineScope(Dispatchers.IO).launch {
                if (finalNumber != null) {
                    val uploadSucceeded = checkLeadAndUpload(
                        phone = finalNumber,
                        durationSecs = duration.toInt(),
                        callType = if (wasOutgoing) "OUTGOING" else "INCOMING",
                        callSessionId = sessionId,
                        recordingFile = recordingFile,
                        capturedStartTime = capturedStartTime
                    )
                    
                    // CRITICAL FIX: If direct upload succeeded, mark the CallBuffer as COMPLETED
                    // so UnifiedSyncWorker.consolidateCallBuffer() does NOT re-upload it (ghost entries).
                    if (uploadSucceeded && sessionId != null) {
                        try {
                            val db = AppDatabase.getDatabase(applicationContext)
                            val buffer = db.callBufferDao().getBySessionId(sessionId)
                            if (buffer != null) {
                                buffer.isConsolidated = true
                                buffer.status = 2 // COMPLETED
                                db.callBufferDao().update(buffer)
                                Log.d("CallTracker", "Marked buffer session $sessionId as COMPLETED after direct upload.")
                            }
                        } catch (e: Exception) {
                            Log.e("CallTracker", "Failed to mark buffer as completed", e)
                        }
                    }
                }
                // Schedule worker for any remaining queued items (WhatsApp, failed calls, etc.)
                com.pypecrm.app.services.UnifiedSyncWorker.schedule(applicationContext)
                isCallActive = false
                currentCallFile = null
                updateNotification("Call Tracker Active", "Waiting for calls...")
            }
        } else {
            updateNotification("Call Tracker Active", "Waiting for calls...")
        }
    }

    private data class CallDetails(val number: String, val duration: Int, val type: String, val timestamp: Long, val hardwareId: String)

    private fun getLatestCallDetails(expectedNumber: String?): CallDetails? {
        var result: CallDetails? = null
        
        val cleanQuery = expectedNumber?.replace(Regex("[^0-9]"), "") ?: ""
        val suffix = if (cleanQuery.length >= 10) cleanQuery.takeLast(10) else cleanQuery
        
        // Retry logic: System log may take time to update
        for (i in 1..20) {
            try {
                val twoMinsAgo = System.currentTimeMillis() - 120_000
                val selection = "${android.provider.CallLog.Calls.NUMBER} LIKE ? AND ${android.provider.CallLog.Calls.DATE} >= ?"
                val selectionArgs = arrayOf("%$suffix", twoMinsAgo.toString())

                val cursor = contentResolver.query(
                    android.provider.CallLog.Calls.CONTENT_URI,
                    arrayOf(
                        android.provider.CallLog.Calls.NUMBER,
                        android.provider.CallLog.Calls.DURATION,
                        android.provider.CallLog.Calls.TYPE,
                        android.provider.CallLog.Calls.DATE,
                        android.provider.CallLog.Calls._ID
                    ),
                    selection, 
                    selectionArgs,
                    android.provider.CallLog.Calls.DATE + " DESC LIMIT 1"
                )
                cursor?.use {
                    if (it.moveToFirst()) {
                        val number = it.getString(0)
                        val duration = it.getInt(1)
                        val typeInt = it.getInt(2)
                        val hardwareId = it.getLong(4).toString()
                        
                        val typeStr = when(typeInt) {
                            android.provider.CallLog.Calls.INCOMING_TYPE -> "INCOMING"
                            android.provider.CallLog.Calls.OUTGOING_TYPE -> "OUTGOING"
                            android.provider.CallLog.Calls.MISSED_TYPE -> "MISSED"
                            android.provider.CallLog.Calls.REJECTED_TYPE -> "REJECTED"
                            android.provider.CallLog.Calls.BLOCKED_TYPE -> "BLOCKED"
                            else -> "UNKNOWN"
                        }
                        
                        Log.d("CallTracker", "Official Log Result (Attempt $i): num=$number, dur=$duration, type=$typeStr, time=${it.getLong(3)}, hwId=$hardwareId")
                        result = CallDetails(number, duration, typeStr, it.getLong(3), hardwareId)
                        
                        // If it's missed/rejected OR we have a positive duration, we are DONE.
                        if (duration > 0 || typeStr == "MISSED" || typeStr == "REJECTED" || typeStr == "BLOCKED") {
                            return result
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("CallTracker", "Failed to query official log (Attempt $i)", e)
            }
            
            // AGGRESSIVE WAIT: Retry for 60s (20 times x 3s)
            if (i < 20) {
                try { Thread.sleep(3000L) } catch (e: Exception) {}
            }
        }
        return result
    }

    private fun updateNotification(title: String, message: String) {
        val notification = createNotification(title, message)
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun sendCallStateBroadcast(action: String, number: String?, isOutgoing: Boolean) {
        if (number == null && action == "ACTION_CALL_STARTED") {
            Log.w("CallTracker", "Skipping broadcast: start number is null")
            return
        }
        val intent = Intent(action).apply {
            `package` = packageName
            putExtra("number", number)
            putExtra("is_outgoing", isOutgoing)
            putExtra("session_id", currentSessionId)
        }
        sendBroadcast(intent)
    }

    private fun getAuthData(): Pair<String, String>? {
        val prefs = getSharedPreferences("crm_prefs", Context.MODE_PRIVATE)
        val token = prefs.getString("jwt_token", null) ?: return null
        val apiBase = prefs.getString("api_url", "https://www.pypecrm.com")?.trimEnd('/') ?: return null
        return Pair(token, apiBase)
    }

    private suspend fun checkLeadAndUpload(phone: String, durationSecs: Int, callType: String, officialTimestamp: Long? = null, hardwareId: String? = null, callSessionId: String? = null, recordingFile: java.io.File? = null, capturedStartTime: Long? = null): Boolean {
        val cleanPhone = phone.replace(Regex("[^0-9]"), "")
        if (cleanPhone.length < 10) return false
        
        val last10 = cleanPhone.takeLast(10)
        val db = AppDatabase.getDatabase(this)
        
        val lead = db.leadDao().findLeadByPhone(last10)
        val details = getLatestCallDetails(last10)
        
        // TIMESTAMP FIX: Use capturedStartTime (when call began on device) as primary timestamp.
        // Fall back to officialTimestamp, then system time — never use the hardware log's DATE
        // directly as it can reflect when the call ENDED or the log was written, not when it started.
        val resolvedTimestamp = capturedStartTime ?: officialTimestamp ?: System.currentTimeMillis()
        
        return uploadMetadataToCrm(
            leadId = lead?.id, 
            phoneNumber = phone, 
            durationSecs = durationSecs, 
            carrierDurationSecs = details?.duration,
            callType = callType, 
            officialTimestamp = resolvedTimestamp,
            hardwareId = details?.hardwareId ?: hardwareId, 
            callSessionId = callSessionId,
            recordingFile = recordingFile
        )
    }

    private fun uploadMetadataToCrm(
        leadId: String?, 
        phoneNumber: String, 
        durationSecs: Int, 
        carrierDurationSecs: Int? = null,
        callType: String, 
        officialTimestamp: Long? = null, 
        hardwareId: String? = null, 
        callSessionId: String? = null,
        recordingFile: java.io.File? = null
    ): Boolean {
        val (token, apiBase) = getAuthData() ?: run {
            queueForSync(leadId, phoneNumber, durationSecs, callType, officialTimestamp, hardwareId, carrierDurationSecs)
            return false
        }

        val client = OkHttpClient.Builder()
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(300, TimeUnit.SECONDS)
            .writeTimeout(300, TimeUnit.SECONDS)
            .build()
            
        val finalTimestamp = officialTimestamp ?: System.currentTimeMillis()
        
        val requestBodyBuilder = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("duration", durationSecs.toString())
            .addFormDataPart("callType", callType)
            .addFormDataPart("phoneNumber", phoneNumber)
            .addFormDataPart("timestamp", finalTimestamp.toString())
            .addFormDataPart("hardwareId", hardwareId ?: "")
            .addFormDataPart("callSessionId", callSessionId ?: "")
            
        if (carrierDurationSecs != null) {
            requestBodyBuilder.addFormDataPart("hardwareDuration", carrierDurationSecs.toString())
        }
            
        if (leadId != null) {
            requestBodyBuilder.addFormDataPart("leadId", leadId)
        }

        if (recordingFile != null && recordingFile.exists()) {
            val mediaType = "audio/mpeg".toMediaTypeOrNull()
            requestBodyBuilder.addFormDataPart(
                "file", 
                recordingFile.name, 
                recordingFile.asRequestBody(mediaType)
            )
        }

        val request = Request.Builder()
            .url("$apiBase/api/android/recordings")
            .addHeader("Authorization", "Bearer $token")
            .post(requestBodyBuilder.build())
            .build()

        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                Log.d("CallTrackerService", "Metadata uploaded successfully (sessionId=$callSessionId)")
                true
            } else {
                Log.e("CallTrackerService", "Metadata upload failed with code: ${response.code}, queuing")
                queueForSync(leadId, phoneNumber, durationSecs, callType, officialTimestamp, hardwareId, carrierDurationSecs)
                false
            }
        } catch (e: IOException) {
            Log.e("CallTrackerService", "Upload failed (network), queuing for offline sync", e)
            queueForSync(leadId, phoneNumber, durationSecs, callType, officialTimestamp, hardwareId, carrierDurationSecs)
            false
        }
    }

    private fun queueForSync(leadId: String?, phoneNumber: String, durationSecs: Int, callType: String, officialTimestamp: Long? = null, hardwareId: String? = null, carrierDurationSecs: Int? = null) {
        val finalTimestamp = officialTimestamp ?: System.currentTimeMillis()
        val json = org.json.JSONObject().apply {
            put("phoneNumber", phoneNumber)
            put("duration", durationSecs.toString())
            put("callType", callType)
            put("leadId", leadId)
            put("timestamp", finalTimestamp.toString())
            put("hardwareId", hardwareId ?: "")
            if (carrierDurationSecs != null) {
                put("hardwareDuration", carrierDurationSecs.toString())
            }
        }
        
        CoroutineScope(Dispatchers.IO).launch {
            val db = AppDatabase.getDatabase(applicationContext)
            db.syncQueueDao().insert(com.pypecrm.app.data.SyncQueueEntry(
                type = "CALL_LOG",
                payload = json.toString()
            ))
            Log.d("CallTracker", "Saved call log to local sync queue for $phoneNumber")
        }
    }

    private fun getLastCallLogNumber(): String? {
        try {
            val cursor = contentResolver.query(
                android.provider.CallLog.Calls.CONTENT_URI,
                arrayOf(android.provider.CallLog.Calls.NUMBER),
                null, null,
                android.provider.CallLog.Calls.DATE + " DESC LIMIT 1"
            )
            cursor?.use {
                if (it.moveToFirst()) return it.getString(0)
            }
        } catch (e: Exception) {
            Log.e("CallTrackerService", "Failed to query call log", e)
        }
        return null
    }

    private fun createNotification(title: String, message: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Call Tracker Service Channel",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
