// src/components/common/ui/WidgetCard.jsx
// PMIS 디자인 시스템에서 이식 - 대시보드 위젯 컨테이너 컴포넌트
export default function WidgetCard({
  title,
  children,
  className = "",
  transparentHeader = false,
  darkHeader = true,  // PMIS 스타일 다크 헤더 (기본값)
  mobileMode = false,
  icon: Icon = null,
  onViewMore = null,
  onRefresh = null,
  loading = false,
}) {
  return (
    <div className={`bg-white border p-0 overflow-hidden h-full flex flex-col 
      ${mobileMode
        ? "rounded-2xl border-slate-200 transition-all duration-200"
        : "rounded-lg border-gray-200"
      } ${className}`}>
      {/* 타이틀 영역 */}
      <div className={`px-4 ${mobileMode ? "py-3" : "py-2"} flex items-center justify-between
        ${transparentHeader
          ? mobileMode
            ? "bg-gradient-to-r from-slate-50 to-white border-b border-slate-200"
            : "bg-white border-b border-gray-200"
          : darkHeader
            ? mobileMode
              ? "bg-gradient-to-r from-[#1e1e2f] to-[#2a2a3e]"
              : "bg-[#1e1e2f]"
            : "bg-white border-b border-gray-100"
        }`}>
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} className={darkHeader && !transparentHeader ? "text-white" : "text-blue-600"} />}
          <h3 className={`text-sm ${mobileMode ? "font-bold" : "font-semibold"} ${
            (darkHeader && !transparentHeader) ? "text-white" : "text-gray-800"
          }`}>
            {title}
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className={`p-1 rounded transition-colors ${
                darkHeader && !transparentHeader 
                  ? "hover:bg-white/10 text-white/70 hover:text-white" 
                  : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              }`}
              title="새로고침"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          {onViewMore && (
            <button 
              onClick={onViewMore}
              className={`text-xs flex items-center gap-1 transition-colors ${
                darkHeader && !transparentHeader
                  ? "text-white/80 hover:text-white"
                  : "text-blue-600 hover:text-blue-700"
              }`}
            >
              더보기 
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 내용 영역 */}
      <div className={`flex-1 ${mobileMode ? "p-4" : "p-3"}`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
