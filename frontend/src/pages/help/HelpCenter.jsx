// src/pages/help/HelpCenter.jsx
import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { Plus, Search, MessageCircle, CheckCircle, Clock, Send } from "lucide-react";

// 상태 뱃지
const StatusBadge = ({ status }) => {
  const config = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-600", icon: Clock, label: "답변대기" },
    answered: { bg: "bg-green-100", text: "text-green-600", icon: CheckCircle, label: "답변완료" },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;

  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon size={12} />
      {c.label}
    </span>
  );
};

export default function HelpCenter() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, answered: 0, pending: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ title: "", content: "" });
  const [submitting, setSubmitting] = useState(false);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [questionsRes, statsRes] = await Promise.all([
        api.get("chat/help/"),
        api.get("chat/help/stats/"),
      ]);
      setQuestions(questionsRes.data?.results ?? questionsRes.data ?? []);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 질문 등록
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newQuestion.title.trim() || !newQuestion.content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("chat/help/", newQuestion);
      setNewQuestion({ title: "", content: "" });
      setShowNewForm(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 검색 필터
  const filteredQuestions = questions.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">P6ix 해결사</h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          새 질문하기
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <MessageCircle size={24} className="text-gray-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">전체 등록</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-full">
            <CheckCircle size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">답변완료</p>
            <p className="text-2xl font-bold text-green-600">{stats.answered}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-full">
            <Clock size={24} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">답변대기</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
        </div>
      </div>

      {/* 검색 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="질문 검색"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">검색</button>
      </div>

      {/* 질문 목록 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-16">번호</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">제목</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600 w-24">상태</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-32">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                  </td>
                </tr>
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-500">
                    등록된 질문이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q, idx) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{filteredQuestions.length - idx}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{q.title}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">{q.content}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(q.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 표시 */}
        <div className="px-4 py-3 border-t border-gray-100 text-center text-sm text-gray-500">
          이전 &nbsp;1 / 1 페이지&nbsp; 다음
        </div>
      </div>

      {/* 새 질문 모달 */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">새 질문하기</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  value={newQuestion.title}
                  onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                  placeholder="질문 제목"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                <textarea
                  value={newQuestion.content}
                  onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
                  placeholder="질문 내용을 입력하세요"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  <Send size={16} />
                  {submitting ? "등록 중..." : "등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
