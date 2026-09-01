import axios from "axios";
import { API_BASE_URL } from "./config";
import { clearSession, getToken, signalExpiredSession } from "./utils/authStorage";

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30_000,
    headers: { Accept: "application/json" }
});

api.interceptors.request.use(
    (config) => {
        const token = getToken();

        if (token) {
            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,

    (error) => {
        const requestUrl =
            error.config?.url || "";

        const isAuthRequest =
            requestUrl.includes("/auth/login") ||
            requestUrl.includes("/auth/register");
        const isPasswordRequest = requestUrl.includes("/auth/forgot-password") || requestUrl.includes("/auth/reset-password");

        if (
            error.response?.status === 401 &&
            !isAuthRequest && !isPasswordRequest
        ) {
            clearSession();
            signalExpiredSession();
        }

        return Promise.reject(error);
    }
);

export default api;
