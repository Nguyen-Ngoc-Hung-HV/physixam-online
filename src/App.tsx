/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  GraduationCap,
  Home,
  KeyRound,
  Moon,
  Play,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Sun,
  Type,
} from 'lucide-react';
import {
  ExamData,
  OnlineExamAssignment,
  SavedExamSession,
  ScrambledExamVariant,
  WorkstationNode,
} from './types/exam';
import {
  FULL_MOET_28_PHYSICS_EXAM,
  INITIAL_WORKSTATION_NODES,
} from './data/seedPhysicsExam';
import {
  countCompletedQuestions,
  generateMultipleVariants,
  restoreUnshuffledVariant,
} from './utils/scramblerAndGrader';
import { parseAndMergeDetailedSolutionDocument } from './utils/examDocumentParser';
import { LandingPage } from './components/LandingPage';
import { TeacherPortal } from './components/TeacherPortal';
import { StudentExamEnvironment } from './components/StudentExamEnvironment';
import { StatisticsPortal } from './components/StatisticsPortal';
import { AdminPinModal } from './components/AdminPinModal';
import {
  fetchExamFromCloud,
  fetchLatestExamsFromCloud,
  fetchSubmissionsByExam,
  importExamToCloud,
  normalizeCloudExamRecord,
  submitExamToCloud,
  syncOnlineAssignmentToCloud,
} from './services/api';

const THEME_STORAGE_KEY = 'smarttest_gdpt2018_theme';
const FONT_SIZE_STORAGE_KEY = 'smarttest_gdpt2018_font_size';
const ONLINE_ASSIGNMENTS_STORAGE_KEY = 'smarttest_gdpt2018_online_assignments_v1';
const ADMIN_PIN_STORAGE_KEY = 'smarttest_gdpt2018_admin_pin_v1';
const DEFAULT_ADMIN_SIX_DIGIT_PIN = '123456';

/**
 * Consolidates duplicate intermediate-keystroke assignments created from the same uploaded examId
 * (e.g. "UPLOAD-54572" typed across 1102 -> 102 -> 1202 -> 120 -> 1205) into a single assignment
 * (keeping the newest examCode first in the list) while recovering any detailedSolutionContent
 * from sibling records and merging it into examData.
 */
function consolidateAndHydrateAssignments(
  list: OnlineExamAssignment[]
): OnlineExamAssignment[] {
  if (!Array.isArray(list) || list.length === 0) return list;

  // Group rich solution data by uploaded examId so if the latest assignment lost detailedSolutionContent,
  // it inherits it from any sibling record with the same examId.
  const solutionByUploadExamId = new Map<
    string,
    {
      detailedSolutionContent: string;
      detailedSolutionFileName?: string;
    }
  >();

  for (const item of list) {
    const exId = item?.examData?.examId?.trim();
    const sol = item?.detailedSolutionContent?.trim();
    if (exId && sol && !solutionByUploadExamId.has(exId)) {
      solutionByUploadExamId.set(exId, {
        detailedSolutionContent: sol,
        detailedSolutionFileName: item.detailedSolutionFileName,
      });
    }
  }

  const seenCodes = new Set<string>();
  const seenUploadExamIds = new Set<string>();
  const consolidated: OnlineExamAssignment[] = [];

  for (const item of list) {
    if (!item || !item.examCode) continue;
    const codeKey = item.examCode.trim().toUpperCase();
    if (seenCodes.has(codeKey)) continue;

    const exId = item.examData?.examId?.trim() || '';
    const isUploadedExam = /^UPLOAD-\d+$/i.test(exId);

    // If an uploaded exam (UPLOAD-xxxxx) already has its newest examCode in the list,
    // skip older intermediate keystroke codes (such as 120, 1202, 102, 1102 when 1205 is first).
    if (isUploadedExam && seenUploadExamIds.has(exId)) {
      continue;
    }

    seenCodes.add(codeKey);
    if (isUploadedExam) {
      seenUploadExamIds.add(exId);
    }

    const recoveredSol =
      item.detailedSolutionContent?.trim() ||
      (exId ? solutionByUploadExamId.get(exId)?.detailedSolutionContent : '') ||
      '';
    const recoveredFileName =
      item.detailedSolutionFileName ||
      (exId ? solutionByUploadExamId.get(exId)?.detailedSolutionFileName : undefined);

    let nextExamData = item.examData;
    if (recoveredSol && nextExamData) {
      const merged = parseAndMergeDetailedSolutionDocument(recoveredSol, nextExamData);
      if (merged.matchedQuestionCount > 0) {
        nextExamData = merged.mergedExam;
      }
    }

    const resolvedMode: 'exam' | 'practice' =
      item.mode === 'practice' ? 'practice' : 'exam';
    const resolvedLevel: 1 | 2 | 3 =
      item.violationLevel === 1
        ? 1
        : item.violationLevel === 3
        ? 3
        : 2;
    const resolvedMaxViolations =
      resolvedMode === 'practice'
        ? 0
        : resolvedLevel === 1
        ? 1
        : resolvedLevel === 3
        ? 4
        : 3;

    consolidated.push({
      ...item,
      mode: resolvedMode,
      violationLevel: resolvedLevel,
      maxViolations: resolvedMaxViolations,
      sourceMode: recoveredSol ? 'upload_with_solution' : item.sourceMode,
      detailedSolutionContent: recoveredSol || undefined,
      detailedSolutionFileName: recoveredFileName,
      examData: nextExamData,
    });
  }

  return consolidated;
}

