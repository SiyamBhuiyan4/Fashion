/**
 * The avatars' faces, drawn to a high-resolution canvas and mapped onto a patch of the head.
 *
 * Faithfully matches the anime character reference turnaround sheets:
 * - Men: Crisp anime eyes with multi-stage iris gradients, defined brows, subtle jaw stubble, confident smirk.
 * - Women: Large expressive anime eyes with layered highlights, winged lash line, delicate brows, soft cheek blush, gentle smile.
 */
import * as THREE from "three";
import type { Gender } from "@/lib/types";

const SIZE = 1024;

interface FaceStyle {
  eyeWidth: number;
  eyeHeight: number;
  lashThickness: number;
  browThickness: number;
  browLift: number;
  mouthWidth: number;
  irisColorTop: string;
  irisColorMid: string;
  irisColorBottom: string;
}

const STYLES: Record<Gender, FaceStyle> = {
  women: {
    eyeWidth: 242,
    eyeHeight: 198,
    lashThickness: 34,
    browThickness: 20,
    browLift: 156,
    mouthWidth: 92,
    irisColorTop: "#1c110b",
    irisColorMid: "#5a3622",
    irisColorBottom: "#a86b40",
  },
  men: {
    eyeWidth: 232,
    eyeHeight: 154,
    lashThickness: 28,
    browThickness: 28,
    browLift: 136,
    mouthWidth: 110,
    irisColorTop: "#170f0b",
    irisColorMid: "#472c1c",
    irisColorBottom: "#8b5832",
  },
};

function drawEye(
  context: CanvasRenderingContext2D,
  centreX: number,
  centreY: number,
  style: FaceStyle,
  flip: boolean,
  isFemale: boolean,
): void {
  const { eyeWidth: w, eyeHeight: h } = style;
  context.save();
  context.translate(centreX, centreY);
  if (flip) context.scale(-1, 1);

  // Sclera (eye white) with subtle upper shadow
  context.beginPath();
  context.moveTo(-w / 2, 10);
  context.quadraticCurveTo(-w * 0.22, -h * 0.52, w / 2, -h * 0.24);
  context.quadraticCurveTo(w * 0.22, h * 0.48, -w / 2, 10);
  context.closePath();
  context.fillStyle = "#faf6f0";
  context.fill();

  // Upper shadow inside eye socket
  const eyeShadow = context.createLinearGradient(0, -h * 0.5, 0, 0);
  eyeShadow.addColorStop(0, "rgba(70, 50, 42, 0.22)");
  eyeShadow.addColorStop(1, "rgba(70, 50, 42, 0)");
  context.fillStyle = eyeShadow;
  context.fill();

  // Iris clipping container
  context.save();
  context.beginPath();
  context.moveTo(-w / 2, 10);
  context.quadraticCurveTo(-w * 0.22, -h * 0.52, w / 2, -h * 0.24);
  context.quadraticCurveTo(w * 0.22, h * 0.48, -w / 2, 10);
  context.closePath();
  context.clip();

  const irisX = 4;
  const irisY = -h * 0.08;
  const irisRx = w * 0.285;
  const irisRy = h * 0.44;

  // Multi-stage iris gradient
  const irisGrad = context.createLinearGradient(irisX, irisY - irisRy, irisX, irisY + irisRy);
  irisGrad.addColorStop(0, style.irisColorTop);
  irisGrad.addColorStop(0.5, style.irisColorMid);
  irisGrad.addColorStop(0.85, style.irisColorBottom);
  irisGrad.addColorStop(1, "#c88a55");

  context.fillStyle = irisGrad;
  context.beginPath();
  context.ellipse(irisX, irisY, irisRx, irisRy, 0, 0, Math.PI * 2);
  context.fill();

  // Dark iris ring border
  context.lineWidth = 4;
  context.strokeStyle = "#120b08";
  context.stroke();

  // Inner pupil
  const pupilGrad = context.createRadialGradient(irisX, irisY - 4, 2, irisX, irisY, irisRy * 0.55);
  pupilGrad.addColorStop(0, "#080504");
  pupilGrad.addColorStop(0.9, "#160e0a");
  pupilGrad.addColorStop(1, "rgba(22, 14, 10, 0)");
  context.fillStyle = pupilGrad;
  context.beginPath();
  context.ellipse(irisX, irisY - 2, irisRx * 0.46, irisRy * 0.58, 0, 0, Math.PI * 2);
  context.fill();

  // Bottom crescent glow (anime reflective ambient light)
  const glowGrad = context.createRadialGradient(
    irisX,
    irisY + irisRy * 0.65,
    2,
    irisX,
    irisY + irisRy * 0.6,
    irisRx * 0.7,
  );
  glowGrad.addColorStop(0, "rgba(235, 175, 115, 0.45)");
  glowGrad.addColorStop(1, "rgba(235, 175, 115, 0)");
  context.fillStyle = glowGrad;
  context.beginPath();
  context.ellipse(irisX, irisY + irisRy * 0.48, irisRx * 0.72, irisRy * 0.32, 0, 0, Math.PI * 2);
  context.fill();

  // Primary Catchlight (upper-left bright highlight)
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.ellipse(
    irisX - irisRx * 0.38,
    irisY - irisRy * 0.36,
    irisRx * 0.28,
    irisRy * 0.24,
    -0.2,
    0,
    Math.PI * 2,
  );
  context.fill();

  // Secondary Catchlight (lower-right soft specular reflection)
  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.beginPath();
  context.ellipse(
    irisX + irisRx * 0.38,
    irisY + irisRy * 0.32,
    irisRx * 0.16,
    irisRy * 0.14,
    0.2,
    0,
    Math.PI * 2,
  );
  context.fill();

  // Small tertiary shimmer for female eyes
  if (isFemale) {
    context.fillStyle = "rgba(255, 255, 255, 0.7)";
    context.beginPath();
    context.arc(irisX - irisRx * 0.15, irisY + irisRy * 0.45, irisRx * 0.08, 0, Math.PI * 2);
    context.fill();
  }

  context.restore(); // end iris clip

  // Upper eyelid fold (crease line)
  context.strokeStyle = "rgba(55, 38, 30, 0.45)";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-w * 0.38, -h * 0.48);
  context.quadraticCurveTo(0, -h * 0.66, w * 0.38, -h * 0.44);
  context.stroke();

  // Main upper lash line - heavier and tapered towards the outer corner
  context.strokeStyle = "#140f0d";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = style.lashThickness;
  context.beginPath();
  context.moveTo(-w / 2 - 4, 10);
  context.quadraticCurveTo(-w * 0.22, -h * 0.52 - 8, w / 2 + 8, -h * 0.26 - 4);
  context.stroke();

  // Outer corner wing flick
  context.lineWidth = style.lashThickness * 0.75;
  context.beginPath();
  context.moveTo(w / 2 + 2, -h * 0.26 - 4);
  context.lineTo(w / 2 + (isFemale ? 20 : 14), -h * 0.26 - (isFemale ? 14 : 8));
  context.stroke();

  // Delicate lower lash line
  context.strokeStyle = "rgba(26, 18, 14, 0.75)";
  context.lineWidth = Math.max(4, style.lashThickness * 0.24);
  context.beginPath();
  context.moveTo(-w * 0.36, 16);
  context.quadraticCurveTo(w * 0.12, h * 0.5, w / 2 - 2, -h * 0.18);
  context.stroke();

  context.restore();
}

