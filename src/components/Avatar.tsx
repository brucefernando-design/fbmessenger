import { cn } from "@/lib/utils";

interface AvatarProps {
  label: string;
  size?: number;
  className?: string;
}

export function Avatar({ label, size = 40, className }: AvatarProps) {
  const initials = label.slice(0, 2).toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}
