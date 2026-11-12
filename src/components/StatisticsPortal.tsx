import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  ExamData,
  ExamGradeReport,
  SavedExamSession,
  ScrambledExamVariant,
  WorkstationNode,
} from '../types/exam';
import { countCompletedQuestions, gradeStudentExam } from '../utils/scramblerAndGrader';
import { toCleanSlug } from '../utils/exportPackageGenerator';
import { MathText } from './MathText';

interface StatisticsPortalProps {
  examData: ExamData;
  variants: ScrambledExamVariant[];
  workstations: WorkstationNode[];
  liveSessions: SavedExamSession[];
  onDeleteStudentRecord: (studentId: string, examCode: string, workstationId?: string) => void;
  onClearAllRecords: () => void;
  onRestoreSampleRecords: () => void;
}

export interface UnifiedStudentResultRow {
  key: string;
  studentId: string;
  studentName: string;
  workstationId: string;
  examCode: string;
  status: 'SUBMITTED' | 'ACTIVE' | 'VIOLATION_WARN' | 'DISCONNECTED';
  answeredCount: number;
  totalQuestions: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  startedAtText: string;
  submittedAtText: string;
  part1Score: number;
  part2Score: number;
  part3Score: number;
  totalScore: number | undefined;
  academicRank: string;
  violationCount: number;
  lastEventText: string;
  sessionData?: SavedExamSession;
  gradeReport?: ExamGradeReport;
  isLiveBrowserUser?: boolean;
}

function getAcademicRank(score: number | undefined): string {
  if (score === undefined || Number.isNaN(score)) return 'Đang làm bài';
  if (score >= 9.0) return 'Xuất sắc';
  if (score >= 8.0) return 'Giỏi';
  if (score >= 6.5) return 'Khá';
  if (score >= 5.0) return 'Đạt';
  return 'Chưa đạt';
}

