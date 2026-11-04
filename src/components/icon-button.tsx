import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

/** Icon-only button: named by a tooltip, with a larger touch target on phones. */
export const IconButton = ({
  children,
  disabled,
  label,
  onClick,
  variant = "ghost",
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  variant?: ComponentProps<typeof Button>["variant"];
}) => {
  const isMobile = useIsMobile();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            size={isMobile ? "icon-lg" : "icon-sm"}
            variant={variant}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
};
