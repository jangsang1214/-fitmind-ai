import SwiftUI
import WebKit

struct GARANGWebView: UIViewRepresentable {
    let healthBridge: GARANGHealthBridge

    func makeCoordinator() -> Coordinator { Coordinator(healthBridge: healthBridge) }

    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: GARANGHealthBridge.messageHandlerName)
        controller.addUserScript(WKUserScript(
            source: GARANGHealthBridge.bridgeJavaScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        healthBridge.attach(webView)

        let configured = Bundle.main.object(forInfoDictionaryKey: "GARANGWebURL") as? String
        let raw = configured?.isEmpty == false ? configured! : "https://jangsang1214.github.io/-fitmind-ai/"
        if let url = URL(string: raw) { webView.load(URLRequest(url: url)) }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: GARANGHealthBridge.messageHandlerName)
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        private let healthBridge: GARANGHealthBridge
        init(healthBridge: GARANGHealthBridge) { self.healthBridge = healthBridge }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            healthBridge.handle(message: message)
        }
    }
}
