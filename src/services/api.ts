import {
  ExamData,
  OnlineExamAssignment,
  SavedExamSession,
  ScrambledExamVariant,
} from '../types/exam';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
const LOCAL_EXAMS_BACKUP_KEY = 'smarttest_gdpt2018_cloud_exams_backup_v1';
const LOCAL_SESSION_PREFIX = 'smarttest_gdpt2018_session_';

export interface CloudExamImportPayload {
  examId?: string;
  examCode?: string;
  examData: ExamData;
  variants?: ScrambledExamVariant[];
  folderId?: string;
  mode?: 'exam' | 'practice';
  violationLevel?: 1 | 2 | 3;
  maxViolations?: number;
  assignedClasses?: string[];
  startTime?: string;
  endTime?: string;
  detailedSolutionContent?: string;
}

export interface CloudSubmissionResponse {
  success: boolean;
  storage: 'mongodb_atlas' | 'server_cloud_cache' | 'local_storage_fallback';
  submission: any;
  scores?: {
    part1Score: number;
    part2Score: number;
    part3Score: number;
    rawTotalScore: number;
    maxPossibleScore: number;
    totalMoetScore: number;
  };
}

/**
 * 1. POST /api/exams/import
 * Save newly imported, scrambled, or published online exams to MongoDB Atlas
 * with automatic localStorage backup if network disconnects.
 */
export async function importExamToCloud(
  payload: CloudExamImportPayload
): Promise<{ success: boolean; storage: string; exam: any }> {
  const examCode = payload.examCode || payload.variants?.[0]?.code || '1102';
  const examId = payload.examId || payload.examData.examId || `EXAM-${Date.now()}`;

  // Always maintain local backup for instant offline resilience
  try {
    const raw = localStorage.getItem(LOCAL_EXAMS_BACKUP_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, any>) : {};
    map[examCode.toUpperCase()] = { ...payload, examId, examCode };
    map[examId.toUpperCase()] = { ...payload, examId, examCode };
    localStorage.setItem(LOCAL_EXAMS_BACKUP_KEY, JSON.stringify(map));
  } catch {
    // Ignore local storage quota errors
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/exams/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        examId,
        examCode,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch {
    // Graceful fallback to localStorage when offline
    return {
      success: true,
      storage: 'local_storage_fallback',
      exam: {
        ...payload.examData,
        examId,
        examCode,
        variants: payload.variants || [],
      },
    };
  }
}

/**
 * 2. GET /api/exams/:id
 * Retrieve exam data by examId or examCode for the Student Exam Room
 * with graceful fallback to localStorage if offline.
 */
export async function fetchExamFromCloud(
  examIdOrCode: string
): Promise<{ success: boolean; storage: string; exam: any | null }> {
  const cleanId = String(examIdOrCode || '').trim();
  if (!cleanId) {
    return { success: false, storage: 'none', exam: null };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exams/${encodeURIComponent(cleanId)}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      storage: data.storage || 'mongodb_atlas',
      exam: data.exam || null,
    };
  } catch {
    // Graceful fallback to localStorage backup
    try {
      const raw = localStorage.getItem(LOCAL_EXAMS_BACKUP_KEY);
      if (raw) {
        const map = JSON.parse(raw) as Record<string, any>;
        const found = map[cleanId.toUpperCase()] || null;
        if (found) {
          return {
            success: true,
            storage: 'local_storage_fallback',
            exam: found.examData || found,
          };
        }
      }
    } catch {
      // Ignore parse error
    }
    return { success: false, storage: 'local_storage_fallback', exam: null };
  }
}

/**
 * 3. POST /api/submissions
 * Send student submitted answers to Backend to verify/calculate scores on server
 * and persist permanently in MongoDB Atlas, falling back to localStorage if offline.
 */
