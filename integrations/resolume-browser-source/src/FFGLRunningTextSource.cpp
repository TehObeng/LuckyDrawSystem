#include "FFGLRunningTextSource.h"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <filesystem>
#include <string>
#include <vector>

#include <windows.h>

#include <FFGLScopedShaderBinding.h>

using namespace ffglex;

namespace {

enum ParamType : FFUInt32 {
  PT_TEXT,
  PT_SPEED,
  PT_FONT_SIZE,
  PT_RED,
  PT_GREEN,
  PT_BLUE,
  PT_ALPHA
};

static CFFGLPluginInfo PluginInfo(
    PluginFactory<FFGLRunningTextSource>,
    "RTS1",
    "Running Text Source",
    2,
    1,
    1,
    0,
    FF_SOURCE,
    "Animated ticker / marquee text source for Resolume.",
    "Undian Lucky Draw / FFGL Running Text Source");

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
uniform sampler2D tickerTexture;
uniform float scrollOffset;

in vec2 uv;
out vec4 fragColor;

void main() {
  vec2 sampleUv = vec2(fract(uv.x + scrollOffset), uv.y);
  fragColor = texture(tickerTexture, sampleUv);
}
)";

std::wstring utf8ToWide(const std::string& value) {
  if (value.empty()) {
    return L"";
  }

  const int required = MultiByteToWideChar(CP_UTF8, 0, value.c_str(), -1, nullptr, 0);
  if (required <= 0) {
    return L"";
  }

  std::wstring buffer(static_cast<std::size_t>(required), L'\0');
  MultiByteToWideChar(CP_UTF8, 0, value.c_str(), -1, buffer.data(), required);
  if (!buffer.empty() && buffer.back() == L'\0') {
    buffer.pop_back();
  }
  return buffer;
}

int toPixelFontSize(float normalized) {
  constexpr int minSize = 24;
  constexpr int maxSize = 180;
  return minSize + static_cast<int>(std::round((maxSize - minSize) * std::clamp(normalized, 0.0f, 1.0f)));
}

COLORREF toColor(float red, float green, float blue) {
  return RGB(
      static_cast<int>(std::round(std::clamp(red, 0.0f, 1.0f) * 255.0f)),
      static_cast<int>(std::round(std::clamp(green, 0.0f, 1.0f) * 255.0f)),
      static_cast<int>(std::round(std::clamp(blue, 0.0f, 1.0f) * 255.0f)));
}

} // namespace

FFGLRunningTextSource::FFGLRunningTextSource()
    : text_("LIVE LUCKY DRAW  |  GRAND PRIZE  |  WINNER BOARD  |  "),
      startTime_(std::chrono::steady_clock::now()) {
  SetMinInputs(0);
  SetMaxInputs(0);

  SetParamInfo(PT_TEXT, "Text", FF_TYPE_TEXT, text_.c_str());
  SetParamInfof(PT_SPEED, "Speed", FF_TYPE_STANDARD);
  SetParamInfof(PT_FONT_SIZE, "Font Size", FF_TYPE_STANDARD);
  SetParamInfof(PT_RED, "Red", FF_TYPE_RED);
  SetParamInfof(PT_GREEN, "Green", FF_TYPE_GREEN);
  SetParamInfof(PT_BLUE, "Blue", FF_TYPE_BLUE);
  SetParamInfof(PT_ALPHA, "Alpha", FF_TYPE_ALPHA);
}

FFGLRunningTextSource::~FFGLRunningTextSource() {
  DeInitGL();
}

FFResult FFGLRunningTextSource::InitGL(const FFGLViewportStruct* viewport) {
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

  if (!rebuildTextTexture()) {
    FFGLLog::LogToHost("Running Text Source: initial text texture build failed.");
  }

  return CFFGLPlugin::InitGL(viewport);
}

