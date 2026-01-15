// src/pages/operation/CustomerDetail.jsx
/**
 * 고객 상세 페이지
 */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiPhone,
  FiMail,
  FiUser,
} from "react-icons/fi";
import { CustomerService, SalesService } from "../../api/operation";
import Modal from "../../components/common/ui/Modal";

function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // 담당자 추가 모달
  const [contactModal, setContactModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    position: "",
    department: "",
    email: "",
    phone: "",
    mobile: "",
    is_primary: false,
  });
  const [saving, setSaving] = useState(false);

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    try {
      const [companyData, leadsData] = await Promise.all([
        CustomerService.getCompany(id),
        SalesService.getLeads({ company: id }),
      ]);
      setCompany(companyData);
      setLeads(leadsData.results || leadsData);
    } catch (error) {
      console.error("Error fetching company:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const handleAddContact = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await CustomerService.createContact({
        ...newContact,
        company: parseInt(id),
      });
      setContactModal(false);
      setNewContact({
        name: "",
        position: "",
        department: "",
        email: "",
        phone: "",
        mobile: "",
        is_primary: false,
      });
      fetchCompany();
    } catch (error) {
      console.error("Error creating contact:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm("정말 삭제하시겠습니까? 관련된 담당자 정보도 삭제됩니다.")
    )
      return;
    try {
      await CustomerService.deleteCompany(id);
      navigate("/operation/sales/customers");
    } catch (error) {
      console.error("Error deleting company:", error);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const formatAmount = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12 text-gray-500">
        고객사를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/operation/sales/customers")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-title">{company.name}</h1>
            {company.industry && (
              <p className="text-muted">{company.industry}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/operation/sales/customers/${id}/edit`)}
            className="btn-edit flex items-center gap-2"
          >
            <FiEdit2 className="w-4 h-4" />
            수정
          </button>
          <button
            onClick={handleDelete}
            className="btn-delete flex items-center gap-2"
          >
            <FiTrash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 기본 정보 */}
        <div className="space-y-6">
          <div className="page-box">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              기본 정보
            </h3>
            <div className="space-y-3 text-sm">
              {company.business_number && (
                <div>
                  <p className="text-gray-500">사업자번호</p>
                  <p className="text-gray-900">{company.business_number}</p>
                </div>
              )}
              {company.phone && (
                <div>
                  <p className="text-gray-500">대표전화</p>
                  <p className="text-gray-900">{company.phone}</p>
                </div>
              )}
              {company.website && (
                <div>
                  <p className="text-gray-500">웹사이트</p>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {company.website}
                  </a>
                </div>
              )}
              {company.address && (
                <div>
                  <p className="text-gray-500">주소</p>
                  <p className="text-gray-900">{company.address}</p>
                </div>
              )}
            </div>
          </div>

          {company.notes && (
            <div className="page-box">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">메모</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {company.notes}
              </p>
            </div>
          )}
        </div>

        {/* 중간: 담당자 */}
        <div className="page-box">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">담당자</h3>
            <button
              onClick={() => setContactModal(true)}
              className="btn-create-sm flex items-center gap-1"
            >
              <FiPlus className="w-3 h-3" />
              추가
            </button>
          </div>

          {company.contacts?.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              등록된 담당자가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {company.contacts?.map((contact) => (
                <div
                  key={contact.id}
                  className="p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FiUser className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {contact.name}
                      </span>
                      {contact.is_primary && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          주담당
                        </span>
                      )}
                    </div>
                    {contact.position && (
                      <span className="text-sm text-gray-500">
                        {contact.position}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    {contact.phone && (
                      <p className="flex items-center gap-2">
                        <FiPhone className="w-3 h-3" />
                        {contact.phone}
                      </p>
                    )}
                    {contact.email && (
                      <p className="flex items-center gap-2">
                        <FiMail className="w-3 h-3" />
                        {contact.email}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 우측: 관련 영업기회 */}
        <div className="page-box">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            관련 영업기회
          </h3>

          {leads.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              관련 영업기회가 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/operation/sales/leads/${lead.id}`)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: lead.stage_color + "20",
                        color: lead.stage_color,
                      }}
                    >
                      {lead.stage_name}
                    </span>
                    <span
                      className={`text-xs ${
                        lead.status === "won"
                          ? "text-green-600"
                          : lead.status === "lost"
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      {lead.status === "won"
                        ? "수주"
                        : lead.status === "lost"
                        ? "실주"
                        : "진행"}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {lead.title}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>{formatAmount(lead.expected_amount)}</span>
                    <span>{formatDate(lead.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 담당자 추가 모달 */}
      <Modal
        isOpen={contactModal}
        onClose={() => setContactModal(false)}
        title="담당자 추가"
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newContact.name}
                onChange={(e) =>
                  setNewContact({ ...newContact, name: e.target.value })
                }
                className="input-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                직위
              </label>
              <input
                type="text"
                value={newContact.position}
                onChange={(e) =>
                  setNewContact({ ...newContact, position: e.target.value })
                }
                className="input-base"
                placeholder="예: 과장, 부장"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              부서
            </label>
            <input
              type="text"
              value={newContact.department}
              onChange={(e) =>
                setNewContact({ ...newContact, department: e.target.value })
              }
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              type="email"
              value={newContact.email}
              onChange={(e) =>
                setNewContact({ ...newContact, email: e.target.value })
              }
              className="input-base"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                전화번호
              </label>
              <input
                type="text"
                value={newContact.phone}
                onChange={(e) =>
                  setNewContact({ ...newContact, phone: e.target.value })
                }
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                휴대전화
              </label>
              <input
                type="text"
                value={newContact.mobile}
                onChange={(e) =>
                  setNewContact({ ...newContact, mobile: e.target.value })
                }
                className="input-base"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_primary"
              checked={newContact.is_primary}
              onChange={(e) =>
                setNewContact({ ...newContact, is_primary: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="is_primary" className="text-sm text-gray-700">
              주 담당자로 지정
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setContactModal(false)}
              className="btn-cancel"
            >
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

export default CustomerDetail;
