/* Port of project_20260506_092326/projects/src/main.ts (+ conferences helpers) */

function escapeHtml(raw) {
  if (raw == null || raw === '') return '';
  const div = document.createElement('div');
  div.textContent = String(raw);
  return div.innerHTML;
}

function padZero(num) {
  return num.toString().padStart(2, '0');
}

const MONTH_LOOKUP = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function safeParseDate(dateStr) {
  if (!dateStr || dateStr === 'TBD') return null;
  const monthMap = {
    January: 1,
    February: 2,
    March: 3,
    April: 4,
    May: 5,
    June: 6,
    July: 7,
    August: 8,
    September: 9,
    October: 10,
    November: 11,
    December: 12,
  };
  let rangeMatch = dateStr.match(/^([A-Z][a-z]+)\s+(\d+)(?:\s*-\s*\d+)?,?\s+(\d{4})$/);
  if (rangeMatch) {
    const month = monthMap[rangeMatch[1]];
    const day = parseInt(rangeMatch[2], 10);
    const year = parseInt(rangeMatch[3], 10);
    if (month) return new Date(year, month - 1, day);
  }
  rangeMatch = dateStr.match(/^([A-Z][a-z]+)\s+(\d+)\s*(?:-|–)\s*\d+[,\s]+(\d{4})$/);
  if (rangeMatch) {
    const month = monthMap[rangeMatch[1]];
    const day = parseInt(rangeMatch[2], 10);
    const year = parseInt(rangeMatch[3], 10);
    if (month) return new Date(year, month - 1, day);
  }
  const normalMatch = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (normalMatch) {
    return new Date(parseInt(normalMatch[1], 10), parseInt(normalMatch[2], 10) - 1, parseInt(normalMatch[3], 10));
  }
  const d = new Date(dateStr.replace(/\//g, '-'));
  return Number.isNaN(d.getTime()) ? null : d;
}

// 2026-07-27 / 2026/07/27 → 本地日历当天 23:59:59.999（避免 JS 把 YYYY-MM-DD 当作 UTC）
function deadlineEndLocalFromNumeric(raw) {
  const t = String(raw || '').trim();
  const m = t.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return new Date(y, mo, d, 23, 59, 59, 999);
}

// July 2 - 7, 2026 / February 16-23, 2027 → 区间首日 00:00（用于比较/排序）
function rangeStartLocalFromEnglish(raw) {
  const t = String(raw || '').trim();
  const m = t.match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s*[-–]\s*\d{1,2})?\s*,\s*(\d{4})$/);
  if (!m) return null;
  const monIdx = MONTH_LOOKUP[m[1].toLowerCase()];
  if (monIdx === undefined) return null;
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (day < 1 || day > 31) return null;
  return new Date(year, monIdx, day, 0, 0, 0, 0);
}

function countdownTargetMoment(dateStr) {
  const t = String(dateStr || '').trim();
  if (!t || t === 'TBD') return null;
  const numericEnd = deadlineEndLocalFromNumeric(t);
  if (numericEnd) return numericEnd;
  return rangeStartLocalFromEnglish(t);
}

function submissionDeadlineEnd(raw) {
  if (!raw || raw === 'TBD') return null;
  return deadlineEndLocalFromNumeric(String(raw).trim());
}

function conferenceOpeningStart(raw) {
  if (!raw || raw === 'TBD') return null;
  const t = String(raw).trim();
  const m = t.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    return new Date(y, mo, d, 0, 0, 0, 0);
  }
  return rangeStartLocalFromEnglish(t);
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'TBD') return 'TBD';
  if (dateStr.match(/^[A-Z][a-z]+ \d/)) return dateStr;
  const date = new Date(dateStr.replace(/\//g, '-'));
  if (Number.isNaN(date.getTime())) return escapeHtml(dateStr);
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
}

function calculateCountdown(targetDate) {
  const now = new Date();
  const target = countdownTargetMoment(targetDate);
  if (target === null || Number.isNaN(target.getTime())) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true, label: '日期无效' };
  }
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true, label: '已截止' };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, isOver: false, label: '' };
}

function getNextDeadline(conference) {
  const now = new Date();
  for (const event of conference.timeline || []) {
    if (event.date && event.date !== 'TBD') {
      const moment = countdownTargetMoment(event.date);
      if (moment !== null && moment.getTime() > now.getTime()) return event;
    }
  }
  return null;
}

function getDeadlineSortTime(conference) {
  const submissionEnd = submissionDeadlineEnd(conference.dates?.submission);
  const now = Date.now();
  if (submissionEnd && submissionEnd.getTime() >= now) return submissionEnd.getTime();
  return Number.POSITIVE_INFINITY;
}

function sortByDeadlineUrgency(conferences) {
  return [...conferences].sort((a, b) => {
    const aTime = getDeadlineSortTime(a);
    const bTime = getDeadlineSortTime(b);
    if (aTime !== bTime) return aTime - bTime;
    const aName = String(a.shortName || a.name || '');
    const bName = String(b.shortName || b.name || '');
    return aName.localeCompare(bName, 'zh-CN', { sensitivity: 'base' });
  });
}

