import { cn } from "@/lib/utils";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const Logo = ({ className, size = "md", showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  };

  const textClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Light Mode Logo (Visible in Light Mode, Hidden in Dark Mode) */}
        <img
          src={logoLight}
          alt="PYPE CRM Logo"
          className="h-full w-full object-contain dark:hidden"
        />
        {/* Dark Mode Logo (Hidden in Light Mode, Visible in Dark Mode) */}
        <img
          src={logoDark}
          alt="PYPE CRM Logo"
          className="h-full w-full object-contain hidden dark:block"
        />
      </div>
      {showText && (
        <span
          className={cn(
            "font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent",
            textClasses[size]
          )}
        >
          PYPE CRM
        </span>
      )}
    </div>
  );
};

export default Logo;
