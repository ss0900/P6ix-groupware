// src/pages/sales/PipelineSettings.jsx
// 파이프라인 설정 페이지
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { pipelineApi, stageApi } from "../../api/salesApi";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Check,
  X,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// 색상 옵션
const COLORS = [
  "#6b7280", "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#a855f7", "#ec4899",
];

// 단계 유형
const STAGE_TYPES = [
  { value: "open", label: "진행중", color: "bg-blue-100 text-blue-600" },
  { value: "won", label: "수주", color: "bg-green-100 text-green-600" },
  { value: "lost", label: "실주", color: "bg-red-100 text-red-600" },
];

export default function PipelineSettings() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPipeline, setExpandedPipeline] = useState(null);
  
  // 파이프라인 폼
  const [showPipelineForm, setShowPipelineForm] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState(null);
  const [pipelineForm, setPipelineForm] = useState({
    name: "",
    description: "",
    is_default: false,
  });
  
  // 단계 폼
  const [showStageForm, setShowStageForm] = useState(null); // pipeline id
  const [editingStage, setEditingStage] = useState(null);
  const [stageForm, setStageForm] = useState({
    name: "",
    probability: 0,
    stage_type: "open",
    color: "#3b82f6",
  });

  // 데이터 로드
  const loadPipelines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pipelineApi.getList();
      const list = res.data?.results ?? res.data ?? [];
      setPipelines(list);
      
      // 첫 번째 파이프라인 확장
      if (list.length > 0 && !expandedPipeline) {
        setExpandedPipeline(list[0].id);
      }
    } catch (err) {
      console.error("파이프라인 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [expandedPipeline]);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  // 파이프라인 저장
  const handleSavePipeline = async (e) => {
    e.preventDefault();
    try {
      if (editingPipeline) {
        await pipelineApi.update(editingPipeline.id, pipelineForm);
      } else {
        await pipelineApi.create(pipelineForm);
      }
      setShowPipelineForm(false);
      setEditingPipeline(null);
      setPipelineForm({ name: "", description: "", is_default: false });
      loadPipelines();
    } catch (err) {
      console.error("파이프라인 저장 실패:", err);
      alert("저장에 실패했습니다.");
    }
  };

  // 파이프라인 삭제
  const handleDeletePipeline = async (id) => {
    if (!window.confirm("파이프라인을 삭제하시겠습니까? 연결된 단계도 모두 삭제됩니다.")) return;
    try {
      await pipelineApi.delete(id);
      loadPipelines();
    } catch (err) {
      console.error("파이프라인 삭제 실패:", err);
      alert("삭제에 실패했습니다.");
    }
  };

  // 기본 파이프라인 설정
  const handleSetDefault = async (id) => {
    try {
      await pipelineApi.setDefault(id);
      loadPipelines();
    } catch (err) {
      console.error("기본 설정 실패:", err);
    }
  };

  // 파이프라인 편집
  const handleEditPipeline = (pipeline) => {
    setEditingPipeline(pipeline);
    setPipelineForm({
      name: pipeline.name,
      description: pipeline.description || "",
      is_default: pipeline.is_default,
    });
    setShowPipelineForm(true);
  };

  // 단계 저장
  const handleSaveStage = async (e, pipelineId) => {
    e.preventDefault();
    try {
      const data = {
        ...stageForm,
        pipeline: pipelineId,
        order: editingStage ? editingStage.order : 999,
      };
      
      if (editingStage) {
        await stageApi.update(editingStage.id, data);
      } else {
        await stageApi.create(data);
      }
      
      setShowStageForm(null);
      setEditingStage(null);
      setStageForm({ name: "", probability: 0, stage_type: "open", color: "#3b82f6" });
      loadPipelines();
    } catch (err) {
      console.error("단계 저장 실패:", err);
      alert("저장에 실패했습니다.");
    }
  };

  // 단계 삭제
  const handleDeleteStage = async (stageId) => {
    if (!window.confirm("단계를 삭제하시겠습니까?")) return;
    try {
      await stageApi.delete(stageId);
      loadPipelines();
    } catch (err) {
      console.error("단계 삭제 실패:", err);
      alert("삭제에 실패했습니다.");
    }
  };

  // 단계 편집
  const handleEditStage = (stage, pipelineId) => {
    setEditingStage(stage);
    setStageForm({
      name: stage.name,
      probability: stage.probability,
      stage_type: stage.stage_type,
      color: stage.color,
    });
    setShowStageForm(pipelineId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/sales/pipeline")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">파이프라인 설정</h1>
        </div>
        <button
          onClick={() => {
            setEditingPipeline(null);
            setPipelineForm({ name: "", description: "", is_default: pipelines.length === 0 });
            setShowPipelineForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          파이프라인 추가
        </button>
      </div>

      {/* 파이프라인 폼 */}
      {showPipelineForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-4">
            {editingPipeline ? "파이프라인 수정" : "새 파이프라인"}
          </h3>
          <form onSubmit={handleSavePipeline} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                파이프라인명 *
              </label>
              <input
                type="text"
                value={pipelineForm.name}
                onChange={(e) => setPipelineForm({ ...pipelineForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                value={pipelineForm.description}
                onChange={(e) => setPipelineForm({ ...pipelineForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={pipelineForm.is_default}
                onChange={(e) => setPipelineForm({ ...pipelineForm, is_default: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_default" className="text-sm text-gray-700">
                기본 파이프라인으로 설정
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPipelineForm(false);
                  setEditingPipeline(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 파이프라인 목록 */}
      {pipelines.length === 0 && !showPipelineForm ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">아직 파이프라인이 없습니다.</p>
          <button
            onClick={() => {
              setPipelineForm({ name: "", description: "", is_default: true });
              setShowPipelineForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            첫 파이프라인 만들기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* 파이프라인 헤더 */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedPipeline(
                  expandedPipeline === pipeline.id ? null : pipeline.id
                )}
              >
                <div className="flex items-center gap-3">
                  {expandedPipeline === pipeline.id ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{pipeline.name}</h3>
                      {pipeline.is_default && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                          <Star size={10} />
                          기본
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {pipeline.stages?.length || 0}개 단계
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {!pipeline.is_default && (
                    <button
                      onClick={() => handleSetDefault(pipeline.id)}
                      className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-gray-100 rounded-lg"
                      title="기본으로 설정"
                    >
                      <Star size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditPipeline(pipeline)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeletePipeline(pipeline.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* 단계 목록 */}
              {expandedPipeline === pipeline.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  {/* 단계 추가 버튼 */}
                  <button
                    onClick={() => {
                      setEditingStage(null);
                      setStageForm({ name: "", probability: 0, stage_type: "open", color: "#3b82f6" });
                      setShowStageForm(pipeline.id);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 mb-4 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    <Plus size={16} />
                    단계 추가
                  </button>

                  {/* 단계 폼 */}
                  {showStageForm === pipeline.id && (
                    <form
                      onSubmit={(e) => handleSaveStage(e, pipeline.id)}
                      className="bg-white rounded-lg border border-gray-200 p-4 mb-4 space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            단계명 *
                          </label>
                          <input
                            type="text"
                            value={stageForm.name}
                            onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            성공 확률 (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={stageForm.probability}
                            onChange={(e) => setStageForm({ ...stageForm, probability: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            단계 유형
                          </label>
                          <select
                            value={stageForm.stage_type}
                            onChange={(e) => setStageForm({ ...stageForm, stage_type: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            {STAGE_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            색상
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setStageForm({ ...stageForm, color })}
                                className={`w-6 h-6 rounded-full border-2 ${
                                  stageForm.color === color ? "border-gray-800" : "border-transparent"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowStageForm(null);
                            setEditingStage(null);
                          }}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          저장
                        </button>
                      </div>
                    </form>
                  )}

                  {/* 단계 목록 */}
                  <div className="space-y-2">
                    {(!pipeline.stages || pipeline.stages.length === 0) ? (
                      <p className="text-center py-4 text-gray-400 text-sm">
                        아직 단계가 없습니다. 위 버튼으로 단계를 추가하세요.
                      </p>
                    ) : (
                      pipeline.stages.map((stage, idx) => (
                        <div
                          key={stage.id}
                          className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical size={16} className="text-gray-300" />
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className="font-medium text-gray-800">{stage.name}</span>
                            <span className="text-sm text-gray-400">{stage.probability}%</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              STAGE_TYPES.find((t) => t.value === stage.stage_type)?.color || ""
                            }`}>
                              {STAGE_TYPES.find((t) => t.value === stage.stage_type)?.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditStage(stage, pipeline.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteStage(stage.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
