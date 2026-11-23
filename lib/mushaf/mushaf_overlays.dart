import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show listEquals;
import 'package:qvp_flutter/qvp_flutter.dart';
import '../core/app_state.dart';
import '../core/highlighting_controller.dart';

/// Ultra-lightweight, zero-allocation single-pass overlay/underlay painters
/// for Surah headers and Tajweed tutorial tooltips.
class MushafOverlays {
  MushafOverlays._();

  static final Paint _headerFillPaint = Paint()..style = PaintingStyle.fill;
  static final Paint _headerBorderPaint = Paint()
    ..style = PaintingStyle.stroke
    ..strokeWidth = 1.0
    ..isAntiAlias = true;
  static final Paint _headerInnerBorderPaint = Paint()
    ..style = PaintingStyle.stroke
    ..strokeWidth = 0.5
    ..isAntiAlias = true;

  static final Paint _highlightFillPaint = Paint()..style = PaintingStyle.fill;
  static final Paint _wordFillPaint = Paint()
    ..style = PaintingStyle.fill
    ..isAntiAlias = true;
  static final Paint _wordEraserStrokePaint = Paint()
    ..style = PaintingStyle.stroke
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round
    ..isAntiAlias = true;
  static final Paint _wordEraserFillPaint = Paint()
    ..style = PaintingStyle.fill
    ..isAntiAlias = true;

  static final Paint _tooltipBgPaint = Paint()..style = PaintingStyle.fill;
  static const Radius _tooltipRadius = Radius.circular(4);
  static const Radius _highlightCornerRadius = Radius.circular(1.5);
  static const TextStyle _tooltipTextStyle = TextStyle(
    color: Colors.white,
    fontSize: 7,
    fontWeight: FontWeight.w600,
    fontFamily: 'sans-serif',
  );

  static TextPainter? _cachedPainterAr;
  static TextPainter? _cachedPainterEn;

  static final Expando<_PageWordLayoutCache> _pageWordCaches =
      Expando<_PageWordLayoutCache>();

  static _PageWordLayoutCache _getLayoutCache(
      QvpPage page, QvpLayout? layout) {
    final l = layout ?? page.currentLayout ?? page.readLayout();
    final cached = _pageWordCaches[page];
    if (cached == null || cached.layout != l) {
      final cache = _PageWordLayoutCache.fromPage(page, l);
      _pageWordCaches[page] = cache;
      return cache;
    }
    return cached;
  }

  static TextPainter _getTooltipTextPainter(bool isArabic) {
    if (isArabic) {
      if (_cachedPainterAr == null) {
        _cachedPainterAr = TextPainter(
          text: const TextSpan(text: 'اضغط هنا', style: _tooltipTextStyle),
          textAlign: TextAlign.center,
          textDirection: TextDirection.rtl,
        )..layout();
        final w = (_cachedPainterAr!.width + 8).roundToDouble();
        _cachedPainterAr!.layout(minWidth: w, maxWidth: w);
      }
      return _cachedPainterAr!;
    } else {
      if (_cachedPainterEn == null) {
        _cachedPainterEn = TextPainter(
          text: const TextSpan(text: 'Tap here', style: _tooltipTextStyle),
          textAlign: TextAlign.center,
          textDirection: TextDirection.ltr,
        )..layout();
        final w = (_cachedPainterEn!.width + 8).roundToDouble();
        _cachedPainterEn!.layout(minWidth: w, maxWidth: w);
      }
      return _cachedPainterEn!;
    }
  }

  /// Single-pass underlay: Paints elegant modern cards behind Surah titles.
  static void paintSurahHeaders(
    Canvas canvas,
    QvpPage page,
    QvpLayout? layout, {
    required bool isDark,
    required ThemeColors colors,
  }) {
    if (page.isDisposed) return;
    final cache = _getLayoutCache(page, layout);
    final headerRRects = cache.surahHeaderRRects;
    if (headerRRects.isEmpty) return;

    _headerFillPaint.color = isDark
        ? const Color(0xFF1E252D).withValues(alpha: 0.75)
        : const Color(0xFFF7F4EB).withValues(alpha: 0.90);

    _headerBorderPaint.color = isDark
        ? colors.gold.withValues(alpha: 0.40)
        : colors.gold.withValues(alpha: 0.50);

    _headerInnerBorderPaint.color = isDark
        ? colors.gold.withValues(alpha: 0.20)
        : colors.gold.withValues(alpha: 0.25);

    final innerRRects = cache.surahHeaderInnerRRects;
    for (var i = 0; i < headerRRects.length; i++) {
      canvas.drawRRect(headerRRects[i], _headerFillPaint);
      canvas.drawRRect(headerRRects[i], _headerBorderPaint);
      if (i < innerRRects.length) {
        canvas.drawRRect(innerRRects[i], _headerInnerBorderPaint);
      }
    }
  }

