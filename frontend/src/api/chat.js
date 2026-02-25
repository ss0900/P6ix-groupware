import api from './axios';

export const chatApi = {
    getConversations: (companyId) => api.get(`chat/conversations/${companyId ? `?company=${companyId}` : ''}`),
    createConversation: (data) => api.post('chat/conversations/', data),
    updateConversation: (conversationId, data) => api.patch(`chat/conversations/${conversationId}/`, data),
    getOrCreate1on1: (userId, companyId) => api.post('chat/conversations/get-or-create/', {
        user_id: userId,
        company_id: companyId || null,
    }),
    getMessages: (conversationId) => api.get(`chat/messages/?conversation=${conversationId}`),
    markAsRead: (conversationId) => api.post('chat/messages/mark-read/', { conversation_id: conversationId }),
    // Server currently returns passthrough text until translation provider is wired.
    translate: (text, targetLang) => api.post('chat/messages/translate/', { text, target_lang: targetLang }),
    getPaperFiles: () => api.get('resources/files/?type=file'),
    getPhotos: () => api.get('resources/files/?type=image'),
    getUsers: (companyId) => api.get(`chat/users/${companyId ? `?company=${companyId}` : ''}`),
    getDocs: () => api.get('resources/files/?type=document'),
};
