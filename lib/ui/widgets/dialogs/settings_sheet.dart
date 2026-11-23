import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/app_state.dart';
import '../../../core/highlighting_controller.dart';
import 'dialog_service.dart';

// ══════════════════════════════════════════════════════════════════════════════
// 1. SETTINGS TILE & DIVIDER
// ══════════════════════════════════════════════════════════════════════════════

/// Thin flush separator line for grouped lists.
class SettingDivider extends StatelessWidget {
  final ThemeColors c;
  const SettingDivider({super.key, required this.c});

  @override
  Widget build(BuildContext context) {
    final isDark = AppState.instance.isDarkMode;
    return Container(
      height: 1,
      margin: const EdgeInsetsDirectional.only(start: 56, end: 16),
      color: isDark
          ? Colors.white.withValues(alpha: 0.06)
          : Colors.black.withValues(alpha: 0.05),
    );
  }
}

/// Minimalist setting row tile that handles trailing controls and sub-sliders.
class SettingTile extends StatelessWidget {
  final IconData? icon;
  final Widget? iconWidget;
  final String title;
  final ThemeColors c;
  final Widget? trailing;
  final Widget? bottom;
  final Widget? badge;
  final double? trailingWidth;
  final VoidCallback? onTap;

  const SettingTile({
    super.key,
    this.icon,
    this.iconWidget,
    required this.title,
    required this.c,
    this.trailing,
    this.bottom,
    this.badge,
    this.trailingWidth,
    this.onTap,
  }) : assert(icon != null || iconWidget != null,
            'Either icon or iconWidget must be provided');

  @override
  Widget build(BuildContext context) {
    final isDark = AppState.instance.isDarkMode;

    final content = Padding(
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 16, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981)
                      .withValues(alpha: isDark ? 0.14 : 0.09),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFF10B981)
                        .withValues(alpha: isDark ? 0.28 : 0.20),
                    width: 1,
                  ),
                ),
                child: iconWidget ??
                    (icon != null
                        ? Icon(icon, color: const Color(0xFF10B981), size: 20)
                        : const SizedBox.shrink()),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: AlignmentDirectional.centerStart,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        maxLines: 1,
                        style: TextStyle(
                          color: c.text,
                          fontSize: 16.5,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.1,
                        ),
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: 6),
                        badge!,
                      ],
                    ],
                  ),
                ),
              ),
              if (trailing != null) ...[
                const SizedBox(width: 12),
                if (trailingWidth != null)
                  SizedBox(width: trailingWidth, child: trailing!)
                else if (trailing is AppSegmentedPillSelector)
                  SizedBox(width: 122, child: trailing!)
                else if (trailing is Row)
                  SizedBox(width: 130, child: trailing!)
                else
                  trailing!,
              ],
            ],
          ),
          if (bottom != null) ...[
            const SizedBox(height: 14),
            bottom!,
          ],
        ],
      ),
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: content,
        ),
      );
    }
    return content;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. TAJWEED RULES TILE
// ══════════════════════════════════════════════════════════════════════════════

class TajweedRulesTile extends StatelessWidget {
  final ThemeColors c;
  final bool isAr;
  final HighlightingController? controller;

  const TajweedRulesTile({
    super.key,
    required this.c,
    required this.isAr,
    this.controller,
  });

