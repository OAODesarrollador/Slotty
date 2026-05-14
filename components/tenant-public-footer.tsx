"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TenantPublicFooterProps = {
  tenantSlug: string;
  tenantName: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  instagramUrl?: string | null;
};

const SYSTEM_LOGO_URL = "/LogoNegroDibok.svg";

function normalizeExternalUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function TenantPublicFooter({
  tenantSlug,
  tenantName,
  logoUrl,
  phone,
  email,
  address,
  instagramUrl
}: TenantPublicFooterProps) {
  const pathname = usePathname();

  const isOwnerPath = pathname === "/owner"
    || pathname?.startsWith("/owner/")
    || pathname === `/${tenantSlug}/owner`
    || pathname?.startsWith(`/${tenantSlug}/owner/`);

  if (isOwnerPath) {
    return null;
  }

  const mapQuery = address || tenantName;
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <footer className="tenant-footer">
      <div className="tenant-footer__inner">
        <section className="tenant-footer__brand">
          <span className="tenant-footer__logo">
            <img src={logoUrl || SYSTEM_LOGO_URL} alt={`Logo de ${tenantName}`} />
          </span>
          <div className="stack" style={{ gap: 8 }}>
            <strong>{tenantName}</strong>
            <p>Reservas, turnos y atención del local en un solo lugar.</p>
          </div>
        </section>

        <section className="tenant-footer__contact" aria-label="Datos de contacto">
          <h2>Contacto</h2>
          <div className="tenant-footer__list">
            {address ? <span>{address}</span> : <span>Dirección no cargada</span>}
            {phone ? <a href={`tel:${phone}`}>{phone}</a> : <span>Teléfono no cargado</span>}
            {email ? <a href={`mailto:${email}`}>{email}</a> : <span>Email no cargado</span>}
            {instagramUrl ? <a href={normalizeExternalUrl(instagramUrl)} target="_blank" rel="noreferrer">Instagram</a> : null}
          </div>
        </section>

        <section className="tenant-footer__map" aria-label="Mapa de como llegar">
          <div className="tenant-footer__map-header">
            <h2>Cómo llegar</h2>
            <Link href={mapLink} target="_blank" rel="noreferrer">
              Abrir mapa
            </Link>
          </div>
          <iframe
            src={mapUrl}
            title={`Mapa para llegar a ${tenantName}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>
      </div>
    </footer>
  );
}
