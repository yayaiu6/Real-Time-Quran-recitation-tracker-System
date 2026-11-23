import 'package:flutter/material.dart';
import '../../../core/app_state.dart';
import '../../../core/highlighting_controller.dart';
import 'dialog_base.dart';

// ══════════════════════════════════════════════════════════════════════════════
// 1. SURAH LIST TILE (120 FPS Zero-Allocation Item)
// ══════════════════════════════════════════════════════════════════════════════

/// Metadata for displaying a Surah row in UI pickers.
class SurahUiEntry {
  final int number;
  final String surahName;
  final String surahNameEn;

  const SurahUiEntry({
    required this.number,
    required this.surahName,
    required this.surahNameEn,
  });
}

/// Ultra-lightweight, 120 FPS single interactive row tile for a Surah.
class SurahListTile extends StatelessWidget {
  final int surahNumber;
  final SurahUiEntry surahMeta;
  final bool isSelected;
  final VoidCallback onTap;
  final bool isArabic;
  final ThemeColors colors;
  final String arabicDigits;

  const SurahListTile({
    super.key,
    required this.surahNumber,
    required this.surahMeta,
    required this.isSelected,
    required this.onTap,
    required this.isArabic,
    required this.colors,
    required this.arabicDigits,
  });

  @override
  Widget build(BuildContext context) {
    final c = colors;
    final isAr = isArabic;
    final isDark = AppState.instance.isDarkMode;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 3.0),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          onTap();
        },
        child: Container(
          height: 64.0,
          padding: const EdgeInsets.symmetric(horizontal: 12.0),
          decoration: BoxDecoration(
            color: isSelected
                ? const Color(0xFF10B981).withValues(alpha: isDark ? 0.16 : 0.10)
                : (isDark
                    ? Colors.white.withValues(alpha: 0.04)
                    : Colors.black.withValues(alpha: 0.03)),
            borderRadius: const BorderRadius.all(Radius.circular(14.0)),
            border: Border.all(
              color: isSelected
                  ? const Color(0xFF10B981).withValues(alpha: isDark ? 0.45 : 0.35)
                  : (isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : Colors.black.withValues(alpha: 0.06)),
              width: 0.8,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 38.0,
                height: 38.0,
                decoration: BoxDecoration(
                  color: isSelected
                      ? const Color(0xFF10B981)
                      : (isDark
                          ? Colors.white.withValues(alpha: 0.06)
                          : Colors.white),
                  borderRadius: const BorderRadius.all(Radius.circular(11.0)),
                  border: isSelected
                      ? null
                      : Border.all(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.10)
                              : Colors.black.withValues(alpha: 0.08),
                          width: 0.8,
                        ),
                ),
                alignment: Alignment.center,
                child: isSelected
                    ? const Icon(
                        Icons.check_rounded,
                        color: Colors.white,
                        size: 20.0,
                      )
                    : Text(
                        isAr ? arabicDigits : '$surahNumber',
                        style: TextStyle(
                          color: isDark ? Colors.white : const Color(0xFF1E293B),
                          fontSize: isAr ? 15.5 : 13.5,
                          fontWeight: FontWeight.w700,
                          height: 1.0,
                        ),
                      ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      surahMeta.surahName,
                      textDirection: TextDirection.rtl,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: isSelected ? const Color(0xFF10B981) : c.text,
                        fontSize: 16.0,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 2.0),
                    Text(
                      surahMeta.surahNameEn,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: c.textSecondary,
                        fontSize: 12.0,
                        fontWeight: FontWeight.w500,
                        height: 1.15,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. SURAH PICKER MODAL BOTTOM SHEET
// ══════════════════════════════════════════════════════════════════════════════

/// Ultra-responsive Surah Navigator Sheet with instant search and voice trigger.
class SurahPickerSheet extends StatefulWidget {
  final int current;
  final void Function(int surah, {int? ayah}) onPick;
  final HighlightingController controller;
  final bool isRecording;
  final bool isVoiceSearching;
  final VoidCallback onToggleRecord;
  final VoidCallback onVoiceSearchToggle;

  const SurahPickerSheet({
    super.key,
    required this.current,
    required this.onPick,
    required this.controller,
    required this.isRecording,
    required this.isVoiceSearching,
    required this.onToggleRecord,
    required this.onVoiceSearchToggle,
  });

  @override
  State<SurahPickerSheet> createState() => _SurahPickerSheetState();
}

class _SurahPickerSheetState extends State<SurahPickerSheet> {
  static const double _itemExtent = 70.0;

  static final List<SurahUiEntry> _allSurahs = List.generate(
    114,
    (i) => SurahUiEntry(
      number: i + 1,
      surahName: QuranMetadata.getSurahNameArabic(i + 1),
      surahNameEn: QuranMetadata.getSurahNameEnglish(i + 1),
    ),
    growable: false,
  );

  static final List<int> _allIndices =
      List<int>.generate(114, (i) => i, growable: false);

  static final List<String> _arabicDigits = List<String>.generate(
      114, (i) => QuranTypography.toArabicDigits(i + 1),
      growable: false);

  static List<String>? _cachedNormalizedAr;
  static List<String>? _cachedLowerEn;

  String _query = '';
  final TextEditingController _searchCtrl = TextEditingController();
  late final ScrollController _scrollCtrl;
  late final List<SurahUiEntry> _surahs;

  @override
  void initState() {
    super.initState();
    _surahs = _allSurahs;
    final int targetIdx = (widget.current - 1).clamp(0, 113);
    final double initialOffset =
        (targetIdx > 0 ? (targetIdx - 1) * _itemExtent : 0.0);
    _scrollCtrl = ScrollController(initialScrollOffset: initialOffset);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _ensureSearchCache() {
    if (_cachedNormalizedAr == null ||
        _cachedNormalizedAr!.length != _surahs.length) {
      final norm = List<String>.filled(_surahs.length, '');
      final lower = List<String>.filled(_surahs.length, '');
      for (int i = 0; i < _surahs.length; i++) {
        norm[i] = _normalizeArabicFast(_surahs[i].surahName);
        lower[i] = _surahs[i].surahNameEn.toLowerCase();
      }
      _cachedNormalizedAr = norm;
      _cachedLowerEn = lower;
    }
  }

  static String _normalizeArabicFast(String text) {
    final sb = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      final code = text.codeUnitAt(i);
      if ((code >= 0x064B && code <= 0x065F) || code == 0x0670) {
        continue;
      }
      switch (code) {
        case 0x0622:
        case 0x0623:
        case 0x0625:
        case 0x0671:
          sb.write('ا');
          break;
        case 0x0629:
          sb.write('ه');
          break;
        case 0x0649:
          sb.write('ي');
          break;
        default:
          sb.writeCharCode(code);
      }
    }
    return sb.toString();
  }

  @override
  Widget build(BuildContext context) {
    final app = AppState.instance;
    final trimmedQuery = _query.trim();
    final List<int> items;
    if (trimmedQuery.isEmpty) {
      items = _allIndices;
    } else {
      _ensureSearchCache();
      final normQuery = _normalizeArabicFast(trimmedQuery);
      final lowerQuery = trimmedQuery.toLowerCase();
      final filtered = <int>[];
      for (int i = 0; i < _surahs.length; i++) {
        final sNum = i + 1;
        if (_cachedNormalizedAr![i].contains(normQuery) ||
            _cachedLowerEn![i].contains(lowerQuery) ||
            '$sNum'.contains(trimmedQuery) ||
            _arabicDigits[i].contains(trimmedQuery)) {
          filtered.add(i);
        }
      }
      items = filtered;
    }

    return AppBottomSheet(
      maxHeightFactor: 0.60,
      isFixed: true,
      headerBuilder: (context, c, isAr, isDark) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 2, 16, 10),
            child: AppSegmentedPillSelector(
              icons: const [
                Icons.format_list_bulleted_rounded,
                Icons.auto_stories_rounded,
              ],
              labels: isAr
                  ? const ['قائمة الآيات', 'مصحف']
                  : const ['List View', 'Mushaf Layout'],
              selected: app.isMushafMode ? 1 : 0,
              c: c,
              onSelected: (i) {
                final enableMushaf = (i == 1);
                if (app.isMushafMode != enableMushaf) {
                  app.setMushafMode(enableMushaf);
                  setState(() {});
                }
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.05)
                          : Colors.black.withValues(alpha: 0.04),
                      borderRadius: BorderRadius.circular(13),
                      border: Border.all(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.08)
                            : Colors.black.withValues(alpha: 0.06),
                        width: 0.8,
                      ),
                    ),
                    child: TextField(
                      controller: _searchCtrl,
                      onChanged: (v) => setState(() => _query = v),
                      style: TextStyle(
                        color: c.text,
                        fontSize: 14.5,
                        fontWeight: FontWeight.w500,
                      ),
                      decoration: InputDecoration(
                        hintText: isAr
                            ? 'ابحث باسم السورة أو رقمها...'
                            : 'Search by name or number...',
                        hintStyle: TextStyle(
                          color: c.textSecondary,
                          fontSize: 13,
                        ),
                        prefixIcon: const Icon(
                          Icons.search_rounded,
                          color: Color(0xFF10B981),
                          size: 20,
                        ),
                        suffixIcon: _query.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.close_rounded, size: 18),
                                color: c.textSecondary,
                                onPressed: () {
                                  _searchCtrl.clear();
                                  setState(() => _query = '');
                                },
                              )
                            : null,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                AppScaleButton(
                  onTap: () {
                    if (Navigator.of(context).canPop()) {
                      Navigator.pop(context);
                    }
                    widget.onVoiceSearchToggle();
                  },
                  child: Container(
                    height: 46,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      borderRadius: BorderRadius.circular(13),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF10B981)
                              .withValues(alpha: isDark ? 0.35 : 0.22),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.graphic_eq_rounded,
                          color: Colors.white,
                          size: 19,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          isAr ? 'بحث صوتي' : 'Voice Search',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: isAr ? 13 : 11.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
      builder: (context, c, isAr, isDark) => items.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.search_off_rounded,
                    size: 40,
                    color: c.textSecondary.withValues(alpha: 0.5),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    isAr ? 'لم يتم العثور على سور' : 'No Surahs found',
                    style: TextStyle(
                      color: c.textSecondary,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            )
          : ListView.builder(
              controller: _scrollCtrl,
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 24, top: 4),
              itemCount: items.length,
              itemExtent: _itemExtent,
              addRepaintBoundaries: true,
              itemBuilder: (context, i) {
                final int idx = items[i];
                final int sNum = idx + 1;
                final bool isSel = widget.current == sNum;
                final SurahUiEntry surahMeta = _surahs[idx];

                return SurahListTile(
                  surahNumber: sNum,
                  surahMeta: surahMeta,
                  isSelected: isSel,
                  isArabic: isAr,
                  colors: c,
                  arabicDigits: _arabicDigits[idx],
                  onTap: () => widget.onPick(sNum),
                );
              },
            ),
    );
  }
}
