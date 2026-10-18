# 📝 NHẬT KÝ TƯ DUY KỸ THUẬT & CẬP NHẬT DỰ ÁN (LOGS & UPDATES)

*Tài liệu tổng hợp các phân tích kỹ thuật, nguyên nhân sự cố và toàn bộ các thay đổi được cập nhật vào LearnBoard.*

---

### 📋 Kế Hoạch Chi Tiết Mở Rộng Lớp Học Cho Nhiều Người (1 Giáo Viên - Nhiều Học Sinh)

#### 1. Mô hình kiến trúc WebRTC:
* **Lớp nhỏ (3 - 5 người)**: Áp dụng mô hình **Hybrid Mesh / Teacher-Broadcast**:
  * Bảng vẽ & Chat: Vẫn dùng WebSocket qua `server.js` (rất nhẹ, mở rộng được hàng chục người).
  * Video: Giáo viên phát video/màn hình đến tất cả học sinh (1 $\rightarrow$ N). Học sinh chỉ gửi audio hoặc webcam về cho giáo viên. Mô hình này không tốn nhiều CPU và chạy mượt mà ngay trên máy tính cá nhân qua Cloudflare Tunnel.
* **Lớp trung bình & lớn (6 - 30+ người)**: Chuyển sang mô hình **SFU (Selective Forwarding Unit)**:
  * Tích hợp SFU mã nguồn mở (ví dụ **LiveKit** hoặc **mediasoup**).
  * Thay vì từng máy gửi trực tiếp cho nhau ($N \times (N-1)$ kết nối), mỗi người chỉ gửi 1 luồng video lên SFU Server, và SFU sẽ phân phối lại theo nhu cầu.

#### 2. Nâng cấp Giao diện & Trải nghiệm (UI/UX):
* **Bảng vẽ Blackboard**:
  * Mỗi học sinh có một con trỏ chuột màu riêng kèm tên hiển thị khi di chuột trên bảng.
  * Bổ sung tính năng **"Phân quyền vẽ" (Drawing Permissions)**: Giáo viên có thể cho phép hoặc khóa quyền vẽ của cả lớp / từng học sinh để tránh vẽ đè lung tung.
* **Thanh Video Dock**:
  * Chuyển đổi giữa 2 chế độ:
    * **Spotlight (Tiêu điểm)**: Video của Giáo viên to nhất, học sinh thu nhỏ thành các ô avatar / camera nhỏ bên dưới.
    * **Grid View (Lưới)**: Hiển thị lưới webcam nhiều người kiểu Google Meet / Zoom.
  * Nút "Tắt tiếng tất cả" (Mute All) dành riêng cho Giáo viên.
  * Tính năng "Giơ tay phát biểu" (Raise Hand) có hiệu ứng thông báo đến giáo viên.

---
---
