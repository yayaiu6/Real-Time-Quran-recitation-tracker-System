import 'dart:async';
import 'dart:collection';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:archive/archive.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:qvp_flutter/qvp_flutter.dart';

import '../core/app_state.dart';
import '../core/highlighting_controller.dart'
    show QuranMetadata, HighlightingController;
import 'web/mushaf_web_storage.dart'
    if (dart.library.js_interop) 'web/mushaf_web_storage_web.dart'
    as web_storage;

/// Typed word reference within a Mushaf page for recitation tracking.
class MushafWordRef {
  final int surah;
  final int ayah;
  final int wordIndex1;
  final int wordIndex0;
  final String text;

  const MushafWordRef({
    required this.surah,
    required this.ayah,
    required this.wordIndex1,
    required this.wordIndex0,
    required this.text,
  });
}

/// High-performance data provider for the Mushaf layout backed by pristine qvp_flutter.
/// On Web, manages on-demand CDN streaming, IndexedDB persistence, and pre-rasterization.
/// On Native, manages isolate archive extraction and local filesystem page access.
class MushafProvider {
  MushafProvider._();
  static final MushafProvider instance = MushafProvider._();

  /// Canonical layout configuration for Quran Mushaf page view rendering and preloading.
  static const QvpViewLayout mushafLayout = QvpViewLayout(
    padTop: 0,
    padBottom: 0,
    padSide: 4,
    lineSpacing: 1.0,
    fillHeight: true,
    maxAspectSlack: 0.0,
    surahFrames: true,
  );

  QvpEngine? _engine;
  QvpAtlas? _atlas;
  bool _isReady = false;
  bool _isLoading = false;
  Completer<void>? _loadingCompleter;
  String? _extractedPagesPath;

  bool isSyncingSurah = false;
  final ValueNotifier<bool> isPageScrolling = ValueNotifier<bool>(false);
  bool get isReady => _isReady;
  QvpEngine get engine => _engine!;
  QvpAtlas get atlas => _atlas!;

  Size? _lastViewportSize;
  Size? get lastViewportSize => _lastViewportSize;
  set lastViewportSize(Size? size) {
    if (size != null && size.width > 0 && size.height > 0) {
      _lastViewportSize = size;
    }
  }

  final LinkedHashMap<int, QvpPage> _pageCache = LinkedHashMap<int, QvpPage>();
  final Map<int, Size> _pageLayoutSizes = {};
  static const int _maxCachedPages = 8;
  final Map<int, Future<QvpPage?>> _pendingLoads = {};
  int? _preloadingTargetPage;
  Timer? _preloadTimer;

  Future<void> _prepareNeighborPage(
    int neighborPage,
    int requestedForPage,
    Size targetSize,
    Color inkColor,
    double dpr,
  ) async {
    if (!QuranMetadata.isValidPage(neighborPage)) return;
    if (_preloadingTargetPage != requestedForPage) return;

    QvpPage? page = getCachedPage(neighborPage);
    if (page == null || page.isDisposed) {
      page = await getPage(neighborPage);
    }
    if (page == null ||
        page.isDisposed ||
        _preloadingTargetPage != requestedForPage) {
      return;
    }

    final spec = mushafLayout.toSpec(targetSize.width, targetSize.height);
    if (page.currentLayout == null ||
        _pageLayoutSizes[neighborPage] != targetSize) {
      page.layout(spec);
      _pageLayoutSizes[neighborPage] = targetSize;
    }
    QvpPageView.prepare(
      page,
      inkColor: inkColor,
      surahFrames: mushafLayout.surahFrames,
      dpr: dpr,
    );
  }

  void preloadAdjacentPages(int pageNumber, [Size? viewportSize]) {
    if (viewportSize != null &&
        viewportSize.width > 0 &&
        viewportSize.height > 0) {
      lastViewportSize = viewportSize;
    }

    _preloadingTargetPage = pageNumber;

    final targetSize = lastViewportSize;
    if (targetSize == null || targetSize.width <= 0 || targetSize.height <= 0) {
      return;
    }

    _preloadTimer?.cancel();
    _preloadTimer = Timer(const Duration(milliseconds: 16), () async {
      if (_preloadingTargetPage != pageNumber) return;

      final currentInkColor = AppState.instance.colors.text;
      final dpr = ui.PlatformDispatcher.instance.views.isNotEmpty
          ? ui.PlatformDispatcher.instance.views.first.devicePixelRatio
          : 1.0;

      // Warm forward (+1) and backward (-1) neighbors concurrently in background
      await Future.wait([
        _prepareNeighborPage(
          pageNumber + 1,
          pageNumber,
          targetSize,
          currentInkColor,
          dpr,
        ),
        _prepareNeighborPage(
          pageNumber - 1,
          pageNumber,
          targetSize,
          currentInkColor,
          dpr,
        ),
      ]);
    });
  }

