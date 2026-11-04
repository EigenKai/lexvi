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
import type { CitationView, IsoDate, LanKiemChung, LoaiQuanHe, QuanHe } from "@/lib/api/contract";
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

function dedupe(relations: QuanHe[]): QuanHe[] {
  const seen = new Set<string>();
  return relations.filter((r) => {
    const k = `${r.tu_id}|${r.den_id}|${r.loai}|${r.hieu_luc_tu}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** One group of relations. `outgoing`: this provision acts on others (shows `den_id`). */
function RelationGroup({
  title,
  relations,
  applied,
  outgoing = false,
  film,
}: {
  title: string;
  relations: QuanHe[];
  applied: IsoDate;
  outgoing?: boolean;
  film: string;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold text-ink-3">{title}</h4>
      <ul data-film={film} className="flex flex-col gap-2">
        {relations.map((r, i) => {
          const s = REL_STYLE[r.loai];
          const Icon = s.icon;
          const known = ISO.test(r.hieu_luc_tu);
          const applies = !known || compareIso(r.hieu_luc_tu, applied) <= 0;
          const issued = r.ngay_ban_hanh && ISO.test(r.ngay_ban_hanh) ? r.ngay_ban_hanh : null;
          const retro =
            r.hoi_to === true ||
            (issued !== null && known && compareIso(issued, r.hieu_luc_tu) > 0);
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: index disambiguates repeated relations
              key={`${r.tu_id}|${r.den_id}|${r.loai}|${r.hieu_luc_tu}|${i}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-line px-3 py-2 text-sm"
            >
              <Icon aria-hidden className={cn("size-4 shrink-0", s.cls)} />
              <span className={cn("font-medium", s.cls)}>
                {outgoing ? t.relation[r.loai] : t.relationBy[r.loai]}
              </span>
              <span className="font-mono text-xs text-ink">{outgoing ? r.den_id : r.tu_id}</span>
              {known && (
                <span className="font-mono text-xs text-ink-3 tabular-nums">
                  {t.drawer.relFrom(formatDate(r.hieu_luc_tu))}
                </span>
              )}
              {issued && (
                <span className="font-mono text-xs text-ink-3 tabular-nums">
                  ·{" "}
                  {retro
                    ? t.drawer.issuedRetro(formatDate(issued))
                    : `${t.drawer.issued} ${formatDate(issued)}`}
                </span>
              )}
              {!issued && r.hoi_to === true && (
                <span className="text-xs text-ink-3">· {t.drawer.retroOnly}</span>
              )}
              {!applies && <span className="text-xs text-ink-3">· {t.drawer.relPending}</span>}
              {r.pham_vi && (
                <span lang="vi" className="basis-full text-xs text-ink-2">
                  {r.pham_vi}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The real backend returns the direct relations of a provision rather than a document chain, so
 * the drawer lists them in groups: amended by · amends · referred to by.
 */
function RelationList({
  view,
  applied,
}: {
  view: Pick<CitationView, "quan_he" | "sua_doi_toi" | "dan_chieu">;
  applied: IsoDate;
}) {
  const t = useT();
  const acting = view.quan_he ?? [];
  // Older backends mix references into chuoi_sua_doi; newer ones send `dan_chieu` separately.
  const amendedBy = dedupe(acting.filter((r) => r.loai !== "dan_chieu"));
  const referredBy = dedupe([
    ...acting.filter((r) => r.loai === "dan_chieu"),
    ...(view.dan_chieu ?? []),
  ]);
  const amends = dedupe(view.sua_doi_toi ?? []);
  if (amendedBy.length + referredBy.length + amends.length === 0)
    return <p className="text-sm text-ink-3">{t.drawer.noRelations}</p>;
  return (
    <div data-film="relation-list" className="flex flex-col gap-4">
      {amendedBy.length > 0 && (
        <RelationGroup
          title={t.drawer.amendedBy}
          relations={amendedBy}
          applied={applied}
          film="relation-amended-by"
        />
      )}
      {amends.length > 0 && (
        <RelationGroup
          title={t.drawer.amends}
          relations={amends}
          applied={applied}
          outgoing
          film="relation-amends"
        />
      )}
      {referredBy.length > 0 && (
        <RelationGroup
          title={t.drawer.referredBy}
          relations={referredBy}
          applied={applied}
          film="relation-referred-by"
        />
      )}
    </div>
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
            {(v.nguon_pdf || v.nguon_url) && (
              <div className="mt-2 flex flex-wrap gap-x-4">
                {v.nguon_pdf && (
                  <a
                    href={v.nguon_pdf}
                    target="_blank"
                    rel="noreferrer"
                    data-film="drawer-source-pdf"
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
                  >
                    {t.drawer.sourcePdf(v.trang_nguon ?? v.trang)}
                    <ExternalLink aria-hidden className="size-4" />
                  </a>
                )}
                {v.nguon_url && v.nguon_url !== v.nguon_pdf && (
                  <a
                    href={v.nguon_url}
                    target="_blank"
                    rel="noreferrer"
                    data-film="drawer-source"
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
                  >
                    {v.nguon_pdf ? t.drawer.sourcePage : t.drawer.source}
                    <ExternalLink aria-hidden className="size-4" />
                  </a>
                )}
              </div>
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
            (v.quan_he || v.sua_doi_toi || v.dan_chieu) && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-ink-2">{t.drawer.relations}</h3>
                <RelationList view={v} applied={applied} />
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
            landmark={false}
          />
        </div>
      )}
    </Drawer>
  );
}
