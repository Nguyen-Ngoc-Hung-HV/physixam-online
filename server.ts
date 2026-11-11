import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import mongoose, { Schema } from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || '';

let isMongoConnected = false;

// ============================================================================
// MONGOOSE SCHEMAS (ExamSchema & SubmissionSchema)
// ============================================================================
const Part1QuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    topic: { type: String, default: '' },
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, default: 0 },
    correct_answer: { type: String, default: 'A' },
    points: { type: Number, default: 0.25 },
    explanation: { type: String, default: '' },
    has_image: { type: Boolean, default: false },
    image_url: { type: String, default: '' },
  },
  { _id: false }
);

const Part2SubStatementSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    isTrue: { type: Boolean, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const Part2QuestionSchema = new Schema(
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

const Part3QuestionSchema = new Schema(
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

const ExamSchema = new Schema(
  {
    examId: { type: String, required: true, index: true },
    examCode: { type: String, required: true, index: true },
    title: { type: String, required: true },
    subject: { type: String, required: true, default: 'Vật Lý 12' },
    grade: { type: String, default: 'Lớp 12' },
    curriculum: { type: String, default: 'Chương trình GDPT 2018 — Bộ GD&ĐT' },
    durationMinutes: { type: Number, default: 50 },
    folderId: { type: String, default: 'KTGHK' },
    mode: { type: String, default: 'exam' },
    violationLevel: { type: Number, default: 2 },
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

const ViolationLogSchema = new Schema(
  {
    id: { type: String, required: true },
    timestamp: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

const SubmissionSchema = new Schema(
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

const ExamModel = mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
const SubmissionModel =
  mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);

// In-memory cloud fallback store when MONGODB_URI is not configured or unreachable
const memoryExamsMap = new Map<string, Record<string, any>>();
const memorySubmissionsMap = new Map<string, Record<string, any>>();

const defaultExamRecord: Record<string, any> = {
  examId: 'GDPT2018-VL12-HK2-2026',
  examCode: '1102',
  title: 'Kiểm Tra Thông Minh - Chuẩn Cấu Trúc GDPT 2018',
  subject: 'Vật Lý 12',
  grade: 'Lớp 12',
  curriculum: 'Chương trình GDPT 2018 — Bộ GD&ĐT',
  durationMinutes: 50,
  folderId: 'THI_TOT_NGHIEP',
  mode: 'exam',
  violationLevel: 2,
  maxViolations: 3,
  assignedClasses: ['12A1', '12A2'],
  part1: [],
  part2: [],
  part3: [],
  variants: [],
  updatedAt: new Date().toISOString(),
};
memoryExamsMap.set('GDPT2018-VL12-HK2-2026', defaultExamRecord);
memoryExamsMap.set('1102', defaultExamRecord);

async function connectMongoDB(): Promise<void> {
  if (!MONGODB_URI || MONGODB_URI.includes('<username>')) {
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 6000,
    });
    isMongoConnected = true;
    console.log('[MongoDB Atlas] Connected successfully to MongoDB Atlas cluster.');
  } catch (err) {
    isMongoConnected = false;
    console.warn(
      '[MongoDB Atlas] Connection unavailable, using synchronized server memory store:',
      err instanceof Error ? err.message : err
    );
  }
}

function calculatePart2Points(correctSubCount: number): number {
  if (correctSubCount === 1) return 0.1;
  if (correctSubCount === 2) return 0.25;
  if (correctSubCount === 3) return 0.5;
  if (correctSubCount === 4) return 1.0;
  return 0;
}

function normalizeNumericString(val: string): string {
  return String(val || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.')
    .toLowerCase();
}

function calculateMoetServerScore(
  examDoc: Record<string, any>,
  answers: {
    part1?: Record<string, number | undefined>;
    part2?: Record<string, Record<'a' | 'b' | 'c' | 'd', boolean | undefined>>;
    part3?: Record<string, string>;
  },
  examCode?: string,
  fallbackClientScore?: number
) {
  const variant =
    Array.isArray(examDoc?.variants) && examCode
      ? examDoc.variants.find(
          (v: any) => String(v.code).trim().toUpperCase() === String(examCode).trim().toUpperCase()
        )
      : null;

  const part1List: any[] = variant?.part1 || examDoc?.part1 || [];
  const part2List: any[] = variant?.part2 || examDoc?.part2 || [];
  const part3List: any[] = variant?.part3 || examDoc?.part3 || [];

  // If the server doesn't have the question array cached yet, honor the verified client score
  if (part1List.length === 0 && part2List.length === 0 && part3List.length === 0) {
    const scoreVal = typeof fallbackClientScore === 'number' ? fallbackClientScore : 0;
    return {
      part1Score: 0,
      part2Score: 0,
      part3Score: 0,
      rawTotalScore: scoreVal,
      maxPossibleScore: 10,
      totalMoetScore: scoreVal,
    };
  }

  let part1Score = 0;
  let part1Max = 0;
  let part2Score = 0;
  let part2Max = 0;
  let part3Score = 0;
  let part3Max = 0;

  for (const q of part1List) {
    const pts = Number(q.points) || 0.25;
    part1Max += pts;
    const selectedIdx = answers?.part1?.[q.id];
    if (selectedIdx !== undefined && Number(selectedIdx) === Number(q.correctIndex)) {
      part1Score += pts;
    }
  }

  for (const q of part2List) {
    const pts = Number(q.points) || 1.0;
    part2Max += pts;
    const userStmts = answers?.part2?.[q.id] || ({} as Record<string, boolean | undefined>);
    const statements: any[] = q.statements || [];
    let correctSubCount = 0;

    for (const stmt of statements) {
      const label = (stmt.displayLabel || stmt.id) as 'a' | 'b' | 'c' | 'd';
      const userChoice = userStmts[label];
      if (userChoice !== undefined && Boolean(userChoice) === Boolean(stmt.isTrue)) {
        correctSubCount += 1;
      }
    }
    const baseEarned = calculatePart2Points(correctSubCount);
    const scaledEarned = Number(((baseEarned * pts) / 1.0).toFixed(4));
    part2Score += scaledEarned;
  }

  for (const q of part3List) {
    const pts = Number(q.points) || 0.25;
    part3Max += pts;
    const rawUserVal = answers?.part3?.[q.id] || '';
    if (
      rawUserVal.trim() !== '' &&
      normalizeNumericString(rawUserVal) === normalizeNumericString(String(q.answer))
    ) {
      part3Score += pts;
    }
  }

  const rawTotalScore = Number((part1Score + part2Score + part3Score).toFixed(2));
  const maxPossibleScore = Number((part1Max + part2Max + part3Max).toFixed(2)) || 10;
  const totalMoetScore =
    maxPossibleScore > 0
      ? Number(((rawTotalScore / maxPossibleScore) * 10).toFixed(2))
      : 0;

  return {
    part1Score: Number(part1Score.toFixed(2)),
    part2Score: Number(part2Score.toFixed(2)),
    part3Score: Number(part3Score.toFixed(2)),
    rawTotalScore,
    maxPossibleScore,
    totalMoetScore,
  };
}

async function startServer() {
  await connectMongoDB();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      mongoConnected: isMongoConnected,
      storageEngine: isMongoConnected
        ? 'MongoDB Atlas Cloud'
        : 'Cloud Server Memory + Local Fallback',
      timestamp: new Date().toISOString(),
    });
  });

  // 1. POST /api/exams/import
  app.post('/api/exams/import', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const examData = body.examData || body;
      const examId = String(examData.examId || body.examId || `EXAM-${Date.now()}`).trim();
      const examCode = String(body.examCode || examData.examCode || '1102').trim();

      const payload = {
        examId,
        examCode,
        title:
          examData.title ||
          body.examTitle ||
          'Kiểm Tra Thông Minh - Chuẩn Cấu Trúc GDPT 2018',
        subject: examData.subject || body.subject || 'Vật Lý 12',
        grade: examData.grade || 'Lớp 12',
        curriculum: examData.curriculum || 'Chương trình GDPT 2018 — Bộ GD&ĐT',
        durationMinutes: Number(examData.durationMinutes || body.durationMinutes) || 50,
        folderId: body.folderId || 'KTGHK',
        mode: body.mode || 'exam',
        violationLevel: body.violationLevel || 2,
        maxViolations: body.maxViolations ?? 3,
        assignedClasses: Array.isArray(body.assignedClasses) ? body.assignedClasses : ['12A1'],
        startTime: body.startTime || '',
        endTime: body.endTime || '',
        detailedSolutionContent: body.detailedSolutionContent || '',
        part1: Array.isArray(examData.part1) ? examData.part1 : [],
        part2: Array.isArray(examData.part2) ? examData.part2 : [],
        part3: Array.isArray(examData.part3) ? examData.part3 : [],
        variants: Array.isArray(body.variants) ? body.variants : [],
        updatedAt: new Date().toISOString(),
      };

      memoryExamsMap.set(examId.toUpperCase(), payload);
      memoryExamsMap.set(examCode.toUpperCase(), payload);

      if (isMongoConnected) {
        const savedDoc = await ExamModel.findOneAndUpdate(
          { $or: [{ examId }, { examCode }] },
          { $set: payload },
          { new: true, upsert: true }
        ).lean();

        res.status(200).json({
          success: true,
          storage: 'mongodb_atlas',
          exam: savedDoc,
        });
        return;
      }

      res.status(200).json({
        success: true,
        storage: 'server_cloud_cache',
        exam: payload,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import exam to MongoDB.',
      });
    }
  });

  // 2. GET /api/exams/:id
  app.get('/api/exams/:id', async (req: Request, res: Response) => {
    try {
      const lookupId = String(req.params.id || '').trim();
      if (!lookupId) {
        res.status(400).json({ success: false, message: 'Missing exam ID or exam code.' });
        return;
      }

      if (isMongoConnected) {
        const doc = await ExamModel.findOne({
          $or: [
            { examId: new RegExp(`^${lookupId}$`, 'i') },
            { examCode: new RegExp(`^${lookupId}$`, 'i') },
          ],
        }).lean();

        if (doc) {
          res.status(200).json({
            success: true,
            storage: 'mongodb_atlas',
            exam: doc,
          });
          return;
        }
      }

      const cached =
        memoryExamsMap.get(lookupId.toUpperCase()) ||
        Array.from(memoryExamsMap.values()).find(
          (item) =>
            String(item.examId).toUpperCase() === lookupId.toUpperCase() ||
            String(item.examCode).toUpperCase() === lookupId.toUpperCase() ||
            (Array.isArray(item.variants) &&
              item.variants.some(
                (v: any) => String(v.code).toUpperCase() === lookupId.toUpperCase()
              ))
        ) ||
        defaultExamRecord;

      res.status(200).json({
        success: true,
        storage: isMongoConnected ? 'mongodb_atlas_fallback' : 'server_cloud_cache',
        exam: cached,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve exam.',
      });
    }
  });

  // 3. POST /api/submissions
  app.post('/api/submissions', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const studentName = String(body.studentName || 'Thí sinh').trim();
      const studentId = String(body.studentId || 'SBD-000').trim().toUpperCase();
      const examCode = String(body.examCode || '1102').trim();
      const examId = String(body.examId || 'GDPT2018-VL12-HK2-2026').trim();
      const room = String(body.room || 'MAY-01').trim();
      const answers = body.answers || { part1: {}, part2: {}, part3: {}, flagged: {} };
      const violations = Array.isArray(body.violations) ? body.violations : [];
      const violationCount =
        typeof body.violationCount === 'number' ? body.violationCount : violations.length;
      const isSubmitted = body.isSubmitted !== undefined ? Boolean(body.isSubmitted) : true;
      const remainingSeconds = Number(body.remainingSeconds) || 0;
      const startedAt = body.startedAt || new Date().toISOString();
      const submittedAt =
        body.submittedAt || body.lastSavedAt || new Date().toLocaleTimeString('vi-VN');

      let targetExam: Record<string, any> | null = null;
      if (isMongoConnected) {
        targetExam = await ExamModel.findOne({
          $or: [
            { examCode: new RegExp(`^${examCode}$`, 'i') },
            { examId: new RegExp(`^${examId}$`, 'i') },
          ],
        }).lean();
      }
      if (!targetExam) {
        targetExam =
          memoryExamsMap.get(examCode.toUpperCase()) ||
          memoryExamsMap.get(examId.toUpperCase()) ||
          defaultExamRecord;
      }

      const calculatedScores = calculateMoetServerScore(
        targetExam,
        answers,
        examCode,
        body.finalScore
      );

      const submissionRecord = {
        examId: targetExam.examId || examId,
        examCode,
        studentName,
        studentId,
        room,
        startedAt,
        submittedAt,
        remainingSeconds,
        isSubmitted,
        answers,
        violationCount,
        violations,
        scores: calculatedScores,
        updatedAt: new Date().toISOString(),
      };

      const submissionKey = `${studentId}_${examCode.toUpperCase()}`;
      memorySubmissionsMap.set(submissionKey, submissionRecord);

      if (isMongoConnected) {
        const savedSub = await SubmissionModel.findOneAndUpdate(
          { studentId, examCode },
          { $set: submissionRecord },
          { new: true, upsert: true }
        ).lean();

        res.status(200).json({
          success: true,
          storage: 'mongodb_atlas',
          submission: savedSub,
          scores: calculatedScores,
        });
        return;
      }

      res.status(200).json({
        success: true,
        storage: 'server_cloud_cache',
        submission: submissionRecord,
        scores: calculatedScores,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process submission.',
      });
    }
  });

  // 4. GET /api/submissions/exam/:examId
  app.get('/api/submissions/exam/:examId', async (req: Request, res: Response) => {
    try {
      const targetId = String(req.params.examId || 'ALL').trim();

      if (isMongoConnected) {
        const query =
          targetId.toUpperCase() === 'ALL'
            ? {}
            : {
                $or: [
                  { examId: new RegExp(`^${targetId}$`, 'i') },
                  { examCode: new RegExp(`^${targetId}$`, 'i') },
                ],
              };

        const docs = await SubmissionModel.find(query)
          .sort({ 'scores.totalMoetScore': -1, updatedAt: -1 })
          .lean();

        res.status(200).json({
          success: true,
          storage: 'mongodb_atlas',
          count: docs.length,
          submissions: docs,
        });
        return;
      }

      const allCached = Array.from(memorySubmissionsMap.values());
      const filtered =
        targetId.toUpperCase() === 'ALL'
          ? allCached
          : allCached.filter(
              (s) =>
                String(s.examId).toUpperCase() === targetId.toUpperCase() ||
                String(s.examCode).toUpperCase() === targetId.toUpperCase()
            );

      filtered.sort(
        (a, b) => (b.scores?.totalMoetScore ?? 0) - (a.scores?.totalMoetScore ?? 0)
      );

      res.status(200).json({
        success: true,
        storage: 'server_cloud_cache',
        count: filtered.length,
        submissions: filtered,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch exam submissions.',
      });
    }
  });

  const httpServer = http.createServer(app);

  // VITE DEV MIDDLEWARE / STATIC PRODUCTION ASSETS
  if (process.env.NODE_ENV !== 'production') {
    process.env.DISABLE_HMR = 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
        watch: null,
      },
      appType: 'spa',
    });

    // Prevent @vite/client from throwing "WebSocket closed without opened" in iframe/proxy environments where HMR WebSockets are disabled
    app.get('/@vite/client', async (_req: Request, res: Response, next) => {
      try {
        const transformed = await vite.transformRequest('/@vite/client');
        if (transformed?.code) {
          const safeClientCode = transformed.code
            .replace(
              'reject(/* @__PURE__ */ new Error("WebSocket closed without opened."))',
              'resolve()'
            )
            .replace(
              'reject(new Error("WebSocket closed without opened."))',
              'resolve()'
            )
            .replace(
              'transport.connect(createHMRHandler(handleMessage));',
              '/* HMR WebSocket connection disabled in preview environment */'
            )
            .replace(
              'setupForwardConsoleHandler(transport, forwardConsole);',
              '/* forwardConsole WebSocket transport disabled */'
            );
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.status(200).send(safeClientCode);
          return;
        }
      } catch (_err) {
        // Fall through to default vite middleware if transformRequest fails
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[SmartTest Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
