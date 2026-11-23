import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import '../core/app_state.dart';
import '../core/highlighting_controller.dart';
import 'verse_span_builder.dart';

/// Displays a single Quranic verse (Ayah) with word-by-word highlighting.
///
/// Features:
/// - Fingerprint-based diffing for near-zero CPU / 60 FPS scrolling.
/// - Selective listener attachment (only active + adjacent Ayahs subscribe to ASR frames).
/// - Modular TextSpan rendering via [VerseSpanBuilder].
/// - Interactive Tajweed error breakdown via [ErrorDetailDialog].
class VerseRow extends StatefulWidget {
  final QuranVerse verse;
  final HighlightingController controller;
  final bool isRecording;
  final bool isAutoScrolling;
  final VoidCallback? onTap;
  final VoidCallback? onWordErrorTap;
  final void Function(int ayah, int wordIndex, Rect globalWordRect)?
      onActiveWordPositioned;

  const VerseRow({
    super.key,
    required this.verse,
    required this.controller,
    this.isRecording = false,
    required this.isAutoScrolling,
    this.onTap,
    this.onWordErrorTap,
    this.onActiveWordPositioned,
  });

  /// Authentic HafsSmart words cached directly from assets/quran_words.json.
  static Map<int, List<String>>? _quranWords;
  static Future<void>? _loadingFuture;

  /// Loads the authentic HafsSmart words dataset from assets/quran_words.json.
  static Future<void> ensureWordsLoaded() {
    if (_quranWords != null) return Future.value();
    if (_loadingFuture != null) return _loadingFuture!;

    _loadingFuture = () async {
      try {
        final jsonStr = await rootBundle.loadString('assets/quran_words.json');
        final Map<String, dynamic> raw = jsonDecode(jsonStr);
        final map = <int, List<String>>{};
        for (final entry in raw.entries) {
          final colon = entry.key.indexOf(':');
          if (colon != -1) {
            final s = int.parse(entry.key.substring(0, colon));
            final a = int.parse(entry.key.substring(colon + 1));
            map[(s << 16) | a] = (entry.value as List).cast<String>();
          }
        }
        _quranWords = map;
      } finally {
        _loadingFuture = null;
      }
    }();

    return _loadingFuture!;
  }

  /// Gets the authentic HafsSmart words for [surah] and [ayah].
  static List<String> getWordsForAyah(int surah, int ayah) {
    return _quranWords?[(surah << 16) | ayah] ?? const [];
  }

  /// Converts an integer to Eastern Arabic numeral glyphs (e.g. 1 -> '١').
  static String toArabicDigits(Object number) =>
      QuranTypography.toArabicDigits(number);

  /// Handles selecting/tapping an Ayah: manual selection, and persisting last position.
  static Future<void> selectAyah({
    required int surah,
    required int ayah,
    required HighlightingController controller,
    VoidCallback? onTap,
  }) =>
      QuranInteractionService.selectAyah(
        surah: surah,
        ayah: ayah,
        controller: controller,
        onTap: onTap,
      );

  /// Determines if an Ayah is active (reciting active, selected, or audio active).
  static bool isAyahActive({
    required int surah,
    required int ayah,
    required HighlightingController controller,
    required AppState app,
    bool isAutoScrolling = false,
  }) =>
      isAutoScrolling ? false : controller.isAyahActive(surah, ayah);

  /// Handles tapping a Quranic word:
  /// - When not recording: any word tap (including yellow words) requires selecting the Ayah first.
  /// - When recording: yellow words open Tajweed dialog, and words play audio, without selecting Ayah.
  static void handleWordTap({
    required BuildContext context,
    required int surah,
    required int ayah,
    required int wordIndex,
    required String wordText,
    required HighlightingController controller,
    required bool isAutoScrolling,
    bool isRecording = false,
    VoidCallback? onWordErrorTap,
    VoidCallback? onAyahTap,
  }) {
    if (isAutoScrolling) return;
    QuranInteractionService.handleWordTap(
      context: context,
      surah: surah,
      ayah: ayah,
      wordIndex: wordIndex,
      wordText: wordText,
      controller: controller,
      isRecording: isRecording,
      onWordErrorTap: onWordErrorTap,
      onAyahTap: onAyahTap,
    );
  }

