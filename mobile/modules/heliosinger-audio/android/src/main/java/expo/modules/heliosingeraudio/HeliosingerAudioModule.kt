package expo.modules.heliosingeraudio

import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.session.MediaSession
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.concurrent.thread
import kotlin.math.PI
import kotlin.math.sin

class HeliosingerAudioModule : Module() {
  private var audioTrack: AudioTrack? = null
  private var renderThread: Thread? = null
  private var audioManager: AudioManager? = null
  private var audioFocusRequest: AudioFocusRequest? = null
  private var mediaSession: MediaSession? = null

  @Volatile private var running = false
  @Volatile private var paused = false

  @Volatile private var baseFrequency = 110.0
  @Volatile private var beatFrequency = 4.0
  @Volatile private var harmonicMix = 0.3
  @Volatile private var volume = 0.2

  private val audioFocusListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
    when (focusChange) {
      AudioManager.AUDIOFOCUS_LOSS -> stopTrack()
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> pauseInternal()
      AudioManager.AUDIOFOCUS_GAIN -> resumeInternal()
    }
  }

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
      // Android background policy is managed by host app service/configuration.
      ensureMediaSession()
    }

    AsyncFunction("pause") {
      pauseInternal()
    }

    AsyncFunction("resume") {
      resumeInternal()
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

  private fun ensureAudioManager(): AudioManager? {
    if (audioManager != null) return audioManager
    val context = appContext.reactContext ?: return null
    audioManager = context.getSystemService(AudioManager::class.java)
    return audioManager
  }

  private fun requestAudioFocus(): Boolean {
    val manager = ensureAudioManager() ?: return false

    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
        .setOnAudioFocusChangeListener(audioFocusListener)
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build()
        )
        .setAcceptsDelayedFocusGain(false)
        .setWillPauseWhenDucked(true)
        .build()
      audioFocusRequest = request
      manager.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    } else {
      @Suppress("DEPRECATION")
      manager.requestAudioFocus(
        audioFocusListener,
        AudioManager.STREAM_MUSIC,
        AudioManager.AUDIOFOCUS_GAIN
      ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }
  }

  private fun abandonAudioFocus() {
    val manager = ensureAudioManager() ?: return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      audioFocusRequest?.let { manager.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION")
      manager.abandonAudioFocus(audioFocusListener)
    }
  }

  private fun ensureMediaSession() {
    if (mediaSession != null) return
    val context = appContext.reactContext ?: return

    mediaSession = MediaSession(context, "HeliosingerAudio").apply {
      setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS or MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS)
      setCallback(object : MediaSession.Callback() {
        override fun onPlay() {
          resumeInternal()
        }

        override fun onPause() {
          pauseInternal()
        }

        override fun onStop() {
          stopTrack()
        }
      })
      isActive = true
    }
  }

  private fun updateMediaSessionPlaybackState(isPlaying: Boolean) {
    ensureMediaSession()
    mediaSession?.isActive = isPlaying || running
  }

  private fun startTrack() {
    if (running && !paused) return

    if (!requestAudioFocus()) {
      return
    }

    ensureMediaSession()

    if (audioTrack == null) {
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
    }

    running = true
    paused = false
    audioTrack?.play()
    updateMediaSessionPlaybackState(true)

    if (renderThread == null || renderThread?.isAlive == false) {
      renderThread = thread(start = true, isDaemon = true, name = "heliosinger-audio") {
        var leftPhase = 0.0
        var rightPhase = 0.0
        val sampleRate = 44100
        val frames = 1024
        val pcm = ShortArray(frames * 2)

        while (running) {
          if (paused) {
            Thread.sleep(20)
            continue
          }

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
  }

  private fun pauseInternal() {
    if (!running) return
    paused = true
    audioTrack?.pause()
    updateMediaSessionPlaybackState(false)
  }

  private fun resumeInternal() {
    if (!running) {
      startTrack()
      return
    }

    if (!requestAudioFocus()) {
      return
    }

    paused = false
    audioTrack?.play()
    updateMediaSessionPlaybackState(true)
  }

  private fun stopTrack() {
    running = false
    paused = false

    renderThread?.join(300)
    renderThread = null

    audioTrack?.stop()
    audioTrack?.release()
    audioTrack = null

    updateMediaSessionPlaybackState(false)
    mediaSession?.release()
    mediaSession = null

    abandonAudioFocus()
  }
}
