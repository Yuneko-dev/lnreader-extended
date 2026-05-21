package com.rajarsheechatterjee.NativeCDPProxy

import android.net.LocalSocket
import android.net.LocalSocketAddress
import android.os.Process
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule
import java.io.InputStream
import java.io.OutputStream
import java.net.InetAddress
import java.net.ServerSocket
import kotlin.concurrent.thread

@ReactModule(name = CDPProxyModule.NAME)
class CDPProxyModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "NativeCDPProxy"
    }

    override fun getName(): String {
        return NAME
    }

    private var serverSocket: ServerSocket? = null
    private var isProxyRunning = false
    private val activeClients = java.util.Collections.synchronizedList(mutableListOf<java.net.Socket>())

    @ReactMethod
    fun enableWebViewDebugging() {
        UiThreadUtil.runOnUiThread {
            android.webkit.WebView.setWebContentsDebuggingEnabled(true)
        }
    }

    @ReactMethod
    fun startProxy(promise: Promise) {
        if (isProxyRunning && serverSocket != null) {
            promise.resolve(serverSocket!!.localPort)
            return
        }

        try {
            serverSocket = ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"))
            val allocatedPort = serverSocket!!.localPort
            isProxyRunning = true

            thread {
                try {
                    while (isProxyRunning && serverSocket != null && !serverSocket!!.isClosed) {
                        val client = serverSocket!!.accept()
                        activeClients.add(client)
                        
                        thread {
                            var localSocket: LocalSocket? = null
                            try {
                                localSocket = LocalSocket()
                                val pid = Process.myPid()
                                val socketName = "webview_devtools_remote_$pid"
                                localSocket.connect(LocalSocketAddress(socketName, LocalSocketAddress.Namespace.ABSTRACT))

                                val closeSockets: () -> Unit = {
                                    try { localSocket?.close() } catch (e: Exception) {}
                                    try { 
                                        client.close() 
                                        activeClients.remove(client)
                                    } catch (e: Exception) {}
                                }
                                
                                thread { copyStream(client.inputStream, localSocket!!.outputStream, true, closeSockets) }
                                thread { copyStream(localSocket!!.inputStream, client.outputStream, false, closeSockets) }
                            } catch (e: Exception) {
                                e.printStackTrace()
                                try { localSocket?.close() } catch (e: Exception) {}
                                try { 
                                    client.close()
                                    activeClients.remove(client)
                                } catch (e: Exception) {}
                            }
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            promise.resolve(allocatedPort)
        } catch (e: Exception) {
            promise.reject("CDP_PROXY_ERROR", e)
        }
    }

    @ReactMethod
    fun stopProxy() {
        isProxyRunning = false
        try {
            serverSocket?.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        serverSocket = null
        
        // Close all active client connections
        synchronized(activeClients) {
            for (client in activeClients) {
                try {
                    client.close()
                } catch (e: Exception) {}
            }
            activeClients.clear()
        }
    }

    override fun invalidate() {
        stopProxy()
        super.invalidate()
    }

    private fun copyStream(input: InputStream, output: OutputStream, isClientToTarget: Boolean, onFinish: () -> Unit) {
        try {
            val buffer = ByteArray(8192)
            var bytesRead: Int
            var firstPacket = isClientToTarget
            
            while (input.read(buffer).also { bytesRead = it } != -1) {
                var writeBuffer = buffer
                var writeLen = bytesRead
                
                if (firstPacket) {
                    firstPacket = false
                    val text = String(buffer, 0, bytesRead, Charsets.UTF_8)
                    if (text.startsWith("GET ") && text.contains("Upgrade: websocket", ignoreCase = true)) {
                        val modifiedText = text.replace(Regex("Origin: [^\r\n]+\r\n", RegexOption.IGNORE_CASE), "")
                        val modifiedBytes = modifiedText.toByteArray(Charsets.UTF_8)
                        writeBuffer = modifiedBytes
                        writeLen = modifiedBytes.size
                    }
                }
                
                output.write(writeBuffer, 0, writeLen)
                output.flush()
            }
        } catch (e: Exception) {
            // Ignore socket closed exceptions
        } finally {
            onFinish()
        }
    }
}
