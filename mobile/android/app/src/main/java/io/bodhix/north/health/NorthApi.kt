package io.bodhix.north.health

import java.net.HttpURLConnection
import java.net.URL

class NorthApi(private val baseUrl: String = "https://north.bodhix.io") {
    fun login(username: String, password: String, deviceId: String): String {
        val body = org.json.JSONObject().put("username", username).put("password", password).toString()
        val result = request("/v1/auth/login", "POST", body, null, deviceId)
        return org.json.JSONObject(result).getString("accessToken")
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
