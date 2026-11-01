"use strict";

/* =========================================
   M87* — INTERACTIVE LABORATORY
   Educational visualizations, not a full GR solver
   Same structure and visual style as Sagittarius A*
========================================= */

const $ = (id) => document.getElementById(id);

const PI = Math.PI;
const TWO_PI = PI * 2;

const SOLAR_MASS_KG = 1.98847e30;
const G = 6.67430e-11;
const C = 299792458;

const SOLAR_MASS_SCHWARZSCHILD_KM =
  2 * G * SOLAR_MASS_KG / (C * C) / 1000;

// Approximate M87* mass: 6.5 billion solar masses.
const DEFAULT_MASS_MILLIONS = 6500;


/* =========================================
   NAVIGATION — FIXED FOR M87 SIDEBAR
========================================= */

const navButtons = document.querySelectorAll(".sidebar .nav-btn");
const pages = document.querySelectorAll(".content .page");

navButtons.forEach(button => {
    button.addEventListener("click", () => {

        const target = button.dataset.target;

        // Remove active state from all buttons and pages
        navButtons.forEach(btn => btn.classList.remove("active"));
        pages.forEach(page => page.classList.remove("active"));

        // Activate selected button
        button.classList.add("active");

        // Show selected page
        const selectedPage = document.getElementById(target);

        if (selectedPage) {
            selectedPage.classList.add("active");
        }

        // Redraw visualizations after the page becomes visible
        requestAnimationFrame(() => {
            resizeAllCanvases();
        });

        // On mobile, bring the selected content into view
        if (window.innerWidth <= 760) {
            document.querySelector(".content").scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });
});


/* =========================================
   CANVAS HELPERS
========================================= */

const canvasIds = [
  "overviewCanvas",
  "structureCanvas",
  "spacetimeCanvas",
  "lightCanvas",
  "objectCanvas",
  "timeCanvas",
  "redshiftCanvas"
];

const canvases = {};

canvasIds.forEach(id => {
  const canvas = $(id);

  if (canvas) {
    canvases[id] = canvas;
  }
});

function prepareCanvas(canvas) {
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();

  if (rect.width < 1 || rect.height < 1) {
    return null;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const width = Math.round(rect.width * dpr);
  const height = Math.round(rect.height * dpr);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d");

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return {
    ctx,
    width: rect.width,
    height: rect.height
  };
}

function clearCanvas(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
}

function drawStarField(ctx, w, h, count = 65) {
  for (let i = 0; i < count; i++) {
    const x = ((i * 97.3) % 997) / 997 * w;
    const y = ((i * 173.7) % 991) / 991 * h;
    const radius = 0.5 + ((i * 7) % 10) / 10;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TWO_PI);

    ctx.fillStyle = i % 5 === 0
      ? "#91d9ff"
      : "#dce9ff";

    ctx.globalAlpha = 0.25 + ((i * 3) % 7) / 10;
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

/* =========================================
   BLACK HOLE VISUAL
========================================= */

function drawBlackHole(ctx, cx, cy, radius) {
  const glow = ctx.createRadialGradient(
    cx, cy, radius * 0.6,
    cx, cy, radius * 2.3
  );

  glow.addColorStop(0, "rgba(255,130,55,0.4)");
  glow.addColorStop(0.4, "rgba(255,120,45,0.13)");
  glow.addColorStop(1, "rgba(255,120,45,0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.3, 0, TWO_PI);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.15);

  ctx.beginPath();
  ctx.ellipse(
    0, 0,
    radius * 1.9,
    radius * 0.57,
    0, 0, TWO_PI
  );

  ctx.strokeStyle = "rgba(255,150,75,0.75)";
  ctx.lineWidth = radius * 0.19;
  ctx.shadowColor = "#ff853b";
  ctx.shadowBlur = 18;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    0, 0,
    radius * 1.45,
    radius * 0.43,
    0, PI, TWO_PI
  );

  ctx.strokeStyle = "#ffd3a0";
  ctx.lineWidth = Math.max(2, radius * 0.08);
  ctx.shadowBlur = 8;
  ctx.stroke();

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TWO_PI);

  ctx.fillStyle = "#000";
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 18;
  ctx.fill();

  ctx.shadowBlur = 0;
}

/* =========================================
   M87* RELATIVISTIC JET VISUAL
========================================= */

// The jet is drawn as plasma flowing along the black-hole
// rotation axis. It is not emitted from inside the horizon.

function drawJet(ctx, cx, cy, radius, scale = 1, time = 0) {
  const jetLength = radius * 4.2 * scale;
  const jetWidth = radius * 0.48 * scale;

  ctx.save();
  ctx.translate(cx, cy);

  // Upper jet
  const upperGradient = ctx.createLinearGradient(
    0, -radius * 0.5,
    0, -jetLength
  );

  upperGradient.addColorStop(0, "rgba(255,220,160,0.95)");
  upperGradient.addColorStop(0.25, "rgba(100,190,255,0.85)");
  upperGradient.addColorStop(1, "rgba(70,130,255,0)");

  ctx.beginPath();
  ctx.moveTo(-jetWidth * 0.25, -radius * 0.6);
  ctx.quadraticCurveTo(
    -jetWidth * 0.8,
    -jetLength * 0.5,
    -jetWidth * 0.1,
    -jetLength
  );

  ctx.quadraticCurveTo(
    jetWidth * 0.7,
    -jetLength * 0.5,
    jetWidth * 0.25,
    -radius * 0.6
  );

  ctx.closePath();
  ctx.fillStyle = upperGradient;
  ctx.shadowColor = "#63bfff";
  ctx.shadowBlur = 18;
  ctx.fill();

  // Lower, counter-directed jet
  const lowerGradient = ctx.createLinearGradient(
    0, radius * 0.5,
    0, jetLength
  );

  lowerGradient.addColorStop(0, "rgba(255,220,160,0.75)");
  lowerGradient.addColorStop(0.35, "rgba(100,190,255,0.55)");
  lowerGradient.addColorStop(1, "rgba(70,130,255,0)");

  ctx.beginPath();
  ctx.moveTo(-jetWidth * 0.25, radius * 0.6);
  ctx.quadraticCurveTo(
    -jetWidth * 0.8,
    jetLength * 0.5,
    -jetWidth * 0.1,
    jetLength
  );

  ctx.quadraticCurveTo(
    jetWidth * 0.7,
    jetLength * 0.5,
    jetWidth * 0.25,
    radius * 0.6
  );

  ctx.closePath();
  ctx.fillStyle = lowerGradient;
  ctx.shadowBlur = 12;
  ctx.fill();

  ctx.shadowBlur = 0;

  // Moving plasma particles
  for (let i = 0; i < 22; i++) {
    const progress = (i / 22 + time * 0.18) % 1;
    const y = -radius * 0.7 - progress * jetLength;
    const spread = jetWidth * (0.12 + progress * 0.4);

    const x = Math.sin(time * 2 + i) * spread;

    ctx.beginPath();
    ctx.arc(
      x,
      y,
      Math.max(1, radius * 0.035 * (1 - progress * 0.5)),
      0,
      TWO_PI
    );

    ctx.fillStyle = "#b9e8ff";
    ctx.globalAlpha = 0.85 * (1 - progress * 0.65);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawLabel(ctx, text, x, y, color = "#dceaff") {
  ctx.font = "12px Arial";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/* =========================================
   ANIMATION CONTROL
========================================= */

let animationRunning = true;
let animationFrame = 0;
let animationTime = 0;

const pauseBtn = $("pauseBtn");
const resetBtn = $("resetBtn");

if (pauseBtn) {
  pauseBtn.addEventListener("click", () => {
    animationRunning = !animationRunning;

    pauseBtn.textContent = animationRunning
      ? "Pause animation"
      : "Resume animation";
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    animationTime = 0;
    animationRunning = true;

    if (pauseBtn) {
      pauseBtn.textContent = "Pause animation";
    }
  });
}

/* =========================================
   01 — OVERVIEW ANIMATION
========================================= */

function drawOverview() {
  const setup = prepareCanvas(canvases.overviewCanvas);

  if (!setup) return;

  const { ctx, width: w, height: h } = setup;

  clearCanvas(ctx, w, h);
  drawStarField(ctx, w, h);

  const cx = w / 2;
  const cy = h / 2;

  const radius = Math.min(w, h) * 0.105;

  // Jet first, so the black hole and disc appear in front.
  drawJet(ctx, cx, cy, radius, 1.1, animationTime);

  // Accretion flow
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.2);

  for (let ring = 0; ring < 4; ring++) {
    const rx = radius * (1.7 + ring * 0.42);
    const ry = radius * (0.48 + ring * 0.12);

    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TWO_PI);

    ctx.strokeStyle =
      `rgba(255,${160 - ring * 20},${90 - ring * 10},${0.5 - ring * 0.08})`;

    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Animated accretion particles
  for (let i = 0; i < 45; i++) {
    const angle =
      animationTime * (0.6 + i * 0.002) + i * 0.31;

    const rx = radius * (1.7 + (i % 10) * 0.12);
    const ry = radius * (0.48 + (i % 10) * 0.04);

    const x = Math.cos(angle) * rx;
    const y = Math.sin(angle) * ry;

    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 3) * 0.5, 0, TWO_PI);

    ctx.fillStyle = i % 2
      ? "#ffbc79"
      : "#fff0cb";

    ctx.fill();
  }

  ctx.restore();

  drawBlackHole(ctx, cx, cy, radius);

  drawLabel(
    ctx,
    "RELATIVISTIC JET",
    cx + radius * 1.3,
    cy - radius * 3.2,
    "#6acbff"
  );

  drawLabel(
    ctx,
    "ACCRETION FLOW",
    cx + radius * 2,
    cy - radius * 1.1,
    "#ffb47a"
  );

  drawLabel(
    ctx,
    "BLACK-HOLE SHADOW",
    cx - radius * 1.2,
    cy + radius * 2.2
  );
}

/* =========================================
   02 — STRUCTURE DIAGRAM
========================================= */

function drawStructure() {
  const setup = prepareCanvas(canvases.structureCanvas);

  if (!setup) return;

  const { ctx, width: w, height: h } = setup;

  clearCanvas(ctx, w, h);
  drawStarField(ctx, w, h, 45);

  const cx = w * 0.48;
  const cy = h * 0.54;
  const r = Math.min(w, h) * 0.095;

  // Relativistic jet
  drawJet(ctx, cx, cy, r, 0.75, animationTime);

  // Accretion disc
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.2);

  ctx.beginPath();
  ctx.ellipse(0, 0, r * 3.1, r * 0.95, 0, 0, TWO_PI);

  ctx.strokeStyle = "#d77a43";
  ctx.lineWidth = 12;
  ctx.globalAlpha = 0.7;
  ctx.stroke();

  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.ellipse(0, 0, r * 2.5, r * 0.75, 0, 0, TWO_PI);

  ctx.strokeStyle = "#ffd09b";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  // Conceptual radial boundaries
  [r, r * 1.5, r * 2.5].forEach((rad, index) => {
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, TWO_PI);

    ctx.strokeStyle = [
      "#ff9d61",
      "#6acbff",
      "#ffcb84"
    ][index];

    ctx.lineWidth = 1.5;
    ctx.setLineDash(index === 2 ? [5, 5] : []);
    ctx.stroke();
  });

  ctx.setLineDash([]);

  drawBlackHole(ctx, cx, cy, r);

  drawLabel(
    ctx,
    "EVENT HORIZON",
    cx + r + 10,
    cy - 15,
    "#ff9d61"
  );

  drawLabel(
    ctx,
    "PHOTON SPHERE",
    cx + r * 1.5 + 12,
    cy + 15,
    "#6acbff"
  );

  drawLabel(
    ctx,
    "ACCRETION DISC",
    cx + r * 2.2,
    cy - r * 0.9,
    "#ffd09b"
  );

  drawLabel(
    ctx,
    "RELATIVISTIC JET",
    cx + 12,
    cy - r * 3.1,
    "#6acbff"
  );

  drawLabel(
    ctx,
    "SINGULARITY",
    cx - 30,
    cy + 5,
    "#ffffff"
  );
}

