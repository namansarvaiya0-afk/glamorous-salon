import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:10000/api',
});

// Added an interceptor to handle tokens automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
