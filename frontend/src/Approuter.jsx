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
import ApprovalList from "./pages/approval/ApprovalList";
import ApprovalForm from "./pages/approval/ApprovalForm";
import ApprovalDetail from "./pages/approval/ApprovalDetail";

// Board
import BoardList from "./pages/board/BoardList";
import PostForm from "./pages/board/PostForm";
import PostDetail from "./pages/board/PostDetail";

// Schedule
import ScheduleCalendar from "./pages/schedule/ScheduleCalendar";
import ScheduleForm from "./pages/schedule/ScheduleForm";
import ScheduleDetail from "./pages/schedule/ScheduleDetail";

// Archive
import ArchiveList from "./pages/archive/ArchiveList";

// Sales
import SalesDashboard from "./pages/sales/SalesDashboard";
import OpportunityList from "./pages/sales/OpportunityList";
import OpportunityForm from "./pages/sales/OpportunityForm";
import ClientList from "./pages/sales/ClientList";
import ClientForm from "./pages/sales/ClientForm";
import EstimateList from "./pages/sales/EstimateList";
import EstimateForm from "./pages/sales/EstimateForm";
import ContractList from "./pages/sales/ContractList";
import ContractForm from "./pages/sales/ContractForm";

// Help
import HelpCenter from "./pages/help/HelpCenter";

// Timeline
import Timeline from "./pages/timeline/Timeline";

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
          <Route index element={<ApprovalList />} />
          <Route path="new" element={<ApprovalForm />} />
          <Route path=":id" element={<ApprovalDetail />} />
          <Route path=":id/edit" element={<ApprovalForm />} />
          <Route path="draft" element={<ApprovalList />} />
          <Route path="settings" element={<div className="p-6">결재 설정 (준비 중)</div>} />
        </Route>

        {/* 게시판 - with sidebar layout */}
        <Route path="board" element={<BoardLayout />}>
          <Route index element={<BoardList />} />
          <Route path="new" element={<PostForm />} />
          <Route path=":id" element={<PostDetail />} />
          <Route path=":id/edit" element={<PostForm />} />
          <Route path="notice" element={<BoardList />} />
        </Route>

        {/* 회의/일정 - with sidebar layout */}
        <Route path="schedule" element={<ScheduleLayout />}>
          <Route index element={<ScheduleCalendar />} />
          <Route path="new" element={<ScheduleForm />} />
          <Route path=":id" element={<ScheduleDetail />} />
          <Route path=":id/edit" element={<ScheduleForm />} />
          <Route path="meeting" element={<ScheduleCalendar />} />
          <Route path="room" element={<div className="p-6">회의실 관리 (준비 중)</div>} />
        </Route>

        {/* 자료실 - with sidebar layout */}
        <Route path="archive" element={<ArchiveLayout />}>
          <Route index element={<ArchiveList />} />
        </Route>

        {/* 영업관리 - with sidebar layout */}
        <Route path="sales" element={<SalesLayout />}>
          <Route index element={<SalesDashboard />} />
          <Route path="opportunities" element={<OpportunityList />} />
          <Route path="opportunities/new" element={<OpportunityForm />} />
          <Route path="opportunities/:id" element={<OpportunityForm />} />
          <Route path="opportunities/:id/edit" element={<OpportunityForm />} />
          <Route path="clients" element={<ClientList />} />
          <Route path="clients/new" element={<ClientForm />} />
          <Route path="clients/:id" element={<ClientForm />} />
          <Route path="clients/:id/edit" element={<ClientForm />} />
          <Route path="estimates" element={<EstimateList />} />
          <Route path="estimates/new" element={<EstimateForm />} />
          <Route path="estimates/:id" element={<EstimateForm />} />
          <Route path="contracts" element={<ContractList />} />
          <Route path="contracts/new" element={<ContractForm />} />
          <Route path="contracts/:id" element={<ContractForm />} />
        </Route>

        {/* 관리자 - with sidebar layout */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<div className="p-6">관리자 대시보드 (준비 중)</div>} />
          <Route path="users" element={<UserList />} />
          <Route path="users/add" element={<UserForm />} />
          <Route path="users/:id" element={<UserForm />} />
          <Route path="organization" element={<OrganizationChart />} />
          <Route path="positions" element={<PositionManagement />} />
        </Route>

        {/* 타임라인 - with sidebar layout */}
        <Route path="timeline" element={<TimelineLayout />}>
          <Route index element={<Timeline />} />
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
