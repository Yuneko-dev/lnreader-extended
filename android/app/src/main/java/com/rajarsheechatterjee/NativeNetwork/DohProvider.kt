package com.rajarsheechatterjee.NativeNetwork

import java.net.InetAddress
import okhttp3.Dns
import okhttp3.OkHttpClient
import okhttp3.dnsoverhttps.DnsOverHttps
import okhttp3.HttpUrl.Companion.toHttpUrl

internal const val DISABLED_DOH_PROVIDER = "disabled"

internal enum class DohProvider(
    val id: String,
    private val endpoint: String,
    private vararg val bootstrapAddresses: String,
) {
    CLOUDFLARE(
        "cloudflare",
        "https://cloudflare-dns.com/dns-query",
        "162.159.36.1",
        "162.159.46.1",
        "1.1.1.1",
        "1.0.0.1",
        "162.159.132.53",
        "2606:4700:4700::1111",
        "2606:4700:4700::1001",
        "2606:4700:4700::0064",
        "2606:4700:4700::6400",
    ),
    GOOGLE(
        "google",
        "https://dns.google/dns-query",
        "8.8.4.4",
        "8.8.8.8",
        "2001:4860:4860::8888",
        "2001:4860:4860::8844",
    ),
    ADGUARD(
        "adguard",
        "https://dns-unfiltered.adguard.com/dns-query",
        "94.140.14.140",
        "94.140.14.141",
        "2a10:50c0::1:ff",
        "2a10:50c0::2:ff",
    ),
    QUAD9(
        "quad9",
        "https://dns.quad9.net/dns-query",
        "9.9.9.9",
        "149.112.112.112",
        "2620:fe::fe",
        "2620:fe::9",
    ),
    ALIDNS(
        "alidns",
        "https://dns.alidns.com/dns-query",
        "223.5.5.5",
        "223.6.6.6",
        "2400:3200::1",
        "2400:3200:baba::1",
    ),
    DNSPOD(
        "dnspod",
        "https://doh.pub/dns-query",
        "1.12.12.12",
        "120.53.53.53",
    ),
    DNS360(
        "360",
        "https://doh.360.cn/dns-query",
        "101.226.4.6",
        "218.30.118.6",
        "123.125.81.6",
        "140.207.198.6",
        "180.163.249.75",
        "101.199.113.208",
        "36.99.170.86",
    ),
    QUAD101(
        "quad101",
        "https://dns.twnic.tw/dns-query",
        "101.101.101.101",
        "2001:de4::101",
        "2001:de4::102",
    ),
    MULLVAD(
        "mullvad",
        "https://dns.mullvad.net/dns-query",
        "194.242.2.2",
        "2a07:e340::2",
    ),
    CONTROLD(
        "controld",
        "https://freedns.controld.com/p0",
        "76.76.2.0",
        "76.76.10.0",
        "2606:1a40::",
        "2606:1a40:1::",
    ),
    NJALLA(
        "njalla",
        "https://dns.njal.la/dns-query",
        "95.215.19.53",
        "2001:67c:2354:2::53",
    ),
    SHECAN(
        "shecan",
        "https://free.shecan.ir/dns-query",
        "178.22.122.100",
        "185.51.200.2",
    );

    fun createDns(bootstrapClient: OkHttpClient): Dns =
        LocalAwareDns(
            DnsOverHttps.Builder()
                .client(bootstrapClient)
                .url(endpoint.toHttpUrl())
                .bootstrapDnsHosts(
                    *bootstrapAddresses.map(InetAddress::getByName).toTypedArray(),
                )
                .build(),
        )

    companion object {
        fun fromId(id: String): DohProvider? = entries.find { it.id == id }

        fun isSupported(id: String): Boolean =
            id == DISABLED_DOH_PROVIDER || fromId(id) != null
    }
}
