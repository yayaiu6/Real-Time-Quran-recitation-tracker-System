import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/platform_utils.dart';
import '../../core/app_state.dart';

enum MicBarMode { recording, normal }

class BottomActionBar extends StatelessWidget {
  final bool isRecording;
  final bool isLoadingEngine;
  final ThemeColors c;
  final VoidCallback onMic;
  final bool isBlur;
  final VoidCallback onToggleBlur;
  final bool isTajweed;
  final VoidCallback onToggleTajweed;
  final String surahName;
  final VoidCallback onSurahTap;
  final VoidCallback onSettingsTap;

  const BottomActionBar({
    super.key,
    required this.isRecording,
    this.isLoadingEngine = false,
    required this.c,
    required this.onMic,
    required this.isBlur,
    required this.onToggleBlur,
    required this.isTajweed,
    required this.onToggleTajweed,
    required this.surahName,
    required this.onSurahTap,
    required this.onSettingsTap,
  });

  MicBarMode get mode =>
      isRecording ? MicBarMode.recording : MicBarMode.normal;

  static Color _btnBg(bool isDark, {bool isActive = false}) => isActive
      ? const Color(0xFF10B981).withValues(alpha: isDark ? 0.22 : 0.15)
      : (isDark ? const Color(0xFF1B2430) : const Color(0xFFF1F5F9));

  static Color _btnBorder(bool isDark, {bool isActive = false}) => isActive
      ? const Color(0xFF10B981).withValues(alpha: isDark ? 0.75 : 0.60)
      : (isDark
          ? Colors.white.withValues(alpha: 0.10)
          : Colors.black.withValues(alpha: 0.08));

