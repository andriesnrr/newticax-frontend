// src/store/auth-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import axios, { AxiosError } from 'axios';

// Types with properly defined interfaces
export interface UserPreference {
  categories: string[];
  notifications: boolean;
  darkMode: boolean;
  emailUpdates: boolean;
}

export interface UserCount {
  articles: number;
  bookmarks: number;
  likes: number;
  comments: number;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'USER' | 'AUTHOR' | 'ADMIN';
  language: 'ENGLISH' | 'INDONESIAN';
  image?: string | null;
  bio?: string | null;
  provider?: 'EMAIL' | 'GOOGLE' | 'GITHUB';
  createdAt: string;
  updatedAt: string;
  preference?: UserPreference;
  _count?: UserCount;
}

// Input types for API calls
export interface RegisterData {
  name: string;
  email: string;
  username: string;
  password: string;
  language?: 'ENGLISH' | 'INDONESIAN';
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ProfileUpdateData {
  name?: string;
  bio?: string | null;
  image?: string | null;
}

export interface PreferenceUpdateData {
  categories?: string[];
  notifications?: boolean;
  darkMode?: boolean;
  emailUpdates?: boolean;
}

// API Response types
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  debug?: any;
  code?: string;
  action?: string;
}

// Auth Store State Interface
export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<{ success: boolean; user?: User; error?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updatePreferences: (preferences: PreferenceUpdateData) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

// API Configuration - Better environment handling
const getApiBaseUrl = () => {
  // Check for explicit environment variable first
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Fallback to environment-based URLs
  return process.env.NODE_ENV === 'production' 
    ? 'https://newticax-backend.up.railway.app/api'
    : 'http://localhost:4000/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔧 API Configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  API_BASE_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

// Network connectivity checker
const isBackendAvailable = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-cache',
      mode: 'cors',
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('🔌 Backend connectivity check failed:', error);
    return false;
  }
};

// Create axios instance with proper configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CRITICAL: Enable cookies
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('🌐 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      withCredentials: config.withCredentials,
      headers: {
        'Content-Type': config.headers['Content-Type'],
        'Accept': config.headers['Accept'],
      },
    });
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging and error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      success: response.data?.success,
      hasData: !!response.data?.data,
      headers: {
        'X-Auth-Status': response.headers['x-auth-status'],
        'X-Clear-Token': response.headers['x-clear-token'],
        'Set-Cookie': response.headers['set-cookie'] ? 'present' : 'none',
      },
    });
    return response;
  },
  (error: AxiosError) => {
    console.error('❌ API Response Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data,
      headers: error.response?.headers ? {
        'X-Auth-Status': error.response.headers['x-auth-status'],
        'X-Clear-Token': error.response.headers['x-clear-token'],
      } : undefined,
    });
    
    // Handle specific auth errors
    if (error.response?.status === 401) {
      const authStatus = error.response.headers['x-auth-status'];
      const clearToken = error.response.headers['x-clear-token'];
      
      console.log('🔐 Auth error detected:', { authStatus, clearToken });
      
      // If server says to clear token, we should logout
      if (clearToken === 'true') {
        console.log('🧹 Server requested token clear, logging out...');
        // Don't call store.logout() here to avoid circular calls
        // Instead, let the component handle this
      }
    }
    
    return Promise.reject(error);
  }
);

// CRITICAL: Prevent auth loops by tracking requests
let authCheckInProgress = false;
let authCheckPromise: Promise<void> | null = null;

