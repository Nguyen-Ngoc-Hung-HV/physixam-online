import React from 'react';
import { Question } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { Flag, Image as ImageIcon } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  userAnswer: any;
  onAnswerChange: (answer: any) => void;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  userAnswer,
  onAnswerChange,
  isFlagged = false,
  onToggleFlag,
}) => {
  const q: any = question;

  // =========================================================================
  // BỘ PHÂN GIẢI HÌNH ẢNH TOÀN NĂNG (ĐỒ THỊ, PANME, BASE64, SVG, ẢNH TẢI LÊN)
  // =========================================================================
  const renderIllustration = () => {
    if (!q) return null;

    // 1. Kiểm tra hình vẽ dạng Vector SVG
    const svgData = q.diagram?.svgContent || q.diagram?.svg || (typeof q.diagram === 'string' && q.diagram.includes('<svg') ? q.diagram : null);
    if (svgData) {
      return (
        <div className="my-4 p-3 bg-white border-2 border-indigo-100 rounded-3xl flex flex-col items-center justify-center max-w-2xl mx-auto shadow-sm">
          <div 
            className="w-full flex justify-center overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svgData }}
          />
          {q.diagram?.caption && (
            <span className="text-xs text-slate-500 font-medium italic mt-2 text-center">
              {q.diagram.caption}
            </span>
          )}
        </div>
      );
    }

    // 2. Tìm nguồn ảnh từ mọi cấu trúc: q.image, q.diagram, q.imageUrl
    let rawSrc: string | null = null;
    let captionText: string = '';

    // Trường hợp tệp JSON có trường image
    if (q.image) {
      if (typeof q.image === 'string') {
        rawSrc = q.image;
      } else if (q.image.data) {
        const mime = q.image.mime_type || 'image/png';
        rawSrc = String(q.image.data).startsWith('data:')
          ? q.image.data
          : `data:${mime};base64,${q.image.data}`;
        captionText = q.image.caption || '';
      } else if (q.image.imageUrl || q.image.url) {
        rawSrc = q.image.imageUrl || q.image.url;
        captionText = q.image.caption || '';
      }
    }

    // Trường hợp câu hỏi dùng trường diagram
    if (!rawSrc && q.diagram) {
      if (typeof q.diagram === 'string') {
        rawSrc = q.diagram;
      } else if (typeof q.diagram === 'object') {
        const dData = q.diagram.data || q.diagram.imageUrl || q.diagram.url;
        if (dData) {
          rawSrc = dData;
          captionText = q.diagram.caption || '';
        }
      }
    }

    // Trường hợp câu hỏi dùng trường imageUrl hoặc img trực tiếp
    if (!rawSrc && q.imageUrl) rawSrc = q.imageUrl;
    if (!rawSrc && q.img) rawSrc = q.img;

    if (!rawSrc) return null;

    // Chuẩn hóa tiền tố Base64 Data URI tự động nếu là chuỗi mã hóa thô
    let finalSrc = String(rawSrc).trim();
    if (!finalSrc.startsWith('data:') && !finalSrc.startsWith('http://') && !finalSrc.startsWith('https://') && !finalSrc.startsWith('/')) {
      finalSrc = `data:image/png;base64,${finalSrc}`;
    }

    return (
      <div className="my-5 p-3 bg-white border-2 border-indigo-100 rounded-3xl flex flex-col items-center justify-center max-w-2xl mx-auto shadow-sm">
        <img
          src={finalSrc}
          alt={captionText || 'Hình vẽ minh họa'}
          className="max-h-80 sm:max-h-96 w-auto object-contain rounded-2xl shadow-2xs bg-white"
          loading="eager"
        />
        {captionText && (
          <span className="text-xs text-slate-500 font-semibold italic mt-2.5 text-center">
            {captionText}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề câu hỏi, mã câu, phân loại và nút Đặt cờ */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3.5 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
            {q.code || `CÂU ${questionNumber}`}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
            {q.part || 'Phần I'}
          </span>
          {q.topic && (
            <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-100 truncate max-w-xs">
              {q.topic}
            </span>
          )}
        </div>

        {onToggleFlag && (
          <button
            type="button"
            onClick={onToggleFlag}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border ${
              isFlagged 
                ? 'bg-amber-100 text-amber-800 border-amber-300' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-600 text-amber-600' : ''}`} />
            <span>{isFlagged ? 'Đã đặt cờ' : 'Đặt cờ'}</span>
          </button>
        )}
      </div>

      {/* NỘI DUNG CÂU HỎI (FONT LỚN text-lg md:text-xl) */}
      <div className="text-lg md:text-xl font-bold text-slate-900 leading-relaxed space-y-3">
        <MathRenderer content={q.prompt || q.stem || ''} />
      </div>

      {/* HIỂN THỊ HÌNH VẼ MINH HỌA (ĐỒ THỊ, PANME, BASE64) */}
      {renderIllustration()}

      {/* PHẦN I: TRẮC NGHIỆM 4 LỰA CHỌN */}
      {q.type === 'multiple_choice' && Array.isArray(q.options) && (
        <div className="space-y-3 pt-2">
          {q.options.map((opt: any) => {
            const isSelected = String(userAnswer) === String(opt.id) || String(userAnswer) === String(opt.label);
            return (
              <button
                key={opt.id || opt.label}
                type="button"
                onClick={() => onAnswerChange(opt.id || opt.label)}
                className={`w-full p-4 rounded-2xl text-left border-2 flex items-start gap-3.5 transition cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-md ring-4 ring-indigo-600/10'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                }`}
              >
                <span className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center shrink-0 transition ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {opt.label || opt.id}
                </span>
                <div className="flex-1 text-base md:text-lg font-semibold text-slate-800 pt-0.5 leading-normal">
                  <MathRenderer content={opt.text} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI CHÙM Ý */}
      {q.type === 'true_false_cluster' && Array.isArray(q.items) && (
        <div className="space-y-3 pt-2">
          {q.items.map((item: any, sIdx: number) => {
            const clusterAns = (typeof userAnswer === 'object' && userAnswer !== null) ? userAnswer : {};
            const val = (clusterAns as any)[item.id];
            return (
              <div key={item.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1">
                  <span className="font-black text-indigo-700 font-mono text-sm pt-0.5">
                    {String.fromCharCode(97 + sIdx)})
                  </span>
                  <div className="text-base md:text-lg font-semibold text-slate-800 leading-normal">
                    <MathRenderer content={item.statement || item.text} />
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => onAnswerChange({ ...(clusterAns as any), [item.id]: true })}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                      val === true 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    ĐÚNG
                  </button>
                  <button
                    type="button"
                    onClick={() => onAnswerChange({ ...(clusterAns as any), [item.id]: false })}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                      val === false 
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    SAI
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PHẦN III: TRẢ LỜI NGẮN / ĐIỀN SỐ */}
      {q.type === 'short_answer' && (
        <div className="pt-3 max-w-md">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
            Nhập đáp án số của em:
          </label>
          <input
            type="text"
            value={
              typeof userAnswer === 'object' && userAnswer !== null
                ? String((userAnswer as any).value || '')
                : (typeof userAnswer === 'string' || typeof userAnswer === 'number')
                  ? String(userAnswer)
                  : ''
            }
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Ví dụ: 25 hoặc 1.5"
            className="w-full px-5 py-3.5 text-lg font-black font-mono rounded-2xl border-2 border-indigo-200 focus:border-indigo-600 outline-none transition bg-white"
          />
        </div>
      )}
    </div>
  );
};