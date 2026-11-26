import { ExamData, ScrambledExamVariant } from '../types/exam';
import {
  DISPLACEMENT_TRIANGLE_SVG_DATA_URI,
  VELOCITY_TIME_GRAPH_SVG_DATA_URI,
  HEAT_VS_TEMP_GRAPH_HINH1_SVG_DATA_URI,
  WATER_HEATING_GRAPH_HINH2_SVG_DATA_URI,
  THERMAL_EQUILIBRIUM_GRAPH_HINH3_SVG_DATA_URI,
} from './examDocumentParser';

export interface ScramblerExportMetadata {
  governingBody: string;
  schoolName: string;
  examTerm: string;
  subjectName: string;
  schoolYear?: string;
  examDuration: number;
  questionLabel: string;
  questionSeparator: string;
  restartIndexPerPart: boolean;
  optionsInTable?: boolean;
  answerTablePlacement?: 'Không' | 'Ở cuối đề thi' | 'Bảng riêng';
  mergeOutputFile: boolean;
}

/**
 * Convert LaTeX inline/display strings into clean, human-readable HTML/Unicode math for Word (.doc)
 */
export function latexToWordReadableHtml(input: string): string {
  if (!input) return '';

  const transformMathSegment = (math: string): string => {
    let s = math.trim();
    // Overline: \overline{E} -> Ē
    s = s.replace(/\\overline\{([^{}]+)\}/g, '$1&#772;');
    // Calligraphic: \mathcal{E} -> ℰ
    s = s.replace(/\\mathcal\{E\}/g, 'ℰ');
    s = s.replace(/\\mathcal\{([^{}]+)\}/g, '$1');
    // Fractions: \frac{a}{b} -> (a)/(b)
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
    s = s.replace(/\\dfrac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
    // Square roots: \sqrt{x} -> √(x)
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');
    // Vectors: \vec{B} -> B⃗
    s = s.replace(/\\vec\{([^{}]+)\}/g, '$1&#8407;');
    // Text blocks: \text{...} -> ...
    s = s.replace(/\\text\{([^{}]+)\}/g, '$1');
    s = s.replace(/\\mathrm\{([^{}]+)\}/g, '$1');
    // Escaped spaces
    s = s.replace(/\\\s+/g, ' ');
    // Greek letters & physics symbols
    const replacements: Record<string, string> = {
      '\\omega': 'ω',
      '\\Omega': 'Ω',
      '\\alpha': 'α',
      '\\beta': 'β',
      '\\gamma': 'γ',
      '\\delta': 'δ',
      '\\Delta': 'Δ',
      '\\varphi': 'φ',
      '\\phi': 'φ',
      '\\Phi': 'Φ',
      '\\pi': 'π',
      '\\lambda': 'λ',
      '\\mu': 'μ',
      '\\varepsilon': 'ε',
      '\\epsilon': 'ε',
      '\\rho': 'ρ',
      '\\sigma': 'σ',
      '\\tau': 'τ',
      '\\theta': 'θ',
      '\\cdot': '·',
      '\\times': '×',
      '\\pm': '±',
      '\\le': '≤',
      '\\leq': '≤',
      '\\ge': '≥',
      '\\geq': '≥',
      '\\neq': '≠',
      '\\approx': '≈',
      '\\infty': '∞',
      '\\Rightarrow': '⇒',
      '\\rightarrow': '→',
      '\\cos': 'cos',
      '\\sin': 'sin',
      '\\tan': 'tan',
      '\\ln': 'ln',
      '\\max': 'max',
      '\\min': 'min',
      '\\const': 'const',
      '^{\\circ}': '°',
      '^\\circ': '°',
      '\\%': '%',
    };
    for (const [k, v] of Object.entries(replacements)) {
      s = s.split(k).join(v);
    }
    // Superscripts and subscripts: ^{...}, _{...}, ^2, _1
    s = s.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
    s = s.replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>');
    s = s.replace(/\^([+-]?[0-9]+|[a-zA-Z]{1,4}(?![a-zA-Z0-9_]))/g, '<sup>$1</sup>');
    s = s.replace(/_([0-9]+|[a-zA-Z\u00C0-\u1EF9]{1,12}(?![a-zA-Z0-9\u00C0-\u1EF9_]))/g, '<sub>$1</sub>');
    // Clean remaining backslashes on common commands
    s = s.replace(/\\left/g, '').replace(/\\right/g, '');
    return `<span style="font-family:'Cambria Math','Times New Roman',serif;font-style:italic;">${s}</span>`;
  };

  // Clean stray $$!⃗ or math artifacts if any, then replace $$...$$ and $...$
  let out = input.replace(/\$\$\s*!\u20d7/g, '&#8407;');
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => transformMathSegment(m));
  out = out.replace(/\$([^$]+?)\$/g, (_, m) => transformMathSegment(m));
  // Convert _{...}, ^{...}, and bare subscripts/superscripts outside $...$ into sub/sup (supporting adjacent p_1V_1 = p_2V_2)
  out = out.replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>');
  out = out.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
  out = out.replace(
    /([a-zA-Z0-9\u0394\u03b8Đđ)\]])_([0-9]+|[a-zA-Z\u00C0-\u1EF9]{1,12}(?![a-zA-Z0-9\u00C0-\u1EF9_]))/g,
    '$1<sub>$2</sub>'
  );
  out = out.replace(
    /([a-zA-Z0-9\u0394\u03b8Đđ)\]])\^([+-]?[0-9]+|[a-zA-Z]{1,4}(?![a-zA-Z0-9\u00C0-\u1EF9_]))/g,
    '$1<sup>$2</sup>'
  );
  // Format @@TABLE_START@@...@@TABLE_END@@ into an HTML bordered table for Word/Preview
  out = out.replace(/@@TABLE_START@@([\s\S]*?)@@TABLE_END@@/g, (_, payload: string) => {
    const rows = payload
      .split('@@ROW@@')
      .map((r) => r.split('@@CELL@@').map((c) => c.trim()))
      .filter((r) => r.some(Boolean));
    if (rows.length === 0) return '';
    const trsHtml = rows
      .map((row, rIdx) => {
        const bg = rIdx === 0 ? 'background-color:#1e3a5f;color:#ffffff;font-weight:bold;' : '';
        const tag = rIdx === 0 ? 'th' : 'td';
        const cellsHtml = row
          .map(
            (cell) =>
              `<${tag} style="border:1pt solid #64748b;padding:4pt 10pt;text-align:center;${bg}">${cell}</${tag}>`
          )
          .join('');
        return `<tr>${cellsHtml}</tr>`;
      })
      .join('');
    return `<div style="margin:6pt 0;"><table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;margin:0 auto;border:1pt solid #64748b;">${trsHtml}</table></div>`;
  });
  return out;
}

/**
 * Ensure any image URI embedded in Word (.doc) HTML is a raster PNG/JPEG data URI
 * (since Microsoft Word rejects data:image/svg+xml with "The linked image cannot be displayed").
 */
function ensureWordCompatibleImageSrc(imageUrl?: string, contextText = ''): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('data:image/png') || imageUrl.startsWith('data:image/jpeg')) {
    return imageUrl;
  }
  const decoded = imageUrl.startsWith('data:image/svg+xml')
    ? decodeURIComponent(imageUrl)
    : imageUrl;
  const combined = `${decoded} ${contextText}`;
  if (/Hình\s*1|Chất\s*A|25[,.]2/i.test(combined)) {
    return HEAT_VS_TEMP_GRAPH_HINH1_SVG_DATA_URI;
  }
  if (/Hình\s*2|Thực\s*nghiệm|t\s*\(phút\)/i.test(combined)) {
    return WATER_HEATING_GRAPH_HINH2_SVG_DATA_URI;
  }
  if (/Hình\s*3|Hợp\s*kim|T_cb/i.test(combined)) {
    return THERMAL_EQUILIBRIUM_GRAPH_HINH3_SVG_DATA_URI;
  }
  if (/v\s*\(m\/s\)|30/i.test(combined)) {
    return VELOCITY_TIME_GRAPH_SVG_DATA_URI;
  }
  if (/4\s*km/i.test(combined)) {
    return DISPLACEMENT_TRIANGLE_SVG_DATA_URI;
  }
  return HEAT_VS_TEMP_GRAPH_HINH1_SVG_DATA_URI;
}

/**
 * Measure plain text character length of an option after stripping LaTeX/HTML tags
 */
function getPlainOptionTextLength(rawOpt: string): number {
  const html = latexToWordReadableHtml(rawOpt || '');
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&#\d+;/g, 'x')
    .replace(/&[a-zA-Z]+;/g, 'x')
    .trim().length;
}

/**
 * Render 4 multiple-choice options WITHOUT any <table>:
 * - Short options (maxLen <= 15): 1 line with 4 options (aligned via Word tab-stops)
 * - Medium options (15 < maxLen <= 34): 2 lines with 2 options per line (aligned via Word tab-stops)
 * - Long options (maxLen > 34): 4 lines with 1 option per line
 */
function buildNonTableOptionsHtml(
  options: [string, string, string, string] | string[],
  correctIndex?: number,
  highlightCorrect = false
): string {
  const letters = ['A', 'B', 'C', 'D'];
  const safeOpts = [
    options[0] || '',
    options[1] || '',
    options[2] || '',
    options[3] || '',
  ];

  const lengths = safeOpts.map((opt) => getPlainOptionTextLength(opt));
  const maxLen = Math.max(...lengths);

  const formatSingleOption = (oIdx: number): string => {
    const isCorrect = highlightCorrect && oIdx === correctIndex;
    const prefix = isCorrect
      ? `<b style="color:#dc2626;text-decoration:underline;">*${letters[oIdx]}.</b>`
      : `<b>${letters[oIdx]}.</b>`;
    return `${prefix} ${latexToWordReadableHtml(safeOpts[oIdx])}`;
  };

  // 1. Short options -> 1 line with all 4 options
  if (maxLen <= 15) {
    const tabSpan = '<span style="mso-tab-count:1">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>';
    return `
      <p style="margin:2pt 0 3pt 14pt;font-size:12pt;tab-stops:3.8cm 7.8cm 11.8cm;">
        ${formatSingleOption(0)}${tabSpan}${formatSingleOption(1)}${tabSpan}${formatSingleOption(2)}${tabSpan}${formatSingleOption(3)}
      </p>
    `;
  }

  // 2. Medium options -> 2 lines, 2 options per line
  if (maxLen <= 34) {
    const tabSpan = '<span style="mso-tab-count:1">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>';
    return `
      <p style="margin:2pt 0 2pt 14pt;font-size:12pt;tab-stops:8.2cm;">
        ${formatSingleOption(0)}${tabSpan}${formatSingleOption(1)}
      </p>
      <p style="margin:2pt 0 3pt 14pt;font-size:12pt;tab-stops:8.2cm;">
        ${formatSingleOption(2)}${tabSpan}${formatSingleOption(3)}
      </p>
    `;
  }

  // 3. Long options -> 4 lines, 1 option per line
  return safeOpts
    .map(
      (_, oIdx) =>
        `<p style="margin:2pt 0 ${oIdx === 3 ? '3pt' : '2pt'} 14pt;font-size:12pt;">${formatSingleOption(
          oIdx
        )}</p>`
    )
    .join('\n');
}

