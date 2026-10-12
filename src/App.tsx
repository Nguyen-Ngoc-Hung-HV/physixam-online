import React, { useState, useEffect, useRef } from 'react';
import { Exam, StudentAnswers, AntiCheatConfig, ViolationEvent, StudentSubmission, ExamVariantBundle } from './types/exam';
import { StudentExamLaunch } from './components/StudentExamLaunch';
import { ExamResults, PrintMode } from './components/ExamResults';
import { TeacherDashboard } from './components/TeacherDashboard';
import { safeStorage } from './utils/safeStorage';
import { ExamPackage, ExamAssignmentInfo } from './types/curriculum';
import { 
  Home, LayoutDashboard, GraduationCap, Code, Copy, Check, X, 
  Printer, ArrowLeft, Image as ImageIcon, Sparkles, RefreshCw, 
  UploadCloud, ArrowRight, BookOpen, ShieldCheck, Atom, FileText, CheckCircle2
} from 'lucide-react';

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

const PRESET_BANNERS = [
  {
    name: 'Sóng & Lượng tử Xanh Chàm',
    url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=2070&auto=format&fit=crop'
  },
  {
    name: 'Vũ trụ & Hạt cơ bản',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop'
  },
  {
    name: 'Điện từ trường & Phòng thí nghiệm',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070&auto=format&fit=crop'
  },
  {
    name: 'Công nghệ & Ánh sáng Laser',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop'
  }
];

const DEFAULT_BRANDING = {
  schoolName: 'TRƯỜNG THPT HÙNG VƯƠNG',
  subtitle: 'HỆ THỐNG KHẢO THÍ VẬT LÍ TRỰC TUYẾN • CHƯƠNG TRÌNH GDPT 2018',
  logoUrl: '',
  bannerUrl: PRESET_BANNERS[0].url
};

