import React, { useState, useMemo } from "react";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

export default function BoardTable({
  columns = [],
  rows = [],
  keyField = "id",
  loading = false,
  error = "",
  emptyText = "데이터가 없습니다.",
  onRowClick,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  sortable = true,
  size = "md",
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);
  const sizeClass =
    size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm";

  const isColumnSortable = (col) =>
    sortable && !col.rowNumber && col.sortable !== false;

  const handleSort = (key) => {
    // 정렬 비활성 시 바로 리턴
    if (!sortable) return;

    if (sortKey !== key) {
      setSortKey(key);
      setSortOrder("asc");
    } else {
      setSortOrder((prev) =>
        prev === "asc" ? "desc" : prev === "desc" ? null : "asc"
      );
    }
  };

  const getSortIcon = (colKey) => {
    if (sortKey !== colKey) return <FaSort className="opacity-40" />;
    if (sortOrder === "asc") return <FaSortUp />;
    if (sortOrder === "desc") return <FaSortDown />;
    return <FaSort className="opacity-40" />;
  };

  const extendedColumns = [
    {
      key: "__rownum__",
      header: "번호",
      width: 60,
      rowNumber: true,
    },
    ...columns,
  ];

  // 3) sortedRows (여기서 extendedColumns 참조)
  const sortedRows = useMemo(() => {
    // sortable이 false면 무조건 원본 rows 사용
    if (!sortable || !sortKey || !sortOrder) return rows;

    const col = extendedColumns.find((c) => c.key === sortKey);
    if (!col) return rows;

    const getValue = (row) => {
      if (typeof col.sortValue === "function") {
        return col.sortValue(row);
      }

      if (col.render) {
        const rendered = col.render(row);

        if (
          typeof rendered === "string" ||
          typeof rendered === "number" ||
          typeof rendered === "boolean"
        ) {
          return rendered;
        }
        return String(rendered?.props?.children ?? "");
      }
      return row[col.key];
    };

    return [...rows].sort((a, b) => {
      const x = getValue(a);
      const y = getValue(b);

      if (x == null && y == null) return 0;
      if (x == null) return -1;
      if (y == null) return 1;

      let compared = 0;
      if (typeof x === "number" && typeof y === "number") {
        compared = x - y;
      } else {
        compared = String(x).localeCompare(String(y), undefined, {
          numeric: true,
        });
      }

      return sortOrder === "asc" ? compared : -compared;
    });
  }, [rows, sortKey, sortOrder, sortable]);

  return (
    <div
      className={[
        "overflow-x-auto rounded-2xl border bg-white",
        className,
      ].join(" ")}
    >
      <table className={["min-w-full table-fixed", sizeClass].join(" ")}>
        <thead
          className={["bg-gray-50 text-gray-600", headerClassName].join(" ")}
        >
          <tr>
            {extendedColumns.map((col) => (
              <th
                key={col.key}
                className={[
                  "px-3 py-2 select-none border-l first:border-l-0",
                  // 정렬 가능한 컬럼만 pointer/hover
                  isColumnSortable(col)
                    ? "cursor-pointer hover:bg-gray-100"
                    : "",
                  col.rowNumber ? "bg-gray-50 text-gray-700 font-semibold" : "",
                  // 헤더 정렬: headerAlign 우선, 없으면 align 사용
                  (col.headerAlign ?? col.align) === "left"
                    ? "text-left"
                    : (col.headerAlign ?? col.align) === "right"
                    ? "text-right"
                    : "text-center",
                ].join(" ")}
                style={col.width ? { width: col.width } : undefined}
                onClick={isColumnSortable(col) ? () => handleSort(col.key) : undefined}
              >
                <div
                  className={[
                    "flex items-center gap-1",
                    // 헤더 정렬: headerAlign 우선, 없으면 align 사용
                    (col.headerAlign ?? col.align) === "left"
                      ? "justify-start"
                      : (col.headerAlign ?? col.align) === "right"
                      ? "justify-end"
                      : "justify-center",
                  ].join(" ")}
                >
                  <span>{col.header}</span>
                  {/* 정렬이 켜져 있고 번호 컬럼이 아닐 때만 아이콘 표시 */}
                  {isColumnSortable(col) && getSortIcon(col.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className={bodyClassName}>
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-t">
                {extendedColumns.map((c) => (
                  <td
                    key={c.key}
                    className="px-3 py-2 border-l first:border-l-0"
                  >
                    <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && error && (
            <tr>
              <td
                colSpan={extendedColumns.length}
                className="px-3 py-6 text-center text-red-600"
              >
                {error}
              </td>
            </tr>
          )}

          {!loading &&
            !error &&
            sortedRows?.length > 0 &&
            sortedRows.map((row, index) => {
              const key = row?.[keyField] ?? index;
              const clickable = typeof onRowClick === "function";

              return (
                <tr
                  key={key}
                  className={[
                    "border-t",
                    clickable ? "cursor-pointer hover:bg-gray-50" : "",
                  ].join(" ")}
                  onClick={clickable ? () => onRowClick(row) : undefined}
                >
                  {extendedColumns.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        "px-3 py-2 border-l first:border-l-0",
                        col.rowNumber
                          ? "bg-gray-50 text-gray-700 font-semibold"
                          : "",
                        // 기본 정렬: center
                        col.align === "left"
                          ? "text-left"
                          : col.align === "right"
                          ? "text-right"
                          : "text-center",
                        col.className || "",
                      ].join(" ")}
                    >
                      {col.rowNumber
                        ? index + 1
                        : col.render
                        ? col.render(row)
                        : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}

          {!loading && !error && sortedRows.length === 0 && (
            <tr>
              <td
                colSpan={extendedColumns.length}
                className="px-3 py-6 text-center text-gray-400"
              >
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
