import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import '../core/highlighting_controller.dart';
import '../core/app_state.dart';

/// Pure helper for generating high-performance, styled [InlineSpan] lists for Quranic verses.
/// Handles zero-GPU blur hiding for unrecited words, and word gesture binding.
class VerseSpanBuilder {
  /// Resolves the word display color, handling zero-GPU blur hiding for unrecited words.
  static Color resolveWordDisplayColor({
    required int ayah,
    required int wordIndex,
    required HighlightingController controller,
    required ThemeColors colors,
    required bool isAutoScrolling,
    int? surah,
    bool isBlurEffective = false,
  }) {
    if (isAutoScrolling) return colors.text;
    return QuranInteractionService.resolveWordDisplayColor(
      ayah: ayah,
      wordIndex: wordIndex,
      controller: controller,
      app: AppState.instance,
      colors: colors,
      surah: surah,
      isBlurEffective: isBlurEffective,
    );
  }

  /// Builds the complete list of [InlineSpan]s representing an Ayah's text.
  static List<InlineSpan> buildSpans({
    required List<String> words,
    required int ayah,
    int? surah,
    required bool isActive,
    required bool isAutoScrolling,
    bool isRecording = false,
    required HighlightingController controller,
    required AppState app,
    required ThemeColors colors,
    required List<TapGestureRecognizer> recognizersSink,
    required void Function(int ayah, int wordIndex, String word) onWordErrorTap,
    void Function(int ayah, int wordIndex)? onWordTap,
  }) {
    final List<InlineSpan> spans = [];
    final bool enableGestures = !isAutoScrolling;
    final bool isBlurEffective = app.isBlurEffective(isRecording: isRecording);
    final bool needsBlurCheck = isBlurEffective && !isAutoScrolling;

    // Ultra-fast path for unselected verses:
    // If the verse is not active, blur mode is not hiding words, and no yellow errors,
    // we do not need per-word TextSpans or word recognizers.
    // Building a single contiguous TextSpan slashes paragraph builder overhead by ~95%!
    if (!isActive && !needsBlurCheck) {
      bool hasYellowWord = false;
      final bool isTajweedMode = app.currentMode == AppMode.tajweed;
      if (isTajweedMode) {
        for (int i = 0; i < words.length; i++) {
          if (controller.isWordYellow(ayah, i, surah: surah)) {
            hasYellowWord = true;
            break;
          }
        }
      }

      if (!hasYellowWord) {
        return [
          TextSpan(
            text: words.join(' '),
            style: TextStyle(
              fontFamily: QuranTypography.quranWordsFont,
              fontSize: app.fontSize,
              height: 2.6,
              wordSpacing: 5.0,
              color: colors.text,
            ),
          ),
        ];
      }
    }

    final TextStyle defaultStyle = TextStyle(
      fontFamily: QuranTypography.quranWordsFont,
      fontSize: app.fontSize,
      height: 2.6,
      wordSpacing: 5.0,
      color: colors.text,
    );

    final InlineSpan spaceSpan = TextSpan(
      text: ' ',
      style: defaultStyle,
    );

    for (int i = 0; i < words.length; i++) {
      final Color color = needsBlurCheck
          ? resolveWordDisplayColor(
              ayah: ayah,
              wordIndex: i,
              controller: controller,
              colors: colors,
              isAutoScrolling: isAutoScrolling,
              surah: surah,
              isBlurEffective: isBlurEffective,
            )
          : colors.text;

      final word = words[i];
      final wordIdx = i;

      TapGestureRecognizer? recognizer;
      if (enableGestures) {
        final bool isYellow = controller.isWordYellow(ayah, wordIdx, surah: surah);
        final bool canTapWord = isActive || isYellow;
        if (canTapWord) {
          recognizer = TapGestureRecognizer()
            ..onTap = () {
              if (isYellow) {
                onWordErrorTap(ayah, wordIdx, word);
              } else {
                onWordTap?.call(ayah, wordIdx);
              }
            };
          recognizersSink.add(recognizer);
        }
      }

      final TextStyle style = (color == colors.text)
          ? defaultStyle
          : defaultStyle.copyWith(color: color);

      spans.add(
        TextSpan(
          text: word,
          style: style,
          recognizer: recognizer,
        ),
      );

      // Word separator
      if (i < words.length - 1) {
        spans.add(spaceSpan);
      }
    }

    return spans;
  }

