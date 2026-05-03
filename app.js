/* ──────────────────────────────────────────────────
   PLAGISCAN — Frontend Application Logic
   Plagiarism + AI Detection via Winston AI
   ────────────────────────────────────────────────── */

'use strict';

const API_BASE = '';  // Same origin
const POLL_INTERVAL_MS = 3000;
const POLL_MAX = 80;  // ~4 minutes max polling

/* ── DOM References ── */
const textInput       = document.getElementById('text-input');
const wordCountEl     = document.getElementById('word-count');
const scanBtn         = document.getElementById('scan-btn');
const clearBtn        = document.getElementById('clear-btn');
const loaderEl        = document.getElementById('loader');
const resultsEl       = document.getElementById('results');
const errorEl         = document.getElementById('error-state');
const errorMsgEl      = document.getElementById('error-msg');
const tryAgainBtn     = document.getElementById('try-again-btn');
const newScanBtn      = document.getElementById('new-scan-btn');
const progressBar     = document.getElementById('progress-bar');
const progressText    = document.getElementById('progress-text');
const loaderSteps     = document.querySelectorAll('.loader-step');

// Plagiarism score elements
const ringPlag        = document.getElementById('ring-plag');
const plagPctEl       = document.getElementById('plag-pct');
const plagTitleEl     = document.getElementById('plag-title');
const plagDescEl      = document.getElementById('plag-desc');
const plagChipsEl     = document.getElementById('plag-chips');
const plagSentencesEl = document.getElementById('plag-sentences-view');
const plagCardEl      = document.getElementById('plag-sentences-card');

// AI detection score elements
const ringAi          = document.getElementById('ring-ai');
const aiPctEl         = document.getElementById('ai-pct');
const aiTitleEl       = document.getElementById('ai-title');
const aiDescEl        = document.getElementById('ai-desc');
const aiChipsEl       = document.getElementById('ai-chips');
const aiSentencesEl   = document.getElementById('ai-sentences-view');
const aiCardEl        = document.getElementById('ai-sentences-card');

const partialErrorEl  = document.getElementById('partial-error');
const partialErrorTxt = document.getElementById('partial-error-text');
const tipsGridEl      = document.getElementById('tips-grid');

/* ── State ── */
let currentScanId = null;
let pollCount     = 0;
let pollTimer     = null;

/* ── Word Counter ── */
textInput.addEventListener('input', () => {
  const words = textInput.value.trim().split(/\s+/).filter(Boolean).length;
  wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
});

/* ── Clear Button ── */
clearBtn.addEventListener('click', () => {
  textInput.value = '';
  wordCountEl.textContent = '0 words';
  textInput.focus();
});

/* ── Scan Button ── */
scanBtn.addEventListener('click', startScan);
textInput.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') startScan();
});

/* ── Try Again / New Scan ── */
tryAgainBtn.addEventListener('click', resetToInput);
newScanBtn.addEventListener('click', resetToInput);


/* ────────────────────────────────────────
   SCAN FLOW
   ──────────────────────────────────────── */
async function startScan() {
  const text = textInput.value.trim();
  if (!text || text.split(/\s+/).length < 5) {
    shakeElement(textInput);
    showToast('Please enter at least 5 words to analyse.', 'warn');
    return;
  }

  showLoader();

  try {
    const resp = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Server error (${resp.status})`);
    }

    const data = await resp.json();
    currentScanId = data.scan_id;
    pollCount = 0;
    schedulePoll();
  } catch (err) {
    showError(`Could not start scan: ${err.message}`);
  }
}


/* ── Poll for results ── */
function schedulePoll() {
  pollTimer = setTimeout(doPoll, POLL_INTERVAL_MS);
}

async function doPoll() {
  if (!currentScanId) return;
  pollCount++;

  if (pollCount > POLL_MAX) {
    showError('Analysis timed out after 4 minutes. The Winston AI service may be experiencing delays. Please try again.');
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/api/status/${currentScanId}`);
    const data = await resp.json();

    if (data.status === 'processing') {
      const progress = data.progress || Math.min(95, pollCount * 3);
      updateProgress(progress);
      updateLoaderSteps(progress);
      schedulePoll();
    } else if (data.status === 'complete') {
      updateProgress(100);
      setTimeout(() => renderResults(data), 400);
    } else if (data.status === 'error') {
      showError(data.error || 'Analysis failed. Please try again.');
    } else {
      schedulePoll();
    }
  } catch (err) {
    if (pollCount < POLL_MAX) {
      schedulePoll(); // retry on network hiccup
    } else {
      showError('Lost connection to server.');
    }
  }
}


