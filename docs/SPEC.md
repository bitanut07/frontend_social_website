# Đặc tả frontend Artly

## Mục tiêu

Tạo một SPA mang cảm giác quen thuộc của Instagram nhưng dành riêng cho bài
thi vẽ của học sinh và giáo viên. Người dùng có thể đổi tài khoản demo, xem và
đăng bài, thả reaction, nhắn tin trực tiếp và hỏi trợ lý số lượng bài theo chủ
đề.

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
  features/feed/    Bảng tin, đăng bài, reaction
  features/chat/    Nhắn tin trực tiếp
  features/assistant/ Trợ lý thống kê
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

## Kiểm thử

- Unit test cho parser/formatter và API error handling.
- Component test cho tải bảng tin, reaction và câu trả lời của trợ lý.
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
- Xem/gửi tin nhắn giữa các tài khoản mẫu.
- Trợ lý trả lời câu hỏi “Có bao nhiêu bài về chủ đề X?” bằng dữ liệu backend.
- Giao diện responsive, bàn phím dùng được, test/lint/build đều pass.

## Câu hỏi mở đã chốt cho MVP

- Dùng MySQL 8, tuyệt đối không dùng PostgreSQL.
- Chưa làm auth và upload ảnh production; dùng tài khoản/URL mẫu.
