# Artly Frontend

Giao diện web cho Artly — mạng xã hội bài thi vẽ dành cho học sinh và giáo
viên. Ứng dụng là một SPA responsive, cho phép chọn tài khoản mẫu, xem và đăng
bài vẽ, thả reaction, bình luận, nhắn tin trực tiếp và trò chuyện với Trợ lý
Artly về học tập, kiến thức, viết lách, công nghệ, sáng tạo, cách dùng ứng dụng
hoặc thống kê bài viết theo chủ đề.

## Tính năng MVP

- Bảng tin phân trang, lọc theo chủ đề và hiển thị trạng thái reaction của tài
  khoản đang chọn.
- Đăng bài bằng URL ảnh, tiêu đề, mô tả, tên cuộc thi và từ một đến năm chủ đề.
- Tác giả có thể xác nhận xóa bài của chính mình; tài khoản có
  `isSuperAdmin=true` có thể xóa bài của tài khoản khác.
- Thả/gỡ reaction với cập nhật tức thì; giao diện đồng bộ lại khi API báo lỗi.
- Xem bình luận mới nhất trước, gửi bình luận mới và xóa bình luận của chính
  mình.
- Nhắn tin trực tiếp giữa các tài khoản mẫu bằng REST polling.
- Trợ lý AI đa năng trả lời bằng văn bản thuần, giữ ngữ cảnh hội thoại và dùng
  skill backend an toàn cho câu hỏi dạng “Có bao nhiêu bài về chủ đề X?”.
- Trạng thái loading, error và empty; điều khiển bằng bàn phím; bố cục
  mobile-first.

MVP chưa hỗ trợ reply/sửa/reaction cho bình luận, upload file, stories, video,
follow, thông báo realtime hay WebSocket.

## Công nghệ và yêu cầu

- React 19, TypeScript 6, Vite 8 và Tailwind CSS 4.
- Vitest, Testing Library và jsdom cho kiểm thử.
- Oxlint cho kiểm tra mã nguồn.
- Node.js **22.12 trở lên** và npm. `package.json` của dự án chưa khóa trường
  `engines`; mốc 22.12 là nhánh Node.js được Vite 8 hỗ trợ trực tiếp.
- Artly Backend đang chạy và truy cập được từ trình duyệt.

## Chạy nhanh

Từ thư mục `frontend`:

```bash
npm ci
npm run dev
```

Mở `http://localhost:5173`. Theo mặc định, frontend gọi API tại
`http://127.0.0.1:3000/api/v1`.

Nếu backend chạy ở địa chỉ khác, tạo file `.env.local`:

```dotenv
VITE_API_URL=http://127.0.0.1:3000/api/v1
```

Khởi động lại dev server sau khi đổi biến môi trường. Không đặt API key, mật
khẩu hay secret trong biến bắt đầu bằng `VITE_` vì các giá trị này được đóng gói
vào mã chạy trên trình duyệt.

## Tài khoản và dữ liệu mẫu

Sau khi nạp `sql.sql` của backend, có thể chọn một trong ba danh tính:

| ID dùng cho `X-User-ID` | Tài khoản | Tên hiển thị | Vai trò |
| --- | --- | --- | --- |
| `00000000-0000-4000-8000-000000000001` | `minh.an` | Trần Minh An | Học sinh |
| `00000000-0000-4000-8000-000000000002` | `co.lan` | Cô Nguyễn Hoài Lan | Giáo viên |
| `00000000-0000-4000-8000-000000000003` | `phuong.thao` | Nguyễn Phương Thảo | Học sinh |

Seed còn có sáu chủ đề (Phong cảnh, Chân dung, Môi trường, Hòa bình, Di sản văn
hóa và Ước mơ), năm bài đăng, sáu reaction và bốn tin nhắn. Ba bài dùng ảnh demo
cục bộ là “Mầm xanh tương lai”, “Hòa bình trong em” và “Di sản quê em”. Danh
sách thực tế luôn được tải từ backend thay vì ghi cứng trong giao diện.

