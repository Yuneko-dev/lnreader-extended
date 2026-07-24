#pragma once

#include "HybridEpubSpec.hpp"

namespace margelo::nitro::nitroepub {

class HybridEpub final : public HybridEpubSpec {
public:
  HybridEpub() : HybridObject(TAG) {}
  ~HybridEpub() override = default;

  std::shared_ptr<Promise<EpubNovel>> parseNovelAndChapters(
      const std::string& epubDirPath) override;
  std::shared_ptr<Promise<EpubExportResult>> exportEpub(
      const EpubExportMetadata& metadata,
      const std::vector<EpubExportChapter>& chapters,
      const std::string& outputPath) override;
};

} // namespace margelo::nitro::nitroepub
