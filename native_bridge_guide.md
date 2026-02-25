# راهنمای پیاده‌سازی لایه Native برای اتصال V2Ray

برای برقراری اتصال واقعی VPN در اندروید، نیاز است که یک Native Module در ری‌اکت نیتیو ایجاد کنید که از کتابخانه `v2ray-android` یا مستقیم از هسته `v2fly` استفاده کند.

## ۱. اضافه کردن وابستگی‌ها (build.gradle)
در فایل `android/app/build.gradle` وابستگی زیر را اضافه کنید:
```gradle
dependencies {
    implementation 'com.github.2dust:v2rayNG:1.8.5' // نمونه کتابخانه پایه
}
```

## ۲. ایجاد کلاس V2RayModule.kt
این کلاس وظیفه برقراری ارتباط بین جاوا/کاتلین و جاوااسکریپت را دارد.

```kotlin
package com.v2raymanager

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class V2RayModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "V2RayModule"
    }

    @ReactMethod
    fun startV2Ray(config: String, promise: Promise) {
        try {
            // منطق راه‌اندازی VpnService و شروع تونل با کانفیگ دریافتی
            // V2rayServiceManager.startV2ray(reactApplicationContext, config)
            promise.resolve(true)
            sendEvent("onConnectionStatusChanged", "connected")
        } catch (e: Exception) {
            promise.reject("ERR_START", e.message)
        }
    }

    @ReactMethod
    fun stopV2Ray(promise: Promise) {
        // V2rayServiceManager.stopV2ray(reactApplicationContext)
        promise.resolve(true)
        sendEvent("onConnectionStatusChanged", "disconnected")
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        // promise.resolve(V2rayServiceManager.getState().name)
    }

    private fun sendEvent(eventName: String, status: String) {
        val params = Arguments.createMap()
        params.putString("status", status)
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
```

## ۳. ثبت ماژول در Package
باید کلاس فوق را در `V2RayPackage.kt` ثبت و به `MainApplication.java` اضافه کنید.

## ۴. تنظیمات AndroidManifest.xml
دسترسی‌های لازم برای VpnService:
```xml
<service
    android:name="com.v2ray.ang.service.V2RayVpnService"
    android:permission="android.permission.BIND_VPN_SERVICE"
    android:process=":bg">
    <intent-filter>
        <action android:name="android.net.VpnService" />
    </intent-filter>
</service>
```

---
*نکته: با توجه به محدودیت‌های محیط توسعه، این کدها باید در محیط Android Studio بر روی سورس نهایی اعمال و بیلد شوند.*
