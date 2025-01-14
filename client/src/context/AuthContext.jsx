import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API_URL = `${import.meta.env.VITE_API_URL}/api`;

// Token validation helper
const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch (e) {
    console.error('Token validation error:', e);
    return false;
  }
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoized token refresh function
  const refreshToken = useCallback(async () => {
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) throw new Error('No refresh token available');

    try {
      const response = await axios.post('/auth/refresh/', { refresh });
      const { access } = response.data;
      localStorage.setItem('accessToken', access);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      return access;
    } catch (error) {
      throw error;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        let token = localStorage.getItem('accessToken');
        
        // Validate current token
        if (token && !isTokenValid(token)) {
          console.log('Token expired, attempting refresh...');
          token = await refreshToken();
        }

        // Set up axios defaults
        axios.defaults.baseURL = API_URL;
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        setIsAuthenticated(!!token);
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [refreshToken]);

  // Set up axios interceptors
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const newToken = await refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            handleLogout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [refreshToken]);

  const handleLogin = useCallback((tokens) => {
    if (!tokens?.access || !tokens?.refresh) {
      console.error('Login failed: Invalid token data');
      setError('Invalid authentication data received');
      return;
    }

    try {
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      if (tokens.username) {
        localStorage.setItem('username', tokens.username);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
      setIsAuthenticated(true);
      setError(null);
      console.log('Login successful');
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to save authentication data');
      handleLogout();
    }
  }, []);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('username');
      delete axios.defaults.headers.common['Authorization'];
      setIsAuthenticated(false);
      setError(null);
      console.log('Logout successful');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to clear authentication data');
    }
  }, []);

  if (isLoading) {
    return <div>Loading authentication...</div>;
  }

  const contextValue = {
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    error,
    isLoading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 