package com.pypecrm.app.services

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent

class CallRecordingAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d("CallRecordingAccessibilityService", "Accessibility Service Connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // We do not need to process specific UI events for call recording to work.
        // The mere existence and activation of the service with the correct
        // configuration allows the app to use MediaRecorder.AudioSource.VOICE_RECOGNITION
    }

    override fun onInterrupt() {
        Log.d("CallRecordingAccessibilityService", "Accessibility Service Interrupted")
    }

    override fun onUnbind(intent: Intent?): Boolean {
        Log.d("CallRecordingAccessibilityService", "Accessibility Service Unbound")
        return super.onUnbind(intent)
    }
}
