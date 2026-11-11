export interface Part1Question {
  id: string;
  topic: string;
  question: string;
  options: [string, string, string, string]; // A, B, C, D text (without 'A. ' prefix)
  correctIndex: number; // 0 = A, 1 = B, 2 = C, 3 = D
  correct_answer?: 'A' | 'B' | 'C' | 'D';
  points: number; // Default 0.25
  explanation: string;
  has_image?: boolean;
  image_url?: string;
}

export interface Part2SubStatement {
  id: string; // 'a' | 'b' | 'c' | 'd'
  text: string;
  isTrue: boolean;
  is_correct?: boolean;
  explanation?: string;
}

export interface Part2Question {
  id: string;
  topic: string;
  stem: string;
  statements: [Part2SubStatement, Part2SubStatement, Part2SubStatement, Part2SubStatement];
  points: number; // Default 1.00 max (0.10 / 0.25 / 0.50 / 1.00)
  explanation: string;
  has_image?: boolean;
  image_url?: string;
}

export interface Part3Question {
  id: string;
  topic: string;
  question: string;
  unit?: string;
  answer: string; // Numeric string e.g. "2,5" or "2.5" or "150"
  correct_value?: string;
  points: number; // Default 0.25
  explanation: string;
  has_image?: boolean;
  image_url?: string;
}

export interface ExamData {
  examId: string;
  title: string;
  subject: string;
  grade: string;
  curriculum: string;
  durationMinutes: number;
  part1: Part1Question[];
  part2: Part2Question[];
  part3: Part3Question[];
}

export interface ScrambledPart1Question extends Part1Question {
  originalQuestionNumber: number;
  displayNumber: number; // 1..18
  optionPermutation: number[]; // maps display index -> original index
}

export interface ScrambledPart2Statement extends Part2SubStatement {
  displayLabel: 'a' | 'b' | 'c' | 'd';
  originalLabel: string;
  is_correct?: boolean;
}

export interface ScrambledPart2Question extends Omit<Part2Question, 'statements'> {
  originalQuestionNumber: number;
  displayNumber: number; // 1..4 (or 19..22 when continuous numbering is enabled)
  statements: [
    ScrambledPart2Statement,
    ScrambledPart2Statement,
    ScrambledPart2Statement,
    ScrambledPart2Statement
  ];
}

export interface ScrambledPart3Question extends Part3Question {
  originalQuestionNumber: number;
  displayNumber: number; // 1..6 (or 23..28 when continuous numbering is enabled)
}

export interface ScrambledVariantAdminHeader {
  governingBody: string;
  schoolName: string;
  examTerm: string;
  subjectName: string;
  schoolYear?: string;
  durationMinutes: number;
  restartIndexPerPart: boolean;
  questionLabel: string;
  questionSeparator: string;
  optionsInTable?: boolean;
  shuffleClusterQuestions?: boolean;
  clusterRangesText?: string;
}

export interface ScrambledExamVariant {
  code: string; // e.g., "1102", "1104", "1106", "1108" or "101".."104"
  createdAt: string;
  durationMinutes: number;
  title: string;
  subject: string;
  adminHeader?: ScrambledVariantAdminHeader;
  part1: ScrambledPart1Question[];
  part2: ScrambledPart2Question[];
  part3: ScrambledPart3Question[];
}

export interface ViolationEvent {
  id: string;
  timestamp: string;
  type: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'SHORTCUT_BLOCKED' | 'COPY_PASTE_ATTEMPT';
  description: string;
}

export interface StudentAnswersState {
  // Part I keyed by question.id -> selected option index (0..3)
  part1: Record<string, number | undefined>;
  // Part II keyed by question.id -> { a: boolean | undefined, b: boolean | undefined, c: boolean | undefined, d: boolean | undefined }
  part2: Record<string, Record<'a' | 'b' | 'c' | 'd', boolean | undefined>>;
  // Part III keyed by question.id -> numeric string
  part3: Record<string, string>;
  // Flagged questions keyed by global matrix number (1..28)
  flagged: Record<number, boolean>;
}

export interface SavedExamSession {
  studentName: string;
  studentId: string; // SBD
  examCode: string;
  startedAt: string;
  lastSavedAt: string;
  remainingSeconds: number;
  isSubmitted: boolean;
  submittedAt?: string;
  answers: StudentAnswersState;
  violations: ViolationEvent[];
  finalScore?: number;
}

export interface QuestionGradeDetail {
  globalNumber: number;
  part: 'I' | 'II' | 'III';
  partQuestionNumber: number;
  questionId: string;
  earnedPoints: number;
  maxPoints: number;
  status: 'CORRECT' | 'PARTIAL' | 'INCORRECT' | 'UNANSWERED';
  userAnswerSummary: string;
  correctAnswerSummary: string;
  subDetails?: {
    label: 'a' | 'b' | 'c' | 'd';
    text: string;
    userChoice?: boolean;
    correctChoice: boolean;
    isCorrect: boolean;
  }[];
  explanation: string;
  questionText: string;
  has_image?: boolean;
  image_url?: string;
}

export interface ExamGradeReport {
  rawTotalScore: number;
  maxPossibleScore: number;
  scaled10Score: number;
  part1Score: number;
  part1Max: number;
  part1CorrectCount: number;
  part2Score: number;
  part2Max: number;
  part2FullCorrectCount: number;
  part3Score: number;
  part3Max: number;
  part3CorrectCount: number;
  answeredCount: number;
  totalQuestionCount: number;
  details: QuestionGradeDetail[];
}

export interface WorkstationNode {
  workstationId: string; // e.g., "MAY-01"
  ipAddress: string;
  studentName: string;
  studentId: string; // SBD
  examCode: string;
  status: 'ACTIVE' | 'SUBMITTED' | 'VIOLATION_WARN' | 'DISCONNECTED';
  answeredCount: number;
  totalQuestions: number;
  remainingSeconds: number;
  violationCount: number;
  lastEventText: string;
  score?: number;
  isLiveBrowserUser?: boolean;
}

export type ViolationEnforcementLevel = 1 | 2 | 3; // Mức 1: 1 lần, Mức 2: 3 lần, Mức 3: 4 lần

export interface OnlineExamAssignment {
  id: string;
  examCode: string;
  examLink: string;
  examTitle: string;
  subject: string;
  assignedClasses: string[];
  startTime: string; // YYYY-MM-DDTHH:mm
  endTime: string;   // YYYY-MM-DDTHH:mm
  durationMinutes: number;
  mode: 'exam' | 'practice'; // 'exam' = Chế độ kiểm tra (thu bài cưỡng chế), 'practice' = Chế độ ôn tập (không thu bài cưỡng chế)
  violationLevel: ViolationEnforcementLevel; // 1 -> 1 lần, 2 -> 3 lần, 3 -> 4 lần
  maxViolations: number; // 1 | 3 | 4 (or 0 when mode === 'practice')
  sourceMode: 'bank' | 'upload_with_solution';
  sourceBankExamId?: string;
  detailedSolutionFileName?: string;
  detailedSolutionContent?: string;
  examData: ExamData;
  createdAt: string;
}

