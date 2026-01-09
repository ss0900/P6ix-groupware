// src/pages/system/UserList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { fetchUsers } from "../../api/users/user";
import BoardTable from "../../components/common/board/BoardTable"; //Changed

export default function UserList() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

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
      render: (row) => row.position?.name ?? row.position ?? "-",
    },
    {
      key: "phone_number",
      header: "연락처",
      // width: 140,
      render: (row) => row.phone_number || "-",
    },
    {
      key: "email",
      header: "이메일",
    },
  ];

  return (
    <div className="p-6">
      {/* 상단 */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">사용자 목록</h1>

        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          onClick={() => navigate(`/system/user/add`)}
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
        onRowClick={(row) => navigate(`/system/user/detail/${row.id}`)}
      />
    </div>
  );
}
