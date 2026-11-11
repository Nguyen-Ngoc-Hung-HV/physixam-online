import mongoose, { Schema, Document } from 'mongoose';

export interface IPart1Question {
  id: string;
  topic: string;
  question: string; // Supports KaTeX strings ($...$, $$...$$)
  options: string[]; // 4 options [A, B, C, D]
  correctIndex: number; // 0..3
  correct_answer?: 'A' | 'B' | 'C' | 'D';
  points: number; // Default 0.25
  explanation: string;
  has_image?: boolean;
  image_url?: string;
}

export interface IPart2SubStatement {
  id: 'a' | 'b' | 'c' | 'd';
  text: string; // Supports KaTeX strings
  isTrue: boolean;
  explanation?: string;
}

export interface IPart2Question {
  id: string;
  topic: string;
  stem: string; // Supports KaTeX strings
  statements: IPart2SubStatement[]; // 4 statements a, b, c, d
  points: number; // Default 1.00 max (progressive: 0.10 / 0.25 / 0.50 / 1.00)
  explanation: string;
  has_image?: boolean;
  image_url?: string;
}

export interface IPart3Question {
  id: string;
  topic: string;
  question: string; // Supports KaTeX strings
  unit?: string;
  answer: string; // Numeric answer string e.g. "2,5" or "2.5"
  points: number; // Default 0.25
  explanation: string;
  has_image?: boolean;
  image_url?: string;
}

export interface IExamDocument extends Document {
  examId: string;
  examCode: string;
  title: string;
  subject: string;
  grade: string;
  curriculum: string;
  durationMinutes: number;
  folderId?: string;
  mode?: 'exam' | 'practice';
  violationLevel?: 1 | 2 | 3;
  maxViolations?: number;
  assignedClasses?: string[];
  startTime?: string;
  endTime?: string;
  detailedSolutionContent?: string;
  part1: IPart1Question[];
  part2: IPart2Question[];
  part3: IPart3Question[];
  variants?: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

const Part1QuestionSchema = new Schema<IPart1Question>(
  {
    id: { type: String, required: true },
    topic: { type: String, default: '' },
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, default: 0 },
    correct_answer: { type: String, enum: ['A', 'B', 'C', 'D'], default: 'A' },
    points: { type: Number, default: 0.25 },
    explanation: { type: String, default: '' },
    has_image: { type: Boolean, default: false },
    image_url: { type: String, default: '' },
  },
  { _id: false }
);

const Part2SubStatementSchema = new Schema<IPart2SubStatement>(
  {
    id: { type: String, enum: ['a', 'b', 'c', 'd'], required: true },
    text: { type: String, required: true },
    isTrue: { type: Boolean, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const Part2QuestionSchema = new Schema<IPart2Question>(
  {
    id: { type: String, required: true },
    topic: { type: String, default: '' },
    stem: { type: String, required: true },
    statements: { type: [Part2SubStatementSchema], required: true },
    points: { type: Number, default: 1.0 },
    explanation: { type: String, default: '' },
    has_image: { type: Boolean, default: false },
    image_url: { type: String, default: '' },
  },
  { _id: false }
);

const Part3QuestionSchema = new Schema<IPart3Question>(
  {
    id: { type: String, required: true },
    topic: { type: String, default: '' },
    question: { type: String, required: true },
    unit: { type: String, default: '' },
    answer: { type: String, required: true },
    points: { type: Number, default: 0.25 },
    explanation: { type: String, default: '' },
    has_image: { type: Boolean, default: false },
    image_url: { type: String, default: '' },
  },
  { _id: false }
);

export const ExamSchema = new Schema<IExamDocument>(
  {
    examId: { type: String, required: true, index: true },
    examCode: { type: String, required: true, index: true },
    title: { type: String, required: true },
    subject: { type: String, required: true, default: 'Vật Lý 12' },
    grade: { type: String, default: 'Lớp 12' },
    curriculum: { type: String, default: 'Chương trình GDPT 2018 — Bộ GD&ĐT' },
    durationMinutes: { type: Number, default: 50 },
    folderId: { type: String, default: 'KTGHK' },
    mode: { type: String, enum: ['exam', 'practice'], default: 'exam' },
    violationLevel: { type: Number, enum: [1, 2, 3], default: 2 },
    maxViolations: { type: Number, default: 3 },
    assignedClasses: { type: [String], default: ['12A1'] },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    detailedSolutionContent: { type: String, default: '' },
    part1: { type: [Part1QuestionSchema], default: [] },
    part2: { type: [Part2QuestionSchema], default: [] },
    part3: { type: [Part3QuestionSchema], default: [] },
    variants: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

export const ExamModel =
  mongoose.models.Exam || mongoose.model<IExamDocument>('Exam', ExamSchema);
