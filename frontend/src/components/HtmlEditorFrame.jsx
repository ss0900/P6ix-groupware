import React, { useCallback, useEffect, useRef } from "react";

const HOST_CHANNEL = "p6ix-groupware-host";
const EDITOR_CHANNEL = "p6ix-groupware-editor";
const baseUrl = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EDITOR_SRC = `${baseUrl}/editor.html`;

export default function HtmlEditorFrame({
  value = "",
  onChange,
  height = 320,
  title = "내용 에디터",
}) {
  const iframeRef = useRef(null);
  const isReadyRef = useRef(false);
  const pendingValueRef = useRef(value);
  const lastEditorValueRef = useRef(value);

  const postSetData = useCallback((content) => {
    const targetWindow = iframeRef.current?.contentWindow;
    if (!targetWindow) return;

    targetWindow.postMessage(
      {
        source: HOST_CHANNEL,
        type: "setData",
        content,
      },
      "*",
    );
  }, []);

  useEffect(() => {
    const nextValue = value ?? "";
    pendingValueRef.current = nextValue;

    if (nextValue === lastEditorValueRef.current) {
      return;
    }

    if (isReadyRef.current) {
      postSetData(nextValue);
    }
  }, [value, postSetData]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const data = event.data;
      if (!data || data.source !== EDITOR_CHANNEL) {
        return;
      }

      if (data.type === "ready") {
        isReadyRef.current = true;
        postSetData(pendingValueRef.current ?? "");
        return;
      }

      if (data.type === "change") {
        const nextContent = typeof data.content === "string" ? data.content : "";
        lastEditorValueRef.current = nextContent;
        onChange?.(nextContent);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      isReadyRef.current = false;
    };
  }, [onChange, postSetData]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      src={EDITOR_SRC}
      className="w-full rounded-lg border border-gray-300 bg-white"
      style={{ height }}
    />
  );
}
