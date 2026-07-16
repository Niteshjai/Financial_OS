const API_BASE_URL = import.meta.env.VITE_API_URL || '';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: Error | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
}

async function customFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE_URL}/api${endpoint}`;
  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    let response = await fetch(url, config);

    // Interceptor: Handle 401
    if (response.status === 401) {
      if (endpoint.includes('/auth/refresh') || endpoint.includes('/auth/phone')) {
        const errorData = await response.json().catch(() => ({}));
        throw { response: { status: response.status, data: errorData } };
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => customFetch(endpoint, options));
      }

      isRefreshing = true;
      try {
        await customFetch('/auth/refresh', { method: 'POST', body: "{}" });
        processQueue(null);
        response = await fetch(url, config);
      } catch (refreshError) {
        processQueue(refreshError as Error);
        sessionStorage.removeItem('authUser');
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { response: { status: response.status, data: errorData } };
    }

    // Return the axios-like shape { data: ... }
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return { data, status: response.status, headers: response.headers };
  } catch (err) {
    throw err;
  }
}

export const api = {
  get: <T = any>(url: string, config?: { params?: Record<string, any> }) => {
    let finalUrl = url;
    if (config?.params) {
      const qs = new URLSearchParams(config.params).toString();
      finalUrl += `?${qs}`;
    }
    return customFetch(finalUrl, { method: 'GET' }) as Promise<{ data: T }>;
  },
  post: <T = any>(url: string, data?: any) => {
    return customFetch(url, { method: 'POST', body: data ? JSON.stringify(data) : "{}" }) as Promise<{ data: T }>;
  },
  put: <T = any>(url: string, data?: any) => {
    return customFetch(url, { method: 'PUT', body: data ? JSON.stringify(data) : "{}" }) as Promise<{ data: T }>;
  },
  delete: <T = any>(url: string) => {
    return customFetch(url, { method: 'DELETE' }) as Promise<{ data: T }>;
  }
};

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
