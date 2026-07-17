const IMAGE_FILE = "FrogRain.png";

let frogImage;
let bodyLayer, leftLegLayer, rightLegLayer;
let rain = [];
let pressing = false;
let walkDistance = 0;
let walkDirection = 1;
let leafRainSound;

function preload() {
  frogImage = loadImage(IMAGE_FILE);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  imageMode(CENTER);
  leafRainSound = new Audio("LeafRainSound.mp3");
  leafRainSound.loop = true;
  leafRainSound.preload = "auto";
  leafRainSound.volume = 0.72;
  makeFrogLayers();
}

function makeFrogLayers() {
  // 元画像を胴体（葉と親指を含む）と、2本の足に分ける。
  bodyLayer = maskedCopy([
    [0, 0], [1024, 0], [1024, 1010], [790, 1010], [720, 1215],
    [650, 1285], [515, 1300], [425, 1210], [365, 1060], [155, 1060], [0, 1010]
  ]);
  leftLegLayer = maskedCopy([
    [145, 795], [430, 795], [470, 1305], [260, 1325], [145, 1080]
  ]);
  rightLegLayer = maskedCopy([
    [345, 800], [675, 800], [690, 1305], [415, 1325]
  ]);
}

function maskedCopy(points) {
  const maskGraphic = createGraphics(frogImage.width, frogImage.height);
  maskGraphic.pixelDensity(1);
  maskGraphic.clear();
  maskGraphic.noStroke();
  maskGraphic.fill(255);
  maskGraphic.beginShape();
  for (const [x, y] of points) maskGraphic.vertex(x, y);
  maskGraphic.endShape(CLOSE);
  const layer = frogImage.get();
  layer.mask(maskGraphic.get());
  maskGraphic.remove();
  return layer;
}

function draw() {
  drawBackground();
  if (pressing) {
    updateWalking();
    makeRain();
  }

  const layout = frogLayout();
  updateRain(layout);
  drawFrog(layout);
  drawForegroundRain();
  if (!pressing && rain.length === 0) drawHint();
}

function drawBackground() {
  const ctx = drawingContext;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#9fc9d2");
  gradient.addColorStop(0.72, "#d7e8d4");
  gradient.addColorStop(1, "#90b882");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  noStroke();
  fill(255, 255, 255, 38);
  for (let x = 25; x < width; x += 95) ellipse(x, height * 0.88, 150, 35);
}

function frogLayout() {
  const scale = min(width / 1120, height / 1580) * 0.88;
  return {
    x: width * 0.5 + walkDistance,
    y: height * 0.53,
    scale,
    w: frogImage.width * scale,
    h: frogImage.height * scale
  };
}

function drawFrog(layout) {
  const walking = pressing ? sin(frameCount * 0.18) : 0;
  const bob = pressing ? abs(sin(frameCount * 0.18)) * 5 : 0;

  push();
  translate(layout.x, layout.y - bob);
  scale(layout.scale);

  drawLeg(leftLegLayer, -122, 315, walking * 0.055);
  drawLeg(rightLegLayer, 72, 315, -walking * 0.055);
  image(bodyLayer, 0, 0);
  pop();
}

function drawLeg(layer, pivotX, pivotY, angle) {
  push();
  translate(pivotX, pivotY);
  rotate(angle);
  translate(-pivotX, -pivotY);
  image(layer, 0, 0);
  pop();
}

function updateWalking() {
  walkDistance += 0.22 * walkDirection;
  const limit = min(width * 0.12, 90);
  if (abs(walkDistance) > limit) walkDirection *= -1;
}

function makeRain() {
  const amount = max(1, floor(width / 320));
  for (let i = 0; i < amount; i++) {
    rain.push({
      x: random(-20, width + 20), y: random(-50, -5),
      speed: random(10, 18), length: random(20, 38),
      hit: false, splash: 0, vx: 0
    });
  }
}

function updateRain(layout) {
  // 葉の上面を、元画像上の楕円として当たり判定する。
  const leafX = layout.x + 640 * layout.scale - layout.w / 2;
  const leafY = layout.y + 270 * layout.scale - layout.h / 2;
  const leafRx = 205 * layout.scale;
  const leafRy = 125 * layout.scale;

  for (let i = rain.length - 1; i >= 0; i--) {
    const d = rain[i];
    if (d.splash > 0) {
      d.splash--;
      if (d.splash <= 0) rain.splice(i, 1);
      continue;
    }
    d.y += d.speed;
    const nx = (d.x - leafX) / leafRx;
    const ny = (d.y - leafY) / leafRy;
    if (!d.hit && d.y < leafY + leafRy * 0.35 && nx * nx + ny * ny < 1) {
      d.hit = true;
      d.splash = 9;
      d.vx = random(-1, 1);
      playLeafDrop(d.x, width);
    } else if (d.y > height + 35) {
      rain.splice(i, 1);
    }
  }
}

function drawForegroundRain() {
  for (const d of rain) {
    if (d.splash > 0) {
      const age = 9 - d.splash;
      noFill();
      strokeWeight(3);
      stroke(225, 248, 255, d.splash * 22);
      arc(d.x, d.y, 8 + age * 5, 4 + age * 2, PI, TWO_PI);
    } else {
      strokeWeight(4);
      stroke(215, 244, 255, 180);
      line(d.x, d.y, d.x - 5, d.y - d.length);
    }
  }
}

function playLeafDrop() {
  if (!pressing || !leafRainSound || !leafRainSound.paused) return;
  leafRainSound.currentTime = 0;
  leafRainSound.play().catch(() => {});
}

function stopLeafRainSound() {
  if (!leafRainSound) return;
  leafRainSound.pause();
  leafRainSound.currentTime = 0;
}

function drawHint() {
  push();
  textAlign(CENTER, CENTER);
  textSize(constrain(width * 0.035, 16, 28));
  textStyle(BOLD);
  fill(20, 72, 71, 205);
  noStroke();
  text("☔ Tap to Start the Rain", width / 2, height - 42);
  pop();
}

function beginRain() {
  pressing = true;
  // クリック／タップのユーザー操作内で開始し、長押し中だけループする。
  if (leafRainSound && leafRainSound.paused) {
    leafRainSound.currentTime = 0;
    leafRainSound.play().catch(() => {});
  }
  return false;
}

function endRain() {
  pressing = false;
  stopLeafRainSound();
  return false;
}

function isSoundPictureControl(event) {
  return Boolean(event?.target?.closest?.(".home-button, .sound-button"));
}

function mousePressed(event) {
  return isSoundPictureControl(event) ? true : beginRain();
}

function mouseReleased(event) {
  return isSoundPictureControl(event) ? true : endRain();
}

function touchStarted(event) {
  return isSoundPictureControl(event) ? true : beginRain();
}

function touchEnded(event) {
  return isSoundPictureControl(event) ? true : endRain();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

window.addEventListener("blur", () => {
  pressing = false;
  stopLeafRainSound();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pressing = false;
    stopLeafRainSound();
  }
});

window.addEventListener("soundpicture:mutechange", (event) => {
  if (!leafRainSound) return;
  leafRainSound.muted = event.detail.muted;
  if (event.detail.muted) stopLeafRainSound();
});