/**
 * Render 4 multiple-choice options INSIDE a clean Word <table> when "Đáp án trong bảng: Có" is enabled
 */
function buildTableOptionsHtml(
  options: [string, string, string, string] | string[],
  correctIndex?: number,
  highlightCorrect = false
): string {
  const letters = ['A', 'B', 'C', 'D'];
  const safeOpts = [
    options[0] || '',
    options[1] || '',
    options[2] || '',
    options[3] || '',
  ];

  const lengths = safeOpts.map((opt) => getPlainOptionTextLength(opt));
  const maxLen = Math.max(...lengths);

  const formatSingleOption = (oIdx: number): string => {
    const isCorrect = highlightCorrect && oIdx === correctIndex;
    const prefix = isCorrect
      ? `<b style="color:#dc2626;text-decoration:underline;">*${letters[oIdx]}.</b>`
      : `<b>${letters[oIdx]}.</b>`;
    return `${prefix} ${latexToWordReadableHtml(safeOpts[oIdx])}`;
  };

  if (maxLen <= 15) {
    return `
      <table style="width:100%;border-collapse:collapse;border:none;margin:2pt 0 3pt 10pt;font-size:12pt;">
        <tr>
          <td style="width:25%;border:none;padding:1pt 4pt;">${formatSingleOption(0)}</td>
          <td style="width:25%;border:none;padding:1pt 4pt;">${formatSingleOption(1)}</td>
          <td style="width:25%;border:none;padding:1pt 4pt;">${formatSingleOption(2)}</td>
          <td style="width:25%;border:none;padding:1pt 4pt;">${formatSingleOption(3)}</td>
        </tr>
      </table>
    `;
  }

  if (maxLen <= 34) {
    return `
      <table style="width:100%;border-collapse:collapse;border:none;margin:2pt 0 3pt 10pt;font-size:12pt;">
        <tr>
          <td style="width:50%;border:none;padding:1pt 4pt;">${formatSingleOption(0)}</td>
          <td style="width:50%;border:none;padding:1pt 4pt;">${formatSingleOption(1)}</td>
        </tr>
        <tr>
          <td style="width:50%;border:none;padding:1pt 4pt;">${formatSingleOption(2)}</td>
          <td style="width:50%;border:none;padding:1pt 4pt;">${formatSingleOption(3)}</td>
        </tr>
      </table>
    `;
  }

  return `
    <table style="width:100%;border-collapse:collapse;border:none;margin:2pt 0 3pt 10pt;font-size:12pt;">
      ${safeOpts
        .map(
          (_, oIdx) =>
            `<tr><td style="width:100%;border:none;padding:1pt 4pt;">${formatSingleOption(oIdx)}</td></tr>`
        )
        .join('\n')}
    </table>
  `;
}

/**
 * Build Word (.doc) HTML content for a single variant or merged variants
 */
export function buildVariantsWordDocHtml(
  variants: ScrambledExamVariant[],
  meta: ScramblerExportMetadata
): string {
  const letters = ['A', 'B', 'C', 'D'];

  const pageCssRules = variants
    .map(
      (_, vIdx) => `
    @page WordSection${vIdx + 1} {
      size: 21cm 29.7cm;
      margin: 1.5cm 1.5cm 1.8cm 1.8cm;
      mso-header-margin: 1.0cm;
      mso-footer-margin: 1.0cm;
      mso-footer: f${vIdx + 1};
    }
    div.WordSection${vIdx + 1} {
      page: WordSection${vIdx + 1};
    }`
    )
    .join('\n');

  const variantSectionsHtml = variants
    .map((v, vIdx) => {
      const totalQ = v.part1.length + v.part2.length + v.part3.length;
      const estimatedPages = Math.max(
        1,
        Math.min(8, Math.ceil((v.part1.length + v.part2.length * 1.6 + v.part3.length) / 7))
      );
      const schoolDisplay = /^TRƯỜNG\b/i.test((meta.schoolName || '').trim())
        ? (meta.schoolName || '').trim()
        : `TRƯỜNG ${(meta.schoolName || '').trim()}`;
      const rawYear = (meta.schoolYear || '2026 - 2027').trim();
      const schoolYearDisplay = /^NĂM\s*HỌC/i.test(rawYear)
        ? rawYear.toUpperCase()
        : `NĂM HỌC: ${rawYear}`;

      const part1Html = v.part1
        .map((q, idx) => {
          const num = idx + 1;
          const safeImgSrc =
            q.has_image && q.image_url
              ? ensureWordCompatibleImageSrc(q.image_url, q.question)
              : '';
          const imgHtml = safeImgSrc
            ? `<div style="margin:6pt 0;text-align:center;"><img src="${safeImgSrc}" width="380" alt="Hình minh họa Câu ${num}" style="width:380px;max-width:100%;height:auto;border:1px solid #cbd5e1;padding:4px;background:#ffffff;" /></div>`
            : '';
          const optionsHtml = meta.optionsInTable
            ? buildTableOptionsHtml(q.options)
            : buildNonTableOptionsHtml(q.options);
          return `
            <div style="margin-bottom:8pt;">
              <p style="margin:0 0 3pt 0;font-size:12pt;">
                <b>${meta.questionLabel} ${num}${meta.questionSeparator}</b> ${latexToWordReadableHtml(q.question)}
              </p>
              ${imgHtml}
              ${optionsHtml}
            </div>
          `;
        })
        .join('');

      const part2Html = v.part2
        .map((q, idx) => {
          const num = meta.restartIndexPerPart ? idx + 1 : v.part1.length + idx + 1;
          const safeImgSrc =
            q.has_image && q.image_url
              ? ensureWordCompatibleImageSrc(q.image_url, q.stem)
              : '';
          const imgHtml = safeImgSrc
            ? `<div style="margin:6pt 0;text-align:center;"><img src="${safeImgSrc}" width="380" alt="Hình minh họa Phần II Câu ${num}" style="width:380px;max-width:100%;height:auto;border:1px solid #cbd5e1;padding:4px;background:#ffffff;" /></div>`
            : '';
          const statementsHtml = q.statements
            .map(
              (st) =>
                `<p style="margin:2pt 0 2pt 14pt;font-size:12pt;"><b>${st.displayLabel})</b> ${latexToWordReadableHtml(st.text)}</p>`
            )
            .join('');
          return `
            <div style="margin-bottom:10pt;">
              <p style="margin:0 0 4pt 0;font-size:12pt;">
                <b>${meta.questionLabel} ${num}${meta.questionSeparator}</b> ${latexToWordReadableHtml(q.stem)}
              </p>
              ${imgHtml}
              ${statementsHtml}
            </div>
          `;
        })
        .join('');

      const part3Html = v.part3
        .map((q, idx) => {
          const num = meta.restartIndexPerPart
            ? idx + 1
            : v.part1.length + v.part2.length + idx + 1;
          const safeImgSrc =
            q.has_image && q.image_url
              ? ensureWordCompatibleImageSrc(q.image_url, q.question)
              : '';
          const imgHtml = safeImgSrc
            ? `<div style="margin:6pt 0;text-align:center;"><img src="${safeImgSrc}" width="380" alt="Hình minh họa Phần III Câu ${num}" style="width:380px;max-width:100%;height:auto;border:1px solid #cbd5e1;padding:4px;background:#ffffff;" /></div>`
            : '';
          return `
            <div style="margin-bottom:8pt;">
              <p style="margin:0 0 3pt 0;font-size:12pt;">
                <b>${meta.questionLabel} ${num}${meta.questionSeparator}</b> ${latexToWordReadableHtml(q.question)}
              </p>
              ${imgHtml}
            </div>
          `;
        })
        .join('');

      const govDisplay =
        !meta.governingBody ||
        /^SỞ\s+GIÁO\s+DỤC\s+VÀ\s+ĐÀO\s+TẠO\s+TP\s+ĐÀ\s+NẴNG$/i.test(meta.governingBody.trim())
          ? 'SỞ GD & ĐT TP ĐÀ NẴNG'
          : meta.governingBody.trim();

      return `
        <div class="WordSection${vIdx + 1}" style="${vIdx > 0 ? 'page-break-before:always;' : ''}">
          <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:6pt;">
            <tr>
              <td style="width:44%;text-align:center;vertical-align:top;font-size:12pt;border:none;padding:0 4pt 0 0;">
                <div>${govDisplay}</div>
                <div style="font-weight:bold;text-decoration:underline;">${schoolDisplay}</div>
                <div style="font-style:italic;font-size:11pt;margin-top:2pt;">(Đề thi gồm ${totalQ} câu)</div>
              </td>
              <td style="width:56%;text-align:center;vertical-align:top;font-size:12pt;border:none;padding:0 0 0 4pt;">
                <div style="font-weight:bold;font-size:12pt;text-transform:uppercase;">${meta.examTerm}</div>
                <div style="font-weight:bold;font-size:12pt;">Môn: ${meta.subjectName}</div>
                <div style="font-weight:bold;font-size:12pt;">${schoolYearDisplay}</div>
                <div style="font-size:12pt;">Thời gian làm bài: ${meta.examDuration} phút (không kể thời gian phát đề)</div>
                <table align="center" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:4pt auto 0 auto;width:auto;">
                  <tr>
                    <td style="border:1.5pt solid #000000;padding:2pt 10pt;font-weight:bold;font-size:12pt;text-align:center;white-space:nowrap;">
                      MÃ ĐỀ: ${v.code}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <p style="margin:6pt 0 8pt 0;font-size:12pt;">
            <b>Họ và tên thí sinh:</b> ..........................................................
            <b>Số báo danh:</b> ........................
          </p>

          <h3 style="font-size:12pt;margin:10pt 0 4pt 0;text-transform:uppercase;">
            PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (${v.part1.length} câu)
          </h3>
          <p style="font-size:12pt;font-style:italic;margin:0 0 8pt 0;">
            Thí sinh trả lời từ câu 1 đến câu ${v.part1.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.
          </p>
          ${part1Html}

          <h3 style="font-size:12pt;margin:12pt 0 4pt 0;text-transform:uppercase;">
            PHẦN II. Câu trắc nghiệm đúng sai (${v.part2.length} câu)
          </h3>
          <p style="font-size:12pt;font-style:italic;margin:0 0 8pt 0;">
            Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.
          </p>
          ${part2Html}

          <h3 style="font-size:12pt;margin:12pt 0 4pt 0;text-transform:uppercase;">
            PHẦN III. Câu trắc nghiệm trả lời ngắn (${v.part3.length} câu)
          </h3>
          <p style="font-size:12pt;font-style:italic;margin:0 0 8pt 0;">
            Thí sinh trả lời bằng cách điền giá trị số vào phiếu trả lời.
          </p>
          ${part3Html}

          <p style="text-align:center;font-weight:bold;margin-top:16pt;">--- HẾT ---</p>
        </div>
      `;
    })
    .join('\n');

  const hiddenFootersHtml = variants
    .map(
      (v, vIdx) => `
        <div style="mso-element:footer" id="f${vIdx + 1}">
          <p class="MsoFooter" align="right" style="text-align:right;margin:0;font-family:'Times New Roman',Times,serif;font-size:11pt;">
            Mã đề ${v.code} - Trang <!--[if supportFields]><span style="mso-element:field-begin"></span> PAGE <span style="mso-element:field-separator"></span><![endif]--><!--[if !supportFields]-->1<!--[endif]--><!--[if supportFields]><span style="mso-element:field-end"></span><![endif]-->/<!--[if supportFields]><span style="mso-element:field-begin"></span> SECTIONPAGES <span style="mso-element:field-separator"></span><![endif]--><!--[if !supportFields]-->4<!--[endif]--><!--[if supportFields]><span style="mso-element:field-end"></span><![endif]-->
          </p>
        </div>`
    )
    .join('\n');

  return `\ufeff<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${meta.examTerm} - ${meta.subjectName}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.35;
      color: #000000;
    }
    table { border-collapse: collapse; }
    p.MsoFooter, li.MsoFooter, div.MsoFooter {
      margin: 0cm;
      text-align: right;
      font-size: 11pt;
      font-family: "Times New Roman", Times, serif;
    }
    table#hrdftrtbl {
      margin: 0in 0in 0in 900in;
      width: 1px;
      height: 1px;
      overflow: hidden;
    }
    ${pageCssRules}
  </style>
</head>
<body>
  ${variantSectionsHtml}
  <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td>
        ${hiddenFootersHtml}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build Printable Master Answer Key Matrix Word (.doc) across all variants
 */
export function buildMasterAnswerKeyWordHtml(
  variants: ScrambledExamVariant[],
  meta: ScramblerExportMetadata
): string {
  const letters = ['A', 'B', 'C', 'D'];
  const p1Len = variants[0]?.part1.length || 0;
  const p2Len = variants[0]?.part2.length || 0;
  const p3Len = variants[0]?.part3.length || 0;
  const govDisplay =
    !meta.governingBody ||
    /^SỞ\s+GIÁO\s+DỤC\s+VÀ\s+ĐÀO\s+TẠO\s+TP\s+ĐÀ\s+NẴNG$/i.test(meta.governingBody.trim())
      ? 'SỞ GD & ĐT TP ĐÀ NẴNG'
      : meta.governingBody.trim();

  const headerCols = variants
    .map(
      (v) =>
        `<th style="border:1px solid #000;padding:6px;background:#ede9fe;text-align:center;font-family:'Times New Roman',Times,serif;">Mã đề ${v.code}</th>`
    )
    .join('');

  const p1Rows = Array.from({ length: p1Len }, (_, qIdx) => {
    const cells = variants
      .map((v) => {
        const sq = v.part1[qIdx];
        return `<td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;font-family:'Times New Roman',Times,serif;">${
          sq ? letters[sq.correctIndex] : '-'
        }</td>`;
      })
      .join('');
    return `<tr><td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;font-family:'Times New Roman',Times,serif;">${
      meta.questionLabel || 'Câu'
    } ${qIdx + 1}</td>${cells}</tr>`;
  }).join('');

  const p2Rows = Array.from({ length: p2Len }, (_, qIdx) => {
    const displayNum = meta.restartIndexPerPart ? qIdx + 1 : p1Len + qIdx + 1;
    const cells = variants
      .map((v) => {
        const sq = v.part2[qIdx];
        const seq = sq
          ? sq.statements.map((s) => (s.isTrue ? 'Đ' : 'S')).join('')
          : '-';
        return `<td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;font-family:'Times New Roman',Times,serif;">${seq}</td>`;
      })
      .join('');
    return `<tr><td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;font-family:'Times New Roman',Times,serif;">${
      meta.questionLabel || 'Câu'
    } ${displayNum}</td>${cells}</tr>`;
  }).join('');

  const p3Rows = Array.from({ length: p3Len }, (_, qIdx) => {
    const displayNum = meta.restartIndexPerPart ? qIdx + 1 : p1Len + p2Len + qIdx + 1;
    const cells = variants
      .map((v) => {
        const sq = v.part3[qIdx];
        return `<td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;font-family:'Times New Roman',Times,serif;">${
          sq ? sq.answer : '-'
        }</td>`;
      })
      .join('');
    return `<tr><td style="border:1px solid #000;padding:5px;text-align:center;font-weight:bold;font-family:'Times New Roman',Times,serif;">${
      meta.questionLabel || 'Câu'
    } ${displayNum}</td>${cells}</tr>`;
  }).join('');

  return `\ufeff<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bảng Đáp Án Tổng Hợp - ${meta.subjectName}</title>
  <style>
    body, table, th, td, h2, h3, div { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #000; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16pt; }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:14pt;">
    <div style="font-size:11pt;">${govDisplay} · TRƯỜNG ${meta.schoolName}</div>
    <h2 style="margin:4pt 0;font-size:14pt;">BẢNG ĐÁP ÁN TỔNG HỢP CÁC MÃ ĐỀ (${variants
      .map((v) => v.code)
      .join(', ')})</h2>
    <div>${meta.examTerm} — Môn: <b>${meta.subjectName}</b> — Thời gian: ${meta.examDuration} phút</div>
  </div>

  <h3>PHẦN I. Trắc nghiệm nhiều lựa chọn (0,25 điểm / câu)</h3>
  <table>
    <thead><tr><th style="border:1px solid #000;padding:6px;background:#ede9fe;font-family:'Times New Roman',Times,serif;">Câu</th>${headerCols}</tr></thead>
    <tbody>${p1Rows}</tbody>
  </table>

  <h3>PHẦN II. Trắc nghiệm Đúng / Sai lũy tiến (Tối đa 1,00 điểm / câu)</h3>
  <table>
    <thead><tr><th style="border:1px solid #000;padding:6px;background:#ede9fe;font-family:'Times New Roman',Times,serif;">Câu</th>${headerCols}</tr></thead>
    <tbody>${p2Rows}</tbody>
  </table>

  <h3>PHẦN III. Trắc nghiệm trả lời ngắn (0,25 điểm / câu)</h3>
  <table>
    <thead><tr><th style="border:1px solid #000;padding:6px;background:#ede9fe;font-family:'Times New Roman',Times,serif;">Câu</th>${headerCols}</tr></thead>
    <tbody>${p3Rows}</tbody>
  </table>
</body>
</html>`;
}

