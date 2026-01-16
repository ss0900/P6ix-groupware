// src/pages/board/BoardLayout.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";
import BoardService from "../../api/board";
import BoardManageModal from "./BoardManageModal";
import { Settings, FileText } from "lucide-react";

export default function BoardLayout() {
  const navigate = useNavigate();
  const [menuConfig, setMenuConfig] = useState(projectMenus.board);
  const [isManageOpen, setIsManageOpen] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    let dynamicBoardItems = [];
    try {
      // 백엔드에서 필터링: free 타입과 "업무 게시판" 제외
      const boards = await BoardService.getBoards({
        excludeNames: "업무 게시판",
        excludeTypes: "free",
      });

      // 트리 구조를 메뉴 구조로 변환
      const transformBoards = (boardList) => {
        return boardList.map((board) => {
          const children =
            board.sub_boards && board.sub_boards.length > 0
              ? transformBoards(board.sub_boards)
              : [];

          return {
            to: `${board.id}`,
            label: board.name,
            items: children,
            icon: children.length === 0 ? FileText : undefined,
          };
        });
      };

      dynamicBoardItems = transformBoards(boards);
    } catch (error) {
      console.error("Failed to load boards", error);
    }

    // 기본 메뉴와 병합
    const newConfig = { ...projectMenus.board };

    newConfig.sections = newConfig.sections.map((section) => {
      if (section.title === "카테고리별 게시판") {
        return {
          ...section,
          items: [
            ...section.items,
            {
              label: "업무 게시판",
              to: dynamicBoardItems.length > 0 ? dynamicBoardItems[0].to : "#",
              items: [
                ...dynamicBoardItems,
                {
                  label: "업무 게시판 관리",
                  icon: Settings,
                  onClick: () => setIsManageOpen(true),
                  to: "#",
                  className:
                    "!text-red-500 hover:!bg-red-50 focus:!bg-red-50 !bg-transparent",
                },
              ],
            },
          ],
        };
      }
      return section;
    });

    setMenuConfig(newConfig);
  };

  const { title, base, sections } = menuConfig;

  return (
    <>
      <SidebarLayout title={title} base={base} sections={sections} />
      <BoardManageModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        onRefresh={fetchBoards}
      />
    </>
  );
}
