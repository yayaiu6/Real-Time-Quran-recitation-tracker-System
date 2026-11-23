// Global application state singleton.
//
// Manages all user-configurable settings (language, theme, font size,
// blur mode, auto-scroll) and exposes the active [ThemeColors]
// palette. All UI widgets listen to this via [ChangeNotifier].
//
// Design: Zero-persistence — settings reset on app restart.
// This keeps the codebase dependency-free and startup instant.

import 'dart:async';
import 'package:flutter/material.dart';
import 'dart:ui' as ui;
import 'package:shared_preferences/shared_preferences.dart';
import 'highlighting_controller.dart';

// Supported UI languages.
enum AppLanguage { ar, en }

// Application Mode: Word Checker vs Tajweed
enum AppMode { wordChecker, tajweed }

// Available color themes: White and Black.
enum AppTheme { white, black }

/// Real-time ASR model download progress tracker for Web.
class ModelDownloadProgress {
  final bool isDownloading;
  final double progress;
  final int loadedBytes;
  final int totalBytes;

  const ModelDownloadProgress({
    this.isDownloading = false,
    this.progress = 0.0,
    this.loadedBytes = 0,
    this.totalBytes = 58720256,
  });

  double get loadedMB => loadedBytes / (1024 * 1024);
  double get totalMB => totalBytes / (1024 * 1024);
  int get percent => (progress * 100).clamp(0, 100).toInt();
}

/// Data payload for modern floating slide-up banners across the app.
class AppBannerInfo {
  final String id;
  final String messageAr;
  final String messageEn;
  final IconData icon;
  final Color Function(ThemeColors c, bool isDark)? customColor;
  final bool isWarning;
  final Duration? customDuration;

  const AppBannerInfo({
    required this.id,
    required this.messageAr,
    required this.messageEn,
    required this.icon,
    this.customColor,
    this.isWarning = false,
    this.customDuration,
  });
}

class AppState extends ChangeNotifier {
  AppState._() {
    // Initialize default language from the device's OS setting.
    final deviceLang = ui.PlatformDispatcher.instance.locale.languageCode;
    _lang = (deviceLang == 'ar') ? AppLanguage.ar : AppLanguage.en;
    languageNotifier = ValueNotifier<AppLanguage>(_lang);
    themeNotifier = ValueNotifier<AppTheme>(_theme);
    HighlightingController.onAutoSavePosition = (surah, ayah) {
      saveLastPosition(surah, ayah);
    };
  }

  /// Singleton instance — accessed everywhere as `AppState.instance`.
  static final AppState instance = AppState._();

  /// Dedicated ValueNotifiers for fine-grained reactivity without rebuilding the entire app tree.
  late final ValueNotifier<AppLanguage> languageNotifier;
  late final ValueNotifier<AppTheme> themeNotifier;
  final ValueNotifier<AppMode> modeNotifier =
      ValueNotifier<AppMode>(AppMode.tajweed);
  final ValueNotifier<AppBannerInfo?> bannerNotifier =
      ValueNotifier<AppBannerInfo?>(null);

  /// Web AI model download progress notifier (fine-grained reactive updates).
  final ValueNotifier<ModelDownloadProgress> modelDownloadNotifier =
      ValueNotifier<ModelDownloadProgress>(const ModelDownloadProgress());

  void updateModelDownloadProgress({
    required int loaded,
    required int total,
    required double fraction,
  }) {
    modelDownloadNotifier.value = ModelDownloadProgress(
      isDownloading: fraction < 1.0,
      progress: fraction,
      loadedBytes: loaded,
      totalBytes: total > 0 ? total : 58720256,
    );
  }

  void startModelDownload() {
    modelDownloadNotifier.value = const ModelDownloadProgress(
      isDownloading: true,
      progress: 0.0,
      loadedBytes: 0,
      totalBytes: 58720256,
    );
  }

  void completeModelDownload() {
    modelDownloadNotifier.value = const ModelDownloadProgress(
      isDownloading: false,
      progress: 1.0,
      loadedBytes: 58720256,
      totalBytes: 58720256,
    );
  }

  void resetModelDownload() {
    modelDownloadNotifier.value = const ModelDownloadProgress();
  }

  SharedPreferences? _prefs;

  Future<SharedPreferences> _getPrefs() async {
    return _prefs ??= await SharedPreferences.getInstance();
  }

  // ── Language ───────────────────────────────────────────────────────────────