/* ────────────────────────────────────────
   RENDER RESULTS
   ──────────────────────────────────────── */
function renderResults(data) {
  hideLoader();
  resultsEl.classList.add('visible');

  const plag = data.plagiarism;
  const ai   = data.ai_detection;

  // Show partial error if present
  if (data.error) {
    partialErrorEl.style.display = 'flex';
    partialErrorTxt.textContent = data.error;
  } else {
    partialErrorEl.style.display = 'none';
  }

  // Render plagiarism results
  if (plag) {
    renderPlagiarismScore(plag);
    renderPlagiarismSentences(plag);
    plagCardEl.style.display = '';
  } else {
    plagPctEl.textContent = '—';
    plagTitleEl.textContent = 'Unavailable';
    plagDescEl.textContent = 'Plagiarism scan could not be completed. See error above.';
    plagChipsEl.innerHTML = '';
    plagCardEl.style.display = 'none';
  }

  // Render AI detection results
  if (ai) {
    renderAiScore(ai);
    renderAiSentences(ai);
    aiCardEl.style.display = '';
  } else {
    aiPctEl.textContent = '—';
    aiTitleEl.textContent = 'Unavailable';
    aiDescEl.textContent = 'AI detection could not be completed. See error above.';
    aiChipsEl.innerHTML = '';
    aiCardEl.style.display = 'none';
  }

  // Render Actionable Tips (from backend Groq Step 3)
  const tips = data.actionable_tips || [];
  if (tips.length > 0) {
    tipsGridEl.innerHTML = tips.map(t => `
      <div class="tip-item" role="article">
        <div class="tip-header">
          <div class="tip-icon tip-icon-${escapeHtml(t.color || 'cyan')}">${escapeHtml(t.icon || '💡')}</div>
          <div>
            <div class="tip-title">${escapeHtml(t.title || 'Actionable Tip')}</div>
          </div>
        </div>
        <div class="tip-body">${escapeHtml(t.body || '')}</div>
        <div class="tip-example">${escapeHtml(t.example || '')}</div>
      </div>
    `).join('');
  } else {
    tipsGridEl.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;">No specific actionable insights available for this text.</div>`;
  }
}


/* ── Plagiarism Score Ring ── */
function renderPlagiarismScore(plag) {
  const score = Math.round(plag.score || 0);
  const circumference = 345;
  const offset = circumference - (score / 100) * circumference;

  let color, title, desc, chipClass, chipLabel;
  if (score < 15) {
    color = '#10b981'; title = '✅ Mostly Original'; chipClass = 'chip-green'; chipLabel = 'Low Risk';
    desc = 'Your content shows minimal plagiarism. Great work on originality!';
  } else if (score < 40) {
    color = '#f59e0b'; title = '⚠️ Moderate Plagiarism'; chipClass = 'chip-amber'; chipLabel = 'Moderate Risk';
    desc = 'Some sections match existing sources. Review the flagged sentences below.';
  } else {
    color = '#ef4444'; title = '🚨 High Plagiarism'; chipClass = 'chip-red'; chipLabel = 'High Risk';
    desc = 'Significant portions match existing sources. Immediate revision recommended.';
  }

  plagPctEl.textContent = `${score}%`;
  plagPctEl.style.color = color;
  plagTitleEl.textContent = title;
  plagDescEl.textContent = desc;
  ringPlag.style.stroke = color;
  setTimeout(() => { ringPlag.style.strokeDashoffset = offset; }, 100);

  plagChipsEl.innerHTML = `
    <span class="chip ${chipClass}">● ${chipLabel}</span>
    <span class="chip ${chipClass}">${score}% Match</span>
  `;
}


