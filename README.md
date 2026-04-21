# 🎬 Kphim - Premium Smart TV App

Kphim là một ứng dụng xem phim chất lượng cao được thiết kế chuyên biệt cho hệ điều hành **Smart TV** (Samsung Tizen, LG WebOS) mang lại trải nghiệm xem phim chuyên nghiệp chuẩn rạp chiếu tại nhà.

Giao diện (UI) của ứng dụng được xây dựng theo ngôn ngữ thiết kế **Velvet Cinema** cao cấp với Dark Mode, Glassmorphism và Typography tối ưu (Space Grotesk & Manrope), đảm bảo sự dễ nhìn và thao tác mượt mà bằng **Remote TV (D-Pad)**.

## ✨ Tính năng nổi bật

- 🎛 **TV Remote Navigation:** Hoàn toàn tương thích và điều khiển bằng phím mũi tên (lên, xuống, trái, phải) và các phím Media trên remote TV.
- 📡 **Nguồn nội dung đa dạng:** Tích hợp trực tiếp [Ophim API](https://ophim1.com/) với hàng ngàn phim mới cập nhật liên tục.
- 🔍 **Tìm kiếm Tiên tiến:** Hỗ trợ live-search qua Bàn phím ảo và tính năng **Tìm kiếm bằng Giọng nói (Voice Search)**.
- ⚙️ **Bộ Lọc Phim Chuyên Sâu:** Dễ dàng duyệt phim bộ, phim lẻ, theo quốc gia, thể loại hoặc năm phát hành.
- 🎥 **Video Player Hiện Đại:** Trình phát full-screen stream m3u8 cực mượt với HLS.js. Hỗ trợ bấm phím mũi tên tua phim 10s hoặc nhấn giữ để tua siêu tốc, tự động chuyển tập, và chọn tập phim trực quan ngay trên luồng phát.

## 🚀 Cấu trúc Kỹ thuật

- **Front-end:** Vanilla HTML / CSS / JavaScript (Không phụ thuộc frameworks nặng, tối đa hiệu năng cho TV đời cũ).
- **Video Player:** [hls.js](https://github.com/video-dev/hls.js/)
- **UI Design System:** Custom Design dựa theo Google Stitch AI.

## 🛠 Hướng dẫn Cài đặt & Build

Ứng dụng có thể đóng gói để cài đặt trên Samsung TV (Tizen) hoặc chạy trực tiếp trên bất kì nền tảng Web-based TV nào.

### 1. Dành cho Samsung Smart TV (Tizen OS)

Nếu bạn có Smart TV Samsung, file build `.wgt` luôn sẵn sàng để sideload qua Tizen Studio (Device Manager):
1. Bật **Developer Mode** trên Samsung TV của bạn.
2. Tại máy tính có công cụ SDB (hoặc Tizen Studio), gõ lệnh:
   ```bash
   sdb connect [IP_CỦA_TV_SAMSUNG]
   sdb install Kphim.wgt
   ```

*(Bạn cũng có thể tự build file `.wgt` bằng lệnh zip: `zip -r Kphim.wgt *` ngay trong thư mục gốc).*

### 2. Dành cho Môi trường Web / Trình duyệt

Bạn rất dễ dàng kiểm tra / phát triển cục bộ bằng cách chạy web server ảo:
```bash
python3 -m http.server 8080
```
Sau đó mở trình duyệt tại địa chỉ `http://localhost:8080` và sử dụng thao tác 4 phím mũi tên bàn phím để giả lập TV Remote.

---
*Dự án lấy ý tưởng giao diện Premium TV App và tự động trích xuất bởi Google Stitch AI.*
