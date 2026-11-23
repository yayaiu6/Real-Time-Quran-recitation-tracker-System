import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    application.isIdleTimerDisabled = true
    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)

    if let controller = window?.rootViewController as? FlutterViewController {
      let storageChannel = FlutterMethodChannel(
        name: "com.recitequran.app/storage",
        binaryMessenger: controller.binaryMessenger
      )
      storageChannel.setMethodCallHandler { (call: FlutterMethodCall, result: @escaping FlutterResult) in
        if call.method == "excludeFromBackup",
           let args = call.arguments as? [String: Any],
           let path = args["path"] as? String {
          var url = URL(fileURLWithPath: path)
          var resourceValues = URLResourceValues()
          resourceValues.isExcludedFromBackup = true
          do {
            try url.setResourceValues(resourceValues)
            result(true)
          } catch {
            result(false)
          }
        } else {
          result(FlutterMethodNotImplemented)
        }
      }
    }

    return result
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }
}
