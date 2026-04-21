#include <windows.h>

#include "include/cef_app.h"

int APIENTRY wWinMain(HINSTANCE instance, HINSTANCE, wchar_t*, int) {
  CefEnableHighDPISupport();

  CefMainArgs mainArgs(instance);
  return CefExecuteProcess(mainArgs, nullptr, nullptr);
}
