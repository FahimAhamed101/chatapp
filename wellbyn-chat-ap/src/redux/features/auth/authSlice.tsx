// src/redux/features/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from '@/lib/browserStorage';

interface AuthState {
  user: null | {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: string;
    isVerified?: boolean;
    onboardingStep?: number;
    personalInfo?: any; // Make these optional
    insuranceInfo?: any; // Make these optional
  };
  tokens: null | {
    access: {
      token: string;
      expires: string;
    };
    refresh: {
      token: string;
      expires: string;
    };
  };
  isAuthenticated: boolean;
}

const normalizeRole = (role?: string) => {
  if (role === 'doctor') return 'user';
  if (role === 'patient') return 'sender';
  return role;
};

// Helper function to load initial state from localStorage
const loadInitialState = (): AuthState => {
  if (typeof window !== 'undefined') {
    try {
      const accessToken = getLocalStorageItem('accessToken');
      const refreshToken = getLocalStorageItem('refreshToken');
      const userData = getLocalStorageItem('user');
      
      if (accessToken && userData) {
        const user = JSON.parse(userData);
        
        // Extract name from user data - check different possible locations
        let firstName = '';
        let lastName = '';
        
        // Check personalInfo first
        if (user.personalInfo?.fullName) {
          firstName = user.personalInfo.fullName.first || '';
          lastName = user.personalInfo.fullName.last || '';
        } 
        // Check insuranceInfo as fallback
        else if (user.insuranceInfo && user.insuranceInfo.length > 0) {
          firstName = user.insuranceInfo[0]?.subscriber?.firstName || '';
          lastName = user.insuranceInfo[0]?.subscriber?.lastName || '';
        }
        
        return {
          user: {
            id: user._id,
            email: user.email,
            firstName: firstName,
            lastName: lastName,
            role: normalizeRole(user.role),
            isVerified: user.isVerified,
            onboardingStep: user.onboardingStep,
            personalInfo: user.personalInfo, // Include personalInfo
            insuranceInfo: user.insuranceInfo // Include insuranceInfo
          },
          tokens: {
            access: {
              token: accessToken,
              expires: getLocalStorageItem('accessTokenExpires') || ''
            },
            refresh: {
              token: refreshToken || '',
              expires: getLocalStorageItem('refreshTokenExpires') || ''
            }
          },
          isAuthenticated: true,
        };
      }
    } catch (e) {
      console.error('Failed to parse stored auth state', e);
    }
  }
  return {
    user: null,
    tokens: null,
    isAuthenticated: false,
  };
};

const initialState: AuthState = loadInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{
      user: any;
      accessToken: string;
      refreshToken: string;
    }>) => {
      const { user, accessToken, refreshToken } = action.payload;
      
      // Extract name from user data
      let firstName = '';
      let lastName = '';
      
      // Check personalInfo first
      if (user.personalInfo?.fullName) {
        firstName = user.personalInfo.fullName.first || '';
        lastName = user.personalInfo.fullName.last || '';
      } 
      // Check insuranceInfo as fallback
      else if (user.insuranceInfo && user.insuranceInfo.length > 0) {
        firstName = user.insuranceInfo[0]?.subscriber?.firstName || '';
        lastName = user.insuranceInfo[0]?.subscriber?.lastName || '';
      }
      
      state.user = {
        id: user._id,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        role: normalizeRole(user.role),
        isVerified: user.isVerified,
        onboardingStep: user.onboardingStep,
        personalInfo: user.personalInfo, // Include personalInfo
        insuranceInfo: user.insuranceInfo // Include insuranceInfo
      };
      
      state.tokens = {
        access: {
          token: accessToken,
          expires: ''
        },
        refresh: {
          token: refreshToken,
          expires: ''
        }
      };
      
      state.isAuthenticated = true;
      
      // Update localStorage when credentials are set
      const userData = {
        _id: user._id,
        email: user.email,
        personalInfo: user.personalInfo,
        insuranceInfo: user.insuranceInfo,
        role: normalizeRole(user.role),
        isVerified: user.isVerified,
        onboardingStep: user.onboardingStep
      };
      setLocalStorageItem('user', JSON.stringify(userData));
      setLocalStorageItem('accessToken', accessToken);
      setLocalStorageItem('refreshToken', refreshToken);
    },
    logout: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      
      // Clear all auth-related items from localStorage
      removeLocalStorageItem('accessToken');
      removeLocalStorageItem('refreshToken');
      removeLocalStorageItem('accessTokenExpires');
      removeLocalStorageItem('refreshTokenExpires');
      removeLocalStorageItem('user');
      removeLocalStorageItem('auth');
    },
    updateUser: (state, action: PayloadAction<Partial<AuthState['user']>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        // Update localStorage as well
        const updatedUser = {
          _id: state.user.id,
          email: state.user.email,
          personalInfo: state.user.personalInfo,
          insuranceInfo: state.user.insuranceInfo,
          role: normalizeRole(state.user.role),
          isVerified: state.user.isVerified,
          onboardingStep: state.user.onboardingStep
        };
        setLocalStorageItem('user', JSON.stringify(updatedUser));
      }
    },
    // Action to update tokens (useful for token refresh)
    updateTokens: (state, action: PayloadAction<{
      accessToken: string;
      refreshToken?: string;
    }>) => {
      if (state.tokens) {
        state.tokens.access.token = action.payload.accessToken;
        if (action.payload.refreshToken) {
          state.tokens.refresh.token = action.payload.refreshToken;
        }
        
        // Update localStorage
        setLocalStorageItem('accessToken', action.payload.accessToken);
        if (action.payload.refreshToken) {
          setLocalStorageItem('refreshToken', action.payload.refreshToken);
        }
      }
    },
  },
});

export const { setCredentials, logout, updateUser, updateTokens } = authSlice.actions;
export default authSlice.reducer;
