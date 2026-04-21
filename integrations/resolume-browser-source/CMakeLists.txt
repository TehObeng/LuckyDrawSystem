cmake_minimum_required(VERSION 3.21)
project(ResolumeCustomSources LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(FFGL_SDK_ROOT "" CACHE PATH "Path to the official Resolume FFGL SDK checkout")
set(CEF_ROOT "" CACHE PATH "Path to the extracted CEF binary distribution")

option(BUILD_RUNNING_TEXT_SOURCE "Build the running text Resolume source plugin" ON)
option(BUILD_BROWSER_SOURCE "Build the browser Resolume source plugin" ON)

if(NOT FFGL_SDK_ROOT OR NOT EXISTS "${FFGL_SDK_ROOT}/source/lib/ffgl/FFGL.h")
  message(FATAL_ERROR "Set FFGL_SDK_ROOT to the official Resolume FFGL SDK checkout.")
endif()

set(FFGL_LIB_DIR "${FFGL_SDK_ROOT}/source/lib")
set(FFGL_CORE_DIR "${FFGL_LIB_DIR}/ffgl")
set(FFGLEX_DIR "${FFGL_LIB_DIR}/ffglex")

file(GLOB FFGL_CORE_SOURCES CONFIGURE_DEPENDS
  "${FFGL_CORE_DIR}/*.cpp"
  "${FFGLEX_DIR}/*.cpp"
)

function(configure_ffgl_source target_name)
  target_include_directories(${target_name} PRIVATE
    "${FFGL_CORE_DIR}"
    "${FFGLEX_DIR}"
    "${CMAKE_CURRENT_SOURCE_DIR}/src"
  )

  target_compile_definitions(${target_name} PRIVATE
    WIN32_LEAN_AND_MEAN
    NOMINMAX
    _CRT_SECURE_NO_WARNINGS
  )

  target_link_libraries(${target_name} PRIVATE
    opengl32
    user32
    gdi32
  )

  set_target_properties(${target_name} PROPERTIES SUFFIX ".dll")
endfunction()

if(BUILD_RUNNING_TEXT_SOURCE)
  add_library(ResolumeRunningTextSource MODULE
    src/FFGLRunningTextSource.cpp
    ${FFGL_CORE_SOURCES}
  )

  configure_ffgl_source(ResolumeRunningTextSource)
  set_target_properties(ResolumeRunningTextSource PROPERTIES OUTPUT_NAME "ResolumeRunningTextSource")
endif()

if(BUILD_BROWSER_SOURCE)
  if(NOT CEF_ROOT OR NOT EXISTS "${CEF_ROOT}/include/cef_app.h")
    message(FATAL_ERROR "BUILD_BROWSER_SOURCE is ON, but CEF_ROOT does not point to a valid CEF distribution.")
  endif()

  add_library(ResolumeBrowserSource MODULE
    src/FFGLBrowserSource.cpp
    src/CefBrowserSource.cpp
    ${FFGL_CORE_SOURCES}
  )

  configure_ffgl_source(ResolumeBrowserSource)
  target_include_directories(ResolumeBrowserSource PRIVATE
    "${CEF_ROOT}"
    "${CEF_ROOT}/include"
  )
  target_link_directories(ResolumeBrowserSource PRIVATE
    "${CEF_ROOT}/Release"
  )
  target_link_libraries(ResolumeBrowserSource PRIVATE
    libcef
    shell32
    shlwapi
  )
  set_target_properties(ResolumeBrowserSource PROPERTIES OUTPUT_NAME "ResolumeBrowserSource")

  add_executable(ResolumeBrowserSourceSubprocess
    browser-subprocess/main.cpp
  )

  target_include_directories(ResolumeBrowserSourceSubprocess PRIVATE
    "${CEF_ROOT}"
    "${CEF_ROOT}/include"
  )
  target_link_directories(ResolumeBrowserSourceSubprocess PRIVATE
    "${CEF_ROOT}/Release"
  )
  target_link_libraries(ResolumeBrowserSourceSubprocess PRIVATE
    libcef
    user32
  )
  target_compile_definitions(ResolumeBrowserSourceSubprocess PRIVATE
    WIN32_LEAN_AND_MEAN
    NOMINMAX
  )
  set_target_properties(ResolumeBrowserSourceSubprocess PROPERTIES
    OUTPUT_NAME "ResolumeBrowserSourceSubprocess"
  )
endif()
