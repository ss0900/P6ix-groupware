// src/pages/schedule/MeetingRoomManage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, GripVertical, X, Check } from "lucide-react";
import { meetingApi } from "../../api/meeting";

export default function MeetingRoomManage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    capacity: 10,
    description: "",
    color: "#3B82F6",
    is_active: true,
  });

  // 회의실 목록 로드
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await meetingApi.rooms.list();
      setRooms(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error("회의실 목록 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const resetForm = () => {
    setForm({
      name: "",
      location: "",
      capacity: 10,
      description: "",
      color: "#3B82F6",
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (room) => {
    setForm({
      name: room.name || "",
      location: room.location || "",
      capacity: room.capacity || 10,
      description: room.description || "",
      color: room.color || "#3B82F6",
      is_active: room.is_active ?? true,
    });
    setEditingId(room.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("회의실 이름을 입력해주세요.");

    try {
      if (editingId) {
        await meetingApi.rooms.update(editingId, form);
      } else {
        await meetingApi.rooms.create(form);
      }
      fetchRooms();
      resetForm();
    } catch (err) {
      console.error("저장 실패:", err);
      alert("저장에 실패했습니다.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("정말 이 회의실을 삭제하시겠습니까?")) return;
    try {
      await meetingApi.rooms.remove(id);
      fetchRooms();
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제에 실패했습니다.");
    }
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">회의실 관리</h1>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          회의실 추가
        </button>
      </div>

      {/* 회의실 목록 */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : rooms.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            등록된 회의실이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <GripVertical className="text-gray-300 cursor-move" size={20} />
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: room.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{room.name}</h3>
                      {!room.is_active && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                          비활성
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {room.location || "위치 미지정"} · 수용 {room.capacity}명
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditForm(room)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(room.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 등록/수정 폼 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={resetForm} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingId ? "회의실 수정" : "회의실 추가"}
              </h2>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  회의실 이름 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="대회의실"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  위치
                </label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="3층 동관"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    수용 인원
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={form.capacity}
                    onChange={onChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    색상
                  </label>
                  <input
                    type="color"
                    name="color"
                    value={form.color}
                    onChange={onChange}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="회의실에 대한 설명"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={onChange}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-gray-700">사용 가능</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Check size={16} />
                  {editingId ? "저장" : "추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
