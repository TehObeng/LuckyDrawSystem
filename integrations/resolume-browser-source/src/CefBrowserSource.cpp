#include "CefBrowserSource.h"

#include <atomic>
#include <filesystem>
#include <mutex>
#include <string>
#include <utility>

#include <windows.h>

#include "include/base/cef_bind.h"
#include "include/cef_app.h"
#include "include/cef_browser.h"
#include "include/cef_client.h"
#include "include/cef_command_line.h"
#include "include/wrapper/cef_helpers.h"

namespace {

std::wstring toWide(const std::filesystem::path& path) {
  return path.wstring();
}

std::string normalizeUrl(std::string url) {
  if (url.empty()) {
    return "about:blank";
  }

  if (url.find("://") == std::string::npos) {
    return "http://" + url;
  }

  return url;
}

std::filesystem::path currentModuleDirectory() {
  HMODULE module = nullptr;
  if (!GetModuleHandleExW(
        GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
        reinterpret_cast<LPCWSTR>(&currentModuleDirectory),
        &module)) {
    return {};
  }

  wchar_t buffer[MAX_PATH] = {};
  const auto length = GetModuleFileNameW(module, buffer, MAX_PATH);
  if (length == 0) {
    return {};
  }

  return std::filesystem::path(buffer).parent_path();
}

class BrowserClient final
    : public CefClient
    , public CefLifeSpanHandler
    , public CefLoadHandler
    , public CefRenderHandler {
public:
  BrowserClient(BrowserFrameStore& frameStore, int width, int height)
      : frameStore_(frameStore), width_(width), height_(height) {}

  CefRefPtr<CefRenderHandler> GetRenderHandler() override { return this; }
  CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() override { return this; }
  CefRefPtr<CefLoadHandler> GetLoadHandler() override { return this; }

  bool GetViewRect(CefRefPtr<CefBrowser> browser, CefRect& rect) override {
    rect = CefRect(0, 0, width_, height_);
    return true;
  }

  void OnAfterCreated(CefRefPtr<CefBrowser> browser) override {
    CEF_REQUIRE_UI_THREAD();
    browser_ = browser;
  }

  void OnBeforeClose(CefRefPtr<CefBrowser> browser) override {
    CEF_REQUIRE_UI_THREAD();
    browser_ = nullptr;
  }

  void OnPaint(
      CefRefPtr<CefBrowser> browser,
      PaintElementType type,
      const RectList& dirtyRects,
      const void* buffer,
      int width,
      int height) override {
    CEF_REQUIRE_UI_THREAD();

    if (type != PET_VIEW) {
      return;
    }

    frameStore_.update(buffer, width, height);
  }

  void OnLoadError(
      CefRefPtr<CefBrowser> browser,
      CefRefPtr<CefFrame> frame,
      ErrorCode errorCode,
      const CefString& errorText,
      const CefString& failedUrl) override {
    CEF_REQUIRE_UI_THREAD();
    if (frame && frame->IsMain()) {
      lastError_ = errorText.ToString();
    }
  }

  void navigate(const std::string& url) {
    if (browser_ && browser_->GetMainFrame()) {
      browser_->GetMainFrame()->LoadURL(url);
    }
  }

  void reload() {
    if (browser_) {
      browser_->ReloadIgnoreCache();
    }
  }

  void resize(int width, int height) {
    width_ = width;
    height_ = height;
    if (browser_) {
      browser_->GetHost()->WasResized();
    }
  }

  bool ready() const {
    return browser_ != nullptr;
  }

  const std::string& lastError() const {
    return lastError_;
  }

private:
  BrowserFrameStore& frameStore_;
  int width_;
  int height_;
  std::string lastError_;
  CefRefPtr<CefBrowser> browser_;

  IMPLEMENT_REFCOUNTING(BrowserClient);
};

class CefRuntime {
public:
  static CefRuntime& instance() {
    static CefRuntime runtime;
    return runtime;
  }

