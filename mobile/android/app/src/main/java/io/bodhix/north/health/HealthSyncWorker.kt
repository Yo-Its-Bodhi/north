package io.bodhix.north.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.time.Duration
import java.time.Instant
import java.util.concurrent.TimeUnit

class HealthSyncWorker(context: Context, parameters: WorkerParameters) : CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result {
        val store = SecureSessionStore(applicationContext)
        val refreshToken = store.refreshToken ?: return Result.success()
        if (HealthConnectClient.getSdkStatus(applicationContext) != HealthConnectClient.SDK_AVAILABLE) return Result.success()
        val health = HealthReader(applicationContext)
        if (!health.granted() || !health.backgroundGranted()) return Result.success()

        return runCatching {
            val api = NorthApi()
            val session = api.refresh(refreshToken, store.deviceId)
            store.refreshToken = session.refreshToken
            val connection = api.connect(session.accessToken, store.deviceId)
            val importFrom = Instant.parse(connection.getString("import_from"))
            val overlapFrom = store.lastSuccessfulSync?.minus(Duration.ofDays(7))
            val readFrom = if (overlapFrom == null) importFrom else maxOf(importFrom, overlapFrom)
            val records = health.read(readFrom)
            if (records.length() > 0) api.importAll(session.accessToken, store.deviceId, records)
            store.lastSuccessfulSync = Instant.now()
        }.fold(onSuccess = { Result.success() }, onFailure = { Result.retry() })
    }
}

object HealthSyncScheduler {
    private const val WORK_NAME = "north-beta-health-sync"

    fun schedule(context: Context) {
        val request = PeriodicWorkRequestBuilder<HealthSyncWorker>(6, TimeUnit.HOURS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, request)
    }
}