/* =========================================
   03 — SPACETIME GRID
========================================= */

function drawSpacetime() {
  const setup = prepareCanvas(canvases.spacetimeCanvas);

  if (!setup) return;

  const { ctx, width: w, height: h } = setup;

  clearCanvas(ctx, w, h);

  const cx = w / 2;
  const cy = h * 0.47;
  const depth = Math.min(w, h) * 0.35;

  function project(x, y) {
    const radius = Math.sqrt(x * x + y * y);

    const distortion =
      1 + 1.5 * Math.exp(-radius * radius / 1.8);

    return {
      x: cx + x * depth * 0.8,
      y: cy + y * depth * 0.36 / distortion
    };
  }

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(106,203,255,0.42)";

  for (let row = -7; row <= 7; row++) {
    ctx.beginPath();

    for (let step = 0; step <= 100; step++) {
      const x = -4 + step * 0.08;
      const y = row * 0.45;

      const p = project(x, y);

      if (step === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }

    ctx.stroke();
  }

  for (let col = -7; col <= 7; col++) {
    ctx.beginPath();

    for (let step = 0; step <= 100; step++) {
      const y = -4 + step * 0.08;
      const x = col * 0.45;

      const p = project(x, y);

      if (step === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }

    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(
    cx, cy, 5,
    cx, cy, 90
  );

  glow.addColorStop(0, "#000");
  glow.addColorStop(0.5, "#ff9d61");
  glow.addColorStop(1, "transparent");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 90, 0, TWO_PI);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 23, 0, TWO_PI);
  ctx.fillStyle = "#000";
  ctx.fill();

  drawLabel(
    ctx,
    "M87* — MASSIVE BLACK HOLE",
    cx + 35,
    cy - 35,
    "#ffb47a"
  );

  drawLabel(
    ctx,
    "CURVED SPACETIME GRID",
    15,
    h - 20,
    "#6acbff"
  );
}

/* =========================================
   04 — LIGHT PATH VISUALIZATION
========================================= */

function drawLight() {
  const setup = prepareCanvas(canvases.lightCanvas);

  if (!setup) return;

  const { ctx, width: w, height: h } = setup;

  clearCanvas(ctx, w, h);
  drawStarField(ctx, w, h, 40);

  const cx = w * 0.5;
  const cy = h * 0.55;
  const r = Math.min(w, h) * 0.11;

  drawBlackHole(ctx, cx, cy, r);

  const slider = $("impactSlider");

  if (!slider) return;

  const distance = Number(slider.value);

  const closest = r * distance / 4;

  const bend = Math.max(
    0.15,
    Math.min(1.5, 2.4 / distance)
  );

  const startX = 18;
  const endX = w - 18;
  const y = cy - closest;

  ctx.beginPath();
  ctx.moveTo(startX, y);

  ctx.quadraticCurveTo(
    cx - 60,
    y + bend * r * 2,
    cx + 15,
    y + bend * r * 1.6
  );

  ctx.quadraticCurveTo(
    cx + 100,
    y + bend * r * 0.2,
    endX,
    y - bend * r * 0.7
  );

  ctx.strokeStyle = "#72d4ff";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#72d4ff";
  ctx.shadowBlur = 12;
  ctx.stroke();

  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(startX, y, 5, 0, TWO_PI);

  ctx.fillStyle = "#fff";
  ctx.fill();

  drawLabel(
    ctx,
    "INCOMING LIGHT",
    startX + 5,
    y - 12,
    "#6acbff"
  );

  drawLabel(
    ctx,
    "DEFLECTED LIGHT",
    endX - 120,
    y - bend * r * 0.7 - 12,
    "#6acbff"
  );

  drawLabel(
    ctx,
    "BLACK-HOLE SHADOW",
    cx - 65,
    cy + r * 1.8
  );
}

/* =========================================
   05 — OBJECT EXPERIMENT VISUAL
========================================= */

function drawObject() {
  const setup = prepareCanvas(canvases.objectCanvas);

  if (!setup) return;

  const { ctx, width: w, height: h } = setup;

  clearCanvas(ctx, w, h);
  drawStarField(ctx, w, h, 35);

  const cx = w * 0.5;
  const cy = h * 0.53;
  const r = Math.min(w, h) * 0.1;

  drawBlackHole(ctx, cx, cy, r);

  const distanceSlider = $("objectDistance");

  if (!distanceSlider) return;

  const distance = Number(distanceSlider.value);

  const orbitR = r * Math.max(1.3, distance / 4);

  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy,
    orbitR * 1.4,
    orbitR * 0.58,
    -0.15,
    0,
    TWO_PI
  );

  ctx.strokeStyle = "rgba(106,203,255,0.65)";
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  const angle = animationTime * 0.5;

  const ox = cx + Math.cos(angle) * orbitR * 1.4;
  const oy = cy + Math.sin(angle) * orbitR * 0.58;

  ctx.beginPath();
  ctx.arc(ox, oy, 7, 0, TWO_PI);

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#6acbff";
  ctx.shadowBlur = 12;
  ctx.fill();

  ctx.shadowBlur = 0;

  drawLabel(ctx, "OBJECT", ox + 12, oy - 10);

  drawLabel(
    ctx,
    "ILLUSTRATIVE ORBIT",
    cx - 75,
    cy + orbitR * 0.7 + 22,
    "#6acbff"
  );
}

