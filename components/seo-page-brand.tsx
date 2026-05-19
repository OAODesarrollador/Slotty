import Image from "next/image";
import Link from "next/link";

export function SeoPageBrand() {
  return (
    <Link
      href="/"
      aria-label="Dibok.app"
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: 142,
        height: 52,
        marginBottom: 10
      }}
    >
      <Image
        src="/LogoNegroTextoDibok.svg"
        alt="Dibok.app"
        width={142}
        height={52}
        priority
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </Link>
  );
}