/**
 * Build standard 2D matrix rows for TNMaker-2025 grading template:
 * - Row 1: ['Câu\\Mã Đề', code1, code2, ...]
 * - Part I rows: ['1'..'N', 'A'/'B'/'C'/'D', ...]
 * - Part II rows: ['1'..'M', 'SSĐS' (4-char Đ/S string), ...]
 * - Part III rows: ['1'..'K', shortAnswer, ...]
 */
export function buildTNMakerMatrixRows(variants: ScrambledExamVariant[]): string[][] {
  const letters = ['A', 'B', 'C', 'D'];
  const p1Len = variants[0]?.part1.length || 0;
  const p2Len = variants[0]?.part2.length || 0;
  const p3Len = variants[0]?.part3.length || 0;

  const matrix: string[][] = [];

  // Row 1: Header row
  matrix.push(['Câu\\Mã Đề', ...variants.map((v) => String(v.code))]);

  // Part I rows (1 .. p1Len)
  for (let qIdx = 0; qIdx < p1Len; qIdx++) {
    const row: string[] = [String(qIdx + 1)];
    for (const v of variants) {
      const sq = v.part1[qIdx];
      row.push(sq ? letters[sq.correctIndex] || 'A' : '');
    }
    matrix.push(row);
  }

  // Part II rows (1 .. p2Len, 4-char Đ/S sequence like SSĐS)
  for (let qIdx = 0; qIdx < p2Len; qIdx++) {
    const row: string[] = [String(qIdx + 1)];
    for (const v of variants) {
      const sq = v.part2[qIdx];
      const seq = sq ? sq.statements.map((s) => (s.isTrue ? 'Đ' : 'S')).join('') : '';
      row.push(seq);
    }
    matrix.push(row);
  }

  // Part III rows (1 .. p3Len, short answer string)
  for (let qIdx = 0; qIdx < p3Len; qIdx++) {
    const row: string[] = [String(qIdx + 1)];
    for (const v of variants) {
      const sq = v.part3[qIdx];
      row.push(sq ? String(sq.answer) : '');
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * Build Machine Scoring Key File (.csv, .xls, and .xlsx) matching (Mẫu) TNMaker-2025
 */
export function buildTNMakerCsvContent(variants: ScrambledExamVariant[]): string {
  const matrix = buildTNMakerMatrixRows(variants);
  const lines = matrix.map((row) =>
    row
      .map((cell) => {
        const str = String(cell ?? '');
        return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(',')
  );
  return '\ufeff' + lines.join('\r\n');
}

export function buildTNMakerExcelHtml(
  variants: ScrambledExamVariant[],
  _meta?: ScramblerExportMetadata
): string {
  const matrix = buildTNMakerMatrixRows(variants);
  const rowsHtml = matrix
    .map((row) => {
      const cellsHtml = row
        .map(
          (cell) =>
            `<td style="mso-number-format:'\\@';text-align:left;vertical-align:bottom;">${String(
              cell ?? ''
            )
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')}</td>`
        )
        .join('');
      return `<tr>${cellsHtml}</tr>`;
    })
    .join('\n      ');

  return `\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Sheet1</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
        <x:ExcelWorksheet>
          <x:Name>Sheet2</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body, table, td {
      font-family: "Aptos Narrow", Calibri, Arial, sans-serif;
      font-size: 11pt;
    }
    td {
      mso-number-format: "\\@";
    }
  </style>
</head>
<body>
  <table>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;
}

function getExcelColumnLetter(colIndexZeroBased: number): string {
  let n = colIndexZeroBased + 1;
  let colName = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    colName = String.fromCharCode(65 + rem) + colName;
    n = Math.floor((n - 1) / 26);
  }
  return colName;
}

/**
 * Build native OpenXML SpreadsheetML (.xlsx) bytes matching (Mẫu) TNMaker-2025
 */
export function buildTNMakerXlsxBytes(variants: ScrambledExamVariant[]): Uint8Array {
  const matrix = buildTNMakerMatrixRows(variants);

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const sheet1RowsXml = matrix
    .map((row, rIdx) => {
      const rowNum = rIdx + 1;
      const cellsXml = row
        .map((cellVal, cIdx) => {
          const ref = `${getExcelColumnLetter(cIdx)}${rowNum}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(cellVal ?? ''))}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join('');

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
    <sheet name="Sheet2" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1">
    <font>
      <sz val="11"/>
      <name val="Aptos Narrow"/>
    </font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="1">
    <xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
</styleSheet>`;

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheet1RowsXml}</sheetData>
</worksheet>`;

  const sheet2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData/>
</worksheet>`;

  return createZipArchiveUint8Array([
    { path: '[Content_Types].xml', content: contentTypesXml },
    { path: '_rels/.rels', content: rootRelsXml },
    { path: 'xl/workbook.xml', content: workbookXml },
    { path: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { path: 'xl/styles.xml', content: stylesXml },
    { path: 'xl/worksheets/sheet1.xml', content: sheet1Xml },
    { path: 'xl/worksheets/sheet2.xml', content: sheet2Xml },
  ]);
}

/**
 * Pure TypeScript Standard PKZIP Archive Generator (Uncompressed Store Method 0 + CRC32)
 * Produces a 100% valid .zip file containing all folder deliverables
 */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntryInput {
  path: string;
  content: string | Uint8Array;
}

export function createZipArchiveUint8Array(entries: ZipEntryInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const localFileParts: Uint8Array[] = [];
  const centralDirParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const dataBytes =
      typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content;
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header (30 bytes + file name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Local file header signature
    lv.setUint16(4, 20, true); // Version needed to extract
    lv.setUint16(6, 0x0800, true); // General purpose bit flag (UTF-8 filename)
    lv.setUint16(8, 0, true); // Compression method (0 = Store)
    lv.setUint16(10, 0x4800, true); // Last mod file time
    lv.setUint16(12, 0x5866, true); // Last mod file date
    lv.setUint32(14, crc, true); // CRC-32
    lv.setUint32(18, size, true); // Compressed size
    lv.setUint32(22, size, true); // Uncompressed size
    lv.setUint16(26, nameBytes.length, true); // File name length
    lv.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    localFileParts.push(localHeader, dataBytes);

    // Central directory file header (46 bytes + file name)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // Central directory signature
    cv.setUint16(4, 20, true); // Version made by
    cv.setUint16(6, 20, true); // Version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 flag
    cv.setUint16(10, 0, true); // Compression method (Store)
    cv.setUint16(12, 0x4800, true); // Time
    cv.setUint16(14, 0x5866, true); // Date
    cv.setUint32(16, crc, true); // CRC-32
    cv.setUint32(20, size, true); // Compressed size
    cv.setUint32(24, size, true); // Uncompressed size
    cv.setUint16(28, nameBytes.length, true); // File name length
    cv.setUint16(30, 0, true); // Extra field length
    cv.setUint16(32, 0, true); // File comment length
    cv.setUint16(34, 0, true); // Disk number start
    cv.setUint16(36, 0, true); // Internal file attributes
    cv.setUint32(38, 0, true); // External file attributes
    cv.setUint32(42, offset, true); // Relative offset of local header
    centralHeader.set(nameBytes, 46);

    centralDirParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralDirSize = centralDirParts.reduce((acc, arr) => acc + arr.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // End of central directory signature
  ev.setUint16(4, 0, true); // Number of this disk
  ev.setUint16(6, 0, true); // Disk where central directory starts
  ev.setUint16(8, entries.length, true); // Number of central directory records on this disk
  ev.setUint16(10, entries.length, true); // Total number of central directory records
  ev.setUint32(12, centralDirSize, true); // Size of central directory
  ev.setUint32(16, offset, true); // Offset of start of central directory
  ev.setUint16(20, 0, true); // Comment length

  const totalByteLength = offset + centralDirSize + eocd.length;
  const finalBuffer = new ArrayBuffer(totalByteLength);
  const finalBytes = new Uint8Array(finalBuffer);
  let writePos = 0;
  for (const part of localFileParts) {
    finalBytes.set(part, writePos);
    writePos += part.length;
  }
  for (const part of centralDirParts) {
    finalBytes.set(part, writePos);
    writePos += part.length;
  }
  finalBytes.set(eocd, writePos);

  return finalBytes;
}

export function createZipArchiveBlob(
  entries: ZipEntryInput[],
  mimeType = 'application/zip'
): Blob {
  const bytes = createZipArchiveUint8Array(entries);
  return new Blob([bytes.buffer as ArrayBuffer], {
    type: mimeType,
  });
}

function escapeXmlText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeHtmlEntitiesToUnicode(str: string): string {
  return str
    .replace(/&#8407;/g, '\u20d7')
    .replace(/&#772;/g, '\u0304')
    .replace(/&nbsp;/g, '\u00A0')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

interface DocxRunStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  vertAlign?: 'subscript' | 'superscript';
  sizeHalfPt?: number;
  borderBox?: boolean;
}

function buildOpenXmlRun(text: string, style: DocxRunStyle = {}): string {
  const cleanText = decodeHtmlEntitiesToUnicode(text);
  if (!cleanText) return '';
  const sz = style.sizeHalfPt || 24;
  const parts = cleanText.split(/\r?\n/);

  return parts
    .map((linePart, idx) => {
      const rPr = [
        '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>',
        style.bold ? '<w:b/><w:bCs/>' : '',
        style.italic ? '<w:i/><w:iCs/>' : '',
        style.underline ? '<w:u w:val="single"/>' : '',
        style.color ? `<w:color w:val="${style.color.replace(/^#/, '').toUpperCase()}"/>` : '',
        style.borderBox
          ? '<w:bdr w:val="single" w:sz="10" w:space="4" w:color="000000"/>'
          : '',
        `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`,
        style.vertAlign ? `<w:vertAlign w:val="${style.vertAlign}"/>` : '',
      ]
        .filter(Boolean)
        .join('');

      const brTag = idx > 0 ? '<w:br/>' : '';
      return `<w:r><w:rPr>${rPr}</w:rPr>${brTag}<w:t xml:space="preserve">${escapeXmlText(
        linePart
      )}</w:t></w:r>`;
    })
    .join('');
}

/**
 * Convert HTML formatted text from latexToWordReadableHtml into native OpenXML <w:r> runs
 */
function htmlInlineToOpenXmlRuns(html: string, baseStyle: DocxRunStyle = {}): string {
  if (!html) return '';
  const tagRegex = /<(\/?)(b|i|u|sub|sup|span)\b([^>]*)>/gi;
  const styleStack: DocxRunStyle[] = [{ ...baseStyle }];
  let lastIndex = 0;
  let resultXml = '';
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = html.slice(lastIndex, match.index).replace(/<[^>]+>/g, '');
      const currentStyle = styleStack[styleStack.length - 1];
      resultXml += buildOpenXmlRun(textChunk, currentStyle);
    }

    const isClosing = match[1] === '/';
    const tagName = match[2].toLowerCase();
    const attrs = match[3] || '';

    if (isClosing) {
      if (styleStack.length > 1) {
        styleStack.pop();
      }
    } else {
      const top = { ...styleStack[styleStack.length - 1] };
      if (tagName === 'b') top.bold = true;
      if (tagName === 'i') top.italic = true;
      if (tagName === 'u') top.underline = true;
      if (tagName === 'sub') top.vertAlign = 'subscript';
      if (tagName === 'sup') top.vertAlign = 'superscript';
      if (tagName === 'span') {
        if (/font-style\s*:\s*italic/i.test(attrs)) top.italic = true;
        if (/font-weight\s*:\s*bold/i.test(attrs)) top.bold = true;
        if (/text-decoration\s*:\s*underline/i.test(attrs)) top.underline = true;
        const colMatch = attrs.match(/color\s*:\s*#([0-9a-fA-F]{6})/i);
        if (colMatch) top.color = colMatch[1].toUpperCase();
      }
      styleStack.push(top);
    }

    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < html.length) {
    const remainingText = html.slice(lastIndex).replace(/<[^>]+>/g, '');
    const currentStyle = styleStack[styleStack.length - 1];
    resultXml += buildOpenXmlRun(remainingText, currentStyle);
  }

  return resultXml;
}

function base64DataUriToBytesAndDims(dataUri: string): {
  bytes: Uint8Array;
  ext: 'png' | 'jpeg' | 'gif';
  cx: number;
  cy: number;
} | null {
  const m = dataUri.match(/^data:image\/(png|jpeg|jpg|gif);base64,([\s\S]+)$/i);
  if (!m) return null;
  const rawMime = m[1].toLowerCase();
  const ext: 'png' | 'jpeg' | 'gif' =
    rawMime === 'png' ? 'png' : rawMime === 'gif' ? 'gif' : 'jpeg';
  const base64Clean = m[2].replace(/\s+/g, '');
  try {
    const binStr = atob(base64Clean);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }

    let widthPx = 460;
    let heightPx = 265;
    // Read exact PNG dimensions from IHDR chunk (bytes 16..23)
    if (ext === 'png' && bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const w = dv.getUint32(16, false);
      const h = dv.getUint32(20, false);
      if (w > 10 && h > 10 && w < 10000 && h < 10000) {
        widthPx = w;
        heightPx = h;
      }
    }

    // Target display width in Word: ~340px (3,238,500 EMUs ≈ 9.0 cm)
    const maxCx = 3238500;
    const ratio = heightPx / Math.max(1, widthPx);
    const cx = maxCx;
    const cy = Math.round(maxCx * ratio);

    return { bytes, ext, cx, cy };
  } catch {
    return null;
  }
}

function buildDocxDrawingParagraphXml(rId: string, imgIndex: number, cx: number, cy: number): string {
  return `<w:p>
    <w:pPr>
      <w:spacing w:before="80" w:after="80"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${cx}" cy="${cy}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:docPr id="${imgIndex}" name="Picture ${imgIndex}"/>
          <wp:cNvGraphicFramePr>
            <a:graphicFrameLocks noChangeAspect="1"/>
          </wp:cNvGraphicFramePr>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr>
                  <pic:cNvPr id="${imgIndex}" name="image${imgIndex}.png"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${rId}"/>
                  <a:stretch>
                    <a:fillRect/>
                  </a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="${cx}" cy="${cy}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect">
                    <a:avLst/>
                  </a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>`;
}

function buildDocxNonTableOptionsParagraphsXml(
  options: [string, string, string, string] | string[],
  correctIndex?: number,
  highlightCorrect = false
): string {
  const letters = ['A', 'B', 'C', 'D'];
  const safeOpts = [
    options[0] || '',
    options[1] || '',
    options[2] || '',
    options[3] || '',
  ];

  const lengths = safeOpts.map((opt) => getPlainOptionTextLength(opt));
  const maxLen = Math.max(...lengths);

  const buildSingleOptionRuns = (oIdx: number): string => {
    const isCorrect = highlightCorrect && oIdx === correctIndex;
    const prefixRun = isCorrect
      ? buildOpenXmlRun(`*${letters[oIdx]}. `, {
          bold: true,
          underline: true,
          color: 'DC2626',
        })
      : buildOpenXmlRun(`${letters[oIdx]}. `, { bold: true });
    const bodyRuns = htmlInlineToOpenXmlRuns(latexToWordReadableHtml(safeOpts[oIdx]));
    return `${prefixRun}${bodyRuns}`;
  };

  // 1. Short options (maxLen <= 15) -> 1 line with 4 options
  if (maxLen <= 15) {
    return `<w:p>
      <w:pPr>
        <w:tabs>
          <w:tab w:val="left" w:pos="2400"/>
          <w:tab w:val="left" w:pos="4650"/>
          <w:tab w:val="left" w:pos="6900"/>
        </w:tabs>
        <w:spacing w:before="40" w:after="60" w:line="276" w:lineRule="auto"/>
        <w:ind w:left="280"/>
      </w:pPr>
      ${buildSingleOptionRuns(0)}
      <w:r><w:tab/></w:r>
      ${buildSingleOptionRuns(1)}
      <w:r><w:tab/></w:r>
      ${buildSingleOptionRuns(2)}
      <w:r><w:tab/></w:r>
      ${buildSingleOptionRuns(3)}
    </w:p>`;
  }

  // 2. Medium options (15 < maxLen <= 34) -> 2 lines, 2 options per line
  if (maxLen <= 34) {
    return `<w:p>
      <w:pPr>
        <w:tabs>
          <w:tab w:val="left" w:pos="4800"/>
        </w:tabs>
        <w:spacing w:before="40" w:after="40" w:line="276" w:lineRule="auto"/>
        <w:ind w:left="280"/>
      </w:pPr>
      ${buildSingleOptionRuns(0)}
      <w:r><w:tab/></w:r>
      ${buildSingleOptionRuns(1)}
    </w:p>
    <w:p>
      <w:pPr>
        <w:tabs>
          <w:tab w:val="left" w:pos="4800"/>
        </w:tabs>
        <w:spacing w:before="40" w:after="60" w:line="276" w:lineRule="auto"/>
        <w:ind w:left="280"/>
      </w:pPr>
      ${buildSingleOptionRuns(2)}
      <w:r><w:tab/></w:r>
      ${buildSingleOptionRuns(3)}
    </w:p>`;
  }

  // 3. Long options (maxLen > 34) -> 4 lines, 1 option per line
  return safeOpts
    .map(
      (_, oIdx) => `<w:p>
        <w:pPr>
          <w:spacing w:before="40" w:after="${oIdx === 3 ? '60' : '40'}" w:line="276" w:lineRule="auto"/>
          <w:ind w:left="280"/>
        </w:pPr>
        ${buildSingleOptionRuns(oIdx)}
      </w:p>`
    )
    .join('\n');
}

/**
 * Render 4 multiple-choice options INSIDE an OpenXML Word Table (<w:tbl>) when "Đáp án trong bảng: Có" is enabled
 */
function buildDocxTableOptionsXml(
  options: [string, string, string, string] | string[],
  correctIndex?: number,
  highlightCorrect = false
): string {
  const letters = ['A', 'B', 'C', 'D'];
  const safeOpts = [
    options[0] || '',
    options[1] || '',
    options[2] || '',
    options[3] || '',
  ];

  const lengths = safeOpts.map((opt) => getPlainOptionTextLength(opt));
  const maxLen = Math.max(...lengths);

  const buildSingleOptionRuns = (oIdx: number): string => {
    const isCorrect = highlightCorrect && oIdx === correctIndex;
    const prefixRun = isCorrect
      ? buildOpenXmlRun(`*${letters[oIdx]}. `, {
          bold: true,
          underline: true,
          color: 'DC2626',
        })
      : buildOpenXmlRun(`${letters[oIdx]}. `, { bold: true });
    const bodyRuns = htmlInlineToOpenXmlRuns(latexToWordReadableHtml(safeOpts[oIdx]));
    return `${prefixRun}${bodyRuns}`;
  };

  const tblPrXml = `<w:tblPr>
    <w:tblW w:w="4800" w:type="pct"/>
    <w:tblInd w:w="280" w:type="dxa"/>
    <w:tblBorders>
      <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
    </w:tblBorders>
  </w:tblPr>`;

  if (maxLen <= 15) {
    return `<w:tbl>
      ${tblPrXml}
      <w:tblGrid>
        <w:gridCol w:w="2300"/>
        <w:gridCol w:w="2300"/>
        <w:gridCol w:w="2300"/>
        <w:gridCol w:w="2300"/>
      </w:tblGrid>
      <w:tr>
        ${[0, 1, 2, 3]
          .map(
            (oIdx) => `<w:tc>
          <w:tcPr><w:tcW w:w="1250" w:type="pct"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="20" w:after="40"/></w:pPr>
            ${buildSingleOptionRuns(oIdx)}
          </w:p>
        </w:tc>`
          )
          .join('\n')}
      </w:tr>
    </w:tbl>`;
  }

  if (maxLen <= 34) {
    return `<w:tbl>
      ${tblPrXml}
      <w:tblGrid>
        <w:gridCol w:w="4600"/>
        <w:gridCol w:w="4600"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2500" w:type="pct"/></w:tcPr>
          <w:p><w:pPr><w:spacing w:before="20" w:after="30"/></w:pPr>${buildSingleOptionRuns(0)}</w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2500" w:type="pct"/></w:tcPr>
          <w:p><w:pPr><w:spacing w:before="20" w:after="30"/></w:pPr>${buildSingleOptionRuns(1)}</w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2500" w:type="pct"/></w:tcPr>
          <w:p><w:pPr><w:spacing w:before="20" w:after="40"/></w:pPr>${buildSingleOptionRuns(2)}</w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2500" w:type="pct"/></w:tcPr>
          <w:p><w:pPr><w:spacing w:before="20" w:after="40"/></w:pPr>${buildSingleOptionRuns(3)}</w:p>
        </w:tc>
      </w:tr>
    </w:tbl>`;
  }

  return `<w:tbl>
    ${tblPrXml}
    <w:tblGrid><w:gridCol w:w="9200"/></w:tblGrid>
    ${[0, 1, 2, 3]
      .map(
        (oIdx) => `<w:tr>
      <w:tc>
        <w:tcPr><w:tcW w:w="5000" w:type="pct"/></w:tcPr>
        <w:p><w:pPr><w:spacing w:before="20" w:after="${oIdx === 3 ? '40' : '20'}"/></w:pPr>${buildSingleOptionRuns(oIdx)}</w:p>
      </w:tc>
    </w:tr>`
      )
      .join('\n')}
  </w:tbl>`;
}

function buildDocxFooterXml(code: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:jc w:val="right"/>
    </w:pPr>
    ${buildOpenXmlRun(`Mã đề ${code} - Trang `, { sizeHalfPt: 22 })}
    <w:fldSimple w:instr="PAGE">
      ${buildOpenXmlRun('1', { sizeHalfPt: 22 })}
    </w:fldSimple>
    ${buildOpenXmlRun('/', { sizeHalfPt: 22 })}
    <w:fldSimple w:instr="SECTIONPAGES">
      ${buildOpenXmlRun('4', { sizeHalfPt: 22 })}
    </w:fldSimple>
  </w:p>
</w:ftr>`;
}

const DOCX_STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="80" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
</w:styles>`;

const DOCX_SETTINGS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
</w:settings>`;

const DOCX_ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

/**
 * Build a genuine, native OpenXML (.docx) archive for one or multiple scrambled exam variants.
 * Opens, edits, and saves (Cmd+S / Ctrl+S) cleanly in Microsoft Word on macOS and Windows.
 */
export function buildVariantsWordDocxBytes(
  variants: ScrambledExamVariant[],
  meta: ScramblerExportMetadata
): Uint8Array {
  const letters = ['A', 'B', 'C', 'D'];
  const docxEntries: ZipEntryInput[] = [];
  const relEntries: string[] = [
    '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
  ];
  const contentTypeOverrides: string[] = [
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
    '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>',
  ];

  const imageUriToMeta = new Map<
    string,
    { rId: string; index: number; cx: number; cy: number }
  >();
  let nextImgIndex = 1;

  const registerImageForQuestion = (rawUrl?: string, contextText = ''): string => {
    const safeDataUri = ensureWordCompatibleImageSrc(rawUrl, contextText);
    if (!safeDataUri) return '';
    let existing = imageUriToMeta.get(safeDataUri);
    if (!existing) {
      const parsedImg = base64DataUriToBytesAndDims(safeDataUri);
      if (!parsedImg) return '';
      const idx = nextImgIndex++;
      const rId = `rIdImg${idx}`;
      const mediaFileName = `image${idx}.${parsedImg.ext}`;
      docxEntries.push({
        path: `word/media/${mediaFileName}`,
        content: parsedImg.bytes,
      });
      relEntries.push(
        `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaFileName}"/>`
      );
      existing = { rId, index: idx, cx: parsedImg.cx, cy: parsedImg.cy };
      imageUriToMeta.set(safeDataUri, existing);
    }
    return buildDocxDrawingParagraphXml(existing.rId, existing.index, existing.cx, existing.cy);
  };

  const bodySectionsXml: string[] = [];

  variants.forEach((v, vIdx) => {
    const ftrIndex = vIdx + 1;
    const ftrRelId = `rIdFtr${ftrIndex}`;
    docxEntries.push({
      path: `word/footer${ftrIndex}.xml`,
      content: buildDocxFooterXml(v.code),
    });
    relEntries.push(
      `<Relationship Id="${ftrRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer${ftrIndex}.xml"/>`
    );
    contentTypeOverrides.push(
      `<Override PartName="/word/footer${ftrIndex}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>`
    );

    const totalQ = v.part1.length + v.part2.length + v.part3.length;
    const schoolDisplay = /^TRƯỜNG\b/i.test((meta.schoolName || '').trim())
      ? (meta.schoolName || '').trim()
      : `TRƯỜNG ${(meta.schoolName || '').trim()}`;
    const rawYear = (meta.schoolYear || '2026 - 2027').trim();
    const schoolYearDisplay = /^NĂM\s*HỌC/i.test(rawYear)
      ? rawYear.toUpperCase()
      : `NĂM HỌC: ${rawYear}`;

    const govDisplay =
      !meta.governingBody ||
      /^SỞ\s+GIÁO\s+DỤC\s+VÀ\s+ĐÀO\s+TẠO\s+TP\s+ĐÀ\s+NẴNG$/i.test(meta.governingBody.trim())
        ? 'SỞ GD & ĐT TP ĐÀ NẴNG'
        : meta.governingBody.trim();

    // Top 2-column administrative header table
    const headerTableXml = `<w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="4400"/>
        <w:gridCol w:w="5600"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2200" w:type="pct"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="0" w:after="20"/><w:jc w:val="center"/></w:pPr>
            ${buildOpenXmlRun(govDisplay)}
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:before="0" w:after="40"/><w:jc w:val="center"/></w:pPr>
            ${buildOpenXmlRun(schoolDisplay, { bold: true, underline: true })}
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:before="0" w:after="40"/><w:jc w:val="center"/></w:pPr>
            ${buildOpenXmlRun(`(Đề thi gồm ${totalQ} câu)`, { italic: true, sizeHalfPt: 22 })}
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2800" w:type="pct"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="0" w:after="20"/><w:jc w:val="center"/></w:pPr>
            ${buildOpenXmlRun((meta.examTerm || '').toUpperCase(), { bold: true })}
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:before="0" w:after="20"/><w:jc w:val="center"/></w:pPr>
            ${buildOpenXmlRun(`Môn: ${meta.subjectName}`, { bold: true })}
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:before="0" w:after="20"/><w:jc w:val="center"/></w:pPr>
            ${buildOpenXmlRun(schoolYearDisplay, { bold: true })}
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:before="0" w:after="60"/><w:jc w:val="center"/></w:pPr>
            ${buildOpenXmlRun(
              `Thời gian làm bài: ${meta.examDuration} phút (không kể thời gian phát đề)`
            )}
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:before="40" w:after="40"/><w:jc w:val="center"/></w:pPr>
            ${buildOpenXmlRun(`  MÃ ĐỀ: ${v.code}  `, { bold: true, borderBox: true })}
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>`;

    const studentInfoXml = `<w:p>
      <w:pPr><w:spacing w:before="120" w:after="140"/></w:pPr>
      ${buildOpenXmlRun('Họ và tên thí sinh: ', { bold: true })}
      ${buildOpenXmlRun('...................................................... ')}
      ${buildOpenXmlRun('Số báo danh: ', { bold: true })}
      ${buildOpenXmlRun('........................')}
    </w:p>`;

    // Part I
    const part1HeaderXml = `<w:p>
      <w:pPr><w:spacing w:before="120" w:after="40"/></w:pPr>
      ${buildOpenXmlRun(
        `PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN (${v.part1.length} CÂU)`,
        { bold: true }
      )}
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:before="0" w:after="100"/></w:pPr>
      ${buildOpenXmlRun(
        `Thí sinh trả lời từ câu 1 đến câu ${v.part1.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`,
        { italic: true }
      )}
    </w:p>`;

    const part1QuestionsXml = v.part1
      .map((q, idx) => {
        const num = idx + 1;
        const imgXml =
          q.has_image && q.image_url ? registerImageForQuestion(q.image_url, q.question) : '';
        const optionsXml = meta.optionsInTable
          ? buildDocxTableOptionsXml(q.options)
          : buildDocxNonTableOptionsParagraphsXml(q.options);
        return `<w:p>
          <w:pPr><w:spacing w:before="100" w:after="40"/></w:pPr>
          ${buildOpenXmlRun(`${meta.questionLabel} ${num}${meta.questionSeparator} `, {
            bold: true,
          })}
          ${htmlInlineToOpenXmlRuns(latexToWordReadableHtml(q.question))}
        </w:p>
        ${imgXml}
        ${optionsXml}`;
      })
      .join('\n');

    // Part II
    const part2HeaderXml = `<w:p>
      <w:pPr><w:spacing w:before="160" w:after="40"/></w:pPr>
      ${buildOpenXmlRun(`PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI (${v.part2.length} CÂU)`, {
        bold: true,
      })}
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:before="0" w:after="100"/></w:pPr>
      ${buildOpenXmlRun(
        'Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.',
        { italic: true }
      )}
    </w:p>`;

    const part2QuestionsXml = v.part2
      .map((q, idx) => {
        const num = meta.restartIndexPerPart ? idx + 1 : v.part1.length + idx + 1;
        const imgXml =
          q.has_image && q.image_url ? registerImageForQuestion(q.image_url, q.stem) : '';
        const stmtsXml = q.statements
          .map(
            (st, sIdx) => `<w:p>
              <w:pPr>
                <w:spacing w:before="30" w:after="${sIdx === 3 ? '60' : '30'}"/>
                <w:ind w:left="280"/>
              </w:pPr>
              ${buildOpenXmlRun(`${st.displayLabel}) `, { bold: true })}
              ${htmlInlineToOpenXmlRuns(latexToWordReadableHtml(st.text))}
            </w:p>`
          )
          .join('\n');
        return `<w:p>
          <w:pPr><w:spacing w:before="100" w:after="40"/></w:pPr>
          ${buildOpenXmlRun(`${meta.questionLabel} ${num}${meta.questionSeparator} `, {
            bold: true,
          })}
          ${htmlInlineToOpenXmlRuns(latexToWordReadableHtml(q.stem))}
        </w:p>
        ${imgXml}
        ${stmtsXml}`;
      })
      .join('\n');

    // Part III (No "Điền đáp số: ........................")
    const part3HeaderXml = `<w:p>
      <w:pPr><w:spacing w:before="160" w:after="40"/></w:pPr>
      ${buildOpenXmlRun(`PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN (${v.part3.length} CÂU)`, {
        bold: true,
      })}
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:before="0" w:after="100"/></w:pPr>
      ${buildOpenXmlRun(
        'Thí sinh trả lời bằng cách điền giá trị số vào phiếu trả lời.',
        { italic: true }
      )}
    </w:p>`;

    const part3QuestionsXml = v.part3
      .map((q, idx) => {
        const num = meta.restartIndexPerPart
          ? idx + 1
          : v.part1.length + v.part2.length + idx + 1;
        const imgXml =
          q.has_image && q.image_url ? registerImageForQuestion(q.image_url, q.question) : '';
        return `<w:p>
          <w:pPr><w:spacing w:before="100" w:after="60"/></w:pPr>
          ${buildOpenXmlRun(`${meta.questionLabel} ${num}${meta.questionSeparator} `, {
            bold: true,
          })}
          ${htmlInlineToOpenXmlRuns(latexToWordReadableHtml(q.question))}
        </w:p>
        ${imgXml}`;
      })
      .join('\n');

    const endMarkerXml = `<w:p>
      <w:pPr><w:spacing w:before="240" w:after="120"/><w:jc w:val="center"/></w:pPr>
      ${buildOpenXmlRun('--- HẾT ---', { bold: true })}
    </w:p>`;

    const sectPrXml = `<w:sectPr>
      <w:footerReference w:type="default" r:id="${ftrRelId}"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="850" w:right="850" w:bottom="1020" w:left="1020" w:header="567" w:footer="567" w:gutter="0"/>
      <w:pgNumType w:start="1"/>
    </w:sectPr>`;

    const isLastVariant = vIdx === variants.length - 1;
    const sectionBreakXml = isLastVariant
      ? sectPrXml
      : `<w:p><w:pPr>${sectPrXml}</w:pPr></w:p>`;

    bodySectionsXml.push(
      headerTableXml,
      studentInfoXml,
      part1HeaderXml,
      part1QuestionsXml,
      part2HeaderXml,
      part2QuestionsXml,
      part3HeaderXml,
      part3QuestionsXml,
      endMarkerXml,
      sectionBreakXml
    );
  });

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodySectionsXml.join('\n')}
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="gif" ContentType="image/gif"/>
  ${contentTypeOverrides.join('\n  ')}
</Types>`;

  const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relEntries.join('\n  ')}
</Relationships>`;

  docxEntries.push(
    { path: '[Content_Types].xml', content: contentTypesXml },
    { path: '_rels/.rels', content: DOCX_ROOT_RELS_XML },
    { path: 'word/document.xml', content: documentXml },
    { path: 'word/styles.xml', content: DOCX_STYLES_XML },
    { path: 'word/settings.xml', content: DOCX_SETTINGS_XML },
    { path: 'word/_rels/document.xml.rels', content: documentRelsXml }
  );

  return createZipArchiveUint8Array(docxEntries);
}

export function buildVariantsWordDocxBlob(
  variants: ScrambledExamVariant[],
  meta: ScramblerExportMetadata
): Blob {
  const bytes = buildVariantsWordDocxBytes(variants, meta);
  return new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Sanitize Vietnamese subject name into clean folder slug (e.g., "VẬT LÝ 12" -> "VatLy12")
 */
export function toCleanSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Trigger full ZIP folder package download containing:
 * 1. Individual Word (.docx) for each variant + Merged Word (.docx)
 * 2. Printable Master Answer Key Matrix (.doc)
 * 3. TNMaker / QM Machine Scoring Excel (.xls) & CSV (.csv)
 * 4. JSON backup of all scrambled variants
 */
export function downloadComprehensiveExamZipPackage(
  examData: ExamData,
  variants: ScrambledExamVariant[],
  meta: ScramblerExportMetadata
): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const subjectSlug = toCleanSlug(meta.subjectName || 'VatLy12') || 'VatLy12';
  const folderName = `Bo_De_Tron_${subjectSlug}_${dateStr}`;

  const zipEntries: ZipEntryInput[] = [];

  // 1. Individual Word (.docx) per variant
  for (const v of variants) {
    zipEntries.push({
      path: `${folderName}/01_De_Thi_Word_Theo_Ma/De_Thi_${subjectSlug}_Ma_${v.code}.docx`,
      content: buildVariantsWordDocxBytes([v], meta),
    });
  }

  // 2. Merged Word (.docx) containing all variants in one file
  zipEntries.push({
    path: `${folderName}/01_De_Thi_Word_Theo_Ma/Bo_De_Gop_${variants.length}_Ma_De_${subjectSlug}.docx`,
    content: buildVariantsWordDocxBytes(variants, meta),
  });

  // 3. Printable Master Answer Key Matrix (.doc)
  zipEntries.push({
    path: `${folderName}/02_Bang_Dap_An_Va_Cham_May_TNMaker/Bang_Dap_An_Tong_Hop_${variants.length}_Ma_De.doc`,
    content: buildMasterAnswerKeyWordHtml(variants, meta),
  });

  // 4. Machine Scoring Key File (.xlsx, .xls & .csv for TNMaker / QM — chuẩn mẫu TNMaker-2025)
  zipEntries.push({
    path: `${folderName}/02_Bang_Dap_An_Va_Cham_May_TNMaker/Dap_An_TNMaker_${subjectSlug}.xlsx`,
    content: buildTNMakerXlsxBytes(variants),
  });
  zipEntries.push({
    path: `${folderName}/02_Bang_Dap_An_Va_Cham_May_TNMaker/File_Cham_May_TNMaker_QM_${subjectSlug}.xls`,
    content: buildTNMakerExcelHtml(variants, meta),
  });
  zipEntries.push({
    path: `${folderName}/02_Bang_Dap_An_Va_Cham_May_TNMaker/File_Cham_May_TNMaker_QM_${subjectSlug}.csv`,
    content: buildTNMakerCsvContent(variants),
  });

  // 5. Raw JSON backup
  zipEntries.push({
    path: `${folderName}/03_Du_Lieu_He_Thong_JSON/SmartTest_${subjectSlug}_${variants.length}MaDe.json`,
    content: JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        curriculum: 'GDPT 2018 — Bộ GD&ĐT Việt Nam',
        metadata: meta,
        baseExamId: examData.examId,
        variants,
      },
      null,
      2
    ),
  });

  const zipBlob = createZipArchiveBlob(zipEntries);
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}.zip`;
  a.click();
  URL.revokeObjectURL(url);

  return `${folderName}.zip`;
}

/**
 * Generate and download the standardized Sample Word Template ("De_Thi_Mau_Chuan_GDPT2018_VatLy.doc")
 * with all 3 parts (18 Part I + 4 Part II + 6 Part III) and clear formatting tags
 */
export function buildSampleWordTemplateText(examData: ExamData): string {
  const letters = ['A', 'B', 'C', 'D'];

  const p1Lines = examData.part1
    .map((q, idx) => {
      const opts = q.options
        .map((opt, oIdx) => {
          const prefix = oIdx === q.correctIndex ? `*[${letters[oIdx]}.]` : `[${letters[oIdx]}.]`;
          return `${prefix} ${opt}`;
        })
        .join('\n');
      return `<câu> Câu ${idx + 1}: ${q.question}\n${opts}`;
    })
    .join('\n\n');

  const p2Lines = examData.part2
    .map((q, idx) => {
      const stLines = q.statements
        .map((st) => `${st.id}) ${st.text} (${st.isTrue ? 'Đúng' : 'Sai'})`)
        .join('\n');
      return `<câu> Câu ${idx + 1}: ${q.stem}\n${stLines}`;
    })
    .join('\n\n');

  const p3Lines = examData.part3
    .map(
      (q, idx) =>
        `<câu> Câu ${idx + 1}: ${q.question}\n<đáp án: ${q.answer}> ${
          q.unit ? `(Đơn vị: ${q.unit})` : ''
        }`
    )
    .join('\n\n');

  return `====================================================================
