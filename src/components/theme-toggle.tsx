import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setThemeSetting, useThemeSetting } from "@/hooks/use-theme";
import type { ThemeSetting } from "@/hooks/use-theme";

const THEME_LABELS: Record<ThemeSetting, string> = {
  dark: "Dunkel",
  light: "Hell",
  system: "System",
};

const themeSettings: ThemeSetting[] = ["light", "dark", "system"];

export const ThemeToggle = () => {
  const setting = useThemeSetting();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button aria-label="Darstellung wählen" size="icon" variant="ghost" />
        }
      >
        <SunIcon className="dark:hidden" />
        <MoonIcon className="hidden dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup value={setting}>
            {themeSettings.map((value) => (
              <DropdownMenuRadioItem
                key={value}
                onClick={() => {
                  setThemeSetting(value);
                }}
                value={value}
              >
                {THEME_LABELS[value]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
