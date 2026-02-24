// src/AppRouter.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MainLayout from "./components/layout/MainLayout";

// Module Layouts
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import TimelineLayout from "./pages/timeline/TimelineLayout";
import ApprovalLayout from "./pages/approval/ApprovalLayout";
import BoardLayout from "./pages/board/BoardLayout";
import ScheduleLayout from "./pages/schedule/ScheduleLayout";
import ArchiveLayout from "./pages/archive/ArchiveLayout";

import AdminLayout from "./pages/admin/AdminLayout";

// Admin
import UserList from "./pages/system/UserList";
import MyInfo from "./pages/system/MyInfo";
import MyPage from "./pages/system/MyPage";
import MyMenuLayout from "./pages/system/MyMenuLayout";
import UserForm from "./pages/admin/UserForm";
import UserDetail from "./pages/admin/UserDetail";
import OrganizationChart from "./pages/admin/OrganizationChart";
import PositionManagement from "./pages/admin/PositionManagement";
import CompanyManagement from "./pages/admin/CompanyManagement";
import DepartmentManagement from "./pages/admin/DepartmentManagement";

// Approval
import ApprovalHome from "./pages/approval/ApprovalHome";
import ApprovalList from "./pages/approval/ApprovalList";
import ApprovalForm from "./pages/approval/ApprovalForm";
import ApprovalDetail from "./pages/approval/ApprovalDetail";
import ApprovalTemplateList from "./pages/approval/ApprovalTemplateList";

// Board
import BoardAll from "./pages/board/BoardAll";
import BoardView from "./pages/board/BoardView";
import BoardWrite from "./pages/board/BoardWrite";

// Schedule
import ScheduleCalendar from "./pages/schedule/ScheduleCalendar";
import ScheduleForm from "./pages/schedule/ScheduleForm";
import ScheduleDetail from "./pages/schedule/ScheduleDetail";
import ResourceReservation from "./pages/schedule/ResourceReservation";

// Archive
import ArchiveList from "./pages/archive/ArchiveList";
import ArchiveTrash from "./pages/archive/ArchiveTrash";
import ArchiveAttachments from "./pages/archive/ArchiveAttachments";
import ArchiveTemporary from "./pages/archive/ArchiveTemporary";

// Help
import HelpCenter from "./pages/help/HelpCenter";

// Timeline
import Timeline from "./pages/timeline/Timeline";

// Contact
import ContactLayout from "./pages/contact/ContactLayout";
import ContactList from "./pages/contact/ContactList";
import ContactDetail from "./pages/contact/ContactDetail";
import ContactForm from "./pages/contact/ContactForm";

// Operation (영업관리)
import OperationLayout from "./pages/operation/OperationLayout";
import LeadList from "./pages/operation/LeadList";
import LeadDetail from "./pages/operation/LeadDetail";
import LeadForm from "./pages/operation/LeadForm";
import PipelineBoard from "./pages/operation/PipelineBoard";
import Inbox from "./pages/operation/Inbox";
import TodoCalendar from "./pages/operation/TodoCalendar";
import CustomerList from "./pages/operation/CustomerList";
import CustomerDetail from "./pages/operation/CustomerDetail";
import CustomerForm from "./pages/operation/CustomerForm";
import QuoteList from "./pages/operation/QuoteList";
import QuoteForm from "./pages/operation/QuoteForm";
import QuoteTemplateList from "./pages/operation/QuoteTemplateList";
import PipelineSettings from "./pages/operation/PipelineSettings";
import SalesDashboard from "./pages/operation/SalesDashboard";
import TenderList from "./pages/operation/TenderList";
import TenderForm from "./pages/operation/TenderForm";
import RevenueManagement from "./pages/operation/RevenueManagement";
import EmailCenter from "./pages/operation/EmailCenter";

// Project (프로젝트 관리)
import ProjectLayout from "./pages/project/ProjectLayout";
import ProjectBoard from "./pages/project/ProjectBoard";
import ProjectManage from "./pages/project/ProjectManage";
import TaskList from "./pages/project/TaskList";
import TaskForm from "./pages/project/TaskForm";
import TaskDetail from "./pages/project/TaskDetail";
import TimesheetWeek from "./pages/project/TimesheetWeek";
import TimesheetMonth from "./pages/project/TimesheetMonth";
import TimesheetSummary from "./pages/project/TimesheetSummary";
import DiaryWeek from "./pages/project/DiaryWeek";
import DiaryDay from "./pages/project/DiaryDay";
import WeeklyReport from "./pages/project/WeeklyReport";
import SalesWeeklyReport from "./pages/project/SalesWeeklyReport";

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route (이미 로그인되어 있으면 대시보드로)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const SuperuserRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user?.is_superuser) {
    return <Navigate to="/admin/organization" replace />;
  }

  return children;
};

const AdminIndexRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={user?.is_superuser ? "users" : "organization"} replace />;
};

