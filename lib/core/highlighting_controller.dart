import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:quran_tarteel/quran_tarteel.dart' as rq;
export 'package:quran_tarteel/quran_tarteel.dart';

import 'app_state.dart';
import '../ui/widgets/dialogs/dialog_service.dart';

/// Recitation source.
enum RecitationSource {
  none,
  localAsr,
}

// ─────────────────────────────────────────────────────────────────────────────
// Quran Coordinate Packing & Arithmetic
// ─────────────────────────────────────────────────────────────────────────────

/// Centralized Quran Coordinate Arithmetic & Packing.
/// Replaces ad-hoc bit shifting and frees Mushaf and UI layers from importing networking controllers.
abstract final class QuranCoordinate {
  /// Packs (surah, ayah, word0) into a single compact 32-bit integer:
  /// ((surah & 0xFF) << 20) | ((ayah & 0xFFF) << 8) | (word0 & 0xFF)
  static int packWordKey(int surah, int ayah, int word0) =>
      ((surah & 0xFF) << 20) | ((ayah & 0xFFF) << 8) | (word0 & 0xFF);

  /// Unpacks a 32-bit packed word key into (surah, ayah, word0).
  static (int surah, int ayah, int word0) unpackWordKey(int key) => (
        (key >> 20) & 0xFF,
        (key >> 8) & 0xFFF,
        key & 0xFF,
      );

  /// Packs (surah, ayah) into a 32-bit integer: (surah << 16) | (ayah & 0xFFFF)
  static int packAyahKey(int surah, int ayah) =>
      ((surah & 0xFFFF) << 16) | (ayah & 0xFFFF);

  /// Unpacks a 32-bit packed ayah key into (surah, ayah).
  static (int surah, int ayah) unpackAyahKey(int key) => (
        (key >> 16) & 0xFFFF,
        key & 0xFFFF,
      );
}

/// HighlightStore
///
/// High-performance flat O(1) bit-packed key store for Quran word highlight states
/// (1: Green, 2: Yellow, 3: Red, 4: Neutral) and Tajweed recitation errors.
/// Serves as the single source of truth for Local ASR.
class HighlightStore {
  // Key: QuranCoordinate.packWordKey(surah, ayah, word0) -> status (1..4)
  final Map<int, int> _states = {};

  // Key: QuranCoordinate.packWordKey(surah, ayah, word0) -> errors
  final Map<int, List<rq.ReciterError>> _errors = {};

  // Completed ayahs per surah: surah -> Set of ayah numbers (1-based)
  final Map<int, Set<int>> _completedAyahs = {};

  // Fast count of highlights per (surah, ayah)
  final Map<int, int> _ayahHighlightCounts = {};

  // ── Writes ──

  void setWordStatus(
    int surah,
    int ayah,
    int wordIndex,
    int status, [
    List<rq.ReciterError>? errors,
  ]) {
    final key = QuranCoordinate.packWordKey(surah, ayah, wordIndex);
    final ayahKey = QuranCoordinate.packAyahKey(surah, ayah);
    final prev = _states[key];
    if (prev == null || prev == 0) {
      _ayahHighlightCounts[ayahKey] = (_ayahHighlightCounts[ayahKey] ?? 0) + 1;
    }
    _states[key] = status;
    if (errors != null && errors.isNotEmpty && status == 2) {
      _errors[key] = errors;
    } else if (status != 2 || prev != 2) {
      _errors.remove(key);
    }
    // Re-asserting yellow without new error detail (e.g. a cumulative
    // snapshot merge) keeps the stored detail: absent evidence never erases
    // existing evidence. Detail only clears when the verdict itself changes.
  }

  void markGreen(int surah, int ayah, int wordIndex) =>
      setWordStatus(surah, ayah, wordIndex, 1);

  void markYellow(
    int surah,
    int ayah,
    int wordIndex, [
    List<rq.ReciterError>? errors,
  ]) =>
      setWordStatus(surah, ayah, wordIndex, 2, errors);

  void markRed(int surah, int ayah, int wordIndex) =>
      setWordStatus(surah, ayah, wordIndex, 3);

  void markNeutral(int surah, int ayah, int wordIndex) =>
      setWordStatus(surah, ayah, wordIndex, 4);

  void markAyahCompleted(int surah, int ayah) {
    (_completedAyahs[surah] ??= {}).add(ayah);
  }

  // ── Reads ──

  int getWordStatus(int surah, int ayah, int wordIndex) =>
      _states[QuranCoordinate.packWordKey(surah, ayah, wordIndex)] ?? 0;

  bool isGreen(int surah, int ayah, int wordIndex) =>
      getWordStatus(surah, ayah, wordIndex) == 1;

  bool isYellow(int surah, int ayah, int wordIndex) =>
      getWordStatus(surah, ayah, wordIndex) == 2;

  bool isRed(int surah, int ayah, int wordIndex) =>
      getWordStatus(surah, ayah, wordIndex) == 3;

  bool isNeutral(int surah, int ayah, int wordIndex) =>
      getWordStatus(surah, ayah, wordIndex) == 4;

  bool isRead(int surah, int ayah, int wordIndex) =>
      getWordStatus(surah, ayah, wordIndex) > 0;

  List<rq.ReciterError>? errorsFor(int surah, int ayah, int wordIndex) {
    if (!isYellow(surah, ayah, wordIndex)) return null;
    return _errors[QuranCoordinate.packWordKey(surah, ayah, wordIndex)];
  }

  Set<int> completedAyahsFor(int surah) =>
      _completedAyahs[surah] ?? const <int>{};

  /// High-speed O(1) check if a specific ayah has any stored highlights.
  bool hasAyahHighlights(int surah, int ayah) =>
      (_ayahHighlightCounts[QuranCoordinate.packAyahKey(surah, ayah)] ?? 0) > 0;

  bool get hasHighlights => _states.isNotEmpty;

  /// Builds radix-16 snapshot map for network synchronization.
  Map<String, int> buildSnapshotMap() {
    final map = <String, int>{};
    for (final e in _states.entries) {
      map[e.key.toRadixString(16)] = e.value;
    }
    return map;
  }

  // ── Clearing ──

  void clearAll() {
    _states.clear();
    _errors.clear();
    _completedAyahs.clear();
    _ayahHighlightCounts.clear();
  }

  void clearSurah(int surah) {
    _states.removeWhere(
        (key, _) => QuranCoordinate.unpackWordKey(key).$1 == surah);
    _errors.removeWhere(
        (key, _) => QuranCoordinate.unpackWordKey(key).$1 == surah);
    _completedAyahs.remove(surah);
    _ayahHighlightCounts.removeWhere(
        (key, _) => QuranCoordinate.unpackAyahKey(key).$1 == surah);
  }

