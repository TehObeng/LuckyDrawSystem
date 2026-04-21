#include "FFGLBrowserSource.h"

#include <cstring>
#include <filesystem>

#include <windows.h>

#include <FFGLScopedShaderBinding.h>

using namespace ffglex;

namespace {

enum ParamType : FFUInt32 {
  PT_URL,
  PT_RELOAD
};

static CFFGLPluginInfo PluginInfo(
    PluginFactory<FFGLBrowserSource>,
    "WBS1",
    "Web Browser Source",
    2,
    1,
    1,
    0,
    FF_SOURCE,
    "Paste a URL and render a browser page inside Resolume.",
    "Undian Lucky Draw / FFGL Browser Source");

static const char vertexShaderCode[] = R"(#version 410 core
layout(location = 0) in vec4 vPosition;
layout(location = 1) in vec2 vUV;

out vec2 uv;

void main() {
  gl_Position = vPosition;
  uv = vUV;
}
)";

static const char fragmentShaderCode[] = R"(#version 410 core
uniform sampler2D browserTexture;

in vec2 uv;
out vec4 fragColor;

void main() {
  fragColor = texture(browserTexture, uv);
}
)";

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

} // namespace

FFGLBrowserSource::FFGLBrowserSource()
    : url_("http://localhost:3000"),
      browser_(std::make_unique<CefBrowserSourceController>()) {
  SetMinInputs(0);
  SetMaxInputs(0);

  SetParamInfo(PT_URL, "URL", FF_TYPE_TEXT, url_.c_str());
  SetParamInfof(PT_RELOAD, "Reload", FF_TYPE_EVENT);
}

FFGLBrowserSource::~FFGLBrowserSource() {
  DeInitGL();
}

FFResult FFGLBrowserSource::InitGL(const FFGLViewportStruct* viewport) {
  if (!shader_.Compile(vertexShaderCode, fragmentShaderCode)) {
    return FF_FAIL;
  }

  if (!quad_.Initialise()) {
    shader_.FreeGLResources();
    return FF_FAIL;
  }

  if (!ensureTexture()) {
    DeInitGL();
    return FF_FAIL;
  }

  if (!browser_->initialize(currentModuleDirectory(), url_, static_cast<int>(viewport->width), static_cast<int>(viewport->height))) {
    FFGLLog::LogToHost(browser_->lastError().c_str());
  }

  return CFFGLPlugin::InitGL(viewport);
}

FFResult FFGLBrowserSource::ProcessOpenGL(ProcessOpenGLStruct* pGL) {
  browser_->tick();
  uploadLatestFrame();

  ScopedShaderBinding shaderBinding(shader_.GetGLID());

  GLint previousTexture = 0;
  glGetIntegerv(GL_TEXTURE_BINDING_2D, &previousTexture);

  glActiveTexture(GL_TEXTURE0);
  glBindTexture(GL_TEXTURE_2D, textureId_);
  shader_.Set("browserTexture", 0);

  quad_.Draw();

  glBindTexture(GL_TEXTURE_2D, static_cast<GLuint>(previousTexture));
  return FF_SUCCESS;
}

FFResult FFGLBrowserSource::DeInitGL() {
  if (browser_) {
    browser_->shutdown();
  }

  if (textureId_ != 0) {
    glDeleteTextures(1, &textureId_);
    textureId_ = 0;
  }

  quad_.Release();
  shader_.FreeGLResources();
  textureWidth_ = 1;
  textureHeight_ = 1;

  return FF_SUCCESS;
}

unsigned int FFGLBrowserSource::Resize(const FFGLViewportStruct* viewport) {
  if (browser_) {
    browser_->resize(static_cast<int>(viewport->width), static_cast<int>(viewport->height));
  }

  return CFFGLPlugin::Resize(viewport);
}

FFResult FFGLBrowserSource::SetFloatParameter(unsigned int index, float value) {
  switch (index) {
    case PT_RELOAD:
      reload_ = value;
      if (value != 0.0f && browser_) {
        browser_->reload();
      }
      return FF_SUCCESS;
    default:
      return FF_FAIL;
  }
}

FFResult FFGLBrowserSource::SetTextParameter(unsigned int index, const char* value) {
  switch (index) {
    case PT_URL:
      url_ = value != nullptr ? value : "";
      if (browser_) {
        browser_->navigate(url_);
      }
      return FF_SUCCESS;
    default:
      return FF_FAIL;
  }
}

float FFGLBrowserSource::GetFloatParameter(unsigned int index) {
  switch (index) {
    case PT_RELOAD:
      return reload_;
    default:
      return 0.0f;
  }
}

char* FFGLBrowserSource::GetTextParameter(unsigned int index) {
  static char textBuffer[1024] = {};

  switch (index) {
    case PT_URL:
      std::strncpy(textBuffer, url_.c_str(), sizeof(textBuffer) - 1);
      textBuffer[sizeof(textBuffer) - 1] = '\0';
      return textBuffer;
    default:
      textBuffer[0] = '\0';
      return textBuffer;
  }
}

bool FFGLBrowserSource::ensureTexture() {
  if (textureId_ == 0) {
    glGenTextures(1, &textureId_);
  }

  if (textureId_ == 0) {
    return false;
  }

  GLint previousTexture = 0;
  glGetIntegerv(GL_TEXTURE_BINDING_2D, &previousTexture);

  glBindTexture(GL_TEXTURE_2D, textureId_);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);

  const unsigned char blackPixel[4] = {0, 0, 0, 255};
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, 1, 1, 0, GL_BGRA, GL_UNSIGNED_BYTE, blackPixel);
  glBindTexture(GL_TEXTURE_2D, static_cast<GLuint>(previousTexture));

  return true;
}

void FFGLBrowserSource::uploadLatestFrame() {
  if (!browser_ || textureId_ == 0) {
    return;
  }

  BrowserFrame frame;
  if (!browser_->consumeFrame(frame)) {
    return;
  }

  GLint previousTexture = 0;
  glGetIntegerv(GL_TEXTURE_BINDING_2D, &previousTexture);
  glBindTexture(GL_TEXTURE_2D, textureId_);

  if (frame.width != textureWidth_ || frame.height != textureHeight_) {
    textureWidth_ = frame.width;
    textureHeight_ = frame.height;
    glTexImage2D(
        GL_TEXTURE_2D,
        0,
        GL_RGBA8,
        textureWidth_,
        textureHeight_,
        0,
        GL_BGRA,
        GL_UNSIGNED_BYTE,
        frame.bgra.data());
  } else {
    glTexSubImage2D(
        GL_TEXTURE_2D,
        0,
        0,
        0,
        textureWidth_,
        textureHeight_,
        GL_BGRA,
        GL_UNSIGNED_BYTE,
        frame.bgra.data());
  }

  glBindTexture(GL_TEXTURE_2D, static_cast<GLuint>(previousTexture));
}
