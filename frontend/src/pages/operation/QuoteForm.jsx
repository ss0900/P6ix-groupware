// src/pages/operation/QuoteForm.jsx
/**
 * 견적서 생성/수정
 */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiSend, FiEye, FiCheck, FiX } from "react-icons/fi";
import {
  QuoteService,
  SalesService,
  CustomerService,
} from "../../api/operation";

function QuoteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead");
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState("draft");

  const [leads, setLeads] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [formData, setFormData] = useState({
    lead: leadId || "",
    company: "",
    contact: "",
    recipient_company: "",
    recipient_name: "",
    recipient_email: "",
    cc_email: "",
    
    quote_number: "",
    revision: 1,
    issue_date: new Date().toISOString().split('T')[0],
    validity_days: 30,
    valid_until: "",
    
    title: "",
    template: "",
    
    header_text: "",
    footer_text: "",
    
    terms: "",
    delivery_terms: "",
    payment_method: "",
    
    tax_mode: "exclusive",
    rounding_rule: "floor",
    rounding_unit: 10,
    tax_rate: 10,
    
    notes: "", // Legacy
    internal_notes: "",
    customer_notes: "",
    show_notes_on_separate_page: false,
  });

  const [items, setItems] = useState([
    {
      section: "",
      name: "",
      description: "",
      specification: "",
      unit: "EA",
      quantity: 1,
      unit_price: 0,
      remarks: "",
      discount_rate: 0,
      is_discount_line: false,
    },
  ]);

  const fetchMasterData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsData, companiesData, templatesData] = await Promise.all([
        SalesService.getLeads({ status: "active" }),
        CustomerService.getCompanies(),
        QuoteService.getTemplates(),
      ]);

      setLeads(leadsData.results || leadsData);
      setCompanies(companiesData.results || companiesData);
      setTemplates(templatesData);

      if (leadId) {
        const lead = (leadsData.results || leadsData).find(
          (l) => l.id === parseInt(leadId)
        );
        if (lead) {
          setFormData((prev) => ({
            ...prev,
            lead: lead.id,
            company: lead.company || "",
            contact: lead.contact || "",
            title: lead.title,
            // 기본 수신처 정보 세팅
            recipient_company: lead.company_name || "", // if serializer provides it
            recipient_name: lead.contact_name || "",
          }));

          if (lead.company) {
            const companyData = await CustomerService.getCompany(lead.company);
            setContacts(companyData.contacts || []);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching master data:", error);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const fetchQuote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await QuoteService.getQuote(id);
      setQuoteStatus(data.status || "draft");
      setFormData({
        lead: data.lead || "",
        company: data.company || "",
        contact: data.contact || "",
        
        quote_number: data.quote_number || "",
        revision: data.revision || 1,
        issue_date: data.issue_date || new Date().toISOString().split('T')[0],
        validity_days: data.validity_days || 30,
        valid_until: data.valid_until || "",
        
        recipient_company: data.recipient_company || "",
        recipient_name: data.recipient_name || "",
        recipient_email: data.recipient_email || "",
        cc_email: data.cc_email || "",

        title: data.title || "",
        template: data.template || "",
        
        header_text: data.header_text || "",
        footer_text: data.footer_text || "",
        
        terms: data.terms || "",
        delivery_terms: data.delivery_terms || "",
        payment_method: data.payment_method || "",

        tax_mode: data.tax_mode || "exclusive",
        rounding_rule: data.rounding_rule || "floor",
        rounding_unit: data.rounding_unit || 10,
        tax_rate: data.tax_rate ?? 10,

        notes: data.notes || "",
        internal_notes: data.internal_notes || "",
        customer_notes: data.customer_notes || "",
        show_notes_on_separate_page: data.show_notes_on_separate_page || false,
      });

      if (data.company) {
        const companyData = await CustomerService.getCompany(data.company);
        setContacts(companyData.contacts || []);
      }

      const mappedItems =
        data.items?.length > 0
          ? data.items.map((item) => ({
              section: item.section || "",
              name: item.name || "",
              description: item.description || "",
              specification: item.specification || "",
              unit: item.unit || "EA",
              quantity: Number(item.quantity || 0),
              unit_price: Number(item.unit_price || 0),
              remarks: item.remarks || "",
              discount_rate: Number(item.discount_rate || 0),
              is_discount_line: item.is_discount_line || false,
            }))
          : [
              {
                section: "",
                name: "",
                description: "",
                specification: "",
                unit: "EA",
                quantity: 1,
                unit_price: 0,
                remarks: "",
                is_discount_line: false,
              },
            ];
      setItems(mappedItems);
    } catch (error) {
      console.error("Error fetching quote:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleLeadChange = async (leadIdValue) => {
    const lead = leads.find((l) => l.id === parseInt(leadIdValue));
    setFormData((prev) => ({
      ...prev,
      lead: leadIdValue,
      company: lead?.company || "",
      contact: lead?.contact || "",
      title: lead?.title || prev.title,
    }));

    if (lead?.company) {
      const companyData = await CustomerService.getCompany(lead.company);
      setContacts(companyData.contacts || []);
    } else {
      setContacts([]);
    }
  };

  const handleCompanyChange = async (companyId) => {
    setFormData((prev) => ({ ...prev, company: companyId, contact: "" }));

    if (companyId) {
      const companyData = await CustomerService.getCompany(companyId);
      setContacts(companyData.contacts || []);
    } else {
      setContacts([]);
    }
  };

  const handleTemplateChange = async (templateId) => {
    setFormData((prev) => ({ ...prev, template: templateId }));

    if (templateId) {
      const template = templates.find((t) => t.id === parseInt(templateId));
      if (template) {
        setFormData((prev) => ({
          ...prev,
          header_text: template.header_text,
          footer_text: template.footer_text,
          terms: template.terms,
        }));
      }
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        name: "",
        description: "",
        specification: "",
        unit: "EA",
        quantity: 1,
        unit_price: 0,
      },
    ]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    // 1. Calculate Sum of Items
    const sum = items.reduce((acc, item) => {
      const amount = item.quantity * item.unit_price;
      return item.is_discount_line ? acc - Math.abs(amount) : acc + amount;
    }, 0);

    let subtotal = 0;
    let taxAmount = 0;
    let total = 0;

    // 2. Apply Tax Mode
    if (formData.tax_mode === 'inclusive') {
        // VAT 포함인 경우: 합계에서 세액 역산
        // Subtotal = Sum / (1 + Rate/100)
        total = sum;
        subtotal = Math.round(sum / (1 + formData.tax_rate / 100));
        taxAmount = total - subtotal;
    } else if (formData.tax_mode === 'exempt') {
        // 면세
        subtotal = sum;
        taxAmount = 0;
        total = subtotal;
    } else {
        // VAT 별도 (Default)
        subtotal = sum;
        taxAmount = Math.floor((subtotal * formData.tax_rate) / 100);
        total = subtotal + taxAmount;
    }
    
    // 3. Rounding (단수처리) - Total 기준 적용
    // Rule: floor(내림), round(반올림), ceil(올림)
    // Unit: 1, 10, 100, 1000
    const rule = formData.rounding_rule || 'floor';
    const unit = formData.rounding_unit || 1;
    
    if (unit > 1) {
        if (rule === 'floor') {
            total = Math.floor(total / unit) * unit;
        } else if (rule === 'ceil') {
            total = Math.ceil(total / unit) * unit;
        } else {
            total = Math.round(total / unit) * unit;
        }
        // 역산 재조정 (세액 = Total - Subtotal) or 공급가 조정?
        // 통상 총액을 맞추고 세액을 조정함.
        if (formData.tax_mode === 'exclusive') {
             // 별도 과세일 때 단수처리는 보통 잘 안하지만, 한다면 세액을 조정?
             // 또는 총액 Rounding 후 Tax Amount 조정
             // 여기서는 총액을 깎고, 차액을 세액에서 뺌
             // (단순화를 위해 Total 변경만 반영)
        }
    }

    return { subtotal, taxAmount, total };
  };

  const handlePreviewPdf = async () => {
    if (!id) return;
    try {
      const data = await QuoteService.renderPdf(id);
      if (data?.pdf_url) {
        window.open(data.pdf_url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Error rendering PDF:", error);
    }
  };

  const handleSendQuote = async () => {
    if (!id) return;
    if (!window.confirm("견적서를 발송하시겠습니까?")) return;
    try {
      await QuoteService.sendQuote(id);
      setQuoteStatus("sent");
      fetchQuote();
    } catch (error) {
      console.error("Error sending quote:", error);
    }
  };

  const handleAccept = async () => {
    if (!window.confirm("이 견적을 수락 처리하시겠습니까?")) return;
    try {
      await QuoteService.acceptQuote(id);
      setQuoteStatus("accepted");
      fetchQuote();
    } catch (error) {
      console.error("Error accepting quote:", error);
    }
  };

  const handleReject = async () => {
    if (!window.confirm("이 견적을 거절 처리하시겠습니까?")) return;
    try {
      await QuoteService.rejectQuote(id);
      setQuoteStatus("rejected");
      fetchQuote();
    } catch (error) {
      console.error("Error rejecting quote:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lead) {
      alert("영업기회를 선택해주세요.");
      return;
    }
    setSaving(true);

    try {
      const data = {
        ...formData,
        lead: formData.lead || null,
        company: formData.company || null,
        contact: formData.contact || null,
        template: formData.template || null,
        valid_until: formData.valid_until || null,
        items: items.filter((item) => item.name.trim()),
      };

      if (isEdit) {
        await QuoteService.updateQuote(id, data);
      } else {
        await QuoteService.createQuote(data);
      }

      navigate("/operation/sales/quotes");
    } catch (error) {
      console.error("Error saving quote:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  const totals = calculateTotal();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-title">
              {isEdit ? "견적서 수정" : "견적서 생성"}
            </h1>
            {isEdit && (
              <p className="text-muted-sm">상태: {quoteStatus}</p>
            )}
          </div>
        </div>
        {isEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreviewPdf}
              className="btn-basic flex items-center gap-2"
            >
              <FiEye className="w-4 h-4" />
              PDF 미리보기
            </button>
            {quoteStatus === "draft" && (
              <button
                type="button"
                onClick={handleSendQuote}
                className="btn-primary flex items-center gap-2"
              >
                <FiSend className="w-4 h-4" />
                발송
              </button>
            )}
            {quoteStatus === "sent" && (
              <>
                <button
                  type="button"
                  onClick={handleAccept}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <FiCheck className="w-4 h-4" />
                  수락
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <FiX className="w-4 h-4" />
                  거절
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="page-box">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            기본 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. 기본 메타데이터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                견적번호 (Auto)
              </label>
              <input
                type="text"
                value={formData.quote_number || "(저장시 생성)"}
                disabled
                className="input-base bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                리비전
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.revision}
                  disabled
                  className="input-base bg-gray-50 w-20"
                />
                <span className="text-xs text-gray-500">수정 시 자동증가</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                견적일자
              </label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                유효기간 (일)
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.validity_days}
                  onChange={(e) => setFormData({ ...formData, validity_days: Number(e.target.value) })}
                  className="input-base"
                >
                  <option value="15">15일</option>
                  <option value="30">30일</option>
                  <option value="60">60일</option>
                  <option value="90">90일</option>
                  <option value="0">직접지정</option>
                </select>
                {formData.validity_days === 0 && (
                   <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="input-base"
                  />
                )}
              </div>
            </div>

            {/* 2. 연결 정보 (CRM) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                영업기회 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.lead}
                onChange={(e) => handleLeadChange(e.target.value)}
                className="input-base"
                required
              >
                <option value="">선택</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                고객사
              </label>
              <select
                value={formData.company}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="input-base"
              >
                <option value="">선택</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                담당자
              </label>
              <select
                value={formData.contact}
                onChange={(e) =>
                  setFormData({ ...formData, contact: e.target.value })
                }
                className="input-base"
                disabled={!formData.company}
              >
                <option value="">선택</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                견적 제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="input-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                템플릿
              </label>
              <select
                value={formData.template}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="input-base"
              >
                <option value="">선택</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Hidden/Replaced Fields */}
            {/* 유효기간, 세율 등은 위로 이동됨 */}
          </div>
        </div>

        <div className="page-box">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">견적 항목</h3>
            <button
              type="button"
              onClick={addItem}
              className="btn-create-sm flex items-center gap-1"
            >
              <FiPlus className="w-3 h-3" />
              항목 추가
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="doc-thead">
                <tr>
                  <th className="doc-th text-center" style={{ width: "8%" }}>구분</th>
                  <th className="doc-th text-left" style={{ width: "20%" }}>항목명/설명</th>
                  <th className="doc-th text-left" style={{ width: "12%" }}>규격</th>
                  <th className="doc-th text-center" style={{ width: "8%" }}>단위</th>
                  <th className="doc-th text-right col-number">수량</th>
                  <th className="doc-th text-right col-number">단가/할인율</th>
                  <th className="doc-th text-right col-number">금액</th>
                  <th className="doc-th text-left" style={{ width: "10%" }}>비고</th>
                  <th className="doc-th-end text-center col-delete">삭제</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="px-2 py-2 align-top">
                      <input
                        type="text"
                        value={item.section}
                        onChange={(e) => handleItemChange(index, "section", e.target.value)}
                        className="input-sm text-center mb-1"
                        placeholder="섹션"
                      />
                      <div className="flex items-center justify-center gap-1">
                         <input 
                           type="checkbox" 
                           checked={item.is_discount_line} 
                           onChange={(e) => handleItemChange(index, "is_discount_line", e.target.checked)}
                           title="할인 행 여부"
                         />
                         <span className="text-xs text-gray-400">할인</span>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          handleItemChange(index, "name", e.target.value)
                        }
                        className="input-sm font-semibold mb-1"
                        placeholder="항목명"
                      />
                      <textarea
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        className="input-sm text-xs text-gray-600 resize-none"
                        rows={2}
                        placeholder="상세 설명"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="text"
                        value={item.specification}
                        onChange={(e) =>
                          handleItemChange(index, "specification", e.target.value)
                        }
                        className="input-sm"
                        placeholder="규격"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          handleItemChange(index, "unit", e.target.value)
                        }
                        className="input-sm text-center"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="input-sm text-right"
                        min="0"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "unit_price",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className={`input-sm text-right ${item.is_discount_line ? "text-red-500" : ""}`}
                        placeholder={item.is_discount_line ? "할인율%" : "단가"}
                      />
                    </td>
                    <td className="px-2 py-2 text-right text-sm font-medium align-top">
                      {item.is_discount_line 
                        ? <span className="text-red-600">-{formatAmount(Math.abs(item.quantity * item.unit_price))}</span>
                        : formatAmount(item.quantity * item.unit_price)
                      }
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={(e) =>
                          handleItemChange(index, "remarks", e.target.value)
                        }
                        className="input-sm"
                        placeholder="비고"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 disabled:text-gray-300"
                        disabled={items.length === 1}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td
                    colSpan={7}
                    className="px-3 py-2 text-right text-sm font-medium"
                  >
                    공급가액
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-medium">
                    {formatAmount(totals.subtotal)}
                  </td>
                  <td></td>
                </tr>
                <tr className="bg-gray-50">
                  <td
                    colSpan={7}
                    className="px-3 py-2 text-right text-sm font-medium"
                  >
                    세액 ({formData.tax_rate}%)
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-medium">
                    {formatAmount(totals.taxAmount)}
                  </td>
                  <td></td>
                </tr>
                <tr className="bg-blue-50">
                  <td
                    colSpan={7}
                    className="px-3 py-2 text-right text-sm font-bold text-blue-700"
                  >
                    합계
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-blue-700">
                    {formatAmount(totals.total)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="page-box">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            추가 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                머리말
              </label>
              <textarea
                value={formData.header_text}
                onChange={(e) =>
                  setFormData({ ...formData, header_text: e.target.value })
                }
                className="input-base"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                꼬리말
              </label>
              <textarea
                value={formData.footer_text}
                onChange={(e) =>
                  setFormData({ ...formData, footer_text: e.target.value })
                }
                className="input-base"
                rows={3}
              />
            </div>
            {/* Additional Info Revisions */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                거래조건 (Payment Terms & Scope)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <input 
                  type="text" 
                  className="input-base" 
                  placeholder="납품기한 (예: 발주 후 2주)"
                  value={formData.delivery_terms}
                  onChange={(e) => setFormData({...formData, delivery_terms: e.target.value})}
                />
                <input 
                  type="text" 
                  className="input-base" 
                  placeholder="결제조건 (예: 현금 100%)"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                />
              </div>
              <textarea
                value={formData.terms}
                onChange={(e) =>
                  setFormData({ ...formData, terms: e.target.value })
                }
                className="input-base"
                rows={3}
                placeholder="상세 거래조건 텍스트"
              />
            </div>

            {/* Notes Split */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                고객 비고 (Customer Notes)
              </label>
              <textarea
                value={formData.customer_notes}
                onChange={(e) =>
                  setFormData({ ...formData, customer_notes: e.target.value })
                }
                className="input-base"
                rows={4}
                placeholder="견적서 PDF에 출력됩니다."
              />
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="sep_page"
                  checked={formData.show_notes_on_separate_page}
                  onChange={(e) => setFormData({...formData, show_notes_on_separate_page: e.target.checked})}
                />
                <label htmlFor="sep_page" className="text-sm text-gray-600">별도 페이지에 출력</label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                내부 메모 (Internal Only)
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) =>
                  setFormData({ ...formData, internal_notes: e.target.value })
                }
                className="input-base bg-yellow-50"
                rows={4}
                placeholder="고객에게 보이지 않는 내부 기록용입니다."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-cancel"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-save flex items-center gap-2"
          >
            <FiSave className="w-4 h-4" />
            {saving ? "저장 중.." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default QuoteForm;
