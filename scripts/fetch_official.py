"""Download the bounded role-A corpus. Only government origins are accepted."""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SEEDS = {
    "48/2024/QH15": 212476, "149/2025/QH15": 216588,
    "09/2026/QH16": 218095, "109/2025/QH15": 216495,
    "108/2025/QH15": 216541, "38/2019/QH14": 197312,
    "68/2026/NĐ-CP": 217111, "141/2026/NĐ-CP": 217960,
    "18/2026/TT-BTC": 217174, "50/2026/TT-BTC": 218092,
    "198/2025/QH15": 213695, "20/2026/NĐ-CP": 216660,
    "67/2025/QH15": 214607, "320/2025/NĐ-CP": 216219,
    "204/2025/QH15": 214209, "174/2025/NĐ-CP": 214310,
    "70/2025/NĐ-CP": 213179, "123/2020/NĐ-CP": 201365,
    "32/2025/TT-BTC": 213855, "100/2021/TT-BTC": 204799,
    "254/2026/NĐ-CP": 218689, "91/2026/TT-BTC": 219006,
    "43/2026/QH16": 219330, "398/2026/NĐ-CP": 220138,
    "90/2025/QH15": 214558, "181/2025/NĐ-CP": 214336,
    "359/2025/NĐ-CP": 216388, "144/2026/NĐ-CP": 218020,
    "252/2026/NĐ-CP": 218690,
    "40/2021/TT-BTC": "https://congbao.chinhphu.vn/van-ban/thong-tu-so-40-2021-tt-btc-33850.htm",
}


def slug(s):
    return s.replace("Đ", "D").replace("/", "-")


def official(url):
    host = urlparse(url).hostname or ""
    return host.endswith(".chinhphu.vn") or host == "chinhphu.vn" or host.endswith(".cdnchinhphu.vn") or host.endswith(".gov.vn") or host == "vbpl.vn"


def get(url):
    if not official(url):
        raise ValueError(f"Non-official URL: {url}")
    response = requests.get(url, timeout=(15, 90))
    response.raise_for_status()
    if not official(response.url):
        raise ValueError("Redirected outside government origins")
    return response


def iso(s):
    return datetime.strptime(s.strip(), "%d-%m-%Y").date().isoformat()


def fetch(item):
    number, ref = item
    url = f"https://vanban.chinhphu.vn/?pageid=27160&docid={ref}" if isinstance(ref, int) else ref
    html_path = DATA / "metadata" / (slug(number) + ".html")
    html = html_path.read_bytes() if html_path.exists() else get(url).content
    html_path.write_bytes(html)
    soup = BeautifulSoup(html, "html.parser")
    cells = {}
    for tr in soup.select("tr"):
        td = tr.find_all("td", recursive=False)
        if len(td) == 2:
            cells[td[0].get_text(" ", strip=True)] = td[1].get_text(" ", strip=True)
    if isinstance(ref, int):
        if cells.get("Số ký hiệu") != number:
            raise ValueError(f"Unexpected metadata for {number}: {cells.get('Số ký hiệu')}")
        row = {"so_hieu": number, "loai": cells["Loại văn bản"], "tieu_de": cells["Trích yếu"],
               "ngay_ban_hanh": iso(cells["Ngày ban hành"]), "hieu_luc_tu": iso(cells["Ngày có hiệu lực"])}
    else:
        row = {"so_hieu": number, "loai": "Thông tư", "tieu_de": "Hướng dẫn thuế giá trị gia tăng, thuế thu nhập cá nhân và quản lý thuế đối với hộ kinh doanh, cá nhân kinh doanh",
               "ngay_ban_hanh": "2021-06-01", "hieu_luc_tu": "2021-08-01"}
    pdfs = [a["data-href"] for a in soup.select(".itemtep[data-href]") if ".pdf" in a["data-href"].lower()]
    if not pdfs:
        pdfs = [urljoin(url, a["href"]) for a in soup.select("a[href]") if ".pdf" in a["href"].lower()]
    if not pdfs:
        raise ValueError(f"No PDF link: {url}")
    pdf_url = pdfs[0]
    filename = slug(number) + ".pdf"
    pdf_path = DATA / "pdf" / filename
    content = pdf_path.read_bytes() if pdf_path.exists() else get(pdf_url).content
    if not content.startswith(b"%PDF"):
        raise ValueError(f"Not a PDF: {pdf_url}")
    pdf_path.write_bytes(content)
    row.update(het_hieu_luc=None, nguon_url=url, pdf_url=pdf_url, file=filename,
               sha256=hashlib.sha256(content).hexdigest(), so_byte=len(content),
               metadata_file=f"metadata/{html_path.name}",
               doi_chieu_ngay="2026-11-03", tai_luc_utc=datetime.now(timezone.utc).isoformat())
    return row


def main():
    for folder in ("pdf", "metadata"):
        (DATA / folder).mkdir(parents=True, exist_ok=True)
    rows = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for row in pool.map(fetch, SEEDS.items()):
            rows.append(row)
            print(row["so_hieu"], row["so_byte"], flush=True)
    (DATA / "sources.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
