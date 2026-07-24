#pragma once

#include "EpubAsset.hpp"
#include "EpubExporter.hpp"

#include <string>
#include <vector>

namespace margelo::nitro::nitroepub {

std::string containerDocument();
std::string chapterDocument(const EpubArchiveChapter& chapter,
                            const std::string& body,
                            bool hasJavaScript);
std::string navigationDocument(
    const EpubArchiveMetadata& metadata,
    const std::vector<EpubArchiveChapter>& chapters);
std::string ncxDocument(
    const EpubArchiveMetadata& metadata,
    const std::vector<EpubArchiveChapter>& chapters);
std::string packageDocument(
    const EpubArchiveMetadata& metadata,
    const std::vector<EpubArchiveChapter>& chapters,
    const std::vector<EpubAsset>& assets,
    const EpubAsset* cover,
    bool hasJavaScript);

} // namespace margelo::nitro::nitroepub
