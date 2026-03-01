/**
 * IBM / Hollerith punch card encoding (80 columns × 12 rows).
 * One character per column; each character = set of row punches.
 * Rows: 12, 11, 0 (zones), 1–9 (digits).
 * Based on common BCD / IBM 029-style layout (see Doug Jones, Punched Card Codes).
 */

const ROWS = [12, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const COLS = 80;

// Character → sorted array of row numbers (e.g. 'A' → [1, 12])
const CHAR_TO_PUNCHES = {
  ' ': [],
  '&': [12],
  '-': [11],
  '0': [0], '1': [1], '2': [2], '3': [3], '4': [4], '5': [5], '6': [6], '7': [7], '8': [8], '9': [9],
  'A': [1, 12], 'B': [2, 12], 'C': [3, 12], 'D': [4, 12], 'E': [5, 12], 'F': [6, 12], 'G': [7, 12], 'H': [8, 12], 'I': [9, 12],
  'J': [1, 11], 'K': [2, 11], 'L': [3, 11], 'M': [4, 11], 'N': [5, 11], 'O': [6, 11], 'P': [7, 11], 'Q': [8, 11], 'R': [9, 11],
  'S': [0, 2], 'T': [0, 3], 'U': [0, 4], 'V': [0, 5], 'W': [0, 6], 'X': [0, 7], 'Y': [0, 8], 'Z': [0, 9],
  '.': [4, 8], ',': [2, 8], '$': [3, 8], '/': [0, 1], '(': [5, 8], ')': [6, 8], '+': [6, 8], '=': [7, 8], "'": [7, 8], ';': [6, 8, 11],
  '*': [4, 8, 11], '#': [5, 8, 0], '@': [5, 8, 11], ':': [5, 8, 11], '!': [5, 8, 12], '<': [4, 8, 0], '>': [6, 8, 0],
  '%': [5, 8, 11], '_': [6, 8, 11], '"': [7, 8, 11], '?': [7, 8, 11], '|': [7, 8, 12],
};

// Build punch set key → character (sorted row list as key)
function punchKey(rows) {
  return [...rows].sort((a, b) => a - b).join(',');
}

const PUNCH_TO_CHAR = {};
for (const [ch, rows] of Object.entries(CHAR_TO_PUNCHES)) {
  const key = punchKey(rows);
  if (!PUNCH_TO_CHAR[key]) PUNCH_TO_CHAR[key] = ch;
}

function getPunches(char) {
  const upper = String(char).toUpperCase();
  if (CHAR_TO_PUNCHES.hasOwnProperty(char)) return CHAR_TO_PUNCHES[char];
  if (char !== upper && CHAR_TO_PUNCHES.hasOwnProperty(upper)) return CHAR_TO_PUNCHES[upper];
  return null;
}

function getChar(punches) {
  if (!punches || punches.length === 0) return ' ';
  return PUNCH_TO_CHAR[punchKey(punches)] ?? '?';
}

// --- DOM: card grid (80 columns × 12 rows) ---

const cardGrid = document.getElementById('card-grid');
const textInput = document.getElementById('text-input');
const charCountEl = document.getElementById('char-count');
const decodeCharEl = document.getElementById('decode-char');
const decodeCodeEl = document.getElementById('decode-code');

let selectedCol = 0;
let cardState = Array(COLS).fill(null).map(() => []);

function buildCard() {
  cardGrid.innerHTML = '';
  for (let c = 0; c < COLS; c++) {
    const col = document.createElement('div');
    col.className = 'column';
    col.dataset.col = c;
    for (let r of ROWS) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.col = c;
      cell.dataset.row = r;
      cell.setAttribute('aria-label', `Column ${c + 1}, row ${r}`);
      cell.addEventListener('click', () => togglePunch(c, r));
      col.appendChild(cell);
    }
    cardGrid.appendChild(col);
  }
}

function togglePunch(col, row) {
  const punches = cardState[col];
  const i = punches.indexOf(row);
  if (i === -1) punches.push(row);
  else punches.splice(i, 1);
  punches.sort((a, b) => a - b);
  renderColumn(col);
  updateDecode(col);
}

function renderColumn(col) {
  const punches = cardState[col];
  const columnEl = cardGrid.querySelector(`.column[data-col="${col}"]`);
  if (!columnEl) return;
  columnEl.querySelectorAll('.cell').forEach((cell) => {
    const r = parseInt(cell.dataset.row, 10);
    cell.classList.toggle('punched', punches.includes(r));
  });
}

function renderCard() {
  for (let c = 0; c < COLS; c++) renderColumn(c);
}

function setColumnPunches(col, punches) {
  cardState[col] = punches ? [...punches] : [];
  renderColumn(col);
}

function textToCard(text) {
  const str = String(text).slice(0, COLS);
  for (let i = 0; i < COLS; i++) {
    const ch = str[i];
    const punches = ch != null ? (getPunches(ch) ?? []) : [];
    setColumnPunches(i, punches);
  }
  updateDecode(Math.min(str.length, COLS - 1));
}

