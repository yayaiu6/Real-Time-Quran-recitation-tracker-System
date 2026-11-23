import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../../../core/highlighting_controller.dart';
import 'app_alert_dialogs.dart';
import 'app_picker_dialogs.dart';
import 'app_guide_dialogs.dart';
import 'error_detail_dialog.dart';
import 'voice_search_dialog.dart';
import 'settings_sheet.dart';
import 'surah_picker_sheet.dart';
import 'tajweed_rules_dialog.dart';
import 'dialog_base.dart';

export 'app_alert_dialogs.dart' show PermissionReason;
export 'package:quran_tarteel/quran_tarteel.dart'
    show VoiceSearchResult;
export 'tajweed_rules_dialog.dart' show TajweedRulesDialog;
export 'dialog_base.dart';

/// Centralized Dialog Service facade.
///
/// Prevents dialog collision, standardizes barrier dim styling,
/// and unifies modal presentations across the application.
abstract final class DialogService {
  /// Standard modal barrier dimming color across all application dialogs & sheets.
  static final Color barrierColor = DialogTokens.barrierColor;

  /// Opens the Tajweed Phonetic Error breakdown bottom sheet.
  static void showTajweedError(
    BuildContext context, {
    required String word,
    required List<ReciterError> errors,
    int? surah,
    int? ayah,
    int? wordIndex,
  }) {
    ErrorDetailDialog.show(
      context,
      word: word,
      errors: errors,
      surah: surah,
      ayah: ayah,
      wordIndex: wordIndex,
    );
  }

  /// Displays the Voice Search modal dialog.
  static void showVoiceSearch(
    BuildContext context, {
    required VoidCallback onStop,
    ValueListenable<bool>? isLoading,
    ValueListenable<String>? asrTextNotifier,
    ValueListenable<VoiceSearchResult?>? searchResultNotifier,
    void Function(int surah, int ayah)? onSelectCandidate,
    ValueChanged<bool>? onHoldChanged,
  }) {
    VoiceSearchDialog.show(
      context,
      onStop: onStop,
      isLoading: isLoading,
      asrTextNotifier: asrTextNotifier,
      searchResultNotifier: searchResultNotifier,
      onSelectCandidate: onSelectCandidate,
      onHoldChanged: onHoldChanged,
    );
  }

  /// Opens the App Theme selection dialog.
  static Future<void> showThemeSelection(
    BuildContext context, {
    required VoidCallback onThemeSelected,
    bool barrierDismissible = false,
  }) {
    return showDialog<void>(
      context: context,
      barrierColor: barrierColor,
      barrierDismissible: barrierDismissible,
      builder: (ctx) => ThemeSelectionDialog(onThemeSelected: onThemeSelected),
    );
  }

  /// Displays the TajweedFormer model download modal dialog.
  static Future<bool?> showModelDownload(BuildContext context) {
    return showDialog<bool>(
      context: context,
      barrierColor: barrierColor,
      barrierDismissible: true,
      builder: (ctx) => const ModelDownloadDialog(),
    );
  }

  /// Opens the Microphone permission prompt dialog.
  static Future<void> showPermission(
    BuildContext context, {
    required PermissionReason reason,
  }) {
    return showDialog<void>(
      context: context,
      barrierColor: barrierColor,
      barrierDismissible: true,
      builder: (ctx) => PermissionDialog(reason: reason),
    );
  }

  /// Displays the interactive "How to Use" / App Guide modal dialog.
  static Future<void> showAppGuide(BuildContext context) {
    return AppGuideDialog.show(context);
  }

  /// Displays the What's New / Guide dialog (alias for [showAppGuide]).
  static void showWhatsNew(BuildContext context) {
    showAppGuide(context);
  }

  /// Opens the auto-scroll speed selection dialog.
  static Future<void> showSpeedSelection(
    BuildContext context, {
    VoidCallback? onSpeedSelected,
  }) {
    return showDialog<void>(
      context: context,
      barrierColor: barrierColor,
      barrierDismissible: true,
      builder: (ctx) => SpeedSelectionDialog(
        onSpeedSelected: () {
          onSpeedSelected?.call();
          if (Navigator.of(ctx).canPop()) {
            Navigator.of(ctx).pop();
          }
        },
      ),
    );
  }

  /// Opens the app settings modal bottom sheet.
  static Future<void> showSettings(
    BuildContext context, {
    HighlightingController? controller,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: barrierColor,
      elevation: 0,
      builder: (_) => SettingsSheet(controller: controller),
    );
  }

  /// Opens the Tajweed verification rules modal dialog.
  static Future<void> showTajweedSettings(
    BuildContext context, {
    HighlightingController? controller,
  }) {
    return TajweedRulesDialog.show(context, controller: controller);
  }

  /// Opens the Surah Navigator bottom sheet.
  static Future<void> showSurahPicker(
    BuildContext context, {
    required int current,
    required HighlightingController controller,
    required bool isRecording,
    required bool isVoiceSearching,
    required VoidCallback onToggleRecord,
    required VoidCallback onVoiceSearchToggle,
    required void Function(int surah, {int? ayah}) onPick,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: barrierColor,
      elevation: 0,
      enableDrag: true,
      builder: (_) => SurahPickerSheet(
        current: current,
        controller: controller,
        isRecording: isRecording,
        isVoiceSearching: isVoiceSearching,
        onToggleRecord: onToggleRecord,
        onVoiceSearchToggle: onVoiceSearchToggle,
        onPick: onPick,
      ),
    );
  }
}
