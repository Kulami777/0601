let video;
let handpose;
let predictions = [];

let score = 0;
const maxMonsterHealth = 300;
let monsterHealth = maxMonsterHealth;
let currentEffect = '無';

let fireballImg, iceballImg, healingImg, monsterImg, hitEffectImg;

let lastCastTime = 0;
const castCooldown = 800; // 攻擊冷卻，避免太快連打

let fireballs = [];
let iceballs = [];
let heals = [];

let gameOver = false;  // 新增遊戲結束旗標

function preload() {
    fireballImg = loadImage('fireball.png');
    iceballImg = loadImage('iceball.png');
    healingImg = loadImage('healing.png');
    monsterImg = loadImage('monster.png');
    hitEffectImg = loadImage('hit_effect.png');
}

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('game-content');

    video = createCapture(VIDEO);
    video.size(width, height);
    video.hide();

    initHandpose();

    select('#restart-btn').mousePressed(restartGame);
}

function draw() {
    background(30);
    image(video, 0, 0, width, height);

    const monsterX = width * 0.7;
    const monsterY = height * 0.1;
    const monsterWidth = 300;
    const monsterHeight = 300;

    if (monsterImg) {
        image(monsterImg, monsterX, monsterY, monsterWidth, monsterHeight);
    }

    if (currentEffect !== '無' && millis() - lastCastTime < 500 && hitEffectImg) {
        image(hitEffectImg, monsterX - 20, monsterY - 20, monsterWidth + 50, monsterHeight + 50);
    }

    if (!gameOver) {
        if (predictions.length > 0) {
            detectGesture(predictions[0]);
        } else {
            currentEffect = '無';
            updateEffectDisplay();
        }

        updateAndDrawFireballs(monsterX, monsterY, monsterWidth, monsterHeight);
        updateAndDrawIceballs(monsterX, monsterY, monsterWidth, monsterHeight);
        updateAndDrawHeals(monsterX, monsterY, monsterWidth, monsterHeight);
    }

    updateHealthBar();
    updateScoreDisplay();

    if (monsterHealth <= 0 && !gameOver) {
        gameOver = true;
        showVictory();
    }
}

function initHandpose() {
    handpose = ml5.handpose(video, () => {
        console.log('Handpose 模型載入完成');
        select('#loading').style('display', 'none');
    });

    handpose.on('predict', results => {
        predictions = results;
    });
}

function detectGesture(prediction) {
    const now = millis();
    if (now - lastCastTime < castCooldown) return;

    const landmarks = prediction.landmarks;

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const thumbIndexDist = dist(thumbTip[0], thumbTip[1], indexTip[0], indexTip[1]);
    const indexMiddleDist = dist(indexTip[0], indexTip[1], middleTip[0], middleTip[1]);
    const spreadDist = dist(indexTip[0], indexTip[1], pinkyTip[0], pinkyTip[1]);

    const yPos = indexTip[1];

    // 治癒術：五指張開
    if (spreadDist > 120 &&
        dist(thumbTip[0], thumbTip[1], ringTip[0], ringTip[1]) > 40 &&
        dist(thumbTip[0], thumbTip[1], pinkyTip[0], pinkyTip[1]) > 60
    ) {
        castSpell('治癒術', yPos);
        lastCastTime = now;
    }
    // 火球術：大拇指和食指靠近（簡單判斷）
    else if (thumbIndexDist < 60) {
        castSpell('火球術', yPos);
        lastCastTime = now;
    }
    // 冰球術：V字型
    else if (indexMiddleDist > 30 && thumbIndexDist > 30) {
        castSpell('冰球術', yPos);
        lastCastTime = now;
    } else {
        currentEffect = '無';
        updateEffectDisplay();
    }
}

function castSpell(spell, yPos) {
    currentEffect = spell;

    if (spell === '治癒術') {
        createHeal(yPos);
    } else if (spell === '火球術') {
        createFireball(yPos);
    } else if (spell === '冰球術') {
        createIceball(yPos);
    }

    updateEffectDisplay();
}