  void preloadData({bool force = false}) {
    if ((_isReady && !force) || _isLoading) return;
    unawaited(loadData(force: force));
  }

  /// Pages are fetched and cached strictly on-demand as the user navigates,
  /// matching the pure on-demand architecture of quran-engine.
  void startBackgroundMushafCaching() {}

  Future<void> _ensureExtracted({bool force = false}) async {
    if (kIsWeb || (_extractedPagesPath != null && !force)) return;
    try {
      final appDir = await getApplicationSupportDirectory();
      final dir = Directory('${appDir.path}/mushaf_pages');
      final marker = File('${dir.path}/.extracted');
      final atlasFile = File('${dir.path}/atlas.qva');
      if (!force &&
          dir.existsSync() &&
          marker.existsSync() &&
          atlasFile.existsSync() &&
          atlasFile.lengthSync() > 0) {
        _extractedPagesPath = dir.path;
        if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) {
          try {
            const MethodChannel('com.recitequran.app/storage')
                .invokeMethod('excludeFromBackup', {'path': dir.path});
          } catch (_) {}
        }
        return;
      }

      final ByteData archiveData;
      try {
        archiveData = await rootBundle.load('assets/pages.tar.xz');
      } catch (_) {
        return;
      }

      final bytes = archiveData.buffer.asUint8List(
        archiveData.offsetInBytes,
        archiveData.lengthInBytes,
      );
      final targetPath = dir.path;
      await compute(_extractTarXzIsolate, (bytes, targetPath));
      _extractedPagesPath = targetPath;
      if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) {
        try {
          const MethodChannel('com.recitequran.app/storage')
              .invokeMethod('excludeFromBackup', {'path': targetPath});
        } catch (_) {}
      }
    } catch (e) {
      debugPrint('Error extracting pages.tar.xz: $e');
    }
  }

  static void _extractTarXzIsolate((Uint8List bytes, String targetPath) args) {
    try {
      final tarBytes = XZDecoder().decodeBytes(args.$1);
      final archive = TarDecoder().decodeBytes(tarBytes);
      final outDir = Directory(args.$2);
      if (!outDir.existsSync()) outDir.createSync(recursive: true);
      for (final file in archive) {
        if (file.isFile) {
          final fileName = file.name.replaceAll(r'\', '/').split('/').last;
          if (fileName.isEmpty) continue;
          final out = File('${outDir.path}/$fileName');
          out.writeAsBytesSync(file.content as List<int>);
        }
      }
      File('${outDir.path}/.extracted').writeAsStringSync('ok');
    } catch (e) {
      debugPrint('Error inside _extractTarXzIsolate: $e');
    }
  }

  /// Resolves the initial Mushaf page from cached page state or surah/ayah mapping.
  int resolveInitialPage({int? surah, int? ayah}) {
    final cachedPage = AppState.instance.currentMushafPage.value;
    if (cachedPage > 1 && QuranMetadata.isValidPage(cachedPage)) {
      return cachedPage;
    }
    final app = AppState.instance;
    final targetSurah = (surah != null && surah > 0) ? surah : app.lastSurah;
    final targetAyah = ayah ?? app.lastAyah;
    final mapped = _atlas?.pageOf(targetSurah, targetAyah) ??
        _atlas?.pageOf(targetSurah, 1);
    if (mapped != null && QuranMetadata.isValidPage(mapped)) {
      return mapped;
    }
    return QuranMetadata.clampPage(cachedPage);
  }

  Future<void> loadData({bool force = false}) async {
    if (_isReady && !force) return;
    if (_isLoading) {
      await _loadingCompleter?.future;
      return;
    }
    _isLoading = true;
    _loadingCompleter = Completer<void>();

    try {
      if (kIsWeb) {
        await QvpEngine.initWeb();
        _engine ??= QvpEngine.open();

        if (_atlas == null || force) {
          var atlasBytes = await web_storage.getPageFromIndexedDb('atlas.qva');
          if (atlasBytes == null || atlasBytes.isEmpty) {
            atlasBytes = await web_storage.fetchPageFromCdn('atlas.qva');
            if (atlasBytes != null && atlasBytes.isNotEmpty) {
              unawaited(
                  web_storage.savePageToIndexedDb('atlas.qva', atlasBytes));
            }
          }
          if (atlasBytes != null && atlasBytes.isNotEmpty) {
            _atlas = _engine!.loadAtlas(atlasBytes);
          } else {
            throw StateError(
                'Mushaf atlas.qva could not be loaded from CDN or Cache');
          }
        }
      } else {
        _engine ??= QvpEngine.open();
        await _ensureExtracted(force: force);
        if (_atlas == null || force) {
          final localAtlas = _extractedPagesPath != null
              ? File('$_extractedPagesPath/atlas.qva')
              : null;
          if (localAtlas != null && localAtlas.existsSync()) {
            final atlasBytes = await localAtlas.readAsBytes();
            _atlas = _engine!.loadAtlas(atlasBytes);
          } else {
            throw StateError(
                'Mushaf atlas.qva not found at ${localAtlas?.path}');
          }
        }
        // Pre-load the first visible page before marking ready so MushafView
        // renders synchronously from _pageCache on its first frame.
        await _loadPageInternal(resolveInitialPage());
      }
      _isReady = true;

      if (kIsWeb) {
        final initialPage =
            QuranMetadata.clampPage(AppState.instance.currentMushafPage.value);
        unawaited(getPage(initialPage));
        startBackgroundMushafCaching();
      }
    } catch (e, st) {
      debugPrint('Error loading MushafProvider QVP data: $e\n$st');
    } finally {
      _isLoading = false;
      _loadingCompleter?.complete();
    }
  }

  Future<QvpPage?> getPage(int pageNumber) async {
    if (!_isReady) {
      await loadData();
    }
    if (_engine == null) return null;

    final cached = getCachedPage(pageNumber);
    if (cached != null) return cached;

    final pending = _pendingLoads[pageNumber];
    if (pending != null) return pending;

    final future = _loadPageInternal(pageNumber);
    _pendingLoads[pageNumber] = future;
    return future.whenComplete(() => _pendingLoads.remove(pageNumber));
  }

  Future<QvpPage?> _loadPageInternal(int pageNumber) async {
    final cached = _pageCache.remove(pageNumber);
    if (cached != null && !cached.isDisposed) {
      _pageCache[pageNumber] = cached;
      return cached;
    }

    try {
      Uint8List? pageBytes;
      if (kIsWeb) {
        final key = QuranMetadata.formatPageKey(pageNumber);
        pageBytes = await web_storage.getPageFromIndexedDb(key);
        if (pageBytes == null || pageBytes.isEmpty) {
          // Fallback check unpadded key
          pageBytes = await web_storage.getPageFromIndexedDb('$pageNumber.qvp');
        }
        if (pageBytes == null || pageBytes.isEmpty) {
          pageBytes = await web_storage.fetchPageFromCdn(key);
          if (pageBytes != null && pageBytes.isNotEmpty) {
            unawaited(web_storage.savePageToIndexedDb(key, pageBytes));
          }
        }
      } else {
        File? localPage;
        if (_extractedPagesPath != null) {
          localPage = File(
              '$_extractedPagesPath/${QuranMetadata.formatPageKey(pageNumber)}');
        }
        if (localPage == null || !(await localPage.exists())) {
          await _ensureExtracted(force: true);
          localPage = _extractedPagesPath != null
              ? File(
                  '$_extractedPagesPath/${QuranMetadata.formatPageKey(pageNumber)}')
              : null;
        }
        if (localPage != null) {
          try {
            pageBytes = await localPage.readAsBytes();
          } catch (_) {
            pageBytes = null;
          }
        }
      }

      if (pageBytes != null && pageBytes.isNotEmpty) {
        final page = _engine!.loadPage(pageBytes);
        final currentInkColor = AppState.instance.colors.text;
        page.setDefaultColor(currentInkColor);

        while (_pageCache.length >= _maxCachedPages) {
          final currentPage = AppState.instance.currentMushafPage.value;
          int? evictKey;
          int maxDistance = -1;
          for (final k in _pageCache.keys) {
            final distance = (k - currentPage).abs();
            if (distance > maxDistance) {
              maxDistance = distance;
              evictKey = k;
            }
          }
          if (evictKey != null &&
              evictKey != pageNumber &&
              (evictKey - currentPage).abs() > 2) {
            final oldestPage = _pageCache.remove(evictKey);
            oldestPage?.dispose();
            _pageLayoutSizes.remove(evictKey);
            QvpPageView.evictPage(evictKey);
          } else {
            break;
          }
        }
        _pageCache[pageNumber] = page;
        return page;
      }
      return null;
    } catch (e) {
      debugPrint('Error loading QVP page $pageNumber: $e');
      return null;
    }
  }

  QvpPage? getCachedPage(int pageNumber) {
    final page = _pageCache[pageNumber];
    if (page != null && page.isDisposed) {
      _pageCache.remove(pageNumber);
      return null;
    }
    if (page != null) {
      _pageCache.remove(pageNumber);
      _pageCache[pageNumber] = page;
    }
    return page;
  }

  (int surah, int ayah)? getFirstAyahOnPage(int pageNumber) {
    if (!_isReady || _atlas == null) return null;
    return _atlas!.pageRange(pageNumber)?.first;
  }

  /// Returns all (surah, ayah) pairs present on [pageNumber] in sequential reading order.
  List<(int surah, int ayah)> getAyahsOnPage(int pageNumber) {
    if (!QuranMetadata.isValidPage(pageNumber)) return const [];

    // 1. Prefer vector page word list if already loaded in memory
    final page = _pageCache[pageNumber];
    if (page != null && page.words.isNotEmpty) {
      final List<(int surah, int ayah)> result = [];
      final Set<int> seen = {};
      for (final w in page.words) {
        if (w.surah <= 0 || w.ayah <= 0) continue;
        final key = (w.surah << 16) | w.ayah;
        if (seen.add(key)) {
          result.add((w.surah, w.ayah));
        }
      }
      if (result.isNotEmpty) return result;
    }

    // 2. Fall back to Atlas pageRange
    if (!_isReady || _atlas == null) return const [];
    final r = _atlas!.pageRange(pageNumber);
    if (r == null) return const [];

    final first = r.first;
    final last = r.last;
    final List<(int surah, int ayah)> result = [];

    if (first.$1 == last.$1) {
      for (int a = first.$2; a <= last.$2; a++) {
        result.add((first.$1, a));
      }
    } else {
      for (int a = first.$2; a <= QuranMetadata.getAyahCount(first.$1); a++) {
        result.add((first.$1, a));
      }
      for (int s = first.$1 + 1; s < last.$1; s++) {
        for (int a = 1; a <= QuranMetadata.getAyahCount(s); a++) {
          result.add((s, a));
        }
      }
      for (int a = 1; a <= last.$2; a++) {
        result.add((last.$1, a));
      }
    }
    return result;
  }

  int? getDominantSurahOnPage(int pageNumber) {
    if (!_isReady || _atlas == null) return null;
    return _atlas!.pageRange(pageNumber)?.first.$1;
  }

  bool isAyahOnPage({
    required int pageNumber,
    required int surah,
    required int ayah,
  }) {
    if (!_isReady || _atlas == null) return false;
    return _atlas!.pageOf(surah, ayah) == pageNumber;
  }

  int? getPageForAyah(int surah, int ayah) {
    if (!_isReady || _atlas == null) return null;
    return _atlas!.pageOf(surah, ayah);
  }

  MushafWordRef? getLastWordOnPage(int pageNumber) {
    final page = _pageCache[pageNumber];
    if (page != null && page.words.isNotEmpty) {
      final w = page.words.last;
      return MushafWordRef(
        surah: w.surah,
        ayah: w.ayah,
        wordIndex1: w.word,
        wordIndex0: w.word - 1,
        text: w.text,
      );
    }
    final r = _atlas?.pageRange(pageNumber);
    if (r != null) {
      return MushafWordRef(
        surah: r.last.$1,
        ayah: r.last.$2,
        wordIndex1: 1,
        wordIndex0: 0,
        text: '',
      );
    }
    return null;
  }

  Future<void> ensureActiveAyahOnCurrentPage({
    required HighlightingController controller,
    int? pageNumber,
  }) async {
    if (!_isReady) {
      await loadData();
    }
    final page = pageNumber ?? AppState.instance.currentMushafPage.value;
    final int? activeAyah = controller.activeAyah.value;
    final int targetSurah = controller.targetSurah != 0
        ? controller.targetSurah
        : AppState.instance.lastSurah;

    final bool isOnCurrentPage = activeAyah != null &&
        isAyahOnPage(pageNumber: page, surah: targetSurah, ayah: activeAyah);

    if (!isOnCurrentPage) {
      final first = getFirstAyahOnPage(page);
      if (first != null) {
        isSyncingSurah = true;
        try {
          controller.setManualAyah(first.$1, first.$2);
          AppState.instance.saveLastPosition(first.$1, first.$2);
        } finally {
          isSyncingSurah = false;
        }
      }
    }
  }
}

/// Backward compatibility alias
typedef MushafRepository = MushafProvider;