function getConferenceStatus(conference) {
  const now = new Date();
  const submissionEnd = submissionDeadlineEnd(conference.dates?.submission);
  const confStart = conferenceOpeningStart(conference.dates?.conference);

  if (submissionEnd && now.getTime() <= submissionEnd.getTime()) {
    const msLeft = submissionEnd.getTime() - now.getTime();
    const daysUntilSubmission = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    return daysUntilSubmission <= 7 ? 'deadline' : 'upcoming';
  }

  if (submissionEnd && confStart && now.getTime() > submissionEnd.getTime() && now.getTime() < confStart.getTime()) {
    return 'ongoing';
  }

  return 'past';
}

function renderCountdown(countdown, isUrgent = false) {
  if (countdown.isOver) {
    return `<div class="countdown-display"><span class="text-red-500 font-semibold">已截止</span></div>`;
  }
  const urgencyClass = isUrgent ? 'text-red-500' : 'text-primary-600';
  return `
      <div class="countdown-display flex items-center justify-center gap-2">
      <div class="flex gap-1">
        <div class="countdown-item ${urgencyClass}">
          <span class="countdown-number">${padZero(countdown.days)}</span>
          <span class="countdown-label">天</span>
        </div>
        <span class="${urgencyClass} text-lg">:</span>
        <div class="countdown-item ${urgencyClass}">
          <span class="countdown-number">${padZero(countdown.hours)}</span>
          <span class="countdown-label">时</span>
        </div>
        <span class="${urgencyClass} text-lg">:</span>
        <div class="countdown-item ${urgencyClass}">
          <span class="countdown-number">${padZero(countdown.minutes)}</span>
          <span class="countdown-label">分</span>
        </div>
        <span class="${urgencyClass} text-lg">:</span>
        <div class="countdown-item ${urgencyClass}">
          <span class="countdown-number">${padZero(countdown.seconds)}</span>
          <span class="countdown-label">秒</span>
        </div>
      </div></div>`;
}

function renderRatingBadge(rating) {
  const colors = {
    A: 'bg-red-100 text-red-700 border-red-200',
    B: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    C: 'bg-green-100 text-green-700 border-green-200',
  };
  const colorClass =
    colors[rating] ||
    (!rating || rating === 'N'
      ? 'bg-slate-100 text-slate-700 border-slate-200'
      : 'bg-gray-100 text-gray-700 border-gray-200');
  return `<span class="rating-badge ${colorClass}">${escapeHtml('CCF-' + (rating || '—'))}</span>`;
}

function renderStatusBadge(status) {
  const statusMap = {
    deadline: { class: 'tag-deadline', text: '截稿倒计时' },
    upcoming: { class: 'tag-upcoming', text: '即将开始' },
    ongoing: { class: 'tag-ongoing', text: '审稿中' },
    past: { class: 'bg-gray-100 text-gray-600', text: '已结束' },
  };
  const info = statusMap[status] || statusMap.upcoming;
  return `<span class="tag ${info.class}">${escapeHtml(info.text)}</span>`;
}

