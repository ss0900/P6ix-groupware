// src/pages/schedule/CalendarManageModal.jsx
import React, { useState, useEffect } from "react";
import { calendarApi } from "../../api/schedule";
import { Pencil, Trash2, Plus, ChevronRight, ChevronDown, Calendar, X } from "lucide-react";

// 재귀적 트리 아이템 컴포넌트
const ManageTreeItem = ({
  node,
  level,
  onEdit,
  onDelete,
  expandedIds,
  onToggle,
}) => {
  const hasChildren = node.sub_calendars && node.sub_calendars.length > 0;
  const isExpanded = expandedIds.includes(node.id);

  return (
    <div className="select-none">
      <div
        className="flex items-center justify-between py-1 px-2 hover:bg-gray-100 group"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        <div
          className="flex items-center flex-1 min-w-0 cursor-pointer"
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              onToggle(node.id);
            }
          }}
        >
          <span
            className="mr-1 text-gray-400"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : (
              <span className="w-[14px] inline-block" />
            )}
          </span>

          <span
            className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
            style={{ backgroundColor: node.color || "#3B82F6" }}
          />

          <span className="text-sm truncate font-medium text-gray-700">{node.name}</span>
        </div>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(node)} className="p-1 text-gray-400 hover:text-blue-600">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(node.id)} className="p-1 text-gray-400 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.sub_calendars.map((child) => (
            <ManageTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function CalendarManageModal({ isOpen, onClose, onRefresh }) {
  const [calendars, setCalendars] = useState([]);
  const [flatCalendars, setFlatCalendars] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [editingCalendar, setEditingCalendar] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    parent: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchCalendars();
    }
  }, [isOpen]);

  const fetchCalendars = async () => {
    try {
      setIsLoading(true);
      const res = await calendarApi.customCalendars();
      const data = res.data || [];

      // flat 배열 생성
      const flatten = (nodes, result = []) => {
        nodes.forEach((node) => {
          result.push(node);
          if (node.sub_calendars) flatten(node.sub_calendars, result);
        });
        return result;
      };

      setCalendars(data);
      setFlatCalendars(flatten(data));

      const rootIds = data.map((n) => n.id);
      setExpandedIds((prev) => [...new Set([...prev, ...rootIds])]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    setEditingCalendar(null);
    setFormData({ name: "", description: "", color: "#3B82F6", parent: "" });
    setViewMode("form");
  };

  const handleEdit = (calendar) => {
    setEditingCalendar(calendar);
    setFormData({
      name: calendar.name,
      description: calendar.description || "",
      color: calendar.color || "#3B82F6",
      parent: calendar.parent || "",
    });
    setViewMode("form");
  };

  const handleDelete = async (calendarId) => {
    if (!window.confirm("정말 삭제하시겠습니까? 하위 캘린더도 함께 삭제됩니다."))
      return;
    try {
      await calendarApi.remove(calendarId);
      fetchCalendars();
      if (onRefresh) onRefresh();
    } catch (error) {
      alert("삭제 실패");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        parent: formData.parent === "" ? null : formData.parent,
      };

      if (editingCalendar) {
        await calendarApi.update(editingCalendar.id, payload);
      } else {
        await calendarApi.createCustom(payload);
      }

      setViewMode("list");
      fetchCalendars();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert("저장 실패");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calendar size={20} className="text-blue-500" />
            사용자 정의 일정 관리
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 min-h-[400px]">
          {viewMode === "list" ? (
            <div className="h-[400px] flex flex-col">
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                >
                  <Plus size={16} /> 일정 카테고리 추가
                </button>
              </div>

              {isLoading ? (
                <p>Loading...</p>
              ) : (
                <div className="flex-1 overflow-y-auto border rounded p-2">
                  {calendars.length > 0 ? (
                    calendars.map((node) => (
                      <ManageTreeItem
                        key={node.id}
                        node={node}
                        level={0}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        expandedIds={expandedIds}
                        onToggle={handleToggle}
                      />
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      사용자 정의 일정 카테고리가 없습니다.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">카테고리 이름</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">설명</label>
                <textarea
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">색상</label>
                <input
                  type="color"
                  className="mt-1 block w-16 h-10 border border-gray-300 rounded-md cursor-pointer"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">상위 카테고리</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={formData.parent}
                  onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                >
                  <option value="">(최상위 카테고리)</option>
                  {flatCalendars
                    .filter((c) => c.id !== editingCalendar?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  저장
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
