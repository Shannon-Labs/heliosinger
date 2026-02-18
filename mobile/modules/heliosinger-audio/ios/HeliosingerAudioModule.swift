import ExpoModulesCore
import AVFoundation
import AudioToolbox
import MediaPlayer

public final class HeliosingerAudioModule: Module {
  private var engine: AVAudioEngine?
  private var sourceNode: AVAudioSourceNode?
  private var isRunning = false
  private var allowBackground = true
  private var wasRunningBeforeInterruption = false

  private var baseFrequency: Double = 110.0
  private var beatFrequency: Double = 4.0
  private var harmonicMix: Double = 0.3
  private var volume: Double = 0.2

  private var phaseLeft: Double = 0
  private var phaseRight: Double = 0

  private var sessionObserversInstalled = false
  private var remoteCommandsInstalled = false
  private var playCommandTarget: Any?
  private var pauseCommandTarget: Any?
  private var stopCommandTarget: Any?

  private let renderQueue = DispatchQueue(label: "heliosinger.audio.render")

  deinit {
    removeAudioSessionObservers()
    removeRemoteCommands()
  }

  public func definition() -> ModuleDefinition {
    Name("HeliosingerAudio")

    AsyncFunction("start") { (params: [String: Any]) in
      self.renderQueue.sync {
        self.applyParams(params)
      }
      try self.configureSession(allowBackground: self.allowBackground)
      self.installAudioSessionObservers()
      self.installRemoteCommands()
      try self.startEngineIfNeeded()
      self.updateNowPlayingMetadata(isPlaying: true)
    }

    AsyncFunction("update") { (params: [String: Any]) in
      self.renderQueue.sync {
        self.applyParams(params)
      }
      if self.isRunning {
        self.updateNowPlayingMetadata(isPlaying: true)
      }
    }

    AsyncFunction("setVolume") { (value: Double) in
      self.renderQueue.sync {
        self.volume = max(0.0, min(1.0, value))
      }
      if self.isRunning {
        self.updateNowPlayingMetadata(isPlaying: true)
      }
    }

    AsyncFunction("setBackgroundMode") { (enabled: Bool) in
      self.allowBackground = enabled
      try self.configureSession(allowBackground: enabled)
      self.updateNowPlayingMetadata(isPlaying: self.isRunning)
    }

    AsyncFunction("pause") {
      self.pauseEngine()
    }

    AsyncFunction("resume") {
      try self.resumeEngine()
    }

    AsyncFunction("stop") {
      self.stopEngine()
    }
  }

  private func applyParams(_ params: [String: Any]) {
    if let value = params["baseFrequency"] as? Double {
      baseFrequency = max(40.0, min(400.0, value))
    }

    if let value = params["binauralBeatHz"] as? Double {
      beatFrequency = max(0.5, min(18.0, value))
    }

    if let value = params["harmonicMix"] as? Double {
      harmonicMix = max(0.0, min(1.0, value))
    }

    if let value = params["volume"] as? Double {
      volume = max(0.0, min(1.0, value))
    }
  }

  private func configureSession(allowBackground: Bool) throws {
    let session = AVAudioSession.sharedInstance()
    let category: AVAudioSession.Category = allowBackground ? .playback : .ambient
    var options: AVAudioSession.CategoryOptions = [.mixWithOthers]

    if allowBackground {
      options.insert(.allowAirPlay)
      options.insert(.allowBluetoothA2DP)
    }

    try session.setCategory(category, mode: .default, options: options)
    try session.setActive(true)
  }

  private func startEngineIfNeeded() throws {
    if engine == nil {
      engine = AVAudioEngine()
    }

    guard let engine else { return }

    if sourceNode == nil {
      let format = engine.outputNode.outputFormat(forBus: 0)
      let sampleRate = format.sampleRate

      sourceNode = AVAudioSourceNode(format: format) { _, _, frameCount, audioBufferList -> OSStatus in
        let bufferList = UnsafeMutableAudioBufferListPointer(audioBufferList)

        self.renderQueue.sync {
          let leftFrequency = self.baseFrequency - (self.beatFrequency / 2)
          let rightFrequency = self.baseFrequency + (self.beatFrequency / 2)
          let harmonicMultiplier = 2.0

          for frame in 0..<Int(frameCount) {
            let leftSample = sin(self.phaseLeft) * (1.0 - self.harmonicMix) + sin(self.phaseLeft * harmonicMultiplier) * self.harmonicMix
            let rightSample = sin(self.phaseRight) * (1.0 - self.harmonicMix) + sin(self.phaseRight * harmonicMultiplier) * self.harmonicMix

            self.phaseLeft += 2.0 * Double.pi * leftFrequency / sampleRate
            self.phaseRight += 2.0 * Double.pi * rightFrequency / sampleRate

            if self.phaseLeft > 2.0 * Double.pi {
              self.phaseLeft -= 2.0 * Double.pi
            }

            if self.phaseRight > 2.0 * Double.pi {
              self.phaseRight -= 2.0 * Double.pi
            }

            let scaledLeft = Float(leftSample * self.volume)
            let scaledRight = Float(rightSample * self.volume)

            for buffer in bufferList {
              guard let channelData = buffer.mData?.assumingMemoryBound(to: Float.self) else { continue }
              if buffer.mNumberChannels == 1 {
                channelData[frame] = (scaledLeft + scaledRight) * 0.5
              } else {
                let channel = Int(buffer.mNumberChannels)
                if channel >= 2 {
                  channelData[frame * channel] = scaledLeft
                  channelData[frame * channel + 1] = scaledRight
                }
              }
            }
          }
        }

        return noErr
      }

      if let sourceNode {
        engine.attach(sourceNode)
        engine.connect(sourceNode, to: engine.mainMixerNode, format: format)
      }
    }

    if !engine.isRunning {
      try engine.start()
    }

    isRunning = true
  }

