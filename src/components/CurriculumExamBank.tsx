import React, { useState, useMemo } from 'react';
import {
  GraduationCap, Filter, Search, X, RotateCcw,
  Sparkles, Check, Eye, Plus, Send, Copy,
  Printer, Play, CheckCircle2, AlertCircle, BookOpen,
  FolderTree, Share2, Layers, Tag, ExternalLink, Calendar, Users,
  Edit3, Trash2, Download, BookmarkCheck
} from 'lucide-react';
import { Exam, AntiCheatConfig } from '../types/exam';
import {
  CurriculumChapter, CurriculumLesson, ExamPackage,
  GradeLevel, ExamCategory, ExamAssignmentInfo
} from '../types/curriculum';
import { CURRICULUM_CHAPTERS } from '../data/curriculumData';
import { AssignExamModal } from './AssignExamModal';
import { UploadLessonExamModal } from './UploadLessonExamModal';

interface CurriculumExamBankProps {
  currentExam: Exam;
  packages: ExamPackage[];
  assignments: ExamAssignmentInfo[];
  onSelectPackage: (pkg: ExamPackage) => void;
  onSavePackage: (pkg: ExamPackage) => void;
  onDeletePackage?: (pkgId: string) => void;
  onOpenInEditor?: (pkg: ExamPackage) => void;
  onAssignExam: (pkg: ExamPackage, assignment: ExamAssignmentInfo, switchToStudent: boolean) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onPreviewAsStudent: () => void;
  onOpenPrint: (mode: 'exam_only' | 'exam_with_solutions') => void;
  antiCheatConfig: AntiCheatConfig;
  showToast: (msg: string) => void;
  initialTab?: 'bank' | 'assigned';
  onOpenSaveCurrentExamModal?: () => void;
}