  void clearAllExceptSurah(int keepSurah) {
    _states.removeWhere(
        (key, _) => QuranCoordinate.unpackWordKey(key).$1 != keepSurah);
    _errors.removeWhere(
        (key, _) => QuranCoordinate.unpackWordKey(key).$1 != keepSurah);
    _completedAyahs.removeWhere((s, _) => s != keepSurah);
    _ayahHighlightCounts.removeWhere(
        (key, _) => QuranCoordinate.unpackAyahKey(key).$1 != keepSurah);
  }

  void clearSurahFromAyah(int surah, int startAyah) {
    _completedAyahs[surah]?.removeWhere((ayah) => ayah >= startAyah);
    _completedAyahs.removeWhere((s, _) => s > surah);
    _states.removeWhere((key, _) {
      final (s, a, _) = QuranCoordinate.unpackWordKey(key);
      return s > surah || (s == surah && a >= startAyah);
    });
    _errors.removeWhere((key, _) {
      final (s, a, _) = QuranCoordinate.unpackWordKey(key);
      return s > surah || (s == surah && a >= startAyah);
    });
    _ayahHighlightCounts.removeWhere((key, _) {
      final (s, a) = QuranCoordinate.unpackAyahKey(key);
      return s > surah || (s == surah && a >= startAyah);
    });
  }
}

/// HighlightingController
///
/// Decoupled, single-source-of-truth recitation controller.
/// Extends [rq.HighlightingController] to serve local ASR dictation
/// tracking through a unified API.
///
/// Presentation layers (Mushaf, VerseList, dialogs, overlays) observe this single
/// controller. They never need separate branches or conditional code per mode.
class HighlightingController extends ChangeNotifier {
  final rq.QuranRepository repository;
  final rq.ReciteEngine _engine;
  final rq.QuranScorer _scorer;
  final VoidCallback? onAyahChanged;
  bool isTajweed;
  rq.TrackerConfig config;

  final HighlightStore _store = HighlightStore();

  final ValueNotifier<int?> activeAyah = ValueNotifier(null);
  final ValueNotifier<int> globalRevision = ValueNotifier(0);
  final ValueNotifier<String> debugRecognizedText = ValueNotifier('');

  HighlightingController get tracker => this;
  rq.TrackerState get state => rq.TrackerState.tracking;
  rq.ReciteEngine get engine => _engine;
  rq.QuranScorer get scorer => _scorer;

  Stream<rq.WordMatchedEvent> get onWordEvaluated => _scorer.onWordEvaluated;

  // Manual selection state
  int _manualTargetSurah = 0;

  // ── One-Time Scoped (Page-Limited) Auto-Anchor ──
  late final rq.ScopedAutoAnchor _pageAnchor =
      rq.ScopedAutoAnchor(repository: repository);

  /// Whether the controller is actively waiting for initial recitation to anchor.
  bool get isPageReanchorWaiting => _pageAnchor.isArmed;

  /// Cancels any pending auto-reanchor waiting state.
  void cancelPageAutoReanchor() {
    if (_pageAnchor.isArmed) {
      _pageAnchor.disarm();
      globalRevision.value++;
      notifyListeners();
    }
  }

  /// Updates the target page or ayah boundaries for auto-reanchor while waiting.
  void updatePageReanchorTarget({
    int? pageNumber,
    List<(int surah, int ayah)>? pageAyahs,
  }) {
    if (!_pageAnchor.isArmed) return;
    if (pageAyahs != null && pageAyahs.isNotEmpty) {
      _pageAnchor.arm(pageNumber: pageNumber, ayahs: pageAyahs);
    }
  }

  void _executePageAnchor(rq.AutoReanchorEvent event) {
    if (targetSurah != event.surah) {
      _manualTargetSurah = event.surah;
      _scorer.setTargetSurah(
        event.surah,
        startGlobalWord: event.newWordIndex,
        forceClear: true,
      );
    } else {
      _scorer.jumpToWord(event.newWordIndex);
    }

    activeAyah.value = event.ayah;
    onAyahChanged?.call();
    onAutoSavePosition?.call(event.surah, event.ayah);
    AppState.instance.saveLastPosition(event.surah, event.ayah);

    // Clear highlights forward from this newly anchored ayah
    clearHighlightsForwardFrom(event.surah, event.ayah);

    _onEngineAutoReanchored(event);

    _scorer.resetBuffer();
    globalRevision.value++;
    notifyListeners();
  }

  // ── Retarget window ──
  //
  // A cross-surah merge (setTargetSurah / setManualAyah retargeting the
  // engine) makes the package write transient coordinates through the shared
  // activeAyah notifier: first a null wipe, then reset() hard-codes ayah 1
  // and notifies mid-merge. Those writes are merge noise, not coordinate
  // truth — a view that follows the coordinate would chase them (flip to the
  // surah's first page, then flip back). [isCoordinateSettled] reports the
  // window; the merge's final write re-broadcasts the settled coordinate,
  // which is what the view follows.
  bool _isRetargeting = false;
  bool get isCoordinateSettled => !_isRetargeting;

  void _beginRetarget() => _isRetargeting = true;

  void _endRetarget() {
    if (!_isRetargeting) return;
    _isRetargeting = false;
    // The coordinate may have been re-pointed during the window (rapid
    // re-selection wins over the stale merge). Re-broadcast once so the view
    // re-follows whatever coordinate is settled now.
    notifyListeners();
  }

  StreamSubscription? _engineTranscriptionSub;
  StreamSubscription<rq.WordMatchedEvent>? _wordEvaluatedSub;
  StreamSubscription<rq.AutoReanchorEvent>? _autoReanchorSub;

  late final Future<void> initFuture;

  HighlightingController({
    required this.repository,
    required rq.ReciteEngine engine,
    this.onAyahChanged,
    this.isTajweed = true,
    this.config = const rq.TrackerConfig(),
  })  : _engine = engine,
        _scorer = rq.QuranScorer(
          repository: repository,
          config: config,
          isTajweed: isTajweed,
        ) {
    initFuture = _initScorerAndStreams();
  }

