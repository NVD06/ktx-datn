// Import env đầu tiên: biến môi trường phải được kiểm tra xong trước khi nạp phần còn lại.
import { env } from './config/env.js';
import { app } from './app.js';

app.listen(env.PORT, () => {
  console.log(`API chạy tại http://localhost:${env.PORT}/api/v1  (${env.NODE_ENV})`);
});