export default function App() {
  // Dual-Theme Switcher: 'light' ("Nền Sáng" - Default) | 'dark' ("Nền Tối")
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // Fallback to light
    }
    return 'light';
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage error
    }
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('theme-light');
      document.body.classList.add('theme-light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('theme-light');
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Dual Font-Size Switcher: 'normal' (Cỡ chữ hiện tại) | 'large' (Cỡ chữ lớn hơn) — No password required
  const [fontSizeMode, setFontSizeMode] = useState<'normal' | 'large'>(() => {
    try {
      const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
      if (saved === 'large' || saved === 'normal') return saved;
    } catch {
      // Fallback to normal
    }
    return 'normal';
  });

  useEffect(() => {
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSizeMode);
    } catch {
      // Ignore storage error
    }
    if (fontSizeMode === 'large') {
      document.documentElement.classList.add('font-size-large');
      document.body.classList.add('font-size-large');
    } else {
      document.documentElement.classList.remove('font-size-large');
      document.body.classList.remove('font-size-large');
    }
  }, [fontSizeMode]);

  const toggleFontSizeMode = useCallback(() => {
    setFontSizeMode((prev) => (prev === 'normal' ? 'large' : 'normal'));
  }, []);

  // Top-level view hierarchy: 'home' | 'scrambler' | 'teacher' | 'student' | 'statistics'
  const [currentView, setCurrentView] = useState<'home' | 'scrambler' | 'teacher' | 'student' | 'statistics'>('home');
  const [teacherSubTab, setTeacherSubTab] = useState<'bank' | 'scrambler' | 'monitor' | 'online_exam'>('bank');
  const [homeScrollProgress, setHomeScrollProgress] = useState<number>(0);
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeightPx, setHeaderHeightPx] = useState<number>(68);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const syncHeight = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 40) setHeaderHeightPx(h);
    };
    syncHeight();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncHeight);
      observer.observe(el);
    }
    window.addEventListener('resize', syncHeight, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [fontSizeMode, currentView]);

  useEffect(() => {
    if (currentView !== 'home') {
      setHomeScrollProgress(0);
      return;
    }

    const updateScrollProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) {
        setHomeScrollProgress(0);
        return;
      }
      const percentage = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
      setHomeScrollProgress(percentage);
    };

    updateScrollProgress();
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
      window.removeEventListener('resize', updateScrollProgress);
    };
  }, [currentView]);

  // 6-Digit Admin Password Protection State (Default: 123456, changeable by Network Admin)
  const [adminPin, setAdminPin] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_PIN_STORAGE_KEY);
      if (saved && /^\d{6}$/.test(saved)) return saved;
    } catch {
      // Fallback to default 6-digit PIN
    }
    return DEFAULT_ADMIN_SIX_DIGIT_PIN;
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);
  const [adminModalMode, setAdminModalMode] = useState<'verify' | 'change'>('verify');
  const [adminTargetFeatureLabel, setAdminTargetFeatureLabel] = useState<string>('');
  const pendingAdminActionRef = useRef<(() => void) | null>(null);

  const requestAdminAuthentication = useCallback(
    (featureLabel: string, onAuthorized: () => void) => {
      if (isAdminAuthenticated) {
        onAuthorized();
        return;
      }
      pendingAdminActionRef.current = onAuthorized;
      setAdminTargetFeatureLabel(featureLabel);
      setAdminModalMode('verify');
      setAdminModalOpen(true);
    },
    [isAdminAuthenticated]
  );

  const handleChangeAdminPin = useCallback((newPin: string) => {
    if (!/^\d{6}$/.test(newPin)) return;
    setAdminPin(newPin);
    try {
      localStorage.setItem(ADMIN_PIN_STORAGE_KEY, newPin);
    } catch {
      // Ignore storage error
    }
  }, []);

  // Exam Bank & Scrambled Variants State (preserved across all view transitions)
  const [examData, setExamData] = useState<ExamData>(FULL_MOET_28_PHYSICS_EXAM);
  const [variants, setVariants] = useState<ScrambledExamVariant[]>(() =>
    generateMultipleVariants(
      FULL_MOET_28_PHYSICS_EXAM,
      ['101', '102', '103', '104', '1102', '1104', '1106', '1108'],
      'GDPT2018-INIT'
    )
  );
  const [studentTargetCode, setStudentTargetCode] = useState<string>('');

  // Synchronized Online Exam Assignments (Tab 4. Tổ Chức Thi Online)
  const [onlineAssignments, setOnlineAssignments] = useState<OnlineExamAssignment[]>(() => {
    try {
      const raw = localStorage.getItem(ONLINE_ASSIGNMENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OnlineExamAssignment[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = consolidateAndHydrateAssignments(parsed);
          localStorage.setItem(ONLINE_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(cleaned));
          return cleaned;
        }
      }
    } catch {
      // Fallback to default seed assignment
    }
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://smarttest.edu.vn';
    return [
      {
        id: 'ONLINE-ASSIGN-1102',
        examCode: '1102',
        examLink: `${baseUrl}/?examCode=1102`,
        examTitle: 'Kiểm Tra Giữa Học Kỳ I - Năm Học 2026 - 2027',
        subject: 'Vật Lý 12',
        assignedClasses: ['12A1', '12A2'],
        startTime: '2026-11-10T07:30',
        endTime: '2026-11-10T22:00',
        durationMinutes: 50,
        mode: 'exam',
        violationLevel: 2,
        maxViolations: 3,
        sourceMode: 'bank',
        sourceBankExamId: 'BANK-SEED-TN-01',
        examData: FULL_MOET_28_PHYSICS_EXAM,
        createdAt: '10/11/2026 08:00',
      },
    ];
  });

  // Helper to apply a normalized cloud exam record from MongoDB Atlas into global state
  const applyNormalizedCloudExam = useCallback(
    (
      normalized: {
        examData: ExamData;
        variants: ScrambledExamVariant[];
        assignment: OnlineExamAssignment;
      }
    ) => {
      setOnlineAssignments((prev) => {
        const combined = [normalized.assignment, ...prev];
        const nextList = consolidateAndHydrateAssignments(combined);
        const primaryMatch =
          nextList.find(
            (a) =>
              a.examCode.trim().toUpperCase() ===
              normalized.assignment.examCode.trim().toUpperCase()
          ) || nextList[0];

        if (primaryMatch?.examData) {
          setExamData(primaryMatch.examData);
          setVariants((prevVars) => {
            const hydratedCloudVars = normalized.variants.map((v) =>
              restoreUnshuffledVariant(v, primaryMatch.examData)
            );
            const cloudCodes = new Set(
              hydratedCloudVars.map((v) => v.code.trim().toUpperCase())
            );
            const others = prevVars.filter(
              (v) => !cloudCodes.has(v.code.trim().toUpperCase())
            );
            return [...hydratedCloudVars, ...others];
          });
        } else {
          setExamData(normalized.examData);
          setVariants((prevVars) => {
            const cloudCodes = new Set(
              normalized.variants.map((v) => v.code.trim().toUpperCase())
            );
            const others = prevVars.filter(
              (v) => !cloudCodes.has(v.code.trim().toUpperCase())
            );
            return [...normalized.variants, ...others];
          });
        }

        try {
          localStorage.setItem(ONLINE_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(nextList));
        } catch {
          // Ignore storage error
        }
        return nextList;
      });
    },
    []
  );

  // Automatically open Student Portal if examCode query parameter is present in URL,
  // and hydrate the latest assigned exam(s) from MongoDB Atlas / Server Cloud
  useEffect(() => {
    let urlCode = '';
    try {
      const params = new URLSearchParams(window.location.search);
      const rawCode = params.get('examCode');
      if (rawCode && rawCode.trim()) {
        urlCode = rawCode.trim();
        setStudentTargetCode(urlCode);
        setCurrentView('student');
      }
    } catch {
      // Ignore URL parse error
    }

    // 1. Fetch latest exams from MongoDB Atlas (/api/exams)
    fetchLatestExamsFromCloud()
      .then((res) => {
        if (res.success && Array.isArray(res.exams) && res.exams.length > 0) {
          // Apply all cloud exams in reverse order so the newest one (index 0) is primary
          for (let i = res.exams.length - 1; i >= 0; i -= 1) {
            const norm = normalizeCloudExamRecord(res.exams[i]);
            if (norm) {
              applyNormalizedCloudExam(norm);
            }
          }
        } else if (res.success && res.latestExam) {
          const norm = normalizeCloudExamRecord(res.latestExam, urlCode || undefined);
          if (norm) {
            applyNormalizedCloudExam(norm);
          }
        }
      })
      .catch(() => {
        // Fallback to local state
      });

    // 2. If a specific examCode was passed in URL, also fetch that exact examCode from MongoDB Atlas
    if (urlCode) {
      fetchExamFromCloud(urlCode)
        .then((res) => {
          if (res.success && res.exam) {
            const norm = normalizeCloudExamRecord(res.exam, urlCode);
            if (norm) {
              applyNormalizedCloudExam(norm);
            }
          }
        })
        .catch(() => {
          // Ignore error
        });
    }
  }, [applyNormalizedCloudExam]);

  // Simulated LAN Workstations + Live Browser Student Session Sync
  const [workstations, setWorkstations] = useState<WorkstationNode[]>(
    INITIAL_WORKSTATION_NODES
  );
  const [liveSessions, setLiveSessions] = useState<SavedExamSession[]>(() => {
    const loaded: SavedExamSession[] = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith('smarttest_gdpt2018_session_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as SavedExamSession;
            if (parsed && parsed.studentId && parsed.examCode) {
              loaded.push(parsed);
            }
          }
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return loaded;
  });

  // Hydrate submissions from MongoDB Atlas / Server Cloud on mount
  useEffect(() => {
    fetchSubmissionsByExam('ALL')
      .then((res) => {
        if (res.success && Array.isArray(res.submissions) && res.submissions.length > 0) {
          setLiveSessions(res.submissions);
        }
      })
      .catch(() => {
        // Graceful fallback to localStorage already loaded
      });
  }, []);

  const handleUpdateExamData = useCallback((nextExam: ExamData) => {
    setExamData(nextExam);
    setVariants((prev) => {
      const codes = prev.map((v) => v.code);
      const nextVariants = generateMultipleVariants(
        nextExam,
        codes.length > 0 ? codes : ['101', '102', '103', '104'],
        `UPDATE-${Date.now()}`
      );
      void importExamToCloud({
        examId: nextExam.examId,
        examCode: nextVariants[0]?.code || '1102',
        examData: nextExam,
        variants: nextVariants,
      });
      return nextVariants;
    });
  }, []);

  const handleRegenerateVariants = useCallback(
    (
      codes: string[],
      salt: string,
      examOverride?: ExamData,
      options?: import('./utils/scramblerAndGrader').ScramblerGenerationOptions
    ): ScrambledExamVariant[] => {
      const targetExam = examOverride || examData;
      if (examOverride) {
        setExamData(examOverride);
      }
      const nextVariants = generateMultipleVariants(targetExam, codes, salt, options);
      setVariants(nextVariants);
      void importExamToCloud({
        examId: targetExam.examId,
        examCode: nextVariants[0]?.code || codes[0] || '1102',
        examData: targetExam,
        variants: nextVariants,
      });
      return nextVariants;
    },
    [examData]
  );

  // Sync Student Exam Session directly into Teacher LAN Monitor Table & MongoDB Atlas
  const handleStudentSessionUpdate = useCallback(
    (session: SavedExamSession) => {
      void submitExamToCloud({
        ...session,
        examId: examData.examId,
        room: 'MAY-01',
      });

      setLiveSessions((prev) => {
        const filtered = prev.filter(
          (s) => !(s.studentId === session.studentId && s.examCode === session.examCode)
        );
        return [session, ...filtered];
      });

      const variantObj =
        variants.find((v) => v.code === session.examCode) || variants[0];
      const totalQ = variantObj
        ? variantObj.part1.length + variantObj.part2.length + variantObj.part3.length
        : 28;
      const answered = variantObj
        ? countCompletedQuestions(variantObj, session.answers)
        : 0;

      const liveNode: WorkstationNode = {
        workstationId: 'MAY-01',
        ipAddress: '192.168.1.101',
        studentName: session.studentName,
        studentId: session.studentId,
        examCode: session.examCode,
        status: session.isSubmitted
          ? 'SUBMITTED'
          : session.violations.length > 0
          ? 'VIOLATION_WARN'
          : 'ACTIVE',
        answeredCount: answered,
        totalQuestions: totalQ,
        remainingSeconds: session.remainingSeconds,
        violationCount: session.violations.length,
        lastEventText: session.isSubmitted
          ? `Đã nộp bài lúc ${session.submittedAt || session.lastSavedAt}`
          : session.violations.length > 0
          ? session.violations[session.violations.length - 1].description
          : `Đang làm bài (Lưu lúc ${session.lastSavedAt})`,
        score: session.finalScore,
        isLiveBrowserUser: true,
      };

      setWorkstations((prev) => {
        const others = prev.filter((w) => w.workstationId !== 'MAY-01');
        return [liveNode, ...others];
      });
    },
    [variants, examData.examId]
  );

  const handleResetWorkstationViolations = useCallback((workstationId: string) => {
    setWorkstations((prev) =>
      prev.map((w) =>
        w.workstationId === workstationId
          ? {
              ...w,
              violationCount: 0,
              status: w.status === 'VIOLATION_WARN' ? 'ACTIVE' : w.status,
              lastEventText: 'Giáo viên đã xác nhận & xoá cảnh báo vi phạm',
            }
          : w
      )
    );
  }, []);

  const handleSimulateLabTick = useCallback(() => {
    setWorkstations((prev) =>
      prev.map((w) => {
        if (w.isLiveBrowserUser || w.status === 'SUBMITTED') return w;
        const nextAnswered = Math.min(
          w.totalQuestions,
          w.answeredCount + (Math.random() > 0.45 ? 1 : 0)
        );
        const nextSec = Math.max(60, w.remainingSeconds - 35);
        const isDone = nextAnswered >= w.totalQuestions && Math.random() > 0.65;
        return {
          ...w,
          answeredCount: nextAnswered,
          remainingSeconds: nextSec,
          status: isDone ? 'SUBMITTED' : w.status,
          score: isDone ? Number((7.5 + Math.random() * 2.25).toFixed(2)) : w.score,
          lastEventText: isDone
            ? 'Đã nộp bài hoàn tất'
            : `Đang làm câu ${nextAnswered}/${w.totalQuestions}`,
        };
      })
    );
  }, []);

  const handleSaveOnlineAssignment = useCallback(
    (assignment: OnlineExamAssignment) => {
      let baseExamData: ExamData = {
        ...assignment.examData,
        title: assignment.examTitle || assignment.examData.title,
        subject: assignment.subject || assignment.examData.subject,
        durationMinutes: assignment.durationMinutes || assignment.examData.durationMinutes || 50,
      };
      if (assignment.detailedSolutionContent?.trim()) {
        const merged = parseAndMergeDetailedSolutionDocument(
          assignment.detailedSolutionContent,
          baseExamData
        );
        if (merged.matchedQuestionCount > 0) {
          baseExamData = merged.mergedExam;
        }
      }
      const updatedAssignment: OnlineExamAssignment = {
        ...assignment,
        examData: baseExamData,
      };

      setOnlineAssignments((prev) => {
        const filtered = prev.filter(
          (a) =>
            a.id !== updatedAssignment.id &&
            a.examCode.trim().toUpperCase() !== updatedAssignment.examCode.trim().toUpperCase()
        );
        const nextList = consolidateAndHydrateAssignments([
          updatedAssignment,
          ...filtered,
        ]);
        try {
          localStorage.setItem(ONLINE_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(nextList));
        } catch {
          // Ignore storage error
        }
        return nextList;
      });

      setExamData(baseExamData);
      setVariants((prev) => {
        const cleanCode = updatedAssignment.examCode.trim();
        const generated = generateMultipleVariants(
          baseExamData,
          [cleanCode],
          `ONLINE-SYNC-${cleanCode}-${Date.now()}`
        );
        const targetVariant = generated[0]
          ? restoreUnshuffledVariant(generated[0], baseExamData)
          : undefined;
        const others = prev.filter(
          (v) => v.code.trim().toUpperCase() !== cleanCode.toUpperCase()
        );
        const nextList = targetVariant ? [targetVariant, ...others] : prev;
        void syncOnlineAssignmentToCloud(updatedAssignment, nextList);
        return nextList;
      });
    },
    []
  );

  const handleDeleteOnlineAssignment = useCallback((assignmentId: string) => {
    setOnlineAssignments((prev) => {
      const nextList = prev.filter((a) => a.id !== assignmentId);
      try {
        localStorage.setItem(ONLINE_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(nextList));
      } catch {
        // Ignore storage error
      }
      return nextList;
    });
  }, []);

  const handleLaunchStudentWithCode = useCallback((code?: string) => {
    setStudentTargetCode(code || '');
    setCurrentView('student');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateQuickScrambler = useCallback(() => {
    setTeacherSubTab('scrambler');
    setCurrentView('scrambler');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateTeacher = useCallback(
    (subTab?: 'bank' | 'scrambler' | 'monitor' | 'online_exam') => {
      // Guests/students are allowed to use the Scrambler & Exporter without a password
      if (subTab === 'scrambler' && !isAdminAuthenticated) {
        handleNavigateQuickScrambler();
        return;
      }
      requestAdminAuthentication('Cổng Quản Trị Giáo Viên', () => {
        if (subTab) {
          setTeacherSubTab(subTab);
        }
        setCurrentView('teacher');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    [isAdminAuthenticated, handleNavigateQuickScrambler, requestAdminAuthentication]
  );

  const handleNavigateStatistics = useCallback(() => {
    requestAdminAuthentication('Thống Kê Điểm & Báo Cáo', () => {
      setCurrentView('statistics');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [requestAdminAuthentication]);

  const handleScrollToFeatures = useCallback(() => {
    if (currentView !== 'home') {
      setCurrentView('home');
      window.setTimeout(() => {
        document
          .getElementById('features-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } else {
      document
        .getElementById('features-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentView]);

  const handleDeleteStudentRecord = useCallback(
    (studentId: string, examCode: string, workstationId?: string) => {
      const cleanId = studentId.trim().toUpperCase();
      const cleanCode = examCode.trim();
      try {
        localStorage.removeItem(`smarttest_gdpt2018_session_${cleanId}_${cleanCode}`);
      } catch {
        // Ignore storage error
      }
      setLiveSessions((prev) =>
        prev.filter(
          (s) =>
            !(
              s.studentId.trim().toUpperCase() === cleanId &&
              s.examCode.trim() === cleanCode
            )
        )
      );
      setWorkstations((prev) =>
        prev.filter(
          (w) =>
            !(
              (w.studentId.trim().toUpperCase() === cleanId &&
                w.examCode.trim() === cleanCode) ||
              (workstationId && w.workstationId === workstationId)
            )
        )
      );
    },
    []
  );

  const handleClearAllRecords = useCallback(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith('smarttest_gdpt2018_session_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore storage error
    }
    setLiveSessions([]);
    setWorkstations([]);
  }, []);

  const handleRestoreSampleRecords = useCallback(() => {
    setWorkstations(INITIAL_WORKSTATION_NODES);
  }, []);

  const handleResetSystemCache = useCallback(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('smarttest_gdpt2018_session_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore storage access errors
    }
    setExamData(FULL_MOET_28_PHYSICS_EXAM);
    setVariants(
      generateMultipleVariants(
        FULL_MOET_28_PHYSICS_EXAM,
        ['101', '102', '103', '104'],
        'GDPT2018-RESET'
      )
    );
    setWorkstations(INITIAL_WORKSTATION_NODES);
    setLiveSessions([]);
  }, []);

  return (
    <div
      className={`min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden flex flex-col box-border transition-colors duration-200 ${
        theme === 'light'
          ? 'theme-light bg-[#F8FAFC] text-[#172033]'
          : 'bg-[#0b0f19] text-slate-100'
      }`}
    >
      {/* Persistent Top Navigation Bar — Responsive 1-Row (Wide Desktop >=1180px) / Clean 2-Row (Split Preview & Tablet <1180px) */}
      <header
        ref={headerRef}
        className={`fixed top-0 inset-x-0 z-40 w-full max-w-[100vw] min-w-0 box-border overflow-hidden backdrop-blur-md border-b transition-colors duration-200 no-print ${
          theme === 'light'
            ? 'bg-white/95 border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
            : 'bg-[#0b0f19]/95 border-slate-800/90'
        }`}
      >
        <div className="w-full max-w-[1440px] min-w-0 mx-auto px-3.5 sm:px-4 lg:px-5 py-2 min-[1240px]:py-2.5 min-h-[60px] sm:min-h-[68px] flex flex-wrap items-center justify-between gap-x-2 gap-y-2 box-border">
          {/* Zone 1: Brand Identity + Theme & Font-Size Utility Controls */}
          <div className="order-1 flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setCurrentView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              title="SmartTest Physics GDPT 2018 — Nền tảng khảo thí và ôn luyện Vật lí thông minh"
              aria-label="Trang chủ SmartTest Physics"
              className="animate-logo-text-fade-in group relative flex items-center gap-1.5 sm:gap-2 rounded-xl focus:outline-none shrink-0"
            >
              <div className="animate-logo-entrance relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden bg-[#081226] shadow-xs ring-1 ring-[#6D28D9]/25 dark:ring-white/20 group-hover:scale-105 group-hover:ring-[#6D28D9]/50 transition-all duration-300 ease-out shrink-0">
                <img
                  src="/logo.png"
                  alt="SmartTest Logo"
                  referrerPolicy="no-referrer"
                  className="animate-logo-entrance w-full h-full object-contain scale-100 transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20 animate-pulse"
                />
              </div>
              <div className="animate-logo-text-fade-in flex flex-col leading-tight shrink-0">
                <span
                  className={`text-[12px] sm:text-[13px] xl:text-[14px] font-extrabold tracking-tight whitespace-nowrap transition-colors duration-200 ${
                    theme === 'light'
                      ? 'text-[#172033] group-hover:text-[#6D28D9]'
                      : 'text-white group-hover:text-violet-300'
                  }`}
                >
                  <span className="sm:hidden">SmartTest</span>
                  <span className="hidden sm:inline">SmartTest Physics</span>
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold tracking-wider uppercase whitespace-nowrap ${
                    theme === 'light' ? 'text-[#64748B]' : 'text-slate-400'
                  }`}
                >
                  GDPT 2018
                </span>
              </div>
            </a>

            <div
              aria-hidden="true"
              className={`hidden sm:block h-5 w-px mx-0.5 shrink-0 ${
                theme === 'light' ? 'bg-[#E2E8F0]' : 'bg-slate-800'
              }`}
            />

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={
                theme === 'dark'
                  ? 'Chuyển sang giao diện Nền Sáng (Light Mode)'
                  : 'Chuyển sang giao diện Nền Tối (Dark Mode)'
              }
              aria-label="Chuyển đổi giao diện Sáng / Tối"
              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] sm:text-[13px] font-bold transition-all whitespace-nowrap shrink-0 ${
                theme === 'dark'
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-100'
                  : 'bg-[#F8FAFC] hover:bg-slate-100 border-[#E2E8F0] text-[#172033]'
              }`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Nền Sáng</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
                  <span className="hidden sm:inline">Nền Tối</span>
                </>
              )}
            </button>

            {/* Font-Size Switcher Button */}
            <button
              type="button"
              onClick={toggleFontSizeMode}
              title={
                fontSizeMode === 'normal'
                  ? 'Chuyển sang chế độ Cỡ chữ lớn hơn'
                  : 'Chuyển về chế độ Cỡ chữ mặc định'
              }
              aria-label="Chuyển đổi cỡ chữ hệ thống"
              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] sm:text-[13px] font-bold transition-all whitespace-nowrap shrink-0 ${
                fontSizeMode === 'large'
                  ? 'bg-[#6D28D9] hover:bg-[#5B21B6] border-[#6D28D9] text-white shadow-xs'
                  : theme === 'dark'
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-100'
                  : 'bg-[#F8FAFC] hover:bg-slate-100 border-[#E2E8F0] text-[#172033]'
              }`}
            >
              <Type className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Cỡ chữ</span>
            </button>
          </div>

          {/* Zone 3 (Order 2 on <1180px so it stays top-right; Order 3 on >=1180px): Primary CTA Action Buttons */}
          <div className="order-2 min-[1180px]:order-3 flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 shrink-0">
            {currentView === 'teacher' && (
              <button
                type="button"
                onClick={() => {
                  setAdminTargetFeatureLabel('Cài Đặt Mật Khẩu Quản Trị (6 Số)');
                  setAdminModalMode('change');
                  setAdminModalOpen(true);
                }}
                title="Đổi mật khẩu 6 số hoặc khóa quyền Quản trị"
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-[11.5px] sm:text-[13px] font-bold rounded-xl border bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white transition-colors whitespace-nowrap shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                <span>Quản trị</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleLaunchStudentWithCode()}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11.5px] sm:text-[13px] font-bold rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white transition-all whitespace-nowrap shrink-0 shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Vào phòng thi</span>
            </button>
          </div>

          {/* Zone 2: Centered & Responsive Main Navigation with flex-wrap, shrink-0, and staggered slide-in-down entrance */}
          <nav
            className={`order-3 min-[1180px]:order-2 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 w-full min-[1180px]:w-auto min-[1180px]:flex-1 min-w-0 shrink-0 pt-1.5 min-[1180px]:pt-0 border-t min-[1180px]:border-t-0 ${
              theme === 'light' ? 'border-[#E2E8F0]/70' : 'border-slate-800/70'
            }`}
          >
            <button
              type="button"
              style={{ animationDelay: '50ms' }}
              onClick={() => {
                setCurrentView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`animate-nav-slide-in-down inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11.5px] sm:text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'home'
                  ? theme === 'light'
                    ? 'bg-[#6D28D9]/10 text-[#6D28D9]'
                    : 'bg-violet-500/20 text-violet-300'
                  : theme === 'light'
                  ? 'text-[#172033] hover:text-[#6D28D9] hover:bg-slate-100/80'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Home className="w-3.5 h-3.5 text-[#6D28D9] dark:text-violet-400 shrink-0" />
              <span>Trang chủ</span>
            </button>

            <button
              type="button"
              style={{ animationDelay: '100ms' }}
              onClick={handleNavigateQuickScrambler}
              className={`animate-nav-slide-in-down inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11.5px] sm:text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'scrambler'
                  ? theme === 'light'
                    ? 'bg-[#6D28D9]/10 text-[#6D28D9]'
                    : 'bg-violet-500/20 text-violet-300'
                  : theme === 'light'
                  ? 'text-[#172033] hover:text-[#6D28D9] hover:bg-slate-100/80'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 text-[#6D28D9] dark:text-violet-400 shrink-0" />
              <span>Trộn đề</span>
            </button>

            <button
              type="button"
              style={{ animationDelay: '150ms' }}
              onClick={() => handleNavigateTeacher()}
              className={`animate-nav-slide-in-down inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11.5px] sm:text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'teacher'
                  ? theme === 'light'
                    ? 'bg-[#6D28D9]/10 text-[#6D28D9]'
                    : 'bg-violet-500/20 text-violet-300'
                  : theme === 'light'
                  ? 'text-[#172033] hover:text-[#6D28D9] hover:bg-slate-100/80'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#6D28D9] dark:text-violet-400 shrink-0" />
              <span>Cổng giáo viên</span>
            </button>

            <button
              type="button"
              style={{ animationDelay: '200ms' }}
              onClick={() => handleLaunchStudentWithCode()}
              className={`animate-nav-slide-in-down inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11.5px] sm:text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'student'
                  ? theme === 'light'
                    ? 'bg-[#6D28D9]/10 text-[#6D28D9]'
                    : 'bg-violet-500/20 text-violet-300'
                  : theme === 'light'
                  ? 'text-[#172033] hover:text-[#6D28D9] hover:bg-slate-100/80'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#6D28D9] dark:text-violet-400 shrink-0" />
              <span>Cổng học sinh</span>
            </button>

            <button
              type="button"
              style={{ animationDelay: '250ms' }}
              onClick={handleNavigateStatistics}
              className={`animate-nav-slide-in-down inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11.5px] sm:text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'statistics'
                  ? theme === 'light'
                    ? 'bg-[#6D28D9]/10 text-[#6D28D9]'
                    : 'bg-violet-500/20 text-violet-300'
                  : theme === 'light'
                  ? 'text-[#172033] hover:text-[#6D28D9] hover:bg-slate-100/80'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#6D28D9] dark:text-violet-400 shrink-0" />
              <span>Thống kê</span>
            </button>

            <button
              type="button"
              style={{ animationDelay: '300ms' }}
              onClick={handleScrollToFeatures}
              className={`animate-nav-slide-in-down inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11.5px] sm:text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                theme === 'light'
                  ? 'text-[#172033] hover:text-[#6D28D9] hover:bg-slate-100/80'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#6D28D9] dark:text-violet-400 shrink-0" />
              <span>Giới thiệu</span>
            </button>
          </nav>
        </div>

        {/* Subtle Scroll Progress Indicator under Header (Active on Home Page) */}
        {currentView === 'home' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] w-full bg-transparent overflow-hidden"
          >
            <div
              className="h-full bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#16A34A] transition-[width] duration-150 ease-out"
              style={{ width: `${homeScrollProgress}%` }}
            />
          </div>
        )}
      </header>

      {/* 6-Digit Admin Password Verification & Change Password Modal */}
      <AdminPinModal
        isOpen={adminModalOpen}
        initialMode={adminModalMode}
        currentPin={adminPin}
        isAdminAuthenticated={isAdminAuthenticated}
        targetFeatureLabel={adminTargetFeatureLabel}
        onClose={() => {
          setAdminModalOpen(false);
          pendingAdminActionRef.current = null;
        }}
        onSuccessVerify={() => {
          setIsAdminAuthenticated(true);
          setAdminModalOpen(false);
          const pending = pendingAdminActionRef.current;
          pendingAdminActionRef.current = null;
          if (pending) {
            pending();
          } else {
            setCurrentView('teacher');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onChangePin={handleChangeAdminPin}
        onLogoutAdmin={() => {
          setIsAdminAuthenticated(false);
          if (currentView === 'teacher' || currentView === 'statistics') {
            setCurrentView('home');
          }
        }}
      />

      {/* Main Content Area — Preserving state across 'home' | 'scrambler' | 'teacher' | 'student' | 'statistics' */}
      <main
        style={{ paddingTop: `${headerHeightPx}px` }}
        className="flex-1 w-full max-w-[100vw] min-w-0 overflow-x-hidden box-border"
      >
        {currentView === 'home' && (
          <LandingPage
            examData={examData}
            variants={variants}
            workstations={workstations}
            onNavigateTeacher={handleNavigateTeacher}
            onNavigateStudent={handleLaunchStudentWithCode}
            onNavigateStatistics={handleNavigateStatistics}
            onResetSystemCache={handleResetSystemCache}
            isAdminAuthenticated={isAdminAuthenticated}
            onRequestAdminAuth={requestAdminAuthentication}
          />
        )}

        {(currentView === 'scrambler' || (currentView === 'teacher' && isAdminAuthenticated)) && (
          <TeacherPortal
            activeSubTab={currentView === 'scrambler' ? 'scrambler' : teacherSubTab}
            setActiveSubTab={setTeacherSubTab}
            isStandaloneScrambler={currentView === 'scrambler'}
            examData={examData}
            onUpdateExamData={handleUpdateExamData}
            variants={variants}
            onRegenerateVariants={handleRegenerateVariants}
            workstations={workstations}
            onResetWorkstationViolations={handleResetWorkstationViolations}
            onSimulateLabTick={handleSimulateLabTick}
            onLaunchStudentWithCode={handleLaunchStudentWithCode}
            liveSessions={liveSessions}
            onlineAssignments={onlineAssignments}
            onSaveOnlineAssignment={handleSaveOnlineAssignment}
            onDeleteOnlineAssignment={handleDeleteOnlineAssignment}
            onNavigateHome={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'student' && (
          <StudentExamEnvironment
            variants={variants}
            initialExamCode={studentTargetCode}
            onSessionUpdate={handleStudentSessionUpdate}
            onlineAssignments={onlineAssignments}
            onCloudExamLoaded={applyNormalizedCloudExam}
          />
        )}

        {currentView === 'statistics' && isAdminAuthenticated && (
          <StatisticsPortal
            examData={examData}
            variants={variants}
            workstations={workstations}
            liveSessions={liveSessions}
            onDeleteStudentRecord={handleDeleteStudentRecord}
            onClearAllRecords={handleClearAllRecords}
            onRestoreSampleRecords={handleRestoreSampleRecords}
          />
        )}
      </main>

      {/* Minimalist Premium EdTech Footer */}
      <footer
        className={`border-t px-6 py-8 text-xs transition-colors duration-200 no-print ${
          theme === 'light'
            ? 'bg-white border-[#E2E8F0] text-[#64748B]'
            : 'bg-[#080b12] border-slate-900 text-slate-400'
        }`}
      >
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <img
                src="/logo.png"
                alt="SmartTest Logo"
                referrerPolicy="no-referrer"
                className="animate-logo-entrance w-6 h-6 rounded-lg object-cover shrink-0 ring-1 ring-slate-200 dark:ring-white/20"
              />
              <span
                className={`text-sm font-extrabold tracking-tight ${
                  theme === 'light' ? 'text-[#172033]' : 'text-white'
                }`}
              >
                SmartTest Physics GDPT 2018
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#6D28D9]/10 text-[#6D28D9] dark:text-violet-300 font-mono text-[11px] font-bold">
                Phiên bản v2.6 GDPT 2018
              </span>
            </div>
            <p className="text-xs leading-relaxed max-w-xl">
              Nền tảng khảo thí, trộn đề và ôn luyện Vật lí THPT theo Chương trình GDPT 2018.
            </p>
            <p className="text-[11px] text-slate-400">
              © {new Date().getFullYear()} SmartTest Physics GDPT 2018. Bảo lưu mọi quyền.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-semibold">
            <button
              type="button"
              onClick={() => {
                setCurrentView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#6D28D9] transition-colors whitespace-nowrap"
            >
              Trang chủ
            </button>
            <button
              type="button"
              onClick={handleNavigateQuickScrambler}
              className="hover:text-[#6D28D9] transition-colors whitespace-nowrap"
            >
              Trộn đề
            </button>
            <button
              type="button"
              onClick={() => handleNavigateTeacher('bank')}
              className="hover:text-[#6D28D9] transition-colors whitespace-nowrap"
            >
              Cổng giáo viên
            </button>
            <button
              type="button"
              onClick={() => handleLaunchStudentWithCode('101')}
              className="hover:text-[#6D28D9] transition-colors whitespace-nowrap"
            >
              Cổng học sinh
            </button>
            <button
              type="button"
              onClick={handleNavigateStatistics}
              className="hover:text-[#6D28D9] transition-colors whitespace-nowrap"
            >
              Thống kê
            </button>
            <button
              type="button"
              onClick={() =>
                requestAdminAuthentication(
                  'Xoá Bộ Nhớ Đệm Hệ Thống (Reset Cache)',
                  handleResetSystemCache
                )
              }
              className="text-rose-500 hover:text-rose-600 font-mono font-bold transition-colors whitespace-nowrap"
            >
              Reset Cache
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
