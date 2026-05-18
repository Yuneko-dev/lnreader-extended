package com.rajarsheechatterjee.NativeSPenRemote

import android.view.KeyEvent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.lnreader.spec.NativeSPenRemoteSpec

class NativeSPenRemote(appContext: ReactApplicationContext) :
    NativeSPenRemoteSpec(appContext) {
    init {
        Companion.appContext = appContext
    }

    override fun addListener(eventName: String?) {
    }

    override fun removeListeners(count: Double) {
    }

    companion object {
        private lateinit var appContext: ReactApplicationContext

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

        fun handleKeyEvent(event: KeyEvent): Boolean {
            if (!shouldHandleKeyEvent(event)) {
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