FFResult FFGLRunningTextSource::ProcessOpenGL(ProcessOpenGLStruct* pGL) {
  if (textureDirty_) {
    rebuildTextTexture();
  }

  ScopedShaderBinding shaderBinding(shader_.GetGLID());

  GLint previousTexture = 0;
  glGetIntegerv(GL_TEXTURE_BINDING_2D, &previousTexture);

  glActiveTexture(GL_TEXTURE0);
  glBindTexture(GL_TEXTURE_2D, textureId_);
  shader_.Set("tickerTexture", 0);
  shader_.Set("scrollOffset", currentOffset());

  quad_.Draw();

  glBindTexture(GL_TEXTURE_2D, static_cast<GLuint>(previousTexture));
  return FF_SUCCESS;
}

FFResult FFGLRunningTextSource::DeInitGL() {
  if (textureId_ != 0) {
    glDeleteTextures(1, &textureId_);
    textureId_ = 0;
  }

  quad_.Release();
  shader_.FreeGLResources();
  return FF_SUCCESS;
}

FFResult FFGLRunningTextSource::SetFloatParameter(unsigned int index, float value) {
  switch (index) {
    case PT_SPEED:
      speed_ = std::clamp(value, 0.0f, 1.0f);
      return FF_SUCCESS;
    case PT_FONT_SIZE:
      fontSize_ = std::clamp(value, 0.0f, 1.0f);
      textureDirty_ = true;
      return FF_SUCCESS;
    case PT_RED:
      red_ = std::clamp(value, 0.0f, 1.0f);
      textureDirty_ = true;
      return FF_SUCCESS;
    case PT_GREEN:
      green_ = std::clamp(value, 0.0f, 1.0f);
      textureDirty_ = true;
      return FF_SUCCESS;
    case PT_BLUE:
      blue_ = std::clamp(value, 0.0f, 1.0f);
      textureDirty_ = true;
      return FF_SUCCESS;
    case PT_ALPHA:
      alpha_ = std::clamp(value, 0.0f, 1.0f);
      textureDirty_ = true;
      return FF_SUCCESS;
    default:
      return FF_FAIL;
  }
}

FFResult FFGLRunningTextSource::SetTextParameter(unsigned int index, const char* value) {
  switch (index) {
    case PT_TEXT:
      text_ = value != nullptr ? value : "";
      textureDirty_ = true;
      return FF_SUCCESS;
    default:
      return FF_FAIL;
  }
}

float FFGLRunningTextSource::GetFloatParameter(unsigned int index) {
  switch (index) {
    case PT_SPEED:
      return speed_;
    case PT_FONT_SIZE:
      return fontSize_;
    case PT_RED:
      return red_;
    case PT_GREEN:
      return green_;
    case PT_BLUE:
      return blue_;
    case PT_ALPHA:
      return alpha_;
    default:
      return 0.0f;
  }
}

char* FFGLRunningTextSource::GetTextParameter(unsigned int index) {
  static char textBuffer[2048] = {};

  switch (index) {
    case PT_TEXT:
      std::strncpy(textBuffer, text_.c_str(), sizeof(textBuffer) - 1);
      textBuffer[sizeof(textBuffer) - 1] = '\0';
      return textBuffer;
    default:
      textBuffer[0] = '\0';
      return textBuffer;
  }
}

bool FFGLRunningTextSource::ensureTexture() {
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
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);

  std::vector<unsigned char> black(static_cast<std::size_t>(textureWidth_) * static_cast<std::size_t>(textureHeight_) * 4, 0);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, textureWidth_, textureHeight_, 0, GL_BGRA, GL_UNSIGNED_BYTE, black.data());
  glBindTexture(GL_TEXTURE_2D, static_cast<GLuint>(previousTexture));
  return true;
}

