import { redirect } from "next/navigation";

export default async function PaymentPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string; serviceId: string }>;
  searchParams: Promise<{ barberId?: string; start?: string; error?: string }>;
}) {
  const { tenant: slug, serviceId } = await params;
  const search = await searchParams;
  const query = new URLSearchParams({ serviceId });

  if (search.barberId) {
    query.set("barberId", search.barberId);
  }

  if (search.start) {
    query.set("start", search.start);
    query.set("date", search.start.slice(0, 10));
  }

  if (search.error) {
    query.set("error", search.error);
  }

  redirect(`/${slug}/reservar?${query.toString()}`);
}