const DOMAIN_ALIASES = [
  {
    aliases: ['nlp', 'natural language processing', 'computational linguistics', '自然语言处理', '自然语言', '语言处理', '计算语言学'],
    terms: ['acl', 'emnlp', 'naacl', 'eacl', 'coling', 'conll', 'ijcnlp', 'nlpcc', 'colm', 'lrec', 'aacl', 'computational linguistics'],
  },
  {
    aliases: ['llm', '大语言模型', '语言模型', '预训练语言模型', 'instruction tuning', 'rlhf', 'prompting'],
    terms: ['acl', 'emnlp', 'naacl', 'eacl', 'coling', 'colm', 'iclr', 'neurips', 'llm', 'language model'],
  },
  {
    aliases: ['information extraction', 'ie', '信息抽取', '命名实体识别', '实体识别', '关系抽取', '事件抽取'],
    terms: ['acl', 'emnlp', 'naacl', 'coling', 'conll', 'information extraction', 'named entity recognition'],
  },
  {
    aliases: ['machine translation', 'mt', '机器翻译', '翻译'],
    terms: ['acl', 'emnlp', 'naacl', 'eacl', 'coling', 'wmt', 'machine translation'],
  },
  {
    aliases: ['question answering', 'qa', '问答系统', '阅读理解'],
    terms: ['acl', 'emnlp', 'naacl', 'coling', 'question answering', 'reading comprehension'],
  },
  {
    aliases: ['cv', 'computer vision', 'vision', '视觉', '计算机视觉', '模式识别', '图像识别'],
    terms: ['cvpr', 'iccv', 'eccv', 'accv', 'wacv', 'bmvc', 'icpr', '3dv', 'fg', 'computer vision', 'pattern recognition'],
  },
  {
    aliases: ['object detection', 'detection', '目标检测', '检测'],
    terms: ['cvpr', 'iccv', 'eccv', 'wacv', 'accv', 'bmvc', 'icpr', 'object detection'],
  },
  {
    aliases: ['image segmentation', 'segmentation', '图像分割', '语义分割', '实例分割', '全景分割'],
    terms: ['cvpr', 'iccv', 'eccv', 'wacv', 'accv', 'bmvc', 'segmentation'],
  },
  {
    aliases: ['tracking', 'object tracking', '跟踪', '目标跟踪', '多目标跟踪'],
    terms: ['cvpr', 'iccv', 'eccv', 'wacv', 'accv', 'bmvc', 'tracking'],
  },
  {
    aliases: ['video understanding', 'video analysis', '视频理解', '动作识别', '时空建模'],
    terms: ['cvpr', 'iccv', 'eccv', 'acm mm', 'icme', 'icmr', 'video understanding', 'action recognition'],
  },
  {
    aliases: ['3d vision', '3d reconstruction', '三维视觉', '三维重建', '点云', 'neural rendering', '新视角合成'],
    terms: ['3dv', 'cvpr', 'iccv', 'eccv', 'siggraph', 'siggraph asia', '3d vision', '3d reconstruction'],
  },
  {
    aliases: ['multimodal', 'vision language', 'vlm', '多模态', '视觉语言', '图文', '视频语言'],
    terms: ['cvpr', 'iccv', 'eccv', 'acm mm', 'acl', 'emnlp', 'multimodal', 'vision language'],
  },
  {
    aliases: ['image generation', 'generation', 'aigc', '图像生成', '生成式视觉', '扩散模型', 'diffusion'],
    terms: ['cvpr', 'iccv', 'eccv', 'siggraph', 'neurips', 'iclr', 'diffusion', 'generation'],
  },
  {
    aliases: ['multimedia', '多媒体', '图像处理', '视频处理'],
    terms: ['acm mm', 'mm', 'mmsys', 'icme', 'icmr', 'icip', 'interspeech', '多媒体', '图像处理', '视频处理'],
  },
  {
    aliases: ['ml', 'machine learning', '机器学习', '深度学习', 'learning'],
    terms: ['icml', 'iclr', 'nips', 'neurips', 'aistats', 'uai', 'acml', 'mlsys', '机器学习', '深度学习'],
  },
  {
    aliases: ['reinforcement learning', 'rl', '强化学习'],
    terms: ['neurips', 'icml', 'iclr', 'aamas', 'uai', 'corl', 'rss', 'reinforcement learning'],
  },
  {
    aliases: ['graph learning', 'gnn', '图学习', '图神经网络'],
    terms: ['neurips', 'iclr', 'icml', 'kdd', 'www', 'graph learning', 'graph neural network'],
  },
  {
    aliases: ['federated learning', '联邦学习', 'privacy learning', '隐私学习'],
    terms: ['neurips', 'icml', 'iclr', 'kdd', 'www', 'federated learning'],
  },
  {
    aliases: ['symbolic regression', 'symbolic learning', '符号回归', '符号学习', '遗传编程', 'genetic programming'],
    terms: ['gecco', 'ppsn', 'icml', 'neurips', 'ecml-pkdd', 'aaai', 'ijcai', 'symbolic regression', 'genetic programming'],
  },
  {
    aliases: ['ai', 'artificial intelligence', '人工智能'],
    terms: ['aaai', 'ijcai', 'ecai', 'aamas', 'pricai', '人工智能'],
  },
  {
    aliases: ['cryptography', 'crypto', '密码学', '同态加密', '零知识', 'zk'],
    terms: ['crypto', 'eurocrypt', 'asiacrypt', 'pkc', 'tcc', 'ches', 'cryptography'],
  },
  {
    aliases: ['security', '安全', '网络安全', '信息安全'],
    terms: ['ccs', 'sp', 's&p', 'uss', 'usenix security', 'ndss', 'crypto', 'eurocrypt', 'asiacrypt', 'esorics', 'acsac', 'ches', '网络与信息安全', '密码学', '安全协议'],
  },
  {
    aliases: ['system security', 'systems security', '系统安全', '漏洞利用', '软件安全'],
    terms: ['ccs', 'sp', 'uss', 'ndss', 'acsac', 'esorics', 'system security'],
  },
  {
    aliases: ['privacy', '隐私保护', '差分隐私', '匿名化'],
    terms: ['pets', 'ccs', 'sp', 'uss', 'ndss', 'privacy'],
  },
  {
    aliases: ['database', 'db', '数据库', '数据挖掘', '检索'],
    terms: ['sigmod', 'vldb', 'icde', 'pods', 'kdd', 'sigkdd', 'sigir', 'cikm', 'wsdm', 'icdm', '数据库', '数据挖掘', '信息检索'],
  },
  {
    aliases: ['information retrieval', 'ir', '搜索', '检索', '推荐', 'recommendation', 'recsys'],
    terms: ['sigir', 'wsdm', 'cikm', 'recsys', 'kdd', 'information retrieval', 'recommendation'],
  },
  {
    aliases: ['data mining', 'mining', '数据挖掘', '知识发现'],
    terms: ['kdd', 'icdm', 'sdm', 'cikm', 'wsdm', 'data mining'],
  },
  {
    aliases: ['network', 'networks', '网络', '计算机网络', '分布式系统'],
    terms: ['sigcomm', 'nsdi', 'infocom', 'conext', 'mobicom', 'mobisys', 'sensys', '计算机网络', '网络通信', '分布式系统'],
  },
  {
    aliases: ['wireless', 'mobile', '无线网络', '移动计算', '物联网', 'sensor network'],
    terms: ['mobicom', 'mobisys', 'sensys', 'ipsn', 'secon', 'wireless', 'mobile'],
  },
  {
    aliases: ['distributed systems', 'distributed', '分布式系统', '云计算', 'cloud'],
    terms: ['nsdi', 'eurosys', 'atc', 'sosp', 'osdi', 'middleware', 'distributed systems', 'cloud'],
  },
  {
    aliases: ['hci', 'human computer interaction', '人机交互', '普适计算'],
    terms: ['chi', 'uist', 'cscw', 'ubicomp', 'percom', 'iui', 'icwsm', '人机交互', '普适计算'],
  },
  {
    aliases: ['software engineering', 'se', '软件工程', '程序语言', '编程语言'],
    terms: ['icse', 'fse', 'ase', 'issta', 'pldi', 'popl', 'oopsla', 'icfp', '软件工程', '程序设计语言'],
  },
  {
    aliases: ['testing', 'program analysis', 'verification', '测试', '程序分析', '形式化验证', '静态分析'],
    terms: ['icse', 'fse', 'ase', 'issta', 'cav', 'fm', 'icst', 'program analysis', 'verification'],
  },
  {
    aliases: ['programming language', 'pl', '编程语言', '编译', 'compiler'],
    terms: ['pldi', 'popl', 'oopsla', 'icfp', 'cc', 'programming language', 'compiler'],
  },
  {
    aliases: ['architecture', '体系结构', '高性能计算', '并行计算', '系统'],
    terms: ['isca', 'micro', 'hpca', 'asplos', 'sc', 'hpdc', 'fast', 'eurosys', 'atc', '计算机体系结构', '高性能计算', '并行计算'],
  },
  {
    aliases: ['operating systems', 'os', '存储系统', '系统架构', '操作系统'],
    terms: ['sosp', 'osdi', 'eurosys', 'fast', 'atc', 'operating systems', 'storage'],
  },
  {
    aliases: ['theory', '理论', '算法', '复杂性'],
    terms: ['stoc', 'focs', 'soda', 'cav', 'lics', 'icalp', '计算机科学理论', '算法', '计算复杂性'],
  },
];

