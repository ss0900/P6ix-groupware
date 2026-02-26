// src/pages/schedule/ScheduleDetail.jsx
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  X, Clock, User, FileText, Edit, Trash2, MapPin, Tag, 
  AlertTriangle, Video, Check, XCircle, Users, Link as LinkIcon 
} from "lucide-react";
import { scheduleApi, getMyUserIdFromToken } from "../../api/schedule";
import PageHeader from "../../components/common/ui/PageHeader";

// 이벤트 타입별 스타일
const EVENT_TYPE_STYLES = {
  general: { bg: "bg-gray-100", text: "text-gray-700", label: "일반" },
  annual: { bg: "bg-yellow-100", text: "text-yellow-800", label: "연차" },
  monthly: { bg: "bg-orange-100", text: "text-orange-700", label: "월차" },
  half: { bg: "bg-blue-100", text: "text-blue-700", label: "반차" },
  meeting: { bg: "bg-purple-100", text: "text-purple-700", label: "회의" },
  trip: { bg: "bg-green-100", text: "text-green-700", label: "출장" },
};

const LOCATION_TYPE_LABELS = {
  online: "온라인",
  offline_room: "오프라인(회의실)",
  offline_address: "오프라인(주소)",
};

export default function ScheduleDetail({
  item,
  onEdit,
  onDeleted,
  onClose,
  onRsvpChanged,
}) {
  const [deleting, setDeleting] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [myRsvpStatus, setMyRsvpStatus] = useState(null);

  const myUserId = getMyUserIdFromToken();
  const isMeeting = item?.event_type === "meeting";
  const isParticipant = item?.participants?.some(p => p.id === myUserId) || 
                        item?.attendee_responses?.some(a => a.user === myUserId);

  // 내 RSVP 상태 확인
  useEffect(() => {
    if (item?.attendee_responses) {
      const myResponse = item.attendee_responses.find(a => a.user === myUserId);
      if (myResponse) {
        setMyRsvpStatus(myResponse.is_attending);
      }
    }
  }, [item, myUserId]);

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

  // event_type 스타일
  const eventTypeStyle = EVENT_TYPE_STYLES[item.event_type] || EVENT_TYPE_STYLES.general;

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

  const handleRsvp = async (isAttending) => {
    setRsvpLoading(true);
    try {
      await scheduleApi.rsvp(item.id, isAttending);
      setMyRsvpStatus(isAttending);
      onRsvpChanged?.();
    } catch (err) {
      console.error("RSVP 실패:", err);
      alert("참석 응답에 실패했습니다.");
    } finally {
      setRsvpLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <PageHeader
        className="mb-0"
        subtitle="일정 상세 정보"
        title={(
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-semibold text-gray-900">{item.title}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full border ${scopeStyle.bg} ${scopeStyle.text} ${scopeStyle.border}`}>
              {item.scope === "personal" ? "개인" : "회사"}
            </span>
            {item.event_type && item.event_type !== "general" && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${eventTypeStyle.bg} ${eventTypeStyle.text}`}>
                {eventTypeStyle.label}
              </span>
            )}
            {item.is_urgent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                <AlertTriangle size={12} />
                긴급
              </span>
            )}
          </span>
        )}
      >
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </PageHeader>

      {/* RSVP 영역 (회의이고 참석자인 경우) */}
      {isMeeting && isParticipant && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-700 mb-2">참석 여부</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleRsvp(true)}
              disabled={rsvpLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                myRsvpStatus === true
                  ? "bg-green-600 text-white"
                  : "bg-white border border-gray-300 hover:bg-green-50 text-gray-700"
              } ${rsvpLoading ? "opacity-50" : ""}`}
            >
              <Check size={16} />
              참석
            </button>
            <button
              onClick={() => handleRsvp(false)}
              disabled={rsvpLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                myRsvpStatus === false
                  ? "bg-red-600 text-white"
                  : "bg-white border border-gray-300 hover:bg-red-50 text-gray-700"
              } ${rsvpLoading ? "opacity-50" : ""}`}
            >
              <XCircle size={16} />
              불참
            </button>
          </div>
        </div>
      )}

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

        {/* 일정 유형 */}
        {item.event_type && (
          <div className="flex items-start gap-3">
            <Tag className="text-gray-400 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">일정 유형</p>
              <span className={`px-2 py-1 text-sm rounded ${eventTypeStyle.bg} ${eventTypeStyle.text}`}>
                {item.event_type_display || eventTypeStyle.label}
              </span>
            </div>
          </div>
        )}

        {/* 회의 장소 구분 */}
        {isMeeting && item.location_type && (
          <div className="flex items-start gap-3">
            <Video className="text-gray-400 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">장소 구분</p>
              <p className="text-gray-900">
                {item.location_type_display || LOCATION_TYPE_LABELS[item.location_type] || item.location_type}
              </p>
            </div>
          </div>
        )}

        {/* 온라인 링크 */}
        {isMeeting && item.meet_url && (
          <div className="flex items-start gap-3">
            <LinkIcon className="text-gray-400 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">온라인 링크</p>
              <a 
                href={item.meet_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {item.meet_url}
              </a>
            </div>
          </div>
        )}

        {/* 회의실 */}
        {isMeeting && item.resource_name && (
          <div className="flex items-start gap-3">
            <MapPin className="text-gray-400 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">회의실</p>
              <p className="text-gray-900">{item.resource_name}</p>
            </div>
          </div>
        )}

        {/* 일반 장소 */}
        {item.location && (
          <div className="flex items-start gap-3">
            <MapPin className="text-gray-400 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">장소</p>
              <p className="text-gray-900">{item.location}</p>
            </div>
          </div>
        )}

        {/* 안건 (회의) */}
        {isMeeting && item.agenda && (
          <div className="flex items-start gap-3">
            <FileText className="text-gray-400 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">안건</p>
              <p className="text-gray-900 whitespace-pre-wrap">{item.agenda}</p>
            </div>
          </div>
        )}

        {/* 회의 결과 */}
        {isMeeting && item.result && (
          <div className="flex items-start gap-3">
            <FileText className="text-gray-400 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">회의 결과</p>
              <p className="text-gray-900 whitespace-pre-wrap">{item.result}</p>
            </div>
          </div>
        )}

        {/* 작성자 */}
        <div className="flex items-start gap-3">
          <User className="text-gray-400 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-gray-500">작성자</p>
            <p className="text-gray-900">{item.owner_name || "-"}</p>
          </div>
        </div>

        {/* 참여자 */}
        {(item.scope === "company" || isMeeting) && item.participants?.length > 0 && (
          <div className="flex items-start gap-3">
            <Users className="text-gray-400 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-gray-500">참여자</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {item.participants.map((p) => {
                  // 응답 상태 찾기
                  const attendee = item.attendee_responses?.find(a => a.user === p.id);
                  const statusColor = attendee?.is_attending === true 
                    ? "bg-green-100 text-green-700 border-green-300" 
                    : attendee?.is_attending === false 
                    ? "bg-red-100 text-red-700 border-red-300"
                    : "bg-gray-100 text-gray-700 border-gray-300";

                  return (
                    <span
                      key={p.id}
                      className={`px-2 py-1 rounded-full text-xs border ${statusColor}`}
                    >
                      {p.name}
                      {attendee?.is_attending === true && " ✓"}
                      {attendee?.is_attending === false && " ✗"}
                    </span>
                  );
                })}
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
