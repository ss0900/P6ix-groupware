// src/components/common/ui/PageHeader.jsx
// PMIS 디자인 시스템에서 이식 - 페이지 상단 헤더 컴포넌트
import React from "react";

export default function PageHeader({
  title,
  subtitle,
  children, // 우측 액션 버튼 영역
  breadcrumb = null,
}) {
  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      {breadcrumb && (
        <div className="text-sm text-gray-500 mb-2">
          {breadcrumb}
        </div>
      )}
      
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title">{title}</h1>
          {subtitle && (
            <p className="text-muted-sm mt-1">{subtitle}</p>
          )}
        </div>
        
        {/* Actions */}
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
