import Verify from "@/store/components/Verify";
import { currentUser } from "@/store/lib/auth";
export const dynamic = "force-dynamic";
export const metadata = { title: "Verify" };
export default async function VerifyPage({ searchParams: searchParamsIn }: { searchParams: Promise<{ code?: string }> }) { const searchParams = await searchParamsIn;
  return <Verify initialCode={searchParams.code ?? ""} signedIn={!!(await currentUser())} />;
}