HƯỚNG DẪN ĐỊNH DẠNG ĐỀ THI WORD MẪU CHUẨN CẤU TRÚC GDPT 2018 (SMARTTEST)
Lưu ý: Giáo viên tải file mẫu này về, chỉnh sửa nội dung câu hỏi theo đúng
định dạng rồi tải lên hệ thống để trộn đề tự động không bị lỗi.
====================================================================

PHẦN I. TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN (18 CÂU - 0,25 ĐIỂM/CÂU)
Quy ước: Bắt đầu mỗi câu bằng thẻ <câu>, các phương án đặt sau [A.], [B.], [C.], [D.].
Đánh dấu * hoặc gạch chân trước phương án đúng (Ví dụ: *[A.]).

${p1Lines}

====================================================================
PHẦN II. TRẮC NGHIỆM ĐÚNG / SAI LŨY TIẾN (4 CÂU - 16 LỆNH HỎI - 1,00 ĐIỂM/CÂU)
Quy ước: Mỗi câu gồm phần dẫn <câu> và 4 mệnh đề a), b), c), d) kèm chỉ dẫn (Đúng) hoặc (Sai).

${p2Lines}

====================================================================
PHẦN III. TRẮC NGHIỆM TRẢ LỜI NGẮN (6 CÂU - 0,25 ĐIỂM/CÂU)
Quy ước: Mỗi câu bắt đầu bằng <câu> và dòng đáp số ghi theo mẫu <đáp án: giá_trị_số>.

