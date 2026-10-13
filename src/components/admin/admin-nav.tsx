"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Images,
  LayoutDashboard,
  QrCode,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "cn";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tamu", label: "Tamu", icon: Users },
  { href: "/admin/qr", label: "QR Acara", icon: QrCode },
  { href: "/admin/foto", label: "Foto", icon: Images },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
];

type AdminNavProps = {
  orientation?: "vertical" | "horizontal";
};

export function AdminNav({ orientation = "vertical" }: AdminNavProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/admin" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <nav
      className={cn(
        orientation === "vertical"
          ? "flex flex-col gap-1"
          : "flex gap-1 overflow-x-auto",
      )}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
            orientation === "vertical" ? "w-full" : "shrink-0",
            isActive(item.href)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}