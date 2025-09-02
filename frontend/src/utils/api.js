import axios from "axios";

const API = axios.create({
  baseURL: "http://192.168.0.118:5000/api", // your backend URL
  withCredentials: true, // ✅ send cookies with every request
});

export default API;
