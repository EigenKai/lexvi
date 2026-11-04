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
  /* Not in the 31/10 contract; sent by the backend as built (H3). */
  /** Issue date of the acting document, when known. */
  ngay_ban_hanh?: IsoDate;
  /** What part of the provision the relation acts on (backend wording). */
  pham_vi?: string;
  /** True when the acting document applies retroactively. */
  hoi_to?: boolean;
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
  dieu_khoan: DieuKhoan & {
    /** Link to the official PDF at the cited page, e.g. "…/141-2026.pdf#page=3". */
    nguon_pdf?: string;
    /** Page number inside that PDF file, when it differs from the printed `trang`. */
    trang_nguon?: number;
  };
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

/* ─────────────────────────────────────────────────────────────────────────────
   POST /ingest — matches the backend as built (lexvi/ingest.py + lexvi/api.py, commit 7b71ce0),
   which supersedes the 31/10 `/ingest` sketch: request is multipart `pdf` (file) + `ho_so`
   (JSON string); every change is checked by code (verbatim excerpt, target exists) before
   it is returned, and failures are listed in `bi_loai`.
   ───────────────────────────────────────────────────────────────────────────── */

export type LoaiThayDoi = "sua_doi" | "thay_the" | "bai_bo" | "huong_dan";

export interface VanBanMoi {
  so_hieu: string;
  tieu_de: string;
  /** YYYY-MM-DD as read by the model from the new document. */
  hieu_luc_tu: string;
  /** YYYY-MM-DD issue date, when known. Later than `hieu_luc_tu` → retroactive. */
  ngay_ban_hanh?: string;
}

export interface ThayDoi {
  /** One sentence copied verbatim from the new document. */
  trich_doan: string;
  loai: LoaiThayDoi;
  /** Id of the stored provision this change acts on. */
  dieu_bi_tac_dong: string;
  anh_huong_toi_ho_so: boolean;
  giai_thich: string;
  viec_can_lam: string;
  /** YYYY-MM-DD, or "" when the document states no deadline. */
  han: string;
}

export interface DieuBiAnhHuong extends ThayDoi {
  dieu_cu: { id: string; so_hieu: string; noi_dung: string };
}

export interface ViecCanLamIngest {
  viec: string;
  han: string;
  can_cu: string;
  trich_doan: string;
}

export interface IngestResponse {
  van_ban_moi: VanBanMoi;
  dieu_bi_anh_huong: DieuBiAnhHuong[];
  viec_can_lam: ViecCanLamIngest[];
  bi_loai: (ThayDoi & { ly_do: string })[];
  /** Always true: a new regulation is confirmed by an accountant before acting. */
  can_xac_nhan: true;
}

/* ─────────────────────────────────────────────────────────────────────────────
   UI view models (not wire formats). Built by lib/api/adapter.ts from the real backend
   (POST /ask + GET /runs/{run_id}) or from the mocks, so the UI has a single code path.
   ───────────────────────────────────────────────────────────────────────────── */

/** Everything the citation chip and drawer may show. Unknown fields are left out, not guessed. */
export interface CitationView {
  id: string;
  cau_trich: string;
  trang: number;
  /** The claim this quote supports (backend `nhan_dinh`). */
  nhan_dinh?: string;
  so_hieu?: string;
  loai?: string;
  tieu_de?: string;
  ngay_ban_hanh?: IsoDate;
  hieu_luc_tu?: IsoDate;
  het_hieu_luc?: IsoDate | null;
  nguon_url?: string;
  /** Official PDF at the cited page (backend `vi_tri_nguon[0].nguon_pdf`, "…pdf#page=N"). */
  nguon_pdf?: string;
  /** Page inside the PDF file (backend `vi_tri_nguon[0].trang_nguon`). */
  trang_nguon?: number;
  /** Article and clause as strings ("10a" happens). */
  dieu?: string;
  khoan?: string;
  noi_dung?: string;
  /** Legal status on the applied date, when known. */
  trang_thai?: TrangThai;
  /** The backend's own wording of the status (e.g. "đã bị sua_doi bởi …"). */
  tinh_trang_text?: string;
  /** Full chain with document dates (mock / future endpoint). */
  chuoi?: NutChuoi[];
  /**
   * Direct relations acting on this provision: backend `bi_sua_doi_boi`, or the older
   * `chuoi_sua_doi` when that is all the backend sends.
   */
  quan_he?: QuanHe[];
  /** Relations from this provision to the ones it amends (backend `sua_doi_toi`). */
  sua_doi_toi?: QuanHe[];
  /** Provisions that refer to this one (backend `dan_chieu`). */
  dan_chieu?: QuanHe[];
}

export interface RunMeta {
  run_id?: string;
  /** answered | needs_review | running | api_error */
  trang_thai?: string;
  so_luot?: number;
  thoi_gian_giay?: number;
  /** Problems left after the last refusal (backend `van_de_chua_giai_quyet`). */
  van_de?: string[];
}

export interface AskResult {
  response: AskResponseMoRong;
  /** One view per `response.trich_dan` entry, same index (a provision may be cited twice). */
  views: CitationView[];
  meta: RunMeta;
}
