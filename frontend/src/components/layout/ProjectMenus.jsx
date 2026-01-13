// src/components/layout/ProjectMenus.jsx
// P6ix Groupware 메뉴 설정

export const projectMenus = {
  dashboard: {
    title: "대시보드",
    base: "/",
    sections: [
      {
        title: "대시보드",
        items: [
          { to: "", label: "대시보드", end: true },
        ],
      },
    ],
  },
  timeline: {
    title: "타임라인",
    base: "/timeline",
    sections: [
      {
        title: "타임라인",
        items: [
          { to: "", label: "타임라인", end: true },
        ],
      },
    ],
  },
  approval: {
    title: "전자결재",
    base: "/approval",
    baseClick: "",
    sections: [
      {
        title: "결재함",
        items: [
          { to: "", label: "결재 대기", end: true },
          { to: "draft", label: "기안함" },
        ],
      },
      {
        title: "결재 설정",
        items: [
          { to: "settings", label: "환경설정" },
        ],
      },
    ],
  },
  board: {
    title: "게시판",
    base: "/board",
    baseClick: "",
    sections: [
      {
        title: "게시판",
        items: [
          { to: "", label: "전체 게시판", end: true },
          { to: "notice", label: "공지사항" },
        ],
      },
    ],
  },
  schedule: {
    title: "회의∙일정",
    base: "/schedule",
    baseClick: "",
    sections: [
      {
        title: "일정 관리",
        items: [
          { to: "", label: "일정 캘린더", end: true },
          { to: "meeting", label: "회의 관리" },
          { to: "room", label: "회의실 관리" },
        ],
      },
    ],
  },
  archive: {
    title: "자료실",
    base: "/archive",
    sections: [
      {
        title: "자료실",
        items: [
          { to: "", label: "자료실", end: true },
        ],
      },
    ],
  },
  sales: {
    title: "영업관리",
    base: "/sales",
    baseClick: "",
    sections: [
      {
        title: "영업관리",
        items: [
          { to: "", label: "대시보드", end: true },
          { to: "opportunities", label: "영업 정보" },
          { to: "estimates", label: "견적 현황" },
          { to: "contracts", label: "계약 관리" },
        ],
      },
      {
        title: "고객 관리",
        items: [
          { to: "clients", label: "고객 목록" },
        ],
      },
    ],
  },
  admin: {
    title: "관리자",
    base: "/admin",
    baseClick: "users",
    sections: [
      {
        title: "사용자 관리",
        items: [
          { to: "users", label: "사용자 목록" },
          { to: "organization", label: "조직도 관리" },
          { to: "positions", label: "직위 관리" },
        ],
      },
    ],
  },
};

// 상단 메뉴 순서
export const menuOrder = [
  "dashboard",
  "timeline",
  "approval",
  "board",
  "schedule",
  "archive",
  "sales",
  "admin",
];
