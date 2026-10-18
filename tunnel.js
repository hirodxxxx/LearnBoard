const { startTunnel } = require('untun');
const http = require('http');

async function notifyServer(tunnelUrl) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ tunnelUrl });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/tunnel-info',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        resolve();
      }
    );

    req.on('error', () => {
      // Server may still be starting, retry shortly
      setTimeout(() => notifyServer(tunnelUrl).then(resolve), 1000);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('  Đang khởi tạo đường truyền HTTPS miễn phí cho em...');
  console.log('======================================================\n');

  try {
    const tunnel = await startTunnel({
      port: 5000,
      acceptCloudflareNotice: true
    });

    const url = await tunnel.getURL();
    const studentLink = `${url}?role=student&room=lop-hoc-1`;

    // Notify server of the new tunnel URL
    await notifyServer(url);

    console.log('======================================================');
    console.log('  LINK PHÒNG HỌC CHO EM BẠN:');
    console.log(`  👉 ${studentLink}`);
    console.log('======================================================');
    console.log('\n-> Đã đồng bộ link vào nút [Gửi link] trên giao diện web!');
    console.log('-> Bạn có thể bấm nút [Gửi link] ngay trên web để copy link này.');
    console.log('-> Giữ cửa sổ này mở trong suốt buổi học. Bấm Ctrl+C để tắt.\n');
  } catch (err) {
    console.error('Lỗi khởi tạo tunnel:', err);
  }
}

main();
