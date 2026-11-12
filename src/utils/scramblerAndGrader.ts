import {
  ExamData,
  ExamGradeReport,
  QuestionGradeDetail,
  ScrambledExamVariant,
  ScrambledPart1Question,
  ScrambledPart2Question,
  ScrambledPart2Statement,
  ScrambledPart3Question,
  ScrambledVariantAdminHeader,
  StudentAnswersState,
} from '../types/exam';
import { getResolvedQuestionImage } from './examDocumentParser';

export interface ScramblerGenerationOptions {
  restartIndexPerPart?: boolean;
  shuffleClusterQuestions?: boolean;
  clusterRangesText?: string;
  adminHeader?: ScrambledVariantAdminHeader;
}

// Seeded PRNG (Mulberry32) so scrambling with a seed + code produces clean, distinct permutations
function createSeededRandom(seedString: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedString.length; i++) {
    h ^= seedString.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(items: T[], rng: () => number): { item: T; originalIndex: number }[] {
  const wrapped = items.map((item, idx) => ({ item, originalIndex: idx }));
  for (let i = wrapped.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = wrapped[i];
    wrapped[i] = wrapped[j];
    wrapped[j] = temp;
  }
  return wrapped;
}

/**
 * Shuffle questions while keeping clustered questions (câu hỏi chùm) contiguous as a group,
 * and shuffling the questions within each cluster.
 * Supports explicit ranges like "1-3, 5-6" OR automatic detection via <nhóm> / shared stem prefix.
 */
function shuffleQuestionsWithClusters<T extends { question?: string; topic?: string }>(
  items: T[],
  rng: () => number,
  enabled?: boolean,
  clusterRangesText?: string
): { item: T; originalIndex: number }[] {
  if (!enabled || items.length <= 1) {
    return shuffleWithRng(items, rng);
  }

  // Parse explicit 1-based ranges like "1-3, 5-6"
  const indexToClusterId = new Map<number, string>();
  if (clusterRangesText && clusterRangesText.trim()) {
    const parts = clusterRangesText.split(/[,;]+/);
    parts.forEach((part, pIdx) => {
      const m = part.trim().match(/^(\d+)\s*[-–:]\s*(\d+)$/);
      if (m) {
        const start = Math.max(1, parseInt(m[1], 10));
        const end = Math.min(items.length, parseInt(m[2], 10));
        if (start <= end) {
          for (let qNum = start; qNum <= end; qNum++) {
            indexToClusterId.set(qNum - 1, `RANGE_${pIdx}`);
          }
        }
      }
    });
  }

  // Also detect <nhóm ...> tags or "[Chùm X]" in question text if no explicit range matched
  items.forEach((item, idx) => {
    if (indexToClusterId.has(idx)) return;
    const qText = item.question || '';
    const tagMatch =
      qText.match(/<\s*nhóm\s*([^>]*)>/i) ||
      qText.match(/\[\s*(?:Chùm|Nhóm)\s*([^\]]+)\]/i);
    if (tagMatch) {
      indexToClusterId.set(idx, `TAG_${(tagMatch[1] || '1').trim().toUpperCase()}`);
    }
  });

  if (indexToClusterId.size === 0) {
    return shuffleWithRng(items, rng);
  }

  // Group items into blocks (each cluster is a multi-item block; non-clustered items are 1-item blocks)
  const blocks: { item: T; originalIndex: number }[][] = [];
  const clusterMap = new Map<string, { item: T; originalIndex: number }[]>();

  items.forEach((item, idx) => {
    const cid = indexToClusterId.get(idx);
    if (!cid) {
      blocks.push([{ item, originalIndex: idx }]);
    } else {
      let existing = clusterMap.get(cid);
      if (!existing) {
        existing = [];
        clusterMap.set(cid, existing);
        blocks.push(existing);
      }
      existing.push({ item, originalIndex: idx });
    }
  });

  // Shuffle questions inside each multi-question cluster, then shuffle the blocks
  const shuffledBlocks = shuffleWithRng(blocks, rng).map(({ item: block }) => {
    if (block.length <= 1) return block;
    return shuffleWithRng(block, rng).map((w) => w.item);
  });

  return shuffledBlocks.flat();
}

