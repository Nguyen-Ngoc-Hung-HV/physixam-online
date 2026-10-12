import React, { useState, useEffect } from 'react';
import { Exam, StudentAnswers, AntiCheatConfig, ViolationEvent, StudentSubmission, ExamVariantBundle } from './types/exam';
import { StudentExamLaunch } from './components/StudentExamLaunch';
import { ExamResults, PrintMode } from './components/ExamResults';
import { TeacherDashboard } from './components/TeacherDashboard';
import { safeStorage } from './utils/safeStorage';
import { ExamPackage, ExamAssignmentInfo } from './types/curriculum';
import { LayoutDashboard, GraduationCap, Code, Copy, Check, X, Printer, ArrowLeft } from 'lucide-react';

const DEFAULT_EXAM: Exam = {
  id: 'exam-101',
  code: '101',
  title: 'Khảo thí Vật lí 10 - Ôn tập Chuyển động thẳng',
  durationMinutes: 45,
  totalPoints: 10,
  questions: [
    {
      id: 'q-demo-1',
      code: 'C01',
      type: 'multiple_choice',
      prompt: 'Một vật chuyển động thẳng đều với vận tốc $v = 5\\text{ m/s}$. Quãng đường vật đi được trong thời gian $t = 4\\text{ s}$ là',
      options: [
        { id: 'opt-A', label: 'A', text: '$20\\text{ m}$' },
        { id: 'opt-B', label: 'B', text: '$10\\text{ m}$' },
        { id: 'opt-C', label: 'C', text: '$15\\text{ m}$' },
        { id: 'opt-D', label: 'D', text: '$25\\text{ m}$' }
      ],
      correctAnswer: 'opt-A',
      explanation: 'Áp dụng công thức $s = v \\cdot t = 5 \\cdot 4 = 20\\text{ m}$.',
      points: 2.5
    },
    {
      id: 'q-demo-2',
      code: 'C02',
      type: 'multiple_choice',
      prompt: 'Đơn vị đo của gia tốc trong hệ SI là',
      options: [
        { id: 'opt-2A', label: 'A', text: '$\\text{m/s}^2$' },
        { id: 'opt-2B', label: 'B', text: '$\\text{m/s}$' },
        { id: 'opt-2C', label: 'C', text: '$\\text{km/h}$' },
        { id: 'opt-2D', label: 'D', text: '$\\text{m}\\cdot\\text{s}$' }
      ],
      correctAnswer: 'opt-2A',
      explanation: 'Đơn vị chuẩn của gia tốc trong hệ SI là mét trên giây bình phương ($\\text{m/s}^2$).',
      points: 2.5
    }
  ]
} as any;

