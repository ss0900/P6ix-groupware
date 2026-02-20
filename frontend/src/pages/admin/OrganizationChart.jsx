import React, { useState, useMemo, useEffect } from "react";
import api from "../../api/axios";

// 초기 템플릿 데이터 (생성 시 사용)
const TEMPLATE_DATA = {
  id: "root",
  type: "dept", // 'dept' | 'person'
  name: "프로젝트 총괄",
  position: "", // dept 타입일 때 미사용 가능
  phone: "",
  company: "",
  children: [
    {
      id: "t1",
      type: "person",
      name: "현장소장",
      position: "소장",
      phone: "010-0000-0000",
      company: "메인건설",
      children: [],
    },
  ],
};

const normalizeList = (payload) => {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
};

// 트리 평탄화 함수 (비상연락망용) - 부서(dept) 제외
const flattenTree = (node, list = [], parentDept = "") => {
  if (!node) return list;

  // 현재 노드가 부서라면, 자식들에게 물려줄 부서명은 현재 노드의 이름
  // 현재 노드가 사람이라면(보통 말단이지만), 부모 부서명을 그대로 전달 (단, 사람이 하위 조직을 가질 일은 드뭄)
  let nextParentDept = parentDept;
  if (node.type === "dept") {
    nextParentDept = node.name;
  }

  // type이 person인 경우에만 리스트에 추가 (상속 부서 정보 포함)
  if (node.type === "person") {
    list.push({ ...node, inheritedDept: parentDept });
  }

  if (node.children) {
    node.children.forEach((child) => flattenTree(child, list, nextParentDept));
  }
  return list;
};

// 노드 업데이트 재귀 함수
const updateNode = (node, id, field, value) => {
  if (node.id === id) {
    return { ...node, [field]: value };
  }
  if (node.children) {
    return {
      ...node,
      children: node.children.map((child) =>
        updateNode(child, id, field, value),
      ),
    };
  }
  return node;
};

// 자식 추가 재귀 함수
const addChildNode = (node, parentId, newChild) => {
  if (node.id === parentId) {
    return {
      ...node,
      children: [...(node.children || []), newChild],
    };
  }
  if (node.children) {
    return {
      ...node,
      children: node.children.map((child) =>
        addChildNode(child, parentId, newChild),
      ),
    };
  }
  return node;
};

// 노드 삭제 재귀 함수 (부모가 자식을 필터링하게 함)
const deleteNodeFromTree = (node, targetId) => {
  if (node.id === targetId) return null;

  if (node.children) {
    return {
      ...node,
      children: node.children
        .filter((child) => child.id !== targetId)
        .map((child) => deleteNodeFromTree(child, targetId))
        .filter((child) => child !== null),
    };
  }
  return node;
};

