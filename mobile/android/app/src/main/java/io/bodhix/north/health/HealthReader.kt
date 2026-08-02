package io.bodhix.north.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId

class HealthReader(context: Context) {
    val client = HealthConnectClient.getOrCreate(context)
    val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class), HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class), HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class), HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class)
    )

    suspend fun granted() = client.permissionController.getGrantedPermissions().containsAll(permissions)

    suspend fun read(importFrom: Instant): JSONArray {
        val end = Instant.now(); val range = TimeRangeFilter.between(importFrom, end)
        val output = JSONArray()
        client.readRecords(ReadRecordsRequest(StepsRecord::class, timeRangeFilter = range)).records.forEach { record ->
            output.put(base(record.metadata.id, "steps", record.startTime, record.endTime, record.metadata).put("payload", JSONObject().put("count", record.count)))
        }
        client.readRecords(ReadRecordsRequest(HeartRateRecord::class, timeRangeFilter = range)).records.forEach { record ->
            val samples = JSONArray(); record.samples.forEach { samples.put(JSONObject().put("time", it.time.toString()).put("beatsPerMinute", it.beatsPerMinute)) }
            output.put(base(record.metadata.id, "heart_rate", record.startTime, record.endTime, record.metadata).put("payload", JSONObject().put("samples", samples)))
        }
        client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, timeRangeFilter = range)).records.forEach { record ->
            val stages = JSONArray(); record.stages.forEach { stages.put(JSONObject().put("start", it.startTime.toString()).put("end", it.endTime.toString()).put("stage", it.stage)) }
            output.put(base(record.metadata.id, "sleep", record.startTime, record.endTime, record.metadata).put("payload", JSONObject().put("title", record.title).put("stages", stages)))
        }
        client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, timeRangeFilter = range)).records.forEach { record ->
            output.put(base(record.metadata.id, "exercise", record.startTime, record.endTime, record.metadata).put("payload", JSONObject().put("exerciseType", record.exerciseType).put("title", record.title).put("notes", record.notes).put("recordingMethod", record.metadata.recordingMethod)))
        }
        client.readRecords(ReadRecordsRequest(DistanceRecord::class, timeRangeFilter = range)).records.forEach { record ->
            output.put(base(record.metadata.id, "distance", record.startTime, record.endTime, record.metadata).put("payload", JSONObject().put("metres", record.distance.inMeters)))
        }
        client.readRecords(ReadRecordsRequest(ActiveCaloriesBurnedRecord::class, timeRangeFilter = range)).records.forEach { record ->
            output.put(base(record.metadata.id, "active_calories", record.startTime, record.endTime, record.metadata).put("payload", JSONObject().put("kilocalories", record.energy.inKilocalories)))
        }
        client.readRecords(ReadRecordsRequest(TotalCaloriesBurnedRecord::class, timeRangeFilter = range)).records.forEach { record ->
            output.put(base(record.metadata.id, "total_calories", record.startTime, record.endTime, record.metadata).put("payload", JSONObject().put("kilocalories", record.energy.inKilocalories)))
        }
        client.readRecords(ReadRecordsRequest(WeightRecord::class, timeRangeFilter = range)).records.forEach { record ->
            output.put(base(record.metadata.id, "weight", record.time, record.time, record.metadata).put("payload", JSONObject().put("kilograms", record.weight.inKilograms)))
        }
        val zone = ZoneId.systemDefault()
        var day = importFrom.atZone(zone).toLocalDate()
        val finalDay = end.atZone(zone).toLocalDate()
        while (!day.isAfter(finalDay)) {
            val dayStart = maxOf(importFrom, day.atStartOfDay(zone).toInstant())
            val dayEnd = minOf(end, day.plusDays(1).atStartOfDay(zone).toInstant())
            if (dayStart < dayEnd) {
                val aggregate = client.aggregate(
                    AggregateRequest(
                        setOf(
                            StepsRecord.COUNT_TOTAL,
                            ExerciseSessionRecord.EXERCISE_DURATION_TOTAL,
                            ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL,
                            TotalCaloriesBurnedRecord.ENERGY_TOTAL,
                            DistanceRecord.DISTANCE_TOTAL
                        ),
                        TimeRangeFilter.between(dayStart, dayEnd)
                    )
                )
                val payload = JSONObject()
                    .put("steps", aggregate[StepsRecord.COUNT_TOTAL] ?: 0L)
                    .put("activeMinutes", aggregate[ExerciseSessionRecord.EXERCISE_DURATION_TOTAL]?.toMinutes() ?: 0L)
                    .put("activeKilocalories", aggregate[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0)
                    .put("totalKilocalories", aggregate[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories ?: 0.0)
                    .put("distanceMetres", aggregate[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0)
                output.put(JSONObject()
                    .put("externalRecordId", "daily-summary-$day")
                    .put("recordType", "daily_summary")
                    .put("startedAt", dayStart.toString())
                    .put("endedAt", dayEnd.toString())
                    .put("sourceApp", "health_connect_aggregate")
                    .put("sourceDevice", "")
                    .put("payload", payload))
            }
            day = day.plusDays(1)
        }
        return output
    }

    private fun base(id: String, type: String, start: Instant, end: Instant, metadata: Metadata) = JSONObject()
        .put("externalRecordId", id).put("recordType", type).put("startedAt", start.toString()).put("endedAt", end.toString())
        .put("sourceApp", metadata.dataOrigin.packageName)
        .put("sourceDevice", listOfNotNull(metadata.device?.manufacturer, metadata.device?.model).joinToString(" "))
}
