
export const SoundEngine = {
  ctx: null as AudioContext | null,
  dest: null as MediaStreamAudioDestinationNode | null,
  currentTTSSource: null as AudioBufferSourceNode | null,

  init: () => {
    if (!SoundEngine.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      SoundEngine.ctx = new AudioContextClass();
      // Create a dedicated destination for the MediaRecorder (internal audio capture)
      SoundEngine.dest = SoundEngine.ctx.createMediaStreamDestination();
    }
    // Auto-resume context if it gets suspended by browser policies
    if (SoundEngine.ctx.state === 'suspended') {
      SoundEngine.ctx.resume().catch(e => console.warn("Audio resume failed", e));
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

  playBase64Audio: async (base64Data: string) => {
    if (!SoundEngine.ctx) SoundEngine.init();
    if (!SoundEngine.ctx) return;

    SoundEngine.stopTTS();

    try {
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await SoundEngine.ctx.decodeAudioData(bytes.buffer);
      const source = SoundEngine.ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = SoundEngine.ctx.createGain();
      gain.gain.setValueAtTime(1, SoundEngine.ctx.currentTime);

      source.connect(gain);
      gain.connect(SoundEngine.ctx.destination);
      
      if (SoundEngine.dest) {
        gain.connect(SoundEngine.dest);
      }

      source.start(0);
      SoundEngine.currentTTSSource = source;
      
      source.onended = () => {
        if (SoundEngine.currentTTSSource === source) {
          SoundEngine.currentTTSSource = null;
        }
      };
    } catch (e) {
      console.error("Error playing base64 audio", e);
    }
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
