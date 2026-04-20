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
  searchJobs: (params) => api.get('/jobs/search', { params }),
  getJob: (jobId) => api.get(`/jobs/${jobId}`),
  getMyJobs: () => api.get('/jobs/my'),
  deleteJob: (jobId) => api.delete(`/jobs/${jobId}`),
  hireWorker: (jobId, workerId) => api.put(`/jobs/${jobId}/hire/${workerId}`),
  createPrivateOffer: (offerData) => api.post('/jobs/offers', offerData),
  getJobOffers: () => api.get('/jobs/offers'),
  respondToOffer: (jobId, action) => api.put(`/jobs/${jobId}/offer-response`, { action }),
  getCategories: () => api.get('/categories'),
};

export const ratingAPI = {
  createRating: (ratingData) => api.post('/ratings', ratingData),
  getUserRatings: (userId) => api.get(`/ratings/user/${userId}`),
};

export const applicationAPI = {
  applyToJob: (applicationData) => api.post('/applications', applicationData),
  getWorkerApplications: (workerId) => api.get(`/applications/worker/${workerId}`),
  getJobApplications: (jobId) => api.get(`/applications/job/${jobId}`),
  updateApplicationStatus: (applicationId, status) => 
    api.put(`/applications/${applicationId}`, { status }),
};

export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  clearAllNotifications: () => api.delete('/notifications/clear-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`)
};

export const workersAPI = {
  listWorkers: (params) => api.get('/workers', { params }),
};

export const favoritesAPI = {
  listFavoriteWorkers: () => api.get('/favorites/workers'),
  favoriteWorker: (workerId) => api.post(`/favorites/workers/${workerId}`),
  unfavoriteWorker: (workerId) => api.delete(`/favorites/workers/${workerId}`),
};

export const shopAPI = {
  createShop: (data) => api.post('/shops', data),
  getMyShops: () => api.get('/shops/my'),
  getShop: (id) => api.get(`/shops/${id}`),
  updateShop: (id, data) => api.put(`/shops/${id}`, data),
  addShopImage: (shopId, data) => api.post(`/shops/${shopId}/images`, data),
  getShopImages: (shopId) => api.get(`/shops/${shopId}/images`),
  getShopJobs: (shopId) => api.get(`/shops/${shopId}/jobs`),
  uploadFile: (formData) => api.post('/upload', formData, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
  }),
};

export default api;
