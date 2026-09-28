package com.garang.nativehost

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var bridge: GARANGHealthBridge
    private var pendingPermissionRequestId: String? = null

    private val healthPermissionLauncher =
        registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
            val requestId = pendingPermissionRequestId ?: return@registerForActivityResult
            pendingPermissionRequestId = null
            bridge.resolveAuthorization(requestId, granted)
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.webChromeClient = WebChromeClient()
        bridge = GARANGHealthBridge(this, webView)
        webView.addJavascriptInterface(bridge, "GarangAndroidHealth")
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                view.evaluateJavascript(GARANGHealthBridge.bridgeJavaScript, null)
            }
        }
        setContentView(webView)
        webView.loadUrl("https://jangsang1214.github.io/-fitmind-ai/")
    }

    fun requestHealthPermissions(requestId: String, permissions: Set<String>) {
        pendingPermissionRequestId = requestId
        healthPermissionLauncher.launch(permissions)
    }

    fun healthSdkAvailable(): Boolean =
        HealthConnectClient.getSdkStatus(this) == HealthConnectClient.SDK_AVAILABLE
}
