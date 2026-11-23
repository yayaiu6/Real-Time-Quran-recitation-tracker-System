import 'dart:js_interop';
import 'dart:js_interop_unsafe';
import 'dart:typed_data';

const String qvpCdnBase = 'https://cdn.quran.ws/qvp/v0.4.0';

/// Web implementation using browser IndexedDB and CDN via JS interop.
Future<bool> hasCachedPagesWeb() async {
  try {
    if (!globalContext.has('hasCachedPages')) return false;
    final jsFn = globalContext['hasCachedPages'] as JSFunction?;
    if (jsFn == null) return false;
    final promise = jsFn.callAsFunction() as JSPromise<JSBoolean>;
    final jsBool = await promise.toDart;
    return jsBool.toDart;
  } catch (_) {
    return false;
  }
}

Future<Uint8List?> getPageFromIndexedDb(String key) async {
  try {
    if (!globalContext.has('getPageFromDB')) return null;
    final jsFn = globalContext['getPageFromDB'] as JSFunction?;
    if (jsFn == null) return null;
    final promise = jsFn.callAsFunction(null, key.toJS) as JSPromise<JSAny?>;
    final jsVal = await promise.toDart;
    if (jsVal == null) return null;
    return (jsVal as JSUint8Array).toDart;
  } catch (_) {
    return null;
  }
}

Future<void> savePageToIndexedDb(String key, Uint8List bytes) async {
  try {
    if (globalContext.has('saveMushafPageToDB')) {
      final jsFn = globalContext['saveMushafPageToDB'] as JSFunction?;
      if (jsFn != null) {
        jsFn.callAsFunction(null, key.toJS, bytes.toJS);
      }
    }
  } catch (_) {}
}

Future<void> savePagesBatchToIndexedDb(Map<String, Uint8List> pages) async {
  if (pages.isEmpty) return;
  try {
    if (globalContext.has('saveMushafPagesBatchToDB')) {
      final jsFn = globalContext['saveMushafPagesBatchToDB'] as JSFunction?;
      if (jsFn != null) {
        final jsObj = JSObject();
        for (final entry in pages.entries) {
          jsObj[entry.key] = entry.value.toJS;
        }
        final promise = jsFn.callAsFunction(null, jsObj) as JSPromise<JSBoolean>;
        await promise.toDart;
        return;
      }
    }
    if (globalContext.has('saveMushafPageToDB')) {
      final jsFn = globalContext['saveMushafPageToDB'] as JSFunction?;
      if (jsFn != null) {
        for (final entry in pages.entries) {
          jsFn.callAsFunction(null, entry.key.toJS, entry.value.toJS);
        }
      }
    }
  } catch (_) {}
}

/// Fetches a Mushaf page or atlas on-demand from the high-speed CDN.
Future<Uint8List?> fetchPageFromCdn(String filename) async {
  try {
    if (globalContext.has('fetchPageAsset')) {
      final jsFn = globalContext['fetchPageAsset'] as JSFunction?;
      if (jsFn != null) {
        final url = '$qvpCdnBase/$filename';
        final promise = jsFn.callAsFunction(null, url.toJS) as JSPromise<JSAny?>;
        final jsVal = await promise.toDart;
        if (jsVal != null) {
          return (jsVal as JSUint8Array).toDart;
        }
      }
    }
  } catch (_) {}
  return null;
}
