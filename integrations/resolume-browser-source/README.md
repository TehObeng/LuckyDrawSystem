# Resolume Custom Sources

Windows-only FFGL source plugin scaffolds for Resolume Arena/Avenue 7.

This package currently includes two custom sources:

- `Web Browser Source`
- `Running Text Source`

## Sources

### Web Browser Source

This source is meant to behave like a lightweight browser source inside Resolume:

- add it as a custom FFGL source
- paste a URL into the plugin's `URL` text parameter
- render your web page directly on a Resolume layer

It is designed first for URLs from this project, for example:

- `http://localhost:3000/display/lucky-draw/my-event`
- `http://localhost:3000/display/lucky-draw-all/my-event`
- `http://localhost:3000/display/auction/my-event`

### Running Text Source

This source is a Resolume-native ticker / marquee text source:

- add it as a custom FFGL source
- type your message into the `Text` parameter
- tune speed, font size, and color
- use it for sponsor loops, stage lower-thirds, winner crawls, or queue messaging

## Current status

This folder contains native plugin scaffolds and packaging layout, but they are **not compiled in this workspace**.

Why:

- this machine currently does not have `cmake`, `cl`, or `msbuild`
- Resolume plugin development requires the official FFGL SDK
- the browser source also requires a native browser runtime
- the browser runtime used here is CEF in off-screen rendering mode, which must be bundled separately

So the deliverable in this repo is:

- the FFGL source plugin code
- the browser subprocess code required by CEF
- a CMake-based build scaffold
- packaging instructions for Resolume

## Architecture

- `src/FFGLBrowserSource.*`
  The Resolume FFGL source plugin for URLs. Exposes a text parameter for the URL and an event parameter for reload.
- `src/CefBrowserSource.*`
  Manages CEF initialization, windowless browser creation, navigation, resizing, and frame upload.
- `src/BrowserFrameStore.h`
  Thread-safe frame handoff between CEF paint callbacks and the OpenGL upload step in the browser source.
- `src/FFGLRunningTextSource.*`
  The Resolume FFGL source plugin for animated ticker text. Renders a text bitmap with GDI and scrolls it inside Resolume.
- `browser-subprocess/main.cpp`
  The CEF subprocess executable used for Chromium render/browser child processes.

## Build prerequisites

For all sources:

1. Visual Studio with C++ desktop workload
2. CMake 3.21+
3. Resolume FFGL SDK from the official repo

Additional requirement for `Web Browser Source`:

4. A matching CEF binary distribution for Windows x64

## Suggested build layout

```text
third_party/
  ffgl/      <- clone of https://github.com/resolume/ffgl
  cef/       <- extracted CEF binary distribution
integrations/
  resolume-browser-source/
```

## Configure

Build only the running text source:

```powershell
cmake -S integrations/resolume-browser-source -B integrations/resolume-browser-source/build `
  -DFFGL_SDK_ROOT=C:\path\to\ffgl `
  -DBUILD_RUNNING_TEXT_SOURCE=ON `
  -DBUILD_BROWSER_SOURCE=OFF
cmake --build integrations/resolume-browser-source/build --config Release
```

Build both sources:

```powershell
cmake -S integrations/resolume-browser-source -B integrations/resolume-browser-source/build `
  -DFFGL_SDK_ROOT=C:\path\to\ffgl `
  -DCEF_ROOT=C:\path\to\cef `
  -DBUILD_RUNNING_TEXT_SOURCE=ON `
  -DBUILD_BROWSER_SOURCE=ON
cmake --build integrations/resolume-browser-source/build --config Release
```

## Package for Resolume

Copy these into your Windows Resolume FFGL folder:

```text
%USERPROFILE%\Documents\Resolume\Extra Effects\
  ResolumeRunningTextSource.dll
  ResolumeBrowserSource.dll                  <- only if browser source was built
  ResolumeBrowserSourceSubprocess.exe        <- only if browser source was built
  libcef.dll                                 <- only for browser source
  chrome_elf.dll                             <- only for browser source
  icudtl.dat                                 <- only for browser source
  resources.pak                              <- only for browser source
  snapshot_blob.bin                          <- only for browser source
  v8_context_snapshot.bin                    <- only for browser source
  vk_swiftshader.dll                         <- only for browser source
  vk_swiftshader_icd.json                    <- only for browser source
  locales\                                   <- only for browser source
  swiftshader\                               <- only for browser source
```

If your CEF distribution contains additional required `.pak` or support files, copy those too.

Then restart Resolume and look for:

- `Running Text Source`
- `Web Browser Source`

inside the Sources panel.

## Parameters

### Web Browser Source

- `URL`
  Paste the page you want to render.
- `Reload`
  Forces a browser refresh.

### Running Text Source

- `Text`
  The ticker message.
- `Speed`
  Horizontal scroll speed.
- `Font Size`
  Relative text size.
- `Red`, `Green`, `Blue`, `Alpha`
  Running text color and opacity.

## Notes

- The package is currently scoped to Windows.
- `Running Text Source` does not depend on CEF and is the lighter option if you just need ticker text in Resolume.
- The cleanest show workflow for `Web Browser Source` is still to host the web content locally on the same machine as Resolume.
- I could not compile the `.dll` files in this workspace because the Windows C++ build toolchain and CEF binaries are not installed here.

## References

- Resolume FFGL SDK: https://github.com/resolume/ffgl
- Resolume FFGL loading path: https://www.resolume.com/support/en/preferences
- CEF off-screen rendering: https://chromiumembedded.github.io/cef/general_usage
