import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, BookOpen, Settings, Wand2, ShieldCheck, 
  ShieldAlert, Users, FileSpreadsheet, Download, Printer, 
  Eye, Play, CheckCircle2, AlertTriangle, Search, Filter, 
  Sparkles, Clock, ArrowRight, Shuffle, Code, FileText, 
  Lock, Maximize2, AlertCircle, RefreshCw, X, ChevronRight,
  Award, HelpCircle, GraduationCap, FolderTree, Layers,
  Send, Plus, Check, Share2, Tag, Calendar, ExternalLink,
  BookmarkCheck, Trash2, Edit3, Home, FileEdit, BarChart3,
  UploadCloud, FileUp, Loader2, ArrowLeft
} from 'lucide-react';
import { 
  Exam, Question, ExamVariantBundle, AntiCheatConfig, 
  StudentSubmission, PhysicsTopic 
} from '../types/exam';
import { 
  CurriculumChapter, CurriculumLesson, ExamPackage, 
  GradeLevel, ExamCategory, ExamAssignmentInfo 
} from '../types/curriculum';
import { CURRICULUM_CHAPTERS, MILESTONES, getSavedExamPackages, saveExamPackagesToStorage } from '../data/curriculumData';
import { MathRenderer } from './MathRenderer';
import { DiagramViewer } from './DiagramViewer';
import { AIGeneratorTab } from './AIGeneratorTab';
import { ShufflingTab } from './ShufflingTab';
import { AntiCheatConfigTab } from './AntiCheatConfigTab';
import { AssignExamModal } from './AssignExamModal';
import { UploadLessonExamModal } from './UploadLessonExamModal';
import { CurriculumExamBank } from './CurriculumExamBank';
import { SaveExamToBankModal } from './SaveExamToBankModal';
import { TeacherEditor } from './TeacherEditor';
import { parseWordPhysicsExam, WordExamParseResult } from '../utils/wordExamParser';
import { exportScoreReportToCSV, exportAllSubmissionsToCSV, exportGradebookToExcel } from '../utils/exportCsv';
import { saveAntiCheatConfig } from '../utils/antiCheat';
import { resolveQuestionDiagram, FIGURE_MENTION_REGEX } from '../utils/diagramResolver';
import { updateQuestionDiagramInExam } from '../utils/examStorage';
import { UserAdminPanel } from './UserAdminPanel';
import { 
  getQuestionCognitiveLevel, 
  getStatementCognitiveLevel, 
  CognitiveLevelBadge, 
  stripCognitiveLevelPrefix,
  CognitiveLevel,
  COGNITIVE_LEVELS_CONFIG
} from '../utils/cognitiveLevel';
import { deleteSubmissionFromCloud, clearAllSubmissionsFromCloud } from '../services/apiSync';

export type DashboardPanel = 'panel1' | 'panel2' | 'panel3' | 'panel4' | 'panel5' | 'panel6' | 'overview' | 'config' | 'ai_tools' | 'monitoring' | 'admin';

