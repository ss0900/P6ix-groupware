// src/pages/sales/ClientList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { Plus, Search, Building2 } from "lucide-react";

export default function ClientList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "operation/clients/";
      if (searchQuery) url += `?search=${searchQuery}`;
      const res = await api.get(url);
      setClients(res.data?.results ?? res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 size={24} />
          거래처 관리
        </h1>
        <button
          onClick={() => navigate("/sales/clients/new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          거래처 등록
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* 검색 */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="회사명, 담당자, 업종 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* 목록 */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
              <p>등록된 거래처가 없습니다.</p>
            </div>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                onClick={() => navigate(`/sales/clients/${client.id}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <Building2 size={24} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{client.name}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {client.industry && <span>{client.industry}</span>}
                    {client.contact_name && <span>담당: {client.contact_name}</span>}
                    {client.phone && <span>{client.phone}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-blue-600 font-medium">
                    영업기회 {client.opportunity_count || 0}건
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(client.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
