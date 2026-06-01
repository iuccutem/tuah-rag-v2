import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DateCell, EmptyCell, LinkOrText } from "./cell-renderers";

export type QARow = {
  id?: number | string | null;
  question?: string | null;
  web?: string | null;
  telegram_whatsapp?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const HEADERS = [
  { key: "id", label: "ID", className: "w-16 text-right" },
  { key: "question", label: "Question", className: "min-w-[18rem]" },
  { key: "web", label: "Web", className: "min-w-[20rem]" },
  {
    key: "telegram_whatsapp",
    label: "Telegram / WhatsApp",
    className: "min-w-[20rem]",
  },
  { key: "createdAt", label: "Created", className: "w-44" },
  { key: "updatedAt", label: "Updated", className: "w-44" },
] as const;

export function QATable({
  rows,
  isLoading,
}: {
  rows: QARow[];
  isLoading: boolean;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50 sticky top-0">
          <TableRow>
            {HEADERS.map((h) => (
              <TableHead key={h.key} className={h.className}>
                {h.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && rows.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`s-${i}`}>
                {HEADERS.map((h) => (
                  <TableCell key={h.key} className={h.className}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={HEADERS.length}
                className="h-32 text-center text-muted-foreground"
              >
                No evaluation records yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, idx) => (
              <TableRow key={`${row.id ?? idx}-${idx}`}>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {row.id ?? idx + 1}
                </TableCell>
                <TableCell className="max-w-[28rem] leading-relaxed align-top">
                  {row.question ? (
                    <span className="whitespace-pre-wrap break-words">
                      {row.question}
                    </span>
                  ) : (
                    <EmptyCell />
                  )}
                </TableCell>
                <TableCell className="max-w-[32rem] align-top">
                  <LinkOrText value={row.web} />
                </TableCell>
                <TableCell className="max-w-[32rem] align-top">
                  <LinkOrText value={row.telegram_whatsapp} />
                </TableCell>
                <TableCell className="align-top">
                  <DateCell value={row.createdAt} />
                </TableCell>
                <TableCell className="align-top">
                  <DateCell value={row.updatedAt} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
