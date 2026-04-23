package com.rajarsheechatterjee.LNReader

import android.app.Application
import android.util.Log
import android.webkit.CookieManager
import android.content.res.Configuration
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.rajarsheechatterjee.NativeFile.NativePackage
import com.rajarsheechatterjee.NativeVolumeButtonListener.NativeVolumeButtonListenerPackage
import com.rajarsheechatterjee.NativeTTSMediaControl.NativeTTSMediaControlPackage
import com.rajarsheechatterjee.NativeZipArchive.NativeZipArchivePackage
import expo.modules.ApplicationLifecycleDispatcher

import com.facebook.react.modules.network.OkHttpClientProvider
import com.facebook.react.modules.network.OkHttpClientFactory
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.dnsoverhttps.DnsOverHttps
import okhttp3.ResponseBody.Companion.toResponseBody
import okhttp3.brotli.BrotliInterceptor
import java.net.InetAddress
import org.jsoup.Jsoup

class MainApplication : Application(), ReactApplication {

    private val manager by lazy { CookieManager.getInstance() }

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    add(NativePackage())
                    add(NativeTTSMediaControlPackage())
                    add(NativeVolumeButtonListenerPackage())
                    add(NativeZipArchivePackage())
                    add(FlagSecurePackage())
                }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)
 
    override fun onCreate() {
        super.onCreate()

        setupCrashHandler()
        setupNetworkClient()

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

    private fun setupNetworkClient() {
        OkHttpClientProvider.setOkHttpClientFactory(object : OkHttpClientFactory {
            var client: OkHttpClient? = null
            override fun createNewNetworkModuleClient(): OkHttpClient {
                val bootstrapClient = OkHttpClient.Builder().build()
                val dns = DnsOverHttps.Builder().client(bootstrapClient)
                    .url("https://cloudflare-dns.com/dns-query".toHttpUrl())
                    .bootstrapDnsHosts(
                        InetAddress.getByName("162.159.36.1"),
                        InetAddress.getByName("162.159.46.1"),
                        InetAddress.getByName("1.1.1.1"),
                        InetAddress.getByName("1.0.0.1"),
                        InetAddress.getByName("162.159.132.53"),
                        InetAddress.getByName("2606:4700:4700::1111"),
                        InetAddress.getByName("2606:4700:4700::1001"),
                        InetAddress.getByName("2606:4700:4700::0064"),
                        InetAddress.getByName("2606:4700:4700::6400"),
                    )
                    .build()
                val builder = OkHttpClientProvider.createClientBuilder()
                builder.dns(dns)
                builder.addInterceptor { chain ->
                    val originalRequest = chain.request()
                    val request = originalRequest.newBuilder().removeHeader("Accept-Encoding").build()
                    val response = chain.proceed(request)
                    Log.d("LNReader_Debug_Network", "URL: ${request.url}")
                    val isCloudflareBlock = response.code in ERROR_CODES && response.header("Server") in SERVER_CHECK;
                    var isCaptcha = false
                    if (isCloudflareBlock) {
                        try {
                            val rawHtml = response.peekBody(Long.MAX_VALUE).string()
                            // Log.d("LNReader_Debug_Network", "Raw HTML: $rawHtml")
                            val document = Jsoup.parse(
                                rawHtml,
                                response.request.url.toString(),
                            )
                            isCaptcha = document.getElementById("challenge-error-title") != null ||
                                        document.getElementById("challenge-error-text") != null
                            Log.d("LNReader_Debug_Network", "isCaptcha = $isCaptcha")
                        } catch (e: Exception) {
                            Log.e("LNReader_Debug_Network", "Error: $e")
                        }
                    }
                    if (isCaptcha) {
                        removeCookies(request.url, COOKIE_NAMES, 0)
                    }
                    response
                }
                builder.addInterceptor(BrotliInterceptor)
                return builder.build()
            }
        })
    }

    private fun removeCookies(url: HttpUrl, cookieNames: List<String>? = null, maxAge: Int = -1): Int {
        val urlString = url.toString()
        val cookies = manager.getCookie(urlString) ?: return 0

        fun List<String>.filterNames(): List<String> {
            return if (cookieNames != null) {
                this.filter { it in cookieNames }
            } else {
                this
            }
        }

        return cookies.split(";")
            .map { it.substringBefore("=") }
            .filterNames()
            .onEach { manager.setCookie(urlString, "$it=;Max-Age=$maxAge") }
            .count()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
    }
}

private val ERROR_CODES = listOf(403, 503)
private val SERVER_CHECK = arrayOf("cloudflare-nginx", "cloudflare")
private val COOKIE_NAMES = listOf("cf_clearance")
