// src/pages/project/SalesWeeklyReport.jsx
// 영업관리 주간 집계 조회 (관리자 전용)
import React, { useState, useEffect, useCallback } from "react";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Gavel,
  Lock,
} from "lucide-react";
import ProjectService from "../../api/project";

// 날짜 유틸
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const formatDate = (date) => {
  return date.toISOString().split("T")[0];
};

// 카테고리별 아이콘
const categoryIcons = {
  영업관리: Briefcase,
  "견적/고객": FileText,
  "입찰/정산": Gavel,
};

export default function SalesWeeklyReport() {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set(["영업관리"]));

  // 주간 보고서 로드
  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ProjectService.getSalesWeeklyReport({
        week_start: formatDate(weekStart),
      });
      setReportData(data);
    } catch (err) {
      console.error("Failed to load sales report", err);
      if (err.response?.status === 403) {
        setError("권한이 없습니다. 관리자만 조회할 수 있습니다.");
      } else {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleThisWeek = () => {
    setWeekStart(getMonday(new Date()));
  };

  const toggleCategory = (name) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const renderLeadItem = (item) => (
    <div className="text-sm p-2 bg-gray-50 rounded border-l-2 border-purple-400">
      <div className="font-medium text-gray-800">{item.title}</div>
      <div className="text-xs text-gray-500 mt-1">
        {item.customer_name && <span className="mr-2">{item.customer_name}</span>}
        {item.stage && (
          <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
            {item.stage}
          </span>
        )}
      </div>
    </div>
  );

  const renderQuoteItem = (item) => (
    <div className="text-sm p-2 bg-gray-50 rounded border-l-2 border-green-400">
      <div className="font-medium text-gray-800">
        {item.quote_number}: {item.title}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {item.customer_name && <span className="mr-2">{item.customer_name}</span>}
        {item.total_amount && (
          <span className="text-green-600 font-medium">
            ₩{Number(item.total_amount).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );

  const renderTenderItem = (item) => (
    <div className="text-sm p-2 bg-gray-50 rounded border-l-2 border-orange-400">
      <div className="font-medium text-gray-800">{item.title}</div>
      <div className="text-xs text-gray-500 mt-1">
        {item.customer_name && <span className="mr-2">{item.customer_name}</span>}
        {item.deadline && (
          <span className="text-orange-600">마감: {item.deadline}</span>
        )}
      </div>
    </div>
  );

  const renderItems = (items, categoryName) => {
    if (!items || items.length === 0) {
      return <p className="text-gray-400 text-sm italic">등록된 항목 없음</p>;
    }

    const renderers = {
      영업관리: renderLeadItem,
      "견적/고객": renderQuoteItem,
      "입찰/정산": renderTenderItem,
    };
    const renderFn = renderers[categoryName] || renderLeadItem;

    return (
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.id || idx}>{renderFn(item)}</div>
        ))}
      </div>
    );
  };

  // 권한 오류 시
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Briefcase className="text-purple-500" size={24} />
          <h1 className="text-xl font-bold text-gray-900">영업 주간업무</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-10 text-center">
          <Lock size={48} className="mx-auto mb-4 text-red-400" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Briefcase className="text-purple-500" size={24} />
          <h1 className="text-xl font-bold text-gray-900">영업 주간업무</h1>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
            관리자 전용
          </span>
        </div>
        <button
          onClick={loadReport}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 주간 네비게이션 */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleThisWeek}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              이번 주
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          {reportData && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">
                전주: {reportData.prev_week?.label}
              </span>
              <span className="font-medium text-purple-600">
                금주: {reportData.current_week?.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 로딩 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
        </div>
      ) : (
        /* 카테고리별 테이블 */
        <div className="space-y-4">
          {reportData?.categories?.map((category) => {
            const isExpanded = expandedCategories.has(category.name);
            const Icon = categoryIcons[category.name] || Briefcase;
            const prevCount = category.prev_week_items?.length || 0;
            const currentCount = category.current_week_items?.length || 0;

            return (
              <div key={category.name} className="bg-white border rounded-lg overflow-hidden">
                {/* 카테고리 헤더 */}
                <div
                  onClick={() => toggleCategory(category.name)}
                  className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} className="text-purple-500" />
                    <span className="font-medium text-gray-800">{category.name}</span>
                    <span className="text-sm text-gray-500">
                      (전주: {prevCount}건 / 금주: {currentCount}건)
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </div>

                {/* 확장 내용 */}
                {isExpanded && (
                  <div className="grid grid-cols-2 border-t">
                    <div className="p-4 border-r">
                      <div className="text-sm font-medium text-gray-600 mb-3">
                        전주 ({reportData?.prev_week?.label})
                      </div>
                      {renderItems(category.prev_week_items, category.name)}
                    </div>
                    <div className="p-4">
                      <div className="text-sm font-medium text-gray-600 mb-3">
                        금주 ({reportData?.current_week?.label})
                      </div>
                      {renderItems(category.current_week_items, category.name)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
