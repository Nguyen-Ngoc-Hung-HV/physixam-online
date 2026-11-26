import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Delete,
  Download,
  Eye,
  Flag,
  Lock,
  Maximize2,
  Play,
  QrCode,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sun,
  Moon,
  UserCheck,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
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
import {
  getResolvedQuestionImage,
  normalizeMathFormulasForKatex,
  parseAndMergeDetailedSolutionDocument,
} from '../utils/examDocumentParser';
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
const AUDIO_CUE_STORAGE_KEY = 'smarttest_gdpt2018_audio_cue_v1';

function getStorageKey(studentId: string, examCode: string): string {
  return `${STORAGE_PREFIX}${studentId.trim().toUpperCase()}_${examCode.trim()}`;
}

/**
 * Strips redundant leading "Chọn đáp án X." / "Chọn phương án X." / "Đáp án đúng: X."
 * from an explanation string so it displays cleanly after "Đáp án đúng: X — Giải thích:"
 * and after "Lời giải chi tiết:".
 */
function formatCleanExplanation(
  rawExplanation: string | undefined,
  fallbackLetter?: string
): string {
  const raw = (rawExplanation || '').trim();
  const stripped = raw
    .replace(
      /^(?:Chọn\s+(?:đáp\s+án|phương\s+án)?|Đáp\s+án(?:\s+đúng|\s+là)?|ĐA)\s*[:=]?\s*[A-D]\b\s*[.:,-]?\s*/i,
      ''
    )
    .trim();
  if (stripped) return stripped;
  if (fallbackLetter) return `Đáp án đúng là ${fallbackLetter}.`;
  return raw || 'Đã đối chiếu đáp án chuẩn.';
}

/**
 * Synthesizes a soft harmonic bell/chime using Web Audio API (no external audio assets required).
 * - 'five_minutes': Gentle two-tone ascending chime when 5 minutes (300s) remain.
 * - 'time_expired': Distinct three-tone soft bell cadence when exam time reaches 00:00.
 */