export function generateScrambledVariant(
  exam: ExamData,
  code: string,
  salt: string = 'GDPT2018',
  options?: ScramblerGenerationOptions
): ScrambledExamVariant {
  const restartIndexPerPart = options?.restartIndexPerPart ?? options?.adminHeader?.restartIndexPerPart ?? true;
  const shuffleClusters =
    options?.shuffleClusterQuestions ?? options?.adminHeader?.shuffleClusterQuestions ?? false;
  const clusterRanges =
    options?.clusterRangesText ?? options?.adminHeader?.clusterRangesText ?? '';
  const rng = createSeededRandom(`${exam.examId}-${code}-${salt}`);

  // Part I: Permute the sequence of the 18 questions (supporting cluster grouping) + permute 4 answer choices (A, B, C, D)
  const optionLetterMap: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const shuffledPart1 = shuffleQuestionsWithClusters(
    exam.part1,
    rng,
    shuffleClusters,
    clusterRanges
  );
  const part1: ScrambledPart1Question[] = shuffledPart1.map(({ item, originalIndex }, displayIdx) => {
    const shuffledOptions = shuffleWithRng([...item.options], rng);
    const newOptions: [string, string, string, string] = [
      shuffledOptions[0].item,
      shuffledOptions[1].item,
      shuffledOptions[2].item,
      shuffledOptions[3].item,
    ];
    const resolvedOriginalCorrect =
      item.correctIndex !== undefined
        ? item.correctIndex
        : item.correct_answer
        ? optionLetterMap.indexOf(item.correct_answer)
        : 0;
    const newCorrectIndex = shuffledOptions.findIndex(
      (o) => o.originalIndex === (resolvedOriginalCorrect >= 0 ? resolvedOriginalCorrect : 0)
    );
    const safeCorrectIdx = newCorrectIndex >= 0 ? newCorrectIndex : 0;

    const resolvedImageUrl = getResolvedQuestionImage(item, 'I', originalIndex + 1);
    const cleanQuestionText = item.question.replace(/@@IMAGE_TOKEN:[\s\S]*?@@/g, '').trim();

    return {
      ...item,
      question: cleanQuestionText,
      options: newOptions,
      correctIndex: safeCorrectIdx,
      correct_answer: optionLetterMap[safeCorrectIdx],
      originalQuestionNumber: originalIndex + 1,
      displayNumber: displayIdx + 1,
      optionPermutation: shuffledOptions.map((o) => o.originalIndex),
      has_image: Boolean(resolvedImageUrl),
      image_url: resolvedImageUrl,
    };
  });

  // Part II: Permute the sequence of the 4 parent questions + permute order of 4 sub-items (a, b, c, d) while keeping truth values
  const labels: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];
  const shuffledPart2 = shuffleWithRng(exam.part2, rng);
  const part2: ScrambledPart2Question[] = shuffledPart2.map(({ item, originalIndex }, displayIdx) => {
    const shuffledStmts = shuffleWithRng([...item.statements], rng);
    const newStatements = shuffledStmts.map((entry, idx) => {
      const truthVal = entry.item.is_correct !== undefined ? Boolean(entry.item.is_correct) : Boolean(entry.item.isTrue);
      return {
        ...entry.item,
        id: labels[idx],
        displayLabel: labels[idx],
        originalLabel: entry.item.id,
        isTrue: truthVal,
        is_correct: truthVal,
      };
    }) as [
      ScrambledPart2Statement,
      ScrambledPart2Statement,
      ScrambledPart2Statement,
      ScrambledPart2Statement
    ];

    const resolvedImageUrl = getResolvedQuestionImage(item, 'II', originalIndex + 1);
    const cleanStemText = item.stem.replace(/@@IMAGE_TOKEN:[\s\S]*?@@/g, '').trim();

    return {
      ...item,
      stem: cleanStemText,
      originalQuestionNumber: originalIndex + 1,
      displayNumber: restartIndexPerPart ? displayIdx + 1 : part1.length + displayIdx + 1,
      statements: newStatements,
      has_image: Boolean(resolvedImageUrl),
      image_url: resolvedImageUrl,
    };
  });

  // Part III: Permute the sequence of the 6 questions (numeric answers & tolerances remain unchanged)
  const shuffledPart3 = shuffleWithRng(exam.part3, rng);
  const part3: ScrambledPart3Question[] = shuffledPart3.map(({ item, originalIndex }, displayIdx) => {
    const cleanVal = (item.correct_value ?? item.answer ?? '').trim();
    const resolvedImageUrl = getResolvedQuestionImage(item, 'III', originalIndex + 1);
    const cleanQuestionText = item.question.replace(/@@IMAGE_TOKEN:[\s\S]*?@@/g, '').trim();

    return {
      ...item,
      question: cleanQuestionText,
      answer: cleanVal,
      correct_value: cleanVal,
      originalQuestionNumber: originalIndex + 1,
      displayNumber: restartIndexPerPart
        ? displayIdx + 1
        : part1.length + part2.length + displayIdx + 1,
      has_image: Boolean(resolvedImageUrl),
      image_url: resolvedImageUrl,
    };
  });

  const effectiveDuration = options?.adminHeader?.durationMinutes || exam.durationMinutes;
  const effectiveSubject = options?.adminHeader?.subjectName || exam.subject;
  const effectiveTitle = options?.adminHeader
    ? `${options.adminHeader.examTerm} — ${options.adminHeader.subjectName}`
    : exam.title;

  return {
    code,
    createdAt: new Date().toISOString(),
    durationMinutes: effectiveDuration,
    title: effectiveTitle,
    subject: effectiveSubject,
    adminHeader: options?.adminHeader,
    part1,
    part2,
    part3,
  };
}