${p3Lines}
`;
}

export function downloadSampleWordTemplateDoc(examData: ExamData): void {
  const letters = ['A', 'B', 'C', 'D'];

  const p1Html = examData.part1
    .map((q, idx) => {
      const optsHtml = q.options
        .map((opt, oIdx) => {
          const isCorrect = oIdx === q.correctIndex;
          return `<div style="margin-left:12pt;margin-top:2pt;">${
            isCorrect
              ? `<b style="color:#047857;text-decoration:underline;">*[${letters[oIdx]}.]</b>`
              : `<b>[${letters[oIdx]}.]</b>`
          } ${latexToWordReadableHtml(opt)} ${
            isCorrect ? '<i style="color:#047857;">(Đáp án đúng)</i>' : ''
          }</div>`;
        })
        .join('');
          const safeImgSrc =
            q.has_image && q.image_url
              ? ensureWordCompatibleImageSrc(q.image_url, q.question)
              : '';
          const imgHtml = safeImgSrc
            ? `<div style="margin:6pt 0 6pt 12pt;"><img src="${safeImgSrc}" width="380" alt="Hình minh họa" style="width:380px;max-width:100%;height:auto;border:1px solid #cbd5e1;padding:4px;background:#ffffff;" /></div>`
            : '';
          return `
        <div style="margin-bottom:10pt;">
          <p style="margin:0;">
            <b style="color:#4338ca;">&lt;câu&gt;</b> <b>Câu ${idx + 1}:</b> ${latexToWordReadableHtml(
            q.question
          )}
          </p>
          ${imgHtml}
          ${optsHtml}
        </div>
      `;
        })
        .join('');

  const p2Html = examData.part2
    .map((q, idx) => {
      const seqToken = q.statements.map((st) => (st.isTrue ? 'D' : 'S')).join('');
      const safeImgSrc =
        q.has_image && q.image_url
          ? ensureWordCompatibleImageSrc(q.image_url, q.stem)
          : '';
      const imgHtml = safeImgSrc
        ? `<div style="margin:6pt 0 6pt 12pt;"><img src="${safeImgSrc}" width="380" alt="Hình minh họa" style="width:380px;max-width:100%;height:auto;border:1px solid #cbd5e1;padding:4px;background:#ffffff;" /></div>`
        : '';
      const stHtml = q.statements
        .map(
          (st) =>
            `<div style="margin-left:14pt;margin-top:2pt;"><b>${st.id})</b> ${latexToWordReadableHtml(
              st.text
            )} <b style="color:${st.isTrue ? '#047857' : '#be123c'};">(${
              st.isTrue ? 'Đúng' : 'Sai'
            })</b></div>`
        )
        .join('');
      return `
        <div style="margin-bottom:10pt;">
          <p style="margin:0;">
            <b style="color:#4338ca;">&lt;câu&gt;</b> <b>Câu ${idx + 1}:</b> ${latexToWordReadableHtml(
        q.stem
      )}
          </p>
          ${imgHtml}
          ${stHtml}
          <p style="margin:2pt 0 0 14pt;font-family:monospace;color:#4338ca;font-size:11pt;">
            ${seqToken}
          </p>
        </div>
      `;
    })
    .join('');

  const p3Html = examData.part3
    .map((q, idx) => {
      const safeImgSrc =
        q.has_image && q.image_url
          ? ensureWordCompatibleImageSrc(q.image_url, q.question)
          : '';
      const imgHtml = safeImgSrc
        ? `<div style="margin:6pt 0 6pt 12pt;"><img src="${safeImgSrc}" width="380" alt="Hình minh họa" style="width:380px;max-width:100%;height:auto;border:1px solid #cbd5e1;padding:4px;background:#ffffff;" /></div>`
        : '';
      return `
        <div style="margin-bottom:10pt;">
          <p style="margin:0;">
            <b style="color:#4338ca;">&lt;câu&gt;</b> <b>Câu ${idx + 1}:</b> ${latexToWordReadableHtml(
        q.question
      )}
          </p>
          ${imgHtml}
          <p style="margin:2pt 0 0 14pt;color:#047857;font-weight:bold;">
            Đáp số: ${q.answer} ${q.unit ? `<span style="color:#475569;font-weight:normal;">(Đơn vị: ${q.unit})</span>` : ''}
          </p>
        </div>
      `;
    })
    .join('');

  const html = `\ufeff<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>Đề Thi Word Mẫu Chuẩn GDPT 2018 - Vật Lý THPT</title>
  <style>
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.4;
      color: #000000;
    }
    .guide-box {
      border: 1.5pt solid #4338ca;
      background-color: #f5f3ff;
      padding: 10pt 14pt;
      margin-bottom: 14pt;
    }
  </style>
