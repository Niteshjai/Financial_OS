const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const initErrorLogger = () => {
  // Capture unhandled runtime errors
  window.addEventListener('error', (event) => {
    sendLogToBackend({
      message: event.message,
      type: 'RuntimeError',
      url: window.location.href,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    sendLogToBackend({
      message: event.reason?.message || String(event.reason),
      type: 'UnhandledPromiseRejection',
      url: window.location.href,
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  });
};

const sendLogToBackend = (payload: any) => {
  // Use sendBeacon or standard fetch
  // SendBeacon is better for sending data when the page is unloading
  try {
    const url = `${BACKEND_URL}/api/logs/frontend`;
    
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(console.error); // Silently catch fetch errors to avoid infinite loops
    }
  } catch (e) {
    console.error('Failed to send frontend error log:', e);
  }
};