export function generateMultipleVariants(
  exam: ExamData,
  codes: string[] = ['101', '102', '103', '104'],
  salt: string = 'GDPT2018-V1',
  options?: ScramblerGenerationOptions
): ScrambledExamVariant[] {
  return codes.map((code, index) =>
    generateScrambledVariant(exam, code, `${salt}-IDX${index}`, options)
  );
}

/**
 * Randomly shuffles the order of questions within each part (Part I, Part II, Part III)
 * and the order of answers/statements within each question (keeping Part I -> Part II -> Part III order intact).
 * Used in "Chế độ kiểm tra" (exam mode) so students sitting next to each other never have identical exams.
 */
export function shuffleVariantForStudent(
  baseVariant: ScrambledExamVariant,
  studentSeed: string
): ScrambledExamVariant {
  if (!baseVariant) return baseVariant;
  const rng = createSeededRandom(`STUDENT-EXAM-SHUFFLE-${baseVariant.code}-${studentSeed}`);
  const optionLetters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const stmtLabels: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];

  // 1. Shuffle Part I questions and shuffle 4 options (A, B, C, D) inside each question
  const shuffledP1 = shuffleWithRng(baseVariant.part1, rng).map(({ item }, displayIdx) => {
    const currentCorrectIdx =
      item.correctIndex !== undefined && item.correctIndex >= 0 ? item.correctIndex : 0;
    const wrappedOpts = shuffleWithRng([...item.options], rng);
    const nextOptions: [string, string, string, string] = [
      wrappedOpts[0].item,
      wrappedOpts[1].item,
      wrappedOpts[2].item,
      wrappedOpts[3].item,
    ];
    const nextCorrectIdx = wrappedOpts.findIndex((o) => o.originalIndex === currentCorrectIdx);
    const safeCorrectIdx = nextCorrectIdx >= 0 ? nextCorrectIdx : 0;
    const prevPerm = item.optionPermutation || [0, 1, 2, 3];
    const nextPerm = wrappedOpts.map((o) => prevPerm[o.originalIndex] ?? o.originalIndex);

    return {
      ...item,
      displayNumber: displayIdx + 1,
      options: nextOptions,
      correctIndex: safeCorrectIdx,
      correct_answer: optionLetters[safeCorrectIdx],
      optionPermutation: nextPerm,
    };
  });

  // 2. Shuffle Part II questions and shuffle 4 sub-statements (a, b, c, d) inside each question
  const shuffledP2 = shuffleWithRng(baseVariant.part2, rng).map(({ item }, displayIdx) => {
    const wrappedStmts = shuffleWithRng([...item.statements], rng);
    const nextStatements = wrappedStmts.map((entry, sIdx) => {
      const truthVal =
        entry.item.is_correct !== undefined
          ? Boolean(entry.item.is_correct)
          : Boolean(entry.item.isTrue);
      return {
        ...entry.item,
        id: stmtLabels[sIdx],
        displayLabel: stmtLabels[sIdx],
        originalLabel: entry.item.originalLabel || entry.item.id,
        isTrue: truthVal,
        is_correct: truthVal,
      };
    }) as [
      ScrambledPart2Statement,
      ScrambledPart2Statement,
      ScrambledPart2Statement,
      ScrambledPart2Statement
    ];

    return {
      ...item,
      displayNumber: displayIdx + 1,
      statements: nextStatements,
    };
  });

  // 3. Shuffle Part III questions
  const shuffledP3 = shuffleWithRng(baseVariant.part3, rng).map(({ item }, displayIdx) => ({
    ...item,
    displayNumber: displayIdx + 1,
  }));

  return {
    ...baseVariant,
    part1: shuffledP1,
    part2: shuffledP2,
    part3: shuffledP3,
  };
}

