// src/hooks/useResponsiveView.js
// 반응형 뷰 전환 Hook (Table ↔ Card)
import { useState, useEffect, useCallback } from "react";

const MOBILE_BREAKPOINT = 768;

export function useResponsiveView(defaultView = "table") {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  const [viewMode, setViewMode] = useState(defaultView);

  // 윈도우 리사이즈 감지
  useEffect(() => {
    const checkWidth = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      // 모바일로 전환되면 자동으로 카드 뷰
      if (mobile && viewMode === "table") {
        setViewMode("card");
      }
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, [viewMode]);

  const toggleView = useCallback(() => {
    setViewMode((prev) => (prev === "table" ? "card" : "table"));
  }, []);

  return {
    isMobile,
    viewMode,
    setViewMode,
    toggleView,
    isTableView: viewMode === "table",
    isCardView: viewMode === "card",
  };
}

export default useResponsiveView;
