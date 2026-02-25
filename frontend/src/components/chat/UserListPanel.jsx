import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';

const UserListPanel = ({ users, currentUser, onStart1on1, onCreateGroup }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [expandedGroups, setExpandedGroups] = useState({});

    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            if (u.id === currentUser?.id) return false;
            const name = `${u.last_name || ''}${u.first_name || ''}` || u.username;
            return (
                name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
        });
    }, [users, currentUser?.id, searchQuery]);

    const groupedUsers = useMemo(() => {
        const groups = {};
        filteredUsers.forEach((u) => {
            const companyName = u.company || '기타(소속없음)';
            const deptName = u.department || '부서없음';
            if (!groups[companyName]) groups[companyName] = {};
            if (!groups[companyName][deptName]) groups[companyName][deptName] = [];
            groups[companyName][deptName].push(u);
        });

        return Object.keys(groups)
            .sort()
            .map((companyName) => ({
                companyName,
                departments: Object.keys(groups[companyName])
                    .sort()
                    .map((deptName) => ({ deptName, users: groups[companyName][deptName] })),
            }));
    }, [filteredUsers]);

    const toggleGroup = (key) => {
        setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleUserSelection = (userId) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const handleCreateGroupClick = () => {
        onCreateGroup(groupName, selectedUserIds);
        setGroupName('');
        setSelectedUserIds([]);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 space-y-3 bg-gray-50 border-b border-gray-200">
                <input
                    type="text"
                    placeholder="사용자 검색.."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-gray-900"
                />
                {selectedUserIds.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <input
                            type="text"
                            placeholder="그룹 이름"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-gray-900"
                        />
                        <button
                            onClick={handleCreateGroupClick}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                        >
                            그룹 생성 ({selectedUserIds.length + 1}명)
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
                {groupedUsers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">검색 결과가 없습니다.</div>
                ) : (
                    groupedUsers.map((group) => {
                        const isCompanyExpanded = expandedGroups[group.companyName] ?? true;
                        return (
                            <div key={group.companyName} className="mb-2">
                                <div
                                    onClick={() => toggleGroup(group.companyName)}
                                    className="px-4 py-2 bg-gray-100 text-blue-600 font-bold text-sm sticky top-0 z-10 border-y border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-200 transition-colors"
                                >
                                    <span>{group.companyName}</span>
                                    {isCompanyExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>

                                <AnimatePresence initial={false}>
                                    {isCompanyExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                        >
                                            {group.departments.map((dept) => {
                                                const deptKey = `${group.companyName}-${dept.deptName}`;
                                                const isDeptExpanded = expandedGroups[deptKey] ?? true;

                                                return (
                                                    <div key={dept.deptName}>
                                                        <div
                                                            onClick={() => toggleGroup(deptKey)}
                                                            className="px-4 py-1 bg-gray-50 text-gray-600 text-xs font-semibold pl-6 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                                                        >
                                                            <span>- {dept.deptName}</span>
                                                            {isDeptExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                        </div>

                                                        <AnimatePresence initial={false}>
                                                            {isDeptExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    {dept.users.map((u) => (
                                                                        <div key={u.id} className="p-3 pl-8 flex items-center justify-between hover:bg-gray-100 border-b border-gray-200 transition-colors">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden shrink-0">
                                                                                    {u.profile_picture ? (
                                                                                        <img src={u.profile_picture} alt={u.username} className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        (u.username || '?').slice(0, 1).toUpperCase()
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    <div className="text-sm font-semibold text-gray-900">
                                                                                        {u.last_name}{u.first_name}
                                                                                        <span className="ml-2 text-[10px] text-gray-500 font-normal">{u.position || ''}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        onStart1on1(u.id);
                                                                                    }}
                                                                                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-900 text-[11px] rounded transition-colors"
                                                                                >
                                                                                    1:1
                                                                                </button>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={selectedUserIds.includes(u.id)}
                                                                                    onChange={(e) => {
                                                                                        e.stopPropagation();
                                                                                        toggleUserSelection(u.id);
                                                                                    }}
                                                                                    className="w-4 h-4 rounded border-white/20 bg-transparent text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default UserListPanel;
