import Capacitor
import FacebookCore
import Foundation

@objc(MetaAppEventsPlugin)
public class MetaAppEventsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MetaAppEventsPlugin"
    public let jsName = "MetaAppEvents"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "enable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logEvent", returnType: CAPPluginReturnPromise)
    ]

    private let expectedAppId = "3176918089184321"
    private var configured = false
    private var enabled = false
    private var activated = false

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve([
            "available": true,
            "platform": "ios",
            "appId": expectedAppId,
            "debugBuild": isDebugBuild(),
            "configured": configured,
            "enabled": enabled
        ])
    }

    @objc func configure(_ call: CAPPluginCall) {
        let appId = call.getString("appId") ?? ""
        let clientToken = call.getString("clientToken") ?? ""

        guard appId == expectedAppId, !clientToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !isDebugBuild() else {
            call.resolve([
                "configured": false,
                "reason": isDebugBuild() ? "debug_build" : "missing_meta_client_token"
            ])
            return
        }

        Settings.shared.appID = appId
        Settings.shared.clientToken = clientToken
        Settings.shared.isAutoLogAppEventsEnabled = false
        Settings.shared.isAdvertiserIDCollectionEnabled = false
        ApplicationDelegate.shared.initializeSDK()

        configured = true
        call.resolve(["configured": true])
    }

    @objc func enable(_ call: CAPPluginCall) {
        guard configured, !isDebugBuild() else {
            call.resolve([
                "enabled": false,
                "reason": isDebugBuild() ? "debug_build" : "not_configured"
            ])
            return
        }

        Settings.shared.isAdvertiserIDCollectionEnabled = false
        enabled = true

        if !activated {
            AppEvents.shared.activateApp()
            activated = true
        }

        call.resolve(["enabled": true])
    }

    @objc func disable(_ call: CAPPluginCall) {
        enabled = false
        Settings.shared.isAdvertiserIDCollectionEnabled = false
        call.resolve(["enabled": false])
    }

    @objc func logEvent(_ call: CAPPluginCall) {
        let eventName = call.getString("name") ?? ""
        guard enabled, !eventName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.resolve(["sent": false, "reason": "not_enabled"])
            return
        }

        let params = call.getObject("params") ?? [:]
        AppEvents.shared.logEvent(AppEvents.Name(eventName), parameters: toAppEventParameters(params))
        call.resolve(["sent": true])
    }

    private func toAppEventParameters(_ params: JSObject) -> [AppEvents.ParameterName: Any] {
        var eventParams: [AppEvents.ParameterName: Any] = [:]
        for (key, value) in params {
            if let stringValue = value as? String {
                eventParams[AppEvents.ParameterName(key)] = stringValue
            } else if let numberValue = value as? NSNumber {
                eventParams[AppEvents.ParameterName(key)] = numberValue
            } else if let boolValue = value as? Bool {
                eventParams[AppEvents.ParameterName(key)] = String(boolValue)
            } else if let arrayValue = value as? [Any] {
                eventParams[AppEvents.ParameterName(key)] = arrayValue.map { String(describing: $0) }.joined(separator: ",")
            }
        }
        return eventParams
    }

    private func isDebugBuild() -> Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }
}
