const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const bgm = document.getElementById("bgm");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const gameOverScreen = document.getElementById("game-over-screen");
const finalScoreDisplay = document.getElementById("final-score");
const gameContainer = document.getElementById("game-container");
const info = document.getElementById("info");

let timerInterval;
let gameState = "waiting"; // "playing" | "game-over"
let isGameOver = false;
let score = 0;
let timeLeft = 60;

// BGM の初期設定
bgm.volume = 0.5;
bgm.load();

// ===== ゲーム設定 =====
const paddleWidth = 100;
const paddleHeight = 10;
const paddleYOffset = 30;
const ballRadius = 7;

// ブロック配置用
const brickRowCount = 7;
const brickColumnCount = 8;
const brickPadding = 5;
const brickOffsetTop = 50;
const sideMargin = 30;
const brickHeight = 20;

let brickWidth = 0; // キャンバス幅に応じて計算
let bricks = [];    // 2次元配列[row][col]でブロック管理

// ゲームオブジェクト
let paddle;
let ball;

/**
 * 全体のブロック数を返す
 */
function getTotalBricks() {
  return brickRowCount * brickColumnCount;
}

/**
 * 残っているブロック数を数える
 */
function countRemainingBricks() {
  let remain = 0;
  for (let r = 0; r < brickRowCount; r++) {
    for (let c = 0; c < brickColumnCount; c++) {
      if (bricks[r][c].status === 1) {
        remain++;
      }
    }
  }
  return remain;
}

/**
 * ブロックを初期化する
 */
function initBricks() {
  brickWidth =
    (canvas.width - sideMargin * 2 - (brickColumnCount - 1) * brickPadding)
    / brickColumnCount;

  bricks = [];
  for (let r = 0; r < brickRowCount; r++) {
    bricks[r] = [];
    for (let c = 0; c < brickColumnCount; c++) {
      let x = sideMargin + c * (brickWidth + brickPadding);
      let y = brickOffsetTop + r * (brickHeight + brickPadding);
      bricks[r][c] = { x, y, status: 1 };
    }
  }
}

/**
 * パドルとボールを初期化
 */
function initObjects() {
  paddle = {
    x: (canvas.width - paddleWidth) / 2,
    y: canvas.height - paddleYOffset - paddleHeight,
    width: paddleWidth,
    height: paddleHeight,
    dx: 0,
    speed: 5
  };

  ball = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    radius: ballRadius,
    dx: 3, // ボールの初期速度
    dy: -3
  };
}

/**
 * ゲーム開始
 */
function initGame() {
  clearInterval(timerInterval);
  score = 0;
  timeLeft = 60;
  isGameOver = false;
  gameState = "playing";

  document.getElementById("score").textContent = score;
  document.getElementById("timer").textContent = timeLeft;
  info.style.display = "flex";

  initBricks();
  initObjects();

  gameContainer.classList.add("game-active");
  gameOverScreen.style.display = "none";
  document.getElementById("start-screen").style.display = "none";

  // タイマー開始
  timerInterval = setInterval(updateTimer, 1000);

  // BGM再生(loop属性で常にループ)
  bgm.currentTime = 0;
  bgm.play();

  update();
}

/**
 * 毎フレームの更新処理
 */
function update() {
  if (isGameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // パドル移動
  paddle.x += paddle.dx;
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) {
    paddle.x = canvas.width - paddle.width;
  }

  // ボール移動
  ball.x += ball.dx;
  ball.y += ball.dy;

  // 壁との衝突（左右）
  if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
    ball.dx *= -1;
  }
  // 壁との衝突（上）
  if (ball.y - ball.radius < 0) {
    ball.dy *= -1;
  }
  // 下に落ちたらゲームオーバー
  if (ball.y + ball.radius > canvas.height) {
    gameOver();
    return;
  }

  // パドルとの衝突
  if (
    ball.y + ball.radius >= paddle.y &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width
  ) {
    ball.dy *= -1;
    ball.y = paddle.y - ball.radius; // めり込み防止
  }

  // ブロックとの衝突判定
