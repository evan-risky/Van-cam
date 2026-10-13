import Link from "next/link";
import { Camera, type LucideProps } from "lucide-react";
import { cn } from "cn";

export function CameraMark({
  className,
  ...props
}: LucideProps) {
  return <Camera className={cn("size-5", className)} {...props} />;
}

type BrandProps = {
  href?: string;
  tone?: "dark" | "light";
  className?: string;
};

export function Brand({ href = "/", tone = "dark", className }: BrandProps) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full",
          tone === "light"
            ? "bg-white/10 text-accent"
            : "bg-primary text-primary-foreground",
        )}
      >
        <CameraMark />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-heading text-lg font-semibold tracking-tight",
            tone === "light" ? "text-white" : "text-foreground",
          )}
        >
          Vanry Cam
        </span>
        <span
          className={cn(
            "text-[0.7rem] tracking-[0.2em] uppercase",
            tone === "light" ? "text-white/60" : "text-muted-foreground",
          )}
        >
          Evan &amp; Inri
        </span>
      </span>
    </Link>
  );
}