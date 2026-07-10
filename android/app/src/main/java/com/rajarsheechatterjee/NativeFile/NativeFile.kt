package com.rajarsheechatterjee.NativeFile

import android.net.Uri
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.network.CookieJarContainer
import com.facebook.react.modules.network.ForwardingCookieHandler
import com.facebook.react.modules.network.OkHttpClientProvider
import com.lnreader.spec.NativeFileSpec
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Headers
import okhttp3.JavaNetCookieJar
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.File
import java.io.FileOutputStream
import java.io.FileWriter
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.io.PushbackInputStream
import java.util.zip.GZIPInputStream

/**
 * Extension to check if a ByteArray starts with the given magic bytes at an optional offset.
 * Usage: bytes.startsWith(0xFF, 0xD8, 0xFF) or bytes.startsWith(0x61, 0x76, 0x69, 0x66, offset = 8)
 */
private fun ByteArray.startsWith(vararg expected: Int, offset: Int = 0): Boolean {
    if (offset + expected.size > this.size) return false
    return expected.indices.all { this[offset + it] == expected[it].toByte() }
}

class NativeFile(context: ReactApplicationContext) :
    NativeFileSpec(context) {
    private val BUFFER_SIZE = 64 * 1024
    private val okHttpClient = OkHttpClientProvider.createClient()
    private val coroutineScope = CoroutineScope(Dispatchers.IO)

    init {
        val cookieContainer = okHttpClient.cookieJar as CookieJarContainer
        val cookieHandler = ForwardingCookieHandler(reactApplicationContext)
        cookieContainer.setCookieJar(JavaNetCookieJar(cookieHandler))
    }

    private fun getFileUri(filepath: String): Uri {
        var uri = Uri.parse(filepath)
        if (uri.scheme == null) {
            // No prefix, assuming that provided path is absolute path to file
            val file = File(filepath)
            if (file.isDirectory) {
                throw Exception("Invalid file, folder found!")
            }
            uri = Uri.parse("file://$filepath")
        }
        return uri
    }

    private fun getInputStream(filepath: String): InputStream {
        val uri = getFileUri(filepath)
        return reactApplicationContext.contentResolver.openInputStream(uri)
            ?: throw Exception("ENOENT: could not open an input stream for '$filepath'")
    }

    private val writeAccessByAPILevel: String
        get() = if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) "w" else "rwt"

    private fun getOutputStream(filepath: String): OutputStream {
        val uri = getFileUri(filepath)
        return reactApplicationContext.contentResolver.openOutputStream(uri, writeAccessByAPILevel)
            ?: throw Exception("ENOENT: could not open an output stream for '$filepath'")
    }

    override fun writeFile(path: String, content: String) {
        try {
            val fw = FileWriter(path)
            fw.write(content)
            fw.close()
        } catch (e: IOException) {
            throw Exception("Failed to write file '$path': ${e.message}")
        }
    }

    override fun readFile(path: String): String {
        val file = File(path)
        if (!file.exists()) {
            throw Exception("File not found: '$path'")
        }
        return file.bufferedReader().readText()
    }

    override fun copyFile(filepath: String, destPath: String) {
        copyFileContent(filepath, destPath)
    }

    override fun moveFile(filepath: String, destPath: String) {
        val inFile = File(filepath)
        copyFileContent(filepath, destPath, { inFile.delete() })
    }

    private fun copyFileContent(
        filepath: String,
        destPath: String,
        onDone: (() -> Unit)? = null,
    ) {
        try {
            val inputStream = getInputStream(filepath)
            try {
                val outputStream = getOutputStream(destPath)
                try {
                    val buffer = ByteArray(BUFFER_SIZE)
                    var length: Int
                    while (inputStream.read(buffer).also { length = it } > 0) {
                        outputStream.write(buffer, 0, length)
                    }
                } finally {
                    outputStream.close()
                }
            } finally {
                inputStream.close()
            }
            if (onDone != null) {
                onDone()
            }
        } catch (e: IOException) {
            throw Exception("Failed to copy file from '$filepath' to '$destPath': ${e.message}")
        }
    }

    override fun exists(filepath: String) = File(filepath).exists()

    override fun mkdir(filepath: String) {
        val file = File(filepath)
        if (!file.exists()) {
            val created = file.mkdirs()
            if (!created) throw Exception("Directory could not be created")
        }
    }

    private fun deleteRecursive(fileOrDirectory: File) {
        if (fileOrDirectory.isDirectory) {
            for (child in fileOrDirectory.listFiles()!!) {
                deleteRecursive(child)
            }
        }
        fileOrDirectory.delete()
    }

    override fun unlink(filepath: String) {
        val file = File(filepath)
        if (!file.exists()) return
        deleteRecursive(file)
    }

    override fun readDir(directory: String): WritableArray {
        val file = File(directory)
        if (!file.exists()) throw Exception("Folder does not exist")
        val files = file.listFiles()
        val fileMaps: WritableArray = WritableNativeArray()
        for (childFile in files!!) {
            val fileMap: WritableMap = WritableNativeMap()
            fileMap.putString("name", childFile.name)
            fileMap.putString("path", childFile.absolutePath)
            fileMap.putBoolean("isDirectory", childFile.isDirectory)
            fileMaps.pushMap(fileMap)
        }
        return fileMaps
    }

    private fun decompressStream(input: InputStream?): InputStream {
        val pb = PushbackInputStream(input, 2)
        val signature = ByteArray(2)
        val len = pb.read(signature)
        if(len == -1) return pb;
        pb.unread(signature, 0, len)
        return if (signature[0] == 0x1f.toByte() && signature[1] == 0x8b.toByte())
            GZIPInputStream(pb) else pb
    }

    override fun downloadFile(
        url: String,
        destPath: String,
        method: String,
        headers: ReadableMap,
        body: String?,
        promise: Promise
    ) {
        coroutineScope.launch {
            try {
                val headersBuilder = Headers.Builder()
                headers.entryIterator.forEach { entry ->
                    headersBuilder.add(entry.key, entry.value.toString())
                }
                val requestBuilder = Request.Builder()
                    .url(url)
                    .headers(headersBuilder.build())
                if (method.lowercase() == "get") {
                    requestBuilder.get()
                } else if (body != null) {
                    requestBuilder.post(body.toRequestBody())
                }

                okHttpClient.newCall(requestBuilder.build())
                    .enqueue(object : Callback {
                        override fun onFailure(call: Call, e: IOException) {
                            promise.reject(e)
                        }

                        override fun onResponse(call: Call, response: Response) {
                            response.use {
                                if (!it.isSuccessful || it.body == null) {
                                    promise.reject(Exception("Failed to download: ${it.code}"))
                                    return
                                }
                                try {
                                    decompressStream(it.body!!.byteStream()).use { inputStream ->
                                        FileOutputStream(destPath).use { fos ->
                                            inputStream.copyTo(fos, BUFFER_SIZE)
                                        }
                                    }
                                    promise.resolve(null)
                                } catch (e: Exception) {
                                    promise.reject(e)
                                }
                            }
                        }
                    })
            } catch (e: Exception) {
                promise.reject(e)
            }
        }
    }

    private fun getFolderSize(dir: File): Double {
        var size = 0.0
        if (dir.isDirectory) {
            val files = dir.listFiles()
            if (files != null) {
                for (child in files) {
                    size += if (child.isDirectory) getFolderSize(child) else child.length().toDouble()
                }
            }
        } else {
            size = dir.length().toDouble()
        }
        return size
    }

    override fun getFileSize(filepath: String): Double {
        val file = File(filepath)
        if (!file.exists()) return 0.0
        return getFolderSize(file)
    }

    override fun getFreeSpace(): Double {
        val externalDirectory = this.reactApplicationContext.getExternalFilesDir(null)
        if (externalDirectory != null) {
            try {
                val statFs = android.os.StatFs(externalDirectory.absolutePath)
                return statFs.availableBytes.toDouble()
            } catch (e: Exception) {
                return 0.0
            }
        }
        return 0.0
    }

    override fun detectImageMimeType(filePath: String): String {
        val file = File(filePath)
        if (!file.exists() || file.length() < 4) return "application/octet-stream"

        val bytes = ByteArray(12)
        val bytesRead = file.inputStream().use { stream ->
            var totalRead = 0
            while (totalRead < bytes.size) {
                val n = stream.read(bytes, totalRead, bytes.size - totalRead)
                if (n <= 0) break
                totalRead += n
            }
            totalRead
        }
        if (bytesRead < 4) return "application/octet-stream"

        return when {
            // PNG: 89 50 4E 47
            bytes.startsWith(0x89, 0x50, 0x4E, 0x47) -> "image/png"
            // JPEG/JPG: FF D8 FF (3-byte signature covers all JPEG variants)
            bytes.startsWith(0xFF, 0xD8, 0xFF) -> "image/jpeg"
            // GIF: 47 49 46 38 ("GIF8")
            bytes.startsWith(0x47, 0x49, 0x46, 0x38) -> "image/gif"
            // WebP: RIFF....WEBP
            bytes.startsWith(0x52, 0x49, 0x46, 0x46)
                && bytes.startsWith(0x57, 0x45, 0x42, 0x50, offset = 8) -> "image/webp"
            // BMP: 42 4D ("BM")
            bytes.startsWith(0x42, 0x4D) -> "image/bmp"
            // ISOBMFF-based formats: bytes 4-7 = "ftyp"
            bytes.startsWith(0x66, 0x74, 0x79, 0x70, offset = 4) -> when {
                // AVIF: ftyp + "avif" or "avis"
                bytes.startsWith(0x61, 0x76, 0x69, 0x66, offset = 8) -> "image/avif"
                bytes.startsWith(0x61, 0x76, 0x69, 0x73, offset = 8) -> "image/avif"
                // HEIC: ftyp + "heic", "heix", or "heim"
                bytes.startsWith(0x68, 0x65, 0x69, 0x63, offset = 8) -> "image/heic"
                bytes.startsWith(0x68, 0x65, 0x69, 0x78, offset = 8) -> "image/heic"
                bytes.startsWith(0x68, 0x65, 0x69, 0x6D, offset = 8) -> "image/heic"
                // HEIF: ftyp + "mif1" or "heif"
                bytes.startsWith(0x6D, 0x69, 0x66, 0x31, offset = 8) -> "image/heif"
                bytes.startsWith(0x68, 0x65, 0x69, 0x66, offset = 8) -> "image/heif"
                else -> "application/octet-stream"
            }
            // SVG: starts with '<' (XML text)
            bytes.startsWith(0x3C) -> "image/svg+xml"
            else -> "application/octet-stream"
        }
    }

    override fun getFileName(uri: String, fallback: String): String {
        val parsedUri = Uri.parse(uri)
        if (parsedUri.scheme == "content") {
            val cursor = reactApplicationContext.contentResolver.query(
                parsedUri, null, null, null, null
            )
            cursor?.use {
                if (it.moveToFirst()) {
                    val nameIndex = it.getColumnIndex(
                        android.provider.OpenableColumns.DISPLAY_NAME
                    )
                    if (nameIndex >= 0) return it.getString(nameIndex)
                }
            }
        }
        // Fallback: last path segment, then caller-supplied fallback
        return parsedUri.lastPathSegment ?: fallback
    }

    override fun getTypedExportedConstants(): MutableMap<String, Any> {
        val constants: MutableMap<String, Any> = HashMap()
        val externalDirectory = this.reactApplicationContext.getExternalFilesDir(null)
        if (externalDirectory != null) {
            constants["ExternalDirectoryPath"] = externalDirectory.absolutePath
            try {
                val statFs = android.os.StatFs(externalDirectory.absolutePath)
                constants["TotalSpace"] = statFs.totalBytes.toDouble()
                constants["FreeSpace"] = statFs.availableBytes.toDouble()
                constants["StoragePath"] = externalDirectory.absolutePath.substringBefore("/Android/")
            } catch (e: Exception) {
                constants["TotalSpace"] = 0.0
                constants["FreeSpace"] = 0.0
                constants["StoragePath"] = externalDirectory.absolutePath
            }
        }
        val externalCachesDirectory = this.reactApplicationContext.externalCacheDir
        if (externalCachesDirectory != null) {
            constants["ExternalCachesDirectoryPath"] = externalCachesDirectory.absolutePath
        }
        val cachesDirectory = this.reactApplicationContext.cacheDir
        if (cachesDirectory != null) {
            constants["CachesDirectoryPath"] = cachesDirectory.absolutePath
        }
        return constants
    }
}
