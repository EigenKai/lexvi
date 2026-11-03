"use client";

import { cn } from "cn";
import {
  BookOpen,
  CircleSlash,
  ExternalLink,
  FlaskConical,
  GitCommitHorizontal,
  History,
  Link2,
  type LucideIcon,
  Quote,
} from "lucide-react";
import { useT } from "@/components/providers";
import { usingMock } from "@/lib/api/client";
import type { IsoDate, LanKiemChung, LoaiQuanHe, QuanHe } from "@/lib/api/contract";
import { articleLabel, compareIso, docLabel, formatDate } from "@/lib/format";
import { appliesFrom, isRetroactive } from "@/lib/legal-status";
import { StatusBadge } from "../status";
import { Drawer } from "../ui/drawer";
import { AmendmentChain } from "./amendment-chain";
import type { ResolvedCitation } from "./citation-chip";
import { VerificationRibbon } from "./verification-ribbon";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Article text with the quoted sentence highlighted. Statute text appears whole (no typewriter). */
function ArticleText({ text, quote }: { text: string; quote: string }) {
  const at = quote ? text.indexOf(quote) : -1;
  return (
    <p lang="vi" className="max-w-[68ch] font-serif text-[1.0625rem] leading-[1.7] text-ink">
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

const REL_STYLE: Record<LoaiQuanHe, { icon: LucideIcon; cls: string }> = {
  sua_doi: { icon: GitCommitHorizontal, cls: "text-amend" },
  thay_the: { icon: GitCommitHorizontal, cls: "text-amend" },
  bai_bo: { icon: CircleSlash, cls: "text-crimson" },
  huong_dan: { icon: BookOpen, cls: "text-brand" },
  dan_chieu: { icon: Link2, cls: "text-ink-2" },
};

/**
 * The real backend returns only the direct relations acting on a provision (no document dates),
 * so the drawer lists them instead of drawing the full chain.
 */
function RelationList({ relations, applied }: { relations: QuanHe[]; applied: IsoDate }) {
  const t = useT();
  if (relations.length === 0) return <p className="text-sm text-ink-3">{t.drawer.noRelations}</p>;
  return (
    <ul data-film="relation-list" className="flex flex-col gap-2">
      {relations.map((r) => {
        const s = REL_STYLE[r.loai];
        const Icon = s.icon;
        const known = ISO.test(r.hieu_luc_tu);
        const applies = !known || compareIso(r.hieu_luc_tu, applied) <= 0;
        return (
          <li
            key={`${r.tu_id}|${r.loai}|${r.hieu_luc_tu}`}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-line px-3 py-2 text-sm"
          >
            <Icon aria-hidden className={cn("size-4 shrink-0", s.cls)} />
            <span className={cn("font-medium", s.cls)}>{t.relationBy[r.loai]}</span>
            <span className="font-mono text-xs text-ink">{r.tu_id}</span>
            {known && (
              <span className="font-mono text-xs text-ink-3 tabular-nums">
                {t.drawer.relFrom(formatDate(r.hieu_luc_tu))}
              </span>
            )}
            {!applies && <span className="text-xs text-ink-3">· {t.drawer.relPending}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** DESIGN.md §4.4 */
export function CitationDrawer({
  citation,
  applied,
  attempts,
  canXacNhan,
  unresolved,
  onClose,
}: {
  citation: ResolvedCitation | null;
  applied: IsoDate;
  attempts: LanKiemChung[] | undefined;
  canXacNhan: boolean;
  unresolved?: string[];
  onClose: () => void;
}) {
  const t = useT();
  const v = citation?.view;
  // The provision may apply from a different date than the document (two time axes).
  const node = v?.chuoi?.find((n) => n.van_ban.so_hieu === v.so_hieu);
  const from = node ? appliesFrom(node) : v?.hieu_luc_tu;
  const article = v ? articleLabel(v) : "";
  const doc = v?.so_hieu ? docLabel(v.loai, v.so_hieu) : "";
  const hasDates = !!(v?.ngay_ban_hanh || v?.hieu_luc_tu);

  return (
    <Drawer
      open={citation !== null}
      onOpenChange={(o) => !o && onClose()}
      film="drawer"
      title={
        article || doc ? (
          <span>
            {article}
            {doc && (
              <span className="font-mono text-base font-medium text-ink-2">
                {article ? " · " : ""}
                {doc}
              </span>
            )}
          </span>
        ) : (
          (citation?.trich.id ?? "")
        )
      }
      description={v?.tieu_de}
    >
      {citation && v && (
        <div className="flex flex-col gap-6">
          {usingMock && (
            <p className="flex items-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-2 text-xs text-ink-2">
              <FlaskConical aria-hidden className="size-4 shrink-0" />
              {t.drawer.illustrative}
            </p>
          )}

          <section className="flex flex-col gap-3">
            {citation.status && <StatusBadge status={citation.status} />}
            {v.tinh_trang_text && (
              <p className="text-xs text-ink-3">
                {t.drawer.backendStatus}: <span lang="vi">{v.tinh_trang_text}</span>
              </p>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {v.ngay_ban_hanh && (
                <Meta label={t.drawer.issued} value={formatDate(v.ngay_ban_hanh)} />
              )}
              {v.hieu_luc_tu && (
                <Meta label={t.drawer.effectiveFrom} value={formatDate(v.hieu_luc_tu)} />
              )}
              {from && from !== v.hieu_luc_tu && (
                <Meta label={t.drawer.appliesFrom} value={formatDate(from)} />
              )}
              {hasDates && (
                <Meta
                  label={t.drawer.effectiveUntil}
                  value={v.het_hieu_luc ? formatDate(v.het_hieu_luc) : t.drawer.stillInForce}
                />
              )}
              <Meta label={t.drawer.page} value={String(v.trang || "—")} />
            </dl>
            {v.ngay_ban_hanh && from && isRetroactive(v.ngay_ban_hanh, from, applied) && (
              <p className="flex items-start gap-2 rounded-md bg-surface-sunk px-3 py-2 text-sm leading-[1.5] text-ink-2">
                <History aria-hidden className="mt-0.5 size-4 shrink-0" />
                {t.drawer.retroactive(formatDate(v.ngay_ban_hanh), formatDate(from))}
              </p>
            )}
          </section>

          {v.nhan_dinh && (
            <section data-film="drawer-claim">
              <h3 className="mb-1 text-sm font-semibold text-ink-2">{t.drawer.supports}</h3>
              <p
                lang="vi"
                className="flex items-start gap-2 text-[0.9375rem] leading-[1.6] text-ink"
              >
                <Quote aria-hidden className="mt-1 size-4 shrink-0 text-ink-3" />
                {v.nhan_dinh}
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink-2">
              {v.noi_dung ? t.drawer.articleText : t.drawer.quote}
            </h3>
            <div className="rounded-md bg-surface-sunk px-4 py-3">
              <ArticleText text={v.noi_dung ?? v.cau_trich} quote={v.cau_trich} />
            </div>
            {v.noi_dung && !v.noi_dung.includes(v.cau_trich) && (
              // Backend matches quotes after normalising whitespace/case; show it separately then.
              <p
                lang="vi"
                className="mt-2 border-l-2 border-brand pl-3 font-serif text-[0.9375rem] text-ink"
              >
                “{v.cau_trich}”
              </p>
            )}
            {v.nguon_url && (
              <a
                href={v.nguon_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
              >
                {t.drawer.source}
                <ExternalLink aria-hidden className="size-4" />
              </a>
            )}
            {!v.noi_dung && !v.so_hieu && (
              <p className="mt-2 text-sm text-ink-3">{t.drawer.noDetail}</p>
            )}
          </section>

          {v.chuoi && v.chuoi.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold text-ink-2">{t.drawer.chain}</h3>
              <p className="mb-3 text-xs text-ink-3">
                {t.drawer.chainHint} ({formatDate(applied)})
              </p>
              <AmendmentChain chain={v.chuoi} applied={applied} citedSoHieu={v.so_hieu} />
            </section>
          ) : (
            v.quan_he && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-ink-2">{t.drawer.relations}</h3>
                <RelationList relations={v.quan_he} applied={applied} />
              </section>
            )
          )}

          <VerificationRibbon
            attempts={attempts}
            canXacNhan={canXacNhan}
            unresolved={unresolved}
            play={false}
            filmPrefix="drawer-"
            heading="h3"
          />
        </div>
      )}
    </Drawer>
  );
}
