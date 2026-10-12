import Foundation
import UIKit
import UniformTypeIdentifiers
import React

// RN-side contract (see src/services/nativeModules.ts `NativePicker`):
//   pickMedia(options) -> { uri, name, type, size, base64 } | null
//   takePhoto(options) -> { uri, name, type, size, base64 } | null
//   uploadAttachment(url, filePath, fileName, mimeType, token) -> { id, name, r2Key, mime, bytes }
//
// Mirrors android/app/src/main/java/com/pukuai/PickerModule.kt, including the
// same max-2048px / 85%-quality JPEG re-encode for picked/captured images.
@objc(PukuPicker)
class PickerModule: NSObject {

  private static let maxImageDimension: CGFloat = 2048
  private static let jpegQuality: CGFloat = 0.85

  private var pendingResolve: RCTPromiseResolveBlock?
  private var documentPickerDelegate: DocumentPickerDelegate?
  private var imagePickerDelegate: ImagePickerDelegate?

  @objc
  static func requiresMainQueueSetup() -> Bool { return true }

  // MARK: - Pick any file / photo

  @objc(pickMedia:resolver:rejecter:)
  func pickMedia(_ options: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let presenter = PickerModule.topViewController() else {
        reject("NO_ACTIVITY", "No root view controller to present from", nil)
        return
      }

      self.clearPending()
      self.pendingResolve = resolve

      let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.item], asCopy: true)
      picker.allowsMultipleSelection = false

      let delegate = DocumentPickerDelegate { [weak self] urls in
        self?.handlePickedDocument(urls: urls)
      }
      self.documentPickerDelegate = delegate
      picker.delegate = delegate

      presenter.present(picker, animated: true, completion: nil)
    }
  }

  private func handlePickedDocument(urls: [URL]) {
    guard let resolve = pendingResolve else { return }
    defer { clearPending() }

    guard let url = urls.first else {
      resolve(nil)
      return
    }

    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let originalData = try Data(contentsOf: url)
        let originalName = url.lastPathComponent
        let originalMime = PickerModule.mimeType(for: url)

        let (data, mime) = PickerModule.compressImageIfNeeded(originalData, mimeType: originalMime)
        var name = originalName
        if mime != originalMime, mime == "image/jpeg" {
          name = (name as NSString).deletingPathExtension + ".jpg"
        }

        let cacheURL = try PickerModule.writeToCache(data: data, suggestedName: name)

        let result: [String: Any] = [
          "uri": cacheURL.absoluteString,
          "name": name,
          "type": mime,
          "size": Double(data.count),
          "base64": data.base64EncodedString(),
        ]
        DispatchQueue.main.async { resolve(result) }
      } catch {
        DispatchQueue.main.async { resolve(nil) }
      }
    }
  }

  // MARK: - Camera capture

  @objc(takePhoto:resolver:rejecter:)
  func takePhoto(_ options: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
        reject("CAMERA_UNAVAILABLE", "Camera is not available on this device", nil)
        return
      }
      guard let presenter = PickerModule.topViewController() else {
        reject("NO_ACTIVITY", "No root view controller to present from", nil)
        return
      }

      self.clearPending()
      self.pendingResolve = resolve

      let picker = UIImagePickerController()
      picker.sourceType = .camera

      let delegate = ImagePickerDelegate { [weak self] image in
        self?.handleCapturedImage(image: image)
      }
      self.imagePickerDelegate = delegate
      picker.delegate = delegate

      presenter.present(picker, animated: true, completion: nil)
    }
  }

  private func handleCapturedImage(image: UIImage?) {
    guard let resolve = pendingResolve else { return }
    defer { clearPending() }

    guard let image = image, let originalData = image.jpegData(compressionQuality: 1.0) else {
      resolve(nil)
      return
    }

    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let (data, mime) = PickerModule.compressImageIfNeeded(originalData, mimeType: "image/jpeg")
        let name = "camera_\(Int(Date().timeIntervalSince1970 * 1000)).jpg"
        let cacheURL = try PickerModule.writeToCache(data: data, suggestedName: name)

        let result: [String: Any] = [
          "uri": cacheURL.absoluteString,
          "name": name,
          "type": mime,
          "size": Double(data.count),
          "base64": data.base64EncodedString(),
        ]
        DispatchQueue.main.async { resolve(result) }
      } catch {
        DispatchQueue.main.async { resolve(nil) }
      }
    }
  }

  // MARK: - Upload

  @objc(uploadAttachment:filePath:fileName:mimeType:token:resolver:rejecter:)
  func uploadAttachment(
    _ url: String,
    filePath: String,
    fileName: String,
    mimeType: String,
    token: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let cleanPath = filePath.hasPrefix("file://") ? (URL(string: filePath)?.path ?? filePath) : filePath
        guard FileManager.default.fileExists(atPath: cleanPath) else {
          reject("FILE_NOT_FOUND", "File not found at \(cleanPath)", nil)
          return
        }
        let fileData = try Data(contentsOf: URL(fileURLWithPath: cleanPath))

        guard let targetURL = URL(string: url) else {
          reject("UPLOAD_ERROR", "Invalid URL: \(url)", nil)
          return
        }

        let boundary = "===\(Int(Date().timeIntervalSince1970 * 1000))==="
        var request = URLRequest(url: targetURL)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token = token, !token.isEmpty {
          request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let effectiveMime = mimeType.isEmpty ? "application/octet-stream" : mimeType
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(effectiveMime)\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let semaphore = DispatchSemaphore(value: 0)
        var responseData: Data?
        var responseError: Error?
        var statusCode = 0

        URLSession.shared.dataTask(with: request) { data, response, error in
          responseData = data
          responseError = error
          statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
          semaphore.signal()
        }.resume()
        semaphore.wait()

        if let responseError = responseError {
          reject("UPLOAD_ERROR", responseError.localizedDescription, responseError)
          return
        }

        guard let responseData = responseData else {
          reject("UPLOAD_ERROR", "Empty response", nil)
          return
        }

        let responseText = String(data: responseData, encoding: .utf8) ?? ""
        guard (200...299).contains(statusCode) else {
          reject("UPLOAD_FAILED", "Server error (\(statusCode)): \(responseText)", nil)
          return
        }

        let json = (try? JSONSerialization.jsonObject(with: responseData)) as? [String: Any] ?? [:]
        let attachment = (json["attachment"] as? [String: Any]) ?? json

        let result: [String: Any] = [
          "id": attachment["id"] as? String ?? "",
          "name": attachment["name"] as? String ?? fileName,
          "r2Key": attachment["r2Key"] as? String ?? "",
          "mime": attachment["mime"] as? String ?? effectiveMime,
          "bytes": attachment["bytes"] as? Int ?? fileData.count,
        ]
        resolve(result)
      } catch {
        reject("UPLOAD_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Helpers

  private func clearPending() {
    pendingResolve = nil
    documentPickerDelegate = nil
    imagePickerDelegate = nil
  }

  private static func topViewController() -> UIViewController? {
    let keyWindow = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }
    guard var top = keyWindow?.rootViewController else { return nil }
    while let presented = top.presentedViewController {
      top = presented
    }
    return top
  }

  private static func mimeType(for url: URL) -> String {
    if let type = UTType(filenameExtension: url.pathExtension), let mime = type.preferredMIMEType {
      return mime
    }
    return "application/octet-stream"
  }

  private static func writeToCache(data: Data, suggestedName: String) throws -> URL {
    let cleanName = suggestedName.replacingOccurrences(of: "[^a-zA-Z0-9._-]", with: "_", options: .regularExpression)
    let cacheDir = FileManager.default.temporaryDirectory
    let cacheURL = cacheDir.appendingPathComponent("picked_\(Int(Date().timeIntervalSince1970 * 1000))_\(cleanName)")
    try data.write(to: cacheURL, options: .atomic)
    return cacheURL
  }

  /// Downscales and re-encodes image data as JPEG if it exceeds
  /// `maxImageDimension` on either edge, matching the Android/Flutter
  /// attachment pipeline (max 2048px, 85% quality). Returns the input
  /// unchanged if it isn't an image or is already within bounds.
  private static func compressImageIfNeeded(_ data: Data, mimeType: String) -> (Data, String) {
    guard mimeType.hasPrefix("image/"), let image = UIImage(data: data) else {
      return (data, mimeType)
    }

    let longestEdge = max(image.size.width, image.size.height)
    guard longestEdge > maxImageDimension else {
      return (data, mimeType)
    }

    let scale = maxImageDimension / longestEdge
    let targetSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)

    let renderer = UIGraphicsImageRenderer(size: targetSize)
    let resized = renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: targetSize))
    }

    guard let jpegData = resized.jpegData(compressionQuality: jpegQuality) else {
      return (data, mimeType)
    }
    return (jpegData, "image/jpeg")
  }
}

private class DocumentPickerDelegate: NSObject, UIDocumentPickerDelegate {
  private let onPick: ([URL]) -> Void

  init(onPick: @escaping ([URL]) -> Void) {
    self.onPick = onPick
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    onPick(urls)
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    onPick([])
  }
}

private class ImagePickerDelegate: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
  private let onCapture: (UIImage?) -> Void

  init(onCapture: @escaping (UIImage?) -> Void) {
    self.onCapture = onCapture
  }

  func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
    picker.dismiss(animated: true) {
      self.onCapture(info[.originalImage] as? UIImage)
    }
  }

  func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
    picker.dismiss(animated: true) {
      self.onCapture(nil)
    }
  }
}
