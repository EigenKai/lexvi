# Bàn giao vai A — toàn bộ lịch LexVi

Đã triển khai trực tiếp trong repo `D:\Hung-Dung\HCMUT\Competitions\MetaHackathon\lexvi`.
Công việc thực hiện ngày 03/11/2026 theo bản phân công. Các ngày dưới đây là đầu việc của kế hoạch,
không phải khai báo đã làm hoặc commit lùi ngày.

## Đối chiếu từng ngày

| Đầu việc trong kế hoạch | Kết quả bàn giao |
|---|---|
| Tối 30/10: danh sách văn bản | 30 nguồn chính thức, ngày ban hành/hiệu lực, link và hash trong `data/sources.json`, `data/SOURCES.md` |
| Sáng 31/10: 3–5 văn bản thử khả thi, định dạng | `demo/role_a/before` có 4 văn bản thật; JSON đúng hợp đồng; ví dụ gọi `LawStore` |
| Chiều 31/10: tải đủ văn bản, bảng `van_ban` | PDF ký số + bản Công báo; `data/van_ban.json` đủ 30 dòng |
| 01/11: tách điều/khoản giữ trang, đồ thị | 689 điều, 3.586 mục; 1.326 trang nguồn, 4.220 đoạn trang; 195 cạnh có chứng cứ |
| 02/11: 15–20 câu QA, tối thiểu 5 bẫy | `data/questions.json`: 20 ca, 11 bẫy, đáp án và 27 căn cứ có định vị trang |
| 02/11: văn bản mới cho demo | Nghị định 141/2026, PDF chữ, snapshot trước/sau, hồ sơ quán 700 triệu và kết quả tham chiếu |
| 03/11: soát citation demo, nguồn README | Câu trích mẫu được định vị theo trang, đối chiếu bản gốc; bảng nguồn từng văn bản và test căn cứ cũ |
| 04/11: kiểm chéo README, phần làm mới | README ghi công việc mới và ngày thực hiện thật; không điền số đo model chưa chạy |

Phần cần thành viên thật xác nhận: đọc/duyệt pháp lý của dữ liệu, đáp án và đồ thị; xem video/README chung khi B/C ghép xong.
Không tự gắn tên người duyệt hoặc đánh dấu họp/kiểm chéo nhóm đã diễn ra.

## Kết quả kiểm tra

- `python -m scripts.audit_data`: không lỗi; hash bản gốc, đủ điều theo thứ tự, ID duy nhất, cạnh không treo, chứng cứ có trong nguồn.
- 27 căn cứ mẫu của 20 câu có hiệu lực theo dữ liệu vào ngày hỏi, nguyên văn và có trang nguồn.
- 13 ví dụ căn cứ cũ bị từ chối đúng ngày; 11 câu hỏi có bẫy thời gian.
- `python -m pytest -q`: 28 test qua, gồm 18 test backend sẵn có và 10 test dữ liệu thật/biên thời gian.
- Không còn mục chính văn dùng OCR chưa đối chiếu. Mẫu biểu scan giữ trong PDF/trang nguồn, không biến thành điều/khoản.

Đây là kiểm tra dữ liệu và logic xác minh, **không phải** độ chính xác Spark hay chứng nhận pháp lý.
Đáp án mang nhãn agent đã đối chiếu nguồn, người ký duyệt để `null`.

## Nối vào B

Backend mặc định đã đọc `data/van_ban.json`, `dieu_khoan.json`, `quan_he.json`; không cần migration.
`data/questions.json` tương thích `python -m scripts.run_eval`.

- `LawStore` giữ hiệu lực từng mục, chặn các khoản con khi cả Điều bị sửa, phân biệt bổ sung/thay thế, có `known_on`.
- Có `search_on`, `trace`, `source_pages`, `quote_locations` để B gọi độc lập không cần API key.
- `verify` đối chiếu số trang nếu có; `agent` trả vị trí của câu trích thay vì luôn lấy trang đầu khoản.
- Hai phép đọc log trong test cũ đã thêm UTF-8 để chạy được trên Windows.

Muốn xem nguyên trạng khoản đã sửa, dùng `provision` và `trace`; không coi bản cũ là đang có hiệu lực.
Một số cạnh sửa một phần chặn cả mục ở mức khoản; chưa có bản hợp nhất tới từng điểm. Phần không bị sửa có thể cần tách thêm hoặc người xác nhận.
Không tự ghép chữ mới rồi gọi đó là trích dẫn từ PDF gốc.

Kho hữu hạn phục vụ demo F&B. Ví dụ Luật 67 và Luật 38 có sửa đổi/liên hệ ngoài 30 văn bản đang giữ;
không quảng bá là kho luật thuế đã hợp nhất đầy đủ. B cần giới hạn câu hỏi và chuyển người xác nhận khi vượt phạm vi.

## Cảnh “có văn bản mới” cho C/B

Nhãn trên màn hình: **Phát lại lịch sử: Nghị định 141/2026 được bổ sung vào kho**.
Không nói văn bản này vừa ban hành hôm nay.

1. Dùng `LEXVI_DATA_DIR=demo/role_a/before`: 4 văn bản thật, trạng thái trước khi có Nghị định 141.
2. Hồ sơ quán cà phê: hộ kinh doanh, doanh thu năm 700 triệu, TP.HCM. Ngày áp dụng 01/4/2026.
3. Đưa `demo/role_a/van-ban-moi-141-2026.pdf` vào `/ingest`. Đây là bản Công báo có chữ; luồng `pypdf` không đọc được bản ký số scan.
4. So kỳ vọng ở `demo/role_a/expected.json`: khoản 1 Điều 1 đổi 500 triệu → 01 tỷ; Điều 3 hồi tố về 01/01/2026;
   khoản 1 Điều 4 nói cách xử lý số thuế đã nộp.
5. Gợi ý kiểm tra lại nghĩa vụ và khoản đã nộp, cần kế toán/cơ quan thuế xác nhận. Không bịa hạn, không hứa hoàn toàn bộ thuế,
   không suy ra bỏ mọi nghĩa vụ thông báo.
6. `after` là snapshot tham chiếu sau khi thêm dữ liệu/đồ thị. `/ingest` hiện có của B chỉ phân tích, chưa tự ghi snapshot này vào kho.

Chỉ kiểm tra snapshot bằng code; chưa chạy model hoặc quay video như thể đã chạy trực tiếp.
Kho đầy đủ có 3.586 mục: B cần giới hạn danh sách ứng viên đưa vào prompt `/ingest`; demo đã có kho con để dùng.

## Điểm thời gian cần giữ

Nghị định 141 ban hành 29/4/2026, hiệu lực 01/01/2026. Khoản 25 Điều 5 Luật 48 có ngày bắt đầu riêng.
Điều 13 Luật 108 áp dụng sớm hơn ngày mặc định. Nghị quyết 43/Nghị định 398 có kỳ thuế 2026–2027;
kỳ thuế giữ riêng, không đồng nhất với ngày hiệu lực.

Ngày hết hiệu lực là điểm kết thúc loại trừ: đến hết 31/12/2026 được lưu `2027-01-01`.
`known_on` mô phỏng ngày ban hành đã biết, không thay thế chứng cứ ngày công bố hay ngày hệ thống nhập dữ liệu.

## Việc thuộc B/C

B chạy Spark, `/ask`, `/ingest` thực tế và so sánh RAG bằng key của nhóm, ghi số liệu thật.
C ghép giao diện, link nguồn, video và form nộp. Gói A không tạo repo mới, không push, không gửi cho thành viên,
không nộp bài, không tạo/kiểm tra API key và không phát sinh chi phí model.
