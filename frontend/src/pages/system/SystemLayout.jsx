// src/pages/system/SystemLayout.jsx
import React from "react";
import SidebarLayout from "../../components/common/layout/SidebarLayout";

const sections = [
  {
    title: "사용자 관리",
    items: [
      { to: "user", label: "사용자", end: true },
      { to: "user/add", label: "사용자 등록", permission: "isStaff" },
      { to: "user/list", label: "사용자 목록", permission: "isStaff" },
    ],
  },
  {
    title: "조직 관리",
    permission: "isStaff",
    items: [
      { to: "user/company", label: "회사 관리" },
      { to: "company/add", label: "회사 등록" },
    ],
  },
  {
    title: "직무·직위 관리",
    permission: "isStaff",
    items: [
      { to: "user/department", label: "직무/소속" },
      { to: "user/position", label: "직급/역할" },
    ],
  },
  {
    title: "권한·기타",
    permission: "isStaff",
    items: [],
  },
  {
    title: "프로젝트 관리",
    permission: "isSuperuser",
    items: [],
  },
  // {title: "스타일 가이드", items: [{ to: "style-guide", label: "Style Guide" }]},
];

export default function SystemLayout() {
  return (
    <SidebarLayout
      title="시스템관리"
      base={() => `/system`}
      sections={sections}
    />
  );
}