  bool acquire(const std::filesystem::path& runtimeDirectory, std::string& error) {
    std::lock_guard<std::mutex> lock(mutex_);

    if (initialized_) {
      ++refCount_;
      return true;
    }

    const auto runtimeDir = runtimeDirectory.empty() ? currentModuleDirectory() : runtimeDirectory;
    if (runtimeDir.empty()) {
      error = "Could not resolve the plugin runtime directory.";
      return false;
    }

    const auto subprocessPath = runtimeDir / "ResolumeBrowserSourceSubprocess.exe";
    if (!std::filesystem::exists(subprocessPath)) {
      error = "Missing ResolumeBrowserSourceSubprocess.exe next to the plugin DLL.";
      return false;
    }

    const auto localesPath = runtimeDir / "locales";
    if (!std::filesystem::exists(localesPath)) {
      error = "Missing CEF locales folder next to the plugin DLL.";
      return false;
    }

    CefEnableHighDPISupport();

    CefMainArgs mainArgs(GetModuleHandleW(nullptr));
    CefSettings settings;
    settings.no_sandbox = true;
    settings.windowless_rendering_enabled = true;
    settings.command_line_args_disabled = false;
    settings.multi_threaded_message_loop = false;
    CefString(&settings.browser_subprocess_path) = toWide(subprocessPath);
    CefString(&settings.resources_dir_path) = toWide(runtimeDir);
    CefString(&settings.locales_dir_path) = toWide(localesPath);
    CefString(&settings.log_file) = toWide(runtimeDir / "ResolumeBrowserSource.log");

    const int exitCode = CefExecuteProcess(mainArgs, nullptr, nullptr);
    if (exitCode >= 0) {
      error = "CEF unexpectedly entered subprocess mode in the host process.";
      return false;
    }

    if (!CefInitialize(mainArgs, settings, nullptr, nullptr)) {
      error = "CEF initialization failed.";
      return false;
    }

    initialized_ = true;
    refCount_ = 1;
    return true;
  }

  void release() {
    std::lock_guard<std::mutex> lock(mutex_);

    if (!initialized_) {
      return;
    }

    --refCount_;
    if (refCount_ <= 0) {
      CefShutdown();
      initialized_ = false;
      refCount_ = 0;
    }
  }

  void pump() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (initialized_) {
      CefDoMessageLoopWork();
    }
  }

private:
  std::mutex mutex_;
  bool initialized_ = false;
  int refCount_ = 0;
};

} // namespace

class CefBrowserSourceController::Impl {
public:
  Impl(BrowserFrameStore& frameStore, std::string& lastError)
      : frameStore(frameStore), lastErrorRef(lastError) {}

  bool initialize(const std::filesystem::path& runtimeDirectory, const std::string& initialUrl, int width, int height) {
    if (!CefRuntime::instance().acquire(runtimeDirectory, lastErrorRef)) {
      return false;
    }

    client = new BrowserClient(frameStore, width, height);

    CefWindowInfo windowInfo;
    windowInfo.SetAsWindowless(nullptr, true);

    CefBrowserSettings settings;
    settings.windowless_frame_rate = 60;

    browser = CefBrowserHost::CreateBrowserSync(
        windowInfo,
        client,
        normalizeUrl(initialUrl),
        settings,
        nullptr,
        nullptr);

    if (!browser) {
      lastErrorRef = "CEF could not create the off-screen browser instance.";
      CefRuntime::instance().release();
      client = nullptr;
      return false;
    }

    return true;
  }

  void shutdown() {
    if (browser) {
      browser->GetHost()->CloseBrowser(true);
      browser = nullptr;
    }
    client = nullptr;
    CefRuntime::instance().release();
  }

  void tick() {
    CefRuntime::instance().pump();
    if (client && !client->lastError().empty()) {
      lastErrorRef = client->lastError();
    }
  }

  void navigate(const std::string& url) {
    if (client) {
      client->navigate(normalizeUrl(url));
    }
  }

  void reload() {
    if (client) {
      client->reload();
    }
  }

  void resize(int width, int height) {
    if (client) {
      client->resize(width, height);
    }
  }

  bool ready() const {
    return client && client->ready();
  }

  BrowserFrameStore& frameStore;
  std::string& lastErrorRef;
  CefRefPtr<BrowserClient> client;
  CefRefPtr<CefBrowser> browser;
};

CefBrowserSourceController::CefBrowserSourceController()
    : impl_(nullptr) {}

CefBrowserSourceController::~CefBrowserSourceController() {
  shutdown();
}

bool CefBrowserSourceController::initialize(const std::filesystem::path& runtimeDirectory, const std::string& initialUrl, int width, int height) {
  shutdown();
  lastError_.clear();
  impl_ = std::make_unique<Impl>(frameStore_, lastError_);
  return impl_->initialize(runtimeDirectory, initialUrl, width, height);
}

void CefBrowserSourceController::shutdown() {
  if (impl_) {
    impl_->shutdown();
    impl_.reset();
  }
}

void CefBrowserSourceController::tick() {
  if (impl_) {
    impl_->tick();
  }
}

void CefBrowserSourceController::navigate(const std::string& url) {
  if (impl_) {
    impl_->navigate(url);
  }
}

void CefBrowserSourceController::reload() {
  if (impl_) {
    impl_->reload();
  }
}

void CefBrowserSourceController::resize(int width, int height) {
  if (impl_) {
    impl_->resize(width, height);
  }
}

bool CefBrowserSourceController::consumeFrame(BrowserFrame& frame) {
  return frameStore_.consume(frame);
}

bool CefBrowserSourceController::isReady() const {
  return impl_ && impl_->ready();
}

const std::string& CefBrowserSourceController::lastError() const {
  return lastError_;
}
