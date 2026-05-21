package com.rajarsheechatterjee.NativeCDPProxy

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.lnreader.spec.NativeCDPProxySpec

class CDPProxyPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == NativeCDPProxySpec.NAME) {
            CDPProxyModule(reactContext)
        } else {
            null
        }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            NativeCDPProxySpec.NAME to ReactModuleInfo(
                NativeCDPProxySpec.NAME,
                NativeCDPProxySpec.NAME,
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = true
            )
        )
    }
}
