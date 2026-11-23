import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../../../core/app_state.dart';
import '../../../core/highlighting_controller.dart';
import '../../../mushaf/mushaf_provider.dart';
import '../../../verse_list/verse_span_builder.dart';
import 'dialog_base.dart';

/// Production-ready Voice Search modal dialog for reciting any Ayah across the Quran.
///
/// Features:
/// - Clear Arabic instruction directing the user to recite aloud.
/// - Pulsing microphone and animated rhythmic soundwave visualizer.
/// - Balanced dynamic grace countdown (3s-7s based on candidate count).
/// - One-tap Hold / Resume toggle to freeze countdown and browse at leisure.
/// - Instant 0ms navigation on unique match or direct candidate card tap.
/// - Zero raw phonemes or ASR tokens rendered in the UI.
class VoiceSearchDialog extends StatefulWidget {
  final VoidCallback onStop;
  final ValueListenable<bool>? isLoading;
  final ValueListenable<String>? asrTextNotifier;
  final ValueListenable<VoiceSearchResult?>? searchResultNotifier;
  final void Function(int surah, int ayah)? onSelectCandidate;
  final ValueChanged<bool>? onHoldChanged;

  const VoiceSearchDialog({
    super.key,
    required this.onStop,
    this.isLoading,
    this.asrTextNotifier,
    this.searchResultNotifier,
    this.onSelectCandidate,
    this.onHoldChanged,
  });

  /// Displays the VoiceSearchDialog modal.
  static void show(
    BuildContext context, {
    required VoidCallback onStop,
    ValueListenable<bool>? isLoading,
    ValueListenable<String>? asrTextNotifier,
    ValueListenable<VoiceSearchResult?>? searchResultNotifier,
    void Function(int surah, int ayah)? onSelectCandidate,
    ValueChanged<bool>? onHoldChanged,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.55),
      builder: (_) => VoiceSearchDialog(
        onStop: onStop,
        isLoading: isLoading,
        asrTextNotifier: asrTextNotifier,
        searchResultNotifier: searchResultNotifier,
        onSelectCandidate: onSelectCandidate,
        onHoldChanged: onHoldChanged,
      ),
    );
  }

  @override
  State<VoiceSearchDialog> createState() => _VoiceSearchDialogState();
}