function updateDecode(col) {
  selectedCol = col;
  const punches = cardState[col];
  const ch = getChar(punches);
  decodeCharEl.textContent = ch === ' ' ? '(space)' : ch;
  decodeCodeEl.textContent = punches.length ? punches.join('-') : '(blank)';
}

// --- Tutorial ---

const TUTORIAL_STEPS = [
  {
    concept: 'One column = one character. Each column has 12 rows. You build a character by punching holes in that column.',
    task: 'Click any row to punch a hole and see what character it makes.',
    exercise: 'intro',
  },
  {
    concept: 'Digits 0–9 use a single hole: row 0 = 0, row 1 = 1, … row 9 = 9.',
    task: 'Punch the digit 7. (Click row 7 only.)',
    exercise: 'punch_digit',
    expected: [7],
  },
  {
    concept: 'The top three rows (12, 11, 0) are zone rows. Letters = zone + digit. For example, A = zone 12 + digit 1.',
    task: 'Punch the letter A. (Hint: punch both row 12 and row 1.)',
    exercise: 'punch_letter',
    expected: [1, 12],
  },
  {
    concept: 'A–I use zone 12 + digit 1–9. J–R use zone 11 + digit 1–9. S–Z use zone 0 + digit 2–9. So M = zone 11 + digit 4.',
    task: 'Punch the letter M.',
    exercise: 'punch_letter',
    expected: [4, 11],
  },
  {
    concept: 'No holes = space. You can also read a column: look at the holes and figure out the character.',
    task: 'What character is this?',
    exercise: 'decode',
    decodePunches: [0, 3],
    decodeChoices: ['K', 'T', '3'],
    correctDecode: 'T',
  },
  {
    concept: 'A real card has 80 columns — one per character. You can type text and watch the holes, or click to punch and decode.',
    task: "You're ready. Click Next to try the full card.",
    exercise: 'done',
  },
];

const tutorialGate = document.getElementById('tutorial-gate');
const tutorialView = document.getElementById('tutorial-view');
const exploreView = document.getElementById('explore-view');
const tutorialStepNum = document.getElementById('tutorial-step-num');
const tutorialConcept = document.getElementById('tutorial-concept');
const tutorialColumnWrap = document.getElementById('tutorial-column-wrap');
const tutorialColumn = document.getElementById('tutorial-column');
const tutorialTask = document.getElementById('tutorial-task');
const tutorialDecodeChoices = document.getElementById('tutorial-decode-choices');
const tutorialFeedback = document.getElementById('tutorial-feedback');
const tutorialBack = document.getElementById('tutorial-back');
const tutorialNext = document.getElementById('tutorial-next');

let tutorialStepIndex = 0;
let tutorialPunches = [];

function buildTutorialColumn() {
  tutorialColumn.innerHTML = '';
  for (const r of ROWS) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'tutorial-cell';
    cell.dataset.row = r;
    cell.setAttribute('aria-label', `Row ${r}`);
    cell.addEventListener('click', onTutorialCellClick);
    tutorialColumn.appendChild(cell);
  }
}

function onTutorialCellClick(e) {
  const row = parseInt(e.currentTarget.dataset.row, 10);
  const step = TUTORIAL_STEPS[tutorialStepIndex];
  if (step.exercise === 'decode' || step.exercise === 'done') return;
  const i = tutorialPunches.indexOf(row);
  if (i === -1) tutorialPunches.push(row);
  else tutorialPunches.splice(i, 1);
  tutorialPunches.sort((a, b) => a - b);
  renderTutorialColumn();
  checkTutorialExercise();
}

function renderTutorialColumn() {
  tutorialColumn.querySelectorAll('.tutorial-cell').forEach((cell) => {
    const r = parseInt(cell.dataset.row, 10);
    cell.classList.toggle('punched', tutorialPunches.includes(r));
  });
}

function checkTutorialExercise() {
  const step = TUTORIAL_STEPS[tutorialStepIndex];
  if (!step || step.exercise === 'done' || step.exercise === 'decode') return;
  const key = punchKey(tutorialPunches);
  const expectedKey = step.expected ? punchKey(step.expected) : null;
  if (step.exercise === 'intro') {
    if (tutorialPunches.length > 0) {
      const ch = getChar(tutorialPunches);
      tutorialFeedback.textContent = `That's "${ch === ' ' ? '(space)' : ch}" — punch code ${tutorialPunches.join('-')}.`;
      tutorialFeedback.className = 'tutorial-feedback success';
      tutorialNext.disabled = false;
    } else {
      tutorialFeedback.textContent = '';
      tutorialNext.disabled = true;
    }
    return;
  }
  if (expectedKey && key === expectedKey) {
    const ch = getChar(tutorialPunches);
    tutorialFeedback.textContent = step.exercise === 'punch_digit' ? "That's 7!" : `That's the letter ${ch}!`;
    tutorialFeedback.className = 'tutorial-feedback success';
    tutorialNext.disabled = false;
  } else if (tutorialPunches.length > 0) {
    if (step.exercise === 'punch_digit') {
      tutorialFeedback.textContent = "For the digit 7, punch only row 7. Clear and try again.";
    } else {
      tutorialFeedback.textContent = `Not quite. For ${step.expected ? getChar(step.expected) : 'that letter'}, you need zone ${step.expected[1]} + digit ${step.expected[0]}.`;
    }
    tutorialFeedback.className = 'tutorial-feedback error';
    tutorialNext.disabled = true;
  } else {
    tutorialFeedback.textContent = '';
    tutorialNext.disabled = true;
  }
}

