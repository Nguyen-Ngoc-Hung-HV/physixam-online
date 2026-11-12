import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  CheckCircle2,
  FileJson,
  ImagePlus,
  Monitor,
  Pin,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Shuffle,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import { ExamData, ScrambledExamVariant, WorkstationNode } from '../types/exam';
import { MathText } from './MathText';
import { calculatePart2Points } from '../utils/scramblerAndGrader';

interface LandingPageProps {
  examData: ExamData;
  variants: ScrambledExamVariant[];
  workstations: WorkstationNode[];
  onNavigateTeacher: (subTab?: 'bank' | 'scrambler' | 'monitor' | 'online_exam') => void;
  onNavigateStudent: (examCode?: string) => void;
  onResetSystemCache: () => void;
  isAdminAuthenticated?: boolean;
  onRequestAdminAuth?: (featureLabel: string, onAuthorized: () => void) => void;
}

export type NoticeCategory = 'Thông báo thi' | 'Lịch nộp bài' | 'Nhắc việc chuyên môn';

export interface AdminNoticeItem {
  id: string;
  title: string;
  category: NoticeCategory;
  content: string;
  timestamp: string;
  pinned: boolean;
  bannerDataUrl?: string;
}

const NOTICES_STORAGE_KEY = 'smarttest_gdpt2018_admin_notices_v2';

