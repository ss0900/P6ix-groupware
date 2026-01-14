// src/pages/sales/Pipeline.jsx
// 영업 파이프라인 칸반 보드
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { opportunityApi, pipelineApi } from "../../api/salesApi";
import {
  Plus,
  RefreshCw,
  GripVertical,
  Building2,
  User,
  Calendar,
  AlertCircle,
  DollarSign,
  CheckCircle,
  Settings,
} from "lucide-react";

// 금액 포맷
const formatCurrency = (value) => {
  if (!value) return "₩0";
  return `₩${Number(value).toLocaleString()}`;
};

// 우선순위 뱃지
const PriorityBadge = ({ priority }) => {
  const config = {
    high: { bg: "bg-red-100", text: "text-red-600", label: "높음" },
    medium: { bg: "bg-yellow-100", text: "text-yellow-600", label: "보통" },
    low: { bg: "bg-gray-100", text: "text-gray-500", label: "낮음" },
  };
  const c = config[priority] || config.medium;
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// 정체 뱃지
const StalledBadge = ({ days }) => {
  if (!days || days < 7) return null;
  return (
    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600 flex items-center gap-1">
      <AlertCircle size={10} />
      {days}일 정체
    </span>
  );
};

// 칸반 카드
const KanbanCard = ({ opportunity, onDragStart, onClick }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, opportunity)}
      onClick={() => onClick(opportunity)}
      className="bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
          {opportunity.title}
        </h4>
        <GripVertical size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
      </div>

      {/* 고객사 */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
        <Building2 size={12} />
        <span className="truncate">{opportunity.client_name}</span>
      </div>

      {/* 금액 */}
      <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 mb-2">
        <DollarSign size={14} />
        {formatCurrency(opportunity.expected_amount)}
      </div>

      {/* 하단 정보 */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {opportunity.owner_name && (
            <span className="flex items-center gap-1">
              <User size={10} />
              {opportunity.owner_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={opportunity.priority} />
          <StalledBadge days={opportunity.stalled_days} />
        </div>
      </div>

      {/* 마감일 */}
      {opportunity.expected_close_date && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
          <Calendar size={10} />
          {opportunity.expected_close_date}
        </div>
      )}

      {/* 태스크 카운트 */}
      {opportunity.task_count > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
          <CheckCircle size={10} />
          태스크 {opportunity.task_count}건
        </div>
      )}
    </div>
  );
};

// 칸반 컬럼
const KanbanColumn = ({ stage, opportunities, onDrop, onCardClick, onDragStart }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(stage.id);
  };

  // 컬럼 통계
  const totalAmount = opportunities.reduce(
    (sum, opp) => sum + Number(opp.expected_amount || 0),
    0
  );

  return (
    <div
      className={`flex-shrink-0 w-72 bg-gray-50 rounded-lg flex flex-col max-h-full ${
        isDragOver ? "ring-2 ring-blue-400 ring-offset-2" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 컬럼 헤더 */}
      <div
        className="p-3 border-b border-gray-200 rounded-t-lg"
        style={{ backgroundColor: stage.color + "20" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-gray-800">{stage.name}</h3>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full">
            {opportunities.length}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {formatCurrency(totalAmount)}
        </p>
      </div>

      {/* 카드 영역 */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
        {opportunities.map((opp) => (
          <KanbanCard
            key={opp.id}
            opportunity={opp}
            onDragStart={onDragStart}
            onClick={onCardClick}
          />
        ))}

        {opportunities.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            기회 없음
          </div>
        )}
      </div>
    </div>
  );
};

export default function Pipeline() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kanbanData, setKanbanData] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [draggingItem, setDraggingItem] = useState(null);
  const [noPipelines, setNoPipelines] = useState(false);

  // 파이프라인 목록 로드
  const loadPipelines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pipelineApi.getList({ is_active: "true" });
      const list = res.data?.results ?? res.data ?? [];
      setPipelines(list);
      
      if (list.length === 0) {
        // 파이프라인이 없음
        setNoPipelines(true);
        setLoading(false);
        return;
      }
      
      setNoPipelines(false);
      // 기본 파이프라인 선택
      const defaultPipeline = list.find((p) => p.is_default) || list[0];
      setSelectedPipeline(defaultPipeline.id);
    } catch (err) {
      console.error("파이프라인 로드 실패:", err);
      setLoading(false);
    }
  }, []);

  // 칸반 데이터 로드
  const loadKanban = useCallback(async () => {
    if (!selectedPipeline) return;
    
    setLoading(true);
    try {
      const res = await opportunityApi.getKanban(selectedPipeline);
      setKanbanData(res.data);
    } catch (err) {
      console.error("칸반 데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPipeline]);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  useEffect(() => {
    if (selectedPipeline) {
      loadKanban();
    }
  }, [selectedPipeline, loadKanban]);


  // 드래그 시작
  const handleDragStart = (e, opportunity) => {
    setDraggingItem(opportunity);
    e.dataTransfer.effectAllowed = "move";
  };

  // 드롭 처리
  const handleDrop = async (stageId) => {
    if (!draggingItem) return;
    
    // 같은 단계면 무시
    if (draggingItem.stage === stageId) {
      setDraggingItem(null);
      return;
    }

    try {
      await opportunityApi.moveStage(draggingItem.id, stageId);
      // 칸반 즉시 업데이트
      loadKanban();
    } catch (err) {
      console.error("단계 이동 실패:", err);
      alert("단계 이동에 실패했습니다.");
    } finally {
      setDraggingItem(null);
    }
  };

  // 카드 클릭
  const handleCardClick = (opportunity) => {
    navigate(`/sales/opportunities/${opportunity.id}`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">파이프라인</h1>
          
          {/* 파이프라인 선택 */}
          <select
            value={selectedPipeline || ""}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.opportunity_count || 0})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadKanban}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="새로고침"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => navigate("/sales/pipeline/settings")}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="파이프라인 설정"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => navigate("/sales/opportunities/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            영업 기회 추가
          </button>
        </div>
      </div>

      {/* 칸반 보드 */}
      <div className="flex-1 overflow-x-auto p-4 bg-gray-100">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : noPipelines ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <AlertCircle size={48} className="mb-4" />
            <p className="text-lg font-medium mb-2">파이프라인이 없습니다</p>
            <p className="text-sm text-gray-400 mb-4">
              파이프라인과 단계를 먼저 생성해주세요.
            </p>
            <button
              onClick={() => navigate("/sales/pipeline/settings")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              파이프라인 설정
            </button>
          </div>
        ) : !kanbanData?.columns?.length ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <AlertCircle size={48} className="mb-4" />
            <p className="text-lg">파이프라인에 단계가 없습니다.</p>
            <p className="text-sm text-gray-400 mb-4">
              Admin에서 해당 파이프라인에 단계를 추가해주세요.
            </p>
          </div>
        ) : (
          <div className="flex gap-4 h-full pb-4">
            {kanbanData.columns.map((column) => (
              <KanbanColumn
                key={column.stage.id}
                stage={column.stage}
                opportunities={column.opportunities}
                onDrop={handleDrop}
                onCardClick={handleCardClick}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

