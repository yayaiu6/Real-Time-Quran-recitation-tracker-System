import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:super_sliver_list/super_sliver_list.dart';
import '../core/highlighting_controller.dart';
import '../core/app_state.dart';
import '../ui/widgets/dialogs/dialog_service.dart';
import '../mushaf/mushaf_provider.dart';
import 'verse_row.dart';

/// Self-contained, high-performance verse row list view with hardware-vsync
/// auto-scrolling, eye-horizon viewport management, and tactile navigation.
class VerseListView extends StatefulWidget {
  final HighlightingController controller;
  final bool isRecording;
  final VoidCallback onToggleRecord;
  final ValueChanged<bool>? onAutoScrollChanged;

  const VerseListView({
    super.key,
    required this.controller,
    required this.isRecording,
    required this.onToggleRecord,
    this.onAutoScrollChanged,
  });

  @override
  State<VerseListView> createState() => VerseListViewState();
}

class VerseListViewState extends State<VerseListView>
    with SingleTickerProviderStateMixin {
  final ScrollController _scroll = ScrollController();
  final ListController _listController = ListController();
  final Map<int, GlobalKey> _keys = {};

  List<QuranVerse>? _cachedDisplayVerses;
  int? _lastAyah;
  int? _lastSurah;

  bool _isAutoScrolling = false;
  Ticker? _autoScrollTicker;
  Duration? _lastAutoScrollElapsed;
  double _currentAutoScrollVelocity = 0.0;
  bool _isUserDragging = false;
  DateTime? _lastScrollTime;

  bool get isAutoScrolling => _isAutoScrolling;

  List<QuranVerse> get _displayVerses {
    if (_cachedDisplayVerses == null ||
        _cachedDisplayVerses!.isEmpty ||
        _cachedDisplayVerses!.first.surah != widget.controller.targetSurah) {
      _cachedDisplayVerses =
          widget.controller.repository.getSurah(widget.controller.targetSurah);
    }
    return _cachedDisplayVerses!;
  }

  @override
  void initState() {
    super.initState();
    VerseRow.ensureWordsLoaded().then((_) {
      if (mounted) setState(() {});
    });
    _autoScrollTicker = createTicker(_onAutoScrollTick);
    _lastSurah = widget.controller.targetSurah;
    _lastAyah =
        widget.controller.activeAyah.value ?? AppState.instance.lastAyah;

    widget.controller.addListener(_onControllerUpdate);
    widget.controller.activeAyah.addListener(_onActiveAyahChanged);

    // Initial position alignment
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final targetAyah =
            widget.controller.activeAyah.value ?? AppState.instance.lastAyah;
        _ensureAyahVisibleSmart(targetAyah, isManualTap: true);
      }
    });
  }

  @override
  void dispose() {
    if (_isAutoScrolling) {
      widget.onAutoScrollChanged?.call(false);
    }
    _autoScrollTicker?.dispose();
    _scroll.dispose();
    _keys.clear();
    widget.controller.removeListener(_onControllerUpdate);
    widget.controller.activeAyah.removeListener(_onActiveAyahChanged);
    super.dispose();
  }

  @override
  void didUpdateWidget(VerseListView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isRecording && !oldWidget.isRecording) {
      AppState.instance.dismissBanner();
      final int targetAyah =
          widget.controller.currentMatchedVerse?.verse.ayah ??
              widget.controller.activeAyah.value ??
              1;
      _lastAyah = targetAyah;
      _ensureAyahVisibleSmart(targetAyah);
    }
  }

  void _onControllerUpdate() {
    if (widget.controller.targetSurah != _lastSurah) {
      void applyUpdate() {
        if (!mounted) return;
        setState(() {
          _lastSurah = widget.controller.targetSurah;
          _cachedDisplayVerses = null;
          _keys.clear();
          _lastAyah = null;
        });

        if (_scroll.hasClients) {
          _scroll.jumpTo(0);
        }
      }

      if (SchedulerBinding.instance.schedulerPhase ==
          SchedulerPhase.persistentCallbacks) {
        SchedulerBinding.instance.addPostFrameCallback((_) => applyUpdate());
      } else {
        applyUpdate();
      }
    }
  }

  void _onActiveAyahChanged() {
    final active = widget.controller.activeAyah.value;
    if (active != null && active != _lastAyah) {
      _lastAyah = active;
      AppState.instance.saveLastPosition(widget.controller.targetSurah, active);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _ensureAyahVisibleSmart(active);
        }
      });
    }
  }

  // ── Safe Viewport Calculation ──────────────────────────────────────────────
  ({double upperSafeY, double lowerSafeY, double screenHeight})
      _getSafeViewportBounds() {
    final Size size = MediaQuery.sizeOf(context);
    final EdgeInsets padding = MediaQuery.paddingOf(context);
    final double screenHeight = size.height;
    final double topPadding = padding.top;
    final double bottomPadding = padding.bottom;
    final bool isFullscreenMode = widget.isRecording || _isAutoScrolling;

    final double topObstruction =
        isFullscreenMode ? (topPadding + 10.0) : (topPadding + 16.0);

    double bottomBarHeight = 68.0;
    if (AppState.instance.isBannerVisible) {
      bottomBarHeight += 58.0;
    }
    final double bottomObstruction = bottomPadding + bottomBarHeight;

    final double upperSafeY = topObstruction + 10.0;
    final double lowerSafeY = (screenHeight - bottomObstruction - 6.0).clamp(
      upperSafeY + 100.0,
      screenHeight,
    );

    return (
      upperSafeY: upperSafeY,
      lowerSafeY: lowerSafeY,
      screenHeight: screenHeight,
    );
  }

  // ── Smart Eye-Horizon Ayah Visibility ──────────────────────────────────────
  void _ensureAyahVisibleSmart(int ayah, {bool isManualTap = false}) {
    if (!_scroll.hasClients || _isAutoScrolling) return;
    if (_isUserDragging && !isManualTap) return;

    final bounds = _getSafeViewportBounds();
    final upperSafeY = bounds.upperSafeY;
    final lowerSafeY = bounds.lowerSafeY;
    final screenHeight = bounds.screenHeight;

    final double targetGazeY = screenHeight > 0
        ? (screenHeight * 0.25).clamp(upperSafeY + 32.0, lowerSafeY - 100.0)
        : upperSafeY + 32.0;

    final renderBox =
        _keys[ayah]?.currentContext?.findRenderObject() as RenderBox?;

    if (renderBox != null && renderBox.hasSize && renderBox.attached) {
      final Offset globalPos = renderBox.localToGlobal(Offset.zero);
      final double ayahTop = globalPos.dy;
      final double ayahHeight = renderBox.size.height;
      final double ayahBottom = ayahTop + ayahHeight;

      if (isManualTap && ayahBottom >= upperSafeY && ayahTop <= lowerSafeY) {
        return;
      }

      if (ayahTop < upperSafeY) {
        final double delta = ayahTop - targetGazeY;
        _smoothScrollByDelta(delta);
        return;
      }

      if (ayahTop >= upperSafeY && ayahBottom <= lowerSafeY) {
        return;
      }

      if (isManualTap &&
          ayahTop >= upperSafeY &&
          ayahTop <= (lowerSafeY - 24.0)) {
        return;
      }

      final double visibleHeight =
          (lowerSafeY - ayahTop).clamp(0.0, ayahHeight);
      final double visibleRatio =
          ayahHeight > 0 ? (visibleHeight / ayahHeight) : 1.0;

      if (ayahTop >= upperSafeY && visibleRatio >= 0.60) {
        return;
      }

      final double delta = ayahTop - targetGazeY;
      _smoothScrollByDelta(delta);
      return;
    }

    final double targetAlignment =
        screenHeight > 0 ? (targetGazeY / screenHeight).clamp(0.0, 1.0) : 0.25;

    _lastScrollTime = DateTime.now();
    _listController.animateToItem(
      index: ayah,
      scrollController: _scroll,
      alignment: targetAlignment,
      rect: const Rect.fromLTWH(0, 0, 10, 10),
      duration: (_) => const Duration(milliseconds: 340),
      curve: (_) => Curves.easeOutCubic,
    );
  }

  void _smoothScrollByDelta(double delta) {
    if (!_scroll.hasClients || delta.abs() < 4.0) return;

    final double targetPixels = (_scroll.position.pixels + delta).clamp(
      0.0,
      _scroll.position.maxScrollExtent,
    );

    if ((targetPixels - _scroll.position.pixels).abs() < 4.0) return;

    _lastScrollTime = DateTime.now();
    _scroll.animateTo(
      targetPixels,
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

  void _maintainWordInEyeView(int ayah, int wordIndex, Rect globalWordRect) {
    if (_isAutoScrolling || _isUserDragging || !_scroll.hasClients) {
      return;
    }

    if (_lastScrollTime != null &&
        DateTime.now().difference(_lastScrollTime!).inMilliseconds < 350) {
      return;
    }

    final int? activeAyah = widget.controller.activeAyah.value;
    if (activeAyah == null || ayah != activeAyah) {
      return;
    }

    final bounds = _getSafeViewportBounds();
    final upperSafeY = bounds.upperSafeY;
    final lowerSafeY = bounds.lowerSafeY;

    if (lowerSafeY <= upperSafeY) return;

    final double wordTop = globalWordRect.top;
    final double wordBottom = globalWordRect.bottom;

    if (wordTop >= upperSafeY && wordBottom <= lowerSafeY) {
      return;
    }

    if (wordBottom > lowerSafeY) {
      final double delta = (wordBottom - lowerSafeY) + 36.0;
      _smoothScrollByDelta(delta);
      return;
    }

    if (wordTop < upperSafeY) {
      final double delta = wordTop - (upperSafeY + 16.0);
      _smoothScrollByDelta(delta);
      return;
    }
  }

  // ── Auto-Scroll Teleprompter Engine ────────────────────────────────────────
  void toggleAutoScroll() {
    if (_isAutoScrolling) {
      stopAutoScrolling();
    } else {
      if (!AppState.instance.hasChosenAutoScrollSpeed && mounted) {
        DialogService.showSpeedSelection(
          context,
          onSpeedSelected: () {
            AppState.instance.setHasChosenAutoScrollSpeed(true);
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted && !_isAutoScrolling) {
                startAutoScrolling();
              }
            });
          },
        );
        return;
      }

      startAutoScrolling();
    }
  }

  void startAutoScrolling() {
    widget.controller.clearHighlights();
    widget.controller.finalize();
    setState(() => _isAutoScrolling = true);
    widget.onAutoScrollChanged?.call(true);

    _lastAutoScrollElapsed = null;
    _currentAutoScrollVelocity = 0.0;
    _autoScrollTicker ??= createTicker(_onAutoScrollTick);
    if (!_autoScrollTicker!.isTicking) {
      _autoScrollTicker!.start();
    }
  }

  void stopAutoScrolling() {
    _autoScrollTicker?.stop();
    _lastAutoScrollElapsed = null;
    _currentAutoScrollVelocity = 0.0;
    if (_isAutoScrolling) {
      setState(() => _isAutoScrolling = false);
      widget.onAutoScrollChanged?.call(false);
    }
  }

  void _onAutoScrollTick(Duration elapsed) {
    if (!_isAutoScrolling || !mounted || !_scroll.hasClients) {
      stopAutoScrolling();
      return;
    }

    if (_lastAutoScrollElapsed == null) {
      _lastAutoScrollElapsed = elapsed;
      return;
    }

    final double dt =
        (elapsed - _lastAutoScrollElapsed!).inMicroseconds / 1000000.0;
    _lastAutoScrollElapsed = elapsed;

    if (dt <= 0.0 || dt > 0.1) return;

    final position = _scroll.position;
    final double max = position.maxScrollExtent;
    final double current = position.pixels;

    if (current >= max - 0.5) {
      stopAutoScrolling();
      return;
    }

    final double baseSpeed =
        ((AppState.instance.fontSize / 24.0) * 1.5) * (16.0 / 50.0);
    final speedMultipliers = AppState.autoScrollMultipliers;
    final int speedIndex = AppState.instance.autoScrollSpeed.clamp(
      0,
      speedMultipliers.length - 1,
    );
    final double targetPixelsPerSec =
        baseSpeed * speedMultipliers[speedIndex] * 60.0;

    final double blend = (1.0 - math.exp(-7.5 * dt)).clamp(0.0, 1.0);
    _currentAutoScrollVelocity +=
        (targetPixelsPerSec - _currentAutoScrollVelocity) * blend;

    final double delta = _currentAutoScrollVelocity * dt;
    final double nextOffset = (current + delta).clamp(0.0, max);

    if (nextOffset != current) {
      _scroll.jumpTo(nextOffset);
    }
  }

  // ── Surah Navigation ───────────────────────────────────────────────────────
  void _navigateToSurah(int newSurah) async {
    if (!QuranMetadata.isValidSurah(newSurah)) return;

    if (widget.isRecording) {
      widget.onToggleRecord();
    }
    if (_isAutoScrolling) {
      stopAutoScrolling();
    }
    if (_scroll.hasClients) {
      _scroll.jumpTo(0);
    }

    await widget.controller.setTargetSurah(newSurah);
    widget.controller.setManualAyah(newSurah, 1);
    AppState.instance.saveLastPosition(newSurah, 1);
    final mappedPage = MushafProvider.instance.getPageForAyah(newSurah, 1);
    if (mappedPage != null) {
      AppState.instance.saveMushafPage(mappedPage);
    }

    if (mounted) {
      setState(() {
        _lastAyah = null;
        _cachedDisplayVerses = null;
        _keys.clear();
      });
    }
  }

  void _scrollToTop() {
    if (_isAutoScrolling) {
      stopAutoScrolling();
    }
    if (_scroll.hasClients) {
      _scroll.animateTo(
        0,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeOutCubic,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final c = app.colors;
    final top = MediaQuery.paddingOf(context).top;
    final displayVerses = _displayVerses;
    final bool isFullscreenMode = widget.isRecording || _isAutoScrolling;
    final topPadding = isFullscreenMode ? top + 10.0 : top + 16.0;
    final double bottomSafeArea = MediaQuery.paddingOf(context).bottom;
    final double bottomClearance =
        bottomSafeArea + (isFullscreenMode ? 72.0 : 96.0);

    return NotificationListener<ScrollNotification>(
      onNotification: (notification) {
        if (notification is ScrollStartNotification &&
            notification.dragDetails != null) {
          _isUserDragging = true;
        } else if (notification is ScrollEndNotification) {
          _isUserDragging = false;
        }
        return false;
      },
      child: CustomScrollView(
        controller: _scroll,
        physics: _isAutoScrolling
            ? const NeverScrollableScrollPhysics()
            : const AlwaysScrollableScrollPhysics(),
        slivers: [
          SuperSliverList(
            listController: _listController,
            delegate: SliverChildBuilderDelegate(
              (_, i) {
                if (i == 0) {
                  return SizedBox(height: topPadding);
                }

                if (i == displayVerses.length + 2) {
                  return SizedBox(height: bottomClearance);
                }

                if (i == displayVerses.length + 1) {
                  return _buildEndOfSurahSection(c, app);
                }

                final v = displayVerses[i - 1];

                return RepaintBoundary(
                  key: _keys.putIfAbsent(v.ayah, () => GlobalKey()),
                  child: VerseRow(
                    key: ValueKey('verse_${v.surah}_${v.ayah}'),
                    verse: v,
                    controller: widget.controller,
                    isRecording: widget.isRecording,
                    isAutoScrolling: _isAutoScrolling,
                    onTap: () {
                      _lastAyah = v.ayah;
                      final mapped = MushafProvider.instance
                          .getPageForAyah(v.surah, v.ayah);
                      if (mapped != null) {
                        AppState.instance.saveMushafPage(mapped);
                      }
                      _ensureAyahVisibleSmart(v.ayah, isManualTap: true);
                    },
                    onWordErrorTap: null,
                    onActiveWordPositioned: _maintainWordInEyeView,
                  ),
                );
              },
              childCount: displayVerses.length + 3,
            ),
          ),
        ],
      ),
    );
  }

  // ── End of Surah Navigation Section ────────────────────────────────────────
  Widget _buildEndOfSurahSection(ThemeColors c, AppState app) {
    final int currentSurah = widget.controller.targetSurah;
    final bool hasPrev = currentSurah > QuranMetadata.minSurah;
    final bool hasNext = currentSurah < QuranMetadata.maxSurah;
    final bool isAr = app.isArabic;
    final bool isDark = app.isDarkMode;

    final Color cardBg = isDark
        ? c.surfaceHigh.withValues(alpha: 0.75)
        : Colors.white.withValues(alpha: 0.92);

    return Padding(
      padding: const EdgeInsets.only(top: 24.0, bottom: 8.0),
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 290),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: (isDark ? Colors.white : Colors.black)
                  .withValues(alpha: isDark ? 0.12 : 0.08),
              width: 1.0,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.06),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: Row(
              children: [
                Expanded(
                  child: _buildSurahNavButton(
                    icon: Icons.chevron_left_rounded,
                    label: isAr ? 'التالية' : 'Next',
                    isEnabled: hasNext,
                    iconOnLeft: true,
                    c: c,
                    isDark: isDark,
                    onTap: () => _navigateToSurah(currentSurah + 1),
                  ),
                ),
                Container(
                  width: 1,
                  height: 14,
                  color: (isDark ? Colors.white : Colors.black)
                      .withValues(alpha: isDark ? 0.14 : 0.08),
                ),
                Expanded(
                  child: _buildSurahNavButton(
                    icon: Icons.arrow_upward_rounded,
                    label: isAr ? 'للأعلى' : 'Top',
                    isEnabled: true,
                    iconOnLeft: true,
                    c: c,
                    isDark: isDark,
                    onTap: _scrollToTop,
                  ),
                ),
                Container(
                  width: 1,
                  height: 14,
                  color: (isDark ? Colors.white : Colors.black)
                      .withValues(alpha: isDark ? 0.14 : 0.08),
                ),
                Expanded(
                  child: _buildSurahNavButton(
                    icon: Icons.chevron_right_rounded,
                    label: isAr ? 'السابقة' : 'Previous',
                    isEnabled: hasPrev,
                    iconOnLeft: false,
                    c: c,
                    isDark: isDark,
                    onTap: () => _navigateToSurah(currentSurah - 1),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSurahNavButton({
    required IconData icon,
    required String label,
    required bool isEnabled,
    required bool iconOnLeft,
    required ThemeColors c,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    final Color textColor =
        !isEnabled ? c.muted.withValues(alpha: 0.35) : c.text;
    final Color iconColor =
        !isEnabled ? c.muted.withValues(alpha: 0.35) : c.textSecondary;

    final Widget iconWidget = Icon(icon, size: 15, color: iconColor);
    final Widget textWidget = Text(
      label,
      style: TextStyle(
        fontFamily: null,
        fontSize: 11.0,
        fontWeight: FontWeight.w600,
        color: textColor,
        height: 1.0,
      ),
    );

    final Widget content = Container(
      height: 32,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: iconOnLeft
              ? [
                  iconWidget,
                  const SizedBox(width: 3),
                  textWidget,
                ]
              : [
                  textWidget,
                  const SizedBox(width: 3),
                  iconWidget,
                ],
        ),
      ),
    );

    if (!isEnabled) {
      return Opacity(opacity: 0.35, child: content);
    }

    return _TactileScaleButton(
      onTap: onTap,
      child: content,
    );
  }
}

class _TactileScaleButton extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  const _TactileScaleButton({required this.child, required this.onTap});

  @override
  State<_TactileScaleButton> createState() => _TactileScaleButtonState();
}

class _TactileScaleButtonState extends State<_TactileScaleButton> {
  bool _isDown = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isDown = true),
      onTapUp: (_) => setState(() => _isDown = false),
      onTapCancel: () => setState(() => _isDown = false),
      onTap: widget.onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedScale(
        scale: _isDown ? 0.92 : 1.0,
        duration: const Duration(milliseconds: 120),
        curve: _isDown ? Curves.easeOutQuad : Curves.easeOutCubic,
        child: widget.child,
      ),
    );
  }
}