const CONFERENCE_PROFILES = {
  CVPR: ['目标检测', '图像分割', '视频理解', '三维视觉', '多模态', '图像生成'],
  ICCV: ['目标检测', '图像分割', '视频理解', '三维视觉', '多模态', '图像生成'],
  ECCV: ['目标检测', '图像分割', '视频理解', '三维视觉', '多模态', '图像生成'],
  WACV: ['目标检测', '图像分割', '图像识别', '视频理解'],
  ACCV: ['目标检测', '图像分割', '三维视觉', '视频理解'],
  BMVC: ['目标检测', '图像分割', '三维视觉', '图像识别'],
  ICPR: ['模式识别', '目标检测', '图像分割', '文档分析'],
  '3DV': ['三维视觉', '三维重建', '点云', '新视角合成'],
  'ACM MM': ['多媒体', '视频理解', '多模态', '跨模态检索'],
  ICME: ['多媒体', '视频理解', '图像处理', '音视频分析'],
  ICMR: ['多媒体检索', '视频检索', '跨模态检索', '推荐'],
  ACL: ['自然语言处理', '大语言模型', '信息抽取', '机器翻译', '问答系统'],
  EMNLP: ['自然语言处理', '大语言模型', '信息抽取', '机器翻译', '问答系统'],
  NAACL: ['自然语言处理', '大语言模型', '信息抽取', '机器翻译', '问答系统'],
  EACL: ['自然语言处理', '信息抽取', '机器翻译', '问答系统'],
  COLING: ['自然语言处理', '信息抽取', '机器翻译', '问答系统'],
  CoNLL: ['信息抽取', '句法分析', '序列标注', '自然语言理解'],
  IJCNLP: ['自然语言处理', '中文处理', '机器翻译', '信息抽取'],
  NLPCC: ['自然语言处理', '中文处理', '信息检索', '对话系统'],
  COLM: ['大语言模型', '基础模型', '模型训练', '推理优化'],
  SIGIR: ['信息检索', '搜索', '推荐系统', '检索增强生成'],
  WSDM: ['信息检索', '搜索', '推荐系统', '数据挖掘'],
  CIKM: ['信息检索', '推荐系统', '知识图谱', '数据挖掘'],
  RecSys: ['推荐系统', '排序', '用户建模', '个性化'],
  'SIGKDD': ['数据挖掘', '推荐系统', '图学习', '工业机器学习'],
  ICDM: ['数据挖掘', '异常检测', '时序分析', '图挖掘'],
  ICML: ['机器学习', '深度学习', '强化学习', '表示学习'],
  ICLR: ['机器学习', '深度学习', '大语言模型', '表示学习', '生成模型'],
  NeurIPS: ['机器学习', '深度学习', '强化学习', '图学习', '生成模型'],
  AISTATS: ['统计机器学习', '概率模型', '优化', '因果推断'],
  UAI: ['概率图模型', '因果推断', '不确定性建模', '机器学习'],
  GECCO: ['进化计算', '遗传编程', '符号回归', '黑盒优化'],
  PPSN: ['进化算法', '遗传编程', '符号回归', '神经进化'],
  AAMAS: ['多智能体', '强化学习', '博弈论', '智能决策'],
  CoRL: ['机器人学习', '强化学习', '模仿学习', '控制'],
  AAAI: ['人工智能', '机器学习', '知识表示', '符号回归'],
  IJCAI: ['人工智能', '机器学习', '知识推理', '符号回归'],
  'ECML-PKDD': ['机器学习', '数据挖掘', '自动机器学习', '符号回归'],
  RSS: ['机器人', '定位建图', '运动规划', '机器人学习'],
  CCS: ['系统安全', '网络安全', '应用安全', '隐私保护'],
  NDSS: ['系统安全', '网络安全', 'Web安全', '恶意软件分析'],
  'S&P': ['系统安全', '网络安全', '隐私保护', '安全理论'],
  'USENIX Security': ['系统安全', '软件安全', 'Web安全', '漏洞利用'],
  CRYPTO: ['密码学', '零知识证明', '安全多方计算', '同态加密'],
  EUROCRYPT: ['密码学', '理论密码学', '零知识证明', '安全协议'],
  ASIACRYPT: ['密码学', '安全协议', '零知识证明', '安全多方计算'],
  CHES: ['密码工程', '侧信道攻击', '硬件安全', '实现安全'],
  PKC: ['公钥密码学', '数字签名', '身份认证', '零知识证明'],
  TCC: ['理论密码学', '安全定义', '零知识证明', '复杂性'],
  NSDI: ['分布式系统', '网络系统', '云基础设施', '存储系统'],
  SIGCOMM: ['计算机网络', '拥塞控制', '数据中心网络', '网络测量'],
  INFOCOM: ['计算机网络', '无线网络', '路由优化', '网络协议'],
  CoNEXT: ['计算机网络', '网络测量', '边缘网络', '移动网络'],
  MobiCom: ['无线网络', '移动计算', '物联网', '边缘系统'],
  MobiSys: ['移动系统', '移动计算', '传感系统', '边缘计算'],
  ICSE: ['软件工程', '程序分析', '软件测试', '开发工具'],
  ASE: ['软件工程', '程序分析', '自动化开发', '软件测试'],
  'ESEC/FSE': ['软件工程', '程序分析', '软件测试', '开发工具'],
  FSE: ['软件工程', '程序分析', '软件测试', '开发工具'],
  ISSTA: ['软件测试', '程序分析', '自动化测试', '缺陷定位'],
  ICST: ['软件测试', '测试自动化', '质量保证', '验证'],
  CAV: ['形式化验证', '模型检查', '程序分析', '定理证明'],
  FM: ['形式化方法', '验证', '建模', '程序正确性'],
};

