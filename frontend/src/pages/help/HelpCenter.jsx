import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Lock,
  MessageCircle,
  PenTool,
  Send,
  Trash2,
} from "lucide-react";

import PageHeader from "../../components/common/ui/PageHeader";
import BoardToolbar from "../../components/common/board/BoardToolbar";
import BoardPagination from "../../components/common/board/BoardPagination";
import {
  createAnswer,
  createQuestion,
  deleteQuestion,
  getHelpStats,
  getQuestion,
  getQuestions,
} from "../../api/help";
import { useAuth } from "../../context/AuthContext";

const PAGE_SIZE = 8;

const toDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
};

const toListPayload = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) {
    return { results: payload, count: payload.length };
  }
  return {
    results: payload?.results ?? [],
    count: Number(payload?.count ?? 0),
  };
};

export default function HelpCenter() {
  const { user } = useAuth();
  const [view, setView] = useState("list");
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, answered: 0, pending: 0 });
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        getQuestions({
          page,
          page_size: PAGE_SIZE,
          search: query || undefined,
        }),
        getHelpStats(),
      ]);

      const { results, count } = toListPayload(listRes);
      setQuestions(results);
      setTotal(count);
      setStats({
        total: Number(statsRes?.data?.total || 0),
        answered: Number(statsRes?.data?.answered || 0),
        pending: Number(statsRes?.data?.pending || 0),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  const loadDetail = useCallback(async (questionId) => {
    try {
      const res = await getQuestion(questionId);
      setSelectedQuestion(res.data);
    } catch (err) {
      console.error(err);
      setSelectedQuestion(null);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const onSearch = () => {
    setPage(1);
    setQuery(searchInput.trim());
  };

  const openDetail = async (question) => {
    setSelectedId(question.id);
    setSelectedQuestion(question);
    setView("detail");
    await loadDetail(question.id);
  };

  const onCreated = async () => {
    setView("list");
    setPage(1);
    await loadList();
  };

  const onRefreshCurrent = async () => {
    await loadList();
    if (selectedId) {
      await loadDetail(selectedId);
    }
  };

  const canDeleteSelected = useMemo(() => {
    if (!selectedQuestion || !user) return false;
    return Boolean(user.is_superuser || selectedQuestion.author === user.id);
  }, [selectedQuestion, user]);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 pb-24">
      <PageHeader>워크스페이스 Q&A</PageHeader>

      {user?.is_superuser && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <SummaryCard
            icon={<MessageCircle size={22} />}
            label="전체 질문"
            value={stats.total}
          />
          <SummaryCard
            icon={<CheckCircle size={22} />}
            label="답변 완료"
            value={stats.answered}
            color="green"
          />
          <SummaryCard
            icon={<HelpCircle size={22} />}
            label="답변 대기"
            value={stats.pending}
            color="orange"
          />
        </div>
      )}

      <div className="page-box min-h-[680px] flex flex-col">
        <div className="flex-1">
          {view === "list" && (
            <>
              <BoardToolbar
                left={
                  <div className="flex items-center gap-2">
                    <input
                      className="input-base w-64"
                      placeholder="질문 검색"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onSearch();
                      }}
                    />
                    <button className="btn-search" onClick={onSearch}>
                      검색
                    </button>
                  </div>
                }
                right={
                  <button
                    onClick={() => setView("create")}
                    className="btn-create flex items-center gap-2"
                  >
                    <PenTool size={16} />
                    새 질문하기
                  </button>
                }
              />

              <FAQListView
                loading={loading}
                questions={questions}
                page={page}
                total={total}
                onPageChange={setPage}
                onSelect={openDetail}
              />
            </>
          )}

          {view === "create" && (
            <FAQCreateView onCancel={() => setView("list")} onSaved={onCreated} />
          )}

          {view === "detail" && (
            <FAQDetailView
              user={user}
              question={selectedQuestion}
              canDelete={canDeleteSelected}
              onBack={() => setView("list")}
              onRefresh={onRefreshCurrent}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const SummaryCard = ({ icon, label, value, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white p-5 rounded-xl border flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-semibold">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
};

function FAQListView({ loading, questions, page, total, onPageChange, onSelect }) {
  return (
    <>
      <div className="divide-y mt-4">
        {loading && <div className="p-6 text-center">로딩 중...</div>}
        {!loading && questions.length === 0 && (
          <div className="p-6 text-center text-gray-400">등록된 질문이 없습니다.</div>
        )}
        {questions.map((question) => (
          <div
            key={question.id}
            onClick={() => onSelect(question)}
            className="p-4 cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              {!question.is_public && <Lock size={12} />}
              <span className="font-medium">{question.title}</span>
              {Array.isArray(question.answers) && question.answers.length > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                  답변완료
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">
                  답변대기
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {question.created_by_username || question.author_name} · {toDate(question.created_at)}
            </div>
          </div>
        ))}
      </div>

      <BoardPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={onPageChange}
      />
    </>
  );
}

function FAQCreateView({ onCancel, onSaved }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await createQuestion({
        title: title.trim(),
        content: content.trim(),
        is_public: isPublic,
      });
      await onSaved();
    } catch (err) {
      console.error(err);
      alert("질문 등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onCancel} className="flex items-center gap-1 text-sm">
        <ArrowLeft size={14} /> 목록으로
      </button>

      <div className="space-y-3 border bg-gray-50 p-4 rounded-lg">
        <input
          className="input-base"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
        />

        <div className="flex items-center gap-2 pl-1">
          <input
            type="checkbox"
            id="faq-public"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            disabled={submitting}
          />
          <label htmlFor="faq-public" className="text-sm cursor-pointer select-none">
            전체 공개
          </label>
        </div>

        <textarea
          className="input-base h-40"
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={submitting}
        />

        <div className="flex justify-end gap-2">
          <button className="btn-cancel" onClick={onCancel} disabled={submitting}>
            취소
          </button>
          <button className="btn-create" onClick={submit} disabled={submitting}>
            {submitting ? "등록 중..." : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FAQDetailView({ user, question, canDelete, onBack, onRefresh }) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const isAdmin = Boolean(user?.is_superuser);

  if (!question) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-1 text-sm">
          <ArrowLeft size={14} /> 목록으로
        </button>
        <div className="text-sm text-gray-500">질문을 불러오는 중입니다.</div>
      </div>
    );
  }

  const onDelete = async () => {
    if (!window.confirm("질문을 삭제하시겠습니까?")) return;
    try {
      await deleteQuestion(question.id);
      onBack();
      await onRefresh();
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const onSubmitReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await createAnswer({ question: question.id, content: reply.trim() });
      setReply("");
      await onRefresh();
    } catch (err) {
      console.error(err);
      alert("답변 등록 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm">
        <ArrowLeft size={14} /> 목록으로
      </button>

      <div className="flex justify-between items-start gap-4">
        <h3 className="text-lg font-bold">{question.title}</h3>
        {canDelete && (
          <button onClick={onDelete} className="text-red-500 hover:text-red-600">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="text-sm text-gray-500">
        {question.created_by_username || question.author_name} · {toDate(question.created_at)}
      </div>

      <div className="whitespace-pre-wrap">{question.content}</div>

      <hr />

      {Array.isArray(question.answers) && question.answers.length > 0 ? (
        question.answers.map((answer) => (
          <div key={answer.id} className="bg-gray-50 p-3 rounded">
            <div className="text-xs text-gray-400 mb-1">
              관리자 · {toDate(answer.created_at)}
            </div>
            {answer.content}
          </div>
        ))
      ) : (
        <div className="text-sm text-gray-400">아직 등록된 답변이 없습니다.</div>
      )}

      {isAdmin && (
        <div className="flex gap-2">
          <textarea
            className="input-base flex-1"
            placeholder="답변 작성"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={sending}
          />
          <button className="btn-create" onClick={onSubmitReply} disabled={sending}>
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
