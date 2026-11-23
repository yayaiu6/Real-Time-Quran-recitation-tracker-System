import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/app_state.dart';
import 'dialog_base.dart';

// ══════════════════════════════════════════════════════════════════════════════
// 1. APP GUIDE & HOW-TO DIALOG
// ══════════════════════════════════════════════════════════════════════════════

/// Ultra-lightweight user guide explaining:
/// 1. Voice recitation with mic & word status colors.
/// 2. Hifz / Hide Verse Mode (revealing words on recitation).
/// 3. Voice search inside Surah list.
class AppGuideDialog extends StatelessWidget {
  const AppGuideDialog({super.key});

  /// Displays the AppGuideDialog modal centered with zero eye strain.
  static Future<void> show(BuildContext context) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      barrierColor: DialogTokens.barrierColor,
      builder: (_) => const AppGuideDialog(),
    );
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('has_seen_app_guide_v1', true);
  }

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final c = app.colors;
    final isAr = app.isArabic;
    final isDark = app.isDarkMode;

    final divider = Padding(
      padding: const EdgeInsets.symmetric(vertical: 5.5),
      child: Divider(
        height: 1,
        thickness: 0.7,
        color: c.border.withValues(alpha: isDark ? 0.16 : 0.22),
      ),
    );

    return AppDialog(
      maxWidth: 395,
      scrollable: true,
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
      topTrailing: IconButton(
        onPressed: () => Navigator.of(context).pop(),
        icon: Icon(Icons.close_rounded, color: c.muted, size: 20),
        visualDensity: VisualDensity.compact,
        padding: EdgeInsets.zero,
        constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
      ),
      content: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: c.surfaceHigh.withValues(alpha: isDark ? 0.35 : 0.55),
          borderRadius: BorderRadius.circular(DialogTokens.cardRadius),
          border: Border.fromBorderSide(DialogTokens.borderSide(c, isDark)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Column(
          children: [
            // 1. Voice Recitation & Colors
            _buildRow(
              icon: Icons.mic_rounded,
              iconColor: c.primary,
              title: isAr ? 'التسميع الصوتي' : 'Voice Recitation',
              c: c,
              extra: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isAr
                        ? 'اضغط زر الميكروفون بالأسفل وابدأ القراءة بصوتك.'
                        : 'Tap the bottom Mic button and start reciting aloud.',
                    style: TextStyle(color: c.textSecondary, fontSize: 11.5, height: 1.35),
                  ),
                  const SizedBox(height: 5),
                  Wrap(
                    spacing: 5,
                    runSpacing: 4,
                    children: [
                      _buildChip(c.green, isAr ? 'أخضر: صحيح' : 'Green: Correct', c, isDark),
                      _buildChip(c.warning, isAr ? 'أصفر: تجويد (اضغط للشرح)' : 'Yellow: Tajweed (tap to view)', c, isDark),
                      _buildChip(c.red, isAr ? 'أحمر: خطأ' : 'Red: Error', c, isDark),
                    ],
                  ),
                ],
              ),
            ),
            divider,

            // 2. Hifz / Hide Verse Mode
            _buildRow(
              icon: Icons.visibility_off_rounded,
              iconColor: const Color(0xFF6366F1),
              title: isAr ? 'وضع الحفظ (إخفاء الآيات)' : 'Hifz Mode (Hide Verses)',
              text: isAr
                  ? 'اضغط أيقونة العين لإخفاء الكلمات، وتظهر فور نطقك الصحيح لها.'
                  : 'Tap the Eye icon to hide words; they reveal as you recite correctly.',
              c: c,
            ),
            divider,

            // 3. Voice Search
            _buildRow(
              icon: Icons.graphic_eq_rounded,
              iconColor: const Color(0xFF10B981),
              title: isAr ? 'البحث الصوتي' : 'Voice Search',
              text: isAr
                  ? 'زر داخل قائمة السور للبحث الصوتي عن أي آية بمجرد نطقها.'
                  : 'Recite any verse inside the Surah list to jump to it instantly.',
              c: c,
            ),
          ],
        ),
      ),
      primaryAction: AppDialogActionItem(
        label: isAr ? 'فهمت' : 'Got it',
        onPressed: () => Navigator.of(context).pop(),
      ),
    );
  }

  Widget _buildChip(Color color, String label, ThemeColors c, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: isDark ? 0.16 : 0.10),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: color.withValues(alpha: isDark ? 0.38 : 0.28),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 5.5,
            height: 5.5,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 4.5),
          Text(
            label,
            style: TextStyle(
              color: isDark ? c.text : color,
              fontSize: 10.6,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required ThemeColors c,
    String? text,
    Widget? extra,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          alignment: Alignment.center,
          child: Icon(icon, size: 16.5, color: iconColor),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(color: c.text, fontSize: 12.5, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 1.5),
              if (text != null)
                Text(
                  text,
                  style: TextStyle(color: c.textSecondary, fontSize: 11.5, height: 1.35),
                ),
              if (extra != null) extra,
            ],
          ),
        ),
      ],
    );
  }
}

/// Backward compatibility alias
typedef WhatsNewDialog = AppGuideDialog;
