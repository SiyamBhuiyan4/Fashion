/**
 * The avatars' faces, drawn to a canvas and mapped onto a patch of the head.
 *
 * Anime faces are painted, not modelled: the eyes, brows and mouth are flat art on the front of
 * the skull, which is why they keep their shape from every angle the camera can reach here.
 */
import * as THREE from "three";
import type { Gender } from "@/lib/types";

const SIZE = 512;

interface FaceStyle {
  eyeWidth: number;
  eyeHeight: number;
  lashThickness: number;
  browThickness: number;
  browLift: number;
  mouthWidth: number;
  irisColor: string;
}

const STYLES: Record<Gender, FaceStyle> = {
  women: {
    eyeWidth: 118,
    eyeHeight: 96,
    lashThickness: 17,
    browThickness: 12,
    browLift: 78,
    mouthWidth: 44,
    irisColor: "#5a3b2a",
  },
  men: {
    eyeWidth: 112,
    eyeHeight: 74,
    lashThickness: 13,
    browThickness: 15,
    browLift: 68,
    mouthWidth: 54,
    irisColor: "#4a3526",
  },
};

function drawEye(
  context: CanvasRenderingContext2D,
  centreX: number,
  centreY: number,
  style: FaceStyle,
  flip: boolean,
): void {
  const { eyeWidth: w, eyeHeight: h } = style;
  context.save();
  context.translate(centreX, centreY);
  if (flip) context.scale(-1, 1);

  // White of the eye.
  context.beginPath();
  context.moveTo(-w / 2, 6);
  context.quadraticCurveTo(-w / 4, -h / 2, w / 2, -h / 4);
  context.quadraticCurveTo(w / 4, h / 2, -w / 2, 6);
  context.fillStyle = "#fbf8f5";
  context.fill();

  // Iris and pupil.
  context.save();
  context.beginPath();
  context.moveTo(-w / 2, 6);
  context.quadraticCurveTo(-w / 4, -h / 2, w / 2, -h / 4);
  context.quadraticCurveTo(w / 4, h / 2, -w / 2, 6);
  context.clip();
  const irisX = 2;
  const irisY = -h / 10;
  const gradient = context.createLinearGradient(irisX, irisY - h / 2, irisX, irisY + h / 2);
  gradient.addColorStop(0, "#241711");
  gradient.addColorStop(0.55, style.irisColor);
  gradient.addColorStop(1, "#9a6b45");
  context.fillStyle = gradient;
  context.beginPath();
  context.ellipse(irisX, irisY, w * 0.27, h * 0.42, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#17100c";
  context.beginPath();
  context.ellipse(irisX, irisY, w * 0.13, h * 0.24, 0, 0, Math.PI * 2);
  context.fill();
  // Catchlights.
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.ellipse(irisX - w * 0.12, irisY - h * 0.16, w * 0.07, h * 0.1, 0, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.7;
  context.beginPath();
  context.ellipse(irisX + w * 0.12, irisY + h * 0.16, w * 0.04, h * 0.06, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  // Upper lash line, heavier towards the outer corner.
  context.strokeStyle = "#17120f";
  context.lineCap = "round";
  context.lineWidth = style.lashThickness;
  context.beginPath();
  context.moveTo(-w / 2 - 2, 4);
  context.quadraticCurveTo(-w / 4, -h / 2 - 4, w / 2 + 3, -h / 4 - 2);
  context.stroke();

  // Lower lid, much lighter.
  context.lineWidth = Math.max(2, style.lashThickness * 0.3);
  context.globalAlpha = 0.65;
  context.beginPath();
  context.moveTo(-w / 2 + 6, 8);
  context.quadraticCurveTo(w / 6, h / 2 - 2, w / 2, -h / 4 + 2);
  context.stroke();
  context.globalAlpha = 1;

  context.restore();
}

function drawFace(context: CanvasRenderingContext2D, gender: Gender): void {
  const style = STYLES[gender];
  const centreX = SIZE / 2;
  const eyeY = SIZE * 0.42;
  const gap = SIZE * 0.16;

  drawEye(context, centreX - gap, eyeY, style, false);
  drawEye(context, centreX + gap, eyeY, style, true);

  // Brows.
  context.strokeStyle = "#241a17";
  context.lineCap = "round";
  context.lineWidth = style.browThickness;
  for (const side of [-1, 1]) {
    const x = centreX + side * gap;
    context.beginPath();
    context.moveTo(x - side * style.eyeWidth * 0.52, eyeY - style.browLift + 6);
    context.quadraticCurveTo(
      x - side * style.eyeWidth * 0.1,
      eyeY - style.browLift - 10,
      x + side * style.eyeWidth * 0.46,
      eyeY - style.browLift + 2,
    );
    context.stroke();
  }

  // Nose: a single soft stroke, as in the reference sheets.
  context.globalAlpha = 0.45;
  context.lineWidth = 5;
  context.strokeStyle = "#8d5f45";
  context.beginPath();
  context.moveTo(centreX + 6, eyeY + SIZE * 0.1);
  context.quadraticCurveTo(centreX + 14, eyeY + SIZE * 0.14, centreX - 2, eyeY + SIZE * 0.15);
  context.stroke();
  context.globalAlpha = 1;

  // Mouth.
  context.strokeStyle = "#8c4a44";
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(centreX - style.mouthWidth / 2, eyeY + SIZE * 0.235);
  context.quadraticCurveTo(
    centreX,
    eyeY + SIZE * 0.255,
    centreX + style.mouthWidth / 2,
    eyeY + SIZE * 0.233,
  );
  context.stroke();

  if (gender === "women") {
    // A hint of blush.
    for (const side of [-1, 1]) {
      const gradient = context.createRadialGradient(
        centreX + side * gap * 1.5,
        eyeY + SIZE * 0.1,
        2,
        centreX + side * gap * 1.5,
        eyeY + SIZE * 0.1,
        SIZE * 0.085,
      );
      gradient.addColorStop(0, "rgba(214,120,110,0.4)");
      gradient.addColorStop(1, "rgba(214,120,110,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, SIZE, SIZE);
    }
  }
}

/** The painted face, with a transparent background so it sits over the skin. */
export function faceTexture(gender: Gender): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (context) drawFace(context, gender);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
