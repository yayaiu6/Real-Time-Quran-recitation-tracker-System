import 'dart:async';
import 'dart:typed_data';
import 'package:quran_tarteel/quran_tarteel.dart' as rq;

/// AppAudioProcessor
///
/// Delivers 16kHz Float32 PCM chunks to the TajweedFormer V4 ASR engine.
/// Directly delegates to [rq.AudioProcessor] from the quran_tarteel package
/// with zero modifications, raw unadulterated audio, and standard recording profiles.
class AppAudioProcessor {
  final rq.AudioProcessor _soloAudio = rq.AudioProcessor();

  Future<bool> hasPermission() async {
    return _soloAudio.hasPermission();
  }

  Future<void> start({
    required void Function(Float32List chunk, bool isFinal) onChunk,
  }) async {
    await _soloAudio.start(onChunk: onChunk);
  }

  void clearBuffer() {
    _soloAudio.clearBuffer();
  }

  Future<void> stop() async {
    try {
      await _soloAudio.stop();
    } catch (_) {}
  }

  Future<void> dispose() async {
    await stop();
  }
}
