# Đặc tả frontend Artly

## Mục tiêu

Tạo một SPA mang cảm giác quen thuộc của Instagram nhưng dành riêng cho bài
thi vẽ của học sinh và giáo viên. Người dùng có thể đổi tài khoản demo, xem và
đăng bài, thả reaction, bình luận, nhắn tin trực tiếp và trò chuyện với trợ lý
AI đa năng trong rào chắn phù hợp học đường.

## Công nghệ

- React + TypeScript, khởi tạo bằng Vite.
- Tailwind CSS qua Vite plugin chính thức.
- Fetch API cho dữ liệu server; không thêm global store khi state còn nhỏ.
- Vitest + Testing Library cho unit/component test.

## Lệnh

- Phát triển: `npm run dev`
- Lint: `npm run lint`
- Test: `npm test -- --run`
- Build: `npm run build`

## Cấu trúc

```text
src/
  components/       Thành phần dùng lại
  features/feed/    Bảng tin, đăng bài, reaction, bình luận
  features/chat/    Nhắn tin trực tiếp
  features/assistant/ Chatbot đa năng và thống kê
  lib/              API client và tiện ích thuần
  types/            Hợp đồng dữ liệu TypeScript
public/demo-art/    Ảnh minh họa cục bộ
```

## Quy ước code

```tsx
export function EmptyFeed() {
  return (
    <section role="status" className="border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-950">Chưa có bài vẽ</h2>
      <p className="mt-1 text-sm text-slate-600">Hãy đăng tác phẩm đầu tiên.</p>
    </section>
  );
}
```

- Functional component và named export.
- Không dùng `dangerouslySetInnerHTML`.
- Mobile-first; kiểm tra ở 320, 768, 1024 và 1440 px.
- Nút icon luôn có accessible name; form luôn có label.

## Hợp đồng ID với backend

- `ResourceId` là chuỗi UUID cho user, topic, post, comment và message; áp dụng
  cho JSON, `X-User-ID`, path và query.
- Ví dụ danh tính seed:
  `X-User-ID: 00000000-0000-4000-8000-000000000001`.
- API được bảo vệ ưu tiên `Authorization: Bearer <accessToken>` khi có phiên;
  `X-User-ID` chỉ dùng trong local/testing hoặc chế độ demo.
- Không dùng `number`, `parseInt` hoặc phép toán số cho ID. Các trường phân trang,
  `reactionCount`, `commentCount`, kết quả đếm và status HTTP vẫn là số.
- Backend dùng PostgreSQL 17 với cột PK/FK kiểu `UUID`. Frontend không truy cập
  database trực tiếp.

## Hợp đồng bình luận

- `GET /posts/{id}/comments?page=1&pageSize=20` trả `{ data, pagination }`, sắp
  bình luận mới nhất trước; `pageSize` tối đa 100.
- `POST /posts/{id}/comments` gửi `{ body: string }`; trim khoảng trắng Unicode
  rồi yêu cầu 1–3000 ký tự và không chứa U+0000, thành công trả `201` với
  `{ data: Comment }`.
- `DELETE /posts/{id}/comments/{commentId}` dùng bearer token hoặc `X-User-ID`
  demo, chỉ áp dụng cho bình luận còn hiển thị của chính người dùng và thành
  công trả `204` không body. UUID sai trả 400 `BAD_REQUEST`; bình luận không tồn
  tại hoặc không thuộc người dùng đều trả 404.
- `Comment` gồm `id`, `postId`, `body`, `author: User`, `createdAt`; `Post` có
  thêm `commentCount`.
- UI có trạng thái tải/lỗi/rỗng cho danh sách, khóa gửi khi đang xử lý và giữ
  nội dung để người dùng thử lại khi request thất bại.
- UI chỉ hiện thao tác xóa trên bình luận của tài khoản hiện tại và loại bình
  luận khỏi danh sách sau response 204.
- Bình luận MVP là danh sách phẳng; chưa có reply, sửa hoặc reaction.

## Kiểm thử

- Unit test cho parser/formatter và API error handling.
- Component test cho tải bảng tin, reaction, tải/gửi/xóa bình luận và câu trả
  lời của trợ lý.
- Build production và kiểm tra browser cho luồng chính.

## Ranh giới

- Luôn: validate form ở client, vẫn tin backend là ranh giới bảo mật, hiển thị
  loading/error/empty.
- Hỏi trước: đổi cơ chế xác thực, thêm upload file hoặc dịch vụ bên ngoài.
- Không bao giờ: lưu secret trong frontend, render HTML người dùng, gọi database
  trực tiếp.

## Tiêu chí hoàn thành

- Xem được feed phân trang và lọc theo chủ đề.
- Tạo bài bằng URL ảnh, tiêu đề, mô tả và chủ đề.
- Reaction cập nhật tức thì và đồng bộ lại khi API lỗi.
- Mở danh sách bình luận phân trang, gửi bình luận mới bằng bàn phím và xóa
  bình luận của chính mình.
- Xem/gửi tin nhắn giữa các tài khoản mẫu.
- Trợ lý trả lời nhiều nhóm câu hỏi phổ thông, giữ ngữ cảnh hội thoại và trả
  lời câu “Có bao nhiêu bài về chủ đề X?” bằng dữ liệu backend.
- Giao diện responsive, bàn phím dùng được, test/lint/build đều pass.

## Câu hỏi mở đã chốt cho MVP

- Backend dùng PostgreSQL 17; frontend chỉ giao tiếp qua Artly API v1.
- Chưa làm auth và upload ảnh production; dùng tài khoản/URL mẫu.
