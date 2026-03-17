import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wired_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const authApi = {
  signup: (payload) => api.post("/auth/signup", payload),
  login: (payload) => api.post("/auth/login", payload),
  me: () => api.get("/auth/me"),
  updateProfile: (payload) => api.patch("/auth/profile", payload),
  uploadProfilePicture: (formData) =>
    api.patch("/auth/profile-picture", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
};

export const friendApi = {
  search: (email) => api.get(`/friends/search?email=${encodeURIComponent(email)}`),
  requests: () => api.get("/friends/requests"),
  list: () => api.get("/friends"),
  sendRequest: (recipientId) => api.post("/friends/request", { recipientId }),
  acceptRequest: (requestId) => api.patch(`/friends/accept/${requestId}`),
  delete: (friendshipId) => api.delete(`/friends/${friendshipId}`)
};

export const groupApi = {
  list: () => api.get("/groups"),
  create: (payload) => api.post("/groups", payload)
};

export const messageApi = {
  getMessages: (userId) => api.get(`/messages/${userId}`),
  getGroupMessages: (groupId) => api.get(`/messages/group/${groupId}`),
  getRecent: () => api.get("/messages/recent"),
  deleteSingle: (messageId) => api.delete(`/messages/single/${messageId}`),
  clearConversation: (userId) => api.delete(`/messages/conversation/${userId}`),
  clearGroupConversation: (groupId) => api.delete(`/messages/group/${groupId}`),
  send: (receiverId, formData) =>
    api.post(`/messages/send/${receiverId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }),
  sendGroup: (groupId, formData) =>
    api.post(`/messages/group/${groupId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
};

export default api;

export const getErrorMessage = (error, fallbackMessage) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.code === "ECONNABORTED") {
    return "The server is taking longer than expected. Please try again.";
  }

  if (error.message === "Network Error") {
    return "Cannot reach the backend server. Make sure it is running on port 5000.";
  }

  return fallbackMessage;
};
