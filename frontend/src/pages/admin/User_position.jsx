import { useEffect, useState } from "react";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../api/users/user";
import api from "../../api/axios";
import Header from "../../components/common/layout/Header";
import { useNavigate } from "react-router-dom";

function ProjectSelectDualList({ allProjects, selected, setSelected }) {
  // 왼쪽: 전체, 오른쪽: 선택
  return (
    <div className="flex gap-4">
      {/* 전체 프로젝트 */}
      <div className="w-1/2 border rounded p-2 h-48 overflow-y-auto">
        <h4 className="font-semibold mb-2">전체 프로젝트</h4>
        <ul>
          {allProjects
            .filter((p) => !selected.includes(p.project_id))
            .map((p) => (
              <li
                key={p.project_id}
                className="cursor-pointer hover:bg-gray-200 px-2 py-1 rounded"
                onClick={() => setSelected([...selected, p.project_id])}
              >
                {p.name}
              </li>
            ))}
        </ul>
      </div>
      {/* 선택한 프로젝트 */}
      <div className="w-1/2 border rounded p-2 h-48 overflow-y-auto">
        <h4 className="font-semibold mb-2">선택한 프로젝트</h4>
        <ul>
          {selected.map((pid) => {
            const p = allProjects.find((proj) => proj.project_id === pid);
            return (
              <li
                key={pid}
                className="cursor-pointer hover:bg-red-100 px-2 py-1 rounded flex justify-between"
                onClick={() => setSelected(selected.filter((id) => id !== pid))}
              >
                <span>{p?.name || pid}</span>
                <span className="text-red-500 font-bold">×</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function UserManage() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "",
    projects: [],
  });
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProjects, setEditProjects] = useState([]);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.username) {
      setUsername(user.username);
    } else {
      navigate("/login");
    }
    loadUsers();
    setForm({ username: "", password: "", role: "", projects: [] });
  }, [navigate]);

  // const loadRoles = async () => {} // 비활성화

  const loadUsers = async () => {
    try {
      const res = await fetchUsers();
      const allUsers = res.data.results;
      const filtered = allUsers.filter((u) => u.role !== "admin");
      setUsers(filtered);
    } catch (err) {
      console.error("사용자 목록 불러오기 실패", err);
    }
  };

  // const loadProjects = async () => {} // 비활성화

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // 등록/수정 통합 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        projects: editId ? editProjects : form.projects,
      };
      if (!payload.password) delete payload.password;

      if (editId) {
        await updateUser(editId, payload);
        setEditId(null);
        setShowEditModal(false);
      } else {
        await createUser(payload);
      }

      setForm({ username: "", password: "", role: "", projects: [] });
      setEditProjects([]);
      loadUsers();
    } catch (err) {
      console.error("사용자 저장 실패", err);
    }
  };

  const handleEdit = (user) => {
    setForm({
      username: user.username,
      password: "",
      role: user.role,
      projects: user.projects || [],
    });
    setEditProjects(user.projects || []);
    setEditId(user.id);
    setShowEditModal(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      loadUsers();
    } catch (err) {
      console.error("사용자 삭제 실패", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const filteredUsers = (users || []).filter(
    (u) => u.username.includes(search) || u.role.includes(search)
  );

  return (
    <div>
      <Header username={username} onLogout={handleLogout} />
      <div className="p-8">
        <h2 className="text-lg font-semibold mb-4">사용자 관리</h2>

        {/* 등록 폼 */}
        {!editId && (
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6"
          >
            <input
              name="username"
              placeholder="아이디"
              value={form.username}
              onChange={handleChange}
              required
              className="px-3 py-2 border rounded w-full"
            />
            <input
              name="password"
              type="password"
              placeholder="비밀번호"
              value={form.password}
              onChange={handleChange}
              required
              className="px-3 py-2 border rounded w-full"
            />
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              required
              className="px-3 py-2 border rounded w-full"
            >
              <option value="">권한 선택</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name === "projectmanager"
                    ? "프로젝트 관리자"
                    : role.name === "projectworker"
                    ? "프로젝트 작업자"
                    : role.name}
                </option>
              ))}
            </select>

            <div className="col-span-full">
              <label className="block font-medium mb-2">프로젝트 선택</label>
              <ProjectSelectDualList
                allProjects={projects}
                selected={form.projects}
                setSelected={(list) => setForm({ ...form, projects: list })}
              />
            </div>

            <button
              type="submit"
              className="col-span-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              등록
            </button>
          </form>
        )}

        {/* 검색창 */}
        <input
          placeholder="사용자 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded mb-4"
        />

        {/* 사용자 목록 테이블 */}
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">아이디</th>
              <th className="px-4 py-2">권한</th>
              <th className="px-4 py-2">프로젝트</th>
              <th className="px-4 py-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="text-center">
                <td className="border px-4 py-2">{user.username}</td>
                <td className="border px-4 py-2">{user.role}</td>
                <td className="border px-4 py-2">
                  {(user.projects || []).join(", ")}
                </td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="bg-yellow-400 text-white px-2 py-1 rounded mr-2"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 수정 모달 */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">사용자 수정</h3>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  name="username"
                  placeholder="아이디"
                  value={form.username}
                  onChange={handleChange}
                  className="px-3 py-2 border rounded"
                  required
                />
                <input
                  name="password"
                  type="password"
                  placeholder="비밀번호"
                  value={form.password}
                  onChange={handleChange}
                  className="px-3 py-2 border rounded"
                />
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="px-3 py-2 border rounded"
                >
                  <option value="">권한 선택</option>
                  {roles
                    .filter((role) => role.name !== "admin")
                    .map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name === "projectmanager"
                          ? "프로젝트 관리자"
                          : role.name === "projectworker"
                          ? "프로젝트 작업자"
                          : role.name}
                      </option>
                    ))}
                </select>
                <div>
                  <label className="block font-medium mb-1">
                    프로젝트 선택
                  </label>
                  <ProjectSelectDualList
                    allProjects={projects}
                    selected={editProjects}
                    setSelected={setEditProjects}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded bg-gray-400 text-white"
                  >
                    닫기
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-blue-600 text-white"
                  >
                    저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManage;