/**
 * Restores the exact original, unshuffled question order and answer option order
 * for "Chế độ ôn tập" (practice mode).
 */
export function restoreUnshuffledVariant(
  baseVariant: ScrambledExamVariant,
  sourceExam?: ExamData
): ScrambledExamVariant {
  if (!baseVariant) return baseVariant;
  const optionLetters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const stmtLabels: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];

  if (sourceExam && sourceExam.part1 && sourceExam.part2 && sourceExam.part3) {
    const part1: ScrambledPart1Question[] = sourceExam.part1.map((item, idx) => {
      const resolvedCorrect =
        item.correctIndex !== undefined
          ? item.correctIndex
          : item.correct_answer
          ? optionLetters.indexOf(item.correct_answer)
          : 0;
      const safeCorrect = resolvedCorrect >= 0 ? resolvedCorrect : 0;
      const resolvedImageUrl = getResolvedQuestionImage(item, 'I', idx + 1);
      const cleanQuestionText = item.question.replace(/@@IMAGE_TOKEN:[\s\S]*?@@/g, '').trim();
      return {
        ...item,
        question: cleanQuestionText,
        options: [...item.options] as [string, string, string, string],
        correctIndex: safeCorrect,
        correct_answer: optionLetters[safeCorrect],
        originalQuestionNumber: idx + 1,
        displayNumber: idx + 1,
        optionPermutation: [0, 1, 2, 3],
        has_image: Boolean(resolvedImageUrl),
        image_url: resolvedImageUrl,
      };
    });

    const part2: ScrambledPart2Question[] = sourceExam.part2.map((item, idx) => {
      const resolvedImageUrl = getResolvedQuestionImage(item, 'II', idx + 1);
      const cleanStemText = item.stem.replace(/@@IMAGE_TOKEN:[\s\S]*?@@/g, '').trim();
      const statements = item.statements.map((st, sIdx) => {
        const truthVal =
          st.is_correct !== undefined ? Boolean(st.is_correct) : Boolean(st.isTrue);
        return {
          ...st,
          id: stmtLabels[sIdx],
          displayLabel: stmtLabels[sIdx],
          originalLabel: stmtLabels[sIdx],
          isTrue: truthVal,
          is_correct: truthVal,
        };
      }) as [
        ScrambledPart2Statement,
        ScrambledPart2Statement,
        ScrambledPart2Statement,
        ScrambledPart2Statement
      ];
      return {
        ...item,
        stem: cleanStemText,
        originalQuestionNumber: idx + 1,
        displayNumber: idx + 1,
        statements,
        has_image: Boolean(resolvedImageUrl),
        image_url: resolvedImageUrl,
      };
    });

    const part3: ScrambledPart3Question[] = sourceExam.part3.map((item, idx) => {
      const cleanVal = (item.correct_value ?? item.answer ?? '').trim();
      const resolvedImageUrl = getResolvedQuestionImage(item, 'III', idx + 1);
      const cleanQuestionText = item.question.replace(/@@IMAGE_TOKEN:[\s\S]*?@@/g, '').trim();
      return {
        ...item,
        question: cleanQuestionText,
        answer: cleanVal,
        correct_value: cleanVal,
        originalQuestionNumber: idx + 1,
        displayNumber: idx + 1,
        has_image: Boolean(resolvedImageUrl),
        image_url: resolvedImageUrl,
      };
    });

    return {
      ...baseVariant,
      part1,
      part2,
      part3,
    };
  }

  // Fallback: unshuffle directly from baseVariant's originalQuestionNumber & optionPermutation / originalLabel
  const unshuffledP1 = [...baseVariant.part1]
    .sort((a, b) => (a.originalQuestionNumber || 0) - (b.originalQuestionNumber || 0))
    .map((q, idx) => {
      if (Array.isArray(q.optionPermutation) && q.optionPermutation.length === 4) {
        const restoredOpts: [string, string, string, string] = ['', '', '', ''];
        let restoredCorrect = 0;
        q.optionPermutation.forEach((origOptIdx, shuffledIdx) => {
          if (origOptIdx >= 0 && origOptIdx < 4) {
            restoredOpts[origOptIdx] = q.options[shuffledIdx];
            if (shuffledIdx === q.correctIndex) {
              restoredCorrect = origOptIdx;
            }
          }
        });
        return {
          ...q,
          displayNumber: idx + 1,
          options: restoredOpts,
          correctIndex: restoredCorrect,
          correct_answer: optionLetters[restoredCorrect],
          optionPermutation: [0, 1, 2, 3],
        };
      }
      return { ...q, displayNumber: idx + 1 };
    });

  const unshuffledP2 = [...baseVariant.part2]
    .sort((a, b) => (a.originalQuestionNumber || 0) - (b.originalQuestionNumber || 0))
    .map((q, idx) => {
      const sortedStmts = [...q.statements]
        .sort((s1, s2) => {
          const l1 = s1.originalLabel || s1.displayLabel;
          const l2 = s2.originalLabel || s2.displayLabel;
          return l1.localeCompare(l2);
        })
        .map((st, sIdx) => ({
          ...st,
          id: stmtLabels[sIdx],
          displayLabel: stmtLabels[sIdx],
        })) as [
        ScrambledPart2Statement,
        ScrambledPart2Statement,
        ScrambledPart2Statement,
        ScrambledPart2Statement
      ];
      return {
        ...q,
        displayNumber: idx + 1,
        statements: sortedStmts,
      };
    });

  const unshuffledP3 = [...baseVariant.part3]
    .sort((a, b) => (a.originalQuestionNumber || 0) - (b.originalQuestionNumber || 0))
    .map((q, idx) => ({
      ...q,
      displayNumber: idx + 1,
    }));

  return {
    ...baseVariant,
    part1: unshuffledP1,
    part2: unshuffledP2,
    part3: unshuffledP3,
  };
}

