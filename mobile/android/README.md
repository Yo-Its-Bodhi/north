# North Beta for Android

North Beta is an installable Android shell for the complete North experience. It runs alongside the existing production bridge under the separate `io.bodhix.north.beta` application identity and connects Galaxy Watch/Samsung Health data through Android Health Connect.

## Beta scope

- Complete North interface inside the application rather than handing off to a browser
- Steps, heart rate, sleep, exercise sessions, distance, active calories, and weight
- Explicit Health Connect permissions
- Existing North authentication with an encrypted rotating refresh token; the password is never stored
- Seven-day overlap after the first import so amended Health Connect records are safely upserted
- Automatic six-hour sync when Android grants background Health Connect access
- Revocation remains available in Android Health Connect settings
- No production deployment or database migration is required to install this beta

## Test on a Samsung phone

1. Open Samsung Health → Settings → Health Connect and grant Samsung Health access.
2. Trigger **Sync now** in Samsung Health after the Galaxy Watch has synchronized.
3. Install `app/build/outputs/apk/debug/app-debug.apk` on Android 9 or newer.
4. Sign into North in the app. Open North's Samsung Health control, grant the requested categories, then sign in once in the native connector.
5. Android keeps the beta and the earlier North Health bridge as separate apps. The beta can be removed without affecting the account database.

For Play distribution, declare every requested Health Connect data type in Play Console and publish the health-data privacy rationale. North does not need Samsung Health Data SDK partnership for this Health Connect route.
