// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { 
  FileCheck, 
  MessageSquare, 
  Calendar, 
  TrendingUp,
  Bell,
  Clock,
  ChevronRight,
  FileText,
  Users,
  FolderOpen,
  Plus,
  RefreshCw
} from "lucide-react";

// Widget Card Component
const WidgetCard = ({ title, icon: Icon, children, onViewMore, onRefresh, loading }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between p-4 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-blue-600" />
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
            title="새로고침"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        )}
        {onViewMore && (
          <button 
            onClick={onViewMore}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            더보기 <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
    <div className="p-4">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

// Empty State Component
const EmptyState = ({ message }) => (
  <div className="py-8 text-center text-gray-400">
    <p className="text-sm">{message}</p>
  </div>
);

// Stat Card Component
const StatCard = ({ label, value, icon: Icon, color, onClick, subLabel }) => (
  <div 
    className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subLabel && (
          <p className="text-xs text-gray-400 mt-1">{subLabel}</p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

// Quick Action Button
const QuickAction = ({ label, icon: Icon, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors w-full"
  >
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon size={16} className="text-white" />
    </div>
    <span className="font-medium text-gray-700 text-sm">{label}</span>
  </button>
);

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 상태
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    newNotifications: 0,
    todaySchedules: 0,
    activeDeals: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  // 현재 날짜/시간
  const today = new Date();
  const dateString = today.toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    weekday: 'long' 
  });

  // 통계 데이터 로드
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        // 사용자 수 조회
        const usersRes = await api.get("core/users/");
        const users = usersRes.data?.results ?? usersRes.data ?? [];
        
        setStats({
          pendingApprovals: 5, // TODO: 실제 결재 API 연동
          newNotifications: 12, // TODO: 실제 알림 API 연동
          todaySchedules: 3, // TODO: 실제 일정 API 연동
          activeDeals: 8, // TODO: 실제 영업 API 연동
          totalUsers: users.length,
        });
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  // Mock data (추후 API 연동)
  const pendingApprovals = [
    { id: 1, title: "휴가 신청서", requester: "김철수", date: "2026-01-12", type: "휴가" },
    { id: 2, title: "출장 신청서", requester: "이영희", date: "2026-01-11", type: "출장" },
    { id: 3, title: "지출 결의서", requester: "박민수", date: "2026-01-10", type: "경비" },
  ];

  const notices = [
    { id: 1, title: "2026년 신년 업무 계획 안내", date: "2026-01-10", isNew: true },
    { id: 2, title: "시스템 점검 공지 (1/15)", date: "2026-01-09", isNew: true },
    { id: 3, title: "연말 결산 관련 협조 요청", date: "2026-01-08", isNew: false },
  ];

  const todaySchedule = [
    { id: 1, title: "주간 회의", time: "10:00", location: "회의실 A" },
    { id: 2, title: "고객사 미팅", time: "14:00", location: "본사 접견실" },
    { id: 3, title: "프로젝트 리뷰", time: "16:00", location: "온라인" },
  ];

  // 빠른 메뉴 액션
  const quickActions = [
    { label: "기안 작성", icon: FileCheck, color: "bg-blue-500", path: "/approval/draft" },
    { label: "게시글 작성", icon: MessageSquare, color: "bg-green-500", path: "/board" },
    { label: "일정 등록", icon: Calendar, color: "bg-orange-500", path: "/schedule" },
    { label: "영업 등록", icon: TrendingUp, color: "bg-purple-500", path: "/sales/info" },
    { label: "사용자 관리", icon: Users, color: "bg-slate-600", path: "/admin/users" },
    { label: "자료실", icon: FolderOpen, color: "bg-cyan-500", path: "/archive" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-blue rounded-xl p-6 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white rounded-full"></div>
          <div className="absolute -right-5 bottom-0 w-24 h-24 bg-white rounded-full"></div>
        </div>
        
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              안녕하세요, {user?.last_name}{user?.first_name || user?.username || "사용자"}님! 👋
            </h1>
            <p className="text-blue-100 text-sm">
              {dateString}
            </p>
            <p className="text-blue-100 mt-2">
              오늘도 P6ix Groupware와 함께 효율적인 하루 되세요.
            </p>
          </div>
          <button
            onClick={() => navigate("/approval/draft")}
            className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
          >
            <Plus size={18} />
            <span className="font-medium">새 기안</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          label="결재 대기" 
          value={stats.pendingApprovals}
          icon={FileCheck} 
          color="bg-blue-500"
          onClick={() => navigate("/approval")}
          subLabel="건"
        />
        <StatCard 
          label="새 알림" 
          value={stats.newNotifications}
          icon={Bell} 
          color="bg-orange-500"
          subLabel="건"
        />
        <StatCard 
          label="오늘 일정" 
          value={stats.todaySchedules}
          icon={Calendar} 
          color="bg-green-500"
          onClick={() => navigate("/schedule")}
          subLabel="건"
        />
        <StatCard 
          label="진행 영업" 
          value={stats.activeDeals}
          icon={TrendingUp} 
          color="bg-purple-500"
          onClick={() => navigate("/sales")}
          subLabel="건"
        />
        <StatCard 
          label="전체 사용자" 
          value={stats.totalUsers}
          icon={Users} 
          color="bg-slate-600"
          onClick={() => navigate("/admin/users")}
          subLabel="명"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 결재 대기 - 넓은 영역 */}
        <div className="lg:col-span-2">
          <WidgetCard 
            title="결재 대기 문서" 
            icon={FileCheck}
            onViewMore={() => navigate("/approval")}
          >
            {pendingApprovals.length > 0 ? (
              <div className="space-y-3">
                {pendingApprovals.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/approval/${item.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.requester} · {item.date}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="대기 중인 결재 문서가 없습니다." />
            )}
          </WidgetCard>
        </div>

        {/* 빠른 메뉴 */}
        <WidgetCard 
          title="빠른 메뉴" 
          icon={Plus}
        >
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((item, idx) => (
              <QuickAction
                key={idx}
                label={item.label}
                icon={item.icon}
                color={item.color}
                onClick={() => navigate(item.path)}
              />
            ))}
          </div>
        </WidgetCard>

        {/* 공지사항 */}
        <WidgetCard 
          title="공지사항" 
          icon={Bell}
          onViewMore={() => navigate("/board/notice")}
        >
          {notices.length > 0 ? (
            <div className="space-y-3">
              {notices.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.isNew && (
                      <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
                    )}
                    <p className="font-medium text-gray-800 text-sm truncate">{item.title}</p>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{item.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="등록된 공지사항이 없습니다." />
          )}
        </WidgetCard>

        {/* 오늘 일정 */}
        <div className="lg:col-span-2">
          <WidgetCard 
            title="오늘 일정" 
            icon={Calendar}
            onViewMore={() => navigate("/schedule")}
          >
            {todaySchedule.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {todaySchedule.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors border-l-4 border-blue-500"
                  >
                    <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm mb-2">
                      <Clock size={14} />
                      {item.time}
                    </div>
                    <p className="font-medium text-gray-800 text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.location}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="오늘 예정된 일정이 없습니다." />
            )}
          </WidgetCard>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