export function normalizeShortAnswer(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/\s+/g, '')
    .replace(/,/g, '.');
}

export function isShortAnswerMatch(userRaw: string | undefined, keyRaw: string): boolean {
  const normUser = normalizeShortAnswer(userRaw);
  const normKey = normalizeShortAnswer(keyRaw);
  if (!normUser || !normKey) return false;
  if (normUser.toLowerCase() === normKey.toLowerCase()) return true;

  const numUser = Number(normUser);
  const numKey = Number(normKey);
  if (!Number.isNaN(numUser) && !Number.isNaN(numKey)) {
    return Math.abs(numUser - numKey) <= 1e-4;
  }
  return false;
}

/**
 * Official Vietnamese MOET (GDPT 2018) Grading Engine:
 * - Part I: +0.25 pt per correct answer (or custom question.points)
 * - Part II: Per question (4 sub-items a, b, c, d):
 *     * 1 sub-item correct = 0.10 pt
 *     * 2 sub-items correct = 0.25 pt
 *     * 3 sub-items correct = 0.50 pt
 *     * 4 sub-items correct = 1.00 pt
 * - Part III: +0.25 pt per matching numerical short answer
 */
export function calculatePart2Points(correctSubItemsCount: number, maxPoints: number = 1.0): number {
  const scale = maxPoints / 1.0;
  switch (correctSubItemsCount) {
    case 1:
      return Number((0.1 * scale).toFixed(4));
    case 2:
      return Number((0.25 * scale).toFixed(4));
    case 3:
      return Number((0.5 * scale).toFixed(4));
    case 4:
      return Number((1.0 * scale).toFixed(4));
    default:
      return 0;
  }
}

