
export const SoundEngine = {
  ctx: null as AudioContext | null,
  dest: null as MediaStreamAudioDestinationNode | null,
  currentTTSSource: null as AudioBufferSourceNode | null,

  init: () => {
    try {
      if (!SoundEngine.ctx) {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        if (!AudioContextClass) {
          console.error("AudioContext not supported in this browser");
          return;
        }
        SoundEngine.ctx = new AudioContextClass();
        SoundEngine.dest = SoundEngine.ctx.createMediaStreamDestination();
        console.log("SoundEngine: AudioContext initialized", SoundEngine.ctx.state);
      }
      if (SoundEngine.ctx.state === 'suspended') {
        SoundEngine.ctx.resume().then(() => {
          console.log("SoundEngine: AudioContext resumed");
        }).catch(e => console.warn("SoundEngine: Audio resume failed", e));
      }
    } catch (e) {
      console.error("SoundEngine: Initialization failed", e);
    }
  },

  playTone: (freq: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle', duration: number, vol: number = 0.1) => {
    if (!SoundEngine.ctx) return;

    // Ensure context is running
    if (SoundEngine.ctx.state === 'suspended') {
      SoundEngine.ctx.resume();
    }

    const osc = SoundEngine.ctx.createOscillator();
    const gain = SoundEngine.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, SoundEngine.ctx.currentTime);

    // Smooth attack and release to prevent clicking
    gain.gain.setValueAtTime(0, SoundEngine.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, SoundEngine.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, SoundEngine.ctx.currentTime + duration);

    osc.connect(gain);

    // Connect to Speakers (User hears this)
    gain.connect(SoundEngine.ctx.destination);

    // Connect to Internal Recording Stream (MediaRecorder hears this)
    if (SoundEngine.dest) {
      gain.connect(SoundEngine.dest);
    }

    osc.start();
    osc.stop(SoundEngine.ctx.currentTime + duration);
  },

  playTick: () => SoundEngine.playTone(300, 'triangle', 0.05, 0.08),
  playUrgentTick: () => SoundEngine.playTone(600, 'square', 0.08, 0.06),
  playSuccess: () => {
    SoundEngine.playTone(880, 'sine', 1.2, 0.1);
    setTimeout(() => SoundEngine.playTone(1318.51, 'sine', 1.5, 0.05), 10);
  },
  playError: () => SoundEngine.playTone(150, 'sawtooth', 0.3, 0.15),

  playBase64Audio: async (base64Data: string): Promise<void> => {
    if (!SoundEngine.ctx) SoundEngine.init();
    if (!SoundEngine.ctx) {
      console.error("SoundEngine: Cannot play audio, context not initialized");
      return;
    }

    if (SoundEngine.ctx.state === 'suspended') {
      await SoundEngine.ctx.resume();
    }

    SoundEngine.stopTTS();

    return new Promise(async (resolve) => {
      try {
        const binaryString = window.atob(base64Data.trim());
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        console.log("SoundEngine: Decoding audio data, length:", len);
        let audioBuffer: AudioBuffer;

        // Create a copy of the buffer because decodeAudioData detaches the input buffer
        const bufferForDecoding = bytes.buffer.slice(0);

        try {
          audioBuffer = await SoundEngine.ctx!.decodeAudioData(bufferForDecoding);
          console.log("SoundEngine: decodeAudioData success");
        } catch (decodeError) {
          console.warn("SoundEngine: decodeAudioData failed, attempting raw PCM 24kHz fallback", decodeError);
          const pcmData = new Int16Array(bytes.buffer);
          audioBuffer = SoundEngine.ctx!.createBuffer(1, pcmData.length, 24000);
          const channelData = audioBuffer.getChannelData(0);
          for (let i = 0; i < pcmData.length; i++) {
            channelData[i] = pcmData[i] / 32768.0;
          }
          console.log("SoundEngine: Raw PCM fallback success");
        }

        const source = SoundEngine.ctx!.createBufferSource();
        source.buffer = audioBuffer;

        const gain = SoundEngine.ctx!.createGain();
        gain.gain.setValueAtTime(1, SoundEngine.ctx!.currentTime);

        source.connect(gain);
        gain.connect(SoundEngine.ctx!.destination);

        if (SoundEngine.dest) {
          gain.connect(SoundEngine.dest);
        }

        source.start(0);
        SoundEngine.currentTTSSource = source;
        console.log("SoundEngine: TTS playback started, duration:", audioBuffer.duration.toFixed(2), "s");

        source.onended = () => {
          if (SoundEngine.currentTTSSource === source) {
            SoundEngine.currentTTSSource = null;
            console.log("SoundEngine: TTS playback ended naturally");
          }
          resolve();
        };
      } catch (e) {
        console.error("SoundEngine: Error playing base64 audio", e);
        resolve(); // resolve even on error so callers don't hang
      }
    });
  },

  stopTTS: () => {
    if (SoundEngine.currentTTSSource) {
      try {
        SoundEngine.currentTTSSource.stop();
      } catch (e) {
        // Already stopped or other issue
      }
      SoundEngine.currentTTSSource = null;
    }
  }
};
