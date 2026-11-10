import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface CevoLogoProps {
  /**
   * "full": Icon + Cevo wordmark
   * "icon": Only the geometric icon
   * "responsive": Icon on mobile/collapsed, full on larger screens
   */
  variant?: "full" | "icon" | "responsive";
  /**
   * When true, renders in collapsed sidebar mode (icon only with tooltip/accessible label)
   */
  collapsed?: boolean;
  /**
   * Size presets
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /**
   * Optional destination link. If omitted, renders a non-clickable container.
   */
  href?: string;
  /**
   * Optional role or tier badge beside the logo (e.g. "Admin", "Pro")
   */
  badge?: string;
  /**
   * Additional container classes
   */
  className?: string;
  /**
   * Custom classes for the icon image
   */
  iconClassName?: string;
  /**
   * Custom classes for the wordmark text
   */
  textClassName?: string;
  /**
   * Whether to prioritize loading the image
   */
  priority?: boolean;
}

const sizeConfig = {
  xs: { iconSize: 20, textSize: "text-base", gap: "gap-1.5" },
  sm: { iconSize: 24, textSize: "text-lg", gap: "gap-2" },
  md: { iconSize: 32, textSize: "text-xl", gap: "gap-2.5" },
  lg: { iconSize: 40, textSize: "text-2xl", gap: "gap-3" },
  xl: { iconSize: 52, textSize: "text-3xl", gap: "gap-3.5" },
};

export function CevoLogo({
  variant = "full",
  collapsed = false,
  size = "md",
  href,
  badge,
  className,
  iconClassName,
  textClassName,
  priority = false,
}: CevoLogoProps) {
  const { iconSize, textSize, gap } = sizeConfig[size];
  const isIconOnly = collapsed || variant === "icon";

  const content = (
    <div
      className={cn(
        "inline-flex items-center transition-all duration-200 select-none group",
        gap,
        className,
      )}
    >
      {/* Cevo Geometric Icon Mark */}
      <div
        className={cn(
          "relative flex items-center justify-center shrink-0 rounded-md overflow-hidden",
          iconClassName,
        )}
        style={{ width: iconSize, height: iconSize }}
      >
        <Image
          src="/branding/cevo-icon.png"
          alt="Cevo"
          width={iconSize}
          height={iconSize}
          priority={priority}
          className="object-contain w-full h-full drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Cevo Wordmark & Optional Badge */}
      {!isIconOnly && (
        <div
          className={cn(
            "flex items-center gap-2 tracking-tight",
            variant === "responsive" && "hidden sm:flex",
          )}
        >
          <span
            className={cn(
              "font-sans font-bold text-foreground leading-none tracking-tight",
              textSize,
              textClassName,
            )}
          >
            Cevo
          </span>

          {badge && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20 leading-none">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        aria-label="Cevo Home"
      >
        {content}
      </Link>
    );
  }

  return content;
}
