export const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Premium coin/unlock sound (Major 3rd interval: E6 and G#6)
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    osc1.frequency.setValueAtTime(1318.51, ctx.currentTime); // E6
    osc2.frequency.setValueAtTime(1661.22, ctx.currentTime); // G#6
    
    // Envelope for a bright, percussive hit fading out
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    
    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error('Failed to play sound', e);
  }
};

export const playErrorSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Deep buzz for error
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.setValueAtTime(100, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.error('Failed to play error sound', e);
  }
};

export const triggerHaptic = (type: 'success' | 'error' | 'light' = 'success') => {
  try {
    if ('vibrate' in navigator) {
      if (type === 'success') {
        // Pixel-like crisp double click (two very brief 10ms pulses separated by a short break)
        navigator.vibrate([10, 30, 10]);
      } else if (type === 'error') {
        // Deep soft warning tick (three quick pulses, much gentler than a heavy buzz)
        navigator.vibrate([12, 40, 12, 40, 12]);
      } else if (type === 'light') {
        // Standard light click feedback (very brief, tactile tick)
        navigator.vibrate(12);
      }
    }
  } catch (e) {
    // Ignore
  }
};
