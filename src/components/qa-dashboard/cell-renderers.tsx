import { ExternalLink } from "lucide-react";
import { Fragment } from "react";

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

// Match bare URLs (http/https). Trailing punctuation is trimmed below.
const URL_REGEX = /(https?:\/\/[^\s<>()\[\]]+)/g;

function renderWithLinks(text: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // Trim trailing punctuation that shouldn't be part of the URL
      const match = part.match(/^(.*?)([.,;:!?)\]]*)$/);
      const url = match?.[1] ?? part;
      const tail = match?.[2] ?? "";
      return (
        <Fragment key={i}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline break-all"
          >
            {url}
          </a>
          {tail}
        </Fragment>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/** Renders multi-line text, auto-linking any URLs found inside. */
export function RichText({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <EmptyCell />;
  const str = String(value);
  if (!str.trim()) return <EmptyCell />;
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {renderWithLinks(str)}
    </div>
  );
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

  return <RichText value={str} />;
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
