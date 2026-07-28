const ART_FILE = "ShootingStar.png";
const STAR_COUNT = 8;
const STAR_NOTES = [60, 62, 64, 65, 67, 69, 71, 72];
// 「ハラペコアオムシ」で音階に割り当てた8色。
const STAR_COLORS = [
  [210, 44, 48], [226, 112, 28], [226, 205, 20], [54, 157, 39],
  [26, 137, 184], [91, 58, 130], [84, 46, 29], [204, 47, 96]
];

let shootingStarArt;
let littleStars = [];
let dust = [];
let shootingX = 0;
let shootingY = 0;
let shootingScale = 1;
let shootingProgress = 0;
let music;
let musicStarted = false;
let hintAlpha = 255;
let lastPointerAt = -9999;

function preload() {
  shootingStarArt = loadImage(ART_FILE);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  imageMode(CENTER);
  music = new TwinkleMusic();
  makeSky();
  resetShootingStar(true);
}

function makeSky() {
  randomSeed(7403);
  dust = Array.from({ length: max(90, floor(width * height / 6500)) }, () => ({
    x: random(width),
    y: random(height),
    size: random(0.7, 2.7),
    phase: random(TWO_PI),
    speed: random(0.012, 0.035)
  }));

  littleStars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    // 左から音階順になる範囲内で横位置を揺らし、高さと大きさは
    // 大きくばらけさせて、整列して見えない星空にする。
    const laneWidth = width / STAR_COUNT;
    const x = (i + 0.5) * laneWidth + random(-laneWidth * 0.2, laneWidth * 0.2);
    const yPattern = [0.27, 0.62, 0.4, 0.73, 0.3, 0.57, 0.2, 0.68];
    const y = height * yPattern[i] + random(-height * 0.055, height * 0.055);
    littleStars.push(new FlipStar(
      x,
      y,
      random(width < 600 ? 19 : 25, width < 600 ? 30 : 40),
      i
    ));
  }
  randomSeed();
}

function draw() {
  drawNightSky();
  drawShootingStar();
  for (const star of littleStars) {
    star.update();
    star.display();
  }
  drawHint();
}

function drawNightSky() {
  background(5, 14, 38);
  const ctx = drawingContext;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#071329");
  gradient.addColorStop(0.55, "#102957");
  gradient.addColorStop(1, "#1b3e68");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const moonGlow = ctx.createRadialGradient(
    width * 0.78, height * 0.18, 0,
    width * 0.78, height * 0.18, min(width, height) * 0.42
  );
  moonGlow.addColorStop(0, "rgba(117,160,255,.14)");
  moonGlow.addColorStop(1, "rgba(30,70,130,0)");
  ctx.fillStyle = moonGlow;
  ctx.fillRect(0, 0, width, height);

  noStroke();
  for (const point of dust) {
    const alpha = map(sin(frameCount * point.speed + point.phase), -1, 1, 45, 190);
    fill(224, 237, 255, alpha);
    circle(point.x, point.y, point.size);
  }
}

function resetShootingStar(first = false) {
  shootingScale = min(width / shootingStarArt.width, height / shootingStarArt.height) *
    (width < 600 ? 0.68 : 0.5);
  shootingProgress = first ? 0.14 : 0;
}

function drawShootingStar() {
  const artWidth = shootingStarArt.width * shootingScale;
  const artHeight = shootingStarArt.height * shootingScale;

  // 右下から空の高いところを通り、左下へ沈む緩やかな放物線。
  // 画面外の余白を含め、流れ星全体が自然に現れて消えるようにする。
  const startX = width + artWidth * 0.48;
  const startY = height * 0.76;
  const controlX = width * 0.53;
  const controlY = height * 0.02 - artHeight * 0.08;
  const endX = -artWidth * 0.5;
  const endY = height * 0.78;
  const t = constrain(shootingProgress, 0, 1);

  shootingX = bezierPoint(startX, controlX, controlX, endX, t);
  shootingY = bezierPoint(startY, controlY, controlY, endY, t);

  // 前半は原画の角度を保ち、頂点を越えた後に軌跡が星の後ろへ
  // たなびくよう、後半だけ約 -30 度まで滑らかに傾ける。
  const turn = smoothstep(0.46, 0.76, t);
  const shootingAngle = lerp(-0.035, radians(-30), turn);

  shootingProgress += 1 / max(720, width * 0.72);
  if (shootingProgress >= 1) resetShootingStar();

  push();
  translate(shootingX, shootingY);
  rotate(shootingAngle);
  drawingContext.globalCompositeOperation = "screen";
  tint(255, 238);
  image(shootingStarArt, 0, 0, artWidth, artHeight);
  noTint();
  drawingContext.globalCompositeOperation = "source-over";
  pop();
}

