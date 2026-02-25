package com.v2raymanager

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.content.Intent
import android.os.Build
import com.v2raymanager.service.V2RayVpnService

class V2RayModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "V2RayModule"

    @ReactMethod
    fun startV2Ray(config: String, promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, V2RayVpnService::class.java)
            intent.putExtra("COMMAND", "START")
            intent.putExtra("CONFIG", config)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }

            promise.resolve(true)
            sendEvent("onConnectionStatusChanged", "connected")
        } catch (e: Exception) {
            promise.reject("ERR_START", e.message)
        }
    }

    @ReactMethod
    fun stopV2Ray(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, V2RayVpnService::class.java)
            intent.putExtra("COMMAND", "STOP")
            reactApplicationContext.startService(intent)

            promise.resolve(true)
            sendEvent("onConnectionStatusChanged", "disconnected")
        } catch (e: Exception) {
            promise.reject("ERR_STOP", e.message)
        }
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        // Logic to return current state from Service
        promise.resolve("connected")
    }

    private fun sendEvent(eventName: String, status: String) {
        val params = Arguments.createMap()
        params.putString("status", status)
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
