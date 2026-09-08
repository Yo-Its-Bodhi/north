package io.bodhix.north.health

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.time.Instant
import java.util.UUID

class SecureSessionStore(context: Context) {
    private val appContext = context.applicationContext
    private val masterKey = MasterKey.Builder(appContext).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
    private val preferences = EncryptedSharedPreferences.create(
        appContext,
        "north-beta-secure-v1",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    val deviceId: String
        get() = preferences.getString("device-id", null)
            ?: UUID.randomUUID().toString().also { preferences.edit().putString("device-id", it).apply() }

    var refreshToken: String?
        get() = preferences.getString("refresh-token", null)
        set(value) { preferences.edit().putString("refresh-token", value).apply() }

    var username: String?
        get() = preferences.getString("username", null)
        set(value) { preferences.edit().putString("username", value).apply() }

    var lastSuccessfulSync: Instant?
        get() = preferences.getString("last-successful-sync", null)?.let { runCatching { Instant.parse(it) }.getOrNull() }
        set(value) { preferences.edit().putString("last-successful-sync", value?.toString()).apply() }
}
