import React from 'react';
import { Exam, StudentAnswers, AntiCheatConfig, ViolationEvent } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { 
  Clock, Send, Flag, Bookmark, CheckCircle2, ChevronLeft, ChevronRight, 
  AlertTriangle, ShieldCheck, Maximize2, Image as ImageIcon 
} from 'lucide-react';

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
  answers,
  flaggedQuestionIds,
  onToggleFlag,
  currentQuestionIndex,
  onSelectQuestion,
  onSubmitExam,
  onRecordViolation
}) => {
  const questions = exam.questions || [];
  const currentQ: any = questions[currentQuestionIndex] || null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentAnswer: any = currentQ ? (answers as any)[currentQ.id] : undefined;
  const isFlagged = currentQ ? flaggedQuestionIds.has(currentQ.id) : false;

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      onSelectQuestion(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      onSelectQuestion(currentQuestionIndex - 1);
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // =========================================================================
  // BỘ XỬ LÝ VÀ HIỂN THỊ HÌNH VẼ MINH HỌA THÔNG MINH (XỬ LÝ DỨT ĐIỂM LỖI MẤT HÌNH)
  // =========================================================================
  const renderQuestionIllustration = (q: any) => {
    if (!q) return null;

    // 1. Kiểm tra hình vẽ dạng đồ thị vector SVG
    const svgData = q.diagram?.svgContent || q.diagram?.svg || (typeof q.diagram === 'string' && q.diagram.includes('<svg') ? q.diagram : null);
    if (svgData) {
      return (
        <div className="my-5 p-3 bg-white border-2 border-indigo-100 rounded-3xl flex flex-col items-center justify-center max-w-2xl mx-auto shadow-sm">
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

    // 2. Tìm nguồn ảnh đa năng (Hỗ trợ cả q.image, q.diagram, q.imageUrl)
    let rawSrc: string | null = null;
    let captionText: string = '';

    // Ưu tiên A: Kiểm tra q.image (Cấu trúc file JSON chuẩn)
    if (q.image) {
      if (typeof q.image === 'string') {
        rawSrc = q.image;
      } else if (q.image.data) {
        const mime = q.image.mime_type || 'image/png';
        rawSrc = String(q.image.data).startsWith('data:')
          ? q.image.data
          : `data:${mime};base64,${q.image.data}`;
        captionText = q.image.caption || '';
      } else if (q.image.url || q.image.imageUrl) {
        rawSrc = q.image.url || q.image.imageUrl;
        captionText = q.image.caption || '';
      }
    }

    // Ưu tiên B: Kiểm tra q.diagram
    if (!rawSrc && q.diagram) {
      if (typeof q.diagram === 'string') {
        rawSrc = q.diagram;
      } else {
        rawSrc = q.diagram.imageUrl || q.diagram.data || q.diagram.url || null;
        captionText = q.diagram.caption || '';
      }
    }

    // Ưu tiên C: Kiểm tra q.imageUrl hoặc q.img
    if (!rawSrc && q.imageUrl) rawSrc = q.imageUrl;
    if (!rawSrc && q.img) rawSrc = q.img;

    // Không có hình ảnh nào được khai báo
    if (!rawSrc) return null;

    // 3. Chuẩn hóa chuỗi Base64 tự động nếu thiếu tiền tố Data URI
    let finalSrc = String(rawSrc).trim();
    if (!finalSrc.startsWith('data:') && !finalSrc.startsWith('http://') && !finalSrc.startsWith('https://') && !finalSrc.startsWith('/')) {
      finalSrc = `data:image/png;base64,${finalSrc}`;
    }

    return (
      <div className="my-5 p-3 bg-white border-2 border-indigo-100 rounded-3xl flex flex-col items-center justify-center max-w-2xl mx-auto shadow-sm">
        <img
          src={finalSrc}
          alt={captionText || 'Hình vẽ câu hỏi'}
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
    <div className="w-full max-w-7xl mx-auto space-y-3">
      
      {/* 1. THANH TIÊU ĐỀ BÀI THI & THÔNG TIN THÍ SINH (GỌN GÀNG, TỐI ƯU DIỆN TÍCH) */}
      <header className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-black text-xs flex flex-col items-center justify-center shrink-0">
            <span className="text-3xs uppercase">MÃ</span>
            <span>{exam.code || '101'}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 truncate">
              {exam.title}
            </h1>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-2 truncate">
              <span>Thí sinh: <strong className="text-slate-800">{candidateInfo.name}</strong></span>
              <span>•</span>
              <span>Lớp: <strong className="text-slate-800">{candidateInfo.studentClass}</strong></span>
              <span>•</span>
              <span>SBD: <strong className="text-indigo-600 font-mono">{candidateInfo.candidateNumber}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            title="Bật/Tắt Toàn màn hình"
          >
            <Maximize2 className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Toàn màn hình</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-black text-sm sm:text-base font-mono shadow-xs">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>{formatTime(timeRemainingSeconds)}</span>
          </div>

          <button
              type="button"
              onClick={() => {
                try {
                  // Gỡ bỏ ngay các bộ chặn chuột/phím của Safari trước khi nộp
                  if (typeof window !== 'undefined') {
                    window.oncontextmenu = null;
                    document.oncontextmenu = null;
                    window.onkeydown = null;
                    document.onkeydown = null;
                    window.onblur = null;
                  }
                } catch (e) {}

                if (window.confirm('Em có chắc chắn muốn nộp bài thi ngay bây giờ không?')) {
                  onSubmitExam();
                }
              }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Nộp bài</span>
          </button>
        </div>
      </header>

      {/* 2. KHU VỰC CÂU HỎI & ĐÁP ÁN (CHỮ TO RÕ, TỐI ƯU KHÔNG GIAN) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-start">
        
        <section className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-7 space-y-6">
          
          {currentQ ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3.5 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                    {currentQ.code || `CÂU ${currentQuestionIndex + 1}`}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                    {currentQ.part || 'Phần I'}
                  </span>
                  {currentQ.topic && (
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-100 truncate max-w-xs">
                      {currentQ.topic}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onToggleFlag(currentQ.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border ${
                    isFlagged 
                      ? 'bg-amber-100 text-amber-800 border-amber-300' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-600 text-amber-600' : ''}`} />
                  <span>{isFlagged ? 'Đã đặt cờ' : 'Đặt cờ'}</span>
                </button>
              </div>

              {/* NỘI DUNG CÂU HỎI (FONT CHỮ TO RÕ text-lg md:text-xl) */}
              <div className="text-lg md:text-xl font-bold text-slate-900 leading-relaxed space-y-3">
                <MathRenderer content={currentQ.prompt || currentQ.stem || ''} />
              </div>

              {/* KHU VỰC HIỂN THỊ HÌNH VẼ MINH HỌA (ĐÃ KHẮC PHỤC TRIỆT ĐỂ LỖI MẤT HÌNH) */}
              {renderQuestionIllustration(currentQ)}

              {/* PHẦN I: TRẮC NGHIỆM 4 LỰA CHỌN */}
              {currentQ.type === 'multiple_choice' && Array.isArray(currentQ.options) && (
                <div className="space-y-3 pt-2">
                  {currentQ.options.map((opt: any) => {
                    const isSelected = String(currentAnswer) === String(opt.id) || String(currentAnswer) === String(opt.label);
                    return (
                      <button
                        key={opt.id || opt.label}
                        type="button"
                        onClick={() => onAnswerChange(currentQ.id, opt.id || opt.label)}
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

              {/* PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI THEO CHÙM Ý */}
              {currentQ.type === 'true_false_cluster' && Array.isArray(currentQ.items) && (
                <div className="space-y-3 pt-2">
                  {currentQ.items.map((item: any, sIdx: number) => {
                    const clusterAns = (typeof currentAnswer === 'object' && currentAnswer !== null) ? currentAnswer : {};
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
                            onClick={() => onAnswerChange(currentQ.id, { ...(clusterAns as any), [item.id]: true })}
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
                            onClick={() => onAnswerChange(currentQ.id, { ...(clusterAns as any), [item.id]: false })}
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
              {currentQ.type === 'short_answer' && (
                <div className="pt-3 max-w-md">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Nhập đáp án số của em:
                  </label>
                  <input
                    type="text"
                    value={
                      typeof currentAnswer === 'object' && currentAnswer !== null
                        ? String((currentAnswer as any).value || '')
                        : (typeof currentAnswer === 'string' || typeof currentAnswer === 'number')
                          ? String(currentAnswer)
                          : ''
                    }
                    onChange={(e) => onAnswerChange(currentQ.id, e.target.value)}
                    placeholder="Ví dụ: 25 hoặc 1.5"
                    className="w-full px-5 py-3.5 text-lg font-black font-mono rounded-2xl border-2 border-indigo-200 focus:border-indigo-600 outline-none transition bg-white"
                  />
                </div>
              )}

              {/* NÚT CHUYỂN CÂU TRƯỚC / TIẾP THEO */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={handlePrev}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm disabled:opacity-40 transition cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Câu trước</span>
                </button>

                <span className="text-xs font-bold text-slate-500 font-mono">
                  {currentQuestionIndex + 1} / {questions.length}
                </span>

                <button
                  type="button"
                  disabled={currentQuestionIndex === questions.length - 1}
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm disabled:opacity-40 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>Câu tiếp theo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400 font-medium">
              Không tìm thấy câu hỏi.
            </div>
          )}

        </section>

        {/* BẢNG ĐIỀU HƯỚNG DANH SÁCH TẤT CẢ CÂU HỎI (CỘT PHẢI) */}
        <aside className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-2.5">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-800">
              Danh Sách Câu Hỏi ({questions.length})
            </h3>
            <span className="text-3xs text-emerald-600 font-bold">
              Đã làm: {Object.keys(answers || {}).length}/{questions.length}
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-4 gap-2">
            {questions.map((q: any, idx: number) => {
              const isAns = (answers as any)?.[q.id] !== undefined && (answers as any)?.[q.id] !== '';
              const isFlag = flaggedQuestionIds.has(q.id);
              const isCurrent = currentQuestionIndex === idx;

              return (
                <button
                  key={q.id || idx}
                  type="button"
                  onClick={() => onSelectQuestion(idx)}
                  className={`relative aspect-square rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center border ${
                    isCurrent
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                      : isAns
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{idx + 1}</span>
                  {isFlag && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 text-3xs text-slate-500 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-indigo-600 inline-block" />
              <span>Đang chọn</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
              <span>Đã trả lời</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block" />
              <span>Chưa làm</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span>Đã đặt cờ xem lại</span>
            </div>
          </div>
        </aside>

      </div>

    </div>
  );
};