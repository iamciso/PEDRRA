// Desktop Notification helper for PEDRRA (#8)
// Falls back gracefully if Notification API is not available or denied.

let permissionGranted = false;

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') { permissionGranted = true; return true; }
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  permissionGranted = result === 'granted';
  return permissionGranted;
}

export function sendNotification(title, options = {}) {
  if (!permissionGranted || !('Notification' in window)) return null;
  try {
    const n = new Notification(title, {
      icon: '/template/edps_logo.png',
      badge: '/template/edps_logo.png',
      silent: false,
      ...options,
    });
    // Auto-close after 5s
    setTimeout(() => n.close(), 5000);
    return n;
  } catch { return null; }
}

export function isSupported() {
  return 'Notification' in window;
}

export function isPermissionGranted() {
  return permissionGranted || (typeof Notification !== 'undefined' && Notification.permission === 'granted');
}
