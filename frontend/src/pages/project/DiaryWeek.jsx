// src/pages/project/DiaryWeek.jsx
// 업무일지 주간 - 테이블 스타일 (프로젝트/Task 중심, 인라인 편집)
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  BookOpen,
  Briefcase,
  Layers,
  Save,
  X,
  HelpCircle,
  Copy // 아이콘 추가
} from "lucide-react";
// import ReactMarkdown from "react-markdown"; 
// import remarkGfm from "remark-gfm";
import ProjectService from "../../api/project";

// 마크다운 컴포넌트 정의 (재사용)
const MARKDOWN_COMPONENTS = {
    ul: (props) => <ul className="list-disc pl-4 space-y-0.5 my-1" {...props} />,
    ol: (props) => <ol className="list-decimal pl-4 space-y-0.5 my-1" {...props} />,
    h1: (props) => <h1 className="font-bold text-base my-1" {...props} />,
    h2: (props) => <h2 className="font-bold text-sm my-1" {...props} />,
    h3: (props) => <h3 className="font-semibold text-sm my-0.5" {...props} />,
    blockquote: (props) => <blockquote className="border-l-2 border-gray-300 pl-2 my-1 text-gray-500 italic" {...props} />,
    a: (props) => <a className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    code: ({node, inline, className, children, ...props}) => (
        <code className="bg-gray-100 px-1 py-0.5 rounded text-xs text-red-500 font-mono" {...props}>{children}</code>
    ),
    p: (props) => <div className="mb-0.5 last:mb-0 whitespace-pre-line" {...props} />
};

// 날짜 유틸
const getMonday = (date) => startOfWeek(date, { weekStartsOn: 1 });

const formatDate = (date) => format(date, "yyyy-MM-dd");