export function gradeStudentExam(
  variant: ScrambledExamVariant,
  answers: StudentAnswersState
): ExamGradeReport {
  const details: QuestionGradeDetail[] = [];
  const optionLetters = ['A', 'B', 'C', 'D'];

  let part1Score = 0;
  let part1Max = 0;
  let part1CorrectCount = 0;

  let part2Score = 0;
  let part2Max = 0;
  let part2FullCorrectCount = 0;

  let part3Score = 0;
  let part3Max = 0;
  let part3CorrectCount = 0;

  let answeredCount = 0;
  let globalNumber = 1;

  // Evaluate Part I
  for (const q of variant.part1) {
    const qMax = q.points || 0.25;
    part1Max += qMax;
    const selectedIdx = answers.part1[q.id];
    const isAnswered = selectedIdx !== undefined && selectedIdx !== null;
    if (isAnswered) answeredCount++;

    const isCorrect = isAnswered && selectedIdx === q.correctIndex;
    const earned = isCorrect ? qMax : 0;
    if (isCorrect) {
      part1Score += earned;
      part1CorrectCount++;
    }

    const p1ImgUrl = getResolvedQuestionImage(q, 'I', q.originalQuestionNumber);
    details.push({
      globalNumber: globalNumber++,
      part: 'I',
      partQuestionNumber: q.displayNumber,
      questionId: q.id,
      earnedPoints: earned,
      maxPoints: qMax,
      status: !isAnswered ? 'UNANSWERED' : isCorrect ? 'CORRECT' : 'INCORRECT',
      userAnswerSummary: isAnswered ? `Chọn ${optionLetters[selectedIdx]}` : 'Chưa chọn',
      correctAnswerSummary: `Đáp án ${optionLetters[q.correctIndex]}`,
      explanation: q.explanation,
      questionText: q.question,
      has_image: Boolean(p1ImgUrl),
      image_url: p1ImgUrl,
    });
  }

  // Evaluate Part II
  for (const q of variant.part2) {
    const qMax = q.points || 1.0;
    part2Max += qMax;
    const userMap = answers.part2[q.id] || { a: undefined, b: undefined, c: undefined, d: undefined };

    let correctSubCount = 0;
    let answeredSubCount = 0;

    const subDetails = q.statements.map((stmt) => {
      const userChoice = userMap[stmt.displayLabel];
      if (userChoice !== undefined) {
        answeredSubCount++;
      }
      const isSubCorrect = userChoice !== undefined && userChoice === stmt.isTrue;
      if (isSubCorrect) {
        correctSubCount++;
      }
      return {
        label: stmt.displayLabel,
        text: stmt.text,
        userChoice,
        correctChoice: stmt.isTrue,
        isCorrect: isSubCorrect,
      };
    });

    if (answeredSubCount > 0) answeredCount++;

    const earned = calculatePart2Points(correctSubCount, qMax);
    part2Score += earned;
    if (correctSubCount === 4) {
      part2FullCorrectCount++;
    }

    let status: QuestionGradeDetail['status'] = 'INCORRECT';
    if (answeredSubCount === 0) status = 'UNANSWERED';
    else if (correctSubCount === 4) status = 'CORRECT';
    else if (correctSubCount > 0) status = 'PARTIAL';

    const userSummary = q.statements
      .map((s) => {
        const val = userMap[s.displayLabel];
        return `${s.displayLabel})${val === undefined ? '?' : val ? 'Đ' : 'S'}`;
      })
      .join(' · ');

    const correctSummary = q.statements
      .map((s) => `${s.displayLabel})${s.isTrue ? 'Đ' : 'S'}`)
      .join(' · ');

    const p2ImgUrl = getResolvedQuestionImage(q, 'II', q.originalQuestionNumber);
    details.push({
      globalNumber: globalNumber++,
      part: 'II',
      partQuestionNumber: q.displayNumber,
      questionId: q.id,
      earnedPoints: earned,
      maxPoints: qMax,
      status,
      userAnswerSummary: `${userSummary} (${correctSubCount}/4 ý đúng)`,
      correctAnswerSummary: correctSummary,
      subDetails,
      explanation: q.explanation,
      questionText: q.stem,
      has_image: Boolean(p2ImgUrl),
      image_url: p2ImgUrl,
    });
  }

  // Evaluate Part III
  for (const q of variant.part3) {
    const qMax = q.points || 0.25;
    part3Max += qMax;
    const rawUser = answers.part3[q.id] ?? '';
    const isAnswered = rawUser.trim().length > 0;
    if (isAnswered) answeredCount++;

    const isCorrect = isShortAnswerMatch(rawUser, q.answer);
    const earned = isCorrect ? qMax : 0;
    if (isCorrect) {
      part3Score += earned;
      part3CorrectCount++;
    }

    const p3ImgUrl = getResolvedQuestionImage(q, 'III', q.originalQuestionNumber);
    details.push({
      globalNumber: globalNumber++,
      part: 'III',
      partQuestionNumber: q.displayNumber,
      questionId: q.id,
      earnedPoints: earned,
      maxPoints: qMax,
      status: !isAnswered ? 'UNANSWERED' : isCorrect ? 'CORRECT' : 'INCORRECT',
      userAnswerSummary: isAnswered ? rawUser.trim() : 'Bỏ trống',
      correctAnswerSummary: `${q.answer}${q.unit ? ` (${q.unit})` : ''}`,
      explanation: q.explanation,
      questionText: q.question,
      has_image: Boolean(p3ImgUrl),
      image_url: p3ImgUrl,
    });
  }

  const rawTotalScore = Number((part1Score + part2Score + part3Score).toFixed(2));
  const maxPossibleScore = Number((part1Max + part2Max + part3Max).toFixed(2));
  const scaled10Score =
    maxPossibleScore > 0 ? Number(((rawTotalScore / maxPossibleScore) * 10).toFixed(2)) : 0;

  return {
    rawTotalScore,
    maxPossibleScore,
    scaled10Score,
    part1Score: Number(part1Score.toFixed(2)),
    part1Max: Number(part1Max.toFixed(2)),
    part1CorrectCount,
    part2Score: Number(part2Score.toFixed(2)),
    part2Max: Number(part2Max.toFixed(2)),
    part2FullCorrectCount,
    part3Score: Number(part3Score.toFixed(2)),
    part3Max: Number(part3Max.toFixed(2)),
    part3CorrectCount,
    answeredCount,
    totalQuestionCount: variant.part1.length + variant.part2.length + variant.part3.length,
    details,
  };
}

