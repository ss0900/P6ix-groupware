// src/pages/admin/UserForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";

export default function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 폼 데이터
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    is_active: true,
    is_staff: false,
    // 소속 정보
    company: "",
    department: "",
    position: "",
  });

  // 옵션 데이터
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  // 초기 데이터 로드
  useEffect(() => {
    (async () => {
      try {
        const [c, d, p] = await Promise.all([
          api.get("core/companies/"),
          api.get("core/departments/"),
          api.get("core/positions/"),
        ]);
        setCompanies(c.data?.results ?? c.data ?? []);
        setDepartments(d.data?.results ?? d.data ?? []);
        setPositions(p.data?.results ?? p.data ?? []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // 편집 모드: 사용자 정보 로드
  useEffect(() => {
    if (!isEdit) return;

    setLoading(true);
    (async () => {
      try {
        const res = await api.get(`core/users/${id}/`);
        const user = res.data;
        setFormData({
          username: user.username || "",
          email: user.email || "",
          password: "",
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          phone_number: user.phone_number || "",
          is_active: user.is_active ?? true,
          is_staff: user.is_staff ?? false,
          company: user.company_id || user.company || "",
          department: user.department_id || user.department || "",
          position: user.position_id || user.position || "",
        });
      } catch (err) {
        console.error(err);
        alert("사용자 정보를 불러올 수 없습니다.");
        navigate("/admin/users");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigate]);

  // 필터링된 부서/직위 (선택된 회사 기준)
  const filteredDepartments = departments.filter(
    (d) => !formData.company || String(d.company) === String(formData.company),
  );
  const filteredPositions = positions.filter(
    (p) =>
      !formData.company ||
      String(p.company_id || p.company) === String(formData.company),
  );

  const handlePhoneNumberChange = (e) => {
    const value = e.target.value;

    if (!isEdit && /[^0-9]/.test(value)) {
      alert("숫자만 입력해주세요.");
      return;
    }

    setFormData({ ...formData, phone_number: value });
  };

  // 저장
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        is_active: formData.is_active,
        is_staff: formData.is_staff,
      };

      // 비밀번호는 입력된 경우에만 포함
      if (formData.password) {
        payload.password = formData.password;
      }

      // 소속 정보
      if (formData.company) payload.company = formData.company;
      if (formData.department) payload.department = formData.department;
      if (formData.position) payload.position = formData.position;

      if (isEdit) {
        await api.patch(`core/users/${id}/`, payload);
        navigate(`/admin/users/${id}`);
      } else {
        await api.post("core/users/", payload);
        navigate("/admin/users");
      }
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "저장 중 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/users")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? "사용자 수정" : "사용자 등록"}
        </h1>
      </div>

      {/* 폼 */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
      >
        {/* 기본 정보 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            기본 정보
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                성 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* 계정 정보 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            계정 정보
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                아이디 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                disabled={isEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 {!isEdit && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={isEdit ? "변경 시에만 입력" : ""}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required={!isEdit}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={handlePhoneNumberChange}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="010-0000-0000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* 소속 정보 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            소속 정보
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                회사
              </label>
              <select
                value={formData.company}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    company: e.target.value,
                    department: "",
                    position: "",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">선택</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  부서
                </label>
                <select
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">선택</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  직위
                </label>
                <select
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">선택</option>
                  {filteredPositions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 권한 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">권한</h2>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">활성화</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_staff}
                onChange={(e) =>
                  setFormData({ ...formData, is_staff: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">관리자 권한</span>
            </label>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() =>
              navigate(isEdit ? `/admin/users/${id}` : "/admin/users")
            }
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            <Save size={18} />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
