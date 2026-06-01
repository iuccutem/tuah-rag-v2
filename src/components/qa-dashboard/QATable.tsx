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
  bil?: number | string | null;
  soalan?: string | null;
  tarikh_pengujian?: string | null;
  web_browser?: string | null;
  whatsapp_telegram?: string | null;
};

const HEADERS = [
  { key: "bil", label: "No.", className: "w-16 text-right" },
  { key: "soalan", label: "Question", className: "min-w-[20rem]" },
  { key: "tarikh_pengujian", label: "Test Date", className: "w-44" },
  { key: "web_browser", label: "Web Browser", className: "w-72" },
  {
    key: "whatsapp_telegram",
    label: "WhatsApp / Telegram",
    className: "w-72",
  },
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
          {isLoading && rows.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`s-${i}`}>
                  {HEADERS.map((h) => (
                    <TableCell key={h.key} className={h.className}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.length === 0
              ? (
                  <TableRow>
                    <TableCell
                      colSpan={HEADERS.length}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No evaluation records yet.
                    </TableCell>
                  </TableRow>
                )
              : rows.map((row, idx) => (
                  <TableRow key={`${row.bil ?? idx}-${idx}`}>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {row.bil ?? idx + 1}
                    </TableCell>
                    <TableCell className="max-w-[36rem] leading-relaxed">
                      {row.soalan ? (
                        <span className="whitespace-pre-wrap break-words">
                          {row.soalan}
                        </span>
                      ) : (
                        <EmptyCell />
                      )}
                    </TableCell>
                    <TableCell>
                      <DateCell value={row.tarikh_pengujian} />
                    </TableCell>
                    <TableCell>
                      <LinkOrText value={row.web_browser} />
                    </TableCell>
                    <TableCell>
                      <LinkOrText value={row.whatsapp_telegram} />
                    </TableCell>
                  </TableRow>
                ))}
        </TableBody>
      </Table>
    </div>
  );
}
