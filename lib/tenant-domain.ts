const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const ROOT_HOST_PREFIXES = new Set(["www", "api"]);

function stripPort(host: string) {
  if (host.startsWith("[") && host.includes("]")) {
    return host.slice(1, host.indexOf("]")).toLowerCase();
  }

  return host.split(":")[0]?.toLowerCase() ?? "";
}

export function getTenantDomainSuffix() {
  const explicitSuffix = process.env.TENANT_DOMAIN_SUFFIX || process.env.ROOT_DOMAIN;
  if (explicitSuffix) {
    return stripPort(explicitSuffix).replace(/^\*\./, "");
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return "";
  }

  try {
    return new URL(appUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function getTenantSlugFromHost(host: string | null | undefined) {
  const hostname = stripPort(host ?? "");
  const suffix = getTenantDomainSuffix();

  if (!hostname || !suffix || LOCAL_HOSTS.has(hostname)) {
    return null;
  }

  if (hostname === suffix || ROOT_HOST_PREFIXES.has(hostname.replace(`.${suffix}`, ""))) {
    return null;
  }

  if (!hostname.endsWith(`.${suffix}`)) {
    return null;
  }

  const subdomain = hostname.slice(0, -suffix.length - 1);
  if (!subdomain || subdomain.includes(".") || ROOT_HOST_PREFIXES.has(subdomain)) {
    return null;
  }

  return subdomain;
}

export function isTenantSubdomainHost(host: string | null | undefined) {
  return getTenantSlugFromHost(host) !== null;
}

export function tenantPath(tenantSlug: string, path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/${tenantSlug}${normalizedPath === "/" ? "" : normalizedPath}`;
}

export function tenantRelativePath(path = "/") {
  return path.startsWith("/") ? path : `/${path}`;
}

export function tenantPathForHost(host: string | null | undefined, tenantSlug: string, path = "/") {
  return getTenantSlugFromHost(host) === tenantSlug
    ? tenantRelativePath(path)
    : tenantPath(tenantSlug, path);
}

export function buildTenantUrl(appUrl: string, tenantSlug: string, path = "/") {
  const url = new URL(appUrl);
  const suffix = getTenantDomainSuffix() || url.hostname;
  url.hostname = `${tenantSlug}.${suffix}`;
  url.pathname = tenantRelativePath(path);
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, path === "/" ? "/" : "");
}
