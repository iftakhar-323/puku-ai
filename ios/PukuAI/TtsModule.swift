import Foundation
import AVFoundation
import React

// Mirrors android/app/src/main/java/com/pukuai/TtsModule.kt. Emits
// onTtsStart/onTtsDone/onTtsError, matching src/services/nativeModules.ts's
// `NativeTts`.
@objc(PukuTts)
class TtsModule: RCTEventEmitter {

  private let synthesizer = AVSpeechSynthesizer()
  private var hasListeners = false

  override init() {
    super.init()
    synthesizer.delegate = self
  }

  override static func requiresMainQueueSetup() -> Bool { return true }

  override func supportedEvents() -> [String]! {
    return ["onTtsStart", "onTtsDone", "onTtsError"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  private func emit(_ name: String) {
    if hasListeners { sendEvent(withName: name, body: nil) }
  }

  @objc(isAvailable:rejecter:)
  func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(true)
  }

  @objc(speak:resolver:rejecter:)
  func speak(_ text: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      do {
        try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try AVAudioSession.sharedInstance().setActive(true)
      } catch {
        // Non-fatal: speech may still work with whatever category is already active.
      }
      let utterance = AVSpeechUtterance(string: text)
      if let voice = AVSpeechSynthesisVoice(language: AVSpeechSynthesisVoice.currentLanguageCode()) {
        utterance.voice = voice
      }
      self.synthesizer.speak(utterance)
      resolve(true)
    }
  }

  @objc(stop:rejecter:)
  func stop(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.synthesizer.stopSpeaking(at: .immediate)
      resolve(true)
    }
  }
}

extension TtsModule: AVSpeechSynthesizerDelegate {
  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
    emit("onTtsStart")
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
    emit("onTtsDone")
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
    emit("onTtsDone")
  }
}
