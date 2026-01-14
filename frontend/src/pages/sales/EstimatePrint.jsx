// src/pages/sales/EstimatePrint.jsx
// 견적서 인쇄 페이지
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { estimateApi } from "../../api/salesApi";
import { PrintLayout, DocumentHeader, DocumentTable, SignatureBlock } from "../../components/common/ui/PrintLayout";

export default function EstimatePrint() {
  const { id } = useParams();
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await estimateApi.getDetail(id);
        setEstimate(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        견적서를 찾을 수 없습니다.
      </div>
    );
  }

  // 테이블 헤더
  const headers = [
    { label: "No", width: "40px" },
    { label: "품목", width: "auto" },
    { label: "규격", width: "120px" },
    { label: "단위", width: "60px" },
    { label: "수량", width: "80px" },
    { label: "단가", width: "100px" },
    { label: "금액", width: "120px" },
    { label: "비고", width: "100px" },
  ];

  // 테이블 데이터
  const rows = (estimate.items || []).map((item, idx) => [
    idx + 1,
    item.description,
    item.specification || "",
    item.unit || "EA",
    item.quantity,
    Number(item.unit_price),
    Number(item.amount),
    item.remark || "",
  ]);

  // 푸터 (합계)
  const footer = [
    [
      { value: "공급가액", colSpan: 6 },
      { value: "" },
      Number(estimate.subtotal),
      { value: "", colSpan: 1 },
    ],
    [
      { value: "부가세 (10%)", colSpan: 6 },
      { value: "" },
      Number(estimate.tax),
      { value: "", colSpan: 1 },
    ],
    [
      { value: "합계", colSpan: 6 },
      { value: "" },
      Number(estimate.total),
      { value: "", colSpan: 1 },
    ],
  ];

  // 서명란
  const signatures = [
    { title: "담당", name: estimate.created_by_name, signed: true },
    { title: "검토", name: "", signed: false },
    { title: "승인", name: "", signed: false },
  ];

  return (
    <PrintLayout title="견적서">
      <div className="space-y-6">
        {/* 문서 헤더 */}
        <DocumentHeader
          title="견 적 서"
          documentNumber={estimate.estimate_number}
          date={new Date(estimate.created_at).toLocaleDateString("ko-KR")}
        />

        {/* 기본 정보 */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          {/* 수신 */}
          <div>
            <table className="w-full border-collapse border border-black text-sm">
              <tbody>
                <tr>
                  <td className="border border-black bg-gray-100 px-3 py-2 font-medium w-24">
                    수 신
                  </td>
                  <td className="border border-black px-3 py-2">
                    {estimate.client_name} 귀하
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 px-3 py-2 font-medium">
                    건 명
                  </td>
                  <td className="border border-black px-3 py-2">
                    {estimate.title}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 px-3 py-2 font-medium">
                    유효기간
                  </td>
                  <td className="border border-black px-3 py-2">
                    {estimate.valid_until
                      ? new Date(estimate.valid_until).toLocaleDateString("ko-KR")
                      : "발행일로부터 30일"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 px-3 py-2 font-medium">
                    견적금액
                  </td>
                  <td className="border border-black px-3 py-2 font-bold text-lg">
                    ₩{Number(estimate.total).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 발신 */}
          <div>
            <table className="w-full border-collapse border border-black text-sm">
              <tbody>
                <tr>
                  <td className="border border-black bg-gray-100 px-3 py-2 font-medium w-24">
                    상 호
                  </td>
                  <td className="border border-black px-3 py-2">
                    (주)P6ix
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 px-3 py-2 font-medium">
                    주 소
                  </td>
                  <td className="border border-black px-3 py-2">
                    서울시 강남구 테헤란로 123
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 px-3 py-2 font-medium">
                    담당자
                  </td>
                  <td className="border border-black px-3 py-2">
                    {estimate.created_by_name}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 px-3 py-2 font-medium">
                    연락처
                  </td>
                  <td className="border border-black px-3 py-2">
                    02-1234-5678
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 견적 내역 */}
        <div>
          <h3 className="text-sm font-medium mb-2">■ 견적 내역</h3>
          <table className="w-full border-collapse border border-black text-sm">
            <thead>
              <tr className="bg-gray-100">
                {headers.map((h, idx) => (
                  <th
                    key={idx}
                    className="border border-black px-2 py-2 font-medium"
                    style={{ width: h.width }}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className={`border border-black px-2 py-1.5 ${
                        typeof cell === "number" ? "text-right" : cellIdx === 0 ? "text-center" : ""
                      }`}
                    >
                      {typeof cell === "number" ? cell.toLocaleString() : cell}
                    </td>
                  ))}
                </tr>
              ))}
              {/* 빈 행 채우기 (최소 5행) */}
              {Array.from({ length: Math.max(0, 5 - rows.length) }).map((_, idx) => (
                <tr key={`empty-${idx}`}>
                  {headers.map((_, cellIdx) => (
                    <td key={cellIdx} className="border border-black px-2 py-1.5">
                      &nbsp;
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-medium">
                <td colSpan={6} className="border border-black px-2 py-2 text-right">
                  공급가액
                </td>
                <td className="border border-black px-2 py-2 text-right">
                  {Number(estimate.subtotal).toLocaleString()}
                </td>
                <td className="border border-black px-2 py-2"></td>
              </tr>
              <tr className="bg-gray-50 font-medium">
                <td colSpan={6} className="border border-black px-2 py-2 text-right">
                  부가세 (10%)
                </td>
                <td className="border border-black px-2 py-2 text-right">
                  {Number(estimate.tax).toLocaleString()}
                </td>
                <td className="border border-black px-2 py-2"></td>
              </tr>
              <tr className="bg-blue-50 font-bold">
                <td colSpan={6} className="border border-black px-2 py-2 text-right">
                  합 계
                </td>
                <td className="border border-black px-2 py-2 text-right text-blue-600">
                  ₩{Number(estimate.total).toLocaleString()}
                </td>
                <td className="border border-black px-2 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 비고 */}
        {estimate.notes && (
          <div>
            <h3 className="text-sm font-medium mb-2">■ 비고</h3>
            <div className="border border-black p-3 min-h-[60px] text-sm whitespace-pre-wrap">
              {estimate.notes}
            </div>
          </div>
        )}

        {/* 안내 문구 */}
        <div className="text-sm text-gray-600 space-y-1 mt-6">
          <p>1. 상기 금액은 부가세 포함 금액입니다.</p>
          <p>2. 견적 유효기간 내 계약 체결 시 상기 금액이 적용됩니다.</p>
          <p>3. 기타 문의사항은 담당자에게 연락 바랍니다.</p>
        </div>

        {/* 서명란 */}
        <SignatureBlock signatures={signatures} />
      </div>
    </PrintLayout>
  );
}