export default function App() {
  const [appMode, setAppMode] = useState<'home' | 'student' | 'teacher' | 'print'>('home');
  const [activePrintMode, setActivePrintMode] = useState<'exam_only' | 'exam_with_solutions' | 'matrix'>('exam_only');

  const [branding, setBranding] = useState(() => {
    try {
      const saved = localStorage.getItem('physixam_branding');
      return saved ? JSON.parse(saved) : DEFAULT_BRANDING;
    } catch (e) {
      return DEFAULT_BRANDING;
    }
  });

  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [brandingDraft, setBrandingDraft] = useState(branding);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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
    const fetchSubmissionsFromMongo = async () => {
      try {
        const response = await fetch('/api/submissions');
        if (response.ok) {
          const cloudData = await response.json();
          if (Array.isArray(cloudData) && cloudData.length > 0) {
            setSubmissions(cloudData);
            try {
              if (safeStorage?.setItem) {
                safeStorage.setItem('physixam_submissions', JSON.stringify(cloudData));
              } else {
                localStorage.setItem('physixam_submissions', JSON.stringify(cloudData));
              }
            } catch (e) {}
          }
        }
      } catch (err) {}
    };
    fetchSubmissionsFromMongo();
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

  const handleSaveBranding = () => {
    setBranding(brandingDraft);
    try {
      localStorage.setItem('physixam_branding', JSON.stringify(brandingDraft));
    } catch (e) {}
    setIsBrandingModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'bannerUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setBrandingDraft((prev: any) => ({ ...prev, [field]: reader.result }));
        }
      };
      reader.readAsDataURL(file);
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
      const serialized = JSON.stringify(targetExam);
      safeStorage?.setItem ? safeStorage.setItem('physixam_current_exam', serialized) : localStorage.setItem('physixam_current_exam', serialized);
    } catch (e) {}

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
      safeStorage?.setItem ? safeStorage.setItem('physixam_current_exam', serialized) : localStorage.setItem('physixam_current_exam', serialized);
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
    if (switchToStudent) setAppMode('student');
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

  const handleSubmitExam = async () => {
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
      detailedFeedback.push({ questionId: q.id, isCorrect, pointsAwarded });
    });

    const finalScore = Number(Math.min(10, Math.max(0, score)).toFixed(2));
    const evalResult = { totalScore: finalScore, detailedFeedback };
    setEvaluation(evalResult);

    const safeExamCode = exam?.code || activeCode || '101';
    const newSub: StudentSubmission = {
      id: `sub-${Date.now()}`,
      studentName: candidateInfo.name,
      candidateName: candidateInfo.name,
      studentClass: candidateInfo.studentClass,
      candidateNumber: candidateInfo.candidateNumber,
      examCode: safeExamCode,
      totalScore: finalScore,
      score: finalScore,
      submittedAt: new Date().toLocaleString('vi-VN'),
      timeSpentSeconds: Math.max(0, ((exam?.durationMinutes || 45) * 60) - timeRemainingSeconds),
      submissionReason: 'normal',
      violationCount: auditLog.violations.length,
      answers: answers || {},
      auditLog,
      evaluation: evalResult
    } as any;

    setSubmissions((prev) => {
      const updated = [newSub, ...(prev || [])];
      try {
        safeStorage?.setItem ? safeStorage.setItem('physixam_submissions', JSON.stringify(updated)) : localStorage.setItem('physixam_submissions', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub)
      }).catch((e) => console.warn('Lỗi ghi MongoDB Atlas:', e));
    } catch (err) {}

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
      await fetch(`/api/submissions/${submissionId}`, { method: 'DELETE' });
    } catch (err) {}
  };

  const handleClearSubmissions = async () => {
    setSubmissions([]);
    try {
      safeStorage?.setItem ? safeStorage.setItem('physixam_submissions', JSON.stringify([])) : localStorage.setItem('physixam_submissions', JSON.stringify([]));
    } catch (e) {}

    try {
      await fetch('/api/submissions/clear-all', { method: 'DELETE' });
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

  const safeCurrentExam = (exam && Array.isArray(exam.questions) && exam.questions.length > 0) ? exam : DEFAULT_EXAM;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* 1. THANH ĐIỀU HƯỚNG NỔI (FLOATING NAVBAR) HIỆN ĐẠI */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 py-3 print:hidden">
        <div className="max-w-7xl mx-auto backdrop-blur-xl bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl shadow-slate-950/20 px-4 py-2.5 flex items-center justify-between gap-4">
          
          {/* Logo & Brand Identity */}
          <div 
            onClick={() => setAppMode('home')}
            className="flex items-center gap-3 cursor-pointer group select-none min-w-0"
            title="Về Trang chủ Pano"
          >
            {branding.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt="Logo" 
                className="w-9 h-9 rounded-xl object-contain bg-white/10 p-1 border border-white/20 group-hover:scale-105 transition shadow-sm shrink-0" 
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center font-black text-white text-sm shadow-md group-hover:scale-105 transition shrink-0">
                <Atom className="w-5 h-5 animate-spin-slow" />
              </div>
            )}
            <div className="min-w-0">
              <span className="font-black text-sm tracking-wide text-white group-hover:text-indigo-300 transition truncate block">
                {branding.schoolName}
              </span>
              <span className="text-3xs text-indigo-300/90 font-mono tracking-wider truncate block">
                {branding.subtitle}
              </span>
            </div>
          </div>

          {/* Right Action Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBrandingDraft(branding);
                setIsBrandingModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
              title="Tùy biến Logo và Hình nền Pano Banner"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Đổi Pano / Logo</span>
            </button>

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
                onClick={() => setAppMode('teacher')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  appMode === 'teacher'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
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
        </div>
      </header>

      {/* ========================================================================= */}
      {/* CHẾ ĐỘ 1: CỔNG THÔNG TIN TRANG CHỦ (PANO BANNER & CÁC LỐI VÀO CHÍNH)      */}
      {/* ========================================================================= */}
      {appMode === 'home' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-8 animate-in fade-in duration-300">
          
          {/* PANO BANNER HERO CARD HOÀNH TRÁNG */}
          <section className="relative rounded-3xl overflow-hidden shadow-2xl border border-indigo-900/40 bg-slate-950 min-h-[380px] sm:min-h-[440px] flex items-center">
            
            {/* Ảnh nền Pano với Overlay đa tầng */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-700 filter brightness-75 scale-105"
              style={{ backgroundImage: `url(${branding.bannerUrl || PRESET_BANNERS[0].url})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-indigo-950/70" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.25),transparent_50%)]" />

            {/* Nội dung Banner */}
            <div className="relative z-10 p-6 sm:p-12 lg:p-16 max-w-4xl space-y-5">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs font-black backdrop-blur-md shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>PhysiXam Online • Hệ thống Khảo thí Vật lí Chuẩn GDPT 2018</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] drop-shadow-lg">
                {branding.schoolName}
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-slate-200 font-medium leading-relaxed max-w-2xl drop-shadow-md">
                {branding.subtitle}
              </p>

              {/* Nút hành động chính */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAppMode('student')}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center gap-2.5 cursor-pointer hover:scale-[1.03] active:scale-[0.98]"
                >
                  <GraduationCap className="w-5 h-5" />
                  <span>Vào Thi Trực Tuyến</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setAppMode('teacher')}
                  className="px-6 py-3.5 rounded-2xl bg-indigo-600/90 hover:bg-indigo-600 text-white font-black text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2.5 backdrop-blur-md cursor-pointer hover:scale-[1.03] active:scale-[0.98] border border-indigo-400/30"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Bảng Điều Khiển Giáo Viên</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBrandingDraft(branding);
                    setIsBrandingModalOpen(true);
                  }}
                  className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition cursor-pointer flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4 text-amber-300" />
                  <span>Tùy biến Banner</span>
                </button>
              </div>
            </div>
          </section>

          {/* 3 THẺ ĐIỀU HƯỚNG TỔNG QUAN CHUYÊN NGHIỆP */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div 
              onClick={() => setAppMode('student')}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1.5 space-y-4 group relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black group-hover:scale-110 transition shadow-xs border border-emerald-100">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 group-hover:text-emerald-600 transition">
                  Phòng Thi Trực Tuyến Học Sinh
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  Thi trực tuyến với đầy đủ 3 phần thi theo cấu trúc Bộ GD&ĐT (Trắc nghiệm, Đúng/Sai, Điền số), KaTeX và tính năng giám sát thi tự động.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 pt-1">
                <span>Vào làm bài ngay</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </div>

            <div 
              onClick={() => setAppMode('teacher')}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1.5 space-y-4 group relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black group-hover:scale-110 transition shadow-xs border border-indigo-100">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 group-hover:text-indigo-600 transition">
                  Hệ Thống Quản Trị Giáo Viên
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  Trọn bộ 6 Panel: Ngân hàng đề GDPT 2018, bóc tách Word, trộn đề, in ấn chuẩn A4 và đồng bộ dữ liệu MongoDB Atlas.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-indigo-600 pt-1">
                <span>Mở bảng điều khiển 6 Panel</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black shadow-xs border border-amber-100">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-3xs bg-amber-100 text-amber-800">
                      Mã: {activeCode}
                    </span>
                    <span className="text-3xs text-emerald-600 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Đã sẵn sàng
                    </span>
                  </div>
                  <h3 className="font-black text-base text-slate-900 line-clamp-1">
                    {safeCurrentExam.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Thời lượng: {safeCurrentExam.durationMinutes || 45} phút • {safeCurrentExam.questions.length} câu hỏi
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAppMode('student')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition text-center cursor-pointer shadow-xs"
                >
                  Làm đề này
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPrint('exam_only')}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
                  title="In đề thi này"
                >
                  <Printer className="w-4 h-4 text-indigo-600" />
                </button>
              </div>
            </div>

          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CÁC CHẾ ĐỘ LÀM VIỆC CHUYÊN SÂU                                           */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 py-4 pb-16 print:p-0 print:m-0 print:max-w-none">
        
        {/* CHẾ ĐỘ 2: HỌC SINH LÀM BÀI / KẾT QUẢ */}
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

        {/* CHẾ ĐỘ 3: BẢNG ĐIỀU KHIỂN GIÁO VIÊN */}
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
            onNavigateHome={() => setAppMode('home')}
          />
        )}

        {/* CHẾ ĐỘ 4: IN ẤN */}
        {appMode === 'print' && (
          <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
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

      {/* MODAL CÀI ĐẶT PANO BANNER & LOGO CHUYÊN NGHIỆP */}
      {isBrandingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 print:hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">Tùy Biến Logo & Pano Banner</h3>
                  <p className="text-xs text-slate-500">Cá nhân hóa thương hiệu trường hoặc bộ môn của Thầy</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBrandingModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5 text-xs">
              
              <div>
                <label className="block font-black text-slate-700 mb-1.5 uppercase text-3xs tracking-wider">
                  Tên Trường / Tổ Bộ Môn:
                </label>
                <input
                  type="text"
                  value={brandingDraft.schoolName}
                  onChange={(e) => setBrandingDraft({ ...brandingDraft, schoolName: e.target.value })}
                  placeholder="Ví dụ: TRƯỜNG THPT HÙNG VƯƠNG"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 outline-none font-bold text-sm bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1.5 uppercase text-3xs tracking-wider">
                  Khẩu hiệu / Tiêu đề phụ:
                </label>
                <input
                  type="text"
                  value={brandingDraft.subtitle}
                  onChange={(e) => setBrandingDraft({ ...brandingDraft, subtitle: e.target.value })}
                  placeholder="Ví dụ: HỆ THỐNG KHẢO THÍ VẬT LÍ TRỰC TUYẾN • CHƯƠNG TRÌNH GDPT 2018"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 outline-none font-medium text-xs bg-slate-50 focus:bg-white transition"
                />
              </div>

              {/* Tải Logo */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-black text-slate-800 uppercase text-3xs tracking-wider">
                    Logo Nhà Trường / Watermark:
                  </label>
                  {brandingDraft.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setBrandingDraft({ ...brandingDraft, logoUrl: '' })}
                      className="text-rose-600 hover:text-rose-700 font-bold text-3xs cursor-pointer"
                    >
                      Xóa Logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={brandingDraft.logoUrl}
                    onChange={(e) => setBrandingDraft({ ...brandingDraft, logoUrl: e.target.value })}
                    placeholder="Dán URL Logo hoặc bấm tải tệp từ máy..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition shrink-0"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Tải tệp ảnh</span>
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'logoUrl')}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Chọn Pano Banner có sẵn hoặc tải lên */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <label className="font-black text-slate-800 uppercase text-3xs tracking-wider block">
                  Chọn Mẫu Pano Banner Vật Lí Đẹp Sẵn Có:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_BANNERS.map((preset) => {
                    const isSelected = brandingDraft.bannerUrl === preset.url;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setBrandingDraft({ ...brandingDraft, bannerUrl: preset.url })}
                        className={`relative rounded-xl overflow-hidden border-2 aspect-video group cursor-pointer transition ${
                          isSelected ? 'border-indigo-600 ring-2 ring-indigo-600/30' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                        <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center p-1 text-center">
                          <span className="text-white text-3xs font-bold leading-tight drop-shadow-md">{preset.name}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-md">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <label className="font-bold text-slate-600 block mb-1">
                    Hoặc dán URL / Tải tệp Pano riêng của Thầy:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={brandingDraft.bannerUrl}
                      onChange={(e) => setBrandingDraft({ ...brandingDraft, bannerUrl: e.target.value })}
                      placeholder="Dán đường dẫn URL banner..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition shrink-0"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Tải ảnh</span>
                    </button>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'bannerUrl')}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBrandingDraft(DEFAULT_BRANDING)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Khôi phục mặc định</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBrandingModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveBranding}
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 cursor-pointer transition hover:scale-105 active:scale-95"
                >
                  Lưu & Áp Dụng Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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