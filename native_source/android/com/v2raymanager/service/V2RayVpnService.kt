package com.v2raymanager.service

import android.net.VpnService
import android.content.Intent
import android.os.ParcelFileDescriptor
import android.util.Log

class V2RayVpnService : VpnService() {
    private var vpnInterface: ParcelFileDescriptor? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val command = intent?.getStringExtra("COMMAND")
        val config = intent?.getStringExtra("CONFIG")

        if (command == "START") {
            startVpn(config)
        } else if (command == "STOP") {
            stopVpn()
        }

        return START_STICKY
    }

    private fun startVpn(config: String?) {
        // Here you would initialize V2Ray Core with the config string
        // For now, we set up a basic VPN interface
        try {
            if (vpnInterface == null) {
                vpnInterface = Builder()
                    .addAddress("10.0.0.2", 24)
                    .addDnsServer("8.8.8.8")
                    .addRoute("0.0.0.0", 0)
                    .setSession("V2RayManager")
                    .establish()
            }
            Log.i("V2RayVpnService", "VPN Started with config: $config")
        } catch (e: Exception) {
            Log.e("V2RayVpnService", "Failed to start VPN", e)
        }
    }

    private fun stopVpn() {
        vpnInterface?.close()
        vpnInterface = null
        stopForeground(true)
        stopSelf()
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }
}
