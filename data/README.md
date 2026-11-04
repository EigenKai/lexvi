# Dữ liệu vai A — LexVi

Kho hữu hạn cho hộ kinh doanh/doanh nghiệp nhỏ, ưu tiên quán F&B. Mốc đối chiếu **03/11/2026**.
Đã có 30 văn bản, 689 điều, 3.586 mục điều/khoản, 195 cạnh (57 sửa đổi/bãi bỏ/thay thế/hướng dẫn và 138 dẫn chiếu),
20 câu hỏi với 11 bẫy. Xem [nguồn từng văn bản](SOURCES.md), [báo cáo kiểm tra](audit_report.json)
và [bàn giao A](../docs/ROLE_A_HANDOFF.md).

## Các file

| File | Nội dung |
|---|---|
| `van_ban.json` | 30 văn bản: số hiệu, loại, tiêu đề, ngày ban hành/hiệu lực/hết hiệu lực, URL |
| `dieu_khoan.json` | ID, số hiệu, điều, khoản, nội dung, trang đầu/cuối, đoạn trang, hiệu lực riêng |
| `quan_he.json` | Cạnh mới → cũ, loại, ngày, căn cứ, câu trích và phạm vi |
| `questions.json` | 20 ca tương thích `scripts.run_eval`: thêm đáp án, trích dẫn mẫu và căn cứ cũ phải loại |
| `sources.json` | Manifest nguồn metadata/PDF ký số/Công báo, các phần PDF và SHA-256 |
| `pages/*.json` | Chữ gốc/trích xuất từng trang; ánh xạ về URL và trang trong từng phần Công báo |
| `pdf/` | Bản ký số, phần Công báo, bản ghép đúng thứ tự để tra trang cục bộ |
| `transcriptions/` | Chính văn scan 204, 43, 398 đã đối chiếu hình ảnh bằng agent; không phải người ký duyệt |
| `metadata/` | Bản chụp HTML nguồn chính thức |

Giữ các trường theo hợp đồng A/B/C; trường bổ sung không yêu cầu đổi request `/ask`.
ID dùng ASCII `ND`: `68-2026-ND-CP-D3-K1`; `so_hieu` giữ đúng `68/2026/NĐ-CP`.
Điều chia khoản có một mục tiêu đề (`khoan=""`) và các mục khoản; mục tiêu đề không chứa toàn bộ Điều.
Số điều/khoản trong đoạn luật sửa đổi được trích trong dấu ngoặc kép không bị coi là số của văn bản bao ngoài.
Phụ lục/mẫu biểu giữ trong PDF/trang gốc, không biến số dòng trong mẫu thành khoản luật.

## Thời gian và đồ thị

- Ngày ISO; khoảng `[hieu_luc_tu, het_hieu_luc)`. Đến hết 31/12/2026 lưu điểm kết thúc 01/01/2027.
- Ngày ban hành khác ngày hiệu lực. Nghị định 141 ban hành 29/4/2026, hiệu lực 01/01/2026.
- Hiệu lực riêng từng mục ghi đè ngày mặc định; có căn cứ cho ngoại lệ ở Luật 48, 108, 109, 09.
- `sua_doi`, `thay_the`, `bai_bo` chặn mục cũ theo nguyên trạng; `huong_dan`, `dan_chieu` chỉ cung cấp liên kết.
- `pham_vi="bo_sung"` không vô hiệu hóa khoản cũ. Sửa một phần được chặn thận trọng ở mức mục đã lưu;
  chưa hợp nhất tới từng điểm. Không dùng chữ tự ghép làm câu trích từ PDF.
- Sửa cả Điều chặn các khoản con; sửa một khoản không chặn khoản anh em.
- Luật 38 có ngoại lệ chuyển tiếp tại Điều 53 Luật 108; không suy ra kết luận cho mọi hồ sơ cũ chỉ từ ngày hết hiệu lực chung.
- Không có cạnh không chứng minh rằng ngoài kho không có văn bản sửa đổi. Đây không phải kho thuế hợp nhất đầy đủ.

## B gọi trực tiếp

```python
from pathlib import Path
from lexvi.store import LawStore

store = LawStore(Path("data"))
record = store.provision("68-2026-ND-CP-D3-K1")
status = store.status(record["id"], "2026-11-03")
chain = store.trace(record["id"])
hits = store.search_on("doanh thu thuế hộ kinh doanh", "2026-11-03", limit=8)
places = store.quote_locations("43-2026-QH16-D1-K2", "sau khi đã trừ ưu đãi thuế.")
# places[0]['trang'] == 2, dù khoản bắt đầu ở trang 1.
store.status("141-2026-ND-CP-D1-K1", "2026-01-01")
store.status("141-2026-ND-CP-D1-K1", "2026-01-01", known_on="2026-04-28")
```

`known_on` là ngày ban hành đã biết, không phải chứng cứ ngày công bố/nhập hệ thống.
Không truyền nghĩa là xét mọi sửa đổi có trong kho hiện tại cho ngày áp dụng.
`status` là kiểm tra dữ liệu đã mã hóa, không phải kết luận pháp lý cho hồ sơ cụ thể.

## Dựng lại offline

```powershell
python -m pip install -r requirements-data.txt
python -m scripts.rebuild_a
python -m pytest -q
```

Không cần key hoặc mạng. `scripts/build_corpus.py` là thử nghiệm Spark ban đầu; không dùng đè bộ dữ liệu đã kiểm tra.
Để tải lại chính thức, chạy tuần tự `scripts.fetch_official`, `scripts.fetch_gazette`, `scripts.source_transcriptions`,
`scripts.prepare_pages`, rồi `scripts.rebuild_a`. OCR dùng PyMuPDF/Tesseract `vie+eng`, đặt `LEXVI_TESSDATA` tới traineddata.
Trang có chữ ngắn vẫn giữ chữ gốc; scan chưa đối chiếu bị chặn làm căn cứ hiện hành.

`audit_report.json` không có số đo Spark/RAG. Test kiểm ID, trang, nguyên văn, ngày và cạnh đã mã hóa.
Người ký duyệt còn để trống; cần người trong nhóm rà soát pháp lý trước công bố.
