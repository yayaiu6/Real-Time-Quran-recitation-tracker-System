/// بسم الله الرحمن الرحيم
///
/// ReciteQuran — Real-time Quran recitation tracking app.
///
/// Architecture:
///   main.dart → _Orchestrator (manages engine + audio + controller)
///            → TrackingScreen (UI)
///
/// The _Orchestrator initializes:
///   1. Microphone permissions
///   2. TajweedFormer V4 ASR engine (in a background Isolate)
///   3. Quran reference metadata (expected_tj3.zfx)
///   4. HighlightingController (bridges ASR → UI)
///
/// Recording flow:
///   AudioProcessor captures mic → feeds chunks to Controller →
///   Controller sends to TajweedFormerEngine (Isolate) → gets transcription →
///   matches words against expected Quran text → updates highlighting
library;

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:in_app_update/in_app_update.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_displaymode/flutter_displaymode.dart';

import 'core/app_state.dart';
import 'core/highlighting_controller.dart';
import 'ui/tracking_screen.dart';
import 'verse_list/verse_row.dart';
import 'mushaf/mushaf_view.dart';
import 'core/app_audio_processor.dart';
import 'core/platform_utils.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'ui/widgets/dialogs/dialog_service.dart';

void main() async {
  runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();

      if (kReleaseMode) {
        debugPrint = (String? message, {int? wrapWidth}) {
          if (message != null) print(message);
        };
      }

      if (!PlatformCapabilities.isWeb) {
        // Transparent system bars for immersive experience
        SystemChrome.setSystemUIOverlayStyle(
          const SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            systemNavigationBarColor: Colors.transparent,
          ),
        );
        SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      }

      await AppState.instance.load();
      runApp(const QuranApp());
    },
    (error, stack) {
      DebugLogger.logSimple('Error', 'Uncaught Error: $error');
    },
    zoneSpecification: ZoneSpecification(
      print: (Zone self, ZoneDelegate parent, Zone zone, String line) {
        if (!kReleaseMode || kIsWeb) {
          parent.print(zone, line);
        }
      },
    ),
  );
}

/// Root widget — rebuilds MaterialApp when theme/language changes.
class QuranApp extends StatelessWidget {
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  const QuranApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AppState.instance.themeNotifier,
      builder: (context, child) {
        final ThemeColors c = AppState.instance.colors;
        final isDark = AppState.instance.isDarkMode;
        return MaterialApp(
          navigatorKey: QuranApp.navigatorKey,
          debugShowCheckedModeBanner: false,
          navigatorObservers: [AppModalRouteObserver.instance],
          title: 'Recite Quran - اتلو القران',
          theme: ThemeData(
            useMaterial3: true,
            brightness: isDark ? Brightness.dark : Brightness.light,
            scaffoldBackgroundColor: c.bg,
            colorScheme: ColorScheme(
              brightness: isDark ? Brightness.dark : Brightness.light,
              primary: c.primary,
              onPrimary: c.onPrimary,
              secondary: c.secondary,
              onSecondary: Colors.white,
              error: c.error,
              onError: Colors.white,
              surface: c.surface,
              onSurface: c.text,
              surfaceContainerHighest: c.surfaceHigh,
              outline: c.border,
            ),
            cardTheme: CardThemeData(
              color: c.surface,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(color: c.border, width: 1),
              ),
            ),
            dialogTheme: DialogThemeData(
              backgroundColor: c.surface,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
                side: BorderSide(color: c.border, width: 1),
              ),
            ),
            fontFamily: 'cairo',
          ),
          builder: (context, child) {
            Widget appWidget = child ?? const SizedBox.shrink();
            if (kIsWeb) {
              final media = MediaQuery.of(context);
              final isWide = media.size.width > 480;
              final constrainedWidth = isWide ? 480.0 : media.size.width;

              appWidget = Scaffold(
                backgroundColor:
                    isDark ? Colors.black : const Color(0xFFE5E7EB),
                body: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 480),
                    child: Container(
                      clipBehavior: Clip.antiAlias,
                      decoration: BoxDecoration(
                        color: c.bg,
                        boxShadow: isWide
                            ? [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.18),
                                  blurRadius: 25,
                                  spreadRadius: 5,
                                ),
                              ]
                            : null,
                      ),
                      child: MediaQuery(
                        data: media.copyWith(
                          size: Size(constrainedWidth, media.size.height),
                        ),
                        child: appWidget,
                      ),
                    ),
                  ),
                ),
              );
            }
            return appWidget;
          },
          home: const _Orchestrator(),
        );
      },
    );
  }
}


