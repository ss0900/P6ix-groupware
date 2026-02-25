// src/pages/admin/CompanyManagement.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import Modal from "../../components/common/ui/Modal";
import BoardTable from "../../components/common/board/BoardTable";
import { RefreshCw, Plus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const getSelectedCompanyScopeKey = (username) =>
  `chat:selected-company:${username || "anonymous"}`;

export default function CompanyManagement() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    registration_no: "",
    address: "",
    detail_address: "",
    extra_address: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    const key = getSelectedCompanyScopeKey(user?.username);
    const storedCompanyId = localStorage.getItem(key) || "";
    setSelectedCompanyId(storedCompanyId);
  }, [user?.username]);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("core/companies/", {
        params: search ? { search } : undefined,
      });
      setCompanies(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (!user?.username || selectedCompanyId || companies.length === 0) return;
    const defaultCompanyId = String(companies[0].id);
    setSelectedCompanyId(defaultCompanyId);
    localStorage.setItem(
      getSelectedCompanyScopeKey(user.username),
      defaultCompanyId
    );
  }, [companies, selectedCompanyId, user?.username]);

  const openModal = (company = null) => {
    setEditingCompany(company);
    setLogoFile(null);
    setFormData({
      name: company?.name || "",
      registration_no: company?.registration_no || "",
      address: company?.address || "",
      detail_address: company?.detail_address || "",
      extra_address: company?.extra_address || "",
      phone: company?.phone || "",
      email: company?.email || "",
    });
    setModalOpen(true);
  };

  const uploadLogo = async (companyId, file) => {
    const data = new FormData();
    data.append("file", file);
    await api.post(`core/companies/${companyId}/upload-logo/`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let companyId = editingCompany?.id;
      if (editingCompany) {
        const res = await api.patch(`core/companies/${companyId}/`, formData);
        companyId = res.data?.id || companyId;
      } else {
        const res = await api.post("core/companies/", formData);
        companyId = res.data?.id;
      }

      if (companyId && logoFile) {
        await uploadLogo(companyId, logoFile);
      }

      setModalOpen(false);
      setEditingCompany(null);
      await loadCompanies();
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (company) => {
    if (!window.confirm(`"${company.name}" 회사를 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`core/companies/${company.id}/`);
      if (String(selectedCompanyId) === String(company.id)) {
        const key = getSelectedCompanyScopeKey(user?.username);
        localStorage.removeItem(key);
        setSelectedCompanyId("");
      }
      loadCompanies();
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSelectCompanyScope = (company) => {
    if (!company?.id) return;
    const nextCompanyId = String(company.id);
    setSelectedCompanyId(nextCompanyId);
    localStorage.setItem(
      getSelectedCompanyScopeKey(user?.username),
      nextCompanyId
    );
  };

  const selectedCompanyName = useMemo(() => {
    if (!selectedCompanyId) return "";
    return (
      companies.find((company) => String(company.id) === String(selectedCompanyId))
        ?.name || `ID ${selectedCompanyId}`
    );
  }, [companies, selectedCompanyId]);

  const columns = [
    {
      key: "logo",
      header: "로고",
      render: (row) =>
        row.logo ? (
          <img
            src={row.logo}
            alt={row.name}
            className="w-8 h-8 rounded object-cover border"
          />
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        ),
    },
    { key: "name", header: "회사명", align: "left" },
    { key: "registration_no", header: "사업자번호", align: "left" },
    { key: "phone", header: "전화", align: "left" },
    { key: "email", header: "이메일", align: "left" },
    {
      key: "address",
      header: "주소",
      align: "left",
      render: (row) =>
        [row.address, row.detail_address, row.extra_address]
          .filter(Boolean)
          .join(" "),
    },
    {
      key: "actions",
      header: "관리",
      render: (row) => (
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openModal(row);
            }}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
            title="수정"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            className="p-1.5 hover:bg-red-100 rounded text-red-600"
            title="삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          회사(워크스페이스) 관리
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCompanies}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            새로고침
          </button>
          <button
            onClick={() => openModal(null)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            회사 추가
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          className="border rounded px-3 py-2 text-sm"
          placeholder="검색: 회사명/사업자번호/이메일/전화"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {selectedCompanyId && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          메신저 기본 회사 스코프: <span className="font-semibold">{selectedCompanyName}</span>
        </div>
      )}

      <BoardTable
        columns={columns}
        rows={companies}
        loading={loading}
        keyField="id"
        onRowClick={handleSelectCompanyScope}
        emptyText="등록된 회사가 없습니다."
        sortable={false}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCompany ? "회사 수정" : "회사 추가"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                회사명 <span className="text-red-500">*</span>
              </label>
              <input
                className="input-base"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사업자번호
              </label>
              <input
                className="input-base"
                value={formData.registration_no}
                onChange={(e) =>
                  setFormData({ ...formData, registration_no: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                대표전화
              </label>
              <input
                className="input-base"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                className="input-base"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                로고
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="input-base"
              />
              {editingCompany?.logo && (
                <div className="mt-2">
                  <img
                    src={editingCompany.logo}
                    alt={editingCompany.name}
                    className="w-16 h-16 rounded border object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주소 <span className="text-red-500">*</span>
            </label>
            <input
              className="input-base"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상세 주소
              </label>
              <input
                className="input-base"
                value={formData.detail_address}
                onChange={(e) =>
                  setFormData({ ...formData, detail_address: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                추가 주소
              </label>
              <input
                className="input-base"
                value={formData.extra_address}
                onChange={(e) =>
                  setFormData({ ...formData, extra_address: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-cancel"
            >
              취소
            </button>
            <button type="submit" disabled={saving} className="btn-save">
              {saving ? "저장중..." : "저장"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