/* ── AI Detection Score Ring ── */
function renderAiScore(ai) {
  // Winston AI returns score where higher = more likely human
  // We want to show AI percentage, so: aiPct = 100 - humanScore
  const humanScore = Math.round(ai.score || 0);
  const aiScore = 100 - humanScore;
  const circumference = 345;
  const offset = circumference - (aiScore / 100) * circumference;

  let color, title, desc, chipClass, chipLabel;
  if (aiScore < 20) {
    color = '#10b981'; title = '✅ Human Written'; chipClass = 'chip-green'; chipLabel = 'Human';
    desc = 'This content appears to be written by a human. No significant AI patterns detected.';
  } else if (aiScore < 60) {
    color = '#f59e0b'; title = '⚠️ Mixed Content'; chipClass = 'chip-amber'; chipLabel = 'Likely Mixed';
    desc = 'This content shows signs of AI assistance. Some sections may be AI-generated.';
  } else {
    color = '#ec4899'; title = '🤖 AI Generated'; chipClass = 'chip-pink'; chipLabel = 'AI Content';
    desc = 'This content is likely generated by an AI model like ChatGPT, Claude, or Gemini.';
  }

  aiPctEl.textContent = `${aiScore}%`;
  aiPctEl.style.color = color;
  aiTitleEl.textContent = title;
  aiDescEl.textContent = desc;
  ringAi.style.stroke = color;
  setTimeout(() => { ringAi.style.strokeDashoffset = offset; }, 100);

  aiChipsEl.innerHTML = `
    <span class="chip ${chipClass}">● ${chipLabel}</span>
    <span class="chip ${chipClass}">${aiScore}% AI</span>
    <span class="chip chip-blue">${humanScore}% Human</span>
  `;
}


