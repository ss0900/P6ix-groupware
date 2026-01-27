// src/pages/operation/PipelineBoard.jsx
/**
 * 파이프라인 칸반 보드
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  FiPlus,
  FiDollarSign,
  FiCalendar,
  FiUser,
  FiAlertCircle,
} from "react-icons/fi";
import { SalesService } from "../../api/operation";

function PipelineBoard() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [boardData, setBoardData] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchPipelines = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SalesService.getPipelines();
      setPipelines(data);
      if (data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(data[0].id);
      } else if (data.length === 0) {
        // 파이프라인이 없으면 로딩 종료
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching pipelines:", error);
      setLoading(false);
    }
  }, [selectedPipeline]);

  const fetchBoardData = useCallback(async () => {
    if (!selectedPipeline) return;

    setLoading(true);
    try {
      const data = await SalesService.getPipelineLeads(selectedPipeline);
      setBoardData(data);
    } catch (error) {
      console.error("Error fetching board data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedPipeline]);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  useEffect(() => {
    if (selectedPipeline) {
      fetchBoardData();
    }
  }, [selectedPipeline, fetchBoardData]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const leadId = parseInt(draggableId.replace("lead-", ""));
    const newStageId = parseInt(destination.droppableId.replace("stage-", ""));

    // Optimistic update
    const newBoardData = { ...boardData };
    const sourceStageId = parseInt(source.droppableId.replace("stage-", ""));

    // Find the lead
    const leadIndex = newBoardData[sourceStageId].leads.findIndex(
      (l) => l.id === leadId
    );
    if (leadIndex === -1) return;

    const [movedLead] = newBoardData[sourceStageId].leads.splice(leadIndex, 1);
    movedLead.stage = newStageId;
    movedLead.stage_name = newBoardData[newStageId].stage.name;
    movedLead.stage_color = newBoardData[newStageId].stage.color;

    newBoardData[newStageId].leads.splice(destination.index, 0, movedLead);
    setBoardData(newBoardData);

    // API Call
    try {
      await SalesService.moveStage(leadId, newStageId);
    } catch (error) {
      console.error("Error moving stage:", error);
      fetchBoardData(); // Revert on error
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return "";
    if (amount >= 100000000) {
      return (amount / 100000000).toFixed(1) + "억";
    }
    if (amount >= 10000) {
      return (amount / 10000).toFixed(0) + "만";
    }
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const stageIds = Object.keys(boardData)
    .map(Number)
    .sort((a, b) => {
      return (
        (boardData[a]?.stage?.order || 0) - (boardData[b]?.stage?.order || 0)
      );
    });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-title">파이프라인</h1>
          <select
            value={selectedPipeline || ""}
            onChange={(e) => setSelectedPipeline(parseInt(e.target.value))}
            className="input-base text-sm w-48"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/operation/sales/pipeline/settings")}
            className="btn-edit flex items-center gap-2"
            title="파이프라인 설정"
          >
            설정
          </button>
          <button
            onClick={() => navigate("/operation/sales/leads/new")}
            className="btn-create flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />새 영업기회
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex justify-center items-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : pipelines.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            파이프라인이 없습니다
          </h3>
          <p className="text-gray-500 mb-6">
            먼저 파이프라인과 단계를 생성해야 합니다.
          </p>
          <button
            onClick={() => navigate("/operation/sales/pipeline/settings")}
            className="btn-create flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            파이프라인 설정
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
            {stageIds.map((stageId) => {
              const stageData = boardData[stageId];
              if (!stageData) return null;

              const { stage, leads } = stageData;
              const totalAmount = leads.reduce(
                (sum, l) => sum + (parseFloat(l.expected_amount) || 0),
                0
              );

              return (
                <div key={stageId} className="flex-shrink-0 w-72">
                  {/* Stage Header */}
                  <div
                    className="px-3 py-2 rounded-t-lg flex items-center justify-between"
                    style={{ backgroundColor: stage.color + "20" }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="font-medium text-sm text-gray-800">
                        {stage.name}
                      </span>
                      <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                        {leads.length}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatAmount(totalAmount)}
                    </span>
                  </div>

                  {/* Stage Column */}
                  <Droppable droppableId={`stage-${stageId}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`bg-gray-50 rounded-b-lg p-2 min-h-[400px] transition-colors ${
                          snapshot.isDraggingOver ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="space-y-2">
                          {leads.map((lead, index) => (
                            <Draggable
                              key={lead.id}
                              draggableId={`lead-${lead.id}`}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() =>
                                    navigate(
                                      `/operation/sales/leads/${lead.id}`
                                    )
                                  }
                                  className={`bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow ${
                                    snapshot.isDragging
                                      ? "shadow-lg ring-2 ring-blue-500"
                                      : ""
                                  }`}
                                >
                                  {/* Lead Card */}
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                        {lead.title}
                                      </p>
                                      {lead.company_name && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {lead.company_name}
                                        </p>
                                      )}
                                    </div>
                                    {lead.is_stalled && (
                                      <span className="flex items-center gap-1 text-xs text-orange-500 ml-2">
                                        <FiAlertCircle className="w-3 h-3" />
                                        {lead.stalled_days}d
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    {lead.expected_amount && (
                                      <span className="flex items-center gap-1">
                                        <FiDollarSign className="w-3 h-3" />
                                        {formatAmount(lead.expected_amount)}
                                      </span>
                                    )}
                                    {lead.expected_close_date && (
                                      <span className="flex items-center gap-1">
                                        <FiCalendar className="w-3 h-3" />
                                        {formatDate(lead.expected_close_date)}
                                      </span>
                                    )}
                                    {lead.owner_name && (
                                      <span className="flex items-center gap-1">
                                        <FiUser className="w-3 h-3" />
                                        {lead.owner_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}

export default PipelineBoard;
