package com.rajarsheechatterjee.NativeEpub

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element
import org.jsoup.parser.Parser
import java.io.BufferedInputStream
import java.io.File
import java.io.FileInputStream
import java.net.URLConnection

data class EpubChapter(val name: String, val path: String)

data class EpubMetadata(
    var name: String = "",
    var cover: String = "",
    var summary: String = "",
    var author: String = "",
    var artist: String = "",
    var genres: String = "",
    val chapters: MutableList<EpubChapter> = mutableListOf(),
    val cssPaths: MutableList<String> = mutableListOf(),
    val imagePaths: MutableList<String> = mutableListOf(),
)

object EpubParser {
    /**
     * Main entry point: parse an extracted EPUB directory and return a WritableMap
     * compatible with the React Native bridge.
     */
    fun parse(epubDirPath: String): WritableMap {
        val metadata = parseEpub(epubDirPath)
        return metadataToWritableMap(metadata)
    }

    /**
     * Parse the extracted EPUB directory structure.
     * Mirrors the logic from the original C++ Epub.cpp.
     */
    private fun parseEpub(epubPath: String): EpubMetadata {
        val containerPath = joinPath(epubPath, "META-INF/container.xml")
        val containerFile = File(containerPath)
        if (!containerFile.exists()) {
            throw RuntimeException("Failed to load container.xml")
        }

        val containerDoc = Jsoup.parse(containerFile, "UTF-8", "", Parser.xmlParser())
        val opfRelPath = containerDoc
            .selectFirst("container > rootfiles > rootfile")
            ?.attr("full-path")
            ?: throw RuntimeException("No rootfile found in container.xml")

        val metadata = EpubMetadata()
        parseOpfFromFolder(epubPath, opfRelPath, metadata)
        return metadata
    }

    /**
     * Parse the OPF file to extract metadata, manifest, spine, and TOC.
     */
    private fun parseOpfFromFolder(
        baseDir: String,
        opfRelPath: String,
        metaOut: EpubMetadata,
    ) {
        val opfPath = joinPath(baseDir, opfRelPath)
        val opfDir = getParentPath(opfPath)
        val baseDirCanonicalPath = File(baseDir).canonicalPath
        val opfFile = File(opfPath)
        if (!opfFile.exists()) return

        val opfDoc = Jsoup.parse(opfFile, "UTF-8", "", Parser.xmlParser())

        // --- Parse TOC (NCX or XHTML nav) ---
        val pathToLabel = mutableMapOf<String, String>()
        val toc = findToc(opfDoc)
        if (toc != null && toc.href.isNotEmpty()) {
            val tocPath = joinPath(opfDir, toc.href)
            if (toc.isNcx) {
                parseTocNcx(tocPath, pathToLabel)
            } else {
                parseNavXhtml(tocPath, pathToLabel)
            }
        }

        // --- Parse metadata ---
        val metadataEl = opfDoc.selectFirst("package > metadata")
        if (metadataEl != null) {
            metaOut.name = selectMainTitle(metadataEl)
            metaOut.author = metadataEl.getTextByTag("dc:creator")
            metaOut.artist = metadataEl.getTextByTag("dc:contributor")
            metaOut.summary = metadataEl.getWholeTextByTag("dc:description")

            // Parse dc:subject → genres (multiple elements, comma-joined)
            val subjects = metadataEl.getElementsByTag("dc:subject")
            if (subjects.isNotEmpty()) {
                metaOut.genres = subjects.joinToString(",") { it.text().trim() }
            }
        }

        // --- Find cover ID ---
        var coverId = ""
        if (metadataEl != null) {
            for (meta in metadataEl.select("meta")) {
                if (meta.attr("name") == "cover") {
                    coverId = meta.attr("content")
                    break
                }
            }
        }

        // --- Parse manifest ---
        val idToHref = mutableMapOf<String, String>()
        val manifest = opfDoc.selectFirst("package > manifest")
        if (manifest != null) {
            // EPUB 3: look for manifest item with properties="cover-image" if EPUB 2 meta is missing
            if (coverId.isEmpty()) {
                for (item in manifest.select("item")) {
                    val props = item.attr("properties")
                    if (props.contains("cover-image")) {
                        coverId = item.attr("id")
                        break
                    }
                }
            }

            for (item in manifest.select("item")) {
                val id = item.attr("id")
                val href = java.net.URLDecoder.decode(item.attr("href"), "UTF-8")
                val mediaType = item.attr("media-type")

                idToHref[id] = href

                val resolvedPath = joinPath(opfDir, href)
                if (!isWithin(baseDirCanonicalPath, resolvedPath)) continue

                val resolvedType = mediaType.ifEmpty {
                    detectMediaType(resolvedPath)
                }

                when {
                    resolvedType == "text/css" ->
                        metaOut.cssPaths.add(resolvedPath)
                    resolvedType.startsWith("image/") && id != coverId ->
                        metaOut.imagePaths.add(resolvedPath)
                }
            }
        }

        // --- Resolve cover path ---
        if (coverId.isNotEmpty() && idToHref.containsKey(coverId)) {
            val coverPath = joinPath(opfDir, idToHref[coverId]!!)
            if (isWithin(baseDirCanonicalPath, coverPath)) metaOut.cover = coverPath
        }

        // --- Parse spine (reading order) ---
        val spine = opfDoc.selectFirst("package > spine")
        if (spine != null) {
            var prevName = ""
            var part = 2

            for (itemref in spine.select("itemref")) {
                // Skip auxiliary content (cover page, notes) excluded from the
                // linear reading order.
                if (itemref.attr("linear").equals("no", ignoreCase = true)) continue

                val idref = itemref.attr("idref")
                val chapterHref = idToHref[idref] ?: continue

                val chapterPath = joinPath(opfDir, chapterHref)
                if (!isWithin(baseDirCanonicalPath, chapterPath)) continue
                var chapterName = pathToLabel[chapterPath] ?: ""

                if (chapterName.isEmpty()) {
                    if (prevName.isEmpty()) {
                        // Use filename without extension as fallback name
                        val lastSlash = chapterHref.lastIndexOf('/')
                        val start = if (lastSlash == -1) 0 else lastSlash + 1
                        val lastDot = chapterHref.lastIndexOf('.')
                        chapterName = if (lastDot > start) {
                            chapterHref.substring(start, lastDot)
                        } else {
                            chapterHref.substring(start)
                        }
                    } else {
                        chapterName = "$prevName ($part)"
                        part += 1
                    }
                } else {
                    prevName = chapterName
                    part = 2
                }

                metaOut.chapters.add(EpubChapter(chapterName, chapterPath))
            }
        }
    }

