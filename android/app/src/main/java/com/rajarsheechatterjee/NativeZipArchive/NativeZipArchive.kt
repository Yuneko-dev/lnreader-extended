package com.rajarsheechatterjee.NativeZipArchive

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.lnreader.spec.NativeZipArchiveSpec
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

class NativeZipArchive(context: ReactApplicationContext) : NativeZipArchiveSpec(context) {
    /**
     * Resolve a zip entry against the destination directory, rejecting any
     * entry whose name escapes that directory (Zip Slip / CWE-22). A crafted
     * archive can carry entry names like "../../databases/x" that would
     * otherwise write outside the sandbox target.
     */
    private fun resolveZipEntry(destDir: File, entryName: String): File {
        val newFile = File(destDir, entryName).canonicalFile
        if (newFile != destDir &&
            !newFile.path.startsWith(destDir.path + File.separator)
        ) {
            throw SecurityException("Zip entry escapes target directory: $entryName")
        }
        return newFile
    }

    @ReactMethod
    override fun unzip(sourceFilePath: String, distDirPath: String, promise: Promise) {
        Thread {
            try {
                ZipFile(sourceFilePath).use { zis ->
                    val destDir = File(distDirPath).canonicalFile
                    zis.entries().asSequence().filterNot { it.isDirectory }.forEach { zipEntry ->
                        val newFile = resolveZipEntry(destDir, zipEntry.name)
                        newFile.parentFile?.mkdirs()
                        zis.getInputStream(zipEntry).use { inputStream ->
                            FileOutputStream(newFile).use { fos -> inputStream.copyTo(fos, 4096) }
                        }
                        Thread.yield()
                    }
                }
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject(e)
            }
        }.start()
    }
    
    @ReactMethod
    override fun zip(sourceDirPath: String, zipFilePath: String, promise: Promise) {
        Thread {
            try {
                FileOutputStream(zipFilePath).use { fos -> 
                    ZipOutputStream(fos).use { zos -> zipProcess(sourceDirPath, zos) }
                }
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject(e)
            }
        }.start()
    }

    @ReactMethod
    override fun remoteUnzip(
        distDirPath: String,
        urlString: String,
        headers: ReadableMap,
        promise: Promise
    ) {
        val connection = URL(urlString).openConnection() as HttpURLConnection
        Thread {
            try {
                connection.requestMethod = "GET"
                val it = headers.entryIterator
                while (it.hasNext()) {
                    val (key, value) = it.next()
                    connection.setRequestProperty(key, value.toString())
                }
                ZipInputStream(connection.inputStream).use { zis ->
                    val destDir = File(distDirPath).canonicalFile
                    generateSequence { zis.nextEntry }
                        .filterNot { it.isDirectory }
                        .forEach { zipEntry ->
                            val newFile = resolveZipEntry(destDir, zipEntry.name)
                            newFile.parentFile?.mkdirs()
                            FileOutputStream(newFile).use { fos -> zis.copyTo(fos, 4096) }
                            Thread.yield()
                        }
                }
                if (connection.responseCode == 200) {
                    promise.resolve(null)
                } else {
                    throw Exception("Network request failed")
                }
            } catch (e: Exception) {
                promise.reject(e)
            } finally {
                connection.disconnect()
            }
        }.start()
    }

    private fun zipProcess(sourceDirPath: String, zos: ZipOutputStream) {
        val sourceDir = File(sourceDirPath)
        sourceDir.walkBottomUp().filter { it.isFile }.forEach { file ->
            val zipFileName =
                file.absolutePath.removePrefix(sourceDir.absolutePath).removePrefix("/")
            val entry = ZipEntry("$zipFileName${(if (file.isDirectory) "/" else "")}")
            zos.putNextEntry(entry)
            file.inputStream().use { fis ->
                fis.copyTo(zos, 4096)
                fis.close()
            }
            Thread.yield()
        }
    }

    @ReactMethod
    override fun zipEpub(sourceDirPath: String, zipFilePath: String, promise: Promise) {
        Thread {
            try {
                val sourceDir = File(sourceDirPath)
                val mimetypeFile = File(sourceDir, "mimetype")

                FileOutputStream(zipFilePath).use { fos ->
                    ZipOutputStream(fos).use { zos ->
                        // 1. Write mimetype FIRST, STORED (uncompressed) — required by EPUB OCF spec
                        if (mimetypeFile.exists()) {
                            val mimetypeBytes = mimetypeFile.readBytes()
                            val entry = ZipEntry("mimetype")
                            entry.method = ZipEntry.STORED
                            entry.size = mimetypeBytes.size.toLong()
                            entry.compressedSize = mimetypeBytes.size.toLong()

                            val crc = java.util.zip.CRC32()
                            crc.update(mimetypeBytes)
                            entry.crc = crc.value

                            zos.putNextEntry(entry)
                            zos.write(mimetypeBytes)
                            zos.closeEntry()
                        }

                        // 2. Zip all remaining files (DEFLATED)
                        sourceDir.walkTopDown()
                            .filter { it.isFile && it.name != "mimetype" }
                            .forEach { file ->
                                val zipFileName = file.absolutePath
                                    .removePrefix(sourceDir.absolutePath)
                                    .removePrefix("/")
                                val zipEntry = ZipEntry(zipFileName)
                                zos.putNextEntry(zipEntry)
                                file.inputStream().use { fis ->
                                    fis.copyTo(zos, 4096)
                                }
                                zos.closeEntry()
                                Thread.yield()
                            }
                    }
                }
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject(e)
            }
        }.start()
    }

    @ReactMethod
    override fun remoteZip(
        sourceDirPath: String,
        urlString: String,
        headers: ReadableMap,
        promise: Promise
    ) {
        Thread {
            val connection = URL(urlString).openConnection() as HttpURLConnection
            try {
                connection.requestMethod = "POST"
                val it = headers.entryIterator
                while (it.hasNext()) {
                    val (key, value) = it.next()
                    connection.setRequestProperty(key, value.toString())
                }
                ZipOutputStream(connection.outputStream).use { zipProcess(sourceDirPath, it) }
                if (connection.responseCode == 200) {
                    promise.resolve(
                        connection.inputStream.bufferedReader().use { it.readText() })
                } else {
                    throw Exception("Network request failed")
                }
            } catch (e: Exception) {
                promise.reject(e)
            } finally {
                connection.disconnect()
            }
        }.start()
    }
}
