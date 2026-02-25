import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, UserPlus, Globe, Languages, Pencil, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { chatApi } from '../../api/chat';
import useChat from '../../hooks/useChat';
import ChatListPanel from './ChatListPanel';
import UserListPanel from './UserListPanel';
import ChatRoom from './ChatRoom';

const getSelectedCompanyScopeKey = (username) => `chat:selected-company:${username || 'anonymous'}`;
const DOC_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'hwp']);

const ChatPanel = ({ isOpen, onClose, onOpenExternally, onUnreadCountChange }) => {
    const { user } = useAuth();
    const currentUser = user || {};

    const [view, setView] = useState('list');
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [companyId, setCompanyId] = useState(null);
    const [scopeLoading, setScopeLoading] = useState(true);

    const [users, setUsers] = useState([]);
    const [translationEnabled, setTranslationEnabled] = useState(false);
    const [targetLanguage, setTargetLanguage] = useState('English');
    const [messageTranslations, setMessageTranslations] = useState({});
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const [isRenamingChat, setIsRenamingChat] = useState(false);
    const [renameChatName, setRenameChatName] = useState('');
    const [renameLoading, setRenameLoading] = useState(false);

    const panelRef = useRef(null);
    const fileInputRef = useRef(null);
    const scrollRef = useRef(null);
    const isUserScrolling = useRef(false);
    const processedMessagesCount = useRef(0);

    const { messages, setMessages, sendMessage, isConnected, isTranslating, lastReadEvent } = useChat();

    const loadConversations = async (scopeCompanyId = companyId) => {
        if (!scopeCompanyId) {
            setConversations([]);
            return;
        }
        try {
            const res = await chatApi.getConversations(scopeCompanyId);
            let data = res.data.results || res.data || [];

            if (selectedChat) {
                data = data.map((chat) =>
                    Number(chat.id) === Number(selectedChat.id)
                        ? { ...chat, unread_count: 0 }
                        : chat
                );
            }

            setConversations(data);
        } catch (e) {
            console.error('Failed to load conversations', e);
        }
    };

    const loadUsers = async (scopeCompanyId = companyId) => {
        if (!scopeCompanyId) {
            setUsers([]);
            return;
        }
        try {
            const res = await chatApi.getUsers(scopeCompanyId);
            setUsers(res.data.results || res.data || []);
        } catch (e) {
            console.error('Failed to load users', e);
        }
    };

    useEffect(() => {
        const total = conversations.reduce((acc, cur) => acc + (cur.unread_count || 0), 0);
        onUnreadCountChange?.(total);
    }, [conversations, onUnreadCountChange]);

    useEffect(() => {
        let mounted = true;

        const resolveCompanyScope = async () => {
            const accessToken = localStorage.getItem('access');
            if (!accessToken) {
                if (mounted) {
                    setCompanyId(null);
                    setScopeLoading(false);
                }
                return;
            }

            setScopeLoading(true);
            const selectedScopeKey = getSelectedCompanyScopeKey(currentUser?.username);
            const selectedCompany = localStorage.getItem(selectedScopeKey);
            if (selectedCompany && mounted) {
                const selectedCompanyId = Number(selectedCompany) || null;
                if (selectedCompanyId) {
                    setCompanyId(selectedCompanyId);
                    setScopeLoading(false);
                    return;
                }
            }

            const cacheKey = currentUser?.username ? `header:company:${currentUser.username}:id` : null;
            const cachedCompany = cacheKey ? localStorage.getItem(cacheKey) : null;
            if (cachedCompany && mounted) {
                setCompanyId(Number(cachedCompany) || null);
            }

            try {
                const membershipRes = await api.get('core/membership/me/');
                const memberships = membershipRes.data?.results || membershipRes.data || [];
                const primaryMembership =
                    memberships.find((membership) => membership.is_primary) || memberships[0] || null;
                const nextCompanyId = primaryMembership?.company || null;

                if (mounted) {
                    setCompanyId(nextCompanyId);
                }
            } catch (e) {
                console.error('Failed to resolve company scope for chat', e);
                if (mounted && !cachedCompany) {
                    setCompanyId(null);
                }
            } finally {
                if (mounted) {
                    setScopeLoading(false);
                }
            }
        };

        resolveCompanyScope();

        return () => {
            mounted = false;
        };
    }, [currentUser?.id, currentUser?.username]);

    useEffect(() => {
        if (!companyId) {
            setConversations([]);
            setUsers([]);
            return;
        }

        loadConversations(companyId);
        loadUsers(companyId);
    }, [companyId]);

    useEffect(() => {
        window.isChatPanelOpen = isOpen;
        if (isOpen && companyId) loadConversations(companyId);
        return () => {
            if (isOpen) window.isChatPanelOpen = false;
        };
    }, [isOpen, companyId]);

    useEffect(() => {
        if (isOpen) return;
        setSelectedChat(null);
        setView('list');
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleOutsidePointerDown = (event) => {
            const panelElement = panelRef.current;
            if (!panelElement) return;
            if (!panelElement.contains(event.target)) {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleOutsidePointerDown);
        document.addEventListener('touchstart', handleOutsidePointerDown);

        return () => {
            document.removeEventListener('mousedown', handleOutsidePointerDown);
            document.removeEventListener('touchstart', handleOutsidePointerDown);
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (messages.length <= processedMessagesCount.current) return;

        const newMsgs = messages.slice(processedMessagesCount.current);
        processedMessagesCount.current = messages.length;

        setConversations((prev) => {
            let current = [...prev];
            let changed = false;
            let needReload = false;

            newMsgs.forEach((msg) => {
                const chatId = Number(msg.conversation);
                const existing = current.find((c) => Number(c.id) === chatId);
                if (!existing) {
                    needReload = true;
                    return;
                }

                const isOther = Number(msg.sender) !== Number(currentUser?.id);
                const isCurrent = selectedChat && Number(selectedChat.id) === chatId && isOpen;

                current = current.map((chat) => {
                    if (Number(chat.id) !== chatId) return chat;
                    changed = true;

                    if (isOther && isCurrent) {
                        chatApi.markAsRead(chat.id).catch((err) => console.error('markAsRead failed:', err));
                    }

                    return {
                        ...chat,
                        last_message: { ...msg, text: msg.text || msg.message },
                        unread_count: isCurrent ? 0 : (isOther ? (chat.unread_count + 1) : chat.unread_count),
                    };
                });
            });

            if (needReload) loadConversations();
            return changed ? current : prev;
        });
    }, [messages, selectedChat, isOpen, currentUser?.id]);

    useEffect(() => {
        if (!lastReadEvent) return;
        const { conversation_id, reader_id } = lastReadEvent;
        if (Number(reader_id) !== Number(currentUser?.id)) return;

        setConversations((prev) => prev.map((chat) =>
            Number(chat.id) === Number(conversation_id)
                ? { ...chat, unread_count: 0 }
                : chat
        ));
    }, [lastReadEvent, currentUser?.id]);

    useEffect(() => {
        if (selectedChat) {
            setView('chat');
        } else if (view === 'chat') {
            setView('list');
        }
    }, [selectedChat]);

    useEffect(() => {
        if (!selectedChat) {
            setIsRenamingChat(false);
            setRenameChatName('');
            return;
        }
        setIsRenamingChat(false);
        setRenameChatName(selectedChat.name || '');
    }, [selectedChat]);

    useEffect(() => {
        const handleOpenChat = async (e) => {
            const { userId } = e.detail || {};
            if (!userId || !companyId) return;
            try {
                setLoading(true);
                const res = await chatApi.getOrCreate1on1(userId, companyId);
                setSelectedChat(res.data);
                onOpenExternally?.();
            } catch (err) {
                console.error('Failed to open chat with user', err);
            } finally {
                setLoading(false);
            }
        };

        const handleOpenSpecificChat = (e) => {
            const { conversationId } = e.detail || {};
            if (!conversationId) return;
            const chat = conversations.find((c) => Number(c.id) === Number(conversationId));
            if (chat) {
                setSelectedChat(chat);
                onOpenExternally?.();
            }
        };

        window.addEventListener('openChatWithUser', handleOpenChat);
        window.addEventListener('openSpecificChat', handleOpenSpecificChat);

        return () => {
            window.removeEventListener('openChatWithUser', handleOpenChat);
            window.removeEventListener('openSpecificChat', handleOpenSpecificChat);
        };
    }, [onOpenExternally, conversations, companyId]);

    const handleStart1on1 = async (userId) => {
        if (!companyId) {
            alert('소속 회사가 설정되지 않아 채팅을 시작할 수 없습니다.');
            return;
        }
        try {
            setLoading(true);
            const res = await chatApi.getOrCreate1on1(userId, companyId);
            setSelectedChat(res.data);
        } catch (e) {
            console.error('Failed to start 1:1 chat', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (groupName, selectedUserIds) => {
        if (!companyId) {
            alert('소속 회사가 설정되지 않아 그룹 채팅을 만들 수 없습니다.');
            return;
        }
        if (selectedUserIds.length < 1) return;
        try {
            setLoading(true);
            const participants = [...selectedUserIds, currentUser?.id].filter(Boolean);
            const res = await chatApi.createConversation({
                company: companyId,
                participants,
                is_group: true,
                name: groupName || `${currentUser?.username || currentUser?.name || 'Group'}'s Group`,
            });
            setSelectedChat(res.data);
            loadConversations();
        } catch (e) {
            console.error('Failed to create group chat', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedChat || !isOpen) return;

        const loadMessages = async () => {
            setLoading(true);
            try {
                const res = await chatApi.getMessages(selectedChat.id);
                const msgs = res.data.results || res.data || [];
                processedMessagesCount.current = msgs.length;
                setMessages(msgs);

                await chatApi.markAsRead(selectedChat.id);
                setMessages((prev) => prev.map((m) =>
                    Number(m.conversation) === Number(selectedChat.id) && Number(m.sender) !== Number(currentUser?.id)
                        ? {
                            ...m,
                            is_read: true,
                            read_by_ids: Array.isArray(m.read_by_ids) && m.read_by_ids.some((id) => Number(id) === Number(currentUser?.id))
                                ? m.read_by_ids
                                : [...(Array.isArray(m.read_by_ids) ? m.read_by_ids : []), currentUser?.id],
                        }
                        : m
                ));

                setConversations((prev) => prev.map((chat) =>
                    Number(chat.id) === Number(selectedChat.id)
                        ? { ...chat, unread_count: 0 }
                        : chat
                ));

                setTimeout(scrollToBottom, 100);
            } catch (e) {
                console.error('Failed to load messages', e);
            } finally {
                setLoading(false);
            }
        };

        loadMessages();
    }, [selectedChat, isOpen, setMessages, currentUser?.id]);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setShowScrollButton(!isAtBottom);
        isUserScrolling.current = !isAtBottom;
    };

    useEffect(() => {
        if (!scrollRef.current) return;
        if (isUserScrolling.current) {
            setUnreadCount((prev) => prev + 1);
        } else {
            setTimeout(scrollToBottom, 50);
        }
    }, [messages]);

    const scrollToBottom = () => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        setUnreadCount(0);
        isUserScrolling.current = false;
        setShowScrollButton(false);
    };

    const handleOpenFilePicker = () => {
        if (!selectedChat) return;
        fileInputRef.current?.click();
    };

    const handleLocalFileSelected = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!selectedChat) {
            event.target.value = '';
            return;
        }

        const currentUserName = `${currentUser?.last_name || ''}${currentUser?.first_name || ''}`.trim() || currentUser?.username || '';
        const fileExt = String(file.name || '').split('.').pop()?.toLowerCase() || '';
        const isImage = String(file.type || '').startsWith('image/');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name);

            const uploadRes = await chatApi.uploadResourceFile(formData);
            const uploaded = uploadRes.data || {};

            let resource = uploaded;
            if (uploaded?.id) {
                try {
                    const detailRes = await chatApi.getResourceFile(uploaded.id);
                    resource = detailRes.data || uploaded;
                } catch {
                    resource = uploaded;
                }
            }

            const rawUrl = resource.file_url || resource.url || resource.file || '';
            const normalizedUrl = rawUrl
                ? (/^https?:\/\//i.test(rawUrl) ? rawUrl : `${window.location.origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`)
                : '';

            if (!normalizedUrl) {
                throw new Error('Uploaded file URL is empty');
            }

            const metadata = {
                id: resource.id,
                name: resource.name || file.name,
                url: normalizedUrl,
                date: resource.created_at || new Date().toISOString(),
            };

            let messageType = 'paper';
            if (isImage || resource.resource_type === 'image') {
                messageType = 'photo';
                metadata.description = resource.description || '';
            } else if (resource.resource_type === 'document' || DOC_EXTENSIONS.has(fileExt)) {
                messageType = 'doc';
                metadata.resource_type = resource.resource_type || 'document';
                metadata.doc_type = resource.extension || fileExt || 'document';
                metadata.created_by = resource.uploader_name || currentUserName;
            } else {
                metadata.size = resource.file_size || file.size || 0;
                metadata.created_by = resource.uploader_name || currentUserName;
            }

            await sendMessage(`[FILE:${messageType}:${JSON.stringify(metadata)}]`, selectedChat.id);
        } catch (err) {
            console.error('Failed to attach local file:', err);
            alert('파일 첨부에 실패했습니다.');
        } finally {
            event.target.value = '';
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || !selectedChat) return;
        try {
            await sendMessage(inputText, selectedChat.id);
            setInputText('');
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleStartRename = () => {
        if (!selectedChat?.is_group) return;
        setRenameChatName(selectedChat.name || '');
        setIsRenamingChat(true);
    };

    const handleCancelRename = () => {
        setRenameChatName(selectedChat?.name || '');
        setIsRenamingChat(false);
    };

    const handleRenameConversation = async () => {
        if (!selectedChat) return;
        const nextName = renameChatName.trim();
        if (!nextName) {
            alert('채팅방 이름을 입력해 주세요.');
            return;
        }

        try {
            setRenameLoading(true);
            const res = await chatApi.updateConversation(selectedChat.id, { name: nextName });
            const updatedChat = res.data;

            setSelectedChat(updatedChat);
            setConversations((prev) => prev.map((chat) =>
                Number(chat.id) === Number(updatedChat.id) ? { ...chat, ...updatedChat } : chat
            ));
            setIsRenamingChat(false);
        } catch (err) {
            console.error('Failed to rename conversation:', err);
            alert('채팅방 이름 변경에 실패했습니다.');
        } finally {
            setRenameLoading(false);
        }
    };

    const handleTranslateMessage = async (msg) => {
        const msgId = msg.id || msg.tempId;
        if (!msgId) return;

        if (
            messageTranslations[msgId]?.translatedText &&
            messageTranslations[msgId]?.targetLanguage === targetLanguage
        ) {
            setMessageTranslations((prev) => ({
                ...prev,
                [msgId]: { ...prev[msgId], showTranslated: !prev[msgId].showTranslated },
            }));
            return;
        }

        try {
            setMessageTranslations((prev) => ({
                ...prev,
                [msgId]: { ...prev[msgId], loading: true, targetLanguage },
            }));

            const res = await chatApi.translate(msg.text, targetLanguage);
            const { translated_text, detected_source } = res.data;

            setMessageTranslations((prev) => ({
                ...prev,
                [msgId]: {
                    translatedText: translated_text,
                    detectedSource: detected_source,
                    targetLanguage,
                    showTranslated: true,
                    loading: false,
                },
            }));
        } catch (err) {
            console.error('Translation failed:', err);
            setMessageTranslations((prev) => ({
                ...prev,
                [msgId]: { ...prev[msgId], loading: false },
            }));
        }
    };

    const getOtherParticipant = (chat) => {
        if (!chat) return { displayName: 'Unknown' };
        if (chat.is_group) return { displayName: chat.name || 'Group Chat' };
        const other = chat.participants?.find((p) => p.id !== currentUser?.id) || {};
        return {
            ...other,
            displayName: other.name || other.username || 'Unknown',
        };
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={panelRef}
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className={`fixed top-0 right-0 h-full w-full ${selectedChat ? 'sm:w-[900px]' : 'sm:w-[400px]'} bg-white text-gray-900 z-[200] shadow-2xl flex flex-col no-print transition-[width] duration-300`}
                >
                    <div className="flex-1 flex overflow-hidden">
                        {selectedChat && (
                            <div className="flex-1 flex flex-col border-r border-gray-200 relative">
                                <div className="h-16 p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setSelectedChat(null)}
                                            className="sm:hidden p-1 hover:bg-white rounded-full"
                                        >
                                            <ChevronLeft size={24} />
                                        </button>

                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs overflow-hidden shrink-0">
                                                {getOtherParticipant(selectedChat).profile_picture ? (
                                                    <img src={getOtherParticipant(selectedChat).profile_picture} alt="avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    (getOtherParticipant(selectedChat).displayName || '?').slice(0, 1).toUpperCase()
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                {selectedChat?.is_group && isRenamingChat ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            value={renameChatName}
                                                            onChange={(e) => setRenameChatName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleRenameConversation();
                                                                }
                                                                if (e.key === 'Escape') {
                                                                    e.preventDefault();
                                                                    handleCancelRename();
                                                                }
                                                            }}
                                                            autoFocus
                                                            maxLength={255}
                                                            className="h-7 w-44 rounded border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                                                            placeholder="채팅방 이름"
                                                        />
                                                        <button
                                                            onClick={handleRenameConversation}
                                                            disabled={renameLoading || !renameChatName.trim()}
                                                            className="p-1 rounded hover:bg-gray-200 text-blue-600 disabled:opacity-40"
                                                            title="저장"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelRename}
                                                            disabled={renameLoading}
                                                            className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-40"
                                                            title="취소"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <h2 className="text-base font-bold leading-tight truncate">
                                                            {getOtherParticipant(selectedChat).displayName}
                                                        </h2>
                                                        {selectedChat?.is_group && (
                                                            <button
                                                                onClick={handleStartRename}
                                                                className="p-1 rounded hover:bg-gray-200 text-gray-500"
                                                                title="채팅방 이름 변경"
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {!selectedChat?.is_group && getOtherParticipant(selectedChat).company && (
                                                    <span className="text-[10px] text-gray-500">{getOtherParticipant(selectedChat).company}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setTranslationEnabled(!translationEnabled)}
                                            className={`p-2 rounded-full transition-colors ${translationEnabled ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-blue-600'}`}
                                            title="AI 번역 모드"
                                        >
                                            <Globe size={20} />
                                        </button>
                                        <button
                                            onClick={() => setSelectedChat(null)}
                                            className="hidden sm:block p-2 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-900"
                                            title="채팅 닫기"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {translationEnabled && (
                                    <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-2 text-xs text-blue-700 font-medium">
                                            <Languages size={14} />
                                            <span>AI 번역 활성화 중</span>
                                        </div>
                                        <select
                                            value={targetLanguage}
                                            onChange={(e) => setTargetLanguage(e.target.value)}
                                            className="bg-white text-xs text-blue-700 border border-blue-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                                        >
                                            <option value="Korean">Korean</option>
                                            <option value="English">English</option>
                                            <option value="Vietnamese">Vietnamese</option>
                                            <option value="Chinese">Chinese</option>
                                            <option value="Thai">Thai</option>
                                            <option value="Japanese">Japanese</option>
                                            <option value="Indonesian">Indonesian</option>
                                            <option value="Russian">Russian</option>
                                            <option value="Spanish">Spanish</option>
                                            <option value="French">French</option>
                                            <option value="German">German</option>
                                            <option value="Tagalog">Tagalog</option>
                                            <option value="Hindi">Hindi</option>
                                            <option value="Arabic">Arabic</option>
                                        </select>
                                    </div>
                                )}

                                <ChatRoom
                                    selectedChat={selectedChat}
                                    currentUser={currentUser}
                                    messages={messages}
                                    loading={loading}
                                    scrollRef={scrollRef}
                                    handleScroll={handleScroll}
                                    handleTranslateMessage={handleTranslateMessage}
                                    messageTranslations={messageTranslations}
                                    translationEnabled={translationEnabled}
                                    showScrollButton={showScrollButton}
                                    unreadCount={unreadCount}
                                    scrollToBottom={scrollToBottom}
                                    handleSendMessage={handleSendMessage}
                                    inputText={inputText}
                                    setInputText={setInputText}
                                    isTranslating={isTranslating}
                                    isConnected={isConnected}
                                    handleOpenFilePicker={handleOpenFilePicker}
                                />
                            </div>
                        )}

                        <div className={`w-full sm:w-[400px] flex flex-col bg-gray-50 z-10 ${selectedChat ? 'hidden sm:flex' : 'flex'}`}>
                            <div className="h-16 p-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-3">
                                    {view === 'new' && (
                                        <button
                                            onClick={() => setView('list')}
                                            className="p-1 hover:bg-white rounded-full"
                                        >
                                            <ChevronLeft size={24} />
                                        </button>
                                    )}
                                    <h2 className="text-lg font-bold">{view === 'new' ? '새 채팅' : '메시지'}</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    {view === 'list' && (
                                        <button
                                            onClick={() => setView('new')}
                                            className="p-2 hover:bg-gray-200 rounded-full text-blue-600"
                                            title="새 채팅 시작"
                                        >
                                            <UserPlus size={20} />
                                        </button>
                                    )}
                                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-900">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {scopeLoading ? (
                                <div className="p-6 text-sm text-gray-500">회사 스코프를 불러오는 중입니다...</div>
                            ) : !companyId ? (
                                <div className="p-6 text-sm text-red-500">
                                    소속 회사가 설정되지 않아 메신저를 사용할 수 없습니다.
                                </div>
                            ) : view === 'new' ? (
                                <UserListPanel
                                    users={users}
                                    currentUser={currentUser}
                                    onStart1on1={handleStart1on1}
                                    onCreateGroup={handleCreateGroup}
                                />
                            ) : (
                                <ChatListPanel
                                    conversations={conversations}
                                    onSelectChat={setSelectedChat}
                                    currentUser={currentUser}
                                />
                            )}
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleLocalFileSelected}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ChatPanel;

