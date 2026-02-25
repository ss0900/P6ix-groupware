import { useState, useEffect, useRef, useCallback } from 'react';

const useChat = () => {
    const socketRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [lastReadEvent, setLastReadEvent] = useState(null);
    const reconnectTimeoutRef = useRef(null);

    const getMessageKey = useCallback((msg) => {
        if (!msg) return '';
        if (msg.id !== undefined && msg.id !== null) return `id:${msg.id}`;
        const text = String(msg.text || msg.message || '');
        return `fallback:${msg.sender}:${msg.conversation}:${msg.created_at}:${text}`;
    }, []);

    const hasMessage = useCallback((list, data) => {
        if (!Array.isArray(list) || !data) return false;
        if (data.id !== undefined && data.id !== null) {
            return list.some((m) => String(m.id) === String(data.id));
        }
        const key = getMessageKey(data);
        return list.some((m) => getMessageKey(m) === key);
    }, [getMessageKey]);

    const jsonParseSafe = (data) => {
        try {
            return JSON.parse(data);
        } catch (e) {
            return null;
        }
    };

    const connect = useCallback(() => {
        if (socketRef.current) {
            try {
                socketRef.current.onclose = null;
                socketRef.current.onerror = null;
                socketRef.current.close(1000, 'reconnect');
            } catch (e) {
                // no-op
            }
            socketRef.current = null;
        }

        const apiBase = import.meta.env.VITE_API_BASE || '';
        let wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
        let wsHost = window.location.host;

        if (apiBase.startsWith('http')) {
            const url = new URL(apiBase);
            wsScheme = url.protocol === 'https:' ? 'wss' : 'ws';
            wsHost = url.host;
        }

        const accessToken = localStorage.getItem('access');
        if (!accessToken) {
            console.warn('No access token found, skipping chat connection');
            return;
        }

        const wsUrl = `${wsScheme}://${wsHost}/ws/chat/?token=${accessToken}`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            if (socketRef.current !== ws) return;
            setIsConnected(true);
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        ws.onmessage = (event) => {
            const data = jsonParseSafe(event.data);
            if (!data) return;

            if (data.type === 'messages_read') {
                setLastReadEvent(data);
                setMessages(prev => prev.map(msg =>
                    Number(msg.conversation) === Number(data.conversation_id) &&
                    Number(msg.sender) !== Number(data.reader_id) &&
                    !msg.is_read
                        ? { ...msg, is_read: true }
                        : msg
                ));
                return;
            }

            setMessages((prev) => (hasMessage(prev, data) ? prev : [...prev, data]));
        };

        ws.onclose = (e) => {
            if (socketRef.current !== ws) return;
            setIsConnected(false);
            socketRef.current = null;

            if (e.code !== 1000 && e.code !== 1001) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, 3000);
            }
        };

        ws.onerror = (err) => {
            if (socketRef.current !== ws) return;
            console.error('Chat WebSocket error:', err);
            ws.close();
        };
    }, [getMessageKey, hasMessage]);

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) {
                try {
                    socketRef.current.onclose = null;
                    socketRef.current.onerror = null;
                    socketRef.current.close(1000, 'unmount');
                } catch (e) {
                    // no-op
                }
                socketRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, [connect]);

    const sendMessage = useCallback((message, conversationId) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                message,
                conversation_id: conversationId,
            }));
        } else {
            console.warn('Chat WebSocket not connected or not open');
        }
    }, []);

    const [isTranslating, setIsTranslating] = useState(false);

    return { messages, setMessages, sendMessage, isConnected, isTranslating, setIsTranslating, lastReadEvent };
};

export default useChat;
