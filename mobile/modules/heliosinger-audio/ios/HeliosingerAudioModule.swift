import ExpoModulesCore
import AVFoundation
import AudioToolbox

public final class HeliosingerAudioModule: Module {
  private var engine: AVAudioEngine?
  private var sourceNode: AVAudioSourceNode?
  private var isRunning = false

  private var baseFrequency: Double = 110.0
  private var beatFrequency: Double = 4.0
  private var harmonicMix: Double = 0.3
  private var volume: Double = 0.2

  private var phaseLeft: Double = 0
  private var phaseRight: Double = 0

  private let renderQueue = DispatchQueue(label: "heliosinger.audio.render")

  public func definition() -> ModuleDefinition {
    Name("HeliosingerAudio")

    AsyncFunction("start") { (params: [String: Any]) in
      try self.configureSession(allowBackground: true)
      self.applyParams(params)
      try self.startEngineIfNeeded()
    }

    AsyncFunction("update") { (params: [String: Any]) in
      self.renderQueue.sync {
        self.applyParams(params)
      }
    }

    AsyncFunction("setVolume") { (value: Double) in
      self.renderQueue.sync {
        self.volume = max(0.0, min(1.0, value))
      }
    }

    AsyncFunction("setBackgroundMode") { (enabled: Bool) in
      try self.configureSession(allowBackground: enabled)
    }

    AsyncFunction("pause") {
      self.engine?.pause()
      self.isRunning = false
    }

    AsyncFunction("resume") {
      guard let engine = self.engine else {
        try self.startEngineIfNeeded()
        return
      }

      if !engine.isRunning {
        try engine.start()
      }
      self.isRunning = true
    }

    AsyncFunction("stop") {
      self.engine?.stop()
      self.sourceNode = nil
      self.engine = nil
      self.isRunning = false
      self.phaseLeft = 0
      self.phaseRight = 0
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
    let category: AVAudioSession.Category = .playback
    let options: AVAudioSession.CategoryOptions = [.mixWithOthers]

    try session.setCategory(category, mode: .default, options: options)
    try session.setActive(true)

    if !allowBackground {
      try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
    }
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
}