const DEFAULT_NOTICES: AdminNoticeItem[] = [
  {
    id: 'NOTICE-1',
    title: 'Lịch thi Giữa kỳ 1 môn Vật lí 12 bắt đầu lúc 14h00',
    category: 'Thông báo thi',
    content:
      'Tất cả học sinh khối 12 có mặt tại Phòng máy LAN số 01 trước 15 phút để nhận Số báo danh (SBD) và kiểm tra kết nối máy trạm.',
    timestamp: '13:30 · Hôm nay',
    pinned: true,
  },
  {
    id: 'NOTICE-2',
    title: 'Lưu ý thí sinh: Giữ nguyên chế độ toàn màn hình trong suốt 50 phút',
    category: 'Nhắc việc chuyên môn',
    content:
      'Hệ thống tự động ghi nhận cảnh báo khi chuyển tab hoặc thoát chế độ Fullscreen Kiosk. Bài làm được tự động lưu đệm vào LocalStorage sau mỗi thao tác.',
    timestamp: '09:15 · Hôm nay',
    pinned: false,
  },
  {
    id: 'NOTICE-3',
    title: 'Hạn chót duyệt ma trận 4 mã đề hoán vị tổ Vật Lý & KHTN',
    category: 'Lịch nộp bài',
    content:
      'Giáo viên bộ môn hoàn tất cấu hình trộn mã đề (1102, 1104, 1106, 1108) và xuất bảng đáp án đối chiếu trước 11h30.',
    timestamp: '08:00 · Hôm nay',
    pinned: false,
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  examData,
  variants,
  workstations,
  onNavigateTeacher,
  onNavigateStudent,
  onResetSystemCache,
  isAdminAuthenticated = false,
  onRequestAdminAuth,
}) => {
  const runAdminProtectedAction = (featureLabel: string, action: () => void) => {
    if (isAdminAuthenticated || !onRequestAdminAuth) {
      action();
    } else {
      onRequestAdminAuth(featureLabel, action);
    }
  };
  // Unified Notice Board State (Single Seamless Feed + Quick-Add "+" Toggle)
  const [showQuickAddForm, setShowQuickAddForm] = useState<boolean>(false);
  const [notices, setNotices] = useState<AdminNoticeItem[]>(() => {
    try {
      const saved = localStorage.getItem(NOTICES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AdminNoticeItem[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to default notices
    }
    return DEFAULT_NOTICES;
  });

  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<NoticeCategory>('Thông báo thi');
  const [newContent, setNewContent] = useState<string>('');
  const [uploadedBannerUrl, setUploadedBannerUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('smarttest_gdpt2018_banner_preview');
    } catch {
      return null;
    }
  });
  const [uploadedBannerName, setUploadedBannerName] = useState<string>('Sơ đồ hướng dẫn phòng thi');
  const [noticePostFeedback, setNoticePostFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(notices));
    } catch {
      // Ignore storage quota issues
    }
  }, [notices]);

  const handlePostNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const item: AdminNoticeItem = {
      id: `NOTICE-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      content:
        newContent.trim() ||
        'Đề nghị giáo viên coi thi và học sinh thực hiện đúng quy chế khảo thí GDPT 2018.',
      timestamp: `${new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })} · Vừa xong`,
      pinned: false,
      bannerDataUrl: uploadedBannerUrl || undefined,
    };

    setNotices((prev) => [item, ...prev]);
    setNewTitle('');
    setNewContent('');
    setShowQuickAddForm(false);
    setNoticePostFeedback('Đã đăng thông báo mới lên Bảng Tin & Nhắc Việc.');
    window.setTimeout(() => setNoticePostFeedback(null), 3000);
  };

  const handleTogglePinNotice = (id: string) => {
    runAdminProtectedAction('Ghim thông báo trên Bảng Tin', () => {
      setNotices((prev) =>
        prev
          .map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
      );
    });
  };

  const handleDeleteNotice = (id: string) => {
    runAdminProtectedAction('Xoá thông báo trên Bảng Tin', () => {
      setNotices((prev) => prev.filter((n) => n.id !== id));
    });
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedBannerName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedBannerUrl(reader.result);
        try {
          localStorage.setItem('smarttest_gdpt2018_banner_preview', reader.result);
        } catch {
          // Ignore quota limit
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearBanner = () => {
    runAdminProtectedAction('Gỡ ảnh đính kèm Bảng Tin', () => {
      setUploadedBannerUrl(null);
      try {
        localStorage.removeItem('smarttest_gdpt2018_banner_preview');
      } catch {
        // Ignore
      }
    });
  };

  // Interactive Showcase State
  const [showcaseTab, setShowcaseTab] = useState<'structure' | 'palette'>('structure');

  // Mini interactive demo states for Tab 1 (GDPT 2018 Structure)
  const [demoPart1Choice, setDemoPart1Choice] = useState<number>(0);
  const [demoPart2Choices, setDemoPart2Choices] = useState<Record<'a' | 'b' | 'c' | 'd', boolean>>({
    a: true,
    b: false,
    c: true,
    d: false,
  });
  const [demoPart3Input, setDemoPart3Input] = useState<string>('100');

  // Mini interactive demo states for Tab 2 (28-Question Palette)
  const [demoPaletteState, setDemoPaletteState] = useState<
    Record<number, 'completed' | 'unanswered' | 'flagged'>
  >(() => {
    const init: Record<number, 'completed' | 'unanswered' | 'flagged'> = {};
    for (let i = 1; i <= 28; i++) {
      if (i <= 18) init[i] = i % 7 === 0 ? 'flagged' : 'completed';
      else if (i <= 22) init[i] = i === 21 ? 'flagged' : 'completed';
      else init[i] = i <= 25 ? 'completed' : 'unanswered';
    }
    return init;
  });
  const [selectedPaletteQuestion, setSelectedPaletteQuestion] = useState<number>(1);
  const [cacheClearedNotice, setCacheClearedNotice] = useState<string | null>(null);

  // Calculate live points for Tab 1 Part II demo
  const demoPart2CorrectTruth: Record<'a' | 'b' | 'c' | 'd', boolean> = {
    a: true,
    b: false,
    c: true,
    d: false,
  };
  const demoPart2CorrectCount = (['a', 'b', 'c', 'd'] as const).filter(
    (k) => demoPart2Choices[k] === demoPart2CorrectTruth[k]
  ).length;
  const demoPart2Earned = calculatePart2Points(demoPart2CorrectCount, 1.0);

  const cyclePaletteQuestionState = (qNum: number) => {
    setSelectedPaletteQuestion(qNum);
    setDemoPaletteState((prev) => {
      const curr = prev[qNum] || 'unanswered';
      const next =
        curr === 'completed'
          ? 'flagged'
          : curr === 'flagged'
          ? 'unanswered'
          : 'completed';
      return { ...prev, [qNum]: next };
    });
  };

  const paletteCounts = {
    completed: Object.values(demoPaletteState).filter((s) => s === 'completed').length,
    flagged: Object.values(demoPaletteState).filter((s) => s === 'flagged').length,
    unanswered: Object.values(demoPaletteState).filter((s) => s === 'unanswered').length,
  };

  const handleClearCacheClick = () => {
    runAdminProtectedAction('Xoá Bộ Nhớ Đệm Phiên Thi (Reset Cache)', () => {
      onResetSystemCache();
      setNotices(DEFAULT_NOTICES);
      setCacheClearedNotice(
        'Đã làm sạch bộ nhớ đệm LocalStorage và khôi phục trạng thái mẫu ban đầu.'
      );
      window.setTimeout(() => setCacheClearedNotice(null), 4000);
    });
  };

  const sortedNotices = [...notices].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
  );

  return (
    <div className="space-y-16 pb-16">
      {/* =====================================================================
          SECTION A: 2-COLUMN HERO SECTION (LEFT PROPOSITION / RIGHT UNIFIED NOTICE BOARD)
      ===================================================================== */}
      <section className="relative pt-6 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-7xl mx-auto px-6 py-8">
          {/* LEFT COLUMN (lg:col-span-7): Left-aligned Eyebrow, Cambria Serif Headline, Subheadline, CTAs & Quick Stats */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6 text-left">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-violet-300 tracking-wide">
                <span>Nền Tảng Khảo Thí & Ôn Luyện Đánh Giá Năng Lực Chuẩn GDPT 2018</span>
              </div>

              <h1
                className="font-cambria-hero text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight"
                style={{
                  fontFamily: "'Cambria', Georgia, serif",
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                Hệ thống ôn luyện và kiểm tra thông minh
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Giải pháp toàn diện tối ưu hóa cho cấu trúc đề thi 28 câu (40 lệnh hỏi), bóc tách JSON chuẩn hóa, tự động kết xuất công thức KaTeX sắc nét và barem điểm lũy tiến chuẩn Bộ GD&ĐT.
              </p>

              {/* Primary CTA Action Buttons (Left-Aligned) */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateStudent(variants[0]?.code || '101')}
                  className="px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-base sm:text-lg flex items-center gap-2.5 shadow-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Vào Phòng Thi Ngay</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTeacher('bank')}
                  className="px-6 py-3.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-100 border border-indigo-700/80 font-semibold text-base sm:text-lg flex items-center gap-2.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Sliders className="w-5 h-5 text-violet-400" />
                  <span>Truy Cập Cổng Giáo Viên</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Counters (2x2 Compact Grid on Left Column) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="bg-[#18182e]/90 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="text-xs font-mono text-violet-400">HẠ TẦNG PHÒNG MÁY</div>
                <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums">
                  100% Offline LAN Sẵn Sàng
                </div>
                <div className="text-xs sm:text-sm text-slate-400">
                  Vận hành nội bộ ổn định, tự động khôi phục phiên thi.
                </div>
              </div>

              <div className="bg-[#18182e]/90 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="text-xs font-mono text-indigo-400">ĐỊNH DẠNG ĐỀ THI MỚI</div>
                <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums">
                  28 Câu / 40 Lệnh Hỏi Chuẩn
                </div>
                <div className="text-xs sm:text-sm text-slate-400">
                  18 câu ABCD · 4 câu Đúng/Sai · 6 câu trả lời ngắn.
                </div>
              </div>

              <div className="bg-[#18182e]/90 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="text-xs font-mono text-emerald-400">CHẾ TÁC CÔNG THỨC</div>
                <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums">
                  Bảo Toàn LaTeX Tuyệt Đối
                </div>
                <div className="text-xs sm:text-sm text-slate-400">
                  Hiển thị sắc nét phương trình <MathText text="$x = A\cos(\omega t + \varphi)$" />.
                </div>
              </div>

              <div className="bg-[#18182e]/90 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="text-xs font-mono text-amber-400">THANG ĐÁNH GIÁ</div>
                <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums">
                  Barem Lũy Tiến Bộ GD&ĐT
                </div>
                <div className="text-xs sm:text-sm text-slate-400">
                  Chấm chuẩn xác 0,10đ · 0,25đ · 0,50đ · 1,00đ.
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (lg:col-span-5): Unified Streamlined "Bảng Tin & Nhắc Việc" */}
          <div className="lg:col-span-5 w-full flex flex-col">
            <div className="bg-slate-900/80 border-2 border-violet-600/50 rounded-2xl p-5 shadow-xl flex flex-col justify-start h-full gap-4">
              {/* 1. Header: Title "Bảng Tin & Nhắc Việc", Live Notice Count & "+" Quick-Add Button */}
              <div className="flex items-start sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3.5 shrink-0">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug whitespace-nowrap">
                        Bảng Tin & Nhắc Việc
                      </h2>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-violet-600/20 border border-violet-500/40 text-[11px] font-mono font-bold text-violet-300 whitespace-nowrap shrink-0">
                        {notices.length} tin mới
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-snug">
                      <span className="whitespace-nowrap">Thông báo thi</span>
                      <span aria-hidden="true">·</span>
                      <span className="whitespace-nowrap">Lịch nộp bài</span>
                      <span aria-hidden="true">·</span>
                      <span className="whitespace-nowrap">Nhắc việc chuyên môn</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      runAdminProtectedAction('Đính kèm ảnh sơ đồ phòng thi', () =>
                        fileInputRef.current?.click()
                      )
                    }
                    title="Đính kèm ảnh / sơ đồ phòng thi (Yêu cầu mật khẩu Quản trị)"
                    className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (showQuickAddForm) {
                        setShowQuickAddForm(false);
                      } else {
                        runAdminProtectedAction('Đăng thông báo mới lên Bảng Tin', () =>
                          setShowQuickAddForm(true)
                        );
                      }
                    }}
                    title={
                      showQuickAddForm
                        ? 'Đóng biểu mẫu'
                        : 'Thêm thông báo nhắc việc mới (Yêu cầu mật khẩu Quản trị)'
                    }
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold transition-colors ${
                      showQuickAddForm
                        ? 'bg-rose-600 text-white'
                        : 'bg-violet-600 hover:bg-violet-500 text-white'
                    }`}
                  >
                    {showQuickAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {noticePostFeedback && (
                <div className="px-3.5 py-2 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-200 text-xs sm:text-sm flex items-center gap-2 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{noticePostFeedback}</span>
                </div>
              )}

              {/* Optional Inline Quick-Add Form toggled by "+" button */}
              {showQuickAddForm && (
                <form
                  onSubmit={handlePostNotice}
                  className="p-3.5 rounded-xl bg-slate-950/90 border border-violet-700/50 space-y-2.5 shrink-0"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Tiêu đề thông báo / nhắc việc..."
                      className="sm:col-span-7 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-violet-500"
                    />
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as NoticeCategory)}
                      className="sm:col-span-5 px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="Thông báo thi">Thông báo thi</option>
                      <option value="Lịch nộp bài">Lịch nộp bài</option>
                      <option value="Nhắc việc chuyên môn">Nhắc việc chuyên môn</option>
                    </select>
                  </div>

                  <textarea
                    rows={2}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Nội dung chi tiết gửi đến giáo viên coi thi hoặc học sinh..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-violet-500 resize-none"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQuickAddForm(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:text-white"
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Đăng Tin</span>
                    </button>
                  </div>
                </form>
              )}

              {/* 2. Unified Notice Feed Container — Positioned immediately at top of card body */}
              <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 flex flex-col justify-start">
                {uploadedBannerUrl && (
                  <div className="rounded-xl overflow-hidden border border-violet-700/50 bg-slate-950 shrink-0">
                    <img
                      src={uploadedBannerUrl}
                      alt={uploadedBannerName}
                      referrerPolicy="no-referrer"
                      className="w-full h-28 object-cover"
                    />
                    <div className="px-3 py-1.5 flex items-center justify-between text-xs text-slate-300 bg-slate-900/90">
                      <span className="truncate font-mono">{uploadedBannerName}</span>
                      <button
                        type="button"
                        onClick={handleClearBanner}
                        className="text-rose-400 hover:text-rose-300 ml-2 shrink-0"
                      >
                        Gỡ ảnh
                      </button>
                    </div>
                  </div>
                )}

                {sortedNotices.map((item) => {
                  const isExamNotice = item.category === 'Thông báo thi';
                  const isDeadlineNotice = item.category === 'Lịch nộp bài';

                  const cardSurfaceClass = item.pinned
                    ? 'notice-card-pinned bg-indigo-950/85 border-2 border-violet-500 shadow-md shadow-violet-950/30'
                    : isExamNotice
                    ? 'notice-card-exam bg-indigo-950/60 border border-violet-500/70 shadow-sm'
                    : isDeadlineNotice
                    ? 'notice-card-deadline bg-emerald-950/55 border border-emerald-500/70 shadow-sm'
                    : 'notice-card-reminder bg-amber-950/55 border border-amber-500/70 shadow-sm';

                  const categoryTextClass = isExamNotice
                    ? 'text-violet-300 font-extrabold'
                    : isDeadlineNotice
                    ? 'text-emerald-300 font-extrabold'
                    : 'text-amber-300 font-extrabold';

                  const priorityLabel = item.pinned
                    ? 'TIÊU ĐIỂM GHIM'
                    : isExamNotice
                    ? 'KHẨN'
                    : isDeadlineNotice
                    ? 'HẠN CHÓT'
                    : 'CHÚ Ý';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl space-y-2 transition-all hover:scale-[1.005] ${cardSurfaceClass}`}
                    >
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono min-w-0">
                          <span className={`uppercase tracking-wider whitespace-nowrap ${categoryTextClass}`}>
                            [{priorityLabel}] {item.category}
                          </span>
                          <span aria-hidden="true" className="text-slate-400">
                            ·
                          </span>
                          <span className="font-semibold text-slate-300 whitespace-nowrap">
                            {item.timestamp}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePinNotice(item.id)}
                            title={item.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.pinned
                                ? 'text-amber-300 bg-amber-950/80 border border-amber-500/50'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNotice(item.id)}
                            title="Xoá thông báo"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-base sm:text-[17px] font-extrabold text-white leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                        {item.content}
                      </p>
                    </div>
                  );
                })}

                {sortedNotices.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800">
                    Chưa có thông báo nào. Nhấn nút &ldquo;+&rdquo; ở góc trên để thêm nhắc việc mới.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          DUAL ROLE DISPATCH CARDS (TEACHER PORTAL & STUDENT KIOSK)
      ===================================================================== */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* CARD 1: TEACHER & DEPARTMENT PORTAL */}
          <div className="bg-[#18182e] border border-indigo-800/80 hover:border-violet-500/80 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-sm font-semibold text-violet-400">
                    Dành cho Giáo viên & Tổ Chuyên Môn
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                    Cổng Quản Trị Khảo Thí
                  </h2>
                </div>
                <div className="w-11 h-11 rounded-xl bg-violet-950/90 border border-violet-700/60 flex items-center justify-center text-violet-300 shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Quản lý ngân hàng câu hỏi Vật Lý 12, nạp đề JSON chuẩn cấu trúc, trộn tự động {variants.length} mã đề hoán vị độc lập và giám sát phòng máy LAN theo thời gian thực.
              </p>

              <ul className="space-y-2.5 text-sm sm:text-base text-slate-200">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Ngân hàng {examData.part1.length + examData.part2.length + examData.part3.length} câu hỏi gốc:</strong> Kiểm duyệt trực tiếp công thức <MathText text="$x = A\cos(\omega t + \varphi)$" />, <MathText text="$\vec{B}$" />, <MathText text="$p = aT$" />.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Bộ trộn {variants.length} mã đề ({variants.map((v) => v.code).join(', ')}):</strong> Đảo câu hỏi, đảo đáp án A/B/C/D và hoán vị 4 mệnh đề Đúng/Sai a, b, c, d.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Giám sát LAN ({workstations.length} máy trạm):</strong> Theo dõi tiến độ làm bài, điểm số và cảnh báo thoát màn hình.
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTeacher('bank')}
                  className="px-3.5 py-2 text-sm font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Mở Ngân Hàng Đề
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTeacher('scrambler')}
                  className="px-3.5 py-2 text-sm font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Mở Trộn 4 Mã Đề
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTeacher('monitor')}
                  className="px-3.5 py-2 text-sm font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Mở Giám Sát LAN ({workstations.length} máy)
                </button>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTeacher('bank')}
                className="w-full py-3.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Truy Cập Cổng Giáo Viên</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CARD 2: STUDENT ONLINE EXAM KIOSK */}
          <div className="bg-[#18182e] border border-indigo-800/80 hover:border-emerald-500/80 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-sm font-semibold text-emerald-400">
                    Dành cho Thí sinh & Học sinh THPT
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                    Cổng Phòng Thi Trực Tuyến
                  </h2>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-950/90 border border-emerald-700/60 flex items-center justify-center text-emerald-300 shrink-0">
                  <Monitor className="w-5 h-5" />
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Môi trường làm bài Kiosk chuyên nghiệp: nhập Số báo danh, chọn mã đề thi, tự động khóa toàn màn hình, lưu bài tức thời chống mất dữ liệu khi rớt mạng và chấm điểm ngay khi nộp.
              </p>

              <ul className="space-y-2.5 text-sm sm:text-base text-slate-200">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Giao diện chia đôi 70/30 chuẩn phòng máy:</strong> Đề thi KaTeX cỡ chữ lớn rõ nét bên trái, bảng điều hướng 28 câu & đồng hồ 50 phút bên phải.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Bảo mật Kiosk & Chống mất bài:</strong> Cảnh báo chuyển tab/thoát Fullscreen, tự động lưu LocalStorage sau mỗi thao tác chọn đáp án.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Chấm điểm lũy tiến Bộ GD&ĐT:</strong> Tự động quy đổi thang điểm 10,00 và hiển thị lời giải Vật Lý chi tiết.
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => onNavigateStudent(variants[0]?.code || '101')}
                className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Vào Phòng Thi Ngay</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION B: CORE ARCHITECTURAL PILLARS (PHÂN TẦNG CHỨC NĂNG KHOA HỌC)
      ===================================================================== */}
      <section id="features-section" className="px-6 scroll-mt-24">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1.5">
              <div className="text-sm font-semibold text-violet-400">
                Kiến Trúc Hệ Thống Khảo Thí Khoa Học
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                4 Trụ Cột Công Nghệ Cốt Lõi Của SmartTest GDPT 2018
              </h2>
            </div>
            <div className="text-sm text-slate-400 font-mono">
              Thiết kế chuyên biệt cho môn Vật Lý THPT (Lớp 10 · 11 · 12)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1 */}
            <div className="bg-[#18182e] border border-indigo-900/70 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-mono font-bold text-violet-400">
                    01. NHẬP LIỆU & KIỂM DUYỆT ĐỀ
                  </span>
                  <FileJson className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Bóc Tách & Nhập Đề JSON Tự Động
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Hỗ trợ nhập trực tiếp cấu trúc đề 3 phần (Phần I: 18 câu trắc nghiệm nhiều lựa chọn, Phần II: 4 câu Đúng/Sai với 16 mệnh đề, Phần III: 6 câu Trả lời ngắn), kiểm duyệt công thức KaTeX và điều chỉnh trọng số điểm trực quan.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-mono text-slate-400">
                  Hỗ trợ LaTeX inline $...$ & block $$...$$
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTeacher('bank')}
                  className="font-semibold text-violet-400 hover:text-violet-300 whitespace-nowrap shrink-0"
                >
                  Mở Trình Nhập JSON →
                </button>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-[#18182e] border border-indigo-900/70 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-mono font-bold text-indigo-400">
                    02. THUẬT TOÁN HOÁN VỊ MA TRẬN
                  </span>
                  <Shuffle className="w-5 h-5 text-indigo-400 shrink-0" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Động Cơ Trộn Đề Thông Minh (Smart Scrambler)
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Tự động hoán vị thứ tự câu hỏi và phương án theo đúng quy chuẩn GDPT 2018, bảo toàn tính logic của các chùm lệnh hỏi a), b), c), d) ở Phần II và tự động kết xuất bảng ma trận đáp án cho toàn bộ các mã đề.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-mono text-slate-400">
                  Khởi tạo tức thì mã đề 101, 102, 103, 104
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTeacher('scrambler')}
                  className="font-semibold text-indigo-400 hover:text-indigo-300 whitespace-nowrap shrink-0"
                >
                  Thử Trộn Đề Ngay →
                </button>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-[#18182e] border border-indigo-900/70 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">
                    03. AN NINH PHÒNG MÁY & CHỐNG MẤT BÀI
                  </span>
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Giám Sát Phòng Máy Độc Lập (Local LAN Mode)
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Vận hành độc lập không phụ thuộc Internet, phát hiện học sinh chuyển tab/thu nhỏ cửa sổ hoặc thoát chế độ Toàn màn hình. Cơ chế lưu đệm LocalStorage tự động bảo vệ bài làm khi mất điện hoặc rớt mạng đột ngột.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-mono text-slate-400">
                  Đồng bộ trực tiếp với bảng theo dõi Giáo viên
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTeacher('monitor')}
                  className="font-semibold text-emerald-400 hover:text-emerald-300 whitespace-nowrap shrink-0"
                >
                  Xem Bảng Giám Sát LAN →
                </button>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="bg-[#18182e] border border-indigo-900/70 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-mono font-bold text-amber-400">
                    04. ĐÁNH GIÁ CHUẨN BỘ GIÁO DỤC
                  </span>
                  <Award className="w-5 h-5 text-amber-400 shrink-0" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Động Cơ Chấm Điểm Lũy Tiến Tức Thì
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Tự động tính điểm theo công thức chuẩn Bộ GD&ĐT (Phần I: 0,25đ/câu; Phần II lũy tiến: 1 ý = 0,10đ, 2 ý = 0,25đ, 3 ý = 0,50đ, 4 ý = 1,00đ; Phần III: 0,25đ/câu chấp nhận cả dấu phẩy và dấu chấm thập phân).
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-mono text-slate-400">
                  Xuất phiếu điểm chi tiết & giải thích từng câu
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateStudent('101')}
                  className="font-semibold text-amber-400 hover:text-amber-300 whitespace-nowrap shrink-0"
                >
                  Trải Nghiệm Chấm Tự Động →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION C: INTERACTIVE LIVE SHOWCASE / MINI-PREVIEW
      ===================================================================== */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto bg-[#18182e] border border-indigo-900/80 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-violet-400">
                Mô Phỏng Trực Quan Ngay Trên Trang Chủ
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Trải Nghiệm Nhanh Cấu Trúc Đề KaTeX & Phiếu Trả Lời 28 Câu
              </h2>
            </div>

            {/* Interactive Toggle Tabs */}
            <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl self-start">
              <button
                type="button"
                onClick={() => setShowcaseTab('structure')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  showcaseTab === 'structure'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tab 1: Cấu Trúc Đề GDPT 2018 (Live KaTeX)
              </button>
              <button
                type="button"
                onClick={() => setShowcaseTab('palette')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  showcaseTab === 'palette'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tab 2: Phiếu Trả Lời Trắc Nghiệm 28 Câu
              </button>
            </div>
          </div>

          {/* SHOWCASE TAB 1: LIVE KATEX GDPT 2018 QUESTION STRUCTURE */}
          {showcaseTab === 'structure' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sample Part I */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs sm:text-sm font-mono">
                    <span className="text-violet-400 font-bold whitespace-nowrap">PHẦN I · TRẮC NGHIỆM ABCD</span>
                    <span className="text-emerald-400 whitespace-nowrap">+0,25 điểm / câu</span>
                  </div>
                  <div className="text-base text-slate-100 leading-relaxed">
                    <MathText text="Một vật dao động điều hòa với phương trình $x = A\cos(\omega t + \varphi)$. Gia tốc cực đại của vật có độ lớn là:" />
                  </div>
                  <div className="space-y-2">
                    {[
                      '$a_{\\max} = \\omega^2 A$',
                      '$a_{\\max} = \\omega A$',
                      '$a_{\\max} = \\omega A^2$',
                      '$a_{\\max} = \\frac{A}{\\omega^2}$',
                    ].map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDemoPart1Choice(idx)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-sm sm:text-base flex items-center justify-between gap-2 transition-colors ${
                          demoPart1Choice === idx
                            ? 'bg-indigo-950 border-violet-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <strong className="font-mono">{['A', 'B', 'C', 'D'][idx]}.</strong>
                          <MathText text={opt} />
                        </span>
                        {demoPart1Choice === idx && (
                          <span className="font-mono text-xs text-emerald-400 whitespace-nowrap shrink-0">
                            {idx === 0 ? 'Đúng (+0,25đ)' : 'Sai (0,00đ)'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-slate-400 border-t border-slate-800 pt-2.5">
                  Nhấn thử các phương án để kiểm tra phản hồi chấm điểm Phần I.
                </div>
              </div>

              {/* Sample Part II */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs sm:text-sm font-mono">
                    <span className="text-violet-400 font-bold whitespace-nowrap">PHẦN II · ĐÚNG / SAI LŨY TIẾN</span>
                    <span className="text-emerald-400 font-bold whitespace-nowrap">
                      Đạt: {demoPart2Earned.toFixed(2)} / 1,00đ
                    </span>
                  </div>
                  <div className="text-base text-slate-100 leading-relaxed">
                    <MathText text="Cho $1\text{ mol}$ khí lý tưởng biến đổi theo quy luật $p = aT$ từ $T_1 = 300\text{ K}$ đến $T_2 = 600\text{ K}$:" />
                  </div>
                  <div className="space-y-2">
                    {(
                      [
                        { id: 'a', label: 'a) Đây là quá trình đẳng tích ($V = \\text{const}$).' },
                        { id: 'b', label: 'b) Áp suất tăng lên gấp $3$ lần ($p_2 = 3p_1$).' },
                        { id: 'c', label: 'c) Khối khí không thực hiện công ($A = 0$).' },
                        { id: 'd', label: 'd) Nội năng của khối khí giảm đi.' },
                      ] as const
                    ).map((st) => (
                      <div
                        key={st.id}
                        className="px-3 py-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="text-slate-200 flex-1">
                          <MathText text={st.label} />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono">
                          <button
                            type="button"
                            onClick={() =>
                              setDemoPart2Choices((p) => ({ ...p, [st.id]: true }))
                            }
                            className={`px-2.5 py-1 rounded text-xs font-bold ${
                              demoPart2Choices[st.id]
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            Đ
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDemoPart2Choices((p) => ({ ...p, [st.id]: false }))
                            }
                            className={`px-2.5 py-1 rounded text-xs font-bold ${
                              !demoPart2Choices[st.id]
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            S
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-mono border-t border-slate-800 pt-2.5">
                  Đang đúng {demoPart2CorrectCount}/4 ý → Barem Bộ GD&ĐT:{' '}
                  <strong className="text-emerald-400 whitespace-nowrap">{demoPart2Earned.toFixed(2)} điểm</strong>
                </div>
              </div>

              {/* Sample Part III */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs sm:text-sm font-mono">
                    <span className="text-violet-400 font-bold whitespace-nowrap">PHẦN III · TRẢ LỜI NGẮN</span>
                    <span className="text-emerald-400 whitespace-nowrap">+0,25 điểm / câu</span>
                  </div>
                  <div className="text-base text-slate-100 leading-relaxed">
                    <MathText text="Mạch dao động $LC$ có $L = \frac{1}{\pi}\text{ mH}$ và $C = \frac{25}{\pi}\text{ nF}$. Tần số dao động riêng $f = \frac{1}{2\pi\sqrt{LC}}$ bằng bao nhiêu $\text{kHz}$?" />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <label className="block text-xs sm:text-sm font-mono text-slate-400">
                      Nhập đáp số (chấp nhận dấu phẩy hoặc chấm):
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={demoPart3Input}
                        onChange={(e) => setDemoPart3Input(e.target.value)}
                        className="w-28 px-3.5 py-2 rounded-lg bg-slate-900 border border-violet-500 text-white font-mono text-base font-bold focus:outline-none"
                      />
                      <span className="text-sm font-mono text-slate-400">kHz</span>
                      <span
                        className={`ml-auto text-xs sm:text-sm font-mono font-bold whitespace-nowrap ${
                          demoPart3Input.trim() === '100'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {demoPart3Input.trim() === '100'
                          ? '✓ Khớp chuẩn (100)'
                          : 'Đáp số đúng: 100'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 border-t border-slate-800 pt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span>Tự động chuẩn hóa khoảng trắng & dấu thập phân.</span>
                  <button
                    type="button"
                    onClick={() => onNavigateStudent('101')}
                    className="text-violet-400 font-semibold hover:text-violet-300 whitespace-nowrap shrink-0"
                  >
                    Mở Đề Đầy Đủ →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SHOWCASE TAB 2: 28-QUESTION PALETTE INTERACTIVE DEMO */}
          {showcaseTab === 'palette' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-mono">
                  <span className="text-slate-300">
                    Nhấn vào bất kỳ ô số nào từ <strong>Câu 1 đến Câu 28</strong> để đổi trạng thái:
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-violet-400">
                      Đã làm: {paletteCounts.completed}
                    </span>
                    <span className="text-amber-400">
                      Xem lại: {paletteCounts.flagged}
                    </span>
                    <span className="text-slate-400">
                      Chưa làm: {paletteCounts.unanswered}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2.5 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((qNum) => {
                    const st = demoPaletteState[qNum] || 'unanswered';
                    return (
                      <button
                        key={qNum}
                        type="button"
                        onClick={() => cyclePaletteQuestionState(qNum)}
                        className={`h-11 sm:h-12 rounded-lg font-mono text-base font-bold tabular-nums transition-all border ${
                          st === 'completed'
                            ? 'bg-violet-600 border-violet-400 text-white'
                            : st === 'flagged'
                            ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-200'
                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                        } ${selectedPaletteQuestion === qNum ? 'ring-2 ring-white/60' : ''}`}
                      >
                        {qNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="text-xs sm:text-sm font-mono text-violet-400">
                  THÔNG TIN Ô CÂU HỎI ĐANG CHỌN: CÂU {selectedPaletteQuestion}
                </div>
                <h3 className="text-lg font-bold text-white">
                  {selectedPaletteQuestion <= 18
                    ? `Phần I · Câu ${selectedPaletteQuestion} (Trắc nghiệm 4 lựa chọn A, B, C, D)`
                    : selectedPaletteQuestion <= 22
                    ? `Phần II · Câu ${selectedPaletteQuestion - 18} (Trắc nghiệm Đúng/Sai 4 ý a, b, c, d)`
                    : `Phần III · Câu ${selectedPaletteQuestion - 22} (Trắc nghiệm trả lời ngắn điền số)`}
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Trong phòng thi thực tế, bảng điều hướng 28 câu được ghim cố định bên phải màn hình với kích thước nút lớn dễ thao tác cùng đồng hồ đếm ngược 50 phút.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigateStudent('101')}
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm sm:text-base font-bold transition-colors whitespace-nowrap shrink-0"
                  >
                    Vào Phòng Thi Thật Với Bảng 28 Câu
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          SECTION D: SYSTEM ADMINISTRATION & CACHE CREDITS BAR
      ===================================================================== */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto bg-[#141728] border border-slate-800/90 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs sm:text-sm font-mono text-violet-400">
              HỆ THỐNG KHẢO THÍ SMARTTEST PHYSICS · PHIÊN BẢN v2.6 GDPT 2018
            </div>
            <p className="text-sm text-slate-400">
              Tất cả dữ liệu ngân hàng đề, 4 mã đề trộn và trạng thái phòng máy LAN được giữ nguyên xuyên suốt khi chuyển đổi giữa Trang Chủ, Cổng Giáo Viên và Cổng Học Sinh.
            </p>
            {cacheClearedNotice && (
              <p className="text-sm text-emerald-400 font-mono pt-1">
                ✓ {cacheClearedNotice}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleClearCacheClick}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-200 hover:text-rose-200 border border-slate-700 hover:border-rose-700 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xoá Bộ Nhớ Đệm Phiên Thi (Reset Cache)</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
