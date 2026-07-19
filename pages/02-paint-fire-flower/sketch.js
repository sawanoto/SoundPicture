const ART_FILE = "PaintFireFlower.png";
const SOUND_FILE = "FireFlower.mp3";

let sourceArt;
let fireworkArt;
let fireworks = [];
let stickers = [];
let fibers = [];
let hintAlpha = 255;

function preload() {
  sourceArt = loadImage(ART_FILE);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  imageMode(CENTER);
  fireworkArt = removeGrayBackground(sourceArt);
  makePaperFibers();
}

function removeGrayBackground(img) {
  const result = img.get();
  // 元画像をそのまま毎フレーム転送せず、画面表示に十分なサイズへ軽量化
  if (result.width > 900) result.resize(900, 0);
  result.loadPixels();

  for (let i = 0; i < result.pixels.length; i += 4) {
    const r = result.pixels[i];
    const g = result.pixels[i + 1];
    const b = result.pixels[i + 2];
    const brightness = (r + g + b) / 3;
    const colorDifference = max(r, g, b) - min(r, g, b);
    const paperDifference = abs(r - brightness) + abs(g - brightness) + abs(b - brightness);

    // 無彩色の灰色背景を消し、水彩の淡い色と紙の輪郭を残す
    let alpha = map(colorDifference + paperDifference * 0.6, 5, 32, 0, 255, true);
    if (brightness < 92 && colorDifference < 12) alpha *= map(brightness, 45, 92, 0, 1, true);
    result.pixels[i + 3] = constrain(alpha, 0, 255);
  }

  result.updatePixels();
  return result;
}

function makePaperFibers() {
  randomSeed(6401);
  fibers = [];
  for (let i = 0; i < 340; i++) {
    fibers.push({
      x: random(width),
      y: random(height),
      length: random(2, 15),
      angle: random(-0.35, 0.35),
      alpha: random(7, 22),
      light: random() < 0.42
    });
  }
  randomSeed();
}

function draw() {
  drawBlackPaper();
  updateStickers();

  for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].update();
    fireworks[i].display();
    if (fireworks[i].finished) fireworks.splice(i, 1);
  }

  drawHint();
}

function drawBlackPaper() {
  background(18, 18, 17);
  const ctx = drawingContext;
  const wash = ctx.createRadialGradient(
    width * 0.48, height * 0.42, 0,
    width * 0.48, height * 0.42, max(width, height) * 0.78
  );
  wash.addColorStop(0, "rgba(48,46,42,0.42)");
  wash.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  strokeWeight(0.65);
  for (const fiber of fibers) {
    if (fiber.light) stroke(130, 125, 113, fiber.alpha);
    else stroke(0, 0, 0, fiber.alpha + 5);
    line(
      fiber.x,
      fiber.y,
      fiber.x + cos(fiber.angle) * fiber.length,
      fiber.y + sin(fiber.angle) * fiber.length
    );
  }
}

function launchFirework(targetX, targetY) {
  const margin = 80;
  fireworks.push(new Firework(
    constrain(targetX, margin, width - margin),
    constrain(targetY, margin, height * 0.72)
  ));
  hintAlpha = 0;
}

class Firework {
  constructor(targetX, targetY) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.startX = constrain(targetX + random(-width * 0.17, width * 0.17), 30, width - 30);
    this.startY = height + 45;
    this.x = this.startX;
    this.y = this.startY;
    this.progress = 0;
    this.openProgress = 0;
    this.phase = "rising";
    this.finished = false;
    this.lastSticker = 0;
    this.rotation = random(-0.18, 0.18);
    this.sound = new Audio(SOUND_FILE);
    this.sound.preload = "auto";
    this.duration = 2.5;
    this.openBeforeEnd = 0.55;
    this.fallbackStartedAt = millis();