  /// High-performance adaptive verse preview for voice search candidate cards.
  /// Dynamically scales font size (16.0 -> 12.2) and max lines (2 -> 4) based on
  /// verse length so the entire Ayah is displayed without card bloat or tiny font.
  static ({List<InlineSpan> spans, double fontSize, int maxLines}) buildPreviewSpec({
    required String rawText,
    int? startWord,
    int? endWord,
    int? startAyah,
    int? endAyah,
    int? currentAyah,
    required Color defaultColor,
    required Color highlightColor,
  }) {
    final trimmed = rawText.trim();
    if (trimmed.isEmpty) {
      return (spans: const <InlineSpan>[], fontSize: 16.0, maxLines: 2);
    }

    final words = trimmed.split(' ');
    final totalWords = words.length;

    // Adaptive scale & line count:
    // - <= 12 words (short): 16.0px, max 2 lines
    // - 13..24 words (medium): 14.5px, max 3 lines
    // - 25..44 words (long): 13.2px, max 4 lines
    // - > 44 words (extra long): 12.2px, max 4 lines
    final double fontSize;
    final int maxLines;
    if (totalWords <= 12) {
      fontSize = 16.0;
      maxLines = 2;
    } else if (totalWords <= 24) {
      fontSize = 14.5;
      maxLines = 3;
    } else if (totalWords <= 44) {
      fontSize = 13.2;
      maxLines = 4;
    } else {
      fontSize = 12.2;
      maxLines = 4;
    }

    final defaultStyle = TextStyle(
      fontFamily: QuranTypography.quranWordsFont,
      fontSize: fontSize,
      height: 1.5,
      color: defaultColor,
    );

    int s = startWord ?? 0;
    int e = endWord ?? (totalWords - 1);

    // Cross-verse match handling (e.g. prefix wasl or query span began in earlier verse):
    if ((startAyah != null && currentAyah != null && startAyah < currentAyah) || s > e) {
      s = 0;
    }
    // If query match extends into subsequent Ayahs:
    if (endAyah != null && currentAyah != null && endAyah > currentAyah) {
      e = totalWords - 1;
    }

    s = s.clamp(0, totalWords - 1);
    e = e.clamp(s, totalWords - 1);

    // Fast path: if the whole verse is highlighted
    if (s == 0 && e == totalWords - 1) {
      return (
        spans: [
          TextSpan(
            text: trimmed,
            style: defaultStyle.copyWith(
              color: highlightColor,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
        fontSize: fontSize,
        maxLines: maxLines,
      );
    }

    final highlightStyle = defaultStyle.copyWith(
      color: highlightColor,
      fontWeight: FontWeight.bold,
    );

    final spans = <InlineSpan>[];

    // Intelligent windowing for extra long verses where match is deep in the Ayah:
    int windowStart = 0;
    bool hasPrefixEllipsis = false;
    if (totalWords > 44 && s > 20) {
      windowStart = (s - 3).clamp(0, totalWords - 1);
      hasPrefixEllipsis = windowStart > 0;
    }

    if (hasPrefixEllipsis) {
      spans.add(TextSpan(text: '... ', style: defaultStyle));
    }

    // 1. Text before recited words
    if (s > windowStart) {
      spans.add(TextSpan(
        text: '${words.sublist(windowStart, s).join(' ')} ',
        style: defaultStyle,
      ));
    }

    // 2. Recited words (colored green)
    spans.add(TextSpan(
      text: words.sublist(s, e + 1).join(' '),
      style: highlightStyle,
    ));

    // 3. Text after recited words
    if (e < totalWords - 1) {
      spans.add(TextSpan(
        text: ' ${words.sublist(e + 1).join(' ')}',
        style: defaultStyle,
      ));
    }

    return (spans: spans, fontSize: fontSize, maxLines: maxLines);
  }
}

class TajweedTooltipPainter extends CustomPainter {
  final List<String> words;
  final int ayah;
  final int? surah;
  final HighlightingController controller;
  final AppState app;
  final List<InlineSpan> cachedSpans;
  final Rect? Function(int wordIndex, double width)? getWordRect;

  TajweedTooltipPainter({
    required this.words,
    required this.ayah,
    this.surah,
    required this.controller,
    required this.app,
    required this.cachedSpans,
    this.getWordRect,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (app.hasClickedTajweedWord) return;

    // Fast check: if this Ayah has no yellow words, exit immediately!
    // Eliminates 100% of synchronous HarfBuzz layout passes across idle verses during scrolling.
    bool hasYellowWord = false;
    for (int i = 0; i < words.length; i++) {
      if (controller.isWordYellow(ayah, i, surah: surah)) {
        hasYellowWord = true;
        break;
      }
    }
    if (!hasYellowWord) return;

    // Precomputed layout query: avoid redundant HarfBuzz layout if word rect is available
    final TextPainter? fallbackPainter = getWordRect == null
        ? (TextPainter(
            text: TextSpan(children: cachedSpans),
            textAlign: TextAlign.justify,
            textDirection: TextDirection.rtl,
          )..layout(minWidth: size.width, maxWidth: size.width))
        : null;

    final String text = app.isArabic ? 'اضغط هنا' : 'Tap here';
    final textStyle = const TextStyle(
      color: Colors.white,
      fontSize:
          7, // Too small causes pixel-bleed; 7 is the absolute minimum for legibility
      fontWeight: FontWeight
          .w600, // Bold is too thick at this size and causes letters to smudge
      fontFamily: 'sans-serif',
    );
    final textPainter = TextPainter(
      text: TextSpan(text: text, style: textStyle),
      textAlign: TextAlign.center,
      textDirection: app.isArabic ? TextDirection.rtl : TextDirection.ltr,
    )..layout();

    final bgPaint = Paint()
      ..color = app.colors.gold
      ..style = PaintingStyle.fill;

    final rrectRadius = const Radius.circular(4);

    int charOffset = 0;
    for (int i = 0; i < words.length; i++) {
      final word = words[i];
      if (controller.isWordYellow(ayah, i, surah: surah)) {
        Rect? targetRect = getWordRect?.call(i, size.width);
        if (targetRect == null && fallbackPainter != null) {
          final rects = fallbackPainter.getBoxesForSelection(
            TextSelection(
                baseOffset: charOffset, extentOffset: charOffset + word.length),
          );
          if (rects.isNotEmpty) {
            double left = rects.first.left;
            double right = rects.first.right;
            double bottom = rects.first.bottom;
            for (final r in rects) {
              if (r.left < left) left = r.left;
              if (r.right > right) right = r.right;
              if (r.bottom > bottom) bottom = r.bottom;
            }
            targetRect = Rect.fromLTRB(left, 0, right, bottom);
          }
        }

        if (targetRect != null) {
          final centerX =
              targetRect.left + (targetRect.right - targetRect.left) / 2;
          final bottom = targetRect.bottom;

          // Draw the tooltip perfectly centered at the bottom of the bounding box.
          final tooltipWidth = (textPainter.width + 8).roundToDouble();
          final tooltipHeight = (textPainter.height + 2).roundToDouble();

          final tooltipX = (centerX - tooltipWidth / 2).roundToDouble();
          final tooltipY = (bottom + 2).roundToDouble();

          final bgRect = RRect.fromLTRBR(
            tooltipX,
            tooltipY,
            tooltipX + tooltipWidth,
            tooltipY + tooltipHeight,
            rrectRadius,
          );

          canvas.drawRRect(bgRect, bgPaint);

          textPainter.layout(minWidth: tooltipWidth, maxWidth: tooltipWidth);
          textPainter.paint(
            canvas,
            Offset(tooltipX, tooltipY + 1),
          );

          // Only 1 label per ayah: stop after painting the first yellow word
          break;
        }
      }
      charOffset += word.length + 1; // +1 for the space separator
    }

    fallbackPainter?.dispose();
    textPainter.dispose();
  }

  @override
  bool shouldRepaint(covariant TajweedTooltipPainter oldDelegate) {
    return oldDelegate.app.hasClickedTajweedWord != app.hasClickedTajweedWord ||
        oldDelegate.ayah != ayah ||
        oldDelegate.words.length != words.length;
  }
}
