#pragma once

#include <chrono>
#include <string>
#include <vector>

#include <FFGLSDK.h>
#include <FFGLScreenQuad.h>
#include <FFGLShader.h>

class FFGLRunningTextSource : public CFFGLPlugin {
public:
  FFGLRunningTextSource();
  ~FFGLRunningTextSource() override;

  FFResult InitGL(const FFGLViewportStruct* viewport) override;
  FFResult ProcessOpenGL(ProcessOpenGLStruct* pGL) override;
  FFResult DeInitGL() override;

  FFResult SetFloatParameter(unsigned int index, float value) override;
  FFResult SetTextParameter(unsigned int index, const char* value) override;

  float GetFloatParameter(unsigned int index) override;
  char* GetTextParameter(unsigned int index) override;

private:
  bool ensureTexture();
  bool rebuildTextTexture();
  float currentOffset() const;

  std::string text_;
  float speed_ = 0.15f;
  float fontSize_ = 0.35f;
  float red_ = 1.0f;
  float green_ = 1.0f;
  float blue_ = 1.0f;
  float alpha_ = 1.0f;

  GLuint textureId_ = 0;
  int textureWidth_ = 2048;
  int textureHeight_ = 256;
  bool textureDirty_ = true;

  ffglex::FFGLShader shader_;
  ffglex::FFGLScreenQuad quad_;
  std::vector<unsigned char> pixels_;
  std::chrono::steady_clock::time_point startTime_;
};
