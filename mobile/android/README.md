# North Android Health Bridge

This companion connects Galaxy Watch/Samsung Health data to North through Android Health Connect. It reads only user-approved categories and uploads normalized, idempotent records to the signed-in North account.

## Current scope

- Steps, heart rate, sleep, exercise sessions, distance, active calories, and weight
- Explicit Health Connect permissions
- Existing North username/password authentication
- 30-day initial import and idempotent server upserts
- Revocation remains available in Android Health Connect settings

## Test on a Samsung phone

1. Open Samsung Health → Settings → Health Connect and grant Samsung Health access.
2. Trigger **Sync now** in Samsung Health after the Galaxy Watch has synchronized.
3. Install Android SDK Platform 36, open this project in Android Studio, let Gradle sync, and run `app` on Android 9 or newer.
4. Grant North the desired categories, enter the existing North account, and sync.

For Play distribution, declare every requested Health Connect data type in Play Console and publish the health-data privacy rationale. North does not need Samsung Health Data SDK partnership for this Health Connect route.