/// The conductor — owns the ASR engine, audio processor, and controller.
/// Manages the full lifecycle of a recording session.
class _Orchestrator extends StatefulWidget {
  const _Orchestrator();
  @override
  State<_Orchestrator> createState() => _OrchestratorState();
}

class _OrchestratorState extends State<_Orchestrator>
    with WidgetsBindingObserver {
  static ReciteEngine _resolveEngine() {
    const String quranLabApiKey = String.fromEnvironment(
      'QURANLAB_KEY',
      defaultValue: 'qlk_v1_kn2gmnitsiua_R002fODh50Laz7Epx0gvyD',
    );
    return QuranLabSdkEngine(apiKey: quranLabApiKey);
  }

  final ReciteEngine _engine = _resolveEngine();
  final AppAudioProcessor _audio = AppAudioProcessor();
  late final VoiceSearchController _voiceSearchCtrl;

  QuranRepository? _repo;
  HighlightingController? _ctrl;

  bool _isInit = true;
  bool _isRecording = false;
  String _initStatus = 'Starting…';
  bool _isToggling = false; // Prevents double-tap hardware crashes
  bool _isEngineLoading =
      false; // Tracks if ASR is compiling/extracting when user presses record
  bool _isVoiceSearching = false;
  bool _isVoiceSearchPaused = false;
  final ValueNotifier<String> _voiceSearchAsrNotifier = ValueNotifier('');
  String get _voiceSearchAsrText => _voiceSearchAsrNotifier.value;
  StreamSubscription? _transcriptionSub;
  bool _isBackgrounded = false;
  Timer? _enginePrewarmTimer;
  int _prewarmEpoch = 0;

  void _cancelEnginePrewarm() {
    _prewarmEpoch++;
    _enginePrewarmTimer?.cancel();
    _enginePrewarmTimer = null;
  }

  // Endpointing: VAD endpoint with silence threshold

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _voiceSearchCtrl = VoiceSearchController(engine: _engine);

    // Global subscription for Voice Search text and Endpoint auto-stopping
    _transcriptionSub = _engine.transcriptionStream.listen((res) {
      if (_isVoiceSearching && !_isVoiceSearchPaused && mounted) {
        _voiceSearchAsrNotifier.value = res.text;

        // REAL-TIME SEARCH EVALUATION
        _voiceSearchCtrl.processRealtime(res.text).then((rtResult) {
          if (rtResult != null) {
            // Unique match found! Instantly navigate to it without waiting.
            _stopVoiceSearch(precalculatedResult: rtResult);
          } else if (res.isFinal && _isVoiceSearching) {
            final current = _voiceSearchCtrl.currentResult.value;
            // Only auto-stop on silence endpoint if NO candidates were found at all.
            // When candidates exist, VoiceSearchDialog handles the user selection,
            // the dynamic countdown, and the Hold/Pause state.
            if (current == null || !current.hasCandidates) {
              DebugLogger.log(
                'VoiceSearch',
                'Auto-stopping on VAD endpoint (no matches found)',
              );
              _stopVoiceSearch();
            }
          }
        });
      }
    });

    _init();
    // Defer update check by 5s so Play Core native code doesn't compete
    // with XNNPACK/ONNX initialization for memory and IPC resources
    // during the critical startup window.
    Future.delayed(const Duration(seconds: 15), _checkForUpdates);

    if (PlatformCapabilities.supportsHighRefreshRate) {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        try {
          await FlutterDisplayMode.setHighRefreshRate();
        } catch (e) {
          DebugLogger.logSimple(
            'DisplayMode',
            'Failed to set high refresh rate: $e',
          );
        }
      });
    }
  }

  Future<void> _checkForUpdates() async {
    if (!PlatformCapabilities.isAndroid) return;
    try {
      const platform = MethodChannel('com.recitequran.app/playstore');
      final bool hasPlayStore =
          await platform.invokeMethod('isPlayStoreInstalled');

      if (!hasPlayStore) {
        DebugLogger.logSimple('Update',
            'Play Store missing (LineageOS). Bypassing Play Core API.');
        return;
      }

      final info = await InAppUpdate.checkForUpdate();
      if (info.updateAvailability == UpdateAvailability.updateAvailable) {
        await InAppUpdate.performImmediateUpdate();
      }
    } catch (e) {
      DebugLogger.logSimple(
          'Update', "Play Core update check aborted safely: $e");
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.detached) {
      _cancelEnginePrewarm();
      return;
    }

    if (state == AppLifecycleState.resumed) {
      _isBackgrounded = false;
      if (!_engine.isInitialized) {
        _scheduleEnginePrewarm();
      }
    }

    final bool isDesktopOrWeb =
        PlatformCapabilities.isWeb || PlatformCapabilities.isDesktop;

    if (state == AppLifecycleState.paused) {
      _cancelEnginePrewarm();
      if (!isDesktopOrWeb) {
        _isBackgrounded = true;
      }
    }
  }

  @override
  void dispose() {
    _cancelEnginePrewarm();
    if (!PlatformCapabilities.isWeb) {
      WidgetsBinding.instance.removeObserver(this);
    }
    _transcriptionSub?.cancel();
    _audio.dispose();
    _ctrl?.dispose();
    _voiceSearchAsrNotifier.dispose();
    super.dispose();
  }

  /// Sequential initialization pipeline in the background.
  /// Does not block the splash screen for the heavy model extraction.
  Future<void> _init() async {
    try {
      // ASR engine initialization is lazily deferred until the user initiates recitation
      // or voice search via _ensureEngineReady(), keeping silent reading cool, lean, and jank-free.
      if (mounted) setState(() => _initStatus = 'Loading Quran database…');
      // Start Mushaf preload before phoneme JSON loading so native extraction/atlas
      // load does not wait behind the 12.8 MB phoneme dataset.
      MushafView.preloadData();
      final service = QuranMetadataService();
      _repo = QuranRepository(service);
      final initialSurah = AppState.instance.lastSurah;
      final initialAyah = AppState.instance.lastAyah;
      await Future.wait([
        VerseRow.ensureWordsLoaded(),
        _repo!.loadSurahAsync(initialSurah),
      ]);
      _voiceSearchCtrl.repository = _repo;

      // Voice search phonetic index is lazily loaded on first voice search tap,
      // saving ~20MB RAM and preventing background isolate CPU churn during startup and silent reading.

      _ctrl = HighlightingController(
        engine: _engine,
        repository: _repo!,
        isTajweed: AppState.instance.currentMode == AppMode.tajweed,
        config: AppState.instance.trackerConfig,
        // onAyahChanged is called on explicit user actions (manual tap, session start).
        // Automatic ayah-advance uses flushAndResetForNextAyah() inside
        // HighlightingController itself — that handles the flush-before-reset pattern.
        // We only clear the audio processor's frame buffer here (which is a no-op anyway).
        onAyahChanged: () {
          // DO NOT call _audio.clearBuffer() here: in continuous recitation,
          // clearing the frame buffer discards up to 480ms of audio, causing
          // the model to drop the first 2 letters of the incoming ayah.
          // DO NOT call _engine.resetBuffer() here.
          // The correct reset path at ayah boundaries is flushAndResetForNextAyah()
          // which is triggered from _onIsolateWordMatched in HighlightingController.
          // Calling resetBuffer() here would wipe the live cache before the flush,
          // silently discarding the final word's right-context tail every ayah.
        },
      );
      await _ctrl!.setTargetSurah(initialSurah);
      _ctrl!.setManualAyah(initialSurah, initialAyah);

      if (mounted) setState(() => _isInit = false);

      // Unified ASR pre-warming: warms up lazily in background ONLY if model is cached on disk
      _scheduleEnginePrewarm();

      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted) return;

        if (PlatformCapabilities.isWeb)
          return; // Zero intro / popup interruptions on Web
        final prefs = await SharedPreferences.getInstance();
        final hasChosenTheme = prefs.getBool('has_chosen_theme') ?? false;
        if (!hasChosenTheme && mounted) {
          await DialogService.showThemeSelection(
            context,
            onThemeSelected: () {
              prefs.setBool('has_chosen_theme', true);
              Navigator.of(context).pop();
            },
          );
          if (mounted) {
            await Future<void>.delayed(const Duration(milliseconds: 250));
            await _checkAndShowAppGuide();
          }
        } else {
          await _checkAndShowAppGuide();
        }
      });
    } catch (e) {
      DebugLogger.logSimple('INIT', '❌ Error: $e');
      if (mounted) setState(() => _initStatus = 'Error: $e');
    }
  }

  Future<void> _checkAndShowAppGuide() async {
    final prefs = await SharedPreferences.getInstance();
    final hasSeen = prefs.getBool('has_seen_app_guide_v1') ?? false;
    if (!hasSeen && mounted) {
      DialogService.showAppGuide(context);
    }
  }

  /// Silently pre-warms the ASR neural engine in the background
  /// only after Mushaf data is ready and if the model is already cached on disk.
  void _scheduleEnginePrewarm() {
    if (_engine.isInitialized) return;
    final int epoch = ++_prewarmEpoch;
    _enginePrewarmTimer?.cancel();
    _enginePrewarmTimer = null;
    unawaited(_waitAndArmEnginePrewarm(epoch));
  }

  Future<void> _waitAndArmEnginePrewarm(int epoch) async {
    if (AppState.instance.isMushafMode && !MushafProvider.instance.isReady) {
      await MushafProvider.instance.loadData();
    }
    if (!mounted ||
        _isBackgrounded ||
        _engine.isInitialized ||
        epoch != _prewarmEpoch) {
      return;
    }

    _enginePrewarmTimer = Timer(const Duration(milliseconds: 1500), () async {
      _enginePrewarmTimer = null;
      if (!mounted ||
          _isBackgrounded ||
          _engine.isInitialized ||
          epoch != _prewarmEpoch) {
        return;
      }

      // CRITICAL: Only pre-warm in the background if the model is ALREADY CACHED on disk!
      // Never download ~56MB silently over cellular/background without explicit user consent.
      final bool isCached = await _engine.isModelCached();
      if (!isCached ||
          !mounted ||
          _isBackgrounded ||
          _engine.isInitialized ||
          epoch != _prewarmEpoch) {
        DebugLogger.logSimple(
          'ASR',
          'ℹ️ Model not cached on disk. Skipping background prewarm download.',
        );
        return;
      }

      DebugLogger.logSimple('ASR', '⚡ Background pre-warming ASR engine...');
      unawaited(_engine.initialize().catchError((e) {
        DebugLogger.logSimple(
          'ASR',
          '⚠️ Background engine pre-warm safely handled error: $e',
        );
      }));
    });
  }

  /// Ensures the ASR engine is initialized.
  /// Prompts for user consent across all platforms if the model is not yet downloaded.
  Future<bool> _ensureEngineReady() async {
    _cancelEnginePrewarm();

    if (_engine.isInitialized) return true;

    final bool isCached = await _engine.isModelCached();
    if (!isCached && mounted) {
      final bool? proceed = await DialogService.showModelDownload(context);
      if (proceed != true) {
        return false;
      }
    }

    if (!_engine.isInitialized) {
      if (mounted) setState(() => _isEngineLoading = true);
      AppState.instance.startModelDownload();

      // Hook up download progress to AppState so mic bar displays live % and MB
      _engine.onDownloadProgress = (done, total) {
        AppState.instance.updateModelDownloadProgress(
          loaded: done,
          total: total,
          fraction: total > 0 ? done / total : 0.0,
        );
      };

      try {
        await _engine.initialize();
        if (_engine.isInitialized) {
          AppState.instance.completeModelDownload();
        } else {
          AppState.instance.resetModelDownload();
        }
      } catch (e, stack) {
        DebugLogger.logSimple('ASR', '❌ Engine initialization failed: $e\n$stack');
        AppState.instance.resetModelDownload();
        AppState.instance.showBanner(const AppBannerInfo(
          id: 'model_download_failed',
          messageAr: 'فشل تنزيل النموذج • تأكد من اتصالك بالإنترنت وحاول مجدداً',
          messageEn: 'Model download failed • Check internet connection and try again',
          icon: Icons.wifi_off_rounded,
          isWarning: true,
        ));
      } finally {
        if (mounted) setState(() => _isEngineLoading = false);
      }
    }
    return _engine.isInitialized;
  }

  Future<bool> _ensureMicPermission(PermissionReason reason) async {
    if (!PlatformCapabilities.isMobile) {
      return true;
    }
    final status = await Permission.microphone.status;
    if (status.isGranted) return true;

    final request = await Permission.microphone.request();
    if (request.isGranted) return true;

    if (mounted) {
      DialogService.showPermission(context, reason: reason);
    }
    return false;
  }

  Future<void> _startAudioRecordingStream() async {
    try {
      await _audio.start(
        onChunk: (chunk, isFinal) {
          if (!_isRecording) return;
          _ctrl?.feed(chunk, isFinal: isFinal);
        },
      );
    } catch (e) {
      DebugLogger.logSimple('AUDIO', '❌ ERROR: $e');
      if (mounted) setState(() => _isRecording = false);
    }
  }

  /// Toggles recording on/off with hardware-safe locking.
  Future<void> _toggleRecord() async {
    if (_isToggling) return;
    _isToggling = true;

    try {
      if (_isRecording) {
        await _audio.stop();
        _engine.flushThenReset();
        _ctrl?.finalize(resetEngine: false);
        // Screen remains awake continuously
        if (mounted) {
          setState(() {
            _isRecording = false;
          });
        }
      } else {
        if (!await _ensureMicPermission(PermissionReason.tracking)) {
          _isToggling = false;
          return;
        }

        // Ensure engine is ready
        if (!await _ensureEngineReady()) {
          _isToggling = false;
          return;
        }

        _engine.resetBuffer();

        if (_ctrl != null) {
          final int currentPage = AppState.instance.currentMushafPage.value;
          final int? activeAyah = _ctrl!.activeAyah.value;
          final int activeSurah = _ctrl!.targetSurah != 0
              ? _ctrl!.targetSurah
              : AppState.instance.lastSurah;

          if (AppState.instance.isMushafMode) {
            // ── MUSHAF MODE: One-time page-limited auto-anchor ──
            // If user did not manually select an ayah on this page, do NOT auto-select.
            // Page remains clean and neutral; speech will auto-anchor to any verse on the page.
            final bool hasValidActiveAyah = activeAyah != null &&
                activeAyah > 0 &&
                MushafProvider.instance.isAyahOnPage(
                  pageNumber: currentPage,
                  surah: activeSurah,
                  ayah: activeAyah,
                );

            if (!hasValidActiveAyah) {
              _ctrl!.activeAyah.value = null;
            } else {
              _ctrl!.clearHighlightsForwardFrom(activeSurah, activeAyah);
            }

            final List<(int, int)> pageAyahs =
                MushafProvider.instance.getAyahsOnPage(currentPage);

            _ctrl!.globalRevision.value++;

            _ctrl!.startRecordingSession(
              pageNumber: currentPage,
              pageAyahs: pageAyahs,
            );
          } else {
            // ── VERSE ROW / VERSE LIST MODE: Traditional sequential tracking ──
            // Auto-reanchor is NOT armed on record start; it only works on stall (>100 phonemes).
            // First ayah in surah is selected like before if none is active.
            final int effectiveAyah = (activeAyah != null && activeAyah > 0)
                ? activeAyah
                : 1;

            if (_ctrl!.activeAyah.value != effectiveAyah) {
              _ctrl!.setManualAyah(activeSurah, effectiveAyah);
            } else {
              _ctrl!.clearHighlightsForwardFrom(activeSurah, effectiveAyah);
            }

            _ctrl!.globalRevision.value++;

            _ctrl!.startRecordingSession(
              pageNumber: null,
              pageAyahs: null, // Disarms one-time auto-anchor; normal sequential tracking begins!
            );
          }

          if (mounted) setState(() => _isRecording = true);
          await _startAudioRecordingStream();
        }
      }
    } catch (e) {
      DebugLogger.logSimple('RECORD', '❌ ERROR: $e');
      if (mounted)
        setState(() {
          _isRecording = false;
        });
    } finally {
      _isToggling = false;
    }
  }

  /// Toggles global voice search across the Quran
  Future<void> _toggleVoiceSearch() async {
    if (_isToggling) return;

    if (_isVoiceSearching) {
      await _stopVoiceSearch();
    } else {
      if (_isRecording) {
        await _toggleRecord();
      }
      await _startVoiceSearch();
    }
  }

  Future<void> _startVoiceSearch() async {
    if (_isVoiceSearching || _isToggling) return;
    _isToggling = true;

    try {
      if (!await _ensureMicPermission(PermissionReason.voiceSearch)) {
        _isToggling = false;
        return;
      }

      if (!await _ensureEngineReady()) {
        _isToggling = false;
        return;
      }

      // Suspend highlighting controller so it doesn't consume/reset the engine buffer!
      _ctrl?.finalize();

      // SHOW UI IMMEDIATELY!
      if (mounted) {
        setState(() {
          _isVoiceSearching = true;
        });
      }
      _voiceSearchAsrNotifier.value = '';

      await _voiceSearchCtrl.startSearch();

      _isVoiceSearchPaused = false;
      _audio.start(
        onChunk: (chunk, isFinal) {
          if (!_isVoiceSearchPaused) {
            _engine.transcribe(chunk, isFinal: isFinal);
          }
        },
      ).catchError((e) {
        DebugLogger.logSimple('AUDIO', '❌ ERROR in Voice Search: $e');
        if (mounted) setState(() => _isVoiceSearching = false);
      });
    } catch (e) {
      DebugLogger.logSimple('VOICE_SEARCH', '❌ START ERROR: $e');
      if (mounted) setState(() => _isVoiceSearching = false);
    } finally {
      _isToggling = false;
    }
  }

  Future<void> _stopVoiceSearch({AnchorResult? precalculatedResult}) async {
    if (!_isVoiceSearching || _isToggling) return;
    _isToggling = true;
    _isVoiceSearchPaused = false;

    try {
      await _audio.stop();
      _engine.resetBuffer();
      // Screen remains awake continuously

      if (mounted) {
        setState(() {
          _isVoiceSearching = false;
        });
      }

      AnchorResult? result = precalculatedResult;
      if (result == null) {
        result = await _voiceSearchCtrl.stopSearch(_voiceSearchAsrText);
      }
      _voiceSearchCtrl.clear();
      if (result != null && _ctrl != null) {
        await _ctrl!.setTargetSurah(
          result.surah,
          preserveOtherSurahStates: true,
          clearTargetSurah: false,
        );
        _ctrl!.setManualAyah(result.surah, result.ayah);
        AppState.instance.saveLastPosition(result.surah, result.ayah);
        final mappedPage =
            MushafProvider.instance.getPageForAyah(result.surah, result.ayah);
        if (mappedPage != null) {
          AppState.instance.saveMushafPage(mappedPage);
        }
      } else {
        // Fallback: resume previous state if no Ayah was found
        _ctrl?.resumeTracking();

        AppState.instance.showAyahNotFoundBanner();
      }
    } catch (e) {
      DebugLogger.logSimple('VOICE_SEARCH', '❌ STOP ERROR: $e');
    } finally {
      _isToggling = false;
    }
  }

  void _onVoiceSearchHoldChanged(bool isPaused) {
    _isVoiceSearchPaused = isPaused;
    if (!isPaused) {
      _engine.resetBuffer();
      _audio.clearBuffer();
    }
  }

  /// Warm, elegant splash screen with Quran ayah.
  Widget _loadingScreen() {
    final ThemeColors c = AppState.instance.colors;
    if (kIsWeb) {
      return Scaffold(
        backgroundColor: c.bg,
        body: const SizedBox.expand(),
      );
    }
    return Scaffold(
      backgroundColor: c.bg,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Spacer(flex: 3),

            // ── Decorative top line ──
            Container(
              width: 60,
              height: 1.5,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    c.gold.withValues(alpha: 0.4),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // ── Quran Ayah ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  'وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ',
                  style: TextStyle(
                    color: c.text.withValues(alpha: 0.7),
                    fontSize: 24,
                  ),
                  textAlign: TextAlign.center,
                  textDirection: TextDirection.rtl,
                ),
              ),
            ),

            const SizedBox(height: 24),

            // ── Decorative bottom line ──
            Container(
              width: 60,
              height: 1.5,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    c.gold.withValues(alpha: 0.4),
                    Colors.transparent,
                  ],
                ),
              ),
            ),

            const Spacer(flex: 2),

            // ── Loading indicator ──
            SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 1.5,
                valueColor: AlwaysStoppedAnimation(
                  c.gold.withValues(alpha: 0.5),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _initStatus,
              style: TextStyle(
                color: c.muted.withValues(alpha: 0.5),
                fontSize: 12,
              ),
            ),
            const Spacer(flex: 1),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isInit) return _loadingScreen();
    return TrackingScreen(
      controller: _ctrl!,
      isRecording: _isRecording,
      isLoadingEngine: _isEngineLoading,
      isVoiceSearching: _isVoiceSearching,
      voiceSearchText: _voiceSearchAsrText,
      voiceSearchTextNotifier: _voiceSearchAsrNotifier,
      voiceSearchController: _voiceSearchCtrl,
      onToggleRecord: _toggleRecord,
      onVoiceSearchToggle: _toggleVoiceSearch,
      isVoiceSearchLoading: _voiceSearchCtrl.isIndexLoading,
      onVoiceSearchHoldChanged: _onVoiceSearchHoldChanged,
      onSelectVoiceCandidate: (surah, ayah) {
        _stopVoiceSearch(
          precalculatedResult: AnchorResult(surah: surah, ayah: ayah),
        );
      },
      onClearBuffer: () {
        _engine.resetBuffer();
        _audio.clearBuffer();
      },
    );
  }
}