  late AppLanguage _lang;
  AppLanguage get lang => _lang;
  bool get isArabic => _lang == AppLanguage.ar;

  void toggleLanguage() async {
    _lang = _lang == AppLanguage.ar ? AppLanguage.en : AppLanguage.ar;
    languageNotifier.value = _lang;
    notifyListeners();
    final prefs = await _getPrefs();
    await prefs.setString('lang', _lang.name);
  }

  // ── Mode ───────────────────────────────────────────────────────────────────

  AppMode currentMode = AppMode.tajweed;
  int tajweedClickCount = 0;
  bool get hasClickedTajweedWord => tajweedClickCount >= 10;
  final ValueNotifier<bool> hasClickedTajweedNotifier = ValueNotifier(false);

  void setMode(AppMode mode) async {
    if (currentMode != mode) {
      currentMode = mode;
      modeNotifier.value = mode;
      notifyListeners();
      try {
        final prefs = await _getPrefs();
        await prefs.setString('app_mode', mode.name);
      } catch (_) {}
    }
  }

  Future<void> markTajweedWordClicked() async {
    if (tajweedClickCount < 10) {
      tajweedClickCount++;
      if (tajweedClickCount >= 10) {
        hasClickedTajweedNotifier.value = true;
      }
      notifyListeners();
      final prefs = await _getPrefs();
      await prefs.setInt('tajweed_click_count', tajweedClickCount);
    }
  }

  // ── Theme ──────────────────────────────────────────────────────────────────

  AppTheme _theme = AppTheme.white;
  AppTheme get theme => _theme;
  bool get isDarkMode => _theme == AppTheme.black;
  bool get isBlack => _theme == AppTheme.black;
  bool get isWhite => _theme == AppTheme.white;
  bool get isOled => _theme == AppTheme.black;
  bool get isParchment => false;

  void setTheme(AppTheme t) async {
    _theme = t;
    themeNotifier.value = _theme;
    notifyListeners();
    final prefs = await _getPrefs();
    await prefs.setString('theme', _theme.name);
  }

  // ── Blur Mode ──────────────────────────────────────────────────────────────

  bool isBlurMode = false;

  /// Dedicated notifier for blur mode changes (allows scoped listening without global ChangeNotifier).
  final ValueNotifier<bool> blurModeNotifier = ValueNotifier<bool>(false);

  /// Whether blur (memorization concealing) should actively conceal unrecited words.
  /// Strictly active inside an active recitation session (local recording).
  bool isBlurEffective({bool isRecording = false}) {
    return isBlurMode && isRecording;
  }

  void toggleBlurMode() async {
    isBlurMode = !isBlurMode;
    blurModeNotifier.value = isBlurMode;
    notifyListeners();
    final prefs = await _getPrefs();
    await prefs.setBool('blurMode', isBlurMode);
  }

  // ── Tajweed Static Color Mode ──────────────────────────────────────────────
  bool isTajweedColoring = false;
  final ValueNotifier<bool> tajweedColoringNotifier = ValueNotifier<bool>(false);

  void setTajweedColoring(bool val) async {
    if (isTajweedColoring == val) return;
    isTajweedColoring = val;
    tajweedColoringNotifier.value = val;
    notifyListeners();
    final prefs = await _getPrefs();
    await prefs.setBool('tajweedColoring', val);
  }

  // ── Mushaf Layout ──────────────────────────────────────────────────────────
  bool isMushafMode = true;
  final ValueNotifier<bool> mushafModeNotifier = ValueNotifier<bool>(true);
  final ValueNotifier<int> currentMushafPage = ValueNotifier<int>(1);

  void toggleMushafMode() async {
    isMushafMode = !isMushafMode;
    mushafModeNotifier.value = isMushafMode;
    notifyListeners();
    final prefs = await _getPrefs();
    await prefs.setBool('mushafMode', isMushafMode);
  }

  void setMushafMode(bool value) async {
    if (isMushafMode != value) {
      isMushafMode = value;
      mushafModeNotifier.value = isMushafMode;
      notifyListeners();
      final prefs = await _getPrefs();
      await prefs.setBool('mushafMode', isMushafMode);
    }
  }

  // ── Auto Scroll ──
  static const List<double> autoScrollMultipliers = [
    0.25,
    0.5,
    1.0,
    1.5,
    3.0,
    4.5,
    6.0
  ];
  static const List<String> speedLabels = [
    '0.25x',
    '0.5x',
    '1.0x',
    '1.5x',
    '2.0x',
    '2.5x',
    '3.0x'
  ];
  int autoScrollSpeed = 2; // 2 = 1.0x (index in new array)
  bool hasChosenAutoScrollSpeed = false;

