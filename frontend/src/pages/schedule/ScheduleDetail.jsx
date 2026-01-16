// src/pages/schedule/ScheduleDetail.jsx
import React, { useState } from "react";
import { format } from "date-fns";
import { X, Clock, User, FileText, Edit, Trash2 } from "lucide-react";
import { scheduleApi } from "../../api/schedule";

export default function ScheduleDetail({
  item,
  onEdit,
  onDeleted,
  onClose,
}) {
  const [deleting, setDeleting] = useState(false);

  if (!item) return null;

  const startTime = item.start
    ? format(new Date(item.start), "yyyy년 M월 d일 HH:mm")
    : "-";
  const endTime = item.end
    ? format(new Date(item.end), "yyyy년 M월 d일 HH:mm")
    : "";

  // scope 스타일
  const scopeStyle = item.scope === "personal"
    ? { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" }
    : { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" };

  const handleDelete = async () => {
    if (!window.confirm("정말 이 일정을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await scheduleApi.remove(item.id);
      onDeleted?.();
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900">{item.title}</h2>
            <span className={`px-2 py-0.5 text-xs rounded-full border ${scopeStyle.bg} ${scopeStyle.text} ${scopeStyle.border}`}>
              {item.scope === "personal" ? "개인" : "회사"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">일정 상세 정보</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* 정보 카드 */}
      <div className="bg-gray-50 rounded-lg p-5 space-y-4">
        {/* 일시 */}
        <div className="flex items-start gap-3">
          <Clock className="text-gray-400 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-gray-500">일시</p>
            <p className="text-gray-900">{startTime}</p>
            {endTime && (
              <p className="text-gray-600 text-sm">~ {endTime}</p>
            )}
            {item.is_all_day && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded mt-1 inline-block">
                종일
              </span>
            )}
          </div>
        </div>

        {/* 작성자 */}
        <div className="flex items-start gap-3">
          <User className="text-gray-400 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-gray-500">작성자</p>
            <p className="text-gray-900">{item.owner_name || "-"}</p>
          </div>
        </div>

        {/* 참여자 (회사 일정일 때만) */}
        {item.scope === "company" && item.participants?.length > 0 && (
          <div className="flex items-start gap-3">
            <User className="text-gray-400 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">참여자</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {item.participants.map((p) => (
                  <span
                    key={p.id}
                    className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 메모 */}
        {item.memo && (
          <div className="flex items-start gap-3">
            <FileText className="text-gray-400 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">메모</p>
              <p className="text-gray-900 whitespace-pre-wrap">{item.memo}</p>
            </div>
          </div>
        )}

        {/* 등록일 */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            등록일: {item.created_at ? format(new Date(item.created_at), "yyyy-MM-dd HH:mm") : "-"}
          </p>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Edit size={16} />
          수정
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          <Trash2 size={16} />
          {deleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    </div>
  );
}
