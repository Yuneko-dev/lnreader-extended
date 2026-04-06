package com.rajarsheechatterjee.LNReader
import expo.modules.ExpoReactHostFactory

import android.app.Application
import android.content.res.Configuration
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.rajarsheechatterjee.NativeFile.NativePackage
import com.rajarsheechatterjee.NativeVolumeButtonListener.NativeVolumeButtonListenerPackage
import com.rajarsheechatterjee.NativeTTSMediaControl.NativeTTSMediaControlPackage
import com.rajarsheechatterjee.NativeZipArchive.NativeZipArchivePackage
import expo.modules.ApplicationLifecycleDispatcher

import com.facebook.react.modules.network.OkHttpClientProvider
import com.facebook.react.modules.network.OkHttpClientFactory
import okhttp3.OkHttpClient
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.dnsoverhttps.DnsOverHttps
import java.net.InetAddress

class MainApplication : Application(), ReactApplication {
    override val reactHost: ReactHost by lazy {
        ExpoReactHostFactory.getDefaultReactHost(
            context = applicationContext,
            packageList =
                PackageList(this).packages.apply {
                    add(NativePackage())
                    add(NativeTTSMediaControlPackage())
                    add(NativeVolumeButtonListenerPackage())
                    add(NativeZipArchivePackage())
                },
        )
    }

    override fun onCreate() {
        super.onCreate()

        OkHttpClientProvider.setOkHttpClientFactory(object : OkHttpClientFactory {
            override fun createNewNetworkModuleClient(): OkHttpClient {
                val builder = OkHttpClientProvider.createClientBuilder()
                val dns = DnsOverHttps.Builder().client(builder.build())
                    .url("https://cloudflare-dns.com/dns-query".toHttpUrl())
                    .bootstrapDnsHosts(
                        InetAddress.getByName("1.1.1.1"),
                        InetAddress.getByName("1.0.0.1"),
                        InetAddress.getByName("2606:4700:4700::1111"),
                        InetAddress.getByName("2606:4700:4700::1001")
                    )
                    .build()
                builder.dns(dns)
                return builder.build()
            }
        })

        loadReactNative(this)
        ApplicationLifecycleDispatcher.onApplicationCreate(this)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
    }
}