  /// Generates the active Ayah gold border without background band.
  static BoxDecoration activeAyahBorderDecoration({
    required bool isActive,
    required AppState app,
    double borderRadius = 10,
  }) {
    final palette = QuranHighlightPalette.fromTheme(
      colors: app.colors,
      isDark: app.isDarkMode,
    );
    return BoxDecoration(
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: isActive ? palette.activeAyahBorder : Colors.transparent,
        width: 1.0,
      ),
    );
  }

  @override
  State<VerseRow> createState() => _VerseRowState();
}

class _VerseRowState extends State<VerseRow> {
  /// Words for this verse loaded strictly from assets/quran_words.json.
  List<String> get _words => VerseRow.getWordsForAyah(
        widget.verse.surah,
        widget.verse.ayah,
      );

  /// Cached fingerprint — only rebuilds when visual state changes.
  int _lastFingerprint = -1;

  /// Cached TextSpan list — avoids re-allocating on every build.
  List<InlineSpan>? _cachedSpans;
  bool _isListeningToController = false;

  /// Fast O(1) word colors hash cache for idle/unrecited verses.
  int? _cachedWordColorsHash;
  int? _cachedWordColorsRevision;

  final List<TapGestureRecognizer> _recognizers = [];
  final GlobalKey _textKey = GlobalKey();
  bool _positionCheckScheduled = false;
  Timer? _delayedWordPositionTimer;
  _AyahWordLayout? _wordLayout;

  int _lastPositionedWordIndex = -1;
  double _lastPositionedWidth = -1;

  @override
  void initState() {
    super.initState();
    if (VerseRow._quranWords == null) {
      VerseRow.ensureWordsLoaded().then((_) {
        if (mounted) setState(() {});
      });
    }
    widget.controller.activeAyah.addListener(_onActiveAyahChanged);
    AppState.instance.blurModeNotifier.addListener(_onStateChanged);
    AppState.instance.fontSizeNotifier.addListener(_onFontSizeChanged);
    _updateSubscription();
    if (_getActiveTargetIndex() >= 0) {
      _scheduleWordPositionCheck();
      _scheduleWordPositionCheck(delay: const Duration(milliseconds: 450));
    }
  }

  void _onFontSizeChanged() {
    _wordLayout?.dispose();
    _wordLayout = null;
    _onStateChanged();
  }