</head>
<body>
  <div class="guide-box">
    <h2 style="margin:0 0 6pt 0;font-size:14pt;color:#2e1065;">
      FILE ĐỀ THI WORD MẪU CHUẨN CẤU TRÚC GDPT 2018 — HỆ THỐNG SMARTTEST
    </h2>
    <p style="margin:0 0 6pt 0;">
      <b>Hướng dẫn sử dụng:</b> Giáo viên tải file mẫu này về, chỉnh sửa nội dung câu hỏi theo đúng định dạng rồi tải lên hệ thống để trộn đề tự động không bị lỗi.
    </p>
    <ul style="margin:0;padding-left:18pt;">
      <li><b>Phần I (18 câu trắc nghiệm ABCD):</b> Bắt đầu bằng thẻ <b>&lt;câu&gt;</b>, các phương án ghi <b>[A.]</b>, <b>[B.]</b>, <b>[C.]</b>, <b>[D.]</b> và đánh dấu <b>*</b> hoặc gạch chân ở đáp án đúng.</li>
      <li><b>Phần II (4 câu Đúng/Sai - 16 lệnh hỏi):</b> Bắt đầu bằng thẻ <b>&lt;câu&gt;</b>, các ý ghi <b>a)</b>, <b>b)</b>, <b>c)</b>, <b>d)</b> kèm nhãn <b>(Đúng)</b> hoặc <b>(Sai)</b> ở cuối mỗi ý.</li>
      <li><b>Phần III (6 câu Trả lời ngắn):</b> Bắt đầu bằng thẻ <b>&lt;câu&gt;</b> và ghi đáp số ở dòng dưới theo mẫu <b>&lt;đáp án: 100&gt;</b>.</li>
    </ul>
  </div>

  <h3 style="font-size:13pt;text-transform:uppercase;color:#1e1b4b;border-bottom:1pt solid #cbd5e1;padding-bottom:4pt;">
    PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (18 câu)
  </h3>
  ${p1Html}

  <h3 style="font-size:13pt;text-transform:uppercase;color:#1e1b4b;border-bottom:1pt solid #cbd5e1;padding-bottom:4pt;margin-top:16pt;">
    PHẦN II. Câu trắc nghiệm đúng sai (4 câu - 16 ý a, b, c, d)
  </h3>
  ${p2Html}

  <h3 style="font-size:13pt;text-transform:uppercase;color:#1e1b4b;border-bottom:1pt solid #cbd5e1;padding-bottom:4pt;margin-top:16pt;">
    PHẦN III. Câu trắc nghiệm trả lời ngắn (6 câu)
  </h3>
  ${p3Html}
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'De_Thi_Mau_Chuan_GDPT2018_VatLy.doc';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Clean and normalize any ingested ExamData into strict GDPT 2018 standard structure
 */