    /** A located table-of-contents document plus its concrete format. */
    private data class TocRef(val href: String, val isNcx: Boolean)

    /**
     * Find the TOC document in the OPF manifest, classified by its real format
     * instead of guessing from the filename.
     *
     * EPUB 3 files commonly ship BOTH an XHTML nav (properties="nav") and an
     * NCX (media-type application/x-dtbncx+xml) for EPUB 2 backward compat. We
     * prefer the EPUB 3 nav when present (richer, hierarchical) and fall back to
     * NCX otherwise.
     */
    private fun findToc(opfDoc: Document): TocRef? {
        val manifest = opfDoc.selectFirst("package > manifest") ?: return null
        var nav: TocRef? = null
        var ncx: TocRef? = null

        for (item in manifest.select("item")) {
            val mediaType = item.attr("media-type")
            val id = item.attr("id")
            val properties = item.attr("properties")
            val href = java.net.URLDecoder.decode(item.attr("href"), "UTF-8")
            if (href.isEmpty()) continue

            val isNcxItem = mediaType == "application/x-dtbncx+xml" || id == "ncx"
            // EPUB 3 nav is identified by the "nav" property token; the id=="nav"
            // heuristic catches loosely-authored files.
            val isNavItem = properties.split(Regex("\\s+")).contains("nav") ||
                (id == "nav" && !isNcxItem)

            if (isNavItem && nav == null) nav = TocRef(href, isNcx = false)
            if (isNcxItem && ncx == null) ncx = TocRef(href, isNcx = true)
        }

        return nav ?: ncx
    }

    /**
     * Parse EPUB 2 NCX table of contents.
     */
    private fun parseTocNcx(ncxPath: String, hrefToLabel: MutableMap<String, String>) {
        val ncxFolder = getParentPath(ncxPath)
        val ncxFile = File(ncxPath)
        if (!ncxFile.exists()) return

        val doc = Jsoup.parse(ncxFile, "UTF-8", "", Parser.xmlParser())
        val navMap = doc.selectFirst("ncx > navMap") ?: return
        parseNavPointRecursive(navMap, hrefToLabel, ncxFolder)
    }

