import React, { useEffect, useState } from 'react';
import { Exam, StudentAnswers, AntiCheatConfig, ViolationEvent } from '../types/exam';
import { QuestionCard } from './QuestionCard';
import { Clock, AlertTriangle, Flag, ChevronLeft, ChevronRight, Send } from 'lucide-react';

interface StudentExamLaunchProps {
  exam: Exam;
  antiCheatConfig: AntiCheatConfig;
  candidateInfo: {
    name: string;
    studentClass: string;
    candidateNumber: string;
  };
  timeRemainingSeconds: number;
  onAnswerChange: (questionId: string, answer: any) => void;
  answers: StudentAnswers;
  flaggedQuestionIds: Set<string>;
  onToggleFlag: (questionId: string) => void;
  currentQuestionIndex: number;
  onSelectQuestion: (index: number) => void;
  onSubmitExam: () => void;
  onRecordViolation: (event: ViolationEvent) => void;
}

export const StudentExamLaunch: React.FC<StudentExamLaunchProps> = ({
  exam,
  antiCheatConfig,
  candidateInfo,
  timeRemainingSeconds,
  onAnswerChange,
  answers = {},
  flaggedQuestionIds = new Set(),
  onToggleFlag,
  currentQuestionIndex = 0,
  onSelectQuestion,
  onSubmitExam,
  onRecordViolation
}) => {
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Danh sách câu hỏi an toàn tuyệt đối, chống lỗi e.questions
  const questions = (exam && Array.isArray(exam.questions)) ? exam.questions : [];

  // Lắng nghe hành vi gian lận (rời tab, chuyển cửa sổ)
  useEffect(() => {
    if (!antiCheatConfig?.enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onRecordViolation({
          id: `vio-${Date.now()}`,
          timestamp: new Date().toISOString(),
          description: 'Thí sinh rời khỏi giao diện làm bài thi (chuyển tab/thu nhỏ trình duyệt)'
        } as any);
      }
    };

    const handleBlur = () => {
      onRecordViolation({
        id: `vio-${Date.now()}`,
        timestamp: new Date().toISOString(),
        description: 'Cửa sổ làm bài thi bị mất tiêu điểm (mở ứng dụng khác)'
      } as any);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [antiCheatConfig, onRecordViolation]);

  // Phòng vệ an toàn: Nếu chưa có câu hỏi, hiển thị màn hình chờ nạp
  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Đang tải đề thi...</h2>
          <p className="text-slate-500 text-sm">
            Hệ thống đang chuẩn bị nội dung câu hỏi. Vui lòng chờ trong giây lát.
          </p>
        </div>
      </div>
    );
  }

  // Đảm bảo chỉ mục câu hỏi luôn hợp lệ
  const safeIndex = Math.min(Math.max(0, currentQuestionIndex), Math.max(0, questions.length - 1));
  const currentQuestion = questions[safeIndex];

  // Định dạng thời gian đếm ngược (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Đếm số lượng câu đã trả lời an toàn
  const answeredCount = questions.filter((q) => {
    if (!q || !q.id) return false;
    const ans = (answers && answers[q.id]) !== undefined ? answers[q.id] : undefined;
    if (ans === undefined || ans === null) return false;
    if (typeof ans === 'object') {
      return Object.keys(ans).length > 0;
    }
    return String(ans).trim().length > 0;
  }).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header thông tin thí sinh & đồng hồ đếm ngược */}
      <header className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Mã đề: {exam?.code || '101'}
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 line-clamp-1">{exam?.title || 'Đề thi Vật lí'}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>Thí sinh: <strong className="text-slate-700">{candidateInfo?.name || 'Thí sinh'}</strong></span>
            <span>Lớp: <strong className="text-slate-700">{candidateInfo?.studentClass || ''}</strong></span>
            <span>SBD: <strong className="text-slate-700">{candidateInfo?.candidateNumber || ''}</strong></span>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-lg sm:text-xl ${
            timeRemainingSeconds < 300
              ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
              : 'bg-slate-50 text-slate-800 border-slate-200'
          }`}>
            <Clock className="w-5 h-5" />
            <span>{formatTime(timeRemainingSeconds)}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitConfirm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Nộp bài</span>
          </button>
        </div>
      </header>

      {/* Nội dung câu hỏi và bảng câu hỏi */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3 space-y-6">
          {currentQuestion && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4 border-b pb-4">
                <span className="font-semibold text-slate-800">
                  Câu hỏi {safeIndex + 1} / {questions.length}
                </span>
                <button
                  type="button"
                  onClick={() => currentQuestion?.id && onToggleFlag(currentQuestion.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    flaggedQuestionIds.has(currentQuestion.id)
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Flag className="w-4 h-4" />
                  <span>{flaggedQuestionIds.has(currentQuestion.id) ? 'Đã đánh dấu' : 'Đặt cờ xem lại'}</span>
                </button>
              </div>

              {/* Truyền đầy đủ props an toàn cho QuestionCard để diệt trừ lỗi r[e.id] */}
              <QuestionCard
                question={currentQuestion}
                index={safeIndex}
                totalQuestions={questions.length}
                answers={answers || {}}
                onAnswerChange={(ans: any) => currentQuestion?.id && onAnswerChange(currentQuestion.id, ans)}
                isFlagged={flaggedQuestionIds.has(currentQuestion.id)}
                onToggleFlag={() => currentQuestion?.id && onToggleFlag(currentQuestion.id)}
                onPrev={() => safeIndex > 0 && onSelectQuestion(safeIndex - 1)}
                onNext={() => safeIndex < questions.length - 1 && onSelectQuestion(safeIndex + 1)}
                isReviewMode={false}
              />

              <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={safeIndex === 0}
                  onClick={() => onSelectQuestion(safeIndex - 1)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-medium transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Câu trước</span>
                </button>

                <button
                  type="button"
                  disabled={safeIndex >= questions.length - 1}
                  onClick={() => onSelectQuestion(safeIndex + 1)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-medium transition-all"
                >
                  <span>Câu tiếp theo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bảng câu hỏi bên cạnh */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 sticky top-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Bảng câu hỏi</h3>
            <span className="text-xs text-slate-500">
              Đã làm: <strong className="text-indigo-600 font-semibold">{answeredCount}</strong>/{questions.length}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 max-h-[380px] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const qId = q?.id || `q-${idx}`;
              const ans = (answers && answers[qId]) !== undefined ? answers[qId] : undefined;
              const isAnswered = ans !== undefined && ans !== null && String(ans).trim() !== '';
              const isFlagged = flaggedQuestionIds.has(qId);
              const isCurrent = idx === safeIndex;

              return (
                <button
                  key={qId}
                  type="button"
                  onClick={() => onSelectQuestion(idx)}
                  className={`relative h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                    isCurrent
                      ? 'ring-2 ring-indigo-600 ring-offset-2 bg-indigo-600 text-white shadow-sm'
                      : isAnswered
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-indigo-600" />
              <span>Đang chọn</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-indigo-50 border border-indigo-200" />
              <span>Đã trả lời</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-slate-50 border border-slate-200" />
              <span>Chưa trả lời</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Đã đặt cờ xem lại</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal xác nhận nộp bài */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Xác nhận nộp bài</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Thí sinh đã trả lời <strong>{answeredCount}</strong> / <strong>{questions.length}</strong> câu hỏi.
              {answeredCount < questions.length && (
                <span className="block text-amber-600 font-medium mt-1">
                  Vẫn còn {questions.length - answeredCount} câu chưa hoàn thành!
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  onSubmitExam();
                }}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
              >
                Đồng ý nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};