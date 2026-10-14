import React, { useState, useMemo } from 'react';
import {
  Award, CheckCircle2, XCircle, AlertCircle, Clock,
  RotateCcw, Printer, LayoutDashboard, HelpCircle,
  ChevronDown, ChevronUp, FileSpreadsheet, ShieldAlert,
  ArrowRight, Check, BookOpen
} from 'lucide-react';
import { Exam, StudentAnswers, StudentSubmission } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { DiagramViewer } from './DiagramViewer';
import { exportScoreReportToCSV } from '../utils/exportCsv';

export type PrintMode = 'exam_only' | 'exam_with_solutions';

interface ExamResultsProps {
  exam: Exam;
  answers: StudentAnswers;
  evaluation: any;
  candidateInfo?: {
    name?: string;
    studentClass?: string;
    candidateNumber?: string;
  };
  timeRemainingSeconds?: number;
  auditLog?: any;
  onRetake?: () => void;
  onOpenTeacherMode?: () => void;
  onOpenPrint?: (mode: PrintMode) => void;
}

export const ExamResults: React.FC<ExamResultsProps> = ({
  exam,
  answers = {},
  evaluation = {},
  candidateInfo = {},
  timeRemainingSeconds = 0,
  auditLog = { violations: [] },
  onRetake = () => { },
  onOpenTeacherMode = () => { },
  onOpenPrint = () => { }
}) => {
  const [selectedPartTab, setSelectedPartTab] = useState<'all' | 'Phần I' | 'Phần II' | 'Phần III'>('all');
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  // Xử lý an toàn điểm số & tỉ lệ cho Safari
  const safeScore = useMemo(() => {
    const raw = evaluation?.totalScore ?? evaluation?.score ?? 0;
    const num = Number(raw);
    return isNaN(num) ? 0 : Number(Math.min(10, Math.max(0, num)).toFixed(2));
  }, [evaluation]);

  const questionsList = useMemo(() => {
    return Array.isArray(exam?.questions) ? exam.questions : [];
  }, [exam]);

  const feedbackList = useMemo(() => {
    return Array.isArray(evaluation?.detailedFeedback)
      ? evaluation.detailedFeedback
      : (Array.isArray(evaluation?.feedback) ? evaluation.feedback : []);
  }, [evaluation]);

  const feedbackMap = useMemo(() => {
    const map = new Map<string, any>();
    feedbackList.forEach((fb: any) => {
      if (fb && fb.questionId) {
        map.set(fb.questionId, fb);
      }
    });
    return map;
  }, [feedbackList]);

  // Phân tích thống kê an toàn không bao giờ sinh ra NaN trên Safari
  const stats = useMemo(() => {
    let p1Correct = 0, p1Total = 0, p1Score = 0;
    let p2Correct = 0, p2Total = 0, p2Score = 0;
    let p3Correct = 0, p3Total = 0, p3Score = 0;

    questionsList.forEach((q: any) => {
      if (!q) return;
      const part = q.part || 'Phần I';
      const fb = feedbackMap.get(q.id);
      const isCor = fb?.isCorrect === true;
      const pts = Number(fb?.pointsAwarded || 0);

      if (part === 'Phần I') {
        p1Total++;
        if (isCor) p1Correct++;
        p1Score += pts;
      } else if (part === 'Phần II') {
        p2Total++;
        if (isCor) p2Correct++;
        p2Score += pts;
      } else {
        p3Total++;
        if (isCor) p3Correct++;
        p3Score += pts;
      }
    });

    const totalQuestions = questionsList.length || 1;
    const totalCorrect = p1Correct + p2Correct + p3Correct;
    const calcPercentage = Math.round((safeScore / 10) * 100);

    return {
      totalQuestions: questionsList.length,
      totalCorrect,
      percentage: isNaN(calcPercentage) ? 0 : calcPercentage,
      p1: { correct: p1Correct, total: p1Total, score: Number(p1Score.toFixed(2)) },
      p2: { correct: p2Correct, total: p2Total, score: Number(p2Score.toFixed(2)) },
      p3: { correct: p3Correct, total: p3Total, score: Number(p3Score.toFixed(2)) }
    };
  }, [questionsList, feedbackMap, safeScore]);

  const filteredQuestions = useMemo(() => {
    if (selectedPartTab === 'all') return questionsList;
    return questionsList.filter((q: any) => q?.part === selectedPartTab);
  }, [questionsList, selectedPartTab]);

  const toggleExpand = (qId: string) => {
    setExpandedDetails(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Tính thời gian hoàn thành bài thi an toàn
  const timeTakenDisplay = useMemo(() => {
    const totalDurationSec = (exam?.durationMinutes || 45) * 60;
    const spentSec = Math.max(0, totalDurationSec - (Number(timeRemainingSeconds) || 0));
    const mins = Math.floor(spentSec / 60);
    const secs = spentSec % 60;
    return `${mins} phút ${secs} giây`;
  }, [exam?.durationMinutes, timeRemainingSeconds]);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-in fade-in duration-200">

      {/* 1. THẺ THÔNG BÁO TỔNG QUAN KẾT QUẢ THI */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl overflow-hidden relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">

          <div className="text-center md:text-left space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-3xs font-black uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bài thi đã được ghi nhận thành công</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {exam?.title || 'Đề khảo thí Vật lí GDPT 2018'}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-slate-600 pt-1">
              <span>Thí sinh: <strong className="text-slate-900">{candidateInfo?.name || 'Thí sinh tự do'}</strong></span>
              <span>•</span>
              <span>Lớp: <strong className="text-slate-900">{candidateInfo?.studentClass || '11'}</strong></span>
              <span>•</span>
              <span>SBD: <strong className="font-mono text-slate-900">{candidateInfo?.candidateNumber || 'SBD-001'}</strong></span>
              <span>•</span>
              <span>Mã đề: <strong className="font-mono text-indigo-700">{exam?.code || '101'}</strong></span>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-2 text-2xs text-slate-500 pt-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Thời gian làm bài: {timeTakenDisplay}</span>
            </div>
          </div>

          {/* Ô HIỂN THỊ ĐIỂM SỐ CHÍNH */}
          <div className="shrink-0 text-center px-8 py-6 rounded-3xl bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 text-white shadow-2xl border border-indigo-500/30 min-w-[200px]">
            <span className="text-3xs uppercase tracking-widest text-indigo-200 font-bold block mb-1">
              Điểm Tổng Kết
            </span>
            <div className="text-5xl sm:text-6xl font-black tracking-tight text-white">
              {safeScore.toFixed(2)}
            </div>
            <div className="text-2xs text-indigo-300 font-medium mt-1">
              Đúng {stats.totalCorrect} / {stats.totalQuestions} câu ({stats.percentage}%)
            </div>
          </div>

        </div>

        {/* NÚT THAO TÁC NHANH */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onRetake}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại bài thi</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPrint('exam_with_solutions')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span>In lời giải chi tiết</span>
            </button>

            <button
              type="button"
              onClick={() =>
                exportScoreReportToCSV(exam, evaluation, {
                  name: candidateInfo?.name || 'Thí sinh',
                  studentClass: candidateInfo?.studentClass || '11',
                  candidateNumber: candidateInfo?.candidateNumber || 'SBD-001'
                })
              }
              className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất kết quả CSV</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenTeacherMode}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition flex items-center gap-1.5 cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Về Bảng điều khiển Giáo viên</span>
          </button>
        </div>
      </div>

      {/* 2. THỐNG KÊ ĐIỂM SỐ TỪNG PHẦN THEO CHUẨN BỘ GD&ĐT */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="text-3xs font-black uppercase text-slate-400 tracking-wider">Phần I: Trắc nghiệm 4 lựa chọn</div>
          <div className="text-xl font-black text-indigo-700">
            {stats.p1.score.toFixed(2)}đ
            <span className="text-xs text-slate-400 font-normal"> ({stats.p1.correct}/{stats.p1.total} câu)</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.p1.total ? Math.min(100, Math.round((stats.p1.correct / stats.p1.total) * 100)) : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="text-3xs font-black uppercase text-slate-400 tracking-wider">Phần II: Đúng / Sai chùm</div>
          <div className="text-xl font-black text-blue-700">
            {stats.p2.score.toFixed(2)}đ
            <span className="text-xs text-slate-400 font-normal"> ({stats.p2.correct}/{stats.p2.total} câu)</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.p2.total ? Math.min(100, Math.round((stats.p2.correct / stats.p2.total) * 100)) : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="text-3xs font-black uppercase text-slate-400 tracking-wider">Phần III: Trả lời ngắn</div>
          <div className="text-xl font-black text-emerald-700">
            {stats.p3.score.toFixed(2)}đ
            <span className="text-xs text-slate-400 font-normal"> ({stats.p3.correct}/{stats.p3.total} câu)</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.p3.total ? Math.min(100, Math.round((stats.p3.correct / stats.p3.total) * 100)) : 0}%` }}
            />
          </div>
        </div>

      </div>

      {/* 3. CHI TIẾT BÀI LÀM VÀ LỜI GIẢI TỪNG CÂU HỎI */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Chi tiết câu trả lời & Lời giải chuẩn</span>
          </h3>

          <div className="flex items-center gap-1.5">
            {(['all', 'Phần I', 'Phần II', 'Phần III'] as const).map((part) => (
              <button
                key={part}
                type="button"
                onClick={() => setSelectedPartTab(part)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${selectedPartTab === part
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {part === 'all' ? 'Tất cả' : part}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredQuestions.map((q: any, idx: number) => {
            if (!q) return null;
            const fb = feedbackMap.get(q.id);
            const isCorrect = fb?.isCorrect === true;
            const pointsAwarded = Number(fb?.pointsAwarded || 0);
            const isExpanded = !!expandedDetails[q.id];
            const userAns = answers[q.id];

            return (
              <div
                key={q.id || idx}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isCorrect
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : pointsAwarded > 0
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-rose-200 bg-rose-50/20'
                  }`}
              >
                <div
                  onClick={() => toggleExpand(q.id)}
                  className="p-4 flex items-center justify-between cursor-pointer select-none gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${isCorrect ? 'bg-emerald-100 text-emerald-800' : pointsAwarded > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                      {isCorrect ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-800">{q.title || `Câu ${idx + 1}`}</span>
                        <span className="px-1.5 py-0.5 rounded text-3xs font-semibold bg-slate-100 text-slate-600">{q.part}</span>
                        <span className={`text-xs font-black ${isCorrect ? 'text-emerald-700' : 'text-rose-600'}`}>
                          +{pointsAwarded.toFixed(2)}đ
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 truncate mt-0.5">
                        {q.prompt || q.stem || ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-slate-200/60 bg-white space-y-3 text-xs text-slate-800">
                    <div className="space-y-2">
                      <div className="font-bold text-slate-700">Đề bài:</div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <MathRenderer content={q.prompt || q.stem || ''} />
                      </div>
                    </div>

                    {(q.diagram || q.image) && (
                      <div className="my-2">
                        <DiagramViewer diagram={q.diagram || q.image} />
                      </div>
                    )}

                    {/* Câu trả lời của thí sinh */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-700">Câu trả lời của bạn:</div>
                      <div className="font-mono font-semibold text-indigo-700">
                        {typeof userAns === 'object' && userAns !== null
                          ? JSON.stringify(userAns)
                          : String(userAns || '(Chưa trả lời)')}
                      </div>
                    </div>

                    {/* Lời giải chi tiết */}
                    {q.explanation && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                        <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Hướng dẫn giải chi tiết:</span>
                        </div>
                        <div className="text-emerald-950 text-xs">
                          <MathRenderer content={q.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};