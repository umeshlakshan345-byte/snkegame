/* =============================================
   SNAKE ARCADE — game.js
   All game logic: movement, collision,
   food, score, speed, game loop
   ============================================= */

// ─── Canvas Setup ────────────────────────────
const canvas   = document.getElementById('gameCanvas');
const ctx      = canvas.getContext('2d');

const COLS      = 20;          // number of grid columns
const ROWS      = 20;          // number of grid rows
const CELL      = canvas.width / COLS;  // pixel size of each cell (20px)

// ─── Colour Palette ───────────────────────────
const COLORS = {
  bg:         '#080f0a',
  gridLine:   'rgba(0,255,102,0.04)',
  snakeHead:  '#00ff66',
  snakeBody:  '#00cc55',
  snakeBorder:'#004422',
  food:       '#ff3355',
  foodGlow:   'rgba(255,51,85,0.6)',
  text:       '#b8ffd0',
};

// ─── Game State ───────────────────────────────
let snake      = [];      // array of {x, y} segments; index 0 = head
let direction  = {};      // current movement direction {x, y}
let nextDir    = {};      // buffered direction (applied each tick)
let food       = {};      // food position {x, y}
let score      = 0;
let level      = 1;
let gameRunning = false;

// Speed settings: base interval in ms, decreases as score rises
const BASE_SPEED   = 160;   // starting interval (ms)
const SPEED_STEP   = 18;    // ms removed per level-up
const MIN_SPEED    = 60;    // fastest the game can get
const SCORE_PER_LEVEL = 5;  // points needed to increase level

let intervalId  = null;     // holds the setInterval reference

// ─── DOM References ───────────────────────────
const overlay    = document.getElementById('overlay');
const playBtn    = document.getElementById('playBtn');
const scoreEl    = document.getElementById('score');
const levelEl    = document.getElementById('level');
const speedEl    = document.getElementById('speed');

// ─── Utility Helpers ─────────────────────────

/** Pads a number with leading zeros to a fixed width */
function pad(n, width = 3) {
  return String(n).padStart(width, '0');
}

/** Returns a random integer between min and max (inclusive) */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Returns a random grid position {x, y} that is NOT on the snake */
function randomFoodPosition() {
  let pos;
  do {
    pos = { x: randInt(0, COLS - 1), y: randInt(0, ROWS - 1) };
  } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
  return pos;
}

/** Triggers a CSS "pop" animation on a HUD element */
function popHud(el) {
  el.classList.remove('pop');
  void el.offsetWidth;   // reflow to restart animation
  el.classList.add('pop');
}

// ─── HUD Update ───────────────────────────────
function updateHud() {
  scoreEl.textContent = pad(score);
  levelEl.textContent = pad(level, 2);

  const speedLabels = ['LOW', 'MED', 'HIGH', 'MAX'];
  const idx = Math.min(level - 1, speedLabels.length - 1);
  speedEl.textContent = speedLabels[idx] || 'MAX';
}

// ─── Initialise / Reset Game State ────────────
function initGame() {
  // Place snake in the middle, 3 segments long, moving right
  const startX = Math.floor(COLS / 2);
  const startY = Math.floor(ROWS / 2);
  snake = [
    { x: startX,     y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];

  direction = { x: 1, y: 0 };
  nextDir   = { x: 1, y: 0 };

  score = 0;
  level = 1;

  food = randomFoodPosition();

  updateHud();
}

// ─── Speed Control ────────────────────────────
function currentSpeed() {
  const speed = BASE_SPEED - (level - 1) * SPEED_STEP;
  return Math.max(speed, MIN_SPEED);
}

/** Restart the setInterval at the current speed */
function resetInterval() {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(gameTick, currentSpeed());
}

// ─── Game Loop (one tick = one move) ──────────
function gameTick() {
  // Apply buffered direction (prevents reversing into self)
  direction = { ...nextDir };

  // Calculate new head position
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  // ── Wall collision ──
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    endGame();
    return;
  }

  // ── Self collision ──
  if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
    endGame();
    return;
  }

  // Move: prepend new head
  snake.unshift(head);

  // ── Food eaten? ──
  if (head.x === food.x && head.y === food.y) {
    score++;
    popHud(scoreEl);

    // Level up every SCORE_PER_LEVEL points
    const newLevel = Math.floor(score / SCORE_PER_LEVEL) + 1;
    if (newLevel > level) {
      level = newLevel;
      popHud(levelEl);
      resetInterval();   // restart loop at faster speed
    }

    updateHud();
    food = randomFoodPosition();
    // Do NOT pop the tail — snake grows
  } else {
    // Remove the tail (snake stays the same length)
    snake.pop();
  }

  draw();
}