/* =========================================
   06 — TIME DILATION CLOCKS
========================================= */

function drawClock(ctx, cx, cy, radius, angle, label, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TWO_PI);

  ctx.fillStyle = "#111c30";
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  for (let i = 0; i < 12; i++) {
    const a = i * TWO_PI / 12;

    const x1 = cx + Math.cos(a) * radius * 0.8;
    const y1 = cy + Math.sin(a) * radius * 0.8;

    const x2 = cx + Math.cos(a) * radius * 0.91;
    const y2 = cy + Math.sin(a) * radius * 0.91;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    ctx.strokeStyle = "#dceaff";
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(cx, cy);

  ctx.lineTo(
    cx + Math.cos(angle) * radius * 0.65,
    cy + Math.sin(angle) * radius * 0.65
  );

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, TWO_PI);
  ctx.fill();

  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#dceaff";
  ctx.fillText(label, cx, cy + radius + 25);

  ctx.textAlign = "left";
}

function drawTime() {
  const setup = prepareCanvas(canvases.timeCanvas);

  if (!setup) return;

  const { ctx, width: w, height: h } = setup;

  clearCanvas(ctx, w, h);

  const slider = $("timeSlider");

  if (!slider) return;

  const distance = Number(slider.value);

  const ratio = Math.sqrt(1 - 1 / distance);

  const cx1 = w * 0.27;
  const cx2 = w * 0.73;
  const cy = h * 0.45;

  const radius = Math.min(w, h) * 0.16;

  drawClock(
    ctx,
    cx1,
    cy,
    radius,
    animationTime,
    "DISTANT CLOCK",
    "#6acbff"
  );

  drawClock(
    ctx,
    cx2,
    cy,
    radius,
    animationTime * ratio,
    "NEAR BLACK HOLE",
    "#ff9d61"
  );

  drawLabel(
    ctx,
    "REFERENCE CLOCK",
    cx1 - 40,
    25,
    "#6acbff"
  );

  drawLabel(
    ctx,
    "SLOWER RELATIVE CLOCK",
    cx2 - 50,
    25,
    "#ff9d61"
  );
}

