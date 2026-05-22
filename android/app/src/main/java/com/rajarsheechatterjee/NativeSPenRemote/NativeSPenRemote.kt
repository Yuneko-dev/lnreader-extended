package com.rajarsheechatterjee.NativeSPenRemote

import android.view.KeyEvent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.lnreader.spec.NativeSPenRemoteSpec

class NativeSPenRemote(appContext: ReactApplicationContext) :
    NativeSPenRemoteSpec(appContext) {
    init {
        Companion.appContext = appContext
        listenerCount = 0
    }

    override fun addListener(eventName: String?) {
        listenerCount += 1
    }

    override fun removeListeners(count: Double) {
        listenerCount = (listenerCount - count.toInt()).coerceAtLeast(0)
    }

    companion object {
        private lateinit var appContext: ReactApplicationContext
        @Volatile
        private var listenerCount = 0

        const val EVENT_NEXT_PAGE = "SPenRemoteNextPage"
        const val EVENT_PREV_PAGE = "SPenRemotePrevPage"
        const val EVENT_NEXT_CHAPTER = "SPenRemoteNextChapter"
        const val EVENT_PREV_CHAPTER = "SPenRemotePrevChapter"

        private val handledKeyCodes =
            setOf(
                KeyEvent.KEYCODE_PAGE_DOWN,
                KeyEvent.KEYCODE_PAGE_UP,
                KeyEvent.KEYCODE_F7,
                KeyEvent.KEYCODE_F8
            )

        val isActive: Boolean
            get() = ::appContext.isInitialized

        fun shouldHandleKeyCode(keyCode: Int): Boolean =
            isActive && handledKeyCodes.contains(keyCode)

        fun shouldHandleKeyEvent(event: KeyEvent): Boolean =
            shouldHandleKeyCode(event.keyCode)

        fun shouldConsumeKeyEvent(event: KeyEvent): Boolean =
            shouldHandleKeyEvent(event) && listenerCount > 0

        fun handleKeyEvent(event: KeyEvent): Boolean {
            if (!shouldConsumeKeyEvent(event)) {
                return false
            }

            if (event.action != KeyEvent.ACTION_DOWN || event.repeatCount > 0) {
                return true
            }

            val eventName = getEventName(event.keyCode) ?: return true
            appContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, null)
            return true
        }

        private fun getEventName(keyCode: Int): String? =
            when (keyCode) {
                KeyEvent.KEYCODE_PAGE_DOWN -> EVENT_NEXT_PAGE
                KeyEvent.KEYCODE_PAGE_UP -> EVENT_PREV_PAGE
                KeyEvent.KEYCODE_F7 -> EVENT_PREV_CHAPTER
                KeyEvent.KEYCODE_F8 -> EVENT_NEXT_CHAPTER
                else -> null
            }
    }
}
