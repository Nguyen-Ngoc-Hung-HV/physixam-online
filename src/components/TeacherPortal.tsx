import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderArchive,
  FolderPlus,
  Home,
  KeyRound,
  Layers,
  Monitor,
  Play,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Shuffle,
  Sliders,
  Sparkles,
  Table,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  ExamData,
  OnlineExamAssignment,
  SavedExamSession,
  ScrambledExamVariant,
  ViolationEnforcementLevel,
  WorkstationNode,
} from '../types/exam';
import { COMPACT_8_PHYSICS_EXAM, FULL_MOET_28_PHYSICS_EXAM } from '../data/seedPhysicsExam';
import { MathText } from './MathText';
import { HelpTooltip } from './HelpTooltip';
import {
  buildMasterAnswerKeyWordHtml,
  buildSampleWordTemplateText,
  buildTNMakerCsvContent,
  buildTNMakerExcelHtml,
  buildTNMakerXlsxBytes,
  buildVariantsWordDocHtml,
  buildVariantsWordDocxBlob,
  downloadComprehensiveExamZipPackage,
  downloadNormalizedGdpt2018WordDoc,
  downloadSampleWordTemplateDoc,
  ScramblerExportMetadata,
  toCleanSlug,
} from '../utils/exportPackageGenerator';
import { ScramblerGenerationOptions } from '../utils/scramblerAndGrader';
import {
  ENTRANCE_PHYSICS_28_EXAM,
  extractRawTextFromUploadedDocument,
  getResolvedQuestionImage,
  parseAndMergeDetailedSolutionDocument,
  parseUploadedExamFile,
} from '../utils/examDocumentParser';

export interface ExamBankFolder {
  id: string;
  code: string;
  name: string;
  description: string;
  badgeClass: string;
  isCustom?: boolean;
}

export interface SavedBankExamItem {
  id: string;
  folderId: string;
  examData: ExamData;
  savedAt: string;
  onlineExamCode?: string;
  variantCodes?: string[];
}

const DEFAULT_BANK_FOLDERS: ExamBankFolder[] = [
  {
    id: 'KTTX',
    code: 'KTTX',
    name: 'Kiểm Tra Thường Xuyên',
    description: 'Đề kiểm tra 15 phút, 45 phút, đánh giá thường xuyên trên lớp',
    badgeClass: 'bg-sky-950/70 text-sky-300 border-sky-600/50',
  },
  {
    id: 'KTGHK',
    code: 'KTGHK',
    name: 'Kiểm Tra Giữa Học Kỳ',
    description: 'Đề kiểm tra định kỳ Giữa Học Kỳ I & Giữa Học Kỳ II',
    badgeClass: 'bg-violet-950/70 text-violet-300 border-violet-600/50',
  },
  {
    id: 'KTCHK',
    code: 'KTCHK',
    name: 'Kiểm Tra Cuối Học Kỳ',
    description: 'Đề thi học kỳ I, học kỳ II chuẩn ma trận đặc tả GDPT 2018',
    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-600/50',
  },
  {
    id: 'THI_TOT_NGHIEP',
    code: 'THI TỐT NGHIỆP',
    name: 'Thi Tốt Nghiệp THPT',
    description: 'Đề thi thử Tốt nghiệp THPT Quốc gia & Đánh giá năng lực',
    badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-600/50',
  },
];

const INITIAL_SAVED_BANK_EXAMS: SavedBankExamItem[] = [
  {
    id: 'BANK-SEED-TN-01',
    folderId: 'THI_TOT_NGHIEP',
    examData: FULL_MOET_28_PHYSICS_EXAM,
    savedAt: '10/11/2026 08:00',
    onlineExamCode: '1102',
    variantCodes: ['1102', '1104', '1106', '1108'],
  },
  {
    id: 'BANK-SEED-GHK-01',
    folderId: 'KTGHK',
    examData: ENTRANCE_PHYSICS_28_EXAM,
    savedAt: '09/11/2026 19:30',
    onlineExamCode: '1104',
    variantCodes: ['1102', '1104', '1106', '1108'],
  },
  {
    id: 'BANK-SEED-CHK-01',
    folderId: 'KTCHK',
    examData: {
      ...FULL_MOET_28_PHYSICS_EXAM,
      examId: 'GDPT2018-CHK1-VL12',
      title: 'ĐỀ KIỂM TRA CUỐI HỌC KỲ I — MÔN VẬT LÝ 12 (CHUẨN GDPT 2018)',
      durationMinutes: 50,
    },
    savedAt: '08/11/2026 15:20',
    onlineExamCode: '1106',
    variantCodes: ['1102', '1104', '1106', '1108'],
  },
  {
    id: 'BANK-SEED-KTTX-01',
    folderId: 'KTTX',
    examData: COMPACT_8_PHYSICS_EXAM,
    savedAt: '07/11/2026 10:15',
    onlineExamCode: '101',
    variantCodes: ['101', '102', '103', '104'],
  },
];

const BANK_FOLDERS_STORAGE_KEY = 'smarttest_gdpt2018_bank_folders_v1';
const BANK_ITEMS_STORAGE_KEY = 'smarttest_gdpt2018_bank_items_v1';
const SCHOOL_CLASSES_STORAGE_KEY = 'smarttest_gdpt2018_classes_v1';

const DEFAULT_SCHOOL_CLASSES = ['12A1', '12A2', '12A3', '12A4', '11A1', '11A2', '10A1', '10A2'];

