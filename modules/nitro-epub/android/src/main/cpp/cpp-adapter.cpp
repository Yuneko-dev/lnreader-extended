#include <jni.h>
#include <fbjni/fbjni.h>
#include "NitroEpubOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::nitroepub::registerAllNatives();
  });
}