// ─── Drawing ──────────────────────────────────

/** Draws the faint grid lines */
function drawGrid() {
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth   = 0.5;

  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, canvas.height);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(canvas.width, r * CELL);
    ctx.stroke();
  }
}

/** Draws one snake segment as a rounded rectangle */
function drawSegment(seg, isHead) {
  const x = seg.x * CELL;
  const y = seg.y * CELL;
  const pad = 1.5;
  const radius = isHead ? 5 : 3;

  // Fill colour
  ctx.fillStyle   = isHead ? COLORS.snakeHead : COLORS.snakeBody;
  ctx.strokeStyle = COLORS.snakeBorder;
  ctx.lineWidth   = 1;

  // Glow on head
  if (isHead) {
    ctx.shadowColor = COLORS.snakeHead;
    ctx.shadowBlur  = 8;
  }

  roundRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, radius);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;   // reset glow
}

/** Draws the food with a pulsing glow */
function drawFood() {
  const x = food.x * CELL + CELL / 2;
  const y = food.y * CELL + CELL / 2;
  const r = CELL / 2 - 3;

  ctx.save();

  // Outer glow
  ctx.shadowColor = COLORS.foodGlow;
  ctx.shadowBlur  = 14;

  ctx.fillStyle = COLORS.food;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Bright inner highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle  = 'rgba(255,180,190,0.55)';
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Main draw — clears canvas and redraws everything */
function draw() {
  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawFood();

  // Draw body first (so head renders on top)
  for (let i = snake.length - 1; i >= 0; i--) {
    drawSegment(snake[i], i === 0);
  }
}

/** Helper: draw a rounded rectangle path */
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Start / End Game ─────────────────────────

function startGame() {
  // Hide overlay
  overlay.classList.add('hidden');
  gameRunning = true;

  initGame();
  draw();
  resetInterval();
}

function endGame() {
  gameRunning = false;
  clearInterval(intervalId);

  // Show Game Over overlay
  overlay.classList.remove('hidden');
  overlay.querySelector('.overlay-content').innerHTML = `
    <div class="pixel-snake">💀</div>
    <p class="gameover-title">GAME OVER</p>
    <p class="gameover-score">FINAL SCORE &nbsp; ${pad(score)} &nbsp;|&nbsp; LEVEL ${pad(level, 2)}</p>
    <button id="playBtn">↺ RESTART</button>
    <p class="controls-hint">BETTER LUCK NEXT TIME</p>
  `;

  // Re-attach click listener to the new button
  document.getElementById('playBtn').addEventListener('click', startGame);
}

// ─── Keyboard Controls ────────────────────────
document.addEventListener('keydown', (e) => {
  if (!gameRunning) return;

  // Prevent the page from scrolling with arrow keys
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }

  switch (e.key) {
    case 'ArrowUp':
      // Cannot reverse into self
      if (direction.y !== 1)  nextDir = { x: 0, y: -1 };
      break;
    case 'ArrowDown':
      if (direction.y !== -1) nextDir = { x: 0, y: 1 };
      break;
    case 'ArrowLeft':
      if (direction.x !== 1)  nextDir = { x: -1, y: 0 };
      break;
    case 'ArrowRight':
      if (direction.x !== -1) nextDir = { x: 1, y: 0 };
      break;
  }
});

// ─── Play Button ──────────────────────────────
playBtn.addEventListener('click', startGame);

// Draw the idle canvas on first load
(function initialDraw() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
})();
