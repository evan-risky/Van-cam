import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/logout-button";
import { AdminNav } from "@/components/admin/admin-nav";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getAdminUserFromCookies } from "@/lib/admin-auth";
import { getEventBySlug } from "@/lib/event";
import { DEFAULT_EVENT_SLUG } from "@/lib/config";
import Link from "next/link";

export const instant = false;

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    redirect("/admin/login");
  }
  const event = await getEventBySlug(DEFAULT_EVENT_SLUG);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Brand href="/admin" />
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Panel penyelenggara
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground md:inline">
              {user.name}
            </span>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/" />}
            >
              Halaman tamu
            </Button>
            <LogoutButton />
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-3 md:hidden">
          <AdminNav orientation="horizontal" />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-24 flex flex-col gap-4">
            <AdminNav />
            {event ? (
              <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{event.name}</p>
                <p className="mt-1">{event.dateLabel}</p>
                <p>{event.location}</p>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}