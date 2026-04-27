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
let enemySpawnInterval = 1400;
let enemySpeedMultiplier = 1;
let lastTime = 0;

let screenShake = 0;

const MAX_HEALTH = 15;

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
  enemySpawnInterval = 1400;
  enemySpeedMultiplier = 1;
  screenShake = 0;

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.health = MAX_HEALTH;
  player.shootCooldown = 0;
  player.facingX = 1;
  player.facingY = 0;

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
  enemySpawnInterval = 1400;
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

  if (player.shootCooldown > 0) player.shootCooldown -= deltaTime;

  if (keys[' '] && player.shootCooldown <= 0) {
    shootBullet();
    player.shootCooldown = 250;
  }

  if (enemySpawnTimer >= enemySpawnInterval) {
    spawnEnemy();
    enemySpawnTimer = 0;
  }

  if (healthPackTimer >= 10000) {
    spawnHealthPack();
    healthPackTimer = 0;
  }

  if (difficultyTimer >= 10000) {
    difficultyTimer = 0;
    enemySpeedMultiplier += 0.05;
    enemySpawnInterval = Math.max(650, enemySpawnInterval - 40);
  }

  if (screenShake > 0) screenShake--;

  updateBullets();
  updateEnemies();
  updateParticles();
  checkCollisions();
  updateHUD();
}

function updateLevel() {
  const newLevel = Math.floor(gameTime / 7) + 1;

  if (newLevel > level) {
    level = newLevel;
    enemySpeedMultiplier += 0.08;
    enemySpawnInterval = Math.max(600, enemySpawnInterval - 60);

    if (level === 2 || level % 3 === 0) {
      spawnBossEnemy();
    }
  }
}

function movePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
  if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.sqrt(dx * dx + dy * dy);
    dx /= length;
    dy /= length;

    player.x += dx * player.speed;
    player.y += dy * player.speed;
    player.facingX = dx;
    player.facingY = dy;
  }
}

function containPlayer(obj) {
  const half = obj.size / 2;

  if (obj.x < half) obj.x = half;
  if (obj.x > canvas.width - half) obj.x = canvas.width - half;
  if (obj.y < half) obj.y = half;
  if (obj.y > canvas.height - half) obj.y = canvas.height - half;
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
    const bullet = bullets[i];

    bullet.x += bullet.dx * bullet.speed;
    bullet.y += bullet.dy * bullet.speed;

    if (
      bullet.x < 0 ||
      bullet.x > canvas.width ||
      bullet.y < 0 ||
      bullet.y > canvas.height
    ) {
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
    speed: (0.8 + Math.random() * 0.6) * enemySpeedMultiplier,
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
    speed: 0.45 * enemySpeedMultiplier,
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

function updateEnemies() {
  for (let enemy of enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;

    enemy.x += (dx / distance) * enemy.speed;
    enemy.y += (dy / distance) * enemy.speed;
    enemy.angle += 0.05;
  }
}

function spawnHealthPack() {
  healthPacks.push({
    x: Math.random() * (canvas.width - 80) + 40,
    y: Math.random() * (canvas.height - 80) + 40,
    size: 24,
    color: '#22c55e'
  });
}

function createExplosion(x, y, color = '#f97316', count = 16, power = 6) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      size: Math.random() * 5 + 2,
      speedX: (Math.random() - 0.5) * power,
      speedY: (Math.random() - 0.5) * power,
      life: 35,
      color: color
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.speedX;
    p.y += p.speedY;
    p.life--;
    p.size *= 0.96;

    if (p.life <= 0 || p.size <= 0.5) {
      particles.splice(i, 1);
    }
  }
}

function isColliding(a, b) {
  return (
    Math.abs(a.x - b.x) < (a.size + b.size) / 2 &&
    Math.abs(a.y - b.y) < (a.size + b.size) / 2
  );
}

function checkCollisions() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (isColliding(player, enemies[i])) {
      createExplosion(enemies[i].x, enemies[i].y, enemies[i].color);
      enemies.splice(i, 1);
      player.health -= 1;
      screenShake = 18;
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      if (isColliding(bullets[i], enemies[j])) {
        createExplosion(enemies[j].x, enemies[j].y, enemies[j].color);

        bullets.splice(i, 1);
        enemies[j].health -= 1;

        if (enemies[j].type === 'boss') {
          score += 25;
        }

        if (enemies[j].health <= 0) {
          if (enemies[j].type === 'boss') {
            createExplosion(enemies[j].x, enemies[j].y, '#a855f7', 40, 10);
            createExplosion(enemies[j].x, enemies[j].y, '#facc15', 30, 12);
            screenShake = 28;
          } else {
            score += 10;
          }

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
  healthEl.textContent = `HP: ${player.health}`;
  timeEl.textContent = `Time: ${Math.floor(gameTime)} | Best: ${bestScore}`;

  if (player.health > 10) {
    healthEl.style.color = 'lime';
  } else if (player.health > 5) {
    healthEl.style.color = 'yellow';
  } else {
    healthEl.style.color = 'red';
  }
}

function saveBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('avoidShootBestScore', bestScore);
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';

  for (let x = 0; x < canvas.width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
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
  for (let bullet of bullets) {
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (let enemy of enemies) {
    ctx.save();

    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);

    ctx.fillStyle = enemy.color;
    ctx.fillRect(
      -enemy.size / 2,
      -enemy.size / 2,
      enemy.size,
      enemy.size
    );

    if (enemy.type === 'boss') {
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', 0, 5);
    }

    ctx.restore();
  }
}

function drawParticles() {
  for (let p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 35;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  }
}

function drawHealthPacks() {
  for (let h of healthPacks) {
    ctx.fillStyle = h.color;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+', h.x, h.y + 6);
  }
}

function draw() {
  ctx.save();

  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake;
    const shakeY = (Math.random() - 0.5) * screenShake;
    ctx.translate(shakeX, shakeY);
  }

  drawBackground();
  drawHealthPacks();
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawParticles();

  ctx.restore();
}

function drawStartScreen(message = 'Press Start Game') {
  menuTime += 0.05;

  drawBackground();

  const titleY = canvas.height / 2 - 55 + Math.sin(menuTime) * 8;
  const blinkAlpha = 0.5 + Math.sin(menuTime * 2) * 0.5;

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';

  ctx.font = '46px Arial';
  ctx.fillText('Avoid & Shoot Survival', canvas.width / 2, titleY);

  ctx.globalAlpha = blinkAlpha;
  ctx.font = '24px Arial';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 10);
  ctx.globalAlpha = 1;

  ctx.font = '18px Arial';
  ctx.fillText('Move: WASD / Arrow Keys | Shoot: Space', canvas.width / 2, canvas.height / 2 + 50);

  ctx.font = '18px Arial';
  ctx.fillText(`Best Score: ${bestScore}`, canvas.width / 2, canvas.height / 2 + 85);
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