# Flutter wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# Ignore Flutter's missing Play Core warnings
-dontwarn com.google.android.play.core.**

# Keep Flutter Embedding classes safe
-keep class io.flutter.embedding.** { *; }

# CRITICAL: Keep Sherpa-ONNX C++ JNI bindings safe from being deleted by R8
-keep class com.k2fsa.sherpa.** { *; }
