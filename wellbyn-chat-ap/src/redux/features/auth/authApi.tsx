import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getLocalStorageItem } from "@/lib/browserStorage";

interface AuthResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
  message?: string;
}

interface LoginRequest {
  email: string;
  password: string;
  role?: "sender" | "user" | "admin" | "clinic_owner";
}

interface RegisterRequest {
  email: string;
  password: string;
  role?: "sender" | "user" | "admin" | "clinic_owner";
  fullName?: string;
}

const getToken = (): string | null => {
  return getLocalStorageItem("accessToken");
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/api/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (credentials) => ({
        url: "/api/auth/register",
        method: "POST",
        body: credentials,
      }),
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation } = authApi;
