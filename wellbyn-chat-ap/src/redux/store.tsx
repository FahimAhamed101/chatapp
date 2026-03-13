// src/redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { authApi } from './features/auth/authApi';
import authReducer from "./features/auth/authSlice";
import { chatApi } from './features/chat/chatApi';
export const store = configureStore({
  reducer: {
    [chatApi.reducerPath]: chatApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, chatApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
