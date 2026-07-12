package com.rajarsheechatterjee.NativeNetwork

import java.net.InetAddress
import okhttp3.Dns

/** Keeps development servers and LAN resources on the system resolver. */
internal class LocalAwareDns(
    private val delegate: Dns,
) : Dns {
    override fun lookup(hostname: String): List<InetAddress> =
        if (LocalAddressClassifier.isLocalHostname(hostname) ||
            LocalAddressClassifier.isIpLiteral(hostname)
        ) {
            Dns.SYSTEM.lookup(hostname)
        } else {
            delegate.lookup(hostname)
        }
}
