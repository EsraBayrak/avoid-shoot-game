const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const timeEl = document.getElementById('time');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

let keys = {};
let bullets = [];
let enemies = [];
let particles = [];
let healthPacks = [];

let score = 0;
let bestScore = Number(localStorage.getItem('avoidShootBestScore')) || 0;
let gameTime = 0;
let level = 1;
let gameRunning = false;
let animationId = null;

let menuAnimationId = null;
let menuTime = 0;

let enemySpawnTimer = 0;
let healthPackTimer = 0;
let difficultyTimer = 0;
let enemySpawnInterval = 1200;
let enemySpeedMultiplier = 1;
let lastTime = 0;

let screenShake = 0;

const MAX_HEALTH = 10;

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 30,
  speed: 5,
  color: '#4ade80',
  health: MAX_HEALTH,
  facingX: 1,
  facingY: 0,
  shootCooldown: 0
};

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.key === ' ') e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);

function animateMenu(message = 'Press Start Game') {
  if (gameRunning) return;
  drawStartScreen(message);
  menuAnimationId = requestAnimationFrame(() => animateMenu(message));
}

function startGame() {
  cancelAnimationFrame(menuAnimationId);
  if (gameRunning) return;
  gameRunning = true;
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function resetGame() {
  cancelAnimationFrame(animationId);
  cancelAnimationFrame(menuAnimationId);

  bullets = [];
  enemies = [];
  particles = [];
  healthPacks = [];

  score = 0;
  gameTime = 0;
  level = 1;

  enemySpawnTimer = 0;
  healthPackTimer = 0;
  difficultyTimer = 0;
  enemySpawnInterval = 1200;
  enemySpeedMultiplier = 1;
  screenShake = 0;

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.health = MAX_HEALTH;

  gameRunning = false;
  updateHUD();
  animateMenu('Game reset. Press Start Game');
}

function gameLoop(timestamp) {
  if (!gameRunning) return;

  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  update(deltaTime);
  draw();

  if (player.health > 0) {
    animationId = requestAnimationFrame(gameLoop);
  } else {
    gameRunning = false;
    saveBestScore();
    drawGameOver();
  }
}

function update(deltaTime) {
  gameTime += deltaTime / 1000;
  enemySpawnTimer += deltaTime;
  healthPackTimer += deltaTime;
  difficultyTimer += deltaTime;

  updateLevel();

  movePlayer();
  containPlayer(player);

  if (keys[' '] && player.shootCooldown <= 0) {
    shootBullet();
    player.shootCooldown = 250;
  }
  if (player.shootCooldown > 0) player.shootCooldown -= deltaTime;

  if (enemySpawnTimer >= enemySpawnInterval) {
    spawnEnemy();
    enemySpawnTimer = 0;
  }

  if (healthPackTimer >= 12000) {
    spawnHealthPack();
    healthPackTimer = 0;
  }

  if (difficultyTimer >= 10000) {
    difficultyTimer = 0;
    enemySpeedMultiplier += 0.08;
    enemySpawnInterval = Math.max(500, enemySpawnInterval - 50);
  }

  if (screenShake > 0) screenShake--;

  updateBullets();
  updateEnemies();
  updateParticles();
  checkCollisions();
  updateHUD();
}

function updateLevel() {
  const newLevel = Math.floor(gameTime / 10) + 1;

  if (newLevel > level) {
    level = newLevel;
    enemySpeedMultiplier += 0.12;
    enemySpawnInterval = Math.max(450, enemySpawnInterval - 80);

    if (level % 3 === 0) spawnBossEnemy();
  }
}

function movePlayer() {
  let dx = 0, dy = 0;

  if (keys['w'] || keys['ArrowUp']) dy--;
  if (keys['s'] || keys['ArrowDown']) dy++;
  if (keys['a'] || keys['ArrowLeft']) dx--;
  if (keys['d'] || keys['ArrowRight']) dx++;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;

    player.x += dx * player.speed;
    player.y += dy * player.speed;
    player.facingX = dx;
    player.facingY = dy;
  }
}