bool FFGLRunningTextSource::rebuildTextTexture() {
  const auto wideText = utf8ToWide(text_.empty() ? " " : text_);
  const int pixelFontSize = toPixelFontSize(fontSize_);
  const int bitmapHeight = std::max(128, pixelFontSize * 2);
  const int bitmapWidth = 4096;

  BITMAPINFO bitmapInfo = {};
  bitmapInfo.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
  bitmapInfo.bmiHeader.biWidth = bitmapWidth;
  bitmapInfo.bmiHeader.biHeight = -bitmapHeight;
  bitmapInfo.bmiHeader.biPlanes = 1;
  bitmapInfo.bmiHeader.biBitCount = 32;
  bitmapInfo.bmiHeader.biCompression = BI_RGB;

  void* rawPixels = nullptr;
  HDC screenDc = GetDC(nullptr);
  HDC memoryDc = CreateCompatibleDC(screenDc);
  HBITMAP dib = CreateDIBSection(screenDc, &bitmapInfo, DIB_RGB_COLORS, &rawPixels, nullptr, 0);

  if (!memoryDc || !dib || !rawPixels) {
    if (dib) {
      DeleteObject(dib);
    }
    if (memoryDc) {
      DeleteDC(memoryDc);
    }
    if (screenDc) {
      ReleaseDC(nullptr, screenDc);
    }
    return false;
  }

  auto oldBitmap = SelectObject(memoryDc, dib);
  RECT rect{0, 0, bitmapWidth, bitmapHeight};
  HBRUSH clearBrush = CreateSolidBrush(RGB(0, 0, 0));
  FillRect(memoryDc, &rect, clearBrush);
  DeleteObject(clearBrush);

  SetBkMode(memoryDc, TRANSPARENT);
  SetTextColor(memoryDc, toColor(red_, green_, blue_));

  const int fontWeight = alpha_ >= 0.8f ? FW_BOLD : FW_NORMAL;
  HFONT font = CreateFontW(
      -pixelFontSize,
      0,
      0,
      0,
      fontWeight,
      FALSE,
      FALSE,
      FALSE,
      DEFAULT_CHARSET,
      OUT_OUTLINE_PRECIS,
      CLIP_DEFAULT_PRECIS,
      CLEARTYPE_QUALITY,
      DEFAULT_PITCH | FF_SWISS,
      L"Arial");

  auto oldFont = SelectObject(memoryDc, font);

  SIZE textSize{};
  GetTextExtentPoint32W(memoryDc, wideText.c_str(), static_cast<int>(wideText.size()), &textSize);

  const int gap = std::max(80, pixelFontSize);
  const int patternWidth = std::max(textSize.cx + gap, 1);
  const int baselineY = std::max(0, (bitmapHeight - textSize.cy) / 2);

  for (int x = 0; x < bitmapWidth + patternWidth; x += patternWidth) {
    TextOutW(memoryDc, x, baselineY, wideText.c_str(), static_cast<int>(wideText.size()));
  }

  GdiFlush();

  pixels_.assign(
      static_cast<unsigned char*>(rawPixels),
      static_cast<unsigned char*>(rawPixels) + static_cast<std::size_t>(bitmapWidth) * static_cast<std::size_t>(bitmapHeight) * 4);

  const unsigned char alphaByte = static_cast<unsigned char>(std::round(alpha_ * 255.0f));
  for (std::size_t index = 0; index + 3 < pixels_.size(); index += 4) {
    if (pixels_[index] == 0 && pixels_[index + 1] == 0 && pixels_[index + 2] == 0) {
      pixels_[index + 3] = 0;
    } else {
      pixels_[index + 3] = alphaByte;
    }
  }

  SelectObject(memoryDc, oldFont);
  DeleteObject(font);
  SelectObject(memoryDc, oldBitmap);
  DeleteObject(dib);
  DeleteDC(memoryDc);
  ReleaseDC(nullptr, screenDc);

  textureWidth_ = bitmapWidth;
  textureHeight_ = bitmapHeight;

  GLint previousTexture = 0;
  glGetIntegerv(GL_TEXTURE_BINDING_2D, &previousTexture);
  glBindTexture(GL_TEXTURE_2D, textureId_);
  glTexImage2D(
      GL_TEXTURE_2D,
      0,
      GL_RGBA8,
      textureWidth_,
      textureHeight_,
      0,
      GL_BGRA,
      GL_UNSIGNED_BYTE,
      pixels_.data());
  glBindTexture(GL_TEXTURE_2D, static_cast<GLuint>(previousTexture));

  textureDirty_ = false;
  return true;
}

float FFGLRunningTextSource::currentOffset() const {
  const auto elapsed = std::chrono::duration<float>(std::chrono::steady_clock::now() - startTime_).count();
  const float wrapped = std::fmod(elapsed * speed_, 1.0f);
  return wrapped < 0.0f ? wrapped + 1.0f : wrapped;
}