Backend và frontend trao đổi mọi ID tài nguyên dưới dạng chuỗi UUID. Seed dùng
UUID cố định, còn dữ liệu tạo mới có UUID ngẫu nhiên. Không ép ID sang số. Nếu
Supabase vẫn còn schema demo `BIGINT` cũ, hãy backup rồi làm theo mục reset UUID
trong README của backend; chạy lại `sql.sql` không tự đổi kiểu cột cũ.

Các ảnh minh họa vuông được tạo riêng cho bản demo nằm trong
`public/demo-art/`:

- `mam-xanh-tuong-lai.png`
- `di-san-que-em.png`
- `hoa-binh-trong-em.png`
- `ca-phe-ngay-mua.webp`
- `ca-phe-phin-buoi-sang.webp`
- `goc-ve-cung-barista.webp`
- `hanh-trinh-hat-ca-phe.webp`

Khi dev server chạy ở cổng mặc định, ảnh có URL dạng
`http://localhost:5173/demo-art/mam-xanh-tuong-lai.png`. Đây là tài nguyên mẫu
cục bộ; chức năng đăng bài vẫn nhận một URL ảnh HTTP/HTTPS, chưa nhận file
upload.

Bốn ảnh WebP chủ đề cà phê còn được `CafeDemoSeeder` của backend tải lên bucket
`demo-art` trong Supabase Storage. Vì vậy các bài demo cà phê không phụ thuộc
vào cổng Vite sau khi đã seed.

## Biến môi trường

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `VITE_DATA_BACKEND` | Không | `goravel` | Nguồn dữ liệu giao diện: `goravel` để gọi REST API và hiện access log backend; chỉ dùng `supabase` khi muốn gọi Supabase trực tiếp. |
| `VITE_API_URL` | Không | `http://127.0.0.1:3000/api/v1` | Base URL đầy đủ của Artly API v1, không có dấu `/` cuối. |

Đổi avatar bằng file cần `VITE_DATA_BACKEND=supabase`, vì policy Storage xác
thực owner bằng UUID của phiên Supabase Auth. Chế độ `goravel` dùng tài khoản
mẫu và chỉ cập nhật avatar bằng URL.

## Các lệnh

| Lệnh | Công dụng |
| --- | --- |
| `npm run dev` | Chạy Vite dev server. |
| `npm run lint` | Kiểm tra mã nguồn bằng Oxlint. |
| `npm test -- --run` | Chạy toàn bộ test một lần. |
| `npm run build` | Kiểm tra TypeScript và tạo production build trong `dist/`. |
| `npm run preview` | Xem thử production build trên máy local. |
| `npm run verify:avatar-storage` | Tạo user tạm để smoke test bucket/policy avatar trên Supabase thật rồi tự dọn dữ liệu. |

Lệnh kiểm tra đầy đủ trước khi bàn giao:

```bash
npm run lint && npm test -- --run && npm run build
```

## Kết nối API

Frontend dùng Fetch API và hợp đồng JSON camelCase. Khi có phiên Supabase, API
được bảo vệ dùng `Authorization: Bearer <accessToken>`; local/testing hoặc chế
độ demo gửi `X-User-ID: <uuid>` của tài khoản mẫu đang chọn. Hai endpoint danh
mục `GET /users` và `GET /topics` không cần danh tính.

Các trường `id`, `postId`, `topicId`, `topicIds`, `peerId` và `recipientId` là
UUID string; `page`, `pageSize`, `totalItems`, `totalPages`, `reactionCount`,
`commentCount` và kết quả đếm vẫn là number.