export function countCompletedQuestions(
  variant: ScrambledExamVariant,
  answers: StudentAnswersState
): number {
  let count = 0;
  for (const q of variant.part1) {
    if (answers.part1[q.id] !== undefined) count++;
  }
  for (const q of variant.part2) {
    const m = answers.part2[q.id];
    if (m && (m.a !== undefined || m.b !== undefined || m.c !== undefined || m.d !== undefined)) {
      count++;
    }
  }
  for (const q of variant.part3) {
    if ((answers.part3[q.id] || '').trim().length > 0) count++;
  }
  return count;
}

export function isQuestionFullyCompleted(
  variant: ScrambledExamVariant,
  answers: StudentAnswersState,
  globalIndex: number // 1-based
): boolean {
  const p1Len = variant.part1.length;
  const p2Len = variant.part2.length;

  if (globalIndex <= p1Len) {
    const q = variant.part1[globalIndex - 1];
    return q ? answers.part1[q.id] !== undefined : false;
  }
  if (globalIndex <= p1Len + p2Len) {
    const q = variant.part2[globalIndex - p1Len - 1];
    if (!q) return false;
    const m = answers.part2[q.id];
    return Boolean(
      m && m.a !== undefined && m.b !== undefined && m.c !== undefined && m.d !== undefined
    );
  }
  const q = variant.part3[globalIndex - p1Len - p2Len - 1];
  return q ? (answers.part3[q.id] || '').trim().length > 0 : false;
}

export function isQuestionPartiallyCompleted(
  variant: ScrambledExamVariant,
  answers: StudentAnswersState,
  globalIndex: number
): boolean {
  const p1Len = variant.part1.length;
  const p2Len = variant.part2.length;
  if (globalIndex > p1Len && globalIndex <= p1Len + p2Len) {
    const q = variant.part2[globalIndex - p1Len - 1];
    if (!q) return false;
    const m = answers.part2[q.id];
    if (!m) return false;
    const answeredSub = [m.a, m.b, m.c, m.d].filter((v) => v !== undefined).length;
    return answeredSub > 0 && answeredSub < 4;
  }
  return false;
}
