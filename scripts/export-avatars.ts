/**
 * Exports rigged 3D models for Boy and Girl avatars to permanent offline GLB files
 * under public/models/avatars/boy.glb and public/models/avatars/girl.glb.
 */
import { buildFigure } from "../lib/three/figure";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import * as THREE from "three";
import fs from "node:fs";
import path from "node:path";

if (typeof FileReader === "undefined") {
  (globalThis as unknown as { FileReader: unknown }).FileReader = class FileReader {
    result: ArrayBuffer | null = null;
    onload: ((event: { target: FileReader }) => void) | null = null;
    onloadend: ((event: { target: FileReader }) => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
  };
}

async function exportAvatarToGLB(gender: "men" | "women", filenames: string[]) {
  const figure = buildFigure(gender, gender === "women" ? "#f3d5c0" : "#c99268");

  // Prepare standard materials for broad GLTF viewer compatibility
  figure.root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      if (mesh.name === "face" || mesh.name.includes("Outline")) {
        mesh.visible = false;
      } else if (mesh.material) {
        const orig = mesh.material as THREE.Material & { color?: THREE.Color };
        mesh.material = new THREE.MeshStandardMaterial({
          color: orig.color ? orig.color.clone() : new THREE.Color(0xd4b896),
          roughness: 0.65,
          metalness: 0.05,
        });
      }
    }
  });

  const exporter = new GLTFExporter();
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    exporter.parse(
      figure.root,
      (gltf) => {
        resolve(Buffer.from(gltf as ArrayBuffer));
      },
      (err) => reject(err),
      { binary: true },
    );
  });

  const outDir = path.resolve(process.cwd(), "public/models/avatars");
  fs.mkdirSync(outDir, { recursive: true });

  for (const filename of filenames) {
    const dest = path.join(outDir, filename);
    fs.writeFileSync(dest, buffer);
    console.log(`Saved ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }
}

async function main() {
  console.log("Generating 3D Boy model...");
  await exportAvatarToGLB("men", ["boy.glb", "men.glb"]);

  console.log("Generating 3D Girl model...");
  await exportAvatarToGLB("women", ["girl.glb", "women.glb"]);

  console.log("All 3D avatar GLB models exported successfully to public/models/avatars/");
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
