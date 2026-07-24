#pragma once

#include "EpubAsset.hpp"
#include "EpubExporter.hpp"
#include "ZipWriter.hpp"

#include <filesystem>
#include <string>
#include <unordered_map>
#include <vector>

namespace margelo::nitro::nitroepub {

std::filesystem::path localPathFromUri(const std::string& uri);
std::string normalizedImageExtension(const std::filesystem::path& path);
std::string imageMediaType(const std::string& extension);
std::string prepareChapterBody(
    const EpubArchiveChapter& chapter,
    ZipWriter& zip,
    std::unordered_map<std::string, EpubAsset>& knownAssets,
    std::vector<EpubAsset>& assets);

} // namespace margelo::nitro::nitroepub
