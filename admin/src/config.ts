export const CLOUD_TUNNEL_URL: string = 'https://crm.dominal.in';

const detectServerUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    const isHttps = window.location.protocol === 'https:';
    const host = window.location.hostname;

    // When loaded over HTTPS (Netlify, Vercel, remote HTTPS web), NEVER request http://
    // Browsers strictly block http:// requests from https:// pages with Mixed Content errors.
    if (isHttps) {
      let cached: string | null = null;
      try {
        cached = window.localStorage ? window.localStorage.getItem('hcp_cached_tunnel_url') : null;
      } catch (_) {}
      return (cached && cached.startsWith('https://')) ? cached : (window.location.origin.startsWith('https://') ? window.location.origin : CLOUD_TUNNEL_URL);
    }

    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000';
    }
  }
  // Mobile App (Android APK / iOS) on mobile internet data (4G/5G) or outside Wi-Fi: ALWAYS use worldwide Cloud Tunnel URL!
  return CLOUD_TUNNEL_URL;
};

export const SERVER_URL: string = detectServerUrl();

// The public CRM address is fixed. Do not read Firestore to discover it.
export const fetchCloudTunnelUrl = async (): Promise<string> => {
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000';
    }
  }
  return CLOUD_TUNNEL_URL;
};

// The owner app signs in by itself with this CRM staff account (must be a manager account).
// Change these two lines to the manager username/password you use to log in to the CRM.
export const OWNER_USERNAME: string = 'admin';
export const OWNER_PASSWORD: string = 'admin123';

// Set DEMO_MODE to false so real live CRM and Firebase cloud data is used across APK and browser
export const DEMO_MODE: boolean = false;

