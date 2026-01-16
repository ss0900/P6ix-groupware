// src/pages/schedule/MeetingDetail.jsx
import React, { useState } from "react";
import { format } from "date-fns";
import { X, Clock, MapPin, Users, FileText, AlertCircle, Edit, Trash2 } from "lucide-react";
import { meetingApi } from "../../api/meeting";

// 장소 타입 라벨
const getLocationLabel = (locationType) => {
  switch (locationType) {
    case "online": return "온라인";
    case "offline_room": return "오프라인(회의실)";
    case "offline_address": return "오프라인(주소)";
    default: return "오프라인";
  }
};

export default function MeetingDetail({
  item,
  myUserId,
  onEdit,
  onDeleted,
  onClose,
}) {
  const [deleting, setDeleting] = useState(false);

  if (!item) return null;

  const datetime = item.schedule
    ? format(new Date(item.schedule), "yyyy년 M월 d일 HH:mm")
    : "-";

  // 내 참석 정보
  const myParticipant = (item.participants || []).find(
    (p) => Number(p.user_id) === myUserId
  );

  const handleDelete = async () => {
    if (!window.confirm("정말 이 회의를 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await meetingApi.remove(item.id);
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
            {item.is_urgent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full border border-red-200">
                <AlertCircle size={12} />
                긴급
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">회의 상세 정보</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
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
            <p className="text-gray-900">{datetime}</p>
          </div>
        </div>

        {/* 장소 */}
        <div className="flex items-start gap-3">
          <MapPin className="text-gray-400 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-gray-500">장소</p>
            <p className="text-gray-900">
              <span className="inline-block px-2 py-0.5 bg-white border border-gray-200 rounded text-xs mr-2">
                {getLocationLabel(item.location_type)}
              </span>
              {item.room_name || item.location || "-"}
            </p>
          </div>
        </div>

        {/* 참석자 */}
        <div className="flex items-start gap-3">
          <Users className="text-gray-400 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-gray-500">참석자</p>
            {item.participants?.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-1">
                {item.participants.map((p) => (
                  <span
                    key={p.id}
                    className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs
                      ${p.responded
                        ? p.is_attending
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-600"
                      }
                    `}
                  >
                    {p.user_name}
                    <span className="ml-1 text-xs opacity-60">
                      {p.responded ? (p.is_attending ? "참석" : "불참") : "미응답"}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">참석자가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 안건 */}
        {item.agenda && (
          <div className="flex items-start gap-3">
            <FileText className="text-gray-400 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">안건</p>
              <p className="text-gray-900 whitespace-pre-wrap">{item.agenda}</p>
            </div>
          </div>
        )}

        {/* 회의 결과 */}
        {item.result && (
          <div className="flex items-start gap-3">
            <FileText className="text-gray-400 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">회의 결과</p>
              <p className="text-gray-900 whitespace-pre-wrap">{item.result}</p>
            </div>
          </div>
        )}

        {/* 작성자 */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            작성자: {item.author_name || "-"} | 
            등록일: {item.created_at ? format(new Date(item.created_at), "yyyy-MM-dd HH:mm") : "-"}
          </p>
        </div>
      </div>

      {/* 내 참석 상태 */}
      {myParticipant && (
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>내 참석 상태:</strong>{" "}
            {myParticipant.responded
              ? myParticipant.is_attending
                ? "참석"
                : "불참"
              : "미응답"}
          </p>
        </div>
      )}

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
