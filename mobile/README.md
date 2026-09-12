# AgroThulir mobile

React Native Android implementation of the AgroThulir operator and administration app. The checked-in `android/` directory is a native Gradle project and can be opened directly in Android Studio.

## Run

Use Node.js 22.13 or newer for the supported Expo SDK 57 toolchain.

```powershell
nvm use 22.13.0
npm.cmd install
npm.cmd run android
```

Android emulators use `http://10.0.2.2:8080` for the local backend. Copy `.env.example` to `.env` and change `EXPO_PUBLIC_API_URL` for a physical device or the web.

## Build with Gradle

The Android application ID is `com.agrothulir.mobile`. The local project is configured for `arm64-v8a`, matching modern physical Android devices and keeping native build disk usage manageable.

```powershell
cd D:\apps\kirish-ma\mobile
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.10"
$env:ANDROID_HOME = "C:\Android\Sdk"
.\android\gradlew.bat -p android assembleDebug
```

The APK is written to `android\app\build\outputs\apk\debug\app-debug.apk`. Install it on an authorized USB-debugging device with:

```powershell
adb install -r .\android\app\build\outputs\apk\debug\app-debug.apk
adb reverse tcp:8080 tcp:8080
adb reverse tcp:8081 tcp:8081
$env:EXPO_PUBLIC_API_URL = "http://localhost:8080"
npm.cmd start
```

In a second terminal, launch the installed app or run:

```powershell
adb shell monkey -p com.agrothulir.mobile 1
```

The app remains navigable with representative demo data when the API is offline. Control requests use the backend when available and preserve accepted/executing/confirmed UI states.

Included journeys: welcome and session entry; operator home, sites, devices and components; protected control; physical topology and sequence views; flows, schedules and alerts; role-aware corporate and super administration.