export function normalizeExamDataToGdpt2018(rawExam: ExamData): ExamData {
  const letters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  const cleanQuestionPrefix = (text: string): string =>
    text
      .replace(/^\s*<câu>\s*/i, '')
      .replace(/^\s*(?:Câu|Question)\s*\d+\s*[:.)]\s*/i, '')
      .replace(/\s*(?:Đáp\s*án|ĐA)\s*[:=]\s*[A-D]\b.*$/i, '')
      .trim();

  const cleanOptionPrefix = (text: string): string =>
    text
      .replace(/^\s*\*?\s*\[?[A-D][.):]?\]?\s*\*?\s*/i, '')
      .replace(/\s*\((?:Đáp án đúng|Đúng)\)\s*$/i, '')
      .trim();

  const cleanSubStatementText = (text: string): string =>
    text
      .replace(/^\s*\*?\s*[a-dA-D]\s*[).:]\s*\*?\s*/, '')
      .replace(/\s*[([]\s*(?:Đúng|Sai|Đ|S|True|False)\s*[)\]]\s*\.?\s*$/i, '')
      .trim();

  const normalizedPart1 = rawExam.part1.map((q, idx) => {
    const safeIdx =
      typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3
        ? q.correctIndex
        : q.correct_answer
        ? Math.max(0, letters.indexOf(q.correct_answer))
        : 0;
    const cleanedOptions = (q.options || []).slice(0, 4).map((opt) => cleanOptionPrefix(opt));
    while (cleanedOptions.length < 4) {
      cleanedOptions.push(`Phương án ${letters[cleanedOptions.length]}`);
    }
    const fourOptions: [string, string, string, string] = [
      cleanedOptions[0],
      cleanedOptions[1],
      cleanedOptions[2],
      cleanedOptions[3],
    ];
    return {
      ...q,
      id: q.id || `P1-Q${idx + 1}`,
      topic: q.topic || 'Vật lý THPT (GDPT 2018)',
      question: cleanQuestionPrefix(q.question),
      options: fourOptions,
      correctIndex: safeIdx,
      correct_answer: letters[safeIdx],
      points: q.points || 0.25,
      explanation:
        q.explanation ||
        `Chuẩn hoá GDPT 2018: Đáp án đúng là ${letters[safeIdx]}.`,
      has_image: Boolean(q.has_image && q.image_url),
      image_url: q.image_url,
    };
  });

  const subIds: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];
  const normalizedPart2 = rawExam.part2.map((q, idx) => {
    const cleanStem = cleanQuestionPrefix(q.stem).replace(
      /\s*[([]?[DĐS]{4}[)\]]?\s*$/i,
      ''
    );
    const statementsList = subIds.map((subId, sIdx) => {
      const existing = q.statements?.[sIdx] || {
        id: subId,
        text: `Mệnh đề ${subId}`,
        isTrue: sIdx % 2 === 0,
      };
      const truthVal =
        typeof existing.isTrue === 'boolean'
          ? existing.isTrue
          : Boolean(existing.is_correct);
      return {
        ...existing,
        id: subId,
        text: cleanSubStatementText(existing.text),
        isTrue: truthVal,
        is_correct: truthVal,
      };
    });
    const statements: [
      typeof statementsList[0],
      typeof statementsList[0],
      typeof statementsList[0],
      typeof statementsList[0]
    ] = [
      statementsList[0],
      statementsList[1],
      statementsList[2],
      statementsList[3],
    ];

    return {
      ...q,
      id: q.id || `P2-Q${idx + 1}`,
      topic: q.topic || 'Đúng / Sai lũy tiến GDPT 2018',
      stem: cleanStem,
      statements,
      points: q.points || 1.0,
      has_image: Boolean(q.has_image && q.image_url),
      image_url: q.image_url,
    };
  });

  const normalizedPart3 = rawExam.part3.map((q, idx) => {
    const cleanQ = cleanQuestionPrefix(q.question).replace(
      /\s*(?:<đáp\s*án\s*:\s*[^>\n]+>|(?:Đáp\s*số|Đáp\s*án|Kết\s*quả|ĐS|ĐA)\s*[:=]\s*[-+]?\d+(?:[.,]\d+)?).*$/i,
      ''
    );
    const cleanVal = String(q.correct_value ?? q.answer ?? '')
      .trim()
      .replace(/^[:=\s]+/, '');
    return {
      ...q,
      id: q.id || `P3-Q${idx + 1}`,
      topic: q.topic || 'Trả lời ngắn GDPT 2018',
      question: cleanQ,
      answer: cleanVal,
      correct_value: cleanVal,
      points: q.points || 0.25,
      explanation:
        q.explanation || `Chuẩn hoá GDPT 2018: Đáp án chuẩn là ${cleanVal}.`,
      has_image: Boolean(q.has_image && q.image_url),
      image_url: q.image_url,
    };
  });

  return {
    ...rawExam,
    curriculum: 'GDPT 2018 — Chuẩn Hoá Định Dạng Bộ GD&ĐT',
    part1: normalizedPart1,
    part2: normalizedPart2,
    part3: normalizedPart3,
  };
}

