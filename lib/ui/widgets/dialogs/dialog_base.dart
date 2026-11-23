import 'package:flutter/material.dart';
import '../../../core/app_state.dart';

// ══════════════════════════════════════════════════════════════════════════════
// 1. DESIGN TOKENS
// ══════════════════════════════════════════════════════════════════════════════

/// Centralized Design Tokens for all dialogs, modal sheets, and popups.
abstract final class DialogTokens {
  // ── Radii ──
  static const double dialogRadius = 26.0;
  static const double sheetRadius = 28.0;
  static const double handleRadius = 2.0;
  static const double cardRadius = 18.0;
  static const double buttonRadius = 12.0;
  static const double pillRadius = 12.0;

  // ── Handle Dimensions ──
  static const double handleWidth = 44.0;
  static const double handleHeight = 4.0;

  // ── Insets & Sizing ──
  static const double defaultDialogMaxWidth = 400.0;
  static const double defaultSheetMaxHeightFactor = 0.85;
  static const EdgeInsets dialogInsetPadding =
      EdgeInsets.symmetric(horizontal: 24, vertical: 24);
  static const EdgeInsets dialogContentPadding = EdgeInsets.all(22);

  // ── Barrier Dimming ──
  static final Color barrierColor = Colors.black.withValues(alpha: 0.54);

  // ── Borders ──
  static BorderSide borderSide(ThemeColors c, bool isDark) => BorderSide(
        color: isDark
            ? Colors.white.withValues(alpha: 0.12)
            : c.border.withValues(alpha: 0.28),
        width: 1.0,
      );

  static BorderSide sheetBorderSide(ThemeColors c, bool isDark) => BorderSide(
        color: isDark
            ? c.border.withValues(alpha: 0.35)
            : c.border.withValues(alpha: 0.70),
        width: 1.0,
      );

  // ── Elevation Shadows ──
  static List<BoxShadow> dialogShadow(bool isDark) => [
        BoxShadow(
          color: Colors.black.withValues(alpha: isDark ? 0.38 : 0.08),
          blurRadius: 18,
          offset: const Offset(0, 6),
        ),
      ];

  static List<BoxShadow> sheetShadow(bool isDark) => [
        BoxShadow(
          color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
          blurRadius: 16,
          offset: const Offset(0, -4),
        ),
      ];
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. ATOMIC MICRO-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

/// Standardized drag handle bar for bottom sheets.
class AppDragHandle extends StatelessWidget {
  final double width;
  final double height;
  final EdgeInsetsGeometry padding;

  const AppDragHandle({
    super.key,
    this.width = DialogTokens.handleWidth,
    this.height = DialogTokens.handleHeight,
    this.padding = const EdgeInsets.only(top: 14, bottom: 12),
  });

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final c = app.colors;
    final isDark = app.isDarkMode;

    return Center(
      child: Padding(
        padding: padding,
        child: Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            color: isDark ? c.border.withValues(alpha: 0.8) : c.border,
            borderRadius: BorderRadius.circular(DialogTokens.handleRadius),
          ),
        ),
      ),
    );
  }
}

/// Standardized signature modal header for bottom sheets and dialogs.
/// Displays Title + Subtitle on start, optional extra actions, and a tactile Close (X) button on end.
class AppModalHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? leading;
  final List<Widget>? actions;
  final VoidCallback? onClose;
  final bool showCloseButton;
  final EdgeInsetsGeometry padding;

  const AppModalHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.actions,
    this.onClose,
    this.showCloseButton = true,
    this.padding = const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
  });

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final c = app.colors;
    final isAr = app.isArabic;

    return Padding(
      padding: padding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (leading != null) ...[
            leading!,
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: c.text,
                    fontSize: 16.5,
                    fontWeight: FontWeight.bold,
                    letterSpacing: isAr ? 0.0 : -0.2,
                  ),
                ),
                if (subtitle != null && subtitle!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: TextStyle(
                      color: c.muted,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (actions != null) ...actions!,
          if (showCloseButton)
            IconButton(
              tooltip: isAr ? 'إغلاق' : 'Close',
              visualDensity: VisualDensity.compact,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
              onPressed: () {
                if (onClose != null) {
                  onClose!();
                } else if (Navigator.of(context).canPop()) {
                  Navigator.of(context).pop();
                }
              },
              icon: Icon(
                Icons.close_rounded,
                color: c.muted,
                size: 20,
              ),
            ),
        ],
      ),
    );
  }
}

/// Tactile button wrapper with spring scale press feedback.
class AppScaleButton extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  final double scaleDown;
  final Duration duration;

  const AppScaleButton({
    super.key,
    required this.child,
    required this.onTap,
    this.scaleDown = 0.96,
    this.duration = const Duration(milliseconds: 110),
  });

  @override
  State<AppScaleButton> createState() => _AppScaleButtonState();
}

