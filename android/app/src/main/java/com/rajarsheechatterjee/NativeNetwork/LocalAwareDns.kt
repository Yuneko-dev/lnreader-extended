package com.rajarsheechatterjee.NativeNetwork

import java.net.InetAddress
import okhttp3.Dns

/** Keeps development servers and LAN resources on the system resolver. */
internal class LocalAwareDns(
    private val delegate: Dns,
) : Dns {
    override fun lookup(hostname: String): List<InetAddress> =
        if (hostname.isLocalHost()) {
            Dns.SYSTEM.lookup(hostname)
        } else {
            delegate.lookup(hostname)
        }
}

private fun String.isLocalHost(): Boolean {
    val host = trimEnd('.').lowercase()
    return host == "localhost" ||
        '.' !in host ||
        ':' in host ||
        host.isIpv4Address() ||
        LOCAL_DNS_SUFFIXES.any(host::endsWith)
}

private fun String.isIpv4Address(): Boolean {
    val octets = split('.')
    return octets.size == 4 && octets.all { octet ->
        octet.isNotEmpty() &&
            octet.length <= 3 &&
            octet.all { it in '0'..'9' } &&
            octet.toInt() in 0..255
    }
}

private val LOCAL_DNS_SUFFIXES = listOf(
    ".localhost",
    ".local",
    ".lan",
    ".home",
    ".home.arpa",
    ".internal",
)