  /// Single-pass underlay: Paints continuous Ayah background highlight box
  /// and current waited word beacon band matching the official quran-engine specification.
  /// Evaluated words (green/yellow/red) do NOT have background highlight bands —
  /// only the word's text changes color via [paintWordColorHighlights].
  static void paintAyahHighlights(
    Canvas canvas,
    QvpPage page,
    QvpLayout? layout, {
    required HighlightingController controller,
    required AppState app,
    required bool isRecording,
  }) {
    if (page.isDisposed) return;

    // 1. Resolve Active Ayah Coordinate (surah, ayah)
    final coord = controller.activeAyahCoordinate;
    final int activeSurah = coord?.$1 ?? 0;
    final int activeAyah = coord?.$2 ?? 0;

    if (activeSurah == 0 || activeAyah == 0) return;

    final cache = _getLayoutCache(page, layout);
    final wordsByAyah = cache.wordsByAyah;
    final activeWords = wordsByAyah[(activeSurah, activeAyah)];
    if (activeWords == null || activeWords.isEmpty) return;

    final palette = QuranHighlightPalette.fromTheme(
      colors: app.colors,
      isDark: app.isDarkMode,
    );

    // 2. Resolve Active / Waited Lead Word on this page with zero FFI calls.
    int? activeWordPageIdx;
    final bool isSessionActive = isRecording;
    if (isSessionActive) {
      final maxWordOnPage =
          cache.maxWordPerAyah[(activeSurah, activeAyah)] ?? 0;
      if (maxWordOnPage > 0) {
        final leadW0 = controller.getLeadWordIndex(
          surah: activeSurah,
          ayah: activeAyah,
          totalWords: maxWordOnPage,
          isRecording: isRecording,
        );
        if (leadW0 != null) {
          final targetWord1Based = leadW0 + 1;
          for (final w in activeWords) {
            if (w.word == targetWord1Based) {
              activeWordPageIdx = w.index;
              break;
            }
          }
        }
      }
    }

    // 3. Render continuous line boxes for the active ayah:
    // - Waited word has leadWordBand.
    // - All other words of the active ayah have activeAyahBand.
    // - Evaluated words do NOT have green/yellow/red background bands.
    final lines = cache.lineGeometriesFor(page, activeSurah, activeAyah);
    if (lines.isEmpty) return;

    for (final line in lines) {
      final rects = line.wordRects;
      final k = rects.length;
      if (k == 0) continue;

      // Fast path: if the awaited word is not on this line, draw the entire ayah line in 1 call.
      int activeWordIdx = -1;
      if (activeWordPageIdx != null) {
        for (var j = 0; j < k; j++) {
          if (rects[j].word.index == activeWordPageIdx) {
            activeWordIdx = j;
            break;
          }
        }
      }

      if (activeWordIdx == -1) {
        _highlightFillPaint.color = palette.activeAyahBand;
        canvas.drawRRect(line.outerRRect, _highlightFillPaint);
        continue;
      }

      // The awaited word is on this line: render split runs with zero overlap and zero gap.
      final top = line.outerRRect.top;
      final bottom = line.outerRRect.bottom;
      final left = line.outerRRect.left;
      final right = line.outerRRect.right;

      if (k == 1) {
        _highlightFillPaint.color = palette.leadWordBand;
        canvas.drawRRect(line.outerRRect, _highlightFillPaint);
      } else if (activeWordIdx == 0) {
        final splitX = rects[0].rect.left;
        _highlightFillPaint.color = palette.leadWordBand;
        canvas.drawRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTRB(splitX, top, right, bottom),
            topRight: _highlightCornerRadius,
            bottomRight: _highlightCornerRadius,
          ),
          _highlightFillPaint,
        );
        _highlightFillPaint.color = palette.activeAyahBand;
        canvas.drawRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTRB(left, top, splitX, bottom),
            topLeft: _highlightCornerRadius,
            bottomLeft: _highlightCornerRadius,
          ),
          _highlightFillPaint,
        );
      } else if (activeWordIdx == k - 1) {
        final splitX = rects[k - 1].rect.right;
        _highlightFillPaint.color = palette.activeAyahBand;
        canvas.drawRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTRB(splitX, top, right, bottom),
            topRight: _highlightCornerRadius,
            bottomRight: _highlightCornerRadius,
          ),
          _highlightFillPaint,
        );
        _highlightFillPaint.color = palette.leadWordBand;
        canvas.drawRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTRB(left, top, splitX, bottom),
            topLeft: _highlightCornerRadius,
            bottomLeft: _highlightCornerRadius,
          ),
          _highlightFillPaint,
        );
      } else {
        final splitRight = rects[activeWordIdx].rect.right;
        final splitLeft = rects[activeWordIdx].rect.left;
        _highlightFillPaint.color = palette.activeAyahBand;
        canvas.drawRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTRB(splitRight, top, right, bottom),
            topRight: _highlightCornerRadius,
            bottomRight: _highlightCornerRadius,
          ),
          _highlightFillPaint,
        );
        _highlightFillPaint.color = palette.leadWordBand;
        canvas.drawRect(
          Rect.fromLTRB(splitLeft, top, splitRight, bottom),
          _highlightFillPaint,
        );
        _highlightFillPaint.color = palette.activeAyahBand;
        canvas.drawRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTRB(left, top, splitLeft, bottom),
            topLeft: _highlightCornerRadius,
            bottomLeft: _highlightCornerRadius,
          ),
          _highlightFillPaint,
        );
      }
    }
  }

  /// Single-pass overlay: Paints colored vector glyphs directly over base ink
  /// ONLY for evaluated words (Right: green, Tajweed warning: yellow, Mistake: red).
  ///
  /// Text ink is pure vector fill with subpixel-exact placement from layoutPlacements:
  /// zero blur, zero halation, zero FFI on recitation ticks, zero allocations.
  static void paintWordColorHighlights(
    Canvas canvas,
    QvpPage page,
    QvpLayout? layout, {
    required HighlightingController controller,
    required AppState app,
    required bool isRecording,
  }) {
    if (page.isDisposed) return;

    final coord = controller.activeAyahCoordinate;
    final int activeSurah = coord?.$1 ?? 0;
    final int activeAyah = coord?.$2 ?? 0;

    final cache = _getLayoutCache(page, layout);
    final l = cache.layout;
    if (l == null) return;
    final wordsByAyah = cache.wordsByAyah;

    final c = app.colors;
    final double ls = l.scale;
    final double ox = l.offsetX;
    final double oy = l.offsetY;

    final palette = QuranHighlightPalette.fromTheme(
      colors: c,
      isDark: app.isDarkMode,
    );
    final Color activeAyahBg =
        Color.alphaBlend(palette.activeAyahBand, c.surface);
    final Color defaultBg = c.surface;
    _wordEraserStrokePaint.strokeWidth = 0.65 / ls;

    for (final entry in wordsByAyah.entries) {
      final key = entry.key;
      final bool isActive = (key.$1 == activeSurah && key.$2 == activeAyah);
      if (!isActive && !controller.hasAyahHighlights(key.$1, key.$2)) {
        continue;
      }

      final Color eraserColor = isActive ? activeAyahBg : defaultBg;
      _wordEraserStrokePaint.color = eraserColor;
      _wordEraserFillPaint.color = eraserColor;

      final ayahWords = entry.value;
      for (final w in ayahWords) {
        if (w.nPaths <= 0) continue;

        final int? status =
            controller.getWordStatus(w.ayah, w.word - 1, surah: w.surah);

        // ONLY word text is colored when FALSE / RIGHT (evaluated words):
        final Color? color = status == 1
            ? c.green
            : (status == 2 ? c.warning : (status == 3 ? c.red : null));

        if (color == null) continue;

        _wordFillPaint.color = color;
        QvpPlacement? curQ;
        bool open = false;
        final end = w.firstPath + w.nPaths;

        for (var p = w.firstPath; p < end; p++) {
          final q = cache.placementOfPath[p] ?? QvpPlacement.identity;
          if (!open || curQ != q) {
            if (open) canvas.restore();
            canvas.save();
            canvas.translate(ox + q.dx * ls, oy + q.dy * ls);
            canvas.scale(ls * q.kx, ls * q.ky);
            open = true;
            curQ = q;
          }
          final path = page.path(p);
          // 1. Wipe out underlying black raster ink & bilinear edge bleed:
          canvas.drawPath(path, _wordEraserStrokePaint);
          canvas.drawPath(path, _wordEraserFillPaint);
          // 2. Draw pristine, crisp colored vector glyph:
          canvas.drawPath(path, _wordFillPaint);
        }
        if (open) canvas.restore();
      }
    }
  }

  /// Single-pass overlay: Paints onboarding Tajweed tutorial tooltip ("اضغط هنا") beneath yellow words.
  static void paintTajweedTooltip(
    Canvas canvas,
    Size size,
    QvpPage page,
    QvpLayout? layout, {
    required AppState app,
    required Color goldColor,
    required List<int> yellowWords,
  }) {
    if (app.hasClickedTajweedWord ||
        app.currentMode != AppMode.tajweed ||
        page.isDisposed ||
        yellowWords.isEmpty) {
      return;
    }

    final l = layout ?? page.currentLayout ?? page.readLayout();
    if (l == null) return;

    final textPainter = _getTooltipTextPainter(app.isArabic);
    final tooltipWidth = textPainter.width;
    final tooltipHeight = (textPainter.height + 2).roundToDouble();

    final double maxW = l.contentW > 0 ? l.contentW : size.width;

    // Badge geometry is cached per (page, layout, yellowWords) with zero full-page FFI calls.
    if (!identical(page, _tooltipCachePage) ||
        !identical(l, _tooltipCacheLayout) ||
        !listEquals(yellowWords, _tooltipCacheWords)) {
      _tooltipCachePage = page;
      _tooltipCacheLayout = l;
      _tooltipCacheWords = yellowWords;
      _tooltipCacheBadges = _computeTooltipBadges(
        page,
        l,
        yellowWords,
        tooltipWidth: tooltipWidth,
        tooltipHeight: tooltipHeight,
        maxW: maxW,
      );
    }
    final badges = _tooltipCacheBadges;
    if (badges == null || badges.isEmpty) return;

    _tooltipBgPaint.color = goldColor;
    for (final (rawX, by) in badges) {
      final double bx = rawX.roundToDouble();

      final bgRect = RRect.fromLTRBR(
        bx,
        by,
        bx + tooltipWidth,
        by + tooltipHeight,
        _tooltipRadius,
      );

      canvas.drawRRect(bgRect, _tooltipBgPaint);
      textPainter.paint(canvas, Offset(bx, by + 1.0));
    }
  }

  static QvpPage? _tooltipCachePage;
  static QvpLayout? _tooltipCacheLayout;
  static List<int>? _tooltipCacheWords;
  static List<(double, double)>? _tooltipCacheBadges;

  /// Resolves badge positions for the current yellow words: one badge per
  /// ayah, placed beneath its first word's line, then spread apart so badges
  /// never overlap and stay inside the content bounds.
  static List<(double, double)> _computeTooltipBadges(
    QvpPage page,
    QvpLayout layout,
    List<int> yellowWords, {
    required double tooltipWidth,
    required double tooltipHeight,
    required double maxW,
  }) {
    final Set<int> seenAyahs = {};
    final Map<int, List<int>> wordsByLine = {};
    for (final wordIdx in yellowWords) {
      if (wordIdx < 0 || wordIdx >= page.words.length) continue;
      final w = page.words[wordIdx];
      final ayahKey = QuranCoordinate.packAyahKey(w.surah, w.ayah);
      if (seenAyahs.add(ayahKey)) {
        final line = w.line;
        (wordsByLine[line] ??= []).add(wordIdx);
      }
    }

    const double minGap = 2.0;

    final badges = <(double, double)>[];
    for (final wordsOnLine in wordsByLine.values) {
      final List<_BadgePosition> lineBadges = [];

      for (final wordIdx in wordsOnLine) {
        final box = page.wordBoxFast(wordIdx, layout: layout);
        final double centerX = (box.x0 + box.x1) / 2.0;
        final double idealX = centerX - tooltipWidth / 2.0;
        final double tooltipY = (box.y1 + 1.0).roundToDouble();

        lineBadges.add(_BadgePosition(x: idealX, y: tooltipY));
      }

      if (lineBadges.length > 1) {
        lineBadges.sort((a, b) => a.x.compareTo(b.x));

        for (int i = 0; i < lineBadges.length - 1; i++) {
          final cur = lineBadges[i];
          final next = lineBadges[i + 1];
          if (cur.x + tooltipWidth + minGap > next.x) {
            final overlap = (cur.x + tooltipWidth + minGap) - next.x;
            cur.x -= overlap / 2.0;
            next.x += overlap / 2.0;
          }
        }

        for (int i = 1; i < lineBadges.length; i++) {
          if (lineBadges[i].x < lineBadges[i - 1].x + tooltipWidth + minGap) {
            lineBadges[i].x = lineBadges[i - 1].x + tooltipWidth + minGap;
          }
        }

        if (lineBadges.last.x + tooltipWidth > maxW - 4.0) {
          final shift = (lineBadges.last.x + tooltipWidth) - (maxW - 4.0);
          for (final b in lineBadges) {
            b.x -= shift;
          }
        }
        if (lineBadges.first.x < 4.0) {
          final shift = 4.0 - lineBadges.first.x;
          for (final b in lineBadges) {
            b.x += shift;
          }
        }
      } else if (lineBadges.isNotEmpty) {
        lineBadges.first.x = lineBadges.first.x
            .clamp(4.0, maxW - tooltipWidth - 4.0)
            .roundToDouble();
      }

      for (final badge in lineBadges) {
        badges.add((badge.x, badge.y));
      }
    }
    return badges;
  }
}

