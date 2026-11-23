import 'package:flutter/material.dart';
import '../../../core/app_state.dart';
import 'dialog_base.dart';

// ══════════════════════════════════════════════════════════════════════════════
// 1. THEME SELECTION MODAL
// ══════════════════════════════════════════════════════════════════════════════

class ThemeSelectionDialog extends StatefulWidget {
  final VoidCallback onThemeSelected;

  const ThemeSelectionDialog({super.key, required this.onThemeSelected});

  @override
  State<ThemeSelectionDialog> createState() => _ThemeSelectionDialogState();
}

class _ThemeSelectionDialogState extends State<ThemeSelectionDialog> {
  int? _selectedIndex;

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final isAr = app.isArabic;
    final c = app.colors;

    return AppDialog(
      title: isAr ? 'اختر مظهر التطبيق' : 'Choose App Theme',
      banner: AppDialogInfoBanner(
        text: isAr
            ? 'يمكنك تغيير المظهر لاحقاً من الإعدادات'
            : 'You can change this later in settings',
      ),
      content: Padding(
        padding: const EdgeInsets.only(top: 10),
        child: Wrap(
          alignment: WrapAlignment.center,
          spacing: 36,
          runSpacing: 18,
          children: [
            _ThemeSwatch(
              title: isAr ? 'أبيض' : 'White',
              color: const Color(0xFFFAF8F5),
              isSelected: _selectedIndex == 0 ||
                  (_selectedIndex == null && app.theme == AppTheme.white),
              c: c,
              onTap: () {
                setState(() => _selectedIndex = 0);
                app.setTheme(AppTheme.white);
                Future.delayed(
                  const Duration(milliseconds: 150),
                  widget.onThemeSelected,
                );
              },
            ),
            _ThemeSwatch(
              title: isAr ? 'أسود' : 'Black',
              color: const Color(0xFF000000),
              isSelected: _selectedIndex == 1 ||
                  (_selectedIndex == null && app.theme == AppTheme.black),
              c: c,
              onTap: () {
                setState(() => _selectedIndex = 1);
                app.setTheme(AppTheme.black);
                Future.delayed(
                  const Duration(milliseconds: 150),
                  widget.onThemeSelected,
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ThemeSwatch extends StatefulWidget {
  final String title;
  final Color color;
  final bool isSelected;
  final ThemeColors c;
  final VoidCallback onTap;

  const _ThemeSwatch({
    required this.title,
    required this.color,
    required this.isSelected,
    required this.c,
    required this.onTap,
  });

  @override
  State<_ThemeSwatch> createState() => _ThemeSwatchState();
}

class _ThemeSwatchState extends State<_ThemeSwatch>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.9).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        widget.onTap();
      },
      onTapCancel: () => _controller.reverse(),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ScaleTransition(
            scale: _scaleAnimation,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOut,
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: widget.color,
                shape: BoxShape.circle,
                border: Border.all(
                  color: widget.isSelected ? widget.c.primary : widget.c.border,
                  width: widget.isSelected ? 3 : 1.5,
                ),
                boxShadow: widget.isSelected
                    ? [
                        BoxShadow(
                          color: widget.c.primary.withValues(alpha: 0.3),
                          blurRadius: 15,
                          offset: const Offset(0, 4),
                        )
                      ]
                    : [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        )
                      ],
              ),
              child: widget.isSelected
                  ? Center(
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: widget.c.primary,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.check_rounded,
                          color: Colors.white,
                          size: 18,
                        ),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            widget.title,
            style: TextStyle(
              color: widget.isSelected ? widget.c.primary : widget.c.muted,
              fontSize: 15,
              fontWeight: widget.isSelected ? FontWeight.bold : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. AUTO-SCROLL SPEED SELECTION MODAL
// ══════════════════════════════════════════════════════════════════════════════

class SpeedSelectionDialog extends StatefulWidget {
  final VoidCallback onSpeedSelected;

  const SpeedSelectionDialog({super.key, required this.onSpeedSelected});

  @override
  State<SpeedSelectionDialog> createState() => _SpeedSelectionDialogState();
}

class _SpeedSelectionDialogState extends State<SpeedSelectionDialog> {
  int? _selectedIndex;

  void _selectSpeed(AppState app, int speedIndex) {
    setState(() => _selectedIndex = speedIndex);
    app.setAutoScrollSpeed(speedIndex);
    Future.delayed(const Duration(milliseconds: 100), widget.onSpeedSelected);
  }

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final c = app.colors;
    final isAr = app.isArabic;
    final isDark = app.isDarkMode;

    return AppDialog(
      maxWidth: 350,
      heroIcon: const AppDialogHeroIcon(
        icon: Icons.speed_rounded,
        iconSize: 24,
        isCircle: false,
        padding: 12,
      ),
      title: isAr ? 'سرعة التمرير التلقائي' : 'Auto-Scroll Speed',
      banner: AppDialogInfoBanner(
        icon: Icons.tune_rounded,
        text: isAr
            ? 'يمكنك ضبط وتغيير السرعة لاحقاً من الإعدادات'
            : 'You can adjust speed anytime in settings',
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ModernSpeedTile(
            title: isAr ? 'بطيء' : 'Slow',
            speedBadge: '0.5x',
            isSelected: _selectedIndex == 1 ||
                (_selectedIndex == null && app.autoScrollSpeed == 1),
            c: c,
            isDark: isDark,
            onTap: () => _selectSpeed(app, 1),
          ),
          const SizedBox(height: 8),
          _ModernSpeedTile(
            title: isAr ? 'عادي' : 'Normal',
            speedBadge: '1.0x',
            isSelected: _selectedIndex == 2 ||
                (_selectedIndex == null && app.autoScrollSpeed == 2),
            c: c,
            isDark: isDark,
            onTap: () => _selectSpeed(app, 2),
          ),
          const SizedBox(height: 8),
          _ModernSpeedTile(
            title: isAr ? 'سريع' : 'Fast',
            speedBadge: '2.0x',
            isSelected: _selectedIndex == 4 ||
                (_selectedIndex == null && app.autoScrollSpeed == 4),
            c: c,
            isDark: isDark,
            onTap: () => _selectSpeed(app, 4),
          ),
        ],
      ),
    );
  }
}

class _ModernSpeedTile extends StatelessWidget {
  final String title;
  final String speedBadge;
  final bool isSelected;
  final ThemeColors c;
  final bool isDark;
  final VoidCallback onTap;

  const _ModernSpeedTile({
    required this.title,
    required this.speedBadge,
    required this.isSelected,
    required this.c,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppScaleButton(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: isSelected
              ? c.primary.withValues(alpha: isDark ? 0.16 : 0.08)
              : (isDark ? Colors.white.withValues(alpha: 0.04) : c.surfaceHigh),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(
            color: isSelected
                ? c.primary
                : (isDark
                    ? Colors.white.withValues(alpha: 0.08)
                    : c.border.withValues(alpha: 0.55)),
            width: isSelected ? 1.5 : 0.9,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: c.primary.withValues(alpha: 0.16),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ]
              : [],
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: isSelected ? c.primary : c.text,
                  fontSize: 15,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: isSelected
                    ? c.primary.withValues(alpha: 0.18)
                    : (isDark
                        ? Colors.white.withValues(alpha: 0.06)
                        : c.border.withValues(alpha: 0.35)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                speedBadge,
                style: TextStyle(
                  color: isSelected ? c.primary : c.textSecondary,
                  fontSize: 11.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            if (isSelected) ...[
              const SizedBox(width: 8),
              Icon(
                Icons.check_circle_rounded,
                color: c.primary,
                size: 18,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