  @override
  void didUpdateWidget(VerseRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.activeAyah.removeListener(_onActiveAyahChanged);
      if (_isListeningToController) {
        oldWidget.controller.removeListener(_onStateChanged);
      }
      widget.controller.activeAyah.addListener(_onActiveAyahChanged);
      _isListeningToController = false;
      _updateSubscription();
      _invalidate();
    }
    if (oldWidget.isAutoScrolling != widget.isAutoScrolling) {
      _invalidate();
      _onStateChanged();
    }
    if (oldWidget.isRecording != widget.isRecording) {
      _invalidate();
      _updateSubscription();
      _onStateChanged();
      _scheduleWordPositionCheck();
    }
  }

  void _disposeRecognizers() {
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
  }

  @override
  void dispose() {
    widget.controller.activeAyah.removeListener(_onActiveAyahChanged);
    if (_isListeningToController) {
      widget.controller.removeListener(_onStateChanged);
      _isListeningToController = false;
    }
    AppState.instance.blurModeNotifier.removeListener(_onStateChanged);
    AppState.instance.fontSizeNotifier.removeListener(_onFontSizeChanged);
    _delayedWordPositionTimer?.cancel();
    _disposeRecognizers();
    _wordLayout?.dispose();
    _wordLayout = null;
    super.dispose();
  }

  void _onActiveAyahChanged() {
    final int? active = widget.controller.activeAyah.value;
    final int myAyah = widget.verse.ayah;
    final int effectiveActive = active ?? (widget.isRecording ? 1 : -999);

    // Fast check: If this verse is far away from the active ayah and was not previously active/listening,
    // skip recomputation completely.
    final bool isNear = (myAyah >= effectiveActive - 1 && myAyah <= effectiveActive + 1);
    if (!isNear && !_isListeningToController && _lastFingerprint != -1) {
      return;
    }

    _lastPositionedWordIndex = -1;
    _updateSubscription();
    _onStateChanged();
    if (_getActiveTargetIndex() >= 0) {
      _scheduleWordPositionCheck();
      _scheduleWordPositionCheck(delay: const Duration(milliseconds: 450));
    }
  }

  void _updateSubscription() {
    final int? active = widget.controller.activeAyah.value;
    final int myAyah = widget.verse.ayah;

    // Listen to highlights selectively: ONLY active, preceding, or upcoming Ayah subscribe
    bool shouldListen = false;
    final int effectiveActive = active ?? (widget.isRecording ? 1 : -999);
    if (myAyah == effectiveActive ||
        myAyah == effectiveActive - 1 ||
        myAyah == effectiveActive + 1) {
      shouldListen = true;
    }
    if (shouldListen && !_isListeningToController) {
      widget.controller.addListener(_onStateChanged);
      _isListeningToController = true;
    } else if (!shouldListen && _isListeningToController) {
      widget.controller.removeListener(_onStateChanged);
      _isListeningToController = false;
    }
  }

  void _invalidate() {
    _lastFingerprint = -1;
    _cachedSpans = null;
    _wordLayout?.dispose();
    _wordLayout = null;
    _cachedWordColorsHash = null;
    _cachedWordColorsRevision = null;
  }

  void _onStateChanged() {
    final fp = _computeFingerprint();
    if (fp != _lastFingerprint) {
      _lastFingerprint = fp;
      _cachedSpans = null;
      // Note: _wordLayout is preserved here because word highlight color changes
      // do not alter HarfBuzz text geometry. It is safely cached and reused.
      if (mounted) {
        if (SchedulerBinding.instance.schedulerPhase ==
            SchedulerPhase.persistentCallbacks) {
          SchedulerBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {});
              _scheduleWordPositionCheck();
            }
          });
        } else {
          setState(() {});
          _scheduleWordPositionCheck();
        }
      }
    } else {
      _scheduleWordPositionCheck();
    }
  }

  int _getActiveTargetIndex() {
    return widget.controller.getLeadWordIndex(
          surah: widget.verse.surah,
          ayah: widget.verse.ayah,
          totalWords: _words.length,
          isRecording: widget.isRecording,
        ) ??
        -1;
  }

  void _scheduleWordPositionCheck({Duration? delay}) {
    if (!mounted ||
        widget.isAutoScrolling ||
        widget.onActiveWordPositioned == null) {
      return;
    }

    // Fast exit: If this Ayah is not the active target or audio-active, skip position layout checks completely.
    // Eliminates thousands of redundant Timer and post-frame layouts across idle verses during scrolling!
    if (_getActiveTargetIndex() < 0) {
      return;
    }

    if (delay != null) {
      _delayedWordPositionTimer?.cancel();
      _delayedWordPositionTimer = Timer(delay, () {
        if (!mounted) return;
        _checkActiveWordPosition();
      });
      return;
    }

    if (_positionCheckScheduled) return;
    _positionCheckScheduled = true;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _positionCheckScheduled = false;
      if (!mounted) return;
      _checkActiveWordPosition();
    });
  }

  void _checkActiveWordPosition() {
    if (!mounted ||
        widget.isAutoScrolling ||
        widget.onActiveWordPositioned == null) {
      return;
    }

    final targetIndex = _getActiveTargetIndex();
    if (targetIndex < 0) {
      _lastPositionedWordIndex = -1;
      return;
    }

    final textBox = _textKey.currentContext?.findRenderObject() as RenderBox?;
    if (textBox == null || !textBox.hasSize || !textBox.attached) return;

    final double currentWidth = textBox.size.width;
    if (targetIndex == _lastPositionedWordIndex &&
        (_lastPositionedWidth - currentWidth).abs() < 1.0) {
      return;
    }
    _lastPositionedWordIndex = targetIndex;
    _lastPositionedWidth = currentWidth;

    final localRect = _calculateWordRect(targetIndex, currentWidth);
    if (localRect == null) return;

    final globalTopLeft = textBox.localToGlobal(localRect.topLeft);
    final globalRect = Rect.fromLTWH(
      globalTopLeft.dx,
      globalTopLeft.dy,
      localRect.width,
      localRect.height,
    );

    widget.onActiveWordPositioned?.call(
      widget.verse.ayah,
      targetIndex,
      globalRect,
    );
  }

  _AyahWordLayout? _getOrCreateWordLayout(double maxWidth) {
    if (maxWidth <= 0) return null;
    final double currentFontSize = AppState.instance.fontSize;
    if (_wordLayout != null &&
        (_wordLayout!.width - maxWidth).abs() < 0.5 &&
        (_wordLayout!.fontSize - currentFontSize).abs() < 0.1) {
      return _wordLayout;
    }
    _wordLayout?.dispose();
    _wordLayout = _AyahWordLayout.compute(
      words: _words,
      fontSize: currentFontSize,
      width: maxWidth,
    );
    return _wordLayout;
  }

  Rect? _calculateWordRect(int targetIndex, double maxWidth) {
    if (targetIndex < 0 ||
        targetIndex >= _words.length ||
        maxWidth <= 0) {
      return null;
    }

    final layout = _getOrCreateWordLayout(maxWidth);
    if (layout == null) {
      return null;
    }
    return layout.getWordRect(targetIndex);
  }

  /// Compact hash representing active state, word colors, blur, theme, and font size.
  int _computeFingerprint() {
    final ctrl = widget.controller;
    final app = AppState.instance;
    final ayah = widget.verse.ayah;
    final surah = widget.verse.surah;
    final bool isSelected =
        !widget.isAutoScrolling && ctrl.activeAyah.value == ayah;
    final bool isActive = VerseRow.isAyahActive(
      surah: surah,
      ayah: ayah,
      controller: ctrl,
      app: app,
      isAutoScrolling: widget.isAutoScrolling,
    );
    final bool isCompleted = ctrl.completedAyahs.contains(ayah);

    int hash = isActive ? 1 : 0;
    hash = hash * 31 + (isSelected ? 1 : 0);
    hash = hash * 31 + (isCompleted ? 1 : 0);
    hash = hash * 31 + (widget.isRecording ? 1 : 0);

    final int currentRevision = ctrl.globalRevision.value;
    final int? activeAyahVal = ctrl.activeAyah.value;
    final int effectiveActiveAyah =
        activeAyahVal ?? (widget.isRecording ? 1 : -999);
    final bool isNearActive =
        (ayah >= effectiveActiveAyah - 1 && ayah <= effectiveActiveAyah + 1);

    final bool isBlurEffective =
        app.isBlurEffective(isRecording: widget.isRecording);

    final bool hasHighlights = isActive ||
        isCompleted ||
        (widget.isRecording && isActive) ||
        ctrl.hasAyahHighlights(surah, ayah);

    final int wordColorsHash;
    final bool couldHaveNewHighlights = isActive || isNearActive;

    if (!couldHaveNewHighlights && _cachedWordColorsHash != null) {
      wordColorsHash = _cachedWordColorsHash!;
      _cachedWordColorsRevision = currentRevision;
    } else if (!hasHighlights) {
      wordColorsHash = 17;
      _cachedWordColorsHash = 17;
      _cachedWordColorsRevision = currentRevision;
    } else {
      final bool isLiveActive =
          widget.isRecording && (isActive || isNearActive);
      final bool needsWordScan = isLiveActive ||
          _cachedWordColorsRevision != currentRevision ||
          _cachedWordColorsHash == null;

      if (needsWordScan) {
        int wHash = 17;
        final wordCount = _words.length;
        // In standard recitation, live green ribbons are painted directly on the GPU Canvas by _ActiveWordHighlightPainter.
        // We only scan words here if a Tajweed error (yellow) might change or if blur mode is active.
        final bool isTajweedMode = app.currentMode == AppMode.tajweed;
        if (isTajweedMode || isBlurEffective) {
          for (int i = 0; i < wordCount; i++) {
            if (isTajweedMode && ctrl.isWordYellow(ayah, i, surah: widget.verse.surah)) {
              wHash = wHash * 31 + (i + 1) * 7;
            }
            if (isBlurEffective && ctrl.isWordRead(ayah, i, surah: widget.verse.surah)) {
              wHash = wHash * 31 + (i + 1) * 17;
            }
          }
        }
        _cachedWordColorsHash = wHash;
        _cachedWordColorsRevision = currentRevision;
        wordColorsHash = wHash;
      } else {
        wordColorsHash = _cachedWordColorsHash!;
      }
    }
    hash = hash * 31 + wordColorsHash;
    hash = hash * 31 + (isBlurEffective ? 1 : 0);
    hash = hash * 31 + (isBlurEffective && widget.isAutoScrolling ? 1 : 0);
    hash = hash * 31 + app.fontSize.hashCode;
    hash = hash * 31 + app.theme.index;
    hash = hash * 31 + (app.hasClickedTajweedWord ? 1 : 0);
    hash = hash * 31 + (widget.isAutoScrolling ? 1 : 0);

    return hash;
  }

  @override
  Widget build(BuildContext context) {
    final int fp = _computeFingerprint();
    if (fp != _lastFingerprint) {
      _lastFingerprint = fp;
      _cachedSpans = null;
    }
    final AppState app = AppState.instance;
    final ThemeColors c = app.colors;
    final words = _words;
    final surah = widget.verse.surah;
    final ayah = widget.verse.ayah;
    final bool isActive = VerseRow.isAyahActive(
      surah: surah,
      ayah: ayah,
      controller: widget.controller,
      app: app,
      isAutoScrolling: widget.isAutoScrolling,
    );
    final bool hasHighlights = isActive ||
        (widget.isRecording && isActive) ||
        widget.controller.completedAyahsFor(surah).contains(ayah) ||
        widget.controller.hasAyahHighlights(surah, ayah);

    if (_cachedSpans == null) {
      _disposeRecognizers();
      _cachedSpans = VerseSpanBuilder.buildSpans(
        words: words,
        ayah: widget.verse.ayah,
        surah: widget.verse.surah,
        isActive: isActive,
        isAutoScrolling: widget.isAutoScrolling,
        isRecording: widget.isRecording,
        controller: widget.controller,
        app: app,
        colors: c,
        recognizersSink: _recognizers,
        onWordErrorTap: (ayah, wordIdx, word) {
          VerseRow.handleWordTap(
            context: context,
            surah: widget.verse.surah,
            ayah: ayah,
            wordIndex: wordIdx,
            wordText: word,
            controller: widget.controller,
            isAutoScrolling: widget.isAutoScrolling,
            isRecording: widget.isRecording,
            onWordErrorTap: widget.onWordErrorTap,
            onAyahTap: widget.onTap,
          );
        },
        onWordTap: (ayah, wordIdx) {
          VerseRow.handleWordTap(
            context: context,
            surah: widget.verse.surah,
            ayah: ayah,
            wordIndex: wordIdx,
            wordText: words[wordIdx],
            controller: widget.controller,
            isAutoScrolling: widget.isAutoScrolling,
            isRecording: widget.isRecording,
            onAyahTap: widget.onTap,
          );
        },
      );
    }

    return ExcludeSemantics(
      child: GestureDetector(
        onTap: widget.isAutoScrolling
            ? null
            : () => VerseRow.selectAyah(
                  surah: widget.verse.surah,
                  ayah: widget.verse.ayah,
                  controller: widget.controller,
                  onTap: widget.onTap,
                ),
        child: Directionality(
          textDirection: TextDirection.rtl,
          child: Container(
            margin: const EdgeInsets.symmetric(
              horizontal: 10,
              vertical: 3.5,
            ),
            decoration: VerseRow.activeAyahBorderDecoration(
              isActive: isActive,
              app: app,
              borderRadius: 16,
            ),
            child: Stack(
              children: [
                Padding(
                  padding: const EdgeInsets.only(
                    right: 8,
                    left: 26,
                    top: 6,
                    bottom: 6,
                  ),
                  child: CustomPaint(
                    painter: _cachedSpans != null &&
                            ((isActive && widget.isRecording) || hasHighlights)
                        ? _ActiveWordHighlightPainter(
                            surah: widget.verse.surah,
                            ayah: widget.verse.ayah,
                            words: words,
                            controller: widget.controller,
                            app: app,
                            cachedSpans: _cachedSpans!,
                            isRecording: widget.isRecording,
                            isActive: isActive,
                            getWordLayout: _getOrCreateWordLayout,
                          )
                        : null,
                    foregroundPainter: _cachedSpans != null &&
                            !app.hasClickedTajweedWord &&
                            app.currentMode == AppMode.tajweed
                        ? TajweedTooltipPainter(
                            words: words,
                            ayah: widget.verse.ayah,
                            surah: widget.verse.surah,
                            controller: widget.controller,
                            app: app,
                            cachedSpans: _cachedSpans!,
                            getWordRect: (i, w) => _calculateWordRect(i, w),
                          )
                        : null,
                    child: RichText(
                      key: _textKey,
                      textAlign: TextAlign.justify,
                      textDirection: TextDirection.rtl,
                      text: TextSpan(children: _cachedSpans),
                    ),
                  ),
                ),

                // Injected Ayah number with comfortable touch area
                Positioned(
                  left: 0,
                  bottom: 2,
                  width: 38,
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => VerseRow.selectAyah(
                      surah: widget.verse.surah,
                      ayah: widget.verse.ayah,
                      controller: widget.controller,
                      onTap: widget.onTap,
                    ),
                    child: Container(
                      width: 38,
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      color: Colors.transparent,
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          QuranTypography.toArabicDigits(widget.verse.ayah),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: QuranTypography.quranWordsFont,
                            fontSize: 21.5,
                            fontWeight: FontWeight.bold,
                            height: 1.0,
                            color: isActive
                                ? c.gold
                                : c.textSecondary.withValues(alpha: 0.75),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _VerseSpanItem {
  int state = 0;
  bool isActive = false;
  int startWord = 0;
  int endWord = 0;
  double left = 0.0;
  double right = 0.0;
  double top = 0.0;
  double bottom = 0.0;
  double lineCenterY = 0.0;
  bool flatLeft = false;
  bool flatRight = false;

  void reset({
    required int state,
    required bool isActive,
    required int startWord,
    required int endWord,
    required double left,
    required double right,
    required double top,
    required double bottom,
    required double lineCenterY,
  }) {
    this.state = state;
    this.isActive = isActive;
    this.startWord = startWord;
    this.endWord = endWord;
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.lineCenterY = lineCenterY;
    flatLeft = false;
    flatRight = false;
  }
}

/// Paints background highlight pills behind words in the verse row:
/// - Active lead word: Soft calming teal pill (Word N+1 anticipatory cursor).
/// - Correct words: Soft botanical sage pastel ribbon.
/// - Tajweed words: Soft warm amber pastel ribbon.
/// - Skipped/Error words: Soft terracotta coral pastel ribbon.
///
/// Text ink sits directly on top in crisp black/pearl, matching Mushaf mode.
class _ActiveWordHighlightPainter extends CustomPainter {
  final int surah;
  final int ayah;
  final List<String> words;
  final HighlightingController controller;
  final AppState app;
  final List<InlineSpan> cachedSpans;
  final bool isRecording;
  final bool isActive;
  final _AyahWordLayout? Function(double width) getWordLayout;

  _ActiveWordHighlightPainter({
    required this.surah,
    required this.ayah,
    required this.words,
    required this.controller,
    required this.app,
    required this.cachedSpans,
    required this.isRecording,
    required this.isActive,
    required this.getWordLayout,
  }) : super(repaint: isActive ? controller : null);

  static final Paint _greenPaint = Paint()..style = PaintingStyle.fill;
  static final Paint _yellowPaint = Paint()..style = PaintingStyle.fill;
  static final Paint _redPaint = Paint()..style = PaintingStyle.fill;
  static final Paint _activePaint = Paint()..style = PaintingStyle.fill;

  static final List<_VerseSpanItem> _pool = [];
  static int _poolCount = 0;

  static _VerseSpanItem _acquireSpan({
    required int state,
    required bool isActive,
    required int startWord,
    required int endWord,
    required double left,
    required double right,
    required double top,
    required double bottom,
    required double lineCenterY,
  }) {
    final _VerseSpanItem item;
    if (_poolCount < _pool.length) {
      item = _pool[_poolCount];
    } else {
      item = _VerseSpanItem();
      _pool.add(item);
    }
    _poolCount++;
    item.reset(
      state: state,
      isActive: isActive,
      startWord: startWord,
      endWord: endWord,
      left: left,
      right: right,
      top: top,
      bottom: bottom,
      lineCenterY: lineCenterY,
    );
    return item;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final activeIndex = controller.getLeadWordIndex(
          surah: surah,
          ayah: ayah,
          totalWords: words.length,
          isRecording: isRecording,
        ) ??
        -1;

    final bool isCompleted =
        controller.completedAyahsFor(surah).contains(ayah);
    final bool hasHighlights = (activeIndex >= 0) ||
        isCompleted ||
        controller.hasAyahHighlights(surah, ayah);
    if (!hasHighlights) return;

    final layout = getWordLayout(size.width);
    if (layout == null) return;

    int getHighlightState(int i) {
      final s = controller.getWordStatus(ayah, i, surah: surah);
      if (s == null || s == 4) return 0;
      return s; // 1: green, 2: yellow, 3: red
    }

    final palette = QuranHighlightPalette.fromTheme(
      colors: app.colors,
      isDark: app.isDarkMode,
    );
    _greenPaint.color = palette.greenBand;
    _yellowPaint.color = palette.yellowBand;
    _redPaint.color = palette.redBand;
    _activePaint.color = palette.leadWordBand;

    Paint getPaintForState(int state, bool isActiveWord) {
      if (isActiveWord) return _activePaint;
      if (state == 1) return _greenPaint;
      if (state == 2) return _yellowPaint;
      return _redPaint;
    }

    final int startPoolIdx = _poolCount;
    int i = 0;
    while (i < words.length) {
      final int state = getHighlightState(i);
      final bool isActiveWord = (i == activeIndex);
      if (state == 0 && !isActiveWord) {
        if (isActive && isRecording && activeIndex >= 0 && i > activeIndex) {
          break;
        }
        i++;
        continue;
      }

      final lineRects = layout.getWordLineRects(i);
      if (lineRects.isEmpty) {
        i++;
        continue;
      }

      final curRect = lineRects.first;
      double spanLeft = curRect.left;
      double spanRight = curRect.right;
      double spanTop = curRect.top;
      double spanBottom = curRect.bottom;
      final double lineCenterY = curRect.center.dy;

      int j = i + 1;
      if (!isActiveWord) {
        // Merge contiguous same-state words on the same line into one continuous ribbon
        while (j < words.length &&
            j != activeIndex &&
            getHighlightState(j) == state) {
          final nextRects = layout.getWordLineRects(j);
          if (nextRects.isNotEmpty &&
              (nextRects.first.center.dy - lineCenterY).abs() < 14.0) {
            spanLeft = math.min(spanLeft, nextRects.first.left);
            spanRight = math.max(spanRight, nextRects.first.right);
            spanTop = math.min(spanTop, nextRects.first.top);
            spanBottom = math.max(spanBottom, nextRects.first.bottom);
            j++;
          } else {
            break;
          }
        }
      }

      _acquireSpan(
        state: state,
        isActive: isActiveWord,
        startWord: i,
        endWord: j,
        left: spanLeft,
        right: spanRight,
        top: spanTop,
        bottom: spanBottom,
        lineCenterY: lineCenterY,
      );

      i = j;
    }

    final int totalSpans = _poolCount;
    // Detect and resolve boundaries between adjacent highlighted spans on the same line (O(N) single pass)
    // Guarantees adjacent highlights (e.g. Yellow next to Green/Red) never bleed alpha or distort
    for (int p = startPoolIdx; p < totalSpans - 1; p++) {
      final a = _pool[p];
      final b = _pool[p + 1];
      if ((a.lineCenterY - b.lineCenterY).abs() >= 14.0) continue;

      // Orient left/right on screen
      final _VerseSpanItem leftSpan = (a.left <= b.left) ? a : b;
      final _VerseSpanItem rightSpan = (a.left <= b.left) ? b : a;

      if (a.endWord == b.startWord || leftSpan.right >= rightSpan.left) {
        final double midX = (leftSpan.right + rightSpan.left) / 2.0;
        leftSpan.right = midX;
        rightSpan.left = midX;
        leftSpan.flatRight = true;
        rightSpan.flatLeft = true;
      }
    }

    for (int p = startPoolIdx; p < totalSpans; p++) {
      final span = _pool[p];
      if (span.right <= span.left) continue;
      final double padLeft = span.flatLeft ? 0.0 : 3.0;
      final double padRight = span.flatRight ? 0.0 : 3.0;

      final rrect = RRect.fromRectAndCorners(
        Rect.fromLTRB(
          span.left - padLeft,
          span.top - 1.5,
          span.right + padRight,
          span.bottom + 1.5,
        ),
        topLeft: span.flatLeft ? Radius.zero : const Radius.circular(5.0),
        bottomLeft: span.flatLeft ? Radius.zero : const Radius.circular(5.0),
        topRight: span.flatRight ? Radius.zero : const Radius.circular(5.0),
        bottomRight: span.flatRight ? Radius.zero : const Radius.circular(5.0),
      );
      canvas.drawRRect(rrect, getPaintForState(span.state, span.isActive));
    }

    _poolCount = startPoolIdx;
  }

  @override
  bool shouldRepaint(covariant _ActiveWordHighlightPainter oldDelegate) {
    return oldDelegate.surah != surah ||
        oldDelegate.ayah != ayah ||
        oldDelegate.cachedSpans != cachedSpans ||
        oldDelegate.isRecording != isRecording ||
        oldDelegate.isActive != isActive;
  }
}

/// Precomputed layout geometry for an Ayah's words at a specific layout width.
/// Lazily evaluates HarfBuzz bounding boxes per requested word on demand.
class _AyahWordLayout {
  final double width;
  final double fontSize;
  final List<String> words;
  final TextPainter _painter;
  final List<int> _wordOffsets;
  final List<Rect?> _wordRects;
  final List<List<Rect>?> _wordLineRects;

  _AyahWordLayout._({
    required this.width,
    required this.fontSize,
    required this.words,
    required TextPainter painter,
    required List<int> wordOffsets,
    required List<Rect?> wordRects,
    required List<List<Rect>?> wordLineRects,
  })  : _painter = painter,
        _wordOffsets = wordOffsets,
        _wordRects = wordRects,
        _wordLineRects = wordLineRects;

  static _AyahWordLayout compute({
    required List<String> words,
    required double fontSize,
    required double width,
  }) {
    final defaultStyle = TextStyle(
      fontFamily: QuranTypography.quranWordsFont,
      fontSize: fontSize,
      height: 2.6,
      wordSpacing: 5.0,
    );

    final painter = TextPainter(
      text: TextSpan(
        children: [
          for (int i = 0; i < words.length; i++) ...[
            TextSpan(text: words[i], style: defaultStyle),
            if (i < words.length - 1) TextSpan(text: ' ', style: defaultStyle),
          ]
        ],
      ),
      textAlign: TextAlign.justify,
      textDirection: TextDirection.rtl,
    )..layout(minWidth: width, maxWidth: width);

    final wordOffsets = List<int>.filled(words.length, 0);
    int offset = 0;
    for (int i = 0; i < words.length; i++) {
      wordOffsets[i] = offset;
      offset += words[i].length + 1;
    }

    return _AyahWordLayout._(
      width: width,
      fontSize: fontSize,
      words: words,
      painter: painter,
      wordOffsets: wordOffsets,
      wordRects: List<Rect?>.filled(words.length, null),
      wordLineRects: List<List<Rect>?>.filled(words.length, null),
    );
  }

  void _computeWord(int i) {
    if (i < 0 || i >= words.length) return;
    final int charOffset = _wordOffsets[i];
    final int wordLen = words[i].length;
    final rawBoxes = _painter.getBoxesForSelection(
      TextSelection(
        baseOffset: charOffset,
        extentOffset: charOffset + wordLen,
      ),
    );

    if (rawBoxes.isEmpty) {
      _wordLineRects[i] = const [];
      _wordRects[i] = null;
      return;
    }

    double left = double.infinity;
    double right = -double.infinity;
    double top = double.infinity;
    double bottom = -double.infinity;
    final List<Rect> lineBoxes = [];

    for (final box in rawBoxes) {
      final bLeft = math.min(box.left, box.right);
      final bRight = math.max(box.left, box.right);
      final bTop = math.min(box.top, box.bottom);
      final bBottom = math.max(box.top, box.bottom);
      if ((bRight - bLeft).abs() <= 1.0) continue;

      if (bLeft < left) left = bLeft;
      if (bRight > right) right = bRight;
      if (bTop < top) top = bTop;
      if (bBottom > bottom) bottom = bBottom;

      final rect = Rect.fromLTRB(bLeft, bTop, bRight, bBottom);

      int lineIndex = -1;
      for (int k = 0; k < lineBoxes.length; k++) {
        final existing = lineBoxes[k];
        if ((rect.top - existing.top).abs() < 12.0 ||
            (rect.bottom - existing.bottom).abs() < 12.0) {
          lineIndex = k;
          break;
        }
      }

      if (lineIndex >= 0) {
        lineBoxes[lineIndex] = lineBoxes[lineIndex].expandToInclude(rect);
      } else {
        lineBoxes.add(rect);
      }
    }

    if (lineBoxes.isNotEmpty && left.isFinite) {
      _wordLineRects[i] = lineBoxes;
      _wordRects[i] = Rect.fromLTRB(left, top, right, bottom);
    } else {
      _wordLineRects[i] = const [];
      _wordRects[i] = null;
    }
  }

  List<Rect> getWordLineRects(int i) {
    if (i < 0 || i >= words.length) return const [];
    if (_wordLineRects[i] == null) {
      _computeWord(i);
    }
    return _wordLineRects[i] ?? const [];
  }

  Rect? getWordRect(int i) {
    if (i < 0 || i >= words.length) return null;
    if (_wordRects[i] == null && _wordLineRects[i] == null) {
      _computeWord(i);
    }
    return _wordRects[i];
  }

  void dispose() {
    _painter.dispose();
  }
}
