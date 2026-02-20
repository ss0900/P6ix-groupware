// src/pages/system/UserList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Trash2 } from "lucide-react";
import api from "../../api/axios";
import { fetchUsers } from "../../api/users/user";
import BoardTable from "../../components/common/board/BoardTable"; //Changed
import { useAuth } from "../../context/AuthContext";

const formatPhoneNumber = (phoneNumber) => {
  const digits = String(phoneNumber ?? "")
    .replace(/\D/g, "")
    .slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export default function UserList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperuser = Boolean(user?.is_superuser);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [deleting, setDeleting] = useState({});

  // 필터
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");

  // 필터 옵션
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  // ======================= API ===========================
  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetchUsers(); //Changed
      let list = res.data?.results ?? res.data ?? [];

      // ===== 클라이언트에서 필터링 =====
      if (q.trim()) {
        list = list.filter((u) =>
          (u.first_name + u.last_name + u.email + u.username)
            .toLowerCase()
            .includes(q.toLowerCase())
        );
      }
      if (company)
        list = list.filter((u) => String(u.company_id) === String(company));
      if (department)
        list = list.filter(
          (u) => String(u.department_id) === String(department)
        );
      if (position)
        list = list.filter((u) => String(u.position_id) === String(position));

      setRows(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserField = async (user, field, value) => {
    setUpdating((prev) => ({ ...prev, [user.id]: true }));
    try {
      const res = await api.patch(`core/users/${user.id}/`, {
        [field]: value,
      });
      const updated = res.data;
      setRows((prev) =>
        prev.map((row) => (row.id === user.id ? updated : row))
      );
    } catch (e) {
      console.error(e);
      alert("권한 변경 중 오류가 발생했습니다.");
    } finally {
      setUpdating((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!isSuperuser) return;
    if (!targetUser?.id) return;

    if (Number(targetUser.id) === Number(user?.id)) {
      alert("현재 로그인한 본인 계정은 삭제할 수 없습니다.");
      return;
    }

    const displayName =
      `${targetUser.last_name ?? ""}${targetUser.first_name ?? ""}`.trim() ||
      targetUser.username ||
      "해당 사용자";

    if (!window.confirm(`"${displayName}" 사용자를 삭제하시겠습니까?`)) return;

    setDeleting((prev) => ({ ...prev, [targetUser.id]: true }));
    try {
      await api.delete(`core/users/${targetUser.id}/`);
      setRows((prev) => prev.filter((row) => row.id !== targetUser.id));
    } catch (e) {
      console.error(e);
      alert("사용자 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting((prev) => ({ ...prev, [targetUser.id]: false }));
    }
  };

  // 필터 옵션 로드
  useEffect(() => {
    (async () => {
      try {
        const [c, d, p] = await Promise.all([
          api.get("core/companies/"),
          api.get("core/departments/"),
          api.get("core/positions/"),
        ]);

        setCompanies(c.data?.results ?? c.data ?? []);
        setDepartments(d.data?.results ?? d.data ?? []);
        setPositions(p.data?.results ?? p.data ?? []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [q, company, department, position]);

  const positionLevelMap = useMemo(() => {
    const map = new Map();
    positions.forEach((p) => {
      map.set(String(p.id), Number(p.level ?? 999));
    });
    return map;
  }, [positions]);

  // ======================= Columns ===========================
  const columns = [
    {
      key: "name",
      header: "이름",
      // width: 120,
      render: (row) => `${row.last_name ?? ""}${row.first_name ?? ""}`,
    },
    {
      key: "username",
      header: "아이디",
      // width: 120,
    },
    {
      key: "company",
      header: "회사",
      // width: 140,
      render: (row) => row.company?.name ?? row.company ?? "-",
    },
    {
      key: "department",
      header: "부서",
      // width: 140,
      render: (row) => row.department?.name ?? row.department ?? "-",
    },
    {
      key: "position",
      header: "직책",
      // width: 120,
      sortValue: (row) => {
        const positionId = row.position_id ?? row.position?.id ?? row.position;
        if (positionId != null && positionLevelMap.has(String(positionId))) {
          return positionLevelMap.get(String(positionId));
        }
        return Number.MAX_SAFE_INTEGER;
      },
      render: (row) => row.position?.name ?? row.position ?? "-",
    },
    {
      key: "phone_number",
      header: "연락처",
      // width: 140,
      render: (row) => formatPhoneNumber(row.phone_number) || "-",
    },
    {
      key: "email",
      header: "이메일",
    },
    {
      key: "is_active",
      sortable: false,
      header: "활성화",
      render: (row) => (
        <label
          className="relative inline-flex items-center cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="sr-only peer"
            checked={!!row.is_active}
            disabled={!!updating[row.id]}
            onChange={(e) =>
              toggleUserField(row, "is_active", e.target.checked)
            }
          />
          <div className="w-10 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
        </label>
      ),
    },
    {
      key: "is_staff",
      sortable: false,
      header: "관리자 권한",
      render: (row) => (
        <label
          className="relative inline-flex items-center cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="sr-only peer"
            checked={!!row.is_staff}
            disabled={!!updating[row.id]}
            onChange={(e) =>
              toggleUserField(row, "is_staff", e.target.checked)
            }
          />
          <div className="w-10 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
        </label>
      ),
    },
    ...(isSuperuser
      ? [
          {
            key: "actions",
            sortable: false,
            header: "관리",
            render: (row) => (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded p-1.5 text-gray-600 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/users/${row.id}/edit`);
                  }}
                  title="수정"
                >
                  <Edit size={16} />
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded p-1.5 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(row);
                  }}
                  disabled={Boolean(deleting[row.id])}
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="p-6">
      {/* 상단 */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">사용자 목록</h1>

        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          onClick={() => navigate(`/admin/users/add`)}
        >
          사용자 등록
        </button>
      </div>

      {/* 필터 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <input
          className="border rounded px-3 py-2 text-sm"
          placeholder="검색(이름/이메일/아이디)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="border rounded px-3 py-2 text-sm"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        >
          <option value="">전체 회사</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="border rounded px-3 py-2 text-sm"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="">전체 부서</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          className="border rounded px-3 py-2 text-sm"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        >
          <option value="">전체 직책</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* 목록 */}
      <BoardTable
        columns={columns}
        rows={rows}
        loading={loading}
        keyField="id"
        emptyText="등록된 사용자가 없습니다."
        onRowClick={(row) => navigate(`/admin/users/${row.id}`)}
        sortable
      />
    </div>
  );
}
