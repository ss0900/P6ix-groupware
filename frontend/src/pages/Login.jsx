import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import loginBg from "../assets/images/login_sc.png";
import safetyMo from "../assets/images/safety_mo.png";
import p6ixLogo from "../assets/icons/p6ix_logo.png";

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ✅ 페이지 로드 시 이미 로그인 되어 있으면 안내
  useEffect(() => {
    const access = localStorage.getItem("access");
    const user = localStorage.getItem("user");

    if (access && user) {
      alert("이미 로그인되어 있습니다.");
      navigate("/system/user/list");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const res = await login(username, password);
      console.log("로그인 성공:", res.data);
      const { access, refresh, user } = res.data;

      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);
      localStorage.setItem("user", JSON.stringify(user));
      //   localStorage.setItem("projects", JSON.stringify(projects));

      const redirectTo = localStorage.getItem("redirectTo");
      if (redirectTo) {
        navigate(redirectTo);
        localStorage.removeItem("redirectTo");
        return;
      }

      navigate("/system/user/list");
    } catch (err) {
      console.error("로그인 실패:", err);
      alert("아이디 또는 비밀번호가 잘못되었습니다.");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        padding: "20px",
      }}
    >
      {/* ======================= 상단 타이틀 ======================= */}
      <div
        className="absolute top-6 left-6 select-none pointer-events-none"
        style={{ lineHeight: 1 }}
      >
        <div
          className="
    text-[120px] md:text-[220px]
    font-extrabold leading-none select-none
    text-white mix-blend-overlay
  "
          style={{
            opacity: 0.2, // 배경과 자연스럽게 섞이게
            letterSpacing: "-4px",
          }}
        >
          PMIS
        </div>
      </div>

      {/* ======================= 로그인 박스 ======================= */}
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          padding: "30px",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.85)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          textAlign: "center",
        }}
      >
        <div className="flex flex-col items-center">
          <img src={safetyMo} alt="안전한하루되세요" className="h-5 mb-1" />
          <h2 className="login-title">로그인</h2>
        </div>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2.5 mb-3 border rounded-lg text-sm"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2.5 mb-4 border rounded-lg text-sm"
          />
          <button type="submit" className="btn-login">
            로그인
          </button>
          {errorMsg && (
            <p style={{ color: "red", marginTop: "10px" }}>{errorMsg}</p>
          )}
        </form>
      </div>

      {/* ======================= 하단 저작권 ======================= */}
      <div
        style={{
          position: "absolute",
          bottom: "25px",
          width: "100%",
          textAlign: "center",
          color: "rgba(255,255,255,0.7)",
          fontSize: "12px",
          placeItems: "center",
        }}
      >
        <img src={p6ixLogo} alt="P6ixConsulting" style={{ height: "5vh" }} />
        <span>
          Copyright ⓒ by <b>P6ix S</b>mart <b>C</b>onstruction Co., Ltd. ALL
          RIGHTS RESERVED
        </span>
      </div>
    </div>
  );
}

export default Login;
