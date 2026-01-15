// src/pages/operation/CustomerList.jsx
/**
 * 고객 관리 - 고객사 목록
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiSearch, FiUsers, FiPhone } from "react-icons/fi";
import { CustomerService } from "../../api/operation";
import Modal from "../../components/common/ui/Modal";
import BoardTable from "../../components/common/board/BoardTable";
import BoardToolbar from "../../components/common/board/BoardToolbar";
import BoardPagination from "../../components/common/board/BoardPagination";
import SearchFilterBar from "../../components/common/board/SearchFilterBar";

function CustomerList() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // 고객사 추가 모달
  const [showModal, setShowModal] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: "",
    business_number: "",
    industry: "",
    phone: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (searchQuery) params.search = searchQuery;

      const data = await CustomerService.getCompanies(params);
      const results = data.results || data;
      setCompanies(results);
      setTotal(data.count ?? results.length);
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, pageSize]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await CustomerService.createCompany(newCompany);
      setShowModal(false);
      setNewCompany({
        name: "",
        business_number: "",
        industry: "",
        phone: "",
        address: "",
      });
      fetchCompanies();
    } catch (error) {
      console.error("Error creating company:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "고객사",
      align: "left",
      render: (company) => (
        <div>
          <div className="font-medium text-gray-900">{company.name}</div>
          {company.industry && (
            <div className="text-xs text-gray-500">{company.industry}</div>
          )}
        </div>
      ),
    },
    {
      key: "phone",
      header: "연락처",
      align: "left",
      render: (company) =>
        company.phone ? (
          <span className="inline-flex items-center gap-1 text-sm text-gray-600">
            <FiPhone className="w-3 h-3" />
            {company.phone}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "contacts_count",
      header: "담당자",
      align: "center",
      render: (company) => `${company.contacts_count ?? 0}명`,
    },
    {
      key: "leads_count",
      header: "영업기회",
      align: "center",
      render: (company) => `${company.leads_count ?? 0}건`,
    },
    {
      key: "primary_contact",
      header: "주 담당자",
      align: "left",
      render: (company) =>
        company.primary_contact ? (
          <span className="text-sm text-gray-700">
            {company.primary_contact.name}
            {company.primary_contact.phone
              ? ` · ${company.primary_contact.phone}`
              : ""}
          </span>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <BoardToolbar
        title="고객관리"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="btn-create flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            고객사 등록
          </button>
        }
      />

      <SearchFilterBar
        onSubmit={handleSearch}
        actions={
          <button type="submit" className="btn-search">
            검색
          </button>
        }
      >
        <div className="flex-1 relative min-w-[240px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="회사명, 사업자번호, 업종으로 검색.."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-search"
          />
        </div>
      </SearchFilterBar>

      <BoardTable
        columns={columns}
        rows={companies}
        loading={loading}
        onRowClick={(row) => navigate(`/operation/sales/customers/${row.id}`)}
      />

      <BoardPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        className="page-box"
      />

      {/* 고객사 추가 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="고객사 등록"
        size="md"
      >
        <form onSubmit={handleCreateCompany} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              회사명<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newCompany.name}
              onChange={(e) =>
                setNewCompany({ ...newCompany, name: e.target.value })
              }
              className="input-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업자번호
            </label>
            <input
              type="text"
              value={newCompany.business_number}
              onChange={(e) =>
                setNewCompany({
                  ...newCompany,
                  business_number: e.target.value,
                })
              }
              className="input-base"
              placeholder="000-00-00000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              업종
            </label>
            <input
              type="text"
              value={newCompany.industry}
              onChange={(e) =>
                setNewCompany({ ...newCompany, industry: e.target.value })
              }
              className="input-base"
              placeholder="건설, IT, 제조"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              연락처
            </label>
            <input
              type="text"
              value={newCompany.phone}
              onChange={(e) =>
                setNewCompany({ ...newCompany, phone: e.target.value })
              }
              className="input-base"
              placeholder="02-000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주소
            </label>
            <input
              type="text"
              value={newCompany.address}
              onChange={(e) =>
                setNewCompany({ ...newCompany, address: e.target.value })
              }
              className="input-base"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-cancel"
            >
              취소
            </button>
            <button type="submit" disabled={saving} className="btn-save">
              {saving ? "저장 중.." : "저장"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default CustomerList;