export default function DiaryWeek() {
  const [currentDate, setCurrentDate] = useState(getMonday(new Date()));
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null); // 저장 중인 항목 ID (또는 'new')
  const [showHelp, setShowHelp] = useState(false); // 도움말 모달 상태
  
  // 데이터 상태
  const [reportData, setReportData] = useState([]); // [{ project, tasks: [{ task, prevItems, currItems }] }]
  const [projectsMap, setProjectsMap] = useState({}); // 프로젝트 정보 캐시
  const [tasksMap, setTasksMap] = useState({}); // 태스크 정보 캐시

  // 날짜 범위 계산
  const { prevStart, prevEnd, currStart, currEnd } = useMemo(() => {
    const pStart = subWeeks(currentDate, 1);
    const pEnd = endOfWeek(pStart, { weekStartsOn: 1 });
    const cStart = currentDate;
    const cEnd = endOfWeek(cStart, { weekStartsOn: 1 });
    return {
      prevStart: pStart,
      prevEnd: pEnd,
      currStart: cStart,
      currEnd: cEnd
    };
  }, [currentDate]);

  // 금주 날짜 옵션 (월~일)
  const weekDayOptions = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
        days.push(addDays(currStart, i));
    }
    return days;
  }, [currStart]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. 2주치 일지 조회
      const diaries = await ProjectService.getDiaries({
        start_date: formatDate(prevStart),
        end_date: formatDate(currEnd),
      });
      const diaryList = Array.isArray(diaries) ? diaries : diaries.results || [];

      // 2. 내 담당 Task 조회 (진행중, 미완료 등)
      const myTasks = await ProjectService.getTasks({
        assignee: 'me',
        status: 'in_progress'
      });
      const taskList = Array.isArray(myTasks) ? myTasks : myTasks.results || [];

      // 3. 프로젝트 목록 (이름 매핑용) - 전체를 다 가져오기엔 무거울 수 있으나 일단 호출
      // (최적화: diaries나 taskList에 있는 project ID만 모아서 조회하면 좋겠지만 API가 지원해야 함)
      // 여기서는 diaryList와 taskList에 있는 프로젝트 정보(expand된)를 최대한 활용.
      // 만약 expand가 안 되어 있다면 getProjects를 해야 함.
      // 보통 getDiaries나 getTasks 응답에 project_name 등이 포함되어 있을 수 있음.
      // 안전하게 프로젝트 전체 로드 (캐싱 되면 좋음)
      const allProjects = await ProjectService.getProjects({ my_projects: true });
      const projectList = Array.isArray(allProjects) ? allProjects : allProjects.results || [];
      
      const pMap = {};
      projectList.forEach(p => pMap[p.id] = p);
      setProjectsMap(pMap);

      const tMap = {};
      taskList.forEach(t => tMap[t.id] = t);
      // diaryList의 task 정보도 맵에 추가 (내가 담당자는 아니지만 일지를 쓴 경우)
      // 하지만 diaryList에는 task detail이 없을 수 있음 (ID만 있을 수 있음).
      // API 응답 구조에 따라 다름. 일단 패스.
      
      // ----------------------------------------------------------------
      // 데이터 그루핑
      // ----------------------------------------------------------------
      // 구조: ProjectID -> { info, tasks: { TaskID -> { info, prev:[], curr:[] } } }
      const groupBuffer = {};

      // 유틸: 프로젝트/태스크 노드 확보
      const ensureNode = (pId, tId, pName = "", tTitle = "일반 업무") => {
          if (!groupBuffer[pId]) {
              groupBuffer[pId] = {
                  id: pId,
                  name: pMap[pId]?.name || pName || "기타 프로젝트",
                  tasks: {}
              };
          }
          if (!groupBuffer[pId].tasks[tId]) {
              groupBuffer[pId].tasks[tId] = {
                  id: tId,
                  title: tMap[tId]?.title || tTitle,
                  status: tMap[tId]?.status,
                  prevItems: [],
                  currItems: []
              };
          }
          return groupBuffer[pId].tasks[tId];
      };

      // 0. 내 프로젝트 뼈대 미리 잡기 (참여 중인 모든 프로젝트 표시)
      projectList.forEach(p => {
          ensureNode(p.id, 0, p.name);
      });

      // 1. 내 Task들을 먼저 뼈대로 잡기
      taskList.forEach(t => {
          if (!t.project) return; // 프로젝트 없는 태스크는 기타로?
          ensureNode(t.project, t.id);
      });

      // 2. 일지 데이터 배치
      diaryList.forEach(entry => {
          const pId = entry.project || 0; // 0 for Unassigned
          const tId = entry.task || 0; // 0 for General
          
          // 이름 정보가 엔트리에 있으면 활용
          const pName = entry.project_name || "";
          const tTitle = entry.task_title || (tId === 0 ? "일반 업무" : "알 수 없는 업무");
          
          const node = ensureNode(pId, tId, pName, tTitle);
          
          const entryDate = new Date(entry.date);
          // 전주 vs 금주
          if (entryDate >= prevStart && entryDate <= prevEnd) {
              node.prevItems.push(entry);
          } else if (entryDate >= currStart && entryDate <= currEnd) {
              node.currItems.push(entry);
          }
      });

      // 3. 배열로 변환 및 정렬
      const sortedProjects = Object.values(groupBuffer).sort((a, b) => a.name.localeCompare(b.name));
      
      const finalData = sortedProjects.map(p => ({
          ...p,
          tasks: Object.values(p.tasks).sort((a, b) => {
              if (a.id === 0) return 1; // 일반 업무는 맨 뒤로
              if (b.id === 0) return -1;
              return a.title.localeCompare(b.title);
          })
      }));

      setReportData(finalData);

    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  }, [prevStart, prevEnd, currStart, currEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // ----------------------------------------------------------
  // 액션 핸들러
  // ----------------------------------------------------------
  
  // 항목 추가 (인라인)
  const handleAddDiary = async (projectId, taskId, date, content) => {
      if (!content.trim()) return;
      setSavingId(`new-${projectId}-${taskId}`);
      try {
          await ProjectService.createDiary({
              date: formatDate(date),
              project: projectId === 0 ? null : projectId,
              task: taskId === 0 ? null : taskId,
              content: content
          });
          await loadData(); // 리로드 (가장 확실)
      } catch (e) {
          console.error(e);
          alert("추가 실패");
      } finally {
          setSavingId(null);
      }
  };

  // 항목 수정 (인라인)
  const handleUpdateDiary = async (entryId, content, date) => {
      setSavingId(entryId);
      try {
          // 날짜 변경도 지원? 일단 내용만
          await ProjectService.updateDiary(entryId, { content, date: formatDate(date) });
          await loadData();
      } catch (e) {
          console.error(e);
          alert("수정 실패");
      } finally {
          setSavingId(null);
      }
  };

  // 항목 삭제
  const handleDeleteDiary = async (entryId) => {
      if (!window.confirm("삭제하시겠습니까?")) return;
      setSavingId(entryId);
      try {
          await ProjectService.deleteDiary(entryId);
          await loadData();
      } catch (e) {
          console.error(e);
          alert("삭제 실패");
      } finally {
          setSavingId(null);
      }
  };

  // 지난주 실적 불러오기
  const handleImportLastWeek = async (project) => {
      // 1. 가져올 데이터 확인
      let entriesToCopy = [];
      Object.values(project.tasks).forEach(task => {
          if (task.prevItems && task.prevItems.length > 0) {
              // [수정] 정렬: 날짜 오름차순 -> ID 오름차순 (생성 순서 보장)
              const sortedPrevItems = [...task.prevItems].sort((a, b) => {
                  const dateDiff = new Date(a.date) - new Date(b.date);
                  if (dateDiff !== 0) return dateDiff;
                  return a.id - b.id; 
              });

              sortedPrevItems.forEach(item => {
                  entriesToCopy.push({
                      project: project.id,
                      task: task.id === 0 ? null : task.id, // 0이면 null
                      content: item.content,
                      date: formatDate(currStart) // 이번 주 시작일(월요일)로 복사
                  });
              });
          }
      });

      if (entriesToCopy.length === 0) {
          alert("불러올 지난주 실적이 없습니다.");
          return;
      }

      if (!window.confirm(`지난주 실적 ${entriesToCopy.length}건을 불러오시겠습니까?\n(현재 목록 뒤에 추가됩니다)`)) return;

      setLoading(true);
      try {
          // 병렬 처리로 일괄 생성 (순서 보장을 위해 for loop 변경 고려 가능하나, Promise.all로도 대부분 순서 유지됨. 
          // 만약 확실한 순서 보장이 필요하면 for...of 사용)
          // 여기서는 정렬된 배열 순서대로 요청을 보내므로, 서버 처리 순서도 대체로 따름.
          for (const entry of entriesToCopy) {
              await ProjectService.createDiary(entry);
          }
          // await Promise.all(entriesToCopy.map(entry => ProjectService.createDiary(entry)));
          await loadData();
      } catch (e) {
          console.error(e);
          alert("불러오기 중 오류가 발생했습니다.");
      } finally {
          setLoading(false);
      }
  };

  const goToPrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToThisWeek = () => setCurrentDate(getMonday(new Date()));

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="text-blue-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">업무일지 쓰기 [주간]</h1>
            <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">이번 주 업무 내용을 프로젝트/태스크별로 정리하여 작성합니다.</p>
                <button 
                    onClick={() => setShowHelp(true)}
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                    title="작성 가이드 보기"
                >
                    <HelpCircle size={18} />
                </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <button
              onClick={goToPrevWeek}
              className="p-2 hover:bg-gray-100 rounded text-gray-600 border"
            >
              <ChevronLeft size={20} />
            </button>
            <button
                onClick={goToThisWeek}
                className="px-4 py-2 text-sm font-medium border rounded hover:bg-gray-50 text-gray-700 bg-white"
            >
                이번 주
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-100 rounded text-gray-600 border"
            >
              <ChevronRight size={20} />
            </button>
            
            <div className="ml-4 h-8 w-px bg-gray-300"></div>

            <button
              onClick={loadData}
              className="p-2 hover:bg-gray-100 rounded text-gray-600"
              title="새로고침"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      {/* 기간 표시 */}
      <div className="flex items-center justify-center gap-8 mb-6 bg-slate-50 border rounded-lg p-4">
           <div className="text-right opacity-60">
              <div className="text-xs text-gray-500 mb-0.5">지난주</div>
              <div className="font-medium text-gray-700">
                {format(prevStart, "MM/dd")} ~ {format(prevEnd, "MM/dd")}
              </div>
           </div>
           <div className="text-gray-300 text-xl font-light">→</div>
           <div className="text-left">
              <div className="text-xs text-blue-500 font-medium mb-0.5">이번주 (작성 주간)</div>
              <div className="font-bold text-blue-700 text-lg">
                {format(currStart, "MM/dd")} ~ {format(currEnd, "MM/dd")}
              </div>
           </div>
      </div>

      {/* 메인 테이블 */}
      {loading && !reportData.length ? (
        <div className="flex justify-center py-20">
             <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8 pb-20">
            {/* 데이터가 없을 때 안내 */}
            {!loading && reportData.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed rounded-xl text-gray-400">
                    <Briefcase size={48} className="mx-auto mb-4 opacity-50" />
                    <p>진행 중인 프로젝트나 태스크가 없습니다.</p>
                    <p className="text-sm">프로젝트 메뉴에서 태스크를 할당받거나 생성해주세요.</p>
                </div>
            )}

            {reportData.map(project => (
                <div key={project.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                    {/* 프로젝트 헤더 */}
                    <div className="bg-slate-50 px-6 py-3 border-b flex items-center gap-3">
                        <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                        <h3 className="font-bold text-lg text-slate-800">{project.name}</h3>
                    </div>

                    {/* 테이블 헤더 */}
                    <div className="grid grid-cols-12 text-sm font-semibold text-slate-500 border-b divide-x bg-white">
                        <div className="col-span-3 px-6 py-3 bg-slate-50/50">업무 구분 (Task)</div>
                        <div className="col-span-4 px-6 py-3 bg-slate-50/30 text-center">지난주 실적 (참고)</div>
                        <div className="col-span-5 px-6 py-3 bg-blue-50/30 text-center text-blue-700 flex items-center justify-between group">
                            <span className="flex-1 text-center font-bold">이번 주 실적 (작성)</span>
                            <button 
                                onClick={() => handleImportLastWeek(project)}
                                className="text-xs font-normal text-blue-500 hover:text-blue-700 hover:bg-blue-100 px-2 py-1 rounded flex items-center gap-1 opacity-100 transition-opacity"
                                title="지난주 내용 불러오기"
                            >
                                <Copy size={12} /> 가져오기
                            </button>
                        </div>
                    </div>

                    {/* Task Rows */}
                    <div className="divide-y">
                        {project.tasks.map(task => (
                            <TaskRow 
                                key={task.id} 
                                project={project}
                                task={task} 
                                weekDayOptions={weekDayOptions}
                                onAdd={handleAddDiary}
                                onUpdate={handleUpdateDiary}
                                onDelete={handleDeleteDiary}
                                savingId={savingId}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* 도움말 모달 */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

// 태스크 행 컴포넌트
function TaskRow({ project, task, weekDayOptions, onAdd, onUpdate, onDelete, savingId }) {
    // 항목 추가 입력 상태
    const [isAdding, setIsAdding] = useState(false);
    const [newContent, setNewContent] = useState("");
    const [newDate, setNewDate] = useState(weekDayOptions[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]); // 기본 오늘(또는 범위 내)
    const textareaRef = useRef(null);
    const handleShortcuts = useMarkdownShortcuts(newContent, setNewContent, textareaRef);

    // 내용 변경 시 높이 자동 조절
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    }, [newContent, isAdding]);

    // 입력 초기화
    const startAdding = () => {
        setIsAdding(true);
        setNewContent("");
        // 날짜는 오늘이 범위 내에 있으면 오늘, 아니면 금요일? -> 그냥 오늘 날짜가 범위 내인지 확인 후, 아니면 월요일로
        const today = new Date();
        const isInRange = weekDayOptions.some(d => format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
        setNewDate(isInRange ? today : weekDayOptions[0]);
    };

    const submitAdd = () => {
        if(!newContent.trim()) {
            setIsAdding(false);
            return;
        }
        onAdd(project.id, task.id, newDate, newContent);
        setIsAdding(false);
    };

    return (
        <div className="grid grid-cols-12 text-sm group min-h-[100px] divide-x">
            {/* 1. 업무 정보 */}
            <div className="col-span-3 px-6 py-4 bg-white">
                 <div className="font-semibold text-slate-700 flex items-start gap-2">
                     <Layers size={16} className="mt-0.5 text-slate-400 shrink-0" />
                     {task.title}
                 </div>
                 {task.status && (
                     <span className={`inline-block mt-2 px-2 py-0.5 textxs rounded bg-gray-100 text-gray-500`}>
                        {task.status}
                     </span>
                 )}
            </div>

            {/* 2. 전주 실적 (Read Only) - Markdown 렌더링 적용 */}
            <div className="col-span-4 px-6 py-4 bg-slate-50/10">
                {task.prevItems.length > 0 ? (
                    <ul className="space-y-4">
                        {task.prevItems.map(item => (
                            <li key={item.id} className="text-slate-600 flex gap-2">
                                <span className="text-[11px] text-slate-400 shrink-0 mt-1 min-w-[32px]">
                                    {format(new Date(item.date), "MM/dd")}
                                </span>
                                {/* 마크다운 렌더링 영역 */}
                                <div className="markdown-body text-sm leading-relaxed w-full">
                                    <CustomMarkdownRenderer>{item.content}</CustomMarkdownRenderer>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-slate-300 text-xs italic">- 없음 -</div>
                )}
            </div>

            {/* 3. 금주 실적 (Editable) */}
            <div className="col-span-5 px-6 py-4 bg-blue-50/5 relative">
                <ul className="space-y-3 mb-4">
                    {task.currItems.map(item => (
                        <EditableItem 
                            key={item.id} 
                            item={item} 
                            weekDayOptions={weekDayOptions}
                            onUpdate={onUpdate} 
                            onDelete={onDelete}
                            isSaving={savingId === item.id}
                        />
                    ))}
                </ul>

                {/* 추가 폼 */}
                {isAdding ? (
                    <div className="bg-white border border-blue-200 rounded p-3 shadow-sm animate-in fade-in slide-in-from-top-1">
                        <div className="flex gap-2 mb-2">
                             <select 
                                className="text-xs border rounded px-2 py-1 bg-slate-50 outline-none"
                                value={format(newDate, "yyyy-MM-dd")}
                                onChange={e => setNewDate(new Date(e.target.value))}
                             >
                                {weekDayOptions.map(d => (
                                    <option key={d.toString()} value={format(d, "yyyy-MM-dd")}>
                                        {format(d, "MM/dd (E)", { locale: undefined })}
                                    </option>
                                ))}
                             </select>
                        </div>
                        <textarea
                            ref={textareaRef}
                            autoFocus
                            className="w-full text-sm border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden"
                            rows={1}
                            placeholder="내용을 입력하세요..."
                            value={newContent}
                            onChange={e => setNewContent(e.target.value)}
                            onKeyDown={e => {
                                handleShortcuts(e);
                                if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    submitAdd();
                                }
                            }}
                        />
                        {/* Live Preview */}
                        {newContent && (
                            <div className="mt-2 p-2 bg-slate-50 border rounded text-sm text-slate-600 markdown-body">
                                <div className="mb-1 font-semibold text-[10px] text-slate-400 uppercase flex items-center gap-1">
                                    Preview
                                </div>
                                <CustomMarkdownRenderer>
                                    {newContent}
                                </CustomMarkdownRenderer>
                            </div>
                        )}
                        <div className="flex justify-end gap-2 mt-2">
                             <button onClick={() => setIsAdding(false)} className="text-xs text-gray-500 hover:text-gray-700">취소</button>
                             <button onClick={submitAdd} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">추가</button>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={startAdding}
                        className="flex items-center gap-1.5 text-blue-600 text-sm font-medium hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                    >
                        <Plus size={16} /> 추가하기
                    </button>
                )}
            </div>
        </div>
    );
}

// 수정 가능한 아이템 컴포넌트
function EditableItem({ item, weekDayOptions, onUpdate, onDelete, isSaving }) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(item.content);
    const [date, setDate] = useState(new Date(item.date));
    const textareaRef = useRef(null);
    const handleShortcuts = useMarkdownShortcuts(content, setContent, textareaRef);

    // 내용/편집모드 변경 시 높이 자동 조절
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    }, [content, isEditing]);

    // 외부 업데이트 시 동기화
    useEffect(() => {
        if(!isEditing) {
            setContent(item.content);
            setDate(new Date(item.date));
        }
    }, [item, isEditing]);

    const handleSave = () => {
        if (content.trim() !== item.content || format(date, 'yyyy-MM-dd') !== item.date) {
            onUpdate(item.id, content, date);
        }
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="bg-white border border-blue-300 rounded p-2 shadow-sm relative">
                <div className="flex gap-2 mb-2">
                     <select 
                        className="text-xs border rounded px-2 py-1 bg-slate-50 outline-none"
                        value={format(date, "yyyy-MM-dd")}
                        onChange={e => setDate(new Date(e.target.value))}
                     >
                        {weekDayOptions.map(d => (
                            <option key={d.toString()} value={format(d, "yyyy-MM-dd")}>
                                {format(d, "MM/dd (E)", { locale: undefined })}
                            </option>
                        ))}
                     </select>
                </div>
                <textarea
                    ref={textareaRef}
                    className="w-full text-sm border rounded p-1.5 focus:ring-1 focus:ring-blue-500 outline-none resize-none bg-slate-50 overflow-hidden"
                    rows={1}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onKeyDown={handleShortcuts}
                />
                {/* Live Preview */}
                <div className="mt-2 p-2 bg-slate-50 border rounded text-sm text-slate-600 markdown-body">
                    <div className="mb-1 font-semibold text-[10px] text-slate-400 uppercase flex items-center gap-1">
                        Preview
                    </div>
                    {content ? (
                        <CustomMarkdownRenderer>
                            {content}
                        </CustomMarkdownRenderer>
                    ) : (
                        <span className="text-slate-400 italic">내용을 입력하세요...</span>
                    )}
                </div>
                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><X size={14}/></button>
                    <button onClick={handleSave} className="p-1 hover:bg-blue-100 rounded text-blue-600"><Save size={14}/></button>
                </div>
            </div>
        );
    }

    return (
        <li className="group/item flex gap-2 relative pl-1 hover:bg-blue-100/50 rounded py-1 -mx-1 transition-colors">
            <span className="text-[11px] text-blue-500 font-medium shrink-0 mt-0.5 min-w-[32px] cursor-default">
                 {format(new Date(item.date), "MM/dd")}
            </span>
            <div 
                className="text-slate-700 cursor-pointer flex-1 break-all markdown-body text-sm leading-relaxed"
                onClick={() => setIsEditing(true)}
                title="클릭하여 수정"
            >
                <CustomMarkdownRenderer>
                    {item.content}
                </CustomMarkdownRenderer>
            </div>
            
            {/* 삭제 버튼 (호버 시 표시) */}
            <button
                onClick={() => onDelete(item.id)}
                className="absolute right-1 top-1 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                disabled={isSaving}
            >
                <Trash2 size={14} />
            </button>
        </li>
    );
}

// 도움말 모달
function HelpModal({ onClose }) {
    const examples = [
        { label: "굵게 (Bold)", syntax: "**텍스트** (Ctrl+B)", preview: <strong>텍스트</strong> },
        { label: "기울임 (Italic)", syntax: "_텍스트_ (Ctrl+I)", preview: <em>텍스트</em> },
        { label: "밑줄 (Underline)", syntax: "__텍스트__ (Ctrl+U)", preview: <u>텍스트</u> },
        { label: "리스트", syntax: "- 내용 또는 * 내용", preview: <div><span className="mr-1.5">•</span>내용</div> },
        { label: "들여쓰기", syntax: "    (공백 4칸)", preview: <div className="pl-4 border-l-2 border-dashed border-gray-200">들여쓰기</div> },
        { label: "링크", syntax: "https://url.com", preview: <span className="text-blue-500 hover:underline">https://url.com</span> },
    ];


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] border border-gray-100 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4 border-b pb-3">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <HelpCircle size={20} className="text-blue-500" />
                        마크다운 작성 가이드
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        업무일지는 <strong>마크다운(Markdown)</strong> 문법을 지원합니다. 
                        아래 예시처럼 입력하면 자동으로 서식이 적용됩니다.
                    </p>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-slate-50 p-4 rounded-lg border">
                        <div className="font-semibold text-slate-500 text-xs uppercase border-b pb-1 mb-1">입력 (Syntax)</div>
                        <div className="font-semibold text-slate-500 text-xs uppercase border-b pb-1 mb-1">결과 (Preview)</div>

                        {examples.map((ex, i) => (
                            <React.Fragment key={i}>
                                <div className="font-mono text-xs text-slate-700 bg-white border rounded px-2 py-1.5 whitespace-pre-wrap">
                                    {ex.syntax.replace(/\\n/g, '\n')}
                                </div>
                                <div className="text-slate-800 flex items-center text-xs">
                                    {ex.preview}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="pt-2 text-xs text-gray-400 text-center">
                        * 이 외에도 다양한 마크다운 문법(링크, 코드 등)을 지원합니다.
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium text-sm transition-colors"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// 커스텀 마크다운 엔진 (Custom Markdown Engine)
// ----------------------------------------------------------------------

// 인라인 스타일 파싱 (Link -> Bold -> Underline -> Italic)
const processTextStyles = (text) => {
    // 1. Link (URL) 
    let parts = text.split(/(https?:\/\/[^\s]+)/g);
    for (let i = 1; i < parts.length; i += 2) {
        parts[i] = <a key={`link-${i}`} href={parts[i]} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={e=>e.stopPropagation()}>{parts[i]}</a>;
    }

    // 스타일 적용 헬퍼
    const applyStyle = (nodes, regex, render) => {
        return nodes.flatMap((node, idx) => {
            if (typeof node !== 'string') return node;
            const split = node.split(regex);
            return split.map((frag, i) => {
                if (i % 2 === 1) return render(frag, `${idx}-${i}`);
                return frag;
            });
        });
    };

    // 2. Bold (**text**)
    parts = applyStyle(parts, /\*\*([^*]+)\*\*/g, (match, key) => <strong key={`b-${key}`}>{match}</strong>);
    
    // 3. Underline (__text__)
    parts = applyStyle(parts, /__([^_]+)__/g, (match, key) => <u key={`u-${key}`}>{match}</u>);

    // 4. Italic (_text_)
    parts = applyStyle(parts, /_([^_]+)_/g, (match, key) => <em key={`i-${key}`}>{match}</em>);

    return parts;
};

// 커스텀 렌더러 컴포넌트
const CustomMarkdownRenderer = ({ children }) => {
    if (!children) return null;
    const lines = children.split('\n');

    return (
        <div className="text-sm leading-relaxed text-slate-700">
            {lines.map((line, idx) => {
                // 들여쓰기 계산 (공백 4칸 = 1단계)
                const indentMatch = line.match(/^(\s*)/);
                const spaces = indentMatch ? indentMatch[1].length : 0;
                const indentLevel = Math.floor(spaces / 4);
                
                let content = line.trim();
                let bullet = null;
                
                // 불릿 리스트 (- 또는 *)
                if (content.startsWith('- ') || content.startsWith('* ')) {
                    bullet = <span className="mr-1.5 font-bold text-slate-400">•</span>;
                    content = content.substring(2);
                } 
                
                // 빈 줄 처리
                if (!content && !bullet) {
                    return <div key={idx} className="h-5" />;
                }

                // 번호 리스트 등 나머지 텍스트는 그대로 렌더링
                return (
                    <div key={idx} style={{ paddingLeft: `${indentLevel * 1.0}rem` }} className="min-h-[1.4em] flex items-start break-all whitespace-pre-wrap">
                         {bullet}
                         <span className="flex-1">
                            {processTextStyles(content)}
                         </span>
                    </div>
                );
            })}
        </div>
    );
};

// 단축키 훅
const useMarkdownShortcuts = (value, setValue, textareaRef) => {
    return (e) => {
        // Tab 키 처리 (공백 4칸)
        if (e.key === 'Tab') {
            e.preventDefault();
            const el = textareaRef.current;
            if (!el) return;

            const start = el.selectionStart;
            const end = el.selectionEnd;
            const text = value;
            
            const newValue = text.substring(0, start) + "    " + text.substring(end);
            setValue(newValue);

            setTimeout(() => {
                el.focus();
                el.setSelectionRange(start + 4, start + 4);
            }, 0);
            return;
        }

        if (!e.ctrlKey) return;
        let wrapper = '';
        if (e.key === 'b') wrapper = '**'; // Bold
        else if (e.key === 'i') wrapper = '_'; // Italic
        else if (e.key === 'u') wrapper = '__'; // Underline
        else return;

        // selectionStart/End가 없는 경우 방어
        if (!textareaRef.current) return;

        e.preventDefault();
        const el = textareaRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const text = value;

        const before = text.substring(0, start);
        const selected = text.substring(start, end);
        const after = text.substring(end);
        
        let newValue;
        let newCursorStart, newCursorEnd;

        // 토글 로직
        if (before.endsWith(wrapper) && after.startsWith(wrapper)) {
            // 바깥쪽 제거
            newValue = before.slice(0, -wrapper.length) + selected + after.slice(wrapper.length);
            newCursorStart = start - wrapper.length;
            newCursorEnd = end - wrapper.length;
        } else if (selected.startsWith(wrapper) && selected.endsWith(wrapper) && selected.length >= wrapper.length * 2) {
             // 안쪽 제거
             newValue = before + selected.slice(wrapper.length, -wrapper.length) + after;
             newCursorStart = start;
             newCursorEnd = end - (wrapper.length * 2);
        } else {
            // 적용
            newValue = before + wrapper + selected + wrapper + after;
            if (start === end) {
                newCursorStart = start + wrapper.length;
                newCursorEnd = start + wrapper.length;
            } else {
                newCursorStart = start; 
                newCursorEnd = end + (wrapper.length * 2);
            }
        }

        setValue(newValue);
        
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(newCursorStart, newCursorEnd);
        }, 0);
    };
};
