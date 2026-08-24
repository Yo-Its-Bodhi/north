plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android {
    namespace = "io.bodhix.north.health"
    compileSdk = 36
    defaultConfig {
        applicationId = "io.bodhix.north.beta"
        minSdk = 28
        targetSdk = 35
        versionCode = 1
        versionName = "0.9.0-beta.1"
        buildConfigField("String", "NORTH_WEB_URL", "\"https://north.bodhix.io\"")
    }
    buildFeatures { buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.health.connect:connect-client:1.1.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.1")
}