function createFireball(yPos) {
    fireballs.push({
        x: 100,
        y: yPos,
        vx: 15,
        size: 60
    });
}

function createIceball(yPos) {
    iceballs.push({
        x: 100,
        y: yPos,
        vx: 12,
        size: 60
    });
}

function createHeal(yPos) {
    heals.push({
        x: 100,
        y: yPos,
        vx: 8,
        size: 60
    });
}

function updateAndDrawFireballs(monsterX, monsterY, monsterWidth, monsterHeight) {
    for (let i = fireballs.length - 1; i >= 0; i--) {
        let f = fireballs[i];
        f.x += f.vx;
        image(fireballImg, f.x, f.y, f.size, f.size);

        if (checkCollision(f, monsterX, monsterY, monsterWidth, monsterHeight)) {
            monsterHealth = max(monsterHealth - 20, 0);
            score += 5;
            fireballs.splice(i, 1);
        } else if (f.x > width) {
            fireballs.splice(i, 1);
        }
    }
}

function updateAndDrawIceballs(monsterX, monsterY, monsterWidth, monsterHeight) {
    for (let i = iceballs.length - 1; i >= 0; i--) {
        let b = iceballs[i];
        b.x += b.vx;
        image(iceballImg, b.x, b.y, b.size, b.size);

        if (checkCollision(b, monsterX, monsterY, monsterWidth, monsterHeight)) {
            monsterHealth = max(monsterHealth - 30, 0);
            score += 8;
            iceballs.splice(i, 1);
        } else if (b.x > width) {
            iceballs.splice(i, 1);
        }
    }
}

function updateAndDrawHeals(monsterX, monsterY, monsterWidth, monsterHeight) {
    for (let i = heals.length - 1; i >= 0; i--) {
        let h = heals[i];
        h.x += h.vx;
        image(healingImg, h.x, h.y, h.size, h.size);

        if (checkCollision(h, monsterX, monsterY, monsterWidth, monsterHeight)) {
            monsterHealth = min(monsterHealth + 10, maxMonsterHealth);
            heals.splice(i, 1);
        } else if (h.x > width) {
            heals.splice(i, 1);
        }
    }
}

function checkCollision(obj, targetX, targetY, targetW, targetH) {
    return obj.x + obj.size > targetX &&
           obj.x < targetX + targetW &&
           obj.y + obj.size > targetY &&
           obj.y < targetY + targetH;
}

function updateHealthBar() {
    const healthBar = select('#health-bar');
    if (healthBar) {
        const healthPercent = map(monsterHealth, 0, maxMonsterHealth, 0, 100);
        healthBar.style('width', healthPercent + '%');

        const green = map(monsterHealth, 0, maxMonsterHealth, 0, 255);
        const red = map(monsterHealth, 0, maxMonsterHealth, 255, 0);
        healthBar.style('background-color', `rgb(${red},${green},0)`);
    }
}

function updateScoreDisplay() {
    const scoreElem = select('#score');
    if (scoreElem) {
        scoreElem.html(score);
    }
}

function updateEffectDisplay() {
    const effectElem = select('#current-effect');
    if (effectElem) {
        effectElem.html(currentEffect);
    }
}

function restartGame() {
    score = 0;
    monsterHealth = maxMonsterHealth;
    currentEffect = '無';
    lastCastTime = 0;

    fireballs = [];
    iceballs = [];
    heals = [];

    gameOver = false;  // 重設遊戲狀態

    const victoryMsg = select('#victory-message');
    if (victoryMsg) {
        victoryMsg.style('display', 'none');
    }
}

function showVictory() {
    const victoryMsg = select('#victory-message');
    const finalScoreElem = select('#final-score');

    if (victoryMsg && finalScoreElem) {
        victoryMsg.style('display', 'block');
        finalScoreElem.html(score);
        // 不要自動重啟，讓玩家自己按按鈕
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

// noLoop();  // 不要呼叫這行
