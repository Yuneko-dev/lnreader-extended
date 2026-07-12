package com.rajarsheechatterjee.NativeNetwork

import android.content.Context
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import java.io.File
import java.net.Proxy
import okhttp3.Cache
import okhttp3.OkHttpClient

internal const val NETWORK_PREFERENCES = "network_preferences"
internal const val DOH_PROVIDER_KEY = "doh_provider"

class NetworkClientFactory(context: Context) : OkHttpClientFactory {
    private val applicationContext = context.applicationContext
    private val cache by lazy {
        Cache(
            File(applicationContext.cacheDir, "http-cache"),
            10L * 1024 * 1024,
        )
    }

    override fun createNewNetworkModuleClient(): OkHttpClient {
        val baseClient = OkHttpClientProvider.createClientBuilder()
            .cache(cache)
            .build()
        val preferences = applicationContext.getSharedPreferences(
            NETWORK_PREFERENCES,
            Context.MODE_PRIVATE,
        )
        val providerId = preferences
            .getString(DOH_PROVIDER_KEY, DISABLED_DOH_PROVIDER)
            .orEmpty()
        val provider = DohProvider.fromId(providerId)
        val clientBuilder = baseClient.newBuilder()
            .socketFactory(RoutingSocketFactory(applicationContext))

        if (provider != null) {
            val bootstrapClient = baseClient.newBuilder()
                .proxy(Proxy.NO_PROXY)
                .build()
            clientBuilder.dns(provider.createDns(bootstrapClient))
        }

        return clientBuilder.build()
    }
}