function setTutorialStep(index) {
  tutorialStepIndex = index;
  const step = TUTORIAL_STEPS[index];
  const total = TUTORIAL_STEPS.length;
  tutorialStepNum.textContent = `Step ${index + 1} of ${total}`;
  tutorialConcept.textContent = step.concept;
  tutorialTask.textContent = step.task;
  tutorialFeedback.textContent = '';
  tutorialFeedback.className = 'tutorial-feedback';

  const isDecode = step.exercise === 'decode';
  const isDone = step.exercise === 'done';
  tutorialColumnWrap.hidden = isDone;
  tutorialDecodeChoices.hidden = !isDecode;

  if (isDecode) {
    tutorialPunches = [...(step.decodePunches || [])];
    renderTutorialColumn();
    tutorialColumn.querySelectorAll('.tutorial-cell').forEach((c) => c.disabled = true);
    tutorialDecodeChoices.innerHTML = '';
    (step.decodeChoices || []).forEach((ch) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-choice';
      btn.textContent = ch;
      btn.addEventListener('click', () => {
        const correct = ch === step.correctDecode;
        tutorialFeedback.textContent = correct ? `Correct! That's the letter ${ch} (zone 0 + digit 3).` : `Not quite. That column is the letter ${step.correctDecode}.`;
        tutorialFeedback.className = 'tutorial-feedback ' + (correct ? 'success' : 'error');
        tutorialNext.disabled = false;
        tutorialDecodeChoices.querySelectorAll('button').forEach((b) => b.disabled = true);
      });
      tutorialDecodeChoices.appendChild(btn);
    });
    tutorialNext.disabled = true;
  } else if (!isDone) {
    tutorialPunches = [];
    renderTutorialColumn();
    tutorialColumn.querySelectorAll('.tutorial-cell').forEach((c) => c.disabled = false);
    if (index === 0) tutorialNext.disabled = true;
    else if (index === 1 || index === 2 || index === 3) tutorialNext.disabled = true;
    else tutorialNext.disabled = false;
  } else {
    tutorialNext.disabled = false;
  }

  tutorialNext.textContent = index === total - 1 ? 'Go to full card' : 'Next';
  tutorialBack.disabled = index === 0;
}

function showTutorial() {
  tutorialGate.hidden = true;
  tutorialView.hidden = false;
  exploreView.hidden = true;
  setTutorialStep(0);
}

function showExplore() {
  tutorialGate.hidden = true;
  tutorialView.hidden = true;
  exploreView.hidden = false;
  textInput.focus();
}

document.getElementById('tutorial-start').addEventListener('click', showTutorial);
document.getElementById('tutorial-skip').addEventListener('click', (e) => {
  e.preventDefault();
  tutorialGate.hidden = true;
  tutorialView.hidden = true;
  exploreView.hidden = false;
  textInput.focus();
});

tutorialBack.addEventListener('click', () => setTutorialStep(tutorialStepIndex - 1));
tutorialNext.addEventListener('click', () => {
  if (tutorialStepIndex === TUTORIAL_STEPS.length - 1) {
    showExplore();
    return;
  }
  setTutorialStep(tutorialStepIndex + 1);
});

buildTutorialColumn();

// --- Init ---

buildCard();

textInput.addEventListener('input', () => {
  const t = textInput.value;
  charCountEl.textContent = t.length;
  textToCard(t);
});

textInput.addEventListener('keyup', () => {
  const col = Math.min(textInput.value.length, COLS - 1);
  updateDecode(col);
});

// Example program card (load into text input)
const exampleCardText = document.getElementById('example-card-text');
const loadExampleBtn = document.getElementById('load-example');
if (loadExampleBtn && exampleCardText) {
  loadExampleBtn.addEventListener('click', () => {
    const line = exampleCardText.textContent.replace(/\n/g, '').slice(0, COLS).padEnd(COLS, ' ');
    textInput.value = line;
    textInput.dispatchEvent(new Event('input'));
  });
}

// Initial state
textInput.placeholder = 'e.g. HELLO WORLD';
charCountEl.textContent = '0';
updateDecode(0);
