// src/pages/operation/LeadForm.jsx
/**
 * 영업기회 생성/수정 폼
 */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { SalesService, CustomerService } from "../../api/operation";

function LeadForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    pipeline: "",
    stage: "",
    company: "",
    contact: "",
    expected_amount: "",
    expected_close_date: "",
    probability: "",
    source: "",
    next_action_due_at: "",
  });

  const fetchMasterData = useCallback(async () => {
    try {
      const [pipelinesData, companiesData] = await Promise.all([
        SalesService.getPipelines(),
        CustomerService.getCompanies(),
      ]);
      setPipelines(pipelinesData);
      setCompanies(companiesData.results || companiesData);
      
      // 기본 파이프라인 선택
      if (pipelinesData.length > 0 && !formData.pipeline) {
        const defaultPipeline = pipelinesData.find(p => p.is_default) || pipelinesData[0];
        setFormData(prev => ({ ...prev, pipeline: defaultPipeline.id }));
        
        // 단계 로드
        const stagesData = await SalesService.getStages(defaultPipeline.id);
        setStages(stagesData);
        if (stagesData.length > 0) {
          setFormData(prev => ({ ...prev, stage: stagesData[0].id }));
        }
      }
    } catch (error) {
      console.error("Error fetching master data:", error);
    }
  }, [formData.pipeline]);

  const fetchLead = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await SalesService.getLead(id);
      setFormData({
        title: data.title || "",
        description: data.description || "",
        pipeline: data.pipeline || "",
        stage: data.stage || "",
        company: data.company || "",
        contact: data.contact || "",
        expected_amount: data.expected_amount || "",
        expected_close_date: data.expected_close_date || "",
        probability: data.probability || "",
        source: data.source || "",
        next_action_due_at: data.next_action_due_at ? data.next_action_due_at.slice(0, 16) : "",
      });
      
      // 단계 로드
      if (data.pipeline) {
        const stagesData = await SalesService.getStages(data.pipeline);
        setStages(stagesData);
      }
      
      // 담당자 로드
      if (data.company) {
        const companyData = await CustomerService.getCompany(data.company);
        setContacts(companyData.contacts || []);
      }
    } catch (error) {
      console.error("Error fetching lead:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const handlePipelineChange = async (pipelineId) => {
    setFormData(prev => ({ ...prev, pipeline: pipelineId, stage: "" }));
    
    try {
      const stagesData = await SalesService.getStages(pipelineId);
      setStages(stagesData);
      if (stagesData.length > 0) {
        setFormData(prev => ({ ...prev, stage: stagesData[0].id }));
      }
    } catch (error) {
      console.error("Error fetching stages:", error);
    }
  };

  const handleCompanyChange = async (companyId) => {
    setFormData(prev => ({ ...prev, company: companyId, contact: "" }));
    
    if (companyId) {
      try {
        const companyData = await CustomerService.getCompany(companyId);
        setContacts(companyData.contacts || []);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    } else {
      setContacts([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const data = {
        ...formData,
        expected_amount: formData.expected_amount || null,
        expected_close_date: formData.expected_close_date || null,
        probability: formData.probability || 0,
        company: formData.company || null,
        contact: formData.contact || null,
        next_action_due_at: formData.next_action_due_at || null,
      };
      
      if (isEdit) {
        await SalesService.updateLead(id, data);
      } else {
        await SalesService.createLead(data);
      }
      
      navigate("/operation/leads");
    } catch (error) {
      console.error("Error saving lead:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-title">{isEdit ? "영업기회 수정" : "새 영업기회"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="page-box space-y-6">
        {/* 기본 정보 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">기본 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목 (현장/프로젝트명) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-base"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">파이프라인</label>
              <select
                value={formData.pipeline}
                onChange={(e) => handlePipelineChange(parseInt(e.target.value))}
                className="input-base"
              >
                <option value="">선택</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">단계</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: parseInt(e.target.value) })}
                className="input-base"
              >
                <option value="">선택</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-base"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* 고객 정보 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">고객 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">고객사</label>
              <select
                value={formData.company}
                onChange={(e) => handleCompanyChange(parseInt(e.target.value) || "")}
                className="input-base"
              >
                <option value="">선택</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
              <select
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: parseInt(e.target.value) || "" })}
                className="input-base"
                disabled={!formData.company}
              >
                <option value="">선택</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.position && `(${c.position})`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 금액/일정 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">금액/일정</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">예상 금액</label>
              <input
                type="number"
                value={formData.expected_amount}
                onChange={(e) => setFormData({ ...formData, expected_amount: e.target.value })}
                className="input-base"
                placeholder="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">예상 마감일</label>
              <input
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                className="input-base"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">확률 (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                className="input-base"
                placeholder="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">다음 액션 예정일</label>
              <input
                type="datetime-local"
                value={formData.next_action_due_at}
                onChange={(e) => setFormData({ ...formData, next_action_due_at: e.target.value })}
                className="input-base"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">유입 경로</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="input-base"
                placeholder="예: 홈페이지, 소개, 광고"
              />
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate(-1)} className="btn-cancel">
            취소
          </button>
          <button type="submit" disabled={saving} className="btn-save flex items-center gap-2">
            <FiSave className="w-4 h-4" />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LeadForm;
