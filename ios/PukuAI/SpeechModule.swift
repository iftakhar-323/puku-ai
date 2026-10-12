import Foundation
import Speech
import AVFoundation
import React

// Mirrors android/app/src/main/java/com/pukuai/SpeechModule.kt. Emits
// onSpeechStart/onSpeechEnd/onSpeechRms/onSpeechResults/
// onSpeechPartialResults/onSpeechError, matching
// src/services/nativeModules.ts's `NativeSpeech`.
@objc(PukuSpeech)
class SpeechModule: RCTEventEmitter {

  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private let audioEngine = AVAudioEngine()
  private var hasListeners = false

  override static func requiresMainQueueSetup() -> Bool { return true }

  override func supportedEvents() -> [String]! {
    return ["onSpeechStart", "onSpeechEnd", "onSpeechRms", "onSpeechResults", "onSpeechPartialResults", "onSpeechError"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  private func emit(_ name: String, body: Any?) {
    if hasListeners { sendEvent(withName: name, body: body) }
  }

  @objc(isAvailable:rejecter:)
  func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(SFSpeechRecognizer() != nil)
  }

  @objc(startListening:resolver:rejecter:)
  func startListening(_ language: String?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      SFSpeechRecognizer.requestAuthorization { [weak self] authStatus in
        DispatchQueue.main.async {
          guard authStatus == .authorized else {
            resolve(false)
            return
          }
          self?.beginRecognition(language: language, resolve: resolve)
        }
      }
    }
  }

  private func beginRecognition(language: String?, resolve: @escaping RCTPromiseResolveBlock) {
    stopInternal()

    let locale = language.flatMap { Locale(identifier: $0) } ?? Locale.current
    guard let recognizer = SFSpeechRecognizer(locale: locale) ?? SFSpeechRecognizer(),
          recognizer.isAvailable else {
      resolve(false)
      return
    }

    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
      try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
    } catch {
      resolve(false)
      return
    }

    let request = SFSpeechAudioBufferRecognitionRequest()
    request.shouldReportPartialResults = true
    recognitionRequest = request

    let inputNode = audioEngine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)
    inputNode.removeTap(onBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
      self?.recognitionRequest?.append(buffer)
      self?.emit("onSpeechRms", body: SpeechModule.rmsLevel(buffer: buffer))
    }

    audioEngine.prepare()
    do {
      try audioEngine.start()
    } catch {
      resolve(false)
      return
    }

    emit("onSpeechStart", body: nil)

    recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
      guard let self = self else { return }
      if let result = result {
        let text = result.bestTranscription.formattedString
        if result.isFinal {
          self.emit("onSpeechResults", body: ["text": text])
          self.stopInternal()
          self.emit("onSpeechEnd", body: nil)
        } else {
          self.emit("onSpeechPartialResults", body: ["text": text])
        }
      }
      if let error = error {
        self.emit("onSpeechError", body: ["code": (error as NSError).code, "message": error.localizedDescription])
        self.stopInternal()
        self.emit("onSpeechEnd", body: nil)
      }
    }

    resolve(true)
  }

  @objc(stopListening:rejecter:)
  func stopListening(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.recognitionRequest?.endAudio()
      resolve(true)
    }
  }

  @objc(cancelListening:rejecter:)
  func cancelListening(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.recognitionTask?.cancel()
      self.stopInternal()
      resolve(true)
    }
  }

  private func stopInternal() {
    if audioEngine.isRunning {
      audioEngine.stop()
      audioEngine.inputNode.removeTap(onBus: 0)
    }
    recognitionRequest = nil
    recognitionTask = nil
  }

  private static func rmsLevel(buffer: AVAudioPCMBuffer) -> Double {
    guard let channelData = buffer.floatChannelData?[0] else { return 0 }
    let frameLength = Int(buffer.frameLength)
    guard frameLength > 0 else { return 0 }
    var sum: Float = 0
    for i in 0..<frameLength {
      let sample = channelData[i]
      sum += sample * sample
    }
    return Double(sqrt(sum / Float(frameLength)))
  }
}
