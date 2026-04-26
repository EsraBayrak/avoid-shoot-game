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
let score = 0;
let gameTime = 0;
let gameRunning = false;
let animationId = null;
let enemySpawnTimer = 0;
let difficultyTimer = 0;
let enemySpawnInterval = 1200;
let enemySpeedMultiplier = 1;
let lastTime = 0;

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 30,
  speed: 5,
  color: '#4ade80',
  health: 5,
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

function startGame() {
  if (gameRunning) return;
  gameRunning = true;
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function resetGame() {
  cancelAnimationFrame(animationId);
  bullets = [];
  enemies = [];
  score = 0;
  gameTime = 0;
  enemySpawnTimer = 0;
  difficultyTimer = 0;
  enemySpawnInterval = 1200;
  enemySpeedMultiplier = 1;

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.health = 5;
  player.shootCooldown = 0;
  player.facingX = 1;
  player.facingY = 0;

  gameRunning = false;
  updateHUD();
  drawStartScreen('Game reset. Press Start Game');
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
    drawGameOver();
  }
}

function update(deltaTime) {
  gameTime += deltaTime / 1000;
  enemySpawnTimer += deltaTime;
  difficultyTimer += deltaTime;

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

  if (difficultyTimer >= 10000) {
    difficultyTimer = 0;
    enemySpeedMultiplier += 0.15;
    enemySpawnInterval = Math.max(450, enemySpawnInterval - 80);
  }

  updateBullets();
  updateEnemies();
  checkCollisions();
  updateHUD();
}

function movePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys['ArrowUp'] || keys['w']) dy -= 1;
  if (keys['ArrowDown'] || keys['s']) dy += 1;
  if (keys['ArrowLeft'] || keys['a']) dx -= 1;
  if (keys['ArrowRight'] || keys['d']) dx += 1;

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
  obj.x = Math.max(half, Math.min(canvas.width - half, obj.x));
  obj.y = Math.max(half, Math.min(canvas.height - half, obj.y));
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
  const side = Math.floor(Math.random() * 4);
  let x, y;

  if (side === 0) { x = Math.random() * canvas.width; y = -30; }
  else if (side === 1) { x = canvas.width + 30; y = Math.random() * canvas.height; }
  else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 30; }
  else { x = -30; y = Math.random() * canvas.height; }

  enemies.push({
    x, y,
    size: 28,
    speed: (1.3 + Math.random()) * enemySpeedMultiplier,
    color: '#ef4444'
  });
}

function updateEnemies() {
  for (let e of enemies) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;

    e.x += (dx / dist) * e.speed;
    e.y += (dy / dist) * e.speed;
  }
}

function isColliding(a, b) {
  return Math.abs(a.x - b.x) < (a.size + b.size)/2 &&
         Math.abs(a.y - b.y) < (a.size + b.size)/2;
}

function checkCollisions() {
  for (let i = enemies.length-1; i>=0; i--) {
    if (isColliding(player, enemies[i])) {
      enemies.splice(i,1);
      player.health--;
    }
  }

  for (let i = bullets.length-1; i>=0; i--) {
    for (let j = enemies.length-1; j>=0; j--) {
      if (isColliding(bullets[i], enemies[j])) {
        bullets.splice(i,1);
        enemies.splice(j,1);
        score += 10;
        break;
      }
    }
  }
}

function updateHUD() {
  scoreEl.textContent = `Score: ${score}`;
  healthEl.textContent = `Health: ${player.health}`;
  timeEl.textContent = `Time: ${Math.floor(gameTime)}`;
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  drawPlayer();
  drawBullets();
  drawEnemies();
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size/2, 0, Math.PI*2);
  ctx.fill();
}

function drawBullets() {
  bullets.forEach(b=>{
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size/2, 0, Math.PI*2);
    ctx.fill();
  });
}

function drawEnemies() {
  enemies.forEach(e=>{
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);
  });
}

function drawStartScreen(msg="Press Start Game") {
  draw();
  ctx.fillStyle="white";
  ctx.textAlign="center";
  ctx.font="40px Arial";
  ctx.fillText(msg, canvas.width/2, canvas.height/2);
}

function drawGameOver() {
  draw();

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';

  ctx.font = '52px Arial';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 80);

  ctx.font = '28px Arial';
  ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 - 20);

  ctx.fillText(`Survival Time: ${Math.floor(gameTime)} seconds`,
    canvas.width / 2, canvas.height / 2 + 25);

  ctx.font = '22px Arial';
  ctx.fillText('Press Restart to play again',
    canvas.width / 2, canvas.height / 2 + 80);
}

updateHUD();
drawStartScreen();