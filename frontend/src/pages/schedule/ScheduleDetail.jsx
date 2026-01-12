// src/pages/schedule/ScheduleDetail.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Clock, 
  MapPin, 
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  HelpCircle
} from "lucide-react";

// 응답 상태 뱃지
const ResponseBadge = ({ response }) => {
  const config = {
    pending: { icon: HelpCircle, color: "text-gray-400", label: "대기" },
    accepted: { icon: CheckCircle, color: "text-green-500", label: "수락" },
    declined: { icon: XCircle, color: "text-red-500", label: "거절" },
    tentative: { icon: HelpCircle, color: "text-yellow-500", label: "미정" },
  };
  const c = config[response] || config.pending;
  const Icon = c.icon;

  return (
    <span className={`flex items-center gap-1 text-sm ${c.color}`}>
      <Icon size={14} />
      {c.label}
    </span>
  );
};

export default function ScheduleDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  // 일정 로드
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`meeting/schedules/${id}/`);
        setSchedule(res.data);
      } catch (err) {
        console.error(err);
        alert("일정을 불러올 수 없습니다.");
        navigate("/schedule");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  // 삭제
  const handleDelete = async () => {
    if (!window.confirm("일정을 삭제하시겠습니까?")) return;

    try {
      await api.delete(`meeting/schedules/${id}/`);
      navigate("/schedule");
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 참석 응답
  const handleRespond = async (response) => {
    try {
      await api.post(`meeting/schedules/${id}/respond/`, { response });
      // 새로고침
      const res = await api.get(`meeting/schedules/${id}/`);
      setSchedule(res.data);
    } catch (err) {
      console.error(err);
      alert("응답 저장 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!schedule) return null;

  const isAuthor = schedule.author === user?.id;
  const isAttendee = schedule.attendees?.includes(user?.id);
  const myResponse = schedule.attendee_responses?.find((r) => r.user === user?.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/schedule")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: schedule.color }}
        />
        <span className="text-sm px-2 py-1 bg-gray-100 text-gray-600 rounded">
          {schedule.schedule_type === "personal" ? "개인" :
           schedule.schedule_type === "team" ? "팀" :
           schedule.schedule_type === "company" ? "전사" : "회의"}
        </span>
      </div>

      {/* 일정 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{schedule.title}</h1>
          {isAuthor && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/schedule/${id}/edit`)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Edit size={14} />
                수정
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={14} />
                삭제
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-gray-600">
            <Clock size={18} />
            <span>
              {new Date(schedule.start_time).toLocaleString('ko-KR')}
              {" ~ "}
              {new Date(schedule.end_time).toLocaleString('ko-KR')}
            </span>
          </div>

          {(schedule.location || schedule.room_name) && (
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin size={18} />
              <span>{schedule.room_name || schedule.location}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-gray-600">
            <Calendar size={18} />
            <span>작성자: {schedule.author_name}</span>
          </div>
        </div>

        {schedule.description && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2">설명</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{schedule.description}</p>
          </div>
        )}
      </div>

      {/* 참석자 */}
      {schedule.attendee_responses?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={18} />
            참석자 ({schedule.attendee_responses.length})
          </h3>
          <div className="space-y-3">
            {schedule.attendee_responses.map((attendee) => (
              <div key={attendee.id} className="flex items-center justify-between">
                <span className="text-gray-700">{attendee.user_name}</span>
                <ResponseBadge response={attendee.response} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 참석 응답 (참석자인 경우) */}
      {isAttendee && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="font-semibold text-blue-800 mb-4">참석 여부</h3>
          {myResponse && (
            <p className="text-sm text-blue-600 mb-4">
              현재 응답: <ResponseBadge response={myResponse.response} />
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => handleRespond("accepted")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckCircle size={18} />
              수락
            </button>
            <button
              onClick={() => handleRespond("tentative")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              <HelpCircle size={18} />
              미정
            </button>
            <button
              onClick={() => handleRespond("declined")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <XCircle size={18} />
              거절
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