export const CurriculumExamBank: React.FC<CurriculumExamBankProps> = ({
  currentExam,
  packages,
  assignments,
  onSelectPackage,
  onSavePackage,
  onDeletePackage,
  onOpenInEditor,
  onAssignExam,
  onDeleteAssignment,
  onPreviewAsStudent,
  onOpenPrint,
  antiCheatConfig,
  showToast,
  initialTab = 'bank',
  onOpenSaveCurrentExamModal,
}) => {
  const [activeTab, setActiveTab] = useState<'bank' | 'assigned'>(initialTab);
  const [deletingPackage, setDeletingPackage] = useState<ExamPackage | null>(null);

  // Tải tệp JSON của đề thi về máy tính (Single-click backup download)
  const handleDownloadExamJson = (pkg: ExamPackage) => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pkg.examData, null, 2));
      const downloadAnchor = document.createElement('a');
      const safeTitle = (pkg.code ? `${pkg.code}_` : '') + pkg.title.toLowerCase().replace(/[^a-z0-9à-ỹ]/gi, '_');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${safeTitle}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`Đã tải tệp JSON của đề thi "${pkg.title}" về máy thành công!`);
    } catch (e) {
      showToast('Lỗi khi tải tệp JSON về máy tính.');
    }
  };

  // BỘ LỌC ĐA TẦNG CHO NGÂN HÀNG ĐỀ THI
  const [filterGrade, setFilterGrade] = useState<GradeLevel | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ExamCategory | 'all'>('all');
  const [filterChapterId, setFilterChapterId] = useState<string>('all');
  const [filterLessonId, setFilterLessonId] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Hộp thoại Giao đề thi & Tải lên đề mới
  const [assigningPackage, setAssigningPackage] = useState<ExamPackage | null>(null);
  const [uploadAnchor, setUploadAnchor] = useState<{
    grade: GradeLevel;
    chapter: CurriculumChapter | null;
    lesson: CurriculumLesson | null;
  } | null>(null);

  // Thống kê tổng quan ngân hàng đề thi GDPT 2018
  const stats = useMemo(() => {
    const total = packages.length;
    const g10 = packages.filter((p) => p.grade === 10).length;
    const g11 = packages.filter((p) => p.grade === 11).length;
    const g12 = packages.filter((p) => p.grade === 12).length;
    const withSvg = packages.filter((p) => p.svgCount > 0).length;
    const assignedCount = assignments.length;
    return { total, g10, g11, g12, withSvg, assignedCount };
  }, [packages, assignments]);

  // Danh sách Chương khả dụng theo Khối lớp đang chọn
  const availableChapters = useMemo(() => {
    if (filterGrade === 'all') return CURRICULUM_CHAPTERS;
    return CURRICULUM_CHAPTERS.filter((c) => c.grade === filterGrade);
  }, [filterGrade]);

  // Danh sách Bài học khả dụng theo Chương đang chọn
  const availableLessons = useMemo(() => {
    if (filterChapterId === 'all') {
      return availableChapters.flatMap((c) => c.lessons);
    }
    const currentChap = availableChapters.find((c) => c.id === filterChapterId);
    return currentChap ? currentChap.lessons : [];
  }, [availableChapters, filterChapterId]);

  // Danh sách Gói đề thi sau khi áp dụng bộ lọc đa tầng
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (filterGrade !== 'all' && pkg.grade !== filterGrade) {
        return false;
      }
      if (filterCategory !== 'all' && pkg.category !== filterCategory) {
        return false;
      }
      if (filterChapterId !== 'all' && pkg.chapterId !== filterChapterId) {
        return false;
      }
      if (filterLessonId !== 'all' && pkg.lessonId !== filterLessonId) {
        return false;
      }
      if (filterSearch.trim().length > 0) {
        const q = filterSearch.toLowerCase().trim();
        const matchTitle = pkg.title.toLowerCase().includes(q);
        const matchSubtitle = (pkg.subtitle || '').toLowerCase().includes(q);
        const matchCode = pkg.code.toLowerCase().includes(q);
        const matchChap = pkg.chapterTitle.toLowerCase().includes(q);
        const matchLesson = (pkg.lessonTitle || '').toLowerCase().includes(q);
        const matchTags = pkg.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchSubtitle && !matchCode && !matchChap && !matchLesson && !matchTags) {
          return false;
        }
      }
      return true;
    });
  }, [packages, filterGrade, filterCategory, filterChapterId, filterLessonId, filterSearch]);

  const handleResetFilters = () => {
    setFilterGrade('all');
    setFilterCategory('all');
    setFilterChapterId('all');
    setFilterLessonId('all');
    setFilterSearch('');
  };

  return (
    <div className="space-y-5">

      {/* THANH TAB PHỤ: NGÂN HÀNG ĐỀ THI vs BÀI THI ĐÃ GIAO */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${activeTab === 'bank'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
              }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Ngân hàng đề thi GDPT 2018</span>
            <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${activeTab === 'bank' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
              {filteredPackages.length}/{packages.length} đề
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assigned')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${activeTab === 'assigned'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
              }`}
          >
            <Send className="w-4 h-4" />
            <span>Bài thi đã giao cho học sinh</span>
            <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${activeTab === 'assigned' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
              {assignments.length} bài
            </span>
          </button>
        </div>

        {/* Nút hành động nhanh trên thanh sub-bar */}
        <div className="flex items-center gap-2">
          {onOpenSaveCurrentExamModal && (
            <button
              type="button"
              onClick={onOpenSaveCurrentExamModal}
              className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              title="Lưu đề thi đang mở vào Ngân hàng dữ liệu"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>💾 Lưu đề hiện tại vào Ngân hàng</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const targetGrade = filterGrade === 'all' ? 12 : filterGrade;
              const currentChap = availableChapters.find((c) => c.id === filterChapterId) || availableChapters[0] || null;
              const currentLes = availableLessons.find((l) => l.id === filterLessonId) || null;
              setUploadAnchor({
                grade: targetGrade,
                chapter: currentChap,
                lesson: currentLes,
              });
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tải đề mới cho bài này</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: NGÂN HÀNG ĐỀ THI THEO CÂY PHÂN PHỐI CHƯƠNG TRÌNH                  */}
      {/* ========================================================================= */}
      {activeTab === 'bank' && (
        <div className="space-y-5">

          {/* THANH CÔNG CỤ BỘ LỌC ĐA TẦNG (MULTI-LEVEL FILTER TOOLBAR) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">

            {/* TẦNG 1: LỌC KHỐI LỚP */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Khối lớp (GDPT 2018 - Kết nối tri thức):
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterGrade('all');
                    setFilterChapterId('all');
                    setFilterLessonId('all');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${filterGrade === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  <span>Tất cả</span>
                  <span className="opacity-75">({stats.total})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterGrade(10);
                    setFilterChapterId('all');
                    setFilterLessonId('all');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${filterGrade === 10
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                    }`}
                >
                  <span>Khối 10</span>
                  <span className="opacity-80">({stats.g10})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterGrade(11);
                    setFilterChapterId('all');
                    setFilterLessonId('all');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${filterGrade === 11
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
                    }`}
                >
                  <span>Khối 11</span>
                  <span className="opacity-80">({stats.g11})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterGrade(12);
                    setFilterChapterId('all');
                    setFilterLessonId('all');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${filterGrade === 12
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                    }`}
                >
                  <span>Khối 12 (Trọng tâm)</span>
                  <span className="opacity-80">({stats.g12})</span>
                </button>
              </div>
            </div>

            {/* TẦNG 2: LOẠI ĐỀ THI & MỐC ĐÁNH GIÁ ĐỊNH KỲ */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                Loại đề thi:
              </span>

              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'lesson', label: 'Luyện tập theo Bài' },
                { id: 'chapter', label: 'Đánh giá theo Chương' },
                { id: 'midterm1', label: 'Giữa HK I (GHK1)' },
                { id: 'final1', label: 'Cuối HK I (CHK1)' },
                { id: 'midterm2', label: 'Giữa HK II (GHK2)' },
                { id: 'final2', label: 'Cuối HK II (CHK2)' },
                { id: 'survey', label: 'Khảo sát / Thi thử TN' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilterCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${filterCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* TẦNG 3 & 4: DROPDOWNS ĐỘNG THEO CHƯƠNG & BÀI HỌC + TÌM KIẾM */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">

              {/* Dropdown Chương / Chủ đề */}
              <div className="md:col-span-4 space-y-1">
                <label className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                  Chương / Chủ đề:
                </label>
                <select
                  value={filterChapterId}
                  onChange={(e) => {
                    setFilterChapterId(e.target.value);
                    setFilterLessonId('all');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:bg-white focus:border-indigo-500 outline-none transition cursor-pointer"
                >
                  <option value="all">Tất cả các chương</option>
                  {availableChapters.map((chap) => (
                    <option key={chap.id} value={chap.id}>
                      Lớp {chap.grade} • {(chap as any).chapterNumber ? `${(chap as any).chapterNumber}: ` : ''}{chap.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown Bài học cụ thể */}
              <div className="md:col-span-4 space-y-1">
                <label className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                  Bài học cụ thể:
                </label>
                <select
                  value={filterLessonId}
                  onChange={(e) => setFilterLessonId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:bg-white focus:border-indigo-500 outline-none transition cursor-pointer"
                >
                  <option value="all">Tất cả các bài học trong chương</option>
                  {availableLessons.map((les) => (
                    <option key={les.id} value={les.id}>
                      {les.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thanh tìm kiếm từ khóa */}
              <div className="md:col-span-4 space-y-1">
                <label className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                  Tìm kiếm từ khóa / Chủ đề:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Tìm kiếm: Boyle, Sóng dừng, Hạt nhân..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition"
                  />
                  {filterSearch && (
                    <button
                      type="button"
                      onClick={() => setFilterSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* GỢI Ý TỪ KHÓA TÌM KIẾM NHANH */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-2xs font-bold text-slate-400">Gợi ý từ khóa:</span>
                {['Boyle', 'Sóng dừng', 'Hạt nhân', 'Newton', 'Nhiệt học', 'Đồ thị SVG'].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setFilterSearch(kw)}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xs font-semibold transition cursor-pointer"
                  >
                    #{kw}
                  </button>
                ))}
              </div>

              {(filterGrade !== 'all' || filterCategory !== 'all' || filterChapterId !== 'all' || filterLessonId !== 'all' || filterSearch) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa toàn bộ bộ lọc</span>
                </button>
              )}
            </div>

          </div>

          {/* THANH ĐẾM KẾT QUẢ */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                Tìm thấy <strong className="text-indigo-600 font-black">{filteredPackages.length}</strong> gói đề thi chuẩn hóa GDPT 2018
              </span>
              {filterGrade !== 'all' && (
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-indigo-100 text-indigo-800">
                  Khối {filterGrade}
                </span>
              )}
            </div>

            <div className="text-3xs text-slate-500 hidden sm:block">
              Chương trình GDPT 2018 - SGK Kết nối tri thức với cuộc sống
            </div>
          </div>

          {/* LƯỚI DANH SÁCH ĐỀ THI (EXAM BANK GRID) */}
          {filteredPackages.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 space-y-3">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="font-bold text-slate-800 text-base">Không tìm thấy gói đề thi phù hợp</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Không có đề thi nào thỏa mãn đồng thời các tiêu chí lọc. Bạn có thể xóa bớt điều kiện lọc hoặc bấm nút "Tải đề mới cho bài này" để nạp thêm.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại bộ lọc</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {filteredPackages.map((pkg) => {
                const isCurrentlyActive = Boolean(
                  currentExam && pkg && (
                    (currentExam.code && pkg.code && currentExam.code === pkg.code) ||
                    (currentExam.id && pkg.examData?.id && currentExam.id === pkg.examData.id) ||
                    (currentExam.code && pkg.examData?.code && currentExam.code === pkg.examData.code)
                  )
                );
                const gradeColor = pkg.grade === 12
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : pkg.grade === 11
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-teal-50 text-teal-700 border-teal-200';

                const assignedInfo = assignments.find((a) => a.examId === pkg.id || a.examTitle === pkg.title);

                const p1Count = pkg.examData.questions.filter((q) => q.part === 'Phần I').length;
                const p2Count = pkg.examData.questions.filter((q) => q.part === 'Phần II').length;
                const p3Count = pkg.examData.questions.filter((q) => q.part === 'Phần III').length;

                return (
                  <div
                    key={pkg.id}
                    className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${isCurrentlyActive
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    {/* Header Thẻ Đề Thi */}
                    <div className="p-5 pb-4 space-y-3">

                      {/* Badges Phân loại */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-lg text-2xs font-black border ${gradeColor}`}>
                            Khối {pkg.grade}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg text-2xs font-bold bg-slate-100 text-slate-700">
                            {pkg.categoryLabel}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg text-2xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Mã {pkg.code}
                          </span>
                        </div>

                        {isCurrentlyActive && (
                          <span className="px-2.5 py-1 rounded-full text-2xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 animate-pulse">
                            <Check className="w-3 h-3 text-emerald-700" />
                            Đang nạp làm đề chính
                          </span>
                        )}
                      </div>

                      {/* Vị trí trong Cây Chương trình GDPT 2018 */}
                      <div className="text-2xs font-bold text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-700">{pkg.chapterTitle}</span>
                        {pkg.lessonTitle && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-600 font-semibold">{pkg.lessonTitle}</span>
                          </>
                        )}
                      </div>

                      {/* Tiêu đề & Mô tả đề thi */}
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-snug">
                          {pkg.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {pkg.subtitle}
                        </p>
                      </div>

                      {/* Cấu trúc định dạng chuẩn của Bộ GD&ĐT */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-2xs font-bold text-slate-700">
                          <span>Cấu trúc đề chuẩn 2025:</span>
                          <span className="text-indigo-600 font-black">
                            {pkg.durationMinutes} phút • Thang {pkg.totalPoints}đ
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-3xs text-slate-600 font-medium">
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">
                            Phần I: <strong>{p1Count} câu TN</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">
                            Phần II: <strong>{p2Count} câu Đúng/Sai</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">
                            Phần III: <strong>{p3Count} câu Trả lời ngắn</strong>
                          </span>
                        </div>
                      </div>

                      {/* Chỉ số đồ thị SVG & Công thức KaTeX */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="px-2.5 py-1 rounded-xl text-3xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                          <span>∑ KaTeX ({pkg.katexCount || 10} công thức)</span>
                        </span>
                        {pkg.svgCount > 0 ? (
                          <span className="px-2.5 py-1 rounded-xl text-3xs font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>⚡ {pkg.svgCount} sơ đồ SVG</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-3xs text-slate-400 bg-slate-100">
                            Không có hình vẽ
                          </span>
                        )}
                        <span className="px-2 py-1 rounded-xl text-3xs font-semibold bg-slate-100 text-slate-600">
                          Mức độ: <strong>{pkg.difficulty}</strong>
                        </span>
                      </div>

                      {/* Trạng thái đã giao bài thi cho học sinh */}
                      {assignedInfo && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-300 text-2xs text-emerald-900 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Đã giao cho: Lớp {assignedInfo.className} (Mã: {assignedInfo.accessCode})</span>
                          </div>
                          <span className="text-3xs text-emerald-700">
                            Hạn: {assignedInfo.deadline}
                          </span>
                        </div>
                      )}

                    </div>

                    {/* THANH HÀNH ĐỘNG CỦA THẺ (4 HÀNH ĐỘNG CHÍNH THEO YÊU CẦU + GIAO ĐỀ) */}
                    <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* 1. Tải đề này làm bài thi hiện tại */}
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPackage(pkg);
                            showToast(`Đã nạp đề thi [Mã: ${pkg.code}] "${pkg.title}" làm đề kiểm tra hiện tại!`);
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${isCurrentlyActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                            }`}
                          title="Nạp đề này vào phiên làm bài thi hiện tại và thiết lập lại đồng hồ đếm ngược"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{isCurrentlyActive ? 'Đang là đề hiện tại' : '📖 Tải đề này làm bài thi hiện tại'}</span>
                        </button>

                        {/* 2. Mở trong bộ soạn thảo */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenInEditor) {
                              onOpenInEditor(pkg);
                            } else {
                              onSelectPackage(pkg);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                          title="Mở đề thi này trong bộ soạn thảo để chỉnh sửa câu hỏi, sơ đồ hoặc công thức"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>✏️ Mở trong bộ soạn thảo</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        {/* 3. Tải tệp JSON về máy */}
                        <button
                          type="button"
                          onClick={() => handleDownloadExamJson(pkg)}
                          className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          title="Tải tệp JSON đề thi về máy tính (Sao lưu offline)"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          <span className="hidden sm:inline">📤 Tải JSON</span>
                        </button>

                        {/* 4. Xóa khỏi ngân hàng */}
                        <button
                          type="button"
                          onClick={() => setDeletingPackage(pkg)}
                          className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          title="Xóa đề thi này khỏi Ngân hàng đề thi GDPT 2018"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span className="hidden sm:inline">🗑️ Xóa</span>
                        </button>

                        {/* 5. Giao cho học sinh */}
                        <button
                          type="button"
                          onClick={() => setAssigningPackage(pkg)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                          title="Tạo link làm bài trực tiếp cho học sinh (không cần đăng nhập, không lỗi cookie) và xuất mã QR"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Giao đề (Link & QR)</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: QUẢN LÝ BÀI THI ĐÃ GIAO CHO HỌC SINH                              */}
      {/* ========================================================================= */}
      {activeTab === 'assigned' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Danh sách các bài thi đang mở cho học sinh
              </h3>
              <p className="text-xs text-slate-500">
                Theo dõi mã truy cập (Access Code), lớp học được giao và thiết lập giám sát gian lận
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Giao bài thi mới từ Ngân hàng</span>
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 space-y-3">
              <Send className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="font-bold text-slate-800 text-base">Chưa có bài thi nào được giao</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hãy chuyển sang tab "Ngân hàng đề thi GDPT 2018", chọn một đề thi và bấm nút "Giao cho học sinh" để phát hành mã thi cho các lớp.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('bank')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Mở Ngân hàng đề thi</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((assign) => (
                <div
                  key={assign.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-2xs font-black bg-indigo-100 text-indigo-800">
                          Lớp {assign.className}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-2xs font-semibold bg-emerald-100 text-emerald-800">
                          Đang hoạt động
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 leading-snug">
                        {assign.examTitle}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteAssignment(assign.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Hủy giao bài thi này"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Mã bài thi */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-3xs font-bold text-slate-500 uppercase">Mã bài thi (Access Code):</div>
                      <div className="font-mono font-black text-base text-indigo-700 tracking-wider">
                        {assign.accessCode}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(assign.accessCode);
                        showToast(`Đã sao chép mã thi: ${assign.accessCode}`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Chép mã</span>
                    </button>
                  </div>

                  {/* Thông tin thời hạn & Giám sát */}
                  <div className="text-2xs text-slate-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Thời hạn nộp:</span>
                      <strong className="text-slate-800">{assign.deadline}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Giám sát chống gian lận:</span>
                      <strong className={assign.antiCheatEnabled ? 'text-emerald-600' : 'text-slate-500'}>
                        {assign.antiCheatEnabled ? `BẬT (Tối đa ${assign.maxViolations} lần vi phạm)` : 'TẮT'}
                      </strong>
                    </div>
                  </div>

                  {/* Thao tác */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetPkg = packages.find((p) => p.id === assign.examId || p.title === assign.examTitle);
                        if (targetPkg) {
                          onSelectPackage(targetPkg);
                        }
                        onPreviewAsStudent();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Làm thử bài này</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPrint('exam_only')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>In đề này</span>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}
      {/* HỘP THOẠI GIAO ĐỀ THI CHO HỌC SINH */}
      {assigningPackage && (
        <AssignExamModal
          isOpen={true}
          onClose={() => setAssigningPackage(null)}
          examPackage={assigningPackage}
          currentExam={currentExam}
          onAssign={(pkg, assignment, switchToStudent) => {
            onAssignExam(pkg, assignment, switchToStudent);
            setAssigningPackage(null);
          }}
        />
      )}
      {/* HỘP THOẠI TẢI LÊN ĐỀ THI THEO BÀI */}
      {uploadAnchor && (
        <UploadLessonExamModal
          isOpen={true}
          onClose={() => setUploadAnchor(null)}
          targetGrade={uploadAnchor.grade}
          targetChapter={uploadAnchor.chapter}
          targetLesson={uploadAnchor.lesson}
          onSavePackage={(newPkg) => {
            onSavePackage(newPkg);
            setUploadAnchor(null);
          }}
        />
      )}

      {/* HỘP THOẠI XÁC NHẬN XÓA ĐỀ THI KHỎI NGÂN HÀNG */}
      {deletingPackage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Xác nhận xóa đề thi khỏi Ngân hàng
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Bạn có chắc chắn muốn xóa đề thi <strong>"{deletingPackage.title}"</strong> (Mã: {deletingPackage.code}) khỏi Ngân hàng đề thi không? Hành động này sẽ cập nhật dữ liệu lưu trữ cục bộ (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">physixam_bank_data</code>) và không thể hoàn tác.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPackage(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const pkgToDelete = deletingPackage;
                  setDeletingPackage(null);
                  if (onDeletePackage) {
                    onDeletePackage(pkgToDelete.id);
                  }
                  showToast(`Đã xóa đề thi "${pkgToDelete.title}" khỏi Ngân hàng đề thành công!`);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition shadow-xs cursor-pointer"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
