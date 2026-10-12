import React from 'react';
import { Question, StudentAnswers } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  index: number;
  totalQuestions: number;
  answers: StudentAnswers;
  onAnswerChange: (questionId: string, answer: any) => void;
  isFlagged: boolean;
  onToggleFlag: () => void;
  onPrev: () => void;
  onNext: () => void;
  onUpdateQuestionDiagram?: (questionId: string, diagram: any) => void;
  isReviewMode?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  totalQuestions,
  answers = {},
  onAnswerChange,
  isFlagged,
  onToggleFlag,
  onPrev,
  onNext,
  isReviewMode = false,
}) => {
const currentAnswer: any = (answers && question?.id) ? answers[question.id] : undefined;
  const q: any = question;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 relative transition-all">
      {/* Header câu hỏi */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-black text-xs tracking-wider uppercase shadow-xs shadow-indigo-600/30">
            {question.title || `Câu ${index + 1}`}
          </span>
          <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
            {question.part}
          </span>
          {question.topic && (
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-2xs hidden sm:inline-block">
              {question.topic}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleFlag}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            isFlagged
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-600 text-amber-600' : ''}`} />
          <span>{isFlagged ? 'Đã đánh dấu' : 'Đánh dấu câu'}</span>
        </button>
      </div>

      {/* Thân câu hỏi */}
      <div className="py-4 text-slate-800 text-sm sm:text-base leading-relaxed font-medium">
        <MathRenderer content={question.stem} />
      </div>

      {/* Sơ đồ / Hình ảnh */}
      {question.diagram && question.diagram.url && (
        <div className="my-3 flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
          <img
            src={question.diagram.url}
            alt={question.diagram.caption || 'Hình vẽ câu hỏi'}
            className="max-h-72 max-w-full object-contain rounded-lg"
          />
          {question.diagram.caption && (
            <span className="mt-2 text-2xs text-slate-500 italic">
              {question.diagram.caption}
            </span>
          )}
        </div>
      )}

      {/* Vùng trả lời câu hỏi */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        {/* Phần I: Trắc nghiệm 4 lựa chọn */}
        {question.type === 'multiple_choice' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {q.options?.map((opt: any) => {
              const isSelected = currentAnswer === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isReviewMode}
                  onClick={() => onAnswerChange(question.id, opt.id)}
                  className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <span
                    className={`shrink-0 w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <div className="text-xs sm:text-sm text-slate-800 pt-0.5 leading-relaxed">
                    <MathRenderer content={opt.text} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Phần II: Đúng / Sai */}
        {question.type === 'true_false_cluster' && (
          <div className="space-y-3">
            {q.items?.map((item: any) => {
              const clusterMap = (typeof currentAnswer === 'object' && currentAnswer !== null) ? currentAnswer : {};
              const currentItemVal = clusterMap[item.id];
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/40"
                >
                  <div className="flex items-start gap-2.5 flex-1">
                    <span className="shrink-0 w-6 h-6 rounded-lg bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center uppercase">
                      {item.id}
                    </span>
                    <div className="text-xs sm:text-sm text-slate-800 leading-relaxed pt-0.5">
                      <MathRenderer content={item.statement} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={isReviewMode}
                      onClick={() =>
                        onAnswerChange(question.id, {
                          ...clusterMap,
                          [item.id]: true,
                        })
                      }
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        currentItemVal === true
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Đúng
                    </button>
                    <button
                      type="button"
                      disabled={isReviewMode}
                      onClick={() =>
                        onAnswerChange(question.id, {
                          ...clusterMap,
                          [item.id]: false,
                        })
                      }
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        currentItemVal === false
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Sai
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Phần III: Trả lời ngắn - Ẩn hoàn toàn ví dụ gợi ý đáp án */}
        {question.type === 'short_answer' && (
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Nhập kết quả số học đã tính toán kèm theo đơn vị đo vật lý (SI):
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-2xs font-semibold text-slate-500 mb-1">
                  Giá trị số tính được (chấp nhận cả dấu chấm hoặc dấu phẩy):
                </label>
                <input
                  type="text"
                  disabled={isReviewMode}
                  value={
                    typeof currentAnswer === 'object' && currentAnswer !== null
                      ? currentAnswer.value ?? ''
                      : (currentAnswer ?? '')
                  }
                  onChange={(e) =>
                    onAnswerChange(question.id, {
                      value: e.target.value,
                      unit:
                        (typeof currentAnswer === 'object' && currentAnswer !== null && currentAnswer.unit) ||
                        (q.acceptedUnits?.[0] || ''),
                    })
                  }
                  placeholder="Nhập giá trị số tính được..."
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-900 font-bold text-sm focus:border-indigo-600 focus:outline-none transition shadow-2xs"
                />
              </div>

              {q.acceptedUnits && q.acceptedUnits.length > 0 && (
                <div className="w-full sm:w-40">
                  <label className="block text-2xs font-semibold text-slate-500 mb-1">
                    Đơn vị đo:
                  </label>
                  <input
                    type="text"
                    disabled
                    value={q.acceptedUnits[0]}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold text-sm cursor-not-allowed"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nút chuyển câu trước / sau */}
      <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-100">
        <button
          type="button"
          disabled={index === 0}
          onClick={onPrev}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 transition cursor-pointer hover:bg-slate-50"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Câu trước</span>
        </button>

        <span className="text-2xs font-semibold text-slate-400">
          Câu {index + 1} / {totalQuestions}
        </span>

        <button
          type="button"
          disabled={index === totalQuestions - 1}
          onClick={onNext}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 transition cursor-pointer hover:bg-slate-50"
        >
          <span>Câu sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};