  static Color _btnFg(bool isDark, {bool isActive = false}) => isActive
      ? (isDark ? const Color(0xFF10B981) : const Color(0xFF059699))
      : (isDark ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B));

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final bool isDark = app.isDarkMode;
    final bool isAr = app.isArabic;

    return SafeArea(
      top: false,
      child: RepaintBoundary(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxW = constraints.maxWidth;
            final bool isNarrow = maxW < 360.0;

            final double dockHeight = isNarrow ? 46.0 : 48.0;
            const double dockRadius = 14.0;
            const double hPad = 6.0;
            const double borderW = 1.1;
            const double rightTuck = 4.0;
            final double btnHeight = isNarrow ? 36.0 : 38.0;

            const double protrusion = 4.5;
            final double recHeight = dockHeight + (protrusion * 2.0);
            final double micWidth = isNarrow ? 58.0 : 64.0;

            final double stdBtnWidth = isNarrow ? 38.0 : 42.0;
            final double gap = isNarrow ? 5.0 : 6.0;

            final double normalWidth = math.min(maxW - 20.0, 480.0);
            final double recordingWidth = hPad +
                borderW +
                micWidth +
                gap +
                stdBtnWidth +
                gap +
                stdBtnWidth +
                1.0;

            final double targetWidth = switch (mode) {
              MicBarMode.recording => recordingWidth,
              MicBarMode.normal => normalWidth,
            };

            final double rightMargin =
                math.max(10.0, (maxW - normalWidth) / 2.0);

            final double minNormalActionWidth = stdBtnWidth + gap + 68.0;

            final Color pillBg =
                isDark ? const Color(0xF40F151D) : const Color(0xFAFFFFFF);
            final Color pillBorder = isRecording
                ? const Color(0xFFF43F5E)
                    .withValues(alpha: isDark ? 0.45 : 0.35)
                : (isDark
                    ? Colors.white.withValues(alpha: 0.12)
                    : Colors.black.withValues(alpha: 0.08));

            return Padding(
              padding: EdgeInsets.only(
                bottom: 10.0 - protrusion,
                right: rightMargin,
                left: 8.0,
              ),
              child: Align(
                alignment: Alignment.bottomRight,
                child: SizedBox(
                  width: targetWidth,
                  height: recHeight,
                  child: Stack(
                    clipBehavior: Clip.none,
                    alignment: Alignment.centerRight,
                    children: [
                      // 1. Rectangular-Pill Back Chassis
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        curve: Curves.easeOutCubic,
                        width: targetWidth,
                        height: dockHeight,
                        margin: const EdgeInsets.only(right: rightTuck),
                        padding: const EdgeInsets.only(left: hPad),
                        decoration: BoxDecoration(
                          color: pillBg,
                          borderRadius: BorderRadius.circular(dockRadius),
                          border: Border.all(
                            color: pillBorder,
                            width: borderW,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: isRecording
                                  ? const Color(0xFFF43F5E).withValues(
                                      alpha: isDark ? 0.22 : 0.14,
                                    )
                                  : Colors.black.withValues(
                                      alpha: isDark ? 0.40 : 0.08,
                                    ),
                              blurRadius: 14,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Directionality(
                          textDirection: TextDirection.rtl,
                          child: Row(
                            children: [
                              SizedBox(
                                width: micWidth - rightTuck - borderW,
                              ),
                              SizedBox(
                                width: gap,
                              ),
                              Expanded(
                                child: AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 160),
                                  switchInCurve: Curves.easeOutCubic,
                                  switchOutCurve: Curves.easeInCubic,
                                  layoutBuilder:
                                      (currentChild, previousChildren) {
                                    return Stack(
                                      clipBehavior: Clip.hardEdge,
                                      alignment: Alignment.centerRight,
                                      children: [
                                        ...previousChildren.map(
                                          (w) => IgnorePointer(child: w),
                                        ),
                                        if (currentChild != null) currentChild,
                                      ],
                                    );
                                  },
                                  child: switch (mode) {
                                    // CASE 1: SOLO RECORDING
                                    MicBarMode.recording =>
                                      SingleChildScrollView(
                                        key: const ValueKey('mode_recording'),
                                        scrollDirection: Axis.horizontal,
                                        physics:
                                            const NeverScrollableScrollPhysics(),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            _buildActionButton(
                                              child: Icon(
                                                isBlur
                                                    ? Icons
                                                        .visibility_off_rounded
                                                    : Icons.visibility_rounded,
                                                size: 18.5,
                                                color: _btnFg(
                                                  isDark,
                                                  isActive: isBlur,
                                                ),
                                              ),
                                              tooltip: isAr
                                                  ? 'إخفاء الآيات'
                                                  : 'Hide Verses',
                                              isActive: isBlur,
                                              isDark: isDark,
                                              width: stdBtnWidth,
                                              height: btnHeight,
                                              dockHeight: dockHeight,
                                              onTap: onToggleBlur,
                                            ),
                                            SizedBox(width: gap),
                                            _buildActionButton(
                                              child: Icon(
                                                isTajweed
                                                    ? Icons
                                                        .record_voice_over_rounded
                                                    : Icons
                                                        .record_voice_over_outlined,
                                                size: 18.5,
                                                color: _btnFg(
                                                  isDark,
                                                  isActive: isTajweed,
                                                ),
                                              ),
                                              tooltip: isAr
                                                  ? 'أحكام التجويد'
                                                  : 'Tajweed Rules',
                                              isActive: isTajweed,
                                              isDark: isDark,
                                              width: stdBtnWidth,
                                              height: btnHeight,
                                              dockHeight: dockHeight,
                                              onTap: onToggleTajweed,
                                            ),
                                          ],
                                        ),
                                      ),

                                    // CASE 2: NORMAL READING
                                    MicBarMode.normal =>
                                      _NonOverflowingActionRow(
                                        key: const ValueKey('mode_normal'),
                                        minWidth: minNormalActionWidth,
                                        child: Row(
                                          children: [
                                            Expanded(
                                              child: _buildSurahPill(
                                                isDark: isDark,
                                                isAr: isAr,
                                                isNarrow: isNarrow,
                                                height: btnHeight,
                                                dockHeight: dockHeight,
                                              ),
                                            ),
                                            SizedBox(width: gap),
                                            _buildActionButton(
                                              child: Icon(
                                                Icons.tune_rounded,
                                                size: 18.5,
                                                color: _btnFg(isDark),
                                              ),
                                              tooltip: isAr
                                                  ? 'الإعدادات'
                                                  : 'Settings',
                                              isActive: false,
                                              isDark: isDark,
                                              width: stdBtnWidth,
                                              height: btnHeight,
                                              dockHeight: dockHeight,
                                              onTap: onSettingsTap,
                                            ),
                                          ],
                                        ),
                                      ),
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // 2. Protruding Hero Record Key (Flush with right edge)
                      Positioned(
                        top: 0.0,
                        bottom: 0.0,
                        right: 0.0,
                        child: _buildMicButton(
                          width: micWidth,
                          height: recHeight,
                          isDark: isDark,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildMicButton({
    required double width,
    required double height,
    required bool isDark,
  }) {
    final List<Color> gradient = isRecording
        ? const [Color(0xFFFF3B6B), Color(0xFFE11D48)]
        : const [Color(0xFF10B981), Color(0xFF059669)];

    return _TapScale(
      onTap: onMic,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14.0),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: gradient,
          ),
          border: Border.all(
            color: Colors.white.withValues(alpha: isDark ? 0.40 : 0.65),
            width: 1.3,
          ),
          boxShadow: [
            BoxShadow(
              color: gradient[0].withValues(alpha: isDark ? 0.38 : 0.25),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        alignment: Alignment.center,
        child: isLoadingEngine
            ? ValueListenableBuilder<ModelDownloadProgress>(
                valueListenable: AppState.instance.modelDownloadNotifier,
                builder: (context, dl, _) {
                  final bool hasProgress =
                      dl.isDownloading && dl.loadedBytes > 0;
                  final double? progressVal =
                      hasProgress ? dl.progress.clamp(0.0, 1.0) : null;
                  final String pctText = '${dl.percent}%';
                  final int totalMb = dl.totalMB > 0 ? dl.totalMB.toInt() : 56;
                  final String mbText = '${dl.loadedMB.toInt()}/$totalMb MB';

                  return FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2.0),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: 21,
                                height: 21,
                                child: CircularProgressIndicator(
                                  value: progressVal,
                                  strokeWidth: 2.1,
                                  color: Colors.white,
                                  backgroundColor:
                                      Colors.white.withValues(alpha: 0.25),
                                ),
                              ),
                              if (hasProgress)
                                Text(
                                  pctText,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 7.5,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -0.5,
                                  ),
                                ),
                            ],
                          ),
                          if (hasProgress) ...[
                            const SizedBox(height: 2),
                            Text(
                              mbText,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 8.0,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.2,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              )
            : (isRecording
                ? const _AudioWaveform()
                : const Icon(
                    Icons.mic_rounded,
                    color: Colors.white,
                    size: 25.5,
                  )),
      ),
    );
  }

  Widget _buildActionButton({
    required Widget child,
    required String tooltip,
    required bool isActive,
    required bool isDark,
    double? width,
    required double height,
    required double dockHeight,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      waitDuration: const Duration(milliseconds: 350),
      child: _TapScale(
        onTap: onTap,
        child: SizedBox(
          width: width,
          height: dockHeight,
          child: Center(
            child: Container(
              width: width ?? double.infinity,
              height: height,
              decoration: BoxDecoration(
                color: _btnBg(isDark, isActive: isActive),
                borderRadius: BorderRadius.circular(10.0),
                border: Border.all(
                  color: _btnBorder(isDark, isActive: isActive),
                  width: isActive ? 1.2 : 1.0,
                ),
              ),
              alignment: Alignment.center,
              child: child,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSurahPill({
    required bool isDark,
    required bool isAr,
    required bool isNarrow,
    required double height,
    required double dockHeight,
  }) {
    final Color fgColor = _btnFg(isDark);

    return _TapScale(
      onTap: onSurahTap,
      child: SizedBox(
        height: dockHeight,
        child: Center(
          child: Container(
            height: height,
            padding: EdgeInsets.symmetric(horizontal: isNarrow ? 8.0 : 11.0),
            decoration: BoxDecoration(
              color: _btnBg(isDark),
              borderRadius: BorderRadius.circular(10.0),
              border: Border.all(color: _btnBorder(isDark), width: 1.0),
            ),
            child: Row(
              children: [
                _EmptyMushafIcon(
                  size: isNarrow ? 16.5 : 17.5,
                  color: fgColor,
                ),
                SizedBox(width: isNarrow ? 5.0 : 7.0),
                Expanded(
                  child: Text(
                    surahName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'cairo',
                      color: fgColor,
                      fontSize: isNarrow ? 12.5 : (isAr ? 13.5 : 13.0),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Icon(
                  Icons.keyboard_arrow_down_rounded,
                  color: isDark
                      ? const Color(0xFF94A3B8)
                      : const Color(0xFF64748B),
                  size: isNarrow ? 15.0 : 16.5,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Prevents RenderFlex Overflow During Collapse / Decollapse Width Transitions
// ─────────────────────────────────────────────────────────────────────────────
class _NonOverflowingActionRow extends StatelessWidget {
  final double minWidth;
  final Widget child;

  const _NonOverflowingActionRow({
    super.key,
    required this.minWidth,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= minWidth) {
          return child;
        }
        return ClipRect(
          child: OverflowBox(
            minWidth: minWidth,
            maxWidth: minWidth,
            alignment: Alignment.centerRight,
            child: SizedBox(
              width: minWidth,
              child: child,
            ),
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty Open Mushaf Vector Icon (No inner lines)
// ─────────────────────────────────────────────────────────────────────────────
class _EmptyMushafIcon extends StatelessWidget {
  final double size;
  final Color color;

  const _EmptyMushafIcon({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _EmptyMushafPainter(color)),
    );
  }
}

class _EmptyMushafPainter extends CustomPainter {
  final Color color;
  _EmptyMushafPainter(this.color);

  final Paint _paint = Paint()
    ..style = PaintingStyle.stroke
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round
    ..isAntiAlias = true;

  final Path _path = Path();

  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;
    _paint
      ..color = color
      ..strokeWidth = w * 0.095;

    _path.reset();
    _path
      ..moveTo(w * 0.50, h * 0.25)
      ..quadraticBezierTo(w * 0.31, h * 0.17, w * 0.12, h * 0.23)
      ..lineTo(w * 0.12, h * 0.75)
      ..quadraticBezierTo(w * 0.31, h * 0.69, w * 0.50, h * 0.79)
      ..moveTo(w * 0.50, h * 0.25)
      ..quadraticBezierTo(w * 0.69, h * 0.17, w * 0.88, h * 0.23)
      ..lineTo(w * 0.88, h * 0.75)
      ..quadraticBezierTo(w * 0.69, h * 0.69, w * 0.50, h * 0.79);

    canvas.drawPath(_path, _paint);
    canvas.drawLine(
      Offset(w * 0.50, h * 0.25),
      Offset(w * 0.50, h * 0.80),
      _paint,
    );
  }

  @override
  bool shouldRepaint(covariant _EmptyMushafPainter old) => old.color != color;
}

// ─────────────────────────────────────────────────────────────────────────────
// Smooth 4-Bar Audio Waveform
// ─────────────────────────────────────────────────────────────────────────────
class _AudioWaveform extends StatefulWidget {
  const _AudioWaveform();

  @override
  State<_AudioWaveform> createState() => _AudioWaveformState();
}

class _AudioWaveformState extends State<_AudioWaveform>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  bool _isCurrentRoute = true;
  Animation<double>? _secondaryAnimation;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );
    if (!AppModalRouteObserver.instance.isModalOpen) {
      _ctrl.repeat();
    }
    AppModalRouteObserver.instance.activeModalsNotifier
        .addListener(_onModalStateChanged);
  }

  void _onModalStateChanged() {
    if (!mounted) return;
    _syncAnimationState();
  }

  void _syncAnimationState() {
    final bool isModalOpen = AppModalRouteObserver.instance.isModalOpen;
    final bool isCovered = !_isCurrentRoute ||
        isModalOpen ||
        (_secondaryAnimation != null && !_secondaryAnimation!.isDismissed);

    if (isCovered) {
      if (_ctrl.isAnimating) _ctrl.stop();
    } else {
      if (!_ctrl.isAnimating) _ctrl.repeat();
    }
  }

  void _onSecondaryStatus(AnimationStatus status) {
    if (!mounted) return;
    _syncAnimationState();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    final isCurrent = route?.isCurrent ?? true;
    _isCurrentRoute = isCurrent;

    final newSecondary = route?.secondaryAnimation;
    if (newSecondary != _secondaryAnimation) {
      _secondaryAnimation?.removeStatusListener(_onSecondaryStatus);
      _secondaryAnimation = newSecondary;
      _secondaryAnimation?.addStatusListener(_onSecondaryStatus);
    }

    _syncAnimationState();
  }

  @override
  void dispose() {
    AppModalRouteObserver.instance.activeModalsNotifier
        .removeListener(_onModalStateChanged);
    _secondaryAnimation?.removeStatusListener(_onSecondaryStatus);
    _secondaryAnimation = null;
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: SizedBox(
        width: 22,
        height: 18,
        child: AnimatedBuilder(
          animation: _ctrl,
          builder: (context, _) =>
              CustomPaint(painter: _WaveformPainter(_ctrl.value)),
        ),
      ),
    );
  }
}

class _WaveformPainter extends CustomPainter {
  final double progress;
  _WaveformPainter(this.progress);

  static final Paint _paint = Paint()..color = Colors.white;

  @override
  void paint(Canvas canvas, Size size) {
    final double t = progress * 2.0 * math.pi;
    const double barW = 2.6;
    const double gap = 2.6;
    double x = (size.width - (4 * barW + 3 * gap)) / 2.0;
    final double cy = size.height / 2.0;

    void drawBar(double h) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x, cy - h / 2.0, barW, h),
          const Radius.circular(1.3),
        ),
        _paint,
      );
      x += barW + gap;
    }

    drawBar(6.0 + 3.0 * math.sin(t));
    drawBar(10.0 + 4.5 * math.sin(t + 1.4));
    drawBar(9.5 + 4.0 * math.sin(t + 2.8));
    drawBar(6.5 + 3.0 * math.sin(t + 4.2));
  }

  @override
  bool shouldRepaint(covariant _WaveformPainter old) =>
      old.progress != progress;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ultra-Fast Forgiving Touch Handler (Zero GestureArena Delay, Zero setState)
// ─────────────────────────────────────────────────────────────────────────────
class _TapScale extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;

  const _TapScale({
    required this.child,
    required this.onTap,
  });

  @override
  State<_TapScale> createState() => _TapScaleState();
}

class _TapScaleState extends State<_TapScale> {
  final ValueNotifier<bool> _down = ValueNotifier<bool>(false);
  Offset? _downPos;

  @override
  void dispose() {
    _down.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.opaque,
      onPointerDown: (event) {
        _downPos = event.position;
        _down.value = true;
      },
      onPointerUp: (event) {
        final bool wasDown = _down.value;
        _down.value = false;
        if (wasDown && _downPos != null) {
          // 36px forgiving radius so natural thumb roll or light tap never cancels
          if ((event.position - _downPos!).distance <= 36.0) {
            widget.onTap();
          }
        }
        _downPos = null;
      },
      onPointerCancel: (_) {
        _down.value = false;
        _downPos = null;
      },
      child: ValueListenableBuilder<bool>(
        valueListenable: _down,
        builder: (context, isDown, child) {
          return AnimatedScale(
            scale: isDown ? 0.94 : 1.0,
            duration: const Duration(milliseconds: 60),
            curve: Curves.easeOutCubic,
            child: child,
          );
        },
        child: widget.child,
      ),
    );
  }
}
