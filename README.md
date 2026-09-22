# LAB 05 — MODIFY & EXTEND CAPACITOR FIELD SURVEY

## 1. Native Evidence đã được chỉnh sửa như thế nào?

Khu vực **Native Evidence** được mở rộng để hiển thị trạng thái dữ liệu Camera và Geolocation trước khi Submit.

Các thông tin được hiển thị gồm:

* **Ảnh hiện trường:** Chưa có ảnh / Đã có ảnh.
* **Preview ảnh:** Hiển thị ảnh sau khi chụp.
* **Latitude:** Vĩ độ hiện tại.
* **Longitude:** Kinh độ hiện tại.
* **Accuracy:** Độ chính xác của vị trí GPS.
* Trạng thái Native Evidence được cập nhật trực tiếp từ `currentPhoto` và `currentLocation`.

Dữ liệu không được hardcode mà lấy từ state thực tế của Camera và Geolocation.

---

## 2. Rule validation giữa condition và Camera/GPS là gì?

Lab bổ sung validation giữa trạng thái form và native data.

### Trường hợp `good`

```text
Location: Bắt buộc
Photo: Không bắt buộc
```

Nếu chưa có location thì không cho tạo submission.

### Trường hợp `damaged`

```text
Location: Bắt buộc
Photo: Bắt buộc
```

Nếu chưa có location hoặc chưa có ảnh thì submission sẽ bị chặn.

Các trường hợp kiểm tra:

```text
Good + không có location
→ Không submit

Damaged + có location + không có photo
→ Không submit

Damaged + có location + có photo
→ Submit thành công
```

Validation được thực hiện trước khi lưu dữ liệu vào IndexedDB.

---

## 3. Extension đã chọn là gì?

Extension được chọn là:

### Location Accuracy Indicator

Dựa vào giá trị:

```javascript
currentLocation.accuracy
```

ứng dụng hiển thị mức độ chính xác của vị trí:

```text
≤ 20 m
→ Tốt

21–50 m
→ Trung bình

> 50 m
→ Thấp
```

Indicator được cập nhật khi người dùng lấy vị trí GPS mới.

Extension này giúp người dùng biết chất lượng vị trí trước khi lưu khảo sát.

---

## 4. Khi API down, dữ liệu được giữ ở đâu và trạng thái gì?

Khi Mock API không hoạt động, ứng dụng vẫn lưu submission vào **IndexedDB** theo kiến trúc offline-first.

Submission được lưu local với:

```text
syncStatus = pending
```

Các dữ liệu native vẫn được giữ lại trong record, bao gồm:

```text
photo
location
```

Trong đó:

```text
photo
→ previewDataUrl
→ format
→ capturedAt

location
→ latitude
→ longitude
→ accuracy
→ capturedAt
```

Vì vậy người dùng vẫn có thể tạo và lưu khảo sát ngay cả khi không có kết nối tới API.

---

## 5. Sau khi API hoạt động lại, submission thay đổi như thế nào?

Khi Mock API hoạt động trở lại, Sync Engine sẽ xử lý các submission đang ở trạng thái:

```text
pending
```

Ứng dụng gửi dữ liệu lên:

```text
POST /api/submissions
```

Nếu API xử lý thành công, trạng thái local được cập nhật:

```text
pending
↓
synced
```

Submission sau khi đồng bộ thành công vẫn được giữ trong Local Submissions và hiển thị trạng thái:

```text
Status: synced
```

---

## Kết luận

Lab 05 mở rộng ứng dụng Field Survey bằng cách kết hợp:

```text
Web Form State
+
Camera State
+
Geolocation State
        ↓
Native Evidence Validation
        ↓
IndexedDB
        ↓
pending
        ↓
Sync Engine
        ↓
API
        ↓
synced
```

Native capability của Capacitor được sử dụng như một phần mở rộng của ứng dụng, trong khi kiến trúc **offline-first** và cơ chế **local-first submission** vẫn được giữ nguyên.
