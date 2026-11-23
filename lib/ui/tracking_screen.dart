import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';

import '../core/highlighting_controller.dart';
import '../core/platform_utils.dart';
import 'widgets/dialogs/dialog_service.dart';
import '../core/app_state.dart';
import 'widgets/mic_bar.dart';
import '../mushaf/mushaf_view.dart';
import '../verse_list/verse_list_view.dart';

/// Main interactive screen for real-time recitation tracking and reading.
/// Supports high-performance vector Mushaf and dedicated Verse List modes.
class TrackingScreen extends StatefulWidget {
  final HighlightingController controller;
  final bool isRecording;
  final bool isVoiceSearching;
  final String voiceSearchText;
  final ValueListenable<String>? voiceSearchTextNotifier;
  final VoidCallback onToggleRecord;
  final VoidCallback onVoiceSearchToggle;
  final bool isLoadingEngine;
  final ValueNotifier<bool>? isVoiceSearchLoading;
  final VoiceSearchController? voiceSearchController;
  final void Function(int surah, int ayah)? onSelectVoiceCandidate;
  final ValueChanged<bool>? onVoiceSearchHoldChanged;
  final VoidCallback onClearBuffer;

  const TrackingScreen({
    super.key,
    required this.controller,
    required this.isRecording,
    required this.isVoiceSearching,
    this.voiceSearchText = '',
    this.voiceSearchTextNotifier,
    this.voiceSearchController,
    this.onSelectVoiceCandidate,
    this.onVoiceSearchHoldChanged,
    required this.onToggleRecord,
    required this.onVoiceSearchToggle,
    this.isLoadingEngine = false,
    this.isVoiceSearchLoading,
    required this.onClearBuffer,
  });

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen>
    with TickerProviderStateMixin, WidgetsBindingObserver {
  final ValueNotifier<String> _voiceSearchNotifier = ValueNotifier('');
  final GlobalKey<VerseListViewState> _verseListKey =
      GlobalKey<VerseListViewState>();
  final ValueNotifier<bool> _isAutoScrolling = ValueNotifier<bool>(false);
  late final ValueNotifier<int> _surahNotifier;

  AppBannerInfo? _lastBanner;
  int? _lastAyah;
  int? _lastSurah;
  late final Listenable _screenThemeLanguageListenable;
  late final Listenable _bottomBarListenable;

  @override
  void initState() {
    super.initState();
    final app = AppState.instance;
    _surahNotifier = ValueNotifier<int>(_effectiveSurah);
    _screenThemeLanguageListenable = Listenable.merge([
      app.themeNotifier,
      app.languageNotifier,
      app.mushafModeNotifier,
    ]);
    _bottomBarListenable = Listenable.merge([
      app.themeNotifier,
      app.languageNotifier,
      app.blurModeNotifier,
      app.modeNotifier,
      _surahNotifier,
    ]);
    if (!PlatformCapabilities.isWeb) {
      WidgetsBinding.instance.addObserver(this);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    }
    widget.controller.addListener(_onControllerUpdate);
    widget.controller.activeAyah.addListener(_onActiveAyahChanged);
    AppState.instance.mushafModeNotifier.addListener(_onMushafModeChanged);
    AppState.instance.currentMushafPage.addListener(_onMushafPageChanged);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (PlatformCapabilities.isWeb) return;

    final bool isDesktop = PlatformCapabilities.isDesktop;

    if (state == AppLifecycleState.detached) {
      if (widget.isRecording) widget.onToggleRecord();
      if (widget.isVoiceSearching) widget.onVoiceSearchToggle();
      return;
    }

    if (!isDesktop) {
      if (state == AppLifecycleState.resumed) {
        // Re-assert immersive sticky fullscreen mode whenever app regains focus or is resumed
        SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      } else if (state == AppLifecycleState.paused ||
          state == AppLifecycleState.inactive ||
          state == AppLifecycleState.hidden) {
        // Microphone recording and voice search are suspended.
        if (widget.isRecording) {
          widget.onToggleRecord();
        }
        if (widget.isVoiceSearching) {
          widget.onVoiceSearchToggle();
        }
      }
    }
  }

  @override
  void dispose() {
    if (!PlatformCapabilities.isWeb) {
      WidgetsBinding.instance.removeObserver(this);
    }
    widget.controller.removeListener(_onControllerUpdate);
    widget.controller.activeAyah.removeListener(_onActiveAyahChanged);
    AppState.instance.mushafModeNotifier.removeListener(_onMushafModeChanged);
    AppState.instance.currentMushafPage.removeListener(_onMushafPageChanged);
    _voiceSearchNotifier.dispose();
    _isAutoScrolling.dispose();
    _surahNotifier.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(TrackingScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.controller != oldWidget.controller) {
      _surahNotifier.value = widget.controller.targetSurah;
    }
    if (widget.isRecording && !oldWidget.isRecording) {
      AppState.instance.dismissBanner();
      final int targetAyah =
          widget.controller.currentMatchedVerse?.verse.ayah ??
              widget.controller.activeAyah.value ??
              1;
      _lastAyah = targetAyah;
    }

    if (widget.isVoiceSearching && !oldWidget.isVoiceSearching) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          DialogService.showVoiceSearch(
            context,
            onStop: widget.onVoiceSearchToggle,
            isLoading: widget.isVoiceSearchLoading,
            asrTextNotifier:
                widget.voiceSearchTextNotifier ?? _voiceSearchNotifier,
            searchResultNotifier: widget.voiceSearchController?.currentResult,
            onSelectCandidate: widget.onSelectVoiceCandidate,
            onHoldChanged: widget.onVoiceSearchHoldChanged,
          );
        }
      });
    } else if (!widget.isVoiceSearching && oldWidget.isVoiceSearching) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && Navigator.of(context).canPop()) {
          Navigator.of(context).popUntil((route) => route.isFirst);
        }
      });
    }
  }

  void _onControllerUpdate() {
    if (widget.controller.targetSurah != _lastSurah) {
      final newSurah = widget.controller.targetSurah;
      _surahNotifier.value = newSurah;
      void applyUpdate() {
        if (!mounted) return;
        setState(() {
          _lastSurah = newSurah;
          _lastAyah = null;
        });
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
    }
  }

  void _onMushafModeChanged() {
    _isAutoScrolling.value = false;
    final bool isMushaf = AppState.instance.isMushafMode;
    if (isMushaf) {
      final int currentSurah = widget.controller.targetSurah;
      final int currentAyah =
          widget.controller.activeAyah.value ?? AppState.instance.lastAyah;
      final mappedPage =
          MushafView.getPageForAyah(currentSurah, currentAyah) ??
              MushafView.getPageForAyah(currentSurah, 1);
      if (mappedPage != null) {
        AppState.instance.saveMushafPage(mappedPage);
      }
    } else {
      final int targetSurah = _effectiveSurah;
      if (widget.controller.targetSurah != targetSurah) {
        widget.controller.setTargetSurah(
          targetSurah,
          preserveOtherSurahStates: true,
          clearTargetSurah: false,
        );
      }
    }
    _surahNotifier.value = _effectiveSurah;
  }

  void _onMushafPageChanged() {
    if (AppState.instance.isMushafMode) {
      final newSurah = _effectiveSurah;
      if (_surahNotifier.value != newSurah) {
        _surahNotifier.value = newSurah;
      }
    }
  }

  int get _effectiveSurah {
    if (AppState.instance.isMushafMode) {
      final page = AppState.instance.currentMushafPage.value;
      final activeAyah = widget.controller.activeAyah.value;
      final activeSurah = widget.controller.targetSurah;
      if (activeAyah != null &&
          MushafView.isAyahOnPage(
            pageNumber: page,
            surah: activeSurah,
            ayah: activeAyah,
          )) {
        return activeSurah;
      }
      final dominant = MushafView.getDominantSurahOnPage(page);
      if (dominant != null) {
        return dominant;
      }
      final first = MushafView.getFirstAyahOnPage(page);
      if (first != null) {
        return first.$1;
      }
    }
    return widget.controller.targetSurah;
  }

  void _showSurahPicker() {
    DialogService.showSurahPicker(
      context,
      current: _effectiveSurah,
      controller: widget.controller,
      isRecording: widget.isRecording,
      isVoiceSearching: widget.isVoiceSearching,
      onToggleRecord: widget.onToggleRecord,
      onVoiceSearchToggle: widget.onVoiceSearchToggle,
      onPick: (n, {ayah}) async {
          if (widget.isRecording) {
            widget.onToggleRecord();
          }
          if (Navigator.of(context).canPop()) {
            Navigator.pop(context);
          }
          if (!mounted) return;

          final targetAyah = ayah ?? 1;
          await widget.controller.setTargetSurah(
            n,
            preserveOtherSurahStates: true,
            clearTargetSurah: false,
          );
          widget.controller.setManualAyah(n, targetAyah);
          AppState.instance.saveLastPosition(n, targetAyah);
          final mappedPage =
              MushafView.getPageForAyah(n, targetAyah);
          if (mappedPage != null) {
            AppState.instance.saveMushafPage(mappedPage);
          }

          setState(() {
            _lastAyah = null;
          });
        },
    );
  }

  void _showSettingsDialog() {
    DialogService.showSettings(context, controller: widget.controller);
  }

  void _showSpeedSelectionDialog() {
    DialogService.showSpeedSelection(
      context,
      onSpeedSelected: () => AppState.instance.setHasChosenAutoScrollSpeed(true),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    final safeLeft = MediaQuery.paddingOf(context).left;
    final double pageLabelLeft = safeLeft + 16.0;
    final app = AppState.instance;

    return ListenableBuilder(
      listenable: _screenThemeLanguageListenable,
      builder: (context, child) {
        final c = app.colors;

        return Directionality(
          textDirection: app.isArabic ? TextDirection.rtl : TextDirection.ltr,
          child: Scaffold(
            resizeToAvoidBottomInset: false,
            backgroundColor: c.bg,
            body: ValueListenableBuilder<bool>(
              valueListenable: _isAutoScrolling,
              child: Positioned.fill(child: _buildVerseContent(c, app)),
              builder: (context, isAutoScrolling, verseContentChild) {
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    // Main Verse Content (Mushaf View or Verse List View - preserved across auto-scroll toggles)
                    if (verseContentChild != null) verseContentChild,

                    // Bottom Action Bar (Unified Glassmorphic Command Dock)
                    // Disappears during auto-scroll for zero-distraction teleprompter reading!
                    AnimatedPositioned(
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeOutCubic,
                      bottom: (!app.isMushafMode && isAutoScrolling) ? -90.0 : 0,
                      left: 0,
                      right: 0,
                      child: AnimatedOpacity(
                        duration: const Duration(milliseconds: 220),
                        opacity: (!app.isMushafMode && isAutoScrolling) ? 0.0 : 1.0,
                        child: IgnorePointer(
                          ignoring: !app.isMushafMode && isAutoScrolling,
                          child: AnimatedBuilder(
                            animation: _bottomBarListenable,
                            builder: (context, _) {
                              final effectiveSurah = _effectiveSurah;
                              final surahName =
                                  _getSurahName(effectiveSurah, app.isArabic);

                              return BottomActionBar(
                                key: const ValueKey('unified_dock_bar'),
                                isRecording: widget.isRecording,
                                isLoadingEngine: widget.isLoadingEngine,
                                c: c,
                                onMic: () {
                                  app.dismissBanner();
                                  if (widget.isVoiceSearching) {
                                    widget.onVoiceSearchToggle();
                                  } else {
                                    widget.onToggleRecord();
                                  }
                                },
                                isBlur: app.isBlurMode,
                                onToggleBlur: () {
                                  app.toggleBlurMode();
                                  if (app.isBlurMode) {
                                    app.showBlurBanner(true);
                                  } else {
                                    app.dismissBanner();
                                  }
                                },
                                isTajweed: app.currentMode == AppMode.tajweed,
                                onToggleTajweed: () {
                                  DialogService.showTajweedSettings(
                                    context,
                                    controller: widget.controller,
                                  );
                                },
                                surahName: surahName,
                                onSurahTap: _showSurahPicker,
                                onSettingsTap: () {
                                  _showSettingsDialog();
                                },
                              );
                            },
                          ),
                        ),
                      ),
                    ),

                    // Auto-Scroll / Pause button in Verse List mode (occupies the exact spot as Page Number in Mushaf layout)
                    if (!app.isMushafMode && !widget.isRecording && !widget.isVoiceSearching)
                      AnimatedPositioned(
                        duration: const Duration(milliseconds: 280),
                        curve: Curves.easeOutCubic,
                        left: pageLabelLeft - 13.0,
                        bottom: isAutoScrolling ? (bottom + 18.0 - 13.0) : (bottom + 60.0 - 13.0),
                        child: _AutoScrollFloatingButton(
                          isAutoScrolling: isAutoScrolling,
                          c: c,
                          app: app,
                          onTap: () {
                            _verseListKey.currentState?.toggleAutoScroll();
                          },
                          onLongPress: _showSpeedSelectionDialog,
                        ),
                      ),

                    // Modern Floating Slide-Up Banner (Scoped listener prevents full screen rebuilds)
                    ValueListenableBuilder<AppBannerInfo?>(
                      valueListenable: app.bannerNotifier,
                      builder: (context, activeBanner, _) =>
                          _buildModernBottomBanner(c, app, bottom, activeBanner),
                    ),

                  ],
                );
              },
            ),
          ),
        );
      },
    );
  }

  String _getSurahName(int surahNum, bool isArabic) {
    if (isArabic) {
      return QuranMetadata.getSurahNameArabic(surahNum);
    }
    return QuranMetadata.getSurahNameEnglish(surahNum);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Modern Floating Slide-Up Banner (Slides UP from bottom toolbar for all notices)
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildModernBottomBanner(
      ThemeColors c, AppState app, double bottom, AppBannerInfo? activeBanner) {
    final bool isDark = app.isDarkMode;
    final bool isAr = app.isArabic;
    final bool isVisible = activeBanner != null;

    if (activeBanner != null) {
      _lastBanner = activeBanner;
    }
    final banner = activeBanner ?? _lastBanner;
    if (banner == null) {
      return const SizedBox.shrink();
    }

    final Color accentColor;
    if (banner.customColor != null) {
      accentColor = banner.customColor!(c, isDark);
    } else if (banner.isWarning) {
      accentColor = isDark ? const Color(0xFFF59E0B) : const Color(0xFFD97706);
    } else {
      accentColor = c.primary;
    }

    final Color iconColor =
        (banner.isWarning && isDark) ? const Color(0xFFFBBF24) : accentColor;
    final String message = isAr ? banner.messageAr : banner.messageEn;

    return AnimatedPositioned(
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
      bottom: isVisible ? (bottom + 78) : (bottom + 16),
      left: 16,
      right: 16,
      child: IgnorePointer(
        ignoring: !isVisible,
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 240),
          opacity: isVisible ? 1.0 : 0.0,
          child: RepaintBoundary(
            child: Center(
              child: GestureDetector(
                onTap: () {
                  app.dismissBanner();
                },
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 460),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isDark ? c.surfaceHigh : c.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: accentColor.withValues(alpha: isDark ? 0.38 : 0.30),
                      width: 1.1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color:
                            Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
                        blurRadius: 14,
                        offset: const Offset(0, -3),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color:
                              accentColor.withValues(alpha: isDark ? 0.20 : 0.12),
                          borderRadius: BorderRadius.circular(9),
                          border: Border.all(
                            color: accentColor.withValues(
                                alpha: isDark ? 0.42 : 0.32),
                            width: 0.8,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Icon(
                          banner.icon,
                          color: iconColor,
                          size: 16,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Flexible(
                        child: Text(
                          message,
                          style: TextStyle(
                            color: c.text,
                            height: 1.35,
                            fontWeight: FontWeight.w600,
                            fontSize: 12.5,
                          ),
                          textAlign: isAr ? TextAlign.right : TextAlign.left,
                          textDirection:
                              isAr ? TextDirection.rtl : TextDirection.ltr,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildVerseContent(ThemeColors c, AppState app) {
    if (app.isMushafMode) {
      return MushafView(
        key: const ValueKey('mushaf_view_main'),
        controller: widget.controller,
        isRecording: widget.isRecording,
        showBottomPageNumber: true,
      );
    }

    return RepaintBoundary(
      key: const ValueKey('verse_list_boundary'),
      child: VerseListView(
        key: _verseListKey,
        controller: widget.controller,
        isRecording: widget.isRecording,
        onToggleRecord: widget.onToggleRecord,
        onAutoScrollChanged: (scrolling) {
          _isAutoScrolling.value = scrolling;
        },
      ),
    );
  }
}

/// Floating tactical button occupying the exact spot where the Mushaf page number sits.
/// - In idle state: displays speed label (e.g. 1.0x) with scroll chevron; tap starts scroll, hold sets speed.
/// - During auto-scroll: transforms smoothly into a Pause button; tap stops auto-scroll.
class _AutoScrollFloatingButton extends StatefulWidget {
  final bool isAutoScrolling;
  final ThemeColors c;
  final AppState app;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  const _AutoScrollFloatingButton({
    required this.isAutoScrolling,
    required this.c,
    required this.app,
    required this.onTap,
    required this.onLongPress,
  });

  @override
  State<_AutoScrollFloatingButton> createState() =>
      _AutoScrollFloatingButtonState();
}

class _AutoScrollFloatingButtonState extends State<_AutoScrollFloatingButton> {
  bool _isDown = false;

  @override
  Widget build(BuildContext context) {
    final isDark = widget.app.isDarkMode;
    final isScroll = widget.isAutoScrolling;

    // Matches the styling and color semantics of the mic bar action buttons
    final Color bgColor = isScroll
        ? const Color(0xFF10B981).withValues(alpha: isDark ? 0.22 : 0.15)
        : (isDark ? const Color(0xFF1B2430) : const Color(0xFFF1F5F9));

    final Color borderColor = isScroll
        ? const Color(0xFF10B981).withValues(alpha: isDark ? 0.75 : 0.60)
        : (isDark
            ? Colors.white.withValues(alpha: 0.10)
            : Colors.black.withValues(alpha: 0.08));

    final Color iconColor = isScroll
        ? (isDark ? const Color(0xFF10B981) : const Color(0xFF059699))
        : (isDark ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B));

    return GestureDetector(
      onTapDown: (_) => setState(() => _isDown = true),
      onTapUp: (_) => setState(() => _isDown = false),
      onTapCancel: () => setState(() => _isDown = false),
      onTap: () {
        widget.onTap();
      },
      onLongPress: () {
        widget.onLongPress();
      },
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 56,
        height: 56,
        color: Colors.transparent,
        alignment: Alignment.center,
        child: AnimatedScale(
          scale: _isDown ? 0.90 : 1.0,
          duration: const Duration(milliseconds: 100),
          curve: Curves.easeOutCubic,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOutCubic,
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: borderColor,
                width: isScroll ? 1.2 : 1.0,
              ),
            ),
            alignment: Alignment.center,
            child: Icon(
              isScroll
                  ? Icons.pause_rounded
                  : Icons.keyboard_double_arrow_down_rounded,
              size: 16.5,
              color: iconColor,
            ),
          ),
        ),
      ),
    );
  }
}