outerLoop:
  for (let r = 0; r < brickRowCount; r++) {
    for (let c = 0; c < brickColumnCount; c++) {
      let brick = bricks[r][c];
      if (brick.status === 1) {
        // ブロック描画
        ctx.fillStyle = "red";
        ctx.fillRect(brick.x, brick.y, brickWidth, brickHeight);

        // 当たり判定
        if (
          ball.x + ball.radius > brick.x &&
          ball.x - ball.radius < brick.x + brickWidth &&
          ball.y + ball.radius > brick.y &&
          ball.y - ball.radius < brick.y + brickHeight
        ) {
          // 衝突したので反射
          let ballHitFromLeftOrRight =
            (ball.x < brick.x) || (ball.x > brick.x + brickWidth);
          let ballHitFromTopOrBottom =
            (ball.y < brick.y) || (ball.y > brick.y + brickHeight);

          if (ballHitFromLeftOrRight) {
            ball.dx *= -1;
          }
          if (ballHitFromTopOrBottom) {
            ball.dy *= -1;
          }

          // ブロック破壊
          brick.status = 0;
          score += 10;
          document.getElementById("score").textContent = score;

          // ブロック1個破壊で +1秒
          timeLeft += 1;

          // 行全体が消えたかチェック
          if (bricks[r].every(b => b.status === 0)) {
            // 1行全破壊 => +10秒
            timeLeft += 10;
            // 行が消えたので1段下げて最上段を新規ブロックに
            shiftAllRowsDown();
          }

          break outerLoop;
        }
      }
    }
  }

  // === ブロックが8割消えたらすべて初期状態に戻す ===
  let remain = countRemainingBricks();
  let total = getTotalBricks();
  // 残りが総数の2割以下 (8割破壊) ならブロック初期化
  if (remain <= total * 0.2) {
    initBricks();
  }

  // パドル描画
  ctx.fillStyle = "blue";
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

  // ボール描画
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();

  requestAnimationFrame(update);
}

/**
 * 行を1段下げ、新しい行を最上段( row=0 )に追加
 */
function shiftAllRowsDown() {
  for (let r = brickRowCount - 1; r > 0; r--) {
    bricks[r] = bricks[r - 1];
    // y座標を再計算
    for (let c = 0; c < brickColumnCount; c++) {
      bricks[r][c].y = brickOffsetTop + r * (brickHeight + brickPadding);
    }
  }

  // row=0 を新規生成
  bricks[0] = [];
  for (let c = 0; c < brickColumnCount; c++) {
    let x = sideMargin + c * (brickWidth + brickPadding);
    let y = brickOffsetTop;
    bricks[0][c] = { x, y, status: 1 };
  }
}

/**
 * ゲームオーバー処理
 */
function gameOver() {
  if (isGameOver) return;
  isGameOver = true;
  gameState = "game-over";

  clearInterval(timerInterval);
  bgm.pause();
  bgm.currentTime = 0;

  finalScoreDisplay.textContent = score;
  gameOverScreen.style.display = "block";
  gameContainer.classList.remove("game-active");
}

/**
 * タイマー更新
 */
function updateTimer() {
  if (isGameOver) return;
  if (timeLeft > 0) {
    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;
  } else {
    clearInterval(timerInterval);
    gameOver();
  }
}

/**
 * キーイベント
 */
document.addEventListener("keydown", (e) => {
  if (gameState === "playing") {
    if (e.key === "ArrowLeft") {
      paddle.dx = -paddle.speed;
    } else if (e.key === "ArrowRight") {
      paddle.dx = paddle.speed;
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (gameState === "playing") {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      paddle.dx = 0;
    }
  }
});

// スタート・リスタートボタン
startButton.addEventListener("click", initGame);
restartButton.addEventListener("click", initGame);
