package com.rajarsheechatterjee.LNReader

import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.rajarsheechatterjee.NativeSPenRemote.NativeSPenRemote
import com.rajarsheechatterjee.NativeVolumeButtonListener.NativeVolumeButtonListener
import expo.modules.ReactActivityDelegateWrapper
import org.devio.rn.splashscreen.SplashScreen

class MainActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val layoutParams = WindowManager.LayoutParams()
            layoutParams.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            window.attributes = layoutParams
        }
        super.onCreate(null)
        SplashScreen.show(this, R.style.SplashScreenTheme, R.id.lottie)
        SplashScreen.setAnimationFinished(true)
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (NativeVolumeButtonListener.isActive) {
            val action = event.action
            when (event.keyCode) {
                KeyEvent.KEYCODE_VOLUME_UP -> {
                    if (action == KeyEvent.ACTION_DOWN) {
                        NativeVolumeButtonListener.sendEvent(true)
                    }
                    return true
                }

                KeyEvent.KEYCODE_VOLUME_DOWN -> {
                    if (action == KeyEvent.ACTION_DOWN) {
                        NativeVolumeButtonListener.sendEvent(false)
                    }
                    return true
                }

                else -> {}
            }
        }

        return super.dispatchKeyEvent(event)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (NativeSPenRemote.handleKeyEvent(event)) {
            return true
        }

        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        if (NativeSPenRemote.shouldHandleKeyCode(keyCode)) {
            return true
        }

        return super.onKeyUp(keyCode, event)
    }

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    override fun getMainComponentName(): String = "main"

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(
            this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED, DefaultReactActivityDelegate(
                this,
                mainComponentName,  // If you opted-in for the New Architecture, we enable the Fabric Renderer.
                fabricEnabled
            )
        )
    }
}
