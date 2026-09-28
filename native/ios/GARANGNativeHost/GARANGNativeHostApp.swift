import SwiftUI

@main
struct GARANGNativeHostApp: App {
    private let healthBridge = GARANGHealthBridge()

    var body: some Scene {
        WindowGroup {
            GARANGWebView(healthBridge: healthBridge)
                .ignoresSafeArea()
        }
    }
}
