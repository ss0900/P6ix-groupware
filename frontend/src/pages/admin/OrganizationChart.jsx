// src/pages/admin/OrganizationChart.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { 
  Building2, 
  ChevronRight, 
  ChevronDown, 
  Users, 
  Plus, 
  Edit, 
  Trash2,
  X
} from "lucide-react";

// 트리 노드 컴포넌트
const TreeNode = ({ node, level = 0, onEdit, onDelete, onAddChild }) => {
  const [isOpen, setIsOpen] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div 
        className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer group"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {/* 확장/축소 */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-5 h-5 flex items-center justify-center text-gray-400"
        >
          {hasChildren ? (
            isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <span className="w-4" />
          )}
        </button>

        {/* 아이콘 */}
        <div className={`p-1.5 rounded ${level === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
          {level === 0 ? <Building2 size={16} /> : <Users size={16} />}
        </div>

        {/* 이름 */}
        <span className="flex-1 text-sm font-medium text-gray-800">{node.name}</span>
        
        {/* 타입 뱃지 */}
        {node.type && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
            {node.type}
          </span>
        )}

        {/* 액션 버튼 */}
        <div className="hidden group-hover:flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onAddChild(node); }}
            className="p-1 hover:bg-blue-100 rounded text-blue-600"
            title="하위 부서 추가"
          >
            <Plus size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(node); }}
            className="p-1 hover:bg-gray-200 rounded text-gray-600"
            title="수정"
          >
            <Edit size={14} />
          </button>
          {level > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(node); }}
              className="p-1 hover:bg-red-100 rounded text-red-600"
              title="삭제"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 자식 노드 */}
      {isOpen && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode 
              key={child.id} 
              node={child} 
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 부서 편집 모달
const DepartmentModal = ({ isOpen, onClose, department, companies, onSave, parentDept }) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    company: "",
    parent: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || "",
        type: department.type || "",
        company: department.company || "",
        parent: department.parent || null,
      });
    } else if (parentDept) {
      setFormData({
        name: "",
        type: "",
        company: parentDept.company || parentDept.id,
        parent: parentDept.id,
      });
    } else {
      setFormData({ name: "", type: "", company: "", parent: null });
    }
  }, [department, parentDept]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData, department?.id);
      onClose();
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            {department ? "부서 수정" : "부서 추가"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              부서명 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              구분
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">선택</option>
              <option value="본사">본사</option>
              <option value="현장">현장</option>
              <option value="TF">TF</option>
            </select>
          </div>

          {!parentDept && !department && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                회사 *
              </label>
              <select
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                <option value="">선택</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function OrganizationChart() {
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [parentDept, setParentDept] = useState(null);

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    try {
      const [compRes, deptRes] = await Promise.all([
        api.get("core/companies/"),
        api.get("core/departments/"),
      ]);
      
      const comps = compRes.data?.results ?? compRes.data ?? [];
      const depts = deptRes.data?.results ?? deptRes.data ?? [];
      
      setCompanies(comps);
      setDepartments(depts);
      
      // 트리 구조 생성
      const tree = buildTree(comps, depts);
      setTreeData(tree);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 트리 구조 빌드
  const buildTree = (companies, departments) => {
    return companies.map((company) => {
      const companyDepts = departments.filter(
        (d) => d.company === company.id || d.company?.id === company.id
      );
      
      const buildDeptTree = (parentId) => {
        return companyDepts
          .filter((d) => d.parent === parentId)
          .map((dept) => ({
            ...dept,
            children: buildDeptTree(dept.id),
          }));
      };

      return {
        id: `company-${company.id}`,
        companyId: company.id,
        name: company.name,
        type: "회사",
        isCompany: true,
        children: buildDeptTree(null),
      };
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // 부서 추가/수정 핸들러
  const handleSaveDepartment = async (data, deptId) => {
    if (deptId) {
      await api.patch(`core/departments/${deptId}/`, data);
    } else {
      await api.post("core/departments/", data);
    }
    loadData();
  };

  // 부서 삭제 핸들러
  const handleDeleteDepartment = async (node) => {
    if (!window.confirm(`"${node.name}" 부서를 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`core/departments/${node.id}/`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 편집 모달 열기
  const handleEdit = (node) => {
    if (node.isCompany) return;
    setEditingDept(node);
    setParentDept(null);
    setModalOpen(true);
  };

  // 하위 부서 추가 모달 열기
  const handleAddChild = (node) => {
    setEditingDept(null);
    if (node.isCompany) {
      setParentDept({ id: null, company: node.companyId });
    } else {
      setParentDept({ id: node.id, company: node.company });
    }
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">조직도 관리</h1>
        <button
          onClick={() => {
            setEditingDept(null);
            setParentDept(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          부서 추가
        </button>
      </div>

      {/* 트리 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : treeData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            등록된 조직이 없습니다.
          </div>
        ) : (
          <div>
            {treeData.map((company) => (
              <TreeNode
                key={company.id}
                node={company}
                level={0}
                onEdit={handleEdit}
                onDelete={handleDeleteDepartment}
                onAddChild={handleAddChild}
              />
            ))}
          </div>
        )}
      </div>

      {/* 모달 */}
      <DepartmentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingDept(null);
          setParentDept(null);
        }}
        department={editingDept}
        parentDept={parentDept}
        companies={companies}
        onSave={handleSaveDepartment}
      />
    </div>
  );
}
