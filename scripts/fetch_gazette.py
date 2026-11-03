"""Get text-layer Công báo editions; retain signed originals and per-part provenance."""
import concurrent.futures
import hashlib
import json
from pathlib import Path

import pymupdf
from bs4 import BeautifulSoup

from scripts.fetch_official import DATA, get, slug

PAGES = {
"149/2025/QH15": "luat-so-149-2025-qh15-468709/61734.htm",
"09/2026/QH16": "luat-so-09-2026-qh16-469536.htm",
"108/2025/QH15": "luat-so-108-2025-qh15-468670/61635.htm",
"38/2019/QH14": "luat-so-38-2019-qh14-29256.htm",
"68/2026/NĐ-CP": "nghi-dinh-so-68-2026-nd-cp-469047.htm",
"141/2026/NĐ-CP": "nghi-dinh-so-141-2026-nd-cp-469455.htm",
"18/2026/TT-BTC": "thong-tu-so-18-2026-tt-btc-469080.htm",
"50/2026/TT-BTC": "thong-tu-so-50-2026-tt-btc-469544.htm",
"198/2025/QH15": "nghi-quyet-so-198-2025-qh15-44898.htm",
"20/2026/NĐ-CP": "nghi-dinh-so-20-2026-nd-cp-468782/62000.htm",
"67/2025/QH15": "luat-so-67-2025-qh15-45557.htm",
"320/2025/NĐ-CP": "nghi-dinh-so-320-2025-nd-cp-46841.htm",
"204/2025/QH15": "nghi-quyet-so-204-2025-qh15-45219/57028.htm",
"174/2025/NĐ-CP": "nghi-dinh-so-174-2025-nd-cp-45374/57334.htm",
"70/2025/NĐ-CP": "nghi-dinh-so-70-2025-nd-cp-44623/55799.htm",
"123/2020/NĐ-CP": "nghi-dinh-so-123-2020-nd-cp-32290.htm",
"32/2025/TT-BTC": "thong-tu-so-32-2025-tt-btc-45039.htm",
"100/2021/TT-BTC": "thong-tu-so-100-2021-tt-btc-34948.htm",
"254/2026/NĐ-CP": "nghi-dinh-so-254-2026-nd-cp-469957/66826.htm",
"91/2026/TT-BTC": "thong-tu-so-91-2026-tt-btc-470171.htm",
"90/2025/QH15": "luat-so-90-2025-qh15-45389.htm",
"181/2025/NĐ-CP": "nghi-dinh-so-181-2025-nd-cp-45379.htm",
"359/2025/NĐ-CP": "nghi-dinh-so-359-2025-nd-cp-468511/61049.htm",
"144/2026/NĐ-CP": "nghi-dinh-so-144-2026-nd-cp-469482/64704.htm",
"252/2026/NĐ-CP": "nghi-dinh-so-252-2026-nd-cp-469958.htm",
"109/2025/QH15": "https://congbaocdn.chinhphu.vn/180507251028987904/2026/1/24/109signed-17692403594311667615452.pdf",
}


def process(row):
    number = row["so_hieu"]
    if number not in PAGES:
        return row
    url = PAGES[number]
    if not url.startswith("http"):
        url = "https://congbao.chinhphu.vn/van-ban/" + url
    if url.endswith(".pdf"):
        pdf_urls = [url]
    else:
        path = DATA / "metadata" / (slug(number) + "-gazette.html")
        html = path.read_bytes() if path.exists() else get(url).content
        path.write_bytes(html)
        soup = BeautifulSoup(html, "html.parser")
        pdf_urls = list(dict.fromkeys(a["data-href"] for a in soup.select(".itemtep[data-href]") if ".pdf" in a["data-href"]))
    if not pdf_urls:
        raise ValueError(f"No gazette PDF: {number} {url}")
    parts, merged = [], pymupdf.open()
    for i, pdf_url in enumerate(pdf_urls, 1):
        file = slug(number) + f"-gazette-{i}.pdf"
        path = DATA / "pdf" / file
        content = path.read_bytes() if path.exists() else get(pdf_url).content
        path.write_bytes(content)
        doc = pymupdf.open(stream=content, filetype="pdf")
        parts.append({"file": file, "url": pdf_url, "sha256": hashlib.sha256(content).hexdigest(),
                      "trang_tu": len(merged) + 1, "so_trang": len(doc)})
        merged.insert_pdf(doc)
    file = slug(number) + "-text.pdf"
    merged.save(DATA / "pdf" / file)
    row.update(file_ky_so=row.get("file_ky_so", row["file"]), file=file, nguon_toan_van=url,
               pdf_parts=parts, so_trang=len(merged),
               sha256_text=hashlib.sha256((DATA / "pdf" / file).read_bytes()).hexdigest())
    chars = sum(len(p.get_text()) for p in merged)
    print(number, len(merged), chars, flush=True)
    return row


def main():
    path = DATA / "sources.json"
    rows = json.loads(path.read_text(encoding="utf-8"))
    updated = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for row in pool.map(process, rows):
            updated.append(row)
    path.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
