import { currentUser } from "@/lib/auth";
import { listUsers } from "@/lib/domain/core";
import { ROLE_LABEL } from "@/lib/labels";
import { Notice, PageHeader } from "@/components/ui";
import { RoleSwitcher } from "@/components/role-switcher";

export const metadata = { title: "Choose a demo role" };

export default async function SwitchPage({ searchParams }: { searchParams: Promise<{ need?: string; next?: string }> }) {
  const { need, next } = await searchParams;
  const user = await currentUser();
  const users = listUsers().map((u) => ({ id: u.id, name: u.name, role: u.role, roleLabel: ROLE_LABEL[u.role], org: u.org, title: u.title, bio: u.bio }));
  const needed = need?.split(",").map((r) => ROLE_LABEL[r] ?? r);
  return (
    <div>
      <PageHeader
        eyebrow="Demo access"
        title="Who are you in this collaboration?"
        description="Each person sees and can do different things. Switching is instant; permissions are still enforced on the server for whoever you choose."
      />
      {needed && (
        <Notice tone="warn" title="That page needs a different role" className="mb-6">
          Continue as {needed.join(" or ")} to open it.
        </Notice>
      )}
      <RoleSwitcher users={users} currentId={user?.id} next={next} />
    </div>
  );
}
