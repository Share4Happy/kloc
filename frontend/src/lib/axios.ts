import axios from 'axios';

// Base instance
// Dùng đường dẫn tương đối /api-backend — Next.js rewrite proxy sang backend.
// Không cần NEXT_PUBLIC_API_URL, không bao giờ hardcode domain.
export const api = axios.create({
  baseURL: '/api-backend',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios Interceptor for Requests
api.interceptors.request.use(
  (config) => {
    // We can extract token from localStorage if zustand persist saves it there
    // Or just grab it directly from window.localStorage
    if (typeof window !== 'undefined') {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
            try {
                const parsed = JSON.parse(authStorage);
                const token = parsed?.state?.token;
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (error) {
                console.error("Failed to parse auth token", error);
            }
        }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Axios Interceptor for Responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized globally
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Clear auth state to force login
        localStorage.removeItem('auth-storage');
        // Prevent redirect loop if already on login page
        if (!window.location.pathname.startsWith('/login')) {
             window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
