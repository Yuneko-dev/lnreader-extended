package com.rajarsheechatterjee.NativeNetwork

import android.content.Context
import java.io.ByteArrayOutputStream
import java.io.FilterOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.net.SocketAddress
import java.nio.channels.SocketChannel
import javax.net.SocketFactory
import kotlin.math.min
import kotlin.random.Random

internal class RoutingSocketFactory(context: Context) : SocketFactory() {
    private val applicationContext = context.applicationContext
    private val direct = getDefault()
    private val bypass = BypassSocketFactory()

    private fun current(): SocketFactory =
        if (readNetworkMode(applicationContext) == NetworkMode.DPI_BYPASS) {
            bypass
        } else {
            direct
        }

    override fun createSocket(): Socket = current().createSocket()

    override fun createSocket(host: String, port: Int): Socket = current().createSocket(host, port)

    override fun createSocket(
        host: String,
        port: Int,
        localHost: InetAddress,
        localPort: Int,
    ): Socket = current().createSocket(host, port, localHost, localPort)

    override fun createSocket(address: InetAddress, port: Int): Socket =
        current().createSocket(address, port)

    override fun createSocket(
        address: InetAddress,
        port: Int,
        localAddress: InetAddress,
        localPort: Int,
    ): Socket = current().createSocket(address, port, localAddress, localPort)
}

internal class BypassSocketFactory : SocketFactory() {
    private val delegate = getDefault()

    override fun createSocket(): Socket = BypassSocket(delegate.createSocket())

    override fun createSocket(host: String, port: Int): Socket =
        BypassSocket(
            delegate.createSocket(host, port),
            LocalAddressClassifier.isLocalHostname(host),
        )

    override fun createSocket(
        host: String,
        port: Int,
        localHost: InetAddress,
        localPort: Int,
    ): Socket = BypassSocket(
        delegate.createSocket(host, port, localHost, localPort),
        LocalAddressClassifier.isLocalHostname(host),
    )

    override fun createSocket(address: InetAddress, port: Int): Socket =
        BypassSocket(
            delegate.createSocket(address, port),
            LocalAddressClassifier.isLocalAddress(address),
        )

    override fun createSocket(
        address: InetAddress,
        port: Int,
        localAddress: InetAddress,
        localPort: Int,
    ): Socket = BypassSocket(
        delegate.createSocket(address, port, localAddress, localPort),
        LocalAddressClassifier.isLocalAddress(address),
    )
}

