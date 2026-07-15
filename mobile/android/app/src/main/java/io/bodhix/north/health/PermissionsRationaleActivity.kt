package io.bodhix.north.health

import android.app.Activity
import android.os.Bundle
import android.widget.TextView

class PermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(TextView(this).apply {
            text = "North reads only the health categories you approve to show your real training, sleep, heart rate, steps and recovery context. You can pause sync or revoke access at any time. North does not provide medical diagnosis."
            textSize = 18f; setPadding(48, 80, 48, 48)
        })
    }
}
