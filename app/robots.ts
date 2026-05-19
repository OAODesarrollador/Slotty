import type { MetadataRoute } from "next";

const SITE_URL = "https://dibok.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/_next/static/",
        "/_next/image/"
      ],
      disallow: [
        "/api/",
        "/platform/",
        "/owner/",
        "/login",
        "/*/owner/",
        "/*/owner/login",
        "/*/owner/dashboard",
        "/*/owner/change-password",
        "/*/fila/*",
        "/*/mi-turno/*",
        "/*/reservar/*/confirmar",
        "/*/reservar/*/pago",
        "/*?error=",
        "/*?notice=",
        "/*?section=",
        "/*?barberId="
      ]
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