class _AppScaleButtonState extends State<AppScaleButton> {
  bool _isDown = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => setState(() => _isDown = true),
      onTapUp: (_) => setState(() => _isDown = false),
      onTapCancel: () => setState(() => _isDown = false),
      onTap: () {
        widget.onTap();
      },
      child: AnimatedScale(
        scale: _isDown ? widget.scaleDown : 1.0,
        duration: widget.duration,
        curve: _isDown ? Curves.easeOutQuad : Curves.easeOutBack,
        child: widget.child,
      ),
    );
  }
}

/// Ultra-smooth segmented pill selector used across sheets and dialogs.
class AppSegmentedPillSelector extends StatelessWidget {
  final List<String> labels;
  final List<IconData>? icons;
  final int selected;
  final ThemeColors c;
  final ValueChanged<int> onSelected;
  final double height;

  const AppSegmentedPillSelector({
    super.key,
    required this.labels,
    this.icons,
    required this.selected,
    required this.c,
    required this.onSelected,
    this.height = 38.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = AppState.instance.isDarkMode;

    return Container(
      height: height,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.05)
            : Colors.black.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(DialogTokens.pillRadius),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.06),
          width: 0.8,
        ),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final pillWidth = constraints.maxWidth / labels.length;

          return Stack(
            children: [
              AnimatedPositioned(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOutCubic,
                left: Directionality.of(context) == TextDirection.ltr
                    ? selected * pillWidth
                    : (labels.length - 1 - selected) * pillWidth,
                top: 0,
                bottom: 0,
                width: pillWidth,
                child: Container(
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF22293F) : Colors.white,
                    borderRadius: BorderRadius.circular(DialogTokens.pillRadius - 2),
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.12)
                          : Colors.black.withValues(alpha: 0.06),
                      width: 0.8,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.30 : 0.06),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                ),
              ),
              Row(
                children: List.generate(labels.length, (i) {
                  final isSel = i == selected;
                  final activeColor = isDark
                      ? const Color(0xFF10B981)
                      : const Color(0xFF059669);

                  return Expanded(
                    child: GestureDetector(
                      onTap: () {
                        onSelected(i);
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Center(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            if (icons != null && i < icons!.length) ...[
                              Icon(
                                icons![i],
                                size: 16,
                                color: isSel ? activeColor : c.muted,
                              ),
                              const SizedBox(width: 6),
                            ],
                            AnimatedDefaultTextStyle(
                              duration: const Duration(milliseconds: 180),
                              style: TextStyle(
                                color: isSel ? activeColor : c.muted,
                                fontSize: 13,
                                fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                              ),
                              child: Text(labels[i]),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Reusable Hero Icon badge displayed prominently at the top of dialogs.
class AppDialogHeroIcon extends StatelessWidget {
  final IconData icon;
  final Color? color;
  final double iconSize;
  final double padding;
  final bool isCircle;

  const AppDialogHeroIcon({
    super.key,
    required this.icon,
    this.color,
    this.iconSize = 32,
    this.padding = 16,
    this.isCircle = true,
  });

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final c = app.colors;
    final isDark = app.isDarkMode;
    final tint = color ?? c.primary;

    return Container(
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: tint.withValues(alpha: isDark ? 0.14 : 0.09),
        shape: isCircle ? BoxShape.circle : BoxShape.rectangle,
        borderRadius: isCircle ? null : BorderRadius.circular(16),
        border: Border.all(
          color: tint.withValues(alpha: isDark ? 0.28 : 0.20),
          width: 1,
        ),
      ),
      child: Icon(
        icon,
        color: tint,
        size: iconSize,
      ),
    );
  }
}

/// Subtle informative banner used across dialogs to highlight tips or caveats.
class AppDialogInfoBanner extends StatelessWidget {
  final String text;
  final IconData? icon;
  final Color? accentColor;
  final TextAlign textAlign;

  const AppDialogInfoBanner({
    super.key,
    required this.text,
    this.icon,
    this.accentColor,
    this.textAlign = TextAlign.center,
  });

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final c = app.colors;
    final isDark = app.isDarkMode;
    final accent = accentColor ?? c.primary;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: isDark ? 0.08 : 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: accent.withValues(alpha: isDark ? 0.22 : 0.15),
          width: 0.8,
        ),
      ),
      child: icon != null
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 16, color: accent),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    text,
                    textAlign: textAlign,
                    style: TextStyle(
                      color: accent,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      height: 1.35,
                    ),
                  ),
                ),
              ],
            )
          : Text(
              text,
              textAlign: textAlign,
              style: TextStyle(
                color: accent,
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                height: 1.35,
              ),
            ),
    );
  }
}

