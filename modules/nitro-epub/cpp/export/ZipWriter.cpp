#include "ZipWriter.hpp"

#include <algorithm>
#include <iterator>
#include <limits>
#include <stdexcept>
#include <zlib.h>

namespace margelo::nitro::nitroepub {
namespace {

constexpr std::uint16_t UTF8_FLAG = 0x0800;
constexpr std::uint16_t STORED = 0;
constexpr std::uint16_t DEFLATED = 8;
constexpr std::uint16_t DOS_DATE_1980_01_01 = 0x0021;

std::uint32_t checked32(std::uint64_t value, const char* description) {
  if (value > std::numeric_limits<std::uint32_t>::max()) {
    throw std::runtime_error(std::string("EPUB exceeds ZIP32 ") + description);
  }
  return static_cast<std::uint32_t>(value);
}

std::uint16_t checked16(std::size_t value, const char* description) {
  if (value > std::numeric_limits<std::uint16_t>::max()) {
    throw std::runtime_error(std::string("EPUB exceeds ZIP16 ") + description);
  }
  return static_cast<std::uint16_t>(value);
}

std::vector<std::uint8_t> deflateRaw(const std::vector<std::uint8_t>& input) {
  z_stream stream{};
  if (deflateInit2(&stream, Z_DEFAULT_COMPRESSION, Z_DEFLATED, -MAX_WBITS, 8,
                   Z_DEFAULT_STRATEGY) != Z_OK) {
    throw std::runtime_error("Failed to initialize EPUB compression");
  }

  std::vector<std::uint8_t> output(
      std::max<std::size_t>(128, compressBound(input.size())));
  stream.next_in = const_cast<Bytef*>(
      reinterpret_cast<const Bytef*>(input.data()));
  stream.avail_in = checked32(input.size(), "entry size");
  stream.next_out = reinterpret_cast<Bytef*>(output.data());
  stream.avail_out = checked32(output.size(), "compressed entry size");

  const int result = deflate(&stream, Z_FINISH);
  if (result != Z_STREAM_END) {
    deflateEnd(&stream);
    throw std::runtime_error("Failed to compress EPUB entry");
  }
  output.resize(stream.total_out);
  deflateEnd(&stream);
  return output;
}

} // namespace

ZipWriter::ZipWriter(const std::filesystem::path& outputPath)
    : output_(outputPath, std::ios::binary | std::ios::trunc) {
  if (!output_) {
    throw std::runtime_error("Unable to create EPUB at " + outputPath.string());
  }
}

ZipWriter::~ZipWriter() {
  if (!finished_) {
    output_.close();
  }
}

void ZipWriter::addStored(const std::string& archivePath,
                          const std::string& content) {
  add(archivePath,
      std::vector<std::uint8_t>(content.begin(), content.end()), false);
}

void ZipWriter::addDeflated(const std::string& archivePath,
                            const std::string& content) {
  add(archivePath,
      std::vector<std::uint8_t>(content.begin(), content.end()), true);
}

void ZipWriter::addFile(const std::string& archivePath,
                        const std::filesystem::path& sourcePath,
                        bool compress) {
  std::ifstream input(sourcePath, std::ios::binary);
  if (!input) {
    throw std::runtime_error("Unable to read EPUB asset " + sourcePath.string());
  }
  std::vector<std::uint8_t> content(
      (std::istreambuf_iterator<char>(input)),
      std::istreambuf_iterator<char>());
  add(archivePath, content, compress);
}

void ZipWriter::add(const std::string& archivePath,
                    const std::vector<std::uint8_t>& content,
                    bool compress) {
  if (finished_) {
    throw std::runtime_error("Cannot add an entry to a finished EPUB");
  }
  if (archivePath.empty() || archivePath.front() == '/' ||
      archivePath.find("..") != std::string::npos) {
    throw std::runtime_error("Unsafe EPUB archive path: " + archivePath);
  }

  const auto compressed = compress ? deflateRaw(content) : content;
  const auto crc = static_cast<std::uint32_t>(
      crc32(0, reinterpret_cast<const Bytef*>(content.data()),
            checked32(content.size(), "entry size")));
  const auto offset = checked32(static_cast<std::uint64_t>(output_.tellp()),
                                "local header offset");
  const auto pathLength = checked16(archivePath.size(), "entry name length");
  const auto method = static_cast<std::uint16_t>(compress ? DEFLATED : STORED);

  write32(0x04034b50);
  write16(20);
  write16(UTF8_FLAG);
  write16(method);
  write16(0);
  write16(DOS_DATE_1980_01_01);
  write32(crc);
  write32(checked32(compressed.size(), "compressed entry size"));
  write32(checked32(content.size(), "entry size"));
  write16(pathLength);
  write16(0);
  output_.write(archivePath.data(), pathLength);
  output_.write(reinterpret_cast<const char*>(compressed.data()),
                static_cast<std::streamsize>(compressed.size()));
  if (!output_) {
    throw std::runtime_error("Failed while writing EPUB entry " + archivePath);
  }

  entries_.push_back(CentralEntry{
      archivePath,
      method,
      crc,
      checked32(compressed.size(), "compressed entry size"),
      checked32(content.size(), "entry size"),
      offset,
  });
}

void ZipWriter::finish() {
  if (finished_) {
    return;
  }

  const auto directoryOffset =
      checked32(static_cast<std::uint64_t>(output_.tellp()),
                "central directory offset");
  for (const auto& entry : entries_) {
    const auto pathLength =
        checked16(entry.archivePath.size(), "entry name length");
    write32(0x02014b50);
    write16(20);
    write16(20);
    write16(UTF8_FLAG);
    write16(entry.method);
    write16(0);
    write16(DOS_DATE_1980_01_01);
    write32(entry.crc);
    write32(entry.compressedSize);
    write32(entry.uncompressedSize);
    write16(pathLength);
    write16(0);
    write16(0);
    write16(0);
    write16(0);
    write32(0);
    write32(entry.localHeaderOffset);
    output_.write(entry.archivePath.data(), pathLength);
  }

  const auto directoryEnd =
      checked32(static_cast<std::uint64_t>(output_.tellp()),
                "central directory size");
  const auto entryCount = checked16(entries_.size(), "entry count");
  write32(0x06054b50);
  write16(0);
  write16(0);
  write16(entryCount);
  write16(entryCount);
  write32(directoryEnd - directoryOffset);
  write32(directoryOffset);
  write16(0);
  output_.flush();
  if (!output_) {
    throw std::runtime_error("Failed to finalize EPUB archive");
  }
  output_.close();
  finished_ = true;
}

void ZipWriter::write16(std::uint16_t value) {
  const char bytes[] = {
      static_cast<char>(value & 0xff),
      static_cast<char>((value >> 8) & 0xff),
  };
  output_.write(bytes, sizeof(bytes));
}

void ZipWriter::write32(std::uint32_t value) {
  const char bytes[] = {
      static_cast<char>(value & 0xff),
      static_cast<char>((value >> 8) & 0xff),
      static_cast<char>((value >> 16) & 0xff),
      static_cast<char>((value >> 24) & 0xff),
  };
  output_.write(bytes, sizeof(bytes));
}

} // namespace margelo::nitro::nitroepub
