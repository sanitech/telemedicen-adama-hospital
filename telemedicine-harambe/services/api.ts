import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://172.17.105.64:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      AsyncStorage.removeItem('authToken');
      AsyncStorage.removeItem('userData');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData: any) => api.post('/users/register', userData),
  login: (credentials: { email: string; password: string }) => 
    api.post('/users/login', credentials),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (profileData: any) => api.put('/users/profile', profileData),
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) => 
    api.put('/users/change-password', passwordData),
  listDoctors: (specialty?: string) => 
    api.get(`/users/doctors/all${specialty ? `?specialty=${specialty}` : ''}`),
  listAllUsers: () => api.get('/users/all'),
  approveDoctor: (doctorId: string) => 
    api.post(`/users/admin/approve-doctor/${doctorId}`),
};

// Admin API
export const adminAPI = {
  registerDoctor: (doctorData: {
    name: string;
    email: string;
    password: string;
    phoneNumber?: string;
    age?: number;
    gender?: string;
    specialty: string;
    availability?: Array<{
      day: string;
      startTime: string;
      endTime: string;
    }>;
  }) => api.post('/users/admin/register-doctor', doctorData),
  
  registerAdmin: (adminData: {
    name: string;
    email: string;
    password: string;
    phoneNumber?: string;
    age?: number;
    gender?: string;
  }) => api.post('/users/admin/register-admin', adminData),
  
  getAllUsers: () => api.get('/users/admin/users'),
  
  updateUserAccount: (userId: string, userData: {
    name?: string;
    email?: string;
    role?: string;
    phoneNumber?: string;
    age?: number;
    gender?: string;
    specialty?: string;
    availability?: Array<{
      day: string;
      startTime: string;
      endTime: string;
    }>;
  }) => api.put(`/users/admin/users/${userId}`, userData),
  
  deleteUserAccount: (userId: string) => api.delete(`/users/admin/users/${userId}`),
  
  approveDoctor: (doctorId: string) => api.post(`/users/admin/approve-doctor/${doctorId}`),
};

// Appointments API
export const appointmentsAPI = {
  bookAppointment: (appointmentData: {
    doctorId: string;
    dateTime: string;
    note?: string;
  }) => api.post('/appointments/book', appointmentData),
  
  getMyAppointments: (filters?: {
    status?: string;
    upcoming?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.upcoming) params.append('upcoming', 'true');
    return api.get(`/appointments/my?${params.toString()}`);
  },
  
  getAppointmentById: (id: string) => api.get(`/appointments/${id}`),
  
  updateAppointmentStatus: (id: string, status: string) => 
    api.put(`/appointments/${id}`, { status }),
};

// Payments API
export const paymentsAPI = {
  getPaymentMethods: () => api.get('/payments/methods'),
  
  createPayment: (paymentData: {
    appointmentId: string;
    paymentMethod: string;
    paymentDetails: {
      phoneNumber?: string;
      accountNumber?: string;
      bankName?: string;
      referenceNumber?: string;
    };
  }) => api.post('/payments/create', paymentData),
  
  getMyPayments: (filters?: {
    status?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    return api.get(`/payments/my?${params.toString()}`);
  },
  
  getPaymentById: (id: string) => api.get(`/payments/${id}`),
  
  getPaymentByAppointment: (appointmentId: string) => 
    api.get(`/payments/appointment/${appointmentId}`),
  
  updatePaymentStatus: (id: string, status: string, notes?: string) => 
    api.put(`/payments/${id}/status`, { status, notes }),
};

// Prescriptions API
export const prescriptionsAPI = {
  createPrescription: (prescriptionData: {
    appointmentId: string;
    diagnosis: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
      quantity?: string;
    }>;
    instructions?: string;
    followUpDate?: string;
    notes?: string;
  }) => api.post('/prescriptions/create', prescriptionData),
  
  getMyPrescriptions: (filters?: {
    status?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    return api.get(`/prescriptions/my?${params.toString()}`);
  },
  
  getPrescriptionById: (id: string) => api.get(`/prescriptions/${id}`),
  
  updatePrescription: (id: string, prescriptionData: {
    diagnosis?: string;
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
      quantity?: string;
    }>;
    instructions?: string;
    followUpDate?: string;
    notes?: string;
    status?: string;
  }) => api.put(`/prescriptions/${id}`, prescriptionData),
  
  startConsultation: (appointmentId: string) => 
    api.post(`/prescriptions/appointment/${appointmentId}/start-consultation`),
  
  getPrescriptionByAppointment: (appointmentId: string) =>
    api.get(`/prescriptions/by-appointment/${appointmentId}`),
};

// Messages API
export const messagesAPI = {
  sendMessage: (messageData: {
    receiverId: string;
    content: string;
  }) => api.post('/messages/send', messageData),
  
  getMessages: (userId: string) => api.get(`/messages/${userId}`),
  
  getRecentConversations: () => api.get('/messages/conversations/recent'),
  
  markMessagesAsRead: (userId: string) => 
    api.put(`/messages/${userId}/read`),
  
  getUnreadCount: () => api.get('/messages/unread/count'),
};

// Posts API
export const postsAPI = {
  getPosts: (filters?: {
    page?: number;
    limit?: number;
    authorId?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.authorId) params.append('authorId', filters.authorId);
    return api.get(`/posts?${params.toString()}`);
  },
  
  getPostById: (id: string) => api.get(`/posts/${id}`),
  
  getPostsByDoctor: (doctorId: string, filters?: {
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    return api.get(`/posts/doctor/${doctorId}?${params.toString()}`);
  },
  
  createPost: (postData: { title: string; content: string }) => 
    api.post('/posts', postData),
  
  updatePost: (id: string, postData: { title?: string; content?: string }) => 
    api.put(`/posts/${id}`, postData),
  
  deletePost: (id: string) => api.delete(`/posts/${id}`),
};

export default api; 