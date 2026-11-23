import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:qvp_flutter/qvp_flutter.dart';
import '../core/app_state.dart';
import '../core/highlighting_controller.dart';
import '../core/platform_utils.dart';
import 'mushaf_overlays.dart';
import 'mushaf_provider.dart';

export 'mushaf_provider.dart';

/// Single-view Mushaf architecture matching Native Android (MainActivity.kt).
///
/// Instead of mounting multi-page PageViews and competing gesture recognizers,
/// this view hosts a single [QvpPageView] with native swipe fling detection
/// and instant zero-latency page transitions.
class MushafView extends StatefulWidget {
  final HighlightingController controller;
  final bool isRecording;
  final bool showBottomPageNumber;

  const MushafView({
    super.key,
    required this.controller,
    required this.isRecording,
    this.showBottomPageNumber = true,
  });

  static bool get isSyncingSurah => MushafProvider.instance.isSyncingSurah;
  static set isSyncingSurah(bool v) =>
      MushafProvider.instance.isSyncingSurah = v;

  static void preloadData() => MushafProvider.instance.preloadData();

  static (int surah, int ayah)? getFirstAyahOnPage(int pageNumber) =>
      MushafProvider.instance.getFirstAyahOnPage(pageNumber);

  static int? getDominantSurahOnPage(int pageNumber) =>
      MushafProvider.instance.getDominantSurahOnPage(pageNumber);

  static int? getPageForAyah(int surah, int ayah) =>
      MushafProvider.instance.getPageForAyah(surah, ayah);

  static bool isAyahOnPage({
    required int pageNumber,
    required int surah,
    required int ayah,
  }) =>
      MushafProvider.instance.isAyahOnPage(
        pageNumber: pageNumber,
        surah: surah,
        ayah: ayah,
      );

  static MushafWordRef? getLastWordOnPage(int pageNumber) =>
      MushafProvider.instance.getLastWordOnPage(pageNumber);

  static Future<void> ensureActiveAyahOnCurrentPage({
    required HighlightingController controller,
    int? pageNumber,
  }) =>
      MushafProvider.instance.ensureActiveAyahOnCurrentPage(
        controller: controller,
        pageNumber: pageNumber,
      );

  @override
  State<MushafView> createState() => _MushafViewState();
}

class _MushafViewState extends State<MushafView> {
  int _currentPage = 1;
  QvpPage? _currentPageObject;
  bool _isLoading = true;
  final FocusNode _focusNode = FocusNode();
  (int surah, int ayah)? _navigationTargetAyah;
  Timer? _savePositionDebounce;

  // Auto-advance state during live recitation
  int? _lastAdvancedSurah;
  bool _isAdvancingSurah = false;
  int? _lastProgressSurah;
  int? _lastProgressAyah;
  int? _lastProgressWord;
  int? _lastProgressRev;

  // Interactive PageController driving train-style horizontal page transitions
  late PageController _pageController;
  bool _isProgrammaticScroll = false;

  void _onScrollEnd() {
    MushafProvider.instance.isPageScrolling.value = false;
    _settleOnPage(_currentPage);
  }

  // Fine-grained layer repaint triggers
  final ValueNotifier<int> _underlayRepaintTrigger = ValueNotifier<int>(0);
  final ValueNotifier<int> _overlayRepaintTrigger = ValueNotifier<int>(0);
  late final Listenable _underlayRepaintListenable;
  late final Listenable _overlayRepaintListenable;
  final ValueNotifier<List<int>> _yellowWordsNotifier =
      ValueNotifier<List<int>>(const []);

  ({
    bool onPage,
    int surah,
    int? ayah,
    int? lead,
    int rev,
    bool recording,
  })? _lastUnderlayState;

  List<int> _lastHiddenWords = const [];
  bool _hasMasks = false;

  // Keyboard navigation: Left = Next page (+1 in RTL), Right = Prev page (-1 in RTL)
  KeyEventResult _controlRLByKeyboard(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    if (event.logicalKey == LogicalKeyboardKey.arrowLeft) {
      _nextPage();
      return KeyEventResult.handled;
    } else if (event.logicalKey == LogicalKeyboardKey.arrowRight) {
      _prevPage();
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  int _lastWheelMs = 0;

  void _onPointerSignal(PointerSignalEvent event) {
    if (event is PointerScrollEvent) {
      final now = DateTime.now().millisecondsSinceEpoch;
      if (now - _lastWheelMs < 240) return;

      final double delta =
          event.scrollDelta.dy.abs() > event.scrollDelta.dx.abs()
              ? event.scrollDelta.dy
              : -event.scrollDelta.dx;

      if (delta.abs() > 12.0) {
        _lastWheelMs = now;
        if (delta > 0) {
          _nextPage();
        } else {
          _prevPage();
        }
      }
    }
  }

  @override
  void initState() {
    super.initState();
    final provider = MushafProvider.instance;
    _currentPage = _findInitialPage();
    _pageController = PageController(initialPage: _currentPage - 1);
    _isLoading = !provider.isReady;

    final app = AppState.instance;
    _underlayRepaintListenable = Listenable.merge([
      _underlayRepaintTrigger,
      app.modeNotifier,
      app.blurModeNotifier,
    ]);
    _overlayRepaintListenable = Listenable.merge([
      _underlayRepaintTrigger,
      _overlayRepaintTrigger,
      app.hasClickedTajweedNotifier,
      _yellowWordsNotifier,
    ]);

    widget.controller.addListener(_onControllerProgress);
    widget.controller.activeAyah.addListener(_onActiveAyahChanged);
    app.currentMushafPage.addListener(_onExternalPageChanged);
    app.themeNotifier.addListener(_onVisualSettingsChanged);
    app.blurModeNotifier.addListener(_onVisualSettingsChanged);
    app.modeNotifier.addListener(_onVisualSettingsChanged);
    AppModalRouteObserver.instance.activeModalsNotifier
        .addListener(_onModalStateChanged);

    if (provider.isReady) {
      _isLoading = false;
      _loadCurrentPage(_currentPage, notify: false);
    } else {
      _initMushafData();
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        AppState.instance.currentMushafPage.value = _currentPage;
        MushafProvider.instance.preloadAdjacentPages(
          _currentPage,
          MushafProvider.instance.lastViewportSize,
        );
      }
    });
  }

