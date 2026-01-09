import api from "./axios";

export const login = async (username, password) => {
  return api.post("core/auth/login/", { username, password });
};

export const logout = async (refresh) => {
  return api.post("core/auth/logout/", { refresh });
};

export const getUserProfile = async () => {
  return api.get("core/profile/");
};
