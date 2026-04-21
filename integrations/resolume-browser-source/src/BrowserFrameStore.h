#pragma once

#include <cstdint>
#include <mutex>
#include <utility>
#include <vector>

struct BrowserFrame {
  int width = 0;
  int height = 0;
  std::vector<std::uint8_t> bgra;
};

class BrowserFrameStore {
public:
  void update(const void* pixels, int width, int height) {
    if (pixels == nullptr || width <= 0 || height <= 0) {
      return;
    }

    std::lock_guard<std::mutex> lock(mutex_);
    const auto* bytes = static_cast<const std::uint8_t*>(pixels);
    frame_.width = width;
    frame_.height = height;
    frame_.bgra.assign(bytes, bytes + static_cast<std::size_t>(width) * static_cast<std::size_t>(height) * 4);
    dirty_ = true;
  }

  bool consume(BrowserFrame& outFrame) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (!dirty_) {
      return false;
    }

    outFrame = frame_;
    dirty_ = false;
    return true;
  }

private:
  std::mutex mutex_;
  BrowserFrame frame_;
  bool dirty_ = false;
};
