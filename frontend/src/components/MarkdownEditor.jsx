import React, { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownEditor({
  value = "",
  onChange,
  height = 320,
  placeholder = "마크다운으로 내용을 입력하세요",
}) {
  const textareaRef = useRef(null);
  const [mode, setMode] = useState("split");
  const safeValue = useMemo(() => (typeof value === "string" ? value : ""), [value]);

  const updateValue = (nextValue, selectionStart, selectionEnd) => {
    onChange?.(nextValue);

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const wrapSelection = (prefix, suffix = prefix, fallback = "텍스트") => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = safeValue.slice(start, end) || fallback;
    const nextValue =
      safeValue.slice(0, start) + prefix + selected + suffix + safeValue.slice(end);
    const cursorStart = start + prefix.length;
    const cursorEnd = cursorStart + selected.length;
    updateValue(nextValue, cursorStart, cursorEnd);
  };

  const insertAtLineStart = (prefix, fallback = "내용") => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const block = safeValue.slice(start, end) || fallback;
    const lines = block.split("\n").map((line) => `${prefix}${line}`);
    const inserted = lines.join("\n");
    const nextValue = safeValue.slice(0, start) + inserted + safeValue.slice(end);
    updateValue(nextValue, start, start + inserted.length);
  };

  const insertTemplate = (text, cursorOffset = text.length) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const nextValue = safeValue.slice(0, start) + text + safeValue.slice(end);
    const cursor = start + cursorOffset;
    updateValue(nextValue, cursor, cursor);
  };

  const isWrite = mode === "write" || mode === "split";
  const isPreview = mode === "preview" || mode === "split";

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => wrapSelection("**")}
            className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
            title="굵게"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("*")}
            className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
            title="기울임"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("~~")}
            className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
            title="취소선"
          >
            S
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("`")}
            className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
            title="인라인 코드"
          >
            {"</>"}
          </button>
          <button
            type="button"
            onClick={() => insertAtLineStart("# ", "제목")}
            className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
            title="제목"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertAtLineStart("- ", "항목")}
            className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
            title="목록"
          >
            List
          </button>
          <button
            type="button"
            onClick={() => insertAtLineStart("> ", "인용문")}
            className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
            title="인용"
          >
            Quote
          </button>
          <button
            type="button"
            onClick={() => insertTemplate("\n```\n코드\n```\n", 5)}
            className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
            title="코드 블록"
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => insertTemplate("[링크 텍스트](https://)", 1)}
            className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
            title="링크"
          >
            Link
          </button>
          <button
            type="button"
            onClick={() => insertTemplate("| 항목 | 내용 |\n| --- | --- |\n|  |  |\n", 2)}
            className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
            title="표"
          >
            Table
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={`rounded px-2 py-1 text-xs ${
              mode === "write"
                ? "bg-sky-500 text-white"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            작성
          </button>
          <button
            type="button"
            onClick={() => setMode("split")}
            className={`rounded px-2 py-1 text-xs ${
              mode === "split"
                ? "bg-sky-500 text-white"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            분할
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`rounded px-2 py-1 text-xs ${
              mode === "preview"
                ? "bg-sky-500 text-white"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            미리보기
          </button>
        </div>
      </div>

      <div
        className={`grid bg-white ${
          mode === "split" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {isWrite && (
          <textarea
            ref={textareaRef}
            value={safeValue}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            className={`w-full resize-none p-3 font-mono text-sm outline-none ${
              mode === "split" ? "border-b border-gray-200 md:border-b-0 md:border-r" : ""
            }`}
            style={{ minHeight: height }}
          />
        )}

        {isPreview && (
          <div
            className="overflow-auto p-3 text-sm text-gray-800"
            style={{ minHeight: height }}
          >
            {safeValue.trim() ? (
              <div className="space-y-2 whitespace-pre-wrap break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{safeValue}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-gray-400">미리보기 내용이 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
