import React, { useState } from 'react';
import { Exam, StudentAnswers } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { 
  CheckCircle, XCircle, Award, RotateCcw, 
  Printer, Eye, X 
} from 'lucide-react';

export type PrintMode = 'exam_only' | 'exam_with_solutions' | 'matrix';

interface ExamResultsProps {
  exam: Exam;
  answers: StudentAnswers;
  evaluation: any;
  candidateInfo: {
    name: string;
    studentClass: string;
    candidateNumber: string;
  };
  timeRemainingSeconds?: number;
  auditLog?: any;
  onRetake: () => void;
  onOpenTeacherMode: () => void;
  onOpenPrint: (mode: PrintMode) => void;
}

export const ExamResults: React.FC<ExamResultsProps> = ({
  exam,
  answers = {},
  evaluation,
  candidateInfo,
  onRetake,
  onOpenPrint
}) => {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const questions = (exam && Array.isArray(exam.questions)) ? exam.questions : [];
  const score = evaluation?.totalScore ?? 0;

  // HÀM ĐỊNH DẠNG ĐÁP ÁN BÀI LÀM PHẦN II (ĐÚNG/SAI) SANG TIẾNG VIỆT
  const formatTrueFalseVietnamese = (ansObj: any, items: any[] = []) => {
    if (!ansObj || typeof ansObj !== 'object') return 'Chưa làm';
    return items.map((item, idx) => {
      const label = String.fromCharCode(97 + idx); // a, b, c, d
      const val = ansObj[item.id] !== undefined ? ansObj[item.id] : ansObj[label];
      const textVal = val === true ? 'Đúng' : val === false ? 'Sai' : 'Chưa chọn';
      return `${label}) ${textVal}`;
    }).join(' • ');
  };

  // HÀM LẤY ĐÁP ÁN ĐÚNG CỦA ĐỀ THI PHẦN II
  const getCorrectTrueFalseVietnamese = (items: any[] = []) => {
    return items.map((item, idx) => {
      const label = String.fromCharCode(97 + idx);
      const isCorrect = item.isCorrect === true || item.correctAnswer === true || item.answer === true;
      return `${label}) ${isCorrect ? 'Đúng' : 'Sai'}`;
    }).join(' • ');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Thẻ Tổng kết điểm số */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
          <Award className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
            Đã nộp bài thành công
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            Kết Quả Khảo Thí: {exam.title}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Thí sinh: <span className="font-bold text-slate-700">{candidateInfo.name}</span> • Lớp: <span className="font-bold text-slate-700">{candidateInfo.studentClass}</span> • SBD: <span className="font-bold text-slate-700">{candidateInfo.candidateNumber}</span>
          </p>
        </div>

        <div className="py-4">
          <div className="inline-block p-6 rounded-3xl bg-slate-900 text-white shadow-xl">
            <span className="text-4xs uppercase tracking-widest text-indigo-300 block mb-1">Điểm số đạt được</span>
            <div className="text-5xl font-black font-mono text-emerald-400">
              {score} <span className="text-2xl font-normal text-slate-400">/ 10</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsReviewModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Xem lại chi tiết bài làm & Đáp án</span>
          </button>

          <button
            type="button"
            onClick={onRetake}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Làm lại đề này</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenPrint('exam_with_solutions')}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In đề & Lời giải</span>
          </button>
        </div>
      </div>

      {/* MODAL XEM LẠI CHI TIẾT BÀI LÀM */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-black text-sm">Xem lại chi tiết bài làm</h3>
                  <p className="text-3xs text-slate-400">Đối chiếu câu trả lời của thí sinh và đáp án chính xác của đề thi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-slate-50">
              {questions.map((q: any, idx: number) => {
                const userAns: any = answers ? answers[q.id] : undefined;
                const feedback = evaluation?.detailedFeedback?.find((f: any) => f.questionId === q.id);
                const isCorrect = feedback?.isCorrect ?? false;

                // Chuẩn hóa hiển thị chuỗi câu trả lời trắc nghiệm
                const rawUserChoice = typeof userAns === 'string' ? userAns : (userAns?.value ? String(userAns.value) : '');

                return (
                  <div key={q.id || idx} className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-black text-xs text-indigo-900 uppercase">
                        Câu {idx + 1} ({q.part || (q.type === 'multiple_choice' ? 'Phần I' : q.type === 'true_false_cluster' ? 'Phần II' : 'Phần III')})
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-3xs font-black flex items-center gap-1 ${
                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isCorrect ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {isCorrect ? 'Đúng (+ ' + (feedback?.pointsAwarded ?? 0) + 'đ)' : 'Sai (0đ)'}
                      </span>
                    </div>

                    <div className="text-sm text-slate-800 leading-relaxed">
                      <MathRenderer content={q.stem || q.prompt || ''} />
                    </div>

                    {/* VÙNG ĐỐI CHIẾU ĐÁP ÁN THEO TỪNG PHẦN */}
                    <div className="space-y-2 pt-1 text-xs">
                      
                      {/* 1. Phần I: Trắc nghiệm 4 lựa chọn */}
                      {q.type === 'multiple_choice' && (
                        <div className="space-y-1.5">
                          <div className="p-3 rounded-xl bg-slate-100 text-slate-700 flex items-center gap-2">
                            <span className="font-bold text-slate-500">Bài làm của thí sinh:</span>
                            <span className="font-black text-slate-900">{rawUserChoice || 'Chưa chọn'}</span>
                          </div>
                          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200 flex items-center gap-2">
                            <span className="font-bold text-emerald-700">Đáp án đúng của đề:</span>
                            <span className="font-black text-emerald-900">{String(q.correctAnswer || 'A')}</span>
                          </div>
                        </div>
                      )}

                      {/* 2. Phần II: Đúng/Sai đa ý -> TIẾNG VIỆT ĐẦY ĐỦ */}
                      {q.type === 'true_false_cluster' && (
                        <div className="space-y-1.5">
                          <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
                            <span className="font-bold text-slate-500 block mb-1">Bài làm của thí sinh:</span>
                            <span className="font-bold text-slate-900">
                              {formatTrueFalseVietnamese(userAns, q.items || [])}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200">
                            <span className="font-bold text-emerald-700 block mb-1">Đáp án đúng của đề:</span>
                            <span className="font-black text-emerald-900">
                              {getCorrectTrueFalseVietnamese(q.items || [])}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 3. Phần III: Trả lời ngắn */}
                      {q.type === 'short_answer' && (
                        <div className="space-y-1.5">
                          <div className="p-3 rounded-xl bg-slate-100 text-slate-700 flex items-center gap-2">
                            <span className="font-bold text-slate-500">Bài làm của thí sinh:</span>
                            <span className="font-black text-slate-900">
                              {typeof userAns === 'object' && userAns !== null ? String(userAns.value || '') : String(userAns || 'Chưa điền')}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200 flex items-center gap-2">
                            <span className="font-bold text-emerald-700">Đáp số chính xác:</span>
                            <span className="font-black text-emerald-900">{String(q.correctValue || '')}</span>
                          </div>
                        </div>
                      )}

                    </div>

                    {q.explanation && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                        <span className="font-bold text-indigo-700 block mb-1">Hướng dẫn giải:</span>
                        <MathRenderer content={q.explanation} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Đóng xem lại
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};