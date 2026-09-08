package io.bodhix.north.health

import java.net.HttpURLConnection
import java.net.URL

data class NorthSession(val accessToken: String, val refreshToken: String)

class NorthApi(private val baseUrl: String = "https://north.bodhix.io") {
    fun login(username: String, password: String, deviceId: String): NorthSession {
        val body = org.json.JSONObject().put("username", username).put("password", password).toString()
        return session(request("/v1/auth/login", "POST", body, null, deviceId))
    }

    fun refresh(refreshToken: String, deviceId: String): NorthSession {
        val body = org.json.JSONObject().put("refreshToken", refreshToken).toString()
        return session(request("/v1/auth/refresh", "POST", body, null, deviceId))
    }

    fun connect(token: String, deviceId: String): org.json.JSONObject {
        val scopes = org.json.JSONArray(listOf("workouts", "daily_movement", "sleep_recovery", "body_measurements"))
        val preferences = org.json.JSONObject()
            .put("workouts", true)
            .put("dailyMovement", true)
            .put("sleepRecovery", true)
            .put("bodyMeasurements", false)
        val body = org.json.JSONObject()
            .put("status", "connected")
            .put("scopes", scopes)
            .put("preferences", preferences)
            .toString()
        return org.json.JSONObject(request("/v1/health/connections/health_connect", "PUT", body, token, deviceId))
    }

    fun importAll(token: String, deviceId: String, records: org.json.JSONArray): Int {
        var uploaded = 0
        var offset = 0
        while (offset < records.length()) {
            val batch = org.json.JSONArray()
            var estimatedBytes = 80
            var end = offset
            while (end < records.length() && batch.length() < 250) {
                val record = records.get(end)
                val recordBytes = record.toString().toByteArray(Charsets.UTF_8).size
                if (batch.length() > 0 && estimatedBytes + recordBytes > 1_250_000) break
                batch.put(record); estimatedBytes += recordBytes; end += 1
            }
            request("/v1/health/import", "POST", org.json.JSONObject().put("provider", "health_connect").put("records", batch).toString(), token, deviceId)
            uploaded += batch.length()
            offset = end
        }
        return uploaded
    }

    private fun session(response: String): NorthSession {
        val result = org.json.JSONObject(response)
        return NorthSession(result.getString("accessToken"), result.getString("refreshToken"))
    }

    private fun request(path: String, method: String, body: String, token: String?, deviceId: String): String {
        repeat(3) { attempt ->
            val connection = URL(baseUrl + path).openConnection() as HttpURLConnection
            connection.requestMethod = method; connection.connectTimeout = 15_000; connection.readTimeout = 90_000; connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("X-North-Device-Id", deviceId)
            connection.setRequestProperty("X-North-Device-Name", "North Android Health Bridge")
            if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
            connection.outputStream.use { it.write(body.toByteArray()) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val response = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code in 200..299) { connection.disconnect(); return response }
            if (code == 429 && attempt < 2) {
                val seconds = connection.getHeaderField("Retry-After")?.toLongOrNull()?.coerceIn(1, 90) ?: 60
                connection.disconnect(); Thread.sleep((seconds + 1) * 1_000); return@repeat
            }
            connection.disconnect(); error(response.ifBlank { "North returned $code" })
        }
        error("North is still busy. Wait one minute and try again.")
    }
}
