import 'package:flutter/material.dart';
import '../../../core/app_state.dart';
import '../../../core/highlighting_controller.dart';
import 'dialog_base.dart';

// ══════════════════════════════════════════════════════════════════════════════
// TAJWEED VERIFICATION RULES MODAL DIALOG
// ══════════════════════════════════════════════════════════════════════════════

/// Ultra-lightweight modal dialog for toggling Tajweed verification rules.
///
/// Fingerprint:
/// - Built on [AppDialog] and [DialogTokens] for consistent modal styling.
/// - Single unified rule column with instant reactive state persistence.
class TajweedRulesDialog extends StatefulWidget {
  final HighlightingController? controller;

  const TajweedRulesDialog({super.key, this.controller});

  /// Displays the Tajweed rules dialog modally.
  static Future<void> show(
    BuildContext context, {
    HighlightingController? controller,
  }) {
    return showDialog<void>(
      context: context,
      barrierColor: DialogTokens.barrierColor,
      builder: (_) => TajweedRulesDialog(controller: controller),
    );
  }

  @override
  State<TajweedRulesDialog> createState() => _TajweedRulesDialogState();
}

class _TajweedRulesDialogState extends State<TajweedRulesDialog> {
  late TajweedConfig _config;

  static const _rules = [
    (
      'checkTashkeel',
      'التشكيل والحركات',
      'Tashkeel (Diacritics)',
    ),
    (
      'checkLetterSwap',
      'مخارج الحروف',
      'Makharij & Letters',
    ),
    (
      'checkMadd',
      'المدود',
      'Madd (Elongations)',
    ),
    (
      'checkGhunnah',
      'الغنة',
      'Ghunnah (Nasalization)',
    ),
    (
      'checkQalqalah',
      'القلقلة',
      'Qalqalah (Echo)',
    ),
    (
      'checkShaddah',
      'الشدة',
      'Shaddah (Gemination)',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _config = AppState.instance.tajweedConfig;
  }

  bool _isChecked(String key) => switch (key) {
        'checkMadd' => _config.checkMadd,
        'checkTashkeel' => _config.checkTashkeel,
        'checkGhunnah' => _config.checkGhunnah,
        'checkShaddah' => _config.checkShaddah,
        'checkQalqalah' => _config.checkQalqalah,
        _ => _config.checkLetterSwap,
      };

  void _toggle(String key) {
    setState(() {
      _config = switch (key) {
        'checkMadd' => _config.copyWith(checkMadd: !_config.checkMadd),
        'checkTashkeel' =>
          _config.copyWith(checkTashkeel: !_config.checkTashkeel),
        'checkGhunnah' => _config.copyWith(checkGhunnah: !_config.checkGhunnah),
        'checkShaddah' => _config.copyWith(checkShaddah: !_config.checkShaddah),
        'checkQalqalah' =>
          _config.copyWith(checkQalqalah: !_config.checkQalqalah),
        _ => _config.copyWith(checkLetterSwap: !_config.checkLetterSwap),
      };
    });
  }

  bool get _allSelected =>
      _config.checkMadd &&
      _config.checkTashkeel &&
      _config.checkGhunnah &&
      _config.checkShaddah &&
      _config.checkQalqalah &&
      _config.checkLetterSwap;

  void _toggleAll() {
    setState(() {
      final selectAll = !_allSelected;
      _config = TajweedConfig(
        checkMadd: selectAll,
        checkTashkeel: selectAll,
        checkGhunnah: selectAll,
        checkShaddah: selectAll,
        checkQalqalah: selectAll,
        checkLetterSwap: selectAll,
      );
    });
  }

  void _onDone() {
    final app = AppState.instance;
    app.setTajweedConfig(_config, widget.controller);
    if (!_config.isAnyCheckEnabled) {
      app.setMode(AppMode.wordChecker);
      widget.controller?.setTajweedMode(false);
      app.dismissTajweedBanner();
    } else {
      app.setMode(AppMode.tajweed);
      widget.controller?.setTajweedMode(true);
      app.showTajweedBanner();
    }
    Navigator.of(context).pop();
  }

  void _onTurnOff() {
    final app = AppState.instance;
    app.setMode(AppMode.wordChecker);
    widget.controller?.setTajweedMode(false);
    app.dismissTajweedBanner();
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final c = app.colors;
    final isAr = app.isArabic;
    final isDark = app.isDarkMode;
    final allSelected = _allSelected;
    final isTajweedActive = app.currentMode == AppMode.tajweed;

    return Directionality(
      textDirection: isAr ? TextDirection.rtl : TextDirection.ltr,
      child: AppDialog(
        maxWidth: 360,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
        title: isAr ? 'أحكام التجويد' : 'Tajweed Rules',
        titleFontSize: 15.0,
        primaryAction: AppDialogActionItem(
          label: isAr ? 'تم' : 'Done',
          onPressed: _onDone,
        ),
        secondaryAction: isTajweedActive
            ? AppDialogActionItem(
                label: isAr ? 'إيقاف التجويد' : 'Turn Off',
                isDestructive: true,
                onPressed: _onTurnOff,
              )
            : AppDialogActionItem(
                label: isAr ? 'إلغاء' : 'Cancel',
                onPressed: () => Navigator.of(context).pop(),
              ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 4),

            // ── Toolbar: Select All Toggle ──
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _toggleAll,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      allSelected
                          ? Icons.check_box_rounded
                          : Icons.check_box_outline_blank_rounded,
                      size: 20,
                      color: allSelected ? const Color(0xFF10B981) : c.muted,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      allSelected
                          ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect All')
                          : (isAr ? 'تحديد الكل' : 'Select All'),
                      style: TextStyle(
                        fontFamily: 'cairo',
                        color: c.textSecondary,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 8),

            // ── Single Column Rules Container ──
            Container(
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.03)
                    : Colors.black.withValues(alpha: 0.02),
                borderRadius: BorderRadius.circular(DialogTokens.cardRadius),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : Colors.black.withValues(alpha: 0.06),
                  width: 1,
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(DialogTokens.cardRadius),
                child: Column(
                  children: List.generate(_rules.length, (idx) {
                    final (key, titleAr, titleEn) = _rules[idx];
                    final isSel = _isChecked(key);

                    return Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => _toggle(key),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12.5,
                          ),
                          decoration: BoxDecoration(
                            border: idx < _rules.length - 1
                                ? Border(
                                    bottom: BorderSide(
                                      color: isDark
                                          ? Colors.white.withValues(alpha: 0.05)
                                          : Colors.black.withValues(alpha: 0.04),
                                      width: 0.6,
                                    ),
                                  )
                                : null,
                          ),
                          child: Row(
                            children: [
                              Icon(
                                isSel
                                    ? Icons.check_box_rounded
                                    : Icons.check_box_outline_blank_rounded,
                                size: 20,
                                color: isSel
                                    ? const Color(0xFF10B981)
                                    : c.muted,
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Text(
                                  isAr ? titleAr : titleEn,
                                  style: TextStyle(
                                    fontFamily: 'cairo',
                                    color: isSel ? c.text : c.textSecondary,
                                    fontSize: 14.5,
                                    fontWeight: isSel
                                        ? FontWeight.w600
                                        : FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