  Future<void> _initScorerAndStreams() async {
    await _scorer.initialize();
    _wordEvaluatedSub = _scorer.onWordEvaluated.listen(_onEngineWordEvaluated);
    _autoReanchorSub = _scorer.onAutoReanchored.listen(_onEngineAutoReanchored);
    _engineTranscriptionSub = _engine.transcriptionStream.listen((result) {
      // A final result is the flushed tail of the take that was just reset;
      // its epoch is necessarily the one before the reset, so accept it.
      if (!result.isFinal && result.streamEpoch != _engine.currentStreamEpoch) {
        return;
      }
      if (result.text.isNotEmpty) {
        debugRecognizedText.value = result.text;
      }

      // [ONE-TIME PAGE-LIMITED AUTO-REANCHOR]
      if (_pageAnchor.isArmed) {
        final event = _pageAnchor.probe(
          result.text,
          isFinal: result.isFinal,
          activeAyahHint: activeAyah.value,
        );
        if (event == null) {
          return; // Still waiting for user's recitation to anchor on page
        }
        _pageAnchor.disarm();
        _executePageAnchor(event);
      }

      _scorer.feedTranscript(result);
    });
  }

  /// Feeds raw PCM audio chunk into the engine.
  void feed(Float32List audioChunk, {bool isFinal = false}) {
    _engine.transcribe(audioChunk, isFinal: isFinal);
  }

  void reset() {
    _pageAnchor.disarm();
    _engine.resetBuffer();
    _scorer.resetBuffer();
    debugRecognizedText.value = '';
    onAyahChanged?.call();
    globalRevision.value++;
    notifyListeners();
  }

  void finalize({bool resetEngine = true}) {
    _pageAnchor.disarm();
    if (resetEngine) {
      _engine.resetBuffer();
    }
    _scorer.resetBuffer();
    debugRecognizedText.value = '';
    globalRevision.value++;
    notifyListeners();
  }

  void resumeTracking() {
    final int targetAyah = activeAyah.value ?? 1;
    clearHighlightsFromAyah(targetAyah);
    final int s = targetSurah != 0 ? targetSurah : 1;
    final int startGlobalWord =
        repository.getAyahStartGlobalIndex(s, targetAyah);
    _scorer.jumpToWord(startGlobalWord);
    _engine.resetBuffer();
    _scorer.resetBuffer();
    debugRecognizedText.value = '';
    globalRevision.value++;
    notifyListeners();
  }

  void startRecordingSession({
    int? pageNumber,
    List<(int surah, int ayah)>? pageAyahs,
  }) {
    if (pageAyahs != null && pageAyahs.isNotEmpty) {
      _pageAnchor.arm(pageNumber: pageNumber, ayahs: pageAyahs);
    } else {
      _pageAnchor.disarm();
      resumeTracking();
      return;
    }

    _engine.resetBuffer();
    _scorer.resetBuffer();
    debugRecognizedText.value = '';
    globalRevision.value++;
    notifyListeners();
  }

  void updateConfig(rq.TrackerConfig newConfig) {
    config = newConfig;
    _scorer.updateConfig(newConfig);
  }

  /// Current active Tajweed check toggles.
  rq.TajweedConfig get tajweedConfig => _scorer.tajweedConfig;

  /// Dynamically updates Tajweed check toggles (Madd, Tashkeel, Ghunnah, Shaddah, Qalqalah, Letter swap).
  void updateTajweedConfig(rq.TajweedConfig newTajweedConfig) {
    _scorer.updateTajweedConfig(newTajweedConfig);
    globalRevision.value++;
    notifyListeners();
  }

  void setTajweedMode(bool active) {
    final effective = repository.isTajweedSupported && active;
    if (isTajweed == effective) return;
    isTajweed = effective;
    _scorer.setTajweedMode(effective);
    globalRevision.value++;
    notifyListeners();
  }

  void unloadEngine() {
    _engine.destroy();
    _scorer.dispose();
    notifyListeners();
  }

  Future<void> reloadEngine() async {
    await _engine.initialize();
    await _scorer.initialize();
    notifyListeners();
  }

  @override
  void dispose() {
    _wordEvaluatedSub?.cancel();
    _wordEvaluatedSub = null;
    _autoReanchorSub?.cancel();
    _autoReanchorSub = null;
    _engineTranscriptionSub?.cancel();
    _engineTranscriptionSub = null;
    _scorer.dispose();
    super.dispose();
  }

  // ── Package → Controller Event Stream Handlers ──

  /// Reactive ingestion of automatic re-anchoring when the reciter skips ahead or jumps verses.
  void _onEngineAutoReanchored(rq.AutoReanchorEvent event) {
    if (_isRetargeting) return;
    final int surah = event.surah > 0 ? event.surah : targetSurah;
    final int ayah = event.ayah;
    if (surah == 0 || ayah == 0) return;

    if (activeAyah.value != ayah || targetSurah != surah) {
      if (targetSurah != surah) {
        _manualTargetSurah = surah;
      }
      activeAyah.value = ayah;
      onAyahChanged?.call();
      onAutoSavePosition?.call(surah, ayah);
      AppState.instance.saveLastPosition(surah, ayah);
      globalRevision.value++;
      notifyListeners();
    }
  }

  /// Pure reactive ingestion of word evaluations directly from the engine isolate.
  void _onEngineWordEvaluated(rq.WordMatchedEvent event) {
    if (_isRetargeting) return;
    final int surah = event.surah > 0 ? event.surah : targetSurah;
    final int ayah = event.ayah;
    final int w0 = event.wordInAyah;
    if (surah == 0 || ayah == 0) return;

    if (_manualTargetSurah != surah) {
      _manualTargetSurah = surah;
    }

    switch (event.verdict) {
      case rq.WordEvaluationVerdict.correct:
        _store.markGreen(surah, ayah, w0);
        break;
      case rq.WordEvaluationVerdict.tajweedWarning:
        _store.markYellow(surah, ayah, w0, event.tajweedErrors);
        break;
      case rq.WordEvaluationVerdict.mispronounced:
        _store.markRed(surah, ayah, w0);
        break;
      case rq.WordEvaluationVerdict.skipped:
        _store.markRed(surah, ayah, w0);
        break;
    }

    // Pure UI / App level Ayah completion evaluation
    final int totalWordsInAyah = repository.getAyahWordCount(surah, ayah);
    final bool isLastWordOfAyah =
        totalWordsInAyah > 0 && w0 == totalWordsInAyah - 1;

    if (isLastWordOfAyah) {
      _store.markAyahCompleted(surah, ayah);
      final totalAyahs = QuranMetadata.getAyahCount(surah);
      if (ayah < totalAyahs) {
        final nextAyah = ayah + 1;
        if (activeAyah.value != nextAyah) {
          activeAyah.value = nextAyah;
          onAyahChanged?.call();
          onAutoSavePosition?.call(surah, nextAyah);
          AppState.instance.saveLastPosition(surah, nextAyah);
        }
      } else if (ayah == totalAyahs) {
        unawaited(advanceToNextSurah(isRecording: true));
      }
    } else {
      if (activeAyah.value != ayah) {
        activeAyah.value = ayah;
        onAyahChanged?.call();
        onAutoSavePosition?.call(surah, ayah);
        AppState.instance.saveLastPosition(surah, ayah);
      }
    }

    notifyListeners();
  }

