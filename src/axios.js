import axios from "axios";

// ایجاد نمونه axios با تنظیمات پروکسی
const axiosInstance = axios.create({
    baseURL: process.env.API_BASE_URL,
    proxy: {
    protocol: process.env.PROXY_POROTOCOL,
    host: process.env.PROXY_HOST,
    port: process.env.PROXY_PORT,
  },
});


export default axiosInstance