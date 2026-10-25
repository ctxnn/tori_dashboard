import LoginForm from "@/store/components/LoginForm";
export const metadata = { title: "Sign in" };
export default async function Login({ searchParams: searchParamsIn }: { searchParams: Promise<{ next?: string }> }) { const searchParams = await searchParamsIn;
  const next = searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/read";
  return <LoginForm next={next} />;
}
