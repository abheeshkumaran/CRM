package com.pypecrm.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.ValueCallback
import android.content.ActivityNotFoundException
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.GeolocationPermissions
import android.webkit.DownloadListener
import android.widget.Toast
import android.provider.Settings
import android.content.ComponentName
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.pypecrm.app.bridge.CRMBridge

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val PERMISSION_REQUEST_CODE = 200
    private val FILE_CHOOSER_REQUEST_CODE = 1
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var geolocationCallback: GeolocationPermissions.Callback? = null
    private var geolocationOrigin: String? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setContentView(webView)

        // EXTREMELY IMPORTANT: Expose the bridge BEFORE loading URL
        val bridge = CRMBridge(this)
        webView.addJavascriptInterface(bridge, "AndroidBridge")

        setupWebView()
        checkPermissions()
        startSyncService()
        com.pypecrm.app.services.UnifiedSyncWorker.schedule(this)
    }

    private fun startSyncService() {
        val intent = Intent(this, com.pypecrm.app.services.BackgroundSyncService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setGeolocationEnabled(true)
            setGeolocationDatabasePath(filesDir.path)
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = true
            allowContentAccess = true
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = true
            displayZoomControls = false
            userAgentString = userAgentString.replace("wv", "")
        }

        val cookieManager = android.webkit.CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        // Bridge to Javascript
        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                // Save these to call after we get native permission
                geolocationOrigin = origin
                geolocationCallback = callback
                
                // Check if we already have native permission
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                        PERMISSION_REQUEST_CODE
                    )
                } else {
                    callback?.invoke(origin, true, false)
                }
            }

            // For file uploads
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                if (this@MainActivity.filePathCallback != null) {
                    this@MainActivity.filePathCallback!!.onReceiveValue(null)
                }
                this@MainActivity.filePathCallback = filePathCallback

                val intent = Intent(Intent.ACTION_GET_CONTENT)
                intent.addCategory(Intent.CATEGORY_OPENABLE)
                intent.type = "*/*" // Allow all file types, web app handles specific filtering

                try {
                    startActivityForResult(
                        Intent.createChooser(intent, "File Chooser"),
                        FILE_CHOOSER_REQUEST_CODE
                    )
                } catch (e: ActivityNotFoundException) {
                    this@MainActivity.filePathCallback = null
                    Toast.makeText(this@MainActivity, "Cannot open file chooser", Toast.LENGTH_LONG).show()
                    return false
                }
                return true
            }
        }

        // Handle downloads (Exports, Quotes etc.) natively
        webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, contentLength ->
            try {
                val request = android.app.DownloadManager.Request(Uri.parse(url))
                request.setMimeType(mimetype)
                val fileName = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimetype)
                request.addRequestHeader("cookie", android.webkit.CookieManager.getInstance().getCookie(url))
                request.addRequestHeader("User-Agent", userAgent)
                request.setDescription("Downloading file...")
                request.setTitle(fileName)
                request.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                request.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, fileName)
                
                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as android.app.DownloadManager
                dm.enqueue(request)
                Toast.makeText(applicationContext, "Downloading $fileName...", Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Log.e("MainActivity", "Download failed", e)
                Toast.makeText(this@MainActivity, "Failed to download file", Toast.LENGTH_SHORT).show()
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                android.webkit.CookieManager.getInstance().flush()
                
                // Inject token if found in native storage but missing in JS localStorage
                val prefs = getSharedPreferences("crm_prefs", Context.MODE_PRIVATE)
                val token = prefs.getString("jwt_token", null)
                if (token != null) {
                    val script = """
                        (function() {
                            try {
                                var userInfo = localStorage.getItem('userInfo');
                                if (!userInfo) {
                                    console.log('Restoring session from Android Native Storage...');
                                    var data = { token: '$token', fromNative: true };
                                    localStorage.setItem('userInfo', JSON.stringify(data));
                                    // Trigger reload if we were on /login to get to /dashboard
                                    if (window.location.pathname === '/login' || window.location.pathname === '/') {
                                        window.location.href = '/dashboard';
                                    } else {
                                        // Just notify the app if already on a route
                                        window.dispatchEvent(new CustomEvent('auth-refresh', { detail: data }));
                                    }
                                }
                            } catch(e) { console.error('Token injection failed', e); }
                        })();
                    """.trimIndent()
                    webView.evaluateJavascript(script, null)
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url != null) {
                    if (url.startsWith("tel:")) {
                        try {
                            // Extract the phone part and clean it (leaving only digits, +, *, and #)
                            val phonePart = url.substring(4)
                            val cleanPhone = phonePart.replace(Regex("[^0-9+*#]"), "")
                            
                            val intent = Intent(Intent.ACTION_DIAL)
                            intent.data = Uri.parse("tel:$cleanPhone")
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(this@MainActivity, "Failed to open dialer.", Toast.LENGTH_SHORT).show()
                        }
                        return true
                    }
                    if (url.startsWith("mailto:") || 
                        url.startsWith("whatsapp:") || url.contains("wa.me") || 
                        url.contains("api.whatsapp.com")) {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW)
                            intent.data = Uri.parse(url)
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(this@MainActivity, "App not installed to handle this link.", Toast.LENGTH_SHORT).show()
                        }
                        return true
                    }
                }
                return false
            }


            override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                Toast.makeText(this@MainActivity, "Failed loading CRM: $description", Toast.LENGTH_LONG).show()
                super.onReceivedError(view, errorCode, description, failingUrl)
            }
        }
        val prefs = getSharedPreferences("crm_prefs", Context.MODE_PRIVATE)
        val apiBase = prefs.getString("api_url", "https://www.pypecrm.com")?.trimEnd('/')
        webView.loadUrl("$apiBase/login") 
    }

    override fun onResume() {
        super.onResume()
        // Trigger a soft refresh when app returns to foreground
        webView.evaluateJavascript("if (window.dispatchEvent) { window.dispatchEvent(new Event('visibilitychange')); }", null)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback == null) return
            val results = if (resultCode == RESULT_OK && data != null) {
                val dataString = data.dataString
                if (dataString != null) arrayOf(Uri.parse(dataString)) else null
            } else null
            filePathCallback!!.onReceiveValue(results)
            filePathCallback = null
        }
    }

    override fun onPause() {
        super.onPause()
        android.webkit.CookieManager.getInstance().flush()
    }

    override fun onDestroy() {
        android.webkit.CookieManager.getInstance().flush()
        super.onDestroy()
    }

    private fun checkPermissions() {
        val permissionsNeeded = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.CALL_PHONE)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.RECORD_AUDIO)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.READ_PHONE_STATE)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.READ_CALL_LOG)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.PROCESS_OUTGOING_CALLS) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.PROCESS_OUTGOING_CALLS)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_COARSE_LOCATION)
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        
        
        if (permissionsNeeded.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                permissionsNeeded.toTypedArray(),
                PERMISSION_REQUEST_CODE
            )
        } else {
            // If standard permissions are okay, check for the special Notification Access
            checkNotificationAccess()
        }
        
        checkBatteryOptimization()
    }



    private fun checkNotificationAccess() {
        if (!isNotificationServiceEnabled()) {
            android.app.AlertDialog.Builder(this)
                .setTitle("WhatsApp Scraper Required")
                .setMessage("To automatically sync WhatsApp messages, you must grant 'Notification Access' to CRM in the next screen. Please find 'CRM' and toggle it ON.")
                .setPositiveButton("Open Settings") { _, _ ->
                    startActivity(Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"))
                }
                .setNegativeButton("Later", null)
                .show()
        }
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val pkgName = packageName
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        if (!flat.isNullOrEmpty()) {
            val names = flat.split(":")
            for (name in names) {
                val cn = ComponentName.unflattenFromString(name)
                if (cn != null && cn.packageName == pkgName) {
                    return true
                }
            }
        }
        return false
    }

    private fun checkBatteryOptimization() {
        com.pypecrm.app.utils.AutoStartHelper.instance.getAutoStartPermission(this)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                Log.w("MainActivity", "Battery optimization is ENABLED. App might be killed in background.")
            }
        }
    }

    fun requestLocationPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                PERMISSION_REQUEST_CODE
            )
        } else {
            Toast.makeText(this, "Location permission already granted.", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val locationPermissionIndex = permissions.indexOf(Manifest.permission.ACCESS_FINE_LOCATION)
            if (locationPermissionIndex != -1 && grantResults.isNotEmpty() && grantResults[locationPermissionIndex] == PackageManager.PERMISSION_GRANTED) {
                geolocationCallback?.invoke(geolocationOrigin, true, false)
            }
            
            Toast.makeText(this, "Permissions updated.", Toast.LENGTH_SHORT).show()
        }
    }



    // Handle back button for web navigation
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