  /// The active source driving highlighting/progress.
  RecitationSource get activeSource {
    if (activeAyah.value != null) {
      return RecitationSource.localAsr;
    }
    return RecitationSource.none;
  }

  /// The active coordinate (surah, ayah) driving recitation.
  ///
  /// Pure controller truth: the mirrored coordinate, nothing else.
  (int surah, int ayah)? get activeAyahCoordinate {
    if (activeAyah.value != null && targetSurah != 0) {
      return (targetSurah, activeAyah.value!);
    }
    return null;
  }

  /// Direct access to the highlight store.
  HighlightStore get highlightStore => _store;

  int get targetSurah {
    // Single coordinate: every source (manual selection, ASR)
    // mirrors into _manualTargetSurah at its merge point, so there is nothing to disambiguate here.
    if (_manualTargetSurah != 0) {
      return _manualTargetSurah;
    }
    return _scorer.targetSurah != 0 ? _scorer.targetSurah : 1;
  }

  /// Optional hook for reactive reading position persistence without circular state imports.
  static void Function(int surah, int ayah)? onAutoSavePosition;

  Future<void> setTargetSurah(
    int surah, {
    bool preserveOtherSurahStates = false,
    bool clearTargetSurah = true,
  }) async {
    await initFuture;
    _manualTargetSurah = surah;
    if (!preserveOtherSurahStates) {
      _store.clearAllExceptSurah(surah);
    }
    if (clearTargetSurah) {
      _store.clearSurah(surah);
    }
    // Merge window: the package writes transient coordinates mid-merge;
    // views must not follow until the merge's final write lands.
    _beginRetarget();
    try {
      _scorer.setTargetSurah(
        surah,
        forceClear: clearTargetSurah,
      );
    } finally {
      _endRetarget();
    }
    globalRevision.value++;
    notifyListeners();
  }

  static final Map<int, ({int ayah, int lastWordIndex})>
      _surahLastWordCache = {};

  /// Checks whether all words in [surah] have been completed or read.
  bool isSurahFinished(int surah) {
    if (!QuranMetadata.isValidSurah(surah)) return false;
    final lastWord = _surahLastWordCache.putIfAbsent(surah, () {
      final totalAyahs = QuranMetadata.getAyahCount(surah);
      if (totalAyahs <= 0) return (ayah: -1, lastWordIndex: -1);
      final totalWords = repository.getAyahWordCount(surah, totalAyahs);
      if (totalWords <= 0) {
        return (ayah: totalAyahs, lastWordIndex: 0);
      }
      return (
        ayah: totalAyahs,
        lastWordIndex: totalWords - 1,
      );
    });
    if (lastWord.ayah < 0) return false;
    return completedAyahsFor(surah).contains(lastWord.ayah) ||
        isWordRead(lastWord.ayah, lastWord.lastWordIndex, surah: surah);
  }

  /// Hook called when a continuous recitation boundary transitions to the next Surah.
  void Function(int nextSurah, int nextAyah)? onSurahAutoAdvanced;

  /// Advances to next Surah in sequence, preserving previous Surah highlights for continuous reading.
  Future<bool> advanceToNextSurah(
      {int? nextSurah, bool isRecording = false}) async {
    final int next = nextSurah ?? (targetSurah + 1);
    if (!QuranMetadata.isValidSurah(next)) return false;

    await setTargetSurah(
      next,
      preserveOtherSurahStates: true,
      clearTargetSurah: false,
    );
    setManualAyah(next, 1);
    if (isRecording) {
      startRecordingSession();
    }
    onSurahAutoAdvanced?.call(next, 1);
    return true;
  }

  /// Extracts word classification lists (green, yellow, red, wordErrors) for an ayah.
  /// Used for evaluation snapshots and progress summaries.
  ({
    List<int> greenWords,
    List<int> yellowWords,
    List<int> redWords,
    Map<int, List<rq.ReciterError>>? wordErrors,
  }) extractAyahWordClassification(int surah, int ayah, int wordCount) {
    final greenWords = <int>[];
    final yellowWords = <int>[];
    final redWords = <int>[];
    Map<int, List<rq.ReciterError>>? wordErrors;
    for (int w0 = 0; w0 < wordCount; w0++) {
      final st = _store.getWordStatus(surah, ayah, w0);
      if (st == 1) {
        greenWords.add(w0);
      } else if (st == 2) {
        yellowWords.add(w0);
        final errs = _store.errorsFor(surah, ayah, w0);
        if (errs != null && errs.isNotEmpty) {
          (wordErrors ??= {})[w0] = errs;
        }
      } else if (st == 3) {
        redWords.add(w0);
      }
    }

    return (
      greenWords: greenWords,
      yellowWords: yellowWords,
      redWords: redWords,
      wordErrors: wordErrors,
    );
  }

  void setManualAyah(int surah, int ayah) {
    _pageAnchor.disarm();
    // Local fields are the authoritative coordinate for every reader from
    // this moment on.
    _manualTargetSurah = surah;
    activeAyah.value = ayah;
    onAutoSavePosition?.call(surah, ayah);
    AppState.instance.saveLastPosition(surah, ayah);

    if (targetSurah == surah) {
      _applyManualAyahToScorer(surah, ayah);
    } else {
      // The engine needs its target surah loaded before it can accept the
      // ayah. Only apply if this selection is still the newest event — a
      // rapid re-selection must never let a stale engine write land.
      // Merge window open until the merge's final write lands (or a newer
      // selection replaces it): the view must not follow the package's
      // transient coordinate writes in between.
      _beginRetarget();
      setTargetSurah(
        surah,
        preserveOtherSurahStates: true,
        clearTargetSurah: false,
      )
          .then((_) {
            if (_manualTargetSurah == surah) {
              _applyManualAyahToScorer(surah, ayah);
            }
          })
          .catchError((_) {})
          .whenComplete(_endRetarget);
    }

    globalRevision.value++;
    notifyListeners();
  }

  void _applyManualAyahToScorer(int surah, int ayah) {
    _scorer.setTargetAyah(surah, ayah);
    _engine.resetBuffer();
    _scorer.resetBuffer();
    debugRecognizedText.value = '';
    onAyahChanged?.call();
  }

