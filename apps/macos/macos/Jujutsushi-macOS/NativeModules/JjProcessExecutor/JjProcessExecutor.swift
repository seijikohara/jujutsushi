//
//  JjProcessExecutor.swift
//  Foundation-only subprocess runner exposed to JS via
//  JjProcessExecutorBridge.m. Deliberately imports only Foundation --
//  RCT_EXTERN_MODULE in the bridge file supplies RCTBridgeModule
//  conformance from the Objective-C side. RCTPromiseResolveBlock /
//  RCTPromiseRejectBlock come in through the bridging header.
//

import Foundation

@objc(JjProcessExecutor)
final class JjProcessExecutor: NSObject {

  private enum ErrorCode {
    static let commandNotFound = "E_COMMAND_NOT_FOUND"
    static let launchFailed = "E_LAUNCH_FAILED"
    static let invalidArguments = "E_INVALID_ARGUMENTS"
  }

  /// Locations searched for `command` beyond the inherited `$PATH`. GUI apps
  /// launched from Finder/Dock/Xcode don't run through the user's login
  /// shell, so they never see PATH entries added by .zshrc/.zprofile -- the
  /// inherited PATH is typically just "/usr/bin:/bin:/usr/sbin:/sbin".
  private static let fallbackSearchPaths = [
    "/opt/homebrew/bin",  // Homebrew, Apple Silicon
    "/usr/local/bin",     // Homebrew, Intel; common manual installs
    "/opt/local/bin",     // MacPorts
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ]

  /// Serial queue this module's exported methods run on (see `methodQueue`
  /// below). `activeProcesses` mutation is confined to it, so no separate
  /// lock is needed.
  private let dispatchQueue = DispatchQueue(
    label: "dev.jujutsushi.JjProcessExecutor",
    qos: .userInitiated
  )

