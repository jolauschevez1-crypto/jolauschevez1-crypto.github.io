type AppConfigWindow = Window & {
  __APP_CONFIG__?: {
    apiBaseUrl?: string;
    uploadsBaseUrl?: string;
  };
};

const runtimeConfig = (globalThis as unknown as AppConfigWindow).__APP_CONFIG__ ?? {};

export const APP_CONFIG = {
  apiBaseUrl:
    runtimeConfig.apiBaseUrl ?? 'http://localhost:3000',
  uploadsBaseUrl:
    runtimeConfig.uploadsBaseUrl ?? 'http://localhost:3000/uploads',
};

export const API_BASE_URL = APP_CONFIG.apiBaseUrl.replace(/\/$/, '');
export const UPLOADS_BASE_URL = APP_CONFIG.uploadsBaseUrl.replace(/\/$/, '');

export const buildApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
};

export const buildUploadUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${UPLOADS_BASE_URL}${normalizedPath}`;
};