  rq.VerseMatch? get currentMatchedVerse {
    // The mirrored coordinate IS the matched verse for every source (manual
    // selection, ASR anchor). Pure coordinate
    // read - no fallback into the package.
    if (_manualTargetSurah != 0 && activeAyah.value != null) {
      final v = repository.getVerse(_manualTargetSurah, activeAyah.value!);
      if (v != null) {
        return rq.VerseMatch(verse: v, score: 1.0);
      }
    }
    return null;
  }

  // ── Word Status Queries (pure store reads) ──
  //
  // The package's verdicts arrive reactively through onWordEvaluated and live in the
  // store from then on. Every query below — the paint path
  // included — is a single O(1) lookup. No source is ever consulted at read
  // time: package → controller → view, one direction.

  bool isWordGreen(int ayah, int wordIndex, {int? surah}) =>
      _store.isGreen(surah ?? targetSurah, ayah, wordIndex);

  bool isWordYellow(int ayah, int wordIndex, {int? surah}) =>
      _store.isYellow(surah ?? targetSurah, ayah, wordIndex);

  bool isWordRed(int ayah, int wordIndex, {int? surah}) =>
      _store.isRed(surah ?? targetSurah, ayah, wordIndex);

  bool isWordNeutral(int ayah, int wordIndex, {int? surah}) =>
      _store.isNeutral(surah ?? targetSurah, ayah, wordIndex);

  /// Whether the word carries any recitation state (green/yellow/red/neutral).
  bool isWordRead(int ayah, int wordIndex, {int? surah}) =>
      _store.isRead(surah ?? targetSurah, ayah, wordIndex);

  /// Numeric status representation for high-speed rendering:
  /// 1: Green (Correct)
  /// 2: Yellow (Tajweed Rule / Warning)
  /// 3: Red (Mispronounced)
  /// 4: Neutral (Spoken/Passed)
  /// null: Unread
  int? getWordStatus(int ayah, int wordIndex, {int? surah}) {
    final st = _store.getWordStatus(surah ?? targetSurah, ayah, wordIndex);
    return st > 0 ? st : null;
  }

  List<rq.ReciterError>? getWordErrors(int ayah, int wordIndex, {int? surah}) {
    final s = surah ?? targetSurah;
    final list = _store.errorsFor(s, ayah, wordIndex);
    if (list == null || list.isEmpty) return null;
    return list.map((e) => _hydrateError(s, ayah, wordIndex, e)).toList();
  }

  Set<int> completedAyahsFor(int surah) => _store.completedAyahsFor(surah);

  /// Completed ayahs for the currently targeted surah.
  Set<int> get completedAyahs => _store.completedAyahsFor(targetSurah);

  /// O(1) check: the store's per-ayah highlight count. All verdicts are
  /// saved at their ingestion point, so there is nothing to scan.
  bool hasAyahHighlights(int surah, int ayah) =>
      _store.hasAyahHighlights(surah, ayah);

  /// Hydrates a lightweight [rq.ReciterError] into a complete model with
  /// canonical Tajweed rule metadata and guidance derived locally from [repository].
  rq.ReciterError _hydrateError(
    int surah,
    int ayah,
    int wordIndex,
    rq.ReciterError e,
  ) {
    if (e.expectedRule != null && e.durationStatus != null) return e;

    rq.TajweedRule? rule = e.expectedRule;
    rq.TajweedDurationStatus? durStatus = e.durationStatus;

    if (e.errorType == rq.ErrorCategory.tajweed) {
      if (rule == null) {
        final verse = repository.getVerse(surah, ayah);
        if (verse != null &&
            wordIndex >= 0 &&
            wordIndex < verse.wordRules.length) {
          final rules = verse.wordRules[wordIndex];
          if (rules.isNotEmpty) {
            final rq.WordTajweedRule matchedRule = rules.firstWhere(
              (r) => r.goldenLen == e.expectedPh.length,
              orElse: () => rules.first,
            );
            rule = instantiateTajweedRule(matchedRule, config);
          }
        }
      }

      if (durStatus == null) {
        if (rule != null && e.actualDuration != null) {
          durStatus = rule.checkDurationStatus(
              e.actualDuration!, config.recitationSpeed);
        } else if (e.expectedPh.length > e.predictedPh.length ||
            e.predictedPh.isEmpty) {
          durStatus = rq.TajweedDurationStatus.underheld;
        } else if (e.predictedPh.length > e.expectedPh.length) {
          durStatus = rq.TajweedDurationStatus.overheld;
        } else {
          durStatus = rq.TajweedDurationStatus.underheld;
        }
      }
    }

    return rq.ReciterError(
      errorType: e.errorType,
      speechErrorType: e.speechErrorType,
      durationStatus: durStatus,
      expectedPh: e.expectedPh,
      predictedPh: e.predictedPh,
      expectedRule: rule,
    );
  }

  /// Instantiates a canonical [rq.TajweedRule] from a dataset [rq.WordTajweedRule]
  /// matching the exact rule mapping used inside the `quran_tajweedformer` engine.
  static rq.TajweedRule instantiateTajweedRule(
    rq.WordTajweedRule wRule, [
    rq.TrackerConfig config = const rq.TrackerConfig(),
  ]) =>
      rq.TajweedRuleFactory.instantiate(wRule, config);

  // ── Clearing & Synchronization ──

  void clearHighlightsFromAyah(int startAyah, {int? surah}) {
    final s = surah ?? targetSurah;
    _store.clearSurahFromAyah(s, startAyah);
    globalRevision.value++;
    notifyListeners();
  }

  void clearHighlightsForSurah(int surah) {
    _store.clearSurah(surah);
    globalRevision.value++;
    notifyListeners();
  }

  /// Clears highlights from [startAyah] onwards in [surah], and clears all highlights
  /// in subsequent Surahs ([surah] + 1 .. 114). Prior verses and Surahs are strictly preserved.
  void clearHighlightsForwardFrom(int surah, int startAyah) {
    clearHighlightsFromAyah(startAyah, surah: surah);
    for (int s = surah + 1; s <= QuranMetadata.maxSurah; s++) {
      clearHighlightsForSurah(s);
    }
  }

  // ── Quran Presentation Queries ──

  /// Returns the 0-based lead ("waited") word index — the one word the
  /// reciter is about to say, rendered as the anticipatory cursor:
  /// - live local ASR while recording: the first not-yet-read word
  ///
  /// The lead word only exists inside the live coordinate; everything outside
  /// it renders from the store's green/red/yellow states alone.
  int? getLeadWordIndex({
    required int surah,
    required int ayah,
    required int totalWords,
    bool isRecording = false,
  }) {
    if (_pageAnchor.isArmed) {
      return null;
    }
    if (activeAyah.value != ayah ||
        (targetSurah != 0 && targetSurah != surah)) {
      return null;
    }
    if (isRecording) {
      for (int i = 0; i < totalWords; i++) {
        if (!isWordRead(ayah, i, surah: surah)) {
          return i;
        }
      }
    }
    return null;
  }