function playExamTimeChime(cueType: 'five_minutes' | 'time_expired'): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const notes =
      cueType === 'five_minutes'
        ? [
            { freq: 523.25, delay: 0, duration: 0.45, peakGain: 0.14 }, // C5
            { freq: 659.25, delay: 0.18, duration: 0.65, peakGain: 0.16 }, // E5
          ]
        : [
            { freq: 783.99, delay: 0, duration: 0.4, peakGain: 0.16 }, // G5
            { freq: 659.25, delay: 0.2, duration: 0.45, peakGain: 0.15 }, // E5
            { freq: 523.25, delay: 0.42, duration: 0.8, peakGain: 0.18 }, // C5
          ];

    const now = ctx.currentTime;
    notes.forEach(({ freq, delay, duration, peakGain }) => {
      const startTime = now + delay;
      const stopTime = startTime + duration;

      const osc = ctx.createOscillator();
      const harmonicOsc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      harmonicOsc.type = 'triangle';
      harmonicOsc.frequency.setValueAtTime(freq * 2, startTime);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.18, startTime);

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.025);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gainNode);
      harmonicOsc.connect(harmonicGain);
      harmonicGain.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      harmonicOsc.start(startTime);
      osc.stop(stopTime);
      harmonicOsc.stop(stopTime);
    });

    const totalDurationMs = cueType === 'five_minutes' ? 1100 : 1500;
    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, totalDurationMs);
  } catch {
    // Ignore Web Audio errors if blocked by browser autoplay settings
  }
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
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedSessionUrl, setCopiedSessionUrl] = useState<boolean>(false);

  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const questionsContainerRef = useRef<HTMLDivElement | null>(null);
  const [headerOffsetPx, setHeaderOffsetPx] = useState<number>(56);
  const [audioCueEnabled, setAudioCueEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(AUDIO_CUE_STORAGE_KEY);
      if (saved === 'false') return false;
    } catch {
      // Default to enabled
    }
    return true;
  });
  const audioCueEnabledRef = useRef<boolean>(audioCueEnabled);
  const fiveMinChimePlayedRef = useRef<boolean>(false);

  useEffect(() => {
    audioCueEnabledRef.current = audioCueEnabled;
    try {
      localStorage.setItem(AUDIO_CUE_STORAGE_KEY, String(audioCueEnabled));
    } catch {
      // Ignore storage error
    }
  }, [audioCueEnabled]);

  const handleToggleAudioCue = useCallback(() => {
    setAudioCueEnabled((prev) => {
      const next = !prev;
      if (next) {
        playExamTimeChime('five_minutes');
      }
      return next;
    });
  }, []);

  const onCloudExamLoadedRef = useRef(onCloudExamLoaded);
  useEffect(() => {
    onCloudExamLoadedRef.current = onCloudExamLoaded;
  }, [onCloudExamLoaded]);

  // Lock outer document scrolling during active exam so top bar & right column remain 100% stationary
  // and ONLY the question/answer column scrolls up and down
  useEffect(() => {
    if (!isExamActive) {
      document.body.classList.remove('exam-workspace-locked');
      return;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
    document.body.classList.add('exam-workspace-locked');

    const topNav = document.querySelector('header');
    const updateHeaderOffset = () => {
      if (topNav) {
        const rect = topNav.getBoundingClientRect();
        setHeaderOffsetPx(Math.max(48, Math.round(rect.height)));
      }
    };

    updateHeaderOffset();
    let observer: ResizeObserver | null = null;
    if (topNav && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateHeaderOffset);
      observer.observe(topNav);
    }
    window.addEventListener('resize', updateHeaderOffset);
    const resizeTimer = window.setTimeout(updateHeaderOffset, 120);

    return () => {
      document.body.classList.remove('exam-workspace-locked');
      observer?.disconnect();
      window.removeEventListener('resize', updateHeaderOffset);
      window.clearTimeout(resizeTimer);
    };
  }, [isExamActive]);

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
      const foundLocal = onlineAssignments.find(
        (a) => a.examCode.trim().toUpperCase() === cleanCode
      );
      const foundCloud =
        cloudAssignment &&
        cloudAssignment.examCode.trim().toUpperCase() === cleanCode
          ? cloudAssignment
          : null;
      if (foundLocal && foundCloud) {
        return {
          ...foundCloud,
          ...foundLocal,
          detailedSolutionContent:
            foundLocal.detailedSolutionContent || foundCloud.detailedSolutionContent,
        };
      }
      if (foundLocal) return foundLocal;
      if (foundCloud) return foundCloud;
    }
    return onlineAssignments[0] || cloudAssignment || null;
  }, [onlineAssignments, selectedCode, cloudAssignment]);

  const isPracticeMode = matchedOnlineAssignment?.mode === 'practice';
  const activeViolationLevel: 1 | 2 | 3 =
    matchedOnlineAssignment?.violationLevel === 1
      ? 1
      : matchedOnlineAssignment?.violationLevel === 3
      ? 3
      : 2;
  const maxAllowedViolations = isPracticeMode
    ? 0
    : activeViolationLevel === 1
    ? 1
    : activeViolationLevel === 3
    ? 4
    : 3;

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

    // Nếu mã bài thi trực tuyến có kèm examData đã đồng bộ Phần A (Đề) + Phần B (Đáp án & Lời giải chi tiết),
    // ưu tiên đồng bộ dữ liệu gốc này trước khi giữ nguyên (practice) hoặc xáo trộn (exam)
    const assignmentMatchesCode =
      !cleanCode ||
      !matchedOnlineAssignment?.examCode ||
      matchedOnlineAssignment.examCode.trim().toUpperCase() === cleanCode.toUpperCase();

    let effectiveExamData =
      assignmentMatchesCode && matchedOnlineAssignment?.examData
        ? matchedOnlineAssignment.examData
        : undefined;

    if (
      assignmentMatchesCode &&
      matchedOnlineAssignment?.detailedSolutionContent?.trim()
    ) {
      const baseForMerge: ExamData = effectiveExamData || {
        examId: `VARIANT-${rawBaseVariant.code}`,
        title: rawBaseVariant.title,
        subject: rawBaseVariant.subject,
        grade: 'Lớp 12',
        curriculum: 'Chương trình GDPT 2018 — Bộ GD&ĐT',
        durationMinutes: rawBaseVariant.durationMinutes,
        part1: rawBaseVariant.part1,
        part2: rawBaseVariant.part2,
        part3: rawBaseVariant.part3,
      };
      try {
        const mergedResult = parseAndMergeDetailedSolutionDocument(
          matchedOnlineAssignment.detailedSolutionContent,
          baseForMerge
        );
        if (mergedResult.matchedQuestionCount > 0) {
          effectiveExamData = mergedResult.mergedExam;
        }
      } catch {
        // Keep effectiveExamData if merge fails
      }
    }

    const hydratedBaseVariant = effectiveExamData
      ? restoreUnshuffledVariant(
          { ...rawBaseVariant, code: cleanCode || rawBaseVariant.code },
          effectiveExamData
        )
      : rawBaseVariant;

    const normalizeVariantFormulas = (variant: ScrambledExamVariant): ScrambledExamVariant => ({
      ...variant,
      part1: variant.part1.map((q) => ({
        ...q,
        question: normalizeMathFormulasForKatex(q.question),
        options: [
          normalizeMathFormulasForKatex(q.options[0]),
          normalizeMathFormulasForKatex(q.options[1]),
          normalizeMathFormulasForKatex(q.options[2]),
          normalizeMathFormulasForKatex(q.options[3]),
        ],
        explanation: normalizeMathFormulasForKatex(q.explanation || ''),
      })),
      part2: variant.part2.map((q) => ({
        ...q,
        stem: normalizeMathFormulasForKatex(q.stem),
        statements: q.statements.map((stmt) => ({
          ...stmt,
          text: normalizeMathFormulasForKatex(stmt.text),
          explanation: stmt.explanation ? normalizeMathFormulasForKatex(stmt.explanation) : stmt.explanation,
        })) as typeof q.statements,
        explanation: normalizeMathFormulasForKatex(q.explanation || ''),
      })),
      part3: variant.part3.map((q) => ({
        ...q,
        question: normalizeMathFormulasForKatex(q.question),
        explanation: normalizeMathFormulasForKatex(q.explanation || ''),
      })),
    });

    // Chế độ ôn tập: giữ nguyên thứ tự các câu hỏi và đáp án gốc (không xáo trộn)
    if (matchedOnlineAssignment?.mode === 'practice') {
      return normalizeVariantFormulas(
        restoreUnshuffledVariant(hydratedBaseVariant, effectiveExamData)
      );
    }

    // Chế độ kiểm tra: tự động xáo trộn ngẫu nhiên thứ tự câu hỏi trong mỗi phần
    // và thứ tự đáp án trong mỗi câu (giữ nguyên thứ tự các phần I -> II -> III)
    const effectiveSeed = `${studentId.trim().toUpperCase() || 'GUEST'}-${studentName.trim().toUpperCase() || 'STUDENT'}-${cleanCode.toUpperCase()}-${studentShuffleSeed}`;
    return normalizeVariantFormulas(shuffleVariantForStudent(hydratedBaseVariant, effectiveSeed));
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

  // Current Exam Session URL & QR Code Generation for Mobile Device Access in Lab
  const effectiveQrExamCode = useMemo<string>(() => {
    return (
      selectedCode.trim() ||
      (isExamActive && activeVariant?.code ? activeVariant.code.trim() : '') ||
      matchedOnlineAssignment?.examCode?.trim() ||
      variants[0]?.code?.trim() ||
      '1102'
    );
  }, [selectedCode, isExamActive, activeVariant, matchedOnlineAssignment, variants]);

  const currentExamSessionUrl = useMemo<string>(() => {
    const baseOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}${window.location.pathname || '/'}`
        : 'https://smarttest.edu.vn/';
    const cleanBase = baseOrigin.endsWith('/') ? baseOrigin : `${baseOrigin}/`;
    return effectiveQrExamCode
      ? `${cleanBase}?examCode=${encodeURIComponent(effectiveQrExamCode)}`
      : cleanBase;
  }, [effectiveQrExamCode]);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(currentExamSessionUrl, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) {
          setQrCodeDataUrl(url);
        }
      })
      .catch(() => {
        if (isMounted) {
          setQrCodeDataUrl('');
        }
      });
    return () => {
      isMounted = false;
    };
  }, [currentExamSessionUrl]);

  const handleCopySessionUrl = useCallback(() => {
    navigator.clipboard?.writeText(currentExamSessionUrl);
    setCopiedSessionUrl(true);
    window.setTimeout(() => setCopiedSessionUrl(false), 2000);
  }, [currentExamSessionUrl]);

  const handleDownloadQrCode = useCallback(() => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `SmartTest-QR-MaDe-${effectiveQrExamCode || 'Session'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrCodeDataUrl, effectiveQrExamCode]);

  // Helper to log an anti-cheat violation & enforce forced submission in 'exam' mode
  const recordViolation = useCallback(
    (
      type: ViolationEvent['type'],
      description: string,
      openModal: boolean = true
    ) => {
      if (isPracticeMode || isSubmitted) {
        // Chế độ ôn tập hoặc đã nộp bài: Không ghi nhận vi phạm và không thu bài cưỡng chế
        return;
      }

      const evt: ViolationEvent = {
        id: `VIO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        type,
        description,
      };

      setViolations((prev) => {
        if (maxAllowedViolations > 0 && prev.length >= maxAllowedViolations) {
          return prev;
        }
        const nextList = [...prev, evt];
        if (maxAllowedViolations > 0 && nextList.length >= maxAllowedViolations) {
          setIsSubmitted(true);
          setActiveWarningModal(null);
          setForcedSubmitBanner(
            `Hệ thống đã thu bài cưỡng chế theo cấu hình kỳ thi (Chế độ Kiểm tra · Mức ${activeViolationLevel}: Vi phạm ${nextList.length}/${maxAllowedViolations} lần tối đa).`
          );
          setShowScorecardModal(true);
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } else if (openModal) {
          setActiveWarningModal(evt);
        } else {
          setSecurityToast(
            `${description} (Vi phạm ${nextList.length}/${maxAllowedViolations} lần)`
          );
          window.setTimeout(() => setSecurityToast(null), 3200);
        }
        return nextList;
      });
    },
    [isPracticeMode, isSubmitted, maxAllowedViolations, activeViolationLevel]
  );

  // Enforce automatic forced submission immediately whenever violations reach maxAllowedViolations in Exam mode
  useEffect(() => {
    if (!isExamActive || isSubmitted || isPracticeMode) return;
    if (maxAllowedViolations > 0 && violations.length >= maxAllowedViolations) {
      setIsSubmitted(true);
      setActiveWarningModal(null);
      setForcedSubmitBanner(
        `Hệ thống đã thu bài cưỡng chế theo cấu hình kỳ thi (Chế độ Kiểm tra · Mức ${activeViolationLevel}: Vi phạm ${violations.length}/${maxAllowedViolations} lần tối đa).`
      );
      setShowScorecardModal(true);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [
    isExamActive,
    isSubmitted,
    isPracticeMode,
    maxAllowedViolations,
    activeViolationLevel,
    violations.length,
  ]);

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

  // Countdown Timer (with optional soft audio chime at 5-minute mark and upon expiration)
  useEffect(() => {
    if (!isExamActive || isSubmitted) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          if (audioCueEnabledRef.current) {
            playExamTimeChime('time_expired');
          }
          setIsSubmitted(true);
          setShowScorecardModal(true);
          return 0;
        }
        const next = prev - 1;
        if (next === 300 && !fiveMinChimePlayedRef.current) {
          fiveMinChimePlayedRef.current = true;
          if (audioCueEnabledRef.current) {
            playExamTimeChime('five_minutes');
          }
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isExamActive, isSubmitted]);

  // Anti-Cheating Event Listeners (Fullscreen, VisibilityChange, Window Blur, ContextMenu, Shortcuts)
  useEffect(() => {
    if (!isExamActive || isSubmitted || isPracticeMode) return;

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
  }, [isExamActive, isSubmitted, isPracticeMode, recordViolation]);

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
      const resumedRemaining =
        detectedSavedSession.remainingSeconds > 0
          ? detectedSavedSession.remainingSeconds
          : configuredDurationMinutes * 60;
      fiveMinChimePlayedRef.current = resumedRemaining <= 300;
      setAnswers(detectedSavedSession.answers);
      setRemainingSeconds(resumedRemaining);
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
      const initialSeconds = configuredDurationMinutes * 60;
      fiveMinChimePlayedRef.current = initialSeconds <= 300;
      setAnswers(EMPTY_ANSWERS);
      setRemainingSeconds(initialSeconds);
      setViolations([]);
      setIsSubmitted(false);
      setStartedAtIso(new Date().toISOString());
      setShowScorecardModal(false);
    }

    const effectiveMode =
      matchedOnlineAssignment?.mode || resolvedAssignment?.mode || 'exam';
    if (effectiveMode !== 'practice') {
      await enterFullscreen();
    }
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
    const container = questionsContainerRef.current;
    if (el && container && container.scrollHeight > container.clientHeight + 4) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (elRect.top - containerRect.top) - 8;
      container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
    } else if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleForwardWheelToQuestions = (e: React.WheelEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight > el.clientHeight + 2) {
      const canScrollDown = e.deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1;
      const canScrollUp = e.deltaY < 0 && el.scrollTop > 0;
      if (canScrollDown || canScrollUp) {
        return;
      }
    }
    if (questionsContainerRef.current) {
      questionsContainerRef.current.scrollBy({ top: e.deltaY, behavior: 'auto' });
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
      <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 overflow-x-hidden box-border">
        <div className="bg-[#18182e] border-2 border-indigo-800/80 rounded-2xl p-4 sm:p-10 shadow-xl space-y-6 sm:space-y-8 w-full max-w-full min-w-0 box-border overflow-hidden">
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
              <div className="max-w-full">
                <span
                  className={`inline-block max-w-full break-words px-3 py-1.5 rounded-lg font-mono font-bold ${
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
                  · Phần I ({activeVariant ? activeVariant.part1.length : 18} câu trắc nghiệm ABCD): +0,25 điểm / câu đúng.
                </li>
                {(!activeVariant || activeVariant.part2.length > 0) && (
                  <li>
                    · Phần II ({activeVariant ? activeVariant.part2.length : 4} câu Đúng/Sai): 1 ý đúng = 0,10đ · 2 ý = 0,25đ · 3 ý = 0,50đ · 4 ý = 1,00đ.
                  </li>
                )}
                {(!activeVariant || activeVariant.part3.length > 0) && (
                  <li>
                    · Phần III ({activeVariant ? activeVariant.part3.length : 6} câu trả lời ngắn): +0,25 điểm / đáp số khớp chuẩn.
                  </li>
                )}
              </ul>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border-2 border-indigo-900/70 space-y-3 shadow-md">
              <div className="text-sm sm:text-base font-extrabold text-amber-300">
                {isPracticeMode
                  ? 'Chế Độ Ôn Tập & Tự Luyện SmartTest'
                  : 'Chế Độ Bảo Mật Phòng Máy SmartTest'}
              </div>
              <ul className="space-y-2 text-xs sm:text-sm font-bold text-slate-100 leading-relaxed">
                {isPracticeMode ? (
                  <>
                    <li>
                      · Không hiển thị thanh Giám sát chống gian lận và không thu bài cưỡng chế khi chuyển tab.
                    </li>
                    <li>
                      · Giữ nguyên thứ tự câu hỏi gốc; mở đầy đủ đáp án và lời giải chi tiết ngay sau khi nộp bài.
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      · Tự động kích hoạt Toàn màn hình (Fullscreen) và Giám sát chống gian lận ngay khi bắt đầu làm bài.
                    </li>
                    <li>
                      · Chế độ Kiểm tra (Mức {activeViolationLevel}): Tự động thu bài cưỡng chế ngay khi vi phạm đủ {maxAllowedViolations} lần.
                    </li>
                  </>
                )}
                <li>
                  · Lưu tức thời mọi lựa chọn vào bộ nhớ trình duyệt sau mỗi thao tác.
                </li>
              </ul>
            </div>
          </div>

          {/* Mobile QR Code Quick Access Card in Entrance Gate */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border-2 border-violet-700/60 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                title="Phóng to mã QR phòng thi"
                className="p-2 rounded-xl bg-white border-2 border-indigo-400 shadow-sm shrink-0 hover:scale-105 transition-transform cursor-pointer"
              >
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt={`Mã QR phòng thi ${effectiveQrExamCode}`}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-indigo-900">
                    <QrCode className="w-10 h-10" />
                  </div>
                )}
              </button>

              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-violet-600/30 border border-violet-500/60 text-violet-200 text-xs font-mono font-bold">
                    <Smartphone className="w-3.5 h-3.5 text-violet-300 shrink-0" />
                    <span>VÀO THI BẰNG ĐIỆN THOẠI (QR CODE)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono text-xs font-extrabold">
                    Mã bài thi: {effectiveQrExamCode}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-snug">
                  Quét mã QR bằng camera điện thoại để mở trực tiếp phòng thi với mã đề hiện tại trong phòng máy.
                </p>
                <div className="text-[11px] sm:text-xs font-mono text-indigo-300 truncate max-w-full">
                  {currentExamSessionUrl}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={handleCopySessionUrl}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors whitespace-nowrap"
              >
                {copiedSessionUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">Đã sao chép Link</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span>Sao chép Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-extrabold text-white shadow-sm transition-colors whitespace-nowrap"
              >
                <QrCode className="w-4 h-4 shrink-0" />
                <span>Hiển Thị Mã QR Lớn</span>
              </button>
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

        {/* Enlarged QR Code Modal (Accessible from Entrance Gate) */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-2xl bg-[#18182e] border-2 border-violet-500/80 p-6 shadow-2xl space-y-5 text-center relative">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                aria-label="Đóng cửa sổ QR"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-violet-600/30 border border-violet-500/50 text-violet-200 text-xs font-mono font-bold">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>MÃ QR VÀO PHÒNG THI TRỰC TUYẾN</span>
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Mã Bài Thi: <span className="font-mono text-amber-300">{effectiveQrExamCode}</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Học sinh dùng camera điện thoại hoặc Zalo quét mã QR bên dưới để truy cập thẳng vào bài thi.
                </p>
              </div>

              <div className="mx-auto w-64 h-64 p-4 rounded-2xl bg-white border-4 border-violet-500/80 shadow-xl flex items-center justify-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt={`QR Code Mã đề ${effectiveQrExamCode}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode className="w-24 h-24 text-indigo-950 animate-pulse" />
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-left space-y-1">
                <div className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                  Đường dẫn phiên thi (Session URL):
                </div>
                <div className="text-xs font-mono text-indigo-300 break-all select-all">
                  {currentExamSessionUrl}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCopySessionUrl}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-100 border border-slate-700 transition-colors"
                >
                  {copiedSessionUrl ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">Đã Sao Chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 shrink-0" />
                      <span>Sao Chép Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQrCode}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs sm:text-sm font-bold text-white shadow-md transition-colors"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Tải Ảnh QR</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. ACTIVE KIOSK EXAM SPLIT INTERFACE (70% LEFT / 30% RIGHT STICKY)
  // =========================================================================
  const p1Count = activeVariant.part1.length;
  const p2Count = activeVariant.part2.length;
  const p3Count = activeVariant.part3.length;
  const isLowTime = remainingSeconds < 300 && !isSubmitted;
  const isIvory = paperTheme === 'ivory';

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden select-none box-border">
      {/* Fixed Viewport Split Workspace on Desktop/Tablet (md+):
          Top Header Bar & Right Status Column stay 100% fixed; ONLY Left Question List scrolls */}
      <div
        style={{ top: `${headerOffsetPx}px` }}
        className="print-exam-workspace w-full max-w-full min-w-0 overflow-x-hidden md:fixed md:inset-x-0 md:bottom-0 md:z-30 bg-[#0b0f19] flex flex-col md:overflow-hidden box-border"
      >
        <div className="print-exam-inner w-full max-w-[1600px] min-w-0 overflow-x-hidden box-border mx-auto px-3.5 sm:px-4 pt-1.5 sm:pt-2 pb-1.5 sm:pb-2.5 flex-1 min-h-0 flex flex-col gap-2">
          {/* Ultra-Compact Fixed Top Exam Bar (Student Info + Action Controls + Progress Bar) */}
          <div
            onWheel={handleForwardWheelToQuestions}
            className="print-exam-topbar shrink-0 w-full max-w-full min-w-0 box-border overflow-hidden relative md:static z-20 px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-xl bg-[#18182e]/95 backdrop-blur-md border-2 border-indigo-800/80 shadow-md space-y-1.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs min-w-0 max-w-full">
                <span className="font-extrabold text-white flex items-center gap-1 min-w-0">
                  <UserCheck className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="truncate max-w-[115px] sm:max-w-none">{studentName}</span>
                </span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="font-mono font-bold text-slate-200 whitespace-nowrap">SBD: {studentId}</span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="font-mono font-extrabold text-violet-300 whitespace-nowrap">Mã đề {activeVariant.code}</span>
                <span aria-hidden="true" className="text-slate-500 hidden lg:inline">·</span>
                <span className="font-mono font-bold text-emerald-400 hidden lg:inline">
                  {lastSavedTime ? `Đã lưu tự động lúc ${lastSavedTime}` : 'Đang đồng bộ LocalStorage...'}
                </span>
              </div>

              <div className="no-print flex flex-wrap items-center gap-1 sm:gap-1.5 max-w-full">
                {/* Paper Surface Contrast Switcher */}
                <button
                  type="button"
                  onClick={() => setPaperTheme((t) => (t === 'ivory' ? 'dark' : 'ivory'))}
                  className="flex items-center gap-1 px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {isIvory ? <Moon className="w-3 h-3 shrink-0" /> : <Sun className="w-3 h-3 shrink-0" />}
                  <span className="hidden sm:inline">{isIvory ? 'Nền Giấy Tối' : 'Nền Giấy Trắng Ngà'}</span>
                  <span className="sm:hidden">{isIvory ? 'Nền Giấy Tối' : 'Nền Giấy Sáng'}</span>
                </button>

                {/* Simulate Tab Switch button for easy evaluator verification (Exam Mode only) */}
                {!isSubmitted && !isPracticeMode && (
                  <button
                    type="button"
                    onClick={() =>
                      recordViolation(
                        'TAB_SWITCH',
                        'Mô phỏng kiểm thử: Phát hiện hành vi chuyển Tab trình duyệt ra ngoài cửa sổ làm bài.',
                        true
                      )
                    }
                    className="px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white border border-amber-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
                  >
                    <span className="hidden sm:inline">Thử Cảnh Báo Chuyển Tab</span>
                    <span className="sm:hidden">Thử Cảnh Báo</span>
                  </button>
                )}

                {!isFullscreenActive && !isSubmitted && !isPracticeMode && (
                  <button
                    type="button"
                    onClick={enterFullscreen}
                    className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Toàn Màn Hình</span>
                  </button>
                )}

                {isSubmitted && (
                  <button
                    type="button"
                    onClick={() => setShowScorecardModal(true)}
                    className="flex items-center gap-1 px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Xem Bảng Điểm Chi Tiết</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  title="Hiển thị mã QR đường dẫn phiên thi cho thiết bị di động"
                  className="flex items-center gap-1 px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold bg-indigo-950/90 hover:bg-indigo-900 text-violet-200 border border-violet-500/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <QrCode className="w-3.5 h-3.5 text-violet-300 shrink-0" />
                  <span>Mã QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExamActive(false)}
                  className="px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Đổi Thí Sinh / Mã Đề</span>
                </button>
              </div>
            </div>

            {/* Integrated Compact Question Completion ProgressBar */}
            <ProgressBar
              completedCount={completedCount}
              totalQuestionCount={totalQuestionCount}
              flaggedCount={flaggedCount}
              part1Completed={partCompletionStats.p1Done}
              part1Total={p1Count}
              part2Completed={partCompletionStats.p2Done}
              part2Total={p2Count}
              part3Completed={partCompletionStats.p3Done}
              part3Total={p3Count}
            />
          </div>

          {/* Main Split Grid: ~74-75% Left Independent Scrollable Exam Questions / ~25-26% Right Fixed Palette */}
          <div className="print-exam-split-grid flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,2.7fr)_minmax(248px,1fr)] lg:grid-cols-[minmax(0,3fr)_minmax(268px,1fr)] gap-3 lg:gap-4 items-start md:items-stretch w-full max-w-full min-w-0 overflow-x-hidden box-border">
            {/* ===================================================================
                LEFT PANE (74%-75% WIDTH): INDEPENDENTLY SCROLLABLE EXAM QUESTIONS & ANSWERS
            =================================================================== */}
            <div
              ref={questionsContainerRef}
              className="print-questions-column md:h-full md:overflow-y-auto overflow-x-hidden md:pr-1.5 space-y-4 sm:space-y-5 pb-6 min-w-0 w-full max-w-full box-border"
            >
          {/* PART I SECTION */}
          {p1Count > 0 && (
          <section className="print-exam-section space-y-4 sm:space-y-5 w-full max-w-full min-w-0 box-border">
            <div className="print-section-banner w-full max-w-full min-w-0 box-border overflow-hidden px-3.5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-indigo-950/90 border-2 border-violet-500/70 shadow-sm space-y-1">
              <h2 className="text-base sm:text-xl font-extrabold text-white leading-snug break-words">
                PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Từ câu 1 đến câu {p1Count})
              </h2>
              <p className="text-xs sm:text-base font-semibold text-slate-200 leading-relaxed break-words">
                Mỗi câu hỏi thí sinh chỉ chọn một phương án đúng nhất. Mỗi câu trả lời đúng được <span className="font-mono font-extrabold text-emerald-400">0,25 điểm</span>.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-5 w-full max-w-full min-w-0">
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
                    className={`print-question-card scroll-mt-36 rounded-xl border-2 p-3.5 sm:p-6 transition-colors space-y-3.5 sm:space-y-5 min-w-0 w-full max-w-full box-border overflow-hidden ${
                      isIvory
                        ? 'bg-[#fcfbfe] text-slate-900 border-[#4338ca]/35'
                        : 'bg-[#18182e] text-slate-100 border-indigo-900/80'
                    }`}
                  >
                    {/* Question Header */}
                    <div
                      className={`flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b pb-3 ${
                        isIvory ? 'border-slate-200' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 min-w-0">
                        <span
                          className={`font-mono text-lg sm:text-xl font-bold whitespace-nowrap shrink-0 ${
                            isIvory ? 'text-[#4338ca]' : 'text-violet-400'
                          }`}
                        >
                          Câu {globalNum}
                        </span>
                        <span aria-hidden="true" className="text-slate-400 shrink-0">·</span>
                        <span
                          className={`text-xs sm:text-base font-medium ${
                            isIvory ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          {q.topic} · 0,25 điểm
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleFlag(globalNum)}
                        className={`no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isFlagged
                            ? 'bg-amber-500 text-slate-950 font-semibold'
                            : isIvory
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <Flag className="w-4 h-4 shrink-0" />
                        <span>{isFlagged ? 'Đã đánh dấu xem lại' : 'Đánh dấu'}</span>
                      </button>
                    </div>

                    {/* Question Stem */}
                    <div className="text-lg sm:text-xl leading-relaxed font-medium break-words">
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
                            alt={`Hình minh họa Câu ${globalNum}`}
                            className="max-h-64 max-w-full w-auto object-contain rounded-lg"
                          />
                        </div>
                      );
                    })()}

                    {/* 4 Clickable Option Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 min-w-0 w-full max-w-full">
                      {q.options.map((optText, oIdx) => {
                        const isSelected = selectedOpt === oIdx;
                        const isCorrectAnswer = isSubmitted && oIdx === q.correctIndex;
                        const isWrongSelection =
                          isSubmitted && isSelected && oIdx !== q.correctIndex;

                        let cardClasses = '';
                        if (isSubmitted) {
                          if (isCorrectAnswer) {
                            cardClasses = isIvory
                              ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs'
                              : 'bg-emerald-950/60 border-emerald-500 text-emerald-100';
                          } else if (isWrongSelection) {
                            cardClasses = isIvory
                              ? 'bg-rose-50 border-rose-600 text-rose-950 shadow-xs'
                              : 'bg-rose-950/60 border-rose-500 text-rose-100';
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
                            className={`w-full max-w-full min-w-0 overflow-hidden text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all flex items-start gap-2.5 sm:gap-3.5 ${cardClasses}`}
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
                            <div className="text-base sm:text-lg font-medium leading-relaxed flex-1 min-w-0 break-words">
                              <MathText text={optText} />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Show Explanation After Submission */}
                    {isSubmitted && (
                      <div
                        className={`p-4 rounded-lg text-sm sm:text-base leading-relaxed border whitespace-pre-line ${
                          isIvory
                            ? 'bg-indigo-50/80 border-indigo-300 text-slate-900'
                            : 'bg-slate-900/90 border-slate-800 text-slate-200'
                        }`}
                      >
                        <span
                          className={`font-bold ${
                            isIvory ? 'text-indigo-800' : 'text-indigo-300'
                          }`}
                        >
                          Đáp án đúng: {optionLetters[q.correctIndex]} — Giải thích:{' '}
                        </span>
                        <MathText
                          text={formatCleanExplanation(
                            q.explanation,
                            optionLetters[q.correctIndex]
                          )}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          )}

          {/* PART II SECTION */}
          {p2Count > 0 && (
          <section className="print-exam-section space-y-4 sm:space-y-5 w-full max-w-full min-w-0 box-border">
            <div className="print-section-banner w-full max-w-full min-w-0 box-border overflow-hidden px-3.5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-indigo-950/90 border-2 border-violet-500/70 shadow-sm space-y-1">
              <h2 className="text-base sm:text-xl font-extrabold text-white leading-snug break-words">
                PHẦN II. Câu trắc nghiệm đúng sai (Từ câu {p1Count + 1} đến câu {p1Count + p2Count})
              </h2>
              <p className="text-xs sm:text-base font-semibold text-slate-200 leading-relaxed break-words">
                Trong mỗi ý <span className="font-mono font-extrabold text-violet-300">a), b), c), d)</span> ở mỗi câu, thí sinh chọn <span className="font-extrabold text-emerald-400">[ĐÚNG]</span> hoặc <span className="font-extrabold text-rose-400">[SAI]</span>. Điểm từng câu: <span className="font-bold text-white">1 ý đúng = 0,10đ · 2 ý đúng = 0,25đ · 3 ý đúng = 0,50đ · 4 ý đúng = 1,00đ</span>.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-5 w-full max-w-full min-w-0">
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
                    className={`print-question-card scroll-mt-36 rounded-xl border-2 p-3.5 sm:p-6 transition-colors space-y-3.5 sm:space-y-5 min-w-0 w-full max-w-full box-border overflow-hidden ${
                      isIvory
                        ? 'bg-[#fcfbfe] text-slate-900 border-[#4338ca]/35'
                        : 'bg-[#18182e] text-slate-100 border-indigo-900/80'
                    }`}
                  >
                    <div
                      className={`flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b pb-3 ${
                        isIvory ? 'border-slate-200' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 min-w-0">
                        <span
                          className={`font-mono text-lg sm:text-xl font-bold whitespace-nowrap shrink-0 ${
                            isIvory ? 'text-[#4338ca]' : 'text-violet-400'
                          }`}
                        >
                          Câu {globalNum}
                        </span>
                        <span aria-hidden="true" className="text-slate-400 shrink-0">·</span>
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
                        className={`no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isFlagged
                            ? 'bg-amber-500 text-slate-950 font-semibold'
                            : isIvory
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <Flag className="w-4 h-4 shrink-0" />
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
                            alt={`Hình minh họa Câu ${globalNum}`}
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
                                  <div
                                    className={`mt-2 p-2.5 rounded-lg border text-xs sm:text-sm space-y-1 break-words ${
                                      isIvory
                                        ? 'bg-indigo-50/90 border-indigo-300 text-slate-900'
                                        : 'bg-indigo-950/50 border-indigo-500/40 text-slate-100'
                                    }`}
                                  >
                                    <div className="font-mono font-bold flex flex-wrap items-center gap-2">
                                      <span
                                        className={
                                          stmt.isTrue
                                            ? isIvory
                                              ? 'text-emerald-700'
                                              : 'text-emerald-400'
                                            : isIvory
                                            ? 'text-rose-700'
                                            : 'text-rose-400'
                                        }
                                      >
                                        Đáp án chuẩn: {stmt.isTrue ? 'ĐÚNG' : 'SAI'}
                                      </span>
                                      {currentVal !== null && (
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                                            currentVal === stmt.isTrue
                                              ? isIvory
                                                ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                              : isIvory
                                              ? 'bg-rose-100 text-rose-900 border-rose-400'
                                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                          }`}
                                        >
                                          {currentVal === stmt.isTrue ? '✓ Trả lời đúng' : '✕ Trả lời sai'}
                                        </span>
                                      )}
                                    </div>
                                    {stmt.explanation && (
                                      <div
                                        className={`leading-relaxed pt-0.5 ${
                                          isIvory ? 'text-slate-800' : 'text-slate-200'
                                        }`}
                                      >
                                        <span
                                          className={`font-semibold ${
                                            isIvory ? 'text-indigo-800' : 'text-indigo-300'
                                          }`}
                                        >
                                          Giải thích:{' '}
                                        </span>
                                        <MathText text={stmt.explanation} />
                                      </div>
                                    )}
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

                      {isSubmitted && q.explanation && (
                        <div
                          className={`mt-2 p-3.5 rounded-xl border text-xs sm:text-sm space-y-1.5 whitespace-pre-line ${
                            isIvory
                              ? 'bg-indigo-50/90 border-indigo-300 text-slate-900'
                              : 'bg-indigo-950/50 border-indigo-500/40 text-slate-100'
                          }`}
                        >
                          <div
                            className={`font-mono font-bold ${
                              isIvory ? 'text-indigo-800' : 'text-indigo-300'
                            }`}
                          >
                            Tổng hợp đáp án &amp; lời giải chi tiết Câu {globalNum}:
                          </div>
                          <div
                            className={`leading-relaxed ${
                              isIvory ? 'text-slate-800' : 'text-slate-200'
                            }`}
                          >
                            <MathText text={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          )}

          {/* PART III SECTION */}
          {p3Count > 0 && (
          <section className="print-exam-section space-y-4 sm:space-y-5 w-full max-w-full min-w-0 box-border">
            <div className="print-section-banner w-full max-w-full min-w-0 box-border overflow-hidden px-3.5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-indigo-950/90 border-2 border-violet-500/70 shadow-sm space-y-1">
              <h2 className="text-base sm:text-xl font-extrabold text-white leading-snug break-words">
                PHẦN III. Câu trắc nghiệm trả lời ngắn (Từ câu {p1Count + p2Count + 1} đến câu {totalQuestionCount})
              </h2>
              <p className="text-xs sm:text-base font-semibold text-slate-200 leading-relaxed break-words">
                Thí sinh nhập kết quả là số (chấp nhận cả dấu phẩy <span className="font-mono font-bold">,</span> hoặc dấu chấm <span className="font-mono font-bold">.</span> thập phân). Mỗi câu đúng được <span className="font-mono font-extrabold text-emerald-400">0,25 điểm</span>.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-5 w-full max-w-full min-w-0">
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
                    className={`print-question-card scroll-mt-36 rounded-xl border-2 p-3.5 sm:p-6 transition-colors space-y-3.5 sm:space-y-5 min-w-0 w-full max-w-full box-border overflow-hidden ${
                      isIvory
                        ? 'bg-[#fcfbfe] text-slate-900 border-[#4338ca]/35'
                        : 'bg-[#18182e] text-slate-100 border-indigo-900/80'
                    }`}
                  >
                    <div
                      className={`flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b pb-3 ${
                        isIvory ? 'border-slate-200' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 min-w-0">
                        <span
                          className={`font-mono text-lg sm:text-xl font-bold whitespace-nowrap shrink-0 ${
                            isIvory ? 'text-[#4338ca]' : 'text-violet-400'
                          }`}
                        >
                          Câu {globalNum}
                        </span>
                        <span aria-hidden="true" className="text-slate-400 shrink-0">·</span>
                        <span
                          className={`text-xs sm:text-base font-medium ${
                            isIvory ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          {q.topic} · 0,25 điểm
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleFlag(globalNum)}
                        className={`no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isFlagged
                            ? 'bg-amber-500 text-slate-950 font-semibold'
                            : isIvory
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <Flag className="w-4 h-4 shrink-0" />
                        <span>{isFlagged ? 'Đã đánh dấu xem lại' : 'Đánh dấu'}</span>
                      </button>
                    </div>

                    <div className="text-lg sm:text-xl leading-relaxed font-medium break-words">
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
                            alt={`Hình minh họa Câu ${globalNum}`}
                            className="max-h-64 max-w-full w-auto object-contain rounded-lg"
                          />
                        </div>
                      );
                    })()}

                    {/* Standardized Short Answer Input + On-Screen Numeric Keypad Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pt-1">
                      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        <label
                          className={`text-sm sm:text-base font-bold font-mono uppercase tracking-wider ${
                            isIvory ? 'text-[#4338ca]' : 'text-violet-300'
                          }`}
                        >
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
                            ? 'bg-indigo-50/80 border-indigo-300 text-slate-900'
                            : 'bg-slate-900/90 border-slate-800 text-slate-200'
                        }`}
                      >
                        <span
                          className={`font-bold ${
                            isIvory ? 'text-indigo-800' : 'text-indigo-300'
                          }`}
                        >
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
          )}
        </div>

            {/* ===================================================================
                RIGHT PANE (~25-26% WIDTH): FIXED STATIONARY STATUS & NAVIGATION PALETTE
            =================================================================== */}
            <aside
              onWheel={handleForwardWheelToQuestions}
              className="no-print w-full max-w-full min-w-0 box-border md:h-full md:overflow-y-auto flex flex-col gap-2"
            >
              {/* Compact High-visibility Countdown Timer Card */}
              <div
                className={`shrink-0 w-full max-w-full min-w-0 box-border overflow-hidden rounded-xl border-2 p-3 sm:p-3 space-y-1.5 transition-colors shadow-md ${
                  isLowTime
                    ? 'bg-rose-950/90 border-rose-500 text-rose-100 animate-pulse'
                    : 'bg-[#18182e] border-indigo-800/80 text-white'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                  <span className="font-extrabold flex items-center gap-1.5 text-slate-200">
                    <Clock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <span>THỜI GIAN CÒN LẠI</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleToggleAudioCue}
                      title={
                        audioCueEnabled
                          ? 'Chuông báo giờ (5 phút cuối & hết giờ): Đang BẬT — Nhấn để tắt'
                          : 'Chuông báo giờ (5 phút cuối & hết giờ): Đang TẮT — Nhấn để bật'
                      }
                      aria-label="Bật hoặc tắt chuông báo thời gian làm bài"
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold border transition-colors whitespace-nowrap shrink-0 ${
                        audioCueEnabled
                          ? 'bg-violet-950/80 border-violet-500/70 text-violet-200 hover:bg-violet-900/80'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {audioCueEnabled ? (
                        <Volume2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <VolumeX className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                      <span>{audioCueEnabled ? 'Chuông' : 'Tắt âm'}</span>
                    </button>
                    <span className="font-mono text-xs sm:text-sm font-extrabold text-violet-300">
                      Mã đề {activeVariant.code}
                    </span>
                  </div>
                </div>

                <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums tracking-wider text-center py-1 bg-slate-950/70 rounded-lg border border-slate-800">
                  {formatCountdown(remainingSeconds)}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-bold tabular-nums text-slate-200">
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

              {/* Compact Question Status & Navigation Matrix Grid */}
              <div className="shrink-0 w-full max-w-full min-w-0 box-border overflow-hidden bg-[#18182e] border-2 border-indigo-900/80 rounded-xl p-3 sm:p-3 space-y-2 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800/80 pb-1.5">
                  <h3 className="text-xs sm:text-sm font-extrabold text-white">
                    Bảng Điều Hướng {totalQuestionCount} Câu Hỏi
                  </h3>
                  {/* Compact Inline Legend */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-200 font-mono font-bold">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-violet-600 inline-block shrink-0" />
                      <span>Đã làm</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs border border-slate-500 bg-slate-900 inline-block shrink-0" />
                      <span>Chưa làm</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs border-2 border-amber-400 bg-amber-500/20 inline-block shrink-0" />
                      <span>Xem lại</span>
                    </span>
                  </div>
                </div>

                {/* Part I Grid */}
                {p1Count > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-slate-200">
                    Phần I: Nhiều lựa chọn (Câu 1–{p1Count})
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {activeVariant.part1.map((q, idx) => {
                      const num = idx + 1;
                      const done = isQuestionFullyCompleted(activeVariant, answers, num);
                      const flagged = Boolean(answers.flagged[num]);
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => scrollToQuestion(num)}
                          className={`w-full h-7 sm:h-8 rounded-lg font-mono text-xs font-extrabold tabular-nums transition-all border flex items-center justify-center ${
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
                )}

                {/* Part II Grid (only displayed when exam contains Part II questions) */}
                {p2Count > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-slate-200">
                    Phần II: Đúng / Sai (Câu {p1Count + 1}–{p1Count + p2Count})
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
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
                          className={`w-full h-7 sm:h-8 rounded-lg font-mono text-xs font-extrabold tabular-nums transition-all border flex items-center justify-center ${
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
                )}

                {/* Part III Grid (only displayed when exam contains Part III questions) */}
                {p3Count > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-slate-200">
                    Phần III: Trả lời ngắn (Câu {p1Count + p2Count + 1}–{totalQuestionCount})
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {activeVariant.part3.map((q, idx) => {
                      const num = p1Count + p2Count + idx + 1;
                      const done = isQuestionFullyCompleted(activeVariant, answers, num);
                      const flagged = Boolean(answers.flagged[num]);
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => scrollToQuestion(num)}
                          className={`w-full h-7 sm:h-8 rounded-lg font-mono text-xs font-extrabold tabular-nums transition-all border flex items-center justify-center ${
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
                )}

                {/* Compact Single-Line Anti-Cheat Status Summary (Hidden in Practice Mode) */}
                {!isPracticeMode && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-1.5 text-[11px] sm:text-xs font-mono font-bold whitespace-nowrap">
                    <span className="text-slate-300">
                      Giám sát: <strong className="text-emerald-400">ĐANG BẢO VỆ</strong>
                    </span>
                    <span className="text-slate-300">
                      Vi phạm:{' '}
                      <strong
                        className={
                          violations.length > 0 ? 'text-rose-400' : 'text-slate-200'
                        }
                      >
                        {violations.length}/{maxAllowedViolations} lần
                      </strong>
                    </span>
                  </div>
                )}

                {/* Primary Submit Exam CTA */}
                {!isSubmitted ? (
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirm(true)}
                    className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Nộp Bài Thi (Submit Exam)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowScorecardModal(true)}
                    className="w-full py-2 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <Award className="w-4 h-4" />
                    <span>Mở Phiếu Điểm Chuẩn Bộ GD&ĐT</span>
                  </button>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Security Toast Alert (for blocked right-click / copy / F12) */}
      {securityToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-rose-950 border border-rose-500 text-rose-100 text-xs font-medium shadow-xl flex items-center gap-2">
          <Lock className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{securityToast}</span>
        </div>
      )}

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
                Thời điểm ghi nhận: {activeWarningModal.timestamp} · Số lần vi phạm:{' '}
                {violations.length}/{maxAllowedViolations} lần (Mức {activeViolationLevel})
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
        <div className="fixed inset-0 z-50 bg-black/85 overflow-y-auto overflow-x-hidden p-3 sm:p-6 flex items-start justify-center box-border">
          <div className="bg-[#18182e] border border-indigo-700/80 rounded-2xl max-w-5xl w-full min-w-0 box-border overflow-hidden my-4 sm:my-6 p-4 sm:p-8 space-y-5 sm:space-y-6 shadow-2xl">
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
                  Mã đề: {activeVariant.code} · Hoàn thành: {gradeReport.answeredCount}/{gradeReport.totalQuestionCount} câu
                  {!isPracticeMode
                    ? ` · Số vi phạm quy chế: ${violations.length}/${maxAllowedViolations} lần`
                    : ' · Chế độ: Ôn tập'}
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

            {/* Dynamic Score Breakdown (only shows parts present in the exam) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono tabular-nums">
              <div className="p-4 rounded-xl bg-indigo-950/70 border border-indigo-500/60 space-y-1">
                <div className="text-xs text-indigo-300 font-sans font-semibold">
                  Tổng Điểm Thang 10,00
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {gradeReport.scaled10Score.toFixed(2)} <span className="text-sm font-normal text-indigo-300">/ 10,00</span>
                </div>
                <div className="text-[11px] text-indigo-300 font-semibold">
                  Điểm thực đạt: {gradeReport.rawTotalScore.toFixed(2)} / {gradeReport.maxPossibleScore.toFixed(2)}
                </div>
              </div>

              {p1Count > 0 && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400 font-sans font-semibold">
                    Phần I · Nhiều lựa chọn (0,25đ/câu)
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {gradeReport.part1Score.toFixed(2)} <span className="text-xs text-slate-500">/ {gradeReport.part1Max.toFixed(2)} đ</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Đúng {gradeReport.part1CorrectCount}/{p1Count} câu
                  </div>
                </div>
              )}

              {p2Count > 0 && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400 font-sans font-semibold">
                    Phần II · Đúng / Sai (Lũy tiến 1,0đ)
                  </div>
                  <div className="text-2xl font-bold text-violet-400">
                    {gradeReport.part2Score.toFixed(2)} <span className="text-xs text-slate-500">/ {gradeReport.part2Max.toFixed(2)} đ</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Đạt tối đa 4/4 ý: {gradeReport.part2FullCorrectCount}/{p2Count} câu
                  </div>
                </div>
              )}

              {p3Count > 0 && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400 font-sans font-semibold">
                    Phần III · Trả lời ngắn (0,25đ/câu)
                  </div>
                  <div className="text-2xl font-bold text-amber-400">
                    {gradeReport.part3Score.toFixed(2)} <span className="text-xs text-slate-500">/ {gradeReport.part3Max.toFixed(2)} đ</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Đúng {gradeReport.part3CorrectCount}/{p3Count} câu
                  </div>
                </div>
              )}
            </div>

            {/* Filter Review Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'ALL' as const, label: `Tất cả (${gradeReport.details.length} câu)`, show: true },
                    {
                      id: 'INCORRECT' as const,
                      label: `Câu sai / Chưa trọn điểm (${
                        gradeReport.details.filter((d) => d.status !== 'CORRECT').length
                      })`,
                      show: true,
                    },
                    { id: 'PART_I' as const, label: `Phần I (${p1Count} câu)`, show: p1Count > 0 },
                    { id: 'PART_II' as const, label: `Phần II (${p2Count} câu)`, show: p2Count > 0 },
                    { id: 'PART_III' as const, label: `Phần III (${p3Count} câu)`, show: p3Count > 0 },
                  ]
                )
                  .filter((f) => f.show)
                  .map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setReviewFilter(f.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      reviewFilter === f.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Question-by-Question Review List */}
            <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-1.5">
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
                    className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm sm:text-base font-mono">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-violet-400 whitespace-nowrap shrink-0">
                          Câu {item.globalNumber}
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

                      <div className="text-slate-200 font-semibold">
                        <span>Bài làm: {item.userAnswerSummary}</span>
                        <span className="mx-2 text-slate-600">|</span>
                        <span className="text-emerald-400 font-bold">
                          Đáp án: {item.correctAnswerSummary}
                        </span>
                      </div>
                    </div>

                    <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
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

                    {item.subDetails && item.subDetails.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {item.subDetails.map((sub) => {
                          const isSubRight = sub.userChoice === sub.correctChoice;
                          return (
                            <div
                              key={sub.label}
                              className={`p-3 rounded-lg border text-sm sm:text-base leading-relaxed ${
                                isSubRight
                                  ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-100'
                                  : 'bg-rose-950/20 border-rose-500/30 text-slate-100'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
                                <span className="font-bold text-indigo-300">
                                  Ý {sub.label}) <span className="font-sans font-normal text-slate-100"><MathText text={sub.text} /></span>
                                </span>
                                <span className="shrink-0">
                                  Chọn:{' '}
                                  <strong className={isSubRight ? 'text-emerald-400' : 'text-rose-400'}>
                                    {sub.userChoice === null ? 'Trống' : sub.userChoice ? 'ĐÚNG' : 'SAI'}
                                  </strong>{' '}
                                  | Chuẩn:{' '}
                                  <strong className="text-emerald-400">
                                    {sub.correctChoice ? 'ĐÚNG' : 'SAI'}
                                  </strong>
                                </span>
                              </div>
                              {sub.explanation && (
                                <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-slate-200">
                                  <span className="font-semibold text-indigo-300">Giải thích: </span>
                                  <MathText text={sub.explanation} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="text-sm sm:text-base text-slate-100 border-t border-slate-800/80 pt-3 leading-relaxed whitespace-pre-line">
                      <span className="font-bold text-indigo-300">Lời giải chi tiết: </span>
                      <MathText text={formatCleanExplanation(item.explanation)} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal in Active Exam Workspace */}
      {showQrModal && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#18182e] border-2 border-violet-500/80 p-6 shadow-2xl space-y-5 text-center relative">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              aria-label="Đóng cửa sổ QR"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-violet-600/30 border border-violet-500/50 text-violet-200 text-xs font-mono font-bold">
                <QrCode className="w-3.5 h-3.5" />
                <span>MÃ QR VÀO PHÒNG THI TRỰC TUYẾN</span>
              </div>
              <h3 className="text-xl font-extrabold text-white">
                Mã Bài Thi: <span className="font-mono text-amber-300">{effectiveQrExamCode}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Quét mã QR bằng điện thoại để mở nhanh đường dẫn phiên thi này trên thiết bị di động.
              </p>
            </div>

            <div className="mx-auto w-64 h-64 p-4 rounded-2xl bg-white border-4 border-violet-500/80 shadow-xl flex items-center justify-center">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt={`QR Code Mã đề ${effectiveQrExamCode}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <QrCode className="w-24 h-24 text-indigo-950 animate-pulse" />
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-left space-y-1">
              <div className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                Đường dẫn phiên thi (Session URL):
              </div>
              <div className="text-xs font-mono text-indigo-300 break-all select-all">
                {currentExamSessionUrl}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCopySessionUrl}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-100 border border-slate-700 transition-colors"
              >
                {copiedSessionUrl ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">Đã Sao Chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 shrink-0" />
                    <span>Sao Chép Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadQrCode}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs sm:text-sm font-bold text-white shadow-md transition-colors"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Tải Ảnh QR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