export default function App() {
  const [appMode, setAppMode] = useState<'student' | 'teacher' | 'print'>('teacher');
  const [activePrintMode, setActivePrintMode] = useState<'exam_only' | 'exam_with_solutions' | 'matrix'>('exam_only');

  const [exam, setExam] = useState<Exam>(() => {
    try {
      const saved = safeStorage?.getItem ? safeStorage.getItem('physixam_current_exam') : localStorage.getItem('physixam_current_exam');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc cache đề thi, nạp đề mặc định:", e);
    }
    return DEFAULT_EXAM;
  });

  const [bundle, setBundle] = useState<ExamVariantBundle | null>(() => {
    try {
      const saved = safeStorage?.getItem ? safeStorage.getItem('physixam_bundle') : localStorage.getItem('physixam_bundle');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeCode, setActiveCode] = useState<string>(() => exam?.code || '101');

  const availableCodes: string[] = React.useMemo(() => {
    if (bundle && Array.isArray(bundle.variants) && bundle.variants.length > 0) {
      const codes = bundle.variants
        .map((v: any) => v?.code)
        .filter((c: any): c is string => typeof c === 'string' && c.trim().length > 0);
      if (codes.length > 0) return codes;
    }
    return [exam?.code || '101'];
  }, [bundle, exam?.code]);

  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() => {
    try {
      const saved = safeStorage?.getItem ? safeStorage.getItem('physixam_submissions') : localStorage.getItem('physixam_submissions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [assignments, setAssignments] = useState<ExamAssignmentInfo[]>(() => {
    try {
      const saved = localStorage.getItem('physixam_assignments');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
  const [jsonText, setJsonText] = useState<string>('');
  const [jsonCopied, setJsonCopied] = useState<boolean>(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [studentExamPhase, setStudentExamPhase] = useState<'launch' | 'student_results'>('launch');
  const [answers, setAnswers] = useState<StudentAnswers>(() => ({}));
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<string>>(new Set());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(45 * 60);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [candidateInfo, setCandidateInfo] = useState({
    name: 'Thí sinh tự do',
    studentClass: '10A1',
    candidateNumber: 'SBD-001'
  });
  const [auditLog, setAuditLog] = useState<{ violations: ViolationEvent[] }>({ violations: [] });
  const [antiCheatConfig, setAntiCheatConfig] = useState<AntiCheatConfig>({
    enabled: true,
    maxViolations: 5
  } as any);

  useEffect(() => {
    if (exam?.durationMinutes) {
      setTimeRemainingSeconds(exam.durationMinutes * 60);
    }
    if (exam?.code) {
      setActiveCode(exam.code);
    }
  }, [exam]);

  useEffect(() => {
    if (studentExamPhase !== 'launch' || appMode !== 'student') return;
    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [studentExamPhase, appMode]);

  const handleApplyBundle = (newBundle: ExamVariantBundle) => {
    if (!newBundle || !Array.isArray(newBundle.variants) || newBundle.variants.length === 0) return;
    setBundle(newBundle);

    try {
      const serialized = JSON.stringify(newBundle);
      if (safeStorage?.setItem) {
        safeStorage.setItem('physixam_bundle', serialized);
      } else {
        localStorage.setItem('physixam_bundle', serialized);
      }
    } catch (e) {
      console.warn('Lỗi lưu gói mã đề trộn:', e);
    }

    const firstVariant: any = newBundle.variants[0];
    const targetExam: Exam = firstVariant?.examData || firstVariant;
    if (targetExam && Array.isArray((targetExam as any).questions)) {
      handleUpdateExamDirectly(targetExam);
      setActiveCode(firstVariant?.code || targetExam?.code || '101');
    }
  };

  const handleSelectExamCode = (code: string) => {
    if (!code) return;
    setActiveCode(code);
    if (bundle && Array.isArray(bundle.variants)) {
      const matched: any = bundle.variants.find((v: any) => v?.code === code);
      if (matched) {
        const targetExam: Exam = matched.examData || matched;
        if (targetExam && Array.isArray((targetExam as any).questions)) {
          setExam(targetExam);
          setAnswers({});
          setFlaggedQuestionIds(new Set());
          setCurrentQuestionIndex(0);
          setTimeRemainingSeconds(((targetExam as any).durationMinutes || 45) * 60);
          return;
        }
      }
    }
  };

  const handleLoadExamFromBank = (selectedPkg: ExamPackage) => {
    if (!selectedPkg || !selectedPkg.examData) return;
    const targetExam = selectedPkg.examData;
    
    setExam(targetExam);
    setActiveCode(targetExam.code || selectedPkg.code || '101');
    setBundle(null);
    try {
      localStorage.removeItem('physixam_bundle');
    } catch (e) {}
    
    try {
      const serialized = JSON.stringify(targetExam);
      if (safeStorage?.setItem) {
        safeStorage.setItem('physixam_current_exam', serialized);
      } else {
        localStorage.setItem('physixam_current_exam', serialized);
      }
    } catch (e) {
      console.warn('Lỗi lưu đề nạp từ ngân hàng:', e);
    }

    setAnswers({});
    setFlaggedQuestionIds(new Set());
    setCurrentQuestionIndex(0);
    setTimeRemainingSeconds((targetExam.durationMinutes || 45) * 60);
    setStudentExamPhase('launch');
  };

  const handleUpdateExamDirectly = (updatedExam: Exam) => {
    if (!updatedExam) return;
    setExam(updatedExam);
    if (updatedExam.code) setActiveCode(updatedExam.code);
    try {
      const serialized = JSON.stringify(updatedExam);
      if (safeStorage?.setItem) {
        safeStorage.setItem('physixam_current_exam', serialized);
      } else {
        localStorage.setItem('physixam_current_exam', serialized);
      }
    } catch (e) {}
  };

  const handleOpenJsonModal = () => {
    setJsonText(JSON.stringify(exam, null, 2));
    setJsonError(null);
    setJsonCopied(false);
    setIsJsonModalOpen(true);
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || !Array.isArray(parsed.questions)) {
        throw new Error('Dữ liệu JSON không hợp lệ: Thiếu mảng questions.');
      }
      handleUpdateExamDirectly(parsed);
      setIsJsonModalOpen(false);
    } catch (err: any) {
      setJsonError(err?.message || 'Định dạng JSON không hợp lệ.');
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonText);
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  const handleAssignExam = (pkg: ExamPackage, assignment: ExamAssignmentInfo, switchToStudent: boolean) => {
    setAssignments((prev) => {
      const updated = [assignment, ...prev.filter((a) => a.id !== assignment.id)];
      try {
        localStorage.setItem('physixam_assignments', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    handleLoadExamFromBank(pkg);

    if (switchToStudent) {
      setAppMode('student');
    }
  };

  const handleDeleteAssignment = (assignId: string) => {
    setAssignments((prev) => {
      const updated = prev.filter((a) => a.id !== assignId);
      try {
        localStorage.setItem('physixam_assignments', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    if (!questionId) return;
    setAnswers((prev) => ({ ...(prev || {}), [questionId]: answer }));
  };

  const handleToggleFlag = (questionId: string) => {
    if (!questionId) return;
    setFlaggedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleRecordViolation = (event: ViolationEvent) => {
    setAuditLog((prev) => ({
      ...prev,
      violations: [...(prev?.violations || []), event]
    }));
  };

  const handleSubmitExam = () => {
    let score = 0;
    const detailedFeedback: any[] = [];
    const questionsList = (exam && Array.isArray(exam.questions)) ? exam.questions : (DEFAULT_EXAM.questions || []);

    questionsList.forEach((q: any) => {
      if (!q || !q.id) return;
      const userAns = (answers && answers[q.id]) !== undefined ? answers[q.id] : undefined;
      let isCorrect = false;
      let pointsAwarded = 0;
      const qPoints = q.points || (10 / (questionsList.length || 1));

      if (q.type === 'multiple_choice') {
        if (userAns === q.correctAnswer) {
          isCorrect = true;
          pointsAwarded = qPoints;
        }
      } else if (q.type === 'true_false_cluster') {
        const clusterAns = userAns || {};
        let correctSubCount = 0;
        q.items?.forEach((item: any) => {
          if ((clusterAns as any)[item.id] === item.isCorrect) {
            correctSubCount++;
          }
        });
        if (correctSubCount === (q.items?.length || 1)) {
          isCorrect = true;
          pointsAwarded = qPoints;
        } else if (correctSubCount > 0) {
          pointsAwarded = Number((qPoints * (correctSubCount / (q.items?.length || 1))).toFixed(2));
        }
      } else if (q.type === 'short_answer') {
        const val = typeof userAns === 'object' && userAns !== null ? userAns.value : userAns;
        if (val && String(val).trim() === String(q.correctValue || '').trim()) {
          isCorrect = true;
          pointsAwarded = qPoints;
        }
      }

      score += pointsAwarded;
      detailedFeedback.push({
        questionId: q.id,
        isCorrect,
        pointsAwarded
      });
    });

    const finalScore = Number(Math.min(10, Math.max(0, score)).toFixed(2));
    const evalResult = {
      totalScore: finalScore,
      detailedFeedback
    };

    setEvaluation(evalResult);

    const safeExamCode = exam?.code || activeCode || '101';
    const newSub: StudentSubmission = {
      id: `sub-${Date.now()}`,
      candidateName: candidateInfo.name,
      studentClass: candidateInfo.studentClass,
      candidateNumber: candidateInfo.candidateNumber,
      examCode: safeExamCode,
      score: finalScore,
      submittedAt: new Date().toISOString(),
      answers: answers || {},
      auditLog,
      evaluation: evalResult
    } as any;

    setSubmissions((prev) => {
      const updated = [newSub, ...(prev || [])];
      try {
        if (safeStorage?.setItem) {
          safeStorage.setItem('physixam_submissions', JSON.stringify(updated));
        } else {
          localStorage.setItem('physixam_submissions', JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });

    setStudentExamPhase('student_results');
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    setSubmissions((prev: any[]) => {
      const updated = (prev || []).filter((s: any) => String(s.id || s._id) !== String(submissionId));
      try {
        safeStorage?.setItem ? safeStorage.setItem('physixam_submissions', JSON.stringify(updated)) : localStorage.setItem('physixam_submissions', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/submissions/${submissionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.warn('Lỗi khi xóa bài nộp trên server:', err);
    }
  };

  const handleClearSubmissions = async () => {
    setSubmissions([]);
    try {
      safeStorage?.setItem ? safeStorage.setItem('physixam_submissions', JSON.stringify([])) : localStorage.setItem('physixam_submissions', JSON.stringify([]));
    } catch (e) {}

    try {
      await fetch('/api/submissions/clear-all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.warn('Lỗi khi xóa sạch danh sách trên server:', err);
    }
  };

  // KHÔI PHỤC HOÀN CHỈNH TÍNH NĂNG 5: IN ẤN & XUẤT BẢN PDF
  const handleOpenPrint = (mode: 'exam_only' | 'exam_with_solutions') => {
    setActivePrintMode(mode);
    setAppMode('print');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleOpenPrintMatrix = (targetBundle: ExamVariantBundle) => {
    if (targetBundle) {
      setBundle(targetBundle);
    }
    setActivePrintMode('matrix');
    setAppMode('print');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const safeCurrentExam = (exam && Array.isArray(exam.questions) && exam.questions.length > 0) ? exam : DEFAULT_EXAM;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
      {/* THANH ĐIỀU HƯỚNG TẦNG ĐẦU */}
      <nav className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 sticky top-0 z-40 shadow-md print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm">
              PX
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide block">PhysiXam Online</span>
              <span className="text-3xs text-indigo-300 font-mono">Chương trình GDPT 2018</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setAppMode('teacher')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                appMode === 'teacher'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Bảng điều khiển Giáo viên</span>
            </button>

            <button
              type="button"
              onClick={() => setAppMode('student')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                appMode === 'student'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Giao diện Học sinh làm bài</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-16 print:p-0 print:m-0 print:max-w-none">
        {/* CHẾ ĐỘ 1: HỌC SINH LÀM BÀI / KẾT QUẢ */}
        {appMode === 'student' && (
          <div>
            {studentExamPhase === 'launch' && (
              <StudentExamLaunch
                exam={safeCurrentExam}
                antiCheatConfig={antiCheatConfig}
                candidateInfo={candidateInfo}
                timeRemainingSeconds={timeRemainingSeconds}
                onAnswerChange={handleAnswerChange}
                answers={answers || {}}
                flaggedQuestionIds={flaggedQuestionIds || new Set()}
                onToggleFlag={handleToggleFlag}
                currentQuestionIndex={currentQuestionIndex}
                onSelectQuestion={setCurrentQuestionIndex}
                onSubmitExam={handleSubmitExam}
                onRecordViolation={handleRecordViolation}
              />
            )}

            {studentExamPhase === 'student_results' && evaluation && (
              <ExamResults
                exam={safeCurrentExam}
                answers={answers || {}}
                evaluation={evaluation}
                candidateInfo={candidateInfo}
                timeRemainingSeconds={timeRemainingSeconds}
                auditLog={auditLog}
                onRetake={() => {
                  setAnswers({});
                  setStudentExamPhase('launch');
                  setTimeRemainingSeconds((safeCurrentExam.durationMinutes || 45) * 60);
                }}
                onOpenTeacherMode={() => setAppMode('teacher')}
                onOpenPrint={(printMode) => handleOpenPrint(printMode === 'exam_with_solutions' ? 'exam_with_solutions' : 'exam_only')}
              />
            )}
          </div>
        )}

        {/* CHẾ ĐỘ 2: BẢNG ĐIỀU KHIỂN GIÁO VIÊN */}
        {appMode === 'teacher' && (
          <TeacherDashboard
            exam={safeCurrentExam}
            currentExam={safeCurrentExam}
            activeCode={activeCode}
            availableCodes={availableCodes}
            onSelectExamCode={handleSelectExamCode}
            bundle={bundle}
            onApplyBundle={handleApplyBundle}
            onSelectExamPackage={handleLoadExamFromBank}
            onUpdateExam={handleUpdateExamDirectly}
            submissions={submissions || []}
            onDeleteSubmission={handleDeleteSubmission}
            onClearSubmissions={handleClearSubmissions}
            antiCheatConfig={antiCheatConfig}
            onChangeAntiCheatConfig={setAntiCheatConfig}
            assignments={assignments}
            onAssignExam={handleAssignExam}
            onDeleteAssignment={handleDeleteAssignment}
            onOpenPrint={handleOpenPrint}
            onOpenPrintMatrix={handleOpenPrintMatrix}
            onOpenTeacherJsonModal={handleOpenJsonModal}
            onPreviewAsStudent={() => setAppMode('student')}
          />
        )}

        {/* CHẾ ĐỘ 3: KHUNG XEM TRƯỚC VÀ IN ĐỀ THI / MA TRẬN ĐÁP ÁN (TÍNH NĂNG 5) */}
        {appMode === 'print' && (
          <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
            {/* Thanh công cụ khi xem trước in (ẩn khi in giấy thực tế) */}
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200 print:hidden">
              <button
                type="button"
                onClick={() => setAppMode('teacher')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại Bảng điều khiển</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 mr-2">
                  Chế độ: {activePrintMode === 'exam_only' ? 'Đề thi chuẩn A4' : activePrintMode === 'exam_with_solutions' ? 'Đề thi kèm Lời giải' : 'Ma trận đáp án các mã đề'}
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Xác nhận In ngay (Print)</span>
                </button>
              </div>
            </div>

            {/* Khung nội dung in chuẩn A4 */}
            {activePrintMode === 'matrix' ? (
              <div className="space-y-6">
                <div className="text-center pb-4 border-b">
                  <h2 className="text-lg font-black uppercase tracking-wider">BẢNG MA TRẬN ĐÁP ÁN CÁC MÃ ĐỀ TRỘN</h2>
                  <p className="text-xs text-slate-600 mt-1">{safeCurrentExam.title} • Thời gian: {safeCurrentExam.durationMinutes || 45} phút</p>
                </div>
                {bundle && Array.isArray(bundle.variants) ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          <th className="border border-slate-300 p-2">Câu hỏi</th>
                          {bundle.variants.map((v: any) => (
                            <th key={v.code} className="border border-slate-300 p-2">Mã {v.code}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {safeCurrentExam.questions.map((q: any, idx: number) => (
                          <tr key={q.id || idx} className="hover:bg-slate-50">
                            <td className="border border-slate-300 p-2 font-bold">Câu {idx + 1}</td>
                            {bundle.variants.map((v: any) => {
                              const varQ = (v.examData || v).questions?.[idx];
                              return (
                                <td key={v.code} className="border border-slate-300 p-2 font-mono font-bold text-indigo-700">
                                  {varQ?.correctAnswer || '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-6">Chưa có gói mã đề trộn. Vui lòng vào Panel 3 thực hiện trộn đề trước.</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header chuẩn bài thi của Bộ GD&ĐT */}
                <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
                  <div className="text-center">
                    <p className="text-xs uppercase font-bold">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
                    <p className="text-sm uppercase font-black">TRƯỜNG THPT CHUYÊN</p>
                    <p className="text-3xs italic">(Đề thi gồm {safeCurrentExam.questions.length} câu)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black uppercase">{safeCurrentExam.title}</p>
                    <p className="text-xs font-semibold">NĂM HỌC 2025 - 2026 • MÔN: VẬT LÍ</p>
                    <p className="text-xs">Thời gian làm bài: {safeCurrentExam.durationMinutes || 45} phút</p>
                  </div>
                  <div className="border border-slate-800 px-3 py-1 rounded text-center">
                    <p className="text-3xs font-bold uppercase">MÃ ĐỀ THI</p>
                    <p className="text-base font-black font-mono">{activeCode}</p>
                  </div>
                </div>

                {/* Danh sách câu hỏi in */}
                <div className="space-y-5 pt-2">
                  {safeCurrentExam.questions.map((q: any, idx: number) => (
                    <div key={q.id || idx} className="space-y-2 text-sm leading-relaxed">
                      <p className="font-semibold text-slate-900">
                        <span className="font-black text-indigo-900">Câu {idx + 1}: </span>
                        {q.prompt || q.stem || ''}
                      </p>
                      {Array.isArray(q.options) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 pl-4 text-xs font-medium">
                          {q.options.map((opt: any) => (
                            <div key={opt.id || opt.label} className="flex items-center gap-1.5">
                              <span className="font-bold">{opt.label}.</span>
                              <span>{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {activePrintMode === 'exam_with_solutions' && q.explanation && (
                        <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs italic text-slate-700">
                          <span className="font-bold text-emerald-700 not-italic">Hướng dẫn giải: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL QUẢN LÝ JSON */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-400" />
                <h4 className="font-bold text-sm">Quản lý Cấu trúc Đề thi JSON</h4>
              </div>
              <button 
                onClick={() => setIsJsonModalOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-hidden flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Thầy có thể sao chép hoặc dán cấu trúc JSON mới để cập nhật đề thi:</span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  {jsonCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-indigo-600" />}
                  <span>{jsonCopied ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
                </button>
              </div>

              {jsonError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {jsonError}
                </div>
              )}

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full flex-1 p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs outline-none border border-slate-800 resize-none min-h-[300px]"
                spellCheck={false}
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsJsonModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleApplyJson}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer shadow-sm"
              >
                Áp dụng JSON vào hệ thống
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}