class FlipStar {
  constructor(x, y, radius, index) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.index = index;
    this.angle = 0;
    this.targetAngle = 0;
    this.wobble = random(TWO_PI);
    this.color = color(...STAR_COLORS[index]);
  }

  update() {
    this.angle = lerp(this.angle, this.targetAngle, 0.13);
    if (abs(this.targetAngle - this.angle) < 0.012) this.angle = this.targetAngle;
  }

  flip() {
    this.targetAngle += PI;
  }

  contains(px, py) {
    return dist(px, py, this.x, this.y) < this.radius * 1.55;
  }

  display() {
    const flipWidth = cos(this.angle);
    const pulse = 1 + sin(frameCount * 0.025 + this.wobble) * 0.07;
    push();
    translate(this.x, this.y);
    scale(flipWidth * pulse, pulse);
    rotate(sin(frameCount * 0.012 + this.wobble) * 0.09);

    drawingContext.shadowColor = "rgba(255,225,105,.72)";
    drawingContext.shadowBlur = 16;
    noStroke();
    fill(this.color);
    beginShape();
    for (let i = 0; i < 10; i++) {
      const angle = -HALF_PI + i * PI / 5;
      const radius = i % 2 === 0 ? this.radius : this.radius * 0.45;
      vertex(cos(angle) * radius, sin(angle) * radius);
    }
    endShape(CLOSE);

    fill(255, 255, 255, 120);
    ellipse(-this.radius * 0.18, -this.radius * 0.2, this.radius * 0.22);
    pop();
  }
}

function drawHint() {
  if (hintAlpha <= 0) return;
  const pulse = map(sin(frameCount * 0.04), -1, 1, 135, 235);
  push();
  textAlign(CENTER, CENTER);
  textSize(constrain(width * 0.03, 15, 22));
  textStyle(BOLD);
  noStroke();
  fill(245, 239, 184, min(hintAlpha, pulse));
  text(musicStarted ? "まわりの ほしを タップしてね" : "タップして おんがくを はじめよう", width / 2, height - 34);
  pop();
}

function activateAt(x, y) {
  if (millis() - lastPointerAt < 180) return false;
  lastPointerAt = millis();

  if (!musicStarted) {
    music.start();
    musicStarted = true;
  }

  let touched = false;
  for (const star of littleStars) {
    if (star.contains(x, y)) {
      star.flip();
      music.playStar(star.index);
      touched = true;
    }
  }
  if (touched) hintAlpha = 0;
  return false;
}

function mousePressed() {
  return activateAt(mouseX, mouseY);
}

function touchStarted() {
  return activateAt(mouseX, mouseY);
}

function keyPressed() {
  if (!musicStarted && (key === " " || keyCode === ENTER)) {
    music.start();
    musicStarted = true;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeSky();
  resetShootingStar(true);
}

class TwinkleMusic {
  constructor() {
    this.context = null;
    this.master = null;
    this.timer = null;
    this.step = 0;
    this.tempo = 720;
    this.notes = [
      60, 60, 67, 67, 69, 69, 67, null,
      65, 65, 64, 64, 62, 62, 60, null,
      67, 67, 65, 65, 64, 64, 62, null,
      67, 67, 65, 65, 64, 64, 62, null,
      60, 60, 67, 67, 69, 69, 67, null,
      65, 65, 64, 64, 62, 62, 60, null
    ];
  }

  start() {
    if (this.timer) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = window.SoundPicture?.muted ? 0 : 0.22;
    this.master.connect(this.context.destination);
    this.playNext();
    this.timer = setInterval(() => this.playNext(), this.tempo);
  }

  playNext() {
    const note = this.notes[this.step % this.notes.length];
    if (note !== null) this.playMusicBoxNote(note, 1.08, 0.5);
    this.step++;
  }

  playStar(index) {
    if (!this.context) return;
    this.playMusicBoxNote(STAR_NOTES[index], 0.9, 0.28);
  }

  setMuted(muted) {
    if (!this.context || !this.master) return;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(muted ? 0 : 0.22, this.context.currentTime, 0.025);
  }

  playMusicBoxNote(note, duration, volume) {
    const now = this.context.currentTime;
    const frequency = 440 * pow(2, (note - 69) / 12);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(volume * 0.24, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.connect(this.master);

    // 基音に小さな倍音を重ね、オルゴールの櫛歯を弾いた響きを作る。
    const partials = [
      { ratio: 1, level: 1 },
      { ratio: 2.01, level: 0.22 },
      { ratio: 3.98, level: 0.07 }
    ];
    for (const partial of partials) {
      const oscillator = this.context.createOscillator();
      const partialGain = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency * partial.ratio;
      partialGain.gain.value = partial.level;
      oscillator.connect(partialGain);
      partialGain.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.04);
    }
  }
}

function smoothstep(edge0, edge1, value) {
  const t = constrain((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

window.addEventListener("soundpicture:mutechange", (event) => {
  music?.setMuted(event.detail.muted);
});
