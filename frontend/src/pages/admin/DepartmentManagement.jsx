import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, GripVertical, Plus, Trash2, X } from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const DepartmentModal = ({
  isOpen,
  onClose,
  department,
  companies,
  departments,
  onSave,
  canSelectCompany,
  fixedCompanyId,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    parent: "",
    company: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || "",
        type: department.type || "",
        parent: department.parent ? String(department.parent) : "",
        company: department.company ? String(department.company) : "",
      });
      return;
    }

    setFormData({
      name: "",
      type: "",
      parent: "",
      company: fixedCompanyId ? String(fixedCompanyId) : "",
    });
  }, [department, fixedCompanyId]);

  const parentCandidates = useMemo(() => {
    if (!formData.company) {
      return [];
    }

    return departments.filter((item) => {
      const sameCompany = String(item.company) === String(formData.company);
      const notSelf = !department || item.id !== department.id;
      return sameCompany && notSelf;
    });
  }, [departments, department, formData.company]);

  useEffect(() => {
    if (!formData.parent) {
      return;
    }

    const isValidParent = parentCandidates.some(
      (item) => String(item.id) === String(formData.parent),
    );

    if (!isValidParent) {
      setFormData((prev) => ({ ...prev, parent: "" }));
    }
  }, [formData.parent, parentCandidates]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave(formData, department?.id);
      onClose();
    } catch (error) {
      console.error(error);
      alert("부서 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {department ? "부서 수정" : "부서 추가"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {canSelectCompany && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                회사 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.company}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    company: event.target.value,
                    parent: "",
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">선택</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              부서명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="예) IT, 영업1팀"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              구분
            </label>
            <input
              type="text"
              value={formData.type}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, type: event.target.value }))
              }
              placeholder="예) 본사, 현장, TF"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              상위 부서
            </label>
            <select
              value={formData.parent}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, parent: event.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">없음</option>
              {parentCandidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function DepartmentManagement() {
  const { user } = useAuth();
  const isSuperuser = Boolean(user?.is_superuser);

  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [companyResponse, departmentResponse] = await Promise.all([
        api.get("core/companies/"),
        api.get("core/departments/"),
      ]);

      const nextCompanies = companyResponse.data?.results ?? companyResponse.data ?? [];
      const nextDepartments =
        departmentResponse.data?.results ?? departmentResponse.data ?? [];

      setCompanies(nextCompanies);
      setDepartments(nextDepartments);

      if (!selectedCompany && nextCompanies.length > 0) {
        setSelectedCompany(String(nextCompanies[0].id));
      }
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const departmentMap = useMemo(() => {
    const map = new Map();
    departments.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    const list = departments.filter((item) => {
      if (!selectedCompany) {
        return true;
      }
      return String(item.company) === String(selectedCompany);
    });

    return list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [departments, selectedCompany]);

  const handleSaveDepartment = async (data, departmentId) => {
    const targetCompany =
      data.company || selectedCompany || editingDepartment?.company || "";

    if (!targetCompany) {
      alert("회사를 선택해 주세요.");
      return;
    }

    const payload = {
      company: Number(targetCompany),
      name: data.name.trim(),
      type: data.type?.trim() || "",
      parent: data.parent ? Number(data.parent) : null,
    };

    if (departmentId) {
      await api.patch(`core/departments/${departmentId}/`, payload);
    } else {
      await api.post("core/departments/", payload);
    }
    await loadData();
  };

  const handleDeleteDepartment = async (department) => {
    if (!window.confirm(`"${department.name}" 부서를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await api.delete(`core/departments/${department.id}/`);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("부서 삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">부서 관리</h1>
        <button
          type="button"
          onClick={() => {
            setEditingDepartment(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          부서 추가
        </button>
      </div>

      {isSuperuser && (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">회사 선택:</label>
          <select
            value={selectedCompany}
            onChange={(event) => setSelectedCompany(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            등록된 부서가 없습니다.
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                  순서
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                  부서명
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                  회사
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                  구분
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                  상위 부서
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.map((department, index) => {
                const parentDepartment = departmentMap.get(department.parent);
                return (
                  <tr
                    key={department.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <GripVertical size={16} className="text-gray-400" />
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {department.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {department.company_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {department.type || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {parentDepartment?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDepartment(department);
                            setModalOpen(true);
                          }}
                          className="rounded p-1.5 text-gray-600 hover:bg-gray-200"
                          title="수정"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDepartment(department)}
                          className="rounded p-1.5 text-red-600 hover:bg-red-100"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <DepartmentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingDepartment(null);
        }}
        department={editingDepartment}
        companies={companies}
        departments={departments}
        onSave={handleSaveDepartment}
        canSelectCompany={isSuperuser}
        fixedCompanyId={selectedCompany}
      />
    </div>
  );
}
