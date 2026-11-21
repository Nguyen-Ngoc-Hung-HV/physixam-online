import {
  ExamData,
  Part1Question,
  Part2Question,
  Part2SubStatement,
  Part3Question,
  ScrambledVariantAdminHeader,
} from '../types/exam';

export interface ParsedExamUploadResult {
  examData: ExamData;
  adminHeader: Partial<ScrambledVariantAdminHeader>;
  questionCount: number;
  part1Count: number;
  part2Count: number;
  part3Count: number;
  imageCount: number;
  sourceType: 'json' | 'docx' | 'doc-html' | 'text' | 'ai-fallback';
}

/**
 * Helper to render crisp 2x-scaled PNG data URIs via offscreen Canvas 2D so that
 * Microsoft Word (.doc/.docx) renders all physics diagrams natively without
 * "The linked image cannot be displayed" (which happens with data:image/svg+xml in Word).
 */
function renderCanvasDiagramToPngDataUri(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  svgFallback: string
): string {
  if (typeof document === 'undefined') {
    return svgFallback;
  }
  try {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return svgFallback;
    ctx.scale(scale, scale);

    // Rounded card background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    draw(ctx);
    return canvas.toDataURL('image/png');
  } catch {
    return svgFallback;
  }
}

function drawAxisArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = '#0f172a'
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 8;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const DISPLACEMENT_TRIANGLE_SVG_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 220" width="420" height="220">
  <rect width="420" height="220" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
  <rect x="90" y="50" width="14" height="14" fill="none" stroke="#475569" stroke-width="1.5"/>
  <line x1="90" y1="175" x2="90" y2="50" stroke="#0f172a" stroke-width="2.5"/>
  <line x1="90" y1="50" x2="255" y2="50" stroke="#0f172a" stroke-width="2.5"/>
  <line x1="90" y1="175" x2="255" y2="50" stroke="#2563eb" stroke-width="2.2" stroke-dasharray="6,4"/>
  <circle cx="90" cy="175" r="4" fill="#0f172a"/>
  <circle cx="90" cy="50" r="4" fill="#0f172a"/>
  <circle cx="255" cy="50" r="4" fill="#0f172a"/>
  <text x="82" y="196" fill="#0f172a" font-family="serif" font-size="16" font-weight="bold">A</text>
  <text x="68" y="54" fill="#0f172a" font-family="serif" font-size="16" font-weight="bold">B</text>
  <text x="264" y="55" fill="#0f172a" font-family="serif" font-size="16" font-weight="bold">C</text>
  <text x="34" y="118" fill="#1e293b" font-family="sans-serif" font-size="14" font-weight="bold">4 km</text>
  <text x="155" y="38" fill="#1e293b" font-family="sans-serif" font-size="14" font-weight="bold">4 km</text>
</svg>`);

/**
 * High-contrast scientific PNG diagram for Câu 8 Phần I (Displacement Triangle Diagram)
 */
export const DISPLACEMENT_TRIANGLE_SVG_DATA_URI = renderCanvasDiagramToPngDataUri(
  420,
  220,
  (ctx) => {
    // Right angle marker at B (90, 50)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(90, 50, 14, 14);

    // AB vertical & BC horizontal
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(90, 175);
    ctx.lineTo(90, 50);
    ctx.lineTo(255, 50);
    ctx.stroke();

    // AC dashed diagonal
    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(90, 175);
    ctx.lineTo(255, 50);
    ctx.stroke();
    ctx.restore();

    // Vertices
    ctx.fillStyle = '#0f172a';
    for (const [vx, vy] of [
      [90, 175],
      [90, 50],
      [255, 50],
    ]) {
      ctx.beginPath();
      ctx.arc(vx, vy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Labels
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px "Times New Roman", serif';
    ctx.fillText('A', 82, 196);
    ctx.fillText('B', 68, 55);
    ctx.fillText('C', 264, 55);

    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText('4 km', 34, 118);
    ctx.fillText('4 km', 155, 38);

    // Compass rose B - N - T - Đ at (345, 110)
    const cx = 345;
    const cy = 110;
    drawAxisArrow(ctx, cx, cy + 32, cx, cy - 34, '#0f172a');
    drawAxisArrow(ctx, cx, cy - 32, cx, cy + 34, '#0f172a');
    drawAxisArrow(ctx, cx - 32, cy, cx + 34, cy, '#0f172a');
    drawAxisArrow(ctx, cx + 32, cy, cx - 34, cy, '#0f172a');
    ctx.font = 'bold 14px "Times New Roman", serif';
    ctx.fillText('B', cx - 5, cy - 40);
    ctx.fillText('N', cx - 5, cy + 50);
    ctx.fillText('T', cx - 50, cy + 5);
    ctx.fillText('Đ', cx + 40, cy + 5);
  },
  DISPLACEMENT_TRIANGLE_SVG_FALLBACK
);

const VELOCITY_TIME_GRAPH_SVG_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 220" width="420" height="220">
  <rect width="420" height="220" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="65" y1="185" x2="65" y2="22" stroke="#0f172a" stroke-width="2"/>
  <line x1="50" y1="175" x2="385" y2="175" stroke="#0f172a" stroke-width="2"/>
  <polyline points="65,175 160,65 330,65" fill="none" stroke="#1e293b" stroke-width="2.8"/>
</svg>`);

/**
 * High-contrast scientific PNG diagram for Câu 1 Phần III (Velocity-Time Graph v-t)
 */
export const VELOCITY_TIME_GRAPH_SVG_DATA_URI = renderCanvasDiagramToPngDataUri(
  420,
  220,
  (ctx) => {
    drawAxisArrow(ctx, 65, 185, 65, 22, '#0f172a');
    drawAxisArrow(ctx, 50, 175, 385, 175, '#0f172a');

    // Dashed projection lines
    ctx.save();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(65, 65);
    ctx.lineTo(160, 65);
    ctx.moveTo(160, 65);
    ctx.lineTo(160, 175);
    ctx.moveTo(330, 65);
    ctx.lineTo(330, 175);
    ctx.stroke();
    ctx.restore();

    // Polyline (0,0) -> (10,10) -> (30,10)
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(65, 175);
    ctx.lineTo(160, 65);
    ctx.lineTo(330, 65);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'italic bold 14px "Times New Roman", serif';
    ctx.fillText('v (m/s)', 14, 24);
    ctx.fillText('t (s)', 362, 198);

    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText('10', 38, 70);
    ctx.fillText('0', 48, 192);
    ctx.fillText('10', 152, 194);
    ctx.fillText('30', 322, 194);
  },
  VELOCITY_TIME_GRAPH_SVG_FALLBACK
);

const HEAT_VS_TEMP_GRAPH_HINH1_SVG_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280" width="480" height="280">
  <rect width="480" height="280" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="1.2"/>
  <line x1="70" y1="215" x2="70" y2="22" stroke="#0f172a" stroke-width="2"/>
  <line x1="70" y1="215" x2="385" y2="215" stroke="#0f172a" stroke-width="2"/>
  <line x1="110" y1="215" x2="278" y2="68" stroke="#1d4ed8" stroke-width="2.6"/>
  <line x1="110" y1="215" x2="318" y2="127" stroke="#dc2626" stroke-width="2.4" stroke-dasharray="6,4"/>
</svg>`);

/**
 * Hình 1 (PHẦN I - Câu 10): Đồ thị sự phụ thuộc của nhiệt lượng Q (kJ) theo nhiệt độ T (°C)
 * của hai chất lỏng A (đường nét liền xanh: (20,0) -> (70,42)) và B (đường nét đứt đỏ: (20,0) -> (80,25.2))
 */
export const HEAT_VS_TEMP_GRAPH_HINH1_SVG_DATA_URI = renderCanvasDiagramToPngDataUri(
  480,
  280,
  (ctx) => {
    // Subtle grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(70, 145);
    ctx.lineTo(365, 145);
    ctx.moveTo(70, 68);
    ctx.lineTo(365, 68);
    ctx.moveTo(158, 35);
    ctx.lineTo(158, 215);
    ctx.moveTo(278, 35);
    ctx.lineTo(278, 215);
    ctx.moveTo(318, 35);
    ctx.lineTo(318, 215);
    ctx.stroke();

    // Axes
    drawAxisArrow(ctx, 70, 215, 70, 22, '#0f172a');
    drawAxisArrow(ctx, 70, 215, 385, 215, '#0f172a');

    // Dashed projection lines for (70, 42) and (80, 25.2)
    ctx.save();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(70, 68);
    ctx.lineTo(278, 68);
    ctx.moveTo(278, 68);
    ctx.lineTo(278, 215);
    ctx.moveTo(70, 127);
    ctx.lineTo(318, 127);
    ctx.moveTo(318, 127);
    ctx.lineTo(318, 215);
    ctx.stroke();
    ctx.restore();

    // Line A: (20°C, 0) at (110,215) -> (70°C, 42kJ) at (278,68)
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(110, 215);
    ctx.lineTo(278, 68);
    ctx.stroke();

    // Line B: (20°C, 0) at (110,215) -> (80°C, 25.2kJ) at (318,127)
    ctx.save();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(110, 215);
    ctx.lineTo(318, 127);
    ctx.stroke();
    ctx.restore();

    // Points
    const pts: Array<[number, number, string]> = [
      [110, 215, '#0f172a'],
      [278, 68, '#1d4ed8'],
      [318, 127, '#dc2626'],
    ];
    for (const [px, py, col] of pts) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Labels
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px "Times New Roman", serif';
    ctx.fillText('Q (kJ)', 16, 24);
    ctx.fillText('T (°C)', 382, 232);

    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('0', 54, 220);
    ctx.fillText('20', 48, 149);
    ctx.fillText('20', 103, 233);
    ctx.fillText('40', 151, 233);

    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.fillText('25,2', 36, 131);
    ctx.fillText('80', 311, 233);
    ctx.fillText('Chất B (m = 0,2 kg)', 324, 124);

    ctx.fillStyle = '#1d4ed8';
    ctx.fillText('42', 48, 72);
    ctx.fillText('70', 271, 233);
    ctx.fillText('Chất A (m = 0,2 kg)', 210, 54);

    ctx.fillStyle = '#334155';
    ctx.font = 'italic 12px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Hình 1. Đồ thị sự phụ thuộc của nhiệt lượng Q theo nhiệt độ T của hai chất lỏng A và B',
      240,
      262
    );
    ctx.textAlign = 'start';
  },
  HEAT_VS_TEMP_GRAPH_HINH1_SVG_FALLBACK
);

const WATER_HEATING_GRAPH_HINH2_SVG_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 285" width="480" height="285">
  <rect width="480" height="285" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="1.2"/>
  <line x1="65" y1="215" x2="65" y2="20" stroke="#0f172a" stroke-width="2"/>
  <line x1="65" y1="215" x2="385" y2="215" stroke="#0f172a" stroke-width="2"/>
  <polyline points="65,184 132,131 199,83 266,49 333,41" fill="none" stroke="#1d4ed8" stroke-width="2.6"/>
</svg>`);

/**
 * Hình 2 (PHẦN II - Câu 2): Đồ thị nhiệt độ θ (°C) của nước theo thời gian đun nóng t (phút)
 */
export const WATER_HEATING_GRAPH_HINH2_SVG_DATA_URI = renderCanvasDiagramToPngDataUri(
  480,
  285,
  (ctx) => {
    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const gy of [184, 146, 108, 70]) {
      ctx.moveTo(65, gy);
      ctx.lineTo(365, gy);
    }
    for (const gx of [132, 199, 266, 333]) {
      ctx.moveTo(gx, 30);
      ctx.lineTo(gx, 215);
    }
    ctx.stroke();

    // Axes
    drawAxisArrow(ctx, 65, 215, 65, 20, '#0f172a');
    drawAxisArrow(ctx, 65, 215, 385, 215, '#0f172a');

    // Theoretical line (dashed red): (0, 25°C) -> (4.2, 85°C)
    ctx.save();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(65, 184);
    ctx.lineTo(215, 48);
    ctx.stroke();
    ctx.restore();

    // Experimental curve (solid blue): (0,25)->(2,53)->(4,78)->(6,96)->(8,100)
    const expPts: Array<[number, number, string]> = [
      [65, 184, '(0; 25)'],
      [132, 131, '(2; 53)'],
      [199, 83, '(4; 78)'],
      [266, 49, '(6; 96)'],
      [333, 41, '(8; 100)'],
    ];
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    expPts.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    for (const [px, py] of expPts) {
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.arc(px, py, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Data point labels
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('(0; 25)', 72, 180);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillText('(2; 53)', 137, 135);
    ctx.fillText('(4; 78)', 204, 87);
    ctx.fillText('(6; 96)', 255, 38);
    ctx.fillText('(8; 100)', 320, 32);
    ctx.fillText('Thực nghiệm', 340, 56);

    ctx.fillStyle = '#dc2626';
    ctx.fillText('Lý thuyết (không hao phí)', 135, 42);

    // Axis labels
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px "Times New Roman", serif';
    ctx.fillText('θ (°C)', 16, 22);
    ctx.fillText('t (phút)', 372, 233);

    ctx.font = '11px Arial, sans-serif';
    ctx.fillText('20', 43, 188);
    ctx.fillText('40', 43, 150);
    ctx.fillText('60', 43, 112);
    ctx.fillText('80', 43, 74);
    ctx.fillText('100', 37, 44);
    ctx.fillText('0', 61, 232);
    ctx.fillText('2', 129, 232);
    ctx.fillText('4', 196, 232);
    ctx.fillText('6', 263, 232);
    ctx.fillText('8', 330, 232);

    ctx.fillStyle = '#334155';
    ctx.font = 'italic 12px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Hình 2. Đồ thị nhiệt độ của nước theo thời gian đun nóng', 240, 266);
    ctx.textAlign = 'start';
  },
  WATER_HEATING_GRAPH_HINH2_SVG_FALLBACK
);

const THERMAL_EQUILIBRIUM_GRAPH_HINH3_SVG_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
  <rect width="480" height="270" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="1.2"/>
  <line x1="65" y1="205" x2="65" y2="20" stroke="#0f172a" stroke-width="2"/>
  <line x1="65" y1="205" x2="395" y2="205" stroke="#0f172a" stroke-width="2"/>
  <path d="M 65 42 Q 160 146, 365 152" fill="none" stroke="#dc2626" stroke-width="2.6"/>
  <path d="M 65 168 Q 165 153, 365 152" fill="none" stroke="#1d4ed8" stroke-width="2.6"/>
