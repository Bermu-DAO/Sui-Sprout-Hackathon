// Web Audio API Synthesizer for Micro-Interactions
// No external dependencies needed!

let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playCoinSound = () => {
  const ctx = initAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  // Fast frequency drop like a coin drop 'ping'
  osc.frequency.setValueAtTime(1400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0.0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
};

export const playScratchSound = () => {
  const ctx = initAudio();
  // Generate short burst of white noise
  const bufferSize = ctx.sampleRate * 0.1; // 100ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  // Highpass filter to sound more like scratching foil
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 4000;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.03, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  noise.start(ctx.currentTime);
};

export const playWinSound = () => {
  const ctx = initAudio();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc1.type = 'triangle';
  osc2.type = 'sine';
  
  // Major arpeggio
  const t = ctx.currentTime;
  osc1.frequency.setValueAtTime(523.25, t);         // C5
  osc1.frequency.setValueAtTime(659.25, t + 0.1);   // E5
  osc1.frequency.setValueAtTime(783.99, t + 0.2);   // G5
  osc1.frequency.setValueAtTime(1046.50, t + 0.3);  // C6
  
  osc2.frequency.setValueAtTime(523.25 * 1.01, t);
  osc2.frequency.setValueAtTime(659.25 * 1.01, t + 0.1);
  osc2.frequency.setValueAtTime(783.99 * 1.01, t + 0.2);
  osc2.frequency.setValueAtTime(1046.50 * 1.01, t + 0.3);
  
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
  gain.gain.setValueAtTime(0.2, t + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  
  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 0.8);
  osc2.stop(t + 0.8);
};
