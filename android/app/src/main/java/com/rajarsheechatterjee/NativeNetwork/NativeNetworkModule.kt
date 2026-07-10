package com.rajarsheechatterjee.NativeNetwork

import android.content.Context
import android.webkit.CookieManager
import android.webkit.WebStorage
import android.webkit.WebView
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.lnreader.spec.NativeNetworkSpec
import java.io.File
import okhttp3.Headers

class NativeNetworkModule(context: ReactApplicationContext) : NativeNetworkSpec(context) {
    override fun setDohProvider(providerId: String) {
        require(DohProvider.isSupported(providerId)) {
            "Unsupported DNS-over-HTTPS provider: $providerId"
        }
        reactApplicationContext
            .getSharedPreferences(NETWORK_PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .putString(DOH_PROVIDER_KEY, providerId)
            .apply()
    }

    override fun isUserAgentValid(value: String): Boolean {
        if (value.isBlank()) return false
        return runCatching {
            Headers.Builder().add("User-Agent", value)
        }.isSuccess
    }

    override fun clearWebViewData(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val webView = WebView(reactApplicationContext)
                webView.clearCache(true)
                webView.clearFormData()
                webView.clearHistory()
                webView.clearSslPreferences()
                WebStorage.getInstance().deleteAllData()

                CookieManager.getInstance().removeAllCookies {
                    try {
                        CookieManager.getInstance().flush()
                        webView.destroy()
                        File(reactApplicationContext.applicationInfo.dataDir, "app_webview")
                            .deleteRecursively()
                        promise.resolve(null)
                    } catch (error: Throwable) {
                        promise.reject("WEBVIEW_DATA_CLEAR_ERROR", error.message, error)
                    }
                }
            } catch (error: Throwable) {
                promise.reject("WEBVIEW_DATA_CLEAR_ERROR", error.message, error)
            }
        }
    }
}
