// src/pages/operation/QuoteForm.jsx
/**
 * 견적서 생성/수정 (PMIS 문서 스타일)
 * - PageHeader, TableCell 공통 컴포넌트 활용
 * - 문서 양식 스타일 레이아웃
 */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiSave,
  FiPlus,
  FiTrash2,
  FiSend,
  FiEye,
  FiCheck,
  FiX,
  FiPrinter,
  FiMinus,
} from "react-icons/fi";
import {
  QuoteService,
  SalesService,
  CustomerService,
} from "../../api/operation";
import PageHeader from "../../components/common/ui/PageHeader";
import TableCell from "../../components/common/ui/TableCell";

// 한글 금액 변환 (프론트 미리보기용)
const numberToKorean = (amount) => {
  if (amount === 0) return "영";
  const units = ["", "만", "억", "조"];
  const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const subUnits = ["", "십", "백", "천"];

  let result = [];
  let unitIdx = 0;
  let n = Math.abs(amount);

  while (n > 0) {
    const chunk = n % 10000;
    n = Math.floor(n / 10000);

    if (chunk > 0) {
      let chunkStr = "";
      let subIdx = 0;
      let c = chunk;
      while (c > 0) {
        const digit = c % 10;
        c = Math.floor(c / 10);
        if (digit > 0) {
          if (digit === 1 && subIdx > 0) {
            chunkStr = subUnits[subIdx] + chunkStr;
          } else {
            chunkStr = digits[digit] + subUnits[subIdx] + chunkStr;
          }
        }
        subIdx++;
      }
      result.unshift(chunkStr + units[unitIdx]);
    }
    unitIdx++;
  }

  return result.join("");
};

