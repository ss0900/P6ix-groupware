// src/components/common/ui/ResponsiveDataView.jsx
// 반응형 데이터 뷰 컴포넌트 (Table ↔ Card 자동 전환)
import React from "react";
import { LayoutGrid, List } from "lucide-react";
import useResponsiveView from "../../../hooks/useResponsiveView";

export function ResponsiveDataView({
  data = [],
  columns = [],
  renderCard,
  onRowClick,
  loading = false,
  emptyMessage = "데이터가 없습니다.",
  className = "",
}) {
  const { viewMode, toggleView, isMobile } = useResponsiveView();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 뷰 전환 버튼 (모바일에서만 표시) */}
      {!isMobile && (
        <div className="flex justify-end mb-3">
          <button
            onClick={toggleView}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {viewMode === "table" ? (
              <>
                <LayoutGrid size={16} />
                카드 뷰
              </>
            ) : (
              <>
                <List size={16} />
                테이블 뷰
              </>
            )}
          </button>
        </div>
      )}

      {/* 테이블 뷰 */}
      {viewMode === "table" && !isMobile ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`text-${col.align || "left"} px-4 py-3 text-sm font-medium text-gray-600`}
                    style={{ width: col.width }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((item, rowIdx) => (
                <tr
                  key={item.id || rowIdx}
                  onClick={() => onRowClick?.(item)}
                  className={onRowClick ? "hover:bg-gray-50 cursor-pointer" : ""}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-4 py-3 text-${col.align || "left"} ${col.className || ""}`}
                    >
                      {col.render ? col.render(item[col.key], item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* 카드 뷰 */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.map((item, idx) =>
            renderCard ? (
              <div
                key={item.id || idx}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {renderCard(item)}
              </div>
            ) : (
              <DefaultCard
                key={item.id || idx}
                item={item}
                columns={columns}
                onClick={() => onRowClick?.(item)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// 기본 카드 렌더러
function DefaultCard({ item, columns, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {columns.map((col, idx) => (
        <div key={idx} className="flex justify-between py-1">
          <span className="text-sm text-gray-500">{col.header}</span>
          <span className="text-sm font-medium">
            {col.render ? col.render(item[col.key], item) : item[col.key]}
          </span>
        </div>
      ))}
    </div>
  );
}

export default ResponsiveDataView;
