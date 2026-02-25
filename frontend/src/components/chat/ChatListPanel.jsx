import React from 'react';
import { MessageSquare } from 'lucide-react';

const ChatListPanel = ({ conversations, onSelectChat, currentUser }) => {
    const getOtherParticipant = (chat) => {
        if (chat.is_group) return { displayName: chat.name || 'Group Chat' };
        const other = chat.participants?.find((p) => p.id !== currentUser?.id) || {};
        return {
            ...other,
            displayName: other.name || other.username || 'Unknown',
        };
    };

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar">
            {conversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                    <MessageSquare size={48} className="mb-4 opacity-20" />
                    <p>No conversations yet.</p>
                    <p className="text-sm mt-1">Click the + icon above to start a chat.</p>
                </div>
            ) : (
                conversations.map((chat) => {
                    const other = getOtherParticipant(chat);
                    return (
                        <button
                            key={chat.id}
                            onClick={() => onSelectChat(chat)}
                            className="w-full p-4 flex items-center gap-4 hover:bg-gray-100 border-b border-gray-200 transition-colors text-left"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl relative shrink-0">
                                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                                    {other.profile_picture ? (
                                        <img src={other.profile_picture} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        (other.displayName || '?').slice(0, 1).toUpperCase()
                                    )}
                                </div>
                                {chat.unread_count > 0 && (
                                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white z-10 shadow-sm font-bold">
                                        {chat.unread_count}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-semibold truncate text-gray-900">
                                        {other.displayName}
                                        {!chat.is_group && other.position && (
                                            <span className="ml-1 text-[12px] text-gray-600 font-normal">{other.position}</span>
                                        )}
                                        {!chat.is_group && other.department && (
                                            <span className="ml-2 text-[10px] text-blue-600 font-normal">({other.department})</span>
                                        )}
                                    </h3>
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                                        {chat.last_message ? new Date(chat.last_message.created_at).toLocaleDateString() : ''}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 truncate">
                                    {chat.last_message
                                        ? (() => {
                                            const text = chat.last_message.text || chat.last_message.message || '';
                                            if (text.startsWith('[FILE:')) {
                                                if (text.includes(':paper:')) return '파일 공유';
                                                if (text.includes(':photo:')) return '사진 공유';
                                                if (text.includes(':doc:')) return '문서 공유';
                                                return '첨부 공유';
                                            }
                                            return text;
                                        })()
                                        : 'No messages yet'}
                                </p>
                            </div>
                        </button>
                    );
                })
            )}
        </div>
    );
};

export default ChatListPanel;
