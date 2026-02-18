package expo.modules.heliosingeraudio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.concurrent.thread
import kotlin.math.PI
import kotlin.math.sin

class HeliosingerAudioModule : Module() {
  private var audioTrack: AudioTrack? = null
  private var renderThread: Thread? = null
  @Volatile private var running = false

  @Volatile private var baseFrequency = 110.0
  @Volatile private var beatFrequency = 4.0
  @Volatile private var harmonicMix = 0.3
  @Volatile private var volume = 0.2

  override fun definition() = ModuleDefinition {
    Name("HeliosingerAudio")

    AsyncFunction("start") { params: Map<String, Any?> ->
      applyParams(params)
      startTrack()
    }

    AsyncFunction("update") { params: Map<String, Any?> ->
      applyParams(params)
    }

    AsyncFunction("setVolume") { value: Double ->
      volume = value.coerceIn(0.0, 1.0)
    }

    AsyncFunction("setBackgroundMode") { _: Boolean ->
      // Android foreground-service policy is handled at app layer.
    }

    AsyncFunction("pause") {
      running = false
      audioTrack?.pause()
    }

    AsyncFunction("resume") {
      if (audioTrack == null) {
        startTrack()
      } else {
        running = true
        audioTrack?.play()
      }
    }

    AsyncFunction("stop") {
      stopTrack()
    }
  }

  private fun applyParams(params: Map<String, Any?>) {
    (params["baseFrequency"] as? Number)?.toDouble()?.let {
      baseFrequency = it.coerceIn(40.0, 400.0)
    }

    (params["binauralBeatHz"] as? Number)?.toDouble()?.let {
      beatFrequency = it.coerceIn(0.5, 18.0)
    }

    (params["harmonicMix"] as? Number)?.toDouble()?.let {
      harmonicMix = it.coerceIn(0.0, 1.0)
    }

    (params["volume"] as? Number)?.toDouble()?.let {
      volume = it.coerceIn(0.0, 1.0)
    }
  }

  private fun startTrack() {
    if (running) return

    val sampleRate = 44100
    val minBuffer = AudioTrack.getMinBufferSize(
      sampleRate,
      AudioFormat.CHANNEL_OUT_STEREO,
      AudioFormat.ENCODING_PCM_16BIT
    )

    audioTrack = AudioTrack(
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
        .build(),
      AudioFormat.Builder()
        .setSampleRate(sampleRate)
        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
        .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
        .build(),
      minBuffer,
      AudioTrack.MODE_STREAM,
      AudioManager.AUDIO_SESSION_ID_GENERATE
    )

    running = true
    audioTrack?.play()

    renderThread = thread(start = true, isDaemon = true, name = "heliosinger-audio") {
      var leftPhase = 0.0
      var rightPhase = 0.0
      val frames = 1024
      val pcm = ShortArray(frames * 2)

      while (running) {
        val leftFrequency = baseFrequency - beatFrequency / 2.0
        val rightFrequency = baseFrequency + beatFrequency / 2.0

        for (i in 0 until frames) {
          val baseLeft = sin(leftPhase)
          val baseRight = sin(rightPhase)
          val harmonicLeft = sin(leftPhase * 2.0)
          val harmonicRight = sin(rightPhase * 2.0)

          val left = (baseLeft * (1.0 - harmonicMix) + harmonicLeft * harmonicMix) * volume
          val right = (baseRight * (1.0 - harmonicMix) + harmonicRight * harmonicMix) * volume

          pcm[i * 2] = (left * Short.MAX_VALUE).toInt().toShort()
          pcm[i * 2 + 1] = (right * Short.MAX_VALUE).toInt().toShort()

          leftPhase += 2.0 * PI * leftFrequency / sampleRate
          rightPhase += 2.0 * PI * rightFrequency / sampleRate

          if (leftPhase > 2 * PI) leftPhase -= 2 * PI
          if (rightPhase > 2 * PI) rightPhase -= 2 * PI
        }

        audioTrack?.write(pcm, 0, pcm.size)
      }
    }
  }

  private fun stopTrack() {
    running = false
    renderThread?.join(300)
    renderThread = null
    audioTrack?.stop()
    audioTrack?.release()
    audioTrack = null
  }
}
