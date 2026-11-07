import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Lets phones install the store to the home screen and open it full-screen, like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} ${site.subtitle}`,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f1e7",
    theme_color: "#f7f1e7",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