class _VoiceSearchDialogState extends State<VoiceSearchDialog>
    with TickerProviderStateMixin {
  late final AnimationController _pulseCtrl;
  late final AnimationController _countdownCtrl;

  VoiceSearchResult? _currentResult;
  bool _hasSelected = false;
  bool _isCountdownPaused = false;
  int _activeGraceSeconds = 4;

  /// Balanced grace countdown duration based on the number of candidate Ayahs:
  /// - 1 Ayah: 3s
  /// - 2 Ayahs: 4s
  /// - 3 Ayahs: 5s
  /// - 4 Ayahs: 6s
  /// - 5+ Ayahs: 7s
  int _calculateGraceSeconds(int count) {
    if (count <= 1) return 3;
    if (count == 2) return 4;
    if (count == 3) return 5;
    if (count == 4) return 6;
    return 7;
  }

  @override
  void initState() {
    super.initState();

    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _activeGraceSeconds = _calculateGraceSeconds(
      widget.searchResultNotifier?.value?.candidates.length ?? 2,
    );

    _countdownCtrl = AnimationController(
      vsync: this,
      duration: Duration(seconds: _activeGraceSeconds),
    )..addStatusListener((status) {
        if (status == AnimationStatus.completed) {
          _autoNavigateToTopMatch();
        }
      });

    _currentResult = widget.searchResultNotifier?.value;
    widget.searchResultNotifier?.addListener(_onSearchResultChanged);

    if (_currentResult != null && _currentResult!.candidates.isNotEmpty) {
      if (_currentResult!.isUnique && _currentResult!.topMatch != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && !_hasSelected) {
            _selectCandidate(
              _currentResult!.topMatch!.surah,
              _currentResult!.topMatch!.ayah,
            );
          }
        });
      } else {
        _startCountdown();
      }
    }
  }

  @override
  void dispose() {
    widget.searchResultNotifier?.removeListener(_onSearchResultChanged);
    _pulseCtrl.dispose();
    _countdownCtrl.dispose();
    super.dispose();
  }

  void _onSearchResultChanged() {
    if (!mounted || _hasSelected || _isCountdownPaused) return;
    final res = widget.searchResultNotifier?.value;
    setState(() => _currentResult = res);

    if (res != null && res.candidates.isNotEmpty) {
      // Unique match navigates instantly unless user explicitly paused
      if (res.isUnique && res.topMatch != null && !_isCountdownPaused) {
        _selectCandidate(res.topMatch!.surah, res.topMatch!.ayah);
        return;
      }
      if (!_isCountdownPaused) {
        _startCountdown();
      }
    } else {
      _countdownCtrl.stop();
      _countdownCtrl.reset();
      _isCountdownPaused = false;
    }
  }

  void _startCountdown() {
    if (_isCountdownPaused) return;

    final int count = _currentResult?.candidates.length ?? 1;
    final int targetSeconds = _calculateGraceSeconds(count);

    if (_countdownCtrl.isAnimating) {
      if (targetSeconds > _activeGraceSeconds) {
        _activeGraceSeconds = targetSeconds;
        _countdownCtrl.duration = Duration(seconds: targetSeconds);
      }
      return;
    }

    _activeGraceSeconds = targetSeconds;
    _countdownCtrl.duration = Duration(seconds: targetSeconds);
    _countdownCtrl.forward(from: 0.0);
  }

  void _togglePauseCountdown() {
    if (!mounted || _hasSelected) return;
    setState(() {
      _isCountdownPaused = !_isCountdownPaused;
      if (_isCountdownPaused) {
        _countdownCtrl.stop();
        _pulseCtrl.stop();
      } else {
        _pulseCtrl.repeat(reverse: true);
        if (_countdownCtrl.value < 1.0) {
          _countdownCtrl.forward();
        } else {
          _autoNavigateToTopMatch();
        }
      }
    });
    widget.onHoldChanged?.call(_isCountdownPaused);
  }

  void _autoNavigateToTopMatch() {
    if (!mounted || _hasSelected || _isCountdownPaused) return;
    final top =
        _currentResult?.topMatch ?? _currentResult?.candidates.firstOrNull;
    if (top != null) {
      _selectCandidate(top.surah, top.ayah);
    }
  }

  void _selectCandidate(int surah, int ayah) {
    if (_hasSelected) return;
    _hasSelected = true;
    _countdownCtrl.stop();
    if (Navigator.of(context, rootNavigator: true).canPop()) {
      Navigator.of(context, rootNavigator: true).pop();
    }
    widget.onSelectCandidate?.call(surah, ayah);
  }

  void _cancelSearch() {
    if (_hasSelected) return;
    _hasSelected = true;
    _countdownCtrl.stop();
    if (Navigator.of(context, rootNavigator: true).canPop()) {
      Navigator.of(context, rootNavigator: true).pop();
    }
    widget.onStop();
  }

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final c = app.colors;
    final isAr = app.isArabic;
    final isDark = app.isDarkMode;
    final size = MediaQuery.sizeOf(context);

    return RepaintBoundary(
      child: Dialog(
        backgroundColor: Colors.transparent,
        elevation: 0,
        insetPadding: DialogTokens.dialogInsetPadding,
        child: Container(
          constraints: BoxConstraints(
            maxWidth: 480,
            maxHeight: size.height * 0.82,
          ),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(DialogTokens.dialogRadius),
            border: Border.fromBorderSide(DialogTokens.borderSide(c, isDark)),
            boxShadow: DialogTokens.dialogShadow(isDark),
          ),
          child: Directionality(
            textDirection: isAr ? TextDirection.rtl : TextDirection.ltr,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 18),
              child: widget.isLoading != null
                  ? ValueListenableBuilder<bool>(
                      valueListenable: widget.isLoading!,
                      builder: (_, loading, __) => loading
                          ? _buildLoadingState(c, isAr)
                          : _buildContent(c, isAr),
                    )
                  : _buildContent(c, isAr),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingState(ThemeColors c, bool isAr) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 38,
            height: 38,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              valueColor: AlwaysStoppedAnimation<Color>(c.primary),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            isAr
                ? 'جاري تجهيز البحث الصوتي...'
                : 'Preparing voice search index...',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: c.text,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(ThemeColors c, bool isAr) {
    final bool hasCandidates =
        _currentResult != null && _currentResult!.candidates.isNotEmpty;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Top Close Button ──
        Align(
          alignment: AlignmentDirectional.topEnd,
          child: IconButton(
            icon: Icon(Icons.close_rounded, color: c.muted, size: 20),
            tooltip: isAr ? 'إلغاء' : 'Cancel',
            visualDensity: VisualDensity.compact,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
            onPressed: () {
              _cancelSearch();
            },
          ),
        ),
        const SizedBox(height: 6),

        // ── Hero Section (Listening or Candidates) ──
        if (!hasCandidates) ...[
          const SizedBox(height: 8),
          _buildHeroListening(c, isAr),
          const SizedBox(height: 8),
        ] else ...[
          _buildCompactHeader(c, isAr),
          const SizedBox(height: 6),
          _buildCountdownGraceBanner(c, isAr),
          const SizedBox(height: 6),
          _buildCandidatesList(c, isAr),
          const SizedBox(height: 6),
        ],
      ],
    );
  }

  Widget _buildHeroListening(ThemeColors c, bool isAr) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Primary prompt at top
        Text(
          isAr
              ? 'اتلُ أي آية من القرآن العظيم'
              : 'Recite any verse from The Great Quran',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: c.text,
            fontSize: isAr ? 19 : 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 22),

        // Pulsing Microphone with rigid 104x104 bounding box (Transform.scale avoids markNeedsLayout)
        RepaintBoundary(
          child: SizedBox(
            width: 104,
            height: 104,
            child: Center(
              child: AnimatedBuilder(
                animation: _pulseCtrl,
                builder: (_, __) {
                  final val = _pulseCtrl.value;
                  return Stack(
                    alignment: Alignment.center,
                    children: [
                      Transform.scale(
                        scale: 1.0 + (val * 0.14),
                        child: Container(
                          width: 88,
                          height: 88,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color:
                                c.primary.withValues(alpha: 0.06 * (1.0 - val)),
                          ),
                        ),
                      ),
                      Transform.scale(
                        scale: 1.0 + (val * 0.08),
                        child: Container(
                          width: 76,
                          height: 76,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: c.primary.withValues(alpha: 0.12),
                          ),
                        ),
                      ),
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [
                              c.primary.withValues(alpha: 0.28),
                              c.primary.withValues(alpha: 0.12),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          border: Border.all(
                            color: c.primary.withValues(alpha: 0.45),
                            width: 1.5,
                          ),
                        ),
                        child:
                            Icon(Icons.mic_rounded, color: c.primary, size: 28),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),

        // Animated soundwave bars with rigid fixed height (prevents dialog waving)
        _buildWaveBars(count: 7, baseHeight: 8, maxHeight: 26, c: c),
        const SizedBox(height: 16),

        // Status badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: c.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: c.primary.withValues(alpha: 0.2)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 7,
                height: 7,
                decoration:
                    BoxDecoration(color: c.primary, shape: BoxShape.circle),
              ),
              const SizedBox(width: 8),
              Text(
                isAr ? 'في انتظار تلاوتك...' : 'Listening to recitation...',
                style: TextStyle(
                  color: c.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCompactHeader(ThemeColors c, bool isAr) {
    return Row(
      children: [
        Expanded(
          child: Text(
            isAr ? 'الآيات المتطابقة' : 'Matching Ayahs',
            style: TextStyle(
              color: c.primary,
              fontSize: 13.5,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        _buildWaveBars(count: 4, baseHeight: 5, maxHeight: 13, c: c),
      ],
    );
  }

  /// Reusable soundwave equalizer visualizer in a fixed rigid box with RepaintBoundary.
  Widget _buildWaveBars({
    required int count,
    required double baseHeight,
    required double maxHeight,
    required ThemeColors c,
  }) {
    final double width = count * 7.0;
    return RepaintBoundary(
      child: SizedBox(
        width: width,
        height: maxHeight,
        child: AnimatedBuilder(
          animation: _pulseCtrl,
          builder: (_, __) {
            return CustomPaint(
              painter: _VoiceWaveBarsPainter(
                count: count,
                baseHeight: baseHeight,
                maxHeight: maxHeight,
                animationValue: _pulseCtrl.value,
                color: c.primary.withValues(alpha: 0.7),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildCountdownGraceBanner(ThemeColors c, bool isAr) {
    return Container(
      decoration: BoxDecoration(
        color: _isCountdownPaused
            ? c.surfaceHigh.withValues(alpha: 0.5)
            : c.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: _isCountdownPaused
              ? c.border.withValues(alpha: 0.25)
              : c.primary.withValues(alpha: 0.18),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
            child: Row(
              children: [
                Icon(
                  _isCountdownPaused
                      ? Icons.pause_circle_outline_rounded
                      : Icons.timer_outlined,
                  size: 14,
                  color: _isCountdownPaused ? c.muted : c.primary,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: AnimatedBuilder(
                    animation: _countdownCtrl,
                    builder: (_, __) {
                      if (_isCountdownPaused) {
                        return Text(
                          isAr ? 'موقوف' : 'Paused',
                          style: TextStyle(
                            color: c.text.withValues(alpha: 0.85),
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        );
                      }
                      final int secRemaining =
                          ((1.0 - _countdownCtrl.value) * _activeGraceSeconds)
                              .ceil()
                              .clamp(1, _activeGraceSeconds);
                      return Text(
                        isAr
                            ? 'الانتقال: ${secRemaining}ث'
                            : 'Jump: ${secRemaining}s',
                        style: TextStyle(
                          color: c.primary,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: _togglePauseCountdown,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: _isCountdownPaused
                              ? [c.green, c.green.withValues(alpha: 0.85)]
                              : [c.red, c.red.withValues(alpha: 0.85)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.3),
                          width: 0.9,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: (_isCountdownPaused ? c.green : c.red)
                                .withValues(alpha: 0.35),
                            blurRadius: 5,
                            spreadRadius: 0.5,
                            offset: const Offset(0, 1.5),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _isCountdownPaused
                                ? Icons.play_arrow_rounded
                                : Icons.pause_rounded,
                            size: 14,
                            color: Colors.white,
                          ),
                          const SizedBox(width: 3.5),
                          Text(
                            _isCountdownPaused
                                ? (isAr ? 'استئناف' : 'Resume')
                                : (isAr ? 'إيقاف' : 'Hold'),
                            style: const TextStyle(
                              fontFamily: 'cairo',
                              color: Colors.white,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          AnimatedBuilder(
            animation: _countdownCtrl,
            builder: (_, __) {
              return ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(bottom: Radius.circular(9)),
                child: LinearProgressIndicator(
                  value: (1.0 - _countdownCtrl.value).clamp(0.0, 1.0),
                  minHeight: 2,
                  backgroundColor: _isCountdownPaused
                      ? c.border.withValues(alpha: 0.15)
                      : c.primary.withValues(alpha: 0.12),
                  valueColor: AlwaysStoppedAnimation<Color>(
                    _isCountdownPaused ? c.muted : c.primary,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCandidatesList(ThemeColors c, bool isAr) {
    final candidates = _currentResult!.candidates;

    return Flexible(
      child: ListView.separated(
        physics: const BouncingScrollPhysics(),
        shrinkWrap: true,
        itemCount: candidates.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final match = candidates[index];
          return _buildCandidateCard(
            context,
            match: match,
            isTop: index == 0,
            c: c,
            isAr: isAr,
          );
        },
      ),
    );
  }

  Widget _buildCandidateCard(
    BuildContext context, {
    required AyahSearchMatch match,
    required bool isTop,
    required ThemeColors c,
    required bool isAr,
  }) {
    final surahMeta = MushafProvider.instance.atlas.surah(match.surah);
    final surahTitle = isAr
        ? (surahMeta?.arabic ?? '${match.surah}')
        : (surahMeta?.latin.isNotEmpty == true
            ? surahMeta!.latin
            : (QuranMetadata.getSurahNameEnglish(match.surah).isNotEmpty
                ? QuranMetadata.getSurahNameEnglish(match.surah)
                : '${match.surah}'));

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _selectCandidate(match.surah, match.ayah),
        borderRadius: BorderRadius.circular(16),
        hoverColor: c.primary.withValues(alpha: 0.08),
        splashColor: c.primary.withValues(alpha: 0.15),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            color: isTop
                ? c.surfaceHigh.withValues(alpha: 0.6)
                : c.bg.withValues(alpha: 0.45),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isTop
                  ? c.primary.withValues(alpha: 0.38)
                  : c.border.withValues(alpha: 0.25),
              width: isTop ? 1.5 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Directionality(
                textDirection: TextDirection.ltr,
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: c.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(5),
                        border: Border.all(
                          color: c.primary.withValues(alpha: 0.22),
                          width: 0.8,
                        ),
                      ),
                      child: Text(
                        isAr ? 'آية ${match.ayah}' : 'Ayah ${match.ayah}',
                        style: TextStyle(
                          fontFamily: 'cairo',
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                          color: c.primary,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      surahTitle,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontFamily: 'cairo',
                        fontWeight: FontWeight.bold,
                        fontSize: isAr ? 13.5 : 12,
                        color: c.primary,
                      ),
                    ),
                  ],
                ),
              ),
              if (match.textUthmani != null &&
                  match.textUthmani!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Builder(
                  builder: (_) {
                    final preview = VerseSpanBuilder.buildPreviewSpec(
                      rawText: match.textUthmani!,
                      startWord: match.startWordIdx,
                      endWord: match.endWordIdx,
                      startAyah: match.startAyah,
                      endAyah: match.endAyah,
                      currentAyah: match.ayah,
                      defaultColor: c.text.withValues(alpha: 0.75),
                      highlightColor: c.green,
                    );
                    return Text.rich(
                      TextSpan(children: preview.spans),
                      maxLines: preview.maxLines,
                      overflow: TextOverflow.ellipsis,
                      textDirection: TextDirection.rtl,
                      textAlign: TextAlign.right,
                    );
                  },
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _VoiceWaveBarsPainter extends CustomPainter {
  final int count;
  final double baseHeight;
  final double maxHeight;
  final double animationValue;
  final Color color;

  _VoiceWaveBarsPainter({
    required this.count,
    required this.baseHeight,
    required this.maxHeight,
    required this.animationValue,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    const double barWidth = 3.0;
    const double margin = 2.0;
    final double step = barWidth + (margin * 2);
    final double totalWidth = count * step;
    double startX = (size.width - totalWidth) / 2 + margin;
    final double centerY = size.height / 2;
    const rrectRadius = Radius.circular(2.0);

    for (int i = 0; i < count; i++) {
      final double h = (baseHeight +
              (maxHeight - baseHeight) *
                  math.sin((animationValue * math.pi) + (i * 0.7)).abs())
          .clamp(baseHeight, maxHeight);

      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(startX, centerY - (h / 2), barWidth, h),
        rrectRadius,
      );
      canvas.drawRRect(rect, paint);
      startX += step;
    }
  }

  @override
  bool shouldRepaint(covariant _VoiceWaveBarsPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue ||
        oldDelegate.color != color ||
        oldDelegate.count != count;
  }
}
