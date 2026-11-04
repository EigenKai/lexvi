// Extract the provisions the demo mocks cite from role A's corpus (../data), verbatim.
// Output: lib/api/mock-corpus.json. Re-run after the corpus changes: `pnpm mock:corpus`.
// Nothing here is written by hand: texts, pages, dates and links come from the data files.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const data = join(here, "..", "..", "data");
const out = join(here, "..", "lib", "api", "mock-corpus.json");

const IDS = [
  "40-2021-TT-BTC-D4-K2",
  "48-2024-QH15-D5-K25",
  "149-2025-QH15-D1-K1",
  "109-2025-QH15-D7-K1",
  "09-2026-QH16-D1",
  "09-2026-QH16-D2",
  "68-2026-ND-CP-D3-K1",
  "68-2026-ND-CP-D4-K1",
  "68-2026-ND-CP-D8-K1",
  "68-2026-ND-CP-D8-K5",
  "141-2026-ND-CP-D1-K1",
  "141-2026-ND-CP-D1-K2",
  "141-2026-ND-CP-D3",
  "141-2026-ND-CP-D4-K1",
  "70-2025-ND-CP-D1-K8",
  "18-2026-TT-BTC-D9-K2",
];

const read = (f) => JSON.parse(readFileSync(join(data, f), "utf8"));
const provisions = new Map(read("dieu_khoan.json").map((p) => [p.id, p]));
const documents = new Map(read("van_ban.json").map((d) => [d.so_hieu, d]));
const slug = (soHieu) => soHieu.replaceAll("/", "-").replace("NĐ", "ND");

function pageInfo(soHieu, trang) {
  try {
    const raw = read(join("pages", `${slug(soHieu)}.json`));
    const pages = Array.isArray(raw) ? raw : (raw.pages ?? []);
    const page = pages.find((p) => p.trang === trang) ?? pages[trang - 1];
    if (!page?.nguon_url) return {};
    const trang_nguon = page.trang_nguon ?? trang;
    return { trang_nguon, nguon_pdf: `${page.nguon_url}#page=${trang_nguon}` };
  } catch {
    return {};
  }
}

const docs = {};
const provs = {};
for (const id of IDS) {
  const p = provisions.get(id);
  if (!p) throw new Error(`not in corpus: ${id}`);
  const d = documents.get(p.so_hieu);
  if (!d) throw new Error(`document not in corpus: ${p.so_hieu}`);
  docs[d.so_hieu] = {
    so_hieu: d.so_hieu,
    loai: String(d.loai).toLowerCase(),
    tieu_de: d.tieu_de,
    ngay_ban_hanh: d.ngay_ban_hanh,
    hieu_luc_tu: d.hieu_luc_tu,
    het_hieu_luc: d.het_hieu_luc || null,
    nguon_url: d.nguon_url,
  };
  const trang = Number(p.trang);
  provs[id] = {
    id,
    so_hieu: p.so_hieu,
    dieu: Number(p.dieu),
    khoan: p.khoan === "" || p.khoan == null ? null : Number(p.khoan),
    noi_dung: p.noi_dung,
    trang,
    ...pageInfo(p.so_hieu, trang),
    hieu_luc_tu: p.hieu_luc_tu || d.hieu_luc_tu,
    het_hieu_luc: p.het_hieu_luc || d.het_hieu_luc || null,
  };
}

writeFileSync(
  out,
  `${JSON.stringify({ nguon: "data/ (role A corpus, verbatim)", van_ban: docs, dieu_khoan: provs }, null, 2)}\n`,
);
const missingPdf = Object.values(provs)
  .filter((p) => !p.nguon_pdf)
  .map((p) => p.id);
console.log(
  `wrote ${Object.keys(provs).length} provisions, ${Object.keys(docs).length} documents → ${out}`,
);
if (missingPdf.length) console.log(`no PDF link for: ${missingPdf.join(", ")}`);
