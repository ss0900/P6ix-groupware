// src/pages/board/BoardLayout.jsx
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";

export default function BoardLayout() {
  return (
    <SidebarLayout
      title="게시판"
      base={projectMenus.board.base}
      sections={projectMenus.board.sections}
    />
  );
}
