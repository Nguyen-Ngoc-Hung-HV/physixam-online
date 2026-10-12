import React, { useState, useEffect } from 'react';
import { Exam, StudentAnswers, AntiCheatConfig, ViolationEvent, StudentSubmission } from './types/exam';
import { StudentExamLaunch } from './components/StudentExamLaunch';
import { ExamResults, PrintMode } from './components/ExamResults';
import { TeacherDashboard } from './components/TeacherDashboard';
import { safeStorage } from './utils/safeStorage';

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
      console.warn("Lỗi đọc cache đề thi, tự động nạp đề chuẩn:", e);
    }
    return DEFAULT_EXAM;
  });

  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() => {
    try {
      const saved = safeStorage?.getItem ? safeStorage.getItem('physixam_submissions') : localStorage.getItem('physixam_submissions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

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
    if (studentExamPhase !== 'launch') return;
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
  }, [studentExamPhase]);

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

    const safeExamCode = exam?.code || '101';
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

  const handleOpenPrint = (printMode: PrintMode) => {
    window.print();
  };

  // Đảm bảo exam luôn luôn có questions hợp lệ
  const safeCurrentExam = (exam && Array.isArray(exam.questions) && exam.questions.length > 0) ? exam : DEFAULT_EXAM;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
      <main className="pb-12">
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
              setTimeRemainingSeconds(45 * 60);
            }}
            onOpenTeacherMode={() => {}}
            onOpenPrint={(printMode) => handleOpenPrint(printMode as any)}
          />
        )}

        {React.createElement(TeacherDashboard as any, {
          submissions: submissions || [],
          onDeleteSubmission: handleDeleteSubmission,
          onClearSubmissions: handleClearSubmissions,
          currentExam: safeCurrentExam,
          onUpdateExam: (newExam: any) => {
            const valid = (newExam && Array.isArray(newExam.questions)) ? newExam : DEFAULT_EXAM;
            setExam(valid);
            try {
              safeStorage?.setItem ? safeStorage.setItem('physixam_current_exam', JSON.stringify(valid)) : localStorage.setItem('physixam_current_exam', JSON.stringify(valid));
            } catch (e) {}
          },
          antiCheatConfig: antiCheatConfig,
          onChangeAntiCheatConfig: setAntiCheatConfig
        })}
      </main>
    </div>
  );
}