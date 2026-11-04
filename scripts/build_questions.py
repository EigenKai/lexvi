"""Twenty source-grounded QA cases; expected answers, not measured model outputs."""
import json
from scripts.build_data import dump
from scripts.fetch_official import DATA
from lexvi.store import LawStore


def main():
    rows = json.loads((DATA / "dieu_khoan.json").read_text(encoding="utf-8"))
    by = {r["id"]: r for r in rows}
    store = LawStore(DATA)
    questions = []

    def add(question, answer, ids, markers, on="2026-11-03", trap=False, stale=(), revenue=700_000_000, kind="ho_kinh_doanh", note=""):
        citations = []
        for pid, marker in zip(ids, markers, strict=True):
            p = by[pid]
            assert marker in p["noi_dung"], (pid, marker)
            locations = store.quote_locations(pid, marker)
            assert locations, (pid, "quote not on source page")
            citations.append({"id": pid, "cau_trich": marker, "trang": locations[0]["trang"],
                              "vi_tri_nguon": locations, "nhan_dinh": answer})
        questions.append({"id": f"A{len(questions)+1:02}", "cau_hoi": question,
                          "ngay_ap_dung": on, "ho_so": {"loai_hinh": kind, "nganh": "quán cà phê, ăn uống", "doanh_thu_nam": revenue, "dia_ban": "TP.HCM"},
                          "dieu_dung": ids, "dap_an_tham_chieu": answer, "trich_dan_mau": citations,
                          "bay_luat_cu": trap, "dieu_cu_can_loai": list(stale),
                          "ghi_chu_cham": note, "can_xac_nhan": True,
                          "nguoi_ky_duyet": None, "trang_thai_dap_an": "agent_doi_chieu_nguon_chua_duoc_nguoi_ky_duyet"})

    threshold = "Sửa đổi cụm từ “500 triệu đồng” thành “01 tỷ đồng”"
    add("Hộ cà phê doanh thu năm 700 triệu đồng: ngưỡng không chịu GTGT năm 2026 là 500 triệu hay 1 tỷ?",
        "Ngưỡng 01 tỷ đồng theo khoản 1 Điều 1 Nghị định 141; Luật 09 giao Chính phủ quy định ngưỡng. Không dùng nguyên trạng mức 500 triệu trong bản đầu Nghị định 68.",
        ["141-2026-ND-CP-D1-K1", "09-2026-QH16-D2"], [threshold, "Căn cứ các chỉ số kinh tế vĩ mô, khả năng cân đối ngân sách, Chính phủ quy định mức doanh thu năm"], trap=True, stale=["68-2026-ND-CP-D3-K1", "149-2025-QH15-D1-K1"])
    add("Cá nhân cư trú kinh doanh cà phê doanh thu 700 triệu năm 2026 có vượt ngưỡng phải nộp TNCN từ kinh doanh không?",
        "Không vượt ngưỡng doanh thu 01 tỷ đồng; đọc khoản 1 Điều 1 Nghị định 141 sửa Điều 4 Nghị định 68 cùng Điều 1 Luật 09. Chỉ xét thu nhập từ kinh doanh nêu trong câu hỏi.",
        ["141-2026-ND-CP-D1-K1", "09-2026-QH16-D1"], [threshold, "Cá nhân cư trú có hoạt động sản xuất, kinh doanh có doanh thu năm từ mức quy định của Chính phủ trở xuống không phải nộp thuế thu nhập cá nhân."], trap=True, stale=["109-2025-QH15-D7-K1", "68-2026-ND-CP-D4-K1"])
    add("Tra cứu lại quy định cho ngày 01/01/2026 với toàn bộ văn bản đã biết đến 03/11/2026: có được áp Nghị định 141 dù ban hành 29/4 không?",
        "Có. Điều 3 Nghị định 141 quy định hiệu lực từ 01/01/2026; cần phân biệt hồi tố pháp lý với thời điểm văn bản được ban hành/được biết.",
        ["141-2026-ND-CP-D3"], ["Nghị định này có hiệu lực thi hành từ ngày 01 tháng 01 năm 2026."], on="2026-01-01", trap=True, stale=["48-2024-QH15-D5-K25"])
    add("Ngày 15/6/2025, hộ có doanh thu 90 triệu đồng/năm: nguyên tắc ngưỡng GTGT và TNCN tại Thông tư 40 là gì?",
        "Khoản 2 Điều 4 Thông tư 40 dùng mức 100 triệu đồng/năm trở xuống. Đây là câu hỏi lịch sử năm 2025, không lấy ngưỡng 2026 áp ngược.",
        ["40-2021-TT-BTC-D4-K2"], ["trong năm dương lịch từ 100 triệu đồng trở xuống"], on="2025-06-15", revenue=90_000_000, trap=True)
    add("Ngày 01/6/2025, quán ăn hộ kinh doanh thuộc khoản 1 Điều 51 Luật 38, doanh thu 1,2 tỷ đồng có thuộc nhóm dùng hóa đơn máy tính tiền theo Nghị định 70 không?",
        "Có trong tình huống nêu: khoản 8 Điều 1 Nghị định 70 sửa Điều 11, liệt kê hộ đạt ngưỡng và hoạt động ăn uống. Đây là căn cứ cho thời điểm 01/6/2025.",
        ["70-2025-ND-CP-D1-K8"], ["có mức doanh thu hằng năm từ 01 tỷ đồng trở lên"], on="2025-06-01", revenue=1_200_000_000, trap=True, stale=["123-2020-ND-CP-D11"])
    add("Tháng 11/2026, có thể dùng Nghị định 123/2020, Nghị định 70/2025 và Thông tư 32/2025 như bộ quy định hóa đơn hiện hành không?",
        "Không dùng các bản đó như bộ quy định hiện hành: khoản 2 Điều 43 Nghị định 254 và khoản 2 Điều 25 Thông tư 91 quy định chấm dứt hiệu lực từ 01/7/2026. Đọc quy định chuyển tiếp cho hồ sơ cũ.",
        ["254-2026-ND-CP-D43-K2", "91-2026-TT-BTC-D25-K2"], ["các Nghị định sau đây hết hiệu lực thi hành", "Thông tư số 32/2025/TT-BTC"], trap=True, stale=["70-2025-ND-CP-D1-K8", "123-2020-ND-CP-D11", "32-2025-TT-BTC-D1"])
    add("Sang năm 2026 hộ cà phê còn áp dụng thuế khoán theo cách cũ không?",
        "Không áp dụng phương pháp khoán thuế từ 01/01/2026 theo khoản 6 Điều 10 Nghị quyết 198.",
        ["198-2025-QH15-D10-K6"], ["Hộ kinh doanh, cá nhân kinh doanh không áp dụng phương pháp khoán thuế từ ngày 01 tháng 01 năm 2026."], trap=True, stale=["38-2019-QH14-D51-K1", "40-2021-TT-BTC-D7-K1"])
    add("Năm 2026 quán có còn phải nộp lệ phí môn bài không?",
        "Khoản 7 Điều 10 Nghị quyết 198 chấm dứt việc thu, nộp lệ phí môn bài từ 01/01/2026.",
        ["198-2025-QH15-D10-K7"], ["Chấm dứt việc thu, nộp lệ phí môn bài từ ngày 01 tháng 01 năm 2026."], trap=True)
    add("Hộ đang hoạt động, doanh thu năm không quá 1 tỷ, chưa nộp hồ sơ quý I/2026 hoặc chưa thông báo tài khoản: hạn chuyển tiếp mới theo Thông tư 50 là ngày nào?",
        "Chậm nhất 31/7/2026, gửi thông báo theo mẫu 01/BK-STK; chỉ áp dụng nhóm hộ và điều kiện tại khoản 2 Điều 4 Thông tư 50. Không biến hạn này thành hạn chung cho mọi hộ.",
        ["50-2026-TT-BTC-D4-K2"], ["chậm nhất là ngày 31 tháng 7 năm 2026."], on="2026-06-01", trap=True, note="Phải nêu đầy đủ nhóm áp dụng; điều cũ có phần vẫn đúng nên không gắn toàn khoản cũ là hết hiệu lực.")
    add("Hồ sơ hoàn TNCN nộp thừa của hộ theo phương pháp thu nhập tính thuế nhân thuế suất dùng mẫu nào sau 13/5/2026?",
        "Theo Điều 2 Thông tư 50 sửa khoản 2 Điều 5 Thông tư 18, dùng Tờ khai 02/CNKD-TNCN-QTT.",
        ["50-2026-TT-BTC-D2"], ["Tờ khai thuế theo Mẫu số 02/CNKD-TNCN-QTT"], trap=True, stale=["18-2026-TT-BTC-D5-K2"])
    add("Với hàng hóa/dịch vụ đủ điều kiện giảm GTGT, hộ tính theo tỷ lệ doanh thu có đổi thành thuế suất 8% như doanh nghiệp khấu trừ không?",
        "Khoản 2 Điều 1 Nghị định 174 tách hai phương pháp: khấu trừ được 8%; phương pháp tỷ lệ trên doanh thu được giảm 20% mức tỷ lệ, khi xuất hóa đơn cho hàng hóa/dịch vụ đủ điều kiện.",
        ["174-2025-ND-CP-D1-K2"], ["được giảm 20% mức tỷ lệ % để tính thuế giá trị gia tăng"], revenue=1_500_000_000)
    add("Chương trình giảm GTGT theo Nghị quyết 204 có áp dụng 8% cho mọi hàng hóa, dịch vụ không?",
        "Không. Khoản 1 Điều 1 Nghị quyết 204 có danh sách nhóm loại trừ; phải phân loại hàng hóa/dịch vụ trước khi áp dụng.",
        ["204-2025-QH15-D1-K1"], ["trừ một số nhóm hàng hóa, dịch vụ sau: viễn thông, hoạt động tài chính, ngân hàng, chứng khoán, bảo hiểm, kinh doanh bất động sản"])
    add("Theo chính văn Nghị định 174, ngày cuối cùng của thời gian chính sách giảm GTGT được quy định là ngày nào?",
        "Đến hết ngày 31/12/2026; khoảng hiệu lực trong dữ liệu lưu điểm kết thúc loại trừ là 01/01/2027.",
        ["174-2025-ND-CP-D2-K1"], ["đến hết ngày 31 tháng 12 năm 2026."], on="2026-12-31")
    add("Vì Luật GTGT 48 có hiệu lực 01/7/2025, có thể lấy riêng mức doanh thu ở khoản 25 Điều 5 áp dụng ngay 01/7/2025 không?",
        "Không. Khoản 2 Điều 18 hoãn quy định ngưỡng doanh thu và Điều 17 tới 01/01/2026; còn phải đọc các sửa đổi 149 và 09 khi tra năm 2026.",
        ["48-2024-QH15-D18-K2"], ["có hiệu lực thi hành từ ngày 01 tháng 01 năm 2026."], on="2025-07-01", trap=True, stale=["48-2024-QH15-D5-K25"])
    add("Công ty tổng doanh thu năm 2 tỷ: mức thuế suất TNDN tại khoản 2 Điều 10 Luật 67 là bao nhiêu trước khi xét miễn giảm và ngoại lệ?",
        "15% cho doanh nghiệp có tổng doanh thu năm không quá 03 tỷ đồng, theo khoản 2 Điều 10. Đây là mức thuế suất trước khi xét ưu đãi, điều kiện và số thuế thực nộp.",
        ["67-2025-QH15-D10-K2"], ["Thuế suất 15% áp dụng đối với doanh nghiệp có tổng doanh thu năm không quá 03 tỷ đồng."], revenue=2_000_000_000, kind="doanh_nghiep_nho")
    add("Doanh nghiệp nhỏ và vừa đăng ký kinh doanh lần đầu được quy định miễn TNDN trong bao lâu và phải đọc hướng dẫn ở đâu?",
        "03 năm từ lần cấp Giấy chứng nhận đăng ký doanh nghiệp đầu tiên; đọc khoản 4 Điều 10 Nghị quyết 198 và khoản 3 Điều 7 Nghị định 20 để kiểm tra điều kiện, đối tượng loại trừ.",
        ["198-2025-QH15-D10-K4", "20-2026-ND-CP-D7-K3"], ["Miễn thuế thu nhập doanh nghiệp cho doanh nghiệp nhỏ và vừa trong 03 năm", "Được miễn thuế thu nhập doanh nghiệp trong 03 năm"], kind="doanh_nghiep_nho")
    add("Quy định bổ sung về miễn TNDN cho doanh nghiệp doanh thu không quá 1 tỷ năm 2026 nằm ở đâu? Có tự động áp cho mọi công ty liên kết không?",
        "Điều 3 Luật 09 bổ sung khoản 14a Điều 4 Luật 67; Điều 2 Nghị định 141 bổ sung khoản 15 Điều 4 Nghị định 320. Phải kiểm tra cách xác định doanh thu và ngoại lệ công ty con/quan hệ liên kết tại điểm d, không kết luận tự động.",
        ["09-2026-QH16-D3", "141-2026-ND-CP-D2"], ["được miễn thuế thu nhập doanh nghiệp", "Quy định miễn thuế tại khoản này không áp dụng"], kind="doanh_nghiep_nho")
    add("Cá nhân cư trú kinh doanh doanh thu năm 9 tỷ có chính sách giảm số TNCN phải nộp năm 2026, 2027 nào mới nhất trong kho?",
        "Giảm 30% số TNCN phải nộp cho kỳ 2026, 2027 khi đáp ứng điều kiện; khoản 1 Điều 1 Nghị quyết 43 và khoản 2 Điều 2 Nghị định 398. Không trừ 30% doanh thu và không hiểu là giảm 30 điểm phần trăm thuế suất.",
        ["43-2026-QH16-D1-K1", "398-2026-ND-CP-D2-K2"], ["Giảm 30% số thuế thu nhập cá nhân phải nộp", "không phân biệt phương pháp tính thuế thu nhập cá nhân."], revenue=9_000_000_000)
    add("Doanh nghiệp doanh thu 9 tỷ, đang có ưu đãi TNDN: khoản giảm 30% theo chính sách 2026-2027 tính trước hay sau ưu đãi?",
        "Tính trên số thuế TNDN phải nộp sau khi đã trừ ưu đãi thuế; theo khoản 2 Điều 1 Nghị quyết 43 và khoản 2 Điều 3 Nghị định 398. Vẫn kiểm tra điều kiện doanh thu, chia tách và các ngoại lệ.",
        ["43-2026-QH16-D1-K2", "398-2026-ND-CP-D3-K2"], ["sau khi đã trừ ưu đãi thuế.", "sau khi đã trừ ưu đãi thuế."], revenue=9_000_000_000, kind="doanh_nghiep_nho")
    add("Nếu chưa rõ nghĩa vụ khai và nộp thuế, hộ kinh doanh có quyền yêu cầu ai hướng dẫn?",
        "Có quyền yêu cầu cơ quan thuế hướng dẫn, giải đáp và hỗ trợ theo khoản 1 Điều 13 Nghị định 68. Việc sửa các điều khác không làm hết hiệu lực khoản này.",
        ["68-2026-ND-CP-D13-K1"], ["có quyền yêu cầu cơ quan thuế hướng dẫn, giải đáp thắc mắc, hỗ trợ về khai thuế, tính thuế và nộp thuế."])
    scoped_claims = {
        "141-2026-ND-CP-D1-K1": "Khoản 1 Điều 1 Nghị định 141 thay cụm 500 triệu đồng bằng 01 tỷ đồng tại các điều, khoản được liệt kê.",
        "09-2026-QH16-D2": "Luật 09 giao Chính phủ quy định mức doanh thu năm tại khoản 25 Điều 5 Luật GTGT.",
        "09-2026-QH16-D1": "Cá nhân cư trú kinh doanh có doanh thu năm từ mức Chính phủ quy định trở xuống không phải nộp TNCN.",
        "254-2026-ND-CP-D43-K2": "Nghị định 123 và Nghị định 70 hết hiệu lực khi Nghị định 254 có hiệu lực.",
        "91-2026-TT-BTC-D25-K2": "Thông tư 32 hết hiệu lực khi Thông tư 91 có hiệu lực.",
        "198-2025-QH15-D10-K4": "Nghị quyết 198 quy định miễn TNDN cho doanh nghiệp nhỏ và vừa trong 03 năm kể từ lần cấp đăng ký đầu tiên.",
        "20-2026-ND-CP-D7-K3": "Khoản 3 Điều 7 Nghị định 20 hướng dẫn việc miễn TNDN 03 năm cho doanh nghiệp nhỏ và vừa đăng ký lần đầu, kèm các điều kiện và ngoại lệ.",
        "09-2026-QH16-D3": "Luật 09 bổ sung khoản 14a Điều 4 Luật TNDN về miễn thuế theo mức tổng doanh thu do Chính phủ quy định.",
        "141-2026-ND-CP-D2": "Nghị định 141 bổ sung mức doanh thu 01 tỷ đồng và quy định ngoại lệ với công ty con, quan hệ liên kết tại điểm d.",
        "43-2026-QH16-D1-K1": "Giảm 30% số TNCN phải nộp kỳ 2026, 2027 đối với thu nhập kinh doanh của cá nhân cư trú doanh thu năm không quá 10 tỷ đồng.",
        "398-2026-ND-CP-D2-K2": "Số TNCN được giảm tính trên số thuế phải nộp từ toàn bộ hoạt động sản xuất, kinh doanh, không phân biệt phương pháp tính thuế.",
        "43-2026-QH16-D1-K2": "Đối với doanh nghiệp đang hưởng ưu đãi, khoản giảm 30% tính trên số TNDN phải nộp sau khi trừ ưu đãi thuế.",
        "398-2026-ND-CP-D3-K2": "Nghị định 398 quy định số TNDN được giảm tính sau khi đã trừ ưu đãi thuế đối với doanh nghiệp đang hưởng ưu đãi.",
    }
    for q in questions:
        for c in q["trich_dan_mau"]:
            c["nhan_dinh"] = scoped_claims.get(c["id"], c["nhan_dinh"])
    dump("questions", questions)
    print(len(questions), "questions;", sum(q["bay_luat_cu"] for q in questions), "traps")


if __name__ == "__main__":
    main()
