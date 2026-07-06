import type { AxiosResponse } from "axios";
import API from "./api";

/**
 * Standard response structure from the backend
 */
export interface BackendResponse<T> {
  SUCCESS: boolean;
  MESSAGE: T;
  COUNT?: number;
  PAGINATION?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Transforms an AxiosResponse into a simplified data object or throws an error.
 */
export const handleResponse = <T>(response: AxiosResponse<BackendResponse<T>>): T => {
  const { SUCCESS, MESSAGE } = response.data;
  if (!SUCCESS) {
    throw new Error(typeof MESSAGE === "string" ? MESSAGE : "API Request Failed");
  }
  return MESSAGE;
};

/**
 * Standardized API client for RESTful resources
 */
export const apiClient = {
  get: async <T>(url: string, params?: any) => {
    const response = await API.get<BackendResponse<T>>(url, { params });
    return response.data; // Return full wrapper for list/pagination needs
  },
  post: async <T>(url: string, data: any, config?: any) => {
    const response = await API.post<BackendResponse<T>>(url, data, config);
    return handleResponse(response);
  },
  patch: async <T>(url: string, data: any) => {
    const response = await API.patch<BackendResponse<T>>(url, data);
    return handleResponse(response);
  },
  delete: async <T>(url: string) => {
    const response = await API.delete<BackendResponse<T>>(url);
    return handleResponse(response);
  },
};
