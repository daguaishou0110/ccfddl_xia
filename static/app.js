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
  const topics = (conference.topics || [])
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
            <p class="brand-subtitle">技术交流：1083810317 QQ群 · 算法超人小工具 · Python · Flask</p>
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
  return conferences
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

function filterCards(filter, searchTerm, conferences) {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;
  let filtered = conferences;
  if (filter === 'A' || filter === 'B' || filter === 'C') {
    filtered = conferences.filter((c) => c.ccfrating === filter);
  } else if (filter !== 'all') {
    filtered = conferences.filter((c) => getConferenceStatus(c) === filter);
  }
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        (c.shortName || '').toLowerCase().includes(term) ||
        (c.name || '').toLowerCase().includes(term) ||
        (c.acronym || '').toLowerCase().includes(term) ||
        (c.venue || '').toLowerCase().includes(term) ||
        (c.topics || []).some((t) => t.toLowerCase().includes(term)),
    );
  }
  grid.innerHTML = renderAllCards(filtered);
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
    return JSON.parse(el.textContent || '[]');
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
        filterCards(filter, searchTerm, conferences);
        updateStats(conferences);
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
      filterCards(active, inp ? inp.value : '', conferences);
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
            <div>数据来源：<a class="footer-link" href="https://github.com/ccfddl/ccf-deadlines" target="_blank" rel="noopener noreferrer">ccfddl/ccf-deadlines</a>（以及本站静态数据缓存）。</div>
          </div>
        </div>
        <div class="footer-block">
          <div class="footer-block-title">技术交流</div>
          <div class="footer-block-body">
            <div>技术交流：1083810317 QQ群</div>
          </div>
        </div>
      </div>
    </footer>`;

  updateStats(conferences);
  bindGlobalUi(conferences);
  startCountdownUpdate(conferences);
});