class _BadgePosition {
  double x;
  final double y;
  _BadgePosition({required this.x, required this.y});
}

class _LineHighlightGeometry {
  final RRect outerRRect;
  final List<({QvpWordInfo word, Rect rect})> wordRects;

  const _LineHighlightGeometry({
    required this.outerRRect,
    required this.wordRects,
  });
}

class _PageWordLayoutCache {
  final QvpLayout? layout;
  final Map<(int, int), List<QvpWordInfo>> wordsByAyah;
  final Map<(int, int), int> maxWordPerAyah;
  final Map<int, QvpPlacement> placementOfPath;
  final List<RRect> surahHeaderRRects;
  final List<RRect> surahHeaderInnerRRects;
  final Map<(int, int), List<_LineHighlightGeometry>> _lineGeometriesCache = {};

  _PageWordLayoutCache._({
    required this.layout,
    required this.wordsByAyah,
    required this.maxWordPerAyah,
    required this.placementOfPath,
    required this.surahHeaderRRects,
    required this.surahHeaderInnerRRects,
  });

  factory _PageWordLayoutCache.fromPage(QvpPage page,
      [QvpLayout? currentLayout]) {
    final wordsByAyah = <(int, int), List<QvpWordInfo>>{};
    final maxWordPerAyah = <(int, int), int>{};
    for (final w in page.words) {
      final key = (w.surah, w.ayah);
      (wordsByAyah[key] ??= []).add(w);
      final currentMax = maxWordPerAyah[key] ?? 0;
      if (w.word > currentMax) {
        maxWordPerAyah[key] = w.word;
      }
    }

    final placementOfPath = <int, QvpPlacement>{};
    if (!page.isDisposed) {
      try {
        final draws = page.layoutDrawList();
        final places = page.layoutPlacements();
        for (final d in draws) {
          if (d.placement >= 0 && d.placement < places.length) {
            placementOfPath[d.path] = places[d.placement];
          }
        }
      } catch (_) {}
    }

    final List<RRect> surahHeaderRRects = [];
    final List<RRect> surahHeaderInnerRRects = [];
    if (!page.isDisposed) {
      try {
        final headers = page.surahHeadersView();
        final double contentW = currentLayout?.contentW ?? page.width;
        for (final h in headers) {
          final double top = h.y1 > h.y0 ? h.y0 : (h.titleY0 - 6.0);
          final double bottom = h.y1 > h.y0 ? h.y1 : (h.titleY1 + 6.0);
          if (bottom <= top) continue;

          final double left = (h.x1 > h.x0 && h.x0 >= 0) ? h.x0 : 0.0;
          final double right =
              (h.x1 > h.x0 && h.x1 <= contentW) ? h.x1 : contentW;

          final rect = Rect.fromLTRB(left, top, right, bottom);
          surahHeaderRRects.add(
            RRect.fromRectAndRadius(rect, const Radius.circular(5.0)),
          );
          surahHeaderInnerRRects.add(
            RRect.fromRectAndRadius(
              rect.deflate(2.0),
              const Radius.circular(3.5),
            ),
          );
        }
      } catch (_) {}
    }

    return _PageWordLayoutCache._(
      layout: currentLayout,
      wordsByAyah: wordsByAyah,
      maxWordPerAyah: maxWordPerAyah,
      placementOfPath: placementOfPath,
      surahHeaderRRects: surahHeaderRRects,
      surahHeaderInnerRRects: surahHeaderInnerRRects,
    );
  }

