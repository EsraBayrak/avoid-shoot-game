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
  player.shootCooldown = 0;
  player.facingX = 1;
  player.facingY = 0;

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

  if (player.shootCooldown > 0) {
    player.shootCooldown -= deltaTime;
  }

  if (keys[' '] && player.shootCooldown <= 0) {
    shootBullet();
    player.shootCooldown = 250;
  }

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

    if (level % 3 === 0) {
      spawnBossEnemy();
    }
  }
}

function movePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys['ArrowUp'] || keys['w']) dy -= 1;
  if (keys['ArrowDown'] || keys['s']) dy += 1;
  if (keys['ArrowLeft'] || keys['a']) dx -= 1;
  if (keys['ArrowRight'] || keys['d']) dx += 1;

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

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.dx * b.speed;
    b.y += b.dy * b.speed;

    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
      bullets.splice(i, 1);
    }
  }
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
  let x, y;

  if (side === 0) {
    x = Math.random() * canvas.width;
    y = -40;
  } else if (side === 1) {
    x = canvas.width + 40;
    y = Math.random() * canvas.height;
  } else if (side === 2) {
    x = Math.random() * canvas.width;
    y = canvas.height + 40;
  } else {
    x = -40;
    y = Math.random() * canvas.height;
  }

  return { x, y };
}

function spawnHealthPack() {
  healthPacks.push({
    x: Math.random() * (canvas.width - 80) + 40,
    y: Math.random() * (canvas.height - 80) + 40,
    size: 24,
    color: '#22c55e'
  });
}

function createExplosion(x, y, color = '#f97316') {
  for (let i = 0; i < 16; i++) {
    particles.push({
      x,
      y,
      size: Math.random() * 5 + 2,
      speedX: (Math.random() - 0.5) * 6,
      speedY: (Math.random() - 0.5) * 6,
      life: 35,
      color
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.speedX;
    p.y += p.speedY;
    p.life--;
    p.size *= 0.96;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updateEnemies() {
  for (let e of enemies) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    e.x += (dx / d) * e.speed;
    e.y += (dy / d) * e.speed;
    e.angle += 0.05;
  }
}

function isColliding(a, b) {
  return Math.abs(a.x - b.x) < (a.size + b.size) / 2 &&
         Math.abs(a.y - b.y) < (a.size + b.size) / 2;
}

function checkCollisions() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (isColliding(player, enemies[i])) {
      createExplosion(enemies[i].x, enemies[i].y);
      enemies.splice(i, 1);
      player.health--;
      screenShake = 15;
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      if (isColliding(bullets[i], enemies[j])) {
        createExplosion(enemies[j].x, enemies[j].y);
        bullets.splice(i, 1);
        enemies[j].health--;

        if (enemies[j].health <= 0) {
          score += enemies[j].type === 'boss' ? 50 : 10;
          enemies.splice(j, 1);
        }
        break;
      }
    }
  }

  for (let i = healthPacks.length - 1; i >= 0; i--) {
    if (isColliding(player, healthPacks[i])) {
      healthPacks.splice(i, 1);
      player.health = Math.min(player.health + 1, MAX_HEALTH);
      createExplosion(player.x, player.y, '#22c55e');
    }
  }
}

function updateHUD() {
  scoreEl.textContent = `Score: ${score} | Level: ${level}`;
  healthEl.textContent = `Health: ${player.health}`;
  timeEl.textContent = `Time: ${Math.floor(gameTime)} | Best: ${bestScore}`;
}

function saveBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('avoidShootBestScore', bestScore);
  }
}

function draw() {
  ctx.save();

  if (screenShake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * screenShake,
      (Math.random() - 0.5) * screenShake
    );
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawHealthPacks();
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawParticles();

  ctx.restore();
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(
    player.x + player.facingX * 20,
    player.y + player.facingY * 20
  );
  ctx.stroke();
}

function drawBullets() {
  bullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEnemies() {
  enemies.forEach(e => {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);

    ctx.fillStyle = e.color;
    ctx.fillRect(-e.size / 2, -e.size / 2, e.size, e.size);

    if (e.type === 'boss') {
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', 0, 5);
    }

    ctx.restore();
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life / 35;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  });
}

function drawHealthPacks() {
  healthPacks.forEach(h => {
    ctx.fillStyle = h.color;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+', h.x, h.y + 6);
  });
}

function drawStartScreen(msg = 'Press Start Game') {
  menuTime += 0.05;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const y = canvas.height / 2 + Math.sin(menuTime) * 10;
  const alpha = 0.5 + Math.sin(menuTime * 2) * 0.5;

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';

  ctx.font = '46px Arial';
  ctx.fillText('Avoid & Shoot Survival', canvas.width / 2, y - 50);

  ctx.globalAlpha = alpha;
  ctx.font = '24px Arial';
  ctx.fillText(msg, canvas.width / 2, y + 10);
  ctx.globalAlpha = 1;

  ctx.font = '18px Arial';
  ctx.fillText('Move: WASD / Arrow Keys | Shoot: Space', canvas.width / 2, y + 50);

  ctx.font = '18px Arial';
  ctx.fillText(`Best Score: ${bestScore}`, canvas.width / 2, y + 85);
}

function drawGameOver() {
  draw();

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';

  ctx.font = '52px Arial';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 110);

  ctx.font = '30px Arial';
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 - 45);

  ctx.font = '28px Arial';
  ctx.fillText(`Best Score: ${bestScore}`, canvas.width / 2, canvas.height / 2);

  ctx.font = '24px Arial';
  ctx.fillText(`Survival Time: ${Math.floor(gameTime)} seconds`, canvas.width / 2, canvas.height / 2 + 45);

  ctx.font = '24px Arial';
  ctx.fillText(`Reached Level: ${level}`, canvas.width / 2, canvas.height / 2 + 85);

  ctx.font = '20px Arial';
  ctx.fillText('Press Restart to play again', canvas.width / 2, canvas.height / 2 + 130);
}

updateHUD();
animateMenu();