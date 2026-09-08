package io.bodhix.north.health

import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.Color
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.JavascriptInterface
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

/** Installable North shell with an Android identity separate from the production bridge. */
class MainActivity : ComponentActivity() {
    private lateinit var root: FrameLayout
    private lateinit var webView: WebView
    private val sessionStore by lazy { SecureSessionStore(this) }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        HealthSyncScheduler.schedule(this)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        root = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        }
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }
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
            addJavascriptInterface(NorthChromeBridge(), "NorthNativeChrome")
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, false)
        }
        root.addView(webView)
        setContentView(root)
        ViewCompat.requestApplyInsets(root)
        updateSystemChrome(false)
        requestHomeShortcut()
        if (savedInstanceState == null) webView.loadUrl(BuildConfig.NORTH_WEB_URL) else webView.restoreState(savedInstanceState)
    }

    private fun requestHomeShortcut() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val preferences = getSharedPreferences("north-beta-launcher", MODE_PRIVATE)
        if (preferences.getBoolean("home-shortcut-requested", false)) return
        val manager = getSystemService(ShortcutManager::class.java)
        if (!manager.isRequestPinShortcutSupported) return
        val shortcut = ShortcutInfo.Builder(this, "north-beta-home")
            .setShortLabel("North Beta")
            .setLongLabel("Open North Beta")
            .setIcon(Icon.createWithResource(this, R.drawable.north_beta_icon))
            .setIntent(Intent(Intent.ACTION_MAIN).setComponent(ComponentName(this, MainActivity::class.java)))
            .build()
        if (manager.requestPinShortcut(shortcut, null)) {
            preferences.edit().putBoolean("home-shortcut-requested", true).apply()
        }
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
            view.evaluateJavascript(
                """
                (() => {
                  const syncNorthChrome = () => window.NorthNativeChrome?.setDarkTheme(document.documentElement.dataset.theme === 'night');
                  syncNorthChrome();
                  if (!window.__northChromeObserver) {
                    window.__northChromeObserver = new MutationObserver(syncNorthChrome);
                    window.__northChromeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
                  }
                })();
                """.trimIndent(),
                null,
            )
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

    private inner class NorthChromeBridge {
        @JavascriptInterface
        fun setDarkTheme(isDark: Boolean) {
            updateSystemChrome(isDark)
        }
    }

    private fun updateSystemChrome(isDark: Boolean) {
        runOnUiThread {
            val chromeColor = Color.parseColor(if (isDark) "#091522" else "#F1F5F2")
            root.setBackgroundColor(chromeColor)
            window.statusBarColor = chromeColor
            window.navigationBarColor = chromeColor
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.navigationBarDividerColor = chromeColor
                window.isNavigationBarContrastEnforced = false
                window.isStatusBarContrastEnforced = false
            }
            WindowCompat.getInsetsController(window, window.decorView).apply {
                isAppearanceLightStatusBars = !isDark
                isAppearanceLightNavigationBars = !isDark
            }
        }
    }
}
