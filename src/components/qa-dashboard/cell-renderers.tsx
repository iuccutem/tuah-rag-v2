import { ExternalLink } from "lucide-react";

export function EmptyCell() {
  return <span className="text-muted-foreground">—</span>;
}

function isUrl(value: string): boolean {
  if (!value) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function LinkOrText({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <EmptyCell />;
  const str = String(value).trim();
  if (!str) return <EmptyCell />;

  if (isUrl(str)) {
    return (
      <a
        href={str}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-[18rem] items-center gap-1.5 text-primary underline-offset-4 hover:underline"
        title={str}
      >
        <span className="truncate">{str}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    );
  }

  return <span className="whitespace-pre-wrap break-words">{str}</span>;
}

export function DateCell({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <EmptyCell />;
  const str = String(value).trim();
  if (!str) return <EmptyCell />;

  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) {
    return (
      <span className="tabular-nums">
        {new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(d)}
      </span>
    );
  }
  return <span className="tabular-nums">{str}</span>;
}