private class BypassSocket(
    private val delegate: Socket,
    private val forceDirect: Boolean = false,
) : Socket() {
    private var bypassOutputStream: OutputStream? = null
    private var bypassEnabled = !forceDirect && shouldBypass(delegate.inetAddress)

    override fun connect(endpoint: SocketAddress?) {
        delegate.connect(endpoint)
        bypassEnabled = !forceDirect && shouldBypass(delegate.inetAddress, endpoint)
    }

    override fun connect(endpoint: SocketAddress?, timeout: Int) {
        delegate.connect(endpoint, timeout)
        bypassEnabled = !forceDirect && shouldBypass(delegate.inetAddress, endpoint)
    }

    override fun bind(bindpoint: SocketAddress?) = delegate.bind(bindpoint)
    override fun getInetAddress(): InetAddress? = delegate.inetAddress
    override fun getLocalAddress(): InetAddress? = delegate.localAddress
    override fun getPort(): Int = delegate.port
    override fun getLocalPort(): Int = delegate.localPort
    override fun getRemoteSocketAddress(): SocketAddress? = delegate.remoteSocketAddress
    override fun getLocalSocketAddress(): SocketAddress? = delegate.localSocketAddress
    override fun getChannel(): SocketChannel? = delegate.channel
    override fun getInputStream(): InputStream = delegate.getInputStream()

    override fun getOutputStream(): OutputStream {
        val output = delegate.getOutputStream()
        if (!bypassEnabled) return output
        return bypassOutputStream ?: BypassOutputStream(output).also {
            bypassOutputStream = it
        }
    }

    override fun setTcpNoDelay(on: Boolean) {
        delegate.tcpNoDelay = on
    }

    override fun getTcpNoDelay(): Boolean = delegate.tcpNoDelay

    override fun setSoLinger(on: Boolean, linger: Int) = delegate.setSoLinger(on, linger)
    override fun getSoLinger(): Int = delegate.soLinger
    override fun sendUrgentData(data: Int) = delegate.sendUrgentData(data)

    override fun setOOBInline(on: Boolean) {
        delegate.oobInline = on
    }

    override fun getOOBInline(): Boolean = delegate.oobInline

    override fun setSoTimeout(timeout: Int) {
        delegate.soTimeout = timeout
    }

    override fun getSoTimeout(): Int = delegate.soTimeout

    override fun setSendBufferSize(size: Int) {
        delegate.sendBufferSize = size
    }

    override fun getSendBufferSize(): Int = delegate.sendBufferSize

    override fun setReceiveBufferSize(size: Int) {
        delegate.receiveBufferSize = size
    }

    override fun getReceiveBufferSize(): Int = delegate.receiveBufferSize

    override fun setKeepAlive(on: Boolean) {
        delegate.keepAlive = on
    }

    override fun getKeepAlive(): Boolean = delegate.keepAlive

    override fun setTrafficClass(tc: Int) {
        delegate.trafficClass = tc
    }

    override fun getTrafficClass(): Int = delegate.trafficClass

    override fun setReuseAddress(on: Boolean) {
        delegate.reuseAddress = on
    }

    override fun getReuseAddress(): Boolean = delegate.reuseAddress
    override fun close() = delegate.close()
    override fun shutdownInput() = delegate.shutdownInput()
    override fun shutdownOutput() = delegate.shutdownOutput()
    override fun toString(): String = delegate.toString()
    override fun isConnected(): Boolean = delegate.isConnected
    override fun isBound(): Boolean = delegate.isBound
    override fun isClosed(): Boolean = delegate.isClosed
    override fun isInputShutdown(): Boolean = delegate.isInputShutdown
    override fun isOutputShutdown(): Boolean = delegate.isOutputShutdown

    private fun shouldBypass(address: InetAddress?, endpoint: SocketAddress? = null): Boolean {
        val socketAddress = endpoint as? InetSocketAddress
        if (socketAddress != null &&
            LocalAddressClassifier.isLocalHostname(socketAddress.hostString)
        ) {
            return false
        }
        val resolvedAddress = address ?: socketAddress?.address
        return resolvedAddress?.let {
            !LocalAddressClassifier.isLocalAddress(it)
        } ?: true
    }
}

