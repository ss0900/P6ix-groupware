// src/pages/schedule/ScheduleForm.jsx
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { scheduleApi } from "../../api/schedule";
import api from "../../api/axios";

export default function ScheduleForm({
  mode = "create",
  initial = null,
  initialDate = new Date(),
  companyId = null,
  defaultScope = "personal",
  onSaved,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [participantIds, setParticipantIds] = useState([]);

  const [form, setForm] = useState({
    title: initial?.title || "",
    scope: initial?.scope || defaultScope,
    date: initial?.start?.slice(0, 10) || format(initialDate, "yyyy-MM-dd"),
    time: initial?.start?.slice(11, 16) || "09:00",
    end_date: initial?.end?.slice(0, 10) || "",
    end_time: initial?.end?.slice(11, 16) || "",
    is_all_day: initial?.is_all_day || false,
    memo: initial?.memo || "",
    color: initial?.color || "#3B82F6",
  });

  // 사용자 목록 로드
  useEffect(() => {
    if (form.scope === "company") {
      (async () => {
        try {
          const res = await api.get("/users/");
          setUsers(res.data?.results ?? res.data ?? []);
        } catch (err) {
          console.error("사용자 목록 로드 실패:", err);
        }
      })();
    } else {
      setUsers([]);
    }
  }, [form.scope]);

  // 기존 참여자 설정 (수정 모드)
  useEffect(() => {
    if (initial?.participants) {
      setParticipantIds(initial.participants.map((p) => p.id));
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

    setLoading(true);
    try {
      const start = new Date(`${form.date}T${form.time || "00:00"}:00`).toISOString();
      const end = form.end_date
        ? new Date(`${form.end_date}T${form.end_time || "23:59"}:00`).toISOString()
        : null;

      const payload = {
        title: form.title,
        scope: form.scope,
        start,
        end,
        is_all_day: form.is_all_day,
        memo: form.memo,
        color: form.color,
        company: form.scope === "company" && companyId ? companyId : null,
        participant_ids: form.scope === "company" ? participantIds : [],
      };

      if (mode === "create") {
        await scheduleApi.create(payload);
      } else {
        await scheduleApi.update(initial.id, payload);
      }

      onSaved?.();
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
          {mode === "create" ? "일정 등록" : "일정 수정"}
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* scope 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">일정 구분</label>
          <div className="flex gap-2">
            {[
              { value: "personal", label: "개인", color: "green" },
              { value: "company", label: "회사", color: "red" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={mode === "edit"}
                onClick={() => {
                  setForm((prev) => ({ ...prev, scope: opt.value }));
                  setParticipantIds([]);
                }}
                className={`
                  px-4 py-2 rounded-lg border text-sm
                  ${form.scope === opt.value
                    ? opt.color === "green"
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}
                  ${mode === "edit" ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="일정 제목을 입력하세요"
          />
        </div>

        {/* 종일 */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_all_day"
              checked={form.is_all_day}
              onChange={onChange}
              className="rounded text-blue-600"
            />
            <span className="text-sm text-gray-700">종일</span>
          </label>
        </div>

        {/* 일시 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시작 날짜</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {!form.is_all_day && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">종료 날짜</label>
            <input
              type="date"
              name="end_date"
              value={form.end_date}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {!form.is_all_day && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
              <input
                type="time"
                name="end_time"
                value={form.end_time}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* 색상 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">색상</label>
          <input
            type="color"
            name="color"
            value={form.color}
            onChange={onChange}
            className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
          />
        </div>

        {/* 참여자 (회사 일정일 때만) */}
        {form.scope === "company" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">참여자</label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
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
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 메모 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
          <textarea
            name="memo"
            value={form.memo}
            onChange={onChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="메모를 입력하세요"
          />
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
