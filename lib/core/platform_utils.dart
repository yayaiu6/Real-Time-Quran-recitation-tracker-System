import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Centralized platform detection and hardware capability abstraction.
/// Eliminates scattered `kIsWeb` and `defaultTargetPlatform` checks across the app.
abstract final class PlatformCapabilities {
  /// Whether the app is executing inside a web browser.
  static bool get isWeb => kIsWeb;

  /// Whether running on native Windows desktop.
  static bool get isWindows =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.windows;

  /// Whether running on native Android mobile/tablet.
  static bool get isAndroid =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  /// Whether running on native Apple iOS.
  static bool get isIOS =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;

  /// Whether running on any native desktop operating system (Windows, macOS, Linux).
  static bool get isDesktop =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.windows ||
          defaultTargetPlatform == TargetPlatform.macOS ||
          defaultTargetPlatform == TargetPlatform.linux);

  /// Whether running on native mobile (Android or iOS).
  static bool get isMobile =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  /// Whether the device supports dynamic high refresh rate switching (e.g. 120Hz on Android).
  static bool get supportsHighRefreshRate => isAndroid;

  /// Whether the platform utilizes MediaKit / LibVLC for native audio streaming.
  static bool get usesMediaKitAudio => isWindows;
}

/// AppModalRouteObserver
///
/// Reliably tracks the presence of modal dialogs, bottom sheets, and popup routes
/// on the Flutter Navigator.
///
/// In Flutter, modal bottom sheets and dialogs are non-opaque ([PopupRoute]),
/// which means Flutter NEVER drives [ModalRoute.secondaryAnimation] on underlying routes.
/// This observer directly intercepts route pushes and pops, providing an instant,
/// zero-overhead notification stream ([activeModalsNotifier]) to pause/resume
/// background ASR visual sync and waveform tickers during modal interactions.
class AppModalRouteObserver extends NavigatorObserver {
  AppModalRouteObserver._();
  static final AppModalRouteObserver instance = AppModalRouteObserver._();

  final ValueNotifier<int> _activeModalsCount = ValueNotifier<int>(0);

  /// ValueNotifier indicating whether any modal bottom sheet, dialog, or popup is open.
  final ValueNotifier<bool> activeModalsNotifier = ValueNotifier<bool>(false);

  /// Whether any modal is currently open.
  bool get isModalOpen => activeModalsNotifier.value;

  bool _isModal(Route<dynamic> route) => route is PopupRoute;

  void _update() {
    final bool open = _activeModalsCount.value > 0;
    if (activeModalsNotifier.value != open) {
      activeModalsNotifier.value = open;
    }
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    if (_isModal(route)) {
      _activeModalsCount.value++;
      _update();
    }
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    if (_isModal(route) && _activeModalsCount.value > 0) {
      if (route is TransitionRoute &&
          route.animation != null &&
          !route.animation!.isDismissed) {
        late final AnimationStatusListener statusListener;
        statusListener = (status) {
          if (status == AnimationStatus.dismissed) {
            route.animation?.removeStatusListener(statusListener);
            if (_activeModalsCount.value > 0) {
              _activeModalsCount.value--;
              _update();
            }
          }
        };
        route.animation!.addStatusListener(statusListener);
      } else {
        _activeModalsCount.value--;
        _update();
      }
    }
  }

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didRemove(route, previousRoute);
    if (_isModal(route) && _activeModalsCount.value > 0) {
      _activeModalsCount.value--;
      _update();
    }
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (oldRoute != null && _isModal(oldRoute) && _activeModalsCount.value > 0) {
      _activeModalsCount.value--;
    }
    if (newRoute != null && _isModal(newRoute)) {
      _activeModalsCount.value++;
    }
    _update();
  }
}

