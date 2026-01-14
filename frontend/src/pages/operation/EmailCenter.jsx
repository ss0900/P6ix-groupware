// src/pages/operation/EmailCenter.jsx
/**
 * 이메일 템플릿/서명/발송로그
 */
import React, { useCallback, useEffect, useState } from "react";
import { FiMail, FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { EmailService } from "../../api/operation";
import Modal from "../../components/common/ui/Modal";

function EmailCenter() {
  const [activeTab, setActiveTab] = useState("templates");
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [logs, setLogs] = useState([]);

  const [templateModal, setTemplateModal] = useState(false);
  const [signatureModal, setSignatureModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingSignature, setEditingSignature] = useState(null);

  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    body_html: "",
    variables_schema: "{}",
  });

  const [signatureForm, setSignatureForm] = useState({
    name: "",
    html: "",
    is_default: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [templateData, signatureData, logData] = await Promise.all([
        EmailService.getTemplates(),
        EmailService.getSignatures(),
        EmailService.getLogs(),
      ]);
      setTemplates(templateData.results || templateData);
      setSignatures(signatureData.results || signatureData);
      setLogs(logData.results || logData);
    } catch (error) {
      console.error("Error fetching email data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openTemplateModal = (template = null) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template?.name || "",
      subject: template?.subject || "",
      body_html: template?.body_html || "",
      variables_schema: template?.variables_schema
        ? JSON.stringify(template.variables_schema, null, 2)
        : "{}",
    });
    setTemplateModal(true);
  };

  const openSignatureModal = (signature = null) => {
    setEditingSignature(signature);
    setSignatureForm({
      name: signature?.name || "",
      html: signature?.html || "",
      is_default: signature?.is_default || false,
    });
    setSignatureModal(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    let parsedSchema = {};
    try {
      parsedSchema = templateForm.variables_schema
        ? JSON.parse(templateForm.variables_schema)
        : {};
    } catch (error) {
      alert("변수 스키마가 올바른 JSON 형식이어야 합니다.");
      return;
    }

    const payload = {
      name: templateForm.name,
      subject: templateForm.subject,
      body_html: templateForm.body_html,
      variables_schema: parsedSchema,
    };

    try {
      if (editingTemplate) {
        await EmailService.updateTemplate(editingTemplate.id, payload);
      } else {
        await EmailService.createTemplate(payload);
      }
      setTemplateModal(false);
      fetchData();
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleSaveSignature = async (e) => {
    e.preventDefault();
    const payload = {
      name: signatureForm.name,
      html: signatureForm.html,
      is_default: signatureForm.is_default,
    };

    try {
      if (editingSignature) {
        await EmailService.updateSignature(editingSignature.id, payload);
      } else {
        await EmailService.createSignature(payload);
      }
      setSignatureModal(false);
      fetchData();
    } catch (error) {
      console.error("Error saving signature:", error);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("템플릿을 삭제하시겠습니까?")) return;
    try {
      await EmailService.deleteTemplate(id);
      fetchData();
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const handleDeleteSignature = async (id) => {
    if (!window.confirm("서명을 삭제하시겠습니까?")) return;
    try {
      await EmailService.deleteSignature(id);
      fetchData();
    } catch (error) {
      console.error("Error deleting signature:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FiMail className="w-6 h-6 text-blue-600" />
        <h1 className="text-title">이메일</h1>
      </div>

      <div className="page-box">
        <div className="flex items-center gap-2 border-b border-gray-200 mb-4">
          {[
            { key: "templates", label: "템플릿" },
            { key: "signatures", label: "서명" },
            { key: "logs", label: "발송로그" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {activeTab === "templates" && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => openTemplateModal()}
                    className="btn-create-sm flex items-center gap-1"
                  >
                    <FiPlus className="w-3 h-3" />
                    템플릿 추가
                  </button>
                </div>
                {templates.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    등록된 템플릿이 없습니다.
                  </p>
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500">{template.subject}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openTemplateModal(template)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "signatures" && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => openSignatureModal()}
                    className="btn-create-sm flex items-center gap-1"
                  >
                    <FiPlus className="w-3 h-3" />
                    서명 추가
                  </button>
                </div>
                {signatures.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    등록된 서명이 없습니다.
                  </p>
                ) : (
                  signatures.map((signature) => (
                    <div
                      key={signature.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{signature.name}</h3>
                        {signature.is_default && (
                          <span className="text-xs text-blue-600">기본</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openSignatureModal(signature)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSignature(signature.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "logs" && (
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    발송 로그가 없습니다.
                  </p>
                ) : (
                  <table className="w-full">
                    <thead className="doc-thead">
                      <tr>
                        <th className="doc-th text-left">수신자</th>
                        <th className="doc-th text-left">제목</th>
                        <th className="doc-th text-center">상태</th>
                        <th className="doc-th-end text-center">발송일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-100">
                          <td className="px-3 py-3 text-sm">{log.to}</td>
                          <td className="px-3 py-3 text-sm">{log.subject}</td>
                          <td className="px-3 py-3 text-sm text-center">
                            {log.status_display || log.status}
                          </td>
                          <td className="px-3 py-3 text-sm text-center">
                            {log.sent_at ? new Date(log.sent_at).toLocaleString("ko-KR") : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={templateModal}
        onClose={() => setTemplateModal(false)}
        title={editingTemplate ? "템플릿 수정" : "템플릿 추가"}
        size="lg"
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              템플릿명
            </label>
            <input
              className="input-base"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              className="input-base"
              value={templateForm.subject}
              onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              본문 (HTML)
            </label>
            <textarea
              className="input-base"
              rows={5}
              value={templateForm.body_html}
              onChange={(e) => setTemplateForm({ ...templateForm, body_html: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              변수 스키마 (JSON)
            </label>
            <textarea
              className="input-base font-mono text-xs"
              rows={4}
              value={templateForm.variables_schema}
              onChange={(e) =>
                setTemplateForm({ ...templateForm, variables_schema: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setTemplateModal(false)} className="btn-cancel">
              취소
            </button>
            <button type="submit" className="btn-save">
              저장
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={signatureModal}
        onClose={() => setSignatureModal(false)}
        title={editingSignature ? "서명 수정" : "서명 추가"}
        size="lg"
      >
        <form onSubmit={handleSaveSignature} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              서명명
            </label>
            <input
              className="input-base"
              value={signatureForm.name}
              onChange={(e) => setSignatureForm({ ...signatureForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              서명 HTML
            </label>
            <textarea
              className="input-base"
              rows={4}
              value={signatureForm.html}
              onChange={(e) => setSignatureForm({ ...signatureForm, html: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={signatureForm.is_default}
              onChange={(e) =>
                setSignatureForm({ ...signatureForm, is_default: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">기본 서명으로 설정</span>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSignatureModal(false)} className="btn-cancel">
              취소
            </button>
            <button type="submit" className="btn-save">
              저장
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default EmailCenter;
