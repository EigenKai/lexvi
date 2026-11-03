/**
 * API contract between roles A, B and C — agreed 31/10/2026 (CLAUDE.md §5).
 * Field names are Vietnamese and must match the backend exactly. Do not change a field here
 * without agreeing it with A and B first.
 */

/** ISO date string, e.g. "2026-11-04". Display as dd/MM/yyyy (lib/format.ts). */
export type IsoDate = string;

export type LoaiVanBan = "luật" | "nghị định" | "thông tư" | "nghị quyết";

/** van_ban — a legal document. */
export interface VanBan {
  so_hieu: string;
  loai: LoaiVanBan;
  tieu_de: string;
  ngay_ban_hanh: IsoDate;
  hieu_luc_tu: IsoDate;
  het_hieu_luc: IsoDate | null;
  nguon_url: string;
}

/** dieu_khoan — an article/clause of a document. */
export interface DieuKhoan {
  id: string;
  so_hieu: string;
  dieu: number;
  khoan: number | null;
  noi_dung: string;
  trang: number;
}

export type LoaiQuanHe = "sua_doi" | "thay_the" | "bai_bo" | "huong_dan" | "dan_chieu";

/** quan_he — an edge in the amendment graph. */
export interface QuanHe {
  tu_id: string;
  den_id: string;
  loai: LoaiQuanHe;
  hieu_luc_tu: IsoDate;
}

/** ho_so — the business profile every answer depends on. */
export interface HoSo {
  loai_hinh: "ho_kinh_doanh" | "doanh_nghiep_nho";
  nganh: string;
  doanh_thu_nam: number;
  dia_ban: string;
}

export interface AskRequest {
  cau_hoi: string;
  ngay_ap_dung: IsoDate;
  ho_so: HoSo;
}

export interface TrichDan {
  id: string;
  cau_trich: string;
  trang: number;
}

export interface ChecklistItem {
  viec: string;
  han: IsoDate;
  can_cu: string;
}

export interface AskResponse {
  tra_loi: string;
  trich_dan: TrichDan[];
  checklist: ChecklistItem[];
  can_xac_nhan: boolean;
}

/* ─────────────────────────────────────────────────────────────────────────────
   PROPOSED EXTENSIONS — NOT IN THE AGREED CONTRACT. Agree with B before relying on them
   (CLAUDE.md §5 "Frontend implications", open decision 5). The UI degrades without them:
   no `kiem_chung` → the ribbon shows the final state only; no detail endpoint → the drawer
   shows only `cau_trich` and `trang`.
   ───────────────────────────────────────────────────────────────────────────── */

/** Proposed: the four checks run inside the submit tool (DESIGN.md §4.7). */
export type MaKiemChung = "ton_tai" | "con_hieu_luc" | "khop_nguyen_van" | "mo_hinh_danh_gia";

export interface BuocKiemChung {
  ma: MaKiemChung;
  dat: boolean;
  /** Why the check failed; sent back to the agent to fix. */
  ly_do?: string;
}

export interface LanKiemChung {
  lan_thu: number;
  buoc: BuocKiemChung[];
}

/** Proposed: `/ask` response with the verification attempts (max 3). */
export interface AskResponseMoRong extends AskResponse {
  kiem_chung?: LanKiemChung[];
}

/** Proposed: GET /dieu-khoan/{id} → the article, its document, and the amendment chain. */
export interface ChiTietDieuKhoan {
  dieu_khoan: DieuKhoan;
  van_ban: VanBan;
  /** Documents that set this rule, oldest first. */
  chuoi: NutChuoi[];
}

export interface NutChuoi {
  van_ban: Pick<VanBan, "so_hieu" | "loai" | "ngay_ban_hanh" | "hieu_luc_tu" | "het_hieu_luc">;
  /** Short statement of what this document set, e.g. "≤ 500 triệu đồng/năm". */
  noi_dung_ngan: string;
  /** Relation from this node to the previous one (null for the first node). */
  quan_he: LoaiQuanHe | null;
  /**
   * When this provision applies from, if different from the document's `hieu_luc_tu`
   * (e.g. a law in force on passage whose articles apply back to 1/1/2026).
   */
  ap_dung_tu?: IsoDate;
}

/** Legal status the UI derives for a document on the applied date. */
export type TrangThai =
  | "con_hieu_luc"
  | "da_sua_doi"
  | "het_hieu_luc"
  | "can_xac_nhan"
  | "huong_dan";