    /**
     * Recursively parse NCX navPoints.
     */
    private fun parseNavPointRecursive(
        parent: Element,
        result: MutableMap<String, String>,
        ncxFolder: String,
    ) {
        for (point in parent.select("> navPoint")) {
            val label = point.selectFirst("navLabel > text")?.text() ?: ""
            var src = point.selectFirst("content")?.attr("src") ?: ""

            if (label.isNotEmpty() && src.isNotEmpty()) {
                // Strip fragment identifier
                val sharp = src.indexOf('#')
                if (sharp != -1) src = src.substring(0, sharp)
                result[joinPath(ncxFolder, src)] = label
            }

            parseNavPointRecursive(point, result, ncxFolder)
        }
    }

    /**
     * Parse EPUB 3 XHTML navigation document.
     */
    private fun parseNavXhtml(navPath: String, pathToLabel: MutableMap<String, String>) {
        val navFolder = getParentPath(navPath)
        val navFile = File(navPath)
        if (!navFile.exists()) return

        val navDoc = Jsoup.parse(navFile, "UTF-8", "", Parser.xmlParser())
        val allNavs = navDoc.select("nav")
        // An EPUB 3 nav document also contains landmarks / page-list <nav>s whose
        // labels ("Cover", "Begin Reading", page numbers) would otherwise clobber
        // the real chapter labels. Restrict to the toc nav; fall back to every
        // nav only when none is tagged (loosely-authored files).
        val tocNavs = allNavs.filter { it.attr("epub:type").split(Regex("\\s+")).contains("toc") }
        val navs = if (tocNavs.isNotEmpty()) tocNavs else allNavs
        for (nav in navs) {
            val ol = nav.selectFirst("ol") ?: continue
            parseNavElementRecursive(ol, pathToLabel, navFolder)
        }
    }

    /**
     * Recursively parse XHTML nav ol/li/a elements.
     */
    private fun parseNavElementRecursive(
        parent: Element,
        hrefToLabel: MutableMap<String, String>,
        navFolder: String,
    ) {
        for (li in parent.select("> li")) {
            val a = li.selectFirst("a")
            if (a != null) {
                var href = a.attr("href")
                val label = a.text()

                // Strip fragment identifier
                val sharp = href.indexOf('#')
                if (sharp != -1) href = href.substring(0, sharp)

                if (href.isNotEmpty() && label.isNotEmpty()) {
                    hrefToLabel[joinPath(navFolder, href)] = label
                }
            }

            val sublist = li.selectFirst("ol")
            if (sublist != null) {
                parseNavElementRecursive(sublist, hrefToLabel, navFolder)
            }
        }
    }

    // --- Path utilities ---

    /**
     * Join a folder path with a child path, resolving ".." segments.
     * Mirrors the C++ join() function.
     */
    private fun joinPath(folderPath: String, childPath: String): String {
        val sb = StringBuilder(folderPath)
        if (sb.isNotEmpty() && sb.last() != '/') {
            sb.append('/')
        }

        for (segment in childPath.split('/')) {
            when {
                segment == ".." -> {
                    // Go up one level
                    if (sb.isNotEmpty()) {
                        val lastSlash = sb.lastIndexOf("/", sb.length - 2)
                        if (lastSlash != -1) {
                            sb.setLength(lastSlash + 1)
                        } else {
                            sb.setLength(0)
                        }
                    }
                }
                segment != "." && segment.isNotEmpty() -> {
                    sb.append(segment).append('/')
                }
            }
        }

        // Remove trailing slash (unless the path is just "/")
        if (sb.length > 1 && sb.last() == '/') {
            sb.setLength(sb.length - 1)
        }

        return sb.toString()
    }