const QUICK_FILTERS = [
  '目标检测',
  '图像分割',
  '视频理解',
  '多模态',
  '大语言模型',
  '信息抽取',
  '推荐系统',
  '强化学习',
  '符号回归',
  '程序分析',
  '分布式系统',
  '网络安全',
  '密码学',
];

function normalizeSearchText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchableText(conference) {
  return normalizeSearchText(
    [
      conference.shortName,
      conference.name,
      conference.acronym,
      conference.venue,
      conference.description,
      ...(conference.topics || []),
      ...(conference.subtopics || []),
      ...(conference.searchAliases || []),
    ].join(' '),
  );
}

function enrichConference(conference) {
  const profile = CONFERENCE_PROFILES[conference.shortName] || CONFERENCE_PROFILES[conference.acronym] || [];
  const subtopics = [...new Set(profile)];
  const searchAliases = [
    conference.shortName,
    conference.acronym,
    ...subtopics,
  ].filter(Boolean);
  return {
    ...conference,
    subtopics,
    searchAliases,
  };
}

function resolveDomainQuery(rawTerm) {
  const term = normalizeSearchText(rawTerm);
  if (!term) return null;
  return DOMAIN_ALIASES.find((group) => group.aliases.some((alias) => term.includes(normalizeSearchText(alias))));
}

