// src/components/chat/ChatPanel.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { 
  X, 
  ChevronLeft, 
  UserPlus, 
  Send, 
  MessageCircle,
  Users
} from "lucide-react";

// 간단 시간 포맷
const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
};

export default function ChatPanel({ isOpen, onClose }) {
  const { user } = useAuth();
  const [view, setView] = useState('list'); // list, chat, new
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const messagesEndRef = useRef(null);

  // 대화방 목록 로드
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get("chat/conversations/");
      setConversations(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // 사용자 목록 로드
  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get("core/users/");
      setUsers(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      loadUsers();
    }
  }, [isOpen, loadConversations, loadUsers]);

  // 메시지 로드
  const loadMessages = useCallback(async (chatId) => {
    setLoading(true);
    try {
      const res = await api.get(`chat/messages/?conversation=${chatId}`);
      setMessages(res.data?.results ?? res.data ?? []);
      
      // 읽음 처리
      await api.post("chat/messages/mark-read/", { conversation_id: chatId });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
      setView('chat');
    }
  }, [selectedChat, loadMessages]);

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 메시지 전송
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChat) return;

    try {
      await api.post("chat/messages/", {
        conversation: selectedChat.id,
        text: inputText,
      });
      setInputText('');
      loadMessages(selectedChat.id);
    } catch (err) {
      console.error(err);
    }
  };

  // 1:1 대화 시작
  const handleStart1on1 = async (userId) => {
    try {
      setLoading(true);
      const res = await api.post("chat/conversations/get-or-create/", { user_id: userId });
      setSelectedChat(res.data);
      loadConversations();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 상대방 정보
  const getOtherParticipant = (chat) => {
    if (!chat || !chat.participants) return { name: 'Unknown' };
    if (chat.is_group) return { name: chat.name || '그룹 채팅' };
    const other = chat.participants.find(p => p.id !== user?.id);
    return other || { name: 'Unknown' };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-slate-900 text-white z-50 shadow-2xl flex flex-col">
      {/* 헤더 */}
      <div className="h-14 px-4 border-b border-slate-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {view !== 'list' && (
            <button onClick={() => { setView('list'); setSelectedChat(null); }} className="p-1 hover:bg-slate-700 rounded">
              <ChevronLeft size={20} />
            </button>
          )}
          <h2 className="font-semibold text-lg">
            {view === 'new' ? '새 채팅' : view === 'chat' ? getOtherParticipant(selectedChat).name : '대화 내역'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {view === 'list' && (
            <button onClick={() => setView('new')} className="p-2 hover:bg-slate-700 rounded-full">
              <UserPlus size={18} />
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {view === 'list' && (
          <div className="divide-y divide-slate-700">
            {conversations.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p>대화가 없습니다.</p>
              </div>
            ) : (
              conversations.map((chat) => {
                const other = getOtherParticipant(chat);
                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className="p-4 hover:bg-slate-800 cursor-pointer flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-lg font-bold shrink-0">
                      {(other.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{other.name}</p>
                      {chat.last_message && (
                        <p className="text-sm text-slate-400 truncate">{chat.last_message.text}</p>
                      )}
                    </div>
                    {chat.unread_count > 0 && (
                      <span className="w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {view === 'new' && (
          <div className="divide-y divide-slate-700">
            {users.filter(u => u.id !== user?.id).map((u) => (
              <div
                key={u.id}
                onClick={() => handleStart1on1(u.id)}
                className="p-4 hover:bg-slate-800 cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-lg font-bold shrink-0">
                  {(u.last_name || u.first_name || u.username || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{u.last_name}{u.first_name}</p>
                  <p className="text-sm text-slate-400">@{u.username}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'chat' && (
          <div className="flex flex-col h-full">
            {/* 메시지 영역 */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-slate-400 py-8">아직 메시지가 없습니다.</p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] ${isMine ? 'bg-blue-600' : 'bg-slate-700'} rounded-2xl px-4 py-2`}>
                        {!isMine && (
                          <p className="text-xs text-slate-400 mb-1">{msg.sender_name}</p>
                        )}
                        <p className="text-sm">{msg.text}</p>
                        <p className="text-xs text-slate-400 mt-1 text-right">{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* 입력창 (chat 뷰일 때만) */}
      {view === 'chat' && (
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="메시지 입력..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded-full px-4 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      )}

      {/* P6ix AI 버튼 */}
      <div className="p-4 border-t border-slate-700">
        <button className="w-full py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700 transition">
          P6ix AI
        </button>
      </div>
    </div>
  );
}
