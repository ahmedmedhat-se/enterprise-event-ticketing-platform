import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_URL } from "../config/env";
import { useAuthStore } from "../../store/auth.store";

interface CustomAxiosConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 15_000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (token) {
      promise.resolve(token);
    } else {
      promise.reject(error);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosConfig | undefined;

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (
      originalRequest.url === "/user/login" ||
      originalRequest.url === "/organizer/login"
    ) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/";
      return Promise.reject(error);
    }

    if (!isRefreshing) {
      isRefreshing = true;
      originalRequest._retry = true;

      try {
        const { data } = await axios.post<{ accessToken: string }>(
          "/user/refresh-token",
          {},
          {
            baseURL: apiClient.defaults.baseURL,
            withCredentials: true,
            headers: { "Content-Type": "application/json" },
          },
        );

        const newToken = data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        window.location.href = "/";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then((token) => {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return apiClient(originalRequest);
    });
  },
);

export function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError && error.response?.data) {
    const status = error.response.status;
    const data = error.response.data as Record<string, unknown>;

    if (status === 429) {
      return "Too many requests. Please wait a moment before trying again.";
    }

    if (typeof data.reason === "string") {
      if (typeof data.message === "string") {
        return data.message;
      }
    }

    if (typeof data.message === "string") {
      return data.message;
    }
    if (Array.isArray(data.message)) {
      return (data.message as string[]).join(", ");
    }
    if (typeof data.error === "string") {
      return data.error;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
}

export default apiClient;
