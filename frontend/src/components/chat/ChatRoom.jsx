import React from 'react';
import { Loader2, ArrowDown, Paperclip, Send, FileText, Download, ChevronRight } from 'lucide-react';

const ChatRoom = ({
    selectedChat,
    currentUser,
    messages,
    loading,
    scrollRef,
    handleScroll,
    handleTranslateMessage,
    messageTranslations,
    translationEnabled,
    showScrollButton,
    unreadCount,
    scrollToBottom,
    handleSendMessage,
    inputText,
    setInputText,
    isTranslating,
    isConnected,
    handleOpenFileModal,
}) => {
    const parseFileMessage = (text) => {
        const filePattern = /^\[FILE:(paper|photo|doc):(.+)\]$/;
        const match = String(text || '').match(filePattern);
        if (!match) return { isFile: false };
        try {
            return {
                isFile: true,
                type: match[1],
                metadata: JSON.parse(match[2]),
            };
        } catch (e) {
            return { isFile: false };
        }
    };

    const getDateKey = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    };

    const formatDateDivider = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
        });
    };

    const inConversation = messages.filter((m) => String(m.conversation) === String(selectedChat.id));
    const participantCount = Array.isArray(selectedChat?.participants) ? selectedChat.participants.length : 0;

    const getUnreadByCount = (msg) => {
        if (!msg) return 0;
        if (!participantCount) return msg.is_read ? 0 : 1;

        const senderId = Number(msg.sender);
        const readBySet = new Set(
            (Array.isArray(msg.read_by_ids) ? msg.read_by_ids : [])
                .map((id) => Number(id))
                .filter((id) => !Number.isNaN(id))
        );

        if (!Number.isNaN(senderId)) {
            readBySet.add(senderId);
        }

        return Math.max(participantCount - readBySet.size, 0);
    };

    return (
        <>
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 relative">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    inConversation.map((msg, idx) => {
                        const fileInfo = parseFileMessage(msg.text);
                        const isOwn = Number(msg.sender) === Number(currentUser?.id);
                        const previousMessage = inConversation[idx - 1];
                        const dateDividerText = formatDateDivider(msg.created_at);
                        const showDateDivider = !!dateDividerText && (
                            !previousMessage ||
                            getDateKey(previousMessage.created_at) !== getDateKey(msg.created_at)
                        );
                        const msgId = msg.id || msg.tempId;
                        const translated = messageTranslations[msgId];
                        const unreadByCount = isOwn ? getUnreadByCount(msg) : 0;

                        return (
                            <React.Fragment key={msg.id || msg.tempId || `${msg.created_at}-${idx}`}>
                                {showDateDivider && (
                                    <div className="flex justify-center my-1">
                                        <div className="px-3 py-1 rounded-full bg-gray-100 text-[11px] text-gray-600 font-medium">
                                            {dateDividerText}
                                        </div>
                                    </div>
                                )}

                                <div className={`flex w-full mb-1 ${isOwn ? 'justify-end' : 'justify-start items-end gap-2'}`}>
                                    {!isOwn && (
                                        <div className="shrink-0 mb-1 relative z-10">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[11px] text-blue-600 font-bold overflow-hidden border-2 border-white shadow-sm">
                                                {msg.sender_profile_picture ? (
                                                    <img src={msg.sender_profile_picture} alt="avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    (msg.sender_name || '?').slice(0, 1).toUpperCase()
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className={`flex flex-col max-w-[80%] ${isOwn ? 'items-end' : 'items-start -ml-2'}`}>
                                        {!isOwn && (
                                            <span className="text-[10px] font-bold text-gray-500 mb-1 ml-4 tracking-tighter opacity-80 uppercase">
                                                {msg.sender_name}
                                            </span>
                                        )}

                                        <div className={`relative group ${fileInfo.isFile ? 'min-w-[220px]' : ''} p-3 rounded-2xl shadow-sm ${isOwn
                                            ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-tr-none'
                                            : 'bg-white text-gray-900 rounded-tl-none border border-gray-100'
                                            }`}>
                                            {fileInfo.isFile ? (
                                                fileInfo.type === 'paper' ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
                                                                <FileText size={20} className="text-blue-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-gray-900'}`}>{fileInfo.metadata.name}</p>
                                                                <p className={`text-[10px] opacity-60 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                                                                    {((Number(fileInfo.metadata.size || 0)) / 1024).toFixed(1)} KB
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={fileInfo.metadata.url}
                                                            download
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg transition-colors text-xs font-bold ${isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'}`}
                                                        >
                                                            <Download size={12} />
                                                            다운로드
                                                        </a>
                                                    </div>
                                                ) : fileInfo.type === 'photo' ? (
                                                    <div className="space-y-2">
                                                        <div className="relative overflow-hidden rounded-lg">
                                                            <img
                                                                src={fileInfo.metadata.url}
                                                                alt={fileInfo.metadata.name}
                                                                className="w-full max-h-64 object-cover cursor-pointer"
                                                                onClick={() => window.open(fileInfo.metadata.url, '_blank')}
                                                            />
                                                        </div>
                                                        <div className="px-1">
                                                            <p className={`text-sm font-bold ${isOwn ? 'text-white' : 'text-gray-900'}`}>{fileInfo.metadata.name}</p>
                                                            {fileInfo.metadata.description && (
                                                                <p className={`text-[11px] opacity-70 mt-0.5 line-clamp-2 ${isOwn ? 'text-blue-50' : 'text-gray-500'}`}>
                                                                    {fileInfo.metadata.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : fileInfo.type === 'doc' ? (
                                                    <a
                                                        href={fileInfo.metadata.url || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`block p-3 rounded-xl border transition-all cursor-pointer group/doc relative overflow-hidden ${isOwn ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-gray-50 border-gray-100 hover:bg-blue-50 hover:border-blue-200 shadow-sm'}`}
                                                    >
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOwn ? 'bg-white/20' : 'bg-white'}`}>
                                                                <FileText size={20} className={isOwn ? 'text-white' : 'text-blue-600'} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-bold truncate ${isOwn ? 'text-white' : 'text-gray-900 group-hover/doc:text-blue-700'}`}>
                                                                    {fileInfo.metadata.name}
                                                                </p>
                                                                <p className={`text-[10px] font-medium ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                                                                    {fileInfo.metadata.doc_type || fileInfo.metadata.resource_type || 'document'}
                                                                </p>
                                                            </div>
                                                            <div className={`${isOwn ? 'text-white/50' : 'text-blue-500 opacity-60 group-hover/doc:opacity-100 group-hover/doc:translate-x-1'}`}>
                                                                <ChevronRight size={18} />
                                                            </div>
                                                        </div>
                                                        <div className={`flex items-center justify-between pt-2 border-t text-[10px] ${isOwn ? 'border-white/10 text-blue-100' : 'border-gray-100 text-gray-400'}`}>
                                                            <span>{fileInfo.metadata.created_by}</span>
                                                            <span>{fileInfo.metadata.date && new Date(fileInfo.metadata.date).toLocaleDateString()}</span>
                                                        </div>
                                                    </a>
                                                ) : null
                                            ) : (
                                                <>
                                                    <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                                                        {(translated?.showTranslated && !translated?.loading && translated?.translatedText)
                                                            ? translated.translatedText
                                                            : msg.text}
                                                    </p>

                                                    {translationEnabled && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleTranslateMessage(msg)}
                                                                className={`text-[10px] font-bold flex items-center gap-1 ${isOwn ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-700'}`}
                                                            >
                                                                {translated?.loading ? (
                                                                    <Loader2 size={10} className="animate-spin" />
                                                                ) : translated?.showTranslated ? (
                                                                    <>See Original</>
                                                                ) : (
                                                                    <>Translate</>
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            <div className={`text-[9px] mt-2 flex items-center justify-end gap-1.5 font-bold ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {isOwn && unreadByCount > 0 && (
                                                    <span className="text-yellow-300 animate-pulse">{unreadByCount}</span>
                                                )}
                                                <span className="opacity-70 font-medium">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })
                )}

                {showScrollButton && unreadCount > 0 && (
                    <button
                        onClick={scrollToBottom}
                        className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all z-10"
                    >
                        <ArrowDown size={16} />
                        <span className="text-sm font-medium">새 메시지 {unreadCount}개</span>
                    </button>
                )}
            </div>

            <form
                onSubmit={(e) => {
                    handleSendMessage(e).then(() => {
                        const ta = document.getElementById('chat-textarea');
                        if (ta) ta.style.height = 'auto';
                    });
                }}
                className="p-4 border-t border-gray-200 bg-white"
            >
                <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-sm">
                    <button
                        type="button"
                        onClick={handleOpenFileModal}
                        className="text-gray-400 hover:text-blue-500 transition-colors mb-2"
                        title="파일 공유"
                    >
                        <Paperclip size={20} />
                    </button>
                    <textarea
                        id="chat-textarea"
                        value={inputText}
                        onChange={(e) => {
                            setInputText(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e).then(() => {
                                    e.target.style.height = 'auto';
                                });
                            }
                        }}
                        placeholder={isTranslating ? '번역 중..' : '메시지를 입력하세요.. (Shift + Enter 줄바꿈)'}
                        disabled={isTranslating}
                        rows={1}
                        className="flex-1 bg-transparent border-none focus:outline-none text-sm py-2 text-gray-900 placeholder:text-gray-400 disabled:opacity-50 resize-none max-h-[120px] overflow-y-auto"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || !isConnected || isTranslating}
                        className="text-blue-600 hover:text-blue-700 disabled:opacity-30 transition-colors mb-2"
                    >
                        {isTranslating ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </form>
        </>
    );
};

export default ChatRoom;