// 라운딩 적용
const applyRounding = (amount, roundingType, roundingUnit) => {
  if (roundingUnit <= 1) return amount;
  switch (roundingType) {
    case "floor":
      return Math.floor(amount / roundingUnit) * roundingUnit;
    case "round":
      return Math.round(amount / roundingUnit) * roundingUnit;
    case "ceil":
      return Math.ceil(amount / roundingUnit) * roundingUnit;
    default:
      return amount;
  }
};

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
    revision: 1,
    attachment_label: "",
    recipient_label: "",
    cc_recipients: "",
    issue_date: new Date().toISOString().split("T")[0],
    validity_type: "days",
    validity_days: 30,
    valid_until: "",
    delivery_date: "",
    delivery_note: "",
    payment_terms: "",
    header_text: "",
    footer_text: "",
    terms: "",
    tax_mode: "exclusive",
    tax_rate: 10,
    rounding_type: "floor",
    rounding_unit: 1000,
    customer_notes: "",
    internal_memo: "",
    show_notes_on_separate_page: false,
    notes: "",
  });

  const [items, setItems] = useState([
    {
      category: "",
      name: "",
      description: "",
      specification: "",
      unit: "식",
      quantity: 1,
      unit_price: 0,
      discount_type: "none",
      discount_value: 0,
      is_discount_item: false,
      remarks: "",
    },
  ]);

  // 마스터 데이터 로드
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
          (l) => l.id === parseInt(leadId),
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

  // 견적서 로드
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
        revision: data.revision ?? 1,
        attachment_label: data.attachment_label || "",
        recipient_label: data.recipient_label || "",
        cc_recipients: data.cc_recipients || "",
        issue_date: data.issue_date || new Date().toISOString().split("T")[0],
        validity_type: data.validity_type || "days",
        validity_days: data.validity_days ?? 30,
        valid_until: data.valid_until || "",
        delivery_date: data.delivery_date || "",
        delivery_note: data.delivery_note || "",
        payment_terms: data.payment_terms || "",
        header_text: data.header_text || "",
        footer_text: data.footer_text || "",
        terms: data.terms || "",
        tax_mode: data.tax_mode || "exclusive",
        tax_rate: data.tax_rate ?? 10,
        rounding_type: data.rounding_type || "floor",
        rounding_unit: data.rounding_unit ?? 1000,
        customer_notes: data.customer_notes || "",
        internal_memo: data.internal_memo || "",
        show_notes_on_separate_page: data.show_notes_on_separate_page || false,
        notes: data.notes || "",
      });

      if (data.company) {
        const companyData = await CustomerService.getCompany(data.company);
        setContacts(companyData.contacts || []);
      }

      const mappedItems =
        data.items?.length > 0
          ? data.items.map((item) => ({
              category: item.category || "",
              name: item.name || "",
              description: item.description || "",
              specification: item.specification || "",
              unit: item.unit || "식",
              quantity: Number(item.quantity || 0),
              unit_price: Number(item.unit_price || 0),
              discount_type: item.discount_type || "none",
              discount_value: Number(item.discount_value || 0),
              is_discount_item: item.is_discount_item || false,
              remarks: item.remarks || "",
            }))
          : [
              {
                category: "",
                name: "",
                description: "",
                specification: "",
                unit: "식",
                quantity: 1,
                unit_price: 0,
                discount_type: "none",
                discount_value: 0,
                is_discount_item: false,
                remarks: "",
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

  // 이벤트 핸들러
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
        category: "",
        name: "",
        description: "",
        specification: "",
        unit: "식",
        quantity: 1,
        unit_price: 0,
        discount_type: "none",
        discount_value: 0,
        is_discount_item: false,
        remarks: "",
      },
    ]);
  };

  const addDiscountItem = () => {
    setItems([
      ...items,
      {
        category: "",
        name: "제품 할인 가(10% 할인)",
        description: "",
        specification: "",
        unit: "식",
        quantity: 1,
        unit_price: 0,
        discount_type: "none",
        discount_value: 0,
        is_discount_item: true,
        remarks: "",
      },
    ]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // 금액 계산
  const calculateItemAmount = (item) => {
    const base = item.quantity * item.unit_price;
    if (item.is_discount_item) return -Math.abs(base);
    if (item.discount_type === "percent" && item.discount_value > 0) {
      return base - Math.floor((base * item.discount_value) / 100);
    }
    if (item.discount_type === "amount" && item.discount_value > 0) {
      return base - item.discount_value;
    }
    return base;
  };

  const calculateTotal = () => {
    const rawSubtotal = items.reduce(
      (sum, item) => sum + calculateItemAmount(item),
      0,
    );

    const { tax_mode, tax_rate, rounding_type, rounding_unit } = formData;

    let subtotal, taxAmount, total;

    if (tax_mode === "exempt") {
      subtotal = applyRounding(rawSubtotal, rounding_type, rounding_unit);
      taxAmount = 0;
      total = subtotal;
    } else if (tax_mode === "inclusive") {
      const totalBefore = rawSubtotal;
      const subtotalBefore = Math.floor(totalBefore / (1 + tax_rate / 100));
      const taxBefore = totalBefore - subtotalBefore;
      subtotal = applyRounding(subtotalBefore, rounding_type, rounding_unit);
      taxAmount = applyRounding(taxBefore, rounding_type, rounding_unit);
      total = subtotal + taxAmount;
    } else {
      subtotal = applyRounding(rawSubtotal, rounding_type, rounding_unit);
      taxAmount = applyRounding(
        Math.floor((subtotal * tax_rate) / 100),
        rounding_type,
        rounding_unit,
      );
      total = subtotal + taxAmount;
    }

    const totalKorean = `금 ${numberToKorean(total)}원정`;
    return { subtotal, taxAmount, total, totalKorean };
  };

  // 액션 핸들러
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
        delivery_date: formData.delivery_date || null,
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

  const formatAmount = (amount) =>
    new Intl.NumberFormat("ko-KR").format(amount);

  const totals = calculateTotal();

  const taxModeLabel = {
    exclusive: "VAT 별도",
    inclusive: "VAT 포함",
    exempt: "면세",
  };

  const roundingLabel = {
    floor: "절사",
    round: "반올림",
    ceil: "올림",
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 페이지 헤더 */}
      <PageHeader
        title={isEdit ? "견적서 수정" : "견적서 작성"}
        subtitle={isEdit ? `상태: ${quoteStatus}` : "아래 정보를 입력하여 견적서를 작성합니다."}
      >
        <button onClick={() => navigate(-1)} className="btn-basic flex items-center gap-1">
          <FiArrowLeft className="w-4 h-4" /> 목록으로
        </button>
        {isEdit && (
          <>
            <button onClick={handlePreviewPdf} className="btn-basic flex items-center gap-2">
              <FiEye className="w-4 h-4" /> PDF 미리보기
            </button>
            <button onClick={() => window.print()} className="btn-basic flex items-center gap-2">
              <FiPrinter className="w-4 h-4" /> 인쇄
            </button>
            {quoteStatus === "draft" && (
              <button onClick={handleSendQuote} className="btn-primary flex items-center gap-2">
                <FiSend className="w-4 h-4" /> 발송
              </button>
            )}
            {quoteStatus === "sent" && (
              <>
                <button onClick={handleAccept} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium">
                  <FiCheck className="w-4 h-4" /> 수락
                </button>
                <button onClick={handleReject} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-medium">
                  <FiX className="w-4 h-4" /> 거절
                </button>
              </>
            )}
          </>
        )}
      </PageHeader>

      <form onSubmit={handleSubmit}>
        {/* 문서 본문 - PMIS PaperShell 스타일 */}
        <div className="bg-white border rounded-lg shadow-sm">
          {/* 문서 헤더 */}
          <header className="border-b p-6 text-center">
            <h2 className="text-2xl font-bold mb-6">견 적 서</h2>

            {/* 기본 정보 테이블 - PMIS 스타일 */}
            <table className="w-full table-fixed text-left border-collapse border border-gray-300">
              <colgroup>
                <col style={{ width: "100px" }} />
                <col style={{ width: "35%" }} />
                <col style={{ width: "100px" }} />
                <col style={{ width: "35%" }} />
              </colgroup>
              <tbody>
                <tr className="border-b border-gray-300">
                  <TableCell
                    label="수 신"
                    editing={true}
                    input={
                      <input
                        type="text"
                        value={formData.recipient_label}
                        onChange={(e) => setFormData({ ...formData, recipient_label: e.target.value })}
                        className="input-sm w-full"
                        placeholder="예: ㈜삼안 대표이사"
                      />
                    }
                  />
                  <TableCell
                    label="참 조"
                    editing={true}
                    input={
                      <input
                        type="text"
                        value={formData.cc_recipients}
                        onChange={(e) => setFormData({ ...formData, cc_recipients: e.target.value })}
                        className="input-sm w-full"
                        placeholder="담당자명"
                      />
                    }
                  />
                </tr>
                <tr className="border-b border-gray-300">
                  <TableCell
                    label="견적일자"
                    editing={true}
                    input={
                      <input
                        type="date"
                        value={formData.issue_date}
                        onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                        className="input-sm"
                      />
                    }
                  />
                  <TableCell
                    label="유효기간"
                    editing={true}
                    input={
                      <div className="flex items-center gap-2">
                        <span>견적일로부터</span>
                        <input
                          type="number"
                          value={formData.validity_days}
                          onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) || 0 })}
                          className="input-sm w-20"
                          min="1"
                        />
                        <span>일</span>
                      </div>
                    }
                  />
                </tr>
                <tr className="border-b border-gray-300">
                  <TableCell
                    label="납품예정"
                    editing={true}
                    input={
                      <input
                        type="text"
                        value={formData.delivery_note}
                        onChange={(e) => setFormData({ ...formData, delivery_note: e.target.value })}
                        className="input-sm w-full"
                        placeholder="예: 발주 후 30일"
                      />
                    }
                  />
                  <TableCell
                    label="지불조건"
                    editing={true}
                    input={
                      <input
                        type="text"
                        value={formData.payment_terms}
                        onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                        className="input-sm w-full"
                        placeholder="예: 협의"
                      />
                    }
                  />
                </tr>
              </tbody>
            </table>
          </header>

          {/* 견적 제목 및 금액 요약 */}
          <div className="p-6 border-b">
            <table className="w-full table-fixed text-left border-collapse border border-gray-300">
              <colgroup>
                <col style={{ width: "100px" }} />
                <col />
              </colgroup>
              <tbody>
                <tr className="border-b border-gray-300">
                  <TableCell
                    label="건 명"
                    colSpan={1}
                    editing={true}
                    input={
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="input-sm w-full"
                        required
                      />
                    }
                  />
                </tr>
                <tr className="border-b border-gray-300">
                  <TableCell
                    label="합계금액"
                    colSpan={1}
                    editing={false}
                    value={
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-blue-600">
                          {totals.totalKorean} (₩{formatAmount(totals.total)})
                        </span>
                        <span className="text-sm text-gray-500">
                          {taxModeLabel[formData.tax_mode]}
                        </span>
                      </div>
                    }
                  />
                </tr>
              </tbody>
            </table>
          </div>

          {/* 견적 항목 테이블 - PMIS MaterialTable 스타일 */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-body-bold">견적 항목</h3>
              <div className="flex gap-2">
                <button type="button" onClick={addDiscountItem} className="btn-basic-sm">
                  + 할인행 추가
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-black table-fixed">
                <colgroup>
                  <col style={{ width: "10%" }} /> {/* 구분 */}
                  <col style={{ width: "25%" }} /> {/* 내용 */}
                  <col style={{ width: "8%" }} />  {/* 단위 */}
                  <col style={{ width: "12%" }} /> {/* 단가 */}
                  <col style={{ width: "8%" }} />  {/* 수량 */}
                  <col style={{ width: "12%" }} /> {/* 금액 */}
                  <col style={{ width: "15%" }} /> {/* 비고 */}
                  <col style={{ width: "60px" }} /> {/* 삭제 */}
                </colgroup>

                <thead className="doc-thead">
                  <tr>
                    <th className="doc-th">구분</th>
                    <th className="doc-th">내용</th>
                    <th className="doc-th">단위</th>
                    <th className="doc-th">단가</th>
                    <th className="doc-th">수량</th>
                    <th className="doc-th">금액</th>
                    <th className="doc-th">비고</th>
                    <th className="doc-th">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr 
                      key={index} 
                      className={`hover:bg-gray-50 border-b border-black last:border-b-0 ${item.is_discount_item ? "bg-red-50" : ""}`}
                    >
                      <td className="px-2 py-1 border-r border-black">
                        <input
                          type="text"
                          value={item.category}
                          onChange={(e) => handleItemChange(index, "category", e.target.value)}
                          className="w-full rounded border px-2 py-1 text-sm text-center"
                        />
                      </td>
                      <td className="px-2 py-1 border-r border-black">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(index, "name", e.target.value)}
                          className="w-full rounded border px-2 py-1 text-sm"
                          placeholder="항목명"
                        />
                      </td>
                      <td className="px-2 py-1 border-r border-black">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                          className="w-full rounded border px-2 py-1 text-sm text-center"
                        />
                      </td>
                      <td className="px-2 py-1 border-r border-black">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                          className="w-full rounded border px-2 py-1 text-sm text-right"
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-1 border-r border-black">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full rounded border px-2 py-1 text-sm text-right"
                          min="0"
                        />
                      </td>
                      <td className={`px-2 py-1 text-center border-r border-black font-medium ${item.is_discount_item ? "text-red-600" : ""}`}>
                        {formatAmount(calculateItemAmount(item))}
                      </td>
                      <td className="px-2 py-1 border-r border-black">
                        <input
                          type="text"
                          value={item.remarks}
                          onChange={(e) => handleItemChange(index, "remarks", e.target.value)}
                          className="w-full rounded border px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-1 text-center no-print">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="doc-del"
                          disabled={items.length === 1}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t border-black">
                    <td colSpan={5} className="px-3 py-2 text-right font-medium border-r border-black">
                      공급가액 ({taxModeLabel[formData.tax_mode]})
                    </td>
                    <td className="px-3 py-2 text-center font-medium border-r border-black">
                      {formatAmount(totals.subtotal)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                  {formData.tax_mode !== "exempt" && (
                    <tr className="bg-gray-100">
                      <td colSpan={5} className="px-3 py-2 text-right font-medium border-r border-black">
                        세액 ({formData.tax_rate}%)
                      </td>
                      <td className="px-3 py-2 text-center font-medium border-r border-black">
                        {formatAmount(totals.taxAmount)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  )}
                  <tr className="bg-blue-100 border-t border-black">
                    <td colSpan={5} className="px-3 py-2 text-right font-bold text-blue-700 border-r border-black">
                      합 계 ({roundingLabel[formData.rounding_type]} {formatAmount(formData.rounding_unit)}원 단위)
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-blue-700 border-r border-black">
                      {formatAmount(totals.total)}
                    </td>
                    <td colSpan={2} className="px-2 py-2 text-sm text-blue-600">
                      {totals.totalKorean}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* 행 추가 버튼 - MaterialTable 스타일 */}
            <div className="flex justify-end mt-2">
              <button type="button" onClick={addItem} className="btn-basic-sm">
                + 행 추가
              </button>
            </div>
          </div>

          {/* VAT/라운딩 옵션 - 접이식 영역 */}
          <div className="p-6 border-b no-print">
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-2">
                세금/라운딩 옵션 ▾
              </summary>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">VAT 모드</label>
                  <select
                    value={formData.tax_mode}
                    onChange={(e) => setFormData({ ...formData, tax_mode: e.target.value })}
                    className="input-base"
                  >
                    <option value="exclusive">VAT 별도</option>
                    <option value="inclusive">VAT 포함</option>
                    <option value="exempt">면세</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">세율 (%)</label>
                  <input
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="input-base"
                    min="0"
                    max="100"
                    disabled={formData.tax_mode === "exempt"}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">라운딩 타입</label>
                  <select
                    value={formData.rounding_type}
                    onChange={(e) => setFormData({ ...formData, rounding_type: e.target.value })}
                    className="input-base"
                  >
                    <option value="floor">절사 (내림)</option>
                    <option value="round">반올림</option>
                    <option value="ceil">올림</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">라운딩 단위</label>
                  <select
                    value={formData.rounding_unit}
                    onChange={(e) => setFormData({ ...formData, rounding_unit: parseInt(e.target.value) })}
                    className="input-base"
                  >
                    <option value="1">1원 (없음)</option>
                    <option value="10">10원</option>
                    <option value="100">100원</option>
                    <option value="1000">1,000원</option>
                    <option value="10000">10,000원</option>
                  </select>
                </div>
              </div>
            </details>
          </div>

          {/* 추가 정보 */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">추가 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">머리말</label>
                <textarea
                  value={formData.header_text}
                  onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
                  className="input-base"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">꼬리말</label>
                <textarea
                  value={formData.footer_text}
                  onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                  className="input-base"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">거래조건</label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className="input-base"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">고객 비고 (PDF 포함)</label>
                <textarea
                  value={formData.customer_notes}
                  onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
                  className="input-base"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">내부 메모 (PDF 미포함)</label>
                <textarea
                  value={formData.internal_memo}
                  onChange={(e) => setFormData({ ...formData, internal_memo: e.target.value })}
                  className="input-base"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* 연관 데이터 - 영업기회, 고객사, 템플릿 */}
          <div className="p-6 border-t bg-gray-50 no-print">
            <details className="group" open>
              <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-2">
                연관 데이터 선택 ▾
              </summary>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
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
                  <label className="block text-sm text-gray-600 mb-1">고객사</label>
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
                  <label className="block text-sm text-gray-600 mb-1">담당자</label>
                  <select
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
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
                <div>
                  <label className="block text-sm text-gray-600 mb-1">템플릿</label>
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
              </div>
            </details>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={() => navigate(-1)} className="btn-cancel">
            취소
          </button>
          <button type="submit" disabled={saving} className="btn-save flex items-center gap-2">
            <FiSave className="w-4 h-4" />
            {saving ? "저장 중.." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default QuoteForm;
