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
      if (status === 401 || status === 403 || status === 405) {
        // Token expired or unauthorized
        toast.error(`Session expired or unauthorized access.`);
        LogOut();
        window.location.href = '/login'
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
