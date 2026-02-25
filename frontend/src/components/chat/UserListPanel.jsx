import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

const PRIORITY_DEPARTMENT_NAME = '대표이사';

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
            const deptName = u.department || '부서없음';
            if (!groups[deptName]) groups[deptName] = [];
            groups[deptName].push(u);
        });

        return Object.keys(groups)
            .sort((a, b) => {
                const isAPriority = String(a || '').trim() === PRIORITY_DEPARTMENT_NAME;
                const isBPriority = String(b || '').trim() === PRIORITY_DEPARTMENT_NAME;

                if (isAPriority && !isBPriority) return -1;
                if (!isAPriority && isBPriority) return 1;
                return a.localeCompare(b);
            })
            .map((deptName) => ({
                deptName,
                users: groups[deptName],
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
                        const hasSearchQuery = searchQuery.trim().length > 0;
                        const isGroupExpanded = hasSearchQuery || (expandedGroups[group.deptName] ?? false);
                        return (
                            <div key={group.deptName} className="mb-2">
                                <div
                                    onClick={() => toggleGroup(group.deptName)}
                                    className="px-4 py-2 bg-gray-100 text-blue-600 font-bold text-sm sticky top-0 z-10 border-y border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-200 transition-colors"
                                >
                                    <span>{group.deptName}</span>
                                    {isGroupExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>

                                <AnimatePresence initial={false}>
                                    {isGroupExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                        >
                                            {group.users.map((u) => (
                                                <div key={u.id} className="p-3 flex items-center justify-between hover:bg-gray-100 border-b border-gray-200 transition-colors">
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
                    })
                )}
            </div>
        </div>
    );
};

export default UserListPanel;
