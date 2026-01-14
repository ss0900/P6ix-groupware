// src/pages/operation/PipelineSettings.jsx
/**
 * 파이프라인 설정 - 파이프라인 및 단계 관리
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiMove,
} from "react-icons/fi";
import { SalesService } from "../../api/operation";

function PipelineSettings() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  // 파이프라인 편집
  const [editingPipeline, setEditingPipeline] = useState(null);
  const [pipelineForm, setPipelineForm] = useState({
    name: "",
    description: "",
  });
  const [savingPipeline, setSavingPipeline] = useState(false);

  // 단계 편집
  const [editingStage, setEditingStage] = useState(null);
  const [stageForm, setStageForm] = useState({
    name: "",
    stage_type: "open",
    probability: 50,
    color: "#3B82F6",
  });
  const [savingStage, setSavingStage] = useState(false);

  const fetchPipelines = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SalesService.getPipelines();
      setPipelines(data);
      if (data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(data[0]);
      }
    } catch (error) {
      console.error("Error fetching pipelines:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedPipeline]);

  const fetchStages = useCallback(async () => {
    if (!selectedPipeline) return;
    try {
      const data = await SalesService.getStages(selectedPipeline.id);
      setStages(data);
    } catch (error) {
      console.error("Error fetching stages:", error);
    }
  }, [selectedPipeline]);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  // 파이프라인 CRUD
  const handleAddPipeline = () => {
    setEditingPipeline("new");
    setPipelineForm({ name: "", description: "" });
  };

  const handleEditPipeline = (pipeline) => {
    setEditingPipeline(pipeline.id);
    setPipelineForm({
      name: pipeline.name,
      description: pipeline.description || "",
    });
  };

  const handleSavePipeline = async () => {
    if (!pipelineForm.name.trim()) return;

    setSavingPipeline(true);
    try {
      if (editingPipeline === "new") {
        const created = await SalesService.createPipeline(pipelineForm);
        setPipelines([...pipelines, created]);
        setSelectedPipeline(created);
      } else {
        const updated = await SalesService.updatePipeline(
          editingPipeline,
          pipelineForm
        );
        setPipelines(
          pipelines.map((p) => (p.id === editingPipeline ? updated : p))
        );
        if (selectedPipeline?.id === editingPipeline) {
          setSelectedPipeline(updated);
        }
      }
      setEditingPipeline(null);
    } catch (error) {
      console.error("Error saving pipeline:", error);
    } finally {
      setSavingPipeline(false);
    }
  };

  const handleDeletePipeline = async (id) => {
    if (
      !window.confirm(
        "파이프라인을 삭제하시겠습니까? 관련된 모든 단계도 함께 삭제됩니다."
      )
    )
      return;

    try {
      await SalesService.deletePipeline(id);
      const remaining = pipelines.filter((p) => p.id !== id);
      setPipelines(remaining);
      if (selectedPipeline?.id === id) {
        setSelectedPipeline(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (error) {
      console.error("Error deleting pipeline:", error);
    }
  };

  // 단계 CRUD
  const handleAddStage = () => {
    setEditingStage("new");
    setStageForm({
      name: "",
      stage_type: "open",
      probability: 50,
      color: "#3B82F6",
      order: stages.length,
    });
  };

  const handleEditStage = (stage) => {
    setEditingStage(stage.id);
    setStageForm({
      name: stage.name,
      stage_type: stage.stage_type,
      probability: stage.probability,
      color: stage.color,
    });
  };

  const handleSaveStage = async () => {
    if (!stageForm.name.trim() || !selectedPipeline) return;

    setSavingStage(true);
    try {
      const data = {
        ...stageForm,
        pipeline: selectedPipeline.id,
      };

      if (editingStage === "new") {
        data.order = stages.length;
        const created = await SalesService.createStage(data);
        setStages([...stages, created]);
      } else {
        const updated = await SalesService.updateStage(editingStage, stageForm);
        setStages(stages.map((s) => (s.id === editingStage ? updated : s)));
      }
      setEditingStage(null);
    } catch (error) {
      console.error("Error saving stage:", error);
    } finally {
      setSavingStage(false);
    }
  };

  const handleDeleteStage = async (id) => {
    if (!window.confirm("단계를 삭제하시겠습니까?")) return;

    try {
      await SalesService.deleteStage(id);
      setStages(stages.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Error deleting stage:", error);
    }
  };

  const stageTypeLabels = {
    open: "진행중",
    won: "수주",
    lost: "실주",
  };

  const colorPresets = [
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // yellow
    "#EF4444", // red
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#6B7280", // gray
    "#14B8A6", // teal
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/operation/sales/pipeline")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-title">파이프라인 설정</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 파이프라인 목록 */}
        <div className="page-box">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">파이프라인</h3>
            <button
              onClick={handleAddPipeline}
              className="btn-create-sm flex items-center gap-1"
            >
              <FiPlus className="w-3 h-3" />
              추가
            </button>
          </div>

          <div className="space-y-2">
            {pipelines.length === 0 && !editingPipeline && (
              <p className="text-center text-gray-500 py-4">
                파이프라인을 추가해주세요.
              </p>
            )}

            {/* 새 파이프라인 입력 */}
            {editingPipeline === "new" && (
              <div className="p-3 border-2 border-blue-500 rounded-lg bg-blue-50">
                <input
                  type="text"
                  value={pipelineForm.name}
                  onChange={(e) =>
                    setPipelineForm({ ...pipelineForm, name: e.target.value })
                  }
                  placeholder="파이프라인 이름"
                  className="input-base mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePipeline}
                    disabled={savingPipeline || !pipelineForm.name.trim()}
                    className="flex-1 btn-save-sm flex items-center justify-center gap-1"
                  >
                    <FiCheck className="w-3 h-3" />
                    저장
                  </button>
                  <button
                    onClick={() => setEditingPipeline(null)}
                    className="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {pipelines.map((pipeline) => (
              <div
                key={pipeline.id}
                onClick={() =>
                  editingPipeline !== pipeline.id &&
                  setSelectedPipeline(pipeline)
                }
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedPipeline?.id === pipeline.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                {editingPipeline === pipeline.id ? (
                  <div>
                    <input
                      type="text"
                      value={pipelineForm.name}
                      onChange={(e) =>
                        setPipelineForm({
                          ...pipelineForm,
                          name: e.target.value,
                        })
                      }
                      className="input-base mb-2"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSavePipeline}
                        disabled={savingPipeline}
                        className="flex-1 btn-save-sm flex items-center justify-center gap-1"
                      >
                        <FiCheck className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingPipeline(null)}
                        className="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {pipeline.name}
                      </p>
                      {pipeline.is_default && (
                        <span className="text-xs text-blue-600">기본</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPipeline(pipeline);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePipeline(pipeline.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 우측: 선택된 파이프라인의 단계 목록 */}
        <div className="lg:col-span-2 page-box">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              {selectedPipeline ? `${selectedPipeline.name} - 단계` : "단계"}
            </h3>
            {selectedPipeline && (
              <button
                onClick={handleAddStage}
                className="btn-create-sm flex items-center gap-1"
              >
                <FiPlus className="w-3 h-3" />
                단계 추가
              </button>
            )}
          </div>

          {!selectedPipeline ? (
            <p className="text-center text-gray-500 py-8">
              파이프라인을 선택해주세요.
            </p>
          ) : stages.length === 0 && !editingStage ? (
            <p className="text-center text-gray-500 py-8">
              단계를 추가해주세요.
            </p>
          ) : (
            <div className="space-y-2">
              {/* 새 단계 입력 */}
              {editingStage === "new" && (
                <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">
                        단계명
                      </label>
                      <input
                        type="text"
                        value={stageForm.name}
                        onChange={(e) =>
                          setStageForm({ ...stageForm, name: e.target.value })
                        }
                        className="input-base"
                        placeholder="예: 신규 접수"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        유형
                      </label>
                      <select
                        value={stageForm.stage_type}
                        onChange={(e) =>
                          setStageForm({
                            ...stageForm,
                            stage_type: e.target.value,
                          })
                        }
                        className="input-base"
                      >
                        <option value="open">진행중</option>
                        <option value="won">수주</option>
                        <option value="lost">실주</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        확률 (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={stageForm.probability}
                        onChange={(e) =>
                          setStageForm({
                            ...stageForm,
                            probability: parseInt(e.target.value) || 0,
                          })
                        }
                        className="input-base"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs text-gray-600 mb-1">
                      색상
                    </label>
                    <div className="flex gap-2">
                      {colorPresets.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setStageForm({ ...stageForm, color })}
                          className={`w-8 h-8 rounded-full border-2 ${
                            stageForm.color === color
                              ? "border-gray-800"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveStage}
                      disabled={savingStage || !stageForm.name.trim()}
                      className="btn-save flex items-center gap-1"
                    >
                      <FiCheck className="w-4 h-4" />
                      저장
                    </button>
                    <button
                      onClick={() => setEditingStage(null)}
                      className="btn-cancel"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}

              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    editingStage === stage.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  {editingStage === stage.id ? (
                    <div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={stageForm.name}
                            onChange={(e) =>
                              setStageForm({
                                ...stageForm,
                                name: e.target.value,
                              })
                            }
                            className="input-base"
                            autoFocus
                          />
                        </div>
                        <div>
                          <select
                            value={stageForm.stage_type}
                            onChange={(e) =>
                              setStageForm({
                                ...stageForm,
                                stage_type: e.target.value,
                              })
                            }
                            className="input-base"
                          >
                            <option value="open">진행중</option>
                            <option value="won">수주</option>
                            <option value="lost">실주</option>
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={stageForm.probability}
                            onChange={(e) =>
                              setStageForm({
                                ...stageForm,
                                probability: parseInt(e.target.value) || 0,
                              })
                            }
                            className="input-base"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mb-3">
                        {colorPresets.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() =>
                              setStageForm({ ...stageForm, color })
                            }
                            className={`w-6 h-6 rounded-full border-2 ${
                              stageForm.color === color
                                ? "border-gray-800"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveStage}
                          disabled={savingStage}
                          className="btn-save-sm"
                        >
                          <FiCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingStage(null)}
                          className="btn-cancel-sm"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 cursor-move">
                          <FiMove className="w-4 h-4" />
                        </span>
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-medium text-gray-900">
                          {stage.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            stage.stage_type === "won"
                              ? "bg-green-100 text-green-700"
                              : stage.stage_type === "lost"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {stageTypeLabels[stage.stage_type]}
                        </span>
                        <span className="text-sm text-gray-500">
                          {stage.probability}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditStage(stage)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStage(stage.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PipelineSettings;
