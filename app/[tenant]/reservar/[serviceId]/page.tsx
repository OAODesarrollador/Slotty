import { redirect } from "next/navigation";

export default async function AvailabilityPage({
  params
}: {
  params: Promise<{ tenant: string; serviceId: string }>;
}) {
  const { tenant: slug, serviceId } = await params;
  redirect(`/${slug}/reservar?serviceId=${serviceId}`);
}