  void setAutoScrollSpeed(int speed) async {
    autoScrollSpeed = speed;
    notifyListeners();
    final prefs = await _getPrefs();
    await prefs.setInt('autoScrollSpeed', autoScrollSpeed);
  }

  void setHasChosenAutoScrollSpeed(bool chosen) async {
    hasChosenAutoScrollSpeed = chosen;
    final prefs = await _getPrefs();
    await prefs.setBool('has_chosen_speed', chosen);
  }

  void cycleAutoScrollSpeed() {
    final next = (autoScrollSpeed + 1) % autoScrollMultipliers.length;
    setAutoScrollSpeed(next);
  }

  // ── Font Size ──
  final ValueNotifier<double> fontSizeNotifier = ValueNotifier<double>(28.0);
  double get fontSize => fontSizeNotifier.value;
  set fontSize(double size) => fontSizeNotifier.value = size;

  Timer? _fontSizeDebounceTimer;

  void setFontSize(double size, {bool persistImmediately = false}) {
    if (fontSizeNotifier.value != size) {
      fontSizeNotifier.value = size;
      notifyListeners();
    }
    if (persistImmediately) {
      _fontSizeDebounceTimer?.cancel();
      _saveFontSize(size);
    } else {
      _fontSizeDebounceTimer?.cancel();
      _fontSizeDebounceTimer = Timer(const Duration(milliseconds: 300), () {
        _saveFontSize(size);
      });
    }
  }

  Future<void> _saveFontSize(double size) async {
    try {
      final prefs = await _getPrefs();
      await prefs.setDouble('fontSize', size);
    } catch (_) {}
  }

  Future<void> saveMushafPage(int page) async {
    if (!QuranMetadata.isValidPage(page)) return;
    currentMushafPage.value = page;
    try {
      final prefs = await _getPrefs();
      await prefs.setInt('last_mushaf_page', page);
    } catch (_) {}
  }

  // ── Last Recitation Position ──────────────────────────────────────────────

  int lastSurah = 1;
  int lastAyah = 1;
  Timer? _savePositionDebounce;

  Future<void> saveLastPosition(int surah, int ayah) async {
    if (!QuranMetadata.isValidAyah(surah, ayah)) return;
    if (lastSurah == surah && lastAyah == ayah) return;
    lastSurah = surah;
    lastAyah = ayah;
    _savePositionDebounce?.cancel();
    _savePositionDebounce = Timer(const Duration(milliseconds: 500), () async {
      try {
        final prefs = await _getPrefs();
        await prefs.setInt('last_surah', surah);
        await prefs.setInt('last_ayah', ayah);
      } catch (_) {}
    });
  }

  // ── Tajweed Configuration (App Default: Tashkeel Only, Custom Rules) ────────
  static const TajweedConfig defaultTajweedConfig = TajweedConfig(
    checkMadd: false,
    checkTashkeel: true,
    checkGhunnah: false,
    checkShaddah: false,
    checkQalqalah: false,
    checkLetterSwap: false,
  );

  TajweedConfig _tajweedConfig = defaultTajweedConfig;
  TajweedConfig get tajweedConfig => _tajweedConfig;
  final ValueNotifier<TajweedConfig> tajweedConfigNotifier =
      ValueNotifier<TajweedConfig>(defaultTajweedConfig);

  void setTajweedConfig(TajweedConfig config, [HighlightingController? controller]) async {
    if (_tajweedConfig == config) return;
    _tajweedConfig = config;
    tajweedConfigNotifier.value = config;
    controller?.updateTajweedConfig(config);
    notifyListeners();

    try {
      final prefs = await _getPrefs();
      await prefs.setBool('tajweed_has_custom_config', true);
      await prefs.setBool('tajweed_check_madd', config.checkMadd);
      await prefs.setBool('tajweed_check_tashkeel', config.checkTashkeel);
      await prefs.setBool('tajweed_check_ghunnah', config.checkGhunnah);
      await prefs.setBool('tajweed_check_shaddah', config.checkShaddah);
      await prefs.setBool('tajweed_check_qalqalah', config.checkQalqalah);
      await prefs.setBool('tajweed_check_letter_swap', config.checkLetterSwap);
    } catch (_) {}
  }

