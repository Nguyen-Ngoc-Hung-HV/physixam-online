import React from 'react';
import { CheckCircle2, Flag } from 'lucide-react';

export interface ExamProgressBarProps {
  completedCount: number;
  totalQuestionCount: number;
  flaggedCount?: number;
  part1Completed?: number;
  part1Total?: number;
  part2Completed?: number;
  part2Total?: number;
  part3Completed?: number;
  part3Total?: number;
  compact?: boolean;
}

export const ProgressBar: React.FC<ExamProgressBarProps> = ({
  completedCount,
  totalQuestionCount,
  flaggedCount = 0,
  part1Completed,
  part1Total,
  part2Completed,
  part2Total,
  part3Completed,
  part3Total,
  compact = false,
}) => {
  const safeTotal = Math.max(1, totalQuestionCount);
  const clampedCompleted = Math.min(safeTotal, Math.max(0, completedCount));
  const percentage = Math.round((clampedCompleted / safeTotal) * 100);
  const remainingCount = Math.max(0, totalQuestionCount - clampedCompleted);
  const isAllDone = clampedCompleted >= safeTotal && totalQuestionCount > 0;

  if (compact) {
    return (
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs font-mono tabular-nums">
          <span className="text-slate-300">
            Tiến độ hoàn thành:{' '}
            <strong className={isAllDone ? 'text-emerald-400' : 'text-violet-300'}>
              {percentage}%
            </strong>
          </span>
          <span className="text-slate-400">
            {remainingCount === 0 ? 'Đã làm đủ tất cả câu' : `Còn ${remainingCount} câu chưa làm`}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={clampedCompleted}
          aria-valuemin={0}
          aria-valuemax={safeTotal}
          aria-label="Tiến độ hoàn thành câu hỏi"
          className="w-full h-2.5 rounded-full bg-slate-950/90 border border-slate-800 overflow-hidden p-0.5"
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              isAllDone
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 sm:mb-6 px-3.5 sm:px-5 py-3.5 rounded-xl bg-[#18182e] border border-indigo-900/80 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <span className="font-bold text-white flex items-center gap-1.5">
            <CheckCircle2
              className={`w-4 h-4 shrink-0 ${
                isAllDone ? 'text-emerald-400' : 'text-violet-400'
              }`}
            />
            <span>Tiến Độ Hoàn Thành Bài Thi:</span>
          </span>
          <span className="font-mono font-bold text-sm sm:text-base text-emerald-400 tabular-nums">
            {clampedCompleted}/{totalQuestionCount} câu ({percentage}%)
          </span>
          <span aria-hidden="true" className="text-slate-600 hidden sm:inline">
            ·
          </span>
          <span className="font-mono text-xs text-slate-300 tabular-nums">
            {remainingCount === 0 ? (
              <span className="text-emerald-300 font-semibold">
                Đã hoàn thành 100% câu hỏi
              </span>
            ) : (
              `Còn lại: ${remainingCount} câu`
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
          {typeof part1Completed === 'number' && typeof part1Total === 'number' && (
            <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
              P.I: <strong className="text-white">{part1Completed}/{part1Total}</strong>
            </span>
          )}
          {typeof part2Completed === 'number' && typeof part2Total === 'number' && (
            <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
              P.II: <strong className="text-white">{part2Completed}/{part2Total}</strong>
            </span>
          )}
          {typeof part3Completed === 'number' && typeof part3Total === 'number' && (
            <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
              P.III: <strong className="text-white">{part3Completed}/{part3Total}</strong>
            </span>
          )}
          {flaggedCount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-700/60 text-amber-300 flex items-center gap-1">
              <Flag className="w-3 h-3" />
              <span>{flaggedCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Visual Progress Track */}
      <div
        role="progressbar"
        aria-valuenow={clampedCompleted}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-label="Thanh tiến độ số lượng câu hỏi đã hoàn thành"
        className="w-full h-3 sm:h-3.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isAllDone
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
              : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
