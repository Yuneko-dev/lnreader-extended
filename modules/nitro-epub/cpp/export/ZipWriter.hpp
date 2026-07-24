#pragma once

#include <cstdint>
#include <filesystem>
#include <fstream>
#include <string>
#include <vector>

namespace margelo::nitro::nitroepub {

class ZipWriter final {
public:
  explicit ZipWriter(const std::filesystem::path& outputPath);
  ~ZipWriter();

  ZipWriter(const ZipWriter&) = delete;
  ZipWriter& operator=(const ZipWriter&) = delete;

  void addStored(const std::string& archivePath, const std::string& content);
  void addDeflated(const std::string& archivePath, const std::string& content);
  void addFile(const std::string& archivePath,
               const std::filesystem::path& sourcePath,
               bool compress = false);
  void finish();

private:
  struct CentralEntry {
    std::string archivePath;
    std::uint16_t method;
    std::uint32_t crc;
    std::uint32_t compressedSize;
    std::uint32_t uncompressedSize;
    std::uint32_t localHeaderOffset;
  };

  std::ofstream output_;
  std::vector<CentralEntry> entries_;
  bool finished_ = false;

  void add(const std::string& archivePath,
           const std::vector<std::uint8_t>& content,
           bool compress);
  void write16(std::uint16_t value);
  void write32(std::uint32_t value);
};

} // namespace margelo::nitro::nitroepub
