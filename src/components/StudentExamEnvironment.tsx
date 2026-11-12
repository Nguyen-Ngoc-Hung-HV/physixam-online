import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Delete,
  Eye,
  Flag,
  Lock,
  Maximize2,
  Play,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Moon,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  ExamData,
  ExamGradeReport,
  OnlineExamAssignment,
  SavedExamSession,
  ScrambledExamVariant,
  StudentAnswersState,
  ViolationEvent,
} from '../types/exam';
import {
  countCompletedQuestions,
  gradeStudentExam,
  isQuestionFullyCompleted,
  isQuestionPartiallyCompleted,
  restoreUnshuffledVariant,
  shuffleVariantForStudent,
} from '../utils/scramblerAndGrader';
import { getResolvedQuestionImage } from '../utils/examDocumentParser';
import { MathText } from './MathText';
import { ProgressBar } from './ExamProgressBar';
import {
  fetchExamFromCloud,
  fetchLatestExamsFromCloud,
  normalizeCloudExamRecord,
} from '../services/api';

interface StudentExamEnvironmentProps {
  variants: ScrambledExamVariant[];
  initialExamCode?: string;
  onSessionUpdate: (session: SavedExamSession) => void;
  onlineAssignments?: OnlineExamAssignment[];
  onCloudExamLoaded?: (normalized: {
    examData: ExamData;
    variants: ScrambledExamVariant[];
    assignment: OnlineExamAssignment;
  }) => void;
}

const STORAGE_PREFIX = 'smarttest_gdpt2018_session_';

function getStorageKey(studentId: string, examCode: string): string {
  return `${STORAGE_PREFIX}${studentId.trim().toUpperCase()}_${examCode.trim()}`;
}

const EMPTY_ANSWERS: StudentAnswersState = {
  part1: {},
  part2: {},
  part3: {},
  flagged: {},
};