    /**
     * Guard against path traversal (CWE-22): confirm a resolved file path
     * stays inside the extracted EPUB root. A crafted OPF/NCX href with enough
     * ".." segments can make joinPath() climb above the root and point at
     * arbitrary app files, which import.ts would then read or move/delete.
     */
    private fun isWithin(rootCanonicalPath: String, path: String): Boolean {
        return try {
            val pathCanon = File(path).canonicalPath
            pathCanon == rootCanonicalPath ||
                pathCanon.startsWith(rootCanonicalPath + File.separator)
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Get the parent directory of a path.
     */
    private fun getParentPath(path: String): String {
        if (path.isEmpty()) return ""
        val pos = path.lastIndexOfAny(charArrayOf('/', '\\'))
        return if (pos == -1) "" else path.substring(0, pos)
    }

    // --- File type detection ---

    /** Known image file extensions */
    private val IMAGE_EXTENSIONS = setOf(
        "jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "tif", "ico"
    )

    /** Known CSS file extensions */
    private val CSS_EXTENSIONS = setOf("css")

    /**
     * Detect media type when the manifest's media-type attribute is missing.
     * 1. Try file extension first (fast)
     * 2. Fall back to magic bytes via URLConnection (accurate)
     */
    private fun detectMediaType(filePath: String): String {
        // Try extension first
        val ext = filePath.substringAfterLast('.', "").lowercase()
        if (ext in CSS_EXTENSIONS) return "text/css"
        if (ext in IMAGE_EXTENSIONS) {
            return when (ext) {
                "jpg", "jpeg" -> "image/jpeg"
                "png" -> "image/png"
                "gif" -> "image/gif"
                "webp" -> "image/webp"
                "svg" -> "image/svg+xml"
                "bmp" -> "image/bmp"
                "tiff", "tif" -> "image/tiff"
                "ico" -> "image/x-icon"
                else -> "image/$ext"
            }
        }

        // Fall back to magic bytes
        val file = File(filePath)
        if (!file.exists() || !file.isFile) return ""
        return try {
            FileInputStream(file).use { fis ->
                BufferedInputStream(fis).use { bis ->
                    URLConnection.guessContentTypeFromStream(bis) ?: ""
                }
            }
        } catch (_: Exception) {
            ""
        }
    }

    // --- Helpers ---

    /**
     * Get text content of a child element by tag name.
     * Uses getElementsByTag() instead of CSS selectors because Jsoup's
     * CSS selector engine doesn't support namespace prefixes like "dc:title".
     */
    private fun Element.getTextByTag(tagName: String): String {
        return this.getElementsByTag(tagName).firstOrNull()?.text() ?: ""
    }

    /**
     * Like getTextByTag, but preserves the original whitespace (incl. line
     * breaks) via wholeText() instead of the whitespace-normalizing text().
     * Used for dc:description so multi-line summaries keep their newlines.
     */
    private fun Element.getWholeTextByTag(tagName: String): String {
        return this.getElementsByTag(tagName).firstOrNull()?.wholeText()?.trim() ?: ""
    }

    /**
     * Pick the book's main title. EPUB 3 may carry several <dc:title> elements
     * (main, subtitle, collection) disambiguated by a refining
     * <meta property="title-type" refines="#id">main</meta>. When present we
     * honor it; otherwise we use the first title (EPUB 2 behavior).
     */
    private fun selectMainTitle(metadataEl: Element): String {
        val titles = metadataEl.getElementsByTag("dc:title")
        if (titles.isEmpty()) return ""
        if (titles.size == 1) return titles[0].text()

        val mainIds = metadataEl.select("meta[property=title-type]")
            .filter { it.text().trim() == "main" }
            .map { it.attr("refines").removePrefix("#") }
            .filter { it.isNotEmpty() }
            .toSet()

        if (mainIds.isNotEmpty()) {
            titles.firstOrNull { it.attr("id") in mainIds }?.let { return it.text() }
        }
        return titles[0].text()
    }

    /**
     * Convert EpubMetadata to a WritableMap for the React Native bridge.
     */
    private fun metadataToWritableMap(metadata: EpubMetadata): WritableMap {
        val map = Arguments.createMap()
        map.putString("name", metadata.name)
        map.putString("author", metadata.author)
        map.putString("artist", metadata.artist)
        map.putString("summary", metadata.summary)
        map.putString("genres", metadata.genres.ifEmpty { null })
        map.putString("cover", metadata.cover.ifEmpty { null })

        val chaptersArray: WritableArray = Arguments.createArray()
        for (chapter in metadata.chapters) {
            val chapterMap = Arguments.createMap()
            chapterMap.putString("name", chapter.name)
            chapterMap.putString("path", chapter.path)
            chaptersArray.pushMap(chapterMap)
        }
        map.putArray("chapters", chaptersArray)

        val cssArray: WritableArray = Arguments.createArray()
        for (css in metadata.cssPaths) {
            cssArray.pushString(css)
        }
        map.putArray("cssPaths", cssArray)

        val imageArray: WritableArray = Arguments.createArray()
        for (img in metadata.imagePaths) {
            imageArray.pushString(img)
        }
        map.putArray("imagePaths", imageArray)

        return map
    }
}