// Create the auth store
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: false,
        error: null,

        // Actions
        login: async (email: string, password: string, rememberMe = false) => {
          console.log('🔐 Login attempt:', { email, rememberMe });
          
          set({ isLoading: true, error: null });
          
          try {
            const response = await api.post<ApiResponse<User>>('/auth/login', {
              email,
              password,
              rememberMe,
            });

            console.log('✅ Login response:', {
              success: response.data?.success,
              hasUser: !!response.data?.data,
              userId: response.data?.data?.id,
            });

            if (response.data?.success && response.data?.data) {
              const user = response.data.data;
              
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                isInitialized: true,
              });

              console.log('✅ Login successful, user stored in state');
              
              return { success: true, user };
            } else {
              const errorMessage = (response.data as any)?.message || 'Login failed - invalid response format';
              console.error('❌ Login failed:', errorMessage);
              
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: errorMessage,
              });
              
              return { success: false, error: errorMessage };
            }
          } catch (error: any) {
            console.error('❌ Login error:', error);
            
            let errorMessage = 'Login failed';
            
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
              errorMessage = 'Unable to connect to server. Please check your internet connection.';
            } else if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: errorMessage,
            });
            
            return { success: false, error: errorMessage };
          }
        },

        register: async (data: RegisterData) => {
          console.log('📝 Register attempt:', { email: data.email, username: data.username });
          
          set({ isLoading: true, error: null });
          
          try {
            const response = await api.post<ApiResponse<User>>('/auth/register', data);

            console.log('✅ Register response:', {
              success: response.data?.success,
              hasUser: !!response.data?.data,
              userId: response.data?.data?.id,
            });

            if (response.data?.success && response.data?.data) {
              const user = response.data.data;
              
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                isInitialized: true,
              });

              console.log('✅ Registration successful, user stored in state');
              
              return { success: true, user };
            } else {
              const errorMessage = (response.data as any)?.message || 'Registration failed - invalid response format';
              console.error('❌ Registration failed:', errorMessage);
              
              set({
                isLoading: false,
                error: errorMessage,
              });
              
              return { success: false, error: errorMessage };
            }
          } catch (error: any) {
            console.error('❌ Registration error:', error);
            
            let errorMessage = 'Registration failed';
            
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
              errorMessage = 'Unable to connect to server. Please check your internet connection.';
            } else if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            set({
              isLoading: false,
              error: errorMessage,
            });
            
            return { success: false, error: errorMessage };
          }
        },

        logout: async () => {
          console.log('🚪 Logout attempt');
          
          // Optimistically clear state immediately
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });

          try {
            await api.post('/auth/logout');
            console.log('✅ Logout successful');
          } catch (error: any) {
            console.warn('⚠️ Logout API call failed, but state cleared:', error.message);
            // Don't throw error here - state is already cleared
          }
        },

        checkAuth: async () => {
          console.log('🟢 [checkAuth] Starting...');
          // CRITICAL: Prevent multiple simultaneous auth checks
          if (authCheckInProgress) {
            console.log('⏳ Auth check already in progress, waiting...');
            if (authCheckPromise) {
              await authCheckPromise;
            }
            return;
          }

          console.log('🔍 Checking authentication status...');
          
          authCheckInProgress = true;
          authCheckPromise = (async () => {
            try {
              // First check if backend is available
              console.log('🔌 Checking backend connectivity...');
              const backendAvailable = await isBackendAvailable();
              
              if (!backendAvailable) {
                console.warn('⚠️ Backend server is not available, skipping auth check');
                set({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                  error: null, // Don't set error for network issues
                  isInitialized: true,
                });
                return;
              }

              // Don't set loading if user is already authenticated
              const currentState = get();
              if (!currentState.isAuthenticated) {
                set({ isLoading: true, error: null });
              }

              console.log('📡 Making request to /auth/me...');
              const response = await api.get<ApiResponse<User>>('/auth/me');

              console.log('✅ Auth check response:', {
                success: response.data?.success,
                hasUser: !!response.data?.data,
                userId: response.data?.data?.id,
              });

              if (response.data?.success && response.data?.data) {
                console.log('🧠 [checkAuth] Setting authenticated Zustand state...');
                const user = response.data.data;
                
                set({
                  user,
                  isAuthenticated: true,
                  isLoading: false,
                  error: null,
                  isInitialized: true,
                });

                console.log('✅ Auth check successful, user is authenticated');
              } else {
                console.log('⚠️ Auth check: User not authenticated');
                
                set({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                  error: null,
                  isInitialized: true,
                });
              }
            } catch (error: any) {
              console.error('❌ Auth check error:', error);
              
              // Handle network errors gracefully
              if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.name === 'AbortError') {
                console.warn('🔌 Network connection failed - Backend server might be down');
                console.warn('🔧 Continuing without authentication...');
                
                // Don't treat network errors as auth failures
                set({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                  error: null, // Don't set error for network issues
                  isInitialized: true,
                });
                return;
              }
              
              // Check if it's a 401 error (not authenticated)
              if (error.response?.status === 401) {
                console.log('🔐 Auth check: User not authenticated (401)');
                
                set({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                  error: null,
                  isInitialized: true,
                });
              } else {
                // For other errors, set error but don't change auth status drastically
                const errorMessage = error.response?.data?.message || 'Authentication service temporarily unavailable';
                console.warn('⚠️ Auth service error:', errorMessage);
                
                set({
                  isLoading: false,
                  error: null, // Don't show errors to users for service issues
                  isInitialized: true,
                });
              }
            } finally {
              authCheckInProgress = false;
              authCheckPromise = null;
              console.log('🟣 [checkAuth] Finished');
            }
          })();

          await authCheckPromise;
        },

        updateProfile: async (data: ProfileUpdateData) => {
          console.log('👤 Updating profile...');
          
          set({ isLoading: true, error: null });
          
          try {
            const response = await api.put<ApiResponse<User>>('/auth/profile', data);

            if (response.data?.success && response.data?.data) {
              const updatedUser = response.data.data;
              
              set({
                user: updatedUser,
                isLoading: false,
                error: null,
              });

              console.log('✅ Profile updated successfully');
              
              return { success: true, user: updatedUser };
            } else {
              const errorMessage = (response.data as any)?.message || 'Profile update failed';
              set({ isLoading: false, error: errorMessage });
              return { success: false, error: errorMessage };
            }
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Profile update failed';
            
            set({
              isLoading: false,
              error: errorMessage,
            });
            
            return { success: false, error: errorMessage };
          }
        },

        updatePassword: async (currentPassword: string, newPassword: string) => {
          console.log('🔒 Updating password...');
          
          set({ isLoading: true, error: null });
          
          try {
            const response = await api.put<ApiResponse>('/auth/password', {
              currentPassword,
              newPassword,
            });

            if (response.data?.success) {
              set({ isLoading: false, error: null });
              console.log('✅ Password updated successfully');
              return { success: true };
            } else {
              const errorMessage = (response.data as any)?.message || 'Password update failed';
              set({ isLoading: false, error: errorMessage });
              return { success: false, error: errorMessage };
            }
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Password update failed';
            
            set({
              isLoading: false,
              error: errorMessage,
            });
            
            return { success: false, error: errorMessage };
          }
        },

        updatePreferences: async (preferences: PreferenceUpdateData) => {
          console.log('⚙️ Updating preferences...');
          
          set({ isLoading: true, error: null });
          
          try {
            const response = await api.put<ApiResponse>('/auth/preferences', preferences);

            if (response.data?.success) {
              // Update user preferences in state with proper type safety
              const currentUser = get().user;
              if (currentUser) {
                const updatedPreference: UserPreference = {
                  categories: preferences.categories ?? currentUser.preference?.categories ?? [],
                  notifications: preferences.notifications ?? currentUser.preference?.notifications ?? true,
                  darkMode: preferences.darkMode ?? currentUser.preference?.darkMode ?? false,
                  emailUpdates: preferences.emailUpdates ?? currentUser.preference?.emailUpdates ?? true,
                };

                set({
                  user: {
                    ...currentUser,
                    preference: updatedPreference,
                  },
                  isLoading: false,
                  error: null,
                });
              }

              console.log('✅ Preferences updated successfully');
              return { success: true };
            } else {
              const errorMessage = (response.data as any)?.message || 'Preferences update failed';
              set({ isLoading: false, error: errorMessage });
              return { success: false, error: errorMessage };
            }
          } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Preferences update failed';
            
            set({
              isLoading: false,
              error: errorMessage,
            });
            
            return { success: false, error: errorMessage };
          }
        },

        // Utility actions
        clearError: () => set({ error: null }),
        
        setUser: (user: User | null) => {
          console.log('👤 Setting user in state:', user ? { id: user.id, email: user.email } : null);
          set({ 
            user, 
            isAuthenticated: !!user,
            isInitialized: true,
          });
        },
        
        setLoading: (loading: boolean) => set({ isLoading: loading }),
      }),
      {
        name: 'auth-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist essential user data
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          isInitialized: state.isInitialized,
        }),
        onRehydrateStorage: () => {
          console.log('🔄 Rehydrating auth store from localStorage...');
          return (state, error) => {
            if (error) {
              console.error('❌ Auth store rehydration error:', error);
            } else {
              console.log('✅ Auth store rehydrated:', {
                hasUser: !!state?.user,
                isAuthenticated: state?.isAuthenticated,
                userId: state?.user?.id,
              });
              
              // If we have a user in localStorage, check if they're still valid
              if (state?.user && state?.isAuthenticated) {
                console.log('🔍 Validating stored user session...');
                // Don't await this - let it run in background
                state.checkAuth().catch(error => {
                  console.warn('⚠️ Background auth validation failed:', error);
                });
              }
            }
          };
        },
      }
    ),
    {
      name: 'auth-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Export API instance for use in other parts of the app
export { api };

// Helper function to check if user has specific role
export const hasRole = (user: User | null, role: User['role']): boolean => {
  if (!user) return false;
  
  // Admin has access to everything
  if (user.role === 'ADMIN') return true;
  
  // Check specific role
  return user.role === role;
};

// Helper function to check if user can perform action
export const canPerformAction = (user: User | null, action: string): boolean => {
  if (!user) return false;
  
  switch (action) {
    case 'create_article':
      return hasRole(user, 'AUTHOR') || hasRole(user, 'ADMIN');
    case 'moderate_content':
      return hasRole(user, 'ADMIN');
    case 'manage_users':
      return hasRole(user, 'ADMIN');
    default:
      return false;
  }
};

// Export store selector hooks for better performance
export const useAuth = () => useAuthStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  isInitialized: state.isInitialized,
  error: state.error,
}));

export const useAuthActions = () => useAuthStore((state) => ({
  login: state.login,
  register: state.register,
  logout: state.logout,
  checkAuth: state.checkAuth,
  updateProfile: state.updateProfile,
  updatePassword: state.updatePassword,
  updatePreferences: state.updatePreferences,
  clearError: state.clearError,
  setUser: state.setUser,
  setLoading: state.setLoading,
}));

// Specific selectors for performance optimization
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useIsInitialized = () => useAuthStore((state) => state.isInitialized);