interface TeacherPortalProps {
  activeSubTab: 'bank' | 'scrambler' | 'monitor' | 'online_exam';
  setActiveSubTab: (tab: 'bank' | 'scrambler' | 'monitor' | 'online_exam') => void;
  examData: ExamData;
  onUpdateExamData: (next: ExamData) => void;
  variants: ScrambledExamVariant[];
  onRegenerateVariants: (
    codes: string[],
    salt: string,
    examOverride?: ExamData,
    options?: ScramblerGenerationOptions
  ) => ScrambledExamVariant[];
  workstations: WorkstationNode[];
  onResetWorkstationViolations: (workstationId: string) => void;
  onSimulateLabTick: () => void;
  onLaunchStudentWithCode: (code: string) => void;
  liveSessions: SavedExamSession[];
  onlineAssignments?: OnlineExamAssignment[];
  onSaveOnlineAssignment?: (assignment: OnlineExamAssignment) => void;
  onDeleteOnlineAssignment?: (assignmentId: string) => void;
  onNavigateHome?: () => void;
  isStandaloneScrambler?: boolean;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  activeSubTab,
  setActiveSubTab,
  examData,
  onUpdateExamData,
  variants,
  onRegenerateVariants,
  workstations,
  onResetWorkstationViolations,
  onSimulateLabTick,
  onLaunchStudentWithCode,
  liveSessions,
  onlineAssignments = [],
  onSaveOnlineAssignment,
  onDeleteOnlineAssignment,
  onNavigateHome,
  isStandaloneScrambler = false,
}) => {
  // JSON & Template state
  const [jsonText, setJsonText] = useState<string>(() => JSON.stringify(examData, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonSuccess, setJsonSuccess] = useState<string | null>(null);
  const [showSampleTemplateModal, setShowSampleTemplateModal] = useState<boolean>(false);
  const [copiedTemplateNotice, setCopiedTemplateNotice] = useState<boolean>(false);

  // Question Bank Inspector state
  const [inspectorPart, setInspectorPart] = useState<'I' | 'II' | 'III'>('I');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // =========================================================================
  // TAB 1 (NGÂN HÀNG ĐỀ): 2 NHÓM CHỨC NĂNG (BỘ LỌC THƯ MỤC & SOẠN ĐỀ 4 BƯỚC)
  // =========================================================================
  const [bankFolders, setBankFolders] = useState<ExamBankFolder[]>(() => {
    try {
      const raw = localStorage.getItem(BANK_FOLDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ExamBankFolder[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to default folders
    }
    return DEFAULT_BANK_FOLDERS;
  });

  const [savedBankExams, setSavedBankExams] = useState<SavedBankExamItem[]>(() => {
    try {
      const raw = localStorage.getItem(BANK_ITEMS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedBankExamItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) =>
            item.examData.title ===
            'Đề Thi Thử Tốt Nghiệp THPT Quốc Gia — Môn Vật Lý 12 (Chuẩn Cấu Trúc GDPT 2018)'
              ? {
                  ...item,
                  examData: {
                    ...item.examData,
                    title: 'Kiểm Tra Thông Minh - Chuẩn Cấu Trúc GDPT 2018',
                  },
                }
              : item
          );
        }
      }
    } catch {
      // Fallback to initial seeded exams
    }
    return INITIAL_SAVED_BANK_EXAMS;
  });

  // Group 1: Folder Filter & Custom Folder Creation
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('');
  const [bankSearchQuery, setBankSearchQuery] = useState<string>('');
  const [showAddFolderModal, setShowAddFolderModal] = useState<boolean>(false);
  const [newFolderCode, setNewFolderCode] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderDesc, setNewFolderDesc] = useState<string>('');

  // Group 2: 4-Step Exam Composition Workflow (Bước 1 -> Bước 2 -> Bước 3 -> Bước 4)
  const [bankWizardStep, setBankWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [targetSaveFolderId, setTargetSaveFolderId] = useState<string>('KTGHK');
  const [draftExamTitle, setDraftExamTitle] = useState<string>(examData.title);
  const [draftExamSubject, setDraftExamSubject] = useState<string>(examData.subject || 'VẬT LÝ 12');
  const [draftExamDuration, setDraftExamDuration] = useState<number>(examData.durationMinutes || 50);
  const [isExamSavedInStep3, setIsExamSavedInStep3] = useState<boolean>(false);
  const [lastSavedBankItem, setLastSavedBankItem] = useState<SavedBankExamItem | null>(null);

  // Step 4: Online Exam Assignment Code Generation
  const [onlineAssignmentCode, setOnlineAssignmentCode] = useState<string>('1102');
  const [isOnlineCodeActivated, setIsOnlineCodeActivated] = useState<boolean>(false);
  const [copiedOnlineCodeNotice, setCopiedOnlineCodeNotice] = useState<boolean>(false);

  // =========================================================================
  // TAB 4 (TỔ CHỨC THI ONLINE): 3 BƯỚC (CHỌN ĐỀ -> CẤU HÌNH KỲ THI -> GIAO BÀI)
  // =========================================================================
  const primaryOnlineAssign = onlineAssignments[0];
  const [onlineOrgStep, setOnlineOrgStep] = useState<1 | 2 | 3>(1);
  const [onlineSourceMode, setOnlineSourceMode] = useState<'bank' | 'upload_with_solution'>(
    primaryOnlineAssign?.sourceMode || 'bank'
  );
  const [onlineBankFolderFilter, setOnlineBankFolderFilter] = useState<string>('ALL');
  const [selectedOnlineBankId, setSelectedOnlineBankId] = useState<string>(
    primaryOnlineAssign?.sourceBankExamId || 'BANK-SEED-TN-01'
  );
  const [onlineSelectedExamData, setOnlineSelectedExamData] = useState<ExamData>(
    primaryOnlineAssign?.examData || examData
  );
  const [onlineUploadedExamFileName, setOnlineUploadedExamFileName] = useState<string | null>(null);
  const [onlineSolutionFileName, setOnlineSolutionFileName] = useState<string | null>(
    primaryOnlineAssign?.detailedSolutionFileName || null
  );
  const [onlineSolutionText, setOnlineSolutionText] = useState<string>(
    primaryOnlineAssign?.detailedSolutionContent || ''
  );
  const [onlineRawSolutionDocText, setOnlineRawSolutionDocText] = useState<string>(
    primaryOnlineAssign?.detailedSolutionContent || ''
  );
  const [onlineSyncedSolutionCount, setOnlineSyncedSolutionCount] = useState<number>(0);

  // Bước 2: Cấu hình kỳ thi
  const [onlineConfigTitle, setOnlineConfigTitle] = useState<string>(
    primaryOnlineAssign?.examTitle || 'Kiểm Tra Giữa Học Kỳ I - Năm Học 2026 - 2027'
  );
  const [onlineConfigSubject, setOnlineConfigSubject] = useState<string>(
    primaryOnlineAssign?.subject || examData.subject || 'Vật Lý 12'
  );
  const [availableClasses, setAvailableClasses] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SCHOOL_CLASSES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SCHOOL_CLASSES;
  });
  const [selectedOnlineClasses, setSelectedOnlineClasses] = useState<string[]>(() => {
    if (
      primaryOnlineAssign?.assignedClasses &&
      Array.isArray(primaryOnlineAssign.assignedClasses) &&
      primaryOnlineAssign.assignedClasses.length > 0
    ) {
      return primaryOnlineAssign.assignedClasses;
    }
    try {
      const raw = localStorage.getItem(SCHOOL_CLASSES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, Math.min(2, parsed.length));
        }
      }
    } catch {
      // Ignore
    }
    return ['12A1', '12A2'];
  });
  const [newClassNameInput, setNewClassNameInput] = useState<string>('');
  const [onlineStartTime, setOnlineStartTime] = useState<string>(
    primaryOnlineAssign?.startTime || '2026-11-10T07:30'
  );
  const [onlineEndTime, setOnlineEndTime] = useState<string>(
    primaryOnlineAssign?.endTime || '2026-11-10T22:00'
  );
  const [onlineDurationMinutes, setOnlineDurationMinutes] = useState<number>(
    primaryOnlineAssign?.durationMinutes || 50
  );
  const [onlineExamMode, setOnlineExamMode] = useState<'exam' | 'practice'>(
    primaryOnlineAssign?.mode === 'practice' ? 'practice' : 'exam'
  );
  const [onlineViolationLevel, setOnlineViolationLevel] = useState<ViolationEnforcementLevel>(
    primaryOnlineAssign?.violationLevel || 2
  );

  // Bước 3: Giao bài
  const [onlineDispatchCode, setOnlineDispatchCode] = useState<string>(
    primaryOnlineAssign?.examCode || '1102'
  );
  const [copiedDispatchCode, setCopiedDispatchCode] = useState<boolean>(false);
  const [copiedDispatchLink, setCopiedDispatchLink] = useState<boolean>(false);
  const [isOnlinePublished, setIsOnlinePublished] = useState<boolean>(
    Boolean(primaryOnlineAssign)
  );

  // Scrambler state & SmartTest Configuration Parameters (4-Step Workflow in Tab 2)
  const [scramblerWizardStep, setScramblerWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [scramblerCompletedZipName, setScramblerCompletedZipName] = useState<string | null>(null);
  const [showScramblerConfig, setShowScramblerConfig] = useState<boolean>(true);
  const [governingBody, setGoverningBody] = useState<string>('SỞ GD & ĐT TP ĐÀ NẴNG');
  const [schoolName, setSchoolName] = useState<string>('THPT HÙNG VƯƠNG');
  const [examTerm, setExamTerm] = useState<string>('KIỂM TRA GIỮA HỌC KỲ I');
  const [subjectName, setSubjectName] = useState<string>('VẬT LÝ 12');
  const [schoolYear, setSchoolYear] = useState<string>('2026 - 2027');
  const [examDuration, setExamDuration] = useState<number>(50);
  const [optionsInTable, setOptionsInTable] = useState<boolean>(false);
  const [answerTablePlacement, setAnswerTablePlacement] = useState<
    'Không' | 'Ở cuối đề thi' | 'Bảng riêng'
  >('Không');
  const [examCodesList, setExamCodesList] = useState<string[]>(['1102', '1104', '1106', '1108']);

  // Right Column: Formatting & Scrambling Rules
  const [questionLabel, setQuestionLabel] = useState<string>('Câu');
  const [questionSeparator, setQuestionSeparator] = useState<string>(':');
  const [restartIndexPerPart, setRestartIndexPerPart] = useState<boolean>(true);
  const [shuffleSectionOrder, setShuffleSectionOrder] = useState<boolean>(false);
  const [shuffleClusterQuestions, setShuffleClusterQuestions] = useState<boolean>(false);
  const [clusterRangesText, setClusterRangesText] = useState<string>('');
  const [codeLength, setCodeLength] = useState<3 | 4 | 5>(4);
  const [codePrefixMode, setCodePrefixMode] = useState<'Ngẫu nhiên' | 'Theo môn' | 'Cố định'>(
    'Ngẫu nhiên'
  );
  const [questionSpacingPt, setQuestionSpacingPt] = useState<number>(0);
  const [optionSpacingPt, setOptionSpacingPt] = useState<number>(0);
  const [optionIndentPt, setOptionIndentPt] = useState<number>(6);
  const [lineSpacing, setLineSpacing] = useState<'Single' | '1.15 lines' | '1.5 lines'>('Single');
  const [variantCount, setVariantCount] = useState<number>(4);
  const [mergeOutputFile, setMergeOutputFile] = useState<boolean>(true);

  // AI Document Converter Banner & Scrambler Execution state
  const [aiConvertEnabled, setAiConvertEnabled] = useState<boolean>(true);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [scramblerFeedback, setScramblerFeedback] = useState<string | null>(null);
  const [isScrambling, setIsScrambling] = useState<boolean>(false);
  const [scrambleToastMessage, setScrambleToastMessage] = useState<string | null>(null);
  const [previewFlash, setPreviewFlash] = useState<boolean>(false);

  // Synchronized alias for active exam data & scrambled variants
  const activeExamData = examData;
  const scrambledExams = variants;

  const [selectedVariantCode, setSelectedVariantCode] = useState<string>(
    variants[0]?.code || '101'
  );
  const [scramblerViewMode, setScramblerViewMode] = useState<'preview' | 'matrix' | 'print'>(
    'preview'
  );

  // Monitor state
  const [monitorFilter, setMonitorFilter] = useState<
    'ALL' | 'ACTIVE' | 'SUBMITTED' | 'VIOLATION_WARN'
  >('ALL');
  const [monitorSearch, setMonitorSearch] = useState<string>('');
  const [selectedWorkstation, setSelectedWorkstation] = useState<WorkstationNode | null>(null);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.code === selectedVariantCode) || variants[0],
    [variants, selectedVariantCode]
  );

  const totalExamPoints = useMemo(() => {
    const p1 = examData.part1.reduce((acc, q) => acc + (q.points || 0.25), 0);
    const p2 = examData.part2.reduce((acc, q) => acc + (q.points || 1.0), 0);
    const p3 = examData.part3.reduce((acc, q) => acc + (q.points || 0.25), 0);
    return Number((p1 + p2 + p3).toFixed(2));
  }, [examData]);

  const exportMeta: ScramblerExportMetadata = useMemo(
    () => ({
      governingBody,
      schoolName,
      examTerm,
      subjectName,
      schoolYear,
      examDuration,
      questionLabel,
      questionSeparator,
      restartIndexPerPart,
      optionsInTable,
      answerTablePlacement,
      mergeOutputFile,
    }),
    [
      governingBody,
      schoolName,
      examTerm,
      subjectName,
      schoolYear,
      examDuration,
      questionLabel,
      questionSeparator,
      restartIndexPerPart,
      optionsInTable,
      answerTablePlacement,
      mergeOutputFile,
    ]
  );

  const handleDownloadSampleWordTemplate = () => {
    downloadSampleWordTemplateDoc(ENTRANCE_PHYSICS_28_EXAM);
    setJsonSuccess(
      'Đã tải xuống file mẫu "De_Thi_Mau_Chuan_GDPT2018_VatLy.doc" (Đề thi mẫu môn Vật Lý đầu vào — Chuẩn 3 phần GDPT 2018).'
    );
    setScramblerFeedback(
      'Đã tải xuống file mẫu "De_Thi_Mau_Chuan_GDPT2018_VatLy.doc". Giáo viên chỉnh sửa nội dung câu hỏi theo mẫu rồi tải lên để trộn đề.'
    );
    window.setTimeout(() => {
      setJsonSuccess(null);
      setScramblerFeedback(null);
    }, 5000);
  };

  const handleNormalizeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploadedFileName(`${file.name} (Đã chuẩn hoá)`);

    try {
      const parsedResult = await parseUploadedExamFile(file);
      const nextGov =
        parsedResult.adminHeader?.governingBody ||
        governingBody ||
        'SỞ GD & ĐT TP ĐÀ NẴNG';
      const nextSchool =
        parsedResult.adminHeader?.schoolName || schoolName || 'THPT HÙNG VƯƠNG';
      const nextTerm =
        parsedResult.adminHeader?.examTerm ||
        parsedResult.examData.title ||
        examTerm ||
        'ĐỀ THI MẪU MÔN VẬT LÝ ĐẦU VÀO';
      const nextSubject =
        parsedResult.adminHeader?.subjectName ||
        parsedResult.examData.subject ||
        subjectName ||
        'VẬT LÝ 12';
      const nextDuration =
        parsedResult.adminHeader?.durationMinutes ||
        parsedResult.examData.durationMinutes ||
        examDuration ||
        50;

      const { normalizedExam, fileName } = downloadNormalizedGdpt2018WordDoc(
        parsedResult.examData,
        {
          ...exportMeta,
          governingBody: nextGov,
          schoolName: nextSchool,
          examTerm: nextTerm,
          subjectName: nextSubject,
          examDuration: nextDuration,
        },
        file.name
      );

      setGoverningBody(nextGov);
      setSchoolName(nextSchool);
      setExamTerm(nextTerm);
      setSubjectName(nextSubject);
      setExamDuration(nextDuration);

      const synchronizedExam: ExamData = {
        ...normalizedExam,
        title: nextTerm,
        subject: nextSubject,
        durationMinutes: nextDuration,
      };

      onUpdateExamData(synchronizedExam);
      setJsonText(JSON.stringify(synchronizedExam, null, 2));
      setJsonError(null);

      const cleanedCodes = examCodesList.map((c) => c.trim()).filter(Boolean);
      const finalCodes =
        cleanedCodes.length > 0 ? cleanedCodes : ['1102', '1104', '1106', '1108'];

      const adminHeader = {
        governingBody: nextGov,
        schoolName: nextSchool,
        examTerm: nextTerm,
        subjectName: nextSubject,
        durationMinutes: nextDuration,
        restartIndexPerPart,
        questionLabel: questionLabel.trim() || 'Câu',
        questionSeparator: questionSeparator || ':',
      };

      const salt = `NORM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      onRegenerateVariants(finalCodes, salt, synchronizedExam, {
        restartIndexPerPart,
        adminHeader,
      });
      setSelectedVariantCode(finalCodes[0]);

      const toastMsg =
        'Đã chuẩn hoá định dạng thành công! File chuẩn đang được tải về máy tính để Thầy/Cô kiểm tra trước khi trộn đề.';
      setScrambleToastMessage(toastMsg);
      setJsonSuccess(toastMsg);
      setScramblerFeedback(
        `${toastMsg} (Tệp gốc: "${file.name}" → Tệp chuẩn tải về: "${fileName}" · Đã nhận diện khớp 100%: ${synchronizedExam.part1.length} câu Phần I, ${synchronizedExam.part2.length} câu Phần II, ${synchronizedExam.part3.length} câu Phần III. Thầy/Cô kiểm tra lại trước khi nhấn "Áp Dụng Cấu Hình & Sinh Mã Đề")`
      );

      setPreviewFlash(true);
      window.setTimeout(() => setPreviewFlash(false), 1800);

      window.setTimeout(() => {
        setScrambleToastMessage(null);
        setJsonSuccess(null);
        setScramblerFeedback(null);
      }, 6500);
    } catch {
      const fallbackRawExam: ExamData = {
        ...ENTRANCE_PHYSICS_28_EXAM,
        examId: `NORM-${Date.now().toString().slice(-5)}`,
        title: file.name.replace(/\.(docx|doc|pdf|txt|json)$/i, '').toUpperCase(),
      };
      const { normalizedExam, fileName } = downloadNormalizedGdpt2018WordDoc(
        fallbackRawExam,
        exportMeta,
        file.name
      );
      onUpdateExamData(normalizedExam);
      setJsonText(JSON.stringify(normalizedExam, null, 2));

      const toastMsg =
        'Đã chuẩn hoá định dạng thành công! File chuẩn đang được tải về máy tính để Thầy/Cô kiểm tra trước khi trộn đề.';
      setScrambleToastMessage(toastMsg);
      setJsonSuccess(toastMsg);
      setScramblerFeedback(`${toastMsg} (Đã tải xuống "${fileName}")`);

      window.setTimeout(() => {
        setScrambleToastMessage(null);
        setJsonSuccess(null);
        setScramblerFeedback(null);
      }, 6000);
    }
  };

  const handleExportFullZipPackage = (overrideVariants?: ScrambledExamVariant[]) => {
    const activeVariants = Array.isArray(overrideVariants) ? overrideVariants : scrambledExams;
    const zipName = downloadComprehensiveExamZipPackage(examData, activeVariants, exportMeta);
    setScramblerFeedback(
      `Đã đóng gói và tải xuống thư mục nén "${zipName}" (Gồm ${activeVariants.length} đề Word .docx [${activeVariants
        .map((v) => v.code)
        .join(', ')}], Bảng đáp án tổng hợp, File chấm máy TNMaker/QM .xls/.csv và dữ liệu JSON).`
    );
    window.setTimeout(() => setScramblerFeedback(null), 6500);
  };

  const handleExportWordDocsOnly = (overrideVariants?: ScrambledExamVariant[]) => {
    const activeVariants = Array.isArray(overrideVariants) ? overrideVariants : scrambledExams;
    const subjectSlug = toCleanSlug(subjectName || 'VatLy12') || 'VatLy12';
    const blob = buildVariantsWordDocxBlob(activeVariants, exportMeta);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bo_De_Word_${subjectSlug}_${activeVariants.length}MaDe.docx`;
    a.click();
    URL.revokeObjectURL(url);
    setScramblerFeedback(
      `Đã tải xuống file Word chuẩn OpenXML "${a.download}" chứa toàn bộ ${activeVariants.length} mã đề (${activeVariants
        .map((v) => v.code)
        .join(', ')}) — hỗ trợ chỉnh sửa và lưu trực tiếp trong Microsoft Word.`
    );
    window.setTimeout(() => setScramblerFeedback(null), 5000);
  };

  const handleExportTNMakerExcel = (overrideVariants?: ScrambledExamVariant[]) => {
    const activeVariants = Array.isArray(overrideVariants) ? overrideVariants : scrambledExams;
    const subjectSlug = toCleanSlug(subjectName || 'VatLy12') || 'VatLy12';

    // Download native OpenXML .xlsx file matching (Mẫu) TNMaker-2025
    const xlsxBytes = buildTNMakerXlsxBytes(activeVariants);
    const xlsxBlob = new Blob([xlsxBytes.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const xlsxUrl = URL.createObjectURL(xlsxBlob);
    const aXlsx = document.createElement('a');
    aXlsx.href = xlsxUrl;
    aXlsx.download = `Dap_An_TNMaker_${subjectSlug}_${activeVariants.length}MaDe.xlsx`;
    aXlsx.click();
    URL.revokeObjectURL(xlsxUrl);

    // Also provide .xls in the exact same TNMaker-2025 matrix format
    const xlsHtml = buildTNMakerExcelHtml(activeVariants, exportMeta);
    const blob = new Blob([xlsHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `File_Cham_May_TNMaker_QM_${subjectSlug}_${activeVariants.length}MaDe.xls`;
    a.click();
    URL.revokeObjectURL(url);

    // Also provide CSV for phone grading apps
    const csvContent = buildTNMakerCsvContent(activeVariants);
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const aCsv = document.createElement('a');
    aCsv.href = csvUrl;
    aCsv.download = `File_Cham_May_TNMaker_QM_${subjectSlug}_${activeVariants.length}MaDe.csv`;
    aCsv.click();
    URL.revokeObjectURL(csvUrl);

    setScramblerFeedback(
      `Đã xuất file đáp án chấm máy chuẩn TNMaker-2025 (.xlsx, .xls và .csv) cho ${activeVariants.length} mã đề (${activeVariants
        .map((v) => v.code)
        .join(', ')}).`
    );
    window.setTimeout(() => setScramblerFeedback(null), 5500);
  };

  const handleExportMasterAnswerKeyDoc = (overrideVariants?: ScrambledExamVariant[]) => {
    const activeVariants = Array.isArray(overrideVariants) ? overrideVariants : scrambledExams;
    const subjectSlug = toCleanSlug(subjectName || 'VatLy12') || 'VatLy12';
    const html = buildMasterAnswerKeyWordHtml(activeVariants, exportMeta);
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bang_Dap_An_Tong_Hop_${subjectSlug}_${activeVariants.length}MaDe.doc`;
    a.click();
    URL.revokeObjectURL(url);
    setScramblerFeedback(
      `Đã tải xuống Bảng Đáp Án Tổng Hợp Word (.doc) cho ${activeVariants.length} mã đề (${activeVariants
        .map((v) => v.code)
        .join(', ')}).`
    );
    window.setTimeout(() => setScramblerFeedback(null), 5000);
  };

  const ingestAndSynchronizeNewExam = (
    nextExam: ExamData,
    sourceLabel: string,
    headerOverrides?: Partial<import('../types/exam').ScrambledVariantAdminHeader>,
    shouldScrollToPreview = false
  ) => {
    const nextGov = headerOverrides?.governingBody || governingBody || 'SỞ GD & ĐT TP ĐÀ NẴNG';
    const nextSchool = headerOverrides?.schoolName || schoolName || 'THPT HÙNG VƯƠNG';
    const nextTerm =
      headerOverrides?.examTerm || nextExam.title || examTerm || 'KIỂM TRA GIỮA HỌC KỲ I';
    const nextSubject = headerOverrides?.subjectName || nextExam.subject || subjectName || 'VẬT LÝ 12';
    const nextDuration =
      headerOverrides?.durationMinutes || nextExam.durationMinutes || examDuration || 50;

    setGoverningBody(nextGov);
    setSchoolName(nextSchool);
    setExamTerm(nextTerm);
    setSubjectName(nextSubject);
    setExamDuration(nextDuration);

    const synchronizedExam: ExamData = {
      ...nextExam,
      title: nextTerm,
      subject: nextSubject,
      durationMinutes: nextDuration,
    };

    // Keep Tab 4 (Tổ Chức Thi Online) synchronized with the newly ingested exam
    setOnlineSelectedExamData(synchronizedExam);
    setOnlineConfigTitle(nextTerm);
    setOnlineConfigSubject(nextSubject);
    setOnlineDurationMinutes(nextDuration);

    setJsonText(JSON.stringify(synchronizedExam, null, 2));
    setJsonError(null);

    const cleanedCodes = examCodesList.map((c) => c.trim()).filter(Boolean);
    const finalCodes =
      cleanedCodes.length > 0 ? cleanedCodes : ['1102', '1104', '1106', '1108'];

    const adminHeader = {
      governingBody: nextGov,
      schoolName: nextSchool,
      examTerm: nextTerm,
      subjectName: nextSubject,
      durationMinutes: nextDuration,
      restartIndexPerPart,
      questionLabel: questionLabel.trim() || 'Câu',
      questionSeparator: questionSeparator || ':',
    };

    const salt = `INGEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    onRegenerateVariants(finalCodes, salt, synchronizedExam, {
      restartIndexPerPart,
      adminHeader,
    });

    setSelectedVariantCode(finalCodes[0]);

    const toastMsg = `Đã nhận diện thành công: ${synchronizedExam.part1.length} câu Phần I, ${synchronizedExam.part2.length} câu Phần II, ${synchronizedExam.part3.length} câu Phần III kèm đáp án và hình vẽ!`;
    setScrambleToastMessage(toastMsg);
    setJsonSuccess(toastMsg);
    setScramblerFeedback(
      `${toastMsg} (Nguồn: ${sourceLabel} · Đã tự động trộn mới các mã đề: ${finalCodes.join(', ')})`
    );

    setPreviewFlash(true);
    window.setTimeout(() => setPreviewFlash(false), 1800);

    if (shouldScrollToPreview) {
      window.setTimeout(() => {
        document
          .getElementById('scrambler-preview-anchor')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }

    window.setTimeout(() => {
      setScrambleToastMessage(null);
      setJsonSuccess(null);
      setScramblerFeedback(null);
    }, 5500);
  };

  const handleLoadPreset = (preset: ExamData, label: string) => {
    setUploadedFileName(label);
    ingestAndSynchronizeNewExam(
      preset,
      label,
      {
        examTerm: preset.title,
        subjectName: preset.subject,
        durationMinutes: preset.durationMinutes,
      },
      false
    );
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as ExamData;
      if (!parsed.part1 || !Array.isArray(parsed.part1)) {
        throw new Error('Cấu trúc thiếu mảng "part1" (Trắc nghiệm nhiều lựa chọn).');
      }
      if (!parsed.part2 || !Array.isArray(parsed.part2)) {
        throw new Error('Cấu trúc thiếu mảng "part2" (Trắc nghiệm Đúng/Sai).');
      }
      if (!parsed.part3 || !Array.isArray(parsed.part3)) {
        throw new Error('Cấu trúc thiếu mảng "part3" (Trả lời ngắn).');
      }
      ingestAndSynchronizeNewExam(
        parsed,
        parsed.title || 'Dữ liệu JSON mới nạp',
        {
          examTerm: parsed.title,
          subjectName: parsed.subject,
          durationMinutes: parsed.durationMinutes,
        },
        false
      );
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Lỗi cú pháp JSON không hợp lệ.');
      setJsonSuccess(null);
    }
  };

  const handlePointChange = (part: 'I' | 'II' | 'III', questionId: string, newPoint: number) => {
    const validPoint = Number.isNaN(newPoint) || newPoint < 0 ? 0.25 : newPoint;
    const next: ExamData = {
      ...examData,
      part1:
        part === 'I'
          ? examData.part1.map((q) => (q.id === questionId ? { ...q, points: validPoint } : q))
          : examData.part1,
      part2:
        part === 'II'
          ? examData.part2.map((q) => (q.id === questionId ? { ...q, points: validPoint } : q))
          : examData.part2,
      part3:
        part === 'III'
          ? examData.part3.map((q) => (q.id === questionId ? { ...q, points: validPoint } : q))
          : examData.part3,
    };
    onUpdateExamData(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const handleUpdateQuestionField = (
    part: 'I' | 'II' | 'III',
    questionId: string,
    field: 'question' | 'stem' | 'explanation' | 'answer',
    value: string
  ) => {
    const next: ExamData = {
      ...examData,
      part1:
        part === 'I'
          ? examData.part1.map((q) => (q.id === questionId ? { ...q, [field]: value } : q))
          : examData.part1,
      part2:
        part === 'II'
          ? examData.part2.map((q) => (q.id === questionId ? { ...q, [field]: value } : q))
          : examData.part2,
      part3:
        part === 'III'
          ? examData.part3.map((q) => (q.id === questionId ? { ...q, [field]: value } : q))
          : examData.part3,
    };
    onUpdateExamData(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const handleUpdatePart1CorrectIndex = (questionId: string, newCorrectIndex: number) => {
    const next: ExamData = {
      ...examData,
      part1: examData.part1.map((q) =>
        q.id === questionId ? { ...q, correctIndex: newCorrectIndex } : q
      ),
    };
    onUpdateExamData(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const handleUpdatePart1OptionText = (questionId: string, optionIdx: number, newText: string) => {
    const next: ExamData = {
      ...examData,
      part1: examData.part1.map((q) => {
        if (q.id !== questionId) return q;
        const nextOptions = [...q.options] as [string, string, string, string];
        nextOptions[optionIdx] = newText;
        return { ...q, options: nextOptions };
      }),
    };
    onUpdateExamData(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const handleTogglePart2StatementTruth = (questionId: string, stmtId: string) => {
    const next: ExamData = {
      ...examData,
      part2: examData.part2.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          statements: q.statements.map((s) =>
            s.id === stmtId ? { ...s, isTrue: !s.isTrue } : s
          ) as typeof q.statements,
        };
      }),
    };
    onUpdateExamData(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const handleUpdatePart2StatementText = (
    questionId: string,
    stmtId: string,
    newText: string
  ) => {
    const next: ExamData = {
      ...examData,
      part2: examData.part2.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          statements: q.statements.map((s) =>
            s.id === stmtId ? { ...s, text: newText } : s
          ) as typeof q.statements,
        };
      }),
    };
    onUpdateExamData(next);
    setJsonText(JSON.stringify(next, null, 2));
  };

  const detectFolderIdFromTitle = (titleStr: string): string => {
    const upper = (titleStr || '').toUpperCase();
    if (upper.includes('THƯỜNG XUYÊN') || upper.includes('KTTX') || upper.includes('15 PHÚT')) {
      return 'KTTX';
    }
    if (upper.includes('CUỐI HỌC KỲ') || upper.includes('CUỐI KỲ') || upper.includes('KTCHK')) {
      return 'KTCHK';
    }
    if (
      upper.includes('TỐT NGHIỆP') ||
      upper.includes('THPT') ||
      upper.includes('ĐÁNH GIÁ NĂNG LỰC')
    ) {
      return 'THI_TOT_NGHIEP';
    }
    if (upper.includes('GIỮA HỌC KỲ') || upper.includes('GIỮA KỲ') || upper.includes('KTGHK')) {
      return 'KTGHK';
    }
    return targetSaveFolderId || 'KTGHK';
  };

  const handleBankStep1FileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploadedFileName(file.name);
    setIsScrambling(true);
    setIsExamSavedInStep3(false);
    setIsOnlineCodeActivated(false);

    try {
      const parsedResult = await parseUploadedExamFile(file);
      const detectedTitle =
        parsedResult.adminHeader?.examTerm ||
        parsedResult.examData.title ||
        file.name.replace(/\.(docx|doc|pdf|txt|json)$/i, '').toUpperCase();
      const detectedSubject =
        parsedResult.adminHeader?.subjectName ||
        parsedResult.examData.subject ||
        subjectName ||
        'VẬT LÝ 12';
      const detectedDuration =
        parsedResult.adminHeader?.durationMinutes ||
        parsedResult.examData.durationMinutes ||
        examDuration ||
        50;
      const autoFolder = detectFolderIdFromTitle(detectedTitle);

      setDraftExamTitle(detectedTitle);
      setDraftExamSubject(detectedSubject);
      setDraftExamDuration(detectedDuration);
      setTargetSaveFolderId(autoFolder);

      window.setTimeout(() => {
        setIsScrambling(false);
        ingestAndSynchronizeNewExam(
          {
            ...parsedResult.examData,
            title: detectedTitle,
            subject: detectedSubject,
            durationMinutes: detectedDuration,
          },
          file.name,
          parsedResult.adminHeader,
          false
        );
        setBankWizardStep(2);
      }, 300);
    } catch {
      setIsScrambling(false);
      const fallbackTitle = file.name.replace(/\.(docx|doc|pdf|txt|json)$/i, '').toUpperCase();
      const autoFolder = detectFolderIdFromTitle(fallbackTitle);
      setDraftExamTitle(fallbackTitle);
      setTargetSaveFolderId(autoFolder);

      ingestAndSynchronizeNewExam(
        {
          ...ENTRANCE_PHYSICS_28_EXAM,
          examId: `UPLOAD-${Date.now().toString().slice(-5)}`,
          title: fallbackTitle,
        },
        file.name,
        { examTerm: fallbackTitle },
        false
      );
      setBankWizardStep(2);
    }
  };

  const handleCreateCustomBankFolder = () => {
    const codeClean = newFolderCode.trim().toUpperCase();
    const nameClean = newFolderName.trim();
    if (!codeClean || !nameClean) return;

    const customId = `FOLDER_${Date.now().toString().slice(-5)}`;
    const newFolder: ExamBankFolder = {
      id: customId,
      code: codeClean,
      name: nameClean,
      description: newFolderDesc.trim() || `Thư mục đề thi ${nameClean}`,
      badgeClass: 'bg-indigo-950/70 text-indigo-300 border-indigo-600/50',
      isCustom: true,
    };

    const nextFolders = [...bankFolders, newFolder];
    setBankFolders(nextFolders);
    try {
      localStorage.setItem(BANK_FOLDERS_STORAGE_KEY, JSON.stringify(nextFolders));
    } catch {
      // Ignore storage error
    }

    setTargetSaveFolderId(customId);
    setSelectedFolderFilter(customId);
    setNewFolderCode('');
    setNewFolderName('');
    setNewFolderDesc('');
    setShowAddFolderModal(false);
  };

  const handleSaveExamToBankFolder = () => {
    const finalTitle = draftExamTitle.trim() || examData.title || 'ĐỀ KIỂM TRA ĐỊNH KỲ';
    const finalSubject = draftExamSubject.trim() || examData.subject || 'VẬT LÝ 12';
    const finalDuration = Number(draftExamDuration) > 0 ? Number(draftExamDuration) : 50;

    const updatedExam: ExamData = {
      ...examData,
      examId: examData.examId || `GDPT2018-${Date.now().toString().slice(-5)}`,
      title: finalTitle,
      subject: finalSubject,
      durationMinutes: finalDuration,
    };

    onUpdateExamData(updatedExam);
    setExamTerm(finalTitle);
    setSubjectName(finalSubject);
    setExamDuration(finalDuration);
    setJsonText(JSON.stringify(updatedExam, null, 2));

    const nowStr = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const folderObj =
      bankFolders.find((f) => f.id === targetSaveFolderId) || bankFolders[0];
    const defaultOnlineCode = examCodesList[0] || variants[0]?.code || '1102';
    setOnlineAssignmentCode(defaultOnlineCode);

    const newItem: SavedBankExamItem = {
      id: `BANK-${Date.now().toString().slice(-6)}`,
      folderId: folderObj.id,
      examData: updatedExam,
      savedAt: nowStr,
      onlineExamCode: defaultOnlineCode,
      variantCodes: examCodesList.length > 0 ? examCodesList : ['1102', '1104', '1106', '1108'],
    };

    const nextItems = [newItem, ...savedBankExams];
    setSavedBankExams(nextItems);
    try {
      localStorage.setItem(BANK_ITEMS_STORAGE_KEY, JSON.stringify(nextItems));
    } catch {
      // Ignore storage error
    }

    setLastSavedBankItem(newItem);
    setSelectedOnlineBankId(newItem.id);
    setOnlineSelectedExamData(updatedExam);
    setOnlineConfigTitle(finalTitle);
    setOnlineConfigSubject(finalSubject);
    setOnlineDurationMinutes(finalDuration);
    setSelectedFolderFilter(folderObj.id);
    setIsExamSavedInStep3(true);
    setJsonSuccess(
      `Đã lưu đề "${finalTitle}" vào kho thư mục [${folderObj.code} — ${folderObj.name}] thành công!`
    );
  };

  const handleActivateOnlineExamCode = () => {
    const cleanCode = onlineAssignmentCode.trim() || '1102';
    const otherCodes = examCodesList
      .map((c) => c.trim())
      .filter((c) => Boolean(c) && c !== cleanCode);
    const activeCodes = [cleanCode, ...otherCodes].slice(0, Math.max(1, variantCount));

    setExamCodesList(activeCodes);
    const salt = `ONLINE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onRegenerateVariants(activeCodes, salt, examData, {
      restartIndexPerPart,
      adminHeader: {
        governingBody,
        schoolName,
        examTerm: examData.title,
        subjectName: examData.subject,
        durationMinutes: examData.durationMinutes,
        restartIndexPerPart,
        questionLabel,
        questionSeparator,
      },
    });
    setSelectedVariantCode(cleanCode);
    setOnlineDispatchCode(cleanCode);
    setOnlineSelectedExamData(examData);

    if (onSaveOnlineAssignment) {
      onSaveOnlineAssignment(
        buildSynchronizedAssignmentPayload({
          examCode: cleanCode,
          examTitle: examData.title,
          subject: examData.subject,
          durationMinutes: examData.durationMinutes,
          examData,
        })
      );
    }

    if (lastSavedBankItem) {
      const updatedItems = savedBankExams.map((item) =>
        item.id === lastSavedBankItem.id
          ? { ...item, onlineExamCode: cleanCode, variantCodes: activeCodes }
          : item
      );
      setSavedBankExams(updatedItems);
      try {
        localStorage.setItem(BANK_ITEMS_STORAGE_KEY, JSON.stringify(updatedItems));
      } catch {
        // Ignore storage error
      }
    }

    setIsOnlineCodeActivated(true);
    setScrambleToastMessage(
      `Đã kích hoạt Mã Bài Thi Trực Tuyến [${cleanCode}] để giao cho học sinh!`
    );
    window.setTimeout(() => setScrambleToastMessage(null), 5000);
  };

  const handleLoadSavedBankItem = (
    item: SavedBankExamItem,
    nextAction: 'inspect' | 'scrambler' | 'online_code'
  ) => {
    setDraftExamTitle(item.examData.title);
    setDraftExamSubject(item.examData.subject);
    setDraftExamDuration(item.examData.durationMinutes);
    setTargetSaveFolderId(item.folderId);
    setLastSavedBankItem(item);
    if (item.onlineExamCode) {
      setOnlineAssignmentCode(item.onlineExamCode);
    }

    ingestAndSynchronizeNewExam(
      item.examData,
      `Kho đề [${item.folderId}]`,
      {
        examTerm: item.examData.title,
        subjectName: item.examData.subject,
        durationMinutes: item.examData.durationMinutes,
      },
      false
    );

    if (nextAction === 'scrambler') {
      setScramblerCompletedZipName(null);
      setScramblerWizardStep(2);
      setActiveSubTab('scrambler');
    } else if (nextAction === 'online_code') {
      setIsOnlineCodeActivated(true);
      setBankWizardStep(4);
    } else {
      setBankWizardStep(2);
    }
  };

  const handleDeleteSavedBankItem = (itemId: string) => {
    const nextItems = savedBankExams.filter((item) => item.id !== itemId);
    setSavedBankExams(nextItems);
    try {
      localStorage.setItem(BANK_ITEMS_STORAGE_KEY, JSON.stringify(nextItems));
    } catch {
      // Ignore storage error
    }
  };

  // Generate exam codes dynamically when count, length, or prefix mode changes
  const generateCodesByConfig = (
    count: number,
    len: 3 | 4 | 5,
    prefixMode: 'Ngẫu nhiên' | 'Theo môn' | 'Cố định'
  ): string[] => {
    const safeCount = Math.max(1, Math.min(100, count));
    const codes: string[] = [];
    for (let i = 0; i < safeCount; i += 1) {
      if (len === 3) {
        const prefix = prefixMode === 'Theo môn' ? '2' : prefixMode === 'Cố định' ? '1' : '1';
        codes.push(`${prefix}${String(i + 1).padStart(2, '0')}`);
      } else if (len === 4) {
        const prefix = prefixMode === 'Theo môn' ? '02' : prefixMode === 'Cố định' ? '11' : '11';
        const step = (i + 1) * 2;
        codes.push(`${prefix}${String(step).padStart(2, '0')}`);
      } else {
        const prefix = prefixMode === 'Theo môn' ? '201' : '110';
        codes.push(`${prefix}${String((i + 1) * 2).padStart(2, '0')}`);
      }
    }
    return codes;
  };

  const handleVariantCountChange = (nextCount: number) => {
    const clamped = Math.max(1, Math.min(100, nextCount));
    setVariantCount(clamped);
    setExamCodesList((prev) => {
      if (clamped === prev.length) return prev;
      if (clamped < prev.length) return prev.slice(0, clamped);
      const generated = generateCodesByConfig(clamped, codeLength, codePrefixMode);
      return [...prev, ...generated.slice(prev.length)];
    });
  };

  const handleCodeLengthOrPrefixChange = (
    nextLen: 3 | 4 | 5,
    nextPrefix: 'Ngẫu nhiên' | 'Theo môn' | 'Cố định'
  ) => {
    setCodeLength(nextLen);
    setCodePrefixMode(nextPrefix);
    const updatedCodes = generateCodesByConfig(variantCount, nextLen, nextPrefix);
    setExamCodesList(updatedCodes);
  };

  const handleIndividualCodeChange = (index: number, value: string) => {
    setExamCodesList((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  const handleApplyScramblerConfig = (shouldExportAfter = false) => {
    setIsScrambling(true);

    const cleanedCodes = examCodesList.map((c) => c.trim()).filter(Boolean);
    const finalCodes =
      cleanedCodes.length > 0 ? cleanedCodes : ['1102', '1104', '1106', '1108'];

    const adminHeader = {
      governingBody: governingBody.trim() || 'SỞ GD & ĐT TP ĐÀ NẴNG',
      schoolName: schoolName.trim() || 'THPT HÙNG VƯƠNG',
      examTerm: examTerm.trim() || 'KIỂM TRA GIỮA HỌC KỲ I',
      subjectName: subjectName.trim() || 'VẬT LÝ 12',
      schoolYear: schoolYear.trim() || '2026 - 2027',
      durationMinutes: Number(examDuration) > 0 ? Number(examDuration) : 50,
      restartIndexPerPart,
      questionLabel: questionLabel.trim() || 'Câu',
      questionSeparator: questionSeparator || ':',
      optionsInTable,
      shuffleClusterQuestions,
      clusterRangesText: clusterRangesText.trim(),
    };

    const updatedExam: ExamData = {
      ...examData,
      title: `${adminHeader.examTerm} — ${adminHeader.subjectName}`,
      subject: adminHeader.subjectName,
      durationMinutes: adminHeader.durationMinutes,
    };

    setJsonText(JSON.stringify(updatedExam, null, 2));

    const salt = `SCRAMBLE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newlyGeneratedVariants = onRegenerateVariants(finalCodes, salt, updatedExam, {
      restartIndexPerPart,
      shuffleClusterQuestions,
      clusterRangesText: clusterRangesText.trim(),
      adminHeader,
    });

    if (!finalCodes.includes(selectedVariantCode)) {
      setSelectedVariantCode(finalCodes[0]);
    }

    setScramblerViewMode('preview');

    const currentMeta: ScramblerExportMetadata = {
      governingBody: adminHeader.governingBody,
      schoolName: adminHeader.schoolName,
      examTerm: adminHeader.examTerm,
      subjectName: adminHeader.subjectName,
      schoolYear: adminHeader.schoolYear,
      examDuration: adminHeader.durationMinutes,
      questionLabel: adminHeader.questionLabel,
      questionSeparator: adminHeader.questionSeparator,
      restartIndexPerPart,
      optionsInTable,
      answerTablePlacement,
      mergeOutputFile,
    };

    window.setTimeout(() => {
      setIsScrambling(false);
      const toastText = `Đã trộn thành công ${newlyGeneratedVariants.length} mã đề (${finalCodes.join(', ')}) và tự động tải xuống gói đề nén (.ZIP)!`;
      setScrambleToastMessage(toastText);
      setScramblerFeedback(
        `${toastText} (Gồm file Word các mã đề + Đáp án Word + Đáp án chấm TNMaker Excel)`
      );

      if (shouldExportAfter) {
        const zipName = downloadComprehensiveExamZipPackage(
          updatedExam,
          newlyGeneratedVariants,
          currentMeta
        );
        setScramblerCompletedZipName(zipName);
      }

      window.setTimeout(() => {
        setScrambleToastMessage(null);
      }, 4800);
      window.setTimeout(() => {
        setScramblerFeedback(null);
      }, 6500);
    }, 450);
  };

  const handleWordPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploadedFileName(file.name);
    setIsScrambling(true);
    setScramblerCompletedZipName(null);

    try {
      const parsedResult = await parseUploadedExamFile(file);
      window.setTimeout(() => {
        setIsScrambling(false);
        ingestAndSynchronizeNewExam(
          parsedResult.examData,
          file.name,
          parsedResult.adminHeader,
          false
        );
        setScramblerWizardStep(2);
      }, 300);
    } catch {
      setIsScrambling(false);
      ingestAndSynchronizeNewExam(
        {
          ...ENTRANCE_PHYSICS_28_EXAM,
          examId: `UPLOAD-${Date.now().toString().slice(-5)}`,
          title: file.name.replace(/\.(docx|doc|pdf|txt|json)$/i, '').toUpperCase(),
        },
        file.name,
        {
          examTerm: file.name.replace(/\.(docx|doc|pdf|txt|json)$/i, '').toUpperCase(),
        },
        false
      );
      setScramblerWizardStep(2);
    }
  };

  const handleExportScrambledJson = (overrideCodes?: string[]) => {
    const activeCodes = overrideCodes || variants.map((v) => v.code);
    const payload = {
      exportedAt: new Date().toISOString(),
      curriculum: 'GDPT 2018 — Bộ GD&ĐT Việt Nam',
      scramblerConfig: {
        governingBody,
        schoolName,
        examTerm,
        subjectName,
        examDurationMinutes: examDuration,
        answerTablePlacement,
        examCodes: activeCodes,
        questionLabel,
        questionSeparator,
        restartIndexPerPart,
        shuffleSectionOrder,
        codeLength,
        codePrefixMode,
        questionSpacingPt,
        optionSpacingPt,
        optionIndentPt,
        lineSpacing,
        variantCount,
        mergeOutputFile,
      },
      baseExamId: examData.examId,
      title: examData.title,
      variants,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = mergeOutputFile ? 'Ghep1FileDuyNhat' : 'TachFile';
    a.download = `SmartTest_TronDe_${examData.examId}_${activeCodes.length}MaDe_${suffix}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredWorkstations = useMemo(() => {
    return workstations.filter((ws) => {
      if (monitorFilter !== 'ALL' && ws.status !== monitorFilter) return false;
      if (monitorSearch.trim()) {
        const q = monitorSearch.toLowerCase();
        return (
          ws.studentName.toLowerCase().includes(q) ||
          ws.studentId.toLowerCase().includes(q) ||
          ws.workstationId.toLowerCase().includes(q) ||
          ws.examCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [workstations, monitorFilter, monitorSearch]);

  const formatTimeMinSec = (seconds: number) => {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.max(0, seconds) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // =========================================================================
  // HANDLERS CHO TAB 4: TỔ CHỨC THI ONLINE (3 BƯỚC ĐỒNG BỘ TOÀN HỆ THỐNG)
  // =========================================================================
  const getViolationThresholdByLevel = (level: ViolationEnforcementLevel): number => {
    if (level === 1) return 1;
    if (level === 2) return 3;
    return 4;
  };

  const computedOnlineExamLink = useMemo(() => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://smarttest.edu.vn';
    const cleanCode = (onlineDispatchCode || '1102').trim();
    return `${origin}/?examCode=${encodeURIComponent(cleanCode)}`;
  }, [onlineDispatchCode]);

  const buildSynchronizedAssignmentPayload = (
    overridePartial?: Partial<{
      examCode: string;
      examTitle: string;
      subject: string;
      assignedClasses: string[];
      startTime: string;
      endTime: string;
      durationMinutes: number;
      mode: 'exam' | 'practice';
      violationLevel: ViolationEnforcementLevel;
      sourceMode: 'bank' | 'upload_with_solution';
      examData: ExamData;
      detailedSolutionContent: string;
      detailedSolutionFileName: string | null;
    }>
  ): OnlineExamAssignment => {
    const code = (overridePartial?.examCode ?? onlineDispatchCode).trim() || '1102';
    const title =
      (overridePartial?.examTitle ?? onlineConfigTitle).trim() ||
      'Kiểm Tra Định Kỳ - Chuẩn Cấu Trúc GDPT 2018';
    const subj = (overridePartial?.subject ?? onlineConfigSubject).trim() || 'Vật Lý 12';
    const classes =
      overridePartial?.assignedClasses ??
      (selectedOnlineClasses.length > 0 ? selectedOnlineClasses : ['12A1']);
    const start = overridePartial?.startTime ?? onlineStartTime;
    const end = overridePartial?.endTime ?? onlineEndTime;
    const duration =
      Number(overridePartial?.durationMinutes ?? onlineDurationMinutes) > 0
        ? Number(overridePartial?.durationMinutes ?? onlineDurationMinutes)
        : 50;
    const mode = overridePartial?.mode ?? onlineExamMode;
    const level = overridePartial?.violationLevel ?? onlineViolationLevel;
    const maxVio = mode === 'exam' ? getViolationThresholdByLevel(level) : 0;
    const srcMode = overridePartial?.sourceMode ?? onlineSourceMode;
    const baseExamRaw = overridePartial?.examData ?? onlineSelectedExamData;
    const rawSolToMerge =
      overridePartial?.detailedSolutionContent ??
      (onlineRawSolutionDocText.trim() || onlineSolutionText);
    const mergedSolutionResult = rawSolToMerge.trim()
      ? parseAndMergeDetailedSolutionDocument(rawSolToMerge, baseExamRaw)
      : null;
    const baseExam =
      mergedSolutionResult && mergedSolutionResult.matchedQuestionCount > 0
        ? mergedSolutionResult.mergedExam
        : baseExamRaw;
    const solContent =
      (overridePartial?.detailedSolutionContent ?? onlineSolutionText).trim() ||
      (mergedSolutionResult && mergedSolutionResult.matchedQuestionCount > 0
        ? mergedSolutionResult.formattedSolutionSummary
        : rawSolToMerge.trim());
    const solFileName =
      overridePartial?.detailedSolutionFileName !== undefined
        ? overridePartial.detailedSolutionFileName || undefined
        : onlineSolutionFileName || undefined;

    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://smarttest.edu.vn';

    const nowFormatted = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const enrichedExam: ExamData = {
      ...baseExam,
      title,
      subject: subj,
      durationMinutes: duration,
    };

    return {
      id: `ONLINE-ASSIGN-${code.toUpperCase()}`,
      examCode: code,
      examLink: `${origin}/?examCode=${encodeURIComponent(code)}`,
      examTitle: title,
      subject: subj,
      assignedClasses: classes,
      startTime: start,
      endTime: end,
      durationMinutes: duration,
      mode,
      violationLevel: level,
      maxViolations: maxVio,
      sourceMode: srcMode,
      sourceBankExamId: srcMode === 'bank' ? selectedOnlineBankId : undefined,
      detailedSolutionFileName: solFileName,
      detailedSolutionContent: solContent.trim() || undefined,
      examData: enrichedExam,
      createdAt: nowFormatted,
    };
  };

  const handleSelectBankExamForOnline = (item: SavedBankExamItem) => {
    setSelectedOnlineBankId(item.id);
    setOnlineSourceMode('bank');
    setOnlineSelectedExamData(item.examData);
    setOnlineConfigTitle(item.examData.title || 'Kiểm Tra Định Kỳ - Chuẩn GDPT 2018');
    setOnlineConfigSubject(item.examData.subject || 'Vật Lý 12');
    setOnlineDurationMinutes(item.examData.durationMinutes || 50);
    if (item.onlineExamCode) {
      setOnlineDispatchCode(item.onlineExamCode);
    }
    onUpdateExamData(item.examData);
  };

  const handleUploadOnlineExamFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setOnlineUploadedExamFileName(file.name);
    setOnlineSourceMode('upload_with_solution');
    setIsScrambling(true);

    try {
      const parsed = await parseUploadedExamFile(file);
      const detectedTitle =
        parsed.adminHeader?.examTerm ||
        parsed.examData.title ||
        file.name.replace(/\.(docx|doc|pdf|txt|json)$/i, '');
      const detectedSubject =
        parsed.adminHeader?.subjectName || parsed.examData.subject || onlineConfigSubject || 'Vật Lý 12';
      const detectedDuration =
        parsed.adminHeader?.durationMinutes || parsed.examData.durationMinutes || 50;

      let updatedExam: ExamData = {
        ...parsed.examData,
        title: detectedTitle,
        subject: detectedSubject,
        durationMinutes: detectedDuration,
      };

      // If Phần B (Detailed Solutions & Answer Key) was already uploaded or entered, automatically re-merge it into the newly parsed Phần A exam
      const pendingSolutionSource = onlineRawSolutionDocText.trim() || onlineSolutionText.trim();
      let syncedCount = 0;
      if (pendingSolutionSource) {
        const mergedRes = parseAndMergeDetailedSolutionDocument(pendingSolutionSource, updatedExam);
        if (mergedRes.matchedQuestionCount > 0) {
          updatedExam = mergedRes.mergedExam;
          syncedCount = mergedRes.matchedQuestionCount;
          setOnlineSyncedSolutionCount(mergedRes.matchedQuestionCount);
          setOnlineSolutionText(mergedRes.formattedSolutionSummary);
        }
      }

      setIsScrambling(false);
      setOnlineSelectedExamData(updatedExam);
      setOnlineConfigTitle(detectedTitle);
      setOnlineConfigSubject(detectedSubject);
      setOnlineDurationMinutes(detectedDuration);
      onUpdateExamData(updatedExam);

      if (isOnlinePublished && onSaveOnlineAssignment) {
        onSaveOnlineAssignment(
          buildSynchronizedAssignmentPayload({
            examData: updatedExam,
            examTitle: detectedTitle,
            subject: detectedSubject,
            durationMinutes: detectedDuration,
            sourceMode: 'upload_with_solution',
          })
        );
      }

      const totalQ =
        updatedExam.part1.length + updatedExam.part2.length + updatedExam.part3.length;
      setScrambleToastMessage(
        syncedCount > 0
          ? `Đã bóc tách Đề thi Phần A "${file.name}" (${totalQ} câu · ${parsed.imageCount} hình vẽ) và đồng bộ ${syncedCount} đáp án + lời giải chi tiết Phần B!`
          : `Đã bóc tách Đề thi Phần A "${file.name}" (${totalQ} câu: P.I ${updatedExam.part1.length}c · P.II ${updatedExam.part2.length}c · P.III ${updatedExam.part3.length}c · ${parsed.imageCount} hình vẽ)!`
      );
      window.setTimeout(() => setScrambleToastMessage(null), 5000);
    } catch {
      setIsScrambling(false);
      const fallbackTitle = file.name.replace(/\.(docx|doc|pdf|txt|json)$/i, '');
      const fallbackExam: ExamData = {
        ...ENTRANCE_PHYSICS_28_EXAM,
        title: fallbackTitle,
      };
      setOnlineSelectedExamData(fallbackExam);
      setOnlineConfigTitle(fallbackTitle);
      onUpdateExamData(fallbackExam);
    }
  };

  const applyDetailedSolutionsTextToExam = (rawText: string, baseExam: ExamData): ExamData => {
    if (!rawText || !rawText.trim()) return baseExam;
    const { mergedExam, matchedQuestionCount } = parseAndMergeDetailedSolutionDocument(
      rawText,
      baseExam
    );
    if (matchedQuestionCount > 0) {
      setOnlineSyncedSolutionCount(matchedQuestionCount);
    }
    return mergedExam;
  };

  const handleUploadDetailedSolutionFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setOnlineSolutionFileName(file.name);
    setOnlineSourceMode('upload_with_solution');
    try {
      const extractedText = await extractRawTextFromUploadedDocument(file);
      const validText =
        extractedText && !extractedText.includes('\u0000') && extractedText.trim().length > 10
          ? extractedText
          : '';

      if (validText) {
        setOnlineRawSolutionDocText(validText);
        const {
          mergedExam,
          formattedSolutionSummary,
          matchedQuestionCount,
        } = parseAndMergeDetailedSolutionDocument(validText, onlineSelectedExamData);

        const displaySummary =
          matchedQuestionCount > 0 ? formattedSolutionSummary : validText.slice(0, 20000);

        setOnlineSyncedSolutionCount(matchedQuestionCount);
        setOnlineSolutionText(displaySummary);
        setOnlineSelectedExamData(mergedExam);
        onUpdateExamData(mergedExam);

        if (isOnlinePublished && onSaveOnlineAssignment) {
          onSaveOnlineAssignment(
            buildSynchronizedAssignmentPayload({
              examData: mergedExam,
              detailedSolutionContent: displaySummary,
              detailedSolutionFileName: file.name,
              sourceMode: 'upload_with_solution',
            })
          );
        }

        const totalQ =
          mergedExam.part1.length + mergedExam.part2.length + mergedExam.part3.length;
        setScrambleToastMessage(
          `Đã bóc tách & đồng bộ Đáp án + Lời giải chi tiết Phần B "${file.name}" (${matchedQuestionCount}/${totalQ} câu hỏi) vào hệ thống!`
        );
        window.setTimeout(() => setScrambleToastMessage(null), 5000);
      } else {
        const fallbackSummary = [
          ...onlineSelectedExamData.part1.map((q, idx) => `Câu ${idx + 1}: ${q.explanation}`),
          ...onlineSelectedExamData.part2.map(
            (q, idx) => `Câu ${onlineSelectedExamData.part1.length + idx + 1}: ${q.explanation}`
          ),
          ...onlineSelectedExamData.part3.map(
            (q, idx) =>
              `Câu ${
                onlineSelectedExamData.part1.length + onlineSelectedExamData.part2.length + idx + 1
              }: ${q.explanation}`
          ),
        ].join('\n\n');
        setOnlineSolutionText(fallbackSummary);
      }
    } catch {
      const fallbackSummary = onlineSelectedExamData.part1
        .map((q, idx) => `Câu ${idx + 1}: ${q.explanation}`)
        .join('\n');
      setOnlineSolutionText(fallbackSummary);
    }
  };

  const handleToggleOnlineClass = (clsName: string) => {
    setSelectedOnlineClasses((prev) => {
      const exists = prev.includes(clsName);
      const next = exists ? prev.filter((c) => c !== clsName) : [...prev, clsName];
      const finalClasses = next.length > 0 ? next : [clsName];
      if (isOnlinePublished && onSaveOnlineAssignment) {
        onSaveOnlineAssignment(
          buildSynchronizedAssignmentPayload({ assignedClasses: finalClasses })
        );
      }
      return finalClasses;
    });
  };

  const handleAddCustomClass = () => {
    const clean = newClassNameInput.trim().toUpperCase();
    if (!clean) return;
    if (!availableClasses.includes(clean)) {
      const nextAvailable = [...availableClasses, clean];
      setAvailableClasses(nextAvailable);
      try {
        localStorage.setItem(SCHOOL_CLASSES_STORAGE_KEY, JSON.stringify(nextAvailable));
      } catch {
        // Ignore storage error
      }
    }
    if (!selectedOnlineClasses.includes(clean)) {
      const nextSelected = [...selectedOnlineClasses, clean];
      setSelectedOnlineClasses(nextSelected);
      if (isOnlinePublished && onSaveOnlineAssignment) {
        onSaveOnlineAssignment(
          buildSynchronizedAssignmentPayload({ assignedClasses: nextSelected })
        );
      }
    }
    setNewClassNameInput('');
  };

  const handleDeleteOnlineClass = (clsName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextAvailable = availableClasses.filter((c) => c !== clsName);
    setAvailableClasses(nextAvailable);
    try {
      localStorage.setItem(SCHOOL_CLASSES_STORAGE_KEY, JSON.stringify(nextAvailable));
    } catch {
      // Ignore storage error
    }

    const nextSelected = selectedOnlineClasses.filter((c) => c !== clsName);
    const fallbackSelected =
      nextSelected.length > 0
        ? nextSelected
        : nextAvailable.length > 0
        ? [nextAvailable[0]]
        : [];
    setSelectedOnlineClasses(fallbackSelected);
    if (isOnlinePublished && onSaveOnlineAssignment && fallbackSelected.length > 0) {
      onSaveOnlineAssignment(
        buildSynchronizedAssignmentPayload({ assignedClasses: fallbackSelected })
      );
    }
  };

  const handlePublishAndSyncOnlineExam = () => {
    const payload = buildSynchronizedAssignmentPayload();
    setOnlineSelectedExamData(payload.examData);
    if (onSaveOnlineAssignment) {
      onSaveOnlineAssignment(payload);
    } else {
      onUpdateExamData(payload.examData);
    }
    setOnlineAssignmentCode(payload.examCode);
    setIsOnlinePublished(true);
    setScrambleToastMessage(
      `Đã phát hành & đồng bộ toàn hệ thống Bài Thi Online [Mã: ${payload.examCode}] cho lớp ${payload.assignedClasses.join(', ')}!`
    );
    window.setTimeout(() => setScrambleToastMessage(null), 5000);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8 relative">
      {/* Floating Toast Notification on Scrambler Completion */}
      {scrambleToastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-md bg-emerald-950/95 border-2 border-emerald-500 text-emerald-100 px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3.5 backdrop-blur-md no-print animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="text-sm sm:text-base font-bold text-white">
              {scrambleToastMessage}
            </div>
            <div className="text-xs text-emerald-300 font-mono">
              Mã đề: {scrambledExams.map((v) => v.code).join(', ')} · Đã đồng bộ Word, Excel TNMaker & ZIP
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScrambleToastMessage(null)}
            className="text-emerald-300 hover:text-white p-1 rounded-lg"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Workspace Header & Sub-Navigation — Centered & Compact Layout */}
      <div className="bg-[#18182e] border border-indigo-900/60 rounded-2xl px-4 py-4 sm:px-6 sm:py-4 shadow-md space-y-3 no-print">
        <div className="flex flex-col items-center text-center space-y-2.5">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
            Kiểm Tra Thông Minh — Chuẩn Cấu Trúc GDPT 2018
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono tabular-nums">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 whitespace-nowrap">
              Mã ngân hàng: <strong className="text-white">{examData.examId}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 whitespace-nowrap">
              Phần I: <strong className="text-white">{examData.part1.length} câu</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 whitespace-nowrap">
              Phần II: <strong className="text-white">{examData.part2.length} câu ({examData.part2.length * 4} ý Đ/S)</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 whitespace-nowrap">
              Phần III: <strong className="text-white">{examData.part3.length} câu</strong>
            </span>
            <span className="px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 font-bold whitespace-nowrap">
              Tổng điểm chuẩn: {totalExamPoints.toFixed(2)} / 10.00 điểm
            </span>
          </div>
        </div>

        {/* Interactive Workspace Switcher Tabs — Balanced 4-Column Bar */}
        {!isStandaloneScrambler && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveSubTab('bank')}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm sm:text-base font-bold rounded-xl border transition-all whitespace-nowrap ${
                activeSubTab === 'bank'
                  ? 'bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-950/40'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:border-violet-500/50'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>1. Ngân Hàng Đề</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setScramblerWizardStep(1);
                setScramblerCompletedZipName(null);
                setActiveSubTab('scrambler');
              }}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm sm:text-base font-bold rounded-xl border transition-all whitespace-nowrap ${
                activeSubTab === 'scrambler'
                  ? 'bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-950/40'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:border-violet-500/50'
              }`}
            >
              <Shuffle className="w-4 h-4 shrink-0" />
              <span>2. Trộn Đề</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('monitor')}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm sm:text-base font-bold rounded-xl border transition-all whitespace-nowrap ${
                activeSubTab === 'monitor'
                  ? 'bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-950/40'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:border-violet-500/50'
              }`}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span>3. Giám Sát LAN</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('online_exam')}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm sm:text-base font-bold rounded-xl border transition-all whitespace-nowrap ${
                activeSubTab === 'online_exam'
                  ? 'bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-950/40'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white hover:border-violet-500/50'
              }`}
            >
              <Play className="w-4 h-4 shrink-0" />
              <span>4. Tổ Chức Thi Online</span>
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAL: PREVIEW & COPY SAMPLE WORD TEMPLATE (CHUẨN GDPT 2018)
      ===================================================================== */}
      {showSampleTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-[#18182e] border border-violet-700/70 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Mẫu Định Dạng Đề Thi Word Chuẩn Cấu Trúc GDPT 2018
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Giáo viên tải file mẫu này về, chỉnh sửa nội dung câu hỏi theo đúng định dạng rồi tải lên hệ thống để trộn đề tự động không bị lỗi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleTemplateModal(false)}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="font-bold text-violet-300">Phần I (Trắc nghiệm ABCD)</div>
                  <p className="text-slate-300">
                    Nhận diện mọi kiểu đáp án: dấu <code className="text-amber-300">*A.</code> /{' '}
                    <code className="text-amber-300">A.*</code>, gạch chân{' '}
                    <code className="text-emerald-300">&lt;u&gt;A.&lt;/u&gt;</code>, tô màu đỏ hoặc dòng{' '}
                    <code className="text-emerald-300">Đáp án: A</code>.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="font-bold text-violet-300">Phần II (Đúng/Sai a, b, c, d)</div>
                  <p className="text-slate-300">
                    Hỗ trợ chuỗi <code className="text-amber-300">DSSD</code> /{' '}
                    <code className="text-amber-300">ĐSĐS</code> ở cuối câu, dấu{' '}
                    <code className="text-emerald-300">*a)</code>, gạch chân hoặc nhãn{' '}
                    <code className="text-emerald-300">(Đúng)/(Sai)</code>.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="font-bold text-violet-300">Phần III (Trả lời ngắn & Hình vẽ)</div>
                  <p className="text-slate-300">
                    Tự động bắt <code className="text-emerald-300">Đáp số: 24</code>,{' '}
                    <code className="text-emerald-300">Đáp án: 200</code>,{' '}
                    <code className="text-emerald-300">Kết quả: 6</code> và giữ nguyên hình vẽ/đồ thị đính kèm.
                  </p>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto">
                {buildSampleWordTemplateText(ENTRANCE_PHYSICS_28_EXAM)}
              </pre>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    buildSampleWordTemplateText(ENTRANCE_PHYSICS_28_EXAM)
                  );
                  setCopiedTemplateNotice(true);
                  window.setTimeout(() => setCopiedTemplateNotice(false), 3000);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>
                  {copiedTemplateNotice ? '✓ Đã sao chép nội dung mẫu' : 'Sao Chép Nội Dung Mẫu'}
                </span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadSampleWordTemplate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>📥 Tải File Đề Word Mẫu (.doc)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 1: NGÂN HÀNG ĐỀ (2 NHÓM CHỨC NĂNG: BỘ LỌC THƯ MỤC & SOẠN ĐỀ 4 BƯỚC)
      ===================================================================== */}
      {activeSubTab === 'bank' && (
        <div className="space-y-8">
          {/* =================================================================
              NHÓM CHỨC NĂNG 1: BỘ LỌC CÁC THƯ MỤC CHỨA ĐỀ (KTTX, KTGHK, KTCHK, THI TỐT NGHIỆP...)
          ================================================================= */}
          <div className="bg-[#18182e] border border-indigo-900/60 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-violet-400">
                  <Folder className="w-3.5 h-3.5" />
                  <span>NHÓM CHỨC NĂNG 1 · KHO LƯU TRỮ & PHÂN LOẠI KỲ THI</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span>1. Bộ Lọc Thư Mục Chứa Đề Thi</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Chọn thư mục kỳ thi (KTTX, KTGHK, KTCHK, THI TỐT NGHIỆP...) để lọc nhanh các đề đã lưu hoặc tạo thêm thư mục mới.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bankSearchQuery}
                    onChange={(e) => setBankSearchQuery(e.target.value)}
                    placeholder="Tìm tên đề, môn học, mã..."
                    className="pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 w-56"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddFolderModal((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-indigo-950/90 hover:bg-indigo-900 text-violet-200 border border-violet-600/60 rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  <FolderPlus className="w-4 h-4 text-violet-400" />
                  <span>+ Tạo Thư Mục Mới</span>
                </button>
              </div>
            </div>

            {/* Form tạo thư mục mới (nếu bật) */}
            {showAddFolderModal && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-violet-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-violet-300">
                    Thêm Thư Mục Chứa Đề Mới
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddFolderModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={newFolderCode}
                    onChange={(e) => setNewFolderCode(e.target.value)}
                    placeholder="Mã viết tắt (VD: KSCL, HSG...)"
                    className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                  />
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Tên thư mục (VD: Khảo sát chất lượng)"
                    className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newFolderDesc}
                      onChange={(e) => setNewFolderDesc(e.target.value)}
                      placeholder="Mô tả ngắn..."
                      className="flex-1 px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCustomBankFolder}
                      className="px-4 py-2 text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Lưu Thư Mục
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Folder Filter Tabs / Cards (KTTX, KTGHK, KTCHK, THI TỐT NGHIỆP...) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {bankFolders.map((folder) => {
                const count = savedBankExams.filter((item) => item.folderId === folder.id).length;
                const isSelected = selectedFolderFilter === folder.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      setSelectedFolderFilter((prev) => (prev === folder.id ? '' : folder.id));
                      setTargetSaveFolderId(folder.id);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-violet-600/25 border-violet-400 text-white shadow-md'
                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${folder.badgeClass}`}
                      >
                        <Folder className="w-3.5 h-3.5 shrink-0" />
                        {folder.code}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-950/80 text-slate-300 border border-slate-800 whitespace-nowrap shrink-0">
                        {count} đề
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white line-clamp-1">
                        {folder.name}
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-1">
                        {folder.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Chỉ hiển thị danh sách đề khi kích chọn vào một thư mục cụ thể (hoặc khi tìm kiếm) */}
            {(selectedFolderFilter !== '' || bankSearchQuery.trim() !== '') &&
              (() => {
                const filteredExams = savedBankExams.filter((item) => {
                  if (selectedFolderFilter !== '' && item.folderId !== selectedFolderFilter) {
                    return false;
                  }
                  if (bankSearchQuery.trim()) {
                    const q = bankSearchQuery.toLowerCase();
                    return (
                      item.examData.title.toLowerCase().includes(q) ||
                      item.examData.subject.toLowerCase().includes(q) ||
                      item.examData.examId.toLowerCase().includes(q) ||
                      (item.onlineExamCode || '').toLowerCase().includes(q)
                    );
                  }
                  return true;
                });

                const activeFolderObj = bankFolders.find((f) => f.id === selectedFolderFilter);

                return (
                  <div className="pt-2 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono">
                      <span>
                        Đang hiển thị {filteredExams.length} đề thi trong{' '}
                        {activeFolderObj
                          ? `thư mục [${activeFolderObj.code} — ${activeFolderObj.name}]`
                          : 'kết quả tìm kiếm'}
                      </span>
                      <div className="flex items-center gap-3">
                        <span>Chọn đề bất kỳ để Kiểm định, Trộn đề hoặc Giao mã bài thi</span>
                        {selectedFolderFilter !== '' && (
                          <button
                            type="button"
                            onClick={() => setSelectedFolderFilter('')}
                            className="text-violet-300 hover:text-white underline font-sans font-semibold"
                          >
                            Thu gọn
                          </button>
                        )}
                      </div>
                    </div>

                    {filteredExams.length === 0 ? (
                      <div className="p-6 rounded-xl bg-slate-950/50 border border-slate-800/80 text-center text-sm text-slate-400">
                        Chưa có đề thi nào trong thư mục này. Hãy tải đề lên ở{' '}
                        <strong className="text-violet-300">Nhóm chức năng 2 (Bước 1 → Bước 3)</strong>{' '}
                        bên dưới để lưu đề vào kho.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                        {filteredExams.map((item) => {
                          const folderMeta =
                            bankFolders.find((f) => f.id === item.folderId) || bankFolders[0];
                          const isCurrentActive =
                            item.examData.examId === examData.examId &&
                            item.examData.title === examData.title;
                          return (
                            <div
                              key={item.id}
                              className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                                isCurrentActive
                                  ? 'bg-indigo-950/60 border-violet-500/70'
                                  : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                              }`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${folderMeta.badgeClass}`}
                                  >
                                    <Folder className="w-3 h-3" />
                                    {folderMeta.code}
                                  </span>
                                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                                    {item.onlineExamCode && (
                                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 font-bold">
                                        Mã thi: {item.onlineExamCode}
                                      </span>
                                    )}
                                    <span>Lưu: {item.savedAt}</span>
                                  </div>
                                </div>
                                <div className="text-sm font-bold text-white line-clamp-1">
                                  {item.examData.title}
                                </div>
                                <div className="text-xs text-slate-400 font-mono">
                                  Môn: {item.examData.subject} · {item.examData.durationMinutes} phút ·
                                  Phần I: {item.examData.part1.length}c · Phần II:{' '}
                                  {item.examData.part2.length}c · Phần III:{' '}
                                  {item.examData.part3.length}c
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleLoadSavedBankItem(item, 'inspect')}
                                    className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                                  >
                                    Kiểm định đề
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleLoadSavedBankItem(item, 'scrambler')}
                                    className="px-2.5 py-1 text-xs font-semibold bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/40 rounded-lg transition-colors"
                                  >
                                    Trộn đề
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleLoadSavedBankItem(item, 'online_code')}
                                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 rounded-lg transition-colors"
                                  >
                                    Mã bài thi
                                  </button>
                                </div>
                                <HelpTooltip
                                  title="Xoá Đề Khỏi Thư Mục"
                                  description="Gỡ bỏ đề thi này khỏi thư mục lưu trữ hiện tại trong Ngân hàng đề."
                                  align="end"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSavedBankItem(item.id)}
                                    title="Xoá đề khỏi thư mục"
                                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </HelpTooltip>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
          </div>

          {/* =================================================================
              NHÓM CHỨC NĂNG 2: QUY TRÌNH SOẠN ĐỀ & KIỂM ĐỊNH (4 BƯỚC LIÊN HOÀN)
          ================================================================= */}
          <div className="bg-[#18182e] border border-indigo-900/60 rounded-2xl p-6 space-y-6 shadow-xl">
            {/* Tiêu đề Nhóm 2 & Thanh Tiến Trình 4 Bước */}
            <div className="space-y-4 pb-5 border-b border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>NHÓM CHỨC NĂNG 2 · QUY TRÌNH SOẠN ĐỀ 4 BƯỚC</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    2. Soạn Đề, Kiểm Định, Lưu Kho & Tạo Mã Bài Thi Trực Tuyến
                  </h2>
                </div>

                {uploadedFileName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-xs font-mono text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Tệp đang nạp: {uploadedFileName}
                  </span>
                )}
              </div>

              {/* 4-Step Interactive Stepper */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    step: 1 as const,
                    title: 'Bước 1. Soạn Đề',
                    sub: 'Tải lên file Word / PDF / JSON từ máy tính',
                  },
                  {
                    step: 2 as const,
                    title: 'Bước 2. Kiểm Định Đề',
                    sub: 'Rà soát câu hỏi, đáp án & điều chỉnh trực tiếp',
                  },
                  {
                    step: 3 as const,
                    title: 'Bước 3. Lưu Đề',
                    sub: 'Lưu tự động vào thư mục kỳ thi tương ứng',
                  },
                  {
                    step: 4 as const,
                    title: 'Bước 4. Tạo Mã Bài Thi',
                    sub: 'Giao mã kiểm tra trực tuyến cho học sinh',
                  },
                ].map((item) => {
                  const isActive = bankWizardStep === item.step;
                  const isCompleted = bankWizardStep > item.step || (item.step === 3 && isExamSavedInStep3);
                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setBankWizardStep(item.step)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        isActive
                          ? 'bg-violet-600 text-white border-violet-400 shadow-lg shadow-violet-950/50'
                          : isCompleted
                          ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200 hover:bg-emerald-950/60'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isActive
                            ? 'bg-white text-violet-700'
                            : isCompleted
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isCompleted && !isActive ? <Check className="w-4 h-4" /> : item.step}
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold leading-snug">{item.title}</div>
                        <div
                          className={`text-xs leading-snug ${
                            isActive ? 'text-violet-100' : 'text-slate-400'
                          }`}
                        >
                          {item.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {jsonSuccess && (
              <div className="px-4 py-3 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{jsonSuccess}</span>
                </div>
                <span className="font-mono text-xs text-emerald-400">Đã đồng bộ dữ liệu</span>
              </div>
            )}

            {jsonError && (
              <div className="px-4 py-3 rounded-xl bg-rose-950/80 border border-rose-700/70 text-rose-200 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Lỗi dữ liệu: {jsonError}</span>
              </div>
            )}

            {/* ===============================================================
                BƯỚC 1: SOẠN ĐỀ (TẢI LÊN TỪ MÁY TÍNH FILE WORD / PDF / JSON)
            =============================================================== */}
            {bankWizardStep === 1 && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-950/70 border-2 border-dashed border-violet-500/60 flex flex-col items-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-300">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5 max-w-2xl">
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      Bước 1. Tải Lên Đề Thi Từ Máy Tính (Word / PDF / JSON)
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Hỗ trợ tải lên trực tiếp file <strong className="text-white">.docx, .doc, .pdf, .json</strong> có định dạng giống hệt file tải lên trong Tab Trộn đề. Hệ thống tự động bóc tách đầy đủ 3 phần (Phần I, Phần II, Phần III), công thức Toán/Lý/Hoá, hình vẽ minh họa và đáp án đúng (bôi đỏ, gạch chân hoặc dấu *).
                    </p>
                  </div>

                  {/* Chọn trước loại kỳ thi (thư mục đích) */}
                  <div className="w-full max-w-2xl pt-1">
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
                      Chọn Loại Kỳ Thi / Thư Mục Dự Kiến Lưu Đề:
                    </label>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {bankFolders.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTargetSaveFolderId(f.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center gap-1.5 ${
                            targetSaveFolderId === f.id
                              ? 'bg-violet-600 text-white border-violet-400 shadow-sm'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <Folder className="w-3.5 h-3.5" />
                          <span>
                            {f.code} ({f.name})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <label className="inline-flex items-center gap-2.5 px-6 py-3 text-sm sm:text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/60 cursor-pointer transition-all">
                      <Upload className="w-5 h-5" />
                      <span>📁 Chọn File Đề (Word / PDF / JSON) Từ Máy Tính</span>
                      <input
                        type="file"
                        accept=".doc,.docx,.pdf,.json,.txt"
                        onChange={handleBankStep1FileUpload}
                        className="hidden"
                      />
                    </label>

                    <label
                      title="Chọn file đề thô để tự động chuẩn hoá sang mẫu GDPT 2018 và tải file chuẩn về máy"
                      className="border border-violet-500 text-violet-300 hover:bg-violet-900/40 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      <span>✨ Chuẩn Hoá Định Dạng</span>
                      <input
                        type="file"
                        accept=".doc,.docx,.pdf,.json,.txt"
                        onChange={handleNormalizeFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Thanh tóm tắt đề hiện tại & Nút chuyển sang Bước 2 */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white">
                      Đề đang nạp sẵn: {examData.title}
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      Phần I: {examData.part1.length} câu · Phần II: {examData.part2.length} câu ·
                      Phần III: {examData.part3.length} câu · Tổng điểm:{' '}
                      {totalExamPoints.toFixed(2)}đ
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBankWizardStep(2)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Tiếp Tục Sang Bước 2: Kiểm Định Đề</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                BƯỚC 2: KIỂM ĐỊNH ĐỀ (NẾU ĐÚNG QUA BƯỚC TIẾP THEO, NẾU SAI ĐIỀU CHỈNH TRỰC TIẾP)
            =============================================================== */}
            {bankWizardStep === 2 && (
              <div className="space-y-6">
                {/* Bảng tổng hợp kết quả kiểm định tự động */}
                <div className="p-5 rounded-xl bg-slate-950/80 border border-indigo-800/60 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          KẾT QUẢ BÓC TÁCH & KIỂM ĐỊNH TỰ ĐỘNG ({examData.part1.length + examData.part2.length + examData.part3.length} CÂU)
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">
                        Bước 2. Kiểm Định Nội Dung, Công Thức, Hình Vẽ & Đáp Án
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300">
                        Nếu nội dung đã chính xác, bấm <strong className="text-emerald-300">"Xác Nhận Đúng — Sang Bước 3: Lưu Đề"</strong>. Nếu có câu hỏi hoặc đáp án cần chỉnh sửa, Thầy/Cô bấm vào đáp án hoặc nút <strong className="text-violet-300">"Điều chỉnh trực tiếp"</strong> ngay tại câu đó.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setBankWizardStep(1)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Tải Lại File Khác</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsExamSavedInStep3(false);
                          setBankWizardStep(3);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/60 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đề Đã Đúng — Sang Bước 3: Lưu Đề</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Thống kê nhanh 3 phần */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-400">Phần I (Trắc nghiệm ABCD)</div>
                        <div className="text-base font-bold text-white">
                          {examData.part1.length} câu hỏi
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-xs font-mono text-emerald-300">
                        Đủ đáp án A/B/C/D
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-400">Phần II (Đúng / Sai a, b, c, d)</div>
                        <div className="text-base font-bold text-white">
                          {examData.part2.length} câu ({examData.part2.length * 4} ý Đ/S)
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-xs font-mono text-emerald-300">
                        Đủ 4 ý / câu
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-400">Phần III (Trả lời ngắn)</div>
                        <div className="text-base font-bold text-white">
                          {examData.part3.length} câu · Tổng {totalExamPoints.toFixed(2)}đ
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-xs font-mono text-emerald-300">
                        Đủ đáp số
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bộ lọc Phần I / Phần II / Phần III để rà soát và điều chỉnh trực tiếp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-950/90 border border-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setInspectorPart('I')}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        inspectorPart === 'I'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Phần I: Nhiều Lựa Chọn ({examData.part1.length} câu)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorPart('II')}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        inspectorPart === 'II'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Phần II: Đúng / Sai ({examData.part2.length} câu)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorPart('III')}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        inspectorPart === 'III'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Phần III: Trả Lời Ngắn ({examData.part3.length} câu)
                    </button>
                  </div>

                  <div className="text-xs text-slate-400 font-mono">
                    💡 Mẹo: Bấm trực tiếp vào phương án A/B/C/D hoặc nút ĐÚNG/SAI để đổi nhanh đáp án đúng
                  </div>
                </div>

                {/* Danh sách câu hỏi Phần I */}
                {inspectorPart === 'I' && (
                  <div className="space-y-4">
                    {examData.part1.map((q, idx) => {
                      const isEditing = editingQuestionId === q.id;
                      const optionLabels = ['A', 'B', 'C', 'D'];
                      return (
                        <div
                          key={q.id}
                          className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-5 space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span className="font-mono text-base font-bold text-violet-400">
                                Câu {idx + 1} ({q.id})
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400 font-mono font-semibold">
                                Đáp án đúng: {optionLabels[q.correctIndex]}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 font-mono">
                                <span>Điểm:</span>
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0.05"
                                  max="2"
                                  value={q.points}
                                  onChange={(e) =>
                                    handlePointChange('I', q.id, parseFloat(e.target.value))
                                  }
                                  className="w-20 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-right text-white font-mono tabular-nums"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setEditingQuestionId(isEditing ? null : q.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-violet-200 hover:text-white bg-indigo-950/90 border border-violet-700/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>
                                  {isEditing ? 'Đóng điều chỉnh' : 'Điều chỉnh trực tiếp'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="space-y-3 bg-slate-900/90 p-4 rounded-xl border border-violet-800/50">
                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Nội dung câu hỏi (hỗ trợ công thức LaTeX $...$):
                                </label>
                                <textarea
                                  value={q.question}
                                  onChange={(e) =>
                                    handleUpdateQuestionField('I', q.id, 'question', e.target.value)
                                  }
                                  rows={3}
                                  className="w-full font-mono text-sm bg-slate-950 text-white p-3 rounded-lg border border-slate-700"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {q.options.map((optVal, oIdx) => (
                                  <div key={oIdx} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-mono font-bold text-violet-300">
                                        Phương án {optionLabels[oIdx]}:
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdatePart1CorrectIndex(q.id, oIdx)}
                                        className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                                          q.correctIndex === oIdx
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        {q.correctIndex === oIdx
                                          ? '✓ Đáp án đúng'
                                          : 'Đặt làm đáp án đúng'}
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={optVal}
                                      onChange={(e) =>
                                        handleUpdatePart1OptionText(q.id, oIdx, e.target.value)
                                      }
                                      className="w-full font-mono text-sm bg-slate-950 text-white px-3 py-2 rounded-lg border border-slate-700"
                                    />
                                  </div>
                                ))}
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Lời giải / Ghi chú:
                                </label>
                                <textarea
                                  value={q.explanation}
                                  onChange={(e) =>
                                    handleUpdateQuestionField(
                                      'I',
                                      q.id,
                                      'explanation',
                                      e.target.value
                                    )
                                  }
                                  rows={2}
                                  className="w-full font-mono text-sm bg-slate-950 text-white p-3 rounded-lg border border-slate-700"
                                />
                              </div>
                            </div>
                          )}

                          <div className="text-base sm:text-lg text-slate-100 leading-relaxed">
                            <MathText text={q.question} />
                          </div>

                          {(() => {
                            const resolvedImgUrl = getResolvedQuestionImage(q, 'I', idx + 1);
                            if (!resolvedImgUrl) return null;
                            return (
                              <div className="my-2 p-3.5 rounded-xl bg-white/95 border border-indigo-500/40 flex flex-col items-center justify-center shadow-sm">
                                <img
                                  src={resolvedImgUrl}
                                  alt={`Hình minh họa Câu ${idx + 1}`}
                                  className="max-h-60 w-auto object-contain rounded-lg"
                                />
                                <span className="mt-1.5 text-xs font-mono text-slate-600">
                                  Hình vẽ / Đồ thị đính kèm Câu {idx + 1}
                                </span>
                              </div>
                            );
                          })()}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === q.correctIndex;
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => handleUpdatePart1CorrectIndex(q.id, oIdx)}
                                  title="Bấm để chọn phương án này làm đáp án đúng"
                                  className={`p-3.5 rounded-xl border text-left text-base font-medium flex items-start gap-3 transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-100'
                                      : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-200'
                                  }`}
                                >
                                  <span className="font-mono font-bold text-base mt-0.5 shrink-0">
                                    {optionLabels[oIdx]}.
                                  </span>
                                  <div className="flex-1">
                                    <MathText text={opt} />
                                  </div>
                                  {isCorrect && (
                                    <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                                      [ĐÚNG]
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Danh sách câu hỏi Phần II */}
                {inspectorPart === 'II' && (
                  <div className="space-y-4">
                    {examData.part2.map((q, idx) => {
                      const isEditing = editingQuestionId === q.id;
                      return (
                        <div
                          key={q.id}
                          className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-5 space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span className="font-mono text-base font-bold text-violet-400">
                                Phần II · Câu {idx + 1} ({q.id})
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 font-mono">
                                <span>Điểm tối đa:</span>
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0.25"
                                  max="4"
                                  value={q.points}
                                  onChange={(e) =>
                                    handlePointChange('II', q.id, parseFloat(e.target.value))
                                  }
                                  className="w-20 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-right text-white font-mono tabular-nums"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setEditingQuestionId(isEditing ? null : q.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-violet-200 hover:text-white bg-indigo-950/90 border border-violet-700/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>
                                  {isEditing ? 'Đóng điều chỉnh' : 'Điều chỉnh trực tiếp'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="space-y-3 bg-slate-900/90 p-4 rounded-xl border border-violet-800/50">
                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Đoạn dẫn câu hỏi Phần II (LaTeX):
                                </label>
                                <textarea
                                  value={q.stem}
                                  onChange={(e) =>
                                    handleUpdateQuestionField('II', q.id, 'stem', e.target.value)
                                  }
                                  rows={3}
                                  className="w-full font-mono text-sm bg-slate-950 text-white p-3 rounded-lg border border-slate-700"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-300">
                                  Điều chỉnh 4 ý phát biểu a), b), c), d):
                                </label>
                                {q.statements.map((stmt) => (
                                  <div
                                    key={stmt.id}
                                    className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800"
                                  >
                                    <span className="font-mono font-bold text-violet-400 w-6 text-center">
                                      {stmt.id})
                                    </span>
                                    <input
                                      type="text"
                                      value={stmt.text}
                                      onChange={(e) =>
                                        handleUpdatePart2StatementText(
                                          q.id,
                                          stmt.id,
                                          e.target.value
                                        )
                                      }
                                      className="flex-1 font-mono text-sm bg-slate-900 text-white px-3 py-1.5 rounded border border-slate-700"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleTogglePart2StatementTruth(q.id, stmt.id)
                                      }
                                      className={`px-3 py-1.5 rounded font-mono text-xs font-bold shrink-0 ${
                                        stmt.isTrue
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-amber-600 text-white'
                                      }`}
                                    >
                                      {stmt.isTrue ? 'ĐÚNG' : 'SAI'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="text-base sm:text-lg text-slate-100 leading-relaxed">
                            <MathText text={q.stem} />
                          </div>

                          {(() => {
                            const resolvedImgUrl = getResolvedQuestionImage(q, 'II', idx + 1);
                            if (!resolvedImgUrl) return null;
                            return (
                              <div className="my-2 p-3.5 rounded-xl bg-white/95 border border-indigo-500/40 flex flex-col items-center justify-center shadow-sm">
                                <img
                                  src={resolvedImgUrl}
                                  alt={`Hình minh họa Phần II Câu ${idx + 1}`}
                                  className="max-h-60 w-auto object-contain rounded-lg"
                                />
                                <span className="mt-1.5 text-xs font-mono text-slate-600">
                                  Hình vẽ / Đồ thị đính kèm Phần II · Câu {idx + 1}
                                </span>
                              </div>
                            );
                          })()}

                          <div className="overflow-x-auto border border-slate-800 rounded-xl">
                            <table className="w-full text-left border-collapse text-base">
                              <thead>
                                <tr className="bg-slate-900/90 text-xs sm:text-sm text-slate-300 border-b border-slate-800">
                                  <th className="py-2.5 px-4 w-14 font-mono">Ý</th>
                                  <th className="py-2.5 px-4">Phát biểu nhận định</th>
                                  <th className="py-2.5 px-4 w-40 text-center font-mono">
                                    Đáp án (Bấm để đổi)
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/70">
                                {q.statements.map((stmt) => (
                                  <tr key={stmt.id} className="hover:bg-white/[0.02]">
                                    <td className="py-3 px-4 font-mono font-bold text-base text-violet-400 align-top">
                                      {stmt.id})
                                    </td>
                                    <td className="py-3 px-4 text-slate-100 text-base">
                                      <MathText text={stmt.text} />
                                    </td>
                                    <td className="py-3 px-4 text-center align-top">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleTogglePart2StatementTruth(q.id, stmt.id)
                                        }
                                        className={`px-3 py-1 rounded-lg font-mono text-xs font-bold border transition-colors ${
                                          stmt.isTrue
                                            ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
                                            : 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:bg-amber-900'
                                        }`}
                                      >
                                        {stmt.isTrue ? '✓ ĐÚNG (True)' : '✕ SAI (False)'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Danh sách câu hỏi Phần III */}
                {inspectorPart === 'III' && (
                  <div className="space-y-4">
                    {examData.part3.map((q, idx) => {
                      const isEditing = editingQuestionId === q.id;
                      return (
                        <div
                          key={q.id}
                          className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-5 space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span className="font-mono text-base font-bold text-violet-400">
                                Phần III · Câu {idx + 1} ({q.id})
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400 font-mono font-bold text-base">
                                Đáp số chuẩn: {q.answer} {q.unit ? `(${q.unit})` : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 font-mono">
                                <span>Điểm:</span>
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0.05"
                                  max="2"
                                  value={q.points}
                                  onChange={(e) =>
                                    handlePointChange('III', q.id, parseFloat(e.target.value))
                                  }
                                  className="w-20 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-right text-white font-mono tabular-nums"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setEditingQuestionId(isEditing ? null : q.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-violet-200 hover:text-white bg-indigo-950/90 border border-violet-700/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>
                                  {isEditing ? 'Đóng điều chỉnh' : 'Điều chỉnh trực tiếp'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/90 p-4 rounded-xl border border-violet-800/50">
                              <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Nội dung câu hỏi tính toán (LaTeX):
                                </label>
                                <textarea
                                  value={q.question}
                                  onChange={(e) =>
                                    handleUpdateQuestionField(
                                      'III',
                                      q.id,
                                      'question',
                                      e.target.value
                                    )
                                  }
                                  rows={2}
                                  className="w-full font-mono text-sm bg-slate-950 text-white p-3 rounded-lg border border-slate-700"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Đáp số chuẩn (VD: 24):
                                </label>
                                <input
                                  type="text"
                                  value={q.answer}
                                  onChange={(e) =>
                                    handleUpdateQuestionField('III', q.id, 'answer', e.target.value)
                                  }
                                  className="w-full font-mono text-base font-bold bg-slate-950 text-emerald-300 p-3 rounded-lg border border-slate-700"
                                />
                              </div>
                            </div>
                          )}

                          <div className="text-base sm:text-lg text-slate-100 leading-relaxed">
                            <MathText text={q.question} />
                          </div>

                          {(() => {
                            const resolvedImgUrl = getResolvedQuestionImage(q, 'III', idx + 1);
                            if (!resolvedImgUrl) return null;
                            return (
                              <div className="my-2 p-3.5 rounded-xl bg-white/95 border border-indigo-500/40 flex flex-col items-center justify-center shadow-sm">
                                <img
                                  src={resolvedImgUrl}
                                  alt={`Hình minh họa Phần III Câu ${idx + 1}`}
                                  className="max-h-60 w-auto object-contain rounded-lg"
                                />
                                <span className="mt-1.5 text-xs font-mono text-slate-600">
                                  Hình vẽ / Đồ thị đính kèm Phần III · Câu {idx + 1}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Thanh điều hướng cuối Bước 2 */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBankWizardStep(1)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay Lại Bước 1. Soạn Đề</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExamSavedInStep3(false);
                      setBankWizardStep(3);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Hoàn Tất Kiểm Định — Sang Bước 3: Lưu Đề</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                BƯỚC 3: LƯU ĐỀ VÀO KHO THƯ MỤC TƯƠNG ỨNG VỚI LOẠI KỲ THI
            =============================================================== */}
            {bankWizardStep === 3 && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-950/80 border border-indigo-800/60 space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <Save className="w-5 h-5 text-violet-400" />
                      <span>Bước 3. Lưu Đề Thi Vào Kho Thư Mục Tương Ứng Loại Kỳ Thi</span>
                    </h3>
                    <p className="text-sm text-slate-300">
                      Xác nhận thông tin đề thi và chọn thư mục kỳ thi (trong Nhóm chức năng 1) để lưu trữ vào ngân hàng đề.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Tên đề thi lưu vào kho:
                      </label>
                      <input
                        type="text"
                        value={draftExamTitle}
                        onChange={(e) => setDraftExamTitle(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm font-semibold bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                        placeholder="VD: ĐỀ KIỂM TRA GIỮA HỌC KỲ I - VẬT LÝ 12"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
                          Môn học:
                        </label>
                        <input
                          type="text"
                          value={draftExamSubject}
                          onChange={(e) => setDraftExamSubject(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm font-semibold bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
                          Thời gian (phút):
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={180}
                          value={draftExamDuration}
                          onChange={(e) => setDraftExamDuration(Number(e.target.value) || 50)}
                          className="w-full px-3.5 py-2.5 text-sm font-mono font-bold bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Chọn Thư Mục Lưu Đề (Liên kết trực tiếp với Nhóm 1) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Chọn Thư Mục Kỳ Thi Để Lưu Đề (Nhóm chức năng 1):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {bankFolders.map((folder) => {
                        const isChosen = targetSaveFolderId === folder.id;
                        return (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => setTargetSaveFolderId(folder.id)}
                            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                              isChosen
                                ? 'bg-violet-600/30 border-violet-400 text-white ring-2 ring-violet-500/40'
                                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded border ${folder.badgeClass}`}
                              >
                                <Folder className="w-3 h-3" />
                                {folder.code}
                              </span>
                              {isChosen && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                            </div>
                            <div className="text-sm font-bold text-white">{folder.name}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBankWizardStep(2)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay Lại Bước 2 (Kiểm Định Đề)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveExamToBankFolder}
                      className="inline-flex items-center gap-2.5 px-6 py-3 text-sm sm:text-base font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl shadow-xl shadow-violet-950/60 transition-all"
                    >
                      <Save className="w-5 h-5" />
                      <span>
                        💾 Lưu Đề Thi Vào Thư Mục [
                        {bankFolders.find((f) => f.id === targetSaveFolderId)?.code || 'KHO ĐỀ'}]
                      </span>
                    </button>
                  </div>
                </div>

                {/* Hộp điều hướng xuất hiện ngay sau khi bấm Lưu đề */}
                {isExamSavedInStep3 && (
                  <div className="p-6 rounded-2xl bg-emerald-950/50 border-2 border-emerald-500/80 space-y-5 animate-in fade-in duration-200">
                    <div className="flex items-start gap-3.5">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-lg font-bold text-white">
                          Đã Lưu Đề Thi Vào Kho Thư Mục [
                          {bankFolders.find((f) => f.id === targetSaveFolderId)?.code}] Thành Công!
                        </h4>
                        <p className="text-sm text-emerald-200">
                          Đề thi <strong>"{draftExamTitle}"</strong> đã được lưu trữ vào thư mục kỳ thi tương ứng ở Nhóm 1. Thầy/Cô có thể chọn bước tiếp theo:
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onNavigateHome?.()}
                        className="p-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-bold flex items-center justify-center gap-2.5 transition-all"
                      >
                        <Home className="w-5 h-5 text-sky-400 shrink-0" />
                        <span>Quay Lại Trang Chủ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setScramblerCompletedZipName(null);
                          setScramblerWizardStep(3);
                          setActiveSubTab('scrambler');
                        }}
                        className="p-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-violet-950/60 transition-all"
                      >
                        <Shuffle className="w-5 h-5 shrink-0" />
                        <span>Chuyển Qua "2. Trộn Đề"</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBankWizardStep(4)}
                        className="p-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/60 transition-all"
                      >
                        <KeyRound className="w-5 h-5 shrink-0" />
                        <span>Sang Bước 4. Tạo Mã Bài Thi</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===============================================================
                BƯỚC 4: TẠO MÃ BÀI THI ĐỂ GIAO CHO HỌC SINH LÀM KIỂM TRA TRỰC TUYẾN
            =============================================================== */}
            {bankWizardStep === 4 && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-950/80 border border-emerald-700/60 space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-emerald-400" />
                      <span>
                        Bước 4. Tạo Mã Bài Thi Để Giao Cho Học Sinh Làm Kiểm Tra Trực Tuyến
                      </span>
                    </h3>
                    <p className="text-sm text-slate-300">
                      Thiết lập hoặc sinh mã bài thi trực tuyến cho đề{' '}
                      <strong className="text-white">"{examData.title}"</strong>. Học sinh nhập mã này tại Cổng Học Sinh để làm bài kiểm tra trực tuyến.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-5 space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Mã bài thi trực tuyến giao cho học sinh:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={onlineAssignmentCode}
                          onChange={(e) =>
                            setOnlineAssignmentCode(e.target.value.toUpperCase())
                          }
                          className="flex-1 px-4 py-2.5 text-base font-mono font-bold bg-slate-900 border border-emerald-500/70 rounded-xl text-emerald-300 focus:outline-none focus:border-emerald-400"
                          placeholder="VD: 1102"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const rand = `${Math.floor(1000 + Math.random() * 9000)}`;
                            setOnlineAssignmentCode(rand);
                          }}
                          className="px-3.5 py-2.5 text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors whitespace-nowrap"
                        >
                          Sinh Mã Ngẫu Nhiên
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-4 space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Thư mục kỳ thi:
                      </label>
                      <div className="px-4 py-2.5 text-sm font-mono bg-slate-900/90 border border-slate-800 rounded-xl text-violet-300">
                        {bankFolders.find((f) => f.id === targetSaveFolderId)?.code || 'KTGHK'} —{' '}
                        {examData.durationMinutes} phút ({examData.part1.length + examData.part2.length + examData.part3.length} câu)
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <button
                        type="button"
                        onClick={handleActivateOnlineExamCode}
                        className="w-full py-2.5 px-4 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>Tạo & Kích Hoạt Mã Thi</span>
                      </button>
                    </div>
                  </div>

                  {isOnlineCodeActivated && (
                    <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/60 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-xs font-mono uppercase text-emerald-400">
                            ✓ MÃ BÀI THI TRỰC TUYẾN ĐÃ SẴN SÀNG GIAO CHO HỌC SINH
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-white tracking-wider px-4 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/70">
                              {onlineAssignmentCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(onlineAssignmentCode);
                                setCopiedOnlineCodeNotice(true);
                                window.setTimeout(() => setCopiedOnlineCodeNotice(false), 3000);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-200 border border-emerald-700/60 rounded-xl transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>
                                {copiedOnlineCodeNotice ? '✓ Đã sao chép mã' : 'Sao chép mã thi'}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => onLaunchStudentWithCode(onlineAssignmentCode)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            <span>Vào Thử Phòng Thi Học Sinh (Mã: {onlineAssignmentCode})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveSubTab('monitor')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 rounded-xl transition-colors"
                          >
                            <Monitor className="w-4 h-4" />
                            <span>3. Giám Sát Phòng Thi LAN</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBankWizardStep(3)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay Lại Bước 3. Lưu Đề</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onNavigateHome?.()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl transition-colors"
                      >
                        <Home className="w-4 h-4 text-sky-400" />
                        <span>Quay Lại Trang Chủ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setScramblerCompletedZipName(null);
                          setScramblerWizardStep(3);
                          setActiveSubTab('scrambler');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors"
                      >
                        <Shuffle className="w-4 h-4" />
                        <span>Chuyển Qua "2. Trộn Đề"</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: SMART SCRAMBLER ENGINE (TRỘN ĐỀ CHUẨN GDPT 2018 — 4 BƯỚC)
      ===================================================================== */}
      {activeSubTab === 'scrambler' && (
        <div className="space-y-6">
          {/* CỬA SỔ DUY NHẤT: BỘ MÁY TRỘN ĐỀ THÔNG MINH CHUẨN CẤU TRÚC GDPT 2018 (QUY TRÌNH 4 BƯỚC) */}
          <div className="bg-[#18182e] border border-indigo-900/60 rounded-2xl p-6 sm:p-8 space-y-6 no-print">
            {/* Tiêu đề cửa sổ */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
                  <Shuffle className="w-5 h-5 text-violet-400" />
                  <span>Bộ Máy Trộn Đề Thông Minh Chuẩn Cấu Trúc GDPT 2018</span>
                </h2>
                <p className="text-sm text-slate-300">
                  Quy trình trộn đề 4 bước: Tải file đề lên hệ thống → Kiểm định đề → Cấu hình trộn đề thi → Trộn đề & Tự động tải xuống gói nén (.ZIP).
                </p>
              </div>

              {uploadedFileName && (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-600/50 text-xs font-mono text-emerald-300 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Đề đang nạp: {uploadedFileName}</span>
                </div>
              )}
            </div>

            {/* Thanh chuyển 4 bước: Bước 1 -> Bước 2 -> Bước 3 -> Bước 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  step: 1 as const,
                  title: 'Bước 1. Tải File Đề',
                  subtitle: 'Word / PDF / JSON lên hệ thống',
                  icon: Upload,
                },
                {
                  step: 2 as const,
                  title: 'Bước 2. Kiểm Định Đề',
                  subtitle: 'Kiểm tra chi tiết nội dung đề',
                  icon: CheckCircle2,
                },
                {
                  step: 3 as const,
                  title: 'Bước 3. Cấu Hình Trộn Đề',
                  subtitle: 'Thiết lập thông số & bản in',
                  icon: Sliders,
                },
                {
                  step: 4 as const,
                  title: 'Bước 4. Trộn Đề',
                  subtitle: 'Tự động tải gói nén (.ZIP)',
                  icon: Shuffle,
                },
              ].map((s) => {
                const IconComp = s.icon;
                const isActive = scramblerWizardStep === s.step;
                const isDone = scramblerWizardStep > s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setScramblerWizardStep(s.step)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isActive
                        ? 'bg-violet-600/25 border-violet-400 text-white shadow-md'
                        : isDone
                        ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200 hover:border-emerald-500'
                        : 'bg-slate-950/60 border-slate-800/90 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                        isActive
                          ? 'bg-violet-600 text-white'
                          : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isDone ? '✓' : s.step}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate flex items-center gap-1.5">
                        <IconComp className="w-3.5 h-3.5 shrink-0" />
                        <span>{s.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{s.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ===============================================================
                BƯỚC 1: TẢI FILE ĐỀ LÊN HỆ THỐNG (WORD / PDF / JSON)
            =============================================================== */}
            {scramblerWizardStep === 1 && (
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-950/70 border-2 border-dashed border-violet-600/60 flex flex-col items-center text-center space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/50 flex items-center justify-center text-violet-300">
                  <Upload className="w-7 h-7" />
                </div>

                <div className="space-y-1.5 max-w-2xl">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Bước 1. Tải File Đề Lên Hệ Thống (Word / PDF / JSON)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Hệ thống tự động bóc tách và nhận diện đầy đủ 3 phần (Phần I, Phần II, Phần III), câu hỏi, công thức toán học/vật lý, hình vẽ/đồ thị và đáp án đúng (bôi đỏ, gạch chân hoặc dấu *). Sau khi tải lên, hệ thống sẽ chuyển sang <strong>Bước 2. Kiểm Định Đề</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <label className="inline-flex items-center gap-2.5 px-6 py-3 text-sm sm:text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/60 cursor-pointer transition-all">
                    <Upload className="w-4 h-4" />
                    <span>📁 Chọn File Đề Từ Máy Tính (.doc, .docx, .pdf, .json)</span>
                    <input
                      type="file"
                      accept=".doc,.docx,.pdf,.json,.txt"
                      onChange={handleWordPdfUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleDownloadSampleWordTemplate}
                    className="inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-violet-200 border border-violet-600/60 rounded-xl transition-colors"
                  >
                    <FileText className="w-4 h-4 text-violet-400" />
                    <span>📥 Tải File Đề Mẫu Chuẩn Hệ Thống (.doc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScramblerWizardStep(2)}
                    className="inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 rounded-xl transition-colors"
                  >
                    <span>Kiểm Định Đề Đang Nạp ({examData.part1.length + examData.part2.length + examData.part3.length} câu)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                BƯỚC 2: KIỂM ĐỊNH ĐỀ (HIỂN THỊ NỘI DUNG CHI TIẾT CỦA ĐỀ ĐỂ KIỂM TRA)
            =============================================================== */}
            {scramblerWizardStep === 2 && (
              <div className="space-y-6">
                <div className="p-5 rounded-xl bg-slate-950/80 border border-emerald-600/50 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>BƯỚC 2 · KIỂM ĐỊNH NỘI DUNG CHI TIẾT CỦA ĐỀ TRƯỚC KHI TRỘN</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Đề đang kiểm định: {examData.title} ({examData.subject} · {examData.durationMinutes} phút)
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300">
                        Kiểm tra toàn bộ câu hỏi, công thức, hình vẽ và đáp án đúng. Nếu có câu cần sửa, bấm <strong>"Điều chỉnh trực tiếp"</strong>; nếu đề đã chính xác, bấm chuyển sang <strong>Bước 3. Cấu hình trộn đề thi</strong>.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setScramblerWizardStep(1)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Tải File Đề Khác</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScramblerWizardStep(3)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/60 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đề Đã Đúng — Sang Bước 3: Cấu Hình Trộn Đề Thi</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Thống kê nhanh 3 phần */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-400">Phần I (Trắc nghiệm ABCD)</div>
                        <div className="text-base font-bold text-white">
                          {examData.part1.length} câu hỏi
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-xs font-mono text-emerald-300">
                        Đủ đáp án A/B/C/D
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-400">Phần II (Đúng / Sai a, b, c, d)</div>
                        <div className="text-base font-bold text-white">
                          {examData.part2.length} câu ({examData.part2.length * 4} ý Đ/S)
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-xs font-mono text-emerald-300">
                        Đủ 4 ý / câu
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-400">Phần III (Trả lời ngắn)</div>
                        <div className="text-base font-bold text-white">
                          {examData.part3.length} câu · Tổng {totalExamPoints.toFixed(2)}đ
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-xs font-mono text-emerald-300">
                        Đủ đáp số
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bộ lọc Phần I / Phần II / Phần III để rà soát và điều chỉnh trực tiếp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-950/90 border border-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setInspectorPart('I')}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        inspectorPart === 'I'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Phần I: Nhiều Lựa Chọn ({examData.part1.length} câu)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorPart('II')}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        inspectorPart === 'II'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Phần II: Đúng / Sai ({examData.part2.length} câu · {examData.part2.length * 4} ý)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorPart('III')}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        inspectorPart === 'III'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Phần III: Trả Lời Ngắn ({examData.part3.length} câu)
                    </button>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-300 font-mono">
                    Bấm trực tiếp vào phương án A/B/C/D hoặc nút ĐÚNG/SAI để đổi nhanh đáp án
                  </div>
                </div>

                {/* Danh sách câu hỏi Phần I */}
                {inspectorPart === 'I' && (
                  <div className="space-y-4">
                    {examData.part1.map((q, idx) => {
                      const optionLabels = ['A', 'B', 'C', 'D'];
                      const isEditing = editingQuestionId === q.id;
                      return (
                        <div
                          key={q.id}
                          className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-5 space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span className="font-mono text-base font-bold text-violet-400">
                                Câu {idx + 1} ({q.id})
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400 font-mono font-bold">
                                Đáp án đúng: {optionLabels[q.correctIndex]}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 font-mono">
                                <span>Điểm:</span>
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0.05"
                                  max="2"
                                  value={q.points}
                                  onChange={(e) =>
                                    handlePointChange('I', q.id, parseFloat(e.target.value))
                                  }
                                  className="w-20 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-right text-white font-mono tabular-nums"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setEditingQuestionId(isEditing ? null : q.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-violet-200 hover:text-white bg-indigo-950/90 border border-violet-700/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>
                                  {isEditing ? 'Đóng điều chỉnh' : 'Điều chỉnh trực tiếp'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="space-y-3 bg-slate-900/90 p-4 rounded-xl border border-violet-800/50">
                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Nội dung câu hỏi (hỗ trợ công thức LaTeX $...$):
                                </label>
                                <textarea
                                  value={q.question}
                                  onChange={(e) =>
                                    handleUpdateQuestionField('I', q.id, 'question', e.target.value)
                                  }
                                  rows={3}
                                  className="w-full font-mono text-sm bg-slate-950 text-white p-3 rounded-lg border border-slate-700"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {q.options.map((optVal, oIdx) => (
                                  <div key={oIdx} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-mono font-bold text-violet-300">
                                        Phương án {optionLabels[oIdx]}:
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdatePart1CorrectIndex(q.id, oIdx)}
                                        className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                                          q.correctIndex === oIdx
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        {q.correctIndex === oIdx
                                          ? '✓ Đáp án đúng'
                                          : 'Đặt làm đáp án đúng'}
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={optVal}
                                      onChange={(e) =>
                                        handleUpdatePart1OptionText(q.id, oIdx, e.target.value)
                                      }
                                      className="w-full font-mono text-sm bg-slate-950 text-white px-3 py-2 rounded-lg border border-slate-700"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="text-base sm:text-lg text-slate-100 leading-relaxed">
                            <MathText text={q.question} />
                          </div>

                          {(() => {
                            const resolvedImgUrl = getResolvedQuestionImage(q, 'I', idx + 1);
                            if (!resolvedImgUrl) return null;
                            return (
                              <div className="my-2 p-3.5 rounded-xl bg-white/95 border border-indigo-500/40 flex flex-col items-center justify-center shadow-sm">
                                <img
                                  src={resolvedImgUrl}
                                  alt={`Hình minh họa Câu ${idx + 1}`}
                                  className="max-h-60 w-auto object-contain rounded-lg"
                                />
                                <span className="mt-1.5 text-xs font-mono text-slate-600">
                                  Hình vẽ / Đồ thị đính kèm Câu {idx + 1}
                                </span>
                              </div>
                            );
                          })()}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === q.correctIndex;
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => handleUpdatePart1CorrectIndex(q.id, oIdx)}
                                  title="Bấm để chọn phương án này làm đáp án đúng"
                                  className={`p-3.5 rounded-xl border text-left text-base font-medium flex items-start gap-3 transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-100'
                                      : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-200'
                                  }`}
                                >
                                  <span className="font-mono font-bold text-base mt-0.5 shrink-0">
                                    {optionLabels[oIdx]}.
                                  </span>
                                  <div className="flex-1">
                                    <MathText text={opt} />
                                  </div>
                                  {isCorrect && (
                                    <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                                      [ĐÚNG]
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Danh sách câu hỏi Phần II */}
                {inspectorPart === 'II' && (
                  <div className="space-y-4">
                    {examData.part2.map((q, idx) => {
                      const isEditing = editingQuestionId === q.id;
                      return (
                        <div
                          key={q.id}
                          className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-5 space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span className="font-mono text-base font-bold text-violet-400">
                                Phần II · Câu {idx + 1} ({q.id})
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 font-mono">
                                <span>Điểm tối đa:</span>
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0.25"
                                  max="4"
                                  value={q.points}
                                  onChange={(e) =>
                                    handlePointChange('II', q.id, parseFloat(e.target.value))
                                  }
                                  className="w-20 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-right text-white font-mono tabular-nums"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setEditingQuestionId(isEditing ? null : q.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-violet-200 hover:text-white bg-indigo-950/90 border border-violet-700/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>
                                  {isEditing ? 'Đóng điều chỉnh' : 'Điều chỉnh trực tiếp'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="space-y-3 bg-slate-900/90 p-4 rounded-xl border border-violet-800/50">
                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Đoạn dẫn câu hỏi Phần II (LaTeX):
                                </label>
                                <textarea
                                  value={q.stem}
                                  onChange={(e) =>
                                    handleUpdateQuestionField('II', q.id, 'stem', e.target.value)
                                  }
                                  rows={3}
                                  className="w-full font-mono text-sm bg-slate-950 text-white p-3 rounded-lg border border-slate-700"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-300">
                                  Điều chỉnh 4 ý phát biểu a), b), c), d):
                                </label>
                                {q.statements.map((stmt) => (
                                  <div
                                    key={stmt.id}
                                    className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800"
                                  >
                                    <span className="font-mono font-bold text-violet-400 w-6 text-center">
                                      {stmt.id})
                                    </span>
                                    <input
                                      type="text"
                                      value={stmt.text}
                                      onChange={(e) =>
                                        handleUpdatePart2StatementText(
                                          q.id,
                                          stmt.id,
                                          e.target.value
                                        )
                                      }
                                      className="flex-1 font-mono text-sm bg-slate-900 text-white px-3 py-1.5 rounded border border-slate-700"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleTogglePart2StatementTruth(q.id, stmt.id)
                                      }
                                      className={`px-3 py-1.5 rounded font-mono text-xs font-bold shrink-0 ${
                                        stmt.isTrue
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-amber-600 text-white'
                                      }`}
                                    >
                                      {stmt.isTrue ? 'ĐÚNG' : 'SAI'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="text-base sm:text-lg text-slate-100 leading-relaxed">
                            <MathText text={q.stem} />
                          </div>

                          {(() => {
                            const resolvedImgUrl = getResolvedQuestionImage(q, 'II', idx + 1);
                            if (!resolvedImgUrl) return null;
                            return (
                              <div className="my-2 p-3.5 rounded-xl bg-white/95 border border-indigo-500/40 flex flex-col items-center justify-center shadow-sm">
                                <img
                                  src={resolvedImgUrl}
                                  alt={`Hình minh họa Phần II Câu ${idx + 1}`}
                                  className="max-h-60 w-auto object-contain rounded-lg"
                                />
                                <span className="mt-1.5 text-xs font-mono text-slate-600">
                                  Hình vẽ / Đồ thị đính kèm Phần II · Câu {idx + 1}
                                </span>
                              </div>
                            );
                          })()}

                          <div className="overflow-x-auto border border-slate-800 rounded-xl">
                            <table className="w-full text-left border-collapse text-base">
                              <thead>
                                <tr className="bg-slate-900/90 text-xs sm:text-sm text-slate-300 border-b border-slate-800">
                                  <th className="py-2.5 px-4 w-14 font-mono">Ý</th>
                                  <th className="py-2.5 px-4">Phát biểu nhận định</th>
                                  <th className="py-2.5 px-4 w-40 text-center font-mono">
                                    Đáp án (Bấm để đổi)
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/70">
                                {q.statements.map((stmt) => (
                                  <tr key={stmt.id} className="hover:bg-white/[0.02]">
                                    <td className="py-3 px-4 font-mono font-bold text-base text-violet-400 align-top">
                                      {stmt.id})
                                    </td>
                                    <td className="py-3 px-4 text-slate-100 text-base">
                                      <MathText text={stmt.text} />
                                    </td>
                                    <td className="py-3 px-4 text-center align-top">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleTogglePart2StatementTruth(q.id, stmt.id)
                                        }
                                        className={`px-3 py-1 rounded-lg font-mono text-xs font-bold border transition-colors ${
                                          stmt.isTrue
                                            ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
                                            : 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:bg-amber-900'
                                        }`}
                                      >
                                        {stmt.isTrue ? '✓ ĐÚNG (True)' : '✕ SAI (False)'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Danh sách câu hỏi Phần III */}
                {inspectorPart === 'III' && (
                  <div className="space-y-4">
                    {examData.part3.map((q, idx) => {
                      const isEditing = editingQuestionId === q.id;
                      return (
                        <div
                          key={q.id}
                          className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-5 space-y-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span className="font-mono text-base font-bold text-violet-400">
                                Phần III · Câu {idx + 1} ({q.id})
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400 font-mono font-bold text-base">
                                Đáp số chuẩn: {q.answer} {q.unit ? `(${q.unit})` : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 font-mono">
                                <span>Điểm:</span>
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0.05"
                                  max="2"
                                  value={q.points}
                                  onChange={(e) =>
                                    handlePointChange('III', q.id, parseFloat(e.target.value))
                                  }
                                  className="w-20 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-right text-white font-mono tabular-nums"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setEditingQuestionId(isEditing ? null : q.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-violet-200 hover:text-white bg-indigo-950/90 border border-violet-700/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>
                                  {isEditing ? 'Đóng điều chỉnh' : 'Điều chỉnh trực tiếp'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/90 p-4 rounded-xl border border-violet-800/50">
                              <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Nội dung câu hỏi tính toán (LaTeX):
                                </label>
                                <textarea
                                  value={q.question}
                                  onChange={(e) =>
                                    handleUpdateQuestionField(
                                      'III',
                                      q.id,
                                      'question',
                                      e.target.value
                                    )
                                  }
                                  rows={2}
                                  className="w-full font-mono text-sm bg-slate-950 text-white p-3 rounded-lg border border-slate-700"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Đáp số chuẩn (VD: 24):
                                </label>
                                <input
                                  type="text"
                                  value={q.answer}
                                  onChange={(e) =>
                                    handleUpdateQuestionField('III', q.id, 'answer', e.target.value)
                                  }
                                  className="w-full font-mono text-base font-bold bg-slate-950 text-emerald-300 p-3 rounded-lg border border-slate-700"
                                />
                              </div>
                            </div>
                          )}

                          <div className="text-base sm:text-lg text-slate-100 leading-relaxed">
                            <MathText text={q.question} />
                          </div>

                          {(() => {
                            const resolvedImgUrl = getResolvedQuestionImage(q, 'III', idx + 1);
                            if (!resolvedImgUrl) return null;
                            return (
                              <div className="my-2 p-3.5 rounded-xl bg-white/95 border border-indigo-500/40 flex flex-col items-center justify-center shadow-sm">
                                <img
                                  src={resolvedImgUrl}
                                  alt={`Hình minh họa Phần III Câu ${idx + 1}`}
                                  className="max-h-60 w-auto object-contain rounded-lg"
                                />
                                <span className="mt-1.5 text-xs font-mono text-slate-600">
                                  Hình vẽ / Đồ thị đính kèm Phần III · Câu {idx + 1}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Thanh điều hướng cuối Bước 2 */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setScramblerWizardStep(1)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay Lại Bước 1. Tải File Đề</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScramblerWizardStep(3)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Hoàn Tất Kiểm Định — Sang Bước 3: Cấu Hình Trộn Đề Thi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                BƯỚC 3: CẤU HÌNH TRỘN ĐỀ THI (HIỆN CỬA SỔ CẤU HÌNH TRỘN ĐỀ THI & ĐỊNH DẠNG BẢN IN)
            =============================================================== */}
            {scramblerWizardStep === 3 && (
              <div className="bg-slate-900/90 border border-violet-800/50 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl text-slate-100 space-y-7 no-print">
                {/* Panel Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-violet-900/50">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-violet-400">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>BƯỚC 3 · SMARTTEST SCRAMBLER PRO · GDPT 2018</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      Cấu Hình Trộn Đề Thi & Định Dạng Bản In
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setExamCodesList(['1102', '1104', '1106', '1108']);
                        setVariantCount(4);
                        setCodeLength(4);
                      }}
                      className="px-3 py-1.5 text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-violet-300 border border-violet-700/40 rounded-lg transition-colors"
                    >
                      Mẫu 4 số (1102..1108)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExamCodesList(['101', '102', '103', '104']);
                        setVariantCount(4);
                        setCodeLength(3);
                      }}
                      className="px-3 py-1.5 text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-700/40 rounded-lg transition-colors"
                    >
                      Mẫu 3 số (101..104)
                    </button>
                  </div>
                </div>

                {/* 2-Column SmartTest Parameter Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                  {/* LEFT COLUMN: THÔNG TIN TIÊU ĐỀ & HÀNH CHÍNH */}
                  <div className="space-y-4 bg-slate-950/60 border border-slate-800/90 rounded-xl p-5">
                    <div className="pb-2.5 border-b border-slate-800 flex items-center justify-between">
                      <h4 className="text-base font-bold text-violet-300">
                        Thông Tin Tiêu Đề & Hành Chính
                      </h4>
                      <span className="text-xs font-mono text-slate-400">Cột trái (1–8)</span>
                    </div>

                    {/* 1. Đơn vị chủ quản */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Đơn vị chủ quản:
                      </label>
                      <div className="sm:col-span-8">
                        <input
                          type="text"
                          value={governingBody}
                          onChange={(e) => setGoverningBody(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                          placeholder="SỞ GD & ĐT TP ĐÀ NẴNG"
                        />
                      </div>
                    </div>

                    {/* 2. Trường */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Trường:
                      </label>
                      <div className="sm:col-span-8">
                        <input
                          type="text"
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                          placeholder="THPT HÙNG VƯƠNG"
                        />
                      </div>
                    </div>

                    {/* 3. Kỳ thi */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Kỳ thi:
                      </label>
                      <div className="sm:col-span-8">
                        <input
                          type="text"
                          value={examTerm}
                          onChange={(e) => setExamTerm(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                          placeholder="KIỂM TRA GIỮA HỌC KỲ I"
                        />
                      </div>
                    </div>

                    {/* 4. Tên môn thi */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Tên môn thi:
                      </label>
                      <div className="sm:col-span-8">
                        <input
                          type="text"
                          value={subjectName}
                          onChange={(e) => setSubjectName(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                          placeholder="VẬT LÝ 12"
                        />
                      </div>
                    </div>

                    {/* 5. Năm học */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Năm học:
                      </label>
                      <div className="sm:col-span-8">
                        <input
                          type="text"
                          value={schoolYear}
                          onChange={(e) => setSchoolYear(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm font-semibold bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                          placeholder="2026 - 2027"
                        />
                      </div>
                    </div>

                    {/* 6. Thời gian */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Thời gian:
                      </label>
                      <div className="sm:col-span-8 flex items-center gap-2">
                        <input
                          type="number"
                          min={5}
                          max={180}
                          value={examDuration}
                          onChange={(e) => setExamDuration(Number(e.target.value) || 50)}
                          className="w-28 px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                        />
                        <span className="text-sm text-slate-400">phút</span>
                      </div>
                    </div>

                    {/* 7. Đáp án trong bảng (4 phương án A, B, C, D của mỗi câu hỏi có nằm trong Table hay không) */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Đáp án trong bảng:
                      </label>
                      <div className="sm:col-span-8">
                        <select
                          value={optionsInTable ? 'Có' : 'Không'}
                          onChange={(e) => setOptionsInTable(e.target.value === 'Có')}
                          className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                        >
                          <option value="Không">
                            Không (Canh dòng tự động 1/2/4 dòng — Không dùng Table)
                          </option>
                          <option value="Có">
                            Có (Đặt 4 đáp án A, B, C, D của mỗi câu vào Table)
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* 8. Mã đề hoán vị */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-start gap-2 sm:gap-3 pt-1">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300 pt-2">
                        Mã đề hoán vị:
                      </label>
                      <div className="sm:col-span-8 space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {examCodesList.map((codeVal, idx) => (
                            <div key={idx} className="relative">
                              <input
                                type="text"
                                value={codeVal}
                                onChange={(e) => handleIndividualCodeChange(idx, e.target.value)}
                                className="w-full px-2.5 py-2 text-sm font-mono font-bold text-center bg-slate-900 border border-violet-700/60 rounded-lg text-violet-200 focus:outline-none focus:border-violet-400"
                                aria-label={`Mã đề ${idx + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-400">
                          Có thể sửa trực tiếp từng ô mã đề (Mặc định: 1102, 1104, 1106, 1108).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: CẤU HÌNH ĐỊNH DẠNG & QUY TẮC TRỘN */}
                  <div className="space-y-4 bg-slate-950/60 border border-slate-800/90 rounded-xl p-5">
                    <div className="pb-2.5 border-b border-slate-800 flex items-center justify-between">
                      <h4 className="text-base font-bold text-violet-300">
                        Cấu Hình Định Dạng & Quy Tắc Trộn
                      </h4>
                      <span className="text-xs font-mono text-slate-400">Cột phải (1–8)</span>
                    </div>

                    {/* 1. Nhãn câu & Ký tự kết thúc (KT) */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Nhãn câu:
                      </label>
                      <div className="sm:col-span-8 flex items-center gap-3">
                        <input
                          type="text"
                          value={questionLabel}
                          onChange={(e) => setQuestionLabel(e.target.value)}
                          className="w-28 px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                          placeholder="Câu"
                        />
                        <span className="text-sm font-medium text-slate-300 whitespace-nowrap">
                          KT:
                        </span>
                        <select
                          value={questionSeparator}
                          onChange={(e) => setQuestionSeparator(e.target.value)}
                          className="w-24 px-3 py-2 text-sm font-mono font-bold bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                        >
                          <option value=":">: (Hai chấm)</option>
                          <option value=".">. (Dấu chấm)</option>
                        </select>
                      </div>
                    </div>

                    {/* 2. Chỉ số câu */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <span className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Chỉ số câu:
                      </span>
                      <div className="sm:col-span-8">
                        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={restartIndexPerPart}
                            onChange={(e) => setRestartIndexPerPart(e.target.checked)}
                            className="w-4 h-4 rounded accent-violet-500"
                          />
                          <span className="text-sm text-slate-200">
                            Bắt đầu từ câu 1 ở mỗi phần
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* 3. Thứ tự các phần */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <span className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Thứ tự các phần:
                      </span>
                      <div className="sm:col-span-8">
                        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={shuffleSectionOrder}
                            onChange={(e) => setShuffleSectionOrder(e.target.checked)}
                            className="w-4 h-4 rounded accent-violet-500"
                          />
                          <span className="text-sm text-slate-200">
                            Đảo thứ tự các phần trong mỗi mã đề
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* 4. Trộn câu hỏi chùm */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-start gap-2 sm:gap-3">
                      <span className="sm:col-span-4 text-sm font-medium text-slate-300 pt-1">
                        Câu hỏi chùm:
                      </span>
                      <div className="sm:col-span-8 space-y-2">
                        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={shuffleClusterQuestions}
                            onChange={(e) => setShuffleClusterQuestions(e.target.checked)}
                            className="w-4 h-4 rounded accent-violet-500"
                          />
                          <span className="text-sm text-slate-200">
                            Trộn câu hỏi chùm (giữ các câu cùng cụm ngữ liệu đi liền nhau)
                          </span>
                        </label>
                        {shuffleClusterQuestions && (
                          <input
                            type="text"
                            value={clusterRangesText}
                            onChange={(e) => setClusterRangesText(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono bg-slate-900 border border-violet-700/60 rounded-lg text-violet-200 focus:outline-none focus:border-violet-400"
                            placeholder="Nhập cụm câu chùm (VD: 1-3, 5-6) hoặc tự nhận diện thẻ <nhóm>"
                          />
                        )}
                      </div>
                    </div>

                    {/* 5. Độ dài mã & Tiền tố mã */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Độ dài mã:
                      </label>
                      <div className="sm:col-span-8 flex flex-wrap items-center gap-3">
                        <select
                          value={codeLength}
                          onChange={(e) =>
                            handleCodeLengthOrPrefixChange(
                              Number(e.target.value) as 3 | 4 | 5,
                              codePrefixMode
                            )
                          }
                          className="w-20 px-3 py-2 text-sm font-mono bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                        >
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>

                        <span className="text-sm font-medium text-slate-300 whitespace-nowrap">
                          Tiền tố mã:
                        </span>
                        <select
                          value={codePrefixMode}
                          onChange={(e) =>
                            handleCodeLengthOrPrefixChange(
                              codeLength,
                              e.target.value as 'Ngẫu nhiên' | 'Theo môn' | 'Cố định'
                            )
                          }
                          className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                        >
                          <option value="Ngẫu nhiên">Ngẫu nhiên</option>
                          <option value="Theo môn">Theo môn</option>
                          <option value="Cố định">Cố định</option>
                        </select>
                      </div>
                    </div>

                    {/* 6. Khoảng cách câu & Khoảng cách ĐA */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Khoảng cách câu:
                      </label>
                      <div className="sm:col-span-8 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={24}
                            value={questionSpacingPt}
                            onChange={(e) => setQuestionSpacingPt(Number(e.target.value) || 0)}
                            className="w-16 px-2.5 py-2 text-sm font-mono text-center bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                          />
                          <span className="text-xs text-slate-400">pt</span>
                        </div>

                        <span className="text-sm font-medium text-slate-300 whitespace-nowrap">
                          Khoảng cách ĐA:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={24}
                            value={optionSpacingPt}
                            onChange={(e) => setOptionSpacingPt(Number(e.target.value) || 0)}
                            className="w-16 px-2.5 py-2 text-sm font-mono text-center bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                          />
                          <span className="text-xs text-slate-400">pt</span>
                        </div>
                      </div>
                    </div>

                    {/* 7. Lùi dòng PA & Giãn dòng */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300">
                        Lùi dòng PA:
                      </label>
                      <div className="sm:col-span-8 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={36}
                            value={optionIndentPt}
                            onChange={(e) => setOptionIndentPt(Number(e.target.value) || 0)}
                            className="w-16 px-2.5 py-2 text-sm font-mono text-center bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                          />
                          <span className="text-xs text-slate-400">pt</span>
                        </div>

                        <span className="text-sm font-medium text-slate-300 whitespace-nowrap">
                          Giãn dòng:
                        </span>
                        <select
                          value={lineSpacing}
                          onChange={(e) =>
                            setLineSpacing(
                              e.target.value as 'Single' | '1.15 lines' | '1.5 lines'
                            )
                          }
                          className="flex-1 min-w-[110px] px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                        >
                          <option value="Single">Single</option>
                          <option value="1.15 lines">1.15 lines</option>
                          <option value="1.5 lines">1.5 lines</option>
                        </select>
                      </div>
                    </div>

                    {/* 8. Số đề hoán vị & File đề thi đầu ra */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-start gap-2 sm:gap-3 pt-1">
                      <label className="sm:col-span-4 text-sm font-medium text-slate-300 pt-2">
                        Số đề hoán vị:
                      </label>
                      <div className="sm:col-span-8 space-y-2">
                        <div className="flex flex-wrap items-center gap-4">
                          <select
                            value={variantCount}
                            onChange={(e) => handleVariantCountChange(Number(e.target.value))}
                            className="w-24 px-3 py-2 text-sm font-mono font-bold bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                          >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={4}>4</option>
                            <option value={8}>8</option>
                            <option value={12}>12</option>
                          </select>

                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={mergeOutputFile}
                              onChange={(e) => setMergeOutputFile(e.target.checked)}
                              className="w-4 h-4 rounded accent-violet-500"
                            />
                            <span className="text-sm text-slate-200">
                              Ghép thành một file duy nhất
                            </span>
                          </label>
                        </div>
                        <p className="text-xs text-slate-400">
                          Số đề hoán vị tối đa là 100 · File đề thi đầu ra hỗ trợ xuất ZIP/Word/Excel.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation Bar of Step 3 */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setScramblerWizardStep(2)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay Lại Bước 2. Kiểm Định Đề</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScramblerWizardStep(4)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-lg shadow-violet-950/60 transition-all"
                  >
                    <span>Hoàn Tất Cấu Hình — Sang Bước 4: Trộn Đề</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                BƯỚC 4: TRỘN ĐỀ (SAU KHI TRỘN XONG TỰ ĐỘNG TẢI XUỐNG FILE NÉN .ZIP)
            =============================================================== */}
            {scramblerWizardStep === 4 && (
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-2xl bg-slate-950/80 border border-violet-700/60 space-y-6">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-violet-400">
                      <Shuffle className="w-4 h-4" />
                      <span>BƯỚC 4 · THỰC THI TRỘN ĐỀ & TỰ ĐỘNG XUẤT GÓI ĐỀ NÉN (.ZIP)</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      Bước 4. Trộn Đề Thi & Tự Động Tải Xuống Gói Đề Hoàn Chỉnh
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Sau khi bấm <strong>"Bắt Đầu Trộn Đề & Tự Động Tải Gói Đề (.ZIP)"</strong>, hệ thống sẽ hoán vị câu hỏi theo đúng thiết lập ở Bước 3 và tự động tải xuống máy tính file nén <code>.zip</code> chứa đầy đủ: <strong>File Word của tất cả các mã đề (.docx) + Đáp án Word (.doc) + Đáp án chấm theo định dạng TNMaker (Excel .xls/.csv)</strong>.
                    </p>
                  </div>

                  {/* Bảng tóm tắt thông số trước khi trộn */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                      <div className="text-xs text-slate-400">Đơn vị & Kỳ thi</div>
                      <div className="text-sm font-bold text-white truncate">
                        {examTerm || 'KIỂM TRA GIỮA HỌC KỲ I'} · NĂM HỌC: {schoolYear || '2026 - 2027'}
                      </div>
                      <div className="text-xs text-violet-300 font-mono truncate">
                        {governingBody} · TRƯỜNG {schoolName}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                      <div className="text-xs text-slate-400">Môn thi & Cấu trúc câu hỏi</div>
                      <div className="text-sm font-bold text-white">
                        {subjectName} · {examDuration} phút · Đáp án trong bảng: {optionsInTable ? 'Có' : 'Không'}
                      </div>
                      <div className="text-xs text-emerald-300 font-mono">
                        Phần I: {examData.part1.length}c · Phần II: {examData.part2.length}c · Phần III: {examData.part3.length}c
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                      <div className="text-xs text-slate-400">Danh sách mã đề hoán vị ({examCodesList.length} mã đề)</div>
                      <div className="text-sm font-mono font-bold text-amber-300 truncate">
                        {examCodesList.join(', ')}
                      </div>
                      <div className="text-xs text-slate-400">
                        Đóng gói: Word (.docx) + Đáp án (.doc) + TNMaker (.xls)
                      </div>
                    </div>
                  </div>

                  {/* Nút thực thi Trộn đề & Tự động tải xuống ZIP */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setScramblerWizardStep(3)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay Lại Bước 3. Cấu Hình Trộn Đề</span>
                    </button>

                    <HelpTooltip
                      title="Trộn Lại & Sinh Đề Hoán Vị (Regenerate)"
                      description="Tạo bộ mã đề hoán vị mới theo thuật toán Fisher-Yates chuẩn GDPT 2018 và tự động đóng gói file nén .ZIP (gồm Đề Word .docx, Bảng đáp án .doc và File chấm máy TNMaker .xls)."
                      align="end"
                    >
                      <button
                        type="button"
                        disabled={isScrambling}
                        onClick={() => handleApplyScramblerConfig(true)}
                        className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm sm:text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-xl shadow-emerald-950/60 transition-all"
                      >
                        <Shuffle className={`w-5 h-5 ${isScrambling ? 'animate-spin' : ''}`} />
                        <span>
                          {isScrambling
                            ? 'Đang Trộn Đề & Đóng Gói File Nén (.ZIP)...'
                            : '🔀 Bắt Đầu Trộn Đề & Tự Động Tải Gói Đề (.ZIP)'}
                        </span>
                      </button>
                    </HelpTooltip>
                  </div>

                  {/* Thông báo xác nhận sau khi đã trộn và tự động tải file ZIP */}
                  {scramblerCompletedZipName && (
                    <div className="p-5 rounded-xl bg-emerald-950/50 border-2 border-emerald-500/80 space-y-4 animate-in fade-in duration-200">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="text-base font-bold text-white">
                              Đã Trộn Xong & Tự Động Tải Xuống Gói Đề Nén: {scramblerCompletedZipName}
                            </h4>
                            <p className="text-xs sm:text-sm text-emerald-200">
                              File nén đã bao gồm đầy đủ: <strong>{scrambledExams.length} file Word (.docx) của tất cả các mã đề ({scrambledExams.map((v) => v.code).join(', ')})</strong> + <strong>Bảng đáp án Word (.doc)</strong> + <strong>File đáp án chấm theo định dạng TNMaker (Excel .xls/.csv)</strong>.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <HelpTooltip
                            title="Tải Gói Nén Đầy Đủ (.ZIP)"
                            description="Tải lại gói .ZIP chứa toàn bộ đề thi Word (.docx), bảng đáp án tổng hợp (.doc) và file Excel chấm máy TNMaker (.xls)."
                            align="end"
                          >
                            <button
                              type="button"
                              onClick={() => handleExportFullZipPackage()}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                            >
                              <FolderArchive className="w-3.5 h-3.5" />
                              <span>Tải Lại Gói .ZIP</span>
                            </button>
                          </HelpTooltip>
                          <HelpTooltip
                            title="Xuất Đề Thi Word (.docx)"
                            description="Tải riêng file đề thi định dạng Microsoft Word (.docx) đã chuẩn hóa công thức và tiêu đề để in ấn."
                            align="center"
                          >
                            <button
                              type="button"
                              onClick={() => handleExportWordDocsOnly()}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 text-violet-400" />
                              <span>Đề Word (.docx)</span>
                            </button>
                          </HelpTooltip>
                          <HelpTooltip
                            title="Xuất Bảng Đáp Án Word (.doc)"
                            description="Tải bảng đáp án tổng hợp của tất cả mã đề (Phần I, Phần II định dạng ĐSĐĐ, Phần III) chuẩn font Times New Roman."
                            align="center"
                          >
                            <button
                              type="button"
                              onClick={() => handleExportMasterAnswerKeyDoc()}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors"
                            >
                              <Table className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Đáp Án Word (.doc)</span>
                            </button>
                          </HelpTooltip>
                          <HelpTooltip
                            title="Xuất Đáp Án Chấm Máy TNMaker (.xls)"
                            description="Tải file Excel đáp án chuẩn định dạng phần mềm chấm phiếu trắc nghiệm trên điện thoại TNMaker."
                            align="end"
                          >
                            <button
                              type="button"
                              onClick={() => handleExportTNMakerExcel()}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-700/60 rounded-lg transition-colors"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Đáp Án TNMaker (.xls)</span>
                            </button>
                          </HelpTooltip>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: REAL-TIME LAN MONITORING DASHBOARD (GIÁM SÁT PHÒNG MÁY)
      ===================================================================== */}
      {activeSubTab === 'monitor' && (
        <div className="space-y-6">
          {/* Summary KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#18182e] border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400">Tổng Số Máy Trạm Kết Nối LAN</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-white">
                {workstations.length} máy trạm
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Subnet: 192.168.1.100/24 · Cổng 3000
              </div>
            </div>

            <div className="bg-[#18182e] border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400">Đang Làm Bài Trực Tuyến</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-indigo-400">
                {workstations.filter((w) => w.status === 'ACTIVE').length} thí sinh
              </div>
              <div className="text-xs text-slate-400">
                Đồng bộ tự động với LocalStorage Kiosk
              </div>
            </div>

            <div className="bg-[#18182e] border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400">Đã Nộp Bài Hoàn Tất</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                {workstations.filter((w) => w.status === 'SUBMITTED').length} thí sinh
              </div>
              <div className="text-xs text-slate-400">
                Chấm điểm tự động theo thang 10,00 Bộ GD&ĐT
              </div>
            </div>

            <div className="bg-[#18182e] border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400">Cảnh Báo Vi Phạm Quy Chế</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-rose-400">
                {workstations.reduce((sum, w) => sum + w.violationCount, 0)} lượt vi phạm
              </div>
              <div className="text-xs text-slate-400">
                Phát hiện chuyển tab, mất tiêu điểm & thoát Fullscreen
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-[#18182e] border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: `Tất cả (${workstations.length})` },
                  {
                    id: 'ACTIVE',
                    label: `Đang làm bài (${workstations.filter((w) => w.status === 'ACTIVE').length})`,
                  },
                  {
                    id: 'SUBMITTED',
                    label: `Đã nộp bài (${workstations.filter((w) => w.status === 'SUBMITTED').length})`,
                  },
                  {
                    id: 'VIOLATION_WARN',
                    label: `Cảnh báo vi phạm (${
                      workstations.filter((w) => w.status === 'VIOLATION_WARN' || w.violationCount > 0)
                        .length
                    })`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMonitorFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    monitorFilter === tab.id
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white bg-slate-900/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={monitorSearch}
                  onChange={(e) => setMonitorSearch(e.target.value)}
                  placeholder="Tìm tên thí sinh, SBD, máy..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-violet-500 w-60"
                />
              </div>

              <HelpTooltip
                title="Làm Mới Trạng Thái Phòng Máy (Regenerate / Sync)"
                description="Cập nhật tức thời tiến độ câu hỏi, thời gian còn lại và tín hiệu kết nối từ tất cả các máy trạm trong mạng LAN."
                align="end"
              >
                <button
                  type="button"
                  onClick={onSimulateLabTick}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cập Nhật Xung Nhịp Phòng Máy</span>
                </button>
              </HelpTooltip>
            </div>
          </div>

          {/* Workstations Table */}
          <div className="bg-[#18182e] border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/95 text-slate-400 border-b border-slate-800 font-mono">
                    <th className="py-3 px-4">Máy Trạm / IP</th>
                    <th className="py-3 px-4">Họ và Tên Thí Sinh</th>
                    <th className="py-3 px-4">SBD</th>
                    <th className="py-3 px-4 text-center">Mã Đề</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Tiến Độ</th>
                    <th className="py-3 px-4 text-right">Thời Gian Còn</th>
                    <th className="py-3 px-4 text-center">Vi Phạm (Tab/Blur)</th>
                    <th className="py-3 px-4 text-right">Điểm Số</th>
                    <th className="py-3 px-4 text-right">Tác Vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
                  {filteredWorkstations.map((ws) => {
                    const progressPercent = Math.round(
                      (ws.answeredCount / Math.max(1, ws.totalQuestions)) * 100
                    );
                    return (
                      <tr
                        key={ws.workstationId}
                        className={`hover:bg-white/[0.03] transition-colors ${
                          ws.isLiveBrowserUser ? 'bg-violet-950/25' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-200">
                            {ws.workstationId}
                            {ws.isLiveBrowserUser ? ' (Phiên hiện tại)' : ''}
                          </div>
                          <div className="text-[11px] text-slate-500">{ws.ipAddress}</div>
                        </td>
                        <td className="py-3 px-4 font-sans font-semibold text-white">
                          <div>{ws.studentName}</div>
                          <div className="text-[11px] font-normal text-slate-400">
                            {ws.lastEventText}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{ws.studentId}</td>
                        <td className="py-3 px-4 text-center font-bold text-violet-300">
                          {ws.examCode}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {ws.status === 'SUBMITTED' && (
                            <span className="text-emerald-400 font-semibold">▲ Đã nộp bài</span>
                          )}
                          {ws.status === 'ACTIVE' && (
                            <span className="text-indigo-400 font-semibold">● Đang làm bài</span>
                          )}
                          {ws.status === 'VIOLATION_WARN' && (
                            <span className="text-rose-400 font-semibold">
                              ◆ Cảnh báo chuyển tab
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-slate-200 font-semibold">
                            {ws.answeredCount}/{ws.totalQuestions} câu ({progressPercent}%)
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {ws.status === 'SUBMITTED'
                            ? 'Hoàn tất'
                            : formatTimeMinSec(ws.remainingSeconds)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {ws.violationCount > 0 ? (
                            <span className="text-rose-400 font-bold">
                              {ws.violationCount} lần vi phạm
                            </span>
                          ) : (
                            <span className="text-slate-500">0 (An toàn)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          {ws.score !== undefined ? (
                            <span className="text-emerald-400 text-sm">
                              {ws.score.toFixed(2)} đ
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedWorkstation(ws)}
                              className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
                            >
                              Chi tiết
                            </button>
                            {ws.violationCount > 0 && (
                              <HelpTooltip
                                title="Xoá Cảnh Báo Vi Phạm (Reset Session Alert)"
                                description="Đặt lại bộ đếm vi phạm chuyển tab/thoát toàn màn hình về 0 để cho phép thí sinh tiếp tục làm bài bình thường."
                                align="end"
                              >
                                <button
                                  type="button"
                                  onClick={() => onResetWorkstationViolations(ws.workstationId)}
                                  className="px-2.5 py-1 text-xs font-medium bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 rounded transition-colors whitespace-nowrap shrink-0"
                                >
                                  Xoá cảnh báo
                                </button>
                              </HelpTooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Workstation Detail Modal */}
          {selectedWorkstation && (
            <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
              <div className="bg-[#18182e] border border-indigo-800 rounded-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-xs font-mono text-violet-400">
                      {selectedWorkstation.workstationId} · {selectedWorkstation.ipAddress}
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      Thí sinh: {selectedWorkstation.studentName} (SBD: {selectedWorkstation.studentId})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedWorkstation(null)}
                    className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                  >
                    Đóng
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono tabular-nums">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-slate-400">Mã đề đang thi</div>
                    <div className="text-base font-bold text-white mt-0.5">
                      Mã đề {selectedWorkstation.examCode}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-slate-400">Tiến độ trả lời</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">
                      {selectedWorkstation.answeredCount} / {selectedWorkstation.totalQuestions} câu
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-slate-400">Số lần chuyển Tab / Blur</div>
                    <div className="text-base font-bold text-rose-400 mt-0.5">
                      {selectedWorkstation.violationCount} lần
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-slate-400">Điểm ghi nhận</div>
                    <div className="text-base font-bold text-indigo-300 mt-0.5">
                      {selectedWorkstation.score !== undefined
                        ? `${selectedWorkstation.score.toFixed(2)} / 10.00`
                        : 'Chưa nộp bài'}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1.5">
                  <div className="font-semibold text-slate-300">Nhật ký trạng thái gần nhất:</div>
                  <div className="text-slate-400 font-mono">{selectedWorkstation.lastEventText}</div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  {selectedWorkstation.violationCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onResetWorkstationViolations(selectedWorkstation.workstationId);
                        setSelectedWorkstation(null);
                      }}
                      className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg"
                    >
                      Xác nhận & Xoá cảnh báo vi phạm
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedWorkstation(null)}
                    className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-lg"
                  >
                    Hoàn tất kiểm tra
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: TỔ CHỨC THI ONLINE (3 BƯỚC: CHỌN ĐỀ -> CẤU HÌNH KỲ THI -> GIAO BÀI)
      ===================================================================== */}
      {activeSubTab === 'online_exam' && (
        <div className="space-y-6 no-print">
          <div className="bg-[#18182e] border border-violet-800/70 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-7">
            {/* Header & 3-Step Progress Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-violet-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>TAB 4 · TỔ CHỨC THI & ÔN TẬP TRỰC TUYẾN ĐỒNG BỘ TOÀN HỆ THỐNG</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Hệ Thống Tổ Chức Thi Online & Giao Bài Thông Minh (3 Bước)
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Thiết lập kỳ thi kiểm tra (thu bài cưỡng chế theo mức vi phạm 1, 2, 3) hoặc giao đề ôn tập kèm lời giải chi tiết cho từng lớp học.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
                {(
                  [
                    {
                      step: 1 as const,
                      title: 'Bước 1. Chọn Đề',
                      sub: 'Từ Ngân hàng hoặc Tải đề + Lời giải',
                    },
                    {
                      step: 2 as const,
                      title: 'Bước 2. Cấu Hình Kỳ Thi',
                      sub: 'Thời gian & Chế độ Kiểm tra / Ôn tập',
                    },
                    {
                      step: 3 as const,
                      title: 'Bước 3. Giao Bài',
                      sub: 'Mã bài thi · Link · Chọn & Thêm lớp',
                    },
                  ]
                ).map((s) => {
                  const isActive = onlineOrgStep === s.step;
                  const isDone = onlineOrgStep > s.step;
                  return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => {
                      if (onlineOrgStep === 2 && onSaveOnlineAssignment) {
                        const payload = buildSynchronizedAssignmentPayload();
                        onSaveOnlineAssignment(payload);
                        setIsOnlinePublished(true);
                      }
                      setOnlineOrgStep(s.step);
                    }}
                    className={`text-left px-4 py-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-violet-600/25 border-violet-400 text-white shadow-md shadow-violet-950/50'
                        : isDone
                        ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200 hover:bg-emerald-950/60'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-bold">{s.title}</span>
                      {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">{s.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===============================================================
              BƯỚC 1: CHỌN ĐỀ (CHẾ ĐỘ 1: CHỌN TỪ NGÂN HÀNG | CHẾ ĐỘ 2: TẢI ĐỀ + LỜI GIẢI CHI TIẾT)
          =============================================================== */}
          {onlineOrgStep === 1 && (
            <div className="space-y-6">
              {/* 2 Mode Selector Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setOnlineSourceMode('bank')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all space-y-2 ${
                    onlineSourceMode === 'bank'
                      ? 'bg-violet-950/50 border-violet-500 text-white shadow-lg shadow-violet-950/40'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-violet-600 text-white">
                      CHẾ ĐỘ 1
                    </span>
                    {onlineSourceMode === 'bank' && (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Đang chọn
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    1. Chọn Đề Từ Ngân Hàng Đề
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Lựa chọn nhanh các đề thi đã lưu và kiểm định trong các thư mục Ngân hàng đề (KTTX, KTGHK, KTCHK, Thi Tốt Nghiệp...).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOnlineSourceMode('upload_with_solution');
                  }}
                    className={`p-5 rounded-2xl border-2 text-left transition-all space-y-2 ${
                      onlineSourceMode === 'upload_with_solution'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-600 text-white">
                        CHẾ ĐỘ 2 · CÓ LỜI GIẢI ÔN TẬP
                      </span>
                      {onlineSourceMode === 'upload_with_solution' && (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Đang chọn
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      2. Tải Đề Lên Từ Máy + Lời Giải Chi Tiết
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Tải file đề thi (Word/PDF/JSON) kèm file hoặc nội dung lời giải chi tiết để giúp học sinh xem lại toàn bộ lời giải chi tiết nhằm ôn tập sau khi nộp bài.
                    </p>
                  </button>
                </div>

                {/* CONTENT FOR MODE 1: SELECT FROM BANK */}
                {onlineSourceMode === 'bank' && (
                  <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold text-white">
                          Danh Sách Đề Thi Trong Kho Ngân Hàng ({savedBankExams.length} đề)
                        </h4>
                        <p className="text-xs text-slate-400">
                          Chọn 1 đề bên dưới để sử dụng cho kỳ thi Online.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setOnlineBankFolderFilter('ALL')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            onlineBankFolderFilter === 'ALL'
                              ? 'bg-violet-600 text-white'
                              : 'bg-slate-900 text-slate-300 hover:text-white'
                          }`}
                        >
                          Tất cả ({savedBankExams.length})
                        </button>
                        {bankFolders.map((f) => {
                          const count = savedBankExams.filter((item) => item.folderId === f.id).length;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setOnlineBankFolderFilter(f.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                onlineBankFolderFilter === f.id
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-slate-900 text-slate-300 hover:text-white'
                              }`}
                            >
                              {f.code} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedBankExams
                        .filter(
                          (item) =>
                            onlineBankFolderFilter === 'ALL' ||
                            item.folderId === onlineBankFolderFilter
                        )
                        .map((item) => {
                          const isChosen = selectedOnlineBankId === item.id;
                          const folderObj = bankFolders.find((f) => f.id === item.folderId);
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleSelectBankExamForOnline(item)}
                              className={`cursor-pointer p-4 rounded-xl border transition-all space-y-2.5 ${
                                isChosen
                                  ? 'bg-violet-950/60 border-violet-500 ring-1 ring-violet-400'
                                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                                  {folderObj?.code || item.folderId}
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                  Lưu lúc: {item.savedAt}
                                </span>
                              </div>
                              <div className="text-sm sm:text-base font-bold text-white">
                                {item.examData.title}
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 font-mono">
                                <span>
                                  Môn: {item.examData.subject} · {item.examData.durationMinutes} phút
                                </span>
                                <span className="text-emerald-400 font-semibold">
                                  {item.examData.part1.length +
                                    item.examData.part2.length +
                                    item.examData.part3.length}{' '}
                                  câu hỏi
                                </span>
                              </div>
                              <div className="pt-1 flex items-center justify-end">
                                <span
                                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                    isChosen
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {isChosen ? '✓ Đã Chọn Đề Này' : 'Chọn Đề Này'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* CONTENT FOR MODE 2: UPLOAD EXAM + DETAILED SOLUTIONS FROM COMPUTER */}
                {onlineSourceMode === 'upload_with_solution' && (
                  <div className="p-6 rounded-2xl bg-slate-950/70 border border-emerald-700/50 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Box 1: Upload Exam File */}
                      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
                        <div className="space-y-1">
                          <span className="text-xs font-mono uppercase text-violet-400 font-bold">
                            PHẦN A · TẢI ĐỀ THI TỪ MÁY TÍNH
                          </span>
                          <h4 className="text-base font-bold text-white">
                            Tải File Đề Thi (.docx, .doc, .pdf, .json)
                          </h4>
                          <p className="text-xs text-slate-400">
                            Hệ thống tự động bóc tách câu hỏi Phần I, Phần II, Phần III và hình vẽ đính kèm.
                          </p>
                        </div>

                        <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-violet-600/60 hover:border-violet-400 rounded-xl bg-slate-950/70 cursor-pointer transition-colors text-center space-y-2">
                          <Upload className="w-7 h-7 text-violet-400" />
                          <div className="text-xs sm:text-sm font-bold text-white">
                            {onlineUploadedExamFileName
                              ? `Đã tải đề: ${onlineUploadedExamFileName}`
                              : 'Bấm để chọn File Đề Thi từ máy tính'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Hỗ trợ Word (.docx/.doc), PDF (.pdf), JSON (.json)
                          </div>
                          <input
                            type="file"
                            accept=".doc,.docx,.pdf,.json,.txt"
                            onChange={handleUploadOnlineExamFile}
                            className="hidden"
                          />
                        </label>

                        {onlineUploadedExamFileName && (
                          <div className="p-3 rounded-xl bg-violet-950/50 border border-violet-600/50 text-xs text-violet-200 flex items-center justify-between gap-2">
                            <span className="font-semibold truncate">
                              ✓ Đã bóc tách Phần A: {onlineSelectedExamData.part1.length} câu P.I ·{' '}
                              {onlineSelectedExamData.part2.length} câu P.II ·{' '}
                              {onlineSelectedExamData.part3.length} câu P.III
                            </span>
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-violet-900/80 text-violet-200 shrink-0">
                              {
                                [
                                  ...onlineSelectedExamData.part1.filter((q) => q.has_image),
                                  ...onlineSelectedExamData.part2.filter((q) => q.has_image),
                                  ...onlineSelectedExamData.part3.filter((q) => q.has_image),
                                ].length
                              }{' '}
                              hình vẽ
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Box 2: Upload Detailed Solution File */}
                      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
                        <div className="space-y-1">
                          <span className="text-xs font-mono uppercase text-emerald-400 font-bold">
                            PHẦN B · TẢI LỜI GIẢI CHI TIẾT PHỤC VỤ ÔN TẬP
                          </span>
                          <h4 className="text-base font-bold text-white">
                            Tải File Lời Giải Chi Tiết (.docx, .pdf, .txt)
                          </h4>
                          <p className="text-xs text-slate-400">
                            Giúp học sinh xem lại đầy đủ lời giải chi tiết từng câu hỏi sau khi hoàn thành bài ôn tập.
                          </p>
                        </div>

                        <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-emerald-600/60 hover:border-emerald-400 rounded-xl bg-slate-950/70 cursor-pointer transition-colors text-center space-y-2">
                          <FileText className="w-7 h-7 text-emerald-400" />
                          <div className="text-xs sm:text-sm font-bold text-white">
                            {onlineSolutionFileName
                              ? `Đã đính kèm lời giải: ${onlineSolutionFileName}`
                              : 'Bấm để tải File Lời Giải Chi Tiết từ máy tính'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Tự động đồng bộ Bảng đáp án &amp; Lời giải vào từng câu hỏi (Phần I, II, III)
                          </div>
                          <input
                            type="file"
                            accept=".doc,.docx,.pdf,.txt,.json"
                            onChange={handleUploadDetailedSolutionFile}
                            className="hidden"
                          />
                        </label>

                        {(onlineSolutionFileName || onlineSyncedSolutionCount > 0) && (
                          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-600/50 text-xs text-emerald-200 flex items-center justify-between gap-2">
                            <span className="font-semibold truncate">
                              ✓ Đã đồng bộ Đáp án &amp; Lời giải chi tiết Phần B vào hệ thống
                            </span>
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 shrink-0">
                              {onlineSyncedSolutionCount ||
                                onlineSelectedExamData.part1.length +
                                  onlineSelectedExamData.part2.length +
                                  onlineSelectedExamData.part3.length}
                              /
                              {onlineSelectedExamData.part1.length +
                                onlineSelectedExamData.part2.length +
                                onlineSelectedExamData.part3.length}{' '}
                              câu
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detailed Solutions Text Editor / Preview */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs sm:text-sm font-bold text-emerald-300">
                          Nội dung Lời Giải Chi Tiết &amp; Hướng Dẫn Ôn Tập (Học sinh xem lại sau khi nộp bài):
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const autoBuilt = [
                              ...onlineSelectedExamData.part1.map(
                                (q, i) => `Câu ${i + 1}: ${q.explanation}`
                              ),
                              ...onlineSelectedExamData.part2.map(
                                (q, i) =>
                                  `Câu ${onlineSelectedExamData.part1.length + i + 1} (Đúng/Sai): ${q.explanation}`
                              ),
                              ...onlineSelectedExamData.part3.map(
                                (q, i) =>
                                  `Câu ${
                                    onlineSelectedExamData.part1.length +
                                    onlineSelectedExamData.part2.length +
                                    i +
                                    1
                                  } (Trả lời ngắn - Đáp số ${q.answer}): ${q.explanation}`
                              ),
                            ].join('\n\n');
                            setOnlineSolutionText(autoBuilt);
                          }}
                          className="px-3 py-1 text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60 rounded-lg transition-colors"
                        >
                          Trích xuất lời giải chi tiết sẵn có từ đề
                        </button>
                      </div>
                      <textarea
                        rows={5}
                        value={onlineSolutionText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOnlineSolutionText(val);
                          setOnlineRawSolutionDocText(val);
                          const updated = applyDetailedSolutionsTextToExam(
                            val,
                            onlineSelectedExamData
                          );
                          setOnlineSelectedExamData(updated);
                          onUpdateExamData(updated);
                        }}
                        placeholder="Nhập hoặc dán lời giải chi tiết (Ví dụ: Câu 1: Chọn đáp án B. Lời giải chi tiết: ...&#10;Câu 19: Đáp án: a) - Đúng, b) - Đúng...) để học sinh đối chiếu ôn tập sau khi làm bài."
                        className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Selected Exam Summary Bar & Next Step Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  <div className="text-xs sm:text-sm text-slate-300">
                    Đề đang chọn:{' '}
                    <strong className="text-white">{onlineSelectedExamData.title}</strong> ·{' '}
                    <span className="text-emerald-400 font-mono">
                      Phần I: {onlineSelectedExamData.part1.length}c · Phần II:{' '}
                      {onlineSelectedExamData.part2.length}c · Phần III:{' '}
                      {onlineSelectedExamData.part3.length}c
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOnlineOrgStep(2)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm sm:text-base font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-lg transition-all"
                  >
                    <span>Tiếp Tục Sang Bước 2: Cấu Hình Kỳ Thi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                BƯỚC 2: CẤU HÌNH KỲ THI (TÊN KỲ THI, MÔN, LỚP, THỜI GIAN BẮT ĐẦU/KẾT THÚC/LÀM BÀI, CHẾ ĐỘ KIỂM TRA MỨC 1-2-3 / CHẾ ĐỘ ÔN TẬP)
            =============================================================== */}
            {onlineOrgStep === 2 && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-6">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Bước 2. Thiết Lập Thông Số & Quy Chế Kỳ Thi Online
                      </h3>
                      <p className="text-xs text-slate-400">
                        Mọi thông số cấu hình tại đây sẽ đồng bộ trực tiếp sang Phòng Thi Thí Sinh và Bảng Giám Sát.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-violet-400">Cấu hình kỳ thi</span>
                  </div>

                  {/* Form Grid: Tên kỳ thi, Môn, Lớp, Thời gian */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                        1. Tên kỳ thi:
                      </label>
                      <input
                        type="text"
                        value={onlineConfigTitle}
                        onChange={(e) => setOnlineConfigTitle(e.target.value)}
                        placeholder="Nhập tên kỳ thi (VD: Kiểm tra Giữa Học Kỳ I)..."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                        2. Môn:
                      </label>
                      <input
                        type="text"
                        value={onlineConfigSubject}
                        onChange={(e) => setOnlineConfigSubject(e.target.value)}
                        placeholder="Nhập môn thi (VD: Vật Lý 12, Toán 12, Hóa Học 12...)"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                          3. Lớp (Kích chọn lớp hoặc bấm × để xoá lớp cũ):
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-700 min-h-[44px]">
                        {availableClasses.map((cls) => {
                          const active = selectedOnlineClasses.includes(cls);
                          return (
                            <div
                              key={cls}
                              className={`inline-flex items-center rounded-lg text-xs font-mono font-bold transition-colors overflow-hidden border ${
                                active
                                  ? 'bg-violet-600 text-white border-violet-400'
                                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleOnlineClass(cls)}
                                className="px-2.5 py-1 hover:opacity-90 transition-opacity"
                              >
                                {cls}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteOnlineClass(cls, e)}
                                title={`Xoá lớp ${cls}`}
                                className={`px-1.5 py-1 border-l transition-colors ${
                                  active
                                    ? 'border-violet-400/50 text-violet-100 hover:bg-rose-600 hover:text-white'
                                    : 'border-slate-700 text-slate-400 hover:bg-rose-600 hover:text-white'
                                }`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-1 ml-auto">
                          <input
                            type="text"
                            value={newClassNameInput}
                            onChange={(e) => setNewClassNameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomClass();
                              }
                            }}
                            placeholder="+ Tên lớp..."
                            className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomClass}
                            className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shrink-0"
                            title="Thêm lớp mới"
                          >
                            + Thêm
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                        4. Thời gian làm bài (phút):
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={5}
                          max={240}
                          value={onlineDurationMinutes}
                          onChange={(e) =>
                            setOnlineDurationMinutes(Number(e.target.value) || 50)
                          }
                          className="w-36 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono font-bold text-white focus:outline-none focus:border-violet-500"
                        />
                        <span className="text-xs sm:text-sm text-slate-400">
                          phút (Đếm ngược tự động trong phòng thi)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                        5. Thời gian bắt đầu mở đề:
                      </label>
                      <input
                        type="datetime-local"
                        value={onlineStartTime}
                        onChange={(e) => setOnlineStartTime(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                        6. Thời gian kết thúc đóng đề:
                      </label>
                      <input
                        type="datetime-local"
                        value={onlineEndTime}
                        onChange={(e) => setOnlineEndTime(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  {/* Chế độ kiểm tra vs Chế độ ôn tập */}
                  <div className="space-y-4 pt-3 border-t border-slate-800">
                    <label className="block text-sm font-bold text-white">
                      7. Chế độ tổ chức & Quy tắc xử lý vi phạm:
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Card A: Chế độ Kiểm tra (Thu bài cưỡng chế Mức 1, 2, 3) */}
                      <div
                        onClick={() => {
                          setOnlineExamMode('exam');
                          if (onSaveOnlineAssignment) {
                            onSaveOnlineAssignment(
                              buildSynchronizedAssignmentPayload({
                                mode: 'exam',
                                violationLevel: onlineViolationLevel,
                              })
                            );
                          }
                        }}
                        className={`cursor-pointer p-5 rounded-2xl border-2 transition-all space-y-4 ${
                          onlineExamMode === 'exam'
                            ? 'bg-rose-950/35 border-rose-500 text-white shadow-lg'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-rose-400" />
                            <span className="text-base font-bold text-white">
                              Chế Độ Kiểm Tra (Thu Bài Cưỡng Chế)
                            </span>
                          </div>
                          <input
                            type="radio"
                            checked={onlineExamMode === 'exam'}
                            onChange={() => {
                              setOnlineExamMode('exam');
                              if (onSaveOnlineAssignment) {
                                onSaveOnlineAssignment(
                                  buildSynchronizedAssignmentPayload({
                                    mode: 'exam',
                                    violationLevel: onlineViolationLevel,
                                  })
                                );
                              }
                            }}
                            className="w-4 h-4 accent-rose-500"
                          />
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          Bật hệ thống <strong>Giám sát chống gian lận</strong>. Nếu học sinh chuyển Tab, rời cửa sổ làm bài hoặc thoát Toàn màn hình chạm ngưỡng quy định, hệ thống tự động <strong>thu bài cưỡng chế</strong> ngay lập tức:
                        </p>

                        <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 font-medium leading-relaxed">
                          🔀 <strong>Tự động xáo trộn ngẫu nhiên:</strong> Hệ thống tự động xáo trộn thứ tự các câu hỏi trong mỗi phần và thứ tự đáp án trong mỗi câu riêng biệt cho từng học sinh (giữ nguyên thứ tự Phần I → Phần II → Phần III) để học sinh ngồi cạnh nhau không trùng đề.
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {(
                            [
                              {
                                level: 1 as const,
                                title: 'Mức 1',
                                desc: 'Vi phạm 1 lần thu bài',
                              },
                              {
                                level: 2 as const,
                                title: 'Mức 2',
                                desc: 'Vi phạm 3 lần thu bài',
                              },
                              {
                                level: 3 as const,
                                title: 'Mức 3',
                                desc: 'Vi phạm 4 lần thu bài',
                              },
                            ]
                          ).map((lv) => {
                            const selected =
                              onlineExamMode === 'exam' && onlineViolationLevel === lv.level;
                            return (
                              <button
                                key={lv.level}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOnlineExamMode('exam');
                                  setOnlineViolationLevel(lv.level);
                                  if (onSaveOnlineAssignment) {
                                    onSaveOnlineAssignment(
                                      buildSynchronizedAssignmentPayload({
                                        mode: 'exam',
                                        violationLevel: lv.level,
                                      })
                                    );
                                  }
                                }}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                  selected
                                    ? 'bg-rose-600 text-white border-rose-300 shadow-sm'
                                    : 'bg-slate-950/90 text-slate-300 border-slate-800 hover:border-rose-500/60'
                                }`}
                              >
                                <div className="text-xs font-mono font-bold">{lv.title}</div>
                                <div className="text-[11px] mt-0.5 opacity-95">{lv.desc}</div>
                              </button>
                            );
                          })}
                        </div>

                        {onlineExamMode === 'exam' && (
                          <div className="px-3 py-2 rounded-xl bg-rose-900/40 border border-rose-400/50 text-xs font-mono text-rose-100 flex items-center justify-between gap-2">
                            <span>
                              ✓ Đang áp dụng: <strong>Mức {onlineViolationLevel}</strong>
                            </span>
                            <span className="font-bold text-amber-300">
                              Tối đa {getViolationThresholdByLevel(onlineViolationLevel)} lần vi phạm → Thu bài cưỡng chế
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card B: Chế độ Ôn tập (Không thu bài cưỡng chế & Không hiển thị Giám sát) */}
                      <div
                        onClick={() => {
                          setOnlineExamMode('practice');
                          if (onSaveOnlineAssignment) {
                            onSaveOnlineAssignment(
                              buildSynchronizedAssignmentPayload({
                                mode: 'practice',
                              })
                            );
                          }
                        }}
                        className={`cursor-pointer p-5 rounded-2xl border-2 transition-all space-y-4 ${
                          onlineExamMode === 'practice'
                            ? 'bg-emerald-950/35 border-emerald-500 text-white shadow-lg'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span className="text-base font-bold text-white">
                              Chế Độ Ôn Tập (Không Thu Bài Cưỡng Chế)
                            </span>
                          </div>
                          <input
                            type="radio"
                            checked={onlineExamMode === 'practice'}
                            onChange={() => {
                              setOnlineExamMode('practice');
                              if (onSaveOnlineAssignment) {
                                onSaveOnlineAssignment(
                                  buildSynchronizedAssignmentPayload({
                                    mode: 'practice',
                                  })
                                );
                              }
                            }}
                            className="w-4 h-4 accent-emerald-500"
                          />
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          Dành cho học sinh tự luyện tập tại nhà hoặc trên lớp: <strong>Không hiển thị thanh Giám sát</strong>, <strong>không thu bài cưỡng chế</strong> khi chuyển cửa sổ, đồng thời mở đầy đủ <strong>Lời giải chi tiết &amp; Đáp án từng câu</strong> ngay sau khi nộp bài.
                        </p>

                        <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-800/60 text-xs text-emerald-300 font-mono space-y-1">
                          <div>✓ Ẩn hoàn toàn mục Giám sát &amp; cảnh báo vi phạm trong phòng làm bài.</div>
                          <div>✓ Giữ nguyên thứ tự câu hỏi và đáp án gốc (không xáo trộn).</div>
                          <div>✓ Mở toàn bộ lời giải chi tiết &amp; đáp án ngay sau khi nộp bài.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation for Step 2 */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOnlineOrgStep(1)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay Lại Bước 1. Chọn Đề</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const payload = buildSynchronizedAssignmentPayload();
                      setOnlineSelectedExamData(payload.examData);
                      if (onSaveOnlineAssignment) {
                        onSaveOnlineAssignment(payload);
                      } else {
                        onUpdateExamData(payload.examData);
                      }
                      setOnlineAssignmentCode(payload.examCode);
                      setIsOnlinePublished(true);
                      setOnlineOrgStep(3);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-lg transition-all"
                  >
                    <span>Hoàn Tất Cấu Hình — Sang Bước 3: Giao Bài</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                BƯỚC 3: GIAO BÀI (MÃ BÀI THI, ĐƯỜNG LINK BÀI THI, CHỌN LỚP, THÊM LỚP & ĐỒNG BỘ TOÀN HỆ THỐNG)
            =============================================================== */}
            {onlineOrgStep === 3 && (
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-2xl bg-slate-950/80 border border-violet-700/60 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-xs font-mono uppercase text-emerald-400 font-bold">
                        BƯỚC 3 · PHÁT HÀNH & GIAO BÀI THI ĐỒNG BỘ TOÀN HỆ THỐNG
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                        Cửa Sổ Giao Bài: Mã Bài Thi · Đường Link · Quản Lý Lớp Học
                      </h3>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-600/60">
                      {onlineExamMode === 'exam'
                        ? `Chế độ Kiểm tra · Mức ${onlineViolationLevel} (${getViolationThresholdByLevel(
                            onlineViolationLevel
                          )} lần vi phạm thu bài)`
                        : 'Chế độ Ôn tập · Có lời giải chi tiết'}
                    </span>
                  </div>

                  {/* 1. Mã bài thi & 2. Đường Link bài thi */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Mã bài thi */}
                    <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 overflow-hidden">
                      <label className="block text-xs sm:text-sm font-bold text-violet-300">
                        1. Mã bài thi (Học sinh nhập tại Cổng Học Sinh):
                      </label>
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full">
                        <input
                          type="text"
                          value={onlineDispatchCode}
                          onChange={(e) => {
                            setOnlineDispatchCode(e.target.value);
                          }}
                          className="min-w-0 flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-violet-600/70 text-lg font-mono font-extrabold text-amber-300 text-center focus:outline-none focus:border-violet-400"
                          placeholder="1102"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const randomCode = String(Math.floor(1000 + Math.random() * 9000));
                            setOnlineDispatchCode(randomCode);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 shrink-0"
                          title="Tạo mã bài thi ngẫu nhiên"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(onlineDispatchCode.trim());
                            setCopiedDispatchCode(true);
                            window.setTimeout(() => setCopiedDispatchCode(false), 2000);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white whitespace-nowrap shrink-0 shadow-sm"
                        >
                          {copiedDispatchCode ? (
                            <>
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span>Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 shrink-0" />
                              <span>Sao chép mã</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Đường Link bài thi */}
                    <div className="lg:col-span-7 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 overflow-hidden">
                      <label className="block text-xs sm:text-sm font-bold text-emerald-300">
                        2. Đường Link bài thi trực tuyến (Gửi qua Zalo / Nhóm lớp):
                      </label>
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full">
                        <input
                          type="text"
                          readOnly
                          value={computedOnlineExamLink}
                          className="min-w-0 flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm font-mono text-sky-300 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(computedOnlineExamLink);
                            setCopiedDispatchLink(true);
                            window.setTimeout(() => setCopiedDispatchLink(false), 2000);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white whitespace-nowrap shrink-0 shadow-sm"
                        >
                          {copiedDispatchLink ? (
                            <>
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span>Đã chép Link</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 shrink-0" />
                              <span>Sao chép Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Chọn lớp & 4. Thêm lớp */}
                  <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <label className="block text-sm font-bold text-white">
                          3. Chọn Lớp Giao Bài & Thêm / Xoá Lớp Học:
                        </label>
                        <p className="text-xs text-slate-400">
                          Kích vào tên lớp để chọn/bỏ chọn giao bài ({selectedOnlineClasses.length} lớp đang chọn: {selectedOnlineClasses.join(', ') || 'Chưa chọn'}) · Bấm nút <strong>×</strong> cạnh tên lớp để xoá lớp cũ khi cập nhật phân công theo năm học.
                        </p>
                      </div>

                      {/* Thêm lớp mới */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newClassNameInput}
                          onChange={(e) => setNewClassNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomClass();
                            }
                          }}
                          placeholder="Nhập tên lớp (VD: 12A5)..."
                          className="w-44 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomClass}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white whitespace-nowrap shrink-0"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>+ Thêm Lớp</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {availableClasses.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">
                          Chưa có lớp nào trong danh sách. Hãy nhập tên lớp vào ô bên phải và nhấn &ldquo;+ Thêm Lớp&rdquo;.
                        </span>
                      ) : (
                        availableClasses.map((cls) => {
                          const isSelected = selectedOnlineClasses.includes(cls);
                          return (
                            <div
                              key={cls}
                              className={`inline-flex items-center rounded-xl text-xs sm:text-sm font-mono font-bold border transition-all overflow-hidden ${
                                isSelected
                                  ? 'bg-violet-600 text-white border-violet-400 shadow-sm'
                                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleOnlineClass(cls)}
                                className="px-3.5 py-2 flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                              >
                                <span>Lớp {cls}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteOnlineClass(cls, e)}
                                title={`Xoá lớp ${cls} khỏi danh sách`}
                                aria-label={`Xoá lớp ${cls}`}
                                className={`px-2.5 py-2 border-l transition-colors flex items-center justify-center ${
                                  isSelected
                                    ? 'border-violet-400/50 text-violet-100 hover:bg-rose-600 hover:text-white'
                                    : 'border-slate-800 text-slate-400 hover:bg-rose-600 hover:text-white'
                                }`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Primary Action Bar in Step 3 */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setOnlineOrgStep(2)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay Lại Bước 2. Cấu Hình Kỳ Thi</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePublishAndSyncOnlineExam}
                        className="inline-flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Phát Hành & Đồng Bộ Bài Thi Toàn Hệ Thống</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handlePublishAndSyncOnlineExam();
                          onLaunchStudentWithCode(onlineDispatchCode.trim() || '1102');
                        }}
                        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-lg transition-all"
                      >
                        <Play className="w-4 h-4" />
                        <span>Mở Phòng Thi Thí Sinh Với Mã Này</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Synchronized Online Assignments List */}
                  {onlineAssignments.length > 0 && (
                    <div className="pt-4 border-t border-slate-800 space-y-3">
                      <h4 className="text-sm font-bold text-slate-200">
                        Danh Sách Kỳ Thi / Bài Tập Online Đang Phát Hành Trên Hệ Thống ({onlineAssignments.length}):
                      </h4>
                      <div className="space-y-2.5">
                        {onlineAssignments.map((assign) => (
                          <div
                            key={assign.id}
                            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono text-xs font-bold">
                                  MÃ BÀI THI: {assign.examCode}
                                </span>
                                <span className="text-sm font-bold text-white">
                                  {assign.examTitle}
                                </span>
                                <span className="text-xs font-mono text-violet-300">
                                  · Môn: {assign.subject}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                                <span>Lớp: {assign.assignedClasses.join(', ')}</span>
                                <span>·</span>
                                <span>Thời gian làm bài: {assign.durationMinutes} phút</span>
                                <span>·</span>
                                <span
                                  className={
                                    assign.mode === 'exam'
                                      ? 'text-rose-300 font-semibold'
                                      : 'text-emerald-300 font-semibold'
                                  }
                                >
                                  {assign.mode === 'exam'
                                    ? `Chế độ Kiểm tra: Mức ${assign.violationLevel} (Thu bài khi vi phạm ${assign.maxViolations} lần)`
                                    : 'Chế độ Ôn tập: Không thu bài cưỡng chế + Xem lời giải chi tiết'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setOnlineDispatchCode(assign.examCode);
                                  setOnlineConfigTitle(assign.examTitle);
                                  setOnlineConfigSubject(assign.subject);
                                  setOnlineDurationMinutes(assign.durationMinutes);
                                  setSelectedOnlineClasses(assign.assignedClasses);
                                  setOnlineStartTime(assign.startTime || onlineStartTime);
                                  setOnlineEndTime(assign.endTime || onlineEndTime);
                                  setOnlineExamMode(assign.mode === 'practice' ? 'practice' : 'exam');
                                  setOnlineViolationLevel(assign.violationLevel || 2);
                                  setOnlineSourceMode(assign.sourceMode || 'bank');
                                  if (assign.examData) {
                                    setOnlineSelectedExamData(assign.examData);
                                  }
                                  if (assign.detailedSolutionContent) {
                                    setOnlineSolutionText(assign.detailedSolutionContent);
                                    setOnlineRawSolutionDocText(assign.detailedSolutionContent);
                                  }
                                  setIsOnlinePublished(true);
                                  setOnlineOrgStep(2);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200"
                              >
                                Cấu Hình (Bước 2)
                              </button>
                              <button
                                type="button"
                                onClick={() => onLaunchStudentWithCode(assign.examCode)}
                                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white"
                              >
                                Vào Thi Mã {assign.examCode}
                              </button>
                              {onDeleteOnlineAssignment && onlineAssignments.length > 1 && (
                                <HelpTooltip
                                  title="Xoá Phiên Giao Bài (Delete Session)"
                                  description="Gỡ bỏ mã bài thi trực tuyến này khỏi danh sách phát hành. Đề gốc trong Ngân hàng đề vẫn được giữ nguyên."
                                  align="end"
                                >
                                  <button
                                    type="button"
                                    onClick={() => onDeleteOnlineAssignment(assign.id)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300"
                                    title="Xoá đợt giao bài"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </HelpTooltip>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