  /// Lazily computes continuous midpoint-split line geometries for one ayah on demand,
  /// using zero-FFI layout box math via [QvpPage.wordBoxView].
  List<_LineHighlightGeometry> lineGeometriesFor(
    QvpPage page,
    int surah,
    int ayah,
  ) {
    final ayahKey = (surah, ayah);
    final existing = _lineGeometriesCache[ayahKey];
    if (existing != null) return existing;

    final ayahWords = wordsByAyah[ayahKey];
    if (ayahWords == null || ayahWords.isEmpty) {
      return _lineGeometriesCache[ayahKey] = const [];
    }

    final byLine = <int, List<QvpWordInfo>>{};
    for (final w in ayahWords) {
      (byLine[w.line] ??= []).add(w);
    }

    final list = <_LineHighlightGeometry>[];
    for (final lineWords in byLine.values) {
      if (lineWords.isEmpty) continue;
      if (lineWords.length > 1) {
        lineWords.sort((w1, w2) => w1.word.compareTo(w2.word));
      }
      final int k = lineWords.length;

      final boxes = List<QvpBox>.generate(
        k,
        (i) => page.wordBoxFast(lineWords[i].index, layout: layout),
      );

      double lineX0 = double.infinity;
      double lineX1 = double.negativeInfinity;
      double lineY0 = double.infinity;
      double lineY1 = double.negativeInfinity;

      for (var i = 0; i < k; i++) {
        final b = boxes[i];
        if (b.x0 < lineX0) lineX0 = b.x0;
        if (b.x1 > lineX1) lineX1 = b.x1;
        if (b.y0 < lineY0) lineY0 = b.y0;
        if (b.y1 > lineY1) lineY1 = b.y1;
      }

      if (lineX1 <= lineX0 || lineY1 <= lineY0) continue;

      final outerRect = Rect.fromLTRB(lineX0, lineY0, lineX1, lineY1);
      final outerRRect =
          RRect.fromRectAndRadius(outerRect, MushafOverlays._highlightCornerRadius);

      final rects = <({QvpWordInfo word, Rect rect})>[];
      for (var i = 0; i < k; i++) {
        final w = lineWords[i];
        final b = boxes[i];

        final double right = (i == 0)
            ? lineX1
            : ((boxes[i - 1].x0 + b.x1) / 2.0).clamp(lineX0, lineX1);

        final double left = (i == k - 1)
            ? lineX0
            : ((b.x0 + boxes[i + 1].x1) / 2.0).clamp(lineX0, lineX1);

        final double minX = math.min(left, right);
        final double maxX = math.max(left, right);
        if (maxX > minX) {
          rects.add((
            word: w,
            rect: Rect.fromLTRB(minX, lineY0, maxX, lineY1),
          ));
        }
      }

      list.add(_LineHighlightGeometry(
        outerRRect: outerRRect,
        wordRects: rects,
      ));
    }

    return _lineGeometriesCache[ayahKey] = list;
  }
}

/// Standalone extension providing zero-FFI layout box calculation on [QvpPage].
/// Guarantees 100% decoupling from any vendor fork modifications to [QvpPage].
extension QvpPageWordBoxExtension on QvpPage {
  QvpBox wordBoxFast(int i, {double padY = 2.0, QvpLayout? layout}) {
    final w = words[i];
    final l = layout ?? currentLayout;
    if (l != null && !l.reflowed) {
      final dy = (w.lineIndex >= 0 && w.lineIndex < l.lineDy.length)
          ? l.lineDy[w.lineIndex]
          : 0.0;
      final scale = l.scale;
      return QvpBox(
        id: i,
        line: w.line,
        x0: l.offsetX + w.x0 * scale,
        y0: l.offsetY + (w.y0 + dy) * scale - padY,
        x1: l.offsetX + w.x1 * scale,
        y1: l.offsetY + (w.y1 + dy) * scale + padY,
        color: 0,
        radius: 0.0,
      );
    }
    final b = wordBoundsView(i);
    return QvpBox(
      id: i,
      line: w.line,
      x0: b.x0,
      y0: b.y0 - padY,
      x1: b.x1,
      y1: b.y1 + padY,
      color: 0,
      radius: 0.0,
    );
  }
}
