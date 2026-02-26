import React from "react";

export default function BoardPagination({
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  className = "",
  showSinglePage = false,
  mode = "compact",
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (!showSinglePage && totalPages <= 1) return null;

  const changePage = (nextPage) => {
    if (!onPageChange) return;
    const safePage = Math.max(1, Math.min(totalPages, nextPage));
    if (safePage !== page) {
      onPageChange(safePage);
    }
  };

  if (mode !== "full") {
    const canPrev = page > 1;
    const canNext = page < totalPages;

    return (
      <div
        className={[
          "mt-3 flex items-center justify-center gap-2 text-sm",
          className,
        ].join(" ")}
      >
        <button
          className="rounded-lg border px-3 py-2 text-xs whitespace-nowrap hover:bg-gray-50 disabled:opacity-50"
          disabled={!canPrev}
          onClick={() => changePage(page - 1)}
        >
          이전
        </button>
        <span className="text-gray-600 text-xs sm:text-sm whitespace-nowrap">
          {page} / {totalPages} 페이지 {total ? `(총 ${total}건)` : ""}
        </span>
        <button
          className="rounded-lg border px-3 py-2 text-xs whitespace-nowrap hover:bg-gray-50 disabled:opacity-50"
          disabled={!canNext}
          onClick={() => changePage(page + 1)}
        >
          다음
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 ${className}`}>
      <div className="text-sm text-gray-500">총 {total}건</div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-basic-sm"
          disabled={page <= 1}
          onClick={() => changePage(1)}
        >
          처음
        </button>
        <button
          type="button"
          className="btn-basic-sm"
          disabled={page <= 1}
          onClick={() => changePage(page - 1)}
        >
          이전
        </button>
        <span className="text-sm text-gray-600 px-2">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn-basic-sm"
          disabled={page >= totalPages}
          onClick={() => changePage(page + 1)}
        >
          다음
        </button>
        <button
          type="button"
          className="btn-basic-sm"
          disabled={page >= totalPages}
          onClick={() => changePage(totalPages)}
        >
          마지막
        </button>
      </div>
    </div>
  );
}
