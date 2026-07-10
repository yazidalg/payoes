import { InvitePageContent } from "@/ui/invites/invite-page-content";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <InvitePageContent token={token} />;
}
