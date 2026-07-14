package com.pypecrm.app.services

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.pypecrm.app.data.AppDatabase
import com.pypecrm.app.data.SyncQueueEntry
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class WhatsAppNotificationListener : NotificationListenerService() {

    private var lastMessage: String? = null
    private var lastContact: String? = null
    private var lastSyncTime: Long = 0

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName
        if (packageName == "com.whatsapp" || packageName == "com.whatsapp.w4b") {
            val extras = sbn.notification.extras
            val contact = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
            val message = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            
            Log.v("WhatsAppListener", "Raw notification received: title=$contact, text=$message")

            // Ignore system messages, calls, or empty data
            if (contact == null || message == null || contact == "WhatsApp" || contact == "WhatsApp Business") return
            if (message.contains("Checking for new messages") || message.contains("messages") || message.contains("\uD83D\uDCF7")) return

            val currentTime = System.currentTimeMillis()
            
            // Deduplication logic: ignore if same contact + message within 10 seconds
            if (contact == lastContact && message == lastMessage && (currentTime - lastSyncTime < 10000)) {
                Log.v("WhatsAppListener", "Skipping duplicate notification from $contact")
                return
            }
            
            lastContact = contact
            lastMessage = message
            lastSyncTime = currentTime

            Log.i("WhatsAppListener", "Scraping valid WhatsApp message from $contact: $message")
            syncWhatsAppToCrm(contact, message)
        }
    }

    private fun getAuthData(): Pair<String, String>? {
        val prefs = getSharedPreferences("crm_prefs", Context.MODE_PRIVATE)
        val token = prefs.getString("jwt_token", null) ?: return null
        val apiBase = prefs.getString("api_url", "https://api.dadcrm.com")?.trimEnd('/') ?: return null
        return Pair(token, apiBase)
    }

    private fun syncWhatsAppToCrm(contact: String, message: String) {
        val authData = getAuthData()
        if (authData == null) {
            queueWhatsAppForSync(contact, message)
            return
        }

        val (token, apiBase) = authData
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val json = JSONObject().apply {
                    put("phoneNumber", contact)
                    put("messageText", message)
                    put("timestamp", System.currentTimeMillis())
                    put("source", "NOTIFICATION_LISTENER")
                }
                
                val requestBody = json.toString().toRequestBody("application/json".toMediaTypeOrNull())

                val request = Request.Builder()
                    .url("$apiBase/api/android/whatsapp/sync")
                    .addHeader("Authorization", "Bearer $token")
                    .post(requestBody)
                    .build()

                val client = OkHttpClient.Builder()
                    .connectTimeout(15, TimeUnit.SECONDS)
                    .build()

                val response = client.newCall(request).execute()
                
                if (!response.isSuccessful) {
                    Log.e("WhatsAppListener", "Sync failed: ${response.code}, queuing")
                    queueWhatsAppForSync(contact, message)
                } else {
                    Log.d("WhatsAppListener", "Successfully synced background message for $contact")
                }
                response.close()
                
            } catch (e: Exception) {
                Log.e("WhatsAppListener", "Network error, queuing for offline sync", e)
                queueWhatsAppForSync(contact, message)
            }
        }
    }

    private fun queueWhatsAppForSync(contact: String, message: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val json = JSONObject().apply {
                    put("phoneNumber", contact)
                    put("messageText", message)
                    put("timestamp", System.currentTimeMillis())
                    put("source", "NOTIFICATION_LISTENER")
                }
                val db = AppDatabase.getDatabase(applicationContext)
                db.syncQueueDao().insert(
                    SyncQueueEntry(type = "WHATSAPP", payload = json.toString())
                )
                Log.d("WhatsAppListener", "Queued background message from $contact for later sync")
                
                // Trigger worker
                UnifiedSyncWorker.schedule(applicationContext)
            } catch (e: Exception) {
                Log.e("WhatsAppListener", "Failed to queue message to SQLite, falling back to SharedPreferences", e)
                try {
                    val prefs = applicationContext.getSharedPreferences("crm_whatsapp_fallback", Context.MODE_PRIVATE)
                    val existing = prefs.getString("failed_messages", "[]")
                    val array = org.json.JSONArray(existing)
                    
                    val json = JSONObject().apply {
                        put("phoneNumber", contact)
                        put("messageText", message)
                        put("timestamp", System.currentTimeMillis())
                        put("source", "NOTIFICATION_LISTENER_FALLBACK")
                    }
                    
                    array.put(json)
                    prefs.edit().putString("failed_messages", array.toString()).apply()
                    Log.d("WhatsAppListener", "Saved to SharedPreferences fallback")
                } catch (e2: Exception) {
                    Log.e("WhatsAppListener", "Total failure to save message", e2)
                }
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
        // No action needed on removal
    }
}
