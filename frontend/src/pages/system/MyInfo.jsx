import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const inputClassName =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e1e2f] focus:border-[#1e1e2f] outline-none";

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value || "-"}
        readOnly
        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
      />
    </div>
  );
}

export default function MyInfo() {
  const { user, fetchUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [form, setForm] = useState({
    last_name: "",
    first_name: "",
    username: "",
    email: "",
    phone_number: "",
  });

  const [org, setOrg] = useState({
    company: "",
    department: "",
    position: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirm: "",
  });
  const [showPassword, setShowPassword] = useState({
    current_password: false,
    password: false,
    password_confirm: false,
  });

  const [profilePreview, setProfilePreview] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [signPreview, setSignPreview] = useState("");
  const [signFile, setSignFile] = useState(null);
  const [clearSign, setClearSign] = useState(false);
  const [isDrawingSign, setIsDrawingSign] = useState(false);
  const [hasCanvasStroke, setHasCanvasStroke] = useState(false);

  const profileInputRef = useRef(null);
  const signInputRef = useRef(null);
  const signCanvasRef = useRef(null);

  const displayName = useMemo(() => {
    const fullName = `${form.last_name || ""}${form.first_name || ""}`.trim();
    return fullName || form.username || user?.username || "사용자";
  }, [form.first_name, form.last_name, form.username, user?.username]);

  const initialLetter = useMemo(() => {
    return (displayName || "U").charAt(0).toUpperCase();
  }, [displayName]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, membershipRes] = await Promise.all([
        api.get("users/me/"),
        api.get("core/membership/me/"),
      ]);

      const me = meRes.data || {};
      setForm({
        last_name: me.last_name || "",
        first_name: me.first_name || "",
        username: me.username || "",
        email: me.email || "",
        phone_number: me.phone_number || "",
      });
      setProfilePreview(me.profile_picture || "");
      setSignPreview(me.sign_file || "");
      setProfileFile(null);
      setSignFile(null);
      setClearSign(false);

      const memberships =
        membershipRes.data?.results ?? membershipRes.data ?? [];
      const primaryMembership =
        memberships.find((item) => item.is_primary) || memberships[0] || null;

      setOrg({
        company: primaryMembership?.company_name || "",
        department: primaryMembership?.department_name || "",
        position: primaryMembership?.position_name || "",
      });
    } catch (error) {
      console.error("Failed to load my info:", error);
      alert("내 정보 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleProfileFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const handleSignFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSignFile(file);
    setSignPreview(URL.createObjectURL(file));
    setClearSign(false);
  };

  const handleResetSign = () => {
    setSignFile(null);
    setSignPreview("");
    setClearSign(true);
  };

  const clearSignCanvas = useCallback(() => {
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setHasCanvasStroke(false);
  }, []);

  useEffect(() => {
    if (!signPreview) {
      clearSignCanvas();
    }
  }, [signPreview, clearSignCanvas]);

  const getCanvasPoint = (event) => {
    const canvas = signCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handleSignPointerDown = (event) => {
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event);
    if (!ctx || !point) return;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setIsDrawingSign(true);
  };

  const handleSignPointerMove = (event) => {
    if (!isDrawingSign) return;
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = getCanvasPoint(event);
    if (!ctx || !point) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setHasCanvasStroke(true);
  };

  const handleSignPointerUp = () => {
    if (!isDrawingSign) return;
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.closePath();
    setIsDrawingSign(false);
  };

  const handleTempSaveSign = () => {
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    if (!hasCanvasStroke) {
      alert("서명을 먼저 입력해주세요.");
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        alert("서명 저장에 실패했습니다.");
        return;
      }
      const file = new File([blob], `signature-${Date.now()}.png`, {
        type: "image/png",
      });
      setSignFile(file);
      setSignPreview(URL.createObjectURL(file));
      setClearSign(false);
      alert("서명을 임시 저장했습니다.");
    }, "image/png");
  };

  const handleSave = async () => {
    if (!form.last_name.trim() || !form.first_name.trim()) {
      alert("성/이름은 필수입니다.");
      return;
    }
    if (!form.email.trim()) {
      alert("이메일은 필수입니다.");
      return;
    }
    if (!form.phone_number.trim()) {
      alert("전화번호는 필수입니다.");
      return;
    }

    const hasPasswordInput =
      passwordForm.current_password ||
      passwordForm.password ||
      passwordForm.password_confirm;
    if (hasPasswordInput) {
      if (
        !passwordForm.current_password ||
        !passwordForm.password ||
        !passwordForm.password_confirm
      ) {
        alert("비밀번호 변경 항목을 모두 입력해주세요.");
        return;
      }
      if (passwordForm.password !== passwordForm.password_confirm) {
        alert("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
        return;
      }
    }

    setSaving(true);
    try {
      const data = new FormData();
      data.append("last_name", form.last_name);
      data.append("first_name", form.first_name);
      data.append("email", form.email);
      data.append("phone_number", form.phone_number);

      if (hasPasswordInput) {
        data.append("current_password", passwordForm.current_password);
        data.append("password", passwordForm.password);
      }

      if (profileFile) {
        data.append("profile_picture_file", profileFile);
      }

      if (signFile) {
        data.append("sign_file", signFile);
      }
      if (clearSign) {
        data.append("clear_sign", "true");
      }

      await api.put("core/profile/", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPasswordForm({
        current_password: "",
        password: "",
        password_confirm: "",
      });
      setShowPasswordForm(false);

      await fetchUser?.();
      await loadProfile();
      alert("저장되었습니다.");
    } catch (error) {
      console.error("Failed to save my info:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordVisibility = (key) => {
    setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1e1e2f] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
              {profilePreview ? (
                <img
                  src={profilePreview}
                  alt="프로필"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-[#1e1e2f]">
                  {initialLetter}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => profileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm text-white bg-[#1e1e2f] rounded-md hover:bg-[#13131f]"
            >
              변경
            </button>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfileFileChange}
              className="hidden"
            />
          </div>

          <div className="pt-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {displayName}
            </h1>
            <p className="text-gray-600">{form.email || "-"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">계정</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              성(Last Name) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, last_name: e.target.value }))
              }
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              이름(First Name) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, first_name: e.target.value }))
              }
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              아이디(변경 불가)
            </label>
            <input
              type="text"
              value={form.username}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.phone_number}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone_number: e.target.value }))
              }
              className={inputClassName}
            />
          </div>
        </div>

        <div className="px-5 py-4 border-y border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">조직</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <ReadOnlyField label="회사" value={org.company} />
          <ReadOnlyField label="부서" value={org.department} />
          <ReadOnlyField label="직위" value={org.position} />
        </div>

        <div className="px-5 py-4 border-y border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">비밀번호 변경</h2>
          <button
            type="button"
            onClick={() => setShowPasswordForm((prev) => !prev)}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            변경
          </button>
        </div>

        {showPasswordForm && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-100">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                현재 비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword.current_password ? "text" : "password"}
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      current_password: e.target.value,
                    }))
                  }
                  className={`${inputClassName} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("current_password")}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-[#1e1e2f]"
                  aria-label={
                    showPassword.current_password
                      ? "현재 비밀번호 숨기기"
                      : "현재 비밀번호 표시"
                  }
                >
                  {showPassword.current_password ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                새 비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword.password ? "text" : "password"}
                  value={passwordForm.password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className={`${inputClassName} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("password")}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-[#1e1e2f]"
                  aria-label={
                    showPassword.password
                      ? "새 비밀번호 숨기기"
                      : "새 비밀번호 표시"
                  }
                >
                  {showPassword.password ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                새 비밀번호 확인
              </label>
              <div className="relative">
                <input
                  type={showPassword.password_confirm ? "text" : "password"}
                  value={passwordForm.password_confirm}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      password_confirm: e.target.value,
                    }))
                  }
                  className={`${inputClassName} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("password_confirm")}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-[#1e1e2f]"
                  aria-label={
                    showPassword.password_confirm
                      ? "새 비밀번호 확인 숨기기"
                      : "새 비밀번호 확인 표시"
                  }
                >
                  {showPassword.password_confirm ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">서명</h2>
        </div>
        <div className="p-5">
          {signPreview ? (
            <>
              <div className="w-[180px] h-[120px] border border-gray-200 rounded bg-white overflow-hidden mb-3 flex items-center justify-center">
                <img
                  src={signPreview}
                  alt="서명"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetSign}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  서명 다시하기
                </button>
                <button
                  type="button"
                  onClick={() => signInputRef.current?.click()}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  이미지 변경
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="relative w-full max-w-[420px] h-[300px] border border-gray-300 rounded bg-white overflow-hidden mb-3">
                <button
                  type="button"
                  onClick={clearSignCanvas}
                  className="absolute top-3 right-3 px-3 py-1 text-sm border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 z-10"
                >
                  Clear
                </button>
                <canvas
                  ref={signCanvasRef}
                  width={840}
                  height={600}
                  onPointerDown={handleSignPointerDown}
                  onPointerMove={handleSignPointerMove}
                  onPointerUp={handleSignPointerUp}
                  onPointerLeave={handleSignPointerUp}
                  className="w-full h-full touch-none cursor-crosshair"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTempSaveSign}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  임시 저장
                </button>
                <button
                  type="button"
                  onClick={() => signInputRef.current?.click()}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  이미지 업로드
                </button>
              </div>
            </>
          )}
          <input
            ref={signInputRef}
            type="file"
            accept="image/*"
            onChange={handleSignFileChange}
            className="hidden"
          />
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-2.5 text-white bg-[#1e1e2f] rounded-lg hover:bg-[#13131f] disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
