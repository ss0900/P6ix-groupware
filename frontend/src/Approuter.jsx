// frontend/src/routes/AppRouter.jsx
import React from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useParams,
} from "react-router-dom";

// ✅ 너가 이미 가져온 페이지들(경로는 네 프로젝트 구조에 맞게 조정해줘)
import Login from "./pages/Login";
import SystemLayout from "./pages/system/SystemLayout";
import UserList from "./pages/system/UserList";
import UserPosition from "./pages/admin/User_position"; // 네 파일 기준 (원하면 system 폴더로 옮겨도 됨)

// ---------------------------
// Helpers / Guards
// ---------------------------
function isAuthed() {
  // Login.jsx가 localStorage에 "access" 저장하는 기준
  return !!localStorage.getItem("access");
}

function RequireAuth() {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RootRedirect() {
  // 로그인 되어 있으면 시스템관리로, 아니면 로그인으로
  if (!isAuthed()) return <Navigate to="/login" replace />;

  // 그룹웨어(core 테스트)는 프로젝트 개념 없이 시스템관리로 바로
  return <Navigate to="/system/user/list" replace />;
}

function ProjectHomeRedirect() {
  const { id } = useParams();
  // PMIS Login.jsx가 /project/:id로 보내기 때문에, 여기서 시스템관리로 붙여준다.
  return <Navigate to={`/project/${id}/system/user/list`} replace />;
}

function SystemIndexRedirect() {
  const { id } = useParams();
  return <Navigate to={`/project/${id}/system/user/list`} replace />;
}

function SystemAliasRedirect() {
  // /system 진입 시 시스템관리 첫 화면으로
  return <Navigate to="/system/user/list" replace />;
}

// ---------------------------
// Minimal pages for missing PMIS screens
// (지금은 core 테스트 목적이라 "빈 페이지"로 둬도 됨)
// ---------------------------
function ComingSoon({ title = "준비중" }) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 8 }}>{title}</h2>
      <p style={{ opacity: 0.8 }}>
        core(API) 테스트용 라우터입니다. 화면은 필요할 때 PMIS 페이지를 더
        가져오거나 새로 만들면 됩니다.
      </p>
    </div>
  );
}

function SelectProject() {
  const navigate = useNavigate();
  const projects = safeParse(localStorage.getItem("projects"), []);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 12 }}>프로젝트 선택(임시)</h2>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        현재 Login.jsx가 PMIS 방식으로 projects를 기준으로 이동합니다.
        그룹웨어에서는 이 페이지를 안 써도 되지만, 테스트를 위해 남겨둡니다.
      </p>

      {!Array.isArray(projects) || projects.length === 0 ? (
        <>
          <p style={{ marginBottom: 12 }}>localStorage에 projects가 없어요.</p>
          <button onClick={() => navigate("/system")} style={btnStyle}>
            시스템관리로 이동(가능하면)
          </button>
        </>
      ) : (
        <ul style={{ paddingLeft: 18 }}>
          {projects.map((p) => (
            <li key={p.id} style={{ marginBottom: 8 }}>
              <button
                style={btnStyle}
                onClick={() => {
                  localStorage.setItem("projectId", p.id);
                  navigate(`/project/${p.id}`);
                }}
              >
                {p.name ?? `Project #${p.id}`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateProjectStub() {
  return <ComingSoon title="프로젝트 생성(임시 페이지)" />;
}

function safeParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const btnStyle = {
  padding: "8px 12px",
  border: "1px solid #ddd",
  borderRadius: 8,
  cursor: "pointer",
  background: "white",
};

// ---------------------------
// Router
// ---------------------------
export default function AppRouter() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Alias (그룹웨어식) */}
      <Route path="/system" element={<SystemAliasRedirect />} />

      {/* ✅ 그룹웨어 실제 시스템관리 라우트 */}
      <Route element={<RequireAuth />}>
        <Route path="/system" element={<SystemLayout />}>
          <Route path="user" element={<UserList />} />
          <Route path="user/list" element={<UserList />} />
          <Route path="user/add" element={<ComingSoon title="사용자 등록" />} />
          <Route
            path="user/detail/:userId"
            element={<ComingSoon title="사용자 상세" />}
          />

          <Route
            path="user/company"
            element={<ComingSoon title="회사 관리" />}
          />
          <Route
            path="company/add"
            element={<ComingSoon title="회사 추가" />}
          />
          <Route
            path="user/department"
            element={<ComingSoon title="부서 관리" />}
          />
          <Route path="user/position" element={<UserPosition />} />

          <Route path="mypage" element={<ComingSoon title="마이페이지" />} />
          <Route path="faq" element={<ComingSoon title="FAQ" />} />
          <Route path="*" element={<ComingSoon title="System: 없는 경로" />} />
        </Route>
      </Route>

      {/* PMIS Login.jsx가 보낼 수 있는 경로들 (임시로 살려둠) */}
      <Route path="/select-project" element={<SelectProject />} />
      <Route path="/create-project" element={<CreateProjectStub />} />

      {/* PMIS 스타일 project 홈 */}
      <Route path="/project/:id" element={<ProjectHomeRedirect />} />

      {/* (선택) 기존 PMIS 경로로 들어오면 그룹웨어 /system으로 보내기 */}
      <Route
        path="/project/:id/system/*"
        element={<Navigate to="/system/user/list" replace />}
      />

      {/* Global 404 */}
      <Route path="*" element={<ComingSoon title="없는 페이지" />} />
    </Routes>
  );
}