function formatDurationMinSec(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}p ${String(secs).padStart(2, '0')}s`;
}

export const StatisticsPortal: React.FC<StatisticsPortalProps> = ({
  examData,
  variants,
  workstations,
  liveSessions,
  onDeleteStudentRecord,
  onClearAllRecords,
  onRestoreSampleRecords,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'ACTIVE' | 'VIOLATION'>('ALL');
  const [codeFilter, setCodeFilter] = useState<string>('ALL');
  const [inspectingRow, setInspectingRow] = useState<UnifiedStudentResultRow | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const examDurationSeconds = (examData.durationMinutes || 50) * 60;

  // Build unified student rows from live browser sessions + LAN workstations
  const studentRows = useMemo<UnifiedStudentResultRow[]>(() => {
    const map = new Map<string, UnifiedStudentResultRow>();

    // 1. Process live browser sessions (with full question-by-question answer state)
    liveSessions.forEach((session) => {
      const variant =
        variants.find((v) => v.code === session.examCode) || variants[0];
      const report = variant ? gradeStudentExam(variant, session.answers) : undefined;
      const answered = variant
        ? countCompletedQuestions(variant, session.answers)
        : report?.answeredCount || 0;
      const totalQ = variant
        ? variant.part1.length + variant.part2.length + variant.part3.length
        : 28;
      const elapsed = Math.max(0, examDurationSeconds - session.remainingSeconds);
      const finalScore = session.isSubmitted
        ? session.finalScore ?? report?.scaled10Score ?? 0
        : report?.scaled10Score;

      const rowKey = `${session.studentId.trim().toUpperCase()}_${session.examCode.trim()}`;
      let startFormatted = session.startedAt;
      try {
        startFormatted = new Date(session.startedAt).toLocaleTimeString('vi-VN');
      } catch {
        // Keep raw string
      }

      map.set(rowKey, {
        key: rowKey,
        studentId: session.studentId,
        studentName: session.studentName,
        workstationId: 'MAY-01 (Trực tuyến)',
        examCode: session.examCode,
        status: session.isSubmitted
          ? 'SUBMITTED'
          : session.violations.length > 0
          ? 'VIOLATION_WARN'
          : 'ACTIVE',
        answeredCount: answered,
        totalQuestions: totalQ,
        remainingSeconds: session.remainingSeconds,
        elapsedSeconds: elapsed,
        startedAtText: startFormatted || '08:00:00',
        submittedAtText: session.submittedAt || session.lastSavedAt || '—',
        part1Score: report ? report.part1Score : Number(((finalScore || 0) * 0.45).toFixed(2)),
        part2Score: report ? report.part2Score : Number(((finalScore || 0) * 0.4).toFixed(2)),
        part3Score: report ? report.part3Score : Number(((finalScore || 0) * 0.15).toFixed(2)),
        totalScore: finalScore,
        academicRank: session.isSubmitted ? getAcademicRank(finalScore) : 'Đang làm bài',
        violationCount: session.violations.length,
        lastEventText: session.isSubmitted
          ? `Đã nộp bài lúc ${session.submittedAt || session.lastSavedAt}`
          : session.violations.length > 0
          ? session.violations[session.violations.length - 1].description
          : `Lưu lần cuối lúc ${session.lastSavedAt}`,
        sessionData: session,
        gradeReport: report,
        isLiveBrowserUser: true,
      });
    });

    // 2. Process LAN workstation records (if not already overridden by live session)
    workstations.forEach((ws) => {
      const rowKey = `${ws.studentId.trim().toUpperCase()}_${ws.examCode.trim()}`;
      if (map.has(rowKey)) return;

      const elapsed = Math.max(60, examDurationSeconds - ws.remainingSeconds);
      const totalScore = ws.score;
      const p1 =
        totalScore !== undefined ? Number(Math.min(4.5, totalScore * 0.48).toFixed(2)) : 0;
      const p2 =
        totalScore !== undefined ? Number(Math.min(4.0, totalScore * 0.37).toFixed(2)) : 0;
      const p3 =
        totalScore !== undefined
          ? Number(Math.max(0, totalScore - p1 - p2).toFixed(2))
          : 0;

      map.set(rowKey, {
        key: rowKey,
        studentId: ws.studentId,
        studentName: ws.studentName,
        workstationId: ws.workstationId,
        examCode: ws.examCode,
        status: ws.status,
        answeredCount: ws.answeredCount,
        totalQuestions: ws.totalQuestions,
        remainingSeconds: ws.remainingSeconds,
        elapsedSeconds: elapsed,
        startedAtText: '08:00:00',
        submittedAtText: ws.status === 'SUBMITTED' ? 'Đã nộp hoàn tất' : 'Đang làm bài',
        part1Score: p1,
        part2Score: p2,
        part3Score: p3,
        totalScore,
        academicRank: ws.status === 'SUBMITTED' ? getAcademicRank(totalScore) : 'Đang làm bài',
        violationCount: ws.violationCount,
        lastEventText: ws.lastEventText,
        isLiveBrowserUser: ws.isLiveBrowserUser,
      });
    });

    return Array.from(map.values());
  }, [liveSessions, workstations, variants, examDurationSeconds]);

  const filteredRows = useMemo(() => {
    return studentRows.filter((row) => {
      if (statusFilter === 'SUBMITTED' && row.status !== 'SUBMITTED') return false;
      if (statusFilter === 'ACTIVE' && row.status === 'SUBMITTED') return false;
      if (statusFilter === 'VIOLATION' && row.violationCount === 0) return false;
      if (codeFilter !== 'ALL' && row.examCode !== codeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          row.studentName.toLowerCase().includes(q) ||
          row.studentId.toLowerCase().includes(q) ||
          row.examCode.toLowerCase().includes(q) ||
          row.workstationId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [studentRows, statusFilter, codeFilter, searchQuery]);

  // Aggregate Statistics
  const statsSummary = useMemo(() => {
    const totalStudents = studentRows.length;
    const submittedRows = studentRows.filter(
      (r) => r.status === 'SUBMITTED' && r.totalScore !== undefined
    );
    const submittedCount = submittedRows.length;
    const activeCount = totalStudents - submittedCount;
    const scores = submittedRows.map((r) => r.totalScore as number);
    const avgScore =
      scores.length > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = scores.filter((s) => s >= 5.0).length;
    const passRate =
      scores.length > 0 ? Math.round((passCount / scores.length) * 100) : 0;
    const totalViolations = studentRows.reduce((acc, r) => acc + r.violationCount, 0);

    // Distribution buckets
    const dist = {
      excellent: scores.filter((s) => s >= 9.0).length,
      good: scores.filter((s) => s >= 8.0 && s < 9.0).length,
      fair: scores.filter((s) => s >= 6.5 && s < 8.0).length,
      average: scores.filter((s) => s >= 5.0 && s < 6.5).length,
      below: scores.filter((s) => s < 5.0).length,
    };

    return {
      totalStudents,
      submittedCount,
      activeCount,
      avgScore,
      maxScore,
      minScore,
      passRate,
      totalViolations,
      dist,
    };
  }, [studentRows]);

  const availableCodes = useMemo(() => {
    const set = new Set<string>();
    variants.forEach((v) => set.add(v.code));
    studentRows.forEach((r) => set.add(r.examCode));
    return Array.from(set);
  }, [variants, studentRows]);

  // Export to Microsoft Excel (.xls HTML Workbook with UTF-8 BOM)
  const handleExportExcelXls = () => {
    const subjectSlug = toCleanSlug(examData.subject || 'VatLy12') || 'VatLy12';
    const dateStr = new Date().toLocaleDateString('vi-VN');

    const rowsHtml = filteredRows
      .map((r, idx) => {
        const scoreStr =
          r.totalScore !== undefined ? r.totalScore.toFixed(2).replace('.', ',') : '';
        const p1Str = r.part1Score.toFixed(2).replace('.', ',');
        const p2Str = r.part2Score.toFixed(2).replace('.', ',');
        const p3Str = r.part3Score.toFixed(2).replace('.', ',');
        const statusLabel =
          r.status === 'SUBMITTED'
            ? 'Đã nộp bài'
            : r.status === 'VIOLATION_WARN'
            ? 'Cảnh báo quy chế'
            : 'Đang làm bài';

        return `<tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="mso-number-format:'\\@'; text-align:center; font-weight:bold;">${r.studentId}</td>
          <td>${r.studentName}</td>
          <td style="mso-number-format:'\\@'; text-align:center;">${r.examCode}</td>
          <td style="text-align:center;">${statusLabel}</td>
          <td style="text-align:center;">${r.answeredCount}/${r.totalQuestions}</td>
          <td style="text-align:right;">${p1Str}</td>
          <td style="text-align:right;">${p2Str}</td>
          <td style="text-align:right;">${p3Str}</td>
          <td style="text-align:right; font-weight:bold; color:#047857;">${scoreStr}</td>
          <td style="text-align:center;">${r.academicRank}</td>
          <td style="text-align:center;">${formatDurationMinSec(r.elapsedSeconds)}</td>
          <td style="text-align:center;">${r.submittedAtText}</td>
          <td style="text-align:center;">${r.violationCount}</td>
          <td>${r.lastEventText}</td>
        </tr>`;
      })
      .join('\n');

    const excelHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <style>
    body, table { font-family: "Times New Roman", serif; font-size: 12pt; }
    th { background-color: #312e81; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #1e1b4b; }
    td { padding: 6px 8px; border: 1px solid #cbd5e1; }
  </style>
</head>
<body>
  <h2 style="margin-bottom:4px;">BẢNG THỐNG KÊ KẾT QUẢ & QUÁ TRÌNH LÀM BÀI KIỂM TRA</h2>
  <p style="margin-top:0;"><b>Bài kiểm tra:</b> ${examData.title} | <b>Môn:</b> ${examData.subject} | <b>Ngày xuất:</b> ${dateStr}</p>
  <table>
    <thead>
      <tr>
        <th>STT</th>
        <th>Số Báo Danh</th>
        <th>Họ và Tên Học Sinh</th>
        <th>Mã Đề</th>
        <th>Trạng Thái</th>
        <th>Số Câu Hoàn Thành</th>
        <th>Điểm Phần I</th>
        <th>Điểm Phần II</th>
        <th>Điểm Phần III</th>
        <th>Tổng Điểm (Thang 10)</th>
        <th>Xếp Loại</th>
        <th>Thời Gian Làm Bài</th>
        <th>Thời Điểm Nộp Bài</th>
        <th>Số Lần Vi Phạm</th>
        <th>Chi Tiết Quá Trình Làm Bài</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob(['\uFEFF' + excelHtml], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bang_Diem_Thong_Ke_${subjectSlug}_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);

    setExportFeedback(
      `Đã tải xuống bảng điểm Excel "${a.download}" (${filteredRows.length} học sinh) để nhập điểm vào hệ thống quản lý điểm!`
    );
    window.setTimeout(() => setExportFeedback(null), 5000);
  };

  // Export CSV for fast import into vnEdu / SMAS / CSDL Ngành
  const handleExportCsv = () => {
    const subjectSlug = toCleanSlug(examData.subject || 'VatLy12') || 'VatLy12';
    const headers = [
      'STT',
      'SBD',
      'Ho_Va_Ten',
      'Ma_De',
      'Trang_Thai',
      'So_Cau_Lam',
      'Diem_Phan_I',
      'Diem_Phan_II',
      'Diem_Phan_III',
      'Tong_Diem',
      'Xep_Loai',
      'Thoi_Gian_Lam_Bai',
      'Thoi_Diem_Nop',
      'So_Lan_Vi_Pham',
      'Ghi_Chu',
    ];

    const lines = filteredRows.map((r, idx) => {
      const scoreVal = r.totalScore !== undefined ? r.totalScore.toFixed(2) : '';
      const statusLabel = r.status === 'SUBMITTED' ? 'Da nop' : 'Dang lam';
      const cols = [
        idx + 1,
        `"${r.studentId}"`,
        `"${r.studentName.replace(/"/g, '""')}"`,
        `"${r.examCode}"`,
        `"${statusLabel}"`,
        `"${r.answeredCount}/${r.totalQuestions}"`,
        r.part1Score.toFixed(2),
        r.part2Score.toFixed(2),
        r.part3Score.toFixed(2),
        scoreVal,
        `"${r.academicRank}"`,
        `"${formatDurationMinSec(r.elapsedSeconds)}"`,
        `"${r.submittedAtText}"`,
        r.violationCount,
        `"${r.lastEventText.replace(/"/g, '""')}"`,
      ];
      return cols.join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...lines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nhap_Diem_SMAS_vnEdu_${subjectSlug}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setExportFeedback(
      `Đã tải xuống file CSV "${a.download}" chuẩn UTF-8 tương thích nhập điểm vnEdu / SMAS!`
    );
    window.setTimeout(() => setExportFeedback(null), 5000);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
      {/* Header & Primary Export / Delete Actions — Balanced Full-Width Scientific Layout */}
      <div className="bg-[#18182e] border border-indigo-900/60 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>TRUNG TÂM THỐNG KÊ KẾT QUẢ & QUÁ TRÌNH LÀM BÀI CỦA HỌC SINH</span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-snug">
              Thống Kê Điểm Thi & Nhật Ký Làm Bài
            </h1>
            <span className="px-3 py-1 rounded-lg bg-violet-600/20 border border-violet-500/40 text-xs sm:text-sm font-mono font-bold text-violet-300">
              Đề thi: {examData.title} ({examData.subject})
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Theo dõi chi tiết điểm từng phần (Phần I, II, III), thời gian làm bài, lịch sử từng câu trả lời và xuất file Excel nhập điểm sang nền tảng khác.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 whitespace-nowrap">
              Danh sách hiện tại: <strong className="text-white">{filteredRows.length} học sinh</strong>
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-600/50 text-emerald-300 whitespace-nowrap">
              Đã nộp bài: <strong>{statsSummary.submittedCount}</strong>
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-600/50 text-amber-300 whitespace-nowrap">
              Đang làm bài: <strong>{statsSummary.activeCount}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportExcelXls}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-md transition-all whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>📥 Tải Kết Quả Về Máy (Excel .xls)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-indigo-950/90 hover:bg-indigo-900 disabled:opacity-50 text-indigo-200 border border-indigo-700/70 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-violet-400 shrink-0" />
              <span>Xuất CSV (vnEdu / SMAS)</span>
            </button>

            {studentRows.length > 0 ? (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/70 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Xoá Khi Đã Kiểm Tra Xong</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onRestoreSampleRecords}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4 text-violet-400 shrink-0" />
                <span>Khôi Phục Dữ Liệu Mẫu</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Confirmation Banner for Clearing All Exam Results */}
      {confirmClearAll && (
        <div className="p-5 rounded-2xl bg-rose-950/80 border-2 border-rose-500/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-base font-bold text-white">
                Xác nhận xoá toàn bộ dữ liệu thống kê của đợt kiểm tra này?
              </div>
              <p className="text-xs sm:text-sm text-rose-200">
                Hãy đảm bảo Thầy/Cô đã bấm <strong>"Tải Kết Quả Về Máy (Excel .xls)"</strong> trước khi xoá để lưu trữ điểm.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmClearAll(false)}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700"
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              onClick={() => {
                onClearAllRecords();
                setConfirmClearAll(false);
                setExportFeedback(
                  'Đã xoá sạch toàn bộ kết quả kiểm tra cũ. Hệ thống sẵn sàng cho ca thi tiếp theo!'
                );
                window.setTimeout(() => setExportFeedback(null), 5000);
              }}
              className="px-4 py-2 text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg"
            >
              ✓ Xác Nhận Xoá Tất Cả
            </button>
          </div>
        </div>
      )}

      {exportFeedback && (
        <div className="px-4 py-3 rounded-xl bg-emerald-950/80 border border-emerald-600/60 text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportFeedback(null)}
            className="text-emerald-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#18182e] border border-indigo-900/60 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>TỔNG SỐ THÍ SINH</span>
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
            {statsSummary.totalStudents}{' '}
            <span className="text-sm font-normal text-slate-400">học sinh</span>
          </div>
          <div className="text-xs text-slate-300">
            Đã nộp:{' '}
            <strong className="text-emerald-400">{statsSummary.submittedCount}</strong> · Đang
            làm: <strong className="text-amber-400">{statsSummary.activeCount}</strong>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#18182e] border border-indigo-900/60 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>ĐIỂM TRUNG BÌNH CHUNG</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
            {statsSummary.avgScore.toFixed(2)}{' '}
            <span className="text-sm font-normal text-slate-400">/ 10.00</span>
          </div>
          <div className="text-xs text-slate-300 font-mono">
            Cao nhất: <strong className="text-white">{statsSummary.maxScore.toFixed(2)}</strong> ·
            Thấp nhất: <strong className="text-white">{statsSummary.minScore.toFixed(2)}</strong>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#18182e] border border-indigo-900/60 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>TỈ LỆ ĐẠT YÊU CẦU (≥ 5.0)</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-400 font-mono tabular-nums">
            {statsSummary.passRate}%
          </div>
          <div className="text-xs text-slate-300">
            Xuất sắc/Giỏi (≥ 8.0đ):{' '}
            <strong className="text-white">
              {statsSummary.dist.excellent + statsSummary.dist.good}
            </strong>{' '}
            học sinh
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#18182e] border border-indigo-900/60 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>GIÁM SÁT QUY CHẾ THI</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tabular-nums">
            {statsSummary.totalViolations}{' '}
            <span className="text-sm font-normal text-slate-400">cảnh báo</span>
          </div>
          <div className="text-xs text-slate-300">
            Tự động ghi nhận chuyển tab & thoát toàn màn hình
          </div>
        </div>
      </div>

      {/* Score Spectrum Bar */}
      <div className="bg-[#18182e] border border-indigo-900/60 rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-bold text-white">
            Phổ Điểm Phân Loại Học Lực (Theo Chuẩn Đánh Giá GDPT 2018)
          </span>
          <span className="text-xs font-mono text-slate-400">
            Tính trên {statsSummary.submittedCount} bài thi đã nộp
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-700/50 flex items-center justify-between gap-2">
            <span className="text-emerald-200 font-semibold whitespace-nowrap">Xuất sắc (9.0–10):</span>
            <span className="font-mono font-bold text-base text-emerald-400 shrink-0">
              {statsSummary.dist.excellent}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-sky-950/50 border border-sky-700/50 flex items-center justify-between gap-2">
            <span className="text-sky-200 font-semibold whitespace-nowrap">Giỏi (8.0–8.9):</span>
            <span className="font-mono font-bold text-base text-sky-400 shrink-0">
              {statsSummary.dist.good}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-violet-950/50 border border-violet-700/50 flex items-center justify-between gap-2">
            <span className="text-violet-200 font-semibold whitespace-nowrap">Khá (6.5–7.9):</span>
            <span className="font-mono font-bold text-base text-violet-400 shrink-0">
              {statsSummary.dist.fair}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-700/50 flex items-center justify-between gap-2">
            <span className="text-amber-200 font-semibold whitespace-nowrap">Đạt (5.0–6.4):</span>
            <span className="font-mono font-bold text-base text-amber-400 shrink-0">
              {statsSummary.dist.average}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-700/50 flex items-center justify-between gap-2">
            <span className="text-rose-200 font-semibold whitespace-nowrap">Chưa đạt (&lt; 5.0):</span>
            <span className="font-mono font-bold text-base text-rose-400 shrink-0">
              {statsSummary.dist.below}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#18182e] border border-indigo-900/60 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL' as const, label: `Tất cả (${studentRows.length})` },
              {
                id: 'SUBMITTED' as const,
                label: `Đã nộp bài (${
                  studentRows.filter((r) => r.status === 'SUBMITTED').length
                })`,
              },
              {
                id: 'ACTIVE' as const,
                label: `Đang làm bài (${
                  studentRows.filter((r) => r.status !== 'SUBMITTED').length
                })`,
              },
              {
                id: 'VIOLATION' as const,
                label: `Có vi phạm (${
                  studentRows.filter((r) => r.violationCount > 0).length
                })`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500 font-mono"
              >
                <option value="ALL">Tất cả mã đề</option>
                {availableCodes.map((c) => (
                  <option key={c} value={c}>
                    Mã đề {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên học sinh, SBD, mã đề..."
                className="pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* Detailed Student Results Table */}
        {filteredRows.length === 0 ? (
          <div className="p-10 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
            <div className="text-base font-bold text-slate-200">
              Không có dữ liệu kết quả bài thi nào khớp với bộ lọc hiện tại.
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Khi học sinh làm bài và nộp bài tại Cổng Học Sinh, kết quả và chi tiết quá trình làm bài sẽ tự động hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/90 text-xs font-mono uppercase text-slate-300 border-b border-slate-800 whitespace-nowrap">
                  <th className="py-3.5 px-3 text-center w-12">STT</th>
                  <th className="py-3.5 px-3">SBD</th>
                  <th className="py-3.5 px-4">Họ và Tên Học Sinh</th>
                  <th className="py-3.5 px-3 text-center">Mã Đề</th>
                  <th className="py-3.5 px-3 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-3 text-center">Tiến Độ</th>
                  <th className="py-3.5 px-3 text-center">Thời Gian Làm</th>
                  <th className="py-3.5 px-3 text-right">Phần I</th>
                  <th className="py-3.5 px-3 text-right">Phần II</th>
                  <th className="py-3.5 px-3 text-right">Phần III</th>
                  <th className="py-3.5 px-3 text-right">Tổng Điểm</th>
                  <th className="py-3.5 px-3 text-center">Vi Phạm</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredRows.map((row, index) => {
                  const isConfirmingRowDelete = confirmDeleteKey === row.key;
                  return (
                    <tr
                      key={row.key}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        row.isLiveBrowserUser ? 'bg-violet-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center font-mono text-xs text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-violet-300 whitespace-nowrap">
                        {row.studentId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white flex flex-wrap items-center gap-2">
                          <span className="whitespace-nowrap">{row.studentName}</span>
                          {row.isLiveBrowserUser && (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-violet-600/30 text-violet-200 border border-violet-500/50 whitespace-nowrap shrink-0">
                              Trực tuyến
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-1">
                          {row.lastEventText}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold text-xs text-indigo-300">
                          {row.examCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {row.status === 'SUBMITTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-xs font-semibold whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Đã nộp
                          </span>
                        ) : row.status === 'VIOLATION_WARN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-600/50 text-rose-300 text-xs font-semibold whitespace-nowrap">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            Cảnh báo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-600/50 text-amber-300 text-xs font-semibold whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            Đang làm
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-xs text-slate-200">
                        {row.answeredCount}/{row.totalQuestions} câu
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-xs text-slate-300">
                        {formatDurationMinSec(row.elapsedSeconds)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-xs text-slate-300 tabular-nums">
                        {row.totalScore !== undefined ? row.part1Score.toFixed(2) : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-xs text-slate-300 tabular-nums">
                        {row.totalScore !== undefined ? row.part2Score.toFixed(2) : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-xs text-slate-300 tabular-nums">
                        {row.totalScore !== undefined ? row.part3Score.toFixed(2) : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                        {row.totalScore !== undefined ? (
                          <span className="text-base font-extrabold text-emerald-400">
                            {row.totalScore.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Chưa nộp</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono">
                        {row.violationCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-700/60 text-xs font-bold">
                            {row.violationCount} lần
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectingRow(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-indigo-950/90 hover:bg-indigo-900 text-violet-200 border border-violet-700/50 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>

                          {isConfirmingRowDelete ? (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteStudentRecord(
                                  row.studentId,
                                  row.examCode,
                                  row.workstationId
                                );
                                setConfirmDeleteKey(null);
                              }}
                              className="px-2.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg whitespace-nowrap"
                            >
                              Xoá ngay
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteKey(row.key)}
                              title="Xoá kết quả của học sinh này"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Chi Tiết Quá Trình Làm Bài & Từng Câu Trả Lời Của Học Sinh */}
      {inspectingRow && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18182e] border border-violet-700/70 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-violet-400">
                  HỒ SƠ QUÁ TRÌNH LÀM BÀI CHI TIẾT · SBD: {inspectingRow.studentId} · MÃ ĐỀ:{' '}
                  {inspectingRow.examCode}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Thí sinh: {inspectingRow.studentName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingRow(null)}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Tóm tắt thông số quá trình làm bài */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-slate-400 text-xs">Tổng điểm đạt được</div>
                  <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
                    {inspectingRow.totalScore !== undefined
                      ? `${inspectingRow.totalScore.toFixed(2)} / 10.00`
                      : 'Đang làm bài'}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-slate-400 text-xs">Điểm từng phần (I / II / III)</div>
                  <div className="text-sm font-bold text-white font-mono mt-1">
                    {inspectingRow.part1Score.toFixed(2)}đ · {inspectingRow.part2Score.toFixed(2)}đ
                    · {inspectingRow.part3Score.toFixed(2)}đ
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-slate-400 text-xs">Thời gian làm bài thực tế</div>
                  <div className="text-sm font-bold text-white font-mono mt-1">
                    {formatDurationMinSec(inspectingRow.elapsedSeconds)} ({inspectingRow.answeredCount}/
                    {inspectingRow.totalQuestions} câu)
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-slate-400 text-xs">Vi phạm quy chế</div>
                  <div
                    className={`text-sm font-bold font-mono mt-1 ${
                      inspectingRow.violationCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {inspectingRow.violationCount} lần cảnh báo
                  </div>
                </div>
              </div>

              {/* Nhật ký cảnh báo chống gian lận (nếu có) */}
              {inspectingRow.sessionData && inspectingRow.sessionData.violations.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-700/50 space-y-2">
                  <div className="text-xs font-mono font-bold uppercase text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Nhật Ký Vi Phạm Quy Chế Phòng Thi ({inspectingRow.sessionData.violations.length} sự kiện)</span>
                  </div>
                  <div className="space-y-1 text-xs font-mono text-rose-200">
                    {inspectingRow.sessionData.violations.map((v) => (
                      <div key={v.id} className="flex items-center justify-between">
                        <span>• {v.description}</span>
                        <span className="text-rose-400">{v.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chi tiết từng câu trả lời (nếu có gradeReport từ phiên làm bài) */}
              {inspectingRow.gradeReport ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-violet-300 uppercase font-mono">
                    Bảng Đối Chiếu Chi Tiết Từng Câu Hỏi ({inspectingRow.gradeReport.details.length} câu)
                  </h4>
                  <div className="space-y-2.5">
                    {inspectingRow.gradeReport.details.map((d) => (
                      <div
                        key={d.globalNumber}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-violet-300">
                            Phần {d.part} · Câu {d.partQuestionNumber} (Câu #{d.globalNumber})
                          </span>
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span>
                              HS chọn:{' '}
                              <strong className="text-white">{d.userAnswerSummary}</strong>
                            </span>
                            <span>·</span>
                            <span>
                              Đáp án đúng:{' '}
                              <strong className="text-emerald-400">
                                {d.correctAnswerSummary}
                              </strong>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                d.status === 'CORRECT'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                                  : d.status === 'PARTIAL'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-700/50'
                                  : 'bg-rose-950 text-rose-300 border border-rose-700/50'
                              }`}
                            >
                              +{d.earnedPoints.toFixed(2)}/{d.maxPoints.toFixed(2)}đ
                            </span>
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-200">
                          <MathText text={d.questionText} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs sm:text-sm text-slate-300">
                  Trạng thái cuối: <strong>{inspectingRow.lastEventText}</strong> · Đã hoàn thành{' '}
                  <strong>
                    {inspectingRow.answeredCount}/{inspectingRow.totalQuestions} câu hỏi
                  </strong>{' '}
                  của mã đề <strong>{inspectingRow.examCode}</strong>.
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onDeleteStudentRecord(
                    inspectingRow.studentId,
                    inspectingRow.examCode,
                    inspectingRow.workstationId
                  );
                  setInspectingRow(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-700/60 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xoá Kết Quả Của Học Sinh Này</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectingRow(null)}
                className="px-5 py-2 text-xs sm:text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
