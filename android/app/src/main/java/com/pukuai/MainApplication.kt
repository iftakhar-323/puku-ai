package com.pukuai

import android.app.Application
import android.content.res.Configuration
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import expo.modules.ExpoReactHostFactory.getDefaultReactHost
import expo.modules.ApplicationLifecycleDispatcher
import okhttp3.Dns
import okhttp3.OkHttpClient
import java.net.InetAddress
import java.net.UnknownHostException

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here:
          add(PukuNativePackage())
        },
      jsMainModulePath = "index",
    )
  }

  override fun onCreate() {
    super.onCreate()
    setupResilientDns()
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  private fun setupResilientDns() {
    val fallbackDns = object : Dns {
      override fun lookup(hostname: String): List<InetAddress> {
        try {
          return Dns.SYSTEM.lookup(hostname)
        } catch (e: UnknownHostException) {
          if (hostname.equals("app.bot.puku.sh", ignoreCase = true)) {
            return listOf(
              InetAddress.getByAddress(hostname, byteArrayOf(104.toByte(), 26.toByte(), 2.toByte(), 36.toByte())),
              InetAddress.getByAddress(hostname, byteArrayOf(172.toByte(), 67.toByte(), 72.toByte(), 18.toByte())),
              InetAddress.getByAddress(hostname, byteArrayOf(104.toByte(), 26.toByte(), 3.toByte(), 36.toByte()))
            )
          }
          throw e
        }
      }
    }

    OkHttpClientProvider.setOkHttpClientFactory(object : OkHttpClientFactory {
      override fun createNewNetworkModuleClient(): OkHttpClient {
        return OkHttpClientProvider.createClientBuilder()
          .dns(fallbackDns)
          .build()
      }
    })
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}

