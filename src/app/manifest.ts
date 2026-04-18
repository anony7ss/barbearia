import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Corte Nobre Barbearia",
    short_name: "Corte Nobre",
    description:
      "Agendamento rapido para corte, barba e acabamento premium.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f0e0c",
    theme_color: "#0f0e0c",
    orientation: "portrait",
    lang: "pt-BR",
    categories: ["business", "lifestyle"],
    icons: [
      {
        src: "/icons/corte-nobre-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/corte-nobre-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
