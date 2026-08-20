export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

const PATTERNS: Record<HapticType, number | number[]> = {
  light: 15,
  medium: 25,
  heavy: 40,
  success: [15, 80, 25],
  warning: [25, 100, 25],
  error: [30, 60, 30, 60, 40]
};

export const vibrate = (type: HapticType = 'light') => {
  if (typeof window === 'undefined' || !navigator.vibrate) return;
  
  try {
    const isEnabled = localStorage.getItem('tattoo_hub_haptics_enabled') !== 'false';
    if (!isEnabled) return;
    
    navigator.vibrate(PATTERNS[type]);
  } catch(e) {}
};