private class BypassOutputStream(
    private val delegate: OutputStream,
) : FilterOutputStream(delegate) {
    private val buffer = ByteArrayOutputStream()
    private var firstWrite = true

    override fun write(value: Int) {
        if (!firstWrite) {
            delegate.write(value)
            return
        }
        buffer.write(value)
        flushFirstWriteIfReady()
    }

    override fun write(bytes: ByteArray, offset: Int, length: Int) {
        if (!firstWrite) {
            delegate.write(bytes, offset, length)
            return
        }
        buffer.write(bytes, offset, length)
        flushFirstWriteIfReady()
    }

    override fun flush() {
        if (firstWrite && buffer.size() > 0) processFirstWrite()
        delegate.flush()
    }

    private fun flushFirstWriteIfReady() {
        val data = buffer.toByteArray()
        when {
            looksLikeTlsRecord(data) && data.size < 9 -> Unit

            isTlsClientHello(data) -> {
                val recordSize = if (data.size >= 5) unsignedShort(data, 3) + 5 else Int.MAX_VALUE
                if (data.size >= recordSize || data.size >= MAX_FIRST_WRITE) processFirstWrite()
            }

            looksLikeHttpRequest(data) -> {
                if (data.indexOf(HTTP_HEADERS_END) >= 0 || data.size >= MAX_FIRST_WRITE) {
                    processFirstWrite()
                }
            }

            data.size >= TLS_HEADER_SIZE -> processFirstWrite()
        }
    }

    private fun processFirstWrite() {
        if (!firstWrite) return
        firstWrite = false
        val data = buffer.toByteArray()
        buffer.reset()

        when {
            isTlsClientHello(data) -> writeTls(data)
            isHttpRequest(data) -> simpleSplit(transformHttpRequest(data))
            else -> simpleSplit(data)
        }
    }

    private fun writeTls(data: ByteArray) {
        val payloadLength = unsignedShort(data, 3)
        val recordEnd = TLS_HEADER_SIZE + payloadLength
        if (recordEnd > data.size) {
            simpleSplit(data)
            return
        }

        val sni = findSni(data) ?: run {
            simpleSplit(data)
            return
        }
        val splitPoints = splitPoints(sni, payloadLength)
        var offset = TLS_HEADER_SIZE
        splitPoints.forEachIndexed { index, end ->
            val length = end - offset
            if (length <= 0) return@forEachIndexed
            delegate.write(0x16)
            delegate.write(data[1].toInt() and 0xFF)
            delegate.write(data[2].toInt() and 0xFF)
            delegate.write((length shr 8) and 0xFF)
            delegate.write(length and 0xFF)
            delegate.write(data, offset, length)
            delegate.flush()
            offset = end
            if (index < splitPoints.lastIndex) delay()
        }
        if (recordEnd < data.size) {
            delegate.write(data, recordEnd, data.size - recordEnd)
            delegate.flush()
        }
    }

    private fun splitPoints(sni: SniInfo, payloadLength: Int): List<Int> {
        val payloadEnd = TLS_HEADER_SIZE + payloadLength
        val points = mutableListOf<Int>()
        val before = sni.offset
        if (before > TLS_HEADER_SIZE + MIN_FRAGMENT_SIZE) points.add(before)

        val middle = sni.offset + sni.length / 2
        if (middle > (points.lastOrNull() ?: TLS_HEADER_SIZE) + MIN_FRAGMENT_SIZE &&
            middle < payloadEnd - MIN_FRAGMENT_SIZE
        ) {
            points.add(middle)
        }

        val after = sni.offset + sni.length
        if (after > (points.lastOrNull() ?: TLS_HEADER_SIZE) + MIN_FRAGMENT_SIZE &&
            after < payloadEnd - MIN_FRAGMENT_SIZE
        ) {
            points.add(after)
        }
        points.add(payloadEnd)

        if (points.size == 1) {
            val early = TLS_HEADER_SIZE + min(MIN_FRAGMENT_SIZE, payloadLength / 3)
            if (early < payloadEnd - MIN_FRAGMENT_SIZE) points.add(0, early)
        }
        return points
    }

    private fun simpleSplit(data: ByteArray) {
        if (data.size <= 2) {
            delegate.write(data)
            delegate.flush()
            return
        }
        delegate.write(data, 0, 1)
        delegate.flush()
        delay()
        delegate.write(data, 1, data.size - 1)
        delegate.flush()
    }

    private fun transformHttpRequest(data: ByteArray): ByteArray {
        val request = String(data, Charsets.ISO_8859_1)
        val transformed = request.replace(HOST_HEADER_REGEX) { match ->
            val header = mixCase(match.groupValues[1])
            val host = match.groupValues[2].trimEnd()
            val normalizedHost = if (!host.contains(':') && !host.endsWith('.')) "$host." else host
            "$header: $normalizedHost"
        }
        return transformed.toByteArray(Charsets.ISO_8859_1)
    }

    private fun findSni(data: ByteArray): SniInfo? {
        if (!isTlsClientHello(data) || data.size < 9) return null
        val recordLength = unsignedShort(data, 3)
        if (recordLength < 42 || TLS_HEADER_SIZE + recordLength > data.size) return null

        var position = TLS_HEADER_SIZE
        if (data[position].toInt() and 0xFF != 0x01) return null
        position += 38
        if (position >= data.size) return null
        position += 1 + (data[position].toInt() and 0xFF)
        if (position + 2 > data.size) return null
        position += 2 + unsignedShort(data, position)
        if (position >= data.size) return null
        position += 1 + (data[position].toInt() and 0xFF)
        if (position + 2 > data.size) return null

        val extensionsLength = unsignedShort(data, position)
        position += 2
        val extensionsEnd = position + extensionsLength
        if (extensionsEnd > data.size) return null

        while (position + 4 <= extensionsEnd) {
            val type = unsignedShort(data, position)
            val length = unsignedShort(data, position + 2)
            val dataStart = position + 4
            if (dataStart + length > extensionsEnd) return null
            if (type == 0x0000 && dataStart + 2 <= dataStart + length) {
                var namePosition = dataStart + 2
                while (namePosition + 3 <= dataStart + length) {
                    val nameLength = unsignedShort(data, namePosition + 1)
                    if (data[namePosition].toInt() and 0xFF == 0x00 &&
                        namePosition + 3 + nameLength <= dataStart + length
                    ) {
                        return SniInfo(namePosition + 3, nameLength)
                    }
                    namePosition += 3 + nameLength
                }
            }
            position = dataStart + length
        }
        return null
    }

    private fun isTlsClientHello(data: ByteArray): Boolean =
        data.size >= 9 &&
            data[0] == 0x16.toByte() &&
            data[1] == 0x03.toByte() &&
            data[5].toInt() and 0xFF == 0x01

    private fun looksLikeTlsRecord(data: ByteArray): Boolean =
        data.isNotEmpty() &&
            data[0] == 0x16.toByte() &&
            (data.size == 1 || data[1] == 0x03.toByte())

    private fun looksLikeHttpRequest(data: ByteArray): Boolean {
        val prefix = String(data, Charsets.ISO_8859_1).uppercase()
        return HTTP_METHODS.any { method -> "$method ".startsWith(prefix) || prefix.startsWith("$method ") }
    }

    private fun isHttpRequest(data: ByteArray): Boolean {
        val firstLine = String(data, Charsets.ISO_8859_1).substringBefore("\r\n")
        return firstLine.substringBefore(' ').uppercase() in HTTP_METHODS
    }

    private fun unsignedShort(data: ByteArray, offset: Int): Int =
        ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)

    private fun delay() {
        try {
            Thread.sleep(Random.nextLong(30L, 81L))
        } catch (_: InterruptedException) {
            Thread.currentThread().interrupt()
        }
    }

    private fun mixCase(value: String): String {
        val mixed = value.map { character ->
            if (Random.nextBoolean()) character.uppercaseChar() else character.lowercaseChar()
        }.joinToString("")
        return if (mixed == value) value.replaceFirstChar(Char::lowercaseChar) else mixed
    }

    private fun ByteArray.indexOf(needle: ByteArray): Int {
        if (needle.isEmpty() || size < needle.size) return -1
        for (index in 0..size - needle.size) {
            if (needle.indices.all { offset -> this[index + offset] == needle[offset] }) return index
        }
        return -1
    }

    private data class SniInfo(val offset: Int, val length: Int)

    private companion object {
        const val MAX_FIRST_WRITE = 32 * 1024
        const val MIN_FRAGMENT_SIZE = 4
        const val TLS_HEADER_SIZE = 5
        val HTTP_HEADERS_END = "\r\n\r\n".toByteArray(Charsets.ISO_8859_1)
        val HTTP_METHODS = setOf("GET", "POST", "HEAD", "PUT", "DELETE", "OPTIONS", "CONNECT", "PATCH")
        val HOST_HEADER_REGEX = Regex("(?im)^\\s*(Host):\\s*([^\\r\\n]+)")
    }
}
