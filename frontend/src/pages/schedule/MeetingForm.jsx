// src/pages/schedule/MeetingForm.jsx
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { meetingApi } from "../../api/meeting";
import api from "../../api/axios";

export default function MeetingForm({
  mode = "create",
  initial = null,
  initialDate = new Date(),
  onSaved,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [participantIds, setParticipantIds] = useState([]);

  const [form, setForm] = useState({
    title: initial?.title || "",
    date: initial?.schedule?.slice(0, 10) || format(initialDate, "yyyy-MM-dd"),
    time: initial?.schedule?.slice(11, 16) || "09:00",
    location_type: initial?.location_type || "offline_address",
    location: initial?.location || "",
    meeting_room: initial?.meeting_room || "",
    agenda: initial?.agenda || "",
    is_urgent: initial?.is_urgent || false,
  });

  // 회의실 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await meetingApi.rooms.list({ is_active: 1 });
        setRooms(res.data?.results ?? res.data ?? []);
      } catch (err) {
        console.error("회의실 목록 로드 실패:", err);
      }
    })();
  }, []);

  // 사용자 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/users/");
        setUsers(res.data?.results ?? res.data ?? []);
      } catch (err) {
        console.error("사용자 목록 로드 실패:", err);
      }
    })();
  }, []);

  // 기존 참석자 설정 (수정 모드)
  useEffect(() => {
    if (initial?.participants) {
      setParticipantIds(initial.participants.map((p) => p.user_id));
    }
  }, [initial]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleParticipant = (userId) => {
    setParticipantIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return alert("제목을 입력해주세요.");
    if (!form.date) return alert("날짜를 선택해주세요.");
    if (!form.time) return alert("시간을 선택해주세요.");

    setLoading(true);
    try {
      const schedule = new Date(`${form.date}T${form.time}:00`).toISOString();
      const payload = {
        title: form.title,
        schedule,
        location_type: form.location_type,
        location: form.location,
        meeting_room: form.location_type === "offline_room" && form.meeting_room
          ? Number(form.meeting_room)
          : null,
        agenda: form.agenda,
        is_urgent: form.is_urgent,
        participant_ids: participantIds,
      };

      let result;
      if (mode === "create") {
        const res = await meetingApi.create(payload);
        result = res.data;
      } else {
        const res = await meetingApi.update(initial.id, payload);
        result = res.data;
      }

      onSaved?.(result);
    } catch (err) {
      console.error("저장 실패:", err);
      alert("저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {mode === "create" ? "회의 등록" : "회의 수정"}
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="회의 제목을 입력하세요"
          />
        </div>

        {/* 일시 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시간</label>
            <input
              type="time"
              name="time"
              value={form.time}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 장소 구분 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">장소 구분</label>
          <div className="flex gap-2">
            {[
              { value: "online", label: "온라인" },
              { value: "offline_room", label: "회의실" },
              { value: "offline_address", label: "주소" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, location_type: opt.value }))}
                className={`
                  px-4 py-2 rounded-lg border text-sm
                  ${form.location_type === opt.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 장소 상세 */}
        {form.location_type === "offline_room" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">회의실 선택</label>
            <select
              name="meeting_room"
              value={form.meeting_room}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">회의실을 선택하세요</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.location || "위치 미지정"})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.location_type === "online" ? "화상회의 링크" : "주소"}
            </label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={form.location_type === "online" ? "https://..." : "장소를 입력하세요"}
            />
          </div>
        )}

        {/* 안건 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">안건</label>
          <textarea
            name="agenda"
            value={form.agenda}
            onChange={onChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="회의 안건을 입력하세요"
          />
        </div>

        {/* 참석자 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">참석자</label>
          <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
            {users.length === 0 ? (
              <p className="text-gray-400 text-sm">사용자가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={participantIds.includes(user.id)}
                      onChange={() => toggleParticipant(user.id)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm">
                      {user.last_name}{user.first_name}
                      {user.position && <span className="text-gray-400 ml-1">({user.position})</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 긴급 */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_urgent"
              checked={form.is_urgent}
              onChange={onChange}
              className="rounded text-red-600"
            />
            <span className="text-sm text-gray-700">긴급 회의</span>
          </label>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "저장 중..." : mode === "create" ? "등록" : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
