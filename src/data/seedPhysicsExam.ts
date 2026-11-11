import { ExamData, WorkstationNode } from '../types/exam';
import {
  HEAT_VS_TEMP_GRAPH_HINH1_SVG_DATA_URI,
  WATER_HEATING_GRAPH_HINH2_SVG_DATA_URI,
  THERMAL_EQUILIBRIUM_GRAPH_HINH3_SVG_DATA_URI,
} from '../utils/examDocumentParser';

export const FULL_MOET_28_PHYSICS_EXAM: ExamData = {
  examId: 'GDPT2018-VL12-HK2-2026',
  title: 'Kiểm Tra Thông Minh - Chuẩn Cấu Trúc GDPT 2018',
  subject: 'Vật Lý 12',
  grade: 'Lớp 12',
  curriculum: 'Chương trình GDPT 2018 — Bộ GD&ĐT',
  durationMinutes: 50,
  part1: [
    {
      id: 'P1-Q1',
      topic: 'Dao động điều hòa',
      question:
        'Một chất điểm dao động điều hòa dọc theo trục $Ox$ với phương trình li độ $x = A\\cos(\\omega t + \\varphi)$ (trong đó $A, \\omega > 0$). Đại lượng $(\\omega t + \\varphi)$ được gọi là gì và vận tốc cực đại của vật có biểu thức nào?',
      options: [
        'Pha của dao động tại thời điểm $t$; vận tốc cực đại là $v_{\\max} = \\omega A$.',
        'Pha ban đầu của dao động; vận tốc cực đại là $v_{\\max} = \\omega^2 A$.',
        'Tần số góc của dao động; vận tốc cực đại là $v_{\\max} = \\frac{A}{\\omega}$.',
        'Chu kì riêng của dao động; vận tốc cực đại là $v_{\\max} = 2\\pi \\omega A$.',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Trong phương trình $x = A\\cos(\\omega t + \\varphi)$, đại lượng $(\\omega t + \\varphi)$ là pha dao động tại thời điểm $t$ (đơn vị $\\text{rad}$). Đạo hàm li độ cho vận tốc $v = x\'(t) = -\\omega A\\sin(\\omega t + \\varphi)$, suy ra tốc độ cực đại là $v_{\\max} = \\omega A$.',
    },
    {
      id: 'P1-Q2',
      topic: 'Từ trường & Lực từ',
      question:
        'Một đoạn dây dẫn thẳng có chiều dài $L = 0,5\\text{ m}$ mang dòng điện không đổi $I = 4\\text{ A}$ đặt trong từ trường đều có vectơ cảm ứng từ $\\vec{B}$ hợp với chiều dòng điện một góc $\\alpha = 30^\\circ$. Biết độ lớn cảm ứng từ $B = 0,2\\text{ T}$. Độ lớn lực từ $F$ tác dụng lên đoạn dây dẫn là:',
      options: [
        '$F = 0,20\\text{ N}$',
        '$F = 0,40\\text{ N}$',
        '$F = 0,20\\sqrt{3}\\text{ N}$',
        '$F = 0,10\\text{ N}$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Áp dụng công thức lực Амpe tác dụng lên đoạn dây dẫn mang dòng điện đặt trong từ trường đều: $$F = B I L \\sin\\alpha = 0,2 \\times 4 \\times 0,5 \\times \\sin 30^\\circ = 0,20\\text{ N}$$',
    },
    {
      id: 'P1-Q3',
      topic: 'Vật lý nhiệt & Nguyên lý I Nhiệt động lực học',
      question:
        'Theo nguyên lý I của nhiệt động lực học $\\Delta U = A + Q$, một khối khí nhận nhiệt lượng $Q = 450\\text{ J}$ và thực hiện một công có độ lớn $150\\text{ J}$ đẩy pít-tông chuyển động. Độ biến thiên nội năng $\\Delta U$ của khối khí trong quá trình này là:',
      options: [
        '$\\Delta U = +300\\text{ J}$',
        '$\\Delta U = +600\\text{ J}$',
        '$\\Delta U = -300\\text{ J}$',
        '$\\Delta U = -600\\text{ J}$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Theo quy ước dấu chuẩn GDPT 2018: Hệ nhận nhiệt nên $Q = +450\\text{ J}$; hệ thực hiện công lên ngoại vật nên $A = -150\\text{ J}$. Vậy độ biến thiên nội năng: $$\\Delta U = A + Q = -150 + 450 = +300\\text{ J}$$',
      has_image: true,
      image_url: HEAT_VS_TEMP_GRAPH_HINH1_SVG_DATA_URI,
    },
    {
      id: 'P1-Q4',
      topic: 'Điện trường & Tụ điện',
      question:
        'Một tụ điện phẳng có điện dung $C = 25\\text{ }\\mu\\text{F}$ được tích điện dưới hiệu điện thế $U = 40\\text{ V}$. Điện tích $q$ và năng lượng điện trường $W$ dự trữ trong tụ điện lần lượt là:',
      options: [
        '$q = 1,0\\text{ mC}$ và $W = 0,02\\text{ J}$',
        '$q = 1,0\\text{ C}$ và $W = 20\\text{ J}$',
        '$q = 0,5\\text{ mC}$ và $W = 0,04\\text{ J}$',
        '$q = 2,5\\text{ mC}$ và $W = 0,01\\text{ J}$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Ta có điện tích của tụ: $q = CU = 25\\times 10^{-6}\\times 40 = 10^{-3}\\text{ C} = 1,0\\text{ mC}$. Năng lượng điện trường trong tụ: $$W = \\frac{1}{2}CU^2 = \\frac{1}{2}\\times 25\\times 10^{-6}\\times 40^2 = 0,02\\text{ J}$$',
    },
    {
      id: 'P1-Q5',
      topic: 'Vật lý nhiệt',
      question:
        'Nhiệt độ sôi của nước tinh khiết ở áp suất tiêu chuẩn $1\\text{ atm}$ là $100^\\circ\\text{C}$. Khi quy đổi sang thang nhiệt độ tuyệt đối Kelvin ($\\text{K}$), giá trị này gần đúng bằng:',
      options: [
        '$373,15\\text{ K}$',
        '$273,15\\text{ K}$',
        '$173,15\\text{ K}$',
        '$473,15\\text{ K}$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Mối liên hệ giữa thang nhiệt độ Kelvin và thang Celsius là $T(\\text{K}) = t(^\\circ\\text{C}) + 273,15 = 100 + 273,15 = 373,15\\text{ K}$.',
    },
    {
      id: 'P1-Q6',
      topic: 'Vật lý nhiệt — Nhiệt dung riêng',
      question:
        'Nhiệt lượng $Q$ cần cung cấp để làm nóng chảy hoàn toàn một khối chất rắn kết tinh có khối lượng $m$ ở đúng nhiệt độ nóng chảy của nó được xác định bởi công thức nào (với $\\lambda$ là nhiệt nóng chảy riêng)?',
      options: [
        '$Q = \\lambda m$',
        '$Q = mc\\Delta T$',
        '$Q = \\frac{\\lambda}{m}$',
        '$Q = Lm$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Nhiệt lượng cần thiết để làm nóng chảy hoàn toàn khối chất rắn khối lượng $m$ ở nhiệt độ nóng chảy là $Q = \\lambda m$, trong đó $\\lambda$ ($\\text{J/kg}$) là nhiệt nóng chảy riêng.',
    },
    {
      id: 'P1-Q7',
      topic: 'Khí lý tưởng',
      question:
        'Trong quá trình biến đổi đẳng nhiệt của một lượng khí lý tưởng xác định, khi thể tích của khối khí giảm đi $2$ lần thì áp suất của khối khí sẽ:',
      options: [
        'Tăng lên $2$ lần.',
        'Giảm đi $2$ lần.',
        'Tăng lên $4$ lần.',
        'Không thay đổi.',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Theo định luật Boyle cho quá trình đẳng nhiệt ($T = \\text{const}$): $p_1 V_1 = p_2 V_2$. Khi $V_2 = \\frac{V_1}{2}$ thì $p_2 = 2p_1$.',
    },
    {
      id: 'P1-Q8',
      topic: 'Thuyết động học phân tử chất khí',
      question:
        'Động năng tịnh tiến trung bình $\\overline{E_\\text{đ}}$ của các phân tử khí lý tưởng phụ thuộc vào nhiệt độ tuyệt đối $T$ theo hệ thức nào sau đây (với $k = 1,38\\times 10^{-23}\\text{ J/K}$ là hằng số Boltzmann)?',
      options: [
        '$\\overline{E_\\text{đ}} = \\frac{3}{2}kT$',
        '$\\overline{E_\\text{đ}} = \\frac{1}{2}kT$',
        '$\\overline{E_\\text{đ}} = 3kT$',
        '$\\overline{E_\\text{đ}} = \\frac{2}{3}kT^2$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Theo thuyết động học phân tử chất khí, động năng tịnh tiến trung bình của phân tử khí tỉ lệ thuận với nhiệt độ tuyệt đối: $\\overline{E_\\text{đ}} = \\frac{3}{2}kT$.',
    },
    {
      id: 'P1-Q9',
      topic: 'Cảm ứng điện từ',
      question:
        'Một khung dây phẳng có diện tích $S$ gồm $N$ vòng dây đặt trong từ trường đều có vectơ cảm ứng từ $\\vec{B}$ hợp với vectơ pháp tuyến $\\vec{n}$ của mặt phẳng khung dây một góc $\\alpha$. Từ thông $\\Phi$ qua khung dây được tính bởi công thức:',
      options: [
        '$\\Phi = NBS\\cos\\alpha$',
        '$\\Phi = NBS\\sin\\alpha$',
        '$\\Phi = BS\\tan\\alpha$',
        '$\\Phi = \\frac{NBS}{\\cos\\alpha}$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Từ thông qua khung dây $N$ vòng diện tích $S$ là $\\Phi = NBS\\cos\\alpha$, với $\\alpha = (\\vec{n}, \\vec{B})$.',
    },
    {
      id: 'P1-Q10',
      topic: 'Định luật Faraday về cảm ứng điện từ',
      question:
        'Trong khoảng thời gian $\\Delta t = 0,05\\text{ s}$, từ thông qua một mạch kín giảm đều từ $0,15\\text{ Wb}$ về $0,03\\text{ Wb}$. Độ lớn suất điện động cảm ứng $|e_c|$ xuất hiện trong mạch là:',
      options: [
        '$2,4\\text{ V}$',
        '$1,8\\text{ V}$',
        '$3,6\\text{ V}$',
        '$0,6\\text{ V}$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Theo định luật Faraday: $$|e_c| = \\left|\\frac{\\Delta \\Phi}{\\Delta t}\\right| = \\frac{|0,03 - 0,15|}{0,05} = \\frac{0,12}{0,05} = 2,4\\text{ V}$$',
      has_image: true,
      image_url: HEAT_VS_TEMP_GRAPH_HINH1_SVG_DATA_URI,
    },
    {
      id: 'P1-Q11',
      topic: 'Dòng điện xoay chiều',
      question:
        'Cường độ dòng điện chạy qua một đoạn mạch có biểu thức $i = 4\\sqrt{2}\\cos(100\\pi t - \\frac{\\pi}{6})\\text{ (A)}$. Giá trị hiệu dụng $I$ và tần số $f$ của dòng điện xoay chiều này lần lượt là:',
      options: [
        '$I = 4\\text{ A}$; $f = 50\\text{ Hz}$',
        '$I = 4\\sqrt{2}\\text{ A}$; $f = 100\\text{ Hz}$',
        '$I = 2\\sqrt{2}\\text{ A}$; $f = 50\\text{ Hz}$',
        '$I = 4\\text{ A}$; $f = 100\\pi\\text{ Hz}$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Từ phương trình $i = I_0\\cos(\\omega t + \\varphi)$, ta có $I = \\frac{I_0}{\\sqrt{2}} = \\frac{4\\sqrt{2}}{\\sqrt{2}} = 4\\text{ A}$ và tần số $f = \\frac{\\omega}{2\\pi} = \\frac{100\\pi}{2\\pi} = 50\\text{ Hz}$.',
    },
    {
      id: 'P1-Q12',
      topic: 'Sóng điện từ',
      question:
        'Khi sóng điện từ lan truyền trong chân không tại một điểm bất kỳ, vectơ cường độ điện trường $\\vec{E}$ và vectơ cảm ứng từ $\\vec{B}$ luôn có đặc điểm nào sau đây?',
      options: [
        'Dao động cùng pha và có phương vuông góc với nhau, đồng thời vuông góc với phương truyền sóng.',
        'Dao động ngược pha và có phương song song với phương truyền sóng.',
        'Dao động lệch pha nhau $\\frac{\\pi}{2}$ và có phương trùng nhau.',
        'Có độ lớn không đổi theo thời gian và dọc theo phương truyền sóng.',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Sóng điện từ là sóng ngang: tại mỗi điểm, $\\vec{E}$ và $\\vec{B}$ luôn dao động cùng pha, vuông góc với nhau và lập với vectơ vận tốc truyền sóng $\\vec{v}$ một tam diện thuận.',
    },
    {
      id: 'P1-Q13',
      topic: 'Sóng cơ & Giao thoa',
      question:
        'Một sóng cơ hình sin truyền trên một sợi dây đàn hồi với tốc độ $v = 2,4\\text{ m/s}$ và tần số $f = 12\\text{ Hz}$. Bước sóng $\\lambda$ của sóng cơ này trên dây bằng:',
      options: [
        '$\\lambda = 0,20\\text{ m}$',
        '$\\lambda = 0,50\\text{ m}$',
        '$\\lambda = 5,00\\text{ m}$',
        '$\\lambda = 28,8\\text{ m}$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Bước sóng được tính theo công thức: $$\\lambda = \\frac{v}{f} = \\frac{2,4}{12} = 0,20\\text{ m}$$',
    },
    {
      id: 'P1-Q14',
      topic: 'Vật lý hạt nhân — Cấu tạo hạt nhân',
      question:
        'Hạt nhân nguyên tử Uranium $^{235}_{92}\\text{U}$ có số hạt proton ($Z$) và số hạt neutron ($N$) lần lượt là:',
      options: [
        '$92$ hạt proton và $143$ hạt neutron.',
        '$92$ hạt proton và $235$ hạt neutron.',
        '$143$ hạt proton và $92$ hạt neutron.',
        '$235$ hạt proton và $92$ hạt neutron.',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Với ký hiệu hạt nhân $^{A}_{Z}X$, số proton là $Z = 92$ và số neutron là $N = A - Z = 235 - 92 = 143$.',
    },
    {
      id: 'P1-Q15',
      topic: 'Năng lượng liên kết hạt nhân',
      question:
        'Theo hệ thức Einstein về mối liên hệ giữa khối lượng và năng lượng, một hạt nhân có độ hụt khối $\\Delta m$ thì năng lượng liên kết $E_{\\text{lk}}$ của hạt nhân đó là (với $c$ là tốc độ ánh sáng trong chân không):',
      options: [
        '$E_{\\text{lk}} = \\Delta m \\cdot c^2$',
        '$E_{\\text{lk}} = \\frac{\\Delta m}{c^2}$',
        '$E_{\\text{lk}} = \\frac{1}{2}\\Delta m \\cdot c^2$',
        '$E_{\\text{lk}} = \\Delta m \\cdot c$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Năng lượng liên kết của hạt nhân bằng tích của độ hụt khối $\\Delta m$ và bình phương tốc độ ánh sáng trong chân không: $E_{\\text{lk}} = \\Delta m c^2$.',
    },
    {
      id: 'P1-Q16',
      topic: 'Phóng xạ hạt nhân',
      question:
        'Chất phóng xạ Iodine $^{131}_{53}\\text{I}$ dùng trong y học có chu kỳ bán rã $T = 8\\text{ ngày}$. Ban đầu có $m_0 = 64\\text{ g}$ chất này, sau khoảng thời gian $t = 24\\text{ ngày}$ thì khối lượng $^{131}_{53}\\text{I}$ còn lại chưa bị phân rã là:',
      options: [
        '$8\\text{ g}$',
        '$16\\text{ g}$',
        '$32\\text{ g}$',
        '$4\\text{ g}$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Áp dụng định luật phóng xạ: $$m = m_0 \\cdot 2^{-\\frac{t}{T}} = 64 \\cdot 2^{-\\frac{24}{8}} = 64 \\cdot 2^{-3} = \\frac{64}{8} = 8\\text{ g}$$',
    },
    {
      id: 'P1-Q17',
      topic: 'Tia phóng xạ',
      question:
        'Bản chất của tia phóng xạ $\\alpha$ phát ra từ các hạt nhân nặng không bền là dòng các hạt:',
      options: [
        'Hạt nhân nguyên tử Helium ($^{4}_{2}\\text{He}$).',
        'Hạt electron ($^{-1}_{0}e$) chuyển động rất nhanh.',
        'Hạt positron ($^{+1}_{0}e$) mang điện dương.',
        'Hạt photon có năng lượng rất cao.',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Tia $\\alpha$ là dòng các hạt nhân $^{4}_{2}\\text{He}$ phóng ra từ hạt nhân mẹ với tốc độ khoảng $2\\times 10^7\\text{ m/s}$.',
    },
    {
      id: 'P1-Q18',
      topic: 'Dòng điện không đổi',
      question:
        'Một nguồn điện có suất điện động $\\mathcal{E} = 12\\text{ V}$ và điện trở trong $r = 1\\text{ }\\Omega$ được nối với điện trở mạch ngoài $R = 5\\text{ }\\Omega$ thành mạch điện kín. Cường độ dòng điện $I$ chạy trong toàn mạch là:',
      options: [
        '$I = 2,0\\text{ A}$',
        '$I = 2,4\\text{ A}$',
        '$I = 1,5\\text{ A}$',
        '$I = 6,0\\text{ A}$',
      ],
      correctIndex: 0,
      points: 0.25,
      explanation:
        'Theo định luật Ohm cho toàn mạch: $$I = \\frac{\\mathcal{E}}{R + r} = \\frac{12}{5 + 1} = 2,0\\text{ A}$$',
    },
  ],
  part2: [
    {
      id: 'P2-Q1',
      topic: 'Chu trình biến đổi trạng thái khí lý tưởng ($p = aT$)',
      stem: 'Một lượng khí lý tưởng xác định gồm $n = 1,0\\text{ mol}$ thực hiện một quá trình biến đổi trạng thái từ $(1)$ sang $(2)$ mà áp suất $p$ phụ thuộc tuyến tính vào nhiệt độ tuyệt đối $T$ theo hệ thức $p = aT$ (với $a > 0$ là hằng số). Biết ở trạng thái $(1)$, khí có nhiệt độ $T_1 = 300\\text{ K}$ và áp suất $p_1 = 1,5\\times 10^5\\text{ Pa}$; ở trạng thái $(2)$, nhiệt độ khí là $T_2 = 600\\text{ K}$. Cho hằng số khí lý tưởng $R = 8,31\\text{ J/(mol}\\cdot\\text{K)}$. Xét tính Đúng/Sai của các nhận định sau:',
      statements: [
        {
          id: 'a',
          text: 'Quá trình biến đổi từ trạng thái $(1)$ sang trạng thái $(2)$ tuân theo quy luật $p = aT$ là quá trình đẳng tích ($V = \\text{hằng số}$).',
          isTrue: true,
          explanation: 'Từ phương trình Clapeyron $pV = nRT \\Rightarrow \\frac{p}{T} = \\frac{nR}{V} = a = \\text{const}$, suy ra thể tích $V$ không đổi.',
        },
        {
          id: 'b',
          text: 'Áp suất của khối khí ở trạng thái $(2)$ có giá trị bằng $p_2 = 4,5\\times 10^5\\text{ Pa}$.',
          isTrue: false,
          explanation: 'Vì $\\frac{p_2}{T_2} = \\frac{p_1}{T_1} \\Rightarrow p_2 = p_1\\frac{T_2}{T_1} = 1,5\\times 10^5 \\times \\frac{600}{300} = 3,0\\times 10^5\\text{ Pa}$ (không phải $4,5\\times 10^5\\text{ Pa}$).',
        },
        {
          id: 'c',
          text: 'Thể tích của khối khí trong suốt quá trình biến đổi xấp xỉ bằng $V \\approx 16,62\\text{ lít}$.',
          isTrue: true,
          explanation: 'Ta có $V = \\frac{nRT_1}{p_1} = \\frac{1,0 \\times 8,31 \\times 300}{1,5\\times 10^5} = 0,01662\\text{ m}^3 = 16,62\\text{ lít}$.',
        },
        {
          id: 'd',
          text: 'Trong quá trình từ $(1)$ sang $(2)$, khối khí đã thực hiện một công cơ học dương $A > 0$ lên thành bình.',
          isTrue: false,
          explanation: 'Vì đây là quá trình đẳng tích ($\\Delta V = 0$) nên khối khí không thực hiện công ($A = 0$).',
        },
      ],
      points: 1.0,
      explanation:
        'Quá trình có $p = aT \\iff \\frac{p}{T} = \\text{const}$ là quá trình đẳng tích ($V_1 = V_2 = 16,62\\text{ L}$, $A = 0$) và áp suất tăng tỉ lệ thuận với $T$ nên $p_2 = 2p_1 = 3,0\\times 10^5\\text{ Pa}$.',
      has_image: true,
      image_url: WATER_HEATING_GRAPH_HINH2_SVG_DATA_URI,
    },
    {
      id: 'P2-Q2',
      topic: 'Cảm ứng điện từ — Thanh dẫn chuyển động trong từ trường',
      stem: 'Một thanh dẫn điện thẳng $MN$ có chiều dài $L = 0,50\\text{ m}$, điện trở $r = 0,5\\text{ }\\Omega$ trượt đều không ma sát với tốc độ $v = 4,0\\text{ m/s}$ trên hai thanh ray song song nằm ngang đặt trong từ trường đều có vectơ cảm ứng từ $\\vec{B}$ thẳng đứng hướng từ trên xuống dưới, độ lớn $B = 0,40\\text{ T}$. Hai đầu thanh ray nối với một điện trở tải $R = 1,5\\text{ }\\Omega$ tạo thành mạch kín. Bỏ qua điện trở của hai thanh ray và các tiếp điểm.',
      statements: [
        {
          id: 'a',
          text: 'Độ lớn suất điện động cảm ứng xuất hiện trong thanh dẫn $MN$ khi trượt đều là $|e_c| = 0,80\\text{ V}$.',
          isTrue: true,
          explanation: 'Suất điện động cảm ứng trong đoạn dây chuyển động vuông góc đường sức từ: $|e_c| = BvL = 0,40 \\times 4,0 \\times 0,50 = 0,80\\text{ V}$.',
        },
        {
          id: 'b',
          text: 'Cường độ dòng điện cảm ứng chạy qua điện trở $R$ có giá trị là $I_c = 0,40\\text{ A}$.',
          isTrue: true,
          explanation: 'Tổng trở của mạch kín là $R_{\\text{tp}} = R + r = 1,5 + 0,5 = 2,0\\text{ }\\Omega$. Dòng điện cảm ứng $I_c = \\frac{|e_c|}{R + r} = \\frac{0,80}{2,0} = 0,40\\text{ A}$.',
        },
        {
          id: 'c',
          text: 'Lực từ tác dụng lên thanh $MN$ có cùng chiều với vectơ vận tốc $\\vec{v}$ của thanh.',
          isTrue: false,
          explanation: 'Theo định luật Lenz, dòng điện cảm ứng sinh ra lực từ $F_t$ luôn cản trở chuyển động tạo ra nó, nên $\\vec{F_t}$ ngược chiều với $\\vec{v}$.',
        },
        {
          id: 'd',
          text: 'Để giữ cho thanh $MN$ trượt thẳng đều với tốc độ $v = 4,0\\text{ m/s}$, cần tác dụng một ngoại lực kéo có công suất cơ học bằng $0,64\\text{ W}$.',
          isTrue: false,
          explanation: 'Lực từ $F_t = BI_c L = 0,40 \\times 0,40 \\times 0,50 = 0,08\\text{ N}$. Công suất ngoại lực kéo $\\mathcal{P} = F_{\\text{kéo}} v = 0,08 \\times 4,0 = 0,32\\text{ W}$ (bằng công suất tỏa nhiệt $I_c^2(R+r) = 0,32\\text{ W}$, không phải $0,64\\text{ W}$).',
        },
      ],
      points: 1.0,
      explanation:
        'Ta có $|e_c| = BvL = 0,80\\text{ V}$, $I_c = \\frac{0,80}{1,5+0,5} = 0,40\\text{ A}$, lực từ ngược chiều $\\vec{v}$ có độ lớn $F_t = 0,08\\text{ N}$ và công suất kéo đều là $\\mathcal{P} = 0,32\\text{ W}$.',
    },
    {
      id: 'P2-Q3',
      topic: 'Dao động điều hòa của con lắc lò xo',
      stem: 'Một con lắc lò xo nằm ngang gồm lò xo nhẹ có độ cứng $k = 100\\text{ N/m}$ và vật nhỏ có khối lượng $m = 0,25\\text{ kg}$. Vật dao động điều hòa dọc theo trục $Ox$ với phương trình $x = 6\\cos(20t - \\frac{\\pi}{2})\\text{ (cm)}$, trong đó $t$ tính bằng giây ($\\text{s}$). Bỏ qua mọi ma sát.',
      statements: [
        {
          id: 'a',
          text: 'Tần số góc của con lắc là $\\omega = 20\\text{ rad/s}$ và biên độ dao động là $A = 6\\text{ cm}$.',
          isTrue: true,
          explanation: 'So sánh với phương trình chuẩn $x = A\\cos(\\omega t + \\varphi)$ hoặc tính $\\omega = \\sqrt{\\frac{k}{m}} = \\sqrt{\\frac{100}{0,25}} = 20\\text{ rad/s}$, biên độ $A = 6\\text{ cm}$.',
        },
        {
          id: 'b',
          text: 'Tại thời điểm ban đầu $t = 0$, vật đi qua vị trí cân bằng $x = 0$ theo chiều dương của trục $Ox$.',
          isTrue: true,
          explanation: 'Tại $t = 0$, pha ban đầu $\\varphi = -\\frac{\\pi}{2} \\Rightarrow x(0) = 0$ và $v(0) = -\\omega A\\sin(-\\frac{\\pi}{2}) = +\\omega A > 0$ (theo chiều dương).',
        },
        {
          id: 'c',
          text: 'Cơ năng toàn phần của con lắc lò xo trong quá trình dao động bằng $W = 1,8\\text{ J}$.',
          isTrue: false,
          explanation: 'Đổi $A = 0,06\\text{ m}$. Cơ năng $W = \\frac{1}{2}kA^2 = \\frac{1}{2}\\times 100 \\times (0,06)^2 = 0,18\\text{ J}$ (không phải $1,8\\text{ J}$).',
        },
        {
          id: 'd',
          text: 'Độ lớn lực đàn hồi cực đại tác dụng lên vật trong quá trình dao động là $F_{\\max} = 6,0\\text{ N}$.',
          isTrue: true,
          explanation: 'Con lắc lò xo nằm ngang nên $F_{\\text{đh max}} = kA = 100 \\times 0,06 = 6,0\\text{ N}$.',
        },
      ],
      points: 1.0,
      explanation:
        'Con lắc có $\\omega = 20\\text{ rad/s}$, $A = 0,06\\text{ m}$, cơ năng $W = \\frac{1}{2}kA^2 = 0,18\\text{ J}$ và lực đàn hồi cực đại $F_{\\max} = kA = 6,0\\text{ N}$.',
    },
    {
      id: 'P2-Q4',
      topic: 'Vật lý hạt nhân — Phản ứng tổng hợp hạt nhân',
      stem: 'Xét phản ứng nhiệt hạch tổng hợp hạt nhân Helium: $$^{2}_{1}\\text{H} + ^{3}_{1}\\text{H} \\rightarrow ^{4}_{2}\\text{He} + ^{1}_{0}\\text{n}$$ Biết khối lượng của các hạt nhân trước và sau phản ứng lần lượt là $m_{\\text{D}} = 2,01355\\text{ amu}$; $m_{\\text{T}} = 3,01550\\text{ amu}$; $m_{\\alpha} = 4,00150\\text{ amu}$; $m_n = 1,00866\\text{ amu}$ và lấy $1\\text{ amu}\\cdot c^2 = 931,5\\text{ MeV}$.',
      statements: [
        {
          id: 'a',
          text: 'Tổng số nucleon (số khối $A$) và tổng điện tích ($Z$) đều được bảo toàn trong phản ứng trên.',
          isTrue: true,
          explanation: 'Tổng số khối trước và sau: $2 + 3 = 4 + 1 = 5$. Tổng số điện tích: $1 + 1 = 2 + 0 = 2$.',
        },
        {
          id: 'b',
          text: 'Tổng khối lượng nghỉ của các hạt trước phản ứng lớn hơn tổng khối lượng nghỉ của các hạt sau phản ứng một lượng $\\Delta m = 0,01889\\text{ amu}$.',
          isTrue: true,
          explanation: '$m_{\\text{trước}} = 2,01355 + 3,01550 = 5,02905\\text{ amu}$; $m_{\\text{sau}} = 4,00150 + 1,00866 = 5,01016\\text{ amu}$. Độ giảm khối lượng $\\Delta m = 5,02905 - 5,01016 = 0,01889\\text{ amu}$.',
        },
        {
          id: 'c',
          text: 'Phản ứng hạt nhân trên là phản ứng thu năng lượng từ môi trường ngoài.',
          isTrue: false,
          explanation: 'Vì $m_{\\text{trước}} > m_{\\text{sau}}$ nên phản ứng tỏa năng lượng $W_{\\text{tỏa}} = \\Delta m c^2 > 0$.',
        },
        {
          id: 'd',
          text: 'Năng lượng tỏa ra của một phản ứng nhiệt hạch trên xấp xỉ bằng $17,6\\text{ MeV}$.',
          isTrue: true,
          explanation: '$W_{\\text{tỏa}} = 0,01889 \\times 931,5 \\approx 17,596\\text{ MeV} \\approx 17,6\\text{ MeV}$.',
        },
      ],
      points: 1.0,
      explanation:
        'Phản ứng nhiệt hạch D-T có $\\Delta m = 0,01889\\text{ amu} > 0$, là phản ứng tỏa năng lượng với $W_{\\text{tỏa}} \\approx 17,6\\text{ MeV}$ cho mỗi hạt nhân $^{4}_{2}\\text{He}$ tạo thành.',
    },
  ],
  part3: [
    {
      id: 'P3-Q1',
      topic: 'Mạch dao động điện từ LC',
      question:
        'Một mạch dao động điện từ lý tưởng $LC$ gồm cuộn cảm thuần có độ tự cảm $L = \\frac{1}{\\pi}\\text{ mH}$ và tụ điện có điện dung $C = \\frac{25}{\\pi}\\text{ nF}$. Tính tần số dao động điện từ riêng $f$ của mạch theo đơn vị kilôhéc ($\\text{kHz}$).',
      unit: 'kHz',
      answer: '100',
      points: 0.25,
      explanation:
        'Tần số dao động riêng của mạch $LC$: $$f = \\frac{1}{2\\pi\\sqrt{LC}} = \\frac{1}{2\\pi\\sqrt{\\frac{1}{\\pi}\\times 10^{-3} \\times \\frac{25}{\\pi}\\times 10^{-9}}} = \\frac{1}{2 \\times 5 \\times 10^{-6}} = 10^5\\text{ Hz} = 100\\text{ kHz}$$',
    },
    {
      id: 'P3-Q2',
      topic: 'Phương trình trạng thái khí lý tưởng',
      question:
        'Một bình kín có dung tích không đổi $V = 8,31\\text{ lít}$ chứa $n = 0,5\\text{ mol}$ khí lý tưởng ở nhiệt độ $t = 27^\\circ\\text{C}$. Biết hằng số khí lý tưởng $R = 8,31\\text{ J/(mol}\\cdot\\text{K)}$. Tính áp suất $p$ của khí trong bình theo đơn vị $10^5\\text{ Pa}$ (làm tròn đến một chữ số thập phân).',
      unit: '10^5 Pa',
      answer: '1,5',
      points: 0.25,
      explanation:
        'Đổi $V = 8,31\\times 10^{-3}\\text{ m}^3$ và $T = 27 + 273 = 300\\text{ K}$. Từ phương trình Clapeyron: $$p = \\frac{nRT}{V} = \\frac{0,5 \\times 8,31 \\times 300}{8,31 \\times 10^{-3}} = 1,5 \\times 10^5\\text{ Pa}$$ Vậy giá trị cần điền là $1,5$.',
      has_image: true,
      image_url: THERMAL_EQUILIBRIUM_GRAPH_HINH3_SVG_DATA_URI,
    },
    {
      id: 'P3-Q3',
      topic: 'Cân bằng nhiệt & Nhiệt lượng',
      question:
        'Cung cấp nhiệt lượng $Q = 168\\text{ kJ}$ cho $m = 2,0\\text{ kg}$ nước có nhiệt dung riêng $c = 4200\\text{ J/(kg}\\cdot\\text{K)}$. Bỏ qua sự tỏa nhiệt ra môi trường. Độ tăng nhiệt độ $\\Delta t$ của lượng nước trên bằng bao nhiêu $^\\circ\\text{C}$?',
      unit: '°C',
      answer: '20',
      points: 0.25,
      explanation:
        'Từ công thức $Q = mc\\Delta t \\Rightarrow \\Delta t = \\frac{Q}{mc} = \\frac{168000}{2,0 \\times 4200} = 20^\\circ\\text{C}$.',
      has_image: true,
      image_url: THERMAL_EQUILIBRIUM_GRAPH_HINH3_SVG_DATA_URI,
    },
    {
      id: 'P3-Q4',
      topic: 'Máy biến áp lý tưởng',
      question:
        'Một máy biến áp lý tưởng có số vòng dây cuộn sơ cấp là $N_1 = 1000\\text{ vòng}$ và cuộn thứ cấp là $N_2 = 250\\text{ vòng}$. Đặt vào hai đầu cuộn sơ cấp điện áp xoay chiều có giá trị hiệu dụng $U_1 = 220\\text{ V}$. Điện áp hiệu dụng $U_2$ ở hai đầu cuộn thứ cấp để hở bằng bao nhiêu Vôn ($\\text{V}$)?',
      unit: 'V',
      answer: '55',
      points: 0.25,
      explanation:
        'Công thức máy biến áp lý tưởng: $$\\frac{U_2}{U_1} = \\frac{N_2}{N_1} \\Rightarrow U_2 = 220 \\times \\frac{250}{1000} = 55\\text{ V}$$',
    },
    {
      id: 'P3-Q5',
      topic: 'Giao thoa sóng ánh sáng Young',
      question:
        'Trong thí nghiệm Young về giao thoa ánh sáng đơn sắc có bước sóng $\\lambda = 0,6\\text{ }\\mu\\text{m}$, khoảng cách giữa hai khe hẹp là $a = 1,2\\text{ mm}$, khoảng cách từ mặt phẳng chứa hai khe đến màn quan sát là $D = 2,0\\text{ m}$. Khoảng vân $i$ trên màn bằng bao nhiêu milimét ($\\text{mm}$)?',
      unit: 'mm',
      answer: '1',
      points: 0.25,
      explanation:
        'Khoảng vân giao thoa: $$i = \\frac{\\lambda D}{a} = \\frac{0,6 \\times 2,0}{1,2} = 1,0\\text{ mm}$$',
    },
    {
      id: 'P3-Q6',
      topic: 'Độ phóng xạ & Hạt nhân',
      question:
        'Một mẫu chất phóng xạ có chu kỳ bán rã $T = 138\\text{ ngày}$. Sau thời gian $t = 276\\text{ ngày}$, số hạt nhân phóng xạ còn lại trong mẫu chiếm bao nhiêu phần trăm ($\\%$) so với số hạt nhân ban đầu?',
      unit: '%',
      answer: '25',
      points: 0.25,
      explanation:
        'Tỉ lệ phần trăm số hạt nhân còn lại sau thời gian $t = 2T$: $$\\frac{N}{N_0} = 2^{-\\frac{t}{T}} = 2^{-\\frac{276}{138}} = 2^{-2} = 0,25 = 25\\%$$',
    },
  ],
};

export const COMPACT_8_PHYSICS_EXAM: ExamData = {
  examId: 'GDPT2018-VL12-DEMO-8Q',
  title: 'Đề Kiểm Tra Nhanh Vật Lý 12 GDPT 2018 (Bản Rút Gọn 8 Câu)',
  subject: 'Vật Lý 12',
  grade: 'Lớp 12',
  curriculum: 'Chương trình GDPT 2018 — Bộ GD&ĐT',
  durationMinutes: 25,
  part1: FULL_MOET_28_PHYSICS_EXAM.part1.slice(0, 4),
  part2: FULL_MOET_28_PHYSICS_EXAM.part2.slice(0, 2),
  part3: FULL_MOET_28_PHYSICS_EXAM.part3.slice(0, 2),
};

export const INITIAL_WORKSTATION_NODES: WorkstationNode[] = [
  {
    workstationId: 'MAY-02',
    ipAddress: '192.168.1.102',
    studentName: 'Nguyễn Minh Quân',
    studentId: '120045',
    examCode: '101',
    status: 'ACTIVE',
    answeredCount: 24,
    totalQuestions: 28,
    remainingSeconds: 1420,
    violationCount: 0,
    lastEventText: 'Đang làm Phần III (Câu 26)',
  },
  {
    workstationId: 'MAY-03',
    ipAddress: '192.168.1.103',
    studentName: 'Trần Ngọc Bảo Trâm',
    studentId: '120089',
    examCode: '102',
    status: 'SUBMITTED',
    answeredCount: 28,
    totalQuestions: 28,
    remainingSeconds: 615,
    violationCount: 0,
    lastEventText: 'Đã nộp bài hoàn tất',
    score: 9.25,
  },
  {
    workstationId: 'MAY-04',
    ipAddress: '192.168.1.104',
    studentName: 'Lê Hoàng Bách',
    studentId: '120112',
    examCode: '103',
    status: 'VIOLATION_WARN',
    answeredCount: 19,
    totalQuestions: 28,
    remainingSeconds: 1180,
    violationCount: 2,
    lastEventText: 'Cảnh báo: Chuyển tab trình duyệt (Lần 2)',
  },
  {
    workstationId: 'MAY-05',
    ipAddress: '192.168.1.105',
    studentName: 'Phạm Phương Anh',
    studentId: '120156',
    examCode: '104',
    status: 'ACTIVE',
    answeredCount: 26,
    totalQuestions: 28,
    remainingSeconds: 980,
    violationCount: 0,
    lastEventText: 'Đang kiểm tra lại câu đánh dấu',
  },
  {
    workstationId: 'MAY-06',
    ipAddress: '192.168.1.106',
    studentName: 'Vũ Đức Thịnh',
    studentId: '120203',
    examCode: '101',
    status: 'SUBMITTED',
    answeredCount: 28,
    totalQuestions: 28,
    remainingSeconds: 410,
    violationCount: 1,
    lastEventText: 'Đã nộp bài (1 lần thoát toàn màn hình)',
    score: 8.50,
  },
];
