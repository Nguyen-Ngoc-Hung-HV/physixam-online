import React from 'react';
import { Question } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { DiagramViewer } from './DiagramViewer';
import { Flag, CheckCircle2 } from 'lucide-react';

export interface QuestionCardProps {
  question: Question;
  index: number;
  totalQuestions: number;
  answers: Record<string, any>;
  onAnswerChange: (answer: any) => void;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  isReviewMode?: boolean;
  correctAnswer?: any;
  explanation?: string;
}

const DEFAULT_LABELS = ['A', 'B', 'C', 'D'];

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index = 0,
  answers = {},
  onAnswerChange,
  isFlagged = false,
  onToggleFlag,
  isReviewMode = false,
  explanation
}) => {
  if (!question) return null;
  const q: any = question;
  const currentAnswer = (answers && q.id) ? answers[q.id] : undefined;

  // 1. PHẦN I: HIỂN THỊ RÕ RÀNG A, B, C, D
  const renderMultipleChoice = () => {
    const options: any[] = Array.isArray(q.options) ? q.options : [];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {options.map((opt: any, optIdx: number) => {
          const label = opt.label || DEFAULT_LABELS[optIdx] || String.fromCharCode(65 + optIdx);
          const isSelected = currentAnswer === opt.id || currentAnswer === label || currentAnswer === opt.text;

          return (
            <button
              key={opt.id || label || optIdx}
              type="button"
              disabled={isReviewMode}
              onClick={() => onAnswerChange(opt.id || label)}
              className={`p-3.5 rounded-2xl text-left border transition-all flex items-start gap-3 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-600/20 text-indigo-950 font-medium'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors shadow-xs ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                {label}
              </span>
              <div className="text-sm pt-1 leading-relaxed flex-1">
                <MathRenderer content={opt.text || opt.content || ''} />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // 2. PHẦN II: CỤM ĐÚNG / SAI 4 Ý (a, b, c, d)
  const renderTrueFalseCluster = () => {
    const items: any[] = Array.isArray(q.items) ? q.items : [];
    const clusterAns = typeof currentAnswer === 'object' && currentAnswer !== null ? currentAnswer : {};

    return (
      <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Ý hỏi</th>
              <th className="py-3 px-4 w-28 text-center">Đúng</th>
              <th className="py-3 px-4 w-28 text-center">Sai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item: any, i: number) => {
              const label = String.fromCharCode(97 + i); // a, b, c, d
              const itemVal = clusterAns[item.id] !== undefined ? clusterAns[item.id] : clusterAns[label];

              return (
                <tr key={item.id || i} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 text-slate-800 leading-relaxed">
                    <span className="font-bold mr-2 text-indigo-700">{label})</span>
                    <MathRenderer content={item.statement || item.text || ''} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="radio"
                      name={`tf_${q.id}_${item.id || label}`}
                      checked={itemVal === true}
                      disabled={isReviewMode}
                      onChange={() => onAnswerChange({ ...clusterAns, [item.id || label]: true })}
                      className="w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="radio"
                      name={`tf_${q.id}_${item.id || label}`}
                      checked={itemVal === false}
                      disabled={isReviewMode}
                      onChange={() => onAnswerChange({ ...clusterAns, [item.id || label]: false })}
                      className="w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // 3. PHẦN III: TRẢ LỜI NGẮN
  const renderShortAnswer = () => {
    const rawVal = typeof currentAnswer === 'object' && currentAnswer !== null ? currentAnswer.value : currentAnswer;
    const value = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';

    return (
      <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <label className="block text-xs font-bold text-slate-600 mb-2">
          Nhập đáp số (số hoặc phân số/thập phân ngắn gọn):
        </label>
        <input
          type="text"
          value={value}
          disabled={isReviewMode}
          onChange={(e) => onAnswerChange({ value: e.target.value })}
          placeholder="Ví dụ: 12.5 hoặc 20"
          className="w-full sm:w-72 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:bg-white text-slate-900 font-medium text-sm outline-none transition"
        />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 relative transition-all">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-black text-xs tracking-wider uppercase shadow-xs">
            {q.title || `Câu ${index + 1}`}
          </span>
          <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
            {q.part || (q.type === 'multiple_choice' ? 'Phần I' : q.type === 'true_false_cluster' ? 'Phần II' : 'Phần III')}
          </span>
          {q.topic && (
            <span className="px-2.5 py-0.5 rounded-md bg-slate-50 text-slate-500 text-2xs font-medium border border-slate-200">
              {q.topic}
            </span>
          )}
        </div>

        {onToggleFlag && (
          <button
            type="button"
            onClick={onToggleFlag}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              isFlagged
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-600 text-amber-600' : ''}`} />
            <span>{isFlagged ? 'Đã đặt cờ' : 'Đặt cờ'}</span>
          </button>
        )}
      </div>

      <div className="mt-5 text-sm sm:text-base text-slate-800 leading-relaxed font-normal">
        <MathRenderer content={q.stem || q.prompt || ''} />
      </div>

      {q.diagram && (
        <div className="my-5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex justify-center">
          <DiagramViewer diagram={q.diagram} />
        </div>
      )}

      <div className="mt-4">
        {q.type === 'multiple_choice' && renderMultipleChoice()}
        {q.type === 'true_false_cluster' && renderTrueFalseCluster()}
        {q.type === 'short_answer' && renderShortAnswer()}
      </div>

      {isReviewMode && explanation && (
        <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-sm">
          <div className="font-bold mb-1 flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
            <span>Hướng dẫn giải chi tiết:</span>
          </div>
          <MathRenderer content={explanation} />
        </div>
      )}
    </div>
  );
};