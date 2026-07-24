#pragma once

#include <cstddef>
#include <string>
#include <vector>

namespace margelo::nitro::nitroepub {

struct EpubArchiveMetadata {
  std::string title;
  std::string language;
  std::string coverPath;
  std::string description;
  std::string author;
  std::string bookId;
  std::string stylesheet;
  std::string javascript;
};

struct EpubArchiveChapter {
  std::string title;
  std::string htmlPath;
  std::string novelId;
  std::string chapterId;
};

struct EpubArchiveResult {
  std::string outputPath;
  std::size_t chapterCount;
};

EpubArchiveResult exportEpubArchive(
    const EpubArchiveMetadata& metadata,
    const std::vector<EpubArchiveChapter>& chapters,
    const std::string& outputPath);

} // namespace margelo::nitro::nitroepub
