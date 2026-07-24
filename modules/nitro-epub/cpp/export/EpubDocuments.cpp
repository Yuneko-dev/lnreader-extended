#include "EpubDocuments.hpp"

#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>

namespace margelo::nitro::nitroepub {
namespace {

std::string xmlEscape(const std::string& value) {
  std::string escaped;
  escaped.reserve(value.size());
  for (const char character : value) {
    switch (character) {
      case '&':
        escaped += "&amp;";
        break;
      case '<':
        escaped += "&lt;";
        break;
      case '>':
        escaped += "&gt;";
        break;
      case '"':
        escaped += "&quot;";
        break;
      case '\'':
        escaped += "&apos;";
        break;
      default:
        escaped += character;
        break;
    }
  }
  return escaped;
}

std::string modifiedTimestamp() {
  const std::time_t now = std::chrono::system_clock::to_time_t(
      std::chrono::system_clock::now());
  std::tm utc{};
#ifdef _WIN32
  gmtime_s(&utc, &now);
#else
  gmtime_r(&now, &utc);
#endif
  std::ostringstream timestamp;
  timestamp << std::put_time(&utc, "%Y-%m-%dT%H:%M:%SZ");
  return timestamp.str();
}

} // namespace

std::string containerDocument() {
  return R"(<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
)";
}

std::string chapterDocument(const EpubArchiveChapter& chapter,
                            const std::string& body,
                            bool hasJavaScript) {
  const std::string title = xmlEscape(chapter.title);
  const std::string script =
      hasJavaScript ? R"(
    <script type="text/javascript" src="../script.js"></script>)"
                    : "";
  const std::string onLoad =
      hasJavaScript ? " onload=\"fnEpub()\"" : "";
  return R"(<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head>
    <meta charset="UTF-8"/>
    <title>)" +
         title +
         R"(</title>
    <link rel="stylesheet" type="text/css" href="../styles.css"/>)" +
         script + R"(
  </head>
  <body data-novel-id=")" +
         xmlEscape(chapter.novelId) + R"(" data-chapter-id=")" +
         xmlEscape(chapter.chapterId) + R"(")" + onLoad + R"(>
    )" + body + R"(
  </body>
</html>
)";
}

std::string navigationDocument(
    const EpubArchiveMetadata& metadata,
    const std::vector<EpubArchiveChapter>& chapters) {
  std::ostringstream items;
  for (std::size_t index = 0; index < chapters.size(); ++index) {
    items << "      <li><a href=\"text/chapter-" << index << ".xhtml\">"
          << xmlEscape(chapters[index].title) << "</a></li>\n";
  }
  return R"(<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head><title>)" +
         xmlEscape(metadata.title) + R"(</title></head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>)" +
         xmlEscape(metadata.title) + R"(</h1>
      <ol>
)" + items.str() +
         R"(      </ol>
    </nav>
  </body>
</html>
)";
}

std::string ncxDocument(
    const EpubArchiveMetadata& metadata,
    const std::vector<EpubArchiveChapter>& chapters) {
  std::ostringstream points;
  for (std::size_t index = 0; index < chapters.size(); ++index) {
    points << "    <navPoint id=\"chapter-" << index
           << "\" playOrder=\"" << index + 1 << "\">\n"
           << "      <navLabel><text>"
           << xmlEscape(chapters[index].title) << "</text></navLabel>\n"
           << "      <content src=\"text/chapter-" << index
           << ".xhtml\"/>\n"
           << "    </navPoint>\n";
  }
  return R"(<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content=")" +
         xmlEscape(metadata.bookId) + R"("/></head>
  <docTitle><text>)" +
         xmlEscape(metadata.title) + R"(</text></docTitle>
  <navMap>
)" + points.str() +
         R"(  </navMap>
</ncx>
)";
}

std::string packageDocument(
    const EpubArchiveMetadata& metadata,
    const std::vector<EpubArchiveChapter>& chapters,
    const std::vector<EpubAsset>& assets,
    const EpubAsset* cover,
    bool hasJavaScript) {
  std::ostringstream manifest;
  manifest << "    <item id=\"nav\" href=\"nav.xhtml\" "
              "media-type=\"application/xhtml+xml\" properties=\"nav\"/>\n"
           << "    <item id=\"ncx\" href=\"toc.ncx\" "
              "media-type=\"application/x-dtbncx+xml\"/>\n"
           << "    <item id=\"styles\" href=\"styles.css\" "
              "media-type=\"text/css\"/>\n";
  if (hasJavaScript) {
    manifest << "    <item id=\"script\" href=\"script.js\" "
                "media-type=\"text/javascript\"/>\n";
  }
  if (cover != nullptr) {
    manifest << "    <item id=\"cover-image\" href=\""
             << xmlEscape(cover->archivePath.substr(5))
             << "\" media-type=\"" << cover->mediaType
             << "\" properties=\"cover-image\"/>\n";
  }
  for (const EpubAsset& asset : assets) {
    manifest << "    <item id=\"" << asset.id << "\" href=\""
             << xmlEscape(asset.archivePath.substr(5))
             << "\" media-type=\"" << asset.mediaType << "\"/>\n";
  }
  for (std::size_t index = 0; index < chapters.size(); ++index) {
    manifest << "    <item id=\"chapter-" << index
             << "\" href=\"text/chapter-" << index
             << ".xhtml\" media-type=\"application/xhtml+xml\"";
    if (hasJavaScript) {
      manifest << " properties=\"scripted\"";
    }
    manifest << "/>\n";
  }

  std::ostringstream spine;
  for (std::size_t index = 0; index < chapters.size(); ++index) {
    spine << "    <itemref idref=\"chapter-" << index << "\"/>\n";
  }

  return R"(<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang=")" +
         xmlEscape(metadata.language) + R"(">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">)" +
         xmlEscape(metadata.bookId) + R"(</dc:identifier>
    <dc:title>)" +
         xmlEscape(metadata.title) + R"(</dc:title>
    <dc:language>)" +
         xmlEscape(metadata.language) + R"(</dc:language>
    <dc:creator>)" +
         xmlEscape(metadata.author) + R"(</dc:creator>
    <dc:description>)" +
         xmlEscape(metadata.description) + R"(</dc:description>
    <meta property="dcterms:modified">)" +
         modifiedTimestamp() + R"(</meta>
  </metadata>
  <manifest>
)" + manifest.str() +
         R"(  </manifest>
  <spine toc="ncx">
)" + spine.str() +
         R"(  </spine>
</package>
)";
}

} // namespace margelo::nitro::nitroepub
