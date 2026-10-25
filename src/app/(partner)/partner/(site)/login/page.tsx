import { redirect } from "next/navigation";
import PartnerLogin from "@/store/components/partner/PartnerLogin";
import { currentPartner } from "@/store/lib/partner-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function Login({ searchParams: searchParamsIn }: { searchParams: Promise<{ next?: string; demo?: string }> }) { const searchParams = await searchParamsIn;
  const next = searchParams.next?.startsWith("/partner/") ? searchParams.next : "/partner/dashboard";
  if (await currentPartner()) redirect(next);
  return <PartnerLogin next={next} demo={searchParams.demo === "1"} />;
}
