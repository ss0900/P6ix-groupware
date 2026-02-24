import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit } from "lucide-react";
import api from "../../api/axios";

const FieldRow = ({ label, value }) => (
  <div>
    <p className="mb-1 text-sm font-medium text-gray-600">{label}</p>
    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
      {value ?? ""}
    </div>
  </div>
);

const formatPhoneNumber = (phoneNumber) => {
  const digits = String(phoneNumber ?? "")
    .replace(/\D/g, "")
    .slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export default function UserDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      try {
        const response = await api.get(`core/users/${id}/`);
        setUser(response.data);
      } catch (error) {
        console.error(error);
        alert("사용자 정보를 불러오지 못했습니다.");
        navigate("/admin/users");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const fullName = `${user.last_name ?? ""}${user.first_name ?? ""}`.trim();
  const formattedPhoneNumber = formatPhoneNumber(user.phone_number);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/admin/users")}
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">사용자 조회</h1>
      </div>

      <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">기본 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="성" value={user.last_name} />
            <FieldRow label="이름" value={user.first_name} />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">계정 정보</h2>
          <div className="space-y-4">
            <FieldRow label="이름" value={fullName} />
            <FieldRow label="아이디" value={user.username} />
            <FieldRow label="이메일" value={user.email} />
            <FieldRow label="연락처" value={formattedPhoneNumber} />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">소속 정보</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FieldRow label="회사" value={user.company?.name ?? user.company} />
            <FieldRow label="부서" value={user.department?.name ?? user.department} />
            <FieldRow label="직위" value={user.position?.name ?? user.position} />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">권한</h2>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                user.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {user.is_active ? "활성화" : "비활성화"}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                user.is_staff
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {user.is_staff ? "관리자 권한" : "일반 사용자"}
            </span>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium hover:bg-gray-50"
          >
            목록
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/users/${id}/edit`)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700"
          >
            <Edit size={18} />
            수정
          </button>
        </div>
      </div>
    </div>
  );
}
