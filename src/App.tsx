import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { Exam, StudentAnswers, AntiCheatConfig, ViolationEvent, StudentSubmission, ExamVariantBundle } from './types/exam';
import { StudentExamLaunch } from './components/StudentExamLaunch';
import { ExamResults, PrintMode } from './components/ExamResults';
import { TeacherDashboard } from './components/TeacherDashboard';
import { safeStorage } from './utils/safeStorage';
import { ExamPackage, ExamAssignmentInfo } from './types/curriculum';
import { 
  Home, LayoutDashboard, GraduationCap, Code, Copy, Check, X, 
  Printer, ArrowLeft, Image as ImageIcon, Sparkles, RefreshCw, 
  UploadCloud, ArrowRight, BookOpen, ShieldCheck, Atom, CheckCircle2,
  Lock, KeyRound, AlertCircle, Megaphone, Loader2, UserCheck, Maximize2
} from 'lucide-react';

// =========================================================================
// LỚP BẢO VỆ CHỐNG TRẮNG TRANG CHO SAFARI (REACT ERROR BOUNDARY)
// =========================================================================
interface ErrorBoundaryProps {
  children: ReactNode;
  evaluation: any;
  candidateInfo: any;
  exam: any;
  onRetake: () => void;
  onOpenTeacherMode: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ResultsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.warn('Bảo vệ Safari: Bắt lỗi an toàn khi nộp bài:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { evaluation, candidateInfo, exam, onRetake, onOpenTeacherMode } = this.props;
      const displayScore = Number(evaluation?.totalScore ?? evaluation?.score ?? 0).toFixed(2);
      const correct = evaluation?.correctCount || 0;
      const total = evaluation?.totalQuestions || exam?.questions?.length || 0;

      return (
        <div className="max-w-2xl mx-auto my-8 p-6 sm:p-8 bg-white rounded-3xl shadow-xl border border-slate-200 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Bài Thi Đã Nộp Thành Công!</h2>
            <p className="text-xs text-slate-500 font-medium">{exam?.title}</p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Thí sinh:</span>
              <strong className="text-slate-900">{candidateInfo?.name || 'Thí sinh'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Lớp:</span>
              <strong className="text-slate-900">{candidateInfo?.studentClass || '11'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Số báo danh:</span>
              <strong className="font-mono text-slate-900">{candidateInfo?.candidateNumber || 'SBD-001'}</strong>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-lg space-y-1">
            <div className="text-3xs uppercase tracking-widest text-emerald-200 font-bold">Điểm tổng kết</div>
            <div className="text-5xl font-black">
              {displayScore}
              <span className="text-xl font-normal text-emerald-200"> / 10đ</span>
            </div>
            <div className="text-xs text-emerald-100 font-medium pt-1">
              Đúng {correct} / {total} câu
            </div>
          </div>

          <div className="flex items-center gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={onRetake}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition"
            >
              Làm lại bài thi
            </button>
            <button
              type="button"
              onClick={onOpenTeacherMode}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-md transition"
            >
              Về Bảng điều khiển Giáo viên
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_EXAM: Exam = {
  id: 'exam-101',
  code: '101',
  title: 'Khảo thí Vật lí - Đề kiểm tra chuẩn',
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
    }
  ]
} as any;

const PRESET_BANNERS = [
  {
    name: 'Sóng & Lượng tử Xanh Chàm',
    url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=2070&auto=format&fit=crop'
  },
  {
    name: 'Vũ trụ & Hạt cơ bản',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop'
  }
];

const DEFAULT_BRANDING = {
  schoolName: 'TRƯỜNG THPT HÙNG VƯƠNG',
  subtitle: 'HỆ THỐNG KHẢO THÍ VẬT LÍ TRỰC TUYẾN • CHƯƠNG TRÌNH GDPT 2018',
  tickerText: '⚡ CHÀO MỪNG QUÝ THẦY CÔ VÀ CÁC EM HỌC SINH! • "Học để hiểu bản chất của tự nhiên — Thi để khẳng định tư duy khoa học" • Hệ thống khảo thí Vật lí trực tuyến chuẩn cấu trúc GDPT 2018',
  logoUrl: '',
  bannerUrl: PRESET_BANNERS[0].url
};

const DEFAULT_TEACHER_PIN = '123456';

export default function App() {
  const [appMode, setAppMode] = useState<'home' | 'student' | 'teacher' | 'print'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'student' || params.get('role') === 'student' || params.get('exam') || params.get('code') || params.get('assign')) {
        return 'student';
      }
    }
    return 'home';
  });

  const [activePrintMode, setActivePrintMode] = useState<'exam_only' | 'exam_with_solutions' | 'matrix'>('exam_only');
  const [isLoadingAssignedExam, setIsLoadingAssignedExam] = useState<boolean>(false);

  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('physixam_teacher_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [branding, setBranding] = useState(() => {
    try {
      const saved = localStorage.getItem('physixam_branding');
      return saved ? { ...DEFAULT_BRANDING, ...JSON.parse(saved) } : DEFAULT_BRANDING;
    } catch (e) {
      return DEFAULT_BRANDING;
    }
  });

  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [brandingDraft, setBrandingDraft] = useState(branding);

  const [exam, setExam] = useState<Exam>(() => {
    try {
      const saved = safeStorage?.getItem ? safeStorage.getItem('physixam_current_exam') : localStorage.getItem('physixam_current_exam');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
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
    return [activeCode || exam?.code || '101'];
  }, [bundle, exam?.code, activeCode]);

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
      if (saved) return JSON.parse(saved);
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
    name: '',
    studentClass: '',
    candidateNumber: ''
  });
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  const [auditLog, setAuditLog] = useState<{ violations: ViolationEvent[] }>({ violations: [] });
  const [antiCheatConfig, setAntiCheatConfig] = useState<AntiCheatConfig>({
    enabled: true,
    maxViolations: 5
  } as any);

  // =========================================================================
  // ĐỒNG BỘ TOÀN DIỆN TỪ MONGODB ATLAS
  // =========================================================================
  const fetchAllDataFromMongo = async () => {
    try {
      const resSub = await fetch('/api/submissions');
      if (resSub.ok) {
        const cloudData = await resSub.json();
        if (Array.isArray(cloudData)) {
          setSubmissions(cloudData);
          if (safeStorage?.setItem) {
            safeStorage.setItem('physixam_submissions', JSON.stringify(cloudData));
          } else {
            localStorage.setItem('physixam_submissions', JSON.stringify(cloudData));
          }
        }
      }
    } catch (err) {}

    try {
      const resAssign = await fetch('/api/assignments');
      if (resAssign.ok) {
        const cloudAssigns = await resAssign.json();
        if (Array.isArray(cloudAssigns) && cloudAssigns.length > 0) {
          setAssignments(cloudAssigns);
          localStorage.setItem('physixam_assignments', JSON.stringify(cloudAssigns));
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchAllDataFromMongo();
    const interval = setInterval(() => {
      fetchAllDataFromMongo();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchExamFromMongo = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const searchCode = params.get('code') || params.get('variant');
        const assignId = params.get('assign') || params.get('assignmentId');
        const examId = params.get('exam') || params.get('examId');

        const targetCode = (searchCode || assignId || examId || '').trim();
        if (!targetCode) return;

        setIsLoadingAssignedExam(true);

        try {
          const response = await fetch(`/api/assignments?code=${encodeURIComponent(targetCode)}`);
          if (response.ok) {
            const doc = await response.json();
            const cloudExam = doc?.examData || doc?.exam || (doc.questions ? doc : null);
            if (cloudExam && Array.isArray(cloudExam.questions) && cloudExam.questions.length > 0) {
              setExam(cloudExam);
              const resolvedCode = doc.code || doc.accessCode || cloudExam.code || targetCode;
              setActiveCode(resolvedCode);
              setTimeRemainingSeconds((cloudExam.durationMinutes || 45) * 60);
              
              if (safeStorage?.setItem) {
                safeStorage.setItem('physixam_current_exam', JSON.stringify(cloudExam));
              } else {
                localStorage.setItem('physixam_current_exam', JSON.stringify(cloudExam));
              }
              setIsLoadingAssignedExam(false);
              return;
            }
          }
        } catch (netErr) {}

        const localMatched: any = assignments.find((a: any) => 
          String(a.id || '').toUpperCase() === targetCode.toUpperCase() ||
          String(a.code || a.accessCode || a.examCode || '').toUpperCase() === targetCode.toUpperCase()
        );

        if (localMatched && localMatched.examData && Array.isArray(localMatched.examData.questions) && localMatched.examData.questions.length > 0) {
          setExam(localMatched.examData);
          const resolvedCode = localMatched.code || localMatched.accessCode || localMatched.examCode || targetCode;
          setActiveCode(resolvedCode);
          setTimeRemainingSeconds((localMatched.examData.durationMinutes || 45) * 60);
        }
      } catch (err) {} finally {
        setIsLoadingAssignedExam(false);
      }
    };

    fetchExamFromMongo();
  }, []);

  useEffect(() => {
    if (exam?.durationMinutes) {
      setTimeRemainingSeconds(exam.durationMinutes * 60);
    }
    if (exam?.code) {
      setActiveCode(exam.code);
    }
  }, [exam]);

  useEffect(() => {
    if (studentExamPhase !== 'launch' || appMode !== 'student' || !isRegistered) return;
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
  }, [studentExamPhase, appMode, isRegistered]);

  const handleRequestTeacherMode = () => {
    if (isTeacherAuthenticated) {
      fetchAllDataFromMongo();
      setAppMode('teacher');
    } else {
      setEnteredPin('');
      setPinError(null);
      setIsPinModalOpen(true);
    }
  };

  const handleVerifyTeacherPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const savedPin = localStorage.getItem('physixam_teacher_pin') || DEFAULT_TEACHER_PIN;
    if (enteredPin === savedPin) {
      setIsTeacherAuthenticated(true);
      try {
        sessionStorage.setItem('physixam_teacher_auth', 'true');
      } catch {}
      setIsPinModalOpen(false);
      setPinError(null);
      fetchAllDataFromMongo();
      setAppMode('teacher');
    } else {
      setPinError('Mã PIN bảo mật không chính xác. Vui lòng kiểm tra lại!');
    }
  };

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
    } catch (e) {}

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
    if (exam) {
      setExam({ ...exam, code: code });
    }
  };

  const uploadExamToMongoDB = async (examToUpload: Exam, customCode?: string) => {
    try {
      const finalCode = (customCode || examToUpload.code || activeCode || '101').trim().toUpperCase();
      await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `assign-${finalCode}`,
          code: finalCode,
          accessCode: finalCode,
          examCode: finalCode,
          title: examToUpload.title,
          examData: examToUpload,
          assignedAt: new Date().toISOString()
        })
      });
      fetchAllDataFromMongo();
    } catch (e) {}
  };

  const handleLoadExamFromBank = (selectedPkg: ExamPackage) => {
    if (!selectedPkg || !selectedPkg.examData) return;
    const targetExam = selectedPkg.examData;
    const targetCode = (targetExam.code || selectedPkg.code || '101').trim().toUpperCase();
    
    setExam(targetExam);
    setActiveCode(targetCode);
    setBundle(null);
    try {
      localStorage.removeItem('physixam_bundle');
      const serialized = JSON.stringify(targetExam);
      if (safeStorage?.setItem) {
        safeStorage.setItem('physixam_current_exam', serialized);
      } else {
        localStorage.setItem('physixam_current_exam', serialized);
      }
    } catch (e) {}

    uploadExamToMongoDB(targetExam, targetCode);

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

    uploadExamToMongoDB(updatedExam, updatedExam.code);
  };

  const handleOpenJsonModal = () => {
    setJsonText(JSON.stringify(exam, null, 2));
    setJsonError(null);
    setJsonCopied(false);
    setIsJsonModalOpen(true);
  };

  const handleAssignExam = async (pkg: ExamPackage, assignment: ExamAssignmentInfo, switchToStudent: boolean) => {
    const targetExam = pkg?.examData || (pkg as any)?.questions ? (pkg as any) : (exam || DEFAULT_EXAM);
    const finalCode = (assignment as any)?.code || assignment.accessCode || targetExam.code || activeCode || '101';

    const fullAssignment: any = {
      ...assignment,
      id: assignment.id || `assign-${Date.now()}`,
      code: finalCode,
      accessCode: finalCode,
      examCode: targetExam.code || finalCode,
      examTitle: targetExam.title || assignment.examTitle,
      title: targetExam.title || assignment.examTitle,
      durationMinutes: targetExam.durationMinutes || 45,
      questions: targetExam.questions || [],
      examData: targetExam,
      assignedAt: new Date().toISOString(),
      status: 'active'
    };

    setAssignments((prev) => {
      const updated = [fullAssignment, ...prev.filter((a) => a.id !== fullAssignment.id && (a as any).code !== fullAssignment.code && a.accessCode !== fullAssignment.code)];
      try {
        localStorage.setItem('physixam_assignments', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    handleLoadExamFromBank(pkg);

    try {
      await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullAssignment)
      });
      fetchAllDataFromMongo();
    } catch (e) {}

    if (switchToStudent) setAppMode('student');
  };

  const handleDeleteAssignment = async (assignId: string) => {
    setAssignments((prev) => {
      const updated = prev.filter((a) => a.id !== assignId);
      try {
        localStorage.setItem('physixam_assignments', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/assignments?id=${encodeURIComponent(assignId)}`, { method: 'DELETE' });
      fetchAllDataFromMongo();
    } catch (e) {}
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    if (!questionId) return;
    setAnswers((prev) => ({ ...(prev || {}), [questionId]: answer }));
  };

  const handleToggleFlag = (questionId: string) => {
    if (!questionId) return;
    setFlaggedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleRecordViolation = (event: ViolationEvent) => {
    setAuditLog((prev) => ({
      ...prev,
      violations: [...(prev?.violations || []), event]
    }));
  };

  // =========================================================================
  // XỬ LÝ NỘP BÀI: TỐI ƯU HÓA HOÀN TOÀN CHO SAFARI & CHROME
  // =========================================================================
  const handleSubmitExam = () => {
    // 1. Chấm điểm chính xác & an toàn
    let score = 0;
    const detailedFeedback: any[] = [];
    const questionsList = (exam && Array.isArray(exam.questions)) ? exam.questions : (DEFAULT_EXAM.questions || []);

    let part1Score = 0, part1Correct = 0, part1Total = 0;
    let part2Score = 0, part2Correct = 0, part2Total = 0;
    let part3Score = 0, part3Correct = 0, part3Total = 0;

    questionsList.forEach((q: any) => {
      if (!q || !q.id) return;
      const userAns = (answers && (answers as any)[q.id]) !== undefined ? (answers as any)[q.id] : undefined;
      let isCorrect = false;
      let pointsAwarded = 0;
      const qPoints = q.points || (10 / (questionsList.length || 1));
      const qPart = q.part || 'Phần I';

      if (qPart === 'Phần I') part1Total++;
      else if (qPart === 'Phần II') part2Total++;
      else part3Total++;

      if (q.type === 'multiple_choice') {
        if (String(userAns) === String(q.correctAnswer)) {
          isCorrect = true;
          pointsAwarded = qPoints;
        }
      } else if (q.type === 'true_false_cluster') {
        const clusterAns = userAns || {};
        let correctSubCount = 0;
        q.items?.forEach((item: any) => {
          if ((clusterAns as any)[item.id] === item.isCorrect) correctSubCount++;
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
      if (isCorrect) {
        if (qPart === 'Phần I') { part1Correct++; part1Score += pointsAwarded; }
        else if (qPart === 'Phần II') { part2Correct++; part2Score += pointsAwarded; }
        else { part3Correct++; part3Score += pointsAwarded; }
      }

      detailedFeedback.push({ questionId: q.id, isCorrect, pointsAwarded });
    });

    const finalScore = Number(Math.min(10, Math.max(0, score)).toFixed(2));
    const correctCount = detailedFeedback.filter(f => f.isCorrect).length;
    const totalCount = questionsList.length;
    const percentage = Math.round((finalScore / 10) * 100);

    const evalResult = {
      totalScore: finalScore,
      score: finalScore,
      maxScore: 10,
      percentage: percentage,
      correctCount: correctCount,
      totalQuestions: totalCount,
      detailedFeedback,
      feedback: detailedFeedback,
      partScores: {
        part1: { score: Number(part1Score.toFixed(2)), correct: part1Correct, total: part1Total },
        part2: { score: Number(part2Score.toFixed(2)), correct: part2Correct, total: part2Total },
        part3: { score: Number(part3Score.toFixed(2)), correct: part3Correct, total: part3Total }
      }
    };

    const safeExamCode = exam?.code || activeCode || '101';
    const newSub: StudentSubmission = {
      id: `sub-${Date.now()}`,
      studentName: candidateInfo.name || 'Thí sinh tự do',
      candidateName: candidateInfo.name || 'Thí sinh tự do',
      studentClass: candidateInfo.studentClass || '11A',
      candidateNumber: candidateInfo.candidateNumber || 'SBD-001',
      examCode: safeExamCode,
      totalScore: finalScore,
      score: finalScore,
      percentage: percentage,
      submittedAt: new Date().toLocaleString('vi-VN'),
      timeSpentSeconds: Math.max(0, ((exam?.durationMinutes || 45) * 60) - timeRemainingSeconds),
      submissionReason: 'normal',
      violationCount: auditLog.violations.length,
      answers: answers || {},
      auditLog,
      evaluation: evalResult
    } as any;

    // Gán kết quả vào state trước
    setEvaluation(evalResult);

    // Cập nhật bộ nhớ cục bộ
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

    // 2. Chuyển sang màn hình kết quả ngay lập tức
    setStudentExamPhase('student_results');

    // 3. Hoãn các thao tác WebKit/DOM để Safari render xong khung hình
    setTimeout(() => {
      try {
        if (typeof document !== 'undefined') {
          const isFs = document.fullscreenElement || (document as any).webkitFullscreenElement;
          if (isFs) {
            if (document.exitFullscreen) {
              document.exitFullscreen().catch(() => {});
            } else if ((document as any).webkitExitFullscreen) {
              (document as any).webkitExitFullscreen();
            }
          }
        }
      } catch (e) {}

      // Gửi dữ liệu nền lên MongoDB
      try {
        fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSub)
        }).then(() => {
          fetchAllDataFromMongo();
        }).catch((err) => console.warn('Lỗi ghi MongoDB ngầm:', err));
      } catch (err) {}
    }, 50);
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    setSubmissions((prev: any[]) => {
      const updated = (prev || []).filter((s: any) => String(s.id || s._id) !== String(submissionId));
      try {
        if (safeStorage?.setItem) {
          safeStorage.setItem('physixam_submissions', JSON.stringify(updated));
        } else {
          localStorage.setItem('physixam_submissions', JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/submissions/${submissionId}`, { method: 'DELETE' });
      fetchAllDataFromMongo();
    } catch (err) {}
  };

  const handleClearSubmissions = async () => {
    setSubmissions([]);
    try {
      if (safeStorage?.setItem) {
        safeStorage.setItem('physixam_submissions', JSON.stringify([]));
      } else {
        localStorage.setItem('physixam_submissions', JSON.stringify([]));
      }
    } catch (e) {}

    try {
      await fetch('/api/submissions/clear-all', { method: 'DELETE' });
      fetchAllDataFromMongo();
    } catch (err) {}
  };

  const handleOpenPrint = (mode: 'exam_only' | 'exam_with_solutions') => {
    setActivePrintMode(mode);
    setAppMode('print');
    setTimeout(() => { window.print(); }, 300);
  };

  const handleOpenPrintMatrix = (targetBundle: ExamVariantBundle) => {
    if (targetBundle) setBundle(targetBundle);
    setActivePrintMode('matrix');
    setAppMode('print');
    setTimeout(() => { window.print(); }, 300);
  };

  const handleStartExamWithRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateInfo.name.trim() || !candidateInfo.studentClass.trim() || !candidateInfo.candidateNumber.trim()) {
      alert('Vui lòng nhập đầy đủ: Họ và tên, Lớp và Số báo danh để bắt đầu bài thi!');
      return;
    }

    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        (document.documentElement as any).webkitRequestFullscreen();
      }
    } catch (err) {}

    setIsRegistered(true);
  };

  const safeCurrentExam = (exam && Array.isArray(exam.questions) && exam.questions.length > 0) ? exam : DEFAULT_EXAM;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      <style>{`
        @keyframes marqueeScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: inline-flex;
          white-space: nowrap;
          animation: marqueeScroll 28s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* THANH ĐIỀU HƯỚNG NỔI */}
      {!(appMode === 'student' && isRegistered && studentExamPhase === 'launch') && (
        <header className="sticky top-0 z-40 px-3 sm:px-6 py-2.5 print:hidden">
          <div className="max-w-7xl mx-auto backdrop-blur-xl bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl shadow-slate-950/20 px-4 py-2 flex items-center justify-between gap-4">
            
            <div 
              onClick={() => setAppMode('home')}
              className="flex items-center gap-3 cursor-pointer group select-none min-w-0"
              title="Về Trang chủ Pano"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center font-black text-white text-xs shadow-md group-hover:scale-105 transition shrink-0">
                <Atom className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-sm tracking-wide text-white group-hover:text-indigo-300 transition truncate block">
                  {branding.schoolName}
                </span>
                <span className="text-3xs text-indigo-300/90 font-mono tracking-wider truncate block">
                  {branding.subtitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setAppMode('home')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  appMode === 'home'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Trang chủ</span>
              </button>

              <button
                type="button"
                onClick={handleRequestTeacherMode}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  appMode === 'teacher'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isTeacherAuthenticated ? <LayoutDashboard className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                <span>Giáo viên</span>
              </button>

              <button
                type="button"
                onClick={() => setAppMode('student')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  appMode === 'student'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Học sinh</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* CHẾ ĐỘ TRANG CHỦ */}
      {appMode === 'home' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 space-y-4 animate-in fade-in duration-300">
          <section className="relative rounded-3xl overflow-hidden shadow-xl border border-indigo-900/40 bg-slate-950 min-h-[250px] sm:min-h-[290px] flex items-center">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-700 filter brightness-75 scale-105"
              style={{ backgroundImage: `url(${branding.bannerUrl || PRESET_BANNERS[0].url})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-indigo-950/70" />

            <div className="relative z-10 p-5 sm:p-8 lg:p-10 max-w-4xl space-y-3.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-3xs sm:text-xs font-black backdrop-blur-md shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>PhysiXam Online • Khảo thí Vật lí Chuẩn GDPT 2018</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                {branding.schoolName}
              </h1>

              <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed max-w-2xl drop-shadow-md">
                {branding.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setAppMode('student')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Vào Thi Trực Tuyến</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleRequestTeacherMode}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 backdrop-blur-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-indigo-400/30"
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Bảng Điều Khiển Giáo Viên</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* CHẾ ĐỘ HỌC SINH */}
      {appMode === 'student' && (
        <main className="w-full px-2 sm:px-4 py-2">
          {isLoadingAssignedExam ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <h3 className="font-black text-lg text-slate-800">Đang tải đề thi từ máy chủ...</h3>
              <p className="text-xs text-slate-500 max-w-sm">Hệ thống đang đồng bộ câu hỏi và cấu trúc bài thi về thiết bị của em.</p>
            </div>
          ) : !isRegistered ? (
            <div className="min-h-[80vh] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
                
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                    <UserCheck className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Xác Nhận Thông Tin Thí Sinh
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {safeCurrentExam.title} (Mã đề: <span className="font-mono font-bold text-indigo-600">{activeCode}</span>)
                  </p>
                </div>

                <form onSubmit={handleStartExamWithRegistration} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Họ và tên thí sinh <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="text"
                      required
                      value={candidateInfo.name}
                      onChange={(e) => setCandidateInfo({ ...candidateInfo, name: e.target.value })}
                      placeholder="Ví dụ: Nguyễn Văn An"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-sm text-slate-900 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                        Lớp <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        value={candidateInfo.studentClass}
                        onChange={(e) => setCandidateInfo({ ...candidateInfo, studentClass: e.target.value })}
                        placeholder="Ví dụ: 11A1"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-sm text-slate-900 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                        Số báo danh (SBD) <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        value={candidateInfo.candidateNumber}
                        onChange={(e) => setCandidateInfo({ ...candidateInfo, candidateNumber: e.target.value })}
                        placeholder="Ví dụ: 1101"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-sm text-slate-900 transition font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Bắt Đầu Làm Bài Thi Ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
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

              {/* HIỂN THỊ KẾT QUẢ VỚI LỚP BẢO VỆ CHỐNG TRẮNG TRANG */}
              {studentExamPhase === 'student_results' && (
                <ResultsErrorBoundary
                  evaluation={evaluation}
                  candidateInfo={candidateInfo}
                  exam={safeCurrentExam}
                  onRetake={() => {
                    setAnswers({});
                    setStudentExamPhase('launch');
                    setTimeRemainingSeconds((safeCurrentExam.durationMinutes || 45) * 60);
                  }}
                  onOpenTeacherMode={handleRequestTeacherMode}
                >
                  <ExamResults
                    exam={safeCurrentExam}
                    answers={answers || {}}
                    evaluation={evaluation || { totalScore: 0, detailedFeedback: [] }}
                    candidateInfo={candidateInfo}
                    timeRemainingSeconds={timeRemainingSeconds}
                    auditLog={auditLog}
                    onRetake={() => {
                      setAnswers({});
                      setStudentExamPhase('launch');
                      setTimeRemainingSeconds((safeCurrentExam.durationMinutes || 45) * 60);
                    }}
                    onOpenTeacherMode={handleRequestTeacherMode}
                    onOpenPrint={(printMode) => handleOpenPrint(printMode === 'exam_with_solutions' ? 'exam_with_solutions' : 'exam_only')}
                  />
                </ResultsErrorBoundary>
              )}
            </>
          )}
        </main>
      )}

      {/* CHẾ ĐỘ BẢNG ĐIỀU KHIỂN GIÁO VIÊN */}
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
          onPreviewAsStudent={() => {
            setIsRegistered(false);
            setAppMode('student');
          }}
          onNavigateHome={() => setAppMode('home')}
          onRefreshData={fetchAllDataFromMongo}
        />
      )}

      {/* CHẾ ĐỘ IN ẤN */}
      {appMode === 'print' && (
        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200 print:hidden">
            <button
              type="button"
              onClick={handleRequestTeacherMode}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại Bảng điều khiển</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Xác nhận In ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL MÃ PIN */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 print:hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner border border-amber-200">
              <KeyRound className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-black text-slate-900 text-lg">Xác Thực Quyền Giáo Viên</h3>
              <p className="text-xs text-slate-500 mt-1">Vui lòng nhập mã PIN bảo mật để tiếp tục.</p>
            </div>

            <form onSubmit={handleVerifyTeacherPin} className="space-y-4">
              <input
                type="password"
                autoFocus
                maxLength={10}
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError(null);
                }}
                placeholder="Nhập mã PIN (Mặc định: 123456)"
                className="w-full px-4 py-3 text-center tracking-widest text-lg font-black rounded-2xl border border-slate-300 focus:border-indigo-600 outline-none transition"
              />

              {pinError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {pinError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}