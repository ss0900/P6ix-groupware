// src/pages/schedule/ScheduleForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { ArrowLeft, Save, Plus, X, User } from "lucide-react";

export default function ScheduleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);

  const defaultDate = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    schedule_type: "personal",
    start_time: `${defaultDate}T09:00`,
    end_time: `${defaultDate}T10:00`,
    is_all_day: false,
    location: "",
    meeting_room: "",
    reminder_minutes: 30,
    color: "#3B82F6",
    attendee_ids: [],
  });

  const [selectedAttendees, setSelectedAttendees] = useState([]);

  // 회의실 및 사용자 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const [roomsRes, usersRes] = await Promise.all([
          api.get("meeting/rooms/"),
          api.get("core/users/"),
        ]);
        setRooms(roomsRes.data?.results ?? roomsRes.data ?? []);
        setUsers(usersRes.data?.results ?? usersRes.data ?? []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // 편집 모드: 일정 로드
  useEffect(() => {
    if (!isEdit) return;

    setLoading(true);
    (async () => {
      try {
        const res = await api.get(`meeting/schedules/${id}/`);
        const schedule = res.data;
        setFormData({
          title: schedule.title || "",
          description: schedule.description || "",
          schedule_type: schedule.schedule_type || "personal",
          start_time: schedule.start_time?.slice(0, 16) || "",
          end_time: schedule.end_time?.slice(0, 16) || "",
          is_all_day: schedule.is_all_day || false,
          location: schedule.location || "",
          meeting_room: schedule.meeting_room || "",
          reminder_minutes: schedule.reminder_minutes || 30,
          color: schedule.color || "#3B82F6",
          attendee_ids: schedule.attendees || [],
        });
        setSelectedAttendees(schedule.attendees_info || []);
      } catch (err) {
        console.error(err);
        alert("일정을 불러올 수 없습니다.");
        navigate("/schedule");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigate]);

  // 참석자 추가
  const addAttendee = (user) => {
    if (!selectedAttendees.find((a) => a.id === user.id)) {
      setSelectedAttendees([...selectedAttendees, { id: user.id, name: `${user.last_name}${user.first_name}` }]);
      setFormData({ ...formData, attendee_ids: [...formData.attendee_ids, user.id] });
    }
    setShowUserSearch(false);
  };

  // 참석자 제거
  const removeAttendee = (userId) => {
    setSelectedAttendees(selectedAttendees.filter((a) => a.id !== userId));
    setFormData({ ...formData, attendee_ids: formData.attendee_ids.filter((id) => id !== userId) });
  };

  // 저장
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.meeting_room) delete payload.meeting_room;

      if (isEdit) {
        await api.patch(`meeting/schedules/${id}/`, payload);
      } else {
        await api.post("meeting/schedules/", payload);
      }
      navigate("/schedule");
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/schedule")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? "일정 수정" : "일정 등록"}</h1>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="일정 제목"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        {/* 일정 유형 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">일정 유형</label>
            <select
              value={formData.schedule_type}
              onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="personal">개인 일정</option>
              <option value="team">팀 일정</option>
              <option value="company">전사 일정</option>
              <option value="meeting">회의</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">색상</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-10 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* 시간 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시작</label>
            <input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">종료</label>
            <input
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_all_day}
            onChange={(e) => setFormData({ ...formData, is_all_day: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">종일</span>
        </label>

        {/* 장소 / 회의실 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="장소 입력"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">회의실</label>
            <select
              value={formData.meeting_room}
              onChange={(e) => setFormData({ ...formData, meeting_room: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">선택 안함</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.capacity}명)</option>
              ))}
            </select>
          </div>
        </div>

        {/* 참석자 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">참석자</label>
            <button
              type="button"
              onClick={() => setShowUserSearch(true)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus size={16} />
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedAttendees.map((attendee) => (
              <span
                key={attendee.id}
                className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                {attendee.name}
                <button type="button" onClick={() => removeAttendee(attendee.id)} className="hover:text-blue-900">
                  <X size={14} />
                </button>
              </span>
            ))}
            {selectedAttendees.length === 0 && (
              <span className="text-sm text-gray-400">참석자를 추가해주세요</span>
            )}
          </div>
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="일정 설명"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate("/schedule")}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            <Save size={18} />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>

      {/* 사용자 검색 모달 */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">참석자 추가</h3>
              <button onClick={() => setShowUserSearch(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-2">
              {users.filter((u) => !formData.attendee_ids.includes(u.id)).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => addAttendee(user)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg text-left"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User size={16} className="text-blue-600" />
                  </div>
                  <span>{user.last_name}{user.first_name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
