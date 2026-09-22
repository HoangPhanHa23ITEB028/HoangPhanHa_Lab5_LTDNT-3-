# Lab 04: Modify & Extend Offline-First Survey

# Changelog - Survey Application

Các thay đổi đã làm

## 1. Mở rộng cấu trúc dữ liệu (Schema)
Đã cập nhật file `survey-schema.js` để thu thập thêm thông tin chi tiết. Các trường (fields) mới được bổ sung bao gồm:
*   **Tòa nhà (`building`)**: Lựa chọn (Radio) — Khu A / Khu B / Khu C / Khác.
*   **Loại hạng mục (`facility_type`)**: Lựa chọn (Radio) — Điện / Nước / Bàn ghế / Thiết bị / Khác.
*   **Ghi chú thêm (`note`)**: Văn bản tự do (Textarea) — Không bắt buộc.

## 2. Bổ sung logic hiển thị có điều kiện (Skip Logic)
Kế thừa cơ chế `showIf` có sẵn trong schema để xử lý các lựa chọn mở rộng các trường vừa thêm vào:
*   Điều kiện `building` = "other" $\rightarrow$ Hiển thị trường `building_name` (Nhập tên tòa nhà).
*   Điều kiện `facility_type` = "other" $\rightarrow$ Hiển thị trường `other_facility_name` (Nhập loại hạng mục khác).

## 3. Nâng cấp hiển thị Local Submissions (`app.js`)
Mỗi submission hiện cung cấp các thông tin:
*   Tòa nhà
*   Loại hạng mục
*   Tình trạng
*   Thời gian tạo .

## 4. Extension A — Pending/Synced Counter (`index.html`, `app.js`)
Phát triển hệ thống bộ đếm theo dõi trạng thái đồng bộ của các bản ghi.
*   Hiển thị số lượng submission theo trạng thái phân loại: **Pending** và **Synced**.
