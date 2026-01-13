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
    baseClick: "main",
    sections: [
      {
        title: "타임라인",
        items: [
          { to: "main", label: "타임라인" },
        ],
      },
    ],
  },
  approval: {
    title: "전자결재",
    base: "/approval",
    baseClick: "pending",
    sections: [
      {
        title: "결재함",
        items: [
          { to: "pending", label: "결재 대기" },
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
    baseClick: "all",
    sections: [
      {
        title: "게시판",
        items: [
          { to: "all", label: "전체 게시판" },
          { to: "notice", label: "공지사항" },
        ],
      },
    ],
  },
  schedule: {
    title: "회의∙일정",
    base: "/schedule",
    baseClick: "calendar",
    sections: [
      {
        title: "일정 관리",
        items: [
          { to: "calendar", label: "일정 캘린더" },
          { to: "meeting", label: "회의 관리" },
          { to: "room", label: "회의실 관리" },
        ],
      },
    ],
  },
  archive: {
    title: "자료실",
    base: "/archive",
    baseClick: "main",
    sections: [
      {
        title: "자료실",
        items: [
          { to: "main", label: "자료실" },
        ],
      },
    ],
  },
  sales: {
    title: "영업관리",
    base: "/sales",
    baseClick: "dashboard",
    sections: [
      {
        title: "영업관리",
        items: [
          { to: "dashboard", label: "대시보드" },
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
  contact: {
    title: "업무연락",
    base: "/contact",
    baseClick: "all",
    sections: [
      {
        title: "업무연락",
        items: [
          { to: "all", label: "전체함" },
          { to: "received", label: "수신함" },
          { to: "sent", label: "송신함" },
          { to: "draft", label: "임시보관함" },
          { to: "self", label: "내게 쓴 글" },
          { to: "trash", label: "휴지통" },
        ],
      },
    ],
  },
};

// 상단 메뉴 순서
export const menuOrder = [
  "dashboard",
  "timeline",
  "contact",
  "approval",
  "board",
  "schedule",
  "archive",
  "sales",
  "admin",
];
