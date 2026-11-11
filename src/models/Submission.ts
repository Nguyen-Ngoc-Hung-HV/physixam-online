import mongoose, { Schema, Document } from 'mongoose';

export interface IViolationLog {
  id: string;
  timestamp: string;
  type: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'SHORTCUT_BLOCKED' | 'COPY_PASTE_ATTEMPT';
  description: string;
}

export interface ISubmissionDocument extends Document {
  examId: string;
  examCode: string;
  studentName: string;
  studentId: string; // SBD
  room: string; // Workstation or Classroom e.g. "MAY-01" / "12A1"
  startedAt: string;
  submittedAt: string;
  remainingSeconds: number;
  isSubmitted: boolean;
  answers: {
    part1: Record<string, number | undefined>;
    part2: Record<string, Record<'a' | 'b' | 'c' | 'd', boolean | undefined>>;
    part3: Record<string, string>;
    flagged?: Record<number, boolean>;
  };
  violationCount: number;
  violations: IViolationLog[];
  scores: {
    part1Score: number;
    part2Score: number;
    part3Score: number;
    rawTotalScore: number;
    maxPossibleScore: number;
    totalMoetScore: number; // Scaled 10.00 MOET GDPT 2018 score
  };
  createdAt: Date;
  updatedAt: Date;
}

const ViolationLogSchema = new Schema<IViolationLog>(
  {
    id: { type: String, required: true },
    timestamp: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

export const SubmissionSchema = new Schema<ISubmissionDocument>(
  {
    examId: { type: String, required: true, index: true },
    examCode: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    studentId: { type: String, required: true, index: true },
    room: { type: String, default: 'PHONG-MAY-01' },
    startedAt: { type: String, default: () => new Date().toISOString() },
    submittedAt: { type: String, default: () => new Date().toLocaleTimeString('vi-VN') },
    remainingSeconds: { type: Number, default: 0 },
    isSubmitted: { type: Boolean, default: true },
    answers: {
      part1: { type: Schema.Types.Mixed, default: {} },
      part2: { type: Schema.Types.Mixed, default: {} },
      part3: { type: Schema.Types.Mixed, default: {} },
      flagged: { type: Schema.Types.Mixed, default: {} },
    },
    violationCount: { type: Number, default: 0 },
    violations: { type: [ViolationLogSchema], default: [] },
    scores: {
      part1Score: { type: Number, default: 0 },
      part2Score: { type: Number, default: 0 },
      part3Score: { type: Number, default: 0 },
      rawTotalScore: { type: Number, default: 0 },
      maxPossibleScore: { type: Number, default: 10 },
      totalMoetScore: { type: Number, default: 0, index: true },
    },
  },
  { timestamps: true }
);

export const SubmissionModel =
  mongoose.models.Submission ||
  mongoose.model<ISubmissionDocument>('Submission', SubmissionSchema);