  /// Determines if an Ayah is actively selected, reciting, or playing audio.
  /// Pure coordinate check: every source mirrors into the coordinate, so
  /// there is nothing else to consult.
  bool isAyahActive(int surah, int ayah) =>
      activeAyah.value == ayah && targetSurah == surah;

  /// The single coordinate every recitation source currently drives.
  ///
  /// Audio progress is mirrored into
  /// [targetSurah]/[activeAyah] by its merge point — the same fields live
  /// local ASR writes — so any host that renders pages follows this one pair
  /// to stay in sync through ayahs, pages and surahs. Surah 0 means no
  /// coordinate exists yet (fresh app, nothing selected or recited).
  (int surah, int? ayah) get recitationCoordinate {
    if (targetSurah != 0) return (targetSurah, activeAyah.value);
    return (AppState.instance.lastSurah, activeAyah.value);
  }

  void clearHighlights() {
    _store.clearAll();
    _manualTargetSurah = 0;
    globalRevision.value++;
    notifyListeners();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Quran Highlight Palette & Styling
// ─────────────────────────────────────────────────────────────────────────────

/// Unified Quran Highlight Palette.
/// Centralizes all recitation highlight and cursor shades, borders, and opacities
/// ensuring identical visual fidelity across Mushaf Vector Canvas and Verse List Row viewports.
class QuranHighlightPalette {
  final Color greenBand;
  final Color yellowBand;
  final Color redBand;
  final Color leadWordBand;
  final Color activeAyahBorder;
  final Color activeAyahBand;

  const QuranHighlightPalette({
    required this.greenBand,
    required this.yellowBand,
    required this.redBand,
    required this.leadWordBand,
    required this.activeAyahBorder,
    required this.activeAyahBand,
  });

  /// Derives consistent, serene highlight shades from the active app theme.
  ///
  /// Memoized: this is called from the paint path, which can run at animation
  /// frequency (e.g. the audio-buffering spinner ticks repaint the page). Colors
  /// are immutable values, so a change in theme always produces a changed value
  /// in the signature — only a real theme change allocates a new palette.
  factory QuranHighlightPalette.fromTheme({
    required ThemeColors colors,
    required bool isDark,
  }) {
    final sig = Object.hash(colors.green, colors.warning, colors.red,
        colors.wordHighlight, colors.gold, isDark);
    if (_memoSig == sig) return _memoPalette!;
    final palette = QuranHighlightPalette(
      greenBand: colors.green.withValues(alpha: isDark ? 0.18 : 0.14),
      yellowBand: colors.warning.withValues(
          alpha: isDark
              ? 0.18
              : 0.20), // 0.14→0.20: amber on warm linen at 14% was near-invisible
      redBand: colors.red.withValues(alpha: isDark ? 0.18 : 0.14),
      leadWordBand:
          colors.wordHighlight.withValues(alpha: isDark ? 0.20 : 0.18),
      activeAyahBorder: colors.gold.withValues(alpha: isDark ? 0.45 : 0.35),
      activeAyahBand: isDark
          ? colors.gold.withValues(alpha: 0.14)
          : colors.gold.withValues(alpha: 0.09),
    );
    _memoSig = sig;
    return _memoPalette = palette;
  }

  /// Identity of the theme the memoized palette was built from.
  static int? _memoSig;
  static QuranHighlightPalette? _memoPalette;

  /// Resolves the band color for a numeric word highlight state:
  /// 1: Green (Correct)
  /// 2: Yellow (Tajweed Warning)
  /// 3: Red (Mispronounced/Skipped)
  /// isLead: Active anticipatory cursor (Word N+1)
  Color bandForState(int state, {bool isLead = false}) {
    if (isLead) return leadWordBand;
    if (state == 1) return greenBand;
    if (state == 2) return yellowBand;
    if (state == 3) return redBand;
    return Colors.transparent;
  }
}

/// Contiguous word highlight span model.
/// Standardizes ribbon and pill grouping across both Mushaf Vector and Verse List views.
class WordHighlightSpan {
  final int state;
  final int startWord;
  final int endWord;
  final bool isLead;

  const WordHighlightSpan({
    required this.state,
    required this.startWord,
    required this.endWord,
    this.isLead = false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Quran Domain Metadata & Arithmetic (Consolidated from quran_metadata.dart)
// ─────────────────────────────────────────────────────────────────────────────

/// Canonical Quran Metadata & Navigation arithmetic.
abstract final class QuranMetadata {
  static const int minSurah = 1;
  static const int maxSurah = 114;
  static const int minPage = 1;
  static const int maxPage = 604;

  /// Checks if [surah] is in the valid 1..114 range.
  static bool isValidSurah(int surah) => surah >= minSurah && surah <= maxSurah;

  /// Checks if [page] is in the valid 1..604 Mushaf page range.
  static bool isValidPage(int page) => page >= minPage && page <= maxPage;

  /// Clamps [surah] to the valid 1..114 range.
  static int clampSurah(int surah) => surah.clamp(minSurah, maxSurah);

  /// Clamps [page] to the valid 1..604 range.
  static int clampPage(int page) => page.clamp(minPage, maxPage);

  /// Formats the canonical 3-digit QVP page asset filename (e.g. '001.qvp').
  static String formatPageKey(int page) =>
      '${page.toString().padLeft(3, '0')}.qvp';

  /// Canonical Ayah count for Surahs 1 to 114.
  static const List<int> surahAyahCounts = [
    7,
    286,
    200,
    176,
    120,
    165,
    206,
    75,
    129,
    109,
    123,
    111,
    43,
    52,
    99,
    128,
    111,
    110,
    98,
    135,
    112,
    78,
    118,
    64,
    77,
    227,
    93,
    88,
    69,
    60,
    34,
    30,
    73,
    54,
    45,
    83,
    182,
    88,
    75,
    85,
    54,
    53,
    89,
    59,
    37,
    35,
    38,
    29,
    18,
    45,
    60,
    49,
    62,
    55,
    78,
    96,
    29,
    22,
    24,
    13,
    14,
    11,
    11,
    18,
    12,
    12,
    30,
    52,
    52,
    44,
    28,
    28,
    20,
    56,
    40,
    31,
    50,
    40,
    46,
    42,
    29,
    19,
    36,
    25,
    22,
    17,
    19,
    26,
    30,
    20,
    15,
    21,
    11,
    8,
    8,
    19,
    5,
    8,
    8,
    11,
    11,
    8,
    3,
    9,
    5,
    4,
    7,
    3,
    6,
    3,
    5,
    4,
    5,
    6
  ];

  /// Returns total Ayahs for [surah], or 0 if out of range.
  static int getAyahCount(int surah) {
    if (surah >= 1 && surah <= 114) {
      return surahAyahCounts[surah - 1];
    }
    return 0;
  }

  /// Checks if [surah] and [ayah] constitute a valid Quranic coordinate.
  static bool isValidAyah(int surah, int ayah) {
    if (!isValidSurah(surah)) return false;
    final max = surahAyahCounts[surah - 1];
    return ayah >= 1 && ayah <= max;
  }

  /// Checks if [ayah] is the final Ayah in [surah].
  static bool isLastAyahInSurah(int surah, int ayah) {
    if (!isValidSurah(surah)) return false;
    return ayah == surahAyahCounts[surah - 1];
  }

  /// Computes the subsequent Ayah across Surah boundaries, or null if end of Quran.
  static (int surah, int ayah)? getNextAyah(int surah, int ayah) {
    if (!isValidSurah(surah)) return null;
    final max = surahAyahCounts[surah - 1];
    if (ayah < max) {
      return (surah, ayah + 1);
    } else if (surah < 114) {
      return (surah + 1, 1);
    }
    return null;
  }

  /// Computes the previous Ayah across Surah boundaries, or null if beginning of Quran.
  static (int surah, int ayah)? getPreviousAyah(int surah, int ayah) {
    if (!isValidSurah(surah)) return null;
    if (ayah > 1) {
      return (surah, ayah - 1);
    } else if (surah > 1) {
      final prevSurah = surah - 1;
      return (prevSurah, surahAyahCounts[prevSurah - 1]);
    }
    return null;
  }

  /// Canonical 114 Surah names in Arabic.
  static const List<String> surahNamesAr = [
    'الفاتحة',
    'البقرة',
    'آل عمران',
    'النساء',
    'المائدة',
    'الأنعام',
    'الأعراف',
    'الأنفال',
    'التوبة',
    'يونس',
    'هود',
    'يوسف',
    'الرعد',
    'إبراهيم',
    'الحجر',
    'النحل',
    'الإسراء',
    'الكهف',
    'مريم',
    'طه',
    'الأنبياء',
    'الحج',
    'المؤمنون',
    'النور',
    'الفرقان',
    'الشعراء',
    'النمل',
    'القصص',
    'العنكبوت',
    'الروم',
    'لقمان',
    'السجدة',
    'الأحزاب',
    'سبأ',
    'فاطر',
    'يس',
    'الصافات',
    'ص',
    'الزمر',
    'غافر',
    'فصلت',
    'الشورى',
    'الزخرف',
    'الدخان',
    'الجاثية',
    'الأحقاف',
    'محمد',
    'الفتح',
    'الحجرات',
    'ق',
    'الذاريات',
    'الطور',
    'النجم',
    'القمر',
    'الرحمن',
    'الواقعة',
    'الحديد',
    'المجادلة',
    'الحشر',
    'الممتحنة',
    'الصف',
    'الجمعة',
    'المنافقون',
    'التغابن',
    'الطلاق',
    'التحريم',
    'الملك',
    'القلم',
    'الحاقة',
    'المعارج',
    'نوح',
    'الجن',
    'المزمل',
    'المدثر',
    'القيامة',
    'الإنسان',
    'المرسلات',
    'النبأ',
    'النازعات',
    'عبس',
    'التكوير',
    'الانفطار',
    'المطففين',
    'الانشقاق',
    'البروج',
    'الطارق',
    'الأعلى',
    'الغاشية',
    'الفجر',
    'البلد',
    'الشمس',
    'الليل',
    'الضحى',
    'الشرح',
    'التين',
    'العلق',
    'القدر',
    'البينة',
    'الزلزلة',
    'العاديات',
    'القارعة',
    'التكاثر',
    'العصر',
    'الهمزة',
    'الفيل',
    'قريش',
    'الماعون',
    'الكوثر',
    'الكافرون',
    'النصر',
    'المسد',
    'الإخلاص',
    'الفلق',
    'الناس'
  ];

  /// Canonical 114 Surah names in English transliteration.
  static const List<String> surahNamesEn = [
    'Al-Fatihah',
    'Al-Baqarah',
    'Ali \'Imran',
    'An-Nisa',
    'Al-Ma\'idah',
    'Al-An\'am',
    'Al-A\'raf',
    'Al-Anfal',
    'At-Tawbah',
    'Yunus',
    'Hud',
    'Yusuf',
    'Ar-Ra\'d',
    'Ibrahim',
    'Al-Hijr',
    'An-Nahl',
    'Al-Isra',
    'Al-Kahf',
    'Maryam',
    'Ta-Ha',
    'Al-Anbiya',
    'Al-Hajj',
    'Al-Mu\'minun',
    'An-Nur',
    'Al-Furqan',
    'Ash-Shu\'ara',
    'An-Naml',
    'Al-Qasas',
    'Al-\'Ankabut',
    'Ar-Rum',
    'Luqman',
    'As-Sajdah',
    'Al-Ahzab',
    'Saba',
    'Fatir',
    'Ya-Sin',
    'As-Saffat',
    'Sad',
    'Az-Zumar',
    'Ghafir',
    'Fussilat',
    'Ash-Shura',
    'Az-Zukhruf',
    'Ad-Dukhan',
    'Al-Jathiyah',
    'Al-Ahqaf',
    'Muhammad',
    'Al-Fath',
    'Al-Hujurat',
    'Qaf',
    'Adh-Dhariyat',
    'At-Tur',
    'An-Najm',
    'Al-Qamar',
    'Ar-Rahman',
    'Al-Waqi\'ah',
    'Al-Hadid',
    'Al-Mujadila',
    'Al-Hashr',
    'Al-Mumtahanah',
    'As-Saff',
    'Al-Jumu\'ah',
    'Al-Munafiqun',
    'At-Taghabun',
    'At-Talaq',
    'At-Tahrim',
    'Al-Mulk',
    'Al-Qalam',
    'Al-Haqqah',
    'Al-Ma\'arij',
    'Nuh',
    'Al-Jinn',
    'Al-Muzzammil',
    'Al-Muddaththir',
    'Al-Qiyamah',
    'Al-Insan',
    'Al-Mursalat',
    'An-Naba',
    'An-Nazi\'at',
    '\'Abasa',
    'At-Takwir',
    'Al-Infitar',
    'Al-Mutaffifin',
    'Al-Inshiqaq',
    'Al-Buruj',
    'At-Tariq',
    'Al-A\'la',
    'Al-Ghashiyah',
    'Al-Fajr',
    'Al-Balad',
    'Ash-Shams',
    'Al-Layl',
    'Ad-Duha',
    'Ash-Sharh',
    'At-Tin',
    'Al-\'Alaq',
    'Al-Qadr',
    'Al-Bayyinah',
    'Az-Zalzalah',
    'Al-\'Adiyat',
    'Al-Qari\'ah',
    'At-Takathur',
    'Al-\'Asr',
    'Al-Humazah',
    'Al-Fil',
    'Quraysh',
    'Al-Ma\'un',
    'Al-Kawthar',
    'Al-Kafirun',
    'An-Nasr',
    'Al-Masad',
    'Al-Ikhlas',
    'Al-Falaq',
    'An-Nas'
  ];

  /// Returns canonical Arabic Surah name (e.g. 'الفاتحة').
  static String getSurahNameArabic(int surah) {
    if (surah >= 1 && surah <= 114) {
      return surahNamesAr[surah - 1];
    }
    return '';
  }

  /// Returns canonical English Surah name (e.g. 'Al-Fatihah').
  static String getSurahNameEnglish(int surah) {
    if (surah >= 1 && surah <= 114) {
      return surahNamesEn[surah - 1];
    }
    return '';
  }
}

/// Dedicated high-performance typography formatter for Eastern Arabic numbers and Quran text.
abstract final class QuranTypography {
  /// Canonical Uthmani Hafs Smart Quranic font family for Quran words.
  static const String quranWordsFont = 'HafsSmart';

  /// Aliases for backward compatibility and naming flexibility.
  static const String Quranwordsfont = quranWordsFont;
  static const String quranFontFamily = quranWordsFont;

  /// Standard app UI font family.
  static const String uiFontFamily = 'cairo';

  static final List<String> _arabicDigitsCache =
      List<String>.generate(650, (i) {
    const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return i.toString().split('').map((e) => digits[int.parse(e)]).join('');
  });

  /// Converts an integer, double, or numeric string to Eastern Arabic numeral glyphs (e.g. 1 -> '١', '1.5' -> '١.٥').
  static String toArabicDigits(Object value) {
    if (value is int && value >= 0 && value < _arabicDigitsCache.length) {
      return _arabicDigitsCache[value];
    }
    const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    final s = value.toString();
    final buffer = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      final code = s.codeUnitAt(i);
      if (code >= 48 && code <= 57) {
        buffer.write(digits[code - 48]);
      } else {
        buffer.writeCharCode(code);
      }
    }
    return buffer.toString();
  }

  /// Converts any Eastern Arabic numeral glyphs (٠-٩) in [input] to standard ASCII digits (0-9).
  static String toWesternDigits(String input) {
    const eastern = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    String result = input;
    for (int i = 0; i < 10; i++) {
      result = result.replaceAll(eastern[i], i.toString());
    }
    return result;
  }

  /// Formats an input digit string according to locale:
  /// converts to Eastern Arabic digits (٠-٩) if [isArabic] is true, otherwise standard ASCII.
  static String formatDigits(String input, {required bool isArabic}) {
    if (input.isEmpty) return input;
    final normalized = toWesternDigits(input);
    if (!isArabic) return normalized;
    const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return normalized.split('').map((char) {
      final n = int.tryParse(char);
      return n != null ? digits[n] : char;
    }).join('');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Quran Interaction Service (Consolidated from quran_interaction_service.dart)
// ─────────────────────────────────────────────────────────────────────────────

/// Centralized Quran User Interaction Service.
///
/// Handles Ayah selection and word clicks (Tajweed error dialog)
/// across both Mushaf Vector and Verse List views.
abstract final class QuranInteractionService {
  /// Handles selecting/tapping an Ayah: manual selection, and persisting last position.
  static Future<void> selectAyah({
    required int surah,
    required int ayah,
    required HighlightingController controller,
    VoidCallback? onTap,
  }) async {
    controller.setManualAyah(surah, ayah);
    onTap?.call();
  }

  /// Handles tapping a Quranic word:
  /// - Yellow word: always can be pressed directly and never selects the ayah,
  ///   UNLESS the user is in idle mode (not recording), where it requires ayah selection first.
  /// - Word play: always requires ayah selection first.
  static void handleWordTap({
    required BuildContext context,
    required int surah,
    required int ayah,
    required int wordIndex,
    required String wordText,
    required HighlightingController controller,
    bool isRecording = false,
    VoidCallback? onWordErrorTap,
    VoidCallback? onAyahTap,
    List<rq.ReciterError>? overrideErrors,
  }) {
    final bool isAlreadySelected =
        controller.targetSurah == surah && controller.activeAyah.value == ayah;

    final bool isYellow =
        controller.isWordYellow(ayah, wordIndex, surah: surah);
    final errors = overrideErrors ??
        (isYellow
            ? controller.getWordErrors(ayah, wordIndex, surah: surah)
            : null);
    final bool hasYellowError = errors != null && errors.isNotEmpty;

    // ── 1. Yellow Word ──
    // Always can be pressed and never selects the ayah, UNLESS the user is in idle mode (not recording).
    if (hasYellowError) {
      final bool isIdle = !isRecording;
      if (isIdle && !isAlreadySelected) {
        selectAyah(
          surah: surah,
          ayah: ayah,
          controller: controller,
          onTap: onAyahTap,
        );
        return;
      }

      AppState.instance.markTajweedWordClicked();
      DialogService.showTajweedError(
        context,
        word: wordText,
        errors: errors,
        surah: surah,
        ayah: ayah,
        wordIndex: wordIndex,
      );
      onWordErrorTap?.call();
      return;
    }

    // ── 2. Normal Word Tap ──
    // Selects the ayah if not already selected.
    if (!isAlreadySelected) {
      selectAyah(
        surah: surah,
        ayah: ayah,
        controller: controller,
        onTap: onAyahTap,
      );
    }
  }

  /// Resolves the word display color, handling zero-GPU blur hiding for unrecited words.
  static Color resolveWordDisplayColor({
    required int ayah,
    required int wordIndex,
    required HighlightingController controller,
    required AppState app,
    required ThemeColors colors,
    int? surah,
    bool isBlurEffective = false,
  }) {
    if (wordIndex < 0) return colors.text;
    final int s = surah ??
        (controller.targetSurah != 0
            ? controller.targetSurah
            : AppState.instance.lastSurah);

    if (isBlurEffective && !controller.isWordRead(ayah, wordIndex, surah: s)) {
      return Colors.transparent;
    }

    return colors.text;
  }
}
