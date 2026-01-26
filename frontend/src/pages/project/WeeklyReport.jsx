// src/pages/project/WeeklyReport.jsx
// 주간 업무 집계 조회 (프로젝트 중심: 전주 vs 금주 비교)
import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  Briefcase,
  Layers,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import ProjectService from "../../api/project";

// 날짜 유틸
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const formatDate = (date) => {
  return date.toISOString().split("T")[0];
};

export default function WeeklyReport() {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selectedProject, setSelectedProject] = useState("");
  const [projects, setProjects] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // 프로젝트 목록 로드
  const loadProjects = useCallback(async () => {
    try {
      const data = await ProjectService.getProjects({ ordering: "name" });
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  }, []);

  // 주간 보고서 로드
  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        week_start: formatDate(weekStart),
      };
      if (selectedProject) {
        params.project_id = selectedProject;
      }
      const data = await ProjectService.getWeeklyReport(params);
      setReportData(data);
    } catch (err) {
      console.error("Failed to load report", err);
    } finally {
      setLoading(false);
    }
  }, [weekStart, selectedProject]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleThisWeek = () => {
    setWeekStart(getMonday(new Date()));
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="text-blue-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">주간 업무 집계</h1>
            <p className="text-sm text-gray-500">프로젝트별 주간 진행 상황 비교</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>신규 시작</span>
             <span className="flex items-center gap-1 ml-2"><span className="w-2 h-2 rounded-full bg-green-500"></span>완료됨</span>
          </div>

          <div className="h-6 w-px bg-gray-300 mx-2"></div>

          {/* 프로젝트 필터 */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="border rounded px-3 py-2 text-sm min-w-[200px]"
            >
              <option value="">전체 프로젝트</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={loadReport}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 border"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 주간 네비게이션 */}
      <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-100 rounded text-gray-600"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleThisWeek}
              className="px-4 py-1.5 text-sm font-medium border rounded hover:bg-gray-50 text-gray-700"
            >
              이번 주
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded text-gray-600"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {reportData && (
            <div className="flex items-center gap-8">
               <div className="text-right">
                  <div className="text-xs text-gray-500 mb-0.5">지난주 ({reportData.period.prev.label})</div>
                  <div className="font-medium text-gray-700">
                    {reportData.period.prev.start.slice(5).replace("-", "/")} ~ {reportData.period.prev.end.slice(5).replace("-", "/")}
                  </div>
               </div>
               <div className="text-gray-300 text-2xl font-light">→</div>
               <div className="text-left">
                  <div className="text-xs text-blue-500 font-medium mb-0.5">이번주 ({reportData.period.current.label})</div>
                  <div className="font-bold text-blue-700 text-lg">
                    {reportData.period.current.start.slice(5).replace("-", "/")} ~ {reportData.period.current.end.slice(5).replace("-", "/")}
                  </div>
               </div>
            </div>
          )}
      </div>

      {/* 로딩 및 데이터 없음 처리 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : !reportData || reportData.projects.length === 0 ? (
        <div className="bg-white border rounded-lg p-16 text-center text-gray-500 shadow-sm">
          <Briefcase size={64} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">해당 주간에 등록된 업무가 없습니다.</p>
          <p className="text-sm mt-2">필터를 변경하거나 날짜를 이동해보세요.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {reportData.projects.map((project) => (
            <div key={project.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
              {/* 프로젝트 헤더 */}
              <div className="bg-slate-50 px-6 py-4 border-b flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                <h3 className="font-bold text-xl text-slate-800">{project.name}</h3>
                <span className="text-sm text-slate-500 bg-white border px-2 py-0.5 rounded-full">
                  {project.tasks.length}개 업무
                </span>
              </div>

              {/* 테이블 헤더 */}
              <div className="grid grid-cols-12 bg-white text-sm font-semibold text-slate-500 border-b divide-x">
                 <div className="col-span-2 px-4 py-3 bg-slate-50/50">업무 구분 (Task)</div>
                 <div className="col-span-3 px-4 py-3 bg-slate-50/30 text-center">
                    전주 ({reportData.period.prev.label})
                 </div>
                 <div className="col-span-2 px-4 py-3 bg-slate-50/30 text-center text-slate-500 font-normal">
                    전주 참여자
                 </div>
                 <div className="col-span-3 px-4 py-3 bg-blue-50/30 text-center text-blue-700">
                    금주 ({reportData.period.current.label})
                 </div>
                 <div className="col-span-2 px-4 py-3 bg-blue-50/30 text-center text-blue-600 font-normal">
                    금주 참여자
                 </div>
              </div>

              {/* Task 목록 */}
              <div className="divide-y relative">
                {/* 세로 구분선 (배경용) */}
                <div className="absolute inset-0 grid grid-cols-12 pointer-events-none divide-x z-0">
                   <div className="col-span-2"></div>
                   <div className="col-span-3"></div>
                   <div className="col-span-2"></div>
                   <div className="col-span-3 bg-blue-50/5"></div>
                   <div className="col-span-2 bg-blue-50/5"></div>
                </div>

                {project.tasks.map((task) => (
                  <div key={task.id} className="grid grid-cols-12 text-sm relative z-10 group hover:bg-gray-50 transition-colors bg-white">
                    {/* 소제목 */}
                    <div className="col-span-2 px-4 py-4">
                      <div className="font-semibold text-slate-700 flex items-start gap-2">
                         <Layers size={16} className="mt-0.5 text-slate-400 shrink-0" />
                         {task.title}
                      </div>
                      
                      {/* 상태 뱃지 */}
                      <div className="mt-2 flex flex-wrap gap-1 ml-6">
                        {task.is_new && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1 text-[11px]">
                             <AlertCircle size={10} /> New
                          </span>
                        )}
                        {task.is_completed && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1 text-[11px]">
                             <CheckCircle2 size={10} /> 완료
                          </span>
                        )}
                        {task.status === 'in_progress' && !task.is_new && (
                           <span className="text-[11px] text-slate-400">진행중</span>
                        )}
                        {task.status === 'on_hold' && (
                           <span className="text-[11px] text-orange-400">보류</span>
                        )}
                      </div>
                    </div>

                    {/* 전주 내용 */}
                    <div className="col-span-3 px-4 py-4">
                       {task.prev_items.length > 0 ? (
                         <ul className="space-y-2">
                           {task.prev_items.map((item) => (
                             <li key={item.id} className="flex gap-2 text-slate-600">
                                <span className="text-[11px] text-slate-400 shrink-0 mt-0.5 min-w-[32px]">
                                   {item.date.slice(5).replace("-", "/")}
                                </span>
                                <span className="break-all">{item.content}</span>
                             </li>
                           ))}
                         </ul>
                       ) : (
                         <div className="text-slate-300 text-xs italic">- 내역 없음 -</div>
                       )}
                    </div>

                    {/* 전주 참여자 */}
                    <div className="col-span-2 px-4 py-4 text-center">
                       <div className="flex flex-wrap gap-1.5 justify-center">
                         {task.prev_participants && task.prev_participants.map((p) => (
                           <div key={p.id} className="flex items-center gap-1 bg-white border px-2 py-1 rounded shadow-sm text-xs text-slate-600">
                              <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                                 {p.name.charAt(0)}
                              </div>
                              {p.name}
                           </div>
                         ))}
                       </div>
                    </div>

                    {/* 금주 내용 */}
                    <div className="col-span-3 px-4 py-4 bg-blue-50/10">
                       {task.current_items.length > 0 ? (
                         <ul className="space-y-2">
                           {task.current_items.map((item) => (
                             <li key={item.id} className="flex gap-2 text-slate-700">
                                <span className="text-[11px] text-blue-400 shrink-0 mt-0.5 min-w-[32px] font-medium">
                                   {item.date.slice(5).replace("-", "/")}
                                </span>
                                <span className="break-all">{item.content}</span>
                             </li>
                           ))}
                         </ul>
                       ) : (
                         <div className="text-slate-300 text-xs italic">- 내역 없음 -</div>
                       )}
                    </div>

                    {/* 금주 참여자 */}
                    <div className="col-span-2 px-4 py-4 text-center bg-blue-50/10">
                       <div className="flex flex-wrap gap-1.5 justify-center">
                         {task.current_participants && task.current_participants.map((p) => (
                           <div key={p.id} className="flex items-center gap-1 bg-white border px-2 py-1 rounded shadow-sm text-xs text-slate-600">
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                 {p.name.charAt(0)}
                              </div>
                              {p.name}
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
