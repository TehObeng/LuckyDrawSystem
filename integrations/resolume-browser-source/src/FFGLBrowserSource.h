#pragma once

#include <memory>
#include <string>

#include <FFGLSDK.h>
#include <FFGLScreenQuad.h>
#include <FFGLShader.h>

#include "CefBrowserSource.h"

class FFGLBrowserSource : public CFFGLPlugin {
public:
  FFGLBrowserSource();
  ~FFGLBrowserSource() override;

  FFResult InitGL(const FFGLViewportStruct* viewport) override;
  FFResult ProcessOpenGL(ProcessOpenGLStruct* pGL) override;
  FFResult DeInitGL() override;
  unsigned int Resize(const FFGLViewportStruct* viewport) override;

  FFResult SetFloatParameter(unsigned int index, float value) override;
  FFResult SetTextParameter(unsigned int index, const char* value) override;

  float GetFloatParameter(unsigned int index) override;
  char* GetTextParameter(unsigned int index) override;

private:
  bool ensureTexture();
  void uploadLatestFrame();

  std::string url_;
  float reload_ = 0.0f;

  GLuint textureId_ = 0;
  int textureWidth_ = 1;
  int textureHeight_ = 1;

  ffglex::FFGLShader shader_;
  ffglex::FFGLScreenQuad quad_;
  std::unique_ptr<CefBrowserSourceController> browser_;
};