| Chức năng | Endpoint |
| --- | --- |
| Kiểm tra dịch vụ | `GET /health` |
| Tài khoản mẫu | `GET /users` |
| Danh mục chủ đề | `GET /topics` |
| Bảng tin / đăng / xóa bài | `GET /posts`, `POST /posts`, `DELETE /posts/{id}` |
| Bình luận | `GET /posts/{id}/comments`, `POST /posts/{id}/comments`, `DELETE /posts/{id}/comments/{commentId}` |
| Reaction | `PUT /posts/{id}/reaction`, `DELETE /posts/{id}/reaction` |
| Tin nhắn | `GET /messages`, `POST /messages` |
| Trợ lý Artly | `GET /assistant/conversations`, `GET /assistant/conversations/{id}`, `POST /assistant/questions` |

Danh sách bình luận dùng `page=1&pageSize=20` theo mặc định, tối đa 100 phần tử
mỗi trang và sắp xếp mới nhất trước. Nội dung gửi lên được trim Unicode, dài
1–3000 ký tự, không chứa U+0000; giao diện giữ lại bản nháp để người dùng thử
lại khi có lỗi. Thao tác xóa chỉ hiện trên bình luận của tài khoản hiện tại,
dùng bearer token hoặc `X-User-ID` demo và chờ response 204 trước khi loại bình
luận khỏi danh sách; bình luận không tồn tại hoặc không thuộc người gọi đều được
xử lý như lỗi 404; UUID path sai được xử lý như lỗi 400 `BAD_REQUEST`.

Trợ lý hiển thị hội thoại kiểu Messenger bằng bong bóng trái/phải, có danh sách
lịch sử theo tài khoản, nút **Chat mới** và cho phép mở lại đoạn chat để tiếp
tục. Enter gửi tin, Shift+Enter xuống dòng; backend tự lấy tối đa 4 cặp tin nhắn
gần nhất làm context an toàn.

Các đường dẫn trong bảng là tương đối so với `VITE_API_URL`. Mọi lỗi API có
dạng:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": {}
  }
}
```

## Kiến trúc

State được giữ gần feature bằng React hooks; ứng dụng chưa cần global store.
Dữ liệu server đi qua API client dùng chung, còn component chịu trách nhiệm
hiển thị đầy đủ loading/error/empty và hỗ trợ thao tác bàn phím.

```text
src/
  components/          Thành phần giao diện dùng lại
  features/
    feed/              Bảng tin, tạo bài, reaction và bình luận
    chat/              Hội thoại và REST polling
    assistant/         Chatbot đa năng và thống kê theo chủ đề
  lib/                 API client và tiện ích thuần
  types/               Kiểu dữ liệu khớp OpenAPI
  test/                Thiết lập môi trường test
public/
  demo-art/            Ảnh minh họa được tạo cho dữ liệu demo
```

Hợp đồng chi tiết của giao diện nằm tại `docs/SPEC.md`. Trong repository
backend, hợp đồng HTTP chính thức nằm tại `docs/openapi.yaml`.

## Lưu ý bảo mật

Các request production dùng access token trong
`Authorization: Bearer <accessToken>`. `X-User-ID` chỉ chọn một tài khoản mẫu
trong local/testing hoặc chế độ demo; header này **không phải cơ chế đăng nhập
hoặc phân quyền an toàn cho production** và người dùng có thể tự thay đổi nó.

Frontend không render HTML từ người dùng, không thực thi nội dung do trợ lý sinh
ra và không chứa secret. Backend vẫn là ranh giới bắt buộc phải validate mọi dữ
liệu đầu vào.

## Xử lý sự cố thường gặp

- Nếu trình duyệt báo lỗi mạng, kiểm tra backend tại
  `http://127.0.0.1:3000/api/v1/health` và giá trị `VITE_API_URL`.
- Nếu bị chặn CORS, đặt `CORS_ALLOWED_ORIGIN=http://localhost:5173` trong
  `.env` của backend rồi khởi động lại backend.
- Nếu ảnh demo không tải, giữ Vite ở cổng 5173 hoặc cập nhật URL ảnh trong dữ
  liệu mẫu theo origin thực tế của frontend.
