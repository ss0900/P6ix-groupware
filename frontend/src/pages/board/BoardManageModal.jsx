// src/pages/board/BoardManageModal.jsx
import React, { useState, useEffect } from "react";
import BoardService from "../../api/board";
import { FolderPlus, Pencil, Trash2, Plus, ChevronRight, ChevronDown, Folder, FileText, X } from "lucide-react";

// 재귀적 트리 아이템 컴포넌트
const ManageTreeItem = ({
  node,
  level,
  onEdit,
  onDelete,
  expandedIds,
  onToggle,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.includes(node.id);

  return (
    <div className="select-none">
      <div
        className="flex items-center justify-between py-1 px-2 hover:bg-gray-100 group"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        <div
          className="flex items-center flex-1 min-w-0 cursor-pointer"
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              onToggle(node.id);
            }
          }}
        >
          <span
            className="mr-1 text-gray-400"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : (
              <span className="w-[14px] inline-block" />
            )}
          </span>

          <span className="mr-2 text-yellow-500 flex-shrink-0">
            {hasChildren ? (
              <Folder size={16} fill="currentColor" className="text-yellow-400" />
            ) : (
              <FileText size={16} className="text-gray-500" />
            )}
          </span>

          <span className="text-sm truncate font-medium text-gray-700">{node.name}</span>
        </div>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(node)} className="p-1 text-gray-400 hover:text-blue-600">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(node.id)} className="p-1 text-gray-400 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <ManageTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function BoardManageModal({ isOpen, onClose, onRefresh }) {
  const [boards, setBoards] = useState([]);
  const [flatBoards, setFlatBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [editingBoard, setEditingBoard] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parent: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchBoards();
    }
  }, [isOpen]);

  const fetchBoards = async () => {
    try {
      setIsLoading(true);
      const data = await BoardService.getBoards({
        excludeNames: "업무 게시판",
        excludeTypes: "free",
      });

      const transformToTree = (nodes) => {
        if (!nodes) return [];
        return nodes.map((node) => ({
          ...node,
          children: node.sub_boards ? transformToTree(node.sub_boards) : [],
        }));
      };

      const flatten = (nodes, result = []) => {
        nodes.forEach((node) => {
          result.push(node);
          if (node.sub_boards) flatten(node.sub_boards, result);
        });
        return result;
      };

      const tree = transformToTree(Array.isArray(data) ? data : []);
      setBoards(tree);
      setFlatBoards(flatten(Array.isArray(data) ? data : []));

      const rootIds = tree.map((n) => n.id);
      setExpandedIds((prev) => [...new Set([...prev, ...rootIds])]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    setEditingBoard(null);
    setFormData({ name: "", description: "", parent: "" });
    setViewMode("form");
  };

  const handleEdit = (board) => {
    setEditingBoard(board);
    setFormData({
      name: board.name,
      description: board.description || "",
      parent: board.parent || "",
    });
    setViewMode("form");
  };

  const handleDelete = async (boardId) => {
    if (!window.confirm("정말 삭제하시겠습니까? 하위 게시판도 함께 삭제될 수 있습니다."))
      return;
    try {
      await BoardService.deleteBoard(boardId);
      fetchBoards();
      if (onRefresh) onRefresh();
    } catch (error) {
      alert("삭제 실패");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        parent: formData.parent === "" ? null : formData.parent,
      };

      if (editingBoard) {
        await BoardService.updateBoard(editingBoard.id, payload);
      } else {
        await BoardService.createBoard(payload);
      }

      setViewMode("list");
      fetchBoards();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert("저장 실패");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">업무 게시판 관리</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 min-h-[400px]">
          {viewMode === "list" ? (
            <div className="h-[400px] flex flex-col">
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                >
                  <Plus size={16} /> 게시판 추가
                </button>
              </div>

              {isLoading ? (
                <p>Loading...</p>
              ) : (
                <div className="flex-1 overflow-y-auto border rounded p-2">
                  {boards.length > 0 ? (
                    boards.map((node) => (
                      <ManageTreeItem
                        key={node.id}
                        node={node}
                        level={0}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        expandedIds={expandedIds}
                        onToggle={handleToggle}
                      />
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">게시판이 없습니다.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">게시판 이름</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">설명</label>
                <textarea
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">상위 게시판</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={formData.parent}
                  onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                >
                  <option value="">(최상위 게시판)</option>
                  {flatBoards
                    .filter((b) => b.id !== editingBoard?.id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  저장
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
