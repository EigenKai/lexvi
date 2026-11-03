"use client";

import { ExternalLink, FlaskConical, History } from "lucide-react";
import { usingMock } from "@/lib/api/client";
import type { IsoDate, LanKiemChung } from "@/lib/api/contract";
import { articleLabel, docLabel, formatDate } from "@/lib/format";
import { vi } from "@/lib/i18n/vi";
import { appliesFrom, isRetroactive } from "@/lib/legal-status";
import { StatusBadge } from "../status";
import { Drawer } from "../ui/drawer";
import { AmendmentChain } from "./amendment-chain";
import type { ResolvedCitation } from "./citation-chip";
import { VerificationRibbon } from "./verification-ribbon";

/** Article text with the quoted sentence highlighted. Statute text appears whole (no typewriter). */
function ArticleText({ text, quote }: { text: string; quote: string }) {
  const at = quote ? text.indexOf(quote) : -1;
  return (
    <p className="max-w-[68ch] font-serif text-[1.0625rem] leading-[1.7] text-ink">
      {at < 0 ? (
        text
      ) : (
        <>
          {text.slice(0, at)}
          <mark className="rounded-sm bg-brand-tint px-0.5 text-ink [box-decoration-break:clone] shadow-[inset_0_-2px_0_var(--color-brand)]">
            {text.slice(at, at + quote.length)}
          </mark>
          {text.slice(at + quote.length)}
        </>
      )}
    </p>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-3">{label}</dt>
      <dd className="font-mono text-sm text-ink tabular-nums">{value}</dd>
    </div>
  );
}

/** DESIGN.md §4.4 */
export function CitationDrawer({
  citation,
  applied,
  attempts,
  canXacNhan,
  onClose,
}: {
  citation: ResolvedCitation | null;
  applied: IsoDate;
  attempts: LanKiemChung[] | undefined;
  canXacNhan: boolean;
  onClose: () => void;
}) {
  const detail = citation?.detail ?? null;
  const vb = detail?.van_ban;
  const dk = detail?.dieu_khoan;
  // The provision may apply from a different date than the document (two time axes).
  const node = vb ? detail?.chuoi.find((n) => n.van_ban.so_hieu === vb.so_hieu) : undefined;
  const from = node ? appliesFrom(node) : vb?.hieu_luc_tu;

  return (
    <Drawer
      open={citation !== null}
      onOpenChange={(o) => !o && onClose()}
      film="drawer"
      title={
        dk && vb ? (
          <span>
            {articleLabel(dk)}{" "}
            <span className="font-mono text-base font-medium text-ink-2">
              · {docLabel(vb.loai, vb.so_hieu)}
            </span>
          </span>
        ) : (
          (citation?.trich.id ?? "")
        )
      }
      description={vb?.tieu_de}
    >
      {citation && (
        <div className="flex flex-col gap-6">
          {usingMock && (
            <p className="flex items-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-2 text-xs text-ink-2">
              <FlaskConical aria-hidden className="size-4 shrink-0" />
              {vi.drawer.illustrative}
            </p>
          )}

          {vb && (
            <section className="flex flex-col gap-3">
              {citation.status && <StatusBadge status={citation.status} />}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                <Meta label={vi.drawer.issued} value={formatDate(vb.ngay_ban_hanh)} />
                <Meta label={vi.drawer.effectiveFrom} value={formatDate(vb.hieu_luc_tu)} />
                {from && from !== vb.hieu_luc_tu && (
                  <Meta label={vi.drawer.appliesFrom} value={formatDate(from)} />
                )}
                <Meta
                  label={vi.drawer.effectiveUntil}
                  value={vb.het_hieu_luc ? formatDate(vb.het_hieu_luc) : vi.drawer.stillInForce}
                />
                <Meta label={vi.drawer.page} value={String(citation.trich.trang)} />
              </dl>
              {from && isRetroactive(vb.ngay_ban_hanh, from, applied) && (
                <p className="flex items-start gap-2 rounded-md bg-surface-sunk px-3 py-2 text-sm leading-[1.5] text-ink-2">
                  <History aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {vi.drawer.retroactive(formatDate(vb.ngay_ban_hanh), formatDate(from))}
                </p>
              )}
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink-2">
              {dk ? vi.drawer.articleText : vi.drawer.quote}
            </h3>
            <div className="rounded-md bg-surface-sunk px-4 py-3">
              <ArticleText
                text={dk?.noi_dung ?? citation.trich.cau_trich}
                quote={citation.trich.cau_trich}
              />
            </div>
            {vb && (
              <a
                href={vb.nguon_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
              >
                {vi.drawer.source}
                <ExternalLink aria-hidden className="size-4" />
              </a>
            )}
            {!detail && <p className="mt-2 text-sm text-ink-3">{vi.drawer.noDetail}</p>}
          </section>

          {detail && detail.chuoi.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-ink-2">{vi.drawer.chain}</h3>
              <p className="mb-3 text-xs text-ink-3">
                {vi.drawer.chainHint} ({formatDate(applied)})
              </p>
              <AmendmentChain chain={detail.chuoi} applied={applied} citedSoHieu={vb?.so_hieu} />
            </section>
          )}

          <VerificationRibbon
            attempts={attempts}
            canXacNhan={canXacNhan}
            play={false}
            filmPrefix="drawer-"
            heading="h3"
          />
        </div>
      )}
    </Drawer>
  );
}
