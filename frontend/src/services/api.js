import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/'; // Redirect to login
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/register', userData),
  login: (credentials) => api.post('/login', credentials),
  recoverAccount: (credentials) => api.post('/recover-account', credentials),
};

export const profileAPI = {
  getProfile: (userId) => api.get(`/profile/${userId}`),
  updateProfile: (userId, data) => api.put(`/profile/${userId}`, data),
  deleteAccount: (userId, data) => api.post(`/profile/${userId}/delete`, data),
};

export const jobAPI = {
  createJob: (jobData) => api.post('/jobs', jobData),
  getAllJobs: () => api.get('/jobs'),
  getJob: (jobId) => api.get(`/jobs/${jobId}`),
};

export const applicationAPI = {
  applyToJob: (applicationData) => api.post('/applications', applicationData),
  getWorkerApplications: (workerId) => api.get(`/applications/worker/${workerId}`),
  getJobApplications: (jobId) => api.get(`/applications/job/${jobId}`),
  updateApplicationStatus: (applicationId, status) => 
    api.put(`/applications/${applicationId}`, { status }),
};

export default api;