function containPlayer(obj) {
  const h = obj.size / 2;
  obj.x = Math.max(h, Math.min(canvas.width - h, obj.x));
  obj.y = Math.max(h, Math.min(canvas.height - h, obj.y));
}

function shootBullet() {
  bullets.push({
    x: player.x,
    y: player.y,
    size: 8,
    speed: 8,
    dx: player.facingX,
    dy: player.facingY,
    color: '#facc15'
  });
}

function spawnEnemy() {
  const pos = getRandomEdgePosition();
  enemies.push({
    x: pos.x,
    y: pos.y,
    size: 28,
    speed: (1.2 + Math.random()) * enemySpeedMultiplier,
    color: '#ef4444',
    health: 1,
    type: 'normal',
    angle: Math.random() * Math.PI * 2
  });
}

function spawnBossEnemy() {
  const pos = getRandomEdgePosition();
  enemies.push({
    x: pos.x,
    y: pos.y,
    size: 55,
    speed: 0.7 * enemySpeedMultiplier,
    color: '#a855f7',
    health: 5,
    type: 'boss',
    angle: Math.random() * Math.PI * 2
  });
}

function getRandomEdgePosition() {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * canvas.width, y: -40 };
  if (side === 1) return { x: canvas.width + 40, y: Math.random() * canvas.height };
  if (side === 2) return { x: Math.random() * canvas.width, y: canvas.height + 40 };
  return { x: -40, y: Math.random() * canvas.height };
}

function spawnHealthPack() {
  healthPacks.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 24
  });
}

function updateBullets() {
  bullets = bullets.filter(b => {
    b.x += b.dx * b.speed;
    b.y += b.dy * b.speed;
    return b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height;
  });
}

function updateEnemies() {
  enemies.forEach(e => {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    e.x += (dx / d) * e.speed;
    e.y += (dy / d) * e.speed;
  });
}

function updateParticles() {
  particles = particles.filter(p => {
    p.x += p.speedX;
    p.y += p.speedY;
    p.life--;
    return p.life > 0;
  });
}

function createExplosion(x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x, y,
      speedX: (Math.random() - 0.5) * 6,
      speedY: (Math.random() - 0.5) * 6,
      life: 30
    });
  }
}

function isColliding(a, b) {
  return Math.abs(a.x - b.x) < (a.size + b.size) / 2 &&
         Math.abs(a.y - b.y) < (a.size + b.size) / 2;
}

function checkCollisions() {
  enemies.forEach((e, ei) => {
    if (isColliding(player, e)) {
      enemies.splice(ei, 1);
      player.health--;
      screenShake = 10;
    }
  });

  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (isColliding(b, e)) {
        createExplosion(e.x, e.y);
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        score += e.type === 'boss' ? 50 : 10;
      }
    });
  });

  healthPacks.forEach((h, hi) => {
    if (isColliding(player, h)) {
      healthPacks.splice(hi, 1);
      player.health = Math.min(player.health + 1, MAX_HEALTH);
    }
  });
}

function updateHUD() {
  scoreEl.textContent = `Score: ${score} | Level: ${level}`;
  healthEl.textContent = `HP: ${player.health}`;
  timeEl.textContent = `Time: ${Math.floor(gameTime)} | Best: ${bestScore}`;

  if (player.health > 7) healthEl.style.color = "lime";
  else if (player.health > 3) healthEl.style.color = "yellow";
  else healthEl.style.color = "red";
}

function saveBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('avoidShootBestScore', bestScore);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayer();
  drawEnemies();
  drawBullets();
}

function drawPlayer() {
  ctx.fillStyle = "green";
  ctx.fillRect(player.x, player.y, 30, 30);
}

function drawEnemies() {
  ctx.fillStyle = "red";
  enemies.forEach(e => ctx.fillRect(e.x, e.y, e.size, e.size));
}

function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, 5, 5));
}

function drawStartScreen(msg) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = "30px Arial";
  ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
}

function drawGameOver() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  ctx.font = "40px Arial";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 50);

  ctx.font = "25px Arial";
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);

  ctx.fillText(`Best Score: ${bestScore}`, canvas.width / 2, canvas.height / 2 + 40);
}

updateHUD();
animateMenu();