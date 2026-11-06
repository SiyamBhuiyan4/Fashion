/**
 * Sets up real 3D VRoid/GLB character models for Boy and Girl avatars.
 * Downloads from official open-source VRoid sample assets and saves as permanent GLBs:
 * - public/models/avatars/boy.glb (and men.glb)
 * - public/models/avatars/girl.glb (and women.glb)
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const MODELS = [
  {
    gender: "men",
    filenames: ["boy.glb", "men.glb"],
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_B.vrm",
  },
  {
    gender: "women",
    filenames: ["girl.glb", "women.glb"],
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_A.vrm",
  },
];

async function main() {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const targetDir = path.resolve(process.cwd(), "public/models/avatars");
  fs.mkdirSync(targetDir, { recursive: true });

  for (const { gender, filenames, url } of MODELS) {
    console.log(`Fetching real 3D model for ${gender}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    const arrayBuffer = await res.arrayBuffer();
    const doc = await io.readBinary(new Uint8Array(arrayBuffer));

    // Remove VRM specific extension requirement so standard glTF/Three.js viewers load it directly
    const root = doc.getRoot();
    for (const ext of root.listExtensionsRequired()) {
      if (ext.extensionName.startsWith("VRM") || ext.extensionName.startsWith("VRMC")) {
        ext.dispose();
      }
    }
    for (const ext of root.listExtensionsUsed()) {
      if (ext.extensionName.startsWith("VRM") || ext.extensionName.startsWith("VRMC")) {
        ext.dispose();
      }
    }

    const glbBuffer = await io.writeBinary(doc);
    console.log(`Generated standard GLB for ${gender} (${(glbBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    for (const filename of filenames) {
      const dest = path.join(targetDir, filename);
      fs.writeFileSync(dest, Buffer.from(glbBuffer));
      console.log(`✓ Saved ${dest}`);
    }
  }

  console.log("All real 3D character models saved successfully!");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
