import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  FileJson,
  ImagePlus,
  Monitor,
  Pencil,
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
  onNavigateStatistics?: () => void;
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
  onNavigateStatistics,
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

  // Unified Notice Board State (Single Seamless Feed + Quick-Add "+" & Inline Edit)
  const [showQuickAddForm, setShowQuickAddForm] = useState<boolean>(false);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
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

  // Back to Top Floating Action Button State (Appears when scrolled > 300px)
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  useEffect(() => {
    const handleWindowScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      setShowBackToTop(currentScrollY > 300);
    };

    handleWindowScroll();
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, []);

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePostNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (editingNoticeId) {
      setNotices((prev) =>
        prev.map((n) =>
          n.id === editingNoticeId
            ? {
                ...n,
                title: newTitle.trim(),
                category: newCategory,
                content:
                  newContent.trim() ||
                  'Đề nghị giáo viên coi thi và học sinh thực hiện đúng quy chế khảo thí GDPT 2018.',
              }
            : n
        )
      );
      setEditingNoticeId(null);
      setNewTitle('');
      setNewContent('');
      setShowQuickAddForm(false);
      setNoticePostFeedback('Đã cập nhật thông báo trên Bảng tin & Nhắc việc.');
      window.setTimeout(() => setNoticePostFeedback(null), 3000);
      return;
    }

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
    setNoticePostFeedback('Đã đăng thông báo mới lên Bảng tin & Nhắc việc.');
    window.setTimeout(() => setNoticePostFeedback(null), 3000);
  };

  const handleStartEditNotice = (notice: AdminNoticeItem) => {
    runAdminProtectedAction('Chỉnh sửa thông báo trên Bảng Tin', () => {
      setEditingNoticeId(notice.id);
      setNewTitle(notice.title);
      setNewCategory(notice.category);
      setNewContent(notice.content);
      setShowQuickAddForm(true);
    });
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
      if (editingNoticeId === id) {
        setEditingNoticeId(null);
        setNewTitle('');
        setNewContent('');
        setShowQuickAddForm(false);
      }
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

  const totalQuestionBankCount =
    examData.part1.length + examData.part2.length + examData.part3.length;

  const totalExamTurnsCount = workstations.length;
  const availableExamsCount = variants.length;
  const averageCompletionRate =
    workstations.length > 0
      ? Math.round(
          workstations.reduce(
            (sum, w) =>
              sum +
              (w.totalQuestions > 0
                ? Math.min(100, (w.answeredCount / w.totalQuestions) * 100)
                : 0),
            0
          ) / workstations.length
        )
      : 100;

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden box-border space-y-10 sm:space-y-12 pb-16">
      {/* =====================================================================
          SECTION 1: 2-COLUMN HERO SECTION (LEFT 58-60% / RIGHT 40-42% NOTICE CENTER)
      ===================================================================== */}
      <section className="relative pt-6 sm:pt-10 px-4 sm:px-6">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* LEFT COLUMN (lg:col-span-7 — ~58%): Eyebrow, Main Title, Description, 2 CTAs, 3 Glass Stat Cards & 4 Highlight Cards */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6 text-left">
            <div className="space-y-5">
              {/* Eyebrow Label */}
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold tracking-widest uppercase text-[#6D28D9] dark:text-violet-400">
                <span>SMARTTEST | GDPT 2018</span>
              </div>

              {/* Main Hero Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-extrabold text-[#172033] dark:text-white tracking-tight leading-[1.15]">
                Nền tảng khảo thí và ôn luyện Vật lí thông minh
              </h1>

              {/* Short Description */}
              <p className="text-base sm:text-lg text-[#64748B] dark:text-slate-300 leading-relaxed max-w-2xl font-normal">
                Giải pháp toàn diện dành cho giáo viên và học sinh THPT, hỗ trợ tổ chức kiểm tra, ôn luyện và đánh giá năng lực theo Chương trình GDPT 2018.
              </p>

              {/* 2 Primary CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateStudent(variants[0]?.code || '101')}
                  className="px-6 py-3.5 rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-sm sm:text-base flex items-center gap-2.5 shadow-md shadow-[#6D28D9]/20 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  <span>Bắt đầu làm bài thi</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTeacher('bank')}
                  className="px-6 py-3.5 rounded-2xl bg-[#18182e] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#6D28D9] text-[#172033] dark:text-slate-100 font-bold text-sm sm:text-base flex items-center gap-2.5 shadow-xs transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-[#6D28D9] dark:text-violet-400 shrink-0" />
                  <span>Truy cập cổng giáo viên</span>
                </button>
              </div>

              {/* 3 Apple-Inspired Glass-Morphism Statistical Cards with Sequential Slide-Up Entrance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                <div
                  style={{ animationDelay: '80ms' }}
                  className="glass-stat-card animate-stat-slide-up-1 rounded-2xl p-4 space-y-1 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="text-xs font-bold text-[#64748B] dark:text-slate-400">
                    Tổng lượt thi
                  </div>
                  <div className="text-2xl sm:text-[26px] font-extrabold font-mono tabular-nums text-[#172033] dark:text-white tracking-tight">
                    {totalExamTurnsCount} lượt
                  </div>
                  <div className="text-[11px] font-medium text-[#6D28D9] dark:text-violet-300">
                    Phòng máy LAN &amp; Trực tuyến
                  </div>
                </div>

                <div
                  style={{ animationDelay: '200ms' }}
                  className="glass-stat-card animate-stat-slide-up-2 rounded-2xl p-4 space-y-1 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="text-xs font-bold text-[#64748B] dark:text-slate-400">
                    Số đề hiện có
                  </div>
                  <div className="text-2xl sm:text-[26px] font-extrabold font-mono tabular-nums text-[#172033] dark:text-white tracking-tight">
                    {availableExamsCount} mã đề
                  </div>
                  <div className="text-[11px] font-medium text-[#6D28D9] dark:text-violet-300 truncate">
                    Mã {variants.map((v) => v.code).join(', ')} ({totalQuestionBankCount} câu)
                  </div>
                </div>

                <div
                  style={{ animationDelay: '320ms' }}
                  className="glass-stat-card animate-stat-slide-up-3 rounded-2xl p-4 space-y-1 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="text-xs font-bold text-[#64748B] dark:text-slate-400">
                    Tỉ lệ hoàn thành
                  </div>
                  <div className="text-2xl sm:text-[26px] font-extrabold font-mono tabular-nums text-[#16A34A] dark:text-emerald-400 tracking-tight">
                    {averageCompletionRate}%
                  </div>
                  <div className="text-[11px] font-medium text-[#16A34A] dark:text-emerald-300">
                    Đồng bộ tiến độ thời gian thực
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Highlight Info Cards Below CTAs (2x2 Balanced Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 space-y-1.5 shadow-xs">
                <div className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#6D28D9] dark:text-violet-400">
                  HẠ TẦNG PHÒNG MÁY
                </div>
                <div className="text-base sm:text-lg font-extrabold text-[#172033] dark:text-white tracking-tight">
                  100% Offline LAN &amp; Cloud
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
                  Vận hành ổn định, tự động lưu đệm và khôi phục phiên thi tức thì.
                </p>
              </div>

              <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 space-y-1.5 shadow-xs">
                <div className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#6D28D9] dark:text-indigo-400">
                  CẤU TRÚC ĐỀ CHUẨN
                </div>
                <div className="text-base sm:text-lg font-extrabold text-[#172033] dark:text-white tracking-tight">
                  28 Câu / 40 Lệnh Hỏi
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
                  18 câu ABCD · 4 câu Đúng/Sai · 6 câu trả lời ngắn chuẩn GDPT 2018.
                </p>
              </div>

              <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 space-y-1.5 shadow-xs">
                <div className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#16A34A] dark:text-emerald-400">
                  CHẾ TÁC CÔNG THỨC
                </div>
                <div className="text-base sm:text-lg font-extrabold text-[#172033] dark:text-white tracking-tight">
                  Bảo Toàn LaTeX Tuyệt Đối
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
                  Hiển thị sắc nét phương trình <MathText text="$x = A\cos(\omega t + \varphi)$" />.
                </p>
              </div>

              <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 space-y-1.5 shadow-xs">
                <div className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#F59E0B] dark:text-amber-400">
                  THANG ĐÁNH GIÁ
                </div>
                <div className="text-base sm:text-lg font-extrabold text-[#172033] dark:text-white tracking-tight">
                  Barem Lũy Tiến Bộ GD&amp;ĐT
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
                  Chấm chuẩn xác 0,10đ · 0,25đ · 0,50đ · 1,00đ theo quy chuẩn.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (lg:col-span-5 — ~42%): Notification Center ("Bảng tin & Nhắc việc") */}
          <div className="lg:col-span-5 w-full flex flex-col">
            <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-start h-full gap-4">
              {/* Notification Center Header */}
              <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-slate-800 pb-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-[#6D28D9]/10 text-[#6D28D9] dark:bg-violet-600/20 dark:text-violet-300 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-extrabold text-[#172033] dark:text-white tracking-tight truncate">
                        Bảng tin &amp; Nhắc việc
                      </h2>
                      <span className="text-xs font-mono font-bold text-[#6D28D9] dark:text-violet-300 shrink-0">
                        ({notices.length})
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                      Thông báo thi · Lịch nộp bài · Nhắc việc chuyên môn
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
                    className="w-9 h-9 rounded-xl bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-300 hover:text-[#6D28D9] flex items-center justify-center transition-colors"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (showQuickAddForm) {
                        setShowQuickAddForm(false);
                        setEditingNoticeId(null);
                        setNewTitle('');
                        setNewContent('');
                      } else {
                        runAdminProtectedAction('Đăng thông báo mới lên Bảng Tin', () => {
                          setEditingNoticeId(null);
                          setNewTitle('');
                          setNewContent('');
                          setShowQuickAddForm(true);
                        });
                      }
                    }}
                    title={
                      showQuickAddForm
                        ? 'Đóng biểu mẫu'
                        : 'Thêm thông báo nhắc việc mới (Yêu cầu mật khẩu Quản trị)'
                    }
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-bold transition-colors ${
                      showQuickAddForm
                        ? 'bg-rose-600 text-white'
                        : 'bg-[#6D28D9] hover:bg-[#5B21B6] text-white'
                    }`}
                  >
                    {showQuickAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {noticePostFeedback && (
                <div className="px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-200 text-xs sm:text-sm flex items-center gap-2 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{noticePostFeedback}</span>
                </div>
              )}

              {/* Add / Edit Notice Form */}
              {showQuickAddForm && (
                <form
                  onSubmit={handlePostNotice}
                  className="p-3.5 rounded-xl bg-slate-950/90 border border-[#E2E8F0] dark:border-violet-700/50 space-y-2.5 shrink-0"
                >
                  <div className="text-xs font-bold text-[#6D28D9] dark:text-violet-300">
                    {editingNoticeId ? 'Chỉnh sửa thông báo' : 'Thêm thông báo & nhắc việc mới'}
                  </div>
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
                      onClick={() => {
                        setShowQuickAddForm(false);
                        setEditingNoticeId(null);
                        setNewTitle('');
                        setNewContent('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:text-white"
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{editingNoticeId ? 'Lưu Thay Đổi' : 'Đăng Tin'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Notice Cards Feed */}
              <div className="space-y-3 overflow-y-auto max-h-[430px] pr-1 flex-1 flex flex-col justify-start">
                {uploadedBannerUrl && (
                  <div className="rounded-2xl overflow-hidden border border-[#E2E8F0]/80 dark:border-violet-700/40 bg-slate-950/70 backdrop-blur-md shrink-0 shadow-xs">
                    <img
                      src={uploadedBannerUrl}
                      alt={uploadedBannerName}
                      referrerPolicy="no-referrer"
                      className="w-full h-28 object-cover"
                    />
                    <div className="px-3 py-1.5 flex items-center justify-between text-xs text-slate-300 bg-slate-900/80 backdrop-blur-md">
                      <span className="truncate font-mono">{uploadedBannerName}</span>
                      <button
                        type="button"
                        onClick={handleClearBanner}
                        className="text-rose-400 hover:text-rose-300 ml-2 shrink-0 font-semibold"
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
                    ? 'notice-card-pinned bg-indigo-950/55 border border-violet-500/60 backdrop-blur-md'
                    : isExamNotice
                    ? 'notice-card-exam bg-indigo-950/40 border border-violet-500/40 backdrop-blur-md'
                    : isDeadlineNotice
                    ? 'notice-card-deadline bg-emerald-950/35 border border-emerald-500/40 backdrop-blur-md'
                    : 'notice-card-reminder bg-amber-950/35 border border-amber-500/40 backdrop-blur-md';

                  const categoryTextClass = isExamNotice
                    ? 'text-violet-300 font-bold'
                    : isDeadlineNotice
                    ? 'text-emerald-300 font-bold'
                    : 'text-amber-300 font-bold';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl space-y-1.5 transition-all duration-200 hover:-translate-y-0.5 ${cardSurfaceClass}`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                          {item.pinned && (
                            <>
                              <span className="font-bold text-[#6D28D9] dark:text-violet-300 whitespace-nowrap">
                                Đã ghim
                              </span>
                              <span aria-hidden="true" className="text-slate-400">
                                ·
                              </span>
                            </>
                          )}
                          <span className={`whitespace-nowrap ${categoryTextClass}`}>
                            {item.category}
                          </span>
                          <span aria-hidden="true" className="text-slate-400">
                            ·
                          </span>
                          <span className="font-mono text-[11px] text-[#64748B] dark:text-slate-300 whitespace-nowrap">
                            {item.timestamp}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePinNotice(item.id)}
                            title={item.pinned ? 'Bỏ ghim thông báo' : 'Ghim thông báo lên đầu'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.pinned
                                ? 'text-[#6D28D9] dark:text-violet-300 bg-violet-500/15'
                                : 'text-slate-400 hover:text-[#6D28D9] dark:hover:text-white'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditNotice(item)}
                            title="Chỉnh sửa thông báo"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#6D28D9] dark:hover:text-white transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNotice(item.id)}
                            title="Xoá thông báo"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm sm:text-[15px] font-extrabold text-[#172033] dark:text-white leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs sm:text-[13px] text-[#64748B] dark:text-slate-200 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  );
                })}

                {sortedNotices.length === 0 && (
                  <div className="p-6 text-center text-sm text-[#64748B] dark:text-slate-400 bg-slate-950/45 backdrop-blur-md rounded-2xl border border-[#E2E8F0]/80 dark:border-slate-800/80">
                    Chưa có thông báo nào. Nhấn nút &ldquo;+&rdquo; ở góc trên để thêm nhắc việc mới.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Soft Horizontal Section Separator */}
      <div aria-hidden="true" className="px-4 sm:px-6">
        <hr className="border-slate-200 dark:border-slate-800 my-8 max-w-[1280px] mx-auto" />
      </div>

      {/* =====================================================================
          SECTION 2: 6 CORE FEATURE CARDS (HỆ SINH THÁI CHỨC NĂNG SMARTTEST)
      ===================================================================== */}
      <section id="features-section" className="px-4 sm:px-6 scroll-mt-24">
        <div className="max-w-[1280px] mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E8F0] dark:border-slate-800 pb-5">
            <div className="space-y-1.5">
              <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#6D28D9] dark:text-violet-400">
                Hệ Sinh Thái Khảo Thí Toàn Diện
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-white tracking-tight">
                Tính năng cốt lõi của SmartTest Physics GDPT 2018
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 font-medium">
              Tối ưu hóa toàn diện cho quy trình ra đề, tổ chức thi và phân tích năng lực Vật lí THPT
            </p>
          </div>

          {/* 6 Uniform Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Trộn đề thông minh */}
            <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs hover:border-[#6D28D9] transition-all">
              <div className="space-y-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#6D28D9]/10 text-[#6D28D9] dark:bg-violet-950/90 dark:text-violet-300 flex items-center justify-center">
                  <Shuffle className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#172033] dark:text-white tracking-tight">
                  Trộn đề thông minh
                </h3>
                <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
                  Tự động hoán vị câu hỏi, đảo phương án A/B/C/D và các mệnh đề Đúng/Sai a, b, c, d theo đúng ma trận đề thi chuẩn GDPT 2018.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-mono text-[#64748B] dark:text-slate-400">
                  {variants.length} mã đề sẵn sàng
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTeacher('scrambler')}
                  className="font-bold text-[#6D28D9] dark:text-violet-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Mở trộn đề</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. Ngân hàng câu hỏi */}
            <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs hover:border-[#6D28D9] transition-all">
              <div className="space-y-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#6D28D9]/10 text-[#6D28D9] dark:bg-violet-950/90 dark:text-violet-300 flex items-center justify-center">
                  <FileJson className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#172033] dark:text-white tracking-tight">
                  Ngân hàng câu hỏi
                </h3>
                <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
                  Lưu trữ và kiểm duyệt đề thi 3 phần với trình hiển thị công thức LaTeX/KaTeX sắc nét, hỗ trợ nạp nhanh cấu trúc đề từ file Word, PDF và JSON.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-mono text-[#64748B] dark:text-slate-400">
                  {totalQuestionBankCount} câu chuẩn hóa
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTeacher('bank')}
                  className="font-bold text-[#6D28D9] dark:text-violet-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Quản lý kho đề</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3. Phòng thi trực tuyến */}
            <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs hover:border-[#6D28D9] transition-all">
              <div className="space-y-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#16A34A]/10 text-[#16A34A] dark:bg-emerald-950/90 dark:text-emerald-300 flex items-center justify-center">
                  <Monitor className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#172033] dark:text-white tracking-tight">
                  Phòng thi trực tuyến
                </h3>
                <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
                  Môi trường thi Kiosk chuyên nghiệp chia đôi màn hình 70/30, khóa toàn màn hình, cảnh báo chuyển tab và tự động lưu đệm bài làm chống mất dữ liệu.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-mono text-[#64748B] dark:text-slate-400">
                  Kiosk &amp; QR Mobile
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateStudent(variants[0]?.code || '101')}
                  className="font-bold text-[#16A34A] dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Vào phòng thi</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 4. Cổng giáo viên */}
            <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs hover:border-[#6D28D9] transition-all">
              <div className="space-y-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#6D28D9]/10 text-[#6D28D9] dark:bg-violet-950/90 dark:text-violet-300 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#172033] dark:text-white tracking-tight">
                  Cổng giáo viên
                </h3>
                <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
                  Thiết lập ca thi trực tuyến hoặc chế độ ôn tập, đính kèm lời giải chi tiết và giám sát trạng thái từng máy trạm trong phòng máy LAN theo thời gian thực.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-mono text-[#64748B] dark:text-slate-400">
                  Giám sát {workstations.length} máy trạm
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTeacher('online_exam')}
                  className="font-bold text-[#6D28D9] dark:text-violet-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Mở cổng giáo viên</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 5. Cổng học sinh */}
            <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs hover:border-[#6D28D9] transition-all">
              <div className="space-y-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#16A34A]/10 text-[#16A34A] dark:bg-emerald-950/90 dark:text-emerald-300 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#172033] dark:text-white tracking-tight">
                  Cổng học sinh
                </h3>
                <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
                  Tra cứu nhanh mã bài thi, quét mã QR vào thi trên điện thoại hoặc máy tính, nhận kết quả chấm điểm thang 10,00 và xem lời giải chi tiết ngay sau khi nộp.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-mono text-[#64748B] dark:text-slate-400">
                  Mã đề {variants[0]?.code || '101'}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateStudent(variants[0]?.code || '101')}
                  className="font-bold text-[#16A34A] dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Bắt đầu làm bài</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 6. Thống kê kết quả */}
            <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xs hover:border-[#6D28D9] transition-all">
              <div className="space-y-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] dark:bg-amber-950/90 dark:text-amber-300 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#172033] dark:text-white tracking-tight">
                  Thống kê kết quả
                </h3>
                <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
                  Tổng hợp bảng điểm theo từng mã đề và lớp học, phân tích tỉ lệ hoàn thành 3 phần thi, hỗ trợ xuất báo cáo điểm và in ấn phiếu điểm chuẩn A4.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-mono text-[#64748B] dark:text-slate-400">
                  Barem Bộ GD&amp;ĐT
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onNavigateStatistics ? onNavigateStatistics() : onNavigateTeacher('monitor')
                  }
                  className="font-bold text-[#F59E0B] dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Xem thống kê</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Soft Horizontal Section Separator */}
      <div aria-hidden="true" className="px-4 sm:px-6">
        <hr className="border-slate-200 dark:border-slate-800 my-8 max-w-[1280px] mx-auto" />
      </div>

      {/* =====================================================================
          SECTION 3: DUAL ROLE DISPATCH CARDS (TEACHER PORTAL & STUDENT KIOSK)
      ===================================================================== */}
      <section className="px-4 sm:px-6">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* CARD 1: TEACHER & DEPARTMENT PORTAL */}
          <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-indigo-800/80 hover:border-[#6D28D9] rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-slate-800 pb-4">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-[#6D28D9] dark:text-violet-400">
                    Dành cho Giáo viên &amp; Tổ Chuyên Môn
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#172033] dark:text-white mt-0.5">
                    Cổng Quản Trị Khảo Thí
                  </h2>
                </div>
                <div className="w-11 h-11 rounded-xl bg-[#6D28D9]/10 text-[#6D28D9] dark:bg-violet-950/90 dark:text-violet-300 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
              </div>

              <p className="text-sm sm:text-base text-[#64748B] dark:text-slate-300 leading-relaxed">
                Quản lý ngân hàng câu hỏi Vật lí 12, nạp đề chuẩn cấu trúc, trộn tự động {variants.length} mã đề hoán vị độc lập và giám sát phòng máy LAN theo thời gian thực.
              </p>

              <ul className="space-y-2.5 text-sm sm:text-base text-[#172033] dark:text-slate-200">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#6D28D9] dark:text-violet-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Ngân hàng {totalQuestionBankCount} câu hỏi gốc:</strong> Kiểm duyệt trực tiếp công thức <MathText text="$x = A\cos(\omega t + \varphi)$" />, <MathText text="$\vec{B}$" />, <MathText text="$p = aT$" />.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#6D28D9] dark:text-violet-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Bộ trộn {variants.length} mã đề ({variants.map((v) => v.code).join(', ')}):</strong> Đảo câu hỏi, đảo đáp án A/B/C/D và hoán vị 4 mệnh đề Đúng/Sai a, b, c, d.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#6D28D9] dark:text-violet-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Giám sát LAN ({workstations.length} máy trạm):</strong> Theo dõi tiến độ làm bài, điểm số và cảnh báo thoát màn hình.
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#E2E8F0] dark:border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTeacher('bank')}
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-[#E2E8F0] dark:border-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  Mở Ngân Hàng Đề
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTeacher('scrambler')}
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-[#E2E8F0] dark:border-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  Mở Trộn 4 Mã Đề
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTeacher('monitor')}
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-[#E2E8F0] dark:border-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  Mở Giám Sát LAN ({workstations.length} máy)
                </button>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTeacher('bank')}
                className="w-full py-3.5 px-5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Truy cập cổng giáo viên</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CARD 2: STUDENT ONLINE EXAM KIOSK */}
          <div className="bg-[#18182e] border border-[#E2E8F0] dark:border-indigo-800/80 hover:border-[#16A34A] rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-slate-800 pb-4">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-[#16A34A] dark:text-emerald-400">
                    Dành cho Thí sinh &amp; Học sinh THPT
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#172033] dark:text-white mt-0.5">
                    Cổng Phòng Thi Trực Tuyến
                  </h2>
                </div>
                <div className="w-11 h-11 rounded-xl bg-[#16A34A]/10 text-[#16A34A] dark:bg-emerald-950/90 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Monitor className="w-5 h-5" />
                </div>
              </div>

              <p className="text-sm sm:text-base text-[#64748B] dark:text-slate-300 leading-relaxed">
                Môi trường làm bài Kiosk chuyên nghiệp: nhập Số báo danh, chọn mã đề thi, tự động khóa toàn màn hình, lưu bài tức thời chống mất dữ liệu khi rớt mạng và chấm điểm ngay khi nộp.
              </p>

              <ul className="space-y-2.5 text-sm sm:text-base text-[#172033] dark:text-slate-200">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A] dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Giao diện chia đôi 70/30 chuẩn phòng máy:</strong> Đề thi KaTeX cỡ chữ lớn rõ nét bên trái, bảng điều hướng 28 câu &amp; đồng hồ 50 phút bên phải.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A] dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Bảo mật Kiosk &amp; Chống mất bài:</strong> Cảnh báo chuyển tab/thoát Fullscreen, tự động lưu LocalStorage sau mỗi thao tác chọn đáp án.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A] dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Chấm điểm lũy tiến Bộ GD&amp;ĐT:</strong> Tự động quy đổi thang điểm 10,00 và hiển thị lời giải Vật lí chi tiết.
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#E2E8F0] dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => onNavigateStudent(variants[0]?.code || '101')}
                className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Bắt đầu làm bài thi</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Soft Horizontal Section Separator */}
      <div aria-hidden="true" className="px-4 sm:px-6">
        <hr className="border-slate-200 dark:border-slate-800 my-8 max-w-[1280px] mx-auto" />
      </div>

      {/* =====================================================================
          SECTION 4: INTERACTIVE LIVE SHOWCASE / MINI-PREVIEW
      ===================================================================== */}
      <section className="px-4 sm:px-6">
        <div className="max-w-[1280px] mx-auto bg-[#18182e] border border-[#E2E8F0] dark:border-indigo-900/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-slate-800 pb-5">
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#6D28D9] dark:text-violet-400">
                Mô Phỏng Trực Quan Ngay Trên Trang Chủ
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#172033] dark:text-white">
                Trải Nghiệm Nhanh Cấu Trúc Đề KaTeX &amp; Phiếu Trả Lời 28 Câu
              </h2>
            </div>

            {/* Interactive Toggle Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl self-start">
              <button
                type="button"
                onClick={() => setShowcaseTab('structure')}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  showcaseTab === 'structure'
                    ? 'bg-[#6D28D9] text-white'
                    : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
                }`}
              >
                Tab 1: Cấu Trúc Đề GDPT 2018 (Live KaTeX)
              </button>
              <button
                type="button"
                onClick={() => setShowcaseTab('palette')}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  showcaseTab === 'palette'
                    ? 'bg-[#6D28D9] text-white'
                    : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
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
              <div className="bg-slate-900/80 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs sm:text-sm font-mono">
                    <span className="text-[#6D28D9] dark:text-violet-400 font-bold whitespace-nowrap">
                      PHẦN I · TRẮC NGHIỆM ABCD
                    </span>
                    <span className="text-[#16A34A] dark:text-emerald-400 font-bold whitespace-nowrap">
                      +0,25 điểm / câu
                    </span>
                  </div>
                  <div className="text-base text-[#172033] dark:text-slate-100 leading-relaxed">
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
                          <span className="font-mono text-xs text-emerald-400 font-bold whitespace-nowrap shrink-0">
                            {idx === 0 ? 'Đúng (+0,25đ)' : 'Sai (0,00đ)'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-[#64748B] dark:text-slate-400 border-t border-[#E2E8F0] dark:border-slate-800 pt-2.5">
                  Nhấn thử các phương án để kiểm tra phản hồi chấm điểm Phần I.
                </div>
              </div>

              {/* Sample Part II */}
              <div className="bg-slate-900/80 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs sm:text-sm font-mono">
                    <span className="text-[#6D28D9] dark:text-violet-400 font-bold whitespace-nowrap">
                      PHẦN II · ĐÚNG / SAI LŨY TIẾN
                    </span>
                    <span className="text-[#16A34A] dark:text-emerald-400 font-bold whitespace-nowrap">
                      Đạt: {demoPart2Earned.toFixed(2)} / 1,00đ
                    </span>
                  </div>
                  <div className="text-base text-[#172033] dark:text-slate-100 leading-relaxed">
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
                <div className="text-xs text-[#64748B] dark:text-slate-400 font-mono border-t border-[#E2E8F0] dark:border-slate-800 pt-2.5">
                  Đang đúng {demoPart2CorrectCount}/4 ý → Barem Bộ GD&amp;ĐT:{' '}
                  <strong className="text-[#16A34A] dark:text-emerald-400 whitespace-nowrap">
                    {demoPart2Earned.toFixed(2)} điểm
                  </strong>
                </div>
              </div>

              {/* Sample Part III */}
              <div className="bg-slate-900/80 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs sm:text-sm font-mono">
                    <span className="text-[#6D28D9] dark:text-violet-400 font-bold whitespace-nowrap">
                      PHẦN III · TRẢ LỜI NGẮN
                    </span>
                    <span className="text-[#16A34A] dark:text-emerald-400 font-bold whitespace-nowrap">
                      +0,25 điểm / câu
                    </span>
                  </div>
                  <div className="text-base text-[#172033] dark:text-slate-100 leading-relaxed">
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

                <div className="text-xs text-[#64748B] dark:text-slate-400 border-t border-[#E2E8F0] dark:border-slate-800 pt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span>Tự động chuẩn hóa khoảng trắng &amp; dấu thập phân.</span>
                  <button
                    type="button"
                    onClick={() => onNavigateStudent('101')}
                    className="text-[#6D28D9] dark:text-violet-400 font-bold hover:underline whitespace-nowrap shrink-0"
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
                  <span className="text-[#172033] dark:text-slate-300">
                    Nhấn vào bất kỳ ô số nào từ <strong>Câu 1 đến Câu 28</strong> để đổi trạng thái:
                  </span>
                  <div className="flex items-center gap-3 font-bold">
                    <span className="text-[#6D28D9] dark:text-violet-400">
                      Đã làm: {paletteCounts.completed}
                    </span>
                    <span className="text-[#F59E0B] dark:text-amber-400">
                      Xem lại: {paletteCounts.flagged}
                    </span>
                    <span className="text-[#64748B] dark:text-slate-400">
                      Chưa làm: {paletteCounts.unanswered}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2.5 p-4 rounded-xl bg-slate-900/90 border border-[#E2E8F0] dark:border-slate-800">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((qNum) => {
                    const st = demoPaletteState[qNum] || 'unanswered';
                    return (
                      <button
                        key={qNum}
                        type="button"
                        onClick={() => cyclePaletteQuestionState(qNum)}
                        className={`h-11 sm:h-12 rounded-lg font-mono text-base font-bold tabular-nums transition-all border ${
                          st === 'completed'
                            ? 'bg-[#6D28D9] border-violet-400 text-white'
                            : st === 'flagged'
                            ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-200'
                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                        } ${selectedPaletteQuestion === qNum ? 'ring-2 ring-violet-400' : ''}`}
                      >
                        {qNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 bg-slate-900/90 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4">
                <div className="text-xs sm:text-sm font-mono font-bold text-[#6D28D9] dark:text-violet-400">
                  THÔNG TIN Ô CÂU HỎI ĐANG CHỌN: CÂU {selectedPaletteQuestion}
                </div>
                <h3 className="text-lg font-extrabold text-[#172033] dark:text-white">
                  {selectedPaletteQuestion <= 18
                    ? `Phần I · Câu ${selectedPaletteQuestion} (Trắc nghiệm 4 lựa chọn A, B, C, D)`
                    : selectedPaletteQuestion <= 22
                    ? `Phần II · Câu ${selectedPaletteQuestion - 18} (Trắc nghiệm Đúng/Sai 4 ý a, b, c, d)`
                    : `Phần III · Câu ${selectedPaletteQuestion - 22} (Trắc nghiệm trả lời ngắn điền số)`}
                </h3>
                <p className="text-sm sm:text-base text-[#64748B] dark:text-slate-300 leading-relaxed">
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

      {/* Soft Horizontal Section Separator */}
      <div aria-hidden="true" className="px-4 sm:px-6">
        <hr className="border-slate-200 dark:border-slate-800 my-8 max-w-[1280px] mx-auto" />
      </div>

      {/* =====================================================================
          SECTION 5: SYSTEM ADMINISTRATION & CACHE CREDITS BAR
      ===================================================================== */}
      <section className="px-4 sm:px-6">
        <div className="max-w-[1280px] mx-auto bg-[#18182e] border border-[#E2E8F0] dark:border-slate-800/90 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="text-xs sm:text-sm font-mono font-bold text-[#6D28D9] dark:text-violet-400">
              HỆ THỐNG KHẢO THÍ SMARTTEST PHYSICS · PHIÊN BẢN v2.6 GDPT 2018
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
              Tất cả dữ liệu ngân hàng đề, {variants.length} mã đề trộn và trạng thái phòng máy LAN được giữ nguyên xuyên suốt khi chuyển đổi giữa Trang chủ, Cổng giáo viên và Cổng học sinh.
            </p>
            {cacheClearedNotice && (
              <p className="text-xs sm:text-sm text-[#16A34A] dark:text-emerald-400 font-mono font-bold pt-1">
                ✓ {cacheClearedNotice}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleClearCacheClick}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/80 text-slate-200 hover:text-rose-200 border border-[#E2E8F0] dark:border-slate-700 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Xoá Bộ Nhớ Đệm Phiên Thi (Reset Cache)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Soft Horizontal Section Separator before Footer */}
      <div aria-hidden="true" className="px-4 sm:px-6">
        <hr className="border-slate-200 dark:border-slate-800 my-8 max-w-[1280px] mx-auto" />
      </div>

      {/* Apple-Inspired Glass-Morphism 'Back to Top' Floating Action Button (Visible after > 300px scroll) */}
      {showBackToTop && (
        <button
          type="button"
          onClick={handleBackToTop}
          title="Back to Top — Lên đầu trang"
          aria-label="Back to Top — Cuộn lên đầu trang"
          className="glass-stat-card animate-fab-fade-in group fixed bottom-6 right-6 z-40 inline-flex items-center justify-center gap-2.5 pl-2.5 pr-4 py-2.5 rounded-full text-xs sm:text-sm font-bold text-[#172033] dark:text-white hover:text-[#6D28D9] dark:hover:text-violet-300 hover:border-[#6D28D9] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 ease-out cursor-pointer shadow-lg no-print"
        >
          <span className="w-7 h-7 rounded-full bg-[#6D28D9]/12 dark:bg-violet-500/20 flex items-center justify-center text-[#6D28D9] dark:text-violet-300 group-hover:bg-[#6D28D9] group-hover:text-white transition-colors duration-200 shrink-0">
            <ArrowUp className="w-4 h-4 shrink-0" />
          </span>
          <span className="tracking-tight whitespace-nowrap">Lên đầu trang</span>
        </button>
      )}
    </div>
  );
};
