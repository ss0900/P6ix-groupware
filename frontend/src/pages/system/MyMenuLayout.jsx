import SidebarLayout from "../../components/common/SidebarLayout";

const myMenu = {
  title: "내 메뉴",
  base: "/",
  sections: [
    {
      title: "내 메뉴",
      items: [
        { to: "my-info", label: "내 정보" },
        { to: "my-page", label: "마이페이지" },
      ],
    },
    {
      title: "도움말",
      items: [
        { to: "help", label: "Q&A" },
      ],
    },
  ],
};

export default function MyMenuLayout() {
  return (
    <SidebarLayout
      title={myMenu.title}
      base={myMenu.base}
      sections={myMenu.sections}
    />
  );
}
