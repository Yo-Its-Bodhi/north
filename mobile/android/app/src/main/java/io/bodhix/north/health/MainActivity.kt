package io.bodhix.north.health

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity

/** Installable North shell with an Android identity separate from the production bridge. */
class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private val sessionStore by lazy { SecureSessionStore(this) }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        HealthSyncScheduler.schedule(this)
        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.setSupportZoom(false)
            settings.userAgentString = "${settings.userAgentString} NorthBeta/${BuildConfig.VERSION_NAME}"
            webViewClient = NorthWebViewClient()
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, false)
        }
        setContentView(webView)
        if (savedInstanceState == null) webView.loadUrl(BuildConfig.NORTH_WEB_URL) else webView.restoreState(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }

    private inner class NorthWebViewClient : WebViewClient() {
        override fun onPageFinished(view: WebView, url: String) {
            super.onPageFinished(view, url)
            val deviceId = org.json.JSONObject.quote(sessionStore.deviceId)
            view.evaluateJavascript("localStorage.setItem('north-device-id-v1', $deviceId);", null)
        }

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = open(request.url.toString())

        @Deprecated("Deprecated in Java")
        override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean = open(url)

        private fun open(url: String): Boolean {
            if (url.startsWith("northhealth://") || url.startsWith("intent://connect")) {
                startActivity(Intent(this@MainActivity, HealthConnectActivity::class.java))
                return true
            }
            val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return true
            if (uri.scheme == "https" && uri.host == Uri.parse(BuildConfig.NORTH_WEB_URL).host) return false
            if (uri.scheme == "http" || uri.scheme == "https") startActivity(Intent(Intent.ACTION_VIEW, uri))
            return true
        }
    }
}
