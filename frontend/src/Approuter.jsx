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
import SalesLayout from "./pages/sales/SalesLayout";
import AdminLayout from "./pages/admin/AdminLayout";

// Admin
import UserList from "./pages/system/UserList";
import UserForm from "./pages/admin/UserForm";
import OrganizationChart from "./pages/admin/OrganizationChart";
import PositionManagement from "./pages/admin/PositionManagement";

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

// Archive
import ArchiveList from "./pages/archive/ArchiveList";

// Sales
import SalesDashboard from "./pages/sales/SalesDashboard";
import Pipeline from "./pages/sales/Pipeline";
import OpportunityList from "./pages/sales/OpportunityList";
import OpportunityForm from "./pages/sales/OpportunityForm";
import OpportunityDetail from "./pages/sales/OpportunityDetail";
import ClientList from "./pages/sales/ClientList";
import ClientForm from "./pages/sales/ClientForm";
import EstimateList from "./pages/sales/EstimateList";
import EstimateForm from "./pages/sales/EstimateForm";
import EstimatePrint from "./pages/sales/EstimatePrint";
import ContractList from "./pages/sales/ContractList";
import ContractForm from "./pages/sales/ContractForm";
import InvoiceList from "./pages/sales/InvoiceList";
import PaymentList from "./pages/sales/PaymentList";
import TodoCalendar from "./pages/sales/TodoCalendar";
import PipelineSettings from "./pages/sales/PipelineSettings";

// Help
import HelpCenter from "./pages/help/HelpCenter";

// Timeline
import Timeline from "./pages/timeline/Timeline";

// Contact
import ContactLayout from "./pages/contact/ContactLayout";
import ContactList from "./pages/contact/ContactList";
import ContactDetail from "./pages/contact/ContactDetail";
import ContactForm from "./pages/contact/ContactForm";

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
          <Route index element={<Navigate to="calendar" replace />} />
          <Route path="calendar" element={<ScheduleCalendar />} />
          <Route path="new" element={<ScheduleForm />} />
          <Route path=":id" element={<ScheduleDetail />} />
          <Route path=":id/edit" element={<ScheduleForm />} />
          <Route path="meeting" element={<ScheduleCalendar />} />
          <Route path="room" element={<div className="p-6">회의실 관리 (준비 중)</div>} />
        </Route>

        {/* 자료실 - with sidebar layout */}
        <Route path="archive" element={<ArchiveLayout />}>
          <Route index element={<Navigate to="main" replace />} />
          <Route path="main" element={<ArchiveList />} />
        </Route>

        {/* 영업관리 - with sidebar layout */}
        <Route path="sales" element={<SalesLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SalesDashboard />} />
          {/* 파이프라인 (칸반) */}
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="pipeline/settings" element={<PipelineSettings />} />
          {/* 영업 기회 */}
          <Route path="opportunities" element={<OpportunityList />} />
          <Route path="opportunities/new" element={<OpportunityForm />} />
          <Route path="opportunities/:id" element={<OpportunityDetail />} />
          <Route path="opportunities/:id/edit" element={<OpportunityForm />} />
          {/* TODO 캘린더 */}
          <Route path="calendar" element={<TodoCalendar />} />
          {/* 거래처 */}
          <Route path="clients" element={<ClientList />} />
          <Route path="clients/new" element={<ClientForm />} />
          <Route path="clients/:id" element={<ClientForm />} />
          <Route path="clients/:id/edit" element={<ClientForm />} />
          {/* 견적 */}
          <Route path="estimates" element={<EstimateList />} />
          <Route path="estimates/new" element={<EstimateForm />} />
          <Route path="estimates/:id" element={<EstimateForm />} />
          <Route path="estimates/:id/print" element={<EstimatePrint />} />
          {/* 계약 */}
          <Route path="contracts" element={<ContractList />} />
          <Route path="contracts/new" element={<ContractForm />} />
          <Route path="contracts/:id" element={<ContractForm />} />
          {/* 청구서 */}
          <Route path="invoices" element={<InvoiceList />} />
          <Route path="invoices/new" element={<div className="p-6">청구서 작성 (준비 중)</div>} />
          <Route path="invoices/:id" element={<div className="p-6">청구서 상세 (준비 중)</div>} />
          {/* 수금 기록 */}
          <Route path="payments" element={<PaymentList />} />
          <Route path="payments/new" element={<div className="p-6">수금 등록 (준비 중)</div>} />
        </Route>

        {/* 관리자 - with sidebar layout */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<UserList />} />
          <Route path="users/add" element={<UserForm />} />
          <Route path="users/:id" element={<UserForm />} />
          <Route path="organization" element={<OrganizationChart />} />
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

        {/* 도움말 */}
        <Route path="help" element={<HelpCenter />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