/// Action item specification for [AppDialogActionButtons].
class AppDialogActionItem {
  final String label;
  final VoidCallback onPressed;
  final bool isDestructive;
  final bool isLoading;

  const AppDialogActionItem({
    required this.label,
    required this.onPressed,
    this.isDestructive = false,
    this.isLoading = false,
  });
}

/// Unified dialog action button row (Primary + Optional Secondary).
class AppDialogActionButtons extends StatelessWidget {
  final AppDialogActionItem primary;
  final AppDialogActionItem? secondary;

  const AppDialogActionButtons({
    super.key,
    required this.primary,
    this.secondary,
  });

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final c = app.colors;

    final primaryBtn = ElevatedButton(
      onPressed: primary.isLoading
          ? null
          : () {
              primary.onPressed();
            },
      style: ElevatedButton.styleFrom(
        backgroundColor: primary.isDestructive ? c.red : c.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 13),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DialogTokens.buttonRadius),
        ),
      ),
      child: primary.isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            )
          : Text(
              primary.label,
              style: const TextStyle(
                fontSize: 15.5,
                fontWeight: FontWeight.bold,
              ),
            ),
    );

    if (secondary == null) {
      return SizedBox(
        width: double.infinity,
        child: primaryBtn,
      );
    }

    final secondaryBtn = TextButton(
      onPressed: secondary!.isLoading
          ? null
          : () {
              secondary!.onPressed();
            },
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 13),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DialogTokens.buttonRadius),
        ),
      ),
      child: Text(
        secondary!.label,
        style: TextStyle(
          color: secondary!.isDestructive ? c.red : c.muted,
          fontSize: 15,
          fontWeight: FontWeight.w600,
        ),
      ),
    );

    return Row(
      children: [
        Expanded(child: secondaryBtn),
        const SizedBox(width: 12),
        Expanded(child: primaryBtn),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. BASE DIALOG SHELL (Centered Modal)
// ══════════════════════════════════════════════════════════════════════════════

typedef AppDialogContentBuilder = Widget Function(
  BuildContext context,
  ThemeColors colors,
  bool isArabic,
  bool isDark,
);

/// Standardized, theme-reactive modal dialog shell for Natlu.
class AppDialog extends StatelessWidget {
  final Widget? heroIcon;
  final String? title;
  final double? titleFontSize;
  final TextStyle? titleStyle;
  final String? subtitle;
  final Widget? banner;
  final Widget? content;
  final AppDialogContentBuilder? contentBuilder;
  final Widget? topTrailing;
  final AppDialogActionItem? primaryAction;
  final AppDialogActionItem? secondaryAction;
  final Widget? customActions;
  final double maxWidth;
  final double? maxHeight;
  final EdgeInsetsGeometry padding;
  final bool scrollable;

  const AppDialog({
    super.key,
    this.heroIcon,
    this.title,
    this.titleFontSize,
    this.titleStyle,
    this.subtitle,
    this.banner,
    this.content,
    this.contentBuilder,
    this.topTrailing,
    this.primaryAction,
    this.secondaryAction,
    this.customActions,
    this.maxWidth = DialogTokens.defaultDialogMaxWidth,
    this.maxHeight,
    this.padding = DialogTokens.dialogContentPadding,
    this.scrollable = false,
  });

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;

    return RepaintBoundary(
      child: ListenableBuilder(
        listenable: Listenable.merge([app.themeNotifier, app.languageNotifier]),
        builder: (context, _) {
          final c = app.colors;
          final isAr = app.isArabic;
          final isDark = app.isDarkMode;

          final effectiveContent = contentBuilder != null
              ? contentBuilder!(context, c, isAr, isDark)
              : content;

          final Widget dialogContent = Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (topTrailing != null) ...[
                Align(
                  alignment: AlignmentDirectional.topEnd,
                  child: topTrailing!,
                ),
                const SizedBox(height: 6),
              ],
              if (heroIcon != null) ...[
                Center(child: heroIcon!),
                const SizedBox(height: 16),
              ],
              if (title != null) ...[
                Text(
                  title!,
                  textAlign: TextAlign.center,
                  style: titleStyle ??
                      TextStyle(
                        color: c.text,
                        fontSize: titleFontSize ?? 18.5,
                        fontWeight: FontWeight.bold,
                        letterSpacing: isAr ? 0.0 : -0.3,
                        height: isAr ? 1.3 : 1.2,
                      ),
                ),
                if (subtitle != null || banner != null || effectiveContent != null)
                  const SizedBox(height: 10),
              ],
              if (subtitle != null) ...[
                Text(
                  subtitle!,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: c.muted,
                    fontSize: 14.5,
                    height: 1.5,
                  ),
                ),
                if (banner != null || effectiveContent != null)
                  const SizedBox(height: 14),
              ],
              if (banner != null) ...[
                banner!,
                if (effectiveContent != null) const SizedBox(height: 16),
              ],
              if (effectiveContent != null) ...[
                if (scrollable)
                  Flexible(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      child: effectiveContent,
                    ),
                  )
                else
                  effectiveContent,
              ],
              if (customActions != null) ...[
                const SizedBox(height: 22),
                customActions!,
              ] else if (primaryAction != null) ...[
                const SizedBox(height: 22),
                AppDialogActionButtons(
                  primary: primaryAction!,
                  secondary: secondaryAction,
                ),
              ],
            ],
          );

          return Directionality(
            textDirection: isAr ? TextDirection.rtl : TextDirection.ltr,
            child: Dialog(
              backgroundColor: Colors.transparent,
              elevation: 0,
              insetPadding: DialogTokens.dialogInsetPadding,
              child: Container(
                constraints: BoxConstraints(
                  maxWidth: maxWidth,
                  maxHeight: maxHeight ?? double.infinity,
                ),
                decoration: BoxDecoration(
                  color: c.surface,
                  borderRadius: BorderRadius.circular(DialogTokens.dialogRadius),
                  border: Border.fromBorderSide(DialogTokens.borderSide(c, isDark)),
                  boxShadow: DialogTokens.dialogShadow(isDark),
                ),
                padding: padding,
                child: dialogContent,
              ),
            ),
          );
        },
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. BASE BOTTOM SHEET SHELL
// ══════════════════════════════════════════════════════════════════════════════

typedef AppBottomSheetContentBuilder = Widget Function(
  BuildContext context,
  ThemeColors colors,
  bool isArabic,
  bool isDark,
);

/// Standardized, theme-reactive modal bottom sheet shell for Natlu.
class AppBottomSheet extends StatelessWidget {
  final Widget? child;
  final AppBottomSheetContentBuilder? builder;
  final Widget? header;
  final AppBottomSheetContentBuilder? headerBuilder;
  final double maxHeightFactor;
  final bool isFixed;
  final bool showHandle;
  final EdgeInsetsGeometry padding;
  final Listenable? extraListenable;

  const AppBottomSheet({
    super.key,
    this.child,
    this.builder,
    this.header,
    this.headerBuilder,
    this.maxHeightFactor = DialogTokens.defaultSheetMaxHeightFactor,
    this.isFixed = false,
    this.showHandle = true,
    this.padding = EdgeInsets.zero,
    this.extraListenable,
  }) : assert(child != null || builder != null, 'Provide either child or builder');

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;

    final listenables = extraListenable != null
        ? [app.themeNotifier, app.languageNotifier, extraListenable!]
        : [app.themeNotifier, app.languageNotifier];

    return RepaintBoundary(
      child: ListenableBuilder(
        listenable: Listenable.merge(listenables),
        builder: (context, _) {
          final c = app.colors;
          final isAr = app.isArabic;
          final isDark = app.isDarkMode;
          final screenHeight = MediaQuery.sizeOf(context).height;

          final effectiveHeader = headerBuilder != null
              ? headerBuilder!(context, c, isAr, isDark)
              : header;

          final effectiveChild = builder != null
              ? builder!(context, c, isAr, isDark)
              : child!;

          return Directionality(
            textDirection: isAr ? TextDirection.rtl : TextDirection.ltr,
            child: Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.viewInsetsOf(context).bottom,
              ),
              child: Container(
                height: isFixed ? screenHeight * maxHeightFactor : null,
                constraints: isFixed
                    ? null
                    : BoxConstraints(
                        maxHeight: screenHeight * maxHeightFactor,
                      ),
                decoration: BoxDecoration(
                  color: c.surface,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(DialogTokens.sheetRadius),
                  ),
                  border: Border.fromBorderSide(
                    DialogTokens.sheetBorderSide(c, isDark),
                  ),
                  boxShadow: DialogTokens.sheetShadow(isDark),
                ),
                child: Material(
                  color: Colors.transparent,
                  child: SafeArea(
                    top: false,
                    child: isFixed
                        ? Column(
                            children: [
                              if (showHandle) const AppDragHandle(),
                              if (effectiveHeader != null) effectiveHeader,
                              Expanded(
                                child: Padding(
                                  padding: padding,
                                  child: effectiveChild,
                                ),
                              ),
                            ],
                          )
                        : Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (showHandle) const AppDragHandle(),
                              if (effectiveHeader != null) effectiveHeader,
                              Flexible(
                                child: Padding(
                                  padding: padding,
                                  child: effectiveChild,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

