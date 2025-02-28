import axios from 'axios';

const api = axios.create({
  baseURL: 'https://projectfolder-backend.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add the access token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 493) {  // Token expired
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshResponse = await axios.post('http://localhost:5000/api/auth/refresh-token', {
            refreshToken,
          });
          
          localStorage.setItem('accessToken', refreshResponse.data.accessToken);
          
          originalRequest.headers['Authorization'] = `Bearer ${refreshResponse.data.accessToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          await handleLogout(); // Use the new logout handler
          return Promise.reject(refreshError);
        }
      } else {
        await handleLogout(); // Use the new logout handler
      }
    }
    return Promise.reject(error);
  }
);
// New centralized logout handler
export const handleLogout = async () => {
  try {
    const userId = localStorage.getItem('userId');
    if (userId) {
      // Call the backend to delete the token document
      await api.post('/api/auth/logout', { userId });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear local storage and redirect, even if the API call fails
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  }
};

export default api;