  /// Keeps in-flight `Process` instances alive for the life of the
  /// subprocess. Apple's docs do not state whether a running `Process`
  /// retains itself, and `execute(...)` returns immediately after calling
  /// `run()` -- the real work finishes later, asynchronously, from
  /// `terminationHandler`/`readabilityHandler`. Only mutated on
  /// `dispatchQueue`.
  private var activeProcesses = Set<Process>()

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false // no AppKit access here
  }

  @objc
  var methodQueue: DispatchQueue {
    dispatchQueue
  }

  @objc(execute:args:cwd:resolver:rejecter:)
  func execute(
    _ command: String,
    args: [String],
    cwd: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let executableURL = Self.resolveExecutableURL(for: command) else {
      reject(
        ErrorCode.commandNotFound,
        "Could not find \"\(command)\" on PATH or in standard install locations "
          + "(checked $PATH and \(Self.fallbackSearchPaths.joined(separator: ", "))).",
        nil
      )
      return
    }

    let process = Process()
    process.executableURL = executableURL
    process.arguments = args
    process.environment = Self.environmentWithAugmentedPath()

    if let cwd, !cwd.isEmpty {
      var isDirectory: ObjCBool = false
      guard FileManager.default.fileExists(atPath: cwd, isDirectory: &isDirectory),
            isDirectory.boolValue else {
        reject(ErrorCode.invalidArguments, "cwd does not exist or is not a directory: \(cwd)", nil)
        return
      }
      process.currentDirectoryURL = URL(fileURLWithPath: cwd, isDirectory: true)
    }

    let stdoutPipe = Pipe()
    let stderrPipe = Pipe()
    process.standardOutput = stdoutPipe
    process.standardError = stderrPipe
    // Never let the child block waiting for input it will never receive
    // (e.g. a credential prompt) -- give it immediate EOF instead.
    process.standardInput = FileHandle.nullDevice

    var stdoutData = Data()
    var stderrData = Data()

    // Three independent, order-unconstrained completion signals: stdout
    // EOF, stderr EOF, process termination. A process can exit before its
    // pipes are fully drained, so all three must be observed before it's
    // safe to resolve. This avoids both the classic "one full pipe blocks
    // the child while you synchronously drain the other" deadlock and the
    // subtler "resolved with truncated output because we only waited for
    // exit" bug.
    let completionGroup = DispatchGroup()
    completionGroup.enter() // stdout EOF
    completionGroup.enter() // stderr EOF
    completionGroup.enter() // process termination

    stdoutPipe.fileHandleForReading.readabilityHandler = { handle in
      let chunk = handle.availableData
      if chunk.isEmpty {
        stdoutPipe.fileHandleForReading.readabilityHandler = nil
        completionGroup.leave()
      } else {
        stdoutData.append(chunk)
      }
    }

    stderrPipe.fileHandleForReading.readabilityHandler = { handle in
      let chunk = handle.availableData
      if chunk.isEmpty {
        stderrPipe.fileHandleForReading.readabilityHandler = nil
        completionGroup.leave()
      } else {
        stderrData.append(chunk)
      }
    }

    process.terminationHandler = { _ in
      completionGroup.leave()
    }

    do {
      try process.run()
    } catch {
      stdoutPipe.fileHandleForReading.readabilityHandler = nil
      stderrPipe.fileHandleForReading.readabilityHandler = nil
      process.terminationHandler = nil

      let nsError = error as NSError
      if nsError.domain == NSCocoaErrorDomain, nsError.code == NSFileNoSuchFileError {
        // TOCTOU: resolveExecutableURL() checked existence, but the file
        // could have been removed/unmounted between that check and run().
        reject(ErrorCode.commandNotFound, "Executable disappeared before launch: \(executableURL.path)", error)
      } else {
        reject(ErrorCode.launchFailed, "Failed to launch \(executableURL.path): \(nsError.localizedDescription)", error)
      }
      return
    }

    activeProcesses.insert(process)

    completionGroup.notify(queue: dispatchQueue) { [weak self] in
      self?.activeProcesses.remove(process)
      resolve([
        "stdout": String(decoding: stdoutData, as: UTF8.self),
        "stderr": String(decoding: stderrData, as: UTF8.self),
        "exitCode": Int(process.terminationStatus),
      ])
    }
  }

  /// `Process.executableURL` requires an absolute path -- unlike `/bin/sh`
  /// or `/usr/bin/env`, `Process` never consults `$PATH` itself. This
  /// resolves a bare command name the way a shell would: first against the
  /// inherited `$PATH`, then against `fallbackSearchPaths`.
  private static func resolveExecutableURL(for command: String) -> URL? {
    if command.hasPrefix("/") {
      return isExecutableFile(command) ? URL(fileURLWithPath: command) : nil
    }

    var searchDirectories: [String] = []
    if let inheritedPath = ProcessInfo.processInfo.environment["PATH"], !inheritedPath.isEmpty {
      searchDirectories.append(contentsOf: inheritedPath.split(separator: ":").map(String.init))
    }
    searchDirectories.append(contentsOf: fallbackSearchPaths)

    for directory in searchDirectories {
      let candidate = (directory as NSString).appendingPathComponent(command)
      if isExecutableFile(candidate) {
        return URL(fileURLWithPath: candidate)
      }
    }
    return nil
  }

  private static func isExecutableFile(_ path: String) -> Bool {
    var isDirectory: ObjCBool = false
    guard FileManager.default.fileExists(atPath: path, isDirectory: &isDirectory), !isDirectory.boolValue else {
      return false
    }
    return FileManager.default.isExecutableFile(atPath: path)
  }

  /// The environment `Process` inherits by default (a copy of this app's
  /// own environment) has the same truncated-PATH problem described above.
  /// If `jj` itself shells out to something else (e.g. `git`, for
  /// colocated repos), that lookup needs the same fallback locations.
  private static func environmentWithAugmentedPath() -> [String: String] {
    var environment = ProcessInfo.processInfo.environment
    let existingPath = environment["PATH"] ?? ""
    let existingComponents = Set(existingPath.split(separator: ":").map(String.init))
    let additions = fallbackSearchPaths.filter { !existingComponents.contains($0) }
    let combined = existingPath.isEmpty ? additions : [existingPath] + additions
    environment["PATH"] = combined.joined(separator: ":")
    return environment
  }
}
