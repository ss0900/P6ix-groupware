// src/pages/operation/CustomerList.jsx
/**
 * 고객 관리 - 고객사 목록
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiSearch, FiUsers, FiPhone, FiTarget } from "react-icons/fi";
import { CustomerService } from "../../api/operation";
import Modal from "../../components/common/ui/Modal";

function CustomerList() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
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
      const params = {};
      if (searchQuery) params.search = searchQuery;
      
      const data = await CustomerService.getCompanies(params);
      setCompanies(data.results || data);
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCompanies();
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await CustomerService.createCompany(newCompany);
      setShowModal(false);
      setNewCompany({ name: "", business_number: "", industry: "", phone: "", address: "" });
      fetchCompanies();
    } catch (error) {
      console.error("Error creating company:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiUsers className="w-6 h-6 text-blue-600" />
          <h1 className="text-title">고객관리</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-create flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          고객사 등록
        </button>
      </div>

      {/* Search */}
      <div className="page-box">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="회사명, 사업자번호, 업종으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-search"
            />
          </div>
          <button type="submit" className="btn-search">검색</button>
        </form>
      </div>

      {/* List */}
      <div className="page-box">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12">
            <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">등록된 고객사가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => navigate(`/operation/customers/${company.id}`)}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md cursor-pointer transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{company.name}</h3>
                {company.industry && (
                  <p className="text-sm text-gray-500 mb-2">{company.industry}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {company.phone && (
                    <span className="flex items-center gap-1">
                      <FiPhone className="w-4 h-4" />
                      {company.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <FiUsers className="w-4 h-4" />
                    담당자 {company.contacts_count}명
                  </span>
                  <span className="flex items-center gap-1">
                    <FiTarget className="w-4 h-4" />
                    영업 {company.leads_count}건
                  </span>
                </div>
                {company.primary_contact && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400">주 담당자</p>
                    <p className="text-sm text-gray-700">
                      {company.primary_contact.name}
                      {company.primary_contact.phone && ` · ${company.primary_contact.phone}`}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 고객사 추가 모달 */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="고객사 등록" size="md">
        <form onSubmit={handleCreateCompany} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              회사명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newCompany.name}
              onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
              className="input-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사업자번호</label>
            <input
              type="text"
              value={newCompany.business_number}
              onChange={(e) => setNewCompany({ ...newCompany, business_number: e.target.value })}
              className="input-base"
              placeholder="000-00-00000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">업종</label>
            <input
              type="text"
              value={newCompany.industry}
              onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
              className="input-base"
              placeholder="예: 건설, IT, 제조"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">대표전화</label>
            <input
              type="text"
              value={newCompany.phone}
              onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
              className="input-base"
              placeholder="02-000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
            <input
              type="text"
              value={newCompany.address}
              onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
              className="input-base"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
              취소
            </button>
            <button type="submit" disabled={saving} className="btn-save">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default CustomerList;
