package com.rajarsheechatterjee.NativeEpub

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.lnreader.spec.NativeEpubSpec
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class NativeEpub(context: ReactApplicationContext) : NativeEpubSpec(context) {
    @ReactMethod
    override fun parseNovelAndChapters(epubDirPath: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = EpubParser.parse(epubDirPath)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("EPUB_PARSE_ERROR", e.message, e)
            }
        }
    }
}
