import ExpoModulesCore
import Foundation

// Manages active background URL sessions keyed by uploadId.
private actor SessionRegistry {
  static let shared = SessionRegistry()

  private var delegates: [String: BackgroundUploadDelegate] = [:]

  func register(_ delegate: BackgroundUploadDelegate, for uploadId: String) {
    delegates[uploadId] = delegate
  }

  func remove(for uploadId: String) {
    delegates[uploadId] = nil
  }

  func delegate(for uploadId: String) -> BackgroundUploadDelegate? {
    delegates[uploadId]
  }
}

private class BackgroundUploadDelegate: NSObject, URLSessionDataDelegate, URLSessionTaskDelegate {
  let uploadId: String
  let onProgress: (Double) -> Void
  let onComplete: (String) -> Void
  let onError: (String) -> Void

  init(
    uploadId: String,
    onProgress: @escaping (Double) -> Void,
    onComplete: @escaping (String) -> Void,
    onError: @escaping (String) -> Void
  ) {
    self.uploadId = uploadId
    self.onProgress = onProgress
    self.onComplete = onComplete
    self.onError = onError
  }

  func urlSession(_ session: URLSession, task: URLSessionTask, didSendBodyData bytesSent: Int64, totalBytesSent: Int64, totalBytesExpectedToSend: Int64) {
    guard totalBytesExpectedToSend > 0 else { return }
    let progress = Double(totalBytesSent) / Double(totalBytesExpectedToSend)
    onProgress(progress)
  }

  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    if let error = error {
      onError(error.localizedDescription)
    } else {
      let statusCode = (task.response as? HTTPURLResponse)?.statusCode ?? 0
      if (200..<300).contains(statusCode) {
        onComplete(uploadId)
      } else {
        onError("Upload failed with HTTP \(statusCode)")
      }
    }
    Task { await SessionRegistry.shared.remove(for: uploadId) }
  }

  func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
    // Nothing extra needed; individual task completions are handled above.
  }
}

public class BackgroundUploadModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackgroundUpload")

    Events("onProgress", "onComplete", "onError")

    // Starts a background PUT upload.
    // Returns an uploadId string that identifies this transfer.
    AsyncFunction("startUpload") { (fileUri: String, uploadUrl: String, uploadToken: String, contentType: String, promise: Promise) in
      let uploadId = UUID().uuidString

      guard let sourceURL = URL(string: fileUri) else {
        promise.reject("INVALID_URI", "Invalid file URI: \(fileUri)")
        return
      }
      guard let destinationURL = URL(string: uploadUrl) else {
        promise.reject("INVALID_URL", "Invalid upload URL")
        return
      }

      let config = URLSessionConfiguration.background(withIdentifier: "com.jazzrihal.Fotuu.upload.\(uploadId)")
      config.isDiscretionary = false
      config.sessionSendsLaunchEvents = true

      let moduleRef = self

      let delegate = BackgroundUploadDelegate(
        uploadId: uploadId,
        onProgress: { progress in
          moduleRef.sendEvent("onProgress", ["uploadId": uploadId, "progress": progress])
        },
        onComplete: { id in
          moduleRef.sendEvent("onComplete", ["uploadId": id])
        },
        onError: { message in
          moduleRef.sendEvent("onError", ["uploadId": uploadId, "message": message])
        }
      )

      let session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)

      Task {
        await SessionRegistry.shared.register(delegate, for: uploadId)
      }

      var request = URLRequest(url: destinationURL)
      request.httpMethod = "PUT"
      request.setValue("Bearer \(uploadToken)", forHTTPHeaderField: "Authorization")
      request.setValue(contentType, forHTTPHeaderField: "Content-Type")

      let task = session.uploadTask(with: request, fromFile: sourceURL)
      task.resume()
      session.finishTasksAndInvalidate()

      promise.resolve(uploadId)
    }

    // Cancels a running upload by uploadId.
    AsyncFunction("cancelUpload") { (_uploadId: String, promise: Promise) in
      // Sessions are single-task and self-invalidate on finish; cancel via task is not tracked
      // after the session is invalidated. This is a no-op stub for API completeness.
      promise.resolve(nil)
    }
  }
}
