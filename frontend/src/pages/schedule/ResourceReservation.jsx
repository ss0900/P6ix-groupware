// src/pages/schedule/ResourceReservation.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, addDays, startOfWeek, eachDayOfInterval } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
  Building2,
  Car,
  Monitor,
  Check,
  Clock,
  XCircle,
} from "lucide-react";
import { resourceApi, reservationApi } from "../../api/schedule";

// 자원 타입별 아이콘
const RESOURCE_ICONS = {
  room: Building2,
  vehicle: Car,
  equipment: Monitor,
};

// 자원 타입별 라벨
const RESOURCE_TYPE_LABELS = {
  room: "회의실",
  vehicle: "차량",
  equipment: "장비",
};

// 예약 상태별 스타일
const STATUS_STYLES = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "승인대기" },
  approved: { bg: "bg-green-100", text: "text-green-800", label: "승인" },
  rejected: { bg: "bg-red-100", text: "text-red-800", label: "반려" },
};

export default function ResourceReservation() {
  const [resources, setResources] = useState([]);
  const [selectedType, setSelectedType] = useState("room");
  const [selectedResource, setSelectedResource] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [loading, setLoading] = useState(false);

  // 주간 뷰 날짜
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // 예약 폼
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "10:00",
    purpose: "",
  });

  // 자원 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await resourceApi.list({ resource_type: selectedType, is_active: true });
        setResources(res.data?.results ?? res.data ?? []);
        if (!selectedResource) {
          setSelectedResource(res.data?.[0] ?? res.data?.results?.[0] ?? null);
        }
      } catch (err) {
        console.error("자원 목록 로드 실패:", err);
      }
    })();
  }, [selectedType]);

  // 선택된 자원의 예약 목록 로드
  const fetchReservations = useCallback(async () => {
    if (!selectedResource) return;
    setLoading(true);
    try {
      const weekEnd = addDays(weekStart, 6);
      const res = await resourceApi.availability(selectedResource.id, {
        start: format(weekStart, "yyyy-MM-dd'T'00:00:00"),
        end: format(weekEnd, "yyyy-MM-dd'T'23:59:59"),
      });
      setReservations(res.data?.reservations ?? []);
    } catch (err) {
      console.error("예약 목록 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedResource, weekStart]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // 내 예약 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await reservationApi.list();
        setMyReservations(res.data?.results ?? res.data ?? []);
      } catch (err) {
        console.error("내 예약 목록 로드 실패:", err);
      }
    })();
  }, []);

  // 주간 날짜 배열
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    });
  }, [weekStart]);

  // 주 이동
  const goToPrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToThisWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // 예약 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResource) return alert("자원을 선택해주세요.");
    if (!formData.purpose.trim()) return alert("목적을 입력해주세요.");

    try {
      await reservationApi.create({
        resource: selectedResource.id,
        start: `${formData.date}T${formData.startTime}:00`,
        end: `${formData.date}T${formData.endTime}:00`,
        purpose: formData.purpose,
      });
      alert("예약이 신청되었습니다.");
      setShowForm(false);
      setFormData({ date: format(new Date(), "yyyy-MM-dd"), startTime: "09:00", endTime: "10:00", purpose: "" });
      fetchReservations();
    } catch (err) {
      console.error("예약 실패:", err);
      const msg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || "예약에 실패했습니다.";
      alert(msg);
    }
  };

  // 날짜별 예약 필터
  const getReservationsForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return reservations.filter((r) => r.start?.slice(0, 10) === dateStr);
  };

  return (
    <div className="flex h-full">
      {/* 좌측: 자원 목록 */}
      <div className="w-56 bg-white border-r border-gray-200 p-4 flex-shrink-0 overflow-y-auto">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">자원 유형</h2>

        {/* 자원 타입 탭 */}
        <div className="flex gap-1 mb-4">
          {Object.entries(RESOURCE_TYPE_LABELS).map(([type, label]) => {
            const Icon = RESOURCE_ICONS[type];
            return (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  setSelectedResource(null);
                }}
                className={`flex-1 py-2 px-2 text-xs rounded-lg flex flex-col items-center gap-1 ${
                  selectedType === type
                    ? "bg-sky-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>

        {/* 자원 목록 */}
        <h3 className="text-xs font-medium text-gray-500 mb-2">
          {RESOURCE_TYPE_LABELS[selectedType]} 목록
        </h3>
        <div className="space-y-1">
          {resources.map((res) => (
            <button
              key={res.id}
              onClick={() => setSelectedResource(res)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                selectedResource?.id === res.id
                  ? "bg-sky-100 text-sky-700 border border-sky-300"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <div className="font-medium">{res.name}</div>
              {res.location && (
                <div className="text-xs text-gray-500">{res.location}</div>
              )}
              {res.capacity > 1 && (
                <div className="text-xs text-gray-400">{res.capacity}인</div>
              )}
            </button>
          ))}
          {resources.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              등록된 {RESOURCE_TYPE_LABELS[selectedType]}이 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* 메인: 예약 현황 */}
      <div className="flex-1 flex flex-col bg-white">
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              {selectedResource?.name || "자원을 선택하세요"}
            </h1>
            {selectedResource?.location && (
              <p className="text-sm text-gray-500">{selectedResource.location}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(true)}
              disabled={!selectedResource}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} />
              예약하기
            </button>
          </div>
        </div>

        {/* 주간 네비게이션 */}
        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <button onClick={goToPrevWeek} className="p-1 hover:bg-gray-200 rounded">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {format(weekStart, "yyyy년 M월 d일", { locale: ko })} ~{" "}
              {format(addDays(weekStart, 6), "M월 d일", { locale: ko })}
            </span>
            <button onClick={goToNextWeek} className="p-1 hover:bg-gray-200 rounded">
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={goToThisWeek}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white"
          >
            이번 주
          </button>
        </div>

        {/* 주간 예약 그리드 */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              로딩 중...
            </div>
          ) : !selectedResource ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              좌측에서 자원을 선택하세요.
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((date) => {
                const dayReservations = getReservationsForDate(date);
                const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

                return (
                  <div
                    key={format(date, "yyyy-MM-dd")}
                    className={`border rounded-lg p-2 min-h-[200px] ${
                      isToday ? "border-sky-300 bg-sky-50" : "border-gray-200"
                    }`}
                  >
                    <div className={`text-center mb-2 ${isToday ? "text-sky-600" : "text-gray-700"}`}>
                      <div className="text-xs text-gray-500">
                        {format(date, "EEE", { locale: ko })}
                      </div>
                      <div className={`text-lg font-semibold ${isToday ? "text-sky-600" : ""}`}>
                        {format(date, "d")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {dayReservations.map((rsv) => {
                        const statusStyle = STATUS_STYLES[rsv.status] || STATUS_STYLES.pending;
                        return (
                          <div
                            key={rsv.id}
                            className={`text-xs p-1.5 rounded ${statusStyle.bg} ${statusStyle.text}`}
                          >
                            <div className="font-medium">
                              {rsv.start?.slice(11, 16)} ~ {rsv.end?.slice(11, 16)}
                            </div>
                            <div className="truncate">{rsv.purpose || rsv.reserved_by_name}</div>
                          </div>
                        );
                      })}
                      {dayReservations.length === 0 && (
                        <div className="text-xs text-gray-300 text-center py-4">예약 없음</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 내 예약 목록 */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">내 예약 현황</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {myReservations.slice(0, 5).map((rsv) => {
              const statusStyle = STATUS_STYLES[rsv.status] || STATUS_STYLES.pending;
              return (
                <div
                  key={rsv.id}
                  className="flex-shrink-0 bg-white border border-gray-200 rounded-lg p-3 min-w-[200px]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">
                      {rsv.resource_name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {rsv.start?.slice(0, 10)} {rsv.start?.slice(11, 16)} ~ {rsv.end?.slice(11, 16)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 truncate">{rsv.purpose}</div>
                </div>
              );
            })}
            {myReservations.length === 0 && (
              <p className="text-sm text-gray-400">예약 내역이 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* 예약 폼 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">예약 신청</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">자원</label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                  {selectedResource?.name} ({RESOURCE_TYPE_LABELS[selectedResource?.resource_type]})
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">목적</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="예약 목적을 입력하세요"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600"
                >
                  예약 신청
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
