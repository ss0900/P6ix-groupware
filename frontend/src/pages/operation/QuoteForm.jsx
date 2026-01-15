// src/pages/operation/QuoteForm.jsx
/**
 * 견적서 생성/수정
 */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiSend, FiEye } from "react-icons/fi";
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
    title: "",
    template: "",
    header_text: "",
    footer_text: "",
    terms: "",
    tax_rate: 10,
    valid_until: "",
    notes: "",
  });

  const [items, setItems] = useState([
    {
      name: "",
      description: "",
      specification: "",
      unit: "EA",
      quantity: 1,
      unit_price: 0,
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
        title: data.title || "",
        template: data.template || "",
        header_text: data.header_text || "",
        footer_text: data.footer_text || "",
        terms: data.terms || "",
        tax_rate: data.tax_rate ?? 10,
        valid_until: data.valid_until || "",
        notes: data.notes || "",
      });

      if (data.company) {
        const companyData = await CustomerService.getCompany(data.company);
        setContacts(companyData.contacts || []);
      }

      const mappedItems =
        data.items?.length > 0
          ? data.items.map((item) => ({
              name: item.name || "",
              description: item.description || "",
              specification: item.specification || "",
              unit: item.unit || "EA",
              quantity: Number(item.quantity || 0),
              unit_price: Number(item.unit_price || 0),
            }))
          : [
              {
                name: "",
                description: "",
                specification: "",
                unit: "EA",
                quantity: 1,
                unit_price: 0,
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
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
    const taxAmount = Math.floor((subtotal * formData.tax_rate) / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
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
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="page-box">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            기본 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div className="md:col-span-2">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                유효기간
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) =>
                  setFormData({ ...formData, valid_until: e.target.value })
                }
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                세율 (%)
              </label>
              <input
                type="number"
                value={formData.tax_rate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tax_rate: parseFloat(e.target.value) || 0,
                  })
                }
                className="input-base"
                min="0"
                max="100"
              />
            </div>
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
                  <th className="doc-th text-left" style={{ width: "25%" }}>
                    항목명
                  </th>
                  <th className="doc-th text-left" style={{ width: "15%" }}>
                    규격
                  </th>
                  <th className="doc-th text-center" style={{ width: "8%" }}>
                    단위
                  </th>
                  <th className="doc-th text-right col-number">수량</th>
                  <th className="doc-th text-right col-number">단가</th>
                  <th className="doc-th text-right col-number">금액</th>
                  <th className="doc-th-end text-center col-delete">삭제</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          handleItemChange(index, "name", e.target.value)
                        }
                        className="input-sm"
                        placeholder="항목명"
                      />
                    </td>
                    <td className="px-2 py-2">
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
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          handleItemChange(index, "unit", e.target.value)
                        }
                        className="input-sm text-center"
                      />
                    </td>
                    <td className="px-2 py-2">
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
                    <td className="px-2 py-2">
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
                        className="input-sm text-right"
                        min="0"
                      />
                    </td>
                    <td className="px-2 py-2 text-right text-sm font-medium">
                      {formatAmount(item.quantity * item.unit_price)}
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
                    colSpan={5}
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
                    colSpan={5}
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
                    colSpan={5}
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                거래조건
              </label>
              <textarea
                value={formData.terms}
                onChange={(e) =>
                  setFormData({ ...formData, terms: e.target.value })
                }
                className="input-base"
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비고
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="input-base"
                rows={2}
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