interface TeacherDashboardProps {
  exam?: Exam;
  currentExam?: Exam;
  onUpdateExam?: (updatedExam: Exam) => void;
  onPreviewAsStudent?: () => void;
  bundle?: ExamVariantBundle | null;
  onApplyBundle?: (newBundle: ExamVariantBundle) => void;
  onOpenPrint?: (mode: 'exam_only' | 'exam_with_solutions') => void;
  onOpenPrintMatrix?: (bundle: ExamVariantBundle) => void;
  onOpenTeacherJsonModal?: () => void;
  antiCheatConfig?: AntiCheatConfig;
  onChangeAntiCheatConfig?: (newConfig: AntiCheatConfig) => void;
  submissions?: StudentSubmission[];
  onAddSampleSubmission?: () => void;
  onClearSubmissions?: () => void;
  onDeleteSubmission?: (id: string) => void;
  availableCodes?: string[];
  activeCode?: string;
  onSelectExamCode?: (code: string) => void;
  examPackages?: ExamPackage[];
  onSaveExamPackage?: (pkg: ExamPackage) => void;
  onDeleteExamPackage?: (pkgId: string) => void;
  onOpenSaveToBank?: () => void;
  assignments?: ExamAssignmentInfo[];
  onAssignExam?: (pkg: ExamPackage, assignment: ExamAssignmentInfo, switchToStudent: boolean) => void;
  onSelectExamPackage?: (pkg: ExamPackage) => void;
  onDeleteAssignment?: (id: string) => void;
  initialPanel?: DashboardPanel;
  initialSubtabIndex?: number;
  onNavigateHome?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  exam: propExam,
  currentExam: propCurrentExam,
  onUpdateExam = () => {},
  onPreviewAsStudent = () => {},
  bundle = null,
  onApplyBundle = () => {},
  onOpenPrint = () => {},
  onOpenPrintMatrix,
  onOpenTeacherJsonModal = () => {},
  antiCheatConfig = { enabled: true, maxViolations: 5 } as any,
  onChangeAntiCheatConfig = () => {},
  submissions = [],
  onAddSampleSubmission,
  onClearSubmissions,
  onDeleteSubmission,
  availableCodes = ['101'],
  activeCode = '101',
  onSelectExamCode = () => {},
  examPackages: externalPackages = [],
  onSaveExamPackage,
  onDeleteExamPackage,
  onOpenSaveToBank,
  assignments: externalAssignments = [],
  onAssignExam,
  onSelectExamPackage,
  onDeleteAssignment,
  initialPanel,
  initialSubtabIndex,
  onNavigateHome,
}) => {
  // Lớp phòng vệ an toàn cho exam và questions
  const safeExam: Exam = useMemo(() => {
    const raw = propExam || propCurrentExam;
    if (raw && Array.isArray(raw.questions)) {
      return raw;
    }
    return {
      id: raw?.id || 'exam-fallback',
      code: raw?.code || '101',
      title: raw?.title || 'Đề thi Khảo thí Vật lí',
      subtitle: raw?.subtitle || '',
      durationMinutes: raw?.durationMinutes || 45,
      totalPoints: raw?.totalPoints || 10,
      questions: Array.isArray(raw?.questions) ? raw.questions : []
    } as any;
  }, [propExam, propCurrentExam]);

  const safeQuestions: Question[] = useMemo(() => {
    return Array.isArray(safeExam?.questions) ? safeExam.questions : [];
  }, [safeExam]);

  const resolvePanel = (p?: DashboardPanel): DashboardPanel => {
    if (!p) return 'panel1';
    if (p === 'overview') return 'panel1';
    if (p === 'ai_tools') return 'panel2';
    if (p === 'config') return 'panel3';
    if (p === 'monitoring') return 'panel4';
    return p;
  };

  const [activePanel, setActivePanel] = useState<DashboardPanel>(() => resolvePanel(initialPanel));

  const [panel2Tab, setPanel2Tab] = useState<'word_import' | 'visual_editor' | 'ai_scan' | 'json_import'>('word_import');
  const [panel3Tab, setPanel3Tab] = useState<'shuffling' | 'anticheat' | 'settings'>('shuffling');
  const [panel4Tab, setPanel4Tab] = useState<'submissions' | 'distribution' | 'export_report'>('submissions');
  const [panel5Tab, setPanel5Tab] = useState<'print_student' | 'print_teacher'>('print_student');
  const [panel6Tab, setPanel6Tab] = useState<'teachers' | 'students' | 'rbac'>('teachers');

  const wordFileInputRef = useRef<HTMLInputElement>(null);
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [isParsingWord, setIsParsingWord] = useState<boolean>(false);
  const [wordParseResult, setWordParseResult] = useState<WordExamParseResult | null>(null);
  const [wordParseError, setWordParseError] = useState<string | null>(null);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [isParsingJson, setIsParsingJson] = useState<boolean>(false);
  const [jsonParsedExam, setJsonParsedExam] = useState<Exam | null>(null);
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPanel) {
      const resolved = resolvePanel(initialPanel);
      setActivePanel(resolved);
      if (resolved === 'panel2' && initialSubtabIndex !== undefined) {
        const tabs: Array<'word_import' | 'visual_editor' | 'ai_scan' | 'json_import'> = ['word_import', 'visual_editor', 'ai_scan', 'json_import'];
        if (tabs[initialSubtabIndex]) setPanel2Tab(tabs[initialSubtabIndex]);
      } else if (resolved === 'panel3' && initialSubtabIndex !== undefined) {
        const tabs: Array<'shuffling' | 'anticheat' | 'settings'> = ['shuffling', 'anticheat', 'settings'];
        if (tabs[initialSubtabIndex]) setPanel3Tab(tabs[initialSubtabIndex]);
      } else if (resolved === 'panel4' && initialSubtabIndex !== undefined) {
        const tabs: Array<'submissions' | 'distribution' | 'export_report'> = ['submissions', 'distribution', 'export_report'];
        if (tabs[initialSubtabIndex]) setPanel4Tab(tabs[initialSubtabIndex]);
      } else if (resolved === 'panel5' && initialSubtabIndex !== undefined) {
        const tabs: Array<'print_student' | 'print_teacher'> = ['print_student', 'print_teacher'];
        if (tabs[initialSubtabIndex]) setPanel5Tab(tabs[initialSubtabIndex]);
      } else if ((resolved === 'panel6' || resolved === 'admin') && initialSubtabIndex !== undefined) {
        const tabs: Array<'teachers' | 'students' | 'rbac'> = ['teachers', 'students', 'rbac'];
        if (tabs[initialSubtabIndex]) setPanel6Tab(tabs[initialSubtabIndex]);
      }
    }
  }, [initialPanel, initialSubtabIndex]);

  const [isSaveExamModalOpen, setIsSaveExamModalOpen] = useState<boolean>(false);
  const [localPackages, setLocalPackages] = useState<ExamPackage[]>(() => getSavedExamPackages());
  const allPackages = externalPackages && externalPackages.length > 0 ? externalPackages : localPackages;

  const [localAssignments, setLocalAssignments] = useState<ExamAssignmentInfo[]>(() => {
    try {
      const raw = localStorage.getItem('physixam_assignments');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const allAssignments = (externalAssignments && externalAssignments.length > 0) ? externalAssignments : localAssignments;

  const [panel1ViewMode, setPanel1ViewMode] = useState<'curriculum_bank' | 'current_exam_questions' | 'assigned_management'>('curriculum_bank');
  const [filterGrade, setFilterGrade] = useState<GradeLevel | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ExamCategory | 'all'>('all');
  const [filterChapterId, setFilterChapterId] = useState<string>('all');
  const [filterLessonId, setFilterLessonId] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState<string>('');

  const [assigningPackage, setAssigningPackage] = useState<ExamPackage | null>(null);
  const [selectedPartFilter, setSelectedPartFilter] = useState<'all' | 'Phần I' | 'Phần II' | 'Phần III'>('all');
  const [selectedCognitiveLevelFilter, setSelectedCognitiveLevelFilter] = useState<'all' | 'NB' | 'TH' | 'VD' | 'VDC'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [selectedDiagramSourceId, setSelectedDiagramSourceId] = useState<string | null>(null);

  const [inspectingSubmission, setInspectingSubmission] = useState<StudentSubmission | null>(null);
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'submitted' | 'violated'>('all');
  const [studentSearch, setStudentSearch] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteSingleSubmission = async (sub: StudentSubmission) => {
    if (!sub) return;
    const name = sub.studentName || 'Thí sinh';
    const sbd = sub.candidateNumber || '';
    if (window.confirm(`Thầy có chắc chắn muốn xóa bài thi của thí sinh: "${name}" (SBD: ${sbd}) không?`)) {
      const targetId = (sub as any).id || (sub as any)._id;
      if (onDeleteSubmission && targetId) {
        onDeleteSubmission(targetId);
      }
      try {
        if (targetId) await deleteSubmissionFromCloud(targetId);
      } catch (e) {
        console.warn('Lỗi khi xóa trên cloud:', e);
      }
      showToast(`Đã xóa bài thi của thí sinh "${name}" thành công!`);
    }
  };

  const handleClearAllSubmissions = async () => {
    if (!submissions || submissions.length === 0) return;
    if (window.confirm(`CẢNH BÁO: Thầy có chắc chắn muốn XÓA TOÀN BỘ ${submissions.length} bài thi của học sinh không? Dữ liệu trên hệ thống sẽ bị xóa vĩnh viễn!`)) {
      if (onClearSubmissions) {
        onClearSubmissions();
      }
      try {
        await clearAllSubmissionsFromCloud();
      } catch (e) {
        console.warn('Lỗi khi xóa sạch cloud:', e);
      }
      showToast('Đã xóa sạch toàn bộ danh sách thí sinh nộp bài thành công!');
    }
  };

  const handleSavePackage = (newPkg: ExamPackage) => {
    if (onSaveExamPackage) {
      onSaveExamPackage(newPkg);
    } else {
      setLocalPackages((prev) => {
        const idx = prev.findIndex((p) => p.id === newPkg.id);
        let updated: ExamPackage[];
        if (idx >= 0) {
          updated = [...prev];
          updated[idx] = newPkg;
        } else {
          updated = [newPkg, ...prev];
        }
        saveExamPackagesToStorage(updated);
        return updated;
      });
    }
    showToast(`Đã lưu thành công đề thi '${newPkg.title}' vào Ngân hàng đề (Khối ${newPkg.grade})!`);
  };

  const handleDeleteExamPackage = (pkgId: string) => {
    if (onDeleteExamPackage) {
      onDeleteExamPackage(pkgId);
    } else {
      setLocalPackages((prev) => {
        const updated = prev.filter((p) => p.id !== pkgId);
        saveExamPackagesToStorage(updated);
        return updated;
      });
    }
    showToast('Đã xóa đề thi khỏi Ngân hàng đề thành công!');
  };

  const handleOpenInEditor = (pkg: ExamPackage) => {
    handleSelectPackageAsActive(pkg);
    onOpenTeacherJsonModal();
  };

  const handleSelectPackageAsActive = (pkg: ExamPackage) => {
    if (onSelectExamPackage) {
      onSelectExamPackage(pkg);
    } else {
      onUpdateExam(pkg.examData);
    }
    showToast(`Đã nạp đề thi [Mã: ${pkg.code}] "${pkg.title}" vào hệ thống khảo thí!`);
  };

  const handleBankAssignExam = async (pkg: ExamPackage, assignment: ExamAssignmentInfo, switchToStudent: boolean) => {
    const targetExam = pkg?.examData || safeExam;
    const finalCode = assignment.accessCode || (assignment as any).code || targetExam.code || 'L10GHKI';

    const fullAssignment: any = {
      ...assignment,
      id: assignment.id || `assign-${Date.now()}`,
      code: finalCode,
      accessCode: finalCode,
      examCode: targetExam.code || finalCode,
      title: targetExam.title || assignment.examTitle,
      examTitle: targetExam.title || assignment.examTitle,
      durationMinutes: targetExam.durationMinutes || 45,
      questions: targetExam.questions || [],
      examData: targetExam,
      assignedAt: new Date().toISOString(),
      status: 'active'
    };

    if (onAssignExam) {
      onAssignExam(pkg, fullAssignment, switchToStudent);
    } else {
      setLocalAssignments((prev) => [fullAssignment, ...prev.filter((a) => a.id !== fullAssignment.id)]);
      try {
        localStorage.setItem('physixam_assignments', JSON.stringify([fullAssignment, ...localAssignments.filter((a) => a.id !== fullAssignment.id)]));
      } catch {}
      onUpdateExam(targetExam);

      try {
        await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullAssignment)
        });
      } catch (err) {}
    }

    setAssigningPackage(null);
    showToast(`Đã giao thành công bài thi cho Lớp ${assignment.className}! Mã thi: ${finalCode}`);

    if (switchToStudent) {
      onPreviewAsStudent();
    }
  };

  const handleConfirmAssignment = (pkg: ExamPackage, assignment: ExamAssignmentInfo, switchToStudent: boolean) => {
    handleBankAssignExam(pkg, assignment, switchToStudent);
  };

  const handleDeleteAssignment = (assignId: string) => {
    if (onDeleteAssignment) {
      onDeleteAssignment(assignId);
    } else {
      const updated = localAssignments.filter((a) => a.id !== assignId);
      setLocalAssignments(updated);
      try {
        localStorage.setItem('physixam_assignments', JSON.stringify(updated));
      } catch {}
    }
    showToast('Đã xóa lượt giao bài thi thành công!');
  };

  const partStats = useMemo(() => {
    const part1 = safeQuestions.filter((q) => q?.part === 'Phần I').length;
    const part2 = safeQuestions.filter((q) => q?.part === 'Phần II').length;
    const part3 = safeQuestions.filter((q) => q?.part === 'Phần III').length;
    return { part1, part2, part3, total: safeQuestions.length };
  }, [safeQuestions]);

  const cognitiveStats = useMemo(() => {
    let nb = 0;
    let th = 0;
    let vd = 0;
    let vdc = 0;
    safeQuestions.forEach((q) => {
      if (!q) return;
      const lvl = getQuestionCognitiveLevel(q);
      if (lvl === 'NB') nb++;
      else if (lvl === 'TH') th++;
      else if (lvl === 'VD') vd++;
      else if (lvl === 'VDC') vdc++;
    });
    return { nb, th, vd, vdc, total: safeQuestions.length };
  }, [safeQuestions]);

  const filteredQuestions = useMemo(() => {
    return safeQuestions.filter((q) => {
      if (!q) return false;
      if (selectedPartFilter !== 'all' && q.part !== selectedPartFilter) {
        return false;
      }
      if (selectedCognitiveLevelFilter !== 'all') {
        const qLevel = getQuestionCognitiveLevel(q);
        if (q.type === 'true_false_cluster') {
          const hasMatchingStatement = Array.isArray(q.items) && q.items.some((item, idx) => getStatementCognitiveLevel(item, idx) === selectedCognitiveLevelFilter);
          if (qLevel !== selectedCognitiveLevelFilter && !hasMatchingStatement) {
            return false;
          }
        } else if (qLevel !== selectedCognitiveLevelFilter) {
          return false;
        }
      }
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchTitle = (q.title || '').toLowerCase().includes(query);
        const matchStem = (q.stem || '').toLowerCase().includes(query);
        const matchTopic = (q.topic || '').toLowerCase().includes(query);
        if (!matchTitle && !matchStem && !matchTopic) {
          return false;
        }
      }
      return true;
    });
  }, [safeQuestions, selectedPartFilter, selectedCognitiveLevelFilter, searchQuery]);

  const submissionStats = useMemo(() => {
    const safeSubs = Array.isArray(submissions) ? submissions : [];
    const total = safeSubs.length;
    if (total === 0) return { total: 0, avgScore: 0, passRate: 0, violatedCount: 0 };
    const totalScore = safeSubs.reduce((acc, s) => acc + (s?.totalScore || 0), 0);
    const avgScore = totalScore / total;
    const passCount = safeSubs.filter((s) => (s?.totalScore || 0) >= 5.0).length;
    const passRate = Math.round((passCount / total) * 100);
    const violatedCount = safeSubs.filter(
      (s) => (s?.violationCount || 0) > 0 || s?.submissionReason === 'violation_limit_exceeded'
    ).length;
    return { total, avgScore: Number(avgScore.toFixed(2)), passRate, violatedCount };
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    const safeSubs = Array.isArray(submissions) ? submissions : [];
    return safeSubs.filter((sub) => {
      if (!sub) return false;
      if (submissionFilter === 'submitted' && sub.submissionReason === 'violation_limit_exceeded') {
        return false;
      }
      if (submissionFilter === 'violated' && sub.submissionReason !== 'violation_limit_exceeded' && (sub.violationCount || 0) === 0) {
        return false;
      }
      if (studentSearch.trim().length > 0) {
        const q = studentSearch.toLowerCase();
        const matchName = (sub.studentName || '').toLowerCase().includes(q);
        const matchClass = (sub.studentClass || '').toLowerCase().includes(q);
        const matchSbd = (sub.candidateNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchClass && !matchSbd) {
          return false;
        }
      }
      return true;
    });
  }, [submissions, submissionFilter, studentSearch]);

  const scoreDistributionData = useMemo(() => {
    const safeSubs = Array.isArray(submissions) ? submissions : [];
    const scores = safeSubs.map((s) => s?.totalScore || 0);
    const total = scores.length;
    if (total === 0) {
      return {
        maxScore: 0,
        minScore: 0,
        avgScore: 0,
        medianScore: 0,
        passRate: 0,
        total: 0,
        bands: [
          { label: '[0 - 2)', name: 'Kém', count: 0, percentage: 0, color: 'bg-rose-500' },
          { label: '[2 - 4)', name: 'Yếu', count: 0, percentage: 0, color: 'bg-orange-500' },
          { label: '[4 - 5)', name: 'Dưới TB', count: 0, percentage: 0, color: 'bg-amber-500' },
          { label: '[5 - 6.5)', name: 'Trung bình', count: 0, percentage: 0, color: 'bg-sky-500' },
          { label: '[6.5 - 8)', name: 'Khá', count: 0, percentage: 0, color: 'bg-blue-600' },
          { label: '[8 - 9)', name: 'Giỏi', count: 0, percentage: 0, color: 'bg-indigo-600' },
          { label: '[9 - 10]', name: 'Xuất sắc', count: 0, percentage: 0, color: 'bg-emerald-600' },
        ],
      };
    }

    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const totalScore = scores.reduce((acc, s) => acc + s, 0);
    const avgScore = Number((totalScore / total).toFixed(2));

    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianScore = sorted.length % 2 !== 0 
      ? sorted[mid] 
      : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));

    const passCount = scores.filter((s) => s >= 5.0).length;
    const passRate = Number(((passCount / total) * 100).toFixed(1));

    const bandCounts = [0, 0, 0, 0, 0, 0, 0];
    scores.forEach((s) => {
      if (s < 2) bandCounts[0]++;
      else if (s < 4) bandCounts[1]++;
      else if (s < 5) bandCounts[2]++;
      else if (s < 6.5) bandCounts[3]++;
      else if (s < 8) bandCounts[4]++;
      else if (s < 9) bandCounts[5]++;
      else bandCounts[6]++;
    });

    const bandDefs = [
      { label: '[0 - 2)', name: 'Kém', color: 'bg-rose-500' },
      { label: '[2 - 4)', name: 'Yếu', color: 'bg-orange-500' },
      { label: '[4 - 5)', name: 'Dưới TB', color: 'bg-amber-500' },
      { label: '[5 - 6.5)', name: 'Trung bình', color: 'bg-sky-500' },
      { label: '[6.5 - 8)', name: 'Khá', color: 'bg-blue-600' },
      { label: '[8 - 9)', name: 'Giỏi', color: 'bg-indigo-600' },
      { label: '[9 - 10]', name: 'Xuất sắc', color: 'bg-emerald-600' },
    ];

    const bands = bandDefs.map((def, idx) => ({
      ...def,
      count: bandCounts[idx],
      percentage: Number(((bandCounts[idx] / total) * 100).toFixed(1)),
    }));

    return { maxScore, minScore, avgScore, medianScore, passRate, total, bands };
  }, [submissions]);

  const handleWordFileChange = async (file: File) => {
    if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      setWordParseError('Vui lòng chọn tệp Word có định dạng .docx hoặc .doc.');
      return;
    }
    setWordFile(file);
    setIsParsingWord(true);
    setWordParseError(null);
    setWordParseResult(null);
    try {
      const result = await parseWordPhysicsExam(file);
      setWordParseResult(result);
      showToast(`Đã bóc tách thành công ${result.summary.totalQuestions} câu hỏi từ "${file.name}"!`);
    } catch (err: any) {
      console.error('Lỗi phân tích file Word:', err);
      setWordParseError(err?.message || 'Không thể bóc tách tệp Word. Vui lòng kiểm tra định dạng tệp.');
    } finally {
      setIsParsingWord(false);
    }
  };

  const handleApplyWordExam = () => {
    if (!wordParseResult) return;
    onUpdateExam(wordParseResult.exam);
    showToast(`Đã áp dụng đề thi "${wordParseResult.exam.title}" (${wordParseResult.exam.questions.length} câu) thành công!`);
  };

  // =========================================================================
  // TAB 2.4: BỘ PHÂN GIẢI JSON THÔNG MINH
  // =========================================================================
  const parseJsonExamFile = (jsonData: any): Exam => {
    const root = jsonData?.exam || jsonData?.data || jsonData || {};

    const rawQuestions: any[] = Array.isArray(root.questions) 
      ? root.questions 
      : Array.isArray(jsonData.questions) 
        ? jsonData.questions 
        : [];

    const convertedQuestions: Question[] = rawQuestions.map((q: any, idx: number) => {
      let partName = 'Phần I';
      const rawPart = String(q.part || '').trim().toUpperCase();
      const rawType = String(q.type || '').trim().toLowerCase();

      if (rawPart === 'II' || rawPart === '2' || rawType.includes('true_false') || q.statements) {
        partName = 'Phần II';
      } else if (rawPart === 'III' || rawPart === '3' || rawType.includes('short_answer') || q.correct_value) {
        partName = 'Phần III';
      }

      let diagramObj = undefined;
      let imageObj = undefined;

      const imgSource = q.image || q.diagram;
      if (imgSource) {
        if (typeof imgSource === 'string') {
          const finalStr = imgSource.startsWith('data:') ? imgSource : `data:image/png;base64,${imgSource}`;
          diagramObj = { type: 'image', imageUrl: finalStr, data: finalStr, caption: '' } as any;
          imageObj = { data: finalStr, caption: '' };
        } else if (imgSource.data || imgSource.imageUrl || imgSource.url) {
          const rawData = imgSource.data || imgSource.imageUrl || imgSource.url;
          const mime = imgSource.mime_type || 'image/png';
          const finalData = String(rawData).startsWith('data:') 
            ? rawData 
            : `data:${mime};base64,${rawData}`;
          diagramObj = {
            type: 'image',
            imageUrl: finalData,
            data: finalData,
            caption: imgSource.caption || ''
          } as any;
          imageObj = {
            ...imgSource,
            data: finalData,
            caption: imgSource.caption || ''
          };
        }
      }

      const qCode = q.code || (q.number ? `C${String(q.number).padStart(2, '0')}` : `C${String(idx + 1).padStart(2, '0')}`);
      const qTitle = q.title || `Câu ${q.number || idx + 1}`;
      const qStem = q.question || q.prompt || q.stem || '';
      const qTopic = q.metadata?.topic || q.topic || '';

      if (partName === 'Phần I') {
        const opts = Array.isArray(q.options) ? q.options.map((opt: any) => ({
          id: opt.id || opt.label || 'A',
          label: opt.id || opt.label || 'A',
          text: opt.text || opt.content || ''
        })) : [];

        let correctAns = q.answer || q.correctAnswer || '';
        if (!correctAns && Array.isArray(q.options)) {
          const found = q.options.find((o: any) => o.correct === true);
          if (found) correctAns = found.id || found.label;
        }

        return {
          id: q.id || `q-${idx + 1}`,
          code: qCode,
          title: qTitle,
          part: 'Phần I',
          type: 'multiple_choice',
          stem: qStem,
          prompt: qStem,
          topic: qTopic,
          options: opts,
          correctAnswer: String(correctAns).trim(),
          diagram: diagramObj,
          image: imageObj,
          explanation: q.explanation || '',
          points: q.points || 0.25
        } as any;
      }

      if (partName === 'Phần II') {
        const rawStatements = Array.isArray(q.statements) 
          ? q.statements 
          : Array.isArray(q.items) 
            ? q.items 
            : [];

        const items = rawStatements.map((st: any, sIdx: number) => {
          let boolCorrect = false;
          if (st.correct !== undefined) {
            boolCorrect = Boolean(st.correct);
          } else if (st.isCorrect !== undefined) {
            boolCorrect = Boolean(st.isCorrect);
          } else if (st.answer !== undefined) {
            const ansStr = String(st.answer).trim().toUpperCase();
            boolCorrect = (ansStr === 'D' || ansStr === 'Đ' || ansStr === 'TRUE');
          }

          return {
            id: st.id || String.fromCharCode(97 + sIdx),
            statement: st.text || st.statement || '',
            isCorrect: boolCorrect
          };
        });

        return {
          id: q.id || `q-${idx + 1}`,
          code: qCode,
          title: qTitle,
          part: 'Phần II',
          type: 'true_false_cluster',
          stem: qStem,
          prompt: qStem,
          topic: qTopic,
          items: items,
          diagram: diagramObj,
          image: imageObj,
          explanation: q.explanation || '',
          points: q.points || 1.0
        } as any;
      }

      return {
        id: q.id || `q-${idx + 1}`,
        code: qCode,
        title: qTitle,
        part: 'Phần III',
        type: 'short_answer',
        stem: qStem,
        prompt: qStem,
        topic: qTopic,
        correctValue: String(q.answer || q.correct_value || q.correctAnswer || '').trim(),
        diagram: diagramObj,
        image: imageObj,
        explanation: q.explanation || '',
        points: q.points || 0.25
      } as any;
    });

    const finalTitle = root.title || jsonData.title || 'Đề khảo thí Vật lí (Nhập từ JSON)';
    const finalGrade = root.grade || jsonData.grade || 12;
    const finalCode = root.code || jsonData.code || `L${finalGrade}-${Date.now().toString().slice(-4)}`;
    const finalDuration = Number(root.duration || root.durationMinutes || jsonData.duration || jsonData.durationMinutes || 45);

    return {
      id: root.id || jsonData.id || `exam-${Date.now()}`,
      code: finalCode,
      title: finalTitle,
      subtitle: root.scope || root.curriculum || jsonData.scope || jsonData.curriculum || '',
      durationMinutes: finalDuration,
      totalPoints: Number(root.totalPoints || jsonData.totalPoints || 10),
      gradeLevel: `Khối ${finalGrade}`,
      questions: convertedQuestions
    } as any;
  };

  const handleJsonFileChange = (file: File) => {
    if (!file.name.endsWith('.json')) {
      setJsonParseError('Vui lòng chọn tệp định dạng .json.');
      return;
    }
    setJsonFile(file);
    setIsParsingJson(true);
    setJsonParseError(null);
    setJsonParsedExam(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsedData = JSON.parse(text);

        const hasQuestions = (parsedData && Array.isArray(parsedData.questions)) ||
          (parsedData?.exam && Array.isArray(parsedData.exam.questions)) ||
          (parsedData?.data && Array.isArray(parsedData.data.questions));

        if (!hasQuestions) {
          throw new Error('Tệp JSON không hợp lệ: Không tìm thấy mảng câu hỏi "questions" trong cấu trúc tệp.');
        }

        const converted = parseJsonExamFile(parsedData);
        setJsonParsedExam(converted);
        showToast(`Đã tải thành công ${converted.questions.length} câu hỏi từ tệp JSON!`);
      } catch (err: any) {
        setJsonParseError(err?.message || 'Không thể giải mã tệp JSON. Vui lòng kiểm tra định dạng.');
      } finally {
        setIsParsingJson(false);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyJsonExam = () => {
    if (!jsonParsedExam) return;
    onUpdateExam(jsonParsedExam);
    showToast(`Đã áp dụng đề thi "${jsonParsedExam.title}" (${jsonParsedExam.questions.length} câu) thành công!`);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-indigo-500/40 flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG QUAY LẠI TRANG CHỦ & THÔNG TIN ĐỀ ĐANG LÀM VIỆC */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs sm:text-sm border border-indigo-200 transition cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
              title="Quay lại Cổng Thông Tin Trang Chủ (Khôi phục Pano Banner)"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>⬅ Quay lại Trang chủ</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-2xs">
              <span className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[280px] sm:max-w-md">
                {safeExam.title}
              </span>
              <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {safeExam.gradeLevel ? safeExam.gradeLevel.replace(/\s*\(?Chương trình GDPT 2018\)?/gi, '').trim() : 'Lớp 12'}
              </span>
              <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 text-slate-700">
                Mã: {activeCode}
              </span>
              <span className="text-slate-500 font-medium">
                • {partStats.total} câu ({safeExam.durationMinutes || 45} phút)
              </span>
              {antiCheatConfig?.enabled && (
                <span className="px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Giám sát bật
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cụm hành động nhanh trong Workspace */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => setIsSaveExamModalOpen(true)}
            className="py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            title="Lưu cấu trúc đề thi vào Ngân hàng dữ liệu GDPT 2018"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>💾 Lưu đề</span>
          </button>

          <button
            type="button"
            onClick={onPreviewAsStudent}
            className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-2xs flex items-center gap-1.5"
            title="Xem trước đề thi với tư cách Học sinh"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Xem trước đề</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenPrint('exam_only')}
            className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
            title="In đề thi chuẩn Bộ GD&ĐT"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>In đề</span>
          </button>
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG 6 PANEL TRUNG TÂM */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActivePanel('panel1')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activePanel === 'panel1' || activePanel === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Panel 1: Ngân Hàng Đề & CT 2018</span>
            <span className={`px-2 py-0.5 rounded-full text-2xs ${
              activePanel === 'panel1' || activePanel === 'overview' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {allPackages.length} đề
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePanel('panel2')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activePanel === 'panel2' || activePanel === 'ai_tools'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileEdit className="w-4 h-4" />
            <span>Panel 2: Soạn Thảo & Bóc Tách Đề</span>
            <span className={`px-2 py-0.5 rounded-full text-2xs ${
              activePanel === 'panel2' || activePanel === 'ai_tools' ? 'bg-sky-700 text-sky-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {safeQuestions.length} câu
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePanel('panel3')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activePanel === 'panel3' || activePanel === 'config'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Shuffle className="w-4 h-4" />
            <span>Panel 3: Cấu Hình & Trộn Mã Đề</span>
            <span className={`px-2 py-0.5 rounded-full text-2xs ${
              activePanel === 'panel3' || activePanel === 'config' ? 'bg-amber-700 text-amber-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {bundle ? `${bundle.variants.length} mã` : 'Mã ' + activeCode}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePanel('panel4')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activePanel === 'panel4' || activePanel === 'monitoring'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Panel 4: Giám Sát & Bảng Điểm</span>
            <span className={`px-2 py-0.5 rounded-full text-2xs ${
              activePanel === 'panel4' || activePanel === 'monitoring' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {submissions.length} bài
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePanel('panel5')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activePanel === 'panel5'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Panel 5: Trung Tâm In Ấn & PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePanel('panel6')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activePanel === 'panel6' || activePanel === 'admin'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Panel 6: Quản Trị Hệ Thống & Phân Quyền</span>
          </button>
        </div>

        <div className="hidden xl:flex items-center gap-2 pr-2">
          <button
            type="button"
            onClick={onOpenTeacherJsonModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
          >
            <Code className="w-3.5 h-3.5 text-indigo-600" />
            <span>Quản lý JSON</span>
          </button>
        </div>
      </div>

      {/* PANEL 1: TỔNG QUAN & NGÂN HÀNG ĐỀ THI */}
      {(activePanel === 'panel1' || activePanel === 'overview') && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPanel1ViewMode('curriculum_bank')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                  panel1ViewMode === 'curriculum_bank'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FolderTree className="w-4 h-4" />
                <span>Ngân hàng đề thi GDPT 2018</span>
                <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                  panel1ViewMode === 'curriculum_bank' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {allPackages.length} đề
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPanel1ViewMode('current_exam_questions')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                  panel1ViewMode === 'current_exam_questions'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Chi tiết câu hỏi đề đang nạp</span>
                <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                  panel1ViewMode === 'current_exam_questions' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {safeQuestions.length} câu
                </span>
              </button>
            </div>

            {panel1ViewMode === 'current_exam_questions' && (
              <button
                type="button"
                onClick={() => setPanel1ViewMode('curriculum_bank')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FolderTree className="w-3.5 h-3.5 text-indigo-600" />
                <span>Quay lại Ngân hàng đề thi</span>
              </button>
            )}
          </div>

          {panel1ViewMode === 'curriculum_bank' ? (
            <CurriculumExamBank
              currentExam={safeExam}
              packages={allPackages}
              assignments={allAssignments}
              onSelectPackage={handleSelectPackageAsActive}
              onSavePackage={handleSavePackage}
              onDeletePackage={handleDeleteExamPackage}
              onOpenInEditor={handleOpenInEditor}
              onOpenSaveCurrentExamModal={() => setIsSaveExamModalOpen(true)}
              onAssignExam={handleBankAssignExam}
              onDeleteAssignment={handleDeleteAssignment}
              onPreviewAsStudent={onPreviewAsStudent}
              onOpenPrint={onOpenPrint}
              antiCheatConfig={antiCheatConfig}
              showToast={showToast}
            />
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      Đề thi đang chọn
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-amber-400/20 text-amber-200">
                      Mã {activeCode}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">{safeExam.title}</h3>
                  <p className="text-xs text-slate-300 mt-0.5">{safeExam.subtitle} • {safeExam.durationMinutes || 45} phút • Thang {safeExam.totalPoints || 10}đ</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsSaveExamModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5 text-slate-950" />
                    <span>💾 Lưu đề này vào Ngân hàng</span>
                  </button>

                  {/* NÚT GIAO ĐỀ: ĐỒNG BỘ 100% VỚI safeExam ĐANG CHỌN */}
                  <button
                    type="button"
                    onClick={() => {
                      const targetGrade = safeExam.gradeLevel 
                        ? (parseInt(String(safeExam.gradeLevel).replace(/\D/g, ''), 10) || 12) 
                        : 12;

                      const freshPkg: ExamPackage = {
                        id: safeExam.id || `pkg-${activeCode || 'L12B1.3'}`,
                        grade: targetGrade as any,
                        category: 'survey',
                        categoryLabel: 'Chuẩn Bộ GD&ĐT',
                        chapterId: 'c1',
                        chapterTitle: safeExam.subtitle || 'Khảo thí Vật lí',
                        code: safeExam.code || activeCode || 'L12B1.3',
                        title: safeExam.title,
                        subtitle: safeExam.subtitle,
                        durationMinutes: safeExam.durationMinutes || 45,
                        totalPoints: safeExam.totalPoints || 10,
                        difficulty: 'Chuẩn Bộ GD&ĐT',
                        tags: ['Bộ GD&ĐT', 'KaTeX'],
                        svgCount: 0,
                        katexCount: 0,
                        examData: safeExam,
                        createdAt: new Date().toISOString().slice(0, 10),
                      };
                      setAssigningPackage(freshPkg);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/25 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Giao đề này cho học sinh</span>
                  </button>
                </div>
              </div>

              {/* Bộ lọc câu hỏi */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> Phần thi:
                    </span>
                    {(['all', 'Phần I', 'Phần II', 'Phần III'] as const).map((part) => (
                      <button
                        key={part}
                        onClick={() => setSelectedPartFilter(part)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          selectedPartFilter === part
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {part === 'all' ? 'Tất cả câu hỏi' : part}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full lg:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm nội dung, công thức..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Danh sách câu hỏi */}
              <div className="space-y-4">
                {filteredQuestions.map((q, idx) => {
                  if (!q) return null;
                  const isExpanded = expandedQuestionId === q.id;
                  const originalIndex = safeQuestions.findIndex((item) => item?.id === q.id);
                  const qLevel = getQuestionCognitiveLevel(q);

                  return (
                    <div key={q.id || idx} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center">
                            {originalIndex >= 0 ? originalIndex + 1 : idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{q.title || `Câu ${idx + 1}`}</span>
                          <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-slate-200 text-slate-700">
                            {q.part || 'Phần I'}
                          </span>
                          <CognitiveLevelBadge level={qLevel} showFullName={true} />
                        </div>
                        <button
                          onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                        </button>
                      </div>
                      <div className="p-5 text-sm text-slate-800">
                        <MathRenderer content={stripCognitiveLevelPrefix(q.stem || '')} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PANEL 2: SOẠN THẢO & BÓC TÁCH ĐỀ THÔNG MINH */}
      {(activePanel === 'panel2' || activePanel === 'ai_tools') && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPanel2Tab('word_import')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                  panel2Tab === 'word_import'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileUp className="w-4 h-4" />
                <span>Tab 2.1: Nhập đề từ tệp Word (.docx / .doc)</span>
              </button>

              <button
                type="button"
                onClick={() => setPanel2Tab('visual_editor')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                  panel2Tab === 'visual_editor'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileEdit className="w-4 h-4" />
                <span>Tab 2.2: Trình soạn thảo trực quan & KaTeX</span>
              </button>

              <button
                type="button"
                onClick={() => setPanel2Tab('ai_scan')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                  panel2Tab === 'ai_scan'
                    ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Wand2 className="w-4 h-4 text-amber-300" />
                <span>Tab 2.3: AI Quét ảnh trang sách & Tự sinh câu hỏi</span>
              </button>

              <button
                type="button"
                onClick={() => setPanel2Tab('json_import')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                  panel2Tab === 'json_import'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Code className="w-4 h-4 text-emerald-300" />
                <span>Tab 2.4: Nhập đề từ tệp JSON (.json)</span>
              </button>
            </div>
          </div>

          {panel2Tab === 'word_import' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div 
                onClick={() => wordFileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                  isParsingWord ? 'bg-sky-50/80 border-sky-400' : 'border-sky-300 hover:border-sky-500 bg-sky-50/30'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
                  {isParsingWord ? <Loader2 className="w-7 h-7 animate-spin" /> : <UploadCloud className="w-7 h-7" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 block">
                    {isParsingWord ? 'Đang bóc tách cấu trúc câu hỏi & công thức KaTeX...' : 'Nhấp hoặc kéo thả tệp Word (.docx) vào đây'}
                  </span>
                </div>
                <input
                  ref={wordFileInputRef}
                  type="file"
                  accept=".docx, .doc"
                  onChange={(e) => e.target.files?.[0] && handleWordFileChange(e.target.files[0])}
                  className="hidden"
                />
              </div>

              {wordParseResult && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Bóc tách thành công: {wordFile?.name}</h4>
                    <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
                      {wordParseResult.summary.totalQuestions} câu hỏi
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyWordExam}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Áp dụng vào đề thi hiện tại</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {panel2Tab === 'visual_editor' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <TeacherEditor
                currentExam={safeExam}
                onUpdateExam={(newExam) => {
                  onUpdateExam(newExam);
                  showToast('Đã lưu các thay đổi câu hỏi vào đề thi hiện tại!');
                }}
                onOpenSaveToBank={onOpenSaveToBank}
                onExitToStudentMode={onPreviewAsStudent}
              />
            </div>
          )}

          {panel2Tab === 'ai_scan' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <AIGeneratorTab
                currentExam={safeExam}
                onAppendQuestions={(newQuestions) => {
                  const updated = { ...safeExam, questions: [...safeQuestions, ...newQuestions] };
                  onUpdateExam(updated);
                  showToast(`Đã thêm thành công ${newQuestions.length} câu hỏi mới từ AI!`);
                }}
                onReplaceExam={(newExam) => {
                  onUpdateExam(newExam);
                  showToast('Đã áp dụng toàn bộ đề thi mới!');
                }}
              />
            </div>
          )}

          {panel2Tab === 'json_import' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div 
                onClick={() => jsonFileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                  isParsingJson ? 'bg-indigo-50/80 border-indigo-400' : 'border-indigo-300 hover:border-indigo-500 bg-indigo-50/30'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  {isParsingJson ? <Loader2 className="w-7 h-7 animate-spin" /> : <UploadCloud className="w-7 h-7" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 block">
                    {isParsingJson ? 'Đang đọc và phân tích cấu trúc tệp JSON...' : 'Nhấp hoặc kéo thả tệp đề thi (.json) vào đây'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Tương thích hoàn toàn với cấu trúc JSON nhúng hình Base64 chuẩn GDPT 2018 (Hỗ trợ cấu trúc bọc "exam" hoặc phẳng)
                  </span>
                </div>
                <input
                  ref={jsonFileInputRef}
                  type="file"
                  accept=".json, application/json"
                  onChange={(e) => e.target.files?.[0] && handleJsonFileChange(e.target.files[0])}
                  className="hidden"
                />
              </div>

              {jsonParseError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{jsonParseError}</span>
                </div>
              )}

              {jsonParsedExam && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-3xs bg-indigo-100 text-indigo-800">
                          Mã đề: {jsonParsedExam.code}
                        </span>
                        <span className="px-2 py-0.5 rounded font-bold text-3xs bg-emerald-100 text-emerald-800">
                          {jsonParsedExam.questions.length} câu hỏi
                        </span>
                        <span className="text-3xs text-slate-500">
                          Thời gian: {jsonParsedExam.durationMinutes} phút
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mt-1">{jsonParsedExam.title}</h4>
                      {jsonParsedExam.subtitle && (
                        <p className="text-xs text-slate-500">{jsonParsedExam.subtitle}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyJsonExam}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition hover:scale-105 active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Áp dụng vào đề thi hiện tại</span>
                    </button>
                  </div>

                  {/* Danh sách các câu hỏi tóm tắt trong tệp JSON */}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {jsonParsedExam.questions.map((q: any, qIdx: number) => (
                      <div key={q.id || qIdx} className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-indigo-700">{q.title || `Câu ${qIdx + 1}`}</span>
                            <span className="px-1.5 py-0.5 rounded text-3xs bg-slate-100 text-slate-600 font-semibold">{q.part}</span>
                            {(q.diagram || q.image) && (
                              <span className="px-1.5 py-0.5 rounded text-3xs bg-amber-100 text-amber-800 font-bold">Có ảnh</span>
                            )}
                          </div>
                          <p className="text-slate-700 line-clamp-2">{q.stem || q.prompt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PANEL 3: CẤU HÌNH KỲ THI & TRỘN MÃ ĐỀ */}
      {(activePanel === 'panel3' || activePanel === 'config') && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPanel3Tab('shuffling')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                  panel3Tab === 'shuffling'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Shuffle className="w-4 h-4" />
                <span>Tab 3.1: Trộn đề tự động & Sinh ma trận đáp án</span>
              </button>

              <button
                type="button"
                onClick={() => setPanel3Tab('anticheat')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                  panel3Tab === 'anticheat'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Tab 3.2: Giám sát thi & Chống gian lận</span>
              </button>
            </div>
          </div>

          {panel3Tab === 'shuffling' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <ShufflingTab
                currentExam={safeExam}
                onApplyBundle={onApplyBundle}
                onOpenPrintMatrix={onOpenPrintMatrix}
              />
            </div>
          )}

          {panel3Tab === 'anticheat' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <AntiCheatConfigTab
                config={antiCheatConfig}
                onChangeConfig={onChangeAntiCheatConfig}
              />
            </div>
          )}
        </div>
      )}

      {/* PANEL 4: GIÁM SÁT & BẢNG ĐIỂM */}
      {(activePanel === 'panel4' || activePanel === 'monitoring') && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPanel4Tab('submissions')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                  panel4Tab === 'submissions'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Tab 4.1: Danh sách bài nộp & Nhật ký vi phạm</span>
              </button>

              <button
                type="button"
                onClick={() => setPanel4Tab('distribution')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                  panel4Tab === 'distribution'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Tab 4.2: Thống kê phổ điểm & Phân tích câu sai</span>
              </button>

              <button
                type="button"
                onClick={() => setPanel4Tab('export_report')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                  panel4Tab === 'export_report'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Tab 4.3: Xuất bảng điểm chi tiết (Excel .xlsx / CSV)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xs text-slate-500 font-bold px-3 py-1 bg-slate-50 rounded-lg">
                {submissions.length} bài nộp đã lưu
              </span>
              
              {submissions.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllSubmissions}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Xóa toàn bộ danh sách kết quả bài thi trên máy và MongoDB Atlas"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Xóa toàn bộ danh sách ({submissions.length})</span>
                </button>
              )}
            </div>
          </div>
          
          {panel4Tab === 'submissions' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
                  <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Tổng số bài thi</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{submissionStats.total}</div>
                  <div className="text-2xs text-slate-500">Đã nộp vào hệ thống</div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
                  <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Điểm trung bình</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-700">
                    {submissionStats.avgScore} <span className="text-xs text-slate-400 font-normal">/ 10đ</span>
                  </div>
                  <div className="text-2xs text-slate-500">Tỉ lệ đạt: {submissionStats.passRate}%</div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
                  <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Cảnh báo vi phạm</span>
                  </div>
                  <div className="text-2xl font-black text-rose-600">{submissionStats.violatedCount}</div>
                  <div className="text-2xs text-rose-500 font-medium">Trường hợp rời tab / cưỡng chế</div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                      <span>Xuất báo cáo</span>
                    </div>
                    <div className="text-xs text-slate-600 pt-1">Định dạng Excel .xlsx / CSV chuẩn</div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => exportGradebookToExcel(submissions, safeExam.title)}
                      disabled={submissions.length === 0}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => exportAllSubmissionsToCSV(submissions, safeExam.title)}
                      disabled={submissions.length === 0}
                      className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                      title="Xuất CSV"
                    >
                      CSV
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setSubmissionFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      submissionFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({submissions.length})
                  </button>
                  <button
                    onClick={() => setSubmissionFilter('submitted')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      submissionFilter === 'submitted'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Học sinh nộp hợp lệ
                  </button>
                  <button
                    onClick={() => setSubmissionFilter('violated')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      submissionFilter === 'violated'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Có ghi nhận vi phạm ({submissionStats.violatedCount})
                  </button>
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Tìm tên, lớp hoặc SBD..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-3xs">
                      <tr>
                        <th className="py-3 px-4">Thí sinh & Lớp</th>
                        <th className="py-3 px-4">Mã đề</th>
                        <th className="py-3 px-4">Điểm số</th>
                        <th className="py-3 px-4">Thời gian</th>
                        <th className="py-3 px-4">Tình trạng nộp bài</th>
                        <th className="py-3 px-4">Nhật ký Giám sát</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            Chưa có bài thi nào phù hợp với bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        filteredSubmissions.map((sub) => {
                          const isAutoPenalized = sub?.submissionReason === 'violation_limit_exceeded';

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{sub.studentName}</div>
                                <div className="text-3xs text-slate-500">
                                  Lớp: {sub.studentClass} • SBD: <span className="font-mono">{sub.candidateNumber}</span>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-3xs">
                                  {sub.examCode}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <div className="font-black text-sm text-indigo-700">
                                  {(sub.totalScore || 0).toFixed(2)}đ
                                </div>
                                <div className="text-3xs text-slate-400">{sub.percentage}%</div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="text-slate-700 font-medium">{sub.submittedAt}</div>
                                <div className="text-3xs text-slate-400">
                                  Làm trong: {Math.floor((sub.timeSpentSeconds || 0) / 60)}p {(sub.timeSpentSeconds || 0) % 60}s
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                {isAutoPenalized ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    Thu bài cưỡng chế
                                  </span>
                                ) : sub.submissionReason === 'time_expired' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-semibold bg-amber-100 text-amber-800">
                                    Hết giờ tự động nộp
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-semibold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Chủ động nộp bài
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4">
                                {(sub.violationCount || 0) === 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                    0 vi phạm (Tuân thủ)
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-black border ${
                                      isAutoPenalized
                                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                                        : 'bg-amber-50 text-amber-800 border-amber-300'
                                    }`}
                                  >
                                    <ShieldAlert className="w-3 h-3" />
                                    {sub.violationCount} lần rời màn hình
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                                <button
                                  onClick={() => setInspectingSubmission(sub)}
                                  className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-3xs font-bold transition cursor-pointer"
                                  title="Xem chi tiết các lần vi phạm & bài làm"
                                >
                                  Audit Log
                                </button>

                                <button
                                  onClick={() =>
                                    exportScoreReportToCSV(safeExam, sub.evaluation, {
                                      name: sub.studentName,
                                      studentClass: sub.studentClass,
                                      candidateNumber: sub.candidateNumber,
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-3xs font-semibold transition cursor-pointer"
                                  title="Tải tệp CSV cá nhân"
                                >
                                  CSV
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteSingleSubmission(sub)}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 text-3xs font-bold transition cursor-pointer border border-rose-200"
                                  title={`Xóa bài thi của thí sinh ${sub.studentName}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 inline-block" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {panel4Tab === 'distribution' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
                  <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Điểm cao nhất</span>
                  </div>
                  <div className="text-2xl font-black text-indigo-700">
                    {scoreDistributionData.maxScore.toFixed(2)}đ
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
                  <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Điểm thấp nhất</span>
                  </div>
                  <div className="text-2xl font-black text-rose-600">
                    {scoreDistributionData.minScore.toFixed(2)}đ
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
                  <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Điểm trung bình</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-700">
                    {scoreDistributionData.avgScore.toFixed(2)}đ
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
                  <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Trung vị (Median)</span>
                  </div>
                  <div className="text-2xl font-black text-blue-700">
                    {scoreDistributionData.medianScore.toFixed(2)}đ
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1 col-span-2 sm:col-span-1">
                  <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tỉ lệ đạt (≥ 5đ)</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-700">
                    {scoreDistributionData.passRate}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {panel4Tab === 'export_report' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black">Xuất Bảng Điểm Đánh Giá Năng Lực Vật Lý</h3>
                  <p className="text-xs text-slate-300 mt-1">Xuất ra tệp Excel (.xlsx) chuẩn 11 cột có phân hóa các phần thi.</p>
                </div>
                <button
                  type="button"
                  onClick={() => exportGradebookToExcel(submissions, safeExam.title)}
                  disabled={submissions.length === 0}
                  className="py-3 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          )}

          {inspectingSubmission && (
            <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
                <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                  <h4 className="font-bold text-sm">Nhật ký Giám sát: {inspectingSubmission.studentName}</h4>
                  <button onClick={() => setInspectingSubmission(null)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-3 text-xs">
                  {inspectingSubmission.auditLog?.violations?.map((v, i) => (
                    <div key={v.id || i} className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                      <span className="font-bold text-rose-900">{i + 1}. {v.reason || (v as any).description}</span>
                      <span className="font-mono text-3xs text-rose-700">{v.timestamp}</span>
                    </div>
                  )) || (
                    <div className="text-slate-400 text-center py-4">Không có nhật ký vi phạm nào.</div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* PANEL 5: TRUNG TÂM IN ẤN & XUẤT BẢN PDF */}
      {activePanel === 'panel5' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex items-center justify-between">
            <button
              onClick={() => onOpenPrint('exam_only')}
              className="px-5 py-3 rounded-2xl bg-purple-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In đề thi chuẩn A4</span>
            </button>
          </div>
        </div>
      )}

      {/* PANEL 6: QUẢN TRỊ ADMIN */}
      {(activePanel === 'panel6' || activePanel === 'admin') && (
        <UserAdminPanel initialTab={panel6Tab} onNavigateHome={onNavigateHome} />
      )}

      {/* MODAL LƯU ĐỀ VÀO NGÂN HÀNG */}
      {isSaveExamModalOpen && (
        <SaveExamToBankModal
          isOpen={isSaveExamModalOpen}
          onClose={() => setIsSaveExamModalOpen(false)}
          currentExam={safeExam}
          onSaveExamToBank={handleSavePackage}
        />
      )}

      {/* MODAL GIAO ĐỀ THI: ĐẢM BẢO TRUYỀN currentExam={safeExam} ĐỂ KHÔNG BỊ TRÙNG ĐỀ CŨ */}
      {assigningPackage && (
        <AssignExamModal
          isOpen={true}
          onClose={() => setAssigningPackage(null)}
          examPackage={assigningPackage}
          currentExam={safeExam}
          onAssign={handleConfirmAssignment}
        />
      )}

    </div>
  );
};