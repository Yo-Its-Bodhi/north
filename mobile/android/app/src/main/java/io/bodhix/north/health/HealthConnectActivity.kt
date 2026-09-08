package io.bodhix.north.health

import android.os.Bundle
import android.text.InputType
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Duration
import java.time.Instant

class HealthConnectActivity : ComponentActivity() {
    private lateinit var health: HealthReader
    private lateinit var status: TextView
    private lateinit var username: EditText
    private lateinit var password: EditText
    private lateinit var permissionButton: Button
    private lateinit var syncButton: Button
    private val api = NorthApi()
    private val store by lazy { SecureSessionStore(this) }
    private val permissionLauncher = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { refreshStatus() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        health = HealthReader(this)
        val content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48, 72, 48, 48) }
        content.addView(TextView(this).apply { text = "NORTH BETA"; textSize = 14f })
        content.addView(TextView(this).apply { text = "Connect Samsung Health"; textSize = 30f; setPadding(0, 22, 0, 8) })
        content.addView(TextView(this).apply {
            text = "Galaxy Watch data flows through Samsung Health into Health Connect. North reads only the categories you approve."
            textSize = 16f
        })
        username = EditText(this).apply { hint = "North username"; setText(store.username.orEmpty()) }
        password = EditText(this).apply {
            hint = if (store.refreshToken == null) "North password" else "Password only needed if your session expired"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        status = TextView(this).apply { textSize = 15f; setPadding(0, 28, 0, 20) }
        permissionButton = Button(this).apply {
            text = "Choose Health Connect access"
            setOnClickListener { permissionLauncher.launch(health.requestedPermissions) }
        }
        syncButton = Button(this).apply {
            text = if (store.refreshToken == null) "Sign in and sync now" else "Sync Samsung Health now"
            setOnClickListener { sync() }
        }
        val doneButton = Button(this).apply { text = "Back to North"; setOnClickListener { finish() } }
        listOf(username, password, status, permissionButton, syncButton, doneButton).forEach {
            content.addView(it, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        }
        content.addView(TextView(this).apply {
            text = "North Beta securely remembers a rotating sign-in key, never your password. When background Health Connect access is approved, it refreshes recent data automatically every few hours."
            textSize = 13f; setPadding(0, 28, 0, 0)
        })
        setContentView(ScrollView(this).apply { addView(content) })
        refreshStatus()
    }

    private fun refreshStatus() = lifecycleScope.launch {
        status.text = when (HealthConnectClient.getSdkStatus(this@HealthConnectActivity)) {
            HealthConnectClient.SDK_AVAILABLE -> when {
                !health.granted() -> "Health Connect is available. Permission is still required."
                health.backgroundGranted() -> "Health Connect access is granted, including automatic background sync."
                else -> "Health Connect access is granted. Manual sync works; allow background access for automatic updates."
            }
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "Health Connect needs to be installed or updated."
            else -> "Health Connect is unavailable on this phone. Android 9 or newer with Google Play is required."
        }
    }

    private fun sync() = lifecycleScope.launch {
        if (!health.granted()) { status.text = "Choose Health Connect access first."; return@launch }
        if (store.refreshToken == null && (username.text.isBlank() || password.text.isBlank())) {
            status.text = "Enter your North username and password for the first connection."
            return@launch
        }
        status.text = "Connecting securely to your North account…"
        runCatching {
            val session = withContext(Dispatchers.IO) {
                val savedRefresh = store.refreshToken
                if (savedRefresh != null) runCatching { api.refresh(savedRefresh, store.deviceId) }.getOrElse {
                    if (username.text.isBlank() || password.text.isBlank()) throw IllegalStateException("Your saved session expired. Enter your password to reconnect.")
                    api.login(username.text.toString(), password.text.toString(), store.deviceId)
                } else api.login(username.text.toString(), password.text.toString(), store.deviceId)
            }
            store.refreshToken = session.refreshToken
            store.username = username.text.toString().ifBlank { store.username }
            val connection = withContext(Dispatchers.IO) { api.connect(session.accessToken, store.deviceId) }
            val importFrom = Instant.parse(connection.getString("import_from"))
            val overlapFrom = store.lastSuccessfulSync?.minus(Duration.ofDays(7))
            val readFrom = if (overlapFrom == null) importFrom else maxOf(importFrom, overlapFrom)
            status.text = "Reading Samsung Health updates…"
            val records = health.read(readFrom)
            status.text = "Saving ${records.length()} health records to your account…"
            val uploaded = if (records.length() == 0) 0 else withContext(Dispatchers.IO) {
                api.importAll(session.accessToken, store.deviceId, records)
            }
            store.lastSuccessfulSync = Instant.now()
            HealthSyncScheduler.schedule(this@HealthConnectActivity)
            uploaded
        }.onSuccess { count ->
            password.text.clear()
            syncButton.text = "Sync Samsung Health now"
            status.text = "$count recent Samsung Health records checked and saved. Automatic sync is ${if (health.backgroundGranted()) "on" else "waiting for background permission"}."
            (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(status.windowToken, 0)
        }.onFailure { status.text = "Sync failed: ${it.message ?: "Unknown error"}" }
    }
}
