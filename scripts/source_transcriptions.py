"""Reproduce agent-reviewed body transcriptions of three scanned originals.

These are not human sign-offs. Page boundaries were checked against rendered PDFs.
Original pixels and raw extraction stay in data/pdf and data/pages.
"""
import json
import re

from bs4 import BeautifulSoup
from scripts.fetch_official import DATA, get


def write(name, pages):
    dest = DATA / "transcriptions"
    dest.mkdir(exist_ok=True)
    (dest / (name + ".json")).write_text(json.dumps(pages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    write("204-2025-QH15", {"1": """Điều 1. Phạm vi áp dụng
1. Giảm 2% thuế suất thuế giá trị gia tăng, áp dụng đối với các nhóm hàng hóa, dịch vụ quy định tại khoản 3 Điều 9 của Luật Thuế giá trị gia tăng số 48/2024/QH15 (còn 8%), trừ một số nhóm hàng hóa, dịch vụ sau: viễn thông, hoạt động tài chính, ngân hàng, chứng khoán, bảo hiểm, kinh doanh bất động sản, sản phẩm kim loại, sản phẩm khai khoáng (trừ than), sản phẩm hàng hóa và dịch vụ chịu thuế tiêu thụ đặc biệt (trừ xăng).
2. Chính phủ quy định chi tiết khoản 1 Điều này.
Điều 2. Hiệu lực thi hành
Nghị quyết này có hiệu lực thi hành từ ngày 01 tháng 7 năm 2025 đến hết ngày 31 tháng 12 năm 2026."""})
    write("43-2026-QH16", {"1": """Điều 1. Giảm thuế thu nhập cá nhân, giảm thuế thu nhập doanh nghiệp
1. Giảm 30% số thuế thu nhập cá nhân phải nộp của kỳ tính thuế năm 2026 và năm 2027 đối với thu nhập từ kinh doanh của cá nhân cư trú có mức doanh thu hằng năm của năm 2026, năm 2027 không quá 10 tỷ đồng.
2. Giảm 30% số thuế thu nhập doanh nghiệp phải nộp của kỳ tính thuế năm 2026 và năm 2027 đối với thu nhập của doanh nghiệp, tổ chức được thành lập theo quy định của pháp luật Việt Nam có mức doanh thu hằng năm của năm 2026, năm 2027 không quá 10 tỷ đồng; trừ các doanh nghiệp được hình thành từ việc chia, tách doanh nghiệp sau ngày Nghị quyết này có hiệu lực, mà tổng doanh thu hằng năm của năm 2026, năm 2027 của các doanh""",
        "2": """nghiệp sau chia, tách trên 10 tỷ đồng. Trường hợp doanh nghiệp đang được ưu đãi thuế theo quy định của Luật Thuế thu nhập doanh nghiệp hoặc các luật, nghị quyết khác của Quốc hội thì số thuế thu nhập doanh nghiệp được giảm quy định tại khoản này tính trên số thuế thu nhập doanh nghiệp phải nộp sau khi đã trừ ưu đãi thuế.
Điều 2. Hiệu lực thi hành
1. Nghị quyết này có hiệu lực thi hành từ ngày 24 tháng 8 năm 2026 và áp dụng cho kỳ tính thuế năm 2026, năm 2027.
2. Chính phủ quy định chi tiết Nghị quyết này."""})
    url = "https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-398-2026-nd-cp-ve-giam-thue-thu-nhap-ca-nhan-thue-thu-nhap-doanh-nghiep-doi-voi-ca-nhan-va-doanh-nghiep-119261031044659307.htm"
    path = DATA / "metadata" / "398-2026-ND-CP-text.html"
    raw = path.read_bytes() if path.exists() else get(url).content
    path.write_bytes(raw)
    soup = BeautifulSoup(raw, "html.parser").select_one(".detail-content")
    t = [re.sub(r"\s+", " ", p.get_text(" ", strip=True)).strip() for p in soup.select("p,h2,h3")]
    assert len(t) == 35 and t[3].startswith("1-") and t[32].startswith("Nghị định này có hiệu lực")
    t = [re.sub(r"^(\d)-\s*", r"\1. ", p) for p in t]
    t[3] = t[3].replace("(cá nhân kinh doanh)", "(sau đây gọi là cá nhân kinh doanh)")
    t[5] = t[5].replace("chính sách thuế đối với hộ", "chính sách thuế và quản lý thuế đối với hộ")
    t[15] = t[15].replace("(doanh nghiệp)", "(sau đây gọi là doanh nghiệp)")
    t[1] = "Điều 2. " + t[1]
    t[13] = "Điều 3. " + t[13]
    t[32] = t[32].replace("29/10/2026", "ngày 29 tháng 10 năm 2026").replace("kể từ ngày ngày", "kể từ ngày")
    # The signed source splits article 2 clause 4 between pages 2 and 3.
    write("398-2026-ND-CP", {
        "1": "\n".join(["Điều 1. Phạm vi điều chỉnh", t[0], t[1], t[3], t[4]]),
        "2": "\n".join(t[5:12]),
        "3": "\n".join([t[12], t[13], *t[15:24]]),
        "4": "\n".join([*t[24:32], "Điều 4. Hiệu lực thi hành", t[32]]),
        "5": """Điều 5. Trách nhiệm thi hành
1. Trong quá trình thực hiện nếu phát sinh vướng mắc giao Bộ Tài chính hướng dẫn thực hiện.
2. Các Bộ trưởng, Thủ trưởng cơ quan ngang bộ, Chủ tịch Ủy ban nhân dân tỉnh, thành phố và các tổ chức, cá nhân có liên quan chịu trách nhiệm thi hành Nghị định này.
Nơi nhận:"""
    })


if __name__ == "__main__":
    main()
