import type { MetadataRoute } from "next";

import { listPublicActiveTenantSlugs } from "@/repositories/tenants";

const SITE_URL = "https://dibok.app";
const TENANT_DOMAIN = "dibok.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${SITE_URL}/para-barberias`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: `${SITE_URL}/reservas-online`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: `${SITE_URL}/fila-virtual`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: `${SITE_URL}/precios`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7
    }
  ];

  const tenants = await listPublicActiveTenantSlugs().catch(() => []);
  const tenantRoutes = tenants.flatMap((tenant): MetadataRoute.Sitemap => {
    const lastModified = tenant.updated_at ? new Date(tenant.updated_at) : now;
    const baseUrl = `https://${tenant.slug}.${TENANT_DOMAIN}`;

    return [
      {
        url: `${baseUrl}/`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.8
      },
      {
        url: `${baseUrl}/reservar`,
        lastModified,
        changeFrequency: "daily",
        priority: 0.7
      },
      {
        url: `${baseUrl}/fila`,
        lastModified,
        changeFrequency: "daily",
        priority: 0.5
      }
    ];
  });

  return [...staticRoutes, ...tenantRoutes];
}
