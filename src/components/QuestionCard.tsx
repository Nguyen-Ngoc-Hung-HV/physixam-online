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

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index = 0,
  totalQuestions = 1,
  answers = {},
  onAnswerChange,
  isFlagged = false,
  onToggleFlag,
  onPrev,
  onNext,
  isReviewMode = false,
  correctAnswer,
  explanation
}) => {
  if (!question) return null;

  // Lấy câu hỏi dưới dạng any an toàn để tương thích mọi kiểu Union trong TypeScript
  const q: any = question;

  // Lấy câu trả lời hiện tại an toàn, tránh lỗi r[e.id]
  const currentAnswer = (answers && q.id) ? answers[q.id] : undefined;

  // 1. Render Phần I: Trắc nghiệm 4 phương án
  const renderMultipleChoice = () => {
    const options: any[] = Array.isArray(q.options) ? q.options : [];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {options.map((opt: any) => {
          const isSelected = currentAnswer === opt.id || currentAnswer === opt.label;
          return (
            <button
              key={opt.id || opt.label}
              type="button"
              disabled={isReviewMode}
              onClick={() => onAnswerChange(opt.id || opt.label)}
              className={`p-3.5 rounded-2xl text-left border transition-all flex items-start gap-3 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-medium'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {opt.label}
              </span>
              <div className="text-sm pt-0.5 leading-relaxed flex-1">
                <MathRenderer content={opt.text || ''} />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // 2. Render Phần II: Cụm Đúng / Sai 4 ý (a, b, c, d)
  const renderTrueFalseCluster = () => {
    const items: any[] = Array.isArray(q.items) ? q.items : [];
    const clusterAns = typeof currentAnswer === 'object' && currentAnswer !== null ? currentAnswer : {};

    return (
      <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden bg-white">
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
              const itemVal = clusterAns[item.id];

              return (
                <tr key={item.id || i} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 text-slate-800 leading-relaxed">
                    <span className="font-bold mr-2 text-indigo-700">{label})</span>
                    <MathRenderer content={item.statement || item.text || ''} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="radio"
                      name={`tf_${q.id}_${item.id}`}
                      checked={itemVal === true}
                      disabled={isReviewMode}
                      onChange={() => {
                        onAnswerChange({ ...clusterAns, [item.id]: true });
                      }}
                      className="w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="radio"
                      name={`tf_${q.id}_${item.id}`}
                      checked={itemVal === false}
                      disabled={isReviewMode}
                      onChange={() => {
                        onAnswerChange({ ...clusterAns, [item.id]: false });
                      }}
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

  // 3. Render Phần III: Trả lời ngắn / Điền số
  const renderShortAnswer = () => {
    const rawVal = typeof currentAnswer === 'object' && currentAnswer !== null ? currentAnswer.value : currentAnswer;
    const value = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';

    return (
      <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <label className="block text-xs font-bold text-slate-600 mb-2">
          Nhập kết quả / đáp số (chỉ ghi số hoặc phân số/thập phân ngắn gọn):
        </label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={value}
            disabled={isReviewMode}
            onChange={(e) => onAnswerChange({ value: e.target.value })}
            placeholder="Ví dụ: 12.5 hoặc 20"
            className="w-full sm:w-72 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:bg-white text-slate-900 font-medium text-sm outline-none transition"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 relative transition-all">
      {/* Header câu hỏi */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-black text-xs tracking-wider uppercase shadow-xs">
            {q.title || `Câu ${index + 1}`}
          </span>
          <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
            {q.part || 'Phần I'}
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

      {/* Nội dung đề dẫn câu hỏi (hỗ trợ KaTeX công thức) */}
      <div className="mt-5 text-sm sm:text-base text-slate-800 leading-relaxed font-normal">
        <MathRenderer content={q.stem || q.prompt || ''} />
      </div>

      {/* Sơ đồ / Hình vẽ Vật lí (SVG hoặc ảnh nếu có) */}
      {q.diagram && (
        <div className="my-5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex justify-center">
          <DiagramViewer diagram={q.diagram} />
        </div>
      )}

      {/* Vùng chọn phương án theo kiểu câu hỏi */}
      <div className="mt-4">
        {q.type === 'multiple_choice' && renderMultipleChoice()}
        {q.type === 'true_false_cluster' && renderTrueFalseCluster()}
        {q.type === 'short_answer' && renderShortAnswer()}
      </div>

      {/* Lời giải chi tiết (khi xem lại bài thi) */}
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