export async function submitExamToCloud(
  session: SavedExamSession & { examId?: string; room?: string }
): Promise<CloudSubmissionResponse> {
  const storageKey = `${LOCAL_SESSION_PREFIX}${session.studentId
    .trim()
    .toUpperCase()}_${session.examCode.trim()}`;

  // Always save to localStorage first for zero-latency safety
  try {
    localStorage.setItem(storageKey, JSON.stringify(session));
  } catch {
    // Ignore quota errors
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId: session.examId || 'GDPT2018-VL12-HK2-2026',
        examCode: session.examCode,
        studentName: session.studentName,
        studentId: session.studentId,
        room: session.room || 'MAY-01',
        startedAt: session.startedAt,
        submittedAt: session.submittedAt || session.lastSavedAt,
        remainingSeconds: session.remainingSeconds,
        isSubmitted: session.isSubmitted,
        answers: session.answers,
        violationCount: session.violations?.length || 0,
        violations: session.violations || [],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      storage: data.storage || 'mongodb_atlas',
      submission: data.submission,
      scores: data.scores,
    };
  } catch {
    return {
      success: true,
      storage: 'local_storage_fallback',
      submission: session,
      scores:
        session.finalScore !== undefined
          ? {
              part1Score: 0,
              part2Score: 0,
              part3Score: 0,
              rawTotalScore: session.finalScore,
              maxPossibleScore: 10,
              totalMoetScore: session.finalScore,
            }
          : undefined,
    };
  }
}

/**
 * 4. GET /api/submissions/exam/:examId
 * Retrieve live monitor list & score ranking for Teacher LAN/Monitor & Statistics dashboard,
 * merging with localStorage sessions if offline.
 */
export async function fetchSubmissionsByExam(
  examIdOrCode: string = 'ALL'
): Promise<{
  success: boolean;
  storage: string;
  submissions: SavedExamSession[];
}> {
  const localSessions: SavedExamSession[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_SESSION_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as SavedExamSession;
          if (parsed && parsed.studentId && parsed.examCode) {
            localSessions.push(parsed);
          }
        }
      }
    }
  } catch {
    // Ignore storage read error
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/submissions/exam/${encodeURIComponent(examIdOrCode)}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const cloudList: any[] = Array.isArray(data.submissions) ? data.submissions : [];

    const normalizedCloudSessions: SavedExamSession[] = cloudList.map((doc) => ({
      studentName: doc.studentName,
      studentId: doc.studentId,
      examCode: doc.examCode,
      startedAt: doc.startedAt || new Date().toISOString(),
      lastSavedAt: doc.submittedAt || new Date().toLocaleTimeString('vi-VN'),
      remainingSeconds: Number(doc.remainingSeconds) || 0,
      isSubmitted: Boolean(doc.isSubmitted),
      submittedAt: doc.submittedAt,
      answers: doc.answers || { part1: {}, part2: {}, part3: {}, flagged: {} },
      violations: Array.isArray(doc.violations) ? doc.violations : [],
      finalScore:
        doc.scores?.totalMoetScore !== undefined
          ? Number(doc.scores.totalMoetScore)
          : doc.finalScore,
    }));

    // Merge cloud records with any local-only records
    const mergedMap = new Map<string, SavedExamSession>();
    for (const loc of localSessions) {
      mergedMap.set(`${loc.studentId.toUpperCase()}_${loc.examCode.toUpperCase()}`, loc);
    }
    for (const cld of normalizedCloudSessions) {
      mergedMap.set(`${cld.studentId.toUpperCase()}_${cld.examCode.toUpperCase()}`, cld);
    }

    return {
      success: true,
      storage: data.storage || 'mongodb_atlas',
      submissions: Array.from(mergedMap.values()),
    };
  } catch {
    return {
      success: true,
      storage: 'local_storage_fallback',
      submissions: localSessions,
    };
  }
}

/**
 * Helper to sync an OnlineExamAssignment from Tab 4 (Tổ Chức Thi Online) directly to MongoDB Atlas
 */
export async function syncOnlineAssignmentToCloud(
  assignment: OnlineExamAssignment,
  variants?: ScrambledExamVariant[]
) {
  return importExamToCloud({
    examId: assignment.examData.examId,
    examCode: assignment.examCode,
    examData: assignment.examData,
    variants,
    mode: assignment.mode,
    violationLevel: assignment.violationLevel,
    maxViolations: assignment.maxViolations,
    assignedClasses: assignment.assignedClasses,
    startTime: assignment.startTime,
    endTime: assignment.endTime,
    detailedSolutionContent: assignment.detailedSolutionContent,
  });
}
