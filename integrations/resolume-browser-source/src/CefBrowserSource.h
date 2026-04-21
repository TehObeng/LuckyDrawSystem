#pragma once

#include <filesystem>
#include <memory>
#include <string>

#include "BrowserFrameStore.h"

class CefBrowserSourceController {
public:
  CefBrowserSourceController();
  ~CefBrowserSourceController();

  bool initialize(const std::filesystem::path& runtimeDirectory, const std::string& initialUrl, int width, int height);
  void shutdown();

  void tick();
  void navigate(const std::string& url);
  void reload();
  void resize(int width, int height);

  bool consumeFrame(BrowserFrame& frame);
  bool isReady() const;
  const std::string& lastError() const;

private:
  class Impl;

  std::unique_ptr<Impl> impl_;
  BrowserFrameStore frameStore_;
  std::string lastError_;
};
