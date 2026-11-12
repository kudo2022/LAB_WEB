# Dữ liệu trang web / Site data

## Dự án nghiên cứu: `data/projects/<slug>.json`

Cách dễ nhất là sửa qua **Pages CMS**:

1. Vào https://app.pagescms.org và đăng nhập bằng GitHub.
2. Lần đầu: cài app Pages CMS cho repo `LAB_WEB`.
3. Mở repo, chọn **Dự án nghiên cứu / Research projects**. Từ đây có thể thêm, sửa hoặc ẩn dự án, và tải ảnh lên.
4. Bấm **Save**.

Trong khoảng 1 đến 2 phút, GitHub Actions sẽ sinh lại trang chủ, trang Research và trang chi tiết của dự án, rồi đăng lên mạng.

| Trường | Ý nghĩa |
|---|---|
| `slug` | Mã dự án, dùng làm tên file và đường dẫn. Chỉ gồm chữ thường không dấu, số và `-`. Không đổi sau khi đã đăng. |
| `title_en` / `title_vi` | Tiêu đề tiếng Anh và tiếng Việt. Nếu để trống bản tiếng Việt, trang sẽ hiện bản tiếng Anh. |
| `year`, `date` | Năm thực hiện và ngày đăng (`YYYY-MM-DD`). Dự án được sắp theo năm, mới nhất trước. |
| `tags` | Chủ đề, dùng cho bộ lọc trên trang Research. |
| `image` | Ảnh minh họa. Ảnh mới được lưu ở `images/research/`. |
| `alt_en` / `alt_vi` | Mô tả ảnh cho người dùng trình đọc màn hình. |
| `summary_en` / `summary_vi` | Đoạn tóm tắt. |
| `refs` | Các bài báo liên quan, mỗi bài gồm trích dẫn và link. |
| `hidden` | `true` để tạm ẩn dự án mà không xóa. |
| `order` | Tùy chọn. Số nhỏ hiện trước. Để trống thì dự án được sắp theo năm. |

Thêm chủ đề mới: thêm giá trị vào `tags` trong `.pages.yml`, rồi thêm bản tiếng Việt vào `TAG_VI` trong `tools/gen.py`.

## Khác

- `data/site/cv.json`: công bố, đề tài, giải thưởng và hoạt động của PI (trang Nguyen Vu Linh).
- `data/site/openings.json`: nội dung hai trang tuyển dụng.
- `tools/vi.json`: bản tiếng Việt cho phần chữ cố định dài.

Sinh lại trang trên máy: `python tools/gen.py`.
