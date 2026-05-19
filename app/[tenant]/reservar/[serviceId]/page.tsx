import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function AvailabilityPage({
  params
}: {
  params: Promise<{ tenant: string; serviceId: string }>;
}) {
  const { tenant: slug, serviceId } = await params;
  redirect(`/${slug}/reservar?serviceId=${serviceId}`);
}
