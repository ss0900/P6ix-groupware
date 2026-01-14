// src/components/layout/ProjectMenus.jsx
// P6ix Groupware 메뉴 설정

export const projectMenus = {
  dashboard: {
    title: "대시보드",
    base: "/",
    sections: [
      {
        title: "대시보드",
        items: [{ to: "", label: "대시보드", end: true }],
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
        items: [{ to: "main", label: "타임라인" }],
      },
    ],
  },
  approval: {
    title: "전자결재",
    base: "/approval",
    baseClick: "home",
    sections: [
      {
        title: "결재함",
        items: [
          { to: "home", label: "결재 현황" },
          { to: "draft", label: "임시보관함" },
        ],
      },
      {
        title: "개인문서함",
        items: [
          { to: "in-progress", label: "진행중" },
          { to: "completed", label: "완료" },
          { to: "reference", label: "참조" },
          { to: "sent", label: "기안" },
        ],
      },
      {
        title: "전체보기",
        items: [{ to: "all", label: "전체보기" }],
      },
      {
        title: "공문문서함",
        items: [
          { to: "templates", label: "공문 양식" },
          { to: "public", label: "내 공문" },
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
          { to: "my", label: "내가 쓴 글" },
        ],
      },
      {
        title: "카테고리별 게시판",
        items: [
          { to: "free", label: "자유 게시판" },
          // 업무 게시판은 BoardLayout에서 동적으로 추가됨
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
        items: [{ to: "main", label: "자료실" }],
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
          { to: "pipeline", label: "파이프라인" },
          { to: "opportunities", label: "영업 기회" },
          { to: "calendar", label: "TODO 캘린더" },
        ],
      },
      {
        title: "견적/계약",
        items: [
          { to: "estimates", label: "견적 관리" },
          { to: "contracts", label: "계약 관리" },
        ],
      },
      {
        title: "청구/수금",
        items: [
          { to: "invoices", label: "청구서 관리" },
          { to: "payments", label: "수금 기록" },
        ],
      },
      {
        title: "고객 관리",
        items: [{ to: "clients", label: "거래처 목록" }],
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
