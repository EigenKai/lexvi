import type { IsoDate, NutChuoi, QuanHe, TrangThai } from "./api/contract";
import { compareIso } from "./format";

export type NodeState = "current" | "superseded" | "expired" | "future";

/** When a chain node's rule applies from: the provision date if given, else the document's. */
export function appliesFrom(n: NutChuoi): IsoDate {
  return n.ap_dung_tu ?? n.van_ban.hieu_luc_tu;
}

/**
 * State of each chain node on the applied date.
 * - future: not yet applicable on that date.
 * - expired: het_hieu_luc on or before that date, or repealed (bai_bo) by an applicable later node.
 *   `het_hieu_luc` is treated as exclusive (the document no longer applies on that day) —
 *   confirm this reading with role A.
 * - current: the last applicable node, plus any applicable node that later nodes only *guide*
 *   (huong_dan / dan_chieu) — e.g. a law that delegates a figure to a decree stays in force.
 * - superseded: applicable earlier, later amended or replaced.
 */
export function chainStates(chain: NutChuoi[], applied: IsoDate): NodeState[] {
  const future = chain.map((n) => compareIso(appliesFrom(n), applied) > 0);
  const effective = chain.map(
    (n, i) =>
      !future[i] &&
      // null or "" = no end date.
      (!n.van_ban.het_hieu_luc || compareIso(applied, n.van_ban.het_hieu_luc) < 0),
  );
  let lastEffective = -1;
  effective.forEach((e, i) => {
    if (e) lastEffective = i;
  });

  return chain.map((_, i) => {
    if (future[i]) return "future";
    if (!effective[i]) return "expired";
    // Repealed by the next node once that node applies.
    if (chain[i + 1]?.quan_he === "bai_bo" && effective[i + 1]) return "expired";
    if (i === lastEffective) return "current";
    // Current if every applicable later node up to the last one only guides/refers.
    for (let j = i + 1; j <= lastEffective; j++) {
      const rel = chain[j].quan_he;
      if (effective[j] && rel !== "huong_dan" && rel !== "dan_chieu") return "superseded";
    }
    return "current";
  });
}

/**
 * The node to highlight as "the rule in force": the last current node that isn't itself a
 * repealing document (a repeal leaves no rule in force). -1 when none.
 */
export function highlightIndex(chain: NutChuoi[], states: NodeState[]): number {
  for (let i = chain.length - 1; i >= 0; i--) {
    if (states[i] === "current" && chain[i].quan_he !== "bai_bo") return i;
  }
  return -1;
}

/** Status of a cited document on the applied date, from its chain. */
export function citationStatus(soHieu: string, chain: NutChuoi[], applied: IsoDate): TrangThai {
  const i = chain.findIndex((n) => n.van_ban.so_hieu === soHieu);
  if (i < 0) return "can_xac_nhan";
  const state = chainStates(chain, applied)[i];
  if (state === "current") return "con_hieu_luc";
  if (state === "superseded") return "da_sua_doi";
  if (state === "expired") return "het_hieu_luc";
  return "can_xac_nhan";
}

/** Statuses a verified answer may cite. Anything else forces "cần kế toán xác nhận". */
export function isCitableStatus(s: TrangThai | null): boolean {
  // null = backend gave no detail, so the UI cannot judge; the server's can_xac_nhan decides.
  return s === null || s === "con_hieu_luc" || s === "huong_dan";
}

/** The fields of a citation view that `citableInAnswer` reads. */
export interface CitedView {
  id: string;
  so_hieu?: string;
  trang_thai?: TrangThai;
  chuoi?: NutChuoi[];
  quan_he?: QuanHe[];
}

const OVERRIDES = new Set(["sua_doi", "thay_the"]);

/**
 * An amended provision is still citable when the answer also cites what amended it (read
 * together, the two give the rule in force):
 * (a) real backend: one of its overriding relations' `tu_id` is another cited provision;
 * (b) mock / detail views: a later `sua_doi` node in its chain is the document of another cited
 *     view that is itself in force.
 */
export function isCitedWithAmender(view: CitedView, all: CitedView[]): boolean {
  if (view.trang_thai !== "da_sua_doi") return false;
  const others = all.filter((o) => o !== view);
  const ids = new Set(others.map((o) => o.id));
  if (view.quan_he?.some((q) => OVERRIDES.has(q.loai) && ids.has(q.tu_id))) return true;
  const chain = view.chuoi;
  if (!chain || !view.so_hieu) return false;
  const at = chain.findIndex((n) => n.van_ban.so_hieu === view.so_hieu);
  if (at < 0) return false;
  const inForce = new Set(
    others.filter((o) => o.trang_thai === "con_hieu_luc" && o.so_hieu).map((o) => o.so_hieu),
  );
  return chain.slice(at + 1).some((n) => n.quan_he === "sua_doi" && inForce.has(n.van_ban.so_hieu));
}

/** Whether each cited view may stand in a verified answer (see isCitableStatus). */
export function citableInAnswer(view: CitedView, all: CitedView[]): boolean {
  return isCitableStatus(view.trang_thai ?? null) || isCitedWithAmender(view, all);
}

/** Issued after the applied date but applying on or before it → applied retroactively. */
export function isRetroactive(
  issued: IsoDate,
  appliesFromDate: IsoDate,
  applied: IsoDate,
): boolean {
  return compareIso(issued, applied) > 0 && compareIso(appliesFromDate, applied) <= 0;
}
