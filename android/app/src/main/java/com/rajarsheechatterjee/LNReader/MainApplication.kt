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
import com.rajarsheechatterjee.NativeSPenRemote.NativeSPenRemotePackage
import com.rajarsheechatterjee.NativeVolumeButtonListener.NativeVolumeButtonListenerPackage
import com.rajarsheechatterjee.NativeTTSMediaControl.NativeTTSMediaControlPackage
import com.rajarsheechatterjee.NativeZipArchive.NativeZipArchivePackage
import com.rajarsheechatterjee.NativeEpub.NativeEpubPackage
import com.rajarsheechatterjee.LocalServer.LocalServerPackage
import com.rajarsheechatterjee.TikTokTTS.TikTokTTSPackage
import com.rajarsheechatterjee.NativeCDPProxy.CDPProxyPackage
import com.rajarsheechatterjee.NativeMaterialYou.NativeMaterialYouPackage
import expo.modules.ApplicationLifecycleDispatcher

class MainApplication : Application(), ReactApplication {
    override val reactHost: ReactHost by lazy {
        ExpoReactHostFactory.getDefaultReactHost(
            context = applicationContext,
            packageList =
                PackageList(this).packages.apply {
                    add(NativePackage())
                    add(NativeSPenRemotePackage())
                    add(NativeTTSMediaControlPackage())
                    add(NativeVolumeButtonListenerPackage())
                    add(NativeZipArchivePackage())
                    add(FlagSecurePackage())
                    add(NativeEpubPackage())
                    add(LocalServerPackage())
                    add(TikTokTTSPackage())
                    add(CDPProxyPackage())
                    add(NativeMaterialYouPackage())
                },
        )
    }

    override fun onCreate() {
        super.onCreate()
        setupCrashHandler()
        loadReactNative(this)
        ApplicationLifecycleDispatcher.onApplicationCreate(this)
    }

    private fun setupCrashHandler() {
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                val cacheDir = applicationContext.externalCacheDir ?: applicationContext.cacheDir
                val file = java.io.File(cacheDir, "crash_log.txt")
                val date = java.util.Date()
                val printWriter = java.io.PrintWriter(java.io.FileWriter(file))
                printWriter.println("Date: $date")
                printWriter.println("App Version: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
                printWriter.println("Device: ${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}")
                printWriter.println("Android Version: ${android.os.Build.VERSION.RELEASE} (SDK ${android.os.Build.VERSION.SDK_INT})")
                printWriter.println("--- Stack Trace ---")
                throwable.printStackTrace(printWriter)
                printWriter.flush()
                printWriter.close()
            } catch (e: Exception) {
                // Ignored
            }
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
    }
}
