// src/components/common/ui/PrintLayout.jsx
// 인쇄 레이아웃 컴포넌트 (A4 양식)
import React, { useRef } from "react";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function PrintLayout({
  children,
  title = "문서",
  onBack,
  showControls = true,
  className = "",
}) {
  const navigate = useNavigate();
  const printRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="print-root min-h-screen bg-gray-100">
      {/* 컨트롤 바 (인쇄 시 숨김) */}
      {showControls && (
        <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Printer size={18} />
                인쇄
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 인쇄 영역 */}
      <div className="py-8 no-print">
        <div
          ref={printRef}
          className={`a4-page mx-auto bg-white shadow-lg ${className}`}
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "15mm",
            position: "relative",
          }}
        >
          {children}
        </div>
      </div>

      {/* 인쇄 시 표시될 내용 */}
      <div className="hidden print:block">
        <div
          className={`bg-white ${className}`}
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "15mm",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// 문서 헤더
export function DocumentHeader({ companyName, title, documentNumber, date }) {
  return (
    <div className="text-center mb-8">
      {companyName && (
        <p className="text-sm text-gray-500 mb-2">{companyName}</p>
      )}
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <div className="flex justify-between text-sm text-gray-600">
        <span>문서번호: {documentNumber}</span>
        <span>작성일: {date}</span>
      </div>
    </div>
  );
}

// 문서 테이블
export function DocumentTable({ headers, rows, footer }) {
  return (
    <table className="w-full border-collapse border border-black text-sm">
      <thead>
        <tr className="bg-gray-100">
          {headers.map((header, idx) => (
            <th
              key={idx}
              className="border border-black px-3 py-2 font-medium"
              style={{ width: header.width }}
            >
              {header.label}
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
                className={`border border-black px-3 py-2 ${
                  typeof cell === "number" ? "text-right" : ""
                }`}
              >
                {typeof cell === "number" ? cell.toLocaleString() : cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {footer && (
        <tfoot>
          {footer.map((row, rowIdx) => (
            <tr key={rowIdx} className="font-medium bg-gray-50">
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className={`border border-black px-3 py-2 ${
                    typeof cell === "number" ? "text-right" : ""
                  }`}
                  colSpan={cell.colSpan}
                >
                  {typeof cell === "number"
                    ? cell.toLocaleString()
                    : cell.value || cell}
                </td>
              ))}
            </tr>
          ))}
        </tfoot>
      )}
    </table>
  );
}

// 서명란
export function SignatureBlock({ signatures = [] }) {
  return (
    <div className="mt-12 flex justify-end">
      <table className="border-collapse border border-black text-sm">
        <thead>
          <tr>
            {signatures.map((sig, idx) => (
              <th
                key={idx}
                className="border border-black px-6 py-2 font-medium bg-gray-100"
              >
                {sig.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {signatures.map((sig, idx) => (
              <td
                key={idx}
                className="border border-black px-6 py-8 text-center"
                style={{ height: "60px", minWidth: "80px" }}
              >
                {sig.signed ? (
                  <span className="text-blue-600">{sig.name}</span>
                ) : (
                  ""
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default PrintLayout;