/**
 * Compile the normalized exam into a clean, standardized GDPT 2018 Word document (.doc)
 * and trigger an immediate browser download: "De_Thi_Mau_Chuan_GDPT2018_VatLy_DaChuanHoa.doc"
 */
export function downloadNormalizedGdpt2018WordDoc(
  rawExamData: ExamData,
  meta?: Partial<ScramblerExportMetadata>,
  sourceFileName?: string
): { normalizedExam: ExamData; fileName: string } {
  const normalizedExam = normalizeExamDataToGdpt2018(rawExamData);
  const letters = ['A', 'B', 'C', 'D'];
  const cleanSourceSlug = sourceFileName
    ? toCleanSlug(sourceFileName.replace(/\.(docx|doc|pdf|txt|json)$/i, ''))
    : '';
  const fileName = cleanSourceSlug
    ? `${cleanSourceSlug}_DaChuanHoa_GDPT2018.doc`
    : 'De_Thi_Mau_Chuan_GDPT2018_VatLy_DaChuanHoa.doc';

  const subject = meta?.subjectName || normalizedExam.subject || 'VẬT LÝ 12';

  const p1Count = normalizedExam.part1.length;
  const p2Count = normalizedExam.part2.length;
  const p3Count = normalizedExam.part3.length;

  const p1Html = normalizedExam.part1
    .map((q, idx) => {
      const safeImgSrc =
        q.has_image && q.image_url
          ? ensureWordCompatibleImageSrc(q.image_url, q.question)
          : '';
      const imgHtml = safeImgSrc
        ? `<div style="margin:6pt 0 6pt 12pt;text-align:center;"><img src="${safeImgSrc}" width="380" alt="Hình vẽ Câu ${
            idx + 1
          }" style="width:380px;max-width:100%;height:auto;border:1px solid #cbd5e1;padding:4px;background:#ffffff;" /></div>`
        : '';

      const optionsHtml = buildNonTableOptionsHtml(q.options, q.correctIndex, true);

      return `
        <div style="margin-bottom:10pt;">
          <p style="margin:0 0 3pt 0;font-size:12pt;">
            <b>Câu ${idx + 1}:</b> ${latexToWordReadableHtml(q.question)}
          </p>
          ${imgHtml}
          ${optionsHtml}
        </div>
      `;
    })
    .join('');

  const p2Html = normalizedExam.part2
    .map((q, idx) => {
      const safeImgSrc =
        q.has_image && q.image_url
          ? ensureWordCompatibleImageSrc(q.image_url, q.stem)
          : '';
      const imgHtml = safeImgSrc
        ? `<div style="margin:6pt 0 6pt 12pt;text-align:center;"><img src="${safeImgSrc}" width="380" alt="Hình vẽ Phần II Câu ${
            idx + 1
          }" style="width:380px;max-width:100%;height:auto;border:1px solid #cbd5e1;padding:4px;background:#ffffff;" /></div>`
        : '';

      const stHtml = q.statements
        .map((st) => {
          const prefixHtml = st.isTrue
            ? `<b style="color:#dc2626;text-decoration:underline;">*${st.id})</b>`
            : `<b>${st.id})</b>`;
          return `<p style="margin:2pt 0 2pt 14pt;font-size:12pt;">${prefixHtml} ${latexToWordReadableHtml(
            st.text
          )}</p>`;
        })
        .join('');

      return `
        <div style="margin-bottom:10pt;">
          <p style="margin:0 0 3pt 0;font-size:12pt;">
            <b>Câu ${idx + 1}:</b> ${latexToWordReadableHtml(q.stem)}
          </p>
          ${imgHtml}
          ${stHtml}
        </div>
      `;
    })
    .join('');

  const p3Html = normalizedExam.part3
    .map((q, idx) => {
      const safeImgSrc =
        q.has_image && q.image_url
          ? ensureWordCompatibleImageSrc(q.image_url, q.question)
          : '';
      const imgHtml = safeImgSrc
        ? `<div style="margin:6pt 0 6pt 12pt;text-align:center;"><img src="${safeImgSrc}" width="380" alt="Hình vẽ Phần III Câu ${
            idx + 1
          }" style="width:380px;max-width:100%;height:auto;border:1px solid #cbd5e1;padding:4px;background:#ffffff;" /></div>`
        : '';

      return `
        <div style="margin-bottom:10pt;">
          <p style="margin:0 0 3pt 0;font-size:12pt;">
            <b>Câu ${idx + 1}:</b> ${latexToWordReadableHtml(q.question)}
          </p>
          ${imgHtml}
          <p style="margin:2pt 0 0 14pt;font-size:12pt;color:#047857;font-weight:bold;">
            Đáp số: ${q.answer}
          </p>
        </div>
      `;
    })
    .join('');

  const html = `\ufeff<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>Đề Thi Chuẩn Hoá GDPT 2018 - ${subject}</title>
  <style>
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.4;
      color: #000000;
    }
    table { border-collapse: collapse; }
  </style>
</head>
<body>
  <h3 style="font-size:12pt;margin:4pt 0 6pt 0;color:#000000;">
    PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn. Thí sinh trả lời từ câu 1 đến câu ${p1Count}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.
  </h3>
  ${p1Html}

  <h3 style="font-size:12pt;margin:14pt 0 6pt 0;color:#000000;">
    PHẦN II. Câu trắc nghiệm đúng sai. Thí sinh trả lời từ câu 1 đến câu ${p2Count}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.
  </h3>
  ${p2Html}

  <h3 style="font-size:12pt;margin:14pt 0 6pt 0;color:#000000;">
    PHẦN III. Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời từ câu 1 đến câu ${p3Count}.
  </h3>
  ${p3Html}

  <p style="text-align:center;font-weight:bold;margin-top:16pt;">--- HẾT ---</p>
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);

  return { normalizedExam, fileName };
}