/* ── AI Sentence-Level View ── */
function renderAiSentences(ai) {
  const sentences = ai.sentences || [];
  if (!sentences.length) {
    aiSentencesEl.innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">📝</div>
        <p>No sentence-level data available.</p>
      </div>`;
    return;
  }

  aiSentencesEl.innerHTML = sentences.map((s, i) => {
    const score = Math.round(s.score || 0);
    const aiScore = 100 - score;
    let cls, badgeCls, badgeLabel;
    if (aiScore < 30) {
      cls = 'human'; badgeCls = 'badge-human'; badgeLabel = 'Human';
    } else if (aiScore < 65) {
      cls = 'mixed'; badgeCls = 'badge-mixed'; badgeLabel = 'Likely AI';
    } else {
      cls = 'ai-gen'; badgeCls = 'badge-ai-gen'; badgeLabel = 'AI Generated';
    }

    return `
      <div class="sentence-item">
        <div class="sentence-score">
          <div class="sentence-score-val" style="color:${aiScore > 60 ? '#ec4899' : aiScore > 30 ? '#f59e0b' : '#10b981'}">${aiScore}%</div>
          <div class="sentence-score-label">AI</div>
        </div>
        <div class="sentence-content">
          <div class="sentence-text ${cls}">
            ${escapeHtml(s.text || '')}
            <span class="sentence-badge ${badgeCls}">${badgeLabel}</span>
          </div>
          ${s.rewrite_suggestion ? `<div class="sentence-rewrite">💡 ${escapeHtml(s.rewrite_suggestion)}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}


/* ── Plagiarism Sentence-Level View ── */
function renderPlagiarismSentences(plag) {
  const sentences = plag.sentences || [];
  if (!sentences.length) {
    plagSentencesEl.innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">🔍</div>
        <p>No sentence-level plagiarism data available.</p>
      </div>`;
    return;
  }

  plagSentencesEl.innerHTML = sentences.map((s, i) => {
    const score = Math.round(s.score || 0);
    let cls;
    if (score < 20) cls = 'original';
    else if (score < 60) cls = 'plag-low';
    else cls = 'plag-high';

    const sourceUrl = s.source_url || s.url || '';
    const sourceHtml = sourceUrl
      ? `<div class="sentence-source">🔗 <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(sourceUrl)}</a></div>`
      : (score > 15 ? '<div class="sentence-source" style="color:var(--text-muted)">No specific source URL provided</div>' : '');

    return `
      <div class="sentence-item">
        <div class="sentence-score">
          <div class="sentence-score-val" style="color:${score > 60 ? '#ef4444' : score > 20 ? '#f59e0b' : '#10b981'}">${score}%</div>
          <div class="sentence-score-label">match</div>
        </div>
        <div class="sentence-content">
          <div class="sentence-text ${cls}">${escapeHtml(s.text || '')}</div>
          ${sourceHtml}
          ${s.rewrite_suggestion ? `<div class="sentence-rewrite">💡 ${escapeHtml(s.rewrite_suggestion)}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}


/* ────────────────────────────────────────
   UI STATE HELPERS
   ──────────────────────────────────────── */
function showLoader() {
  resultsEl.classList.remove('visible');
  errorEl.classList.remove('visible');
  loaderEl.classList.add('visible');
  scanBtn.disabled = true;
  document.getElementById('input-section').style.display = 'none';

  // Reset
  loaderSteps.forEach(s => { s.classList.remove('active', 'done'); });
  loaderSteps[0].classList.add('active');
  updateProgress(0);
}

function hideLoader() {
  loaderEl.classList.remove('visible');
  scanBtn.disabled = false;
}

function updateProgress(pct) {
  progressBar.style.width = `${pct}%`;
  progressText.textContent = `${pct}%`;
}

function updateLoaderSteps(progress) {
  if (progress >= 10) {
    loaderSteps[0].classList.remove('active');
    loaderSteps[0].classList.add('done');
    loaderSteps[0].querySelector('.step-icon').textContent = '✓';
    loaderSteps[1].classList.add('active');
  }
  if (progress >= 40) {
    loaderSteps[1].classList.remove('active');
    loaderSteps[1].classList.add('done');
    loaderSteps[1].querySelector('.step-icon').textContent = '✓';
    loaderSteps[2].classList.add('active');
  }
  if (progress >= 90) {
    loaderSteps[2].classList.remove('active');
    loaderSteps[2].classList.add('done');
    loaderSteps[2].querySelector('.step-icon').textContent = '✓';
    loaderSteps[3].classList.add('active');
  }
  if (progress >= 100) {
    loaderSteps[3].classList.remove('active');
    loaderSteps[3].classList.add('done');
    loaderSteps[3].querySelector('.step-icon').textContent = '✓';
  }
}

function showError(msg) {
  hideLoader();
  clearTimeout(pollTimer);
  errorEl.classList.add('visible');
  errorMsgEl.textContent = msg;
  document.getElementById('input-section').style.display = '';
  scanBtn.disabled = false;
}

function resetToInput() {
  clearTimeout(pollTimer);
  currentScanId = null;
  pollCount = 0;
  resultsEl.classList.remove('visible');
  errorEl.classList.remove('visible');
  loaderEl.classList.remove('visible');
  document.getElementById('input-section').style.display = '';
  scanBtn.disabled = false;
  textInput.focus();

  // Reset loader steps
  loaderSteps.forEach(s => {
    s.classList.remove('active', 'done');
    s.querySelector('.step-icon').textContent = '';
  });

  // Reset rings
  ringPlag.style.strokeDashoffset = 345;
  ringAi.style.strokeDashoffset = 345;

  requestAnimationFrame(() =>
    document.getElementById('input-section').scrollIntoView({ behavior: 'smooth' })
  );
}


/* ────────────────────────────────────────
   UTILITIES
   ──────────────────────────────────────── */
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake 0.4s ease';
}

// Inject shake keyframe
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-8px); }
    40%      { transform: translateX(8px); }
    60%      { transform: translateX(-5px); }
    80%      { transform: translateX(5px); }
  }
`;
document.head.appendChild(shakeStyle);

function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  const colors = { info: '#06b6d4', warn: '#f59e0b', error: '#ef4444', success: '#10b981' };
  t.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background: #1e2336; color: #f1f5f9;
    border-left: 3px solid ${colors[type] || colors.info};
    padding: 14px 20px; border-radius: 10px;
    font-size: 0.85rem; max-width: 360px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: toast-in 0.3s cubic-bezier(0.16,1,0.3,1) both;
  `;
  t.textContent = msg;
  const toastAnim = document.createElement('style');
  toastAnim.textContent = `
    @keyframes toast-in {
      from { opacity:0; transform: translateX(20px); }
      to   { opacity:1; transform: translateX(0); }
    }
  `;
  document.head.appendChild(toastAnim);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 5000);
}

/* ── Init ── */
textInput.focus();
