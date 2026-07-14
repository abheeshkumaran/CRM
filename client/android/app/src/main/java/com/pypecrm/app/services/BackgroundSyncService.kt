package com.pypecrm.app.services

import android.app.*
import android.content.*
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.pypecrm.app.MainActivity
import okhttp3.*
import org.json.JSONObject
import org.json.JSONArray
import java.util.concurrent.TimeUnit

class BackgroundSyncService : Service() {

    private val NOTIFICATION_ID = 102
    private val CHANNEL_ID = "sync_service_channel"
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS) // Keep alive
        .build()

    private var reconnectDelay = 1000L
    private val MAX_RECONNECT_DELAY = 60000L
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())

    private fun scheduleReconnect() {
        Log.d("BackgroundSync", "Scheduling reconnect in $reconnectDelay ms")
        handler.removeCallbacksAndMessages(null)
        handler.postDelayed({
            connectWebSocket()
        }, reconnectDelay)
        reconnectDelay = (reconnectDelay * 2).coerceAtMost(MAX_RECONNECT_DELAY)
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        
        if (action == "ACTION_STOP_SERVICE") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, createNotification("Pype CRM Background Sync", "Real-time updates active"))
        connectWebSocket()

        return START_STICKY
    }

    private fun connectWebSocket() {
        val prefs = getSharedPreferences("crm_prefs", Context.MODE_PRIVATE)
        val apiBase = prefs.getString("api_url", "https://www.pypecrm.com")?.trimEnd('/')
        val token = prefs.getString("jwt_token", null)

        if (token == null || apiBase == null) {
            Log.e("BackgroundSync", "Token or API URL missing. Cannot connect.")
            return
        }

        // Convert HTTP/HTTPS to WS/WSS
        val wsUrl = apiBase.replace("https://", "wss://").replace("http://", "ws://") + "/socket.io/?EIO=4&transport=websocket"
        
        val request = Request.Builder()
            .url(wsUrl)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d("BackgroundSync", "WebSocket Layer Connected")
                reconnectDelay = 1000L // Reset delay
                // Socket.io standard: Wait for '0' packet from server
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                // Socket.io Handshake (0)
                if (text.startsWith("0")) {
                    Log.d("BackgroundSync", "Socket.io Handshake Received: $text")
                    // After 0, we must send 40 to 'connect' to the root namespace
                    val authPayload = JSONObject().apply {
                        put("token", token)
                    }
                    webSocket.send("40$authPayload") 
                    return
                }

                // Heartbeat (2) -> Respond with 3 (Pong)
                if (text == "2") {
                    webSocket.send("3")
                    return
                }

                // Event (42) -> 42["event", {data}]
                if (text.startsWith("42")) {
                    try {
                        val jsonArray = JSONArray(text.substring(2))
                        val event = jsonArray.optString(0)
                        val data = jsonArray.optJSONObject(1)

                        if (event == "notification") {
                            showSystemNotification(
                                data?.optString("title") ?: "CRM Update",
                                data?.optString("message") ?: ""
                            )
                        }
                    } catch (e: Exception) {
                        Log.e("BackgroundSync", "Error parsing socket message: $text", e)
                    }
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d("BackgroundSync", "WebSocket Closed: $reason")
                scheduleReconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("BackgroundSync", "WebSocket Failure", t)
                scheduleReconnect()
            }
        })
    }

    private fun showSystemNotification(title: String, message: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notification = NotificationCompat.Builder(this, "crm_alerts_high")
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .build()
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun createNotification(title: String, message: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE
        } else {
            0
        }
        val pendingIntent = PendingIntent.getActivity(this, 0, intent, flags)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val syncChannel = NotificationChannel(CHANNEL_ID, "Background Sync Channel", NotificationManager.IMPORTANCE_LOW)
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(syncChannel)
            
            // Also create the high-importance channel for incoming app notifications
            val crmChannel = NotificationChannel("crm_alerts_high", "CRM High Priority Alerts", NotificationManager.IMPORTANCE_HIGH)
            manager.createNotificationChannel(crmChannel)
        }
    }

    override fun onDestroy() {
        webSocket?.close(1000, "Service destroyed")
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
