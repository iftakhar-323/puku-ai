import Foundation
import UIKit
import React

// Mirrors android/app/src/main/java/com/pukuai/ClipboardModule.kt.
@objc(PukuClipboard)
class ClipboardModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { return false }

  @objc(setString:resolver:rejecter:)
  func setString(_ text: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    UIPasteboard.general.string = text
    resolve(true)
  }

  @objc(getString:rejecter:)
  func getString(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(UIPasteboard.general.string ?? "")
  }
}
