import { useStore } from "@/lib/store";
import { useCompanies } from "@/lib/queries";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface CompanySelectorProps {
  collapsed?: boolean;
}

export function CompanySelector({ collapsed = false }: CompanySelectorProps) {
  const [open, setOpen] = useState(false);
  const { currentUser, selectedCompanyId, setSelectedCompanyId } = useStore();
  const { data: companies = [] } = useCompanies();

  const userCompanies = currentUser?.role === 'admin' 
    ? companies 
    : companies.filter(c => currentUser?.assignedCompanyIds?.includes(c.id));

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const displayName = selectedCompany?.name || "Tüm Şirketler";

  if (userCompanies.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between border-sidebar-border bg-sidebar hover:bg-sidebar-accent/50",
            collapsed ? "w-10 p-0" : "w-full"
          )}
          data-testid="button-company-selector"
        >
          <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
            <Building2 className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="truncate text-sm font-normal">{displayName}</span>
            )}
          </div>
          {!collapsed && <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>Şirket bulunamadı</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  setSelectedCompanyId(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedCompanyId === null ? "opacity-100" : "opacity-0"
                  )}
                />
                Tüm Şirketler
              </CommandItem>
              {userCompanies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.name}
                  onSelect={() => {
                    setSelectedCompanyId(company.id);
                    setOpen(false);
                  }}
                  data-testid={`option-company-${company.id}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCompanyId === company.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{company.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{company.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
