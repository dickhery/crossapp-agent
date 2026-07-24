import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WorkflowSearchProps = {
  value: string;
  onChange: (next: string) => void;
  resultCount: number;
  total: number;
};

export function WorkflowSearch({
  value,
  onChange,
  resultCount,
  total,
}: WorkflowSearchProps) {
  return (
    <div className="space-y-2" data-ocid="workflow.search.section">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by name or tag…"
          aria-label="Search workflows by name or tag"
          data-ocid="workflow.search_input"
          className="h-10 pl-9 pr-9"
        />
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear search"
            data-ocid="workflow.search_clear"
            onClick={() => onChange("")}
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>
      <p
        className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60"
        data-ocid="workflow.search_count"
      >
        {value.trim().length > 0
          ? `${resultCount} of ${total} match${resultCount === 1 ? "" : "es"}`
          : `${total} workflow${total === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