  @override
  void didUpdateWidget(MushafView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_onControllerProgress);
      oldWidget.controller.activeAyah.removeListener(_onActiveAyahChanged);
      widget.controller.addListener(_onControllerProgress);
      widget.controller.activeAyah.addListener(_onActiveAyahChanged);
      _syncVisuals();
      _notifyUnderlayIfRelevant();
    }
    if (!oldWidget.isRecording && widget.isRecording) {
      _syncVisuals();
      _notifyUnderlayIfRelevant();
    } else if (oldWidget.isRecording && !widget.isRecording) {
      _lastAdvancedSurah = null;
      _syncVisuals();
      _notifyUnderlayIfRelevant();
    } else if (!oldWidget.isRecording && widget.isRecording) {
      _notifyUnderlayIfRelevant();
    }
  }

  void _onModalStateChanged() {
    if (!mounted) return;
    if (!AppModalRouteObserver.instance.isModalOpen) {
      final ctrl = widget.controller;
      final (int activeSurah, int? activeAyah) = ctrl.recitationCoordinate;
      if (ctrl.isCoordinateSettled &&
          (activeSurah != _lastHandledSurah || activeAyah != _lastHandledAyah)) {
        _onActiveAyahChanged();
      }
      if (_needsSyncAfterModal) {
        _needsSyncAfterModal = false;
        _syncVisuals();
        _notifyUnderlayIfRelevant();
      }
    }
  }

  int _findInitialPage() {
    final coord = widget.controller.recitationCoordinate;
    return MushafProvider.instance.resolveInitialPage(
      surah: coord.$1,
      ayah: coord.$2,
    );
  }

  Future<void> _initMushafData() async {
    await MushafProvider.instance.loadData();
    if (mounted) {
      final initialPage = _findInitialPage();
      _currentPage = initialPage;
      AppState.instance.currentMushafPage.value = _currentPage;
      await _loadCurrentPage(_currentPage);
      if (_pageController.hasClients) {
        _pageController.jumpToPage(_currentPage - 1);
      } else {
        _pageController.dispose();
        _pageController = PageController(initialPage: _currentPage - 1);
      }
      setState(() => _isLoading = false);
    }
  }

  void _debouncedSavePosition(int pageNum, [int? surah, int? ayah]) {
    _savePositionDebounce?.cancel();
    _savePositionDebounce = Timer(const Duration(milliseconds: 400), () {
      if (!mounted || pageNum != _currentPage) return;
      AppState.instance.saveMushafPage(pageNum);
      if (surah != null && ayah != null) {
        AppState.instance.saveLastPosition(surah, ayah);
      }
    });
  }

  @override
  void dispose() {
    _clearPageVisuals(_currentPageObject);
    _pageController.dispose();
    _underlayRepaintTrigger.dispose();
    _overlayRepaintTrigger.dispose();
    _yellowWordsNotifier.dispose();
    AppModalRouteObserver.instance.activeModalsNotifier
        .removeListener(_onModalStateChanged);
    _savePositionDebounce?.cancel();
    widget.controller.removeListener(_onControllerProgress);
    widget.controller.activeAyah.removeListener(_onActiveAyahChanged);
    final app = AppState.instance;
    app.currentMushafPage.removeListener(_onExternalPageChanged);
    app.themeNotifier.removeListener(_onVisualSettingsChanged);
    app.blurModeNotifier.removeListener(_onVisualSettingsChanged);
    app.modeNotifier.removeListener(_onVisualSettingsChanged);
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _advanceToNextSurah(int currentSurah) async {
    if (_isAdvancingSurah || !mounted || !widget.isRecording) return;
    final int nextSurah = currentSurah + 1;
    if (!QuranMetadata.isValidSurah(nextSurah)) return;

    _isAdvancingSurah = true;
    _lastAdvancedSurah = currentSurah;

    try {
      // Same base page-sync rule as every other coordinate move.
      _syncPageFollow(nextSurah, 1);

      await widget.controller.advanceToNextSurah(
        nextSurah: nextSurah,
        isRecording: widget.isRecording,
      );
      _requestSyncVisuals();
    } catch (e) {
      debugPrint('Error advancing to next surah: $e');
    } finally {
      await Future.delayed(const Duration(milliseconds: 300));
      _isAdvancingSurah = false;
    }
  }

  void _onControllerProgress() {
    final provider = MushafProvider.instance;
    final isCoveredOrTransitioning = AppModalRouteObserver.instance.isModalOpen;
    if (!mounted ||
        isCoveredOrTransitioning ||
        _isAdvancingSurah ||
        !provider.isReady) {
      return;
    }

    // NOTE: Page-turn sync is unified in _onActiveAyahChanged (_syncPageFollow).
    // Recitation writes the coordinate into the controller (activeAyah +
    // targetSurah), so it is followed by that one rule.

    final ctrl = widget.controller;
    final (int activeSurah, int? activeAyah) = ctrl.recitationCoordinate;

    // Follow settled coordinate if it changed (e.g. after surah retarget or manual selection)
    if (ctrl.isCoordinateSettled &&
        (activeSurah != _lastHandledSurah || activeAyah != _lastHandledAyah)) {
      _onActiveAyahChanged();
      return;
    }

    // One lead-word resolver for every source: audio cursor, peer's word, or
    // first unread while recording — decided by source priority inside it.
    final int? activeWord = ctrl.getLeadWordIndex(
      surah: activeSurah,
      ayah: activeAyah ?? 0,
      totalWords: 999,
      isRecording: widget.isRecording,
    );
    final int rev = ctrl.globalRevision.value;

    if (activeSurah == _lastProgressSurah &&
        activeAyah == _lastProgressAyah &&
        activeWord == _lastProgressWord &&
        rev == _lastProgressRev) {
      return;
    }
    _lastProgressSurah = activeSurah;
    _lastProgressAyah = activeAyah;
    _lastProgressWord = activeWord;
    _lastProgressRev = rev;

    // Visual synchronization (Unhide recited words live AND update yellow words for Tajweed tooltips)
    _syncVisuals();
    _notifyUnderlayIfRelevant(
      surah: activeSurah,
      ayah: activeAyah,
      lead: activeWord,
      rev: rev,
    );

    if (!widget.isRecording) return;

    // 1. Hands-free recitation flow across Surahs (only when reciting the final ayah of the surah)
    final bool isOnLastAyahOfSurah = activeAyah != null &&
        QuranMetadata.isLastAyahInSurah(activeSurah, activeAyah);
    final bool isLastAyahOfSurahCompleted = isOnLastAyahOfSurah &&
        (ctrl.completedAyahsFor(activeSurah).contains(activeAyah) ||
            ctrl.isSurahFinished(activeSurah));

    if (isOnLastAyahOfSurah && isLastAyahOfSurahCompleted) {
      if (activeSurah < QuranMetadata.maxSurah &&
          _lastAdvancedSurah != activeSurah) {
        _advanceToNextSurah(activeSurah);
        return;
      }
    } else {
      if (_lastAdvancedSurah == activeSurah) {
        _lastAdvancedSurah = null;
      }
    }
  }

  void _onExternalPageChanged() {
    if (!mounted) return;
    final targetPage = AppState.instance.currentMushafPage.value;
    if (targetPage > 0 &&
        targetPage != _currentPage &&
        QuranMetadata.isValidPage(targetPage)) {
      _goToPage(targetPage);
    }
  }

  int? _lastHandledAyah;
  int? _lastHandledSurah;

  void _onActiveAyahChanged() {
    if (!mounted) return;

    // Do NOT process or record coordinate changes while the controller is retargeting.
    // Transient writes (null wipe, engine reset to 1) are merge noise.
    if (!widget.controller.isCoordinateSettled) {
      return;
    }

    final (int activeSurah, int? activeAyah) =
        widget.controller.recitationCoordinate;

    // Guard: skip all work if coord hasn't changed.
    // This prevents redundant FFI calls and word loops on every ASR phoneme tick.
    if (_lastHandledAyah == activeAyah && _lastHandledSurah == activeSurah) {
      return;
    }

    _lastHandledAyah = activeAyah;
    _lastHandledSurah = activeSurah;

    // The one page-sync rule for recitation: whenever activeAyah + targetSurah
    // changes, the mushaf follows it — through ayahs, pages and surahs.
    // A manual page turn never rewrites the coordinate:
    // the newest event wins, each event only applies once, as it is received.
    _syncPageFollow(activeSurah, activeAyah);

    _requestSyncVisuals();
    _notifyUnderlayIfRelevant();
  }

  /// Follows the controller's current coordinate to its page.
  void _syncPageFollow(int surah, int? ayah) {
    // One base rule for every source: never chase the coordinate while the
    // controller is mid-merge — a surah retarget emits transient writes
    // (null wipe, engine reset to ayah 1) through the shared coordinate.
    // The merge's final write re-broadcasts the settled coordinate, which
    // re-triggers this method with the truth.
    if (!widget.controller.isCoordinateSettled) return;
    final provider = MushafProvider.instance;
    if (surah == 0 || ayah == null || !provider.isReady) return;
    if (provider.isAyahOnPage(
      pageNumber: _currentPage,
      surah: surah,
      ayah: ayah,
    )) {
      return;
    }
    final targetPage = provider.getPageForAyah(surah, ayah);
    if (targetPage == null || targetPage == _currentPage) return;
    _navigationTargetAyah = (surah, ayah);
    _goToPage(targetPage);
  }

  void _notifyUnderlayIfRelevant({
    int? surah,
    int? ayah,
    int? lead,
    int? rev,
  }) {
    final ctrl = widget.controller;
    final int s;
    final int? a;
    if (surah != null) {
      s = surah;
      a = ayah;
    } else {
      (s, a) = ctrl.recitationCoordinate;
    }
    final provider = MushafProvider.instance;
    final bool coordOnPage = s != 0 &&
        a != null &&
        provider.isReady &&
        provider.isAyahOnPage(pageNumber: _currentPage, surah: s, ayah: a);
    final int resolvedRev = rev ?? ctrl.globalRevision.value;
    final int? resolvedLead = coordOnPage
        ? (lead ??
            ctrl.getLeadWordIndex(
              surah: s,
              ayah: a,
              totalWords: 999,
              isRecording: widget.isRecording,
            ))
        : null;
    final nextState = (
      onPage: coordOnPage,
      surah: coordOnPage ? s : 0,
      ayah: coordOnPage ? a : null,
      lead: resolvedLead,
      rev: resolvedRev,
      recording: widget.isRecording,
    );
    final bool revChanged = resolvedRev != _lastUnderlayState?.rev;
    final bool wasOnPage = _lastUnderlayState?.onPage ?? false;
    if (_lastUnderlayState != nextState &&
        (coordOnPage || wasOnPage || revChanged)) {
      _lastUnderlayState = nextState;
      _underlayRepaintTrigger.value++;
    } else if (!coordOnPage && !wasOnPage && !revChanged) {
      _lastUnderlayState = nextState;
    }
  }

  void _syncPageSelection(int pageNum) {
    final provider = MushafProvider.instance;
    if (_navigationTargetAyah != null) {
      final target = _navigationTargetAyah!;
      if (provider.isAyahOnPage(
        pageNumber: pageNum,
        surah: target.$1,
        ayah: target.$2,
      )) {
        _navigationTargetAyah = null;
        if (widget.controller.activeAyah.value != target.$2 ||
            widget.controller.targetSurah != target.$1) {
          widget.controller.setManualAyah(target.$1, target.$2);
        }
        return;
      }
    }

    // Manual page turn: the page never rewrites the recitation coordinate —
    // the coordinate belongs to the session (selection, ASR anchor, audio,
    // recitation), the page is only the viewport. Swiping away leaves the anchor
    // in place: the active-ayah band and lead word stay bound to it, and the
    // moment the live source's next word lands, the newest event wins and
    // the view follows it. Clearing here used to orphan the anchor — after
    // swiping back, no coordinate existed to paint, and the highlight only
    // reappeared once the reciter's first word re-created it.

    // Preserve any existing selected ayah and save the page position.
    _debouncedSavePosition(pageNum);
  }

  void _stepPage(int dir) {
    final target = QuranMetadata.clampPage(_currentPage + dir);
    if (target == _currentPage) return;
    _savePositionDebounce?.cancel();
    _navigationTargetAyah = null;
    _goToPage(target);
  }

  void _nextPage() {
    _navigationTargetAyah = null;
    _stepPage(1);
  }

  void _prevPage() {
    _navigationTargetAyah = null;
    _stepPage(-1);
  }

  void _goToPage(int page, {bool animated = true}) {
    _savePositionDebounce?.cancel();
    final clamped = QuranMetadata.clampPage(page);
    if (clamped == _currentPage && _currentPageObject != null) return;

    _currentPage = clamped;
    if (AppState.instance.currentMushafPage.value != clamped) {
      AppState.instance.currentMushafPage.value = clamped;
    }
    MushafProvider.instance.preloadAdjacentPages(
      clamped,
      MushafProvider.instance.lastViewportSize,
    );

    if (_pageController.hasClients) {
      final targetIndex = clamped - 1;
      final currentIndex =
          _pageController.page?.round() ?? _pageController.initialPage;
      if (currentIndex != targetIndex) {
        _isProgrammaticScroll = true;
        final distance = (currentIndex - targetIndex).abs();
        if (animated && distance <= 2) {
          _pageController
              .animateToPage(
                targetIndex,
                duration: const Duration(milliseconds: 280),
                curve: Curves.easeOutCubic,
              )
              .whenComplete(() {
                if (mounted) {
                  _isProgrammaticScroll = false;
                  _settleOnPage(clamped);
                }
              });
          return;
        } else {
          _pageController.jumpToPage(targetIndex);
          _isProgrammaticScroll = false;
          _settleOnPage(clamped);
          return;
        }
      }
    }
    _settleOnPage(clamped);
  }

  void _onPageChangedFromScroll(int index) {
    if (_isProgrammaticScroll) return;
    final targetPage = index + 1;
    if (targetPage == _currentPage) return;
    _currentPage = targetPage;
    if (AppState.instance.currentMushafPage.value != targetPage) {
      AppState.instance.currentMushafPage.value = targetPage;
    }
    MushafProvider.instance.preloadAdjacentPages(
      targetPage,
      MushafProvider.instance.lastViewportSize,
    );
  }

  void _settleOnPage(int pageNumber) {
    if (!mounted) return;
    _syncPageSelection(pageNumber);
    _loadCurrentPage(pageNumber);
    _debouncedSavePosition(pageNumber);
  }

  Future<void> _loadCurrentPage(
    int pageNumber, {
    QvpPage? oldPage,
    bool notify = true,
  }) async {
    final bool alreadyLoaded =
        MushafProvider.instance.getCachedPage(pageNumber) != null;
    var page = MushafProvider.instance.getCachedPage(pageNumber);
    if (page == null || page.isDisposed) {
      page = await MushafProvider.instance.getPage(pageNumber);
      if (!mounted || pageNumber != _currentPage) return;
    }
    _clearPageVisuals(oldPage ?? _currentPageObject);
    _currentPageObject = page;
    _lastUnderlayState = null;
    _syncVisuals();
    _notifyUnderlayIfRelevant();

    if (notify && mounted && !alreadyLoaded) {
      setState(() {});
    }
  }

  void _clearPageVisuals(QvpPage? page) {
    if (page == null || page.isDisposed) return;
    if (_hasMasks) {
      page.unmask();
      _hasMasks = false;
    }
    _lastHiddenWords = const [];
    if (_yellowWordsNotifier.value.isNotEmpty) {
      _yellowWordsNotifier.value = const [];
    }
  }

  // Visual synchronization & recitation highlights
  bool _needsSyncAfterModal = false;

  void _requestSyncVisuals() {
    if (!mounted) return;
    if (AppModalRouteObserver.instance.isModalOpen) {
      _needsSyncAfterModal = true;
      return;
    }
    _syncVisuals();
  }

  void _onVisualSettingsChanged() {
    _syncVisuals();
    _underlayRepaintTrigger.value++;
    _overlayRepaintTrigger.value++;
    if (mounted) {
      setState(() {});
      MushafProvider.instance.preloadAdjacentPages(_currentPage);
    }
  }

  void _syncVisuals() {
    final page = _currentPageObject;
    if (page == null || page.isDisposed || !mounted) return;

    final app = AppState.instance;
    final ctrl = widget.controller;
    final bool isSessionActive = widget.isRecording;
    final bool isBlurEffective =
        app.isBlurEffective(isRecording: isSessionActive);
    final bool needsTajweedTooltip =
        !app.hasClickedTajweedWord && app.currentMode == AppMode.tajweed;

    if (!isBlurEffective &&
        !needsTajweedTooltip &&
        !_hasMasks &&
        _yellowWordsNotifier.value.isEmpty) {
      return;
    }

    final int wordCount = page.words.length;
    final List<int> yellowWords = [];
    final List<int> hiddenWords = [];
    final Set<int> seenAyahsWithYellow = {};

    for (int i = 0; i < wordCount; i++) {
      final w = page.words[i];
      final int state =
          ctrl.getWordStatus(w.ayah, w.word - 1, surah: w.surah) ?? 0;

      if (needsTajweedTooltip && state == 2) {
        final ayahKey = QuranCoordinate.packAyahKey(w.surah, w.ayah);
        if (seenAyahsWithYellow.add(ayahKey)) {
          yellowWords.add(i);
        }
      } else if (isBlurEffective && state == 0) {
        hiddenWords.add(i);
      }
    }

    // Hifz Concealing masks (Native vector invisible ink)
    if (hiddenWords.isNotEmpty) {
      if (!listEquals(_lastHiddenWords, hiddenWords) || !_hasMasks) {
        page.mask(T.words(hiddenWords), 'hide');
        _hasMasks = true;
        _lastHiddenWords = List<int>.from(hiddenWords);
      }
    } else if (_hasMasks || _lastHiddenWords.isNotEmpty) {
      page.unmask();
      _hasMasks = false;
      _lastHiddenWords = const [];
    }

    // Notify Tajweed tooltips
    if (!listEquals(_yellowWordsNotifier.value, yellowWords)) {
      _yellowWordsNotifier.value = yellowWords;
    }
  }

  void _onWordTap(BuildContext context, QvpPage page, int wordIndex) {
    if (wordIndex < 0 || wordIndex >= page.words.length) return;
    int effectiveIndex = wordIndex;
    var w = page.words[effectiveIndex];
    var surah = w.surah;
    var ayah = w.ayah;
    var wordIndex0 = w.word - 1;

    bool isWordYellow(int a, int w0, int s) =>
        widget.controller.isWordYellow(a, w0, surah: s);

    // Proximity snap: if tapped adjacent to a yellow word on the same line, snap to it.
    if (!isWordYellow(ayah, wordIndex0, surah)) {
      if (effectiveIndex > 0 &&
          page.words[effectiveIndex - 1].line == w.line &&
          isWordYellow(
            page.words[effectiveIndex - 1].ayah,
            page.words[effectiveIndex - 1].word - 1,
            page.words[effectiveIndex - 1].surah,
          )) {
        effectiveIndex = effectiveIndex - 1;
        w = page.words[effectiveIndex];
        surah = w.surah;
        ayah = w.ayah;
        wordIndex0 = w.word - 1;
      } else if (effectiveIndex + 1 < page.words.length &&
          page.words[effectiveIndex + 1].line == w.line &&
          isWordYellow(
            page.words[effectiveIndex + 1].ayah,
            page.words[effectiveIndex + 1].word - 1,
            page.words[effectiveIndex + 1].surah,
          )) {
        effectiveIndex = effectiveIndex + 1;
        w = page.words[effectiveIndex];
        surah = w.surah;
        ayah = w.ayah;
        wordIndex0 = w.word - 1;
      }
    }

    QuranInteractionService.handleWordTap(
      context: context,
      surah: surah,
      ayah: ayah,
      wordIndex: wordIndex0,
      wordText: w.text,
      controller: widget.controller,
      isRecording: widget.isRecording,
      onAyahTap: _notifyUnderlayIfRelevant,
    );
  }

  void _onDecorationTap(QvpDecorationInfo dec) {
    if (dec.surah > 0 && dec.ayah > 0) {
      widget.controller.setManualAyah(dec.surah, dec.ayah);
      _notifyUnderlayIfRelevant(surah: dec.surah, ayah: dec.ayah);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final c = app.colors;

    if (_isLoading) {
      return ColoredBox(
        color: c.surface,
        child: const SizedBox.expand(),
      );
    }

    final padding = MediaQuery.paddingOf(context);
    final viewPadding = MediaQuery.viewPaddingOf(context);
    final safeTop = math.max(padding.top, viewPadding.top);
    final safeBottom = math.max(padding.bottom, viewPadding.bottom);
    final safeLeft = math.max(padding.left, viewPadding.left);

    final double topPadding = safeTop > 0 ? safeTop + 4.0 : 8.0;

    final bool isSessionActive = widget.isRecording;

    final double pageLabelBottom =
        isSessionActive ? (safeBottom + 27.0) : (safeBottom + 60.0);

    final double bottomPadding = safeBottom + 74.0;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Focus(
        focusNode: _focusNode,
        autofocus: true,
        onKeyEvent: _controlRLByKeyboard,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double usableHeight = math.max(
                0.0, constraints.maxHeight - topPadding - bottomPadding);
            final bool isWideScreen = constraints.maxWidth > 650;
            final double pageContainerWidth = isWideScreen
                ? math.min(constraints.maxWidth, usableHeight * 0.72)
                : constraints.maxWidth;

            final viewportSize = Size(
              pageContainerWidth,
              usableHeight,
            );
            if (MushafProvider.instance.lastViewportSize != viewportSize) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) {
                  MushafProvider.instance.lastViewportSize = viewportSize;
                }
              });
            }

            final double pageLabelLeft =
                isWideScreen && constraints.maxWidth > pageContainerWidth
                    ? ((constraints.maxWidth - pageContainerWidth) / 2 + 16.0)
                    : (safeLeft + 16.0);

            return Listener(
              onPointerSignal: _onPointerSignal,
              child: Stack(
                children: [
                  Padding(
                    padding:
                        EdgeInsets.only(top: topPadding, bottom: bottomPadding),
                    child: Center(
                      child: SizedBox(
                        width: pageContainerWidth,
                        height: usableHeight,
                        child: NotificationListener<ScrollNotification>(
                          onNotification: (notification) {
                            if (notification is ScrollStartNotification) {
                              MushafProvider.instance.isPageScrolling.value =
                                  true;
                            } else if (notification is ScrollEndNotification) {
                              _onScrollEnd();
                            } else if (notification is UserScrollNotification) {
                              if (notification.direction ==
                                  ScrollDirection.idle) {
                                _onScrollEnd();
                              } else {
                                MushafProvider.instance.isPageScrolling.value =
                                    true;
                              }
                            }
                            return false;
                          },
                          child: PageView.builder(
                            controller: _pageController,
                            itemCount: QuranMetadata.maxPage,
                            padEnds: false,
                            physics: const ClampingScrollPhysics(),
                            onPageChanged: _onPageChangedFromScroll,
                            itemBuilder: (context, index) =>
                                _buildPageItem(context, index + 1),
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (widget.showBottomPageNumber)
                    Positioned(
                      left: pageLabelLeft,
                      bottom: pageLabelBottom,
                      child: ValueListenableBuilder<int>(
                        valueListenable: AppState.instance.currentMushafPage,
                        builder: (context, currentPage, _) {
                          final int page =
                              currentPage > 0 ? currentPage : _currentPage;
                          return Text(
                            QuranTypography.toArabicDigits(page),
                            textDirection: TextDirection.rtl,
                            textScaler: TextScaler.noScaling,
                            style: TextStyle(
                              fontFamily: 'cairo',
                              fontSize: 10.5,
                              fontWeight: FontWeight.w600,
                              color: c.textSecondary,
                              height: 1.0,
                            ),
                          );
                        },
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  /// Builds a single page item inside the horizontal train strip.
  Widget _buildPageItem(BuildContext context, int pageNum) {
    return _MushafPageItem(
      key: ValueKey<int>(pageNum),
      pageNum: pageNum,
      isCurrent: pageNum == _currentPage,
      controller: widget.controller,
      isRecording: widget.isRecording,
      yellowWordsNotifier: _yellowWordsNotifier,
      underlayRepaintListenable: _underlayRepaintListenable,
      overlayRepaintListenable: _overlayRepaintListenable,
      onWordTap: (ctx, page, wordIdx) => _onWordTap(ctx, page, wordIdx),
      onDecorationTap: (dec) => _onDecorationTap(dec),
    );
  }
}

/// Autonomous single-page host within the horizontal PageView.
///
/// Resolves and loads its own [QvpPage] independently from the parent view.
/// When the page decodes off-thread, this widget triggers its own local [setState],
/// eliminating race conditions, dropped rebuilds, and stuck blank white pages.
class _MushafPageItem extends StatefulWidget {
  final int pageNum;
  final bool isCurrent;
  final HighlightingController controller;
  final bool isRecording;
  final ValueListenable<List<int>> yellowWordsNotifier;
  final Listenable underlayRepaintListenable;
  final Listenable overlayRepaintListenable;
  final void Function(BuildContext context, QvpPage page, int wordIndex) onWordTap;
  final void Function(QvpDecorationInfo dec) onDecorationTap;

  const _MushafPageItem({
    super.key,
    required this.pageNum,
    required this.isCurrent,
    required this.controller,
    required this.isRecording,
    required this.yellowWordsNotifier,
    required this.underlayRepaintListenable,
    required this.overlayRepaintListenable,
    required this.onWordTap,
    required this.onDecorationTap,
  });

  @override
  State<_MushafPageItem> createState() => _MushafPageItemState();
}

class _MushafPageItemState extends State<_MushafPageItem>
    with AutomaticKeepAliveClientMixin {
  QvpPage? _page;
  bool _isLoading = false;
  late final QvpViewController _pageViewCtrl = QvpViewController();

  @override
  bool get wantKeepAlive {
    final cur = AppState.instance.currentMushafPage.value;
    return (widget.pageNum - cur).abs() <= 2;
  }

  @override
  void initState() {
    super.initState();
    AppState.instance.currentMushafPage.addListener(_onPageWindowChanged);
    _resolvePage();
  }

  void _onPageWindowChanged() {
    if (mounted) {
      updateKeepAlive();
    }
  }

  @override
  void dispose() {
    AppState.instance.currentMushafPage.removeListener(_onPageWindowChanged);
    _pageViewCtrl.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(_MushafPageItem oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.pageNum != widget.pageNum) {
      _resolvePage();
    } else if (_page != null && _page!.isDisposed) {
      _resolvePage();
    }
    if (oldWidget.isCurrent != widget.isCurrent) {
      updateKeepAlive();
    }
  }

  void _resolvePage() {
    final cached = MushafProvider.instance.getCachedPage(widget.pageNum);
    if (cached != null && !cached.isDisposed) {
      _page = cached;
      _isLoading = false;
      return;
    }

    _isLoading = true;
    _page = null;
    MushafProvider.instance.getPage(widget.pageNum).then((p) {
      if (!mounted) return;
      if (p != null && !p.isDisposed) {
        setState(() {
          _page = p;
          _isLoading = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    var page = _page;
    if (page == null || page.isDisposed) {
      final cached = MushafProvider.instance.getCachedPage(widget.pageNum);
      if (cached != null && !cached.isDisposed) {
        page = cached;
        _page = cached;
        _isLoading = false;
      }
    }

    final c = AppState.instance.colors;
    if (page == null || page.isDisposed) {
      if (!_isLoading) {
        _resolvePage();
      }
      return ColoredBox(color: c.surface);
    }

    return Stack(
      clipBehavior: Clip.hardEdge,
      children: [
        Positioned.fill(
          child: IgnorePointer(
            child: RepaintBoundary(
              child: CustomPaint(
                painter: _MushafUnderlayPainter(
                  page: page,
                  viewCtrl: _pageViewCtrl,
                  controller: widget.controller,
                  isRecording: widget.isRecording,
                  repaint: widget.underlayRepaintListenable,
                ),
              ),
            ),
          ),
        ),
        QvpPageView(
          page: page,
          controller: _pageViewCtrl,
          panZoomEnabled: false,
          selectionEnabled: false,
          layout: MushafProvider.mushafLayout,
          hitMaxDistance: 28.0,
          paper: null,
          paperShadow: false,
          defaultInk: c.text,
          onSwipe: null, // Critical: let outer PageView drive horizontal motion
          onWordTap: (word, _) => widget.onWordTap(context, page!, word.index),
          onDecorationTap: (dec, _) => widget.onDecorationTap(dec),
        ),
        Positioned.fill(
          child: IgnorePointer(
            child: RepaintBoundary(
              child: CustomPaint(
                painter: _MushafOverlayPainter(
                  page: page,
                  viewCtrl: _pageViewCtrl,
                  controller: widget.controller,
                  isRecording: widget.isRecording,
                  yellowWordsNotifier: widget.yellowWordsNotifier,
                  repaint: widget.overlayRepaintListenable,
                ),
              ),
            ),
          ),
        ),
        const _PageGutterShadow(isLeftEdge: true),
        const _PageGutterShadow(isLeftEdge: false),
      ],
    );
  }
}

/// Subtle vertical gradient shadow along page edges mimicking physical paper depth (book gutter seam).
class _PageGutterShadow extends StatelessWidget {
  final bool isLeftEdge;
  const _PageGutterShadow({required this.isLeftEdge});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      bottom: 0,
      left: isLeftEdge ? 0 : null,
      right: isLeftEdge ? null : 0,
      width: 14.0,
      child: IgnorePointer(
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: isLeftEdge ? Alignment.centerLeft : Alignment.centerRight,
              end: isLeftEdge ? Alignment.centerRight : Alignment.centerLeft,
              colors: [
                Colors.black.withValues(alpha: 0.07),
                Colors.black.withValues(alpha: 0.02),
                Colors.transparent,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MushafUnderlayPainter extends CustomPainter {
  final QvpPage page;
  final QvpViewController viewCtrl;
  final HighlightingController controller;
  final bool isRecording;

  _MushafUnderlayPainter({
    required this.page,
    required this.viewCtrl,
    required this.controller,
    required this.isRecording,
    required Listenable repaint,
  }) : super(repaint: Listenable.merge([repaint, viewCtrl]));

  @override
  void paint(Canvas canvas, Size size) {
    if (page.isDisposed) return;
    final scale = viewCtrl.scale != 1.0 || (viewCtrl.offsetX != 0 || viewCtrl.offsetY != 0)
        ? viewCtrl.scale
        : (page.currentLayout?.fitScale ?? 1.0);
    final offsetX = (viewCtrl.offsetX != 0 || viewCtrl.offsetY != 0)
        ? viewCtrl.offsetX
        : (page.currentLayout?.fitX.roundToDouble() ?? 0.0);
    final offsetY = (viewCtrl.offsetX != 0 || viewCtrl.offsetY != 0)
        ? viewCtrl.offsetY
        : (page.currentLayout?.fitY.roundToDouble() ?? 0.0);

    canvas.save();
    canvas.translate(offsetX, offsetY);
    canvas.scale(scale);
    try {
      final app = AppState.instance;
      MushafOverlays.paintSurahHeaders(
        canvas,
        page,
        page.currentLayout,
        isDark: app.isDarkMode,
        colors: app.colors,
      );
      MushafOverlays.paintAyahHighlights(
        canvas,
        page,
        page.currentLayout,
        controller: controller,
        app: app,
        isRecording: isRecording,
      );
    } finally {
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_MushafUnderlayPainter oldDelegate) =>
      oldDelegate.page != page ||
      oldDelegate.isRecording != isRecording;
}

class _MushafOverlayPainter extends CustomPainter {
  final QvpPage page;
  final QvpViewController viewCtrl;
  final HighlightingController controller;
  final bool isRecording;
  final ValueListenable<List<int>> yellowWordsNotifier;

  _MushafOverlayPainter({
    required this.page,
    required this.viewCtrl,
    required this.controller,
    required this.isRecording,
    required this.yellowWordsNotifier,
    required Listenable repaint,
  }) : super(repaint: Listenable.merge([repaint, viewCtrl, yellowWordsNotifier]));

  @override
  void paint(Canvas canvas, Size size) {
    if (page.isDisposed) return;
    final scale = viewCtrl.scale != 1.0 || (viewCtrl.offsetX != 0 || viewCtrl.offsetY != 0)
        ? viewCtrl.scale
        : (page.currentLayout?.fitScale ?? 1.0);
    final offsetX = (viewCtrl.offsetX != 0 || viewCtrl.offsetY != 0)
        ? viewCtrl.offsetX
        : (page.currentLayout?.fitX.roundToDouble() ?? 0.0);
    final offsetY = (viewCtrl.offsetX != 0 || viewCtrl.offsetY != 0)
        ? viewCtrl.offsetY
        : (page.currentLayout?.fitY.roundToDouble() ?? 0.0);

    canvas.save();
    canvas.translate(offsetX, offsetY);
    canvas.scale(scale);
    try {
      final app = AppState.instance;
      final c = app.colors;

      MushafOverlays.paintWordColorHighlights(
        canvas,
        page,
        page.currentLayout,
        controller: controller,
        app: app,
        isRecording: isRecording,
      );

      if (!app.hasClickedTajweedWord &&
          app.currentMode == AppMode.tajweed &&
          yellowWordsNotifier.value.isNotEmpty) {
        MushafOverlays.paintTajweedTooltip(
          canvas,
          size,
          page,
          page.currentLayout,
          app: app,
          goldColor: c.gold,
          yellowWords: yellowWordsNotifier.value,
        );
      }
    } finally {
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_MushafOverlayPainter oldDelegate) =>
      oldDelegate.page != page ||
      oldDelegate.isRecording != isRecording;
}