  @override
  Widget build(BuildContext context) {
    return SettingTile(
      icon: Icons.record_voice_over_rounded,
      title: isAr ? 'أحكام التجويد' : 'Tajweed Rules',
      c: c,
      onTap: () {
        Navigator.of(context).pop();
        DialogService.showTajweedSettings(context, controller: controller);
      },
      trailing: Icon(
        Icons.arrow_forward_ios_rounded,
        size: 15,
        color: c.muted,
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. SETTINGS MODAL BOTTOM SHEET
// ══════════════════════════════════════════════════════════════════════════════

/// Settings modal bottom sheet with modern styling and responsive reactivity.
class SettingsSheet extends StatelessWidget {
  final HighlightingController? controller;

  const SettingsSheet({super.key, this.controller});

  @override
  Widget build(BuildContext context) {
    return AppBottomSheet(
      maxHeightFactor: 0.75,
      extraListenable: AppState.instance.mushafModeNotifier,
      headerBuilder: (context, c, isAr, isDark) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 2, 20, 4),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFF10B981)
                .withValues(alpha: isDark ? 0.08 : 0.06),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0xFF10B981)
                  .withValues(alpha: isDark ? 0.22 : 0.15),
              width: 0.8,
            ),
          ),
          child: Center(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                'بفضل الله وبرحمته ربنا تقبل منا إنك أنت السميع العليم',
                maxLines: 1,
                softWrap: false,
                textAlign: TextAlign.center,
                textDirection: TextDirection.rtl,
                style: const TextStyle(
                  color: Color(0xFF10B981),
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  height: 1.25,
                ),
              ),
            ),
          ),
        ),
      ),
      builder: (context, c, isAr, isDark) {
        final app = AppState.instance;
        return SingleChildScrollView(
          physics: const ClampingScrollPhysics(),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 14),

              // ── Application Preferences Card ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.black.withValues(alpha: 0.035),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.08)
                          : Colors.black.withValues(alpha: 0.06),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(
                            alpha: isDark ? 0.25 : 0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // 1. Language
                      SettingTile(
                        icon: Icons.language_rounded,
                        title: isAr ? 'اللغة' : 'Language',
                        c: c,
                        trailing: AppSegmentedPillSelector(
                          labels: const ['عربي', 'English'],
                          selected: isAr ? 0 : 1,
                          c: c,
                          onSelected: (i) {
                            if ((i == 0 && !isAr) || (i == 1 && isAr)) {
                              app.toggleLanguage();
                            }
                          },
                        ),
                      ),
                      SettingDivider(c: c),

                      // 2. Theme
                      SettingTile(
                        icon: Icons.palette_rounded,
                        title: isAr ? 'المظهر' : 'Theme',
                        c: c,
                        trailing: AppSegmentedPillSelector(
                          labels: isAr
                              ? const ['أبيض', 'أسود']
                              : const ['White', 'Black'],
                          selected: app.theme.index,
                          c: c,
                          onSelected: (i) =>
                              app.setTheme(AppTheme.values[i]),
                        ),
                      ),
                      SettingDivider(c: c),

                      // 3. Tajweed Rules
                      TajweedRulesTile(
                        c: c,
                        isAr: isAr,
                        controller: controller,
                      ),

                      // 4. Sliders in reading mode
                      if (!app.isMushafMode) ...[
                        SettingDivider(c: c),
                        FontSliderTile(c: c, app: app, isAr: isAr),
                        SettingDivider(c: c),
                        AutoScrollSliderTile(c: c, app: app, isAr: isAr),
                      ],
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // ── Telegram Contact Banner ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.04)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFF229ED9).withValues(
                          alpha: isDark ? 0.35 : 0.25),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(
                            alpha: isDark ? 0.25 : 0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () async {
                        final uri =
                            Uri.parse('https://t.me/AlQuranElMageed');
                        try {
                          await launchUrl(uri,
                              mode: LaunchMode.externalApplication);
                        } catch (_) {}
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 11),
                        child: Row(
                          children: [
                            Stack(
                              alignment: Alignment.center,
                              children: [
                                Container(
                                  width: 22,
                                  height: 22,
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const Icon(
                                  Icons.telegram,
                                  color: Color(0xFF229ED9),
                                  size: 36,
                                ),
                              ],
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    isAr
                                        ? 'وأمرهم شورى بينهم'
                                        : 'Their affair is mutual consultation',
                                    style: TextStyle(
                                      color: c.text,
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 1.5),
                                  Text(
                                    '@AlQuranElMageed',
                                    style: TextStyle(
                                      color: c.textSecondary
                                          .withValues(alpha: 0.8),
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFF229ED9),
                                borderRadius:
                                    BorderRadius.circular(10),
                              ),
                              child: Text(
                                isAr ? 'مراسلة' : 'Message',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // ── Bottom Action Buttons (How to Use & Reset - Single Line Guaranteed) ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.center,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // 1. How to Use
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(8),
                          onTap: () {
                            Navigator.of(context).pop();
                            DialogService.showAppGuide(context);
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.help_outline_rounded,
                                  size: 13,
                                  color: c.textSecondary.withValues(alpha: 0.65),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  isAr ? 'دليل الاستخدام' : 'How to Use',
                                  style: TextStyle(
                                    color: c.textSecondary.withValues(alpha: 0.70),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    height: 1.1,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                      Container(
                        width: 3,
                        height: 3,
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        decoration: BoxDecoration(
                          color: c.textSecondary.withValues(alpha: 0.35),
                          shape: BoxShape.circle,
                        ),
                      ),

                      // 2. Reset to Default Settings
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(8),
                          onTap: () async {
                            final prefs =
                                await SharedPreferences.getInstance();
                            final savedSurah = prefs.getInt('last_surah');
                            final savedAyah = prefs.getInt('last_ayah');
                            await prefs.clear();
                            if (savedSurah != null) {
                              await prefs.setInt('last_surah', savedSurah);
                            }
                            if (savedAyah != null) {
                              await prefs.setInt('last_ayah', savedAyah);
                            }
                            if (context.mounted) {
                              await app.load();
                              if (context.mounted) {
                                Navigator.of(context).pop();
                                app.showSettingsResetBanner();
                              }
                            }
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.refresh_rounded,
                                  size: 13,
                                  color:
                                      c.textSecondary.withValues(alpha: 0.65),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  isAr
                                      ? 'إعادة ضبط الإعدادات'
                                      : 'Reset Settings',
                                  style: TextStyle(
                                    color: c.textSecondary
                                        .withValues(alpha: 0.70),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    height: 1.1,
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
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. FONT SIZE & AUTO-SCROLL SLIDERS
// ══════════════════════════════════════════════════════════════════════════════

class FontSliderTile extends StatefulWidget {
  final ThemeColors c;
  final AppState app;
  final bool isAr;

  const FontSliderTile({
    super.key,
    required this.c,
    required this.app,
    required this.isAr,
  });

  @override
  State<FontSliderTile> createState() => _FontSliderTileState();
}

class _FontSliderTileState extends State<FontSliderTile> {
  late double _localSize;

  @override
  void initState() {
    super.initState();
    _localSize = widget.app.fontSize;
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.c;
    final app = widget.app;
    final isAr = widget.isAr;
    final isDark = app.isDarkMode;

    return SettingTile(
      iconWidget: const Center(
        child: Text(
          'Aa',
          style: TextStyle(
            color: Color(0xFF10B981),
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
      ),
      title: isAr ? 'حجم الخط' : 'Font Size',
      c: c,
      trailing: Row(
        children: [
          Text(
            'أ',
            style: TextStyle(
              fontFamily: 'HafsSmart',
              color: c.muted,
              fontSize: 12,
            ),
          ),
          Expanded(
            child: SliderTheme(
              data: SliderThemeData(
                thumbShape: const RoundSliderThumbShape(
                  enabledThumbRadius: 7,
                ),
                overlayShape: const RoundSliderOverlayShape(
                  overlayRadius: 14,
                ),
                trackHeight: 4,
                activeTrackColor: const Color(0xFF10B981),
                inactiveTrackColor: isDark
                    ? Colors.white.withValues(alpha: 0.12)
                    : Colors.black.withValues(alpha: 0.08),
                thumbColor: const Color(0xFF10B981),
                overlayColor: const Color(0xFF10B981).withValues(alpha: 0.15),
              ),
              child: Slider(
                value: _localSize,
                min: 16.0,
                max: 42.0,
                onChanged: (v) {
                  setState(() => _localSize = v);
                  app.setFontSize(v);
                },
                onChangeEnd: (v) {
                  app.setFontSize(v, persistImmediately: true);
                },
              ),
            ),
          ),
          Text(
            'أ',
            style: TextStyle(
              fontFamily: 'HafsSmart',
              color: c.muted,
              fontSize: 22,
            ),
          ),
        ],
      ),
    );
  }
}

class AutoScrollSliderTile extends StatefulWidget {
  final ThemeColors c;
  final AppState app;
  final bool isAr;

  const AutoScrollSliderTile({
    super.key,
    required this.c,
    required this.app,
    required this.isAr,
  });

  @override
  State<AutoScrollSliderTile> createState() => _AutoScrollSliderTileState();
}

class _AutoScrollSliderTileState extends State<AutoScrollSliderTile> {
  late double _localSpeed;

  @override
  void initState() {
    super.initState();
    _localSpeed = widget.app.autoScrollSpeed.toDouble();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.c;
    final app = widget.app;
    final isAr = widget.isAr;
    final isDark = app.isDarkMode;
    final labels = AppState.speedLabels;

    return SettingTile(
      icon: Icons.speed_rounded,
      title: isAr ? 'سرعة التمرير التلقائي' : 'Auto-Scroll Speed',
      c: c,
      trailing: Text(
        labels[_localSpeed.toInt()],
        style: const TextStyle(
          color: Color(0xFF10B981),
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
      ),
      bottom: SliderTheme(
        data: SliderThemeData(
          thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 7),
          overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
          trackHeight: 4,
          activeTrackColor: const Color(0xFF10B981),
          inactiveTrackColor: isDark
              ? Colors.white.withValues(alpha: 0.12)
              : Colors.black.withValues(alpha: 0.08),
          thumbColor: const Color(0xFF10B981),
          overlayColor: const Color(0xFF10B981).withValues(alpha: 0.15),
          tickMarkShape: const RoundSliderTickMarkShape(tickMarkRadius: 2),
          activeTickMarkColor: Colors.white,
          inactiveTickMarkColor: isDark
              ? Colors.white.withValues(alpha: 0.15)
              : Colors.black.withValues(alpha: 0.12),
        ),
        child: Slider(
          value: _localSpeed,
          min: 0,
          max: (labels.length - 1).toDouble(),
          divisions: labels.length - 1,
          label: labels[_localSpeed.toInt()],
          onChanged: (v) {
            setState(() => _localSpeed = v);
          },
          onChangeEnd: (v) {
            app.setAutoScrollSpeed(v.toInt());
          },
        ),
      ),
    );
  }
}
