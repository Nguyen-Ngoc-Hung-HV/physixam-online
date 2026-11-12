/**
 * Standalone Production Backend Server (Node.js + Express + MongoDB Atlas via Mongoose)
 * File: backend/server.js
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

// ============================================================================
// 1. MONGODB ATLAS CONNECTION
// ============================================================================
const MONGODB_URI = process.env.MONGODB_URI || '';

if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas successfully'))
    .catch((err) => console.error('❌ MongoDB Atlas connection error:', err.message));
}

// ============================================================================
// 2. MONGOOSE DATA SCHEMAS (ExamSchema & SubmissionSchema)
// ============================================================================
const ExamSchema = new mongoose.Schema(
  {
    examId: { type: String, required: true, index: true },
    examCode: { type: String, required: true, index: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    grade: { type: String, default: 'Lớp 12' },
    curriculum: { type: String, default: 'Chương trình GDPT 2018 — Bộ GD&ĐT' },
    durationMinutes: { type: Number, default: 50 },
    mode: { type: String, enum: ['exam', 'practice'], default: 'exam' },
    violationLevel: { type: Number, enum: [1, 2, 3], default: 2 },
    maxViolations: { type: Number, default: 3 },
    assignedClasses: { type: [String], default: ['12A1'] },
    detailedSolutionContent: { type: String, default: '' },
    part1: [
      {
        id: String,
        topic: String,
        question: String, // KaTeX string
        options: [String],
        correctIndex: Number,
        points: { type: Number, default: 0.25 },
        explanation: String,
        has_image: Boolean,
        image_url: String,
      },
    ],
    part2: [
      {
        id: String,
        topic: String,
        stem: String, // KaTeX string
        statements: [
          {
            id: { type: String, enum: ['a', 'b', 'c', 'd'] },
            text: String,
            isTrue: Boolean,
            explanation: String,
          },
        ],
        points: { type: Number, default: 1.0 },
        explanation: String,
        has_image: Boolean,
        image_url: String,
      },
    ],
    part3: [
      {
        id: String,
        topic: String,
        question: String, // KaTeX string
        unit: String,
        answer: String,
        points: { type: Number, default: 0.25 },
        explanation: String,
        has_image: Boolean,
        image_url: String,
      },
    ],
    variants: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

const SubmissionSchema = new mongoose.Schema(
  {
    examId: { type: String, required: true, index: true },
    examCode: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    studentId: { type: String, required: true, index: true }, // SBD
    room: { type: String, default: 'MAY-01' },
    startedAt: { type: String, default: () => new Date().toISOString() },
    submittedAt: { type: String, default: () => new Date().toLocaleTimeString('vi-VN') },
    remainingSeconds: { type: Number, default: 0 },
    isSubmitted: { type: Boolean, default: true },
    answers: {
      part1: { type: mongoose.Schema.Types.Mixed, default: {} },
      part2: { type: mongoose.Schema.Types.Mixed, default: {} },
      part3: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    violationCount: { type: Number, default: 0 },
    violations: { type: Array, default: [] },
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

const Exam = mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
const Submission = mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);

// Helper: Progressive Part II scoring according to MOET GDPT 2018
function getPart2ProgressivePoints(correctCount) {
  if (correctCount === 1) return 0.1;
  if (correctCount === 2) return 0.25;
  if (correctCount === 3) return 0.5;
  if (correctCount === 4) return 1.0;
  return 0;
}

function normalizeAnswer(val) {
  return String(val || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.')
    .toLowerCase();
}

function gradeSubmissionOnServer(examDoc, answers, examCode) {
  const variant =
    Array.isArray(examDoc?.variants) && examCode
      ? examDoc.variants.find(
          (v) => String(v.code).trim().toUpperCase() === String(examCode).trim().toUpperCase()
        )
      : null;

  const part1 = variant?.part1 || examDoc?.part1 || [];
  const part2 = variant?.part2 || examDoc?.part2 || [];
  const part3 = variant?.part3 || examDoc?.part3 || [];

  let part1Score = 0;
  let part2Score = 0;
  let part3Score = 0;
  let maxPossibleScore = 0;

  for (const q of part1) {
    const pts = Number(q.points) || 0.25;
    maxPossibleScore += pts;
    if (answers?.part1?.[q.id] !== undefined && Number(answers.part1[q.id]) === Number(q.correctIndex)) {
      part1Score += pts;
    }
  }

  for (const q of part2) {
    const pts = Number(q.points) || 1.0;
    maxPossibleScore += pts;
    const stmtAns = answers?.part2?.[q.id] || {};
    let correctSub = 0;
    for (const stmt of q.statements || []) {
      const key = stmt.displayLabel || stmt.id;
      if (stmtAns[key] !== undefined && Boolean(stmtAns[key]) === Boolean(stmt.isTrue)) {
        correctSub += 1;
      }
    }
    part2Score += (getPart2ProgressivePoints(correctSub) * pts) / 1.0;
  }

  for (const q of part3) {
    const pts = Number(q.points) || 0.25;
    maxPossibleScore += pts;
    const userVal = answers?.part3?.[q.id] || '';
    if (userVal && normalizeAnswer(userVal) === normalizeAnswer(q.answer)) {
      part3Score += pts;
    }
  }

  const rawTotalScore = Number((part1Score + part2Score + part3Score).toFixed(2));
  const totalMoetScore =
    maxPossibleScore > 0 ? Number(((rawTotalScore / maxPossibleScore) * 10).toFixed(2)) : 0;

  return {
    part1Score: Number(part1Score.toFixed(2)),
    part2Score: Number(part2Score.toFixed(2)),
    part3Score: Number(part3Score.toFixed(2)),
    rawTotalScore,
    maxPossibleScore: Number(maxPossibleScore.toFixed(2)),
    totalMoetScore,
  };
}

// ============================================================================
// 3. RESTFUL API ENDPOINTS
// ============================================================================

const escapeRegex = (str) => String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /api/exams/import - Save newly imported/scrambled exams to MongoDB Atlas
app.post('/api/exams/import', async (req, res) => {
  try {
    const body = req.body || {};
    const examData = body.examData || body;
    const examCode = String(body.examCode || examData.examCode || '1102').trim();
    const examId = String(
      examData.examId || body.examId || `EXAM-${examCode}-${Date.now()}`
    ).trim();

    const codeRegex = new RegExp(`^${escapeRegex(examCode)}$`, 'i');
    const doc = await Exam.findOneAndUpdate(
      { examCode: codeRegex },
      {
        $set: {
          ...examData,
          title: body.examTitle || examData.title || 'Kiểm Tra Thông Minh - Chuẩn Cấu Trúc GDPT 2018',
          subject: body.subject || examData.subject || 'Vật Lý 12',
          durationMinutes: Number(body.durationMinutes || examData.durationMinutes) || 50,
          examId,
          examCode,
          mode: body.mode || examData.mode || 'exam',
          violationLevel: body.violationLevel || examData.violationLevel || 2,
          maxViolations: body.maxViolations ?? examData.maxViolations ?? 3,
          assignedClasses: Array.isArray(body.assignedClasses) ? body.assignedClasses : ['12A1'],
          detailedSolutionContent: body.detailedSolutionContent || examData.detailedSolutionContent || '',
          variants: body.variants || examData.variants || [],
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, exam: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/exams - Retrieve latest exams for student devices
app.get('/api/exams', async (_req, res) => {
  try {
    const docs = await Exam.find({}).sort({ updatedAt: -1 }).limit(20);
    res.status(200).json({
      success: true,
      latestExam: docs[0] || null,
      exams: docs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/exams/:id - Retrieve exam data for the student exam room
app.get('/api/exams/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const safePattern = new RegExp(`^${escapeRegex(id)}$`, 'i');
    let exam = await Exam.findOne({
      $or: [
        { examCode: safePattern },
        { examId: safePattern },
        { 'variants.code': safePattern },
      ],
    }).sort({ updatedAt: -1 });

    if (!exam) {
      exam = await Exam.findOne({}).sort({ updatedAt: -1 });
    }
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    res.status(200).json({ success: true, exam });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/submissions - Verify/calculate scores on server & store in MongoDB Atlas
app.post('/api/submissions', async (req, res) => {
  try {
    const {
      examId,
      examCode,
      studentName,
      studentId,
      room,
      answers,
      violations = [],
      violationCount,
      remainingSeconds = 0,
      isSubmitted = true,
      startedAt,
      submittedAt,
    } = req.body;

    const examDoc = await Exam.findOne({
      $or: [{ examCode }, { examId }],
    });

    const scores = gradeSubmissionOnServer(examDoc, answers, examCode);

    const saved = await Submission.findOneAndUpdate(
      { studentId: String(studentId).trim().toUpperCase(), examCode: String(examCode).trim() },
      {
        $set: {
          examId: examDoc?.examId || examId || 'GDPT2018-VL12-HK2-2026',
          examCode,
          studentName,
          studentId: String(studentId).trim().toUpperCase(),
          room: room || 'MAY-01',
          startedAt: startedAt || new Date().toISOString(),
          submittedAt: submittedAt || new Date().toLocaleTimeString('vi-VN'),
          remainingSeconds,
          isSubmitted,
          answers,
          violationCount: typeof violationCount === 'number' ? violationCount : violations.length,
          violations,
          scores,
        },
      },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, submission: saved, scores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/submissions/exam/:examId - Retrieve live monitor list & score ranking
app.get('/api/submissions/exam/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    const filter =
      examId.toUpperCase() === 'ALL'
        ? {}
        : {
            $or: [
              { examId: new RegExp(`^${examId}$`, 'i') },
              { examCode: new RegExp(`^${examId}$`, 'i') },
            ],
          };

    const submissions = await Submission.find(filter).sort({
      'scores.totalMoetScore': -1,
      updatedAt: -1,
    });

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SmartTest MongoDB Atlas Backend running on port ${PORT}`);
});
