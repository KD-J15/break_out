const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const bgm = document.getElementById("bgm");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const gameOverScreen = document.getElementById("game-over-screen");
const finalScoreDisplay = document.getElementById("final-score");
const gameContainer = document.getElementById("game-container");


// BGMの事前ロード
bgm.volume = 0.5;
bgm.load();
let isBgmPlaying = false;

// ゲーム設定
const paddleWidth = 128;
const paddleHeight = 10;
const paddleYOffset = 30;
const ballRadius = 7;
const brickRowCount = 7;
const brickColumnCount = 8;
const brickWidth = canvas.width / (brickColumnCount + 2);
const brickHeight = 20;
const brickPadding = 2;
const brickOffsetTop = 50;
const timerIncrease = 5;

let score = 0;
let timeLeft = 60;
let isGameOver = false;

// ゲーム状態の変数
let gameState = "start"; // "start", "playing", "gameover"

// パドル設定
const paddle = {
    x: (canvas.width - paddleWidth) / 2,
    y: canvas.height - paddleHeight - paddleYOffset,
    width: paddleWidth,
    height: paddleHeight,
    dx: 0,
    speed: 6
};

// ボール設定
const ball = {
    x: canvas.width / 2,
    y: paddle.y - ballRadius,
    radius: ballRadius,
    dx: 5,
    dy: -5
};

// ブロックの配列
let bricks = [];



// 初期化関数
function initGame() {
    score = 0;
    timeLeft = 60;
    isGameOver = false;
    document.getElementById("score").textContent = score;
    document.getElementById("timer").textContent = timeLeft;
    initBricks();
    resetBall();
    gameState = "playing";
    gameContainer.classList.add("game-active");
    gameOverScreen.style.display = "none"; // 追加: ゲームオーバー画面を非表示
    document.getElementById("start-screen").style.display = "none"; // 追加: スタート画面を非表示
    update();
}

// ブロック初期化
function initBricks() {
    bricks = [];
    for (let r = 0; r < brickRowCount; r++) {
        bricks[r] = [];
        for (let c = 0; c < brickColumnCount; c++) {
            let x = (c + 1) * brickWidth;
            let y = brickOffsetTop + r * (brickHeight + brickPadding);
            bricks[r][c] = { x, y, status: 1 };
        }
    }
}

//ボールの初期化
function resetBall(){
    ball.x = canvas.width/2;
    ball.y = paddle.y - ballRadius;
    ball.dx = 5;
    ball.dy = -5;
}

// BGM再生
function playBGM() {
    if (!isBgmPlaying) {
        bgm.play().catch(error => console.log("BGM再生エラー:", error));
        isBgmPlaying = true;
    }
}

// ボールの移動
function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
        ball.dx *= -1;
    }

    if (ball.y - ball.radius < 0) {
        ball.dy *= -1;
    }

    if (
        ball.y + ball.radius >= paddle.y &&
        ball.y + ball.radius <= paddle.y + paddle.height &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.width
    ) {
        let hitPoint = (ball.x - paddle.x) / paddle.width - 0.5;
        ball.dy = -Math.abs(ball.dy);
        ball.dx = hitPoint * 5;
    }

    if (ball.y - ball.radius > paddle.y + paddle.height) {
       gameOver(); //ゲームオーバー処理
    }
}

// パドルの移動
function movePaddle() {
    paddle.x += paddle.dx;
    if (paddle.x < 0) {
        paddle.x = 0;
    } else if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

// ブロックの衝突処理
function detectCollision() {
    let clearedRow = -1;

    for (let r = 0; r < brickRowCount; r++) {
        let rowCleared = true;
        for (let c = 0; c < brickColumnCount; c++) {
            let brick = bricks[r][c];
            if (brick.status === 1) {
                rowCleared = false;

                let brickLeft = brick.x;
                let brickRight = brick.x + brickWidth;
                let brickTop = brick.y;
                let brickBottom = brick.y + brickHeight;

                if (
                    ball.x + ball.radius > brickLeft &&
                    ball.x - ball.radius < brickRight &&
                    ball.y + ball.radius > brickTop &&
                    ball.y - ball.radius < brickBottom
                ) {
                    brick.status = 0;
                    score += 10;

                    let fromLeft = ball.x < brickLeft;
                    let fromRight = ball.x > brickRight;
                    let fromTop = ball.y < brickTop;
                    let fromBottom = ball.y > brickBottom;

                    if (fromLeft || fromRight) {
                        ball.dx *= -1;
                    }
                    if (fromTop || fromBottom) {
                        ball.dy *= -1;
                    }

                    return;
                }
            }
        }

        if (rowCleared) {
            clearedRow = r;
        }
    }

    if (clearedRow !== -1) {
        shiftBricksDown();
        timeLeft += timerIncrease;
        document.getElementById("timer").textContent = timeLeft;
    }
}

// ブロックを下にずらし、新しいブロックを追加
function shiftBricksDown() {
    for (let r = brickRowCount - 1; r > 0; r--) {
        for (let c = 0; c < brickColumnCount; c++) {
            bricks[r][c].y = bricks[r - 1][c].y + brickHeight + brickPadding;
            bricks[r][c].status = bricks[r - 1][c].status;
        }
    }

    for (let c = 0; c < brickColumnCount; c++) {
        let x = (c + 1) * brickWidth;
        bricks[0][c] = { x, y: brickOffsetTop, status: Math.random() < 0.7 ? 1 : 0 };
    }
}


// タイマー更新
function updateTimer() {
    if (timeLeft > 0) { // timeLeftが0より大きい場合のみ更新
        timeLeft--;
        document.getElementById("timer").textContent = timeLeft;
    }
      if(timeLeft <= 0){
        gameOver();
    }
}


// ゲームオーバー処理
function gameOver() {
    gameState = "gameover";
    isGameOver = true;
    bgm.pause();
    bgm.currentTime = 0;
    isBgmPlaying = false;
    finalScoreDisplay.textContent = score;
    gameOverScreen.style.display = "block";
    gameContainer.classList.remove("game-active");
    document.getElementById("start-screen").style.display = "none"; //　追加: スタート画面を非表示.
}


// キーイベント
document.addEventListener("keydown", (e) => {
    if (gameState === "playing") {
        playBGM();
        if (e.key === "ArrowLeft") {
            paddle.dx = -paddle.speed;
        } else if (e.key === "ArrowRight") {
            paddle.dx = paddle.speed;
        }
    }
});

document.addEventListener("keyup", () => {
     if (gameState === "playing") {
        paddle.dx = 0;
     }
});

// ゲームループ
function update() {
    if (gameState === "playing") {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        movePaddle();
        moveBall();
        detectCollision();
        drawBricks();
        drawPaddle();
        drawBall();
        document.getElementById("score").textContent = score; // スコアを更新

        requestAnimationFrame(update);

    }
}

// 描画関数
function drawBricks() {
    for (let r = 0; r < brickRowCount; r++) {
        for (let c = 0; c < brickColumnCount; c++) {
            if (bricks[r][c].status === 1) {
                ctx.fillStyle = "red";
                ctx.fillRect(
                    bricks[r][c].x,
                    bricks[r][c].y,
                    brickWidth - brickPadding,
                    brickHeight - brickPadding
                );
            }
        }
    }
}

function drawPaddle() {
    ctx.fillStyle = "blue";
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
}


// スタートボタンのクリックイベント
startButton.addEventListener("click", () => {
    initGame();
    setInterval(updateTimer,1000);

});

// リスタートボタンのクリックイベント
restartButton.addEventListener("click", () => {
    initGame(); // ゲームを初期化して再開
     setInterval(updateTimer,1000);
});