    this.sound.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(this.sound.duration) && this.sound.duration > 0) {
        this.duration = this.sound.duration;
      }
    });
    this.sound.addEventListener("ended", () => {
      if (this.phase === "rising") this.beginOpening();
      window.removeEventListener("soundpicture:mutechange", this.handleMuteChange);
    });
    this.sound.volume = window.SoundPicture?.muted ? 0 : 0.8;
    this.sound.play().catch(() => {});
    window.addEventListener("soundpicture:mutechange", this.handleMuteChange = (event) => {
      this.sound.volume = event.detail.muted ? 0 : 0.8;
    });
  }

  update() {
    if (this.phase === "rising") this.updateRising();
    else this.updateOpening();
  }

  updateRising() {
    const currentTime = this.sound.currentTime ||
      (millis() - this.fallbackStartedAt) / 1000;
    const openingTime = max(0.45, this.duration - this.openBeforeEnd);
    this.progress = constrain(currentTime / openingTime, 0, 1);

    const eased = easeOutCubic(this.progress);
    const sway = sin(this.progress * PI * 3.1) * 12 * (1 - this.progress);
    this.x = lerp(this.startX, this.targetX, eased) + sway;
    this.y = lerp(this.startY, this.targetY, eased);
    this.rotation += 0.025;

    if (this.progress - this.lastSticker > 0.048) {
      stickers.push(new DotSticker(
        this.x + random(-3, 3),
        this.y + 17,
        floor(map(this.progress, 0, 1, 0, 5.99)),
        this.progress
      ));
      this.lastSticker = this.progress;
    }

    if (currentTime >= openingTime || this.progress >= 1) this.beginOpening();
  }

  beginOpening() {
    if (this.phase !== "rising") return;
    this.phase = "opening";
    this.x = this.targetX;
    this.y = this.targetY;
    this.openProgress = 0;
    this.openStartedAt = millis();
    this.rotation = 0;
  }

  updateOpening() {
    this.openProgress = (millis() - this.openStartedAt) / 2000;
    if (this.openProgress >= 1) this.finished = true;
  }

  display() {
    if (this.phase === "rising") {
      push();
      translate(this.x, this.y);
      rotate(this.rotation);
      drawingContext.shadowColor = "rgba(255,145,175,0.52)";
      drawingContext.shadowBlur = 12;
      image(fireworkArt, 0, 0, 34, 23);
      pop();
      return;
    }

    // 一枚の画像だけを、中心から外側へ開いていく花火として描画
    const opening = constrain(this.openProgress / 0.5, 0, 1);
    const spread = easeOutBack(opening);
    const maxWidth = min(width * 0.56, height * 0.86);
    const artWidth = lerp(12, maxWidth, spread);
    const artHeight = artWidth * sourceArt.height / sourceArt.width;
    const alpha = this.openProgress < 0.65
      ? 255
      : map(this.openProgress, 0.65, 1, 255, 0, true);

    push();
    translate(this.x, this.y);
    drawingContext.shadowColor = `rgba(255,150,185,${0.42 * alpha / 255})`;
    drawingContext.shadowBlur = 28 * opening;
    tint(255, alpha);
    image(fireworkArt, 0, 0, artWidth, artHeight);
    noTint();
    pop();
  }
}

class DotSticker {
  constructor(x, y, colorIndex, heightProgress) {
    const palette = [
      [238, 82, 102], [249, 153, 62], [249, 205, 72],
      [93, 178, 126], [72, 154, 205], [162, 112, 185]
    ];
    this.x = x;
    this.y = y;
    this.color = palette[colorIndex % palette.length];
    // 打ち上げの下側は小さく、到達地点に近づくほど明確に大きくする
    // ランダム差はごく小さくし、上昇によるサイズ変化を優先する
    this.heightProgress = constrain(heightProgress, 0, 1);
    this.size = lerp(20, 50, this.heightProgress) * random(0.97, 1.03);
    this.rotation = random(TWO_PI);
    this.life = 255;
    this.age = 0;
  }

  update() {
    this.age++;
    if (this.age > 48) this.life -= 5.2;
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    noStroke();
    drawingContext.shadowColor = `rgba(0,0,0,${0.42 * this.life / 255})`;
    drawingContext.shadowBlur = 3;
    drawingContext.shadowOffsetY = 2;
    fill(this.color[0], this.color[1], this.color[2], this.life);
    beginShape();
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * TWO_PI;
      const radius = this.size * (0.47 + sin(i * 4.7) * 0.018);
      vertex(cos(angle) * radius, sin(angle) * radius);
    }
    endShape(CLOSE);

    // 光沢シールの、柔らかい面反射
    const gloss = drawingContext.createRadialGradient(
      -this.size * 0.18, -this.size * 0.2, 0,
      -this.size * 0.12, -this.size * 0.12, this.size * 0.46
    );
    gloss.addColorStop(0, `rgba(255,255,255,${0.7 * this.life / 255})`);
    gloss.addColorStop(0.34, `rgba(255,255,255,${0.24 * this.life / 255})`);
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    const ctx = drawingContext;
    ctx.save();
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.arc(-this.size * 0.1, -this.size * 0.1, this.size * 0.41, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // 左上の細い照り返しと、下側の透明な縁
    noFill();
    stroke(255, 255, 255, this.life * 0.62);
    strokeWeight(max(0.7, this.size * 0.075));
    arc(0, 0, this.size * 0.72, this.size * 0.72, PI + 0.34, TWO_PI - 0.65);
    stroke(255, 255, 255, this.life * 0.2);
    strokeWeight(max(0.5, this.size * 0.045));
    arc(0, 0, this.size * 0.84, this.size * 0.84, 0.2, PI - 0.15);

    noStroke();
    fill(255, 255, 255, this.life * 0.82);
    circle(-this.size * 0.21, -this.size * 0.2, max(1.4, this.size * 0.12));
    pop();
  }
}

function updateStickers() {
  for (let i = stickers.length - 1; i >= 0; i--) {
    stickers[i].update();
    stickers[i].display();
    if (stickers[i].life <= 0) stickers.splice(i, 1);
  }
}

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}

function easeOutBack(t) {
  const c1 = 1.35;
  const c3 = c1 + 1;
  return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2);
}

function drawHint() {
  if (hintAlpha <= 0) return;
  const pulse = map(sin(frameCount * 0.035), -1, 1, 145, 225);
  push();
  textAlign(CENTER, CENTER);
  textSize(constrain(width * 0.025, 15, 22));
  textStyle(BOLD);
  noStroke();
  fill(232, 225, 204, min(hintAlpha, pulse));
  text("花火をひらきたい場所をクリックしてください", width / 2, height - 35);
  pop();
}

function mousePressed() {
  launchFirework(mouseX, mouseY);
  return false;
}

function touchStarted() {
  launchFirework(mouseX, mouseY);
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makePaperFibers();
}
