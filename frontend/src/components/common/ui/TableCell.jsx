// src/components/common/ui/TableCell.jsx
// PMIS 디자인 시스템에서 이식 - 폼 테이블 레이아웃용 컴포넌트
import React from "react";

const TableCell = ({
  label,
  editing,
  rich = false,
  value,
  input,
  labelBg = "bg-gray-100",
  valueBg = "bg-white",
  labelWidth = "80px",
  textCenter = false,
  colSpan = 1,
}) => {
  let content;

  if (editing) {
    content = input;
  } else if (rich) {
    // rich 모드: HTML 또는 ReactNode 렌더링
    if (typeof value === "string") {
      content = <div dangerouslySetInnerHTML={{ __html: value }} />;
    } else {
      content = value;
    }
  } else {
    content = <span>{value ?? "-"}</span>;
  }

  return (
    <>
      {/* LABEL CELL */}
      <td
        className={`tbl-label-bg px-3 py-2 font-medium ${labelBg} ${
          textCenter ? "text-center" : ""
        }`}
        style={{ width: labelWidth, whiteSpace: "nowrap" }}
      >
        <div className="text-body">{label}</div>
      </td>

      {/* VALUE CELL */}
      <td
        className={`tbl-value-bg px-3 py-2 ${valueBg}`}
        colSpan={colSpan}
        style={{ width: "auto" }}
      >
        <div className="items-center min-w-0">
          <div className="text-body whitespace-pre-wrap break-words">{content}</div>
        </div>
      </td>
    </>
  );
};

export default TableCell;
