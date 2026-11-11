/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
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
} from './utils/scramblerAndGrader';
import { LandingPage } from './components/LandingPage';
import { TeacherPortal } from './components/TeacherPortal';
import { StudentExamEnvironment } from './components/StudentExamEnvironment';
import { StatisticsPortal } from './components/StatisticsPortal';
import {
  fetchSubmissionsByExam,
  importExamToCloud,
  submitExamToCloud,
  syncOnlineAssignmentToCloud,
} from './services/api';

const THEME_STORAGE_KEY = 'smarttest_gdpt2018_theme';
const ONLINE_ASSIGNMENTS_STORAGE_KEY = 'smarttest_gdpt2018_online_assignments_v1';

export default function App() {
  // Dual-Theme Switcher: 'dark' ("Tím Than") | 'light' ("Nền Trắng")
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // Fallback to dark
    }
    return 'dark';
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage error
    }
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Top-level 4-view hierarchy: 'home' | 'teacher' | 'student' | 'statistics'
  const [currentView, setCurrentView] = useState<'home' | 'teacher' | 'student' | 'statistics'>('home');
  const [teacherSubTab, setTeacherSubTab] = useState<'bank' | 'scrambler' | 'monitor' | 'online_exam'>('bank');

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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

  // Automatically open Student Portal if examCode query parameter is present in URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('examCode');
      if (urlCode && urlCode.trim()) {
        setStudentTargetCode(urlCode.trim());
        setCurrentView('student');
      }
    } catch {
      // Ignore URL parse error
    }
  }, []);

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
      const syncedExam: ExamData = {
        ...assignment.examData,
        title: assignment.examTitle || assignment.examData.title,
        subject: assignment.subject || assignment.examData.subject,
        durationMinutes: assignment.durationMinutes || assignment.examData.durationMinutes || 50,
      };
      const updatedAssignment: OnlineExamAssignment = {
        ...assignment,
        examData: syncedExam,
      };

      setOnlineAssignments((prev) => {
        const filtered = prev.filter(
          (a) =>
            a.id !== updatedAssignment.id &&
            a.examCode.trim().toUpperCase() !== updatedAssignment.examCode.trim().toUpperCase()
        );
        const nextList = [updatedAssignment, ...filtered];
        try {
          localStorage.setItem(ONLINE_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(nextList));
        } catch {
          // Ignore storage error
        }
        return nextList;
      });

      setExamData(syncedExam);
      setVariants((prev) => {
        const cleanCode = updatedAssignment.examCode.trim();
        const generated = generateMultipleVariants(
          syncedExam,
          [cleanCode],
          `ONLINE-SYNC-${cleanCode}-${Date.now()}`
        );
        const targetVariant = generated[0];
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

  const handleNavigateTeacher = useCallback(
    (subTab?: 'bank' | 'scrambler' | 'monitor' | 'online_exam') => {
      if (subTab) {
        setTeacherSubTab(subTab);
      }
      setCurrentView('teacher');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

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
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        theme === 'light'
          ? 'theme-light bg-slate-50 text-slate-900'
          : 'bg-[#0b0f19] text-slate-100'
      }`}
    >
      {/* Persistent Top Navigation Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 bg-[#0b0f19]/95 backdrop-blur border-b border-indigo-950/90 no-print">
        {/* Zone 1: Prominent Exam/Assessment Emblem Icon & Theme Switcher */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            title="Hệ Thống Khảo Thí & Kiểm Tra Đánh Giá Thông Minh (Đa Môn Học)"
            aria-label="Trang chủ Hệ thống Khảo thí & Kiểm tra"
            className="group relative flex items-center gap-2 p-1 rounded-xl transition-transform hover:scale-105 focus:outline-none shrink-0"
          >
            {/* Standout Exam & Assessment Crest Emblem (SVG) */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-0.5 shadow-md shadow-violet-600/30 ring-1 ring-white/25 group-hover:ring-violet-300 transition-all">
              <div className="w-full h-full rounded-[10px] bg-slate-950/25 flex items-center justify-center">
                <svg
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-7 h-7"
                >
                  {/* Exam Clipboard / Test Sheet */}
                  <rect
                    x="8"
                    y="9"
                    width="20"
                    height="25"
                    rx="3.5"
                    fill="#FFFFFF"
                    fillOpacity="0.95"
                  />
                  {/* Top Clip */}
                  <rect
                    x="13.5"
                    y="6.5"
                    width="9"
                    height="4.5"
                    rx="2"
                    fill="#FBBF24"
                  />
                  {/* Question Lines */}
                  <rect x="12" y="15" width="7" height="2" rx="1" fill="#4338CA" />
                  <rect x="12" y="20" width="12" height="2" rx="1" fill="#6366F1" />
                  <rect x="12" y="25" width="9" height="2" rx="1" fill="#6366F1" />
                  {/* Gold Checkmark Badge (Exam Passed / Verified) */}
                  <circle cx="27.5" cy="27.5" r="7.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.8" />
                  <path
                    d="M24.3 27.6L26.5 29.8L31 25.3"
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Sparkle Star */}
                  <path
                    d="M31 7L32.1 9.9L35 11L32.1 12.1L31 15L29.9 12.1L27 11L29.9 9.9L31 7Z"
                    fill="#FDE047"
                  />
                </svg>
              </div>
            </div>
          </a>

          {/* Dual-Theme Switcher Button (Tím Than vs. Nền Trắng) */}
          <button
            type="button"
            onClick={toggleTheme}
            title={
              theme === 'dark'
                ? 'Chuyển sang giao diện Nền Trắng (Light Theme)'
                : 'Chuyển sang giao diện Tím Than (Dark Theme)'
            }
            aria-label="Chuyển đổi giao diện Sáng / Tối"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              theme === 'dark'
                ? 'bg-indigo-950/80 hover:bg-indigo-900 border-violet-700/70 text-violet-200'
                : 'bg-violet-50 hover:bg-violet-100 border-violet-300 text-violet-800 shadow-xs'
            }`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Nền Trắng</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-violet-700 shrink-0" />
                <span>Tím Than</span>
              </>
            )}
          </button>
        </div>

        {/* Zone 2: Quick Navigation Links */}
        <nav className="hidden md:flex items-center gap-3.5 lg:gap-5 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              currentView === 'home'
                ? 'text-violet-400 border-b-2 border-violet-400 font-semibold'
                : ''
            }`}
          >
            Trang Chủ
          </button>

          <button
            type="button"
            onClick={() => handleNavigateTeacher()}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              currentView === 'teacher'
                ? 'text-violet-400 border-b-2 border-violet-400 font-semibold'
                : ''
            }`}
          >
            Cổng Giáo Viên
          </button>

          <button
            type="button"
            onClick={() => handleLaunchStudentWithCode()}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              currentView === 'student'
                ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                : ''
            }`}
          >
            Cổng Học Sinh
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentView('statistics');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
              currentView === 'statistics'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : ''
            }`}
          >
            Thống Kê
          </button>

          <button
            type="button"
            onClick={handleScrollToFeatures}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Giới Thiệu Tính Năng
          </button>
        </nav>

        {/* Zone 3: Role Switcher Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleNavigateTeacher()}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
              currentView === 'teacher'
                ? 'bg-indigo-900/90 border-violet-400 text-white'
                : 'bg-indigo-950/60 hover:bg-indigo-900/70 border-indigo-700/80 text-indigo-200'
            }`}
          >
            Đăng Nhập Quản Trị
          </button>

          <button
            type="button"
            onClick={() => handleLaunchStudentWithCode()}
            className="px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            Vào Phòng Thi Thí Sinh
          </button>
        </div>
      </header>

      {/* Main Content Area — Preserving state across 'home' | 'teacher' | 'student' | 'statistics' */}
      <main className="flex-1">
        {currentView === 'home' && (
          <LandingPage
            examData={examData}
            variants={variants}
            workstations={workstations}
            onNavigateTeacher={handleNavigateTeacher}
            onNavigateStudent={handleLaunchStudentWithCode}
            onResetSystemCache={handleResetSystemCache}
          />
        )}

        {currentView === 'teacher' && (
          <TeacherPortal
            activeSubTab={teacherSubTab}
            setActiveSubTab={setTeacherSubTab}
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
          />
        )}

        {currentView === 'statistics' && (
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

      {/* Formal Educational Branding Footer */}
      <footer className="border-t border-slate-900 bg-[#080b12] px-6 py-5 text-xs text-slate-400 no-print">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-200">SmartTest Physics GDPT 2018</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-violet-400">Phiên bản v2.6 GDPT 2018</span>
            <span aria-hidden="true">·</span>
            <span>Hệ thống khảo thí, trộn đề & thi phòng máy Vật Lý THPT</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setCurrentView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Trang Chủ
            </button>
            <button
              type="button"
              onClick={() => handleNavigateTeacher('bank')}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Cổng Giáo Viên
            </button>
            <button
              type="button"
              onClick={() => handleLaunchStudentWithCode('101')}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Phòng Thi Kiosk
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentView('statistics');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Thống Kê Điểm
            </button>
            <button
              type="button"
              onClick={handleResetSystemCache}
              className="text-rose-400 hover:text-rose-300 font-mono transition-colors whitespace-nowrap"
            >
              Reset Cache
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
