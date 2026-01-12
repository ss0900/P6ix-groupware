// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 사용자 정보 조회
  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("access");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get("users/me/");
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
      setIsAuthenticated(false);
      // 토큰이 유효하지 않으면 제거
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 로그인
  const login = async (username, password) => {
    const response = await api.post("token/", { username, password });
    const { access, refresh } = response.data;
    
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);
    
    // axios 기본 헤더 설정
    api.defaults.headers.common.Authorization = `Bearer ${access}`;
    
    // 사용자 정보 조회
    await fetchUser();
    
    return response.data;
  };

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        await api.post("token/blacklist/", { refresh });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      delete api.defaults.headers.common.Authorization;
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  // 초기 로드 시 사용자 정보 확인
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    fetchUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
