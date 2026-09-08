import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { getOrBootstrapUserProfile } from "@/lib/admin/users";
import { UserRoleProvider } from "@/context/UserRoleContext";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { profile, user } = await getOrBootstrapUserProfile(supabase);

  if (!user) {
    redirect("/login");
  }

  return (
    <UserRoleProvider user={user} profile={profile}>
      <div className="app-layout">
        {/* Sidebar — Desktop only */}
        <AppSidebar />

        {/* Main content */}
        <div className="app-main">
          <AppHeader user={user} profile={profile} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>

        {/* Bottom Nav — Mobile only */}
        <BottomNav />
      </div>
    </UserRoleProvider>
  );
}
