import AppTrackingTransparency
import Capacitor
import CryptoKit
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
    private let expectedBundleId = "com.geobooker.ios"
    private var configured = false
    private var enabled = false
    private var activated = false
    private var authorized: Bool {
        ATTrackingManager.trackingAuthorizationStatus == .authorized
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve([
            "available": true, "platform": "ios", "appId": expectedAppId,
            "bundleId": Bundle.main.bundleIdentifier ?? "",
            "sdkVersion": Settings.shared.sdkVersion, "debugBuild": isDebugBuild(),
            "configured": configured, "enabled": enabled && authorized,
            "attAuthorized": authorized
        ])
    }

    @objc func configure(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let appId = call.getString("appId") ?? ""
            let plistAppId = Bundle.main.object(forInfoDictionaryKey: "FacebookAppID") as? String
            let token = (Bundle.main.object(forInfoDictionaryKey: "FacebookClientToken") as? String ?? "")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            guard self.authorized, !self.isDebugBuild() else {
                call.resolve(["configured": false, "reason": "att_not_authorized_or_debug"])
                return
            }
            guard appId == self.expectedAppId, plistAppId == appId,
                  Bundle.main.bundleIdentifier == self.expectedBundleId,
                  !token.isEmpty, !token.hasPrefix("$(") else {
                call.resolve(["configured": false, "reason": "invalid_meta_configuration"])
                return
            }
            self.checkPrivacySettings(token: token) { reason in
              DispatchQueue.main.async {
                guard self.authorized, reason == nil else {
                    self.enabled = false
                    call.resolve(["configured": false, "reason": reason ?? "att_not_authorized"])
                    return
                }
                if !self.configured {
                // Plist flags apply before initialization. No IDFA or automatic matching.
                ApplicationDelegate.shared.initializeSDK()
                Settings.shared.isAutoLogAppEventsEnabled = false
                Settings.shared.isAdvertiserIDCollectionEnabled = false
                Settings.shared.isMetaDataCollectionEnabled = false
                Settings.shared.isAutoLogProductImprovementEnabled = false
                Settings.shared.isCodelessDebugLogEnabled = false
                Settings.shared.isEventDataUsageLimited = true
                if #unavailable(iOS 17.0) {
                    Settings.shared.isAdvertiserTrackingEnabled = true
                }
                AppEvents.shared.clearUserData()
                AppEvents.shared.flushBehavior = .explicitOnly
                self.configured = true
                }
                call.resolve(["configured": true, "sdkVersion": Settings.shared.sdkVersion])
              }
            }
        }
    }

    // Advanced matching has no supported local SDK switch. Verify the public SDK
    // configuration before initialization rather than relying on clearUserData().
    private func checkPrivacySettings(token: String, completion: @escaping (String?) -> Void) {
        let url = URL(string: "https://graph.facebook.com/v26.0/\(expectedAppId)?fields=aam_rules,auto_event_setup_enabled,app_events_feature_bitmask")!
        var request = URLRequest(url: url, timeoutInterval: 10)
        request.setValue("Bearer \(expectedAppId)|\(token)", forHTTPHeaderField: "Authorization")
        URLSession.shared.dataTask(with: request) { data, response, _ in
            guard let http = response as? HTTPURLResponse, http.statusCode == 200,
                  let data = data,
                  let config = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
                  let automaticSetup = config["auto_event_setup_enabled"] as? Bool,
                  let features = config["app_events_feature_bitmask"] as? NSNumber else {
                completion("meta_privacy_settings_unavailable")
                return
            }
            let rules: [String: Any]?
            if let text = config["aam_rules"] as? String {
                rules = text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? [:]
                    : (try? JSONSerialization.jsonObject(with: Data(text.utf8))) as? [String: Any]
            } else {
                rules = config["aam_rules"] as? [String: Any]
            }
            guard let rules = rules else {
                completion("meta_privacy_settings_unavailable")
                return
            }
            // Bit 5 is the codeless trigger flag in the pinned SDK's server configuration.
            let codeless = features.intValue & (1 << 5) != 0
            completion(rules.isEmpty && !automaticSetup && !codeless ? nil : "automatic_matching_or_setup_enabled_in_meta")
        }.resume()
    }

    @objc func enable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.configured, self.authorized, !self.isDebugBuild() else {
                self.enabled = false
                call.resolve(["enabled": false, "reason": "not_configured_or_authorized"])
                return
            }
            self.enabled = true
            if !self.activated {
                AppEvents.shared.activateApp()
                AppEvents.shared.flush()
                self.activated = true
            }
            call.resolve(["enabled": true])
        }
    }

    @objc func disable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.enabled = false
            // Never initialize the SDK just to disable it.
            if self.configured {
                Settings.shared.isAdvertiserIDCollectionEnabled = false
                if #unavailable(iOS 17.0) {
                    Settings.shared.isAdvertiserTrackingEnabled = false
                }
                AppEvents.shared.flushBehavior = .explicitOnly
            }
            call.resolve(["enabled": false])
        }
    }

    @objc func logEvent(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.enabled, self.authorized, !self.isDebugBuild() else {
                call.resolve(["queued": false, "reason": "not_authorized"])
                return
            }
            let name = call.getString("name") ?? ""
            let key = call.getString("dedupeKey") ?? ""
            let prefix: String
            var parameters: [AppEvents.ParameterName: Any] = [:]
            switch name {
            case "fb_mobile_complete_registration":
                prefix = "registration:"
                let method = call.getObject("params")?["fb_registration_method"] as? String ?? ""
                guard ["email", "google", "apple", "oauth"].contains(method) else {
                    call.resolve(["queued": false, "reason": "invalid_method"])
                    return
                }
                parameters[AppEvents.ParameterName("fb_registration_method")] = method
            case "first_business_published":
                prefix = "first_business:"
            default:
                call.resolve(["queued": false, "reason": "event_not_allowed"])
                return
            }
            guard key.hasPrefix(prefix), UUID(uuidString: String(key.dropFirst(prefix.count))) != nil else {
                call.resolve(["queued": false, "reason": "invalid_dedupe_key"])
                return
            }
            // The account key stays local, never an SDK parameter or Meta user ID.
            let digest = SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
            let marker = "geobooker.meta.conversion.v1.\(digest)"
            guard !UserDefaults.standard.bool(forKey: marker) else {
                call.resolve(["queued": false, "duplicate": true])
                return
            }
            AppEvents.shared.logEvent(AppEvents.Name(name), parameters: parameters)
            UserDefaults.standard.set(true, forKey: marker)
            AppEvents.shared.flush()
            // SDK enqueue/flush does not prove reception by Meta.
            call.resolve(["queued": true])
        }
    }

    private func isDebugBuild() -> Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }
}
