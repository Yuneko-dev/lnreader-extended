#include "EpubExporter.hpp"

#include "EpubAsset.hpp"
#include "EpubContentProcessor.hpp"
#include "EpubDocuments.hpp"
#include "ZipWriter.hpp"

#include <filesystem>
#include <stdexcept>
#include <unordered_map>

namespace margelo::nitro::nitroepub {

EpubArchiveResult exportEpubArchive(
    const EpubArchiveMetadata& metadata,
    const std::vector<EpubArchiveChapter>& chapters,
    const std::string& outputPath) {
  if (metadata.title.empty()) {
    throw std::runtime_error("EPUB title cannot be empty");
  }
  if (outputPath.empty()) {
    throw std::runtime_error("EPUB output path cannot be empty");
  }

  std::vector<EpubArchiveChapter> availableChapters;
  availableChapters.reserve(chapters.size());
  for (const EpubArchiveChapter& chapter : chapters) {
    if (std::filesystem::is_regular_file(chapter.htmlPath)) {
      availableChapters.push_back(chapter);
    }
  }
  if (availableChapters.empty()) {
    throw std::runtime_error("EPUB requires at least one downloaded chapter");
  }

  const std::filesystem::path finalPath(outputPath);
  const std::filesystem::path temporaryPath = finalPath.string() + ".tmp";
  if (!finalPath.parent_path().empty()) {
    std::filesystem::create_directories(finalPath.parent_path());
  }
  std::error_code ignored;
  std::filesystem::remove(temporaryPath, ignored);

  try {
    ZipWriter zip(temporaryPath);

    // EPUB requires this exact file to be the first entry and uncompressed.
    zip.addStored("mimetype", "application/epub+zip");
    zip.addDeflated("META-INF/container.xml", containerDocument());
    zip.addDeflated("EPUB/styles.css", metadata.stylesheet);

    const bool hasJavaScript = !metadata.javascript.empty();
    if (hasJavaScript) {
      zip.addDeflated("EPUB/script.js",
                      "function fnEpub(){\n" + metadata.javascript + "\n}\n");
    }

    std::vector<EpubAsset> assets;
    std::unordered_map<std::string, EpubAsset> knownAssets;
    EpubAsset cover;
    EpubAsset* coverPointer = nullptr;
    const std::filesystem::path coverPath =
        localPathFromUri(metadata.coverPath);
    if (!coverPath.empty() && std::filesystem::is_regular_file(coverPath)) {
      const std::string extension = normalizedImageExtension(coverPath);
      cover = EpubAsset{
          "cover-image",
          "EPUB/images/cover" + extension,
          imageMediaType(extension),
      };
      zip.addFile(cover.archivePath, coverPath);
      coverPointer = &cover;
    }

    for (std::size_t index = 0; index < availableChapters.size(); ++index) {
      const std::string body = prepareChapterBody(
          availableChapters[index], zip, knownAssets, assets);
      zip.addDeflated(
          "EPUB/text/chapter-" + std::to_string(index) + ".xhtml",
          chapterDocument(availableChapters[index], body, hasJavaScript));
    }

    zip.addDeflated(
        "EPUB/nav.xhtml",
        navigationDocument(metadata, availableChapters));
    zip.addDeflated("EPUB/toc.ncx", ncxDocument(metadata, availableChapters));
    zip.addDeflated(
        "EPUB/content.opf",
        packageDocument(metadata, availableChapters, assets, coverPointer,
                        hasJavaScript));
    zip.finish();

    std::filesystem::remove(finalPath, ignored);
    std::filesystem::rename(temporaryPath, finalPath);
    return EpubArchiveResult{outputPath, availableChapters.size()};
  } catch (...) {
    std::filesystem::remove(temporaryPath, ignored);
    throw;
  }
}

} // namespace margelo::nitro::nitroepub
