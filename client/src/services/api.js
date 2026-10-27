import axios from 'axios';
import { API_BASE } from './config';

// Create an instance of Axios with default configurations
const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