  private func pauseEngine() {
    engine?.pause()
    isRunning = false
    updateNowPlayingMetadata(isPlaying: false)
  }

  private func resumeEngine() throws {
    if engine == nil {
      try startEngineIfNeeded()
      updateNowPlayingMetadata(isPlaying: true)
      return
    }

    guard let engine else { return }
    if !engine.isRunning {
      try engine.start()
    }

    isRunning = true
    updateNowPlayingMetadata(isPlaying: true)
  }

  private func stopEngine() {
    engine?.stop()
    sourceNode = nil
    engine = nil
    isRunning = false
    phaseLeft = 0
    phaseRight = 0

    clearNowPlayingMetadata()

    do {
      try AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    } catch {
      // Session deactivation failures are non-fatal for shutdown.
    }
  }

  private func updateNowPlayingMetadata(isPlaying: Bool) {
    var info: [String: Any] = [
      MPMediaItemPropertyTitle: "Heliosinger Ambient",
      MPMediaItemPropertyArtist: "Heliosinger",
      MPMediaItemPropertyPlaybackDuration: 0,
      MPNowPlayingInfoPropertyElapsedPlaybackTime: 0,
      MPNowPlayingInfoPropertyPlaybackRate: isPlaying ? 1.0 : 0.0,
    ]

    let leftFrequency = max(20, baseFrequency - (beatFrequency / 2))
    let rightFrequency = max(20, baseFrequency + (beatFrequency / 2))
    info[MPMediaItemPropertyAlbumTitle] = String(format: "Binaural %.1f / %.1f Hz", leftFrequency, rightFrequency)

    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    if #available(iOS 13.0, *) {
      MPNowPlayingInfoCenter.default().playbackState = isPlaying ? .playing : .paused
    }
  }

  private func clearNowPlayingMetadata() {
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    if #available(iOS 13.0, *) {
      MPNowPlayingInfoCenter.default().playbackState = .stopped
    }
  }

  private func installRemoteCommands() {
    guard !remoteCommandsInstalled else { return }

    let center = MPRemoteCommandCenter.shared()
    center.playCommand.isEnabled = true
    center.pauseCommand.isEnabled = true
    center.stopCommand.isEnabled = true

    playCommandTarget = center.playCommand.addTarget { [weak self] _ in
      guard let self else { return .commandFailed }
      do {
        try self.resumeEngine()
        return .success
      } catch {
        return .commandFailed
      }
    }

    pauseCommandTarget = center.pauseCommand.addTarget { [weak self] _ in
      guard let self else { return .commandFailed }
      self.pauseEngine()
      return .success
    }

    stopCommandTarget = center.stopCommand.addTarget { [weak self] _ in
      guard let self else { return .commandFailed }
      self.stopEngine()
      return .success
    }

    remoteCommandsInstalled = true
  }

  private func removeRemoteCommands() {
    guard remoteCommandsInstalled else { return }

    let center = MPRemoteCommandCenter.shared()
    if let target = playCommandTarget {
      center.playCommand.removeTarget(target)
    }
    if let target = pauseCommandTarget {
      center.pauseCommand.removeTarget(target)
    }
    if let target = stopCommandTarget {
      center.stopCommand.removeTarget(target)
    }

    playCommandTarget = nil
    pauseCommandTarget = nil
    stopCommandTarget = nil
    remoteCommandsInstalled = false
  }

  private func installAudioSessionObservers() {
    guard !sessionObserversInstalled else { return }

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleAudioInterruption(_:)),
      name: AVAudioSession.interruptionNotification,
      object: nil
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleRouteChange(_:)),
      name: AVAudioSession.routeChangeNotification,
      object: nil
    )

    sessionObserversInstalled = true
  }

  private func removeAudioSessionObservers() {
    guard sessionObserversInstalled else { return }
    NotificationCenter.default.removeObserver(self)
    sessionObserversInstalled = false
  }

  @objc
  private func handleAudioInterruption(_ notification: Notification) {
    guard
      let info = notification.userInfo,
      let rawType = info[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: rawType)
    else {
      return
    }

    switch type {
    case .began:
      wasRunningBeforeInterruption = isRunning
      pauseEngine()
    case .ended:
      let optionsValue = info[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
      let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
      if wasRunningBeforeInterruption && options.contains(.shouldResume) {
        do {
          try configureSession(allowBackground: allowBackground)
          try resumeEngine()
        } catch {
          // Interruption recovery is best-effort.
        }
      }
      wasRunningBeforeInterruption = false
    @unknown default:
      break
    }
  }

  @objc
  private func handleRouteChange(_ notification: Notification) {
    guard
      let info = notification.userInfo,
      let rawReason = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
      let reason = AVAudioSession.RouteChangeReason(rawValue: rawReason)
    else {
      return
    }

    if reason == .oldDeviceUnavailable {
      if isRunning {
        do {
          try configureSession(allowBackground: allowBackground)
          try resumeEngine()
        } catch {
          // Route recovery is best-effort.
        }
      }
    }
  }
}