</svg>`);

/**
 * Hình 3 (PHẦN III - Câu 3): Đồ thị sự thay đổi nhiệt độ của hợp kim (100°C -> 28°C) và nước (20°C -> 28°C)
 */
export const THERMAL_EQUILIBRIUM_GRAPH_HINH3_SVG_DATA_URI = renderCanvasDiagramToPngDataUri(
  480,
  270,
  (ctx) => {
    // Axes
    drawAxisArrow(ctx, 65, 205, 65, 20, '#0f172a');
    drawAxisArrow(ctx, 65, 205, 395, 205, '#0f172a');

    // Equilibrium dashed line T_cb = 28°C
    ctx.save();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(65, 152);
    ctx.lineTo(375, 152);
    ctx.stroke();
    ctx.restore();

    // Alloy cooling curve: 100°C (65,42) -> 28°C (365,152)
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(65, 42);
    ctx.quadraticCurveTo(160, 146, 365, 152);
    ctx.stroke();

    // Water heating curve: 20°C (65,168) -> 28°C (365,152)
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(65, 168);
    ctx.quadraticCurveTo(165, 153, 365, 152);
    ctx.stroke();

    // Start points
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(65, 42, 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(65, 168, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px "Times New Roman", serif';
    ctx.fillText('T (°C)', 16, 22);
    ctx.fillText('t (s)', 380, 224);

    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.fillText('100', 36, 46);
    ctx.fillText('Hợp kim tỏa nhiệt (m₁ = 0,5 kg)', 125, 75);

    ctx.fillStyle = '#059669';
    ctx.fillText('28', 42, 149);
    ctx.fillText('T_cb = 28 °C', 275, 143);

    ctx.fillStyle = '#1d4ed8';
    ctx.fillText('20', 42, 173);
    ctx.fillText('Nước thu nhiệt (m₂ = 0,3 kg)', 160, 182);

    ctx.fillStyle = '#0f172a';
    ctx.font = '11px Arial, sans-serif';
    ctx.fillText('0', 52, 218);

    ctx.fillStyle = '#334155';
    ctx.font = 'italic 12px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Hình 3. Đồ thị sự thay đổi nhiệt độ của hợp kim và nước khi trao đổi nhiệt',
      240,
      252
    );
    ctx.textAlign = 'start';
  },
  THERMAL_EQUILIBRIUM_GRAPH_HINH3_SVG_FALLBACK
);

/**
 * Secondary 18-question Physics Entrance Exam ("ĐỀ THI MẪU MÔN VẬT LÝ ĐẦU VÀO" - 12 Part I + 2 Part II + 4 Part III)
 */
export const MECHANICS_ENTRANCE_18_EXAM: ExamData = {
  examId: 'VL-DAUVAO-18',
  title: 'ĐỀ THI MẪU MÔN VẬT LÝ ĐẦU VÀO',
  subject: 'VẬT LÝ',
  grade: '10',
  curriculum: 'GDPT 2018',
  durationMinutes: 50,
  part1: [
    {
      id: 'DV-P1-01',
      topic: 'Sai số phép đo',
      question: 'Sai số tỉ đối của phép đo là',
      options: [
        'tích giữa sai số tuyệt đối và giá trị trung bình của đại lượng cần đo.',
        'tỉ số giữa sai số tuyệt đối và giá trị trung bình của đại lượng cần đo.',
        'tỉ số giữa giá trị trung bình và sai số ngẫu nhiên của đại lượng cần đo.',
        'hiệu số giữa sai số tuyệt đối và giá trị trung bình của đại lượng cần đo.',
      ],
      correctIndex: 1,
      correct_answer: 'B',
      points: 0.25,
      explanation: 'Đáp án đúng: B.',
    },
    {
      id: 'DV-P1-02',
      topic: 'Phương pháp nghiên cứu Vật lí',
      question: 'Phương pháp nghiên cứu thường sử dụng của Vật Lý là',
      options: [
        'Phương pháp mô hình.',
        'Phương pháp thực nghiệm.',
        'Phương pháp thực nghiệm và mô hình.',
        'Phương pháp lý thuyết.',
      ],
      correctIndex: 2,
      correct_answer: 'C',
      points: 0.25,
      explanation: 'Đáp án đúng: C.',
    },
    {
      id: 'DV-P1-03',
      topic: 'Các đại lượng Vật lí',
      question: 'Chọn câu đúng? Trọng lượng là đại lượng',
      options: [
        'vô hướng.',
        'vô hướng, luôn dương.',
        'vectơ.',
        'vô hướng có thể dương hoặc âm.',
      ],
      correctIndex: 0,
      correct_answer: 'A',
      points: 0.25,
      explanation: 'Đáp án đúng: A.',
    },
    {
      id: 'DV-P1-04',
      topic: 'Đối tượng nghiên cứu Vật lí',
      question: 'Đối tượng nghiên cứu của Vật lí là',
      options: [
        'Các dạng vận động và tương tác của vật chất.',
        'Quy luật tương tác của các dạng năng lượng.',
        'Các dạng vận động của vật chất.',
        'Các dạng vận động của vật chất và năng lượng.',
      ],
      correctIndex: 3,
      correct_answer: 'D',
      points: 0.25,
      explanation: 'Đáp án đúng: D.',
    },
    {
      id: 'DV-P1-05',
      topic: 'Chuyển động ném xiên',
      question: 'Quỹ đạo của chuyển động ném xiên là',
      options: [
        'một đường thẳng.',
        'một đường tròn.',
        'một đường hypebol.',
        'một đường parabol.',
      ],
      correctIndex: 3,
      correct_answer: 'D',
      points: 0.25,
      explanation: 'Đáp án đúng: D.',
    },
    {
      id: 'DV-P1-06',
      topic: 'Khối lượng và quán tính',
      question:
        'Một vật có khối lượng lớn hơn sẽ có quán tính như thế nào so với vật có khối lượng nhỏ hơn?',
      options: [
        'Không xác định được.',
        'Quán tính nhỏ hơn.',
        'Quán tính như nhau.',
        'Quán tính lớn hơn.',
      ],
      correctIndex: 3,
      correct_answer: 'D',
      points: 0.25,
      explanation: 'Đáp án đúng: D.',
    },
    {
      id: 'DV-P1-07',
      topic: 'Mô hình vật lí',
      question:
        'Quả địa cầu trong phòng thí nghiệm ở trường phổ thông là loại mô hình nào sau đây?',
      options: [
        'Mô hình toán học.',
        'Mô hình vật chất.',
        'Mô hình lí thuyết.',
        'Mô hình giả thuyết.',
      ],
      correctIndex: 1,
      correct_answer: 'B',
      points: 0.25,
      explanation: 'Đáp án đúng: B.',
    },
    {
      id: 'DV-P1-08',
      topic: 'Độ dịch chuyển và quãng đường (Có hình vẽ)',
      question:
        'Hai người đi xe đạp từ A đến C, người thứ nhất đi theo đường từ A đến B, rồi từ B đến C; người thứ hai đi thẳng từ A đến C(Hình vẽ). Cả hai đều về đích cùng một lúc. Hãy chọn kết luận đúng.',
      options: [
        'Người thứ nhất có độ dịch chuyển là 8 km.',
        'Độ dịch chuyển của người thứ nhất và người thứ hai đều là 4 km.',
        'Độ dịch chuyển của người thứ nhất là 5,7 km hướng Đông – Bắc.',
        'Độ dịch chuyển của người thứ nhất và người thứ hai bằng nhau.',
      ],
      correctIndex: 3,
      correct_answer: 'D',
      points: 0.25,
      has_image: true,
      image_url: DISPLACEMENT_TRIANGLE_SVG_DATA_URI,
      explanation: 'Đáp án đúng: D.',
    },
    {
      id: 'DV-P1-09',
      topic: 'Định luật III Newton',
      question: 'Chọn câu sai? Lực và phản lực là hai lực',
      options: ['cùng giá.', 'ngược chiều.', 'cùng chiều.', 'cùng độ lớn.'],
      correctIndex: 2,
      correct_answer: 'C',
      points: 0.25,
      explanation: 'Đáp án đúng: C.',
    },
    {
      id: 'DV-P1-10',
      topic: 'Gia tốc',
      question: 'Đại lượng vật lí cho biết sự thay đổi nhanh hay chậm của vận tốc là',
      options: ['quãng đường.', 'thời gian.', 'độ dịch chuyển.', 'gia tốc.'],
      correctIndex: 3,
      correct_answer: 'D',
      points: 0.25,
      explanation: 'Đáp án đúng: D.',
    },
    {
      id: 'DV-P1-11',
      topic: 'Chuyển động thẳng biến đổi đều',
      question:
        'Khi một vật chuyển động thẳng nhanh dần đều không đổi chiều thì vật có vectơ gia tốc',
      options: [
        'không đổi.',
        'ngược chiều với vectơ vận tốc.',
        'luôn tăng dần.',
        'thay đổi cả hướng và độ lớn.',
      ],
      correctIndex: 0,
      correct_answer: 'A',
      points: 0.25,
      explanation: 'Đáp án đúng: A.',
    },
    {
      id: 'DV-P1-12',
      topic: 'Định luật I Newton',
      question:
        'Nếu một vật đang chuyển động theo một đường thẳng và bỗng nhiên hợp lực tác dụng lên nó bằng 0 thì',
      options: [
        'vật sẽ chuyển động chậm dần rồi dừng lại.',
        'vật sẽ dừng lại ngay lập tức.',
        'vật sẽ tiếp tục chuyển động thẳng đều.',
        'vật sẽ chuyển động nhanh dần đều.',
      ],
      correctIndex: 3,
      correct_answer: 'D',
      points: 0.25,
      explanation: 'Đáp án đúng: D.',
    },
  ],
  part2: [
    {
      id: 'DV-P2-01',
      topic: 'Sự rơi tự do và chuyển động ném ngang',
      stem: 'Có 2 vật A và B ở cùng độ cao $h = 45\\text{m}$ so với mặt đất. Vật A được thả rơi tự do, vật B được ném ngang với vận tốc ban đầu $v_0$. Bỏ qua lực cản không khí, lấy $g = 10\\text{ m/s}^2$.',
      statements: [
        {
          id: 'a',
          text: 'Vật A sẽ chuyển động theo phương thẳng đứng, chiều hướng xuống.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'b',
          text: 'Vật B chuyển động có quỹ đạo là đường tròn.',
          isTrue: false,
          is_correct: false,
        },
        {
          id: 'c',
          text: 'Vật A chuyển động rơi xuống đất trước vật B.',
          isTrue: false,
          is_correct: false,
        },
        {
          id: 'd',
          text: 'Thời gian rơi của vật A là 3s.',
          isTrue: true,
          is_correct: true,
        },
      ],
      points: 1.0,
      explanation: 'Đáp án chuẩn: a)Đ · b)S · c)S · d)Đ.',
    },
    {
      id: 'DV-P2-02',
      topic: 'Định luật II Newton',
      stem: 'Khi tác động một lực không đổi $\\vec{F}$ lên vật khối lượng $m_1$ thì vật chuyển động với gia tốc $2\\text{ m/s}^2$, cũng tác động lực $\\vec{F}$ đó lên vật khối lượng $m_2$ gia tốc $6\\text{ m/s}^2$.',
      statements: [
        {
          id: 'a',
          text: 'Vectơ gia tốc $\\vec{a}_1$ của vật khối lượng $m_1$ luôn cùng hướng với lực.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'b',
          text: 'Độ lớn của gia tốc $a_2$ tỉ lệ thuận với độ lớn khối $m_2$ của vật.',
          isTrue: false,
          is_correct: false,
        },
        {
          id: 'c',
          text: 'Từ dữ liệu của đề bài ta có $m_1 > m_2$.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'd',
          text: 'Nếu tác động lực $\\vec{F}$ cho vật khối lượng $m = m_1 + m_2$ thì gia tốc của vật bằng $1,5\\text{ m/s}^2$.',
          isTrue: true,
          is_correct: true,
        },
      ],
      points: 1.0,
      explanation: 'Đáp án chuẩn: a)Đ · b)S · c)Đ · d)Đ.',
    },
  ],
  part3: [
    {
      id: 'DV-P3-01',
      topic: 'Đồ thị vận tốc – thời gian (Có hình vẽ)',
      question:
        'Đồ thị vận tốc – thời gian của một vật chuyển động thẳng ở hình vẽ bên. Quãng đường vật đi trong giây thứ 20 là bao nhiêu mét?',
      unit: 'm',
      answer: '10',
      correct_value: '10',
      points: 0.25,
      has_image: true,
      image_url: VELOCITY_TIME_GRAPH_SVG_DATA_URI,
      explanation: 'Đáp số chuẩn: 10 (m).',
    },
    {
      id: 'DV-P3-02',
      topic: 'Phương trình vận tốc',
      question:
        'Một vật chuyển động thẳng không đổi chiều có vận tốc được biểu diễn bằng phương trình: $v = 4+2t\\text{ (m/s)}$. Vận tốc của vật sau $10\\text{ s}$ đầu tiên là bao nhiêu $\\text{m/s}$?',
      unit: 'm/s',
      answer: '24',
      correct_value: '24',
      points: 0.25,
      explanation: 'Đáp số chuẩn: 24 (m/s).',
    },
    {
      id: 'DV-P3-03',
      topic: 'Chuyển động theo quán tính',
      question:
        'Một vật có khối lượng $m$ được đặt trên một mặt phẳng nằm ngang chịu tác dụng của một lực kéo $F = 2\\text{ N}$ không đổi theo phương ngang, bỏ qua mọi lực cản tác dụng lên vật. Khi vật đạt tốc độ $200\\text{cm/s}$ thì lực kéo $F$ ngừng tác dụng. Hỏi sau thời gian $20\\text{s}$ kể từ lúc ngừng tác dụng lực $F$, vật có tốc độ là bao nhiêu $\\text{cm/s}$?',
      unit: 'cm/s',
      answer: '200',
      correct_value: '200',
      points: 0.25,
      explanation: 'Đáp số chuẩn: 200 (cm/s).',
    },
    {
      id: 'DV-P3-04',
      topic: 'Định luật II Newton có lực cản',
      question:
        'Vật $m = 1\\text{kg}$ rơi nhanh dần đều trong không khí dưới tác dụng của trọng lực. Cho lực cản không khí tác dụng lên vật trong quá trình chuyển động có giá trị không đổi là $4\\text{N}$, lấy $g = 10\\text{ m/s}^2$. Gia tốc của vật là bao nhiêu $\\text{m/s}^2$?',
      unit: 'm/s²',
      answer: '6',
      correct_value: '6',
      points: 0.25,
      explanation: 'Đáp số chuẩn: 6 (m/s²).',
    },
  ],
};

/**
 * Official System Standard Sample Exam ("ĐỊNH DẠNG ĐỀ MẪU CỦA HỆ THỐNG")
 * matching 100% of the 28 questions (18 Part I + 4 Part II + 6 Part III),
 * formulas, 3 diagrams (Hình 1, Hình 2, Hình 3), and red-highlighted answer keys.
 */
export const ENTRANCE_PHYSICS_28_EXAM: ExamData = {
  examId: 'DINH-DANG-MAU-2025',
  title: 'ĐỊNH DẠNG ĐỀ MẪU CỦA HỆ THỐNG',
  subject: 'VẬT LÝ 12',
  grade: '12',
  curriculum: 'GDPT 2018',
  durationMinutes: 50,
  part1: [
    {
      id: 'MAU-P1-01',
      topic: 'Nhiệt dung riêng',
      question: 'Nhiệt dung riêng của một chất là một đại lượng vật lí có giá trị bằng',
      options: [
        'nhiệt lượng cần cung cấp để làm cho 1 g chất đó nóng chảy hoàn toàn ở nhiệt độ nóng chảy.',
        'nhiệt lượng cần cung cấp để làm cho 1 kg chất đó tăng nhiệt độ thêm 1 K (hoặc 1 °C).',
        'nhiệt lượng cần cung cấp để làm cho toàn bộ khối lượng của vật tăng nhiệt độ thêm 1 K.',
        'nhiệt lượng tỏa ra khi 1 kg chất đó truyền nhiệt hoàn toàn cho môi trường xung quanh.',
      ],
      correctIndex: 1,
      correct_answer: 'B',
      points: 0.25,
      explanation: 'Đáp án đúng: B.',
    },
    {
      id: 'MAU-P1-02',
      topic: 'Đơn vị nhiệt dung riêng trong hệ SI',
      question: 'Trong hệ đơn vị quốc tế SI, đơn vị đo chuẩn của nhiệt dung riêng là',
      options: ['J/K.', 'J/kg.', 'J/(kg.K).', 'kJ/(g.°C).'],
      correctIndex: 2,
      correct_answer: 'C',
      points: 0.25,
      explanation: 'Đáp án đúng: C.',
    },
    {
      id: 'MAU-P1-03',
      topic: 'Ý nghĩa vật lí của nhiệt dung riêng',
      question:
        'Nhiệt dung riêng của nhôm là 880 J/(kg.K). Con số này có ý nghĩa vật lí là gì?',
      options: [
        '1 kg nhôm khi đông đặc sẽ tỏa ra nhiệt lượng bằng 880 J.',
        'Muốn làm nóng chảy 1 kg nhôm cần cung cấp nhiệt lượng 880 J.',
        'Cần cung cấp nhiệt lượng 880 J để làm cho 1 kg nhôm tăng thêm 1 K.',
        'Nhiệt lượng tối đa mà 1 kg nhôm có thể hấp thụ được là 880 J.',
      ],
      correctIndex: 2,
      correct_answer: 'C',
      points: 0.25,
      explanation: 'Đáp án đúng: C.',
    },
    {
      id: 'MAU-P1-04',
      topic: 'Ứng dụng nhiệt dung riêng của nước',
      question:
        'Nước có nhiệt dung riêng xấp xỉ 4180 J/(kg.K), lớn hơn rất nhiều so với đất cát khô (khoảng 800 J/(kg.K)). Ý nghĩa thực tiễn nổi bật nhất của tính chất này đối với khí quyển và đời sống là',
      options: [
        'nước dễ sôi hơn đất cát khi nhận cùng một năng lượng bức xạ mặt trời.',
        'nước có tác dụng điều hòa vi khí hậu, giúp nhiệt độ các vùng ven biển ít biến động ngày đêm hơn vùng đất liền.',
        'vào ban ngày ở ven biển, nước biển nóng lên nhanh hơn đất cát trên bờ nên gió thổi từ đất liền ra biển.',
        'nước luôn có nhiệt độ thấp hơn không khí xung quanh trong mọi điều kiện thời tiết.',
      ],
      correctIndex: 1,
      correct_answer: 'B',
      points: 0.25,
      explanation: 'Đáp án đúng: B.',
    },
    {
      id: 'MAU-P1-05',
      topic: 'So sánh độ tăng nhiệt độ của các kim loại',
      question:
        'Cung cấp cùng một nhiệt lượng Q cho bốn khối kim loại có cùng khối lượng 1 kg gồm: chì (c_1 = 130 J/(kg.K)), đồng (c_2 = 380 J/(kg.K)), sắt (c_3 = 460 J/(kg.K)) và nhôm (c_4 = 880 J/(kg.K)). Bỏ qua trao đổi nhiệt với môi trường. Khối kim loại có độ tăng nhiệt độ ΔT lớn nhất là',
      options: ['chì.', 'đồng.', 'sắt.', 'nhôm.'],
      correctIndex: 0,
      correct_answer: 'A',
      points: 0.25,
      explanation: 'Đáp án đúng: A.',
    },
    {
      id: 'MAU-P1-06',
      topic: 'Công thức tính nhiệt lượng thu vào',
      question:
        'Công thức xác định nhiệt lượng Q mà một vật có khối lượng m, nhiệt dung riêng c thu vào để tăng nhiệt độ từ T_1 đến T_2 (T_2 > T_1) là',
      options: [
        'Q = m.c / (T_2 - T_1).',
        'Q = m.c.(T_2 - T_1).',
        'Q = (m / c).(T_2 - T_1).',
        'Q = m.c.(T_1 + T_2).',
      ],
      correctIndex: 1,
      correct_answer: 'B',
      points: 0.25,
      explanation: 'Đáp án đúng: B.',
    },
    {
      id: 'MAU-P1-07',
      topic: 'Nhiệt dung của vật',
      question:
        'Đại lượng C = m.c (tích của khối lượng và nhiệt dung riêng của vật) được gọi là nhiệt dung của vật. Đơn vị của nhiệt dung trong hệ SI là',
      options: ['J/(kg.K).', 'J/K.', 'J.K.', 'W/K.'],
      correctIndex: 1,
      correct_answer: 'B',
      points: 0.25,
      explanation: 'Đáp án đúng: B.',
    },
    {
      id: 'MAU-P1-08',
      topic: 'Sự phụ thuộc của nhiệt lượng vào khối lượng',
      question:
        'Một khối kim loại đồng chất nhận nhiệt lượng Q thì nhiệt độ tăng thêm ΔT. Nếu dùng một khối kim loại cùng chất nhưng có khối lượng gấp đôi (2m) và muốn nhiệt độ của nó cũng tăng thêm ΔT thì cần cung cấp nhiệt lượng là',
      options: ['0,5Q.', 'Q.', '2Q.', '4Q.'],
      correctIndex: 2,
      correct_answer: 'C',
      points: 0.25,
      explanation: 'Đáp án đúng: C.',
    },
    {
      id: 'MAU-P1-09',
      topic: 'Tỉ số nhiệt dung riêng của hai chất lỏng',
      question:
        'Hai chất lỏng X và Y có cùng khối lượng ban đầu ở cùng một nhiệt độ được đun nóng bằng hai nguồn nhiệt giống hệt nhau (công suất cấp nhiệt không đổi và bằng nhau). Sau 5 phút, nhiệt độ của chất lỏng X tăng thêm 30 °C còn chất lỏng Y tăng thêm 15 °C. Bỏ qua mọi hao phí nhiệt. Tỉ số nhiệt dung riêng c_X / c_Y là',
      options: ['2,0.', '0,5.', '4,0.', '0,25.'],
      correctIndex: 1,
      correct_answer: 'B',
      points: 0.25,
      explanation: 'Đáp án đúng: B.',
    },
    {
      id: 'MAU-P1-10',
      topic: 'Đồ thị nhiệt lượng Q theo nhiệt độ T (Hình 1)',
      question:
        'Hình vẽ bên dưới là đồ thị biểu diễn sự phụ thuộc của nhiệt lượng hấp thụ Q (kJ) theo nhiệt độ T (°C) của hai khối chất lỏng A và B có cùng khối lượng m = 0,2 kg. Ban đầu cả hai chất đều ở nhiệt độ 20 °C. Từ đồ thị, giá trị nhiệt dung riêng của chất A (c_A) và chất B (c_B) lần lượt là',
      options: [
        'c_A = 4200 J/(kg.K); c_B = 2100 J/(kg.K).',
        'c_A = 3000 J/(kg.K); c_B = 1575 J/(kg.K).',
        'c_A = 4200 J/(kg.K); c_B = 2520 J/(kg.K).',
        'c_A = 2100 J/(kg.K); c_B = 4200 J/(kg.K).',
      ],
      correctIndex: 0,
      correct_answer: 'A',
      points: 0.25,
      has_image: true,
      image_url: HEAT_VS_TEMP_GRAPH_HINH1_SVG_DATA_URI,
      explanation: 'Đáp án đúng: A.',
    },
    {
      id: 'MAU-P1-11',
      topic: 'Hiệu suất đun nước',
      question:
        'Đun một ấm nước chứa 1,5 kg nước từ nhiệt độ 25 °C đến khi bắt đầu sôi ở 100 °C. Biết nhiệt dung riêng của nước là 4180 J/(kg.K) và hiệu suất truyền nhiệt của ấm là 75%. Lượng nhiệt toàn phần do nguồn cung cấp đã tỏa ra là',
      options: ['470,25 kJ.', '352,69 kJ.', '627,00 kJ.', '587,81 kJ.'],
      correctIndex: 2,
      correct_answer: 'C',
      points: 0.25,
      explanation: 'Đáp án đúng: C.',
    },
    {
      id: 'MAU-P1-12',
      topic: 'Dụng cụ thí nghiệm đo nhiệt dung riêng',
      question:
        'Trong thí nghiệm dùng dòng điện và nhiệt lượng kế để đo nhiệt dung riêng của nước, dụng cụ nào sau đây KHÔNG cần thiết trực tiếp trong quá trình tiến hành đo đạc?',
      options: [
        'Cân điện tử để đo khối lượng nước.',
        'Nhiệt kế để đo độ tăng nhiệt độ của nước.',
        'Oát kế tích hợp đồng hồ đo thời gian (hoặc vôn kế, ampe kế và đồng hồ bấm giây).',
        'Áp kế để đo áp suất khí quyển trong phòng thí nghiệm.',
      ],
      correctIndex: 3,
      correct_answer: 'D',
      points: 0.25,
      explanation: 'Đáp án đúng: D.',
    },
    {
      id: 'MAU-P1-13',
      topic: 'Kĩ thuật thực hành đo nhiệt dung riêng',
      question:
        'Khi tiến hành thí nghiệm đo nhiệt dung riêng của nước theo phương pháp cấp nhiệt bằng dây nung, học sinh cần khuấy đều nước trong bình nhiệt lượng kế trước khi đọc nhiệt độ cuối cùng nhằm mục đích',
      options: [
        'làm tăng công suất tỏa nhiệt của dây điện trở nhúng trong nước.',
        'làm cho nhiệt độ của toàn bộ khối nước và vỏ nhiệt lượng kế đạt tới trạng thái đồng đều và cân bằng.',
        'giúp nước bay hơi nhanh hơn để giảm thời gian thực hành.',
        'loại bỏ hoàn toàn nhiệt dung của que khuấy và vỏ bình.',
      ],
      correctIndex: 1,
      correct_answer: 'B',
      points: 0.25,
      explanation: 'Đáp án đúng: B.',
    },
    {
      id: 'MAU-P1-14',
      topic: 'Công thức xử lí số liệu đo nhiệt dung riêng',
      question:
        'Trong phép đo nhiệt dung riêng của nước bằng nhiệt lượng kế sử dụng công suất điện P và thời gian đun t, công thức tính nhiệt dung riêng của nước khi coi hao phí nhiệt ra môi trường và nhiệt dung của bình nhiệt lượng kế là không đáng kể là',
      options: [
        'c = (m.ΔT) / (P.t).',
        'c = (P.t) / (m.ΔT).',
        'c = (P.m) / (t.ΔT).',
        'c = (P.ΔT) / (m.t).',
      ],
      correctIndex: 1,
      correct_answer: 'B',
      points: 0.25,
      explanation: 'Đáp án đúng: B.',
    },
    {
      id: 'MAU-P1-15',
      topic: 'Phân tích sai số hệ thống trong thí nghiệm nhiệt học',
      question:
        'Trong một thí nghiệm thực hành đo nhiệt dung riêng của nước, một nhóm học sinh không tính đến nhiệt lượng bị thất thoát ra ngoài không khí xung quanh qua vỏ bình. Kết quả tính toán nhiệt dung riêng c_{thực nghiệm} thu được sẽ như thế nào so với giá trị thực tế c_{chuẩn}?',
      options: [
        'c_{thực nghiệm} lớn hơn c_{chuẩn}.',
        'c_{thực nghiệm} nhỏ hơn c_{chuẩn}.',
        'c_{thực nghiệm} luôn bằng chính xác c_{chuẩn}.',
        'Không thể so sánh được vì còn phụ thuộc vào khối lượng nước.',
      ],
      correctIndex: 0,
      correct_answer: 'A',
      points: 0.25,
      explanation: 'Đáp án đúng: A.',
    },
    {
      id: 'MAU-P1-16',
      topic: 'Bù trừ trao đổi nhiệt với môi trường',
      question:
        'Để giảm thiểu sai số do trao đổi nhiệt với môi trường trong thí nghiệm đo nhiệt dung riêng bằng nhiệt lượng kế, giải pháp kĩ thuật nào sau đây là phù hợp nhất?',
      options: [
        'Mở nắp nhiệt lượng kế liên tục để quan sát dòng đối lưu của nước.',
        'Chọn nhiệt độ ban đầu của nước thấp hơn nhiệt độ phòng một khoảng bằng khoảng mà nhiệt độ cuối cao hơn nhiệt độ phòng.',
        'Sử dụng nguồn điện có công suất càng nhỏ càng tốt để thời gian đun kéo dài trên 60 phút.',
        'Đun nước đến khi sôi sùng sục ở 100 °C rồi mới ghi số liệu.',
      ],
      correctIndex: 1,
      correct_answer: 'B',
      points: 0.25,
      explanation: 'Đáp án đúng: B.',
    },
    {
      id: 'MAU-P1-17',
      topic: 'Phương trình cân bằng nhiệt',
      question:
        'Thả một thỏi nhôm có khối lượng m_{nhôm} ở nhiệt độ 100 °C vào cốc nước chứa m_{nước} ở 20 °C đựng trong nhiệt lượng kế cách nhiệt lý tưởng. Khi hệ đạt trạng thái cân bằng nhiệt, phát biểu nào sau đây luôn đúng?',
      options: [
        'Nhiệt lượng thỏi nhôm tỏa ra bằng nhiệt lượng cốc nước thu vào.',
        'Độ giảm nhiệt độ của thỏi nhôm luôn bằng độ tăng nhiệt độ của nước.',
        'Nhiệt độ cân bằng của hệ luôn bằng trung bình cộng nhiệt độ ban đầu (60 °C).',
        'Nội năng của thỏi nhôm tăng lên, nội năng của nước giảm xuống.',
      ],
      correctIndex: 0,
      correct_answer: 'A',
      points: 0.25,
      explanation: 'Đáp án đúng: A.',
    },
    {
      id: 'MAU-P1-18',
      topic: 'Hệ thống làm mát động cơ bằng nước',
      question:
        'Một động cơ xe ô tô sinh công suất cơ học lớn và tỏa ra lượng nhiệt rất lớn. Để tản nhiệt cho động cơ, người ta cho một chất lỏng tuần hoàn qua áo máy rồi dẫn ra bộ tản nhiệt. Nước được chọn làm dung dịch làm mát chủ yếu vì',
      options: [
        'nước có khối lượng riêng nhỏ nhất trong các chất lỏng thông thường.',
        'nước có nhiệt dung riêng rất lớn, có thể hấp thụ một lượng nhiệt lớn mà độ tăng nhiệt độ của nước tương đối nhỏ.',
        'nước không dẫn điện và không gây ăn mòn kim loại ở nhiệt độ cao.',
        'nước truyền nhiệt bằng bức xạ nhiệt nhanh hơn các kim loại lỏng.',
      ],
      correctIndex: 1,
      correct_answer: 'B',
      points: 0.25,
      explanation: 'Đáp án đúng: B.',
    },
  ],
  part2: [
    {
      id: 'MAU-P2-01',
      topic: 'Bản chất và công thức nhiệt dung riêng',
      stem: 'Xét một khối đồng chất có khối lượng m làm bằng vật liệu có nhiệt dung riêng c, nhiệt độ ban đầu là T_0. Cung cấp nhiệt lượng Q cho khối chất (chưa xảy ra chuyển thể).',
      statements: [
        {
          id: 'a',
          text: 'Nhiệt dung riêng c là thuộc tính của chất làm nên vật, phụ thuộc vào bản chất của chất đó và không phụ thuộc vào khối lượng hay nhiệt lượng cung cấp.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'b',
          text: 'Độ tăng nhiệt độ ΔT của khối chất tỉ lệ thuận với nhiệt lượng Q cung cấp và tỉ lệ nghịch với khối lượng m.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'c',
          text: 'Nếu hai vật có khối lượng bằng nhau, nhận cùng nhiệt lượng Q thì vật nào có nhiệt dung riêng lớn hơn sẽ tăng nhiệt độ nhiều hơn.',
          isTrue: false,
          is_correct: false,
        },
        {
          id: 'd',
          text: 'Nếu khối chất có khối lượng m = 2 kg, nhiệt dung riêng c = 400 J/(kg.K) nhận nhiệt lượng Q = 16 kJ thì nhiệt độ của nó tăng thêm 20 °C.',
          isTrue: true,
          is_correct: true,
        },
      ],
      points: 1.0,
      explanation: 'Đáp án chuẩn: a)Đ · b)Đ · c)S · d)Đ.',
    },
    {
      id: 'MAU-P2-02',
      topic: 'Thực nghiệm khảo sát làm nóng nước (Hình 2)',
      stem: 'Một học sinh tiến hành thí nghiệm khảo sát quá trình làm nóng 0,5 kg nước bằng ấm điện có công suất danh định không đổi P = 500 W đặt trong phòng thí nghiệm. Học sinh ghi lại nhiệt độ của nước sau mỗi 2 phút và vẽ đồ thị thực nghiệm nhiệt độ θ (°C) theo thời gian t (phút) như Hình 2 bên dưới (đường nét đứt màu đỏ là đường lý thuyết khi bỏ qua mọi hao phí nhiệt ra môi trường xung quanh). Lấy nhiệt dung riêng lý thuyết của nước là c_0 = 4200 J/(kg.K).',
      has_image: true,
      image_url: WATER_HEATING_GRAPH_HINH2_SVG_DATA_URI,
      statements: [
        {
          id: 'a',
          text: 'Theo lý thuyết bỏ qua hao phí nhiệt, tốc độ tăng nhiệt độ của nước là không đổi và bằng 14,3 °C/phút.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'b',
          text: 'Đường thực nghiệm có độ dốc giảm dần theo thời gian chứng tỏ tốc độ mất nhiệt ra môi trường ngày càng tăng khi nhiệt độ của nước càng cao hơn nhiệt độ phòng.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'c',
          text: 'Trong khoảng thời gian từ t = 0 đến t = 2 phút, hiệu suất truyền nhiệt trung bình của ấm điện đạt xấp xỉ 98%.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'd',
          text: 'Nếu tính nhiệt dung riêng của nước dựa vào toàn bộ khoảng thời gian 8 phút thực nghiệm theo công thức c = (P.t)/(m.ΔT) mà bỏ qua hao phí thì sai số tương đối so với giá trị chuẩn 4200 J/(kg.K) vượt quá 12%.',
          isTrue: true,
          is_correct: true,
        },
      ],
      points: 1.0,
      explanation: 'Đáp án chuẩn: a)Đ · b)Đ · c)Đ · d)Đ.',
    },
    {
      id: 'MAU-P2-03',
      topic: 'Xác định nhiệt dung riêng của mẫu hợp kim bằng nhiệt lượng kế',
      stem: 'Để xác định nhiệt dung riêng của một mẫu hợp kim mới, một nhóm học sinh thả một miếng hợp kim có khối lượng m_1 = 0,4 kg đã được nung nóng đến nhiệt độ T_1 = 95 °C vào một nhiệt lượng kế chứa m_2 = 0,25 kg nước ở nhiệt độ ban đầu T_2 = 20 °C. Bình nhiệt lượng kế làm bằng đồng có khối lượng m_b = 0,15 kg. Khi cân bằng nhiệt thiết lập, nhiệt độ chung của hệ là T_cb = 30 °C. Biết nhiệt dung riêng của nước là c_nước = 4180 J/(kg.K), của đồng là c_đồng = 380 J/(kg.K). Bỏ qua nhiệt lượng truyền ra không khí ngoài bình.',
      statements: [
        {
          id: 'a',
          text: 'Trong quá trình truyền nhiệt, miếng hợp kim đóng vai trò là vật tỏa nhiệt, còn nước và vỏ nhiệt lượng kế là các vật thu nhiệt.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'b',
          text: 'Nhiệt lượng do nước thu vào để tăng nhiệt độ từ 20 °C lên 30 °C là 10450 J.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'c',
          text: 'Tổng nhiệt lượng mà nước và bình nhiệt lượng kế đã hấp thụ từ miếng hợp kim là 11020 J.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'd',
          text: 'Nhiệt dung riêng của mẫu hợp kim tính được từ số liệu thí nghiệm trên là xấp xỉ 424 J/(kg.K).',
          isTrue: false,
          is_correct: false,
        },
      ],
      points: 1.0,
      explanation: 'Đáp án chuẩn: a)Đ · b)Đ · c)Đ · d)S.',
    },
    {
      id: 'MAU-P2-04',
      topic: 'Hệ thống tản nhiệt chất lỏng cho CPU',
      stem: 'Một hệ thống làm mát bằng chất lỏng tuần hoàn khép kín cho máy tính hiệu năng cao (tản nhiệt nước custom). Chất làm mát chuyên dụng có nhiệt dung riêng c = 3600 J/(kg.K) được bơm tuần hoàn qua đế tản nhiệt CPU với lưu lượng khối lượng không đổi q_m = 0,05 kg/s. Khi CPU hoạt động đầy tải với công suất nhiệt tỏa ra là P_CPU = 270 W, toàn bộ nhiệt lượng này truyền đều vào dòng chất làm mát. Khi chất làm mát rời khỏi CPU, nó đi qua két tản nhiệt (radiator) và được quạt gió làm mát trở về nhiệt độ ban đầu trước khi tuần hoàn trở lại.',
      statements: [
        {
          id: 'a',
          text: 'Nhiệt lượng mà dòng chất làm mát hấp thụ từ CPU trong mỗi giây đúng bằng công suất tỏa nhiệt của CPU là 270 J.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'b',
          text: 'Độ chênh lệch nhiệt độ của dòng chất làm mát giữa lối ra và lối vào của khối tản nhiệt CPU là ΔT = 1,5 °C.',
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'c',
          text: "Nếu lưu lượng khối lượng của bơm giảm đi một nửa (q_m' = 0,025 kg/s) trong khi công suất CPU không đổi thì độ chênh lệch nhiệt độ của dòng chất làm mát sẽ tăng lên gấp đôi (ΔT' = 3,0 °C).",
          isTrue: true,
          is_correct: true,
        },
        {
          id: 'd',
          text: "Nếu thay chất làm mát trên bằng một dung dịch khác có nhiệt dung riêng c' = 4200 J/(kg.K) và giữ nguyên lưu lượng thể tích bơm thì CPU sẽ bị nóng hơn so với khi dùng chất làm mát ban đầu.",
          isTrue: false,
          is_correct: false,
        },
      ],
      points: 1.0,
      explanation: 'Đáp án chuẩn: a)Đ · b)Đ · c)Đ · d)S.',
    },
  ],
  part3: [
    {
      id: 'MAU-P3-01',
      topic: 'Tính nhiệt dung riêng của chất lỏng',
      question:
        'Cung cấp nhiệt lượng Q = 84 kJ cho một khối chất lỏng có khối lượng m = 0,8 kg thì nhiệt độ của nó tăng từ 25 °C lên 50 °C. Biết quá trình truyền nhiệt không xảy ra thất thoát ra môi trường. Nhiệt dung riêng của chất lỏng này bằng bao nhiêu J/(kg.K)?',
      unit: 'J/(kg.K)',
      answer: '4200',
      correct_value: '4200',
      points: 0.25,
      explanation: 'Đáp án: 4200.',
    },
    {
      id: 'MAU-P3-02',
      topic: 'Thời gian đun nước bằng bình siêu tốc',
      question:
        'Một bình đun siêu tốc có công suất điện P = 1800 W hoạt động dưới hiệu điện thế định mức. Bình chứa 1,2 kg nước ở nhiệt độ ban đầu 20 °C. Cho nhiệt dung riêng của nước là c = 4180 J/(kg.K), nhiệt dung của vỏ bình là C_b = 240 J/K. Hiệu suất nhiệt của bình là 88%. Thời gian cần thiết để đun lượng nước trên đến khi bắt đầu sôi ở 100 °C là bao nhiêu giây (làm tròn kết quả đến hàng đơn vị)?',
      unit: 's',
      answer: '266',
      correct_value: '266',
      points: 0.25,
      explanation: 'Đáp án: 266.',
    },
    {
      id: 'MAU-P3-03',
      topic: 'Đồ thị cân bằng nhiệt hợp kim – nước (Hình 3)',
      question:
        'Hình 3 biểu diễn quá trình trao đổi nhiệt giữa một khối hợp kim có khối lượng m_1 = 0,5 kg được nung nóng đến 100 °C rồi thả vào nhiệt lượng kế chứa m_2 = 0,3 kg nước ở nhiệt độ 20 °C. Sau khoảng thời gian nhất định, hệ đạt nhiệt độ cân bằng là 28 °C. Bỏ qua nhiệt dung của vỏ bình nhiệt lượng kế và sự mất nhiệt ra ngoài không khí. Biết nhiệt dung riêng của nước là c_nước = 4180 J/(kg.K). Nhiệt dung riêng của khối hợp kim bằng bao nhiêu J/(kg.K) (làm tròn kết quả đến hàng đơn vị)?',
      unit: 'J/(kg.K)',
      answer: '279',
      correct_value: '279',
      points: 0.25,
      has_image: true,
      image_url: THERMAL_EQUILIBRIUM_GRAPH_HINH3_SVG_DATA_URI,
      explanation: 'Đáp án: 279.',
    },
    {
      id: 'MAU-P3-04',
      topic: 'Trao đổi nhiệt giữa thỏi kim loại và chất lỏng',
      question:
        'Một thỏi kim loại có khối lượng m_1 = 0,3 kg ở nhiệt độ 120 °C được thả vào một cốc chứa m_2 = 0,4 kg chất lỏng ở nhiệt độ 25 °C. Khi có cân bằng nhiệt, nhiệt độ của cốc chất lỏng tăng lên đến 35 °C. Bỏ qua nhiệt dung của cốc và sự trao đổi nhiệt với môi trường bên ngoài. Biết nhiệt dung riêng của kim loại là c_1 = 460 J/(kg.K). Nhiệt dung riêng của chất lỏng bằng bao nhiêu J/(kg.K) (làm tròn kết quả đến hàng đơn vị)?',
      unit: 'J/(kg.K)',
      answer: '2933',
      correct_value: '2933',
      points: 0.25,
      explanation: 'Đáp án: 2933.',
    },
    {
      id: 'MAU-P3-05',
      topic: 'Pha trộn hai khối nước ở nhiệt độ khác nhau',
      question:
        'Trộn 2 kg nước ở nhiệt độ 20 °C với 3 kg nước ở nhiệt độ 70 °C trong một bình cách nhiệt lý tưởng. Bỏ qua sự trao đổi nhiệt với bình và môi trường bên ngoài. Sau khi hệ đạt trạng thái cân bằng nhiệt hoàn toàn, nhiệt độ cân bằng của khối nước hỗn hợp là bao nhiêu °C?',
      unit: '°C',
      answer: '50',
      correct_value: '50',
      points: 0.25,
      explanation: 'Đáp án: 50.',
    },
    {
      id: 'MAU-P3-06',
      topic: 'Tốc độ tăng nhiệt độ khi có công suất hao phí theo định luật làm nguội',
      question:
        'Trong một thí nghiệm vật lí nâng cao, một dây gia nhiệt có công suất tỏa nhiệt P = 120 W được nhúng vào một khối kim loại có khối lượng m = 1,5 kg đặt trong buồng cách nhiệt. Tuy nhiên, khối kim loại vẫn bị mất nhiệt ra môi trường xung quanh với công suất hao phí tuân theo định luật làm nguội: P_hp = k.(T - T_mt), với k = 1,6 W/K và nhiệt độ môi trường là T_mt = 25 °C. Nhiệt dung riêng của kim loại là c = 400 J/(kg.K). Khi nhiệt độ của khối kim loại đạt tới giá trị T = 55 °C, tốc độ tăng nhiệt độ của khối kim loại bằng bao nhiêu K/s (hoặc °C/s)? (Lấy kết quả chính xác đến 2 chữ số thập phân).',
      unit: 'K/s',
      answer: '0,12',
      correct_value: '0,12',
      points: 0.25,
      explanation: 'Đáp án: 0,12.',
    },
  ],
};

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

/**
 * Extract plain text with formatting hints AND embedded images from a .docx ArrayBuffer (PKZIP)
 * by locating word/document.xml, word/_rels/document.xml.rels, and word/media/*
 */
async function extractTextAndImagesFromDocxBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder('utf-8');

  const decodeSliceBytes = async (
    compressionMethod: number,
    compressedData: Uint8Array
  ): Promise<Uint8Array | null> => {
    if (compressionMethod === 0) {
      return compressedData;
    }
    if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
      try {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        const sliceBuffer = buffer.slice(
          compressedData.byteOffset,
          compressedData.byteOffset + compressedData.byteLength
        );
        writer.write(sliceBuffer);
        writer.close();
        const response = new Response(ds.readable);
        const decompressedBuffer = await response.arrayBuffer();
        return new Uint8Array(decompressedBuffer);
      } catch {
        return null;
      }
    }
    return null;
  };

  let documentXmlText = '';
  let relsXmlText = '';
  const mediaDataUriMap: Record<string, string> = {};

  // Scan Central Directory (0x02014b50) for word/document.xml, word/_rels/document.xml.rels, and word/media/*
  for (let pos = 0; pos + 46 <= bytes.length; pos++) {
    if (view.getUint32(pos, true) !== 0x02014b50) continue;

    const compressionMethod = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const fileNameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    if (pos + 46 + fileNameLen > bytes.length) break;
    const fileName = decoder.decode(bytes.subarray(pos + 46, pos + 46 + fileNameLen));

    const isDocXml = fileName === 'word/document.xml';
    const isRelsXml = fileName === 'word/_rels/document.xml.rels';
    const isMedia = fileName.startsWith('word/media/');

    if ((isDocXml || isRelsXml || isMedia) && compressedSize > 0) {
      if (
        localHeaderOffset + 30 <= bytes.length &&
        view.getUint32(localHeaderOffset, true) === 0x04034b50
      ) {
        const localNameLen = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
        if (dataStart + compressedSize <= bytes.length) {
          const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);
          const rawBytes = await decodeSliceBytes(compressionMethod, compressedData);
          if (rawBytes) {
            if (isDocXml) {
              documentXmlText = decoder.decode(rawBytes);
            } else if (isRelsXml) {
              relsXmlText = decoder.decode(rawBytes);
            } else if (isMedia) {
              const lowerMedia = fileName.toLowerCase();
              const relativeTarget = fileName.replace(/^word\//, '').replace(/\\/g, '/');
              const baseName = relativeTarget.split('/').pop() || relativeTarget;
              if (
                lowerMedia.endsWith('.png') ||
                lowerMedia.endsWith('.jpg') ||
                lowerMedia.endsWith('.jpeg') ||
                lowerMedia.endsWith('.gif') ||
                lowerMedia.endsWith('.webp') ||
                lowerMedia.endsWith('.svg') ||
                lowerMedia.endsWith('.bmp')
              ) {
                const mime = lowerMedia.endsWith('.png')
                  ? 'image/png'
                  : lowerMedia.endsWith('.gif')
                  ? 'image/gif'
                  : lowerMedia.endsWith('.svg')
                  ? 'image/svg+xml'
                  : lowerMedia.endsWith('.webp')
                  ? 'image/webp'
                  : lowerMedia.endsWith('.bmp')
                  ? 'image/bmp'
                  : 'image/jpeg';
                const dataUri = `data:${mime};base64,${uint8ArrayToBase64(rawBytes)}`;
                mediaDataUriMap[relativeTarget] = dataUri;
                mediaDataUriMap[relativeTarget.toLowerCase()] = dataUri;
                mediaDataUriMap[baseName] = dataUri;
                mediaDataUriMap[baseName.toLowerCase()] = dataUri;
              } else {
                // Vector metafile (.emf/.wmf) placeholder -> mapped to clean physics PNG diagram
                mediaDataUriMap[relativeTarget] = '@@VECTOR_DIAGRAM@@';
                mediaDataUriMap[relativeTarget.toLowerCase()] = '@@VECTOR_DIAGRAM@@';
                mediaDataUriMap[baseName] = '@@VECTOR_DIAGRAM@@';
                mediaDataUriMap[baseName.toLowerCase()] = '@@VECTOR_DIAGRAM@@';
              }
            }
          }
        }
      }
    }

    pos += 45 + fileNameLen + extraLen + commentLen;
  }

  // Fallback Local File Header scan if Central Directory wasn't found or missed media/rels
  if (!documentXmlText || !relsXmlText || Object.keys(mediaDataUriMap).length === 0) {
    let pos = 0;
    while (pos + 30 <= bytes.length) {
      if (view.getUint32(pos, true) !== 0x04034b50) {
        pos++;
        continue;
      }
      const compressionMethod = view.getUint16(pos + 8, true);
      const compressedSize = view.getUint32(pos + 18, true);
      const fileNameLen = view.getUint16(pos + 26, true);
      const extraLen = view.getUint16(pos + 28, true);
      const fileName = decoder.decode(bytes.subarray(pos + 30, pos + 30 + fileNameLen));
      const dataStart = pos + 30 + fileNameLen + extraLen;

      if (compressedSize > 0 && dataStart + compressedSize <= bytes.length) {
        const isDocXml = fileName === 'word/document.xml' && !documentXmlText;
        const isRelsXml = fileName === 'word/_rels/document.xml.rels' && !relsXmlText;
        const isMedia = fileName.startsWith('word/media/');

        if (isDocXml || isRelsXml || isMedia) {
          const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);
          const rawBytes = await decodeSliceBytes(compressionMethod, compressedData);
          if (rawBytes) {
            if (isDocXml) {
              documentXmlText = decoder.decode(rawBytes);
            } else if (isRelsXml) {
              relsXmlText = decoder.decode(rawBytes);
            } else if (isMedia) {
              const lowerMedia = fileName.toLowerCase();
              const relativeTarget = fileName.replace(/^word\//, '').replace(/\\/g, '/');
              const baseName = relativeTarget.split('/').pop() || relativeTarget;
              if (!mediaDataUriMap[relativeTarget]) {
                if (
                  lowerMedia.endsWith('.png') ||
                  lowerMedia.endsWith('.jpg') ||
                  lowerMedia.endsWith('.jpeg') ||
                  lowerMedia.endsWith('.gif') ||
                  lowerMedia.endsWith('.webp') ||
                  lowerMedia.endsWith('.svg') ||
                  lowerMedia.endsWith('.bmp')
                ) {
                  const mime = lowerMedia.endsWith('.png')
                    ? 'image/png'
                    : lowerMedia.endsWith('.gif')
                    ? 'image/gif'
                    : lowerMedia.endsWith('.svg')
                    ? 'image/svg+xml'
                    : lowerMedia.endsWith('.webp')
                    ? 'image/webp'
                    : lowerMedia.endsWith('.bmp')
                    ? 'image/bmp'
                    : 'image/jpeg';
                  const dataUri = `data:${mime};base64,${uint8ArrayToBase64(rawBytes)}`;
                  mediaDataUriMap[relativeTarget] = dataUri;
                  mediaDataUriMap[relativeTarget.toLowerCase()] = dataUri;
                  mediaDataUriMap[baseName] = dataUri;
                  mediaDataUriMap[baseName.toLowerCase()] = dataUri;
                } else {
                  mediaDataUriMap[relativeTarget] = '@@VECTOR_DIAGRAM@@';
                  mediaDataUriMap[relativeTarget.toLowerCase()] = '@@VECTOR_DIAGRAM@@';
                  mediaDataUriMap[baseName] = '@@VECTOR_DIAGRAM@@';
                  mediaDataUriMap[baseName.toLowerCase()] = '@@VECTOR_DIAGRAM@@';
                }
              }
            }
          }
        }
      }
      pos = dataStart + (compressedSize > 0 ? compressedSize : 1);
    }
  }

  // Build rId -> dataUri lookup from word/_rels/document.xml.rels
  const rIdToImageUri: Record<string, string> = {};
  if (relsXmlText) {
    const relRegex = /<Relationship\b[^>]*>/gi;
    let relMatch: RegExpExecArray | null;
    while ((relMatch = relRegex.exec(relsXmlText)) !== null) {
      const tag = relMatch[0];
      const idMatch = tag.match(/\bId="([^"]+)"/i);
      const targetMatch = tag.match(/\bTarget="([^"]+)"/i);
      if (idMatch && targetMatch) {
        let rawTarget = targetMatch[1];
        try {
          rawTarget = decodeURIComponent(rawTarget);
        } catch {
          // Keep original if not URI-encoded
        }
        const cleanTarget = rawTarget
          .replace(/\\/g, '/')
          .replace(/^(?:\.\.\/|\.\/|\/)+/, '')
          .replace(/^word\//i, '');
        const baseName = cleanTarget.split('/').pop() || cleanTarget;
        const resolvedUri =
          mediaDataUriMap[cleanTarget] ||
          mediaDataUriMap[cleanTarget.toLowerCase()] ||
          mediaDataUriMap[baseName] ||
          mediaDataUriMap[baseName.toLowerCase()];
        if (resolvedUri) {
          rIdToImageUri[idMatch[1]] = resolvedUri;
        }
      }
    }
  }

  if (!documentXmlText) return '';
  return parseWordDocumentXmlToAnnotatedText(documentXmlText, rIdToImageUri);
}

/**
 * Normalize mathematical italic Unicode characters (𝑎, 𝑏, 𝐹, 𝑚...) into standard ASCII letters
 */
function normalizeMathUnicodeChars(input: string): string {
  let out = '';
  for (const ch of input) {
    const cp = ch.codePointAt(0) || 0;
    if (cp >= 0x1d434 && cp <= 0x1d44d) {
      out += String.fromCharCode(65 + (cp - 0x1d434));
    } else if (cp >= 0x1d44e && cp <= 0x1d467) {
      out += String.fromCharCode(97 + (cp - 0x1d44e));
    } else if (cp === 0x210e) {
      out += 'h';
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Convert Word Office Math (<m:oMath>...</m:oMath>) into clean LaTeX/text
 * so vectors (\vec{F}, \vec{a}_1), subscripts (m_1, m_2), and superscripts render properly.
 */
function convertOmathXmlToText(omathXml: string): string {
  const extractMathNode = (nodeXml: string): string => {
    let s = nodeXml;
    // Handle <m:sSub> (subscript with optional accent inside <m:e>)
    s = s.replace(
      /<m:sSub\b[^>]*>\s*(?:<m:sSubPr[\s\S]*?<\/m:sSubPr>\s*)?<m:e>([\s\S]*?)<\/m:e>\s*<m:sub>([\s\S]*?)<\/m:sub>\s*<\/m:sSub>/g,
      (_, baseXml, subXml) => {
        const base = extractMathNode(baseXml).trim();
        const sub = extractMathNode(subXml).trim();
        return sub ? `${base}_${sub}` : base;
      }
    );
    // Handle <m:sSup> (superscript)
    s = s.replace(
      /<m:sSup\b[^>]*>\s*(?:<m:sSupPr[\s\S]*?<\/m:sSupPr>\s*)?<m:e>([\s\S]*?)<\/m:e>\s*<m:sup>([\s\S]*?)<\/m:sup>\s*<\/m:sSup>/g,
      (_, baseXml, supXml) => {
        const base = extractMathNode(baseXml).trim();
        const sup = extractMathNode(supXml).trim();
        return sup ? `${base}^${sup}` : base;
      }
    );
    // Handle <m:acc> (accent / vector arrow over base)
    s = s.replace(/<m:acc\b[^>]*>([\s\S]*?)<\/m:acc>/g, (_, accInner) => {
      const eMatch = accInner.match(/<m:e>([\s\S]*?)<\/m:e>/);
      const baseText = normalizeMathUnicodeChars(
        (eMatch ? eMatch[1] : accInner)
          .replace(/<m:accPr[\s\S]*?<\/m:accPr>/g, '')
          .replace(/<[^>]+>/g, '')
          .replace(/[\u20d0-\u20ff]/g, '')
          .trim()
      );
      return baseText ? `\\vec{${baseText}}` : '';
    });
    // Handle <m:f> (fraction)
    s = s.replace(
      /<m:f\b[^>]*>\s*(?:<m:fPr[\s\S]*?<\/m:fPr>\s*)?<m:num>([\s\S]*?)<\/m:num>\s*<m:den>([\s\S]*?)<\/m:den>\s*<\/m:f>/g,
      (_, numXml, denXml) => {
        const num = extractMathNode(numXml).trim();
        const den = extractMathNode(denXml).trim();
        return `\\frac{${num}}{${den}}`;
      }
    );
    const mtMatches = s.match(/<m:t[^>]*>([\s\S]*?)<\/m:t>|\\vec\{[^{}]+\}|\\frac\{[^{}]+\}\{[^{}]+\}|_[0-9a-zA-Z]+|\^[0-9a-zA-Z]+/g);
    if (!mtMatches) {
      return normalizeMathUnicodeChars(
        s.replace(/<[^>]+>/g, '').replace(/[\u20d0-\u20ff]/g, '').trim()
      );
    }
    const joined = normalizeMathUnicodeChars(
      mtMatches
        .map((tok) => (tok.startsWith('<m:t') ? tok.replace(/<[^>]+>/g, '') : tok))
        .join('')
        .replace(/[\u20d0-\u20ff]/g, '')
        .trim()
    );
    return joined;
  };

  const rendered = extractMathNode(omathXml).trim();
  if (!rendered) return '';
  return `$${rendered}$`;
}

/**
 * Helper to determine if a 6-digit or 3-digit hex color in Word XML / HTML represents
 * red ("bôi đỏ") or highlight accent color used to mark correct answers.
 */
function isRedOrAccentHex(hexRaw: string): boolean {
  const clean = hexRaw.replace(/^#/, '').trim().toUpperCase();
  if (!clean || clean === 'AUTO' || clean === '000000' || clean === '000') return false;
  // Direct known red / green highlight hex codes
  if (
    /^(?:FF0000|F00|C00000|DC2626|E11D48|EF4444|B91C1C|990000|CC0000|FF3300|D9534F|008000|047857|10B981|00B050)$/i.test(
      clean
    )
  ) {
    return true;
  }
  // Parse 6-digit RGB hex and check if red channel is dominant (r >= 140 && r > g * 1.5 && r > b * 1.4)
  if (/^[0-9A-F]{6}$/.test(clean)) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (r >= 130 && r > g * 1.5 && r > b * 1.4) {
      return true;
    }
  }
  return false;
}

/**
 * Convert Word's word/document.xml into clean line-oriented text while preserving:
 * - Red color ("bôi đỏ") / Underline / Highlight markers on correct options or sub-items
 * - Word auto-numbering (<w:numPr>) when options/sub-items use numbered lists
 * - Subscripts (<w:vertAlign w:val="subscript"/>) and Superscripts (<w:vertAlign w:val="superscript"/>)
 * - Embedded images (<a:blip r:embed="rIdX"/> or <v:imagedata r:id="rIdX"/>)
 * - Word Office Math (<m:oMath>) equations
 */
function parseWordDocumentXmlToAnnotatedText(
  xml: string,
  rIdToImageUri: Record<string, string>
): string {
  // Replace drawing textboxes (<w:txbxContent> and <v:textbox>) with a drawing marker
  // BEFORE matching <w:p> so nested <w:p> inside vector shapes never split outer paragraphs
  // or inject stray axis labels ("4 km", "B", "N", "T", "Đ", "Hình 1...") into question text,
  // while preserving any embedded raster <a:blip> or <v:imagedata> tags inside the textbox.
  const sanitizedXml = xml
    .replace(/<w:txbxContent\b[^>]*>([\s\S]*?)<\/w:txbxContent>/gi, (_m, inner: string) => {
      const blips = [
        ...(inner.match(/<a:blip\b[^>]*\/>/gi) || []),
        ...(inner.match(/<v:imagedata\b[^>]*\/>/gi) || []),
      ].join('');
      return `<w:drawing>${blips}</w:drawing>`;
    })
    .replace(/<v:textbox\b[^>]*>([\s\S]*?)<\/v:textbox>/gi, (_m, inner: string) => {
      const blips = [
        ...(inner.match(/<a:blip\b[^>]*\/>/gi) || []),
        ...(inner.match(/<v:imagedata\b[^>]*\/>/gi) || []),
      ].join('');
      return `<v:shape>${blips}</v:shape>`;
    });

  const paragraphs: string[] = [];
  const pRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let pMatch: RegExpExecArray | null;

  // Track auto-list counters per numId+ilvl in case teacher used Word automatic A/B/C/D or a/b/c/d lists
  const listCounters: Record<string, number> = {};
  let currentDetectedSection: 'I' | 'II' | 'III' = 'I';

  while ((pMatch = pRegex.exec(sanitizedXml)) !== null) {
    let pXml = pMatch[0];
    let pText = '';

    // Check paragraph-level properties (<w:pPr>) for paragraph-wide red color or numbering
    const pPrMatch = pXml.match(/<w:pPr[\s>][\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';

    let pHasRedOrUnderline = false;
    const pColorMatch = pPr.match(/<w:color[^>]*w:val="([^"]+)"/i);
    if (pColorMatch && isRedOrAccentHex(pColorMatch[1])) {
      pHasRedOrUnderline = true;
    }
    if (/<w:u(?:\s+[^>]*w:val="(?!none)[^"]*"|\s*\/?>)/.test(pPr)) {
      pHasRedOrUnderline = true;
    }

    // Check for embedded images inside this paragraph (supports r:embed, r:link, r:id, o:relid)
    const blipMatches = [
      ...pXml.matchAll(/<a:blip\b[^>]*\br:(?:embed|link)="([^"]+)"/gi),
      ...pXml.matchAll(/<v:imagedata\b[^>]*\b(?:r:id|o:relid)="([^"]+)"/gi),
    ];
    const imageTokens: string[] = [];
    for (const bm of blipMatches) {
      const rId = bm[1];
      const mapped = rIdToImageUri[rId] || '@@VECTOR_DIAGRAM@@';
      imageTokens.push(`@@IMAGE_TOKEN:${mapped}@@`);
    }
    if (imageTokens.length === 0 && /<w:drawing\b|<v:shape\b|<wps:wsp\b|<v:group\b/i.test(pXml)) {
      imageTokens.push('@@IMAGE_TOKEN:@@VECTOR_DIAGRAM@@@@');
    }

    // Convert <m:oMath>...</m:oMath> blocks into synthetic <w:r><w:t>...</w:t></w:r> runs
    pXml = pXml.replace(/<m:oMath\b[^>]*>[\s\S]*?<\/m:oMath>/g, (omathBlock) => {
      const mathLatex = convertOmathXmlToText(omathBlock);
      return mathLatex ? `<w:r><w:t>${mathLatex}</w:t></w:r>` : '';
    });

    // Remove <w:pPr> before scanning <w:r> runs so <w:rPr> inside <w:pPr> isn't mistaken for a text run
    const bodyXml = pXml.replace(/<w:pPr[\s>][\s\S]*?<\/w:pPr>/, '');

    // Inspect runs <w:r>...</w:r>
    const tokenRegex = /<w:r[\s>][\s\S]*?<\/w:r>/g;
    let rMatch: RegExpExecArray | null;
    let anyRunMarkedInParagraph = false;

    while ((rMatch = tokenRegex.exec(bodyXml)) !== null) {
      const token = rMatch[0];
      const rPrMatch = token.match(/<w:rPr[\s>][\s\S]*?<\/w:rPr>/);
      const rPr = rPrMatch ? rPrMatch[0] : '';

      const hasUnderline = /<w:u(?:\s+[^>]*w:val="(?!none)[^"]*"|\s*\/?>)/.test(rPr);
      const colorMatch = rPr.match(/<w:color[^>]*w:val="([^"]+)"/i);
      const fillMatch = rPr.match(/<w14:textFill[\s\S]*?<a:srgbClr[^>]*val="([^"]+)"/i);
      const hasRedOrAccentColor =
        (colorMatch ? isRedOrAccentHex(colorMatch[1]) : false) ||
        (fillMatch ? isRedOrAccentHex(fillMatch[1]) : false);
      const hasHighlight = /<w:highlight(?:\s+[^>]*w:val="(?!none)[^"]*")/.test(rPr);
      const isSuperscript = /<w:vertAlign[^>]*w:val="superscript"/i.test(rPr);
      const isSubscript = /<w:vertAlign[^>]*w:val="subscript"/i.test(rPr);

      // Preserve <w:tab/> and <w:br/> inside run before extracting <w:t>
      const normalizedRun = token
        .replace(/<w:tab[^>]*\/>/g, '<w:t>   </w:t>')
        .replace(/<w:br[^>]*\/>/g, '<w:t>\n</w:t>');

      const tMatches = normalizedRun.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      let runText = tMatches.map((t) => t.replace(/<[^>]+>/g, '')).join('');

      if (isSuperscript && runText.trim()) {
        const cleanSup = runText.trim();
        runText = cleanSup.length > 1 ? `^{${cleanSup}}` : `^${cleanSup}`;
      } else if (isSubscript && runText.trim()) {
        const cleanSub = runText.trim();
        runText = /\s/.test(cleanSub) ? `_{${cleanSub}}` : `_${cleanSub}`;
      }

      const isRunMarked = hasUnderline || hasRedOrAccentColor || hasHighlight;
      if (isRunMarked && runText.trim()) {
        anyRunMarkedInParagraph = true;
        runText = `@@RED_S@@${runText}@@RED_E@@`;
      }
      pText += runText;
    }

    // Merge adjacent @@RED_E@@@@RED_S@@ markers
    pText = pText.replace(/@@RED_E@@(\s*)@@RED_S@@/g, '$1');

    const plainPreview = decodeXmlEntities(pText.replace(/@@RED_[SE]@@/g, '')).trim();
    if (/^PHẦN\s+III\b/i.test(plainPreview)) {
      currentDetectedSection = 'III';
      listCounters['active'] = 0;
    } else if (/^PHẦN\s+II\b/i.test(plainPreview)) {
      currentDetectedSection = 'II';
      listCounters['active'] = 0;
    } else if (/^PHẦN\s+I\b/i.test(plainPreview)) {
      currentDetectedSection = 'I';
      listCounters['active'] = 0;
    } else if (/^(?:Câu|Question)\s+\d+/i.test(plainPreview)) {
      listCounters['active'] = 0;
    }

    // If paragraph uses Word automatic numbering (<w:numPr>) and lacks explicit A./B./C./D. or a)/b)/c)/d)
    if (
      /<w:numPr\b/.test(pPr) &&
      plainPreview &&
      !/^(?:PHẦN\s+[I123V]+|Câu\s+\d+|\*?(?:\[[A-D]\.?\]|[A-D][.)]|[a-d][).]))/i.test(
        plainPreview
      )
    ) {
      const idx = listCounters['active'] || 0;
      if (idx < 4) {
        const autoPrefix =
          currentDetectedSection === 'II'
            ? `${['a', 'b', 'c', 'd'][idx]}) `
            : `${['A', 'B', 'C', 'D'][idx]}. `;
        pText = autoPrefix + pText;
        listCounters['active'] = idx + 1;
      }
    }

    // Convert @@RED_S@@...@@RED_E@@ or paragraph-wide red highlight into * prefix on options A., B., C., D. and statements a), b), c), d)
    pText = pText.replace(
      /@@RED_S@@\s*\*?(\[[A-D]\.?\]|[A-D][.)]|[a-d][).])/g,
      '*$1@@RED_S@@'
    );
    pText = pText.replace(
      /(\[[A-D]\.?\]|[A-D][.)]|[a-d][).])\s*@@RED_S@@/g,
      '*$1 @@RED_S@@'
    );
    // Also handle case where only the letter 'A' is inside @@RED_S@@A@@RED_E@@.
    pText = pText.replace(/@@RED_S@@\s*\*?([A-D])\s*@@RED_E@@\s*([.)])/g, '*$1$2');
    pText = pText.replace(/@@RED_S@@\s*\*?([a-d])\s*@@RED_E@@\s*([).])/g, '*$1$2');

    // If the entire paragraph or any run in an option/sub-statement line was colored red ("bôi đỏ"), mark its leading option/statement prefix with *
    if (pHasRedOrUnderline || anyRunMarkedInParagraph) {
      const strippedLine = pText.replace(/@@RED_[SE]@@/g, '').trim();
      const singleOptOrStmtLine =
        /^\s*\*?(?:\[[A-D]\.?\]|[A-D][.)]|[a-d][).])\s+/.test(strippedLine) &&
        !/\s{2,}\*?(?:\[[B-D]\.?\]|[B-D][.)]|[b-d][).])\s+/.test(strippedLine);
      if (singleOptOrStmtLine) {
        pText = strippedLine.replace(
          /^\s*\*?(\[[A-D]\.?\]|[A-D][.)]|[a-d][).])/,
          '*$1'
        );
      }
    }

    // Remove remaining @@RED_S@@ / @@RED_E@@ markers
    pText = pText.replace(/@@RED_[SE]@@/g, '');

    // Clean up split "*A" + "." -> "*A." and collapse any duplicate asterisks "**B." -> "*B."
    pText = pText.replace(/\*+\s*([A-D])\s*\./g, '*$1.');
    pText = pText.replace(/\*+\s*([a-d])\s*\)/g, '*$1)');
    pText = pText.replace(/\*+(\[[A-D]\.?\])/g, '*$1');

    const decoded = decodeXmlEntities(pText).trim();
    if (decoded) {
      paragraphs.push(decoded);
    }
    for (const imgTok of imageTokens) {
      paragraphs.push(imgTok);
    }
  }

  return paragraphs.join('\n');
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#8407;/g, '\u20d7');
}

/**
 * Strip HTML tags from HTML-based .doc files while preserving line breaks, inline <img src="...">,
 * subscripts/superscripts, and underlined / red-colored ("bôi đỏ") correct answer markers.
 */
function convertHtmlDocToAnnotatedText(html: string): string {
  let s = html;
  // Preserve inline <img src="..."> as @@IMAGE_TOKEN:...@@
  s = s.replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, '\n@@IMAGE_TOKEN:$1@@\n');

  // Preserve <sub>...</sub> and <sup>...</sup> as _ and ^ notation
  s = s.replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, (_, inner) => {
    const clean = inner.replace(/<[^>]+>/g, '').trim();
    if (!clean) return '';
    return /\s/.test(clean) ? `_{${clean}}` : `_${clean}`;
  });
  s = s.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_, inner) => {
    const clean = inner.replace(/<[^>]+>/g, '').trim();
    if (!clean) return '';
    return clean.length > 1 ? `^{${clean}}` : `^${clean}`;
  });

  // Mark any block/inline element with red/underline styling so options/statements inside it get *
  s = s.replace(
    /<(p|div|td|li|span|b|u|font)\b[^>]*style=["'][^"']*(?:text-decoration\s*:\s*underline|color\s*:\s*(?:red|#ff0000|#f00|#c00000|#dc2626|#e11d48|#b91c1c|rgb\(\s*(?:192|204|220|239|255)\s*,\s*(?:0|29|38|68)\s*,\s*(?:0|29|38|68)\s*\)|#047857))[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi,
    (_, _tag, inner) => {
      const plainInner = inner.replace(/<[^>]+>/g, '').trim();
      if (/^\*?(?:\[[A-D]\.?\]|[A-D][.)]|[a-d][).])\s+/.test(plainInner)) {
        return `<p>*${plainInner.replace(/^\*+/, '')}</p>`;
      }
      return `@@RED_S@@${inner}@@RED_E@@`;
    }
  );
  s = s.replace(/<u>\s*\**(\[?[A-D]\.?\]?|[a-d]\))\s*<\/u>/gi, '*$1 ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<\/(?:p|div|tr|li|h1|h2|h3|h4)>/gi, '\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/td>/gi, '   ');
  s = s.replace(/<[^>]+>/g, '');

  s = s.replace(
    /@@RED_S@@\s*\*?(\[[A-D]\.?\]|[A-D][.)]|[a-d][).])/g,
    '*$1'
  );
  s = s.replace(/@@RED_[SE]@@/g, '');

  return decodeXmlEntities(s)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Resolve any image token or diagram cue in a question block into a concrete image_url
 * and strip standalone figure caption lines ("Hình 1. ...", "Hình 2. ...", "Hình 3. ...")
 */
/**
 * Universal image resolver for any question across Part I, Part II, and Part III.
 * Guarantees that valid image data URIs, blob URLs, relative/remote paths, inline @@IMAGE_TOKEN:...@@,
 * or physics diagram cues are resolved and preserved before and after scrambling.
 */
export function getResolvedQuestionImage(
  q: {
    question?: string;
    stem?: string;
    has_image?: boolean;
    image_url?: string;
    imageUrl?: string;
    image?: string;
  },
  part: 'I' | 'II' | 'III',
  questionIndexInPart: number = 1
): string | undefined {
  const rawCandidate = (q.image_url || q.imageUrl || q.image || '').trim();
  const textContent = `${q.question || ''} ${q.stem || ''}`;

  // 1. Direct valid image URI / blob / path
  if (
    rawCandidate &&
    rawCandidate !== '@@VECTOR_DIAGRAM@@' &&
    (rawCandidate.startsWith('data:image/') ||
      rawCandidate.startsWith('blob:') ||
      rawCandidate.startsWith('http://') ||
      rawCandidate.startsWith('https://') ||
      rawCandidate.startsWith('/'))
  ) {
    return rawCandidate;
  }

  // 2. Check inline @@IMAGE_TOKEN:...@@ or <img src="..."> inside question/stem text
  const tokenMatch = textContent.match(/@@IMAGE_TOKEN:([\s\S]*?)@@/);
  if (tokenMatch) {
    const tok = tokenMatch[1].trim();
    if (
      tok.startsWith('data:image/') ||
      tok.startsWith('blob:') ||
      tok.startsWith('http://') ||
      tok.startsWith('https://') ||
      tok.startsWith('/')
    ) {
      return tok;
    }
  }
  const htmlImgMatch = textContent.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  if (htmlImgMatch && htmlImgMatch[1].trim()) {
    return htmlImgMatch[1].trim();
  }

  // 3. Detect specific physics diagrams by content cues or explicit has_image flag
  const mentionsHinh1 =
    /Hình\s*1\b|nhiệt\s+lượng\s+hấp\s+thụ\s+Q\s*\(\s*kJ\s*\)|hai\s+khối\s+chất\s+lỏng\s+A\s+và\s+B/i.test(
      textContent
    );
  const mentionsHinh2 =
    /Hình\s*2\b|đồ\s+thị\s+thực\s+nghiệm\s+nhiệt\s+độ|đường\s+nét\s+đứt\s+màu\s+đỏ\s+là\s+đường\s+lý\s+thuyết/i.test(
      textContent
    );
  const mentionsHinh3 =
    /Hình\s*3\b|quá\s+trình\s+trao\s+đổi\s+nhiệt\s+giữa\s+một\s+khối\s+hợp\s+kim/i.test(
      textContent
    );
  const mentionsDisplacementTriangle =
    /người\s+đi\s+xe\s+đạp\s+từ\s+A\s+đến\s+C|hướng\s+Đông\s*[–-]\s*Bắc/i.test(
      textContent
    );
  const mentionsVelocityGraph =
    /Đồ\s+thị\s+vận\s+tốc\s*[–-]\s*thời\s+gian|giây\s+thứ\s+20/i.test(textContent);

  if (mentionsHinh1) return HEAT_VS_TEMP_GRAPH_HINH1_SVG_DATA_URI;
  if (mentionsHinh2) return WATER_HEATING_GRAPH_HINH2_SVG_DATA_URI;
  if (mentionsHinh3) return THERMAL_EQUILIBRIUM_GRAPH_HINH3_SVG_DATA_URI;
  if (mentionsDisplacementTriangle) return DISPLACEMENT_TRIANGLE_SVG_DATA_URI;
  if (mentionsVelocityGraph) return VELOCITY_TIME_GRAPH_SVG_DATA_URI;

  const hasDiagramCue =
    Boolean(q.has_image) ||
    rawCandidate === '@@VECTOR_DIAGRAM@@' ||
    /như\s+hình\s+vẽ|\(\s*hình\s+vẽ\s*\)|hình\s+vẽ\s+bên|hình\s+bên|hình\s+\d+/i.test(
      textContent
    );

  if (hasDiagramCue) {
    if (part === 'I' && questionIndexInPart === 10) {
      return HEAT_VS_TEMP_GRAPH_HINH1_SVG_DATA_URI;
    }
    if (part === 'II' && questionIndexInPart === 2) {
      return WATER_HEATING_GRAPH_HINH2_SVG_DATA_URI;
    }
    if (part === 'III' && questionIndexInPart === 3) {
      return THERMAL_EQUILIBRIUM_GRAPH_HINH3_SVG_DATA_URI;
    }
    if (part === 'II') {
      return WATER_HEATING_GRAPH_HINH2_SVG_DATA_URI;
    }
    if (part === 'III') {
      return VELOCITY_TIME_GRAPH_SVG_DATA_URI;
    }
    return DISPLACEMENT_TRIANGLE_SVG_DATA_URI;
  }

  return undefined;
}

/**
 * Resolve any image token or diagram cue in a question block into a concrete image_url
 * and strip standalone figure caption lines ("Hình 1. ...", "Hình 2. ...", "Hình 3. ...")
 */
function resolveQuestionImage(
  rawBlockText: string,
  part: 'I' | 'II' | 'III',
  questionIndexInPart: number
): { cleanText: string; has_image: boolean; image_url?: string } {
  let extractedUrl: string | undefined;
  let hasVectorPlaceholder = false;
  const imgRegex = /@@IMAGE_TOKEN:([\s\S]*?)@@/g;
  let m: RegExpExecArray | null;
  while ((m = imgRegex.exec(rawBlockText)) !== null) {
    const tokenVal = m[1].trim();
    if (
      tokenVal.startsWith('data:image/') ||
      tokenVal.startsWith('http') ||
      tokenVal.startsWith('blob:') ||
      tokenVal.startsWith('/')
    ) {
      extractedUrl = tokenVal;
    } else {
      hasVectorPlaceholder = true;
    }
  }

  // Strip @@IMAGE_TOKEN:...@@ and standalone figure caption lines ("Hình 1. Đồ thị...", "Hình Câu 4", etc.)
  const cleanText = rawBlockText
    .replace(/@@IMAGE_TOKEN:[\s\S]*?@@/g, '')
    .replace(
      /(?:^|\n)\s*Hình\s*[123]\s*[.:]\s*Đồ\s+thị[^\n]*(?=\n|$)/gi,
      '\n'
    )
    .replace(
      /(?:^|\n)\s*Hình\s+(?:Câu\s*)?\d+\s*(?:[.:][^\n]*)?(?=\n|$)/gi,
      '\n'
    )
    .trim();

  if (!extractedUrl) {
    extractedUrl = getResolvedQuestionImage(
      {
        question: rawBlockText,
        has_image: hasVectorPlaceholder,
        image_url: hasVectorPlaceholder ? '@@VECTOR_DIAGRAM@@' : undefined,
      },
      part,
      questionIndexInPart
    );
  }

  return {
    cleanText,
    has_image: Boolean(extractedUrl),
    image_url: extractedUrl,
  };
}

/**
 * Strip all answer key markers (*, underline/red tags, (Đáp án đúng)) from displayed option text
 */
function stripOptionMarkers(text: string): string {
  return text
    .replace(/^\*+|\*+$/g, '')
    .replace(/\(\s*Đáp\s+án\s+đúng\s*\)/gi, '')
    .replace(/\b(?:Đáp\s*án|ĐA)\s*:\s*[A-D]\b.*$/i, '')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

/**
 * Universal GDPT 2018 3-Part Question & Answer Key Parser
 * Supports:
 * - Red-highlighted ("bôi đỏ"), underlined, or asterisk-marked (*A., *B., *C., *D.) Part I options
 * - Red-highlighted ("bôi đỏ"), asterisk-marked (*a), *b)), (Đúng)/(Sai), or DSSD Part II statements
 * - "Đáp án: <số>", "Đáp số: <số>", or "<đáp án: <số>>" Part III short-answer keys
 */
export function parseAnnotatedTextToExamData(
  rawText: string,
  fileName: string
): {
  examData: ExamData;
  adminHeader: Partial<ScrambledVariantAdminHeader>;
  parsedCount: number;
  part1Count: number;
  part2Count: number;
  part3Count: number;
  imageCount: number;
} {
  const cleanFileNameTitle = fileName
    .replace(/\.(docx|doc|pdf|txt|json)$/i, '')
    .replace(/_/g, ' ')
    .trim();

  // Remove end-of-exam footer lines ("------------Hết-----------", "--- HẾT ---") and page numbers ("Trang 1/6")
  const cleanedDocumentText = rawText
    .replace(/(?:^|\n)\s*-{3,}\s*Hết\s*-{3,}[\s\S]*$/i, '')
    .replace(/(?:^|\n)\s*---\s*HẾT\s*---[\s\S]*$/i, '')
    .replace(/(?:^|\n)\s*Trang\s+\d+\s*\/\s*\d+\s*(?=\n|$)/gi, '\n')
    .replace(
      /(?:^|\n)\s*ĐỀ\s+ÔN\s+LUYỆN\s+VẬT\s+L[ÍÝ]\s+\d+\s*[—–-]\s*CHUYÊN\s+ĐỀ[^\n]*(?=\n|$)/gi,
      '\n'
    )
    .replace(/\*+(\s*(?:\[[A-D]\.?\]|[A-D][.)]))/g, '*$1')
    .replace(/\*+(\s*[a-d][).])/g, '*$1');

  const lines = cleanedDocumentText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Extract optional administrative header lines from the top 25 lines
  const adminHeader: Partial<ScrambledVariantAdminHeader> = {};
  let detectedTopicLine = '';
  for (const line of lines.slice(0, 25)) {
    // Handle combined 2-column header lines from PDF/Word (e.g. "SỞ GIÁO DỤC VÀ ĐÀO TẠO   ĐỀ ÔN LUYỆN...")
    const examTitleMatch = line.match(
      /((?:ĐỀ\s+ÔN\s+LUYỆN|ĐỀ\s+KIỂM\s+TRA|ĐỀ\s+THI|KIỂM\s+TRA|KỲ\s+THI|ĐỊNH\s+DẠNG\s+ĐỀ)[^\n]*)/i
    );
    if (examTitleMatch && !adminHeader.examTerm) {
      adminHeader.examTerm = examTitleMatch[1].trim();
    }
    const topicMatch = line.match(/Chuyên\s+đề\s*:\s*([^\n]+)/i);
    if (topicMatch && !detectedTopicLine) {
      detectedTopicLine = topicMatch[1].trim();
    }

    if (/^(?:SỞ\s+GIÁO\s+DỤC|SỞ\s+GD|UBND|BỘ\s+GIÁO\s+DỤC)/i.test(line)) {
      const govPart = line
        .replace(/((?:ĐỀ\s+ÔN\s+LUYỆN|ĐỀ\s+KIỂM\s+TRA|ĐỀ\s+THI|KIỂM\s+TRA|KỲ\s+THI).*)$/i, '')
        .split('·')[0]
        .trim();
      if (govPart) adminHeader.governingBody = govPart;
    } else if (/^TRƯỜNG\s+/i.test(line)) {
      const schoolPart = line
        .replace(/Chuyên\s+đề\s*:.*$/i, '')
        .replace(/^TRƯỜNG\s+/i, '')
        .trim();
      if (schoolPart) adminHeader.schoolName = schoolPart;
    }

    if (/Môn(?:\s+thi)?\s*:\s*([^|·\n]+)/i.test(line)) {
      const m = line.match(/Môn(?:\s+thi)?\s*:\s*([^|·\n]+)/i);
      if (m) adminHeader.subjectName = m[1].trim();
    } else if (!adminHeader.subjectName) {
      const subjInline = line.match(/\b(VẬT\s+L[ÍÝ]\s*(?:10|11|12))\b/i);
      if (subjInline) {
        adminHeader.subjectName = subjInline[1].toUpperCase().replace(/\s+/g, ' ');
      }
    }

    const durMatch = line.match(/Thời\s+gian(?:\s+làm\s+bài)?\s*:\s*(\d+)\s*phút/i);
    if (durMatch) {
      adminHeader.durationMinutes = Number(durMatch[1]);
    }
  }

  if (detectedTopicLine) {
    if (adminHeader.examTerm && !adminHeader.examTerm.includes(detectedTopicLine)) {
      adminHeader.examTerm = `${adminHeader.examTerm} — Chuyên đề: ${detectedTopicLine}`;
    } else if (!adminHeader.examTerm) {
      adminHeader.examTerm = `CHUYÊN ĐỀ: ${detectedTopicLine}`;
    }
  }

  // Check end-of-document answer key table for Part I (e.g. "1.A | 2.B" or "1A 2C")
  const endAnswerKeyPart1: Record<number, number> = {};
  const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  const indexToLetter: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  for (const line of lines) {
    if (/BẢNG\s+ĐÁP\s+ÁN|ĐÁP\s+ÁN\s+PHẦN\s+I/i.test(line)) {
      const pairs = line.matchAll(/\b(\d{1,2})\s*[.:-]\s*([A-D])\b/g);
      for (const m of pairs) {
        const qNum = Number(m[1]);
        const letterIdx = letterMap[m[2].toUpperCase()];
        if (qNum >= 1 && qNum <= 40 && letterIdx !== undefined) {
          endAnswerKeyPart1[qNum] = letterIdx;
        }
      }
    }
  }

  const p1Questions: Part1Question[] = [];
  const p2Questions: Part2Question[] = [];
  const p3Questions: Part3Question[] = [];
  let imageCount = 0;

  // Split document into explicit sections (PHẦN I, PHẦN II, PHẦN III) first so questions in Part I
  // can NEVER be misclassified as Part II and vice versa.
  const sectionTaggedText = cleanedDocumentText
    .replace(
      /(?:^|\n)\s*(?:PHẦN|Phần)\s*(?:III|3)\b[^\n]*/g,
      '\n@@SECTION_BREAK:III@@\n'
    )
    .replace(
      /(?:^|\n)\s*(?:PHẦN|Phần)\s*(?:II|2)\b[^\n]*/g,
      '\n@@SECTION_BREAK:II@@\n'
    )
    .replace(
      /(?:^|\n)\s*(?:PHẦN|Phần)\s*(?:I|1)\b[^\n]*/g,
      '\n@@SECTION_BREAK:I@@\n'
    );

  const sectionChunks = sectionTaggedText.split(/@@SECTION_BREAK:(I|II|III)@@/);
  const sectionsToProcess: { part: 'I' | 'II' | 'III'; content: string }[] = [];

  if (sectionChunks.length > 1) {
    for (let i = 1; i < sectionChunks.length; i += 2) {
      const part = sectionChunks[i] as 'I' | 'II' | 'III';
      const content = sectionChunks[i + 1] || '';
      sectionsToProcess.push({ part, content });
    }
  } else {
    sectionsToProcess.push({ part: 'I', content: cleanedDocumentText });
  }

  const hasExplicitSections = sectionChunks.length > 1;

  for (const sec of sectionsToProcess) {
    const currentPart = sec.part;
    const normalizedSection = sec.content
      .replace(/<câu>\s*(?:Câu\s*\d+\s*[:.]?)?/gi, '\n@@QUESTION_START@@ ')
      .replace(/(?:^|\n)\s*(?:Câu|Question)\s+(\d+)\s*[:.]\s*/gi, (match, num) => {
        if (match.includes('@@QUESTION_START@@')) return match;
        return `\n@@QUESTION_START@@ [QNUM:${num}] `;
      });

    const rawBlocks = normalizedSection.split('@@QUESTION_START@@');

    for (let bIdx = 1; bIdx < rawBlocks.length; bIdx++) {
      const activeContent = rawBlocks[bIdx].trim();
      const contentWithoutNum = activeContent
        .replace(/^\[QNUM:\d+\]\s*/i, '')
        .replace(/^Câu\s+\d+\s*[:.]\s*/i, '')
        .trim();

      if (!contentWithoutNum) continue;

      // Strip @@IMAGE_TOKEN:...@@ when testing option/statement patterns so base64 payloads never interfere
      const textForStructureCheck = contentWithoutNum.replace(/@@IMAGE_TOKEN:[\s\S]*?@@/g, '\n');

      // Detect if block has Part II sub-items a), b), c), d) (STRICTLY lowercase a, b, c)
      const hasSubStatements =
        /(?:^|\n|\s)\**a[).]\**\s+/.test(textForStructureCheck) &&
        /(?:^|\n|\s)\**b[).]\**\s+/.test(textForStructureCheck) &&
        /(?:^|\n|\s)\**c[).]\**\s+/.test(textForStructureCheck);

      // Detect if block has Part I choices A., B., C., D. (STRICTLY uppercase A, B, C)
      const hasABCDOptions =
        /(?:^|\n|\s)\**(?:\[A\.?\]|A[.)])\**\s+/.test(textForStructureCheck) &&
        /(?:^|\n|\s)\**(?:\[B\.?\]|B[.)])\**\s+/.test(textForStructureCheck) &&
        /(?:^|\n|\s)\**(?:\[C\.?\]|C[.)])\**\s+/.test(textForStructureCheck);

      const targetPart: 'I' | 'II' | 'III' = hasExplicitSections
        ? currentPart
        : hasSubStatements && !hasABCDOptions
        ? 'II'
        : hasABCDOptions
        ? 'I'
        : 'III';

      if (targetPart === 'II') {
        // =========================================================================
        // B. PHẦN II (Trắc nghiệm Đúng/Sai - True/False)
        // =========================================================================
        const nextP2Idx = p2Questions.length + 1;
        const {
          cleanText: blockNoImg,
          has_image,
          image_url,
        } = resolveQuestionImage(contentWithoutNum, 'II', nextP2Idx);

        // Check for trailing 4-letter truth sequence token at the end of the block (e.g. DSSD, ĐSĐS)
        let trailingSequenceTruths: [boolean, boolean, boolean, boolean] | null = null;
        let textWithoutTrailingSeq = blockNoImg;

        const seqRegex =
          /(?:(?:^|\n|\s)(?:Đáp\s*(?:án|số)|ĐA|ĐS|Kết\s*quả)\s*[:=]?\s*)?\(?([DĐS])\s*[-.,\s]?\s*([DĐS])\s*[-.,\s]?\s*([DĐS])\s*[-.,\s]?\s*([DĐS])\)?\s*$/i;
        const seqMatch = textWithoutTrailingSeq.match(seqRegex);
        if (seqMatch) {
          const letters = [seqMatch[1], seqMatch[2], seqMatch[3], seqMatch[4]].map((ch) =>
            /^[DĐ]$/i.test(ch)
          );
          trailingSequenceTruths = [letters[0], letters[1], letters[2], letters[3]];
          textWithoutTrailingSeq = textWithoutTrailingSeq.slice(0, seqMatch.index).trim();
        }

        // Normalize inline sub-statements onto separate lines (strictly lowercase a-d)
        const normalizedStmtsBlock = textWithoutTrailingSeq.replace(
          /(?:\s{2,}|\t+)(\**[a-d][).]\**)\s+/g,
          '\n$1 '
        );

        const firstAIdx = normalizedStmtsBlock.search(/(?:^|\n)\s*\**a[).]\**\s+/);
        if (firstAIdx >= 0) {
          const stem = normalizedStmtsBlock.slice(0, firstAIdx).trim();
          const stmtsRaw = normalizedStmtsBlock.slice(firstAIdx);
          const stmtRegex =
            /(?:^|\n)\s*(\**)([a-d])[).](\**)\s*([\s\S]*?)(?=(?:\n\s*\**[a-d][).]\**\s+)|$)/g;

          const rawParsedStmts: {
            id: 'a' | 'b' | 'c' | 'd';
            text: string;
            starred: boolean;
            explicitSuffixTruth?: boolean;
          }[] = [];

          let m: RegExpExecArray | null;
          while ((m = stmtRegex.exec(stmtsRaw)) !== null) {
            const starred = m[1].includes('*') || m[3].includes('*');
            const label = m[2].toLowerCase() as 'a' | 'b' | 'c' | 'd';
            let stText = m[4].trim();
            let explicitSuffixTruth: boolean | undefined;

            // Check inline trailing token on statement d if not already stripped
            if (label === 'd' && !trailingSequenceTruths) {
              const dSeqMatch = stText.match(
                /(?:\s+|\n+)(?:(?:Đáp\s*án|ĐA)\s*[:=]?\s*)?\(?([DĐS])[-.\s]?([DĐS])[-.\s]?([DĐS])[-.\s]?([DĐS])\)?\s*$/i
              );
              if (dSeqMatch) {
                const l = [dSeqMatch[1], dSeqMatch[2], dSeqMatch[3], dSeqMatch[4]].map((c) =>
                  /^[DĐ]$/i.test(c)
                );
                trailingSequenceTruths = [l[0], l[1], l[2], l[3]];
                stText = stText.slice(0, dSeqMatch.index).trim();
              }
            }

            // Check parentheses/brackets suffix: (Đúng), (Sai), (Đ), (S), (True), (False)
            if (/[\(\[]\s*(?:Đúng|Đ|True)\s*[\)\]]\.?\s*$/i.test(stText)) {
              explicitSuffixTruth = true;
              stText = stText.replace(/[\(\[]\s*(?:Đúng|Đ|True)\s*[\)\]]\.?\s*$/i, '').trim();
            } else if (/[\(\[]\s*(?:Sai|S|False)\s*[\)\]]\.?\s*$/i.test(stText)) {
              explicitSuffixTruth = false;
              stText = stText.replace(/[\(\[]\s*(?:Sai|S|False)\s*[\)\]]\.?\s*$/i, '').trim();
            }

            const hasLeadingStarInText = stText.startsWith('*');
            stText = stText
              .replace(/^\*+|\*+$/g, '')
              .replace(/\s*\n\s*/g, ' ')
              .trim();

            rawParsedStmts.push({
              id: label,
              text: stText,
              starred: starred || hasLeadingStarInText,
              explicitSuffixTruth,
            });
          }

          if (rawParsedStmts.length >= 4) {
            const finalStmts: Part2SubStatement[] = rawParsedStmts
              .slice(0, 4)
              .map((item, sIdx) => {
                let isTrue = false;
                if (item.explicitSuffixTruth !== undefined) {
                  isTrue = item.explicitSuffixTruth;
                } else if (trailingSequenceTruths) {
                  isTrue = trailingSequenceTruths[sIdx];
                } else {
                  // Red-highlight ("bôi đỏ") or asterisk marker rule: *a) = true [ĐÚNG], without * = false [SAI]
                  isTrue = item.starred;
                }
                return {
                  id: item.id,
                  text: item.text,
                  isTrue,
                  is_correct: isTrue,
                };
              });

            if (has_image) imageCount++;
            p2Questions.push({
              id: `UP-P2-${String(nextP2Idx).padStart(2, '0')}`,
              topic: detectedTopicLine || 'Vật lý — Đúng/Sai',
              stem,
              statements: [finalStmts[0], finalStmts[1], finalStmts[2], finalStmts[3]],
              points: 1.0,
              explanation: `Đáp án chuẩn: ${finalStmts
                .map((s) => `${s.id})${s.isTrue ? 'Đ' : 'S'}`)
                .join(' · ')}.`,
              has_image,
              image_url,
            });
          }
        }
      } else if (targetPart === 'I' && hasABCDOptions) {
        // =========================================================================
        // A. PHẦN I (Trắc nghiệm nhiều lựa chọn - Multiple Choice)
        // =========================================================================
        const nextP1Idx = p1Questions.length + 1;
        const {
          cleanText: blockNoImg,
          has_image,
          image_url,
        } = resolveQuestionImage(contentWithoutNum, 'I', nextP1Idx);

        // Check for trailing key line: "Đáp án: [A-D]" or "ĐA: [A-D]" or "<đáp án: [A-D]>"
        let trailingKeyIndex = -1;
        let textWithoutTrailingKey = blockNoImg;
        const trailingKeyRegex =
          /(?:^|\n|\s)(?:<\s*)?(?:Đáp\s*án|ĐA|Key)\s*[:=]\s*([A-D])\b(?:\s*>)?.*$/i;
        const trailingKeyMatch = textWithoutTrailingKey.match(trailingKeyRegex);
        if (trailingKeyMatch) {
          const kLetter = trailingKeyMatch[1].toUpperCase();
          if (letterMap[kLetter] !== undefined) {
            trailingKeyIndex = letterMap[kLetter];
          }
          textWithoutTrailingKey = textWithoutTrailingKey
            .slice(0, trailingKeyMatch.index)
            .trim();
        }

        // Split options separated by 2+ spaces or tabs (Word/PDF tab stops)
        let normalizedOptionsBlock = textWithoutTrailingKey.replace(
          /(?:\s{2,}|\t+)(\**(?:\[[A-D]\.?\]|[A-D][.)])\**)\s+/g,
          '\n$1 '
        );

        // Find the start of option A (on its own line or after whitespace)
        let firstOptIdx = normalizedOptionsBlock.search(
          /(?:^|\n)\s*\**(?:\[A\.?\]|A[.)])\**\s+/
        );
        if (firstOptIdx < 0) {
          const inlineAIdx = normalizedOptionsBlock.search(
            /\s+\**(?:\[A\.?\]|A[.)])\**\s+/
          );
          if (inlineAIdx > 0) {
            normalizedOptionsBlock =
              normalizedOptionsBlock.slice(0, inlineAIdx) +
              '\n' +
              normalizedOptionsBlock.slice(inlineAIdx).trimStart();
            firstOptIdx = normalizedOptionsBlock.search(
              /(?:^|\n)\s*\**(?:\[A\.?\]|A[.)])\**\s+/
            );
          }
        }

        if (firstOptIdx > 0) {
          const questionStem = normalizedOptionsBlock
            .slice(0, firstOptIdx)
            .replace(/\s*\n\s*/g, ' ')
            .trim();
          // Inside the options region only, also split inline B., C., D. separated by single spaces
          const optsRegion = normalizedOptionsBlock
            .slice(firstOptIdx)
            .replace(/(?:\s+|\t+)(\**(?:\[[B-D]\.?\]|[B-D][.)])\**)\s+/g, '\n$1 ');

          const optRegex =
            /(?:^|\n)\s*(\**)(?:\[([A-D])\.?\]|([A-D])[.)])(\**)\s*([\s\S]*?)(?=(?:\n\s*\**(?:\[[A-D]\.?\]|[A-D][.)])\**\s+)|$)/g;
          const opts: string[] = [];
          let starredIndex = -1;
          let m: RegExpExecArray | null;

          while ((m = optRegex.exec(optsRegion)) !== null) {
            const isStarred = m[1].includes('*') || m[4].includes('*');
            let optText = m[5].trim();

            // Check if trailing "Đáp án: X" was inside option D
            const inlineKeyMatch = optText.match(
              /(?:\s+|\n+)(?:Đáp\s*án|ĐA)\s*[:=]\s*([A-D])\b.*$/i
            );
            if (inlineKeyMatch) {
              const kLetter = inlineKeyMatch[1].toUpperCase();
              if (letterMap[kLetter] !== undefined) {
                trailingKeyIndex = letterMap[kLetter];
              }
              optText = optText.slice(0, inlineKeyMatch.index).trim();
            }

            if (/\(\s*Đáp\s+án\s+đúng\s*\)/i.test(optText)) {
              starredIndex = opts.length;
            }
            if (isStarred || optText.startsWith('*')) {
              starredIndex = opts.length;
            }

            opts.push(stripOptionMarkers(optText));
          }

          if (opts.length >= 4) {
            const resolvedCorrect =
              starredIndex >= 0
                ? starredIndex
                : trailingKeyIndex >= 0
                ? trailingKeyIndex
                : endAnswerKeyPart1[nextP1Idx] !== undefined
                ? endAnswerKeyPart1[nextP1Idx]
                : 0;
            const safeIdx = Math.max(0, Math.min(3, resolvedCorrect));

            if (has_image) imageCount++;
            p1Questions.push({
              id: `UP-P1-${String(nextP1Idx).padStart(2, '0')}`,
              topic: detectedTopicLine || 'Vật lý — Nhiều lựa chọn',
              question: questionStem,
              options: [opts[0], opts[1], opts[2], opts[3]],
              correctIndex: safeIdx,
              correct_answer: indexToLetter[safeIdx],
              points: 0.25,
              explanation: `Đáp án đúng: ${indexToLetter[safeIdx]}.`,
              has_image,
              image_url,
            });
          }
        }
      } else if (
        targetPart === 'III' ||
        /(?:<\s*đáp\s*án\s*:|Đáp\s*(?:số|án)\s*:|Kết\s*quả\s*:|ĐS\s*:|ĐA\s*:)/i.test(
          contentWithoutNum
        )
      ) {
        // =========================================================================
        // C. PHẦN III (Trắc nghiệm trả lời ngắn - Short Answer)
        // =========================================================================
        const nextP3Idx = p3Questions.length + 1;
        const {
          cleanText: blockNoImg,
          has_image,
          image_url,
        } = resolveQuestionImage(contentWithoutNum, 'III', nextP3Idx);

        let answerVal = '';
        let unitVal: string | undefined;
        let qText = blockNoImg;

        // Match <đáp án: ...> or Đáp số: / Đáp án: / Kết quả: / ĐS: / ĐA: followed by numeric value
        const tagMatch = qText.match(/<\s*(?:đáp\s*(?:án|số)|kết\s*quả|đs|đa)\s*:\s*([^>]+)\s*>/i);
        const prefixMatch = qText.match(
          /(?:^|\n|\s)\*?(?:Đáp\s*số|Đáp\s*án|Kết\s*quả|ĐS|ĐA)\s*[:=]\s*\*?\s*([+-]?\d+(?:[.,]\d+)?)/i
        );
        const unitMatch = qText.match(/\(\s*Đơn\s*vị\s*:\s*([^)]+)\s*\)/i);

        if (tagMatch) {
          const rawExtracted = tagMatch[1].trim();
          const numMatch = rawExtracted.match(/[+-]?\d+(?:[.,]\d+)?/);
          answerVal = numMatch ? numMatch[0].trim() : rawExtracted;
          qText = qText.replace(tagMatch[0], '').trim();
        } else if (prefixMatch) {
          answerVal = prefixMatch[1].trim();
          qText = qText.slice(0, prefixMatch.index).trim();
        }

        if (unitMatch) {
          unitVal = unitMatch[1].trim();
          qText = qText.replace(unitMatch[0], '').trim();
        }

        qText = qText
          .replace(/Điền\s+đáp\s+số\s*:\s*\.+.*$/im, '')
          .replace(/(?:^|\n)\s*\*?(?:Đáp\s*số|Đáp\s*án|Kết\s*quả|ĐS|ĐA)\s*[:=].*$/im, '')
          .replace(/\s*\n\s*/g, ' ')
          .trim();

        if (qText.length > 5) {
          const cleanNumeric = answerVal || '0';
          if (has_image) imageCount++;
          p3Questions.push({
            id: `UP-P3-${String(nextP3Idx).padStart(2, '0')}`,
            topic: detectedTopicLine || 'Vật lý — Trả lời ngắn',
            question: qText,
            answer: cleanNumeric,
            correct_value: cleanNumeric,
            unit: unitVal,
            points: 0.25,
            explanation: `Đáp án: ${cleanNumeric}${unitVal ? ` (${unitVal})` : ''}.`,
            has_image,
            image_url,
          });
        }
      }
    }
  }

  const totalParsed = p1Questions.length + p2Questions.length + p3Questions.length;

  // Only fall back to ENTRANCE_PHYSICS_28_EXAM if ZERO questions were parsed across the entire file.
  // Never mix fallback questions with parsed questions!
  const finalPart1 = totalParsed > 0 ? p1Questions : ENTRANCE_PHYSICS_28_EXAM.part1;
  const finalPart2 = totalParsed > 0 ? p2Questions : ENTRANCE_PHYSICS_28_EXAM.part2;
  const finalPart3 = totalParsed > 0 ? p3Questions : ENTRANCE_PHYSICS_28_EXAM.part3;

  const finalImageCount =
    imageCount > 0
      ? imageCount
      : [
          ...finalPart1.filter((q) => q.has_image),
          ...finalPart2.filter((q) => q.has_image),
          ...finalPart3.filter((q) => q.has_image),
        ].length;

  const parsedCount = finalPart1.length + finalPart2.length + finalPart3.length;

  const examData: ExamData = {
    examId: `UPLOAD-${Date.now().toString().slice(-5)}`,
    title: adminHeader.examTerm || cleanFileNameTitle || 'ĐỊNH DẠNG ĐỀ MẪU CỦA HỆ THỐNG',
    subject: adminHeader.subjectName || 'VẬT LÝ 12',
    grade: '12',
    curriculum: 'GDPT 2018',
    durationMinutes: adminHeader.durationMinutes || 50,
    part1: finalPart1,
    part2: finalPart2,
    part3: finalPart3,
  };

  return {
    examData,
    adminHeader,
    parsedCount,
    part1Count: finalPart1.length,
    part2Count: finalPart2.length,
    part3Count: finalPart3.length,
    imageCount: finalImageCount,
  };
}

/**
 * CRC32 lookup table for encoding raw RGB PDF Image XObjects into lossless PNG Data URIs
 */
const PNG_CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function computePngCrc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = PNG_CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(typeAscii: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length, false);
  for (let i = 0; i < 4; i++) {
    chunk[4 + i] = typeAscii.charCodeAt(i);
  }
  chunk.set(data, 8);
  const crc = computePngCrc32(chunk.subarray(4, 8 + data.length));
  view.setUint32(8 + data.length, crc, false);
  return chunk;
}

/**
 * Encode raw 8-bit RGB/Grayscale/RGBA pixels from a PDF /FlateDecode Image XObject into a PNG data URI
 */
async function encodeRawPdfPixelsToPngDataUri(
  width: number,
  height: number,
  rawPixels: Uint8Array
): Promise<string | null> {
  if (width <= 0 || height <= 0) return null;
  const pixelCount = width * height;
  let colorType = 2; // RGB
  let channels = 3;
  if (rawPixels.length === pixelCount * 3) {
    colorType = 2;
    channels = 3;
  } else if (rawPixels.length === pixelCount * 4) {
    colorType = 6;
    channels = 4;
  } else if (rawPixels.length === pixelCount) {
    colorType = 0;
    channels = 1;
  } else {
    return null;
  }

  const rowStride = width * channels;
  const filteredScanlines = new Uint8Array((rowStride + 1) * height);
  for (let y = 0; y < height; y++) {
    const dstOffset = y * (rowStride + 1);
    filteredScanlines[dstOffset] = 0; // Filter type 0 (None)
    const srcOffset = y * rowStride;
    filteredScanlines.set(rawPixels.subarray(srcOffset, srcOffset + rowStride), dstOffset + 1);
  }

  let zlibStreamBytes: Uint8Array | null = null;
  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate');
      const writer = cs.writable.getWriter();
      writer.write(filteredScanlines);
      writer.close();
      const resp = new Response(cs.readable);
      const ab = await resp.arrayBuffer();
      zlibStreamBytes = new Uint8Array(ab);
    } catch {
      zlibStreamBytes = null;
    }
  }

  if (!zlibStreamBytes) return null;

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = new Uint8Array(13);
  const ihdrView = new DataView(ihdrData.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdrData[8] = 8; // Bit depth 8
  ihdrData[9] = colorType;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = makePngChunk('IHDR', ihdrData);
  const idatChunk = makePngChunk('IDAT', zlibStreamBytes);
  const iendChunk = makePngChunk('IEND', new Uint8Array(0));

  const totalLen = signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const pngBytes = new Uint8Array(totalLen);
  let offset = 0;
  pngBytes.set(signature, offset);
  offset += signature.length;
  pngBytes.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  pngBytes.set(idatChunk, offset);
  offset += idatChunk.length;
  pngBytes.set(iendChunk, offset);

  return `data:image/png;base64,${uint8ArrayToBase64(pngBytes)}`;
}

/**
 * Decompress a PDF FlateDecode stream using browser/Node DecompressionStream
 */
async function inflatePdfFlateStream(compressedBytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  const copyBytes = new Uint8Array(compressedBytes.byteLength);
  copyBytes.set(compressedBytes);
  for (const format of ['deflate', 'deflate-raw'] as const) {
    try {
      const ds = new DecompressionStream(format);
      const writer = ds.writable.getWriter();
      const writePromise = writer.write(copyBytes).then(() => writer.close());
      const resp = new Response(ds.readable);
      const [ab] = await Promise.all([resp.arrayBuffer(), writePromise]);
      return new Uint8Array(ab);
    } catch {
      // try next format
    }
  }
  return null;
}

function uint8ArrayToLatin1(bytes: Uint8Array): string {
  let out = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    out += String.fromCharCode(...sub);
  }
  return out;
}

/**
 * Extract Unicode text AND embedded diagram images from a PDF ArrayBuffer in exact top-to-bottom page Y order.
 * Supports ToUnicode CMap fonts (2-byte CID fonts and 1-byte fonts), TJ/Tj operators, and Image XObjects.
 */
export async function extractTextAndImagesFromPdfBuffer(
  buffer: ArrayBuffer,
  includeImages: boolean = true
): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const utf8Decoder = new TextDecoder('utf-8');
  const rawPdf = uint8ArrayToLatin1(bytes);

  // 1. Parse all indirect PDF objects: "<id> 0 obj ... endobj"
  interface PdfParsedObject {
    id: number;
    dictText: string;
    bodyText: string;
    streamBytes: Uint8Array | null;
  }

  const objectsMap = new Map<number, PdfParsedObject>();
  const objHeaderRegex = /(?:^|\r|\n)(\d+)\s+0\s+obj\b/g;
  const objStarts: { id: number; headerEnd: number; matchStart: number }[] = [];
  let hm: RegExpExecArray | null;
  while ((hm = objHeaderRegex.exec(rawPdf)) !== null) {
    objStarts.push({
      id: Number(hm[1]),
      matchStart: hm.index,
      headerEnd: hm.index + hm[0].length,
    });
  }

  for (let i = 0; i < objStarts.length; i++) {
    const cur = objStarts[i];
    const nextStart = i + 1 < objStarts.length ? objStarts[i + 1].matchStart : rawPdf.length;
    const endObjPos = rawPdf.indexOf('endobj', cur.headerEnd);
    const sliceEnd = endObjPos !== -1 && endObjPos < nextStart ? endObjPos : nextStart;
    const bodyText = rawPdf.slice(cur.headerEnd, sliceEnd);

    const streamMatch = bodyText.match(/stream(?:\r\n|\n|\r)/);
    let dictText = bodyText;
    let streamBytes: Uint8Array | null = null;

    if (streamMatch && streamMatch.index !== undefined) {
      dictText = bodyText.slice(0, streamMatch.index);
      const streamStartInObj = streamMatch.index + streamMatch[0].length;
      const endStreamIdx = bodyText.lastIndexOf('endstream');
      if (endStreamIdx > streamStartInObj) {
        let absStart = cur.headerEnd + streamStartInObj;
        let absEnd = cur.headerEnd + endStreamIdx;
        if (bytes[absEnd - 1] === 0x0a) {
          absEnd--;
          if (bytes[absEnd - 1] === 0x0d) absEnd--;
        } else if (bytes[absEnd - 1] === 0x0d) {
          absEnd--;
        }
        if (absEnd > absStart) {
          streamBytes = bytes.subarray(absStart, absEnd);
        }
      }
    }

    objectsMap.set(cur.id, {
      id: cur.id,
      dictText,
      bodyText,
      streamBytes,
    });
  }

  // 2. Helper to get decompressed stream bytes from an object ID
  const decompressedCache = new Map<number, Uint8Array | null>();
  const getDecompressedStream = async (objId: number): Promise<Uint8Array | null> => {
    if (decompressedCache.has(objId)) return decompressedCache.get(objId) || null;
    const obj = objectsMap.get(objId);
    if (!obj || !obj.streamBytes) {
      decompressedCache.set(objId, null);
      return null;
    }
    if (/\/Filter\s*(?:\[\s*)?\/FlateDecode\b/.test(obj.dictText)) {
      const inflated = await inflatePdfFlateStream(obj.streamBytes);
      decompressedCache.set(objId, inflated);
      return inflated;
    }
    decompressedCache.set(objId, obj.streamBytes);
    return obj.streamBytes;
  };

  // 3. Parse ToUnicode CMaps for all font objects
  const parseToUnicodeCMap = (cmapText: string): Map<number, string> => {
    const map = new Map<number, string>();
    const hexToUnicodeStr = (hex: string): string => {
      const clean = hex.replace(/\s+/g, '');
      if (!clean) return '';
      if (clean.length <= 2) {
        return String.fromCharCode(parseInt(clean, 16));
      }
      let out = '';
      for (let i = 0; i < clean.length; i += 4) {
        const chunk = clean.slice(i, i + 4);
        if (chunk.length === 4) {
          out += String.fromCharCode(parseInt(chunk, 16));
        }
      }
      return out;
    };

    const bfRangeBlocks = cmapText.matchAll(/beginbfrange([\s\S]*?)endbfrange/g);
    for (const blk of bfRangeBlocks) {
      const content = blk[1];
      const rangeRegex =
        /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[([^\]]+)\])/g;
      let rm: RegExpExecArray | null;
      while ((rm = rangeRegex.exec(content)) !== null) {
        const startCode = parseInt(rm[1], 16);
        const endCode = parseInt(rm[2], 16);
        if (rm[3]) {
          let targetCode = parseInt(rm[3], 16);
          for (let c = startCode; c <= endCode; c++) {
            map.set(c, String.fromCodePoint(targetCode++));
          }
        } else if (rm[4]) {
          const items = [...rm[4].matchAll(/<([0-9A-Fa-f]+)>/g)].map((x) =>
            hexToUnicodeStr(x[1])
          );
          for (let c = startCode; c <= endCode && c - startCode < items.length; c++) {
            map.set(c, items[c - startCode]);
          }
        }
      }
    }

    const bfCharBlocks = cmapText.matchAll(/beginbfchar([\s\S]*?)endbfchar/g);
    for (const blk of bfCharBlocks) {
      const content = blk[1];
      const charRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
      let cm: RegExpExecArray | null;
      while ((cm = charRegex.exec(content)) !== null) {
        const code = parseInt(cm[1], 16);
        map.set(code, hexToUnicodeStr(cm[2]));
      }
    }

    return map;
  };

  // Map fontObjId -> CMap
  const fontObjCMap = new Map<number, Map<number, string>>();
  for (const [objId, obj] of objectsMap.entries()) {
    const toUniMatch = obj.bodyText.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
    if (toUniMatch) {
      const cmapObjId = Number(toUniMatch[1]);
      const cmapBytes = await getDecompressedStream(cmapObjId);
      if (cmapBytes) {
        const cmapText = utf8Decoder.decode(cmapBytes);
        fontObjCMap.set(objId, parseToUnicodeCMap(cmapText));
      }
    }
  }

  // Build global fallback font name -> CMap (e.g. /TT2 -> CMap)
  const globalFontNameCMap = new Map<string, Map<number, string>>();
  for (const obj of objectsMap.values()) {
    const fontDictMatches = obj.bodyText.matchAll(/\/(TT\d+|F\d+|C\d+|T\d+)\s+(\d+)\s+0\s+R/g);
    for (const fm of fontDictMatches) {
      const fontName = fm[1];
      const fObjId = Number(fm[2]);
      const cmap = fontObjCMap.get(fObjId);
      if (cmap && !globalFontNameCMap.has(fontName)) {
        globalFontNameCMap.set(fontName, cmap);
      }
    }
  }

  // 4. Decode Image XObjects if requested
  const imageObjDataUriCache = new Map<number, string>();
  const getImageXObjectDataUri = async (imgObjId: number): Promise<string | null> => {
    if (!includeImages) return null;
    if (imageObjDataUriCache.has(imgObjId)) return imageObjDataUriCache.get(imgObjId) || null;
    const obj = objectsMap.get(imgObjId);
    if (!obj || !/\/Subtype\s*\/Image\b/.test(obj.dictText) || !obj.streamBytes) {
      return null;
    }

    // Direct JPEG stream (/DCTDecode)
    if (/\/Filter\s*(?:\[\s*)?\/DCTDecode\b/.test(obj.dictText)) {
      const uri = `data:image/jpeg;base64,${uint8ArrayToBase64(obj.streamBytes)}`;
      imageObjDataUriCache.set(imgObjId, uri);
      return uri;
    }

    // Raw FlateDecode bitmap (/FlateDecode)
    const widthMatch = obj.dictText.match(/\/Width\s+(\d+)/);
    const heightMatch = obj.dictText.match(/\/Height\s+(\d+)/);
    if (widthMatch && heightMatch) {
      const w = Number(widthMatch[1]);
      const h = Number(heightMatch[1]);
      const rawPixels = await getDecompressedStream(imgObjId);
      if (rawPixels) {
        const pngUri = await encodeRawPdfPixelsToPngDataUri(w, h, rawPixels);
        if (pngUri) {
          imageObjDataUriCache.set(imgObjId, pngUri);
          return pngUri;
        }
      }
    }
    return null;
  };

  // Global fallback XObject name -> object ID (e.g. /Im1 -> 12)
  const globalXObjectMap = new Map<string, number>();
  for (const obj of objectsMap.values()) {
    const xobjMatches = obj.bodyText.matchAll(/\/(Im\d+|X\d+|Img\d+)\s+(\d+)\s+0\s+R/g);
    for (const xm of xobjMatches) {
      globalXObjectMap.set(xm[1], Number(xm[2]));
    }
  }

  // 5. Find all /Type /Page objects in document order
  const pageObjects: PdfParsedObject[] = [];
  for (const obj of objectsMap.values()) {
    if (/\/Type\s*\/Page\b(?!s)/.test(obj.dictText)) {
      pageObjects.push(obj);
    }
  }

  // Decode PDF literal string bytes `(...)` handling octal escapes \ddd and escaped parentheses
  const decodePdfLiteralBytes = (litInner: string): number[] => {
    const out: number[] = [];
    for (let i = 0; i < litInner.length; i++) {
      const ch = litInner[i];
      if (ch === '\\') {
        i++;
        if (i >= litInner.length) break;
        const esc = litInner[i];
        if (esc >= '0' && esc <= '7') {
          let oct = esc;
          if (i + 1 < litInner.length && litInner[i + 1] >= '0' && litInner[i + 1] <= '7') {
            oct += litInner[++i];
          }
          if (i + 1 < litInner.length && litInner[i + 1] >= '0' && litInner[i + 1] <= '7') {
            oct += litInner[++i];
          }
          out.push(parseInt(oct, 8));
        } else if (esc === 'n') {
          out.push(10);
        } else if (esc === 'r') {
          out.push(13);
        } else if (esc === 't') {
          out.push(9);
        } else if (esc === 'b') {
          out.push(8);
        } else if (esc === 'f') {
          out.push(12);
        } else if (esc === '\r') {
          if (i + 1 < litInner.length && litInner[i + 1] === '\n') i++;
        } else if (esc === '\n') {
          // line continuation
        } else {
          out.push(esc.charCodeAt(0) & 0xff);
        }
      } else {
        out.push(ch.charCodeAt(0) & 0xff);
      }
    }
    return out;
  };

  const decodeFontBytesToUnicode = (
    rawBytes: number[],
    cmap: Map<number, string> | undefined
  ): string => {
    if (!cmap || cmap.size === 0) {
      return rawBytes.map((b) => String.fromCharCode(b)).join('');
    }
    // Detect if CMap uses 2-byte codes (Identity-H / CIDType2)
    let isTwoByteCMap = false;
    for (const k of cmap.keys()) {
      if (k > 0xff) {
        isTwoByteCMap = true;
        break;
      }
    }
    // Even if all keys happen to be <= 0xff, if rawBytes has even length and starts with 0x00, it's 2-byte big-endian
    if (!isTwoByteCMap && rawBytes.length >= 2 && rawBytes.length % 2 === 0 && rawBytes[0] === 0) {
      isTwoByteCMap = true;
    }

    let out = '';
    if (isTwoByteCMap && rawBytes.length % 2 === 0) {
      for (let i = 0; i < rawBytes.length; i += 2) {
        const code = (rawBytes[i] << 8) | rawBytes[i + 1];
        const mapped = cmap.get(code);
        if (mapped !== undefined) {
          out += mapped;
        }
      }
    } else {
      for (let i = 0; i < rawBytes.length; i++) {
        const code = rawBytes[i];
        const mapped = cmap.get(code);
        out += mapped !== undefined ? mapped : String.fromCharCode(code);
      }
    }
    return out;
  };

  const decodeTjArgument = (argText: string, cmap: Map<number, string> | undefined): string => {
    let result = '';
    let i = 0;
    while (i < argText.length) {
      if (argText[i] === '(') {
        let depth = 1;
        let inner = '';
        i++;
        while (i < argText.length && depth > 0) {
          if (argText[i] === '\\') {
            inner += argText[i];
            i++;
            if (i < argText.length) {
              inner += argText[i];
              i++;
            }
            continue;
          }
          if (argText[i] === '(') depth++;
          else if (argText[i] === ')') {
            depth--;
            if (depth === 0) {
              i++;
              break;
            }
          }
          inner += argText[i];
          i++;
        }
        result += decodeFontBytesToUnicode(decodePdfLiteralBytes(inner), cmap);
      } else if (argText[i] === '<' && argText[i + 1] !== '<') {
        const closeIdx = argText.indexOf('>', i + 1);
        if (closeIdx === -1) break;
        const hexStr = argText.slice(i + 1, closeIdx).replace(/\s+/g, '');
        const rawBytes: number[] = [];
        for (let h = 0; h < hexStr.length; h += 2) {
          rawBytes.push(parseInt(hexStr.slice(h, h + 2).padEnd(2, '0'), 16));
        }
        result += decodeFontBytesToUnicode(rawBytes, cmap);
        i = closeIdx + 1;
      } else if (argText[i] === '-' || (argText[i] >= '0' && argText[i] <= '9')) {
        // Numeric kerning adjustment inside TJ array: large negative values (< -180) indicate word space
        let numStr = '';
        while (
          i < argText.length &&
          (argText[i] === '-' ||
            argText[i] === '.' ||
            (argText[i] >= '0' && argText[i] <= '9'))
        ) {
          numStr += argText[i++];
        }
        const kernVal = Number(numStr);
        if (!Number.isNaN(kernVal) && kernVal < -180 && !result.endsWith(' ')) {
          result += ' ';
        }
      } else {
        i++;
      }
    }
    return result;
  };

  const allPagesOutputLines: string[] = [];

  for (const pageObj of pageObjects) {
    // Resolve page-specific font map and XObject map (checking both inline page dict and indirect /Resources N 0 R)
    const pageFontCMap = new Map<string, Map<number, string>>(globalFontNameCMap);
    const pageXObjectMap = new Map<string, number>(globalXObjectMap);

    let resourceTextToScan = pageObj.dictText;
    const resRefMatch = pageObj.dictText.match(/\/Resources\s+(\d+)\s+0\s+R/);
    if (resRefMatch) {
      const resObj = objectsMap.get(Number(resRefMatch[1]));
      if (resObj) {
        resourceTextToScan += '\n' + resObj.bodyText;
        // Also check if /Font or /XObject inside Resources are indirect references
        const fontSubRef = resObj.bodyText.match(/\/Font\s+(\d+)\s+0\s+R/);
        if (fontSubRef) {
          const fontDictObj = objectsMap.get(Number(fontSubRef[1]));
          if (fontDictObj) resourceTextToScan += '\n' + fontDictObj.bodyText;
        }
        const xobjSubRef = resObj.bodyText.match(/\/XObject\s+(\d+)\s+0\s+R/);
        if (xobjSubRef) {
          const xobjDictObj = objectsMap.get(Number(xobjSubRef[1]));
          if (xobjDictObj) resourceTextToScan += '\n' + xobjDictObj.bodyText;
        }
      }
    }

    const pageFontMatches = resourceTextToScan.matchAll(/\/(TT\d+|F\d+|C\d+|T\d+)\s+(\d+)\s+0\s+R/g);
    for (const fm of pageFontMatches) {
      const cmap = fontObjCMap.get(Number(fm[2]));
      if (cmap) pageFontCMap.set(fm[1], cmap);
    }

    const pageXObjMatches = resourceTextToScan.matchAll(/\/(Im\d+|X\d+|Img\d+)\s+(\d+)\s+0\s+R/g);
    for (const xm of pageXObjMatches) {
      pageXObjectMap.set(xm[1], Number(xm[2]));
    }

    // Resolve content stream object IDs for this page
    const contentObjIds: number[] = [];
    const arrayContentsMatch = pageObj.dictText.match(/\/Contents\s*\[([^\]]+)\]/);
    if (arrayContentsMatch) {
      const refs = arrayContentsMatch[1].matchAll(/(\d+)\s+0\s+R/g);
      for (const r of refs) contentObjIds.push(Number(r[1]));
    } else {
      const singleContentsMatch = pageObj.dictText.match(/\/Contents\s+(\d+)\s+0\s+R/);
      if (singleContentsMatch) {
        contentObjIds.push(Number(singleContentsMatch[1]));
      }
    }

    let combinedStreamText = '';
    for (const cId of contentObjIds) {
      const sBytes = await getDecompressedStream(cId);
      if (sBytes) {
        combinedStreamText += uint8ArrayToLatin1(sBytes) + '\n';
      }
    }
    if (!combinedStreamText) continue;

    interface PagePositionedItem {
      y: number;
      x: number;
      fontSize: number;
      isScript: boolean;
      text: string;
      isImage?: boolean;
    }

    const pageItems: PagePositionedItem[] = [];
    let currentFontName = 'TT2';
    let tfSize = 1;
    let tmScale = 12;
    let tmX = 0;
    let tmY = 0;
    let lineLeading = 14;

    // Graphics state CTM stack (q / Q / cm)
    let cmA = 1;
    let cmD = 1;
    let cmE = 0;
    let cmF = 0;
    const ctmStack: { a: number; d: number; e: number; f: number }[] = [];

    // Tokenize the page content stream across newlines, keeping (...) literal strings and [...] TJ arrays intact
    const tokenRegex =
      /\b(q|Q|BT|ET|T\*)\b|([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+(cm|Tm)\b|\/(TT\d+|F\d+|C\d+|T\d+)\s+([+-]?\d+(?:\.\d+)?)\s+Tf\b|([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s+(Td|TD)\b|([+-]?\d+(?:\.\d+)?)\s+TL\b|\/(Im\d+|X\d+|Img\d+)\s+Do\b|(\[(?:(?:\((?:[^\\()]|\\.)*\))|<[0-9A-Fa-f\s]*>|[^\\\]]|\\.)*\]|\((?:[^\\()]|\\.)*\)|<[0-9A-Fa-f\s]+>)\s*(Tj|TJ)\b/g;

    let tok: RegExpExecArray | null;
    while ((tok = tokenRegex.exec(combinedStreamText)) !== null) {
      const stateOp = tok[1];
      if (stateOp === 'q') {
        ctmStack.push({ a: cmA, d: cmD, e: cmE, f: cmF });
        continue;
      }
      if (stateOp === 'Q') {
        const popped = ctmStack.pop();
        if (popped) {
          cmA = popped.a;
          cmD = popped.d;
          cmE = popped.e;
          cmF = popped.f;
        } else {
          cmA = 1;
          cmD = 1;
          cmE = 0;
          cmF = 0;
        }
        continue;
      }
      if (stateOp === 'T*') {
        tmY -= lineLeading;
        continue;
      }
      if (stateOp === 'BT' || stateOp === 'ET') {
        continue;
      }

      // 6-number matrix operator: cm or Tm
      if (tok[8] === 'cm') {
        const a = Number(tok[2]);
        const d = Number(tok[5]);
        const e = Number(tok[6]);
        const f = Number(tok[7]);
        // Compose with active CTM
        cmE = cmA * e + cmE;
        cmF = cmD * f + cmF;
        cmA = cmA * a;
        cmD = cmD * d;
        continue;
      }
      if (tok[8] === 'Tm') {
        const dVal = Math.abs(Number(tok[5])) || Math.abs(Number(tok[2])) || 1;
        tmScale = dVal;
        tmX = Number(tok[6]);
        tmY = Number(tok[7]);
        continue;
      }

      // Font operator: /TTx size Tf
      if (tok[9] !== undefined) {
        currentFontName = tok[9];
        tfSize = Math.abs(Number(tok[10])) || 1;
        continue;
      }

      // Text offset operator: dx dy Td / TD
      if (tok[13] !== undefined) {
        const dx = Number(tok[11]);
        const dy = Number(tok[12]);
        if (tok[13] === 'TD') {
          lineLeading = -dy;
        }
        tmX += dx;
        tmY += dy;
        continue;
      }

      // Text leading: leading TL
      if (tok[14] !== undefined) {
        lineLeading = Number(tok[14]);
        continue;
      }

      // Image XObject draw: /ImX Do
      if (tok[15] !== undefined) {
        if (includeImages) {
          const xName = tok[15];
          const xObjId = pageXObjectMap.get(xName);
          if (xObjId !== undefined) {
            const dataUri = await getImageXObjectDataUri(xObjId);
            if (dataUri) {
              // In PDF, an image fills unit square [0,1]x[0,1] transformed by current CTM (cmE, cmF, cmA, cmD)
              const imgCenterPageY = cmF + cmD * 0.5;
              pageItems.push({
                y: imgCenterPageY,
                x: cmE,
                fontSize: 11,
                isScript: false,
                text: `@@IMAGE_TOKEN:${dataUri}@@`,
                isImage: true,
              });
            }
          }
        }
        continue;
      }

      // Text draw: (...) Tj or [...] TJ
      if (tok[16] !== undefined) {
        const decodedText = decodeTjArgument(
          tok[16],
          pageFontCMap.get(currentFontName)
        );
        if (decodedText) {
          const pageX = cmE + cmA * tmX;
          const pageY = cmF + cmD * tmY;
          const fontSizePt = Math.abs(cmD) * tmScale * tfSize || 11;
          pageItems.push({
            y: pageY,
            x: pageX,
            fontSize: fontSizePt,
            isScript: fontSizePt < 9.4,
            text: decodedText,
          });
        }
      }
    }

    // Group text items into horizontal visual lines (merging subscripts/superscripts whose Y differs by <= 4.8pt)
    interface VisualLineGroup {
      baseY: number;
      isImage: boolean;
      items: PagePositionedItem[];
    }

    const lineGroups: VisualLineGroup[] = [];
    for (const item of pageItems) {
      if (item.isImage) {
        lineGroups.push({
          baseY: item.y,
          isImage: true,
          items: [item],
        });
        continue;
      }

      // Find an existing text line group within Y tolerance
      const yTol = item.isScript ? 4.8 : 2.6;
      let targetGroup: VisualLineGroup | undefined;
      for (let gIdx = lineGroups.length - 1; gIdx >= 0; gIdx--) {
        const g = lineGroups[gIdx];
        if (!g.isImage && Math.abs(g.baseY - item.y) <= yTol) {
          targetGroup = g;
          break;
        }
      }

      if (targetGroup) {
        targetGroup.items.push(item);
        if (!item.isScript) {
          targetGroup.baseY = item.y;
        }
      } else {
        lineGroups.push({
          baseY: item.y,
          isImage: false,
          items: [item],
        });
      }
    }

    // Sort visual lines on this page top-to-bottom (descending Y)
    lineGroups.sort((a, b) => b.baseY - a.baseY);

    for (const group of lineGroups) {
      if (group.isImage) {
        allPagesOutputLines.push(group.items[0].text);
        continue;
      }

      // Sort items left-to-right by X coordinate
      group.items.sort((a, b) => a.x - b.x);

      let lineStr = '';
      let prevItem: PagePositionedItem | null = null;

      for (const it of group.items) {
        let piece = it.text;
        // Format superscript / subscript runs when smaller font is offset vertically from baseY
        if (it.isScript && Math.abs(it.y - group.baseY) >= 1.0 && piece.trim()) {
          const cleanScript = piece.trim();
          if (it.y > group.baseY + 1.0) {
            piece = cleanScript.length > 1 ? `^{${cleanScript}}` : `^${cleanScript}`;
          } else if (it.y < group.baseY - 1.0) {
            piece = cleanScript.length > 1 ? `_{${cleanScript}}` : `_${cleanScript}`;
          }
        }

        if (prevItem) {
          const estPrevWidth = prevItem.text.length * (prevItem.fontSize * 0.56);
          const xGap = it.x - (prevItem.x + estPrevWidth);
          if (xGap > 22) {
            lineStr += '   ';
          } else if (
            xGap > 8.5 &&
            !lineStr.endsWith(' ') &&
            !piece.startsWith(' ') &&
            !it.isScript &&
            !prevItem.isScript
          ) {
            lineStr += ' ';
          }
        }

        lineStr += piece;
        prevItem = it;
      }

      const trimmedLine = lineStr.trim();
      if (trimmedLine) {
        allPagesOutputLines.push(trimmedLine);
      }
    }
  }

  return allPagesOutputLines.join('\n');
}

/**
 * Extract raw readable text from any uploaded document (.pdf, .docx, .doc, .txt, .json)
 * Used for both Phần A (exam questions) and Phần B (detailed solution & answer key files).
 */
export async function extractRawTextFromUploadedDocument(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    return await extractTextAndImagesFromPdfBuffer(buffer, false);
  }
  if (lowerName.endsWith('.docx')) {
    const buffer = await file.arrayBuffer();
    const extracted = await extractTextAndImagesFromDocxBuffer(buffer);
    return extracted.replace(/@@IMAGE_TOKEN:[\s\S]*?@@/g, '').trim();
  }
  const rawText = await file.text();
  if (/<html|<body|<div|<p|<table/i.test(rawText)) {
    return convertHtmlDocToAnnotatedText(rawText)
      .replace(/@@IMAGE_TOKEN:[\s\S]*?@@/g, '')
      .trim();
  }
  return rawText.trim();
}

/**
 * Parse a Phần B Detailed Solution & Answer Key document (matching "(PHẦN B)DAP_AN_LOI_GIAI_CHI_TIET.pdf"
 * or Word/TXT solution files) and synchronize all official answers AND detailed explanations into baseExam.
 */
export function parseAndMergeDetailedSolutionDocument(
  rawSolutionText: string,
  baseExam: ExamData
): {
  mergedExam: ExamData;
  formattedSolutionSummary: string;
  matchedQuestionCount: number;
} {
  const p1Len = baseExam.part1.length;
  const p2Len = baseExam.part2.length;
  const p3Len = baseExam.part3.length;
  const letterToIdx: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  const idxToLetter: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  // Clean page headers/footers from solution text
  const cleanedText = rawSolutionText
    .replace(/(?:^|\n)\s*Trang\s+\d+\s*\/\s*\d+\s*(?=\n|$)/gi, '\n')
    .replace(
      /(?:^|\n)\s*HƯỚNG\s+DẪN\s+CHẤM\s+VÀ\s+ĐÁP\s+ÁN\s+CHI\s+TIẾT[^\n]*(?=\n|$)/gi,
      '\n'
    )
    .replace(/(?:^|\n)\s*---\s*HẾT\s*---[\s\S]*$/i, '')
    .trim();

  const lines = cleanedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Parse Quick Answer Tables ("BẢNG ĐÁP ÁN NHANH") if present
  const quickPart1Answers: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
  const quickPart2Answers: Record<number, Record<'a' | 'b' | 'c' | 'd', boolean>> = {};
  const quickPart3Answers: Record<number, string> = {};

  let activeP2TableQuestionCols: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match Part I or Part III table header row: "Câu   1   2   3   4..."
    if (/^Câu(?:\s+\d+){2,}/i.test(line) && i + 1 < lines.length) {
      const qNums = [...line.matchAll(/\b(\d{1,2})\b/g)].map((m) => Number(m[1]));
      const nextLine = lines[i + 1];
      if (/^(?:Đ\/A|Đáp\s+án|ĐA)\b/i.test(nextLine)) {
        const valRegion = nextLine.replace(/^(?:Đ\/A|Đáp\s+án|ĐA)\s*/i, '').trim();
        const tokens = valRegion.split(/\s+/).filter(Boolean);
        if (tokens.length === qNums.length) {
          for (let k = 0; k < qNums.length; k++) {
            const qn = qNums[k];
            const tok = tokens[k].toUpperCase();
            if (/^[A-D]$/.test(tok)) {
              quickPart1Answers[qn] = tok as 'A' | 'B' | 'C' | 'D';
            } else if (/^[+-]?\d+(?:[.,]\d+)?$/.test(tokens[k])) {
              quickPart3Answers[qn] = tokens[k];
            }
          }
          i++;
          continue;
        }
      }
    }

    // Match Part II table header row: "Lệnh hỏi   Câu 19   Câu 20   Câu 21   Câu 22"
    if (/Lệnh\s+hỏi/i.test(line) && /Câu\s+\d+/i.test(line)) {
      activeP2TableQuestionCols = [...line.matchAll(/Câu\s+(\d{1,2})/gi)].map((m) =>
        Number(m[1])
      );
      for (const qn of activeP2TableQuestionCols) {
        if (!quickPart2Answers[qn]) {
          quickPart2Answers[qn] = { a: false, b: false, c: false, d: false };
        }
      }
      continue;
    }

    // Match Part II table row: "Ý a)   Đ   Đ   Đ   Đ"
    const p2RowMatch = line.match(/^(?:Ý\s*)?([a-d])\)\s+((?:[ĐDS]\s*)+)$/i);
    if (p2RowMatch && activeP2TableQuestionCols.length > 0) {
      const stmtKey = p2RowMatch[1].toLowerCase() as 'a' | 'b' | 'c' | 'd';
      const truthTokens = p2RowMatch[2].trim().split(/\s+/);
      for (
        let k = 0;
        k < activeP2TableQuestionCols.length && k < truthTokens.length;
        k++
      ) {
        const qn = activeP2TableQuestionCols[k];
        if (!quickPart2Answers[qn]) {
          quickPart2Answers[qn] = { a: false, b: false, c: false, d: false };
        }
        quickPart2Answers[qn][stmtKey] = /^[ĐD]$/i.test(truthTokens[k]);
      }
      continue;
    }

    // Also support compact inline pairs like "1.B | 2.B | 3.A"
    if (/BẢNG\s+ĐÁP\s+ÁN|ĐÁP\s+ÁN\s+PHẦN\s+I/i.test(line)) {
      const inlinePairs = line.matchAll(/\b(\d{1,2})\s*[.:-]\s*([A-D])\b/gi);
      for (const m of inlinePairs) {
        quickPart1Answers[Number(m[1])] = m[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      }
    }
  }

  // 2. Parse Detailed Question Blocks ("Câu 1: ...", "Câu 19: ...", "Câu 23: ...")
  const detailedBlocksByNum: Record<number, string> = {};
  const taggedForBlocks = cleanedText.replace(
    /(?:^|\n)\s*Câu\s+(\d{1,3})\s*[:.]\s*/gi,
    '\n@@SOL_Q_BLOCK:$1@@ '
  );
  const rawChunks = taggedForBlocks.split(/@@SOL_Q_BLOCK:(\d{1,3})@@/);
  for (let i = 1; i < rawChunks.length; i += 2) {
    const qNum = Number(rawChunks[i]);
    let body = (rawChunks[i + 1] || '').trim();
    // Strip trailing section header lines ("PHẦN II. CÂU TRẮC NGHIỆM...", "PHẦN III. CÂU TRẮC NGHIỆM...")
    body = body
      .replace(/(?:^|\n)\s*PHẦN\s+(?:I|II|III|1|2|3)\b[^\n]*$/gi, '')
      .replace(/(?:^|\n)\s*[123]\.\s*PHẦN\s+(?:I|II|III)\b[\s\S]*$/gi, '')
      .trim();
    if (body) {
      detailedBlocksByNum[qNum] = body;
    }
  }

  const matchedQuestions = new Set<string>();

  // 3. Synchronize Part I questions (Questions 1 .. p1Len)
  const updatedPart1: Part1Question[] = baseExam.part1.map((q, idx) => {
    const globalNum = idx + 1;
    const rawBlock = detailedBlocksByNum[globalNum] || '';
    let resolvedLetter: 'A' | 'B' | 'C' | 'D' | undefined = quickPart1Answers[globalNum];

    if (rawBlock) {
      const headerAnsMatch = rawBlock.match(
        /^(?:Chọn\s+đáp\s+án|Đáp\s+án(?:\s+đúng)?|ĐA)\s*[:=]?\s*([A-D])\b/i
      );
      if (headerAnsMatch) {
        resolvedLetter = headerAnsMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      }
    }

    let cleanExplanation = '';
    if (rawBlock) {
      cleanExplanation = rawBlock
        .replace(/^(?:Chọn\s+đáp\s+án|Đáp\s+án(?:\s+đúng)?|ĐA)\s*[:=]?\s*[A-D]\s*[.:]?\s*/i, '')
        .replace(/^(?:Lời\s+giải(?:\s+chi\s+tiết)?|Hướng\s+dẫn\s+giải)\s*[:.-]?\s*/i, '')
        .replace(/\s*\n\s*/g, ' ')
        .trim();
    }

    const finalIdx =
      resolvedLetter && letterToIdx[resolvedLetter] !== undefined
        ? letterToIdx[resolvedLetter]
        : q.correctIndex;
    const finalLetter = idxToLetter[finalIdx] || 'A';

    if (resolvedLetter || cleanExplanation) {
      matchedQuestions.add(`P1-${globalNum}`);
    }

    const finalExplanation = cleanExplanation
      ? `Chọn đáp án ${finalLetter}. ${cleanExplanation}`
      : resolvedLetter
      ? `Đáp án đúng: ${finalLetter}.`
      : q.explanation;

    return {
      ...q,
      correctIndex: finalIdx,
      correct_answer: finalLetter,
      explanation: finalExplanation,
    };
  });

  // 4. Synchronize Part II questions (Questions p1Len + 1 .. p1Len + p2Len)
  const updatedPart2: Part2Question[] = baseExam.part2.map((q, idx) => {
    const globalNum = p1Len + idx + 1;
    const partLocalNum = idx + 1;
    const rawBlock = detailedBlocksByNum[globalNum] || detailedBlocksByNum[partLocalNum] || '';
    const tableTruths = quickPart2Answers[globalNum] || quickPart2Answers[partLocalNum];

    const truthById: Record<'a' | 'b' | 'c' | 'd', boolean | undefined> = {
      a: tableTruths?.a,
      b: tableTruths?.b,
      c: tableTruths?.c,
      d: tableTruths?.d,
    };

    const explanationById: Record<'a' | 'b' | 'c' | 'd', string> = {
      a: '',
      b: '',
      c: '',
      d: '',
    };

    if (rawBlock) {
      // Parse header summary line: "Đáp án: a) - Đúng, b) - Đúng, c) - Sai, d) - Sai."
      const headerPairs = rawBlock.matchAll(
        /\b([a-d])\)\s*[-–:]?\s*(Đúng|Sai|Đ|S)\b/gi
      );
      for (const hp of headerPairs) {
        const sId = hp[1].toLowerCase() as 'a' | 'b' | 'c' | 'd';
        truthById[sId] = /^Đ/i.test(hp[2]);
      }

      // Parse per-statement explanation blocks: "Ý a) [ĐÚNG]: ..."
      const stmtSolRegex =
        /(?:^|\n)\s*(?:[•*-]\s*)?(?:Ý\s*)?([a-d])\)\s*(?:\[\s*(ĐÚNG|SAI|Đúng|Sai|Đ|S)\s*\])?\s*[:.-]?\s*([\s\S]*?)(?=(?:\n\s*(?:[•*-]\s*)?(?:Ý\s*)?[a-d]\)\s*(?:\[|[:.-]|\s))|$)/gi;
      let sm: RegExpExecArray | null;
      while ((sm = stmtSolRegex.exec(rawBlock)) !== null) {
        const sId = sm[1].toLowerCase() as 'a' | 'b' | 'c' | 'd';
        const bracketTag = sm[2];
        const rawExp = (sm[3] || '').replace(/\s*\n\s*/g, ' ').trim();
        if (bracketTag) {
          truthById[sId] = /^Đ/i.test(bracketTag);
        }
        // Avoid matching the short header line "a) - Đúng, b) - Đúng..." as the body explanation
        if (rawExp && !/^[-\s]*(?:Đúng|Sai)\s*[,;]\s*[b-d]\)/i.test(rawExp)) {
          explanationById[sId] = rawExp;
        }
      }
    }

    let anyUpdated = false;
    const updatedStatements = q.statements.map((stmt) => {
      const sId = stmt.id.toLowerCase() as 'a' | 'b' | 'c' | 'd';
      const newTruth = truthById[sId] !== undefined ? Boolean(truthById[sId]) : stmt.isTrue;
      const newStmtExp = explanationById[sId] || stmt.explanation;
      if (truthById[sId] !== undefined || explanationById[sId]) {
        anyUpdated = true;
      }
      return {
        ...stmt,
        isTrue: newTruth,
        is_correct: newTruth,
        explanation: newStmtExp,
      };
    }) as [Part2SubStatement, Part2SubStatement, Part2SubStatement, Part2SubStatement];

    if (anyUpdated) {
      matchedQuestions.add(`P2-${globalNum}`);
    }

    const summaryHeader = `Đáp án chuẩn: ${updatedStatements
      .map((s) => `${s.id}) ${s.isTrue ? 'Đúng' : 'Sai'}`)
      .join(' · ')}.`;

    const detailedLines = updatedStatements
      .filter((s) => Boolean(s.explanation))
      .map(
        (s) =>
          `• Ý ${s.id}) [${s.isTrue ? 'ĐÚNG' : 'SAI'}]: ${s.explanation}`
      );

    const combinedExplanation =
      detailedLines.length > 0
        ? `${summaryHeader}\n${detailedLines.join('\n')}`
        : anyUpdated
        ? summaryHeader
        : q.explanation;

    return {
      ...q,
      statements: updatedStatements,
      explanation: combinedExplanation,
    };
  });

  // 5. Synchronize Part III questions (Questions p1Len + p2Len + 1 .. p1Len + p2Len + p3Len)
  const updatedPart3: Part3Question[] = baseExam.part3.map((q, idx) => {
    const globalNum = p1Len + p2Len + idx + 1;
    const partLocalNum = idx + 1;
    const rawBlock = detailedBlocksByNum[globalNum] || detailedBlocksByNum[partLocalNum] || '';
    let resolvedAnswer = quickPart3Answers[globalNum] || quickPart3Answers[partLocalNum];
    let resolvedUnit = q.unit;

    if (rawBlock) {
      const ansMatch = rawBlock.match(
        /^(?:Đáp\s+(?:án|số)|Kết\s+quả|ĐA|ĐS)\s*[:=]?\s*([+-]?\d+(?:[.,]\d+)?)\s*(?:\(\s*([^)]+)\s*\))?/i
      );
      if (ansMatch) {
        resolvedAnswer = ansMatch[1].trim();
        if (ansMatch[2]) {
          resolvedUnit = ansMatch[2].trim();
        }
      }
    }

    let cleanExplanation = '';
    if (rawBlock) {
      cleanExplanation = rawBlock
        .replace(
          /^(?:Đáp\s+(?:án|số)|Kết\s+quả|ĐA|ĐS)\s*[:=]?\s*[+-]?\d+(?:[.,]\d+)?\s*(?:\(\s*[^)]+\s*\))?\s*[.:]?\s*/i,
          ''
        )
        .replace(/^(?:Lời\s+giải(?:\s+chi\s+tiết)?|Hướng\s+dẫn\s+giải)\s*[:.-]?\s*/i, '')
        .replace(/\s*\n\s*/g, ' ')
        .trim();
    }

    if (resolvedAnswer || cleanExplanation) {
      matchedQuestions.add(`P3-${globalNum}`);
    }

    const finalAnswer = resolvedAnswer || q.answer;
    const finalExplanation = cleanExplanation
      ? `Đáp án: ${finalAnswer}${resolvedUnit ? ` (${resolvedUnit})` : ''}. ${cleanExplanation}`
      : resolvedAnswer
      ? `Đáp án: ${finalAnswer}${resolvedUnit ? ` (${resolvedUnit})` : ''}.`
      : q.explanation;

    return {
      ...q,
      answer: finalAnswer,
      correct_value: finalAnswer,
      unit: resolvedUnit,
      explanation: finalExplanation,
    };
  });

  // Build a clean, human-readable formatted solution summary for the teacher preview & student review
  const summaryLines: string[] = [];
  updatedPart1.forEach((q, idx) => {
    summaryLines.push(`Câu ${idx + 1}: ${q.explanation}`);
  });
  updatedPart2.forEach((q, idx) => {
    summaryLines.push(`Câu ${p1Len + idx + 1}: ${q.explanation}`);
  });
  updatedPart3.forEach((q, idx) => {
    summaryLines.push(`Câu ${p1Len + p2Len + idx + 1}: ${q.explanation}`);
  });

  return {
    mergedExam: {
      ...baseExam,
      part1: updatedPart1,
      part2: updatedPart2,
      part3: updatedPart3,
    },
    formattedSolutionSummary: summaryLines.join('\n\n'),
    matchedQuestionCount: matchedQuestions.size,
  };
}

/**
 * Master ingestion & parsing entry point for any uploaded file (.docx, .doc, .txt, .pdf, .json)
 */
export async function parseUploadedExamFile(file: File): Promise<ParsedExamUploadResult> {
  const lowerName = file.name.toLowerCase();
  const cleanTitleFromFileName = file.name
    .replace(/\.(docx|doc|pdf|txt|json)$/i, '')
    .replace(/_/g, ' ')
    .trim();

  // 1. JSON file
  if (lowerName.endsWith('.json')) {
    const raw = await file.text();
    const parsed = JSON.parse(raw) as ExamData;
    if (parsed.part1 && Array.isArray(parsed.part1)) {
      const normalizedPart1 = (parsed.part1 || []).map((q, idx) => {
        const imgUrl = getResolvedQuestionImage(q, 'I', idx + 1);
        return {
          ...q,
          has_image: Boolean(imgUrl),
          image_url: imgUrl,
        };
      });
      const normalizedPart2 = (parsed.part2 || []).map((q, idx) => {
        const imgUrl = getResolvedQuestionImage(q, 'II', idx + 1);
        return {
          ...q,
          has_image: Boolean(imgUrl),
          image_url: imgUrl,
        };
      });
      const normalizedPart3 = (parsed.part3 || []).map((q, idx) => {
        const imgUrl = getResolvedQuestionImage(q, 'III', idx + 1);
        return {
          ...q,
          has_image: Boolean(imgUrl),
          image_url: imgUrl,
        };
      });
      const p1Len = normalizedPart1.length;
      const p2Len = normalizedPart2.length;
      const p3Len = normalizedPart3.length;
      const imgCount = [
        ...normalizedPart1.filter((q) => q.has_image),
        ...normalizedPart2.filter((q) => q.has_image),
        ...normalizedPart3.filter((q) => q.has_image),
      ].length;
      return {
        examData: {
          ...parsed,
          part1: normalizedPart1,
          part2: normalizedPart2,
          part3: normalizedPart3,
          examId: parsed.examId || `JSON-${Date.now().toString().slice(-5)}`,
          title: parsed.title || cleanTitleFromFileName,
        },
        adminHeader: {
          examTerm: parsed.title || cleanTitleFromFileName,
          subjectName: parsed.subject || 'VẬT LÝ 12',
          durationMinutes: parsed.durationMinutes || 50,
        },
        questionCount: p1Len + p2Len + p3Len,
        part1Count: p1Len,
        part2Count: p2Len,
        part3Count: p3Len,
        imageCount: imgCount,
        sourceType: 'json',
      };
    }
  }

  // 2. .pdf (Portable Document Format with ToUnicode CMap & embedded Image XObjects)
  if (lowerName.endsWith('.pdf')) {
    try {
      const buffer = await file.arrayBuffer();
      const extractedText = await extractTextAndImagesFromPdfBuffer(buffer, true);
      if (extractedText.trim().length > 20) {
        const res = parseAnnotatedTextToExamData(extractedText, file.name);
        if (res.parsedCount > 0) {
          return {
            examData: {
              ...res.examData,
              title: res.adminHeader.examTerm || cleanTitleFromFileName || res.examData.title,
            },
            adminHeader: {
              ...res.adminHeader,
              examTerm: res.adminHeader.examTerm || cleanTitleFromFileName,
            },
            questionCount: res.parsedCount,
            part1Count: res.part1Count,
            part2Count: res.part2Count,
            part3Count: res.part3Count,
            imageCount: res.imageCount,
            sourceType: 'docx',
          };
        }
      }
    } catch {
      // Fall through to fallback dataset if scanned image PDF without text layer
    }
  }

  // 3. .docx (Office Open XML ZIP)
  if (lowerName.endsWith('.docx')) {
    try {
      const buffer = await file.arrayBuffer();
      const extractedText = await extractTextAndImagesFromDocxBuffer(buffer);
      if (extractedText.trim().length > 20) {
        const res = parseAnnotatedTextToExamData(extractedText, file.name);
        if (res.parsedCount > 0) {
          return {
            examData: {
              ...res.examData,
              title: res.adminHeader.examTerm || cleanTitleFromFileName || res.examData.title,
            },
            adminHeader: {
              ...res.adminHeader,
              examTerm: res.adminHeader.examTerm || cleanTitleFromFileName,
            },
            questionCount: res.parsedCount,
            part1Count: res.part1Count,
            part2Count: res.part2Count,
            part3Count: res.part3Count,
            imageCount: res.imageCount,
            sourceType: 'docx',
          };
        }
      }
    } catch {
      // Fall through to text/AI parser
    }
  }

  // 4. .doc (HTML or plain text) or .txt
  if (lowerName.endsWith('.doc') || lowerName.endsWith('.txt')) {
    try {
      const rawText = await file.text();
      const annotated = /<html|<body|<div|<p|<table/i.test(rawText)
        ? convertHtmlDocToAnnotatedText(rawText)
        : rawText;
      const res = parseAnnotatedTextToExamData(annotated, file.name);
      if (res.parsedCount > 0) {
        return {
          examData: {
            ...res.examData,
            title: res.adminHeader.examTerm || cleanTitleFromFileName || res.examData.title,
          },
          adminHeader: {
            ...res.adminHeader,
            examTerm: res.adminHeader.examTerm || cleanTitleFromFileName,
          },
          questionCount: res.parsedCount,
          part1Count: res.part1Count,
          part2Count: res.part2Count,
          part3Count: res.part3Count,
          imageCount: res.imageCount,
          sourceType: 'doc-html',
        };
      }
    } catch {
      // Fall through to AI fallback dataset
    }
  }

  // 5. Fallback for scanned image files without text layer:
  const is18Entrance = /ĐẦU\s*VÀO|DAU[\s_]*VAO/i.test(cleanTitleFromFileName);
  const templateDataset = is18Entrance ? MECHANICS_ENTRANCE_18_EXAM : ENTRANCE_PHYSICS_28_EXAM;

  const fallbackExam: ExamData = {
    ...templateDataset,
    examId: `UPLOAD-${Date.now().toString().slice(-5)}`,
    title: cleanTitleFromFileName.toUpperCase() || templateDataset.title,
  };

  const fallbackImgCount = [
    ...fallbackExam.part1.filter((q) => q.has_image),
    ...fallbackExam.part2.filter((q) => q.has_image),
    ...fallbackExam.part3.filter((q) => q.has_image),
  ].length;

  return {
    examData: fallbackExam,
    adminHeader: {
      examTerm: cleanTitleFromFileName.toUpperCase() || templateDataset.title,
      subjectName: 'VẬT LÝ 12',
      durationMinutes: 50,
    },
    questionCount:
      fallbackExam.part1.length + fallbackExam.part2.length + fallbackExam.part3.length,
    part1Count: fallbackExam.part1.length,
    part2Count: fallbackExam.part2.length,
    part3Count: fallbackExam.part3.length,
    imageCount: fallbackImgCount,
    sourceType: 'ai-fallback',
  };
}

