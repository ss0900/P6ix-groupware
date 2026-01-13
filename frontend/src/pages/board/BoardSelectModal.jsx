// src/pages/board/BoardSelectModal.jsx
import React, { useState, useEffect } from "react";
import BoardService from "../../api/board";
import { ChevronRight, ChevronDown, Folder, FileText, X } from "lucide-react";

// 재귀적 트리 아이템 컴포넌트
const TreeItem = ({
  node,
  level,
  onSelect,
  selectedId,
  expandedIds,
  onToggle,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 ${
          isSelected ? "bg-blue-50 text-blue-600" : ""
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
          if (hasChildren) onToggle(node.id);
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

        <span className="mr-2 text-yellow-500">
          {hasChildren ? (
            <Folder size={16} fill="currentColor" className="text-yellow-400" />
          ) : (
            <FileText size={16} className="text-gray-500" />
          )}
        </span>

        <span className="text-sm truncate">{node.name}</span>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function BoardSelectModal({ isOpen, onClose, onSelect }) {
  const [treeData, setTreeData] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadBoards();
    }
  }, [isOpen]);

  const loadBoards = async () => {
    try {
      const dbBoards = await BoardService.getBoards({
        excludeTypes: "free",
        excludeNames: "업무 게시판",
      });

      const transformToTree = (nodes) => {
        if (!nodes) return [];
        return nodes.map((node) => ({
          ...node,
          children: node.sub_boards ? transformToTree(node.sub_boards) : [],
        }));
      };

      const workBoards = Array.isArray(dbBoards) ? transformToTree(dbBoards) : [];

      const fullTree = [
        {
          id: "free_placeholder",
          name: "자유 게시판",
          children: [],
        },
        {
          id: "work",
          name: "업무 게시판",
          children: workBoards,
        },
      ];

      setTreeData(fullTree);
      setExpandedIds(["work"]);
    } catch (err) {
      console.error(err);
      setTreeData([]);
    }
  };

  const handleToggle = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (selectedNode) {
      onSelect(selectedNode);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">카테고리 선택</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 h-[400px] flex flex-col">
          <div className="flex-1 overflow-y-auto border rounded p-2 mb-4">
            {treeData.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                level={0}
                onSelect={setSelectedNode}
                selectedId={selectedNode?.id}
                expandedIds={expandedIds}
                onToggle={handleToggle}
              />
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedNode}
              className={`px-4 py-2 rounded text-white ${
                selectedNode
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              선택 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