// 재귀적 트리 노드 컴포넌트
const OrgNode = ({
  node,
  isEdit,
  onUpdate,
  onAdd,
  onDelete,
  onNodeClick,
  parentDept,
  users,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    // 연락처 자동 하이픈 로직
    if (name === "phone") {
      const numbers = value.replace(/[^0-9]/g, "");
      if (numbers.length <= 3) {
        newValue = numbers;
      } else if (numbers.length <= 7) {
        newValue = `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
      } else {
        newValue = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
      }
    }

    onUpdate(node.id, name, newValue);
  };

  // 사용자 선택 핸들러
  const handleSelectUser = (user) => {
    onUpdate(node.id, "user_id", user.id);
    // 사용자 정보로 자동 채우기 (프리뷰 및 저장용)
    onUpdate(
      node.id,
      "name",
      `${user.last_name || ""}${user.first_name || ""}`.trim() || user.username,
    );
    onUpdate(node.id, "phone", user.phone_number || "");
    // 소속 및 직위 정보도 함께 업데이트
    onUpdate(node.id, "company", user.company || "");
    onUpdate(node.id, "position", user.position || "");
    // 백엔드에서 조회 시 사용할 user_* 필드도 프리뷰용으로 설정
    onUpdate(
      node.id,
      "user_name",
      `${user.last_name || ""}${user.first_name || ""}`.trim() || user.username,
    );
    onUpdate(node.id, "user_phone", user.phone_number || "");
    onUpdate(node.id, "user_company", user.company || "");
    onUpdate(node.id, "user_position", user.position || "");
    onUpdate(node.id, "profile_picture_url", user.profile_picture || "");
    setShowUserDropdown(false);
    setUserSearchTerm("");
  };

  // 사용자 연결 해제
  const handleClearUser = () => {
    onUpdate(node.id, "user_id", null);
  };

  // 사용자 검색 필터
  const filteredUsers =
    users?.filter((u) => {
      const fullName =
        `${u.last_name || ""}${u.first_name || ""}`.toLowerCase();
      const searchLower = userSearchTerm.toLowerCase();
      return (
        fullName.includes(searchLower) ||
        (u.username || "").toLowerCase().includes(searchLower) ||
        (u.phone_number || "").includes(userSearchTerm)
      );
    }) || [];

  const nodeType = node.type || "person";
  // 부서 노드면 자신의 이름을 자식에게 물려줄 부서명으로 사용, 아니면 상위에서 받은거 그대로 전달
  const nextParentDept = nodeType === "dept" ? node.name : parentDept;

  // 화면에 표시할 소속: user_company가 있으면 우선, 없으면 입력된 company, 없으면 상위 부서명
  const displayAffiliation =
    node.user_company || node.company || parentDept || "-";

  // 사진 URL: 사용자 연결 시 profile_picture_url 사용
  const photoUrl = node.profile_picture_url;

  return (
    <div className="flex flex-col items-center">
      {/* 노드 카드 */}
      <div
        className={`relative transition-all duration-300 z-10 group
                    ${
                      nodeType === "dept"
                        ? "bg-slate-700 text-white rounded-lg shadow-md hover:bg-slate-800"
                        : "bg-white text-gray-800 rounded-xl shadow-md border border-slate-200 hover:shadow-xl hover:border-blue-300"
                    }
                    ${
                      isEdit
                        ? "p-4 border-2 border-dashed border-blue-400"
                        : "cursor-pointer hover:-translate-y-1"
                    }
                    ${nodeType === "dept" ? "min-w-[140px] px-4 py-3" : "w-48"}
                `}
        onClick={(e) => {
          e.stopPropagation();
          if (!isEdit) onNodeClick({ ...node, inheritedDept: parentDept }); // 상세보기를 위해 상속 부서 정보 전달
        }}
      >
        {/* 편집 모드: 추가/삭제 버튼 */}
        {isEdit && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex space-x-1 z-20 whitespace-nowrap">
            <div className="flex bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(node.id, "dept");
                }}
                title="하위 부서 추가"
                className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold hover:bg-slate-100 border-r border-slate-200 transition-colors"
              >
                +부서
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(node.id, "person");
                }}
                title="하위 인원 추가"
                className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold hover:bg-blue-100 transition-colors"
              >
                +인원
              </button>
            </div>

            {node.id !== "root" && node.id !== TEMPLATE_DATA.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      `'${node.name}' 및 하위 조직을 모두 삭제하시겠습니까?`,
                    )
                  ) {
                    onDelete(node.id);
                  }
                }}
                className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow hover:bg-red-600 transition-colors ml-1"
              >
                X
              </button>
            )}
          </div>
        )}

        {/* 편집 모드: 입력 폼 */}
        {isEdit ? (
          <div className="flex flex-col space-y-2 mt-1">
            {nodeType === "dept" ? (
              <input
                type="text"
                name="name"
                value={node.name}
                onChange={handleChange}
                className="text-body-bold text-white text-center w-full bg-transparent focus:outline-none placeholder-white/50"
                placeholder="부서명"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                {/* 사용자 연결 UI */}
                <div className="mb-2 relative">
                  {node.user_id ? (
                    <div className="flex items-center gap-2 p-1.5 bg-blue-50 rounded border border-blue-200">
                      {photoUrl && (
                        <img
                          src={photoUrl}
                          alt="프로필"
                          className="w-8 h-8 rounded object-cover border border-slate-200"
                        />
                      )}
                      <span className="text-xs text-blue-700 flex-1 truncate">
                        {node.user_name || node.name} (연결됨)
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearUser();
                        }}
                        className="text-[10px] text-red-500 hover:text-red-700"
                      >
                        해제
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowUserDropdown(!showUserDropdown);
                        }}
                        className="w-full text-[10px] py-1.5 border border-dashed border-slate-300 rounded text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                      >
                        사용자 연결
                      </button>
                      {showUserDropdown && (
                        <div
                          className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 max-h-48 overflow-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            className="w-full px-2 py-1 text-xs border-b border-slate-200 focus:outline-none"
                            placeholder="이름 또는 연락처 검색..."
                            autoFocus
                          />
                          {filteredUsers.slice(0, 10).map((user) => (
                            <div
                              key={user.id}
                              onClick={() => handleSelectUser(user)}
                              className="px-2 py-1.5 text-xs hover:bg-blue-50 cursor-pointer flex items-center gap-2"
                            >
                              <span className="font-medium">
                                {`${user.last_name || ""}${user.first_name || ""}`.trim() ||
                                  user.username}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                {user.phone_number}
                              </span>
                            </div>
                          ))}
                          {filteredUsers.length === 0 && (
                            <div className="px-2 py-2 text-xs text-slate-400 text-center">
                              검색 결과 없음
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* 직책 입력 */}
                <input
                  type="text"
                  name="position"
                  value={node.position || ""}
                  onChange={handleChange}
                  className="input-sm text-center mb-1 transition-colors bg-slate-50 focus:bg-white"
                  placeholder="직책 (예: 공사팀장)"
                  onClick={(e) => e.stopPropagation()}
                />
                {/* 성명 입력 */}
                <input
                  type="text"
                  name="name"
                  value={node.name || ""}
                  onChange={handleChange}
                  className="input-sm text-center font-bold mb-1 transition-colors focus:bg-white"
                  placeholder="성명"
                  onClick={(e) => e.stopPropagation()}
                />
                {/* 소속 입력 */}
                <input
                  type="text"
                  name="company"
                  value={node.company || ""}
                  onChange={handleChange}
                  className="input-sm text-center text-xs mb-1 transition-colors bg-slate-50 focus:bg-white"
                  placeholder={`소속 (${parentDept || "미지정"})`}
                  onClick={(e) => e.stopPropagation()}
                />
                {/* 연락처 입력 */}
                <input
                  type="text"
                  name="phone"
                  value={node.phone || ""}
                  onChange={handleChange}
                  className="input-sm text-center text-xs text-slate-500 transition-colors focus:text-slate-800"
                  placeholder="연락처"
                  onClick={(e) => e.stopPropagation()}
                />
              </>
            )}
          </div>
        ) : (
          // 조회 모드: 뷰
          <>
            {nodeType === "dept" ? (
              <div className="flex items-center justify-center min-h-[40px]">
                <span className="text-body-bold text-white tracking-wide">
                  {node.name}
                </span>
              </div>
            ) : (
              <div className="flex min-h-[90px]">
                {/* 왼쪽: 사진 (3.5cm x 4.5cm 비율, 카드 높이에 맞춤) */}
                <div className="w-[70px] bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 self-stretch">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={node.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-slate-300 text-2xl">인</div>
                  )}
                </div>
                {/* 오른쪽: 정보 */}
                <div className="flex flex-col flex-1 min-w-0">
                  {/* 상단: 직책 + 소속 */}
                  <div className="bg-slate-50 border-b border-slate-100 px-3 py-1.5 text-center rounded-tr-xl">
                    <div className="text-body-bold text-slate-600">
                      {node.user_position || node.position || "-"}
                    </div>
                    <div className="text-muted truncate">
                      {displayAffiliation}
                    </div>
                  </div>
                  {/* 본문: 이름 */}
                  <div className="flex-1 flex items-center justify-center py-2 px-2">
                    <div className="text-highlight text-gray-800">
                      {node.user_name || node.name}
                    </div>
                  </div>
                  {/* 하단: 전화번호 (있을때만) */}
                  {(node.user_phone || node.phone) && (
                    <div className="border-t border-slate-100 py-1 px-2 bg-white rounded-br-xl">
                      <div className="text-muted text-center">
                        {node.user_phone || node.phone}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 자식이 있을 경우 하위 트리 렌더링 */}
      {node.children &&
        node.children.length > 0 &&
        (() => {
          // 현재 노드가 부서이고, 모든 자식이 사람인 경우 세로 정렬
          const allChildrenArePeople =
            nodeType === "dept" &&
            node.children.every((child) => child.type === "person");

          return (
            <div className="flex flex-col items-center">
              {/* 부모와 자식 그룹을 잇는 수직선 */}
              <div className="h-6 w-px bg-slate-300"></div>

              {/* 자식들 배치: 모든 자식이 사람이면 세로, 아니면 가로 */}
              <div
                className={`relative ${allChildrenArePeople ? "flex flex-col items-center" : "flex"}`}
              >
                {node.children.map((child, index) => (
                  <div
                    key={child.id}
                    className={`flex flex-col items-center relative ${allChildrenArePeople ? "py-1" : "px-3 md:px-6"}`}
                  >
                    {/* 수직선 (부모 연결선과 만나는 지점) */}
                    <div
                      className={`w-px bg-slate-300 ${allChildrenArePeople ? "h-3" : "h-6"}`}
                    ></div>

                    {/* 가로선 로직 (가로 배치일 때만) */}
                    {!allChildrenArePeople && node.children.length > 1 && (
                      <>
                        <div
                          className={`absolute top-0 left-0 w-1/2 h-px bg-slate-300 ${index === 0 ? "hidden" : "block"}`}
                        ></div>
                        <div
                          className={`absolute top-0 right-0 w-1/2 h-px bg-slate-300 ${index === node.children.length - 1 ? "hidden" : "block"}`}
                        ></div>
                      </>
                    )}

                    <OrgNode
                      node={child}
                      isEdit={isEdit}
                      onUpdate={onUpdate}
                      onAdd={onAdd}
                      onDelete={onDelete}
                      onNodeClick={onNodeClick}
                      parentDept={nextParentDept}
                      users={users}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
    </div>
  );
};

const OrganizationChart = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [data, setData] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [activeTab, setActiveTab] = useState("org");
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [popupPosition, setPopupPosition] = useState({ x: 300, y: 245 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const selectedCompanyInfo = useMemo(
    () => companies.find((company) => String(company.id) === String(selectedCompany)),
    [companies, selectedCompany],
  );
  const contactList = useMemo(() => flattenTree(data), [data]);

  const handleDragStart = (event) => {
    setIsDragging(true);
    setDragOffset({
      x: event.clientX - popupPosition.x,
      y: event.clientY - popupPosition.y,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleDrag = (event) => {
      setPopupPosition({
        x: event.clientX - dragOffset.x,
        y: event.clientY - dragOffset.y,
      });
    };
    const handleDragEnd = () => setIsDragging(false);

    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", handleDragEnd);
    return () => {
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await api.get("core/companies/");
        const rows = normalizeList(response.data);
        if (!active) return;

        setCompanies(rows);
        if (rows.length === 0) {
          setSelectedCompany("");
          return;
        }

        setSelectedCompany((prev) => {
          if (prev && rows.some((row) => String(row.id) === String(prev))) {
            return prev;
          }
          return String(rows[0].id);
        });
      } catch (error) {
        console.error("Failed to fetch companies:", error);
        if (!active) return;
        setCompanies([]);
        setSelectedCompany("");
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCompany) {
      setLoading(false);
      setData(null);
      setOrgId(null);
      setUsers([]);
      return;
    }

    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [orgRes, usersRes] = await Promise.all([
          api.get("core/organizations/", { params: { company: selectedCompany } }),
          api.get("core/organizations/available-users/", { params: { company: selectedCompany } }),
        ]);

        if (!active) return;
        const orgRows = normalizeList(orgRes.data);
        const userRows = normalizeList(usersRes.data);

        if (orgRows.length > 0) {
          setOrgId(orgRows[0].id);
          setData(orgRows[0].tree || null);
        } else {
          setOrgId(null);
          setData(null);
        }
        setUsers(userRows);
      } catch (error) {
        console.error("Failed to fetch organization chart:", error);
        if (!active) return;
        setData(null);
        setOrgId(null);
        setUsers([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedCompany]);

  const handleUpdate = (id, field, value) => {
    setData((prev) => updateNode(prev, id, field, value));
  };

  const handleAddChild = (parentId, type) => {
    const newId = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    // 타입에 따른 기본 데이터
    const newChild =
      type === "dept"
        ? {
            id: newId,
            type: "dept",
            name: "새 부서",
            children: [],
          }
        : {
            id: newId,
            type: "person",
            name: "홍길동",
            position: "직책",
            phone: "",
            company: selectedCompanyInfo?.name || "",
            children: [],
          };

    setData((prev) => addChildNode(prev, parentId, newChild));
  };

  const handleDeleteNode = (nodeId) => {
    // Root Node protection logic
    if (nodeId === TEMPLATE_DATA.id || nodeId === "root") {
      alert("최상위 조직은 삭제할 수 없습니다.");
      return;
    }
    setData((prev) => deleteNodeFromTree(prev, nodeId));
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  const handleSave = async () => {
    if (!selectedCompany) {
      alert("회사를 먼저 선택해주세요.");
      return;
    }
    if (!window.confirm("저장하시겠습니까?")) return;

    setSaving(true);
    try {
      const payload = { company: selectedCompany, tree: data };
      if (orgId) {
        await api.put(`core/organizations/${orgId}/`, payload);
      } else {
        const response = await api.post("core/organizations/", payload);
        setOrgId(response.data?.id || null);
      }

      const refresh = await api.get("core/organizations/", {
        params: { company: selectedCompany },
      });
      const rows = normalizeList(refresh.data);
      if (rows.length > 0) {
        setOrgId(rows[0].id);
        setData(rows[0].tree || null);
      }

      alert("저장되었습니다.");
      setIsEditMode(false);
    } catch (error) {
      console.error("Failed to save organization chart:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTemplate = () => {
    setData({
      ...TEMPLATE_DATA,
      company: selectedCompanyInfo?.name || "",
      children: (TEMPLATE_DATA.children || []).map((child) => ({
        ...child,
        company: selectedCompanyInfo?.name || "",
      })),
    });
    setIsEditMode(true);
  };

  if (!selectedCompany && !loading) {
    return (
      <div className="p-8 border border-slate-200 rounded-lg bg-slate-50 text-center text-slate-500">
        접근 가능한 회사가 없습니다.
      </div>
    );
  }

  if (!data && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">조직도 조회</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateTemplate}
              className="px-4 py-2 rounded-lg bg-[#1e1e2f] text-white text-sm hover:bg-[#13131f]"
            >
              조직도 생성하기
            </button>
          </div>
        </div>

        <div className="p-8 flex flex-col items-center justify-center min-h-[400px] border border-slate-200 rounded-lg bg-slate-50">
          <p className="text-slate-500 mb-2 font-medium">
            현재 등록된 조직도가 없습니다.
          </p>
          <p className="text-slate-400 text-xs mb-6">
            현장 조직도를 만들어 체계적으로 관리하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-0 relative animate-in fade-in duration-500">
      <div className="flex justify-end mb-4 items-center gap-2">
        <button
          onClick={() => {
            if (isEditMode) {
              handleSave();
            } else {
              setIsEditMode(true);
            }
          }}
          disabled={saving}
          className={`px-4 py-2 rounded-lg shadow-sm text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-60 ${
            isEditMode
              ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          {isEditMode ? <>저장 완료</> : <>조직도 등록/수정</>}
        </button>
      </div>

      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("org")}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "org"
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            현장 조직도
            {activeTab === "org" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("emergency")}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "emergency"
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            비상 연락망
            {activeTab === "emergency" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>
            )}
          </button>
        </div>
      </div>

      <div
        className={`bg-slate-50/50 rounded-xl border border-slate-200 min-h-[500px] overflow-auto relative scrollbar-hide
                ${activeTab === "org" ? "p-8" : "p-0"}
            `}
      >
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        )}

        {!loading && activeTab === "org" && (
          <div className="min-w-max pb-16 pt-4">
            <div className="flex justify-center transform scale-95 origin-top">
              <OrgNode
                node={data}
                isEdit={isEditMode}
                onUpdate={handleUpdate}
                onAdd={handleAddChild}
                onDelete={handleDeleteNode}
                onNodeClick={handleNodeClick}
                users={users}
              />
            </div>
            <div className="text-center mt-16 flex flex-col items-center gap-2">
              {isEditMode ? (
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-medium border border-blue-100 shadow-sm max-w-md">
                  [+부서] 또는 [+인원] 버튼을 눌러 하위 조직을 추가하세요.
                </div>
              ) : (
                <p className="text-slate-400 text-xs">
                  카드를 클릭하면 상세 정보를 확인할 수 있습니다.
                </p>
              )}
            </div>
          </div>
        )}

        {!loading && activeTab === "emergency" && (
          <div className="w-full bg-white min-h-[500px]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-center w-32">직책</th>
                    <th className="px-6 py-4 text-center w-32">성명</th>
                    <th className="px-6 py-4 text-center w-40">소속</th>
                    <th className="px-6 py-4 text-center">연락처</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contactList.map((person) => (
                    <tr
                      key={person.id}
                      className={`hover:bg-blue-50/50 transition-colors ${selectedNode?.id === person.id ? "bg-blue-50" : ""}`}
                    >
                      <td className="px-6 py-4 text-center font-medium text-slate-600">
                        {person.position || "-"}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-gray-900">
                        {person.name}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-500 text-xs">
                        {person.company || person.inheritedDept || "-"}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-500 font-mono text-xs">
                        {person.phone || "-"}
                      </td>
                    </tr>
                  ))}
                  {contactList.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-20">
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <span>등록된 비상연락망 인원이 없습니다.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 선택된 노드 상세 팝업 (조직도 탭에서만 표시) */}
        {selectedNode && activeTab === "org" && !isEditMode && (
          <div
            className="fixed bg-white border border-slate-200 shadow-2xl rounded-xl p-6 w-80 z-[100] ring-1 ring-slate-900/10"
            style={{ left: popupPosition.x, top: popupPosition.y }}
          >
            {/* 드래그 가능한 헤더 */}
            <div
              className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3 cursor-move select-none"
              onMouseDown={handleDragStart}
            >
              <div>
                <h4 className="font-bold text-2xl text-slate-800 tracking-tight">
                  {selectedNode.name}
                </h4>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase mt-2 inline-block ${selectedNode.type === "dept" ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-600"}`}
                >
                  {selectedNode.type === "dept" ? "Department" : "Person"}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-300 hover:text-slate-500 p-2 hover:bg-slate-50 rounded-full transition-colors -mr-2 -mt-2"
              >
                X
              </button>
            </div>

            {selectedNode.type === "dept" ? (
              <div className="text-sm text-slate-500 p-4 bg-slate-50 rounded-lg text-center">
                하위 조직을 포함하는 부서 노드입니다.
              </div>
            ) : (
              <div className="space-y-4 text-sm text-slate-600">
                {/* 사진 표시 */}
                <div className="flex justify-center mb-4">
                  <div className="w-[105px] h-[135px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                    {selectedNode.profile_picture_url ? (
                      <img
                        src={selectedNode.profile_picture_url}
                        alt={selectedNode.user_name || selectedNode.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">
                        인
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs font-semibold">
                    직책
                  </span>
                  <span className="font-medium text-slate-800 text-base">
                    {selectedNode.position || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs font-semibold">
                    소속
                  </span>
                  {/* 상속받은 부서명 또는 입력된 회사명 */}
                  <span className="font-medium text-slate-700">
                    {selectedNode.company || selectedNode.inheritedDept || "-"}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Mobile
                  </span>
                  <a
                    href={`tel:${selectedNode.phone}`}
                    className="font-bold text-lg text-blue-600 font-mono tracking-tight hover:underline"
                  >
                    {selectedNode.phone || "-"}
                  </a>
                </div>
              </div>
            )}

            {selectedNode.type !== "dept" && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => {
                    setActiveTab("emergency");
                  }}
                  className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors font-medium"
                >
                  비상연락망에서 확인하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationChart;
