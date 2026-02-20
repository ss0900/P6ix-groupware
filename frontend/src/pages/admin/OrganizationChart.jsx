import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import {
  Edit3,
  Plus,
  Trash2,
  UserRound,
  Phone,
} from "lucide-react";

const EMPTY_DEPARTMENT_MESSAGE = "부서 구성원이 없습니다.";

const sortMembers = (a, b) => {
  const aLevel = Number.isFinite(a.position_level) ? a.position_level : 9999;
  const bLevel = Number.isFinite(b.position_level) ? b.position_level : 9999;
  if (aLevel !== bLevel) return aLevel - bLevel;
  return (a.name || "").localeCompare(b.name || "", "ko");
};

function PersonCard({ person, highlighted = false }) {
  return (
    <div
      className={`w-[220px] bg-white rounded-xl border overflow-hidden shadow-sm ${
        highlighted ? "border-[#1e1e2f]/20" : "border-gray-200"
      }`}
    >
      <div className="grid grid-cols-[56px_1fr] min-h-[96px]">
        <div className="bg-gray-100 flex items-center justify-center">
          <UserRound size={20} className="text-indigo-700" />
        </div>
        <div className="px-3 py-2">
          <p className="text-xs text-gray-500">
            {person.position_name || "구성원"}
          </p>
          <p className="text-base font-semibold text-gray-900 leading-6">
            {person.name}
          </p>
          <p className="text-xs text-gray-500">{person.company_name}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Phone size={12} />
            {person.phone_number || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function DepartmentNode({
  node,
  memberMap,
  editMode,
  onAddChild,
  onEdit,
  onDelete,
}) {
  const members = (memberMap[node.id] || []).slice().sort(sortMembers);
  const children = node.children || [];

  return (
    <div className="flex flex-col items-center min-w-[240px]">
      <div className="relative px-6 py-4 bg-slate-700 text-white rounded-xl shadow min-w-[150px] text-center font-semibold">
        {node.name}
        {editMode && (
          <div className="absolute -top-2 -right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => onAddChild(node)}
              className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
              title="하위 부서 추가"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() => onEdit(node)}
              className="w-7 h-7 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-800"
              title="부서 수정"
            >
              <Edit3 size={13} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(node)}
              className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700"
              title="부서 삭제"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-gray-300" />

      <div className="space-y-3">
        {members.length === 0 ? (
          <div className="w-[220px] text-center text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-4">
            {EMPTY_DEPARTMENT_MESSAGE}
          </div>
        ) : (
          members.map((member) => <PersonCard key={member.id} person={member} />)
        )}
      </div>

      {children.length > 0 && (
        <div className="mt-6 w-full flex flex-col items-center">
          <div className="w-px h-5 bg-gray-300" />
          <div className="w-full border-t border-gray-300 mb-6" />
          <div className="flex items-start justify-center gap-8">
            {children.map((child) => (
              <DepartmentNode
                key={child.id}
                node={child}
                memberMap={memberMap}
                editMode={editMode}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DepartmentFormModal({
  isOpen,
  onClose,
  onSave,
  canSelectCompany,
  companies,
  departments,
  selectedCompanyId,
  editingDepartment,
  parentDepartment,
  saving,
}) {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    company: "",
    parent: "",
  });

  useEffect(() => {
    if (!isOpen) return;

    if (editingDepartment) {
      setFormData({
        name: editingDepartment.name || "",
        type: editingDepartment.type || "",
        company: String(editingDepartment.company || ""),
        parent: editingDepartment.parent ? String(editingDepartment.parent) : "",
      });
      return;
    }

    setFormData({
      name: "",
      type: "",
      company:
        String(parentDepartment?.company || selectedCompanyId || companies?.[0]?.id || ""),
      parent: parentDepartment?.id ? String(parentDepartment.id) : "",
    });
  }, [
    isOpen,
    editingDepartment,
    parentDepartment,
    selectedCompanyId,
    companies,
  ]);

  const parentOptions = useMemo(
    () =>
      departments.filter(
        (dept) =>
          String(dept.company) === String(formData.company) &&
          String(dept.id) !== String(editingDepartment?.id),
      ),
    [departments, formData.company, editingDepartment],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {editingDepartment ? "조직도 수정" : "조직도 등록"}
        </h3>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(formData, editingDepartment?.id);
          }}
        >
          <div>
            {canSelectCompany && (
              <>
                <label className="block text-sm text-gray-700 mb-1">회사</label>
                <select
                  value={formData.company}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      company: event.target.value,
                      parent: "",
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">선택</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              부서명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">구분</label>
            <input
              type="text"
              value={formData.type}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, type: event.target.value }))
              }
              placeholder="예: 본사, 현장, 지원"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">상위 부서</label>
            <select
              value={formData.parent}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, parent: event.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">없음(최상위)</option>
              {parentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#1e1e2f] text-white rounded-lg hover:bg-[#13131f] disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrganizationChart() {
  const { user } = useAuth();
  const isSuperuser = Boolean(user?.is_superuser);
  const [activeTab, setActiveTab] = useState("org");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [departments, setDepartments] = useState([]);
  const [members, setMembers] = useState([]);
  const [keyword, setKeyword] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [parentDepartment, setParentDepartment] = useState(null);

  const loadOrganizationData = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedCompany ? { company: selectedCompany } : undefined;
      const response = await api.get("core/departments/org-chart/", { params });
      const payload = response.data || {};

      const nextCompanies = payload.companies || [];
      const nextDepartments = payload.departments || [];
      const nextMembers = payload.members || [];

      setCompanies(nextCompanies);
      setDepartments(nextDepartments);
      setMembers(nextMembers);

      if (!selectedCompany && nextCompanies.length > 0) {
        setSelectedCompany(String(nextCompanies[0].id));
      }
    } catch (error) {
      console.error("Failed to load organization chart:", error);
      setDepartments([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    loadOrganizationData();
  }, [loadOrganizationData]);

  const departmentTree = useMemo(() => {
    const visibleDepartments = departments.filter(
      (department) => (department.name || "").trim() !== "대표이사",
    );

    const nodeMap = {};
    visibleDepartments.forEach((department) => {
      nodeMap[department.id] = {
        ...department,
        children: [],
      };
    });

    const roots = [];
    visibleDepartments.forEach((department) => {
      const node = nodeMap[department.id];
      if (department.parent && nodeMap[department.parent]) {
        nodeMap[department.parent].children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortByName = (list) => {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
      list.forEach((item) => sortByName(item.children));
    };
    sortByName(roots);

    return roots;
  }, [departments]);

  const hasValue = useCallback((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  }, []);

  const membersWithOrganizationInfo = useMemo(
    () =>
      members.filter(
        (member) =>
          hasValue(member.company_name) &&
          hasValue(member.department_name) &&
          hasValue(member.position_name),
      ),
    [members, hasValue],
  );

  const memberMap = useMemo(() => {
    const grouped = {};
    membersWithOrganizationInfo.forEach((member) => {
      if (!member.department_id) return;
      if (!grouped[member.department_id]) grouped[member.department_id] = [];
      grouped[member.department_id].push(member);
    });
    Object.values(grouped).forEach((list) => list.sort(sortMembers));
    return grouped;
  }, [membersWithOrganizationInfo]);

  const chiefMember = useMemo(() => {
    const unassigned = membersWithOrganizationInfo.filter(
      (member) => !member.department_id,
    );
    const pool =
      unassigned.length > 0 ? unassigned : membersWithOrganizationInfo;
    if (pool.length === 0) return null;
    return pool.slice().sort(sortMembers)[0];
  }, [membersWithOrganizationInfo]);

  const emergencyRows = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    const base = membersWithOrganizationInfo.slice().sort(sortMembers);
    if (!normalized) return base;

    return base.filter((member) => {
      const fields = [
        member.name,
        member.company_name,
        member.department_name,
        member.position_name,
        member.phone_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(normalized);
    });
  }, [membersWithOrganizationInfo, keyword]);

  const showCompanyColumn = useMemo(
    () =>
      membersWithOrganizationInfo.length > 0 &&
      membersWithOrganizationInfo.every((member) => hasValue(member.company_name)),
    [membersWithOrganizationInfo, hasValue],
  );
  const showDepartmentColumn = useMemo(
    () =>
      membersWithOrganizationInfo.length > 0 &&
      membersWithOrganizationInfo.every((member) => hasValue(member.department_name)),
    [membersWithOrganizationInfo, hasValue],
  );
  const showPositionColumn = useMemo(
    () =>
      membersWithOrganizationInfo.length > 0 &&
      membersWithOrganizationInfo.every((member) => hasValue(member.position_name)),
    [membersWithOrganizationInfo, hasValue],
  );
  const emergencyColumnCount =
    3 +
    (showCompanyColumn ? 1 : 0) +
    (showDepartmentColumn ? 1 : 0) +
    (showPositionColumn ? 1 : 0);

  const selectedCompanyInfo = useMemo(
    () => companies.find((company) => String(company.id) === String(selectedCompany)),
    [companies, selectedCompany],
  );

  const openCreateDepartment = () => {
    setEditingDepartment(null);
    setParentDepartment(null);
    setFormOpen(true);
  };

  const openAddChildDepartment = (department) => {
    setEditingDepartment(null);
    setParentDepartment(department);
    setFormOpen(true);
  };

  const openEditDepartment = (department) => {
    setEditingDepartment(department);
    setParentDepartment(null);
    setFormOpen(true);
  };

  const handleDeleteDepartment = async (department) => {
    if (!window.confirm(`"${department.name}" 부서를 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`core/departments/${department.id}/`);
      await loadOrganizationData();
    } catch (error) {
      console.error("Failed to delete department:", error);
      alert("부서 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSaveDepartment = async (payload, departmentId) => {
    setSaving(true);
    try {
      const requestData = {
        name: payload.name,
        type: payload.type || "",
        company: payload.company,
        parent: payload.parent || null,
      };

      if (departmentId) {
        await api.patch(`core/departments/${departmentId}/`, requestData);
      } else {
        await api.post("core/departments/", requestData);
      }

      setFormOpen(false);
      setEditingDepartment(null);
      setParentDepartment(null);
      await loadOrganizationData();
    } catch (error) {
      console.error("Failed to save department:", error);
      alert("부서 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">조직도 조회</h1>
        <div className="flex items-center gap-2">
          {isSuperuser && companies.length > 1 && (
            <select
              value={selectedCompany}
              onChange={(event) => setSelectedCompany(event.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setEditMode((prev) => !prev)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {editMode ? "편집 종료" : "조직도 등록/수정"}
          </button>
          {editMode && (
            <button
              type="button"
              onClick={openCreateDepartment}
              className="px-4 py-2 text-sm bg-[#1e1e2f] text-white rounded-lg hover:bg-[#13131f]"
            >
              부서 추가
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200 flex items-center gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("org")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 ${
            activeTab === "org"
              ? "border-[#1e1e2f] text-[#1e1e2f]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          현장 조직도
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("emergency")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 ${
            activeTab === "emergency"
              ? "border-[#1e1e2f] text-[#1e1e2f]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          비상 연락망
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[560px]">
        {activeTab === "org" ? (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1e1e2f] border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-10">
              {chiefMember && (
                <div className="flex flex-col items-center">
                  <div className="px-8 py-4 bg-slate-700 text-white rounded-xl shadow font-semibold mb-3">
                    {chiefMember.position_name || "총괄"}
                  </div>
                  <PersonCard person={chiefMember} highlighted />
                </div>
              )}

              {departmentTree.length === 0 ? (
                <div className="text-center text-gray-500 py-20">
                  등록된 부서가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div className="inline-flex items-start gap-10 min-w-full justify-center">
                    {departmentTree.map((department) => (
                      <DepartmentNode
                        key={department.id}
                        node={department}
                        memberMap={memberMap}
                        editMode={editMode}
                        onAddChild={openAddChildDepartment}
                        onEdit={openEditDepartment}
                        onDelete={handleDeleteDepartment}
                      />
                    ))}
                  </div>
                </div>
              )}
              {isSuperuser && (
                <div className="text-sm text-gray-500 text-right">
                  {selectedCompanyInfo?.name ? `${selectedCompanyInfo.name} 기준` : ""}
                </div>
              )}
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                비상 연락망
              </h2>
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="이름/부서/직위/연락처 검색"
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-sm text-gray-700">
                    <th className="px-3 py-3 text-center w-16">번호</th>
                    <th className="px-3 py-3 text-left">이름</th>
                    {showCompanyColumn && <th className="px-3 py-3 text-left">회사</th>}
                    {showDepartmentColumn && <th className="px-3 py-3 text-left">부서</th>}
                    {showPositionColumn && <th className="px-3 py-3 text-left">직위</th>}
                    <th className="px-3 py-3 text-left">연락처</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={emergencyColumnCount}
                        className="px-3 py-10 text-center text-sm text-gray-500"
                      >
                        로딩 중입니다.
                      </td>
                    </tr>
                  ) : emergencyRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={emergencyColumnCount}
                        className="px-3 py-10 text-center text-sm text-gray-500"
                      >
                        표시할 연락처가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    emergencyRows.map((member, index) => (
                      <tr key={member.id} className="border-t border-gray-100 text-sm">
                        <td className="px-3 py-3 text-center text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-3 py-3 font-medium text-gray-900">
                          {member.name}
                        </td>
                        {showCompanyColumn && (
                          <td className="px-3 py-3 text-gray-700">
                            {member.company_name || "-"}
                          </td>
                        )}
                        {showDepartmentColumn && (
                          <td className="px-3 py-3 text-gray-700">
                            {member.department_name || "-"}
                          </td>
                        )}
                        {showPositionColumn && (
                          <td className="px-3 py-3 text-gray-700">
                            {member.position_name || "-"}
                          </td>
                        )}
                        <td className="px-3 py-3 text-gray-700">
                          {member.phone_number || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <DepartmentFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingDepartment(null);
          setParentDepartment(null);
        }}
        onSave={handleSaveDepartment}
        canSelectCompany={isSuperuser}
        companies={companies}
        departments={departments}
        selectedCompanyId={selectedCompany}
        editingDepartment={editingDepartment}
        parentDepartment={parentDepartment}
        saving={saving}
      />
    </div>
  );
}
