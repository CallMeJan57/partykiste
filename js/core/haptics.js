// Vibration (nur Android-Browser; iPhones ignorieren das stillschweigend).
// pattern: Millisekunden oder Muster wie [vibrieren, Pause, vibrieren, …]

export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // nicht unterstützt
  }
}
