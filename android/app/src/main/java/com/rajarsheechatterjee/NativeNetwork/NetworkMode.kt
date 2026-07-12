package com.rajarsheechatterjee.NativeNetwork

import android.content.Context

internal const val NETWORK_MODE_KEY = "network_mode"

internal enum class NetworkMode(val id: String) {
    DIRECT("direct"),
    DPI_BYPASS("dpi_bypass");

    companion object {
        fun fromId(id: String?) = entries.find { it.id == id } ?: DIRECT
        fun isSupported(id: String) = entries.any { it.id == id }
    }
}

internal fun readNetworkMode(context: Context): NetworkMode = NetworkMode.fromId(
    context.getSharedPreferences(NETWORK_PREFERENCES, Context.MODE_PRIVATE)
        .getString(NETWORK_MODE_KEY, null),
)