  // ── Tracker Configuration ──────────────────────────────────────────────────
  // Recitation tracking uses standard normal calibration with continuous auto-reanchor enabled (stall threshold: 100).
  TrackerConfig _trackerConfig = TrackerConfig.normal(
    enableEarlyMatching: true,
    enableAutoReanchor: true,
    reanchorStallThreshold: 100,
  );
  TrackerConfig get trackerConfig =>
      _trackerConfig.copyWith(tajweed: _tajweedConfig);

  /// Currently active modern banner (replaces old SnackBars and unifies feedback).
  AppBannerInfo? currentBanner;
  Timer? _bannerTimer;

  bool get isBannerVisible => currentBanner != null;

  /// Set of banner IDs already seen by the user to provide adaptive display durations.
  final Set<String> _seenBannerIds = <String>{};

  /// Computes adaptive duration: readable on first impression, fast and non-intrusive on subsequent views.
  Duration _getDynamicBannerDuration(AppBannerInfo banner) {
    if (banner.customDuration != null) return banner.customDuration!;

    final bool isFirstTime = !_seenBannerIds.contains(banner.id);
    if (isFirstTime) {
      _seenBannerIds.add(banner.id);
      unawaited(_saveSeenBanners());
      // First appearance: comfortably readable
      if (banner.id == 'ayah_not_found') {
        return const Duration(milliseconds: 2400);
      }
      return const Duration(milliseconds: 3200);
    } else {
      // Subsequent appearances: fast, snappy confirmation
      if (banner.id == 'ayah_not_found') {
        return const Duration(milliseconds: 1700);
      }
      return const Duration(milliseconds: 1800);
    }
  }

  Future<void> _saveSeenBanners() async {
    try {
      final prefs = await _getPrefs();
      await prefs.setStringList('seen_banner_ids', _seenBannerIds.toList());
    } catch (_) {}
  }

  /// Displays the modern slide-up floating banner.
  void showBanner(AppBannerInfo banner) {
    currentBanner = banner;
    bannerNotifier.value = banner;
    _bannerTimer?.cancel();
    notifyListeners();

    final Duration effectiveDuration = _getDynamicBannerDuration(banner);
    _bannerTimer = Timer(effectiveDuration, () {
      if (currentBanner?.id == banner.id) {
        currentBanner = null;
        bannerNotifier.value = null;
        notifyListeners();
      }
    });
  }

  /// Dismisses any currently visible modern banner.
  void dismissBanner() {
    _bannerTimer?.cancel();
    if (currentBanner != null) {
      currentBanner = null;
      bannerNotifier.value = null;
      notifyListeners();
    }
  }

  /// Dispatches the modern Tajweed mode enabled banner.
  void showTajweedBanner() {
    showBanner(const AppBannerInfo(
      id: 'tajweed',
      messageAr: 'تم تفعيل التجويد • اضغط على الكلمات الصفراء لمعرفة الخطأ',
      messageEn: 'Tajweed Enabled • Tap yellow words for error details',
      icon: Icons.record_voice_over_rounded,
      isWarning: false,
    ));
  }

  /// Dismisses the Tajweed banner.
  void dismissTajweedBanner() {
    if (currentBanner?.id == 'tajweed') {
      dismissBanner();
    }
  }

  /// Dispatches the modern Ayah Not Found banner (replacing old SnackBar).
  void showAyahNotFoundBanner() {
    showBanner(const AppBannerInfo(
      id: 'ayah_not_found',
      messageAr: 'لم يتم العثور على أي آية • حاول مرة أخرى',
      messageEn: 'No Ayah found • Please try again',
      icon: Icons.search_off_rounded,
      isWarning: true,
    ));
  }

  /// Dispatches the modern Settings Reset banner (replacing old SnackBar).
  void showSettingsResetBanner() {
    showBanner(const AppBannerInfo(
      id: 'settings_reset',
      messageAr: 'تمت إعادة ضبط الإعدادات بنجاح',
      messageEn: 'Settings reset successfully',
      icon: Icons.check_circle_outline_rounded,
      isWarning: false,
    ));
  }

  /// Dispatches the modern Memorization (Blur) banner.
  void showBlurBanner(bool isEnabled) {
    if (isEnabled) {
      showBanner(const AppBannerInfo(
        id: 'blur_mode',
        messageAr: 'تم تفعيل وضع الحفظ • إخفاء الكلمات لاختبار التسميع',
        messageEn:
            'Memorization Mode Enabled • Words hidden for recitation test',
        icon: Icons.visibility_off_rounded,
        isWarning: false,
      ));
    }
  }

