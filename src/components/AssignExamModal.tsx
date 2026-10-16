import React, { useState, useEffect, useMemo } from 'react';
import { ExamPackage, ExamAssignmentInfo, GradeLevel } from '../types/curriculum';
import { Exam, AntiCheatConfig } from '../types/exam';
import { 
  Send, X, Copy, Check, QrCode, ShieldCheck, 
  Calendar, Clock, Users, ArrowRight, Sparkles, CheckCircle2, Loader2
} from 'lucide-react';

interface AssignExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  examPackage: ExamPackage;
  onAssign: (pkg: ExamPackage, assignment: ExamAssignmentInfo, switchToStudent: boolean) => void;
  currentExam?: Exam;
  antiCheatConfig?: AntiCheatConfig;
}

export const AssignExamModal: React.FC<AssignExamModalProps> = ({
  isOpen,
  onClose,
  examPackage,
  onAssign,
  currentExam,
  antiCheatConfig
}) => {
  // 1. Trích xuất đề thi hiệu lực
  const effectiveExam: Exam = (currentExam && Array.isArray(currentExam.questions) && currentExam.questions.length > 0)
    ? currentExam
    : (examPackage && examPackage.examData && Array.isArray(examPackage.examData.questions) && examPackage.examData.questions.length > 0)
      ? examPackage.examData
      : (examPackage as any);

  // 2. Xác định Khối lớp
  let rawGradeNum = 12;
  if (effectiveExam?.gradeLevel) {
    rawGradeNum = parseInt(String(effectiveExam.gradeLevel).replace(/\D/g, ''), 10) || 12;
  } else if (examPackage?.grade) {
    rawGradeNum = typeof examPackage.grade === 'number' 
      ? examPackage.grade 
      : (parseInt(String(examPackage.grade).replace(/\D/g, ''), 10) || 12);
  }
  const effectiveGrade = (rawGradeNum as unknown) as GradeLevel;

  // Tự động đồng bộ danh sách lớp theo khối
  const availableClasses = useMemo(() => {
    const g = Number(rawGradeNum) || 12;
    return [`Lớp ${g}A1`, `Lớp ${g}A2`, `Lớp ${g} Lý`, `Lớp ${g} Hóa`, `Lớp ${g} Chuyên`];
  }, [rawGradeNum]);

  const [selectedClass, setSelectedClass] = useState<string>(() => availableClasses[0]);

  useEffect(() => {
    if (availableClasses.length > 0) {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses]);

  const [distributionMode, setDistributionMode] = useState<'shuffled' | 'original'>('original');

  // ĐỒNG BỘ CHUẨN XÁC SỐ LẦN VI PHẠM TỪ CẤU HÌNH TAB 3.2
  const [maxViolations, setMaxViolations] = useState<number>(() => {
    return antiCheatConfig?.maxViolations !== undefined ? antiCheatConfig.maxViolations : 3;
  });

  useEffect(() => {
    if (antiCheatConfig?.maxViolations !== undefined) {
      setMaxViolations(antiCheatConfig.maxViolations);
    }
  }, [antiCheatConfig, antiCheatConfig?.maxViolations]);

  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isCopiedCode, setIsCopiedCode] = useState<boolean>(false);
  const [showQr, setShowQr] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(false);

  // Mã rút gọn đồng bộ
  const shortCode = String(effectiveExam?.code || examPackage?.code || 'L12B1.3').trim().toUpperCase();

  // Khử lặp từ tiêu đề "ĐỀ THI VẬT LÍ: ĐỀ THI VẬT LÍ:..."
  const rawTitle = effectiveExam?.title || examPackage?.title || 'Đề khảo thí Vật lí';
  const cleanTitle = rawTitle.replace(/^(ĐỀ\s*THI\s*VẬT\s*L[ÍI]\s*[:\-]\s*)+/gi, '').trim();

  const durationMin = effectiveExam?.durationMinutes || (examPackage as any)?.durationMinutes || 45;
  const totalQuestionsCount = effectiveExam?.questions?.length || (examPackage as any)?.total_questions || 28;

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?code=${encodeURIComponent(shortCode)}` 
    : `https://physixam-online.vercel.app/?code=${encodeURIComponent(shortCode)}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(shareUrl)}&margin=10`;

  // Tự động đồng bộ lên MongoDB
  useEffect(() => {
    if (!isOpen) return;

    const syncToDatabase = async () => {
      setIsSyncing(true);
      try {
        const payload: any = {
          id: `assign-${shortCode}`,
          code: shortCode,
          accessCode: shortCode,
          examCode: shortCode,
          examId: examPackage?.id || `pkg-${shortCode}`,
          title: cleanTitle,
          examTitle: cleanTitle,
          className: selectedClass,
          grade: effectiveGrade,
          durationMinutes: durationMin,
          totalPoints: effectiveExam?.totalPoints || 10,
          questions: effectiveExam?.questions || [],
          examData: effectiveExam,
          assignedAt: new Date().toISOString(),
          status: 'active'
        };

        const res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          setIsSynced(true);
        }
      } catch (err) {
        console.warn('Lỗi tự động đồng bộ đề thi lên MongoDB Atlas:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    syncToDatabase();
  }, [isOpen, shortCode, cleanTitle, effectiveExam, selectedClass, effectiveGrade, durationMin, examPackage]);

  if (!isOpen || !examPackage) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(shortCode);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2000);
  };

  const handleConfirm = (switchToStudent: boolean) => {
    const isAntiCheatOn = antiCheatConfig?.enabled ?? true;
    const isReqFullscreen = antiCheatConfig ? antiCheatConfig.requireFullscreen : true;
    const isPreventCopy = antiCheatConfig ? antiCheatConfig.preventCopyAndShortcuts : true;

    const newAssignment: ExamAssignmentInfo = {
      id: `assign-${Date.now()}`,
      examId: examPackage.id || `pkg-${shortCode}`,
      examTitle: cleanTitle,
      examCode: shortCode,
      accessCode: shortCode,
      grade: effectiveGrade,
      className: selectedClass,
      assignedAt: new Date().toLocaleDateString('vi-VN'),
      openTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      deadline: 'Không thời hạn',
      status: 'active',
      antiCheatEnabled: isAntiCheatOn,
      maxViolations: maxViolations,
      preventCopyAndShortcuts: isPreventCopy,
      requireFullscreen: isReqFullscreen,
      shuffleQuestions: distributionMode === 'shuffled',
      examData: effectiveExam
    } as any;

    const effectivePkg: ExamPackage = {
      ...examPackage,
      id: examPackage.id || `pkg-${shortCode}`,
      code: shortCode,
      title: cleanTitle,
      grade: effectiveGrade,
      examData: effectiveExam
    };

    onAssign(effectivePkg, newAssignment, switchToStudent);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 my-8">
        
        {/* Header Modal - Đã dọn dẹp không bị lặp chữ */}
        <div className="p-6 bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-3xs uppercase tracking-widest font-mono text-indigo-200 block">
              GIAO BÀI THI CHO HỌC SINH • KHỐI {String(effectiveGrade)} – MÃ {shortCode}
            </span>
            <h3 className="text-xl font-black text-white leading-snug line-clamp-2">
              {cleanTitle}
            </h3>
            <p className="text-xs text-indigo-100 flex items-center gap-2 pt-0.5">
              <span>Thời lượng: {durationMin} phút</span>
              <span>•</span>
              <span>{totalQuestionsCount} câu hỏi</span>
              <span>•</span>
              <span>Thang điểm 10đ</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Lớp nhận bài */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Lớp nhận bài kiểm tra:</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {availableClasses.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    selectedClass === cls
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          {/* Phương thức phân phối đề */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Phương thức phân phối đề:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDistributionMode('shuffled')}
                className={`p-3 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                  distributionMode === 'shuffled'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Xáo ngẫu nhiên
              </button>
              <button
                type="button"
                onClick={() => setDistributionMode('original')}
                className={`p-3 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                  distributionMode === 'original'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Giữ nguyên gốc
              </button>
            </div>
            <p className="text-3xs text-slate-500 italic">
              • Chế độ Ôn tập: Giữ nguyên thứ tự câu hỏi và đáp án của đề gốc để cả lớp theo dõi và chữa bài đồng bộ.
            </p>
          </div>

          {/* Giám sát thi trực tuyến - ĐÃ ĐỒNG BỘ HOÀN TOÀN TỪ TAB 3.2 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Giám sát thi trực tuyến (Anti-cheat)</span>
              </span>
              <span className={`text-3xs font-bold px-2 py-0.5 rounded ${
                antiCheatConfig?.enabled !== false ? 'text-emerald-700 bg-emerald-100' : 'text-slate-600 bg-slate-200'
              }`}>
                {antiCheatConfig?.enabled !== false ? 'Đang kích hoạt' : 'Đang tạm tắt'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600">Số lần rời màn hình tối đa trước khi tự thu bài:</span>
              <select
                value={maxViolations}
                onChange={(e) => setMaxViolations(Number(e.target.value))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none text-slate-800"
              >
                <option value={1}>1 lần (Khóa ngay khi rời tab)</option>
                <option value={2}>2 lần (Nghiêm ngặt)</option>
                <option value={3}>3 lần (Tiêu chuẩn)</option>
                <option value={5}>5 lần (Luyện tập tự do)</option>
                <option value={10}>10 lần</option>
              </select>
            </div>
          </div>

          {/* Link làm bài và mã QR */}
          <div className="p-5 rounded-3xl bg-indigo-50/50 border border-indigo-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                Link làm bài trực tiếp cho Học sinh
              </span>
              <span className="text-3xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                    <span>Đang đồng bộ...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Tự động lưu MongoDB</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Đã sao chép link!' : 'Sao chép Link làm bài cho Học sinh'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span>{showQr ? 'Ẩn mã QR' : 'Hiện mã QR'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600 font-medium">
                Mã bài thi rút gọn: <strong className="text-indigo-900 font-mono text-sm">{shortCode}</strong>
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
              >
                {isCopiedCode ? 'Đã chép mã!' : 'Sao chép mã rút gọn'}
              </button>
            </div>

            {showQr && (
              <div className="p-4 bg-white rounded-2xl border border-indigo-100 text-center space-y-2 flex flex-col items-center">
                <img
                  src={qrImageUrl}
                  alt="Mã QR thi trực tuyến"
                  className="w-48 h-48 rounded-xl object-contain shadow-xs border border-slate-100"
                />
                <p className="text-xs text-slate-600 font-medium">
                  Học sinh dùng Zalo hoặc Camera điện thoại quét mã này để vào thi trực tiếp
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Nút thao tác */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleConfirm(false)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5 text-indigo-600" />
            <span>Lưu & Tiếp tục ở Chế độ Giáo viên</span>
          </button>

          <button
            type="button"
            onClick={() => handleConfirm(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Kích hoạt & Chuyển sang Học sinh</span>
          </button>
        </div>

      </div>
    </div>
  );
};