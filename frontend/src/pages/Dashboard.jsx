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
  
  // 위젯 데이터 상태
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [notices, setNotices] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);

  // 현재 날짜/시간
  const today = new Date();
  const dateString = today.toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    weekday: 'long' 
  });

  // 통계 및 데이터 로드
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const canViewSalesStats = Boolean(user?.is_staff || user?.is_superuser);
        // 병렬로 API 호출
        const [
          usersRes,
          approvalStatsRes,
          notificationCountRes,
          todayScheduleRes,
          salesStatsRes,
          pendingDocsRes,
          noticesRes
        ] = await Promise.allSettled([
          api.get("core/users/"),
          api.get("approval/documents/stats/"),
          api.get("chat/notifications/unread-count/"),
          api.get("meeting/schedules/today/"),
          canViewSalesStats
            ? api.get("operation/leads/stats/")
            : Promise.resolve({ data: { by_status: [] } }),
          api.get("approval/documents/?filter=pending"),
          api.get("board/posts/?board=notice")
        ]);

        // 사용자 수
        const users = usersRes.status === 'fulfilled' 
          ? (usersRes.value.data?.results ?? usersRes.value.data ?? [])
          : [];
        
        // 결재 대기 수
        const pendingCount = approvalStatsRes.status === 'fulfilled'
          ? (approvalStatsRes.value.data?.pending ?? 0)
          : 0;
        
        // 읽지 않은 알림 수
        const unreadNotifications = notificationCountRes.status === 'fulfilled'
          ? (notificationCountRes.value.data?.count ?? 0)
          : 0;
        
        // 오늘 일정
        const todayScheduleData = todayScheduleRes.status === 'fulfilled'
          ? (todayScheduleRes.value.data ?? [])
          : [];
        
        // 진행 중인 영업 (파이프라인에서 won, lost 제외한 건수)
        let activeDealsCount = 0;
        if (canViewSalesStats && salesStatsRes.status === 'fulfilled') {
          const byStatus = salesStatsRes.value.data?.by_status ?? [];
          activeDealsCount = byStatus
            .filter(item => !['won', 'lost'].includes(item.status))
            .reduce((sum, item) => sum + (item.count || 0), 0);
        }
        
        // 결재 대기 문서 목록
        const pendingDocs = pendingDocsRes.status === 'fulfilled'
          ? (pendingDocsRes.value.data?.results ?? pendingDocsRes.value.data ?? [])
          : [];
        
        // 공지사항 목록
        const noticeList = noticesRes.status === 'fulfilled'
          ? (noticesRes.value.data?.results ?? noticesRes.value.data ?? [])
          : [];

        // 통계 설정
        setStats({
          pendingApprovals: pendingCount,
          newNotifications: unreadNotifications,
          todaySchedules: todayScheduleData.length,
          activeDeals: activeDealsCount,
          totalUsers: users.length,
        });
        
        // 위젯 데이터 설정
        setPendingApprovals(pendingDocs.slice(0, 5).map(doc => ({
          id: doc.id,
          title: doc.title,
          requester: doc.author_name || doc.author?.username || '알 수 없음',
          date: doc.created_at?.split('T')[0] || '',
          type: doc.template_name || doc.template?.name || '일반'
        })));
        
        setNotices(noticeList.slice(0, 5).map(post => ({
          id: post.id,
          title: post.title,
          date: post.created_at?.split('T')[0] || '',
          isNew: isWithinDays(post.created_at, 3)
        })));
        
        setTodaySchedule(todayScheduleData.slice(0, 5).map(schedule => ({
          id: schedule.id,
          title: schedule.title,
          time: formatTime(schedule.start_time),
          location: schedule.location || schedule.meeting_room_name || '미정'
        })));
        
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    // 유틸리티 함수: 날짜가 N일 이내인지 확인
    const isWithinDays = (dateStr, days) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      const now = new Date();
      const diffTime = now - date;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= days;
    };
    
    // 유틸리티 함수: 시간 포맷
    const formatTime = (dateTimeStr) => {
      if (!dateTimeStr) return '';
      const date = new Date(dateTimeStr);
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    loadDashboardData();
  }, [user?.is_staff, user?.is_superuser]);

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
