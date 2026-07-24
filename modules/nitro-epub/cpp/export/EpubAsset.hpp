#pragma once

#include <string>

namespace margelo::nitro::nitroepub {

struct EpubAsset {
  std::string id;
  std::string archivePath;
  std::string mediaType;
};

} // namespace margelo::nitro::nitroepub