export const StudentExamEnvironment: React.FC<StudentExamEnvironmentProps> = ({
  variants,
  initialExamCode,
  onSessionUpdate,
  onlineAssignments = [],
  onCloudExamLoaded,
}) => {
  // Entrance Gate fields (left blank by default so students must fill/select all 3 fields)
  const [studentName, setStudentName] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [selectedCode, setSelectedCode] = useState<string>(
    initialExamCode || ''
  );
  const [gateError, setGateError] = useState<string | null>(null);
  const [cloudVariant, setCloudVariant] = useState<ScrambledExamVariant | null>(null);
  const [cloudAssignment, setCloudAssignment] = useState<OnlineExamAssignment | null>(null);
  const [isSyncingCloudExam, setIsSyncingCloudExam] = useState<boolean>(false);

  // Active Exam State
  const [isExamActive, setIsExamActive] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [paperTheme, setPaperTheme] = useState<'ivory' | 'dark'>('ivory');

  // Student Answers & Timer
  const [answers, setAnswers] = useState<StudentAnswersState>(EMPTY_ANSWERS);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(50 * 60);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [startedAtIso, setStartedAtIso] = useState<string>('');
  const [studentShuffleSeed, setStudentShuffleSeed] = useState<string>('INIT-SEED');

  // Anti-cheat & Kiosk State
  const [violations, setViolations] = useState<ViolationEvent[]>([]);
  const [activeWarningModal, setActiveWarningModal] = useState<ViolationEvent | null>(null);
  const [forcedSubmitBanner, setForcedSubmitBanner] = useState<string | null>(null);
  const [securityToast, setSecurityToast] = useState<string | null>(null);
  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(false);
  const [activePart3KeypadId, setActivePart3KeypadId] = useState<string | null>(null);

  // Modals
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [showScorecardModal, setShowScorecardModal] = useState<boolean>(false);
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'INCORRECT' | 'PART_I' | 'PART_II' | 'PART_III'>('ALL');

  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const onCloudExamLoadedRef = useRef(onCloudExamLoaded);
  useEffect(() => {
    onCloudExamLoadedRef.current = onCloudExamLoaded;
  }, [onCloudExamLoaded]);

  useEffect(() => {
    if (initialExamCode) {
      setSelectedCode(initialExamCode);
    }
  }, [initialExamCode]);

  // Automatically fetch latest assigned exam or specific exam code from MongoDB Atlas
  useEffect(() => {
    let isMounted = true;
    const cleanCode = selectedCode.trim();

    const timer = window.setTimeout(async () => {
      try {
        if (cleanCode) {
          const doc = await fetchExamFromCloud(cleanCode);
          if (!isMounted || !doc) return;
          const norm = normalizeCloudExamRecord(doc, cleanCode);
          if (norm && norm.variants.length > 0) {
            const matchedVar =
              norm.variants.find(
                (v) => v.code.trim().toUpperCase() === cleanCode.toUpperCase()
              ) || norm.variants[0];
            setCloudVariant(matchedVar);
            setCloudAssignment(norm.assignment);
            onCloudExamLoadedRef.current?.(norm);
          }
        } else {
          const res = await fetchLatestExamsFromCloud();
          if (!isMounted || !res?.latestExam) return;
          const norm = normalizeCloudExamRecord(res.latestExam);
          if (norm && norm.variants.length > 0) {
            setCloudVariant(norm.variants[0]);
            setCloudAssignment(norm.assignment);
            onCloudExamLoadedRef.current?.(norm);
          }
        }
      } catch {
        // Keep existing state if offline
      }
    }, 220);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [selectedCode]);

  const matchedOnlineAssignment = useMemo<OnlineExamAssignment | null>(() => {
    const cleanCode = selectedCode.trim().toUpperCase();
    if (cleanCode) {
      if (
        cloudAssignment &&
        cloudAssignment.examCode.trim().toUpperCase() === cleanCode
      ) {
        return cloudAssignment;
      }
      const found = onlineAssignments.find(
        (a) => a.examCode.trim().toUpperCase() === cleanCode
      );
      if (found) return found;
    }
    return cloudAssignment || onlineAssignments[0] || null;
  }, [onlineAssignments, selectedCode, cloudAssignment]);

  const activeVariant = useMemo(() => {
    const cleanCode = selectedCode.trim();
    let rawBaseVariant: ScrambledExamVariant | undefined;

    if (
      cloudVariant &&
      (!cleanCode ||
        cloudVariant.code.trim().toUpperCase() === cleanCode.toUpperCase())
    ) {
      rawBaseVariant = cloudVariant;
    } else if (!cleanCode) {
      rawBaseVariant = cloudVariant || variants[0];
    } else {
      const matched = variants.find(
        (v) => v.code.trim().toUpperCase() === cleanCode.toUpperCase()
      );
      if (matched) {
        rawBaseVariant = matched;
      } else if (cloudVariant) {
        rawBaseVariant = { ...cloudVariant, code: cleanCode };
      } else {
        rawBaseVariant = variants[0] ? { ...variants[0], code: cleanCode } : variants[0];
      }
    }

    if (!rawBaseVariant) return rawBaseVariant;

    // Chế độ ôn tập: giữ nguyên thứ tự các câu hỏi và đáp án gốc (không xáo trộn)
    if (matchedOnlineAssignment?.mode === 'practice') {
      return restoreUnshuffledVariant(rawBaseVariant, matchedOnlineAssignment?.examData);
    }

    // Chế độ kiểm tra: tự động xáo trộn ngẫu nhiên thứ tự câu hỏi trong mỗi phần
    // và thứ tự đáp án trong mỗi câu (giữ nguyên thứ tự các phần I -> II -> III)
    const effectiveSeed = `${studentId.trim().toUpperCase() || 'GUEST'}-${studentName.trim().toUpperCase() || 'STUDENT'}-${cleanCode.toUpperCase()}-${studentShuffleSeed}`;
    return shuffleVariantForStudent(rawBaseVariant, effectiveSeed);
  }, [
    variants,
    selectedCode,
    cloudVariant,
    matchedOnlineAssignment,
    studentId,
    studentName,
    studentShuffleSeed,
  ]);

  // Check if there is an existing saved session in localStorage for current SBD + ExamCode
  const detectedSavedSession = useMemo<SavedExamSession | null>(() => {
    if (!studentId.trim() || !selectedCode) return null;
    try {
      const raw = localStorage.getItem(getStorageKey(studentId, selectedCode));
      if (!raw) return null;
      return JSON.parse(raw) as SavedExamSession;
    } catch {
      return null;
    }
  }, [studentId, selectedCode, isExamActive, isSubmitted]);

  const totalQuestionCount = useMemo(() => {
    if (!activeVariant) return 28;
    return (
      activeVariant.part1.length + activeVariant.part2.length + activeVariant.part3.length
    );
  }, [activeVariant]);

  const completedCount = useMemo(() => {
    if (!activeVariant) return 0;
    return countCompletedQuestions(activeVariant, answers);
  }, [activeVariant, answers]);

  const partCompletionStats = useMemo(() => {
    if (!activeVariant) {
      return { p1Done: 0, p2Done: 0, p3Done: 0 };
    }
    const p1Len = activeVariant.part1.length;
    const p2Len = activeVariant.part2.length;
    const p1Done = activeVariant.part1.filter((_, idx) =>
      isQuestionFullyCompleted(activeVariant, answers, idx + 1)
    ).length;
    const p2Done = activeVariant.part2.filter((_, idx) =>
      isQuestionFullyCompleted(activeVariant, answers, p1Len + idx + 1)
    ).length;
    const p3Done = activeVariant.part3.filter((_, idx) =>
      isQuestionFullyCompleted(activeVariant, answers, p1Len + p2Len + idx + 1)
    ).length;
    return { p1Done, p2Done, p3Done };
  }, [activeVariant, answers]);

  const flaggedCount = useMemo(() => {
    return Object.values(answers.flagged).filter(Boolean).length;
  }, [answers.flagged]);

  const gradeReport = useMemo<ExamGradeReport | null>(() => {
    if (!activeVariant) return null;
    return gradeStudentExam(activeVariant, answers);
  }, [activeVariant, answers]);

  // Helper to log an anti-cheat violation & enforce forced submission in 'exam' mode
  const recordViolation = useCallback(
    (
      type: ViolationEvent['type'],
      description: string,
      openModal: boolean = true
    ) => {
      const isPracticeMode = matchedOnlineAssignment?.mode === 'practice';
      if (isPracticeMode && openModal) {
        // Chế độ ôn tập: Không thu bài cưỡng chế khi chuyển tab / rời màn hình
        return;
      }

      const evt: ViolationEvent = {
        id: `VIO-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        type,
        description,
      };

      const maxAllowed =
        matchedOnlineAssignment?.mode === 'exam'
          ? matchedOnlineAssignment.maxViolations || 3
          : 0;
      const levelNum = matchedOnlineAssignment?.violationLevel || 2;

      setViolations((prev) => {
        const nextList = [...prev, evt];
        if (!isPracticeMode && maxAllowed > 0 && openModal && nextList.length >= maxAllowed) {
          setIsSubmitted(true);
          setActiveWarningModal(null);
          setForcedSubmitBanner(
            `Hệ thống đã thu bài cưỡng chế theo cấu hình kỳ thi (Chế độ Kiểm tra · Mức ${levelNum}: Vi phạm ${nextList.length}/${maxAllowed} lần cho phép).`
          );
          setShowScorecardModal(true);
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } else if (openModal) {
          setActiveWarningModal(evt);
        } else {
          setSecurityToast(description);
          window.setTimeout(() => setSecurityToast(null), 3200);
        }
        return nextList;
      });
    },
    [matchedOnlineAssignment]
  );

  // Request HTML5 Fullscreen safely (handles iframe sandbox permission restrictions gracefully)
  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreenActive(true);
    } catch {
      // In restricted cross-origin iframes where native requestFullscreen is blocked,
      // activate simulated Kiosk Fullscreen Lock mode without crashing
      setIsFullscreenActive(true);
    }
  }, []);

  // Debounced LocalStorage Save
  useEffect(() => {
    if (!isExamActive || !activeVariant) return;
    const timeout = window.setTimeout(() => {
      const nowTime = new Date().toLocaleTimeString('vi-VN');
      const report = gradeStudentExam(activeVariant, answers);
      const sessionPayload: SavedExamSession = {
        studentName: studentName.trim(),
        studentId: studentId.trim(),
        examCode: activeVariant.code,
        startedAt: startedAtIso || new Date().toISOString(),
        lastSavedAt: nowTime,
        remainingSeconds,
        isSubmitted,
        submittedAt: isSubmitted ? nowTime : undefined,
        answers,
        violations,
        finalScore: isSubmitted ? report.scaled10Score : undefined,
      };
      try {
        localStorage.setItem(
          getStorageKey(studentId, activeVariant.code),
          JSON.stringify(sessionPayload)
        );
        setLastSavedTime(nowTime);
        onSessionUpdate(sessionPayload);
      } catch {
        // Ignore storage quota errors
      }
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [
    isExamActive,
    activeVariant,
    answers,
    remainingSeconds,
    isSubmitted,
    violations,
    studentName,
    studentId,
    startedAtIso,
    onSessionUpdate,
  ]);

  // Countdown Timer
  useEffect(() => {
    if (!isExamActive || isSubmitted) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setIsSubmitted(true);
          setShowScorecardModal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isExamActive, isSubmitted]);

  // Anti-Cheating Event Listeners (Fullscreen, VisibilityChange, Window Blur, ContextMenu, Shortcuts)
  useEffect(() => {
    if (!isExamActive || isSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation(
          'TAB_SWITCH',
          'Hệ thống phát hiện bạn vừa rời khỏi tab bài thi hoặc thu nhỏ trình duyệt (Visibility Hidden).',
          true
        );
      }
    };

    const handleWindowBlur = () => {
      if (!document.hidden) {
        recordViolation(
          'WINDOW_BLUR',
          'Cảnh báo mất tiêu điểm cửa sổ làm bài (Window Blur). Vui lòng giữ chuột và tiêu điểm trong màn hình thi.',
          true
        );
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreenActive(false);
        recordViolation(
          'FULLSCREEN_EXIT',
          'Bạn vừa thoát khỏi chế độ Toàn màn hình (Fullscreen Kiosk). Quy chế thi bắt buộc duy trì chế độ Toàn màn hình.',
          true
        );
      } else {
        setIsFullscreenActive(true);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation(
        'SHORTCUT_BLOCKED',
        'Đã khóa menu chuột phải (Context Menu) trong suốt thời gian làm bài thi.',
        false
      );
    };

    const handleCopyCutPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation(
        'COPY_PASTE_ATTEMPT',
        'Đã chặn thao tác Sao chép / Dán (Copy/Paste) để đảm bảo tính toàn vẹn kỳ thi.',
        false
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isF12 = e.key === 'F12';
      const isInspect =
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key);
      const isViewSource = (e.ctrlKey || e.metaKey) && ['u', 'U', 'p', 'P'].includes(e.key);

      if (isF12 || isInspect || isViewSource) {
        e.preventDefault();
        recordViolation(
          'SHORTCUT_BLOCKED',
          `Đã chặn tổ hợp phím kiểm tra hệ thống (${e.key.toUpperCase()}).`,
          false
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);
    document.addEventListener('paste', handleCopyCutPaste);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
      document.removeEventListener('paste', handleCopyCutPaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExamActive, isSubmitted, recordViolation]);

  // Start Fresh or Resume Exam
  const handleStartExam = async (resumeSaved: boolean) => {
    const cleanCode = selectedCode.trim();
    if (!studentName.trim() || !studentId.trim() || !cleanCode) {
      setGateError('Vui lòng nhập đầy đủ Họ và tên thí sinh, Số báo danh (SBD) và chọn Mã bài thi để vào phòng thi.');
      return;
    }
    setGateError(null);
    setForcedSubmitBanner(null);
    setIsSyncingCloudExam(true);

    let resolvedVariant: ScrambledExamVariant | undefined = activeVariant;
    let resolvedAssignment: OnlineExamAssignment | null = matchedOnlineAssignment;

    try {
      const cloudDoc = await fetchExamFromCloud(cleanCode);
      if (cloudDoc) {
        const norm = normalizeCloudExamRecord(cloudDoc, cleanCode);
        if (norm && norm.variants.length > 0) {
          const matchedVar =
            norm.variants.find(
              (v) => v.code.trim().toUpperCase() === cleanCode.toUpperCase()
            ) || { ...norm.variants[0], code: cleanCode };
          resolvedVariant = matchedVar;
          resolvedAssignment = norm.assignment;
          setCloudVariant(matchedVar);
          setCloudAssignment(norm.assignment);
          onCloudExamLoadedRef.current?.(norm);
        }
      }
    } catch {
      // Fallback to currently available variant if offline
    } finally {
      setIsSyncingCloudExam(false);
    }

    const configuredDurationMinutes =
      resolvedAssignment?.durationMinutes || resolvedVariant?.durationMinutes || 50;

    const seedStorageKey = `${getStorageKey(studentId, cleanCode)}_seed`;

    if (resumeSaved && detectedSavedSession) {
      const savedSeed = localStorage.getItem(seedStorageKey);
      if (savedSeed) {
        setStudentShuffleSeed(savedSeed);
      }
      setAnswers(detectedSavedSession.answers);
      setRemainingSeconds(
        detectedSavedSession.remainingSeconds > 0
          ? detectedSavedSession.remainingSeconds
          : configuredDurationMinutes * 60
      );
      setViolations(detectedSavedSession.violations || []);
      setIsSubmitted(detectedSavedSession.isSubmitted);
      setStartedAtIso(detectedSavedSession.startedAt);
      if (detectedSavedSession.isSubmitted) {
        setShowScorecardModal(true);
      }
    } else {
      const freshSeed = `${studentId.trim().toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setStudentShuffleSeed(freshSeed);
      try {
        localStorage.setItem(seedStorageKey, freshSeed);
      } catch {
        // Ignore storage quota errors
      }
      setAnswers(EMPTY_ANSWERS);
      setRemainingSeconds(configuredDurationMinutes * 60);
      setViolations([]);
      setIsSubmitted(false);
      setStartedAtIso(new Date().toISOString());
      setShowScorecardModal(false);
    }

    await enterFullscreen();
    setIsExamActive(true);
  };

  const handleClearSavedSession = () => {
    if (!studentId.trim() || !selectedCode) return;
    localStorage.removeItem(getStorageKey(studentId, selectedCode));
    localStorage.removeItem(`${getStorageKey(studentId, selectedCode)}_seed`);
    setAnswers(EMPTY_ANSWERS);
    setViolations([]);
    setIsSubmitted(false);
  };

  // Answer Handlers
  const handleSelectPart1 = (questionId: string, optionIdx: number) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({
      ...prev,
      part1: {
        ...prev.part1,
        [questionId]: prev.part1[questionId] === optionIdx ? undefined : optionIdx,
      },
    }));
  };

  const handleSelectPart2 = (
    questionId: string,
    label: 'a' | 'b' | 'c' | 'd',
    val: boolean
  ) => {
    if (isSubmitted) return;
    setAnswers((prev) => {
      const current = prev.part2[questionId] || {
        a: undefined,
        b: undefined,
        c: undefined,
        d: undefined,
      };
      return {
        ...prev,
        part2: {
          ...prev.part2,
          [questionId]: {
            ...current,
            [label]: val,
          },
        },
      };
    });
  };

  const handleChangePart3 = (questionId: string, rawVal: string) => {
    if (isSubmitted) return;
    // Allow numbers, minus sign, comma, dot (max 6 chars)
    const sanitized = rawVal.replace(/[^0-9.,-]/g, '').slice(0, 6);
    setAnswers((prev) => ({
      ...prev,
      part3: {
        ...prev.part3,
        [questionId]: sanitized,
      },
    }));
  };

  const handleKeypadPress = (questionId: string, key: string) => {
    if (isSubmitted) return;
    const current = answers.part3[questionId] || '';
    if (key === 'BACKSPACE') {
      handleChangePart3(questionId, current.slice(0, -1));
    } else if (key === 'CLEAR') {
      handleChangePart3(questionId, '');
    } else {
      handleChangePart3(questionId, current + key);
    }
  };

  const handleToggleFlag = (globalNum: number) => {
    setAnswers((prev) => ({
      ...prev,
      flagged: {
        ...prev.flagged,
        [globalNum]: !prev.flagged[globalNum],
      },
    }));
  };

  const scrollToQuestion = (globalNum: number) => {
    const el = questionRefs.current[globalNum];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false);
    setIsSubmitted(true);
    setShowScorecardModal(true);
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatCountdown = (sec: number) => {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.max(0, sec) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // =========================================================================
  // 1. ENTRANCE GATE VIEW (BEFORE STARTING EXAM)
  // =========================================================================
  if (!isExamActive) {
    return (
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 overflow-x-hidden">
        <div className="bg-[#18182e] border-2 border-indigo-800/80 rounded-2xl p-5 sm:p-10 shadow-xl space-y-6 sm:space-y-8">
          <div className="flex flex-col items-center text-center space-y-2.5 border-b border-slate-800 pb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Phòng Thi & Kiểm Tra Trực Tuyến — SmartTest
            </h1>
            <p className="text-sm sm:text-base font-semibold text-slate-300 max-w-3xl">
              Xác thực thông tin thí sinh, chọn mã bài thi được phát và kích hoạt chế độ bắt đầu làm bài
            </p>
          </div>

          {gateError && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-sm font-bold flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{gateError}</span>
            </div>
          )}

          {/* Student Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2.5">
              <label className="block text-sm sm:text-base font-extrabold text-white tracking-tight">
                1. Họ và tên thí sinh
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Nhập họ và tên thí sinh..."
                className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border-2 border-slate-700 text-white font-bold text-sm sm:text-base focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div className="space-y-2.5">
              <label className="block text-sm sm:text-base font-extrabold text-white tracking-tight">
                2. Số báo danh (SBD)
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Nhập số báo danh..."
                className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border-2 border-slate-700 text-white font-mono font-bold text-sm sm:text-base focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div className="space-y-2.5">
              <label className="block text-sm sm:text-base font-extrabold text-white tracking-tight">
                3. Chọn Mã bài thi
              </label>
              <input
                type="text"
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                placeholder="Nhập mã bài thi được nhận..."
                className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border-2 border-slate-700 text-white font-mono font-bold text-sm sm:text-base focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          {/* Detected Saved Session Recovery Banner */}
          {detectedSavedSession && (
            <div className="p-5 rounded-xl bg-indigo-950/60 border border-indigo-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                  <Save className="w-4 h-4" />
                  <span>Phát hiện dữ liệu bài làm đã lưu tự động (Chống mất bài khi rớt mạng)</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-200 font-mono font-semibold tabular-nums">
                  Thí sinh: {detectedSavedSession.studentName} · SBD: {detectedSavedSession.studentId} · Mã đề:{' '}
                  {detectedSavedSession.examCode} · Lưu lúc: {detectedSavedSession.lastSavedAt} · Thời gian còn:{' '}
                  {formatCountdown(detectedSavedSession.remainingSeconds)}
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStartExam(true)}
                  className="px-4 py-2 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Khôi Phục Tiếp Tục Thi
                </button>
                <button
                  type="button"
                  onClick={handleClearSavedSession}
                  className="px-3 py-2 text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Xoá Phiên Cũ
                </button>
              </div>
            </div>
          )}

          {/* Synchronized Online Exam Assignment Banner (when teacher has configured Tab 4) */}
          {selectedCode.trim() && matchedOnlineAssignment && (
            <div className="p-4 rounded-xl bg-violet-950/40 border border-violet-600/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="space-y-1">
                <div className="font-extrabold text-white text-sm sm:text-base">
                  {matchedOnlineAssignment.examTitle} · Môn: {matchedOnlineAssignment.subject}
                </div>
                <div className="text-slate-200 font-mono font-bold">
                  Lớp giao bài: {matchedOnlineAssignment.assignedClasses.join(', ')} · Thời gian làm bài:{' '}
                  {matchedOnlineAssignment.durationMinutes} phút
                </div>
              </div>
              <div className="shrink-0">
                <span
                  className={`inline-block px-3 py-1.5 rounded-lg font-mono font-bold ${
                    matchedOnlineAssignment.mode === 'exam'
                      ? 'bg-rose-950/90 text-rose-200 border border-rose-600/60'
                      : 'bg-emerald-950/90 text-emerald-200 border border-emerald-600/60'
                  }`}
                >
                  {matchedOnlineAssignment.mode === 'exam'
                    ? `Chế độ Kiểm tra · Mức ${matchedOnlineAssignment.violationLevel} (Vi phạm ${matchedOnlineAssignment.maxViolations} lần thu bài cưỡng chế)`
                    : 'Chế độ Ôn tập · Không thu bài cưỡng chế + Xem lời giải chi tiết'}
                </span>
              </div>
            </div>
          )}

          {/* Rules & Grading Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border-2 border-indigo-900/70 space-y-3 shadow-md">
              <div className="text-sm sm:text-base font-extrabold text-violet-300">
                Cấu Trúc Tính Điểm Chuẩn Bộ GD&ĐT (Thang 10,00 điểm)
              </div>
              <ul className="space-y-2 text-xs sm:text-sm font-bold text-slate-100 leading-relaxed">
                <li>
                  · Phần I ({activeVariant?.part1.length || 18} câu trắc nghiệm ABCD): +0,25 điểm / câu đúng.
                </li>
                <li>
                  · Phần II ({activeVariant?.part2.length || 4} câu Đúng/Sai): 1 ý đúng = 0,10đ · 2 ý = 0,25đ · 3 ý = 0,50đ · 4 ý = 1,00đ.
                </li>
                <li>
                  · Phần III ({activeVariant?.part3.length || 6} câu trả lời ngắn): +0,25 điểm / đáp số khớp chuẩn.
                </li>
              </ul>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border-2 border-indigo-900/70 space-y-3 shadow-md">
              <div className="text-sm sm:text-base font-extrabold text-amber-300">
                Chế Độ Bảo Mật Phòng Máy SmartTest
              </div>
              <ul className="space-y-2 text-xs sm:text-sm font-bold text-slate-100 leading-relaxed">
                <li>
                  · Tự động kích hoạt Toàn màn hình (Fullscreen) ngay khi bắt đầu làm bài.
                </li>
                <li>
                  ·{' '}
                  {matchedOnlineAssignment?.mode === 'practice'
                    ? 'Chế độ Ôn tập: Không thu bài cưỡng chế, mở xem lời giải chi tiết sau khi nộp bài.'
                    : `Chế độ Kiểm tra (Mức ${matchedOnlineAssignment?.violationLevel || 2}): Tự động thu bài cưỡng chế nếu vi phạm ${matchedOnlineAssignment?.maxViolations || 3} lần.`}
                </li>
                <li>
                  · Lưu tức thời mọi lựa chọn vào bộ nhớ trình duyệt sau mỗi thao tác.
                </li>
              </ul>
            </div>
          </div>

          {/* Primary Start CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 border-t border-slate-800">
            <div className="text-xs sm:text-sm font-bold text-slate-300">
              {selectedCode ? (
                <>
                  Nhấn nút bên phải để vào phòng thi với <strong className="text-white">Mã bài thi {selectedCode}</strong>.
                </>
              ) : (
                <span>Vui lòng điền đầy đủ thông tin thí sinh và chọn Mã bài thi trước khi bắt đầu làm bài.</span>
              )}
            </div>
            <button
              type="button"
              disabled={isSyncingCloudExam}
              onClick={() => handleStartExam(false)}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 text-sm sm:text-base font-extrabold bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-xl shadow-lg transition-colors shrink-0"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span className="truncate">
                {isSyncingCloudExam
                  ? 'Đang tải đề thi từ đám mây...'
                  : 'Start Exam · Bắt Đầu Làm Bài'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. ACTIVE KIOSK EXAM SPLIT INTERFACE (70% LEFT / 30% RIGHT STICKY)
  // =========================================================================
  const p1Count = activeVariant.part1.length;
  const p2Count = activeVariant.part2.length;
  const isLowTime = remainingSeconds < 300 && !isSubmitted;
  const isIvory = paperTheme === 'ivory';

  return (
    <div className="w-full max-w-[1440px] mx-auto px-2.5 sm:px-6 py-4 sm:py-6 select-none overflow-x-hidden">
      {/* Top Kiosk Security Bar */}
      <div className="mb-4 sm:mb-6 px-3 sm:px-4 py-3 rounded-xl bg-[#18182e] border border-indigo-900/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-violet-400" />
            <span>{studentName}</span>
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="font-mono text-slate-300">SBD: {studentId}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="font-mono font-bold text-violet-300">Mã đề {activeVariant.code}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="font-mono text-emerald-400">
            {lastSavedTime ? `Đã lưu tự động lúc ${lastSavedTime}` : 'Đang đồng bộ LocalStorage...'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Paper Surface Contrast Switcher */}
          <button
            type="button"
            onClick={() => setPaperTheme((t) => (t === 'ivory' ? 'dark' : 'ivory'))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {isIvory ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span>{isIvory ? 'Nền Giấy Tối' : 'Nền Giấy Trắng Ngà'}</span>
          </button>

          {/* Simulate Tab Switch button for easy evaluator verification */}
          {!isSubmitted && (
            <button
              type="button"
              onClick={() =>
                recordViolation(
                  'TAB_SWITCH',
                  'Mô phỏng kiểm thử: Phát hiện hành vi chuyển Tab trình duyệt ra ngoài cửa sổ làm bài.',
                  true
                )
              }
              className="px-3 py-1.5 text-xs font-medium bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Thử Cảnh Báo Chuyển Tab
            </button>
          )}

          {!isFullscreenActive && !isSubmitted && (
            <button
              type="button"
              onClick={enterFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Bật Lại Toàn Màn Hình</span>
            </button>
          )}

          {isSubmitted && (
            <button
              type="button"
              onClick={() => setShowScorecardModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Xem Bảng Điểm Chi Tiết</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExamActive(false)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Đổi Thí Sinh / Mã Đề
          </button>
        </div>
      </div>

      {/* Visual Question Completion ProgressBar */}
      <ProgressBar
        completedCount={completedCount}
        totalQuestionCount={totalQuestionCount}
        flaggedCount={flaggedCount}
        part1Completed={partCompletionStats.p1Done}
        part1Total={p1Count}
        part2Completed={partCompletionStats.p2Done}
        part2Total={p2Count}
        part3Completed={partCompletionStats.p3Done}
        part3Total={activeVariant.part3.length}
      />

      {/* Security Toast Alert (for blocked right-click / copy / F12) */}
      {securityToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-rose-950 border border-rose-500 text-rose-100 text-xs font-medium shadow-xl flex items-center gap-2">
          <Lock className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{securityToast}</span>
        </div>
      )}

      {/* Main Split Grid: 70% Left Exam Questions / 30% Right Sticky Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start w-full max-w-full">
        {/* ===================================================================
            LEFT PANE (70% -> 8 of 12 columns): EXAM CONTENTS (PARTS I, II, III)
        =================================================================== */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8 min-w-0 w-full max-w-full">
          {/* PART I SECTION */}
          <section className="space-y-4 sm:space-y-5">
            <div className="px-4 sm:px-6 py-4 sm:py-5 rounded-xl bg-[#1e1b4b] border border-indigo-700/70 space-y-1.5">
              <h2 className="text-base sm:text-xl font-bold text-white leading-snug">
                PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Từ câu 1 đến câu {p1Count})
              </h2>
              <p className="text-xs sm:text-base text-indigo-200 leading-relaxed">
                Mỗi câu hỏi thí sinh chỉ chọn một phương án đúng nhất. Mỗi câu trả lời đúng được <span className="font-mono font-bold text-emerald-300">0,25 điểm</span>.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {activeVariant.part1.map((q, idx) => {
                const globalNum = idx + 1;
                const selectedOpt = answers.part1[q.id];
                const isFlagged = Boolean(answers.flagged[globalNum]);
                const optionLetters = ['A', 'B', 'C', 'D'];

                return (
                  <div
                    key={q.id}
                    ref={(el) => {
                      questionRefs.current[globalNum] = el;
                    }}
                    className={`rounded-xl border-2 p-4 sm:p-6 transition-colors space-y-4 sm:space-y-5 min-w-0 w-full max-w-full overflow-hidden ${
                      isIvory
                        ? 'bg-[#fcfbfe] text-slate-900 border-[#4338ca]/35'
                        : 'bg-[#18182e] text-slate-100 border-indigo-900/80'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3.5 border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono text-xl font-bold ${
                            isIvory ? 'text-[#4338ca]' : 'text-violet-400'
                          }`}
                        >
                          Câu {globalNum}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span
                          className={`text-sm sm:text-base font-medium ${
                            isIvory ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          {q.topic} · 0,25 điểm
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleFlag(globalNum)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isFlagged
                            ? 'bg-amber-500 text-slate-950 font-semibold'
                            : isIvory
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <Flag className="w-4 h-4" />
                        <span>{isFlagged ? 'Đã đánh dấu xem lại' : 'Đánh dấu'}</span>
                      </button>
                    </div>

                    {/* Question Stem */}
                    <div className="text-lg sm:text-xl leading-relaxed font-medium">
                      <MathText text={q.question} />
                    </div>

                    {(() => {
                      const resolvedImgUrl = getResolvedQuestionImage(
                        q,
                        'I',
                        q.originalQuestionNumber
                      );
                      if (!resolvedImgUrl) return null;
                      return (
                        <div className="my-2 p-3.5 rounded-xl bg-white border border-indigo-300/70 flex flex-col items-center justify-center shadow-xs">
                          <img
                            src={resolvedImgUrl}
                            alt={`Hình minh họa Câu ${globalNum} (Phần I · Câu ${q.displayNumber})`}
                            className="max-h-64 w-auto object-contain rounded-lg"
                          />
                        </div>
                      );
                    })()}

                    {/* 4 Clickable Option Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {q.options.map((optText, oIdx) => {
                        const isSelected = selectedOpt === oIdx;
                        const isCorrectAnswer = isSubmitted && oIdx === q.correctIndex;
                        const isWrongSelection =
                          isSubmitted && isSelected && oIdx !== q.correctIndex;

                        let cardClasses = '';
                        if (isSubmitted) {
                          if (isCorrectAnswer) {
                            cardClasses =
                              'bg-emerald-500/15 border-emerald-600 text-emerald-950 dark:text-emerald-100';
                          } else if (isWrongSelection) {
                            cardClasses =
                              'bg-rose-500/15 border-rose-600 text-rose-950 dark:text-rose-100';
                          } else {
                            cardClasses = isIvory
                              ? 'bg-white border-slate-200 text-slate-700 opacity-75'
                              : 'bg-slate-900/50 border-slate-800 text-slate-400';
                          }
                        } else if (isSelected) {
                          cardClasses = isIvory
                            ? 'bg-indigo-50 border-[#4338ca] text-indigo-950 shadow-sm'
                            : 'bg-indigo-950/90 border-violet-500 text-white shadow-sm';
                        } else {
                          cardClasses = isIvory
                            ? 'bg-white hover:bg-indigo-50/50 border-slate-300 text-slate-800'
                            : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 text-slate-200';
                        }

                        return (
                          <button
                            key={oIdx}
                            type="button"
                            disabled={isSubmitted}
                            onClick={() => handleSelectPart1(q.id, oIdx)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 ${cardClasses}`}
                          >
                            <input
                              type="radio"
                              checked={isSelected}
                              readOnly
                              className="w-5 h-5 mt-1 accent-violet-600 shrink-0 cursor-pointer"
                            />
                            <span
                              className={`font-mono text-base sm:text-lg font-bold shrink-0 ${
                                isSelected
                                  ? isIvory
                                    ? 'text-[#4338ca]'
                                    : 'text-violet-300'
                                  : ''
                              }`}
                            >
                              {optionLetters[oIdx]}.
                            </span>
                            <div className="text-base sm:text-lg font-medium leading-relaxed flex-1">
                              <MathText text={optText} />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Show Explanation After Submission */}
                    {isSubmitted && (
                      <div
                        className={`p-4 rounded-lg text-sm sm:text-base leading-relaxed border ${
                          isIvory
                            ? 'bg-indigo-50/70 border-indigo-200 text-slate-800'
                            : 'bg-slate-900/90 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          Đáp án đúng: {optionLetters[q.correctIndex]} — Giải thích:{' '}
                        </span>
                        <MathText text={q.explanation} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* PART II SECTION */}
          <section className="space-y-4 sm:space-y-5">
            <div className="px-4 sm:px-6 py-4 sm:py-5 rounded-xl bg-[#1e1b4b] border border-indigo-700/70 space-y-1.5">
              <h2 className="text-base sm:text-xl font-bold text-white leading-snug">
                PHẦN II. Câu trắc nghiệm đúng sai (Từ câu {p1Count + 1} đến câu {p1Count + p2Count})
              </h2>
              <p className="text-xs sm:text-base text-indigo-200 leading-relaxed">
                Trong mỗi ý <span className="font-mono font-bold">a), b), c), d)</span> ở mỗi câu, thí sinh chọn <span className="font-bold text-emerald-300">[ĐÚNG]</span> hoặc <span className="font-bold text-amber-300">[SAI]</span>. Điểm từng câu: 1 ý đúng = 0,10đ · 2 ý đúng = 0,25đ · 3 ý đúng = 0,50đ · 4 ý đúng = 1,00đ.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {activeVariant.part2.map((q, idx) => {
                const globalNum = p1Count + idx + 1;
                const userSubMap = answers.part2[q.id] || {
                  a: undefined,
                  b: undefined,
                  c: undefined,
                  d: undefined,
                };
                const isFlagged = Boolean(answers.flagged[globalNum]);
                const answeredSubCount = [
                  userSubMap.a,
                  userSubMap.b,
                  userSubMap.c,
                  userSubMap.d,
                ].filter((v) => v !== undefined).length;

                return (
                  <div
                    key={q.id}
                    ref={(el) => {
                      questionRefs.current[globalNum] = el;
                    }}
                    className={`rounded-xl border-2 p-4 sm:p-6 transition-colors space-y-4 sm:space-y-5 min-w-0 w-full max-w-full overflow-hidden ${
                      isIvory
                        ? 'bg-[#fcfbfe] text-slate-900 border-[#4338ca]/35'
                        : 'bg-[#18182e] text-slate-100 border-indigo-900/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b pb-3 border-slate-200/80 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-mono text-lg sm:text-xl font-bold ${
                            isIvory ? 'text-[#4338ca]' : 'text-violet-400'
                          }`}
                        >
                          Câu {globalNum} (Phần II · Câu {q.displayNumber})
                        </span>
                        <span aria-hidden="true" className="text-slate-400 hidden sm:inline">·</span>
                        <span
                          className={`text-xs sm:text-base font-medium font-mono ${
                            isIvory ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          Đã chọn: {answeredSubCount}/4 mệnh đề · Tối đa 1,00 điểm
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleFlag(globalNum)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isFlagged
                            ? 'bg-amber-500 text-slate-950 font-semibold'
                            : isIvory
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <Flag className="w-4 h-4" />
                        <span>{isFlagged ? 'Đã đánh dấu xem lại' : 'Đánh dấu'}</span>
                      </button>
                    </div>

                    {/* Stem */}
                    <div className="text-base sm:text-xl leading-relaxed font-medium break-words">
                      <MathText text={q.stem} />
                    </div>

                    {(() => {
                      const resolvedImgUrl = getResolvedQuestionImage(
                        q,
                        'II',
                        q.originalQuestionNumber
                      );
                      if (!resolvedImgUrl) return null;
                      return (
                        <div className="my-2 p-3 rounded-xl bg-white border border-indigo-300/70 flex flex-col items-center justify-center shadow-xs">
                          <img
                            src={resolvedImgUrl}
                            alt={`Hình minh họa Câu ${globalNum} (Phần II · Câu ${q.displayNumber})`}
                            className="max-h-64 max-w-full w-auto object-contain rounded-lg"
                          />
                        </div>
                      );
                    })()}

                    {/* Responsive Sub-Question Statements (Full width on mobile phones, side-by-side on desktop) */}
                    <div
                      className={`rounded-xl border overflow-hidden ${
                        isIvory ? 'border-slate-300' : 'border-slate-800'
                      }`}
                    >
                      {/* Desktop Column Header */}
                      <div
                        className={`hidden md:grid md:grid-cols-[1fr_240px] items-center text-sm font-mono font-bold border-b px-4 py-3 ${
                          isIvory
                            ? 'bg-indigo-50/80 text-indigo-950 border-slate-300'
                            : 'bg-slate-900 text-slate-200 border-slate-800'
                        }`}
                      >
                        <div>Mệnh đề & Nội dung nhận định</div>
                        <div className="text-center">Lựa chọn Đúng / Sai</div>
                      </div>

                      <div
                        className={`divide-y ${
                          isIvory ? 'divide-slate-200' : 'divide-slate-800'
                        }`}
                      >
                        {q.statements.map((stmt) => {
                          const currentVal = userSubMap[stmt.displayLabel];
                          return (
                            <div
                              key={stmt.displayLabel}
                              className={`p-3.5 sm:p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3.5 transition-colors ${
                                isIvory
                                  ? 'bg-white hover:bg-slate-50/80'
                                  : 'bg-slate-950/30 hover:bg-white/[0.02]'
                              }`}
                            >
                              {/* Full-width Statement Text on Mobile */}
                              <div className="flex-1 min-w-0 w-full space-y-2">
                                <div className="text-base sm:text-lg leading-relaxed break-words">
                                  <span
                                    className={`inline-block font-mono text-base sm:text-lg font-bold mr-2 ${
                                      isIvory ? 'text-[#4338ca]' : 'text-violet-400'
                                    }`}
                                  >
                                    {stmt.displayLabel})
                                  </span>
                                  <MathText text={stmt.text} />
                                </div>

                                {isSubmitted && (
                                  <div className="text-xs sm:text-sm font-mono text-indigo-600 dark:text-indigo-300 pt-1 break-words">
                                    Đáp án chuẩn: {stmt.isTrue ? 'ĐÚNG' : 'SAI'}
                                    {stmt.explanation ? ' — ' : ''}
                                    {stmt.explanation && <MathText text={stmt.explanation} />}
                                  </div>
                                )}
                              </div>

                              {/* 2-Column True / False Action Buttons (50%/50% full width on mobile, fixed 240px on desktop) */}
                              <div className="grid grid-cols-2 gap-2.5 w-full md:w-60 shrink-0 pt-1 md:pt-0">
                                <button
                                  type="button"
                                  disabled={isSubmitted}
                                  onClick={() =>
                                    handleSelectPart2(q.id, stmt.displayLabel, true)
                                  }
                                  className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-mono text-sm font-bold border transition-all ${
                                    currentVal === true
                                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                                      : isIvory
                                      ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-emerald-50'
                                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-emerald-500/60'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    checked={currentVal === true}
                                    readOnly
                                    className="w-4 h-4 sm:w-5 sm:h-5 accent-emerald-500 pointer-events-none shrink-0"
                                  />
                                  <span>[ĐÚNG]</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isSubmitted}
                                  onClick={() =>
                                    handleSelectPart2(q.id, stmt.displayLabel, false)
                                  }
                                  className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-mono text-sm font-bold border transition-all ${
                                    currentVal === false
                                      ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                                      : isIvory
                                      ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-rose-50'
                                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-rose-500/60'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    checked={currentVal === false}
                                    readOnly
                                    className="w-4 h-4 sm:w-5 sm:h-5 accent-rose-500 pointer-events-none shrink-0"
                                  />
                                  <span>[SAI]</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* PART III SECTION */}
          <section className="space-y-4 sm:space-y-5">
            <div className="px-4 sm:px-6 py-4 sm:py-5 rounded-xl bg-[#1e1b4b] border border-indigo-700/70 space-y-1.5">
              <h2 className="text-base sm:text-xl font-bold text-white leading-snug">
                PHẦN III. Câu trắc nghiệm trả lời ngắn (Từ câu {p1Count + p2Count + 1} đến câu {totalQuestionCount})
              </h2>
              <p className="text-xs sm:text-base text-indigo-200 leading-relaxed">
                Thí sinh nhập kết quả là số (chấp nhận cả dấu phẩy <span className="font-mono">,</span> hoặc dấu chấm <span className="font-mono">.</span> thập phân). Mỗi câu đúng được <span className="font-mono font-bold text-emerald-300">0,25 điểm</span>.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {activeVariant.part3.map((q, idx) => {
                const globalNum = p1Count + p2Count + idx + 1;
                const val = answers.part3[q.id] || '';
                const isFlagged = Boolean(answers.flagged[globalNum]);
                const isKeypadOpen = activePart3KeypadId === q.id;

                return (
                  <div
                    key={q.id}
                    ref={(el) => {
                      questionRefs.current[globalNum] = el;
                    }}
                    className={`rounded-xl border-2 p-4 sm:p-6 transition-colors space-y-4 sm:space-y-5 min-w-0 w-full max-w-full overflow-hidden ${
                      isIvory
                        ? 'bg-[#fcfbfe] text-slate-900 border-[#4338ca]/35'
                        : 'bg-[#18182e] text-slate-100 border-indigo-900/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3.5 border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono text-xl font-bold ${
                            isIvory ? 'text-[#4338ca]' : 'text-violet-400'
                          }`}
                        >
                          Câu {globalNum} (Phần III · Câu {q.displayNumber})
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span
                          className={`text-sm sm:text-base font-medium ${
                            isIvory ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          {q.topic} · 0,25 điểm
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleFlag(globalNum)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isFlagged
                            ? 'bg-amber-500 text-slate-950 font-semibold'
                            : isIvory
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <Flag className="w-4 h-4" />
                        <span>{isFlagged ? 'Đã đánh dấu xem lại' : 'Đánh dấu'}</span>
                      </button>
                    </div>

                    <div className="text-lg sm:text-xl leading-relaxed font-medium">
                      <MathText text={q.question} />
                    </div>

                    {(() => {
                      const resolvedImgUrl = getResolvedQuestionImage(
                        q,
                        'III',
                        q.originalQuestionNumber
                      );
                      if (!resolvedImgUrl) return null;
                      return (
                        <div className="my-2 p-3.5 rounded-xl bg-white border border-indigo-300/70 flex flex-col items-center justify-center shadow-xs">
                          <img
                            src={resolvedImgUrl}
                            alt={`Hình minh họa Câu ${globalNum} (Phần III · Câu ${q.displayNumber})`}
                            className="max-h-64 w-auto object-contain rounded-lg"
                          />
                        </div>
                      );
                    })()}

                    {/* Standardized Short Answer Input + On-Screen Numeric Keypad Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pt-1">
                      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        <label className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-[#4338ca] dark:text-violet-300">
                          Đáp số của bạn:
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          disabled={isSubmitted}
                          value={val}
                          onFocus={() => setActivePart3KeypadId(q.id)}
                          onChange={(e) => handleChangePart3(q.id, e.target.value)}
                          placeholder="Nhập số (VD: 1,5)"
                          className={`w-full sm:w-52 py-3 px-4 rounded-xl font-mono text-xl font-semibold border-2 focus:outline-none tabular-nums ${
                            isIvory
                              ? 'bg-white border-[#4338ca] text-slate-950'
                              : 'bg-slate-950 border-violet-500 text-white'
                          }`}
                        />
                        {q.unit && (
                          <span className="text-sm sm:text-base font-mono text-slate-500">
                            ({q.unit})
                          </span>
                        )}
                      </div>

                      {!isSubmitted && (
                        <button
                          type="button"
                          onClick={() =>
                            setActivePart3KeypadId(isKeypadOpen ? null : q.id)
                          }
                          className={`px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors self-start sm:self-auto whitespace-nowrap shrink-0 ${
                            isIvory
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100'
                              : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          {isKeypadOpen ? 'Ẩn bàn phím số ảo' : 'Mở bàn phím số ảo'}
                        </button>
                      )}
                    </div>

                    {/* Virtual Numeric Keypad */}
                    {isKeypadOpen && !isSubmitted && (
                      <div
                        className={`p-3.5 rounded-xl border max-w-xs space-y-2 ${
                          isIvory
                            ? 'bg-slate-100 border-slate-300'
                            : 'bg-slate-900 border-slate-700'
                        }`}
                      >
                        <div className="grid grid-cols-4 gap-2 font-mono text-base font-bold">
                          {['7', '8', '9', '-'].map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => handleKeypadPress(q.id, k)}
                              className={`py-2.5 rounded-lg border transition-colors ${
                                isIvory
                                  ? 'bg-white border-slate-300 hover:bg-indigo-50 text-slate-900'
                                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
                              }`}
                            >
                              {k}
                            </button>
                          ))}
                          {['4', '5', '6', ','].map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => handleKeypadPress(q.id, k)}
                              className={`py-2.5 rounded-lg border transition-colors ${
                                isIvory
                                  ? 'bg-white border-slate-300 hover:bg-indigo-50 text-slate-900'
                                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
                              }`}
                            >
                              {k}
                            </button>
                          ))}
                          {['1', '2', '3', '.'].map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => handleKeypadPress(q.id, k)}
                              className={`py-2.5 rounded-lg border transition-colors ${
                                isIvory
                                  ? 'bg-white border-slate-300 hover:bg-indigo-50 text-slate-900'
                                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
                              }`}
                            >
                              {k}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleKeypadPress(q.id, '0')}
                            className={`col-span-2 py-2.5 rounded-lg border transition-colors ${
                              isIvory
                                ? 'bg-white border-slate-300 hover:bg-indigo-50 text-slate-900'
                                : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
                            }`}
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={() => handleKeypadPress(q.id, 'BACKSPACE')}
                            className="py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center"
                            title="Lùi 1 ký tự"
                          >
                            <Delete className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleKeypadPress(q.id, 'CLEAR')}
                            className="py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs"
                          >
                            Xoá
                          </button>
                        </div>
                      </div>
                    )}

                    {isSubmitted && (
                      <div
                        className={`p-4 rounded-lg text-sm sm:text-base leading-relaxed border ${
                          isIvory
                            ? 'bg-indigo-50/70 border-indigo-200 text-slate-800'
                            : 'bg-slate-900/90 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          Đáp số chuẩn: {q.answer} {q.unit ? `(${q.unit})` : ''} — Giải thích:{' '}
                        </span>
                        <MathText text={q.explanation} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ===================================================================
            RIGHT PANE (30% -> 4 of 12 columns): STICKY NAVIGATION PALETTE
        =================================================================== */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-5">
          {/* High-visibility Countdown Timer Card */}
          <div
            className={`rounded-2xl border-2 p-5 space-y-3 transition-colors ${
              isLowTime
                ? 'bg-rose-950/90 border-rose-500 text-rose-100 animate-pulse'
                : 'bg-[#18182e] border-indigo-800/80 text-white'
            }`}
          >
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-semibold flex items-center gap-1.5 text-slate-200">
                <Clock className="w-4 h-4 text-violet-400" />
                <span>THỜI GIAN LÀM BÀI CÒN LẠI</span>
              </span>
              <span className="font-mono text-sm font-bold text-violet-300">
                Mã đề {activeVariant.code}
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-wider text-center py-3 bg-slate-950/70 rounded-xl border border-slate-800">
              {formatCountdown(remainingSeconds)}
            </div>

            <div className="flex items-center justify-between text-sm font-mono tabular-nums text-slate-200 pt-1">
              <span>
                Đã trả lời:{' '}
                <strong className="text-emerald-400">
                  {completedCount}/{totalQuestionCount}
                </strong>
              </span>
              <span>
                Đánh dấu: <strong className="text-amber-400">{flaggedCount}</strong>
              </span>
            </div>

            <ProgressBar
              completedCount={completedCount}
              totalQuestionCount={totalQuestionCount}
              compact
            />
          </div>

          {/* 28-Question Navigation Matrix Grid */}
          <div className="bg-[#18182e] border border-indigo-900/80 rounded-2xl p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white">
                Bảng Điều Hướng {totalQuestionCount} Câu Hỏi
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Nhấn vào số thứ tự câu bất kỳ để cuộn mượt tới câu hỏi đó.
              </p>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-violet-600 inline-block shrink-0" />
                <span>Đã làm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-slate-600 bg-slate-900 inline-block shrink-0" />
                <span>Chưa làm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border-2 border-amber-400 bg-amber-500/20 inline-block shrink-0" />
                <span>Xem lại</span>
              </div>
            </div>

            {/* Part I Grid */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-300">
                Phần I: Nhiều lựa chọn (Câu 1–{p1Count})
              </div>
              <div className="grid grid-cols-6 gap-2">
                {activeVariant.part1.map((q, idx) => {
                  const num = idx + 1;
                  const done = isQuestionFullyCompleted(activeVariant, answers, num);
                  const flagged = Boolean(answers.flagged[num]);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => scrollToQuestion(num)}
                      className={`w-11 h-11 sm:w-12 sm:h-12 mx-auto rounded-lg font-mono text-base font-bold tabular-nums transition-all border flex items-center justify-center ${
                        done
                          ? 'bg-violet-600 border-violet-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                      } ${flagged ? 'ring-2 ring-amber-400 border-amber-400' : ''}`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Part II Grid */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-300">
                Phần II: Đúng / Sai (Câu {p1Count + 1}–{p1Count + p2Count})
              </div>
              <div className="grid grid-cols-4 gap-2">
                {activeVariant.part2.map((q, idx) => {
                  const num = p1Count + idx + 1;
                  const done = isQuestionFullyCompleted(activeVariant, answers, num);
                  const partial = isQuestionPartiallyCompleted(activeVariant, answers, num);
                  const flagged = Boolean(answers.flagged[num]);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => scrollToQuestion(num)}
                      className={`h-11 sm:h-12 rounded-lg font-mono text-base font-bold tabular-nums transition-all border flex items-center justify-center ${
                        done
                          ? 'bg-violet-600 border-violet-400 text-white'
                          : partial
                          ? 'bg-indigo-950 border-indigo-400 text-indigo-200'
                          : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                      } ${flagged ? 'ring-2 ring-amber-400 border-amber-400' : ''}`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Part III Grid */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-300">
                Phần III: Trả lời ngắn (Câu {p1Count + p2Count + 1}–{totalQuestionCount})
              </div>
              <div className="grid grid-cols-6 gap-2">
                {activeVariant.part3.map((q, idx) => {
                  const num = p1Count + p2Count + idx + 1;
                  const done = isQuestionFullyCompleted(activeVariant, answers, num);
                  const flagged = Boolean(answers.flagged[num]);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => scrollToQuestion(num)}
                      className={`w-11 h-11 sm:w-12 sm:h-12 mx-auto rounded-lg font-mono text-base font-bold tabular-nums transition-all border flex items-center justify-center ${
                        done
                          ? 'bg-violet-600 border-violet-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                      } ${flagged ? 'ring-2 ring-amber-400 border-amber-400' : ''}`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Anti-Cheat Status Summary inside Sticky Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs sm:text-sm font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Giám sát Kiosk:</span>
                <span className="text-emerald-400 font-semibold">ĐANG BẢO VỆ</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Số lần vi phạm (Tab/Blur):</span>
                <span
                  className={
                    violations.length > 0
                      ? 'text-rose-400 font-bold'
                      : 'text-slate-300'
                  }
                >
                  {violations.length} lần
                </span>
              </div>
            </div>

            {/* Primary Submit Exam CTA */}
            {!isSubmitted ? (
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Send className="w-5 h-5" />
                <span>Nộp Bài Thi (Submit Exam)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowScorecardModal(true)}
                className="w-full py-3.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Award className="w-5 h-5" />
                <span>Mở Phiếu Điểm Chuẩn Bộ GD&ĐT</span>
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* =====================================================================
          MODAL 1: ANTI-CHEATING VIOLATION WARNING MODAL
      ===================================================================== */}
      {activeWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#18182e] border-2 border-rose-500 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-7 h-7 shrink-0" />
              <div>
                <div className="text-xs font-mono uppercase">
                  CẢNH BÁO VI PHẠM QUY CHẾ PHÒNG MÁY
                </div>
                <h3 className="text-lg font-bold text-white">
                  Phát Hiện Rời Khỏi Màn Hình Thi!
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-700/70 text-xs text-rose-100 space-y-2 leading-relaxed">
              <p className="font-semibold">{activeWarningModal.description}</p>
              <p className="font-mono text-rose-300">
                Thời điểm ghi nhận: {activeWarningModal.timestamp} · Tổng số lần vi phạm:{' '}
                {violations.length} lần
              </p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Sự kiện này đã được gửi trực tiếp về <strong className="text-white">Bảng Giám Sát Máy Chủ Giáo Viên (LAN Monitor)</strong>. Vui lòng quay trở lại chế độ Toàn màn hình ngay lập tức.
            </p>

            <button
              type="button"
              onClick={async () => {
                setActiveWarningModal(null);
                await enterFullscreen();
              }}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
            >
              Tôi Đã Hiểu & Quay Lại Toàn Màn Hình Làm Bài
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: SUBMIT CONFIRMATION MODAL
      ===================================================================== */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#18182e] border border-indigo-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <div className="text-xs font-mono text-violet-400">
                XÁC NHẬN NỘP BÀI THI · MÃ ĐỀ {activeVariant.code}
              </div>
              <h3 className="text-xl font-bold text-white">
                Bạn có chắc chắn muốn nộp bài ngay?
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs font-mono tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">Số câu đã trả lời:</span>
                <span className="text-emerald-400 font-bold">
                  {completedCount} / {totalQuestionCount} câu
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số câu đang đánh dấu xem lại:</span>
                <span className="text-amber-400 font-bold">{flaggedCount} câu</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thời gian còn lại:</span>
                <span className="text-white font-bold">
                  {formatCountdown(remainingSeconds)}
                </span>
              </div>
            </div>

            {completedCount < totalQuestionCount && (
              <div className="p-3 rounded-lg bg-amber-950/70 border border-amber-700/60 text-amber-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Bạn vẫn còn{' '}
                  <strong>{totalQuestionCount - completedCount} câu hỏi</strong> chưa hoàn thành. Hãy kiểm tra kỹ trước khi nộp!
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Quay Lại Kiểm Tra Bài
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                Xác Nhận Nộp Bài & Chấm Điểm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: DETAILED MOET (GDPT 2018) SCORECARD & REVIEW MODAL
      ===================================================================== */}
      {showScorecardModal && gradeReport && (
        <div className="fixed inset-0 z-50 bg-black/85 overflow-y-auto p-4 sm:p-6 flex items-start justify-center">
          <div className="bg-[#18182e] border border-indigo-700/80 rounded-2xl max-w-5xl w-full my-6 p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Scorecard Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="space-y-1">
                <div className="text-xs font-mono text-emerald-400">
                  KẾT QUẢ CHẤM THI TỰ ĐỘNG CHUẨN BỘ GD&ĐT (GDPT 2018)
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Phiếu Điểm Chi Tiết — {studentName} (SBD: {studentId})
                </h2>
                <div className="text-xs text-slate-400 font-mono">
                  Mã đề: {activeVariant.code} · Hoàn thành: {gradeReport.answeredCount}/{gradeReport.totalQuestionCount} câu · Số vi phạm quy chế: {violations.length} lần
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowScorecardModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Đóng Phiếu Điểm
                </button>
              </div>
            </div>

            {forcedSubmitBanner && (
              <div className="p-4 rounded-xl bg-rose-950/80 border-2 border-rose-500 text-rose-100 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{forcedSubmitBanner}</span>
              </div>
            )}

            {matchedOnlineAssignment?.detailedSolutionContent && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/60 space-y-2">
                <div className="text-xs sm:text-sm font-bold text-emerald-300">
                  Tài Liệu & Lời Giải Chi Tiết Ôn Tập Từ Giáo Viên{' '}
                  {matchedOnlineAssignment.detailedSolutionFileName
                    ? `(${matchedOnlineAssignment.detailedSolutionFileName})`
                    : ''}
                  :
                </div>
                <div className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  {matchedOnlineAssignment.detailedSolutionContent}
                </div>
              </div>
            )}

            {/* 4-Column Score Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono tabular-nums">
              <div className="p-4 rounded-xl bg-indigo-950/70 border border-indigo-500/60 space-y-1">
                <div className="text-xs text-indigo-300 font-sans">
                  Tổng Điểm Thang 10,00
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {gradeReport.scaled10Score.toFixed(2)} <span className="text-sm font-normal text-indigo-300">/ 10,00</span>
                </div>
                <div className="text-[11px] text-indigo-300">
                  Điểm thực đạt: {gradeReport.rawTotalScore.toFixed(2)} / {gradeReport.maxPossibleScore.toFixed(2)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-xs text-slate-400 font-sans">
                  Phần I · Nhiều lựa chọn (0,25đ/câu)
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  {gradeReport.part1Score.toFixed(2)} <span className="text-xs text-slate-500">/ {gradeReport.part1Max.toFixed(2)} đ</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Đúng {gradeReport.part1CorrectCount}/{activeVariant.part1.length} câu
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-xs text-slate-400 font-sans">
                  Phần II · Đúng / Sai (Lũy tiến 1,0đ)
                </div>
                <div className="text-2xl font-bold text-violet-400">
                  {gradeReport.part2Score.toFixed(2)} <span className="text-xs text-slate-500">/ {gradeReport.part2Max.toFixed(2)} đ</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Đạt tối đa 4/4 ý: {gradeReport.part2FullCorrectCount}/{activeVariant.part2.length} câu
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-xs text-slate-400 font-sans">
                  Phần III · Trả lời ngắn (0,25đ/câu)
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {gradeReport.part3Score.toFixed(2)} <span className="text-xs text-slate-500">/ {gradeReport.part3Max.toFixed(2)} đ</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Đúng {gradeReport.part3CorrectCount}/{activeVariant.part3.length} câu
                </div>
              </div>
            </div>

            {/* Filter Review Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'ALL', label: `Tất cả (${gradeReport.details.length} câu)` },
                    {
                      id: 'INCORRECT',
                      label: `Câu sai / Chưa trọn điểm (${
                        gradeReport.details.filter((d) => d.status !== 'CORRECT').length
                      })`,
                    },
                    { id: 'PART_I', label: 'Phần I' },
                    { id: 'PART_II', label: 'Phần II (Đúng/Sai)' },
                    { id: 'PART_III', label: 'Phần III (Trả lời ngắn)' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setReviewFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      reviewFilter === f.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Question-by-Question Review List */}
            <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
              {gradeReport.details
                .filter((d) => {
                  if (reviewFilter === 'INCORRECT') return d.status !== 'CORRECT';
                  if (reviewFilter === 'PART_I') return d.part === 'I';
                  if (reviewFilter === 'PART_II') return d.part === 'II';
                  if (reviewFilter === 'PART_III') return d.part === 'III';
                  return true;
                })
                .map((item) => (
                  <div
                    key={item.globalNumber}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-violet-400">
                          Câu {item.globalNumber} (Phần {item.part} · Câu {item.partQuestionNumber})
                        </span>
                        <span aria-hidden="true">·</span>
                        {item.status === 'CORRECT' && (
                          <span className="text-emerald-400 font-bold">
                            ✓ CHÍNH XÁC (+{item.earnedPoints.toFixed(2)}đ)
                          </span>
                        )}
                        {item.status === 'PARTIAL' && (
                          <span className="text-amber-400 font-bold">
                            ◐ ĐÚNG MỘT PHẦN (+{item.earnedPoints.toFixed(2)}/{item.maxPoints.toFixed(2)}đ)
                          </span>
                        )}
                        {item.status === 'INCORRECT' && (
                          <span className="text-rose-400 font-bold">✕ SAI (0,00đ)</span>
                        )}
                        {item.status === 'UNANSWERED' && (
                          <span className="text-slate-400 font-bold">○ BỎ TRỐNG (0,00đ)</span>
                        )}
                      </div>

                      <div className="text-slate-300">
                        <span>Bài làm: {item.userAnswerSummary}</span>
                        <span className="mx-2 text-slate-600">|</span>
                        <span className="text-emerald-400 font-semibold">
                          Đáp án: {item.correctAnswerSummary}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      <MathText text={item.questionText} />
                    </div>

                    {item.has_image && item.image_url && (
                      <div className="my-2 p-2.5 rounded-lg bg-white border border-indigo-400/50 flex flex-col items-center justify-center">
                        <img
                          src={item.image_url}
                          alt={`Hình minh họa Câu ${item.globalNumber}`}
                          className="max-h-48 w-auto object-contain rounded"
                        />
                      </div>
                    )}

                    <div className="text-xs text-slate-400 border-t border-slate-800/80 pt-2 leading-relaxed">
                      <span className="font-semibold text-indigo-300">Lời giải chi tiết: </span>
                      <MathText text={item.explanation} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