function AppRouter() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard - with sidebar layout */}
        <Route path="" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
        </Route>

        {/* 내 메뉴 - with sidebar layout */}
        <Route path="" element={<MyMenuLayout />}>
          <Route path="my-info" element={<MyInfo />} />
          <Route path="my-page" element={<MyPage />} />
          <Route path="help" element={<HelpCenter />} />
        </Route>

        {/* 전자결재 - with sidebar layout */}
        <Route path="approval" element={<ApprovalLayout />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<ApprovalHome />} />
          <Route path="draft" element={<ApprovalList />} />
          <Route path="in-progress" element={<ApprovalList />} />
          <Route path="completed" element={<ApprovalList />} />
          <Route path="reference" element={<ApprovalList />} />
          <Route path="sent" element={<ApprovalList />} />
          <Route path="all" element={<ApprovalList />} />
          <Route path="templates" element={<ApprovalTemplateList />} />
          <Route path="public" element={<ApprovalList />} />
          <Route path="new" element={<ApprovalForm />} />
          <Route path=":id" element={<ApprovalDetail />} />
          <Route path=":id/edit" element={<ApprovalForm />} />
        </Route>

        {/* 게시판 - with sidebar layout */}
        <Route path="board" element={<BoardLayout />}>
          <Route index element={<Navigate to="all" replace />} />
          <Route path="all" element={<BoardAll />} />
          <Route path="my" element={<BoardAll isMyPosts />} />
          <Route path="free" element={<BoardAll isFreeBoard />} />
          <Route path="work-all" element={<BoardAll isWorkBoard />} />
          <Route path="new" element={<BoardWrite />} />
          <Route path="view/:postId" element={<BoardView />} />
          <Route path=":boardId" element={<BoardAll />} />
        </Route>

        {/* 회의/일정 - with sidebar layout */}
        <Route path="schedule" element={<ScheduleLayout />}>
          <Route index element={<Navigate to="calendar/all" replace />} />
          {/* 일정관리 - scope별 캘린더 */}
          <Route path="calendar/all" element={<ScheduleCalendar scope="all" />} />
          <Route path="calendar/shared" element={<ScheduleCalendar scope="shared" />} />
          <Route path="calendar/personal" element={<ScheduleCalendar scope="personal" />} />
          {/* 레거시 calendar 경로 */}
          <Route path="calendar" element={<Navigate to="all" replace />} />
          {/* 카테고리별 일정 */}
          <Route path="category/headquarters" element={<ScheduleCalendar category="headquarters" />} />
          <Route path="category/:calendarId" element={<ScheduleCalendar />} />
          {/* 일정 CRUD */}
          <Route path="new" element={<ScheduleForm />} />
          <Route path=":id" element={<ScheduleDetail />} />
          <Route path=":id/edit" element={<ScheduleForm />} />
          {/* 자원 예약 */}
          <Route path="resources" element={<ResourceReservation />} />
          {/* 레거시 리다이렉트 */}
          <Route path="meeting/plan" element={<Navigate to="../calendar/all" replace />} />
          <Route path="meeting/rooms" element={<Navigate to="../resources" replace />} />
        </Route>

        {/* 자료실 - with sidebar layout */}
        <Route path="archive" element={<ArchiveLayout />}>
          <Route index element={<Navigate to="main" replace />} />
          <Route path="main" element={<ArchiveList />} />
          <Route path="trash" element={<ArchiveTrash />} />
          <Route path="attachments" element={<ArchiveAttachments />} />
          <Route path="temporary" element={<ArchiveTemporary />} />
        </Route>

        {/* 프로젝트 - with sidebar layout */}
        <Route path="project" element={<ProjectLayout />}>
          <Route index element={<Navigate to="board" replace />} />
          <Route path="board" element={<ProjectBoard />} />
          <Route path="manage" element={<ProjectManage />} />
          <Route path="tasks" element={<TaskList />} />
          <Route path="tasks/new" element={<TaskForm />} />
          <Route path="tasks/:id" element={<TaskDetail />} />
          <Route path="tasks/:id/edit" element={<TaskForm />} />
          {/* 타임시트 */}
          <Route path="timesheet/week" element={<TimesheetWeek />} />
          <Route path="timesheet/month" element={<TimesheetMonth />} />
          <Route path="timesheet/summary" element={<TimesheetSummary />} />
          {/* 업무일지 */}
          <Route path="diary/week" element={<DiaryWeek />} />
          <Route path="diary/day" element={<DiaryDay />} />
          {/* 주간업무 */}
          <Route path="weekly-report" element={<WeeklyReport />} />
          <Route path="sales-weekly" element={<SalesWeeklyReport />} />
        </Route>

        {/* 관리자 - with sidebar layout */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminIndexRedirect />} />
          <Route path="users" element={<SuperuserRoute><UserList /></SuperuserRoute>} />
          <Route path="users/add" element={<SuperuserRoute><UserForm /></SuperuserRoute>} />
          <Route path="users/:id" element={<SuperuserRoute><UserDetail /></SuperuserRoute>} />
          <Route path="users/:id/edit" element={<SuperuserRoute><UserForm /></SuperuserRoute>} />
          <Route path="companies" element={<SuperuserRoute><CompanyManagement /></SuperuserRoute>} />
          <Route path="organization" element={<OrganizationChart />} />
          <Route path="departments" element={<DepartmentManagement />} />
          <Route path="positions" element={<PositionManagement />} />
        </Route>

        {/* 타임라인 - with sidebar layout */}
        <Route path="timeline" element={<TimelineLayout />}>
          <Route index element={<Navigate to="main" replace />} />
          <Route path="main" element={<Timeline />} />
        </Route>

        {/* 업무연락 - with sidebar layout */}
        <Route path="contact" element={<ContactLayout />}>
          <Route index element={<Navigate to="all" replace />} />
          <Route path="all" element={<ContactList />} />
          <Route path="received" element={<ContactList />} />
          <Route path="sent" element={<ContactList />} />
          <Route path="draft" element={<ContactList />} />
          <Route path="self" element={<ContactList />} />
          <Route path="trash" element={<ContactList />} />
          <Route path="new" element={<ContactForm />} />
          <Route path=":id" element={<ContactDetail />} />
          <Route path=":id/edit" element={<ContactForm />} />
        </Route>

        {/* 영업관리 - with sidebar layout */}
        <Route path="operation" element={<OperationLayout />}>
          {/* ✅ 통일된 진입점 */}
          <Route index element={<Navigate to="sales/leads" replace />} />

          {/* ✅ 신규 표준 라우팅: /operation/sales/* */}
          <Route path="sales">
            <Route index element={<Navigate to="leads" replace />} />

            <Route path="dashboard" element={<SalesDashboard />} />
            <Route path="leads" element={<LeadList />} />
            <Route path="leads/new" element={<LeadForm />} />
            <Route path="leads/:id" element={<LeadDetail />} />
            <Route path="leads/:id/edit" element={<LeadForm />} />

            <Route path="pipeline" element={<PipelineBoard />} />
            <Route path="pipeline/settings" element={<PipelineSettings />} />

            <Route path="inbox" element={<Inbox />} />
            <Route path="todo" element={<TodoCalendar />} />

            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="customers/:id/edit" element={<CustomerForm />} />

            <Route path="quotes" element={<QuoteList />} />
            <Route path="quotes/new" element={<QuoteForm />} />
            <Route path="quotes/:id" element={<QuoteForm />} />

            <Route path="templates" element={<QuoteTemplateList />} />
            <Route path="tenders" element={<TenderList />} />
            <Route path="tenders/new" element={<TenderForm />} />
            <Route path="tenders/:id" element={<TenderForm />} />

            <Route path="revenue" element={<RevenueManagement />} />
            <Route path="emails" element={<EmailCenter />} />
          </Route>

          {/* ✅ Legacy redirect (기존 /operation/* 깨짐 방지) */}
          <Route path="leads" element={<Navigate to="sales/leads" replace />} />
          <Route
            path="leads/new"
            element={<Navigate to="sales/leads/new" replace />}
          />
          <Route
            path="leads/:id"
            element={<Navigate to="../sales/leads/:id" replace />}
          />
          <Route
            path="leads/:id/edit"
            element={<Navigate to="../sales/leads/:id/edit" replace />}
          />

          <Route
            path="pipeline"
            element={<Navigate to="sales/pipeline" replace />}
          />
          <Route
            path="pipeline/settings"
            element={<Navigate to="sales/pipeline/settings" replace />}
          />

          <Route path="inbox" element={<Navigate to="sales/inbox" replace />} />
          <Route path="todo" element={<Navigate to="sales/todo" replace />} />

          <Route
            path="customers"
            element={<Navigate to="sales/customers" replace />}
          />
          <Route
            path="customers/:id"
            element={<Navigate to="../sales/customers/:id" replace />}
          />
          <Route
            path="customers/:id/edit"
            element={<Navigate to="../sales/customers/:id/edit" replace />}
          />

          <Route
            path="quotes"
            element={<Navigate to="sales/quotes" replace />}
          />
          <Route
            path="quotes/new"
            element={<Navigate to="sales/quotes/new" replace />}
          />
          <Route
            path="quotes/:id"
            element={<Navigate to="../sales/quotes/:id" replace />}
          />

          <Route
            path="templates"
            element={<Navigate to="sales/templates" replace />}
          />
          <Route
            path="tenders"
            element={<Navigate to="sales/tenders" replace />}
          />
          <Route
            path="tenders/new"
            element={<Navigate to="sales/tenders/new" replace />}
          />
          <Route
            path="tenders/:id"
            element={<Navigate to="../sales/tenders/:id" replace />}
          />
          <Route
            path="revenue"
            element={<Navigate to="sales/revenue" replace />}
          />
          <Route
            path="emails"
            element={<Navigate to="sales/emails" replace />}
          />
        </Route>

      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
