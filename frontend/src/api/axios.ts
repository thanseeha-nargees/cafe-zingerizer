import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

type RetryRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshRequest: Promise<void> | null = null;

const isLoginPage = () =>
  ["/login", "/admin/login", "/staff/login", "/otp-verify"].includes(
    window.location.pathname
  );

const redirectAfterAuthFailure = () => {
  if (isLoginPage()) return;

  if (window.location.pathname.startsWith("/admin")) {
    window.location.assign("/admin/login");
    return;
  }

  if (window.location.pathname.startsWith("/staff")) {
    window.location.assign("/staff/login");
    return;
  }

  window.location.assign("/login");
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryRequestConfig | undefined;
    const requestUrl = originalRequest?.url || "";

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/admin/login") ||
      requestUrl.includes("/staff/login") ||
      requestUrl.includes("/auth/send-otp") ||
      requestUrl.includes("/auth/verify-otp") ||
      requestUrl.includes("/auth/otp-verify")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshRequest) {
        refreshRequest = api
          .post("/auth/refresh")
          .then(() => undefined)
          .finally(() => {
            refreshRequest = null;
          });
      }

      await refreshRequest;
      return api(originalRequest);
    } catch (refreshError) {
      redirectAfterAuthFailure();
      return Promise.reject(refreshError);
    }
  }
);
