import Capacitor

@objc(GeobookerViewController)
class GeobookerViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MetaAppEventsPlugin())
    }
}
