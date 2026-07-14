package com.pypecrm.app.services

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.TelephonyManager
import android.util.Log

class CallStateReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val prefs = context.getSharedPreferences("call_state_prefs", Context.MODE_PRIVATE)
        
        when (intent.action) {
            "android.intent.action.BOOT_COMPLETED", "android.intent.action.QUICKBOOT_POWERON" -> {
                Log.d("CallStateReceiver", "Device Rebooted. Call Tracker Active.")
                showNotification(context, "Call Tracker Active", "Pype CRM is monitoring for lead calls.")
                return
            }
            "android.intent.action.NEW_OUTGOING_CALL" -> {
                val number = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER)
                prefs.edit()
                    .putString("current_number", number)
                    .putBoolean("is_outgoing", true)
                    .apply()
                Log.d("CallStateReceiver", "NEW_OUTGOING_CALL: $number")
                return
            }
            TelephonyManager.ACTION_PHONE_STATE_CHANGED -> {
                val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
                val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
                var state = TelephonyManager.CALL_STATE_IDLE

                if (stateStr == TelephonyManager.EXTRA_STATE_IDLE) state = TelephonyManager.CALL_STATE_IDLE
                else if (stateStr == TelephonyManager.EXTRA_STATE_OFFHOOK) state = TelephonyManager.CALL_STATE_OFFHOOK
                else if (stateStr == TelephonyManager.EXTRA_STATE_RINGING) state = TelephonyManager.CALL_STATE_RINGING

                // Update current number and type immediately on state change if available
                if (number != null) {
                    val isOutgoing = stateStr != TelephonyManager.EXTRA_STATE_RINGING
                    prefs.edit()
                        .putString("current_number", number)
                        .putBoolean("is_outgoing", isOutgoing)
                        .apply()
                    Log.d("CallStateReceiver", "STATE_CHANGED: state=$stateStr, number=$number, isOutgoing=$isOutgoing")
                }

                onCallStateChanged(context, state, prefs)
            }
        }
    }

    private fun onCallStateChanged(context: Context, state: Int, prefs: android.content.SharedPreferences) {
        val lastState = prefs.getInt("last_state", TelephonyManager.CALL_STATE_IDLE)
        if (lastState == state) return

        when (state) {
            TelephonyManager.CALL_STATE_RINGING, TelephonyManager.CALL_STATE_OFFHOOK -> {
                // If already active, don't restart (stay on current start time)
                if (prefs.getBoolean("is_call_active", false)) return

                val num = prefs.getString("current_number", null)
                val isOutgoing = prefs.getBoolean("is_outgoing", false)
                
                // Start Foreground Service
                val intent = Intent(context, CallTrackerService::class.java).apply {
                    action = "ACTION_START_TRACKING"
                    putExtra("number", num)
                    putExtra("is_outgoing", isOutgoing)
                }
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                    prefs.edit().putBoolean("is_call_active", true).apply()
                    Log.d("CallStateReceiver", "Started CallTrackerService for $num (State: $state)")
                } catch (e: Exception) {
                    Log.e("CallStateReceiver", "Failed to start CallTrackerService (Background restriction?)", e)
                    // If foreground start fails, try a regular start as a last resort (may not work on all APIs but prevents crash)
                    try { context.startService(intent) } catch (inner: Exception) {}
                }
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                val wasActive = prefs.getBoolean("is_call_active", false)
                
                // Stop Foreground Service - it will handle upload
                val intent = Intent(context, CallTrackerService::class.java).apply {
                    action = "ACTION_STOP_TRACKING"
                }
                context.startService(intent)
                
                // Clear state
                prefs.edit()
                    .putBoolean("is_call_active", false)
                    .putLong("call_start_time", 0)
                    .putString("current_number", null)
                    .putBoolean("is_outgoing", false)
                    .apply()
                Log.d("CallStateReceiver", "Sent STOP_TRACKING to CallTrackerService (WasActive: $wasActive)")
            }
        }
        prefs.edit().putInt("last_state", state).apply()
    }

    private fun showNotification(context: Context, title: String, message: String) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel("crm_channel", "CRM Notifications", android.app.NotificationManager.IMPORTANCE_DEFAULT)
            manager.createNotificationChannel(channel)
        }
        val notification = androidx.core.app.NotificationCompat.Builder(context, "crm_channel")
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
