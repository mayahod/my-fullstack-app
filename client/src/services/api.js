import axios from 'axios';

// Create an instance of Axios with default configurations
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
