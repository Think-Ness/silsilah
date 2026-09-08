import { getInvitationByToken } from "@/lib/admin/users";
import { AcceptInviteClient } from "./AcceptInviteClient";

export const metadata = {
  title: "Terima Undangan | Silsilah Keluarga",
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const { invitation, error } = await getInvitationByToken(token);

  return <AcceptInviteClient invitation={invitation} token={token} serverError={error} />;
}
