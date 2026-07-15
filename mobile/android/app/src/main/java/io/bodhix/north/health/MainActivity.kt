package io.bodhix.north.health

import android.os.Bundle
import android.content.Intent
import android.net.Uri
import android.view.inputmethod.InputMethodManager
import android.text.InputType
import android.view.ViewGroup
import android.widget.*
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

class MainActivity : ComponentActivity() {
    private lateinit var health: HealthReader
    private lateinit var status: TextView
    private lateinit var username: EditText
    private lateinit var password: EditText
    private lateinit var permissionButton: Button
    private lateinit var syncButton: Button
    private lateinit var openNorthButton: Button
    private val api = NorthApi()
    private val preferences by lazy { getSharedPreferences("north-health", MODE_PRIVATE) }
    private val deviceId by lazy { preferences.getString("device-id", null) ?: UUID.randomUUID().toString().also { preferences.edit().putString("device-id", it).apply() } }
    private val permissionLauncher = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { refreshStatus() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (intent?.data?.scheme != "northhealth") {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://north.bodhix.io")))
            finish()
            return
        }
        health = HealthReader(this)
        val content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48, 72, 48, 48) }
        content.addView(TextView(this).apply { text = "NORTH"; textSize = 14f })
        content.addView(TextView(this).apply { text = "Connect Samsung Health"; textSize = 30f; setPadding(0, 22, 0, 8) })
        content.addView(TextView(this).apply { text = "Galaxy Watch data flows through Samsung Health into Health Connect. North reads only the categories you approve."; textSize = 16f })
        username = EditText(this).apply { hint = "North username" }
        password = EditText(this).apply { hint = "North password"; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD }
        status = TextView(this).apply { textSize = 15f; setPadding(0, 28, 0, 20) }
        permissionButton = Button(this).apply { text = "Choose Health Connect access"; setOnClickListener { permissionLauncher.launch(health.permissions) } }
        syncButton = Button(this).apply { text = "Sign in and sync now"; setOnClickListener { sync() } }
        openNorthButton = Button(this).apply { text = "Open North"; visibility = android.view.View.GONE; setOnClickListener { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://north.bodhix.io"))) } }
        listOf(username, password, status, permissionButton, syncButton, openNorthButton).forEach { content.addView(it, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)) }
        content.addView(TextView(this).apply { text = "Before syncing: Samsung Health → Settings → Health Connect → allow Samsung Health, then Sync now. You can revoke North in Health Connect at any time."; textSize = 13f; setPadding(0, 28, 0, 0) })
        setContentView(ScrollView(this).apply { addView(content) }); refreshStatus()
    }

    private fun refreshStatus() = lifecycleScope.launch {
        status.text = when (HealthConnectClient.getSdkStatus(this@MainActivity)) {
            HealthConnectClient.SDK_AVAILABLE -> if (health.granted()) "Health Connect access granted. Ready to sync." else "Health Connect is available. Permission is still required."
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "Health Connect needs to be installed or updated."
            else -> "Health Connect is unavailable on this phone. Android 9 or newer with Google Play is required."
        }
    }

    private fun sync() = lifecycleScope.launch {
        if (!health.granted()) { status.text = "Choose Health Connect access first."; return@launch }
        if (username.text.isBlank() || password.text.isBlank()) { status.text = "Enter your North username and password."; return@launch }
        status.text = "Reading today and yesterday from Health Connect…"
        runCatching {
            val records = health.read(30)
            status.text = "Uploading ${records.length()} records securely…"
            withContext(Dispatchers.IO) { val token = api.login(username.text.toString(), password.text.toString(), deviceId); api.importAll(token, deviceId, records) }
        }.onSuccess { count ->
            password.text.clear(); username.visibility = android.view.View.GONE; password.visibility = android.view.View.GONE
            permissionButton.visibility = android.view.View.GONE; syncButton.text = "Sync again"; openNorthButton.visibility = android.view.View.VISIBLE
            status.text = "Connected to North\n\n$count Samsung Health records synced successfully."
            (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(status.windowToken, 0)
        }
            .onFailure { status.text = "Sync failed: ${it.message ?: "Unknown error"}" }
    }
}
