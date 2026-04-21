import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://barbearia-premium.vercel.app";
  const routes = [
    "",
    "/servicos",
    "/equipe",
    "/agendamento",
    "/assinaturas",
    "/meus-agendamentos",
    "/sobre",
    "/contato",
    "/privacidade",
    "/termos",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