/* =========================================
   07 — REDSHIFT WAVE VISUAL
========================================= */

function drawRedshift() {
  const setup = prepareCanvas(canvases.redshiftCanvas);

  if (!setup) return;

  const { ctx, width: w, height: h } = setup;

  clearCanvas(ctx, w, h);

  const slider = $("redshiftSlider");

  if (!slider) return;

  const distance = Number(slider.value);

  const ratio = Math.sqrt(1 - 1 / distance);

  const mid = h * 0.5;

  function wave(x, wavelength, amplitude, color) {
    ctx.beginPath();

    for (let i = 0; i <= 400; i++) {
      const px = x + i * (w - 2 * x) / 400;

      const py =
        mid +
        Math.sin((px - x) / wavelength * TWO_PI) * amplitude;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  wave(20, 24, 24, "#ff9d61");

  wave(
    20,
    Math.max(25, 24 / Math.max(ratio, 0.1)),
    24,
    "#6acbff"
  );

  drawLabel(ctx, "EMITTED LIGHT", 20, 35, "#ff9d61");

  drawLabel(
    ctx,
    "OBSERVED LIGHT",
    20,
    h - 20,
    "#6acbff"
  );
}

/* =========================================
   SCHWARZSCHILD MASS CALCULATOR
========================================= */

const massSlider = $("massSlider");

function updateMass() {
  if (!massSlider) return;

  const massMillions = Number(massSlider.value);

  const radiusKm =
    SOLAR_MASS_SCHWARZSCHILD_KM *
    massMillions *
    1e6;

  const massOutput = $("massValue");
  const radiusOutput = $("radiusValue");

  if (massOutput) {
    massOutput.textContent =
      massMillions.toFixed(1) + " million Suns";
  }

  if (radiusOutput) {
    radiusOutput.textContent =
      (radiusKm / 1e9).toFixed(2) + " billion km";
  }
}

if (massSlider) {
  massSlider.addEventListener("input", updateMass);
  updateMass();
}

/* =========================================
   LIGHT PATH EXPERIMENT
========================================= */

function updateLightExperiment() {
  const slider = $("impactSlider");

  if (!slider) return;

  const d = Number(slider.value);

  const impactValue = $("impactValue");
  const lightResult = $("lightResult");

  if (impactValue) {
    impactValue.textContent = d.toFixed(1) + " Rs";
  }

  let result;

  if (d <= 1.5) {
    result = "Extremely close to the photon region";
  } else if (d <= 2.6) {
    result = "Very strong gravitational bending";
  } else if (d <= 5) {
    result = "Strong gravitational bending";
  } else {
    result = "Relatively weaker bending";
  }

  if (lightResult) {
    lightResult.textContent = result;
  }

  drawLight();
}

const impactSlider = $("impactSlider");

if (impactSlider) {
  impactSlider.addEventListener("input", updateLightExperiment);
}

/* =========================================
   OBJECT EXPERIMENT
========================================= */

function updateObjectExperiment() {
  const distanceSlider = $("objectDistance");
  const speedSlider = $("objectSpeed");
  const typeSelect = $("objectType");

  if (!distanceSlider || !speedSlider || !typeSelect) {
    return;
  }

  const d = Number(distanceSlider.value);
  const v = Number(speedSlider.value);
  const type = typeSelect.value;

  const distanceOutput = $("objectDistanceValue");
  const speedOutput = $("objectSpeedValue");

  if (distanceOutput) {
    distanceOutput.textContent = d.toFixed(1) + " Rs";
  }

  if (speedOutput) {
    speedOutput.textContent = v + "%";
  }

  let title = "";
  let explanation = "";

  if (d <= 1) {
    title = "Inside the event horizon";

    explanation =
      "No outward signal can escape to distant observers.";
  } else if (d <= 1.5) {
    title = "Near the photon sphere";

    explanation =
      "This region is important for light propagation. Massive objects cannot follow photon-like circular orbits.";
  } else if (d < 3) {
    title = "Very close to the black hole";

    explanation =
      "A simple circular-orbit interpretation is not appropriate here. Strong-field dynamics are important.";
  } else if (d < 6) {
    title = "Near the innermost stable orbit";

    explanation =
      "For a Schwarzschild black hole, the ISCO is at 3 Rs. Circular orbits inside it are not stable.";
  } else {
    title = "Possible orbital region";

    explanation =
      "Stable circular orbits are possible at these larger radii if the velocity and angular momentum are suitable.";
  }

  if (v === 0) {
    explanation +=
      " With zero tangential speed, the object is not in a circular orbit.";
  } else if (v > 80) {
    explanation +=
      " The selected speed is highly relativistic.";
  }

  if (type === "gas") {
    explanation +=
      " Gas can interact, heat up and lose angular momentum through processes not represented here.";
  } else if (type === "spacecraft") {
    explanation +=
      " A spacecraft would need a carefully planned trajectory to remain in orbit.";
  } else if (type === "star") {
    explanation +=
      " Real stellar orbits are studied through their position and velocity over time.";
  }

  const result = $("objectResult");
  const explanationOutput = $("objectExplanation");

  if (result) {
    result.textContent = title;
  }

  if (explanationOutput) {
    explanationOutput.textContent = explanation;
  }

  drawObject();
}

["objectDistance", "objectSpeed", "objectType"].forEach(id => {
  const element = $(id);

  if (element) {
    element.addEventListener("input", updateObjectExperiment);
    element.addEventListener("change", updateObjectExperiment);
  }
});

/* =========================================
   TIME DILATION CALCULATOR
========================================= */

function updateTimeExperiment() {
  const slider = $("timeSlider");

  if (!slider) return;

  const r = Number(slider.value);

  const ratio = Math.sqrt(1 - 1 / r);

  const distanceOutput = $("timeDistance");
  const rateOutput = $("clockRate");
  const explanationOutput = $("clockExplanation");

  if (distanceOutput) {
    distanceOutput.textContent = r.toFixed(2) + " Rs";
  }

  if (rateOutput) {
    rateOutput.textContent = ratio.toFixed(4);
  }

  if (explanationOutput) {
    explanationOutput.textContent =
      "A stationary clock at this radius accumulates " +
      ratio.toFixed(4) +
      " seconds for every second of Schwarzschild coordinate time at infinity.";
  }

  drawTime();
}

const timeSlider = $("timeSlider");

if (timeSlider) {
  timeSlider.addEventListener("input", updateTimeExperiment);
}

/* =========================================
   GRAVITATIONAL REDSHIFT CALCULATOR
========================================= */

function updateRedshiftExperiment() {
  const slider = $("redshiftSlider");

  if (!slider) return;

  const r = Number(slider.value);

  const ratio = Math.sqrt(1 - 1 / r);

  const distanceOutput = $("redshiftDistance");
  const frequencyOutput = $("frequencyRatio");
  const explanationOutput = $("redshiftExplanation");

  if (distanceOutput) {
    distanceOutput.textContent = r.toFixed(2) + " Rs";
  }

  if (frequencyOutput) {
    frequencyOutput.textContent = ratio.toFixed(4);
  }

  if (explanationOutput) {
    explanationOutput.textContent =
      "The distant observer measures about " +
      (ratio * 100).toFixed(2) +
      "% of the emitted frequency for this idealized stationary-emitter case.";
  }

  drawRedshift();
}

const redshiftSlider = $("redshiftSlider");

if (redshiftSlider) {
  redshiftSlider.addEventListener("input", updateRedshiftExperiment);
}

/* =========================================
   CANVAS RESIZING
========================================= */

function resizeAllCanvases() {
  drawOverview();
  drawStructure();
  drawSpacetime();
  drawLight();
  drawObject();
  drawTime();
  drawRedshift();
}

window.addEventListener("resize", resizeAllCanvases);

/* =========================================
   MAIN ANIMATION LOOP
========================================= */

function animate() {
  if (animationRunning) {
    animationTime += 0.025;
  }

  drawOverview();
  drawObject();
  drawTime();

  animationFrame = requestAnimationFrame(animate);
}

/* =========================================
   INITIALIZE
========================================= */

updateLightExperiment();
updateObjectExperiment();
updateTimeExperiment();
updateRedshiftExperiment();
updateMass();

requestAnimationFrame(() => {
  resizeAllCanvases();
  animate();
});