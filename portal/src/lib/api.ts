import axios from "axios";
import { LocalStorage } from "@/lib/utils";
import toast from "react-hot-toast";
import DM_CORE_CONFIG from "@/constant";
import { LogOut } from "@/features/auth/api";
// import { logout } from '../auth';

const API_BASE_URL = DM_CORE_CONFIG.BACKEND_URL + DM_CORE_CONFIG.URL_SUFIX;

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // withCredentials: true,
  timeout: 10000,
});

API.interceptors.request.use((config) => {
  const user = LocalStorage.get("rideshare-admin-user");
  if (user?.access_token) {
    config.headers.Authorization = `Bearer ${user.access_token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => {
    console.log(response);

    // Response is successful
    return response;
  },
  (error) => {
    // Response error handling
    if (error.response) {
      const { status } = error.response;

      // Login/OTP/refresh calls fail with 401/403 when the CREDENTIALS are wrong,
      // not because an existing session expired — there is no session yet, so never
      // force-logout for these. Let the caller's own onError show the real message.
      const isAuthEndpoint = typeof error.config?.url === "string" && error.config.url.includes("/auth/");

      // Only a 401 on an already-authenticated request means "your session is no
      // longer valid" — 403 is "you're logged in but not allowed to do this one
      // thing" (shouldn't log you out), and 405 (wrong HTTP method) is a routing/
      // client bug with nothing to do with auth state at all.
      if (status === 401 && !isAuthEndpoint) {
        toast.error("Session expired. Please log in again.");
        LogOut();
      }

      // Optional: You can handle other status codes globally
      // if (status === 500) showGlobalError("Server error occurred.");

      // Return the error response to the caller
      return Promise.reject(error.response);
    } else if (error.request) {
      // No response from server
      console.error("No response from server:", error.request);
    } else {
      // Something else went wrong
      console.error("Error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default API;
