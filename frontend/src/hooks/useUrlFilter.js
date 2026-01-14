// src/hooks/useUrlFilter.js
// URL 동기화 필터 Hook
import { useSearchParams, useNavigate } from "react-router-dom";
import { useCallback, useMemo } from "react";

export function useUrlFilter(defaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // 현재 필터 상태
  const filters = useMemo(() => {
    const result = { ...defaults };
    for (const [key, value] of searchParams.entries()) {
      result[key] = value;
    }
    return result;
  }, [searchParams, defaults]);

  // 필터 업데이트
  const setFilter = useCallback((key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null || value === undefined || value === "") {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // 여러 필터 한번에 업데이트
  const setFilters = useCallback((newFilters) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // 필터 초기화
  const resetFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  // Drill-down 네비게이션 (필터 적용하여 다른 페이지로 이동)
  const drillDown = useCallback((path, filterParams = {}) => {
    const params = new URLSearchParams(filterParams);
    navigate(`${path}?${params.toString()}`);
  }, [navigate]);

  // 필터를 API 파라미터로 변환
  const toApiParams = useCallback(() => {
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      if (value) params[key] = value;
    }
    return params;
  }, [searchParams]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    drillDown,
    toApiParams,
    searchParams,
  };
}

export default useUrlFilter;
