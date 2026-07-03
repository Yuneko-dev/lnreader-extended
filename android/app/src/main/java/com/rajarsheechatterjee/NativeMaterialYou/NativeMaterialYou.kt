package com.rajarsheechatterjee.NativeMaterialYou

import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.material.color.DynamicColors
import com.lnreader.spec.NativeMaterialYouSpec
import java.util.Locale

class NativeMaterialYou(reactContext: ReactApplicationContext) :
    NativeMaterialYouSpec(reactContext) {

    override fun getName(): String = NAME

    override fun getTypedExportedConstants(): MutableMap<String, Any> {
        val unavailable = mutableMapOf<String, Any>(
            "isAvailable" to false,
            "light" to emptyPalette(),
            "dark" to emptyPalette(),
        )

        if (!isDynamicColorSupported()) return unavailable

        return try {
            val light = readPalette("light")
            val dark = readPalette("dark")
            mutableMapOf(
                "isAvailable" to true,
                "light" to light,
                "dark" to dark,
            )
        } catch (_: Exception) {
            unavailable
        }
    }

    private fun isDynamicColorSupported(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false

        val isSamsung = Build.MANUFACTURER.equals("samsung", ignoreCase = true)
        return DynamicColors.isDynamicColorAvailable() || isSamsung
    }

    private fun readPalette(mode: String): MutableMap<String, String> =
        COLOR_ROLES.associateTo(linkedMapOf()) { (property, resourceSuffix) ->
            val resourceName = "m3_sys_color_dynamic_${mode}_$resourceSuffix"
            val resourceId = reactApplicationContext.resources.getIdentifier(
                resourceName,
                "color",
                reactApplicationContext.packageName,
            )
            check(resourceId != 0) { "Missing dynamic color resource: $resourceName" }

            property to colorToHex(ContextCompat.getColor(reactApplicationContext, resourceId))
        }

    private fun emptyPalette(): MutableMap<String, String> =
        COLOR_ROLES.associateTo(linkedMapOf()) { (property, _) -> property to "" }

    private fun colorToHex(color: Int): String =
        String.format(Locale.ROOT, "#%06X", color and 0xFFFFFF)

    companion object {
        const val NAME = "NativeMaterialYou"

        private val COLOR_ROLES = listOf(
            "primary" to "primary",
            "onPrimary" to "on_primary",
            "primaryContainer" to "primary_container",
            "onPrimaryContainer" to "on_primary_container",
            "secondary" to "secondary",
            "onSecondary" to "on_secondary",
            "secondaryContainer" to "secondary_container",
            "onSecondaryContainer" to "on_secondary_container",
            "tertiary" to "tertiary",
            "onTertiary" to "on_tertiary",
            "tertiaryContainer" to "tertiary_container",
            "onTertiaryContainer" to "on_tertiary_container",
            "background" to "background",
            "onBackground" to "on_background",
            "surface" to "surface",
            "onSurface" to "on_surface",
            "surfaceVariant" to "surface_variant",
            "onSurfaceVariant" to "on_surface_variant",
            "outline" to "outline",
            "outlineVariant" to "outline_variant",
            "inverseSurface" to "inverse_surface",
            "inverseOnSurface" to "inverse_on_surface",
            "inversePrimary" to "inverse_primary",
        )
    }
}