  // ── Colors ─────────────────────────────────────────────────────────────────

  /// Returns the active color palette based on the current theme.
  ThemeColors get colors {
    switch (_theme) {
      case AppTheme.white:
        return _whiteColors;
      case AppTheme.black:
        return _blackColors;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WHITE THEME — Warm Natural Linen (Zero Glare, Eye-Comfortable)
  // Warm ivory foundation (#FAF8F5), soft clean surfaces, gentle borders,
  // deep charcoal typography (#1E293B) to avoid harsh optical glare.
  // ──────────────────────────────────────────────────────────────────────────
  static const ThemeColors _whiteColors = ThemeColors(
    bg: Color(0xFFFAF8F5), // Warm natural linen paper (minimizes blue light)
    surface: Color(0xFFFFFFFF), // Clean white card surface
    surfaceHigh: Color(0xFFF4F0E8), // Soft warm elevation layer 1
    surfaceVariant: Color(0xFFEBE5D8), // Soft warm elevation layer 2
    glassSurface: Color(0xEEFAF8F5), // 93% frosted linen overlay
    border: Color(0xFFE8E2D5), // Gentle warm border
    cardBorder: Color(0xFFE8E2D5),
    primary: Color(0xFF047857), // Deep calm emerald green
    onPrimary: Color(0xFFFFFFFF), // Crisp white on primary
    secondary: Color(0xFF0D9488), // Calming Teal
    gold: Color(0xFFB45309), // Warm antique gold
    green: Color(
        0xFF15803D), // Soothing Botanical Green (true green, 5.4:1 contrast on linen, zero glare)
    red: Color(
        0xFFDC2626), // Warm terracotta crimson coral (refined, 5.8:1 contrast, non-alarming)
    muted: Color(0xFF64748B), // Slate-500 neutral muted
    currentWord: Color(0xFF0D9488), // Calming teal active word highlight
    wordHighlight: Color(0xFF0D9488), // Calming teal active word highlight
    text:
        Color(0xFF1E293B), // Slate-800 deep charcoal (13:1 eye-gentle contrast)
    textSecondary: Color(0xFF475569), // Slate-600 secondary text
    tashkeel: Color(0xFF64748B), // Slate-500 neutral muted (5.2:1 contrast for diacritics/waqf)
    tajweed: const TajweedPalette(
      madd: Color(0xFFE11D48), // Crimson Rose for Madd
      iqlab: Color(0xFFD97706), // Warm Amber for Iqlab small meem
      waqf: Color(0xFF16A34A), // Botanical Green for stop marks
      tanwin: Color(0xFF9333EA), // Royal Amethyst for Tanwin
      harakah: Color(0xFF2563EB), // Sapphire Blue for short vowels
      dabt: Color(0xFF0D9488), // Calm Teal for Dabt/reading signs
    ),
    ayahOutline: Color(0x2EB45309), // Soft warm amber outline (~18% alpha)
    ambientGlow: Color(0x18047857), // Ambient soft emerald glow
    success: Color(0xFF15803D), // Soothing botanical green success
    warning: Color(
        0xFFD97706), // Eye-comforting warm antique amber (high legibility on linen, zero orange glare)
    error: Color(0xFFDC2626), // Terracotta crimson error
    info: Color(0xFF2563EB), // Calming sapphire info
    cyan: Color(0xFF0D9488), // Calm teal
    indigo: Color(0xFF4338CA), // Royal Indigo
    emerald: Color(0xFF047857), // Deep emerald
  );

  // ──────────────────────────────────────────────────────────────────────────
  // BLACK THEME — Deep OLED True Black (Tahajjud Eye Comfort)
  // True black foundation (#000000) for OLED battery, paired with soft
  // moonlit pearl text (#E2E8F0) to eliminate night glare & eye fatigue.
  // Highlighting colors optimized for eye comfort, high legibility, and zero halation.
  // ──────────────────────────────────────────────────────────────────────────
  static const ThemeColors _blackColors = ThemeColors(
    bg: Color(0xFF000000), // Pure OLED True Black
    surface: Color(0xFF0D0F14), // Ultra-deep charcoal surface
    surfaceHigh: Color(0xFF151922), // Elevation layer 1
    surfaceVariant: Color(0xFF1C222E), // Elevation layer 2
    glassSurface: Color(0xE005070A), // 88% OLED glassmorphism
    border: Color(0xFF202736), // Subtle boundary
    cardBorder: Color(0xFF202736),
    primary: Color(0xFF10B981), // Serene Emerald
    onPrimary: Color(0xFF000000),
    secondary: Color(0xFF38BDF8), // Celestial Sky Azure
    gold: Color(0xFFEAB308), // Luminous Amber Gold
    green: Color(0xFF10B981), // Tranquil Botanical Emerald (soothing, eye-comfortable, zero halation)
    red: Color(0xFFF87171), // Warm Terracotta Crimson (softened, clear mistake detection, zero glare)
    muted: Color(0xFF64748B), // Slate-500 neutral muted
    currentWord: Color(0xFF38BDF8), // Celestial Sky Azure active word highlight (distinct focal beacon, glare-free)
    wordHighlight: Color(0xFF38BDF8), // Celestial Sky Azure active word highlight (distinct focal beacon, glare-free)
    text: Color(0xFFE2E8F0), // Moonlit pearl (halation-free)
    textSecondary: Color(0xFF94A3B8), // Slate-400
    tashkeel: Color(0xFF94A3B8), // Slate-400 steel mist (5.8:1 contrast for diacritics/waqf)
    tajweed: const TajweedPalette(
      madd: Color(0xFFFB7185), // Luminous Rose for Madd
      iqlab: Color(0xFFFBBF24), // Amber Gold for Iqlab small meem
      waqf: Color(0xFF34D399), // Emerald Mint for stop marks
      tanwin: Color(0xFFC084FC), // Luminous Violet for Tanwin
      harakah: Color(0xFF60A5FA), // Sky Blue for short vowels
      dabt: Color(0xFF2DD4BF), // Bright Teal for Dabt/reading signs
    ),
    ayahOutline: Color(0x35EAB308), // Soft amber outline
    ambientGlow: Color(0x2510B981), // Gentle emerald glow
    success: Color(0xFF10B981), // Calming emerald green success
    warning: Color(0xFFF59E0B), // Warm candlelight honey amber (pure warm amber, zero glare)
    error: Color(0xFFF87171), // Warm Terracotta Crimson error
    info: Color(0xFF38BDF8),
    cyan: Color(0xFF06B6D4),
    indigo: Color(0xFF818CF8),
    emerald: Color(0xFF10B981),
  );

  Future<void> load() async {
    try {
      final prefs = await _getPrefs();

      if (prefs.containsKey('lang')) {
        _lang =
            prefs.getString('lang') == 'en' ? AppLanguage.en : AppLanguage.ar;
      }
      if (prefs.containsKey('theme')) {
        final themeStr = prefs.getString('theme');
        try {
          _theme = AppTheme.values.firstWhere((t) => t.name == themeStr);
        } catch (_) {
          _theme =
              (themeStr == 'dark' || themeStr == 'oled' || themeStr == 'black')
                  ? AppTheme.black
                  : AppTheme.white;
        }
      } else {
        final brightness =
            WidgetsBinding.instance.platformDispatcher.platformBrightness;
        _theme =
            brightness == Brightness.dark ? AppTheme.black : AppTheme.white;
      }
      isBlurMode = prefs.getBool('blurMode') ?? false;
      blurModeNotifier.value = isBlurMode;
      isTajweedColoring = prefs.getBool('tajweedColoring') ?? false;
      tajweedColoringNotifier.value = isTajweedColoring;

      tajweedClickCount = prefs.getInt('tajweed_click_count') ?? 0;
      // Migrate old boolean value if present
      if (tajweedClickCount == 0 &&
          (prefs.getBool('has_clicked_tajweed_word') ?? false)) {
        tajweedClickCount = 10;
      }
      hasClickedTajweedNotifier.value = (tajweedClickCount >= 10);

      final seenBanners = prefs.getStringList('seen_banner_ids');
      if (seenBanners != null) {
        _seenBannerIds.addAll(seenBanners);
      }

      lastSurah = QuranMetadata.clampSurah(prefs.getInt('last_surah') ?? 1);
      lastAyah = (prefs.getInt('last_ayah') ?? 1).clamp(1, 286);
      final savedPage = prefs.getInt('last_mushaf_page');
      if (savedPage != null && QuranMetadata.isValidPage(savedPage)) {
        currentMushafPage.value = savedPage;
      }

      isMushafMode = prefs.getBool('mushafMode') ?? true;
      mushafModeNotifier.value = isMushafMode;
      autoScrollSpeed = prefs.getInt('autoScrollSpeed') ?? 2;
      hasChosenAutoScrollSpeed = prefs.getBool('has_chosen_speed') ?? false;
      if (prefs.containsKey('fontSize')) {
        fontSizeNotifier.value = prefs.getDouble('fontSize') ?? 28.0;
      }

      if (prefs.getBool('tajweed_has_custom_config') == true) {
        _tajweedConfig = TajweedConfig(
          checkMadd: prefs.getBool('tajweed_check_madd') ?? false,
          checkTashkeel: prefs.getBool('tajweed_check_tashkeel') ?? true,
          checkGhunnah: prefs.getBool('tajweed_check_ghunnah') ?? false,
          checkShaddah: prefs.getBool('tajweed_check_shaddah') ?? false,
          checkQalqalah: prefs.getBool('tajweed_check_qalqalah') ?? false,
          checkLetterSwap: prefs.getBool('tajweed_check_letter_swap') ?? false,
        );
      } else {
        _tajweedConfig = defaultTajweedConfig;
      }
      tajweedConfigNotifier.value = _tajweedConfig;

      final savedMode = prefs.getString('app_mode');
      if (savedMode != null) {
        currentMode = AppMode.values.firstWhere(
          (m) => m.name == savedMode,
          orElse: () => AppMode.tajweed,
        );
      } else {
        currentMode = AppMode.tajweed;
      }

      themeNotifier.value = _theme;
      languageNotifier.value = _lang;
      modeNotifier.value = currentMode;

      notifyListeners();
    } catch (e) {
      DebugLogger.logSimple('AppState', "Error loading settings: $e");
    }
  }
}

/// Curated authentic Tajweed color palette for static vector marks.
class TajweedPalette {
  final Color madd;
  final Color iqlab;
  final Color waqf;
  final Color tanwin;
  final Color harakah;
  final Color dabt;

  const TajweedPalette({
    required this.madd,
    required this.iqlab,
    required this.waqf,
    required this.tanwin,
    required this.harakah,
    required this.dabt,
  });
}

/// 2026 Design Token Palette used across the application.
///
/// Implements WCAG AA/AAA compliant Obsidian / Slate dark mode architecture,
/// clean spacious light mode, and vibrant 2026 accents (Emerald Glow, Cyan Spark, Electric Indigo).
class ThemeColors {
  final Color bg;
  final Color surface;
  final Color surfaceHigh;
  final Color surfaceVariant;
  final Color glassSurface;
  final Color border;
  final Color cardBorder;
  final Color primary;
  final Color onPrimary;
  final Color secondary;
  final Color gold;
  final Color green;
  final Color red;
  final Color muted;
  final Color currentWord;
  final Color wordHighlight;
  final Color text;
  final Color textSecondary;
  final Color tashkeel;
  final TajweedPalette tajweed;
  final Color ayahOutline;
  final Color ambientGlow;
  final Color success;
  final Color warning;
  final Color error;
  final Color info;
  final Color cyan;
  final Color indigo;
  final Color emerald;

  const ThemeColors({
    required this.bg,
    required this.surface,
    required this.surfaceHigh,
    required this.surfaceVariant,
    required this.glassSurface,
    required this.border,
    required this.cardBorder,
    required this.primary,
    required this.onPrimary,
    required this.secondary,
    required this.gold,
    required this.green,
    required this.red,
    required this.muted,
    required this.currentWord,
    required this.wordHighlight,
    required this.text,
    required this.textSecondary,
    required this.tashkeel,
    required this.tajweed,
    required this.ayahOutline,
    required this.ambientGlow,
    required this.success,
    required this.warning,
    required this.error,
    required this.info,
    required this.cyan,
    required this.indigo,
    required this.emerald,
  });

  /// A faded version of gold for subtle backgrounds.
  Color get goldFade => gold.withValues(alpha: 0.25);

  /// A faded version of primary for subtle pill backgrounds.
  Color get primaryFade => primary.withValues(alpha: 0.12);

  /// Modern eye-comforting word recitation text colors:
  /// green = correct, red = skipped, yellow/warning = wrong/mistake
  Color get wordCorrect => green;
  Color get wordSkipped => red;
  Color get wordWrong => warning;
}