function textMatchesDomainTerm(text, rawTerm) {
  const term = normalizeSearchText(rawTerm);
  if (!term) return false;
  if (/^[a-z0-9&+/.-]+$/.test(term) && !term.includes(' ') && term.length <= 6) {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`);
    return pattern.test(text);
  }
  return text.includes(term);
}

function conferenceMatchesDomain(conference, domain) {
  const text = searchableText(conference);
  return domain.terms.some((term) => textMatchesDomainTerm(text, term));
}

function renderConferenceCard(conference, countdown, nextEvent) {
  const status = getConferenceStatus(conference);
  const isUrgent = status === 'deadline';
  const nextEventText = nextEvent ? `距离 "${escapeHtml(nextEvent.title)}"` : '';
  return `
    <div class="conference-card" data-id="${escapeHtml(conference.id)}">
      <div class="card-header">
        <div class="header-left">
          ${renderRatingBadge(conference.ccfrating)}
          <h3 class="conference-name">${escapeHtml(conference.shortName)}</h3>
          <p class="conference-acronym">${escapeHtml(conference.acronym)}</p>
        </div>
        <div class="header-right">
          ${renderStatusBadge(status)}
        </div>
      </div>
      <div class="card-body">
        <div class="venue-info">
          <svg class="venue-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>${escapeHtml(conference.venue)}</span>
        </div>
        <div class="countdown-section ${isUrgent ? 'countdown-urgent' : ''}">
          <p class="countdown-label-text">${nextEventText}</p>
          ${renderCountdown(countdown, isUrgent)}
        </div>
        <div class="timeline-preview">
          <div class="timeline-item">
            <span class="timeline-date">${formatDate(conference.dates?.submission)}</span>
            <span class="timeline-title">投稿截止</span>
          </div>
          <div class="timeline-item">
            <span class="timeline-date">${formatDate(conference.dates?.conference)}</span>
            <span class="timeline-title">会议召开</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button type="button" class="btn-details" data-id="${escapeHtml(conference.id)}">
          查看详情
          <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </button>
        <a href="${escapeHtml(conference.website)}" target="_blank" rel="noopener noreferrer" class="btn-website">
          官网
          <svg class="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      </div>
    </div>`;
}

function renderDetailModal(conference) {
  const status = getConferenceStatus(conference);
  const stats = conference.statistics;
  const statsBlock =
    stats &&
    `
            <div class="info-section">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 20V10M12 20V4M6 20v-6"></path>
                </svg>
                往届数据
              </h3>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-number">${escapeHtml(stats.acceptanceRate || '—')}</span>
                  <span class="stat-label">录用率</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">${escapeHtml(stats.submissions || '—')}</span>
                  <span class="stat-label">投稿量</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">${escapeHtml(stats.published || '—')}</span>
                  <span class="stat-label">录取量</span>
                </div>
              </div>
            </div>
          `;
  let timelineHtml = '';
  let curMark = false;
  (conference.timeline || []).forEach((event, index) => {
    const sd = safeParseDate(event.date);
    const isPast = sd ? sd < new Date() : false;
    const isCurrent = index === 0 && !isPast && !curMark;
    if (isCurrent) curMark = true;
    timelineHtml += `
                  <div class="timeline-row ${isPast ? 'timeline-past' : ''} ${isCurrent ? 'timeline-current' : ''}">
                    <div class="timeline-dot ${isPast ? 'dot-past' : ''} ${isCurrent ? 'dot-current' : ''}"></div>
                    <div class="timeline-content">
                      <span class="timeline-event-title">${escapeHtml(event.title)}</span>
                      <span class="timeline-event-date">${formatDate(event.date)}</span>
                    </div>
                  </div>`;
  });
  const topics = [...new Set([...(conference.subtopics || []), ...(conference.topics || [])])]
    .map((t) => `<span class="topic-tag">${escapeHtml(t)}</span>`)
    .join('');
  return `
    <div class="modal-overlay" id="modal-${escapeHtml(conference.id)}">
      <div class="modal-content animate-slide-up">
        <button type="button" class="modal-close" data-close="modal-${escapeHtml(conference.id)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="modal-header">
          <div class="modal-badges">
            ${renderRatingBadge(conference.ccfrating)}
            ${renderStatusBadge(status)}
          </div>
          <h2 class="modal-title">${escapeHtml(conference.shortName)}</h2>
          <p class="modal-subtitle">${escapeHtml(conference.name)}</p>
        </div>
        <div class="modal-body">
          <div class="info-section">
            <h3 class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              会议信息
            </h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">举办地点</span>
                <span class="info-value">${escapeHtml(conference.venue)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">会议时间</span>
                <span class="info-value">${formatDate(conference.dates?.conference)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">主办单位</span>
                <span class="info-value">${escapeHtml(conference.organizer)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">官方网站</span>
                <a href="${escapeHtml(conference.website)}" target="_blank" rel="noopener noreferrer" class="info-link">${escapeHtml(conference.website)}</a>
              </div>
            </div>
          </div>
          ${statsBlock || ''}
          <div class="info-section">
            <h3 class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              重要时间节点
            </h3>
            <div class="timeline-list">${timelineHtml}</div>
          </div>
          <div class="info-section">
            <h3 class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              征稿主题
            </h3>
            <div class="topics-list">${topics}</div>
          </div>
          <div class="info-section">
            <h3 class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              会议简介
            </h3>
            <p class="description-text">${escapeHtml(conference.description)}</p>
          </div>
        </div>
        <div class="modal-footer">
          <a href="${escapeHtml(conference.website)}" target="_blank" rel="noopener noreferrer" class="btn-primary">
            访问官网
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </div>
    </div>`;
}

function renderHeader() {
  return `
    <header class="header">
      <div class="header-content">
        <div class="header-brand">
          <div class="brand-icon">
            <img
              class="brand-icon-img"
              src="/static/icon.png"
              alt="算法超人小工具"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
            />
            <svg style="display:none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </div>
          <div class="brand-text">
            <h1 class="brand-title">CCF会议倒计时</h1>
            <p class="brand-subtitle">技术交流微信：suanfachaoren321 · 算法超人小工具 · Python · Flask</p>
          </div>
        </div>
        <div class="header-stats" id="header-stats">
          <div class="stat-pill">
            <span class="stat-pill-number" id="total-count">0</span>
            <span class="stat-pill-label">会议总数</span>
          </div>
          <div class="stat-pill stat-pill-highlight">
            <span class="stat-pill-number" id="deadline-count">0</span>
            <span class="stat-pill-label">截稿临近</span>
          </div>
        </div>
      </div>
    </header>`;
}

function renderFilterBar() {
  return `
    <div class="filter-bar">
      <div class="search-container">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="M21 21l-4.35-4.35"></path>
        </svg>
        <input type="search" class="search-input" id="search-input" placeholder="搜索会议名称、缩写或关键词..." autocomplete="off" />
      </div>
      <div class="quick-filters" id="quick-filters">
        ${QUICK_FILTERS.map(
          (term) =>
            `<button type="button" class="quick-filter-chip" data-term="${escapeHtml(term)}">${escapeHtml(term)}</button>`,
        ).join('')}
      </div>
      <div class="filter-tabs" id="filter-tabs">
        <button type="button" class="filter-tab active" data-filter="all">全部</button>
        <button type="button" class="filter-tab" data-filter="deadline">截稿倒计时</button>
        <button type="button" class="filter-tab" data-filter="upcoming">即将开始</button>
        <button type="button" class="filter-tab" data-filter="ongoing">审稿中</button>
        <button type="button" class="filter-tab" data-filter="A">CCF-A类</button>
        <button type="button" class="filter-tab" data-filter="B">CCF-B类</button>
        <button type="button" class="filter-tab" data-filter="C">CCF-C类</button>
      </div>
    </div>`;
}

function renderAllCards(conferences) {
  return sortByDeadlineUrgency(conferences)
    .map((conf) => {
      const nextEvent = getNextDeadline(conf);
      const targetDate = nextEvent?.date || conf.dates?.submission;
      const countdown = calculateCountdown(targetDate || '');
      return renderConferenceCard(conf, countdown, nextEvent);
    })
    .join('');
}

function updateStats(conferences) {
  const totalEl = document.getElementById('total-count');
  const deadlineEl = document.getElementById('deadline-count');
  if (totalEl) totalEl.textContent = String(conferences.length);
  if (deadlineEl)
    deadlineEl.textContent = String(conferences.filter((c) => getConferenceStatus(c) === 'deadline').length);
}

function getFilteredConferences(filter, searchTerm, conferences) {
  let filtered = conferences;
  if (filter === 'A' || filter === 'B' || filter === 'C') {
    filtered = conferences.filter((c) => c.ccfrating === filter);
  } else if (filter !== 'all') {
    filtered = conferences.filter((c) => getConferenceStatus(c) === filter);
  }
  if (searchTerm.trim()) {
    const term = normalizeSearchText(searchTerm);
    const domain = resolveDomainQuery(term);
    filtered = filtered.filter((c) => {
      if (domain) return conferenceMatchesDomain(c, domain);
      return searchableText(c).includes(term);
    });
  }
  return filtered;
}

function syncQuickFilters(searchTerm) {
  const active = normalizeSearchText(searchTerm);
  document.querySelectorAll('.quick-filter-chip').forEach((chip) => {
    const term = normalizeSearchText(chip.getAttribute('data-term') || '');
    chip.classList.toggle('active', !!active && term === active);
  });
}

function filterCards(filter, searchTerm, conferences) {
  const grid = document.getElementById('cards-grid');
  if (!grid) return [];
  const filtered = getFilteredConferences(filter, searchTerm, conferences);
  grid.innerHTML = renderAllCards(filtered);
  syncQuickFilters(searchTerm);
  return filtered;
}

function showModal(conference) {
  const container = document.getElementById('modal-container');
  if (!container) return;
  container.innerHTML = renderDetailModal(conference);
  requestAnimationFrame(() => {
    const modal = document.getElementById(`modal-${conference.id}`);
    if (modal) modal.classList.add('modal-visible');
  });
  document.body.style.overflow = 'hidden';
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach((modal) => {
    modal.classList.remove('modal-visible');
  });
  document.body.style.overflow = '';
}

function startCountdownUpdate(conferences) {
  setInterval(() => {
    document.querySelectorAll('.conference-card').forEach((card) => {
      const conference = conferences.find((c) => c.id === card.dataset.id);
      if (!conference) return;
      const nextEvent = getNextDeadline(conference);
      const targetDate = nextEvent?.date || conference.dates?.submission || '';
      const countdown = calculateCountdown(targetDate);
      const status = getConferenceStatus(conference);
      const isUrgent = status === 'deadline';
      const countdownEl = card.querySelector('.countdown-display');
      if (countdownEl) countdownEl.outerHTML = renderCountdown(countdown, isUrgent);
      const section = card.querySelector('.countdown-section');
      if (section) section.classList.toggle('countdown-urgent', isUrgent);
    });
  }, 1000);
}

function bootstrap() {
  const el = document.getElementById('ccf-bootstrap');
  if (!el) throw new Error('Missing #ccf-bootstrap');
  try {
    return JSON.parse(el.textContent || '[]').map(enrichConference);
  } catch {
    return [];
  }
}

function bindGlobalUi(conferences) {
  const app = document.getElementById('app');
  if (!app.__ccfBound__) {
    app.__ccfBound__ = true;
    app.addEventListener('click', (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      const detailsBtn = t.closest('.btn-details');
      if (detailsBtn && detailsBtn.dataset.id) {
        const conf = conferences.find((c) => c.id === detailsBtn.dataset.id);
        if (conf) showModal(conf);
      }
      if (t.closest('[data-close]') || (t.classList && t.classList.contains('modal-overlay'))) {
        closeAllModals();
      }
      const tab = t.closest('.filter-tab');
      if (tab && tab.matches('.filter-tab')) {
        const filter = tab.getAttribute('data-filter') || 'all';
        document.querySelectorAll('.filter-tab').forEach((x) => x.classList.remove('active'));
        tab.classList.add('active');
        const searchTerm = /** @type {HTMLInputElement} */ (document.getElementById('search-input')).value || '';
        const filtered = filterCards(filter, searchTerm, conferences);
        updateStats(filtered);
      }

      const chip = t.closest('.quick-filter-chip');
      if (chip && chip.matches('.quick-filter-chip')) {
        const input = /** @type {HTMLInputElement} */ (document.getElementById('search-input'));
        if (input) {
          const chipTerm = chip.getAttribute('data-term') || '';
          const currentTerm = normalizeSearchText(input.value);
          input.value = currentTerm === normalizeSearchText(chipTerm) ? '' : chipTerm;
          const active = document.querySelector('.filter-tab.active')?.getAttribute('data-filter') || 'all';
          const filtered = filterCards(active, input.value, conferences);
          updateStats(filtered);
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllModals();
    });
  }

  let searchQueued = false;
  const scheduleSearch = () => {
    if (searchQueued) return;
    searchQueued = true;
    requestAnimationFrame(() => {
      searchQueued = false;
      const inp = /** @type {HTMLInputElement} */ (document.getElementById('search-input'));
      const active = document.querySelector('.filter-tab.active')?.getAttribute('data-filter') || 'all';
      const filtered = filterCards(active, inp ? inp.value : '', conferences);
      updateStats(filtered);
    });
  };

  const searchInput = document.getElementById('search-input');
  searchInput?.addEventListener('input', scheduleSearch);
}

document.addEventListener('DOMContentLoaded', () => {
  const conferences = bootstrap();
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    ${renderHeader()}
    <main class="main-content">
      <div class="container">
        ${renderFilterBar()}
        <div class="cards-grid" id="cards-grid">${renderAllCards(conferences)}</div>
      </div>
    </main>
    <div id="modal-container"></div>
    <footer class="footer">
      <p>CCF会议倒计时 · 算法超人小工具</p>
      <div class="footer-extra">
        <div class="footer-block">
          <div class="footer-block-title">声明</div>
          <div class="footer-block-body">
            <div>本工具仅用于学术会议时间管理与信息展示，数据可能存在延迟/错误，请以会议官网为准。</div>
            <div>
              数据来源：<a class="footer-link" href="https://github.com/ccfddl/ccf-deadlines" target="_blank" rel="noopener noreferrer">ccfddl/ccf-deadlines</a>（以及本站静态数据缓存）；
              更多会议：<a class="footer-link" href="https://ccfddl.top/" target="_blank" rel="noopener noreferrer">ccfddl.top</a>
            </div>
          </div>
        </div>
        <div class="footer-block">
          <div class="footer-block-title">技术交流</div>
          <div class="footer-block-body">
            <div>技术交流微信：suanfachaoren321</div>
          </div>
        </div>
      </div>
    </footer>`;

  const initialFiltered = filterCards('all', '', conferences);
  updateStats(initialFiltered);
  bindGlobalUi(conferences);
  startCountdownUpdate(conferences);
});