function drawFace(context: CanvasRenderingContext2D, gender: Gender): void {
  const isFemale = gender === "women";
  const style = STYLES[gender];
  const centreX = SIZE / 2;
  const eyeY = SIZE * 0.42;
  const gap = SIZE * 0.165;

  // Eyes
  drawEye(context, centreX - gap, eyeY, style, false, isFemale);
  drawEye(context, centreX + gap, eyeY, style, true, isFemale);

  // Eyebrows
  context.strokeStyle = "#1b1411";
  context.lineCap = "round";
  context.lineWidth = style.browThickness;
  for (const side of [-1, 1]) {
    const x = centreX + side * gap;
    context.beginPath();
    if (isFemale) {
      // Soft graceful arch
      context.moveTo(x - side * style.eyeWidth * 0.54, eyeY - style.browLift + 12);
      context.quadraticCurveTo(
        x - side * style.eyeWidth * 0.08,
        eyeY - style.browLift - 18,
        x + side * style.eyeWidth * 0.48,
        eyeY - style.browLift + 4,
      );
    } else {
      // Masculine, determined angle
      context.moveTo(x - side * style.eyeWidth * 0.56, eyeY - style.browLift + 16);
      context.quadraticCurveTo(
        x - side * style.eyeWidth * 0.12,
        eyeY - style.browLift - 12,
        x + side * style.eyeWidth * 0.52,
        eyeY - style.browLift - 2,
      );
    }
    context.stroke();
  }

  // Nose: anime bridge highlight & shaded nostril contour
  const noseY = eyeY + SIZE * 0.11;
  context.strokeStyle = "#7c4e38";
  context.lineWidth = 7;
  context.lineCap = "round";
  context.globalAlpha = 0.55;
  context.beginPath();
  context.moveTo(centreX + 10, noseY - 24);
  context.quadraticCurveTo(centreX + 16, noseY, centreX + 2, noseY + 6);
  context.quadraticCurveTo(centreX - 10, noseY + 8, centreX - 16, noseY + 4);
  context.stroke();
  context.globalAlpha = 1;

  // Mouth
  const mouthY = eyeY + SIZE * 0.235;
  context.strokeStyle = isFemale ? "#9b4545" : "#723d37";
  context.lineWidth = isFemale ? 9 : 11;
  context.lineCap = "round";
  context.beginPath();

  if (isFemale) {
    // Soft sweet smile with subtle lip gloss highlight
    context.moveTo(centreX - style.mouthWidth * 0.5, mouthY);
    context.quadraticCurveTo(centreX, mouthY + 22, centreX + style.mouthWidth * 0.5, mouthY);
    context.stroke();

    // Soft coral pink lip tint
    context.fillStyle = "rgba(224, 110, 105, 0.28)";
    context.beginPath();
    context.ellipse(centreX, mouthY + 8, style.mouthWidth * 0.38, 10, 0, 0, Math.PI * 2);
    context.fill();

    // Under-lip depth shadow
    context.strokeStyle = "rgba(120, 55, 48, 0.4)";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(centreX - 16, mouthY + 24);
    context.quadraticCurveTo(centreX, mouthY + 28, centreX + 16, mouthY + 24);
    context.stroke();
  } else {
    // Confident anime smirk (slightly higher on one side)
    context.moveTo(centreX - style.mouthWidth * 0.52, mouthY - 4);
    context.quadraticCurveTo(
      centreX - 6,
      mouthY + 12,
      centreX + style.mouthWidth * 0.48,
      mouthY - 2,
    );
    context.stroke();

    // Under-lip shadow defining the handsome masculine chin
    context.strokeStyle = "rgba(80, 48, 40, 0.48)";
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(centreX - 22, mouthY + 24);
    context.quadraticCurveTo(centreX, mouthY + 28, centreX + 20, mouthY + 24);
    context.stroke();
  }

  // Cheek blush or stubble
  if (isFemale) {
    // Beautiful anime radial blush on cheekbones
    for (const side of [-1, 1]) {
      const blushX = centreX + side * gap * 1.45;
      const blushY = eyeY + SIZE * 0.085;
      const blushGrad = context.createRadialGradient(
        blushX,
        blushY,
        4,
        blushX,
        blushY,
        SIZE * 0.095,
      );
      blushGrad.addColorStop(0, "rgba(235, 115, 110, 0.42)");
      blushGrad.addColorStop(0.65, "rgba(235, 115, 110, 0.16)");
      blushGrad.addColorStop(1, "rgba(235, 115, 110, 0)");
      context.fillStyle = blushGrad;
      context.beginPath();
      context.arc(blushX, blushY, SIZE * 0.095, 0, Math.PI * 2);
      context.fill();

      // Stylized diagonal blush tick lines
      context.strokeStyle = "rgba(215, 80, 75, 0.5)";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(blushX - 18, blushY - 8);
      context.lineTo(blushX - 6, blushY + 12);
      context.moveTo(blushX - 2, blushY - 8);
      context.lineTo(blushX + 10, blushY + 12);
      context.moveTo(blushX + 14, blushY - 8);
      context.lineTo(blushX + 26, blushY + 12);
      context.stroke();
    }
  } else {
    // Subtle 5-o'clock shadow along the jaw and chin (matching Image 0)
    const jawY = mouthY + SIZE * 0.08;
    const stubbleGrad = context.createRadialGradient(
      centreX,
      jawY + 20,
      10,
      centreX,
      jawY + 10,
      SIZE * 0.18,
    );
    stubbleGrad.addColorStop(0, "rgba(65, 52, 45, 0.32)");
    stubbleGrad.addColorStop(0.7, "rgba(65, 52, 45, 0.14)");
    stubbleGrad.addColorStop(1, "rgba(65, 52, 45, 0)");
    context.fillStyle = stubbleGrad;
    context.beginPath();
    context.ellipse(centreX, jawY + 18, SIZE * 0.17, SIZE * 0.11, 0, 0, Math.PI * 2);
    context.fill();

    // Fine stipple texture for realistic stubble
    context.fillStyle = "rgba(45, 36, 30, 0.28)";
    for (let i = -16; i <= 16; i += 2) {
      for (let j = 0; j <= 8; j += 2) {
        const sx = centreX + i * 8 + (j % 4) * 3;
        const sy = jawY + j * 9;
        const distFromCentre = Math.hypot(
          (sx - centreX) / (SIZE * 0.16),
          (sy - (jawY + 18)) / (SIZE * 0.1),
        );
        if (distFromCentre < 0.95 && Math.random() > 0.35) {
          context.beginPath();
          context.arc(sx, sy, 1.8, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }
}

/** The painted face, with a transparent background so it sits over the skin. */
export function faceTexture(gender: Gender): THREE.Texture {
  if (typeof document === "undefined") {
    const data = new Uint8Array([255, 255, 255, 0]);
    const texture = new THREE.DataTexture(data, 1, 1);
    texture.needsUpdate = true;
    return texture;
  }
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (context) drawFace(context, gender);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
