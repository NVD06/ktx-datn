import { ExpressAuth, getSession } from '@auth/express';
import type { ExpressAuthConfig } from '@auth/express';
import Credentials from '@auth/express/providers/credentials';
import type { Request } from 'express';
import bcrypt from 'bcrypt';
import { env } from './env.js';
import { prisma } from './prisma.js';

declare module '@auth/core/types' {
  interface Session {
    loginAt?: number;
  }
}

/**
 * FILE DUY NHẤT được phép import từ '@auth/express'.
 *
 * Phần còn lại của ứng dụng chỉ dùng `req.user` (do middleware requireAuth gắn vào)
 * và không biết gì về Auth.js. Nhờ vậy nếu phải đổi cơ chế xác thực thì chỉ sửa
 * đúng file này — xem docs/convention.md §4.1.
 */

export const authConfig: ExpressAuthConfig = {
  secret: env.AUTH_SECRET,
  trustHost: true,

  // Credentials provider bắt buộc dùng session dạng JWT — không hỗ trợ lưu session
  // vào database. Đây cũng là lý do không cài Prisma Adapter của Auth.js.
  session: { strategy: 'jwt' as const },

  logger: {
    /**
     * Auth.js coi việc `authorize()` trả null là lỗi `CredentialsSignin` và in
     * cả stack trace ra console. Nhưng sai email/mật khẩu là tình huống bình
     * thường của người dùng, không phải sự cố hệ thống — in nguyên stack chỉ
     * làm terminal trông như đang crash.
     *
     * Rút gọn riêng trường hợp đó; mọi lỗi khác của Auth.js vẫn in đầy đủ.
     */
    error(err) {
      if (err.name === 'CredentialsSignin') {
        console.warn('[auth] Đăng nhập thất bại: sai email hoặc mật khẩu');
        return;
      }
      console.error('[auth]', err);
    },
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mật khẩu', type: 'password' },
      },

      /**
       * Trả về user nếu đúng thông tin, null nếu sai.
       * Không phân biệt "email không tồn tại" với "sai mật khẩu" trong thông báo
       * để tránh lộ danh sách email đang có trong hệ thống.
       */
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== 'string' || typeof password !== 'string') return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user || !user.isActive) return null;

        const matched = await bcrypt.compare(password, user.passwordHash);
        if (!matched) return null;

        // Chỉ đưa những trường tối thiểu vào token. Vai trò (role) cố ý KHÔNG nằm
        // ở đây — nó được đọc lại từ DB mỗi request, để Admin đổi quyền hoặc khóa
        // tài khoản là có hiệu lực ngay, không phải chờ hết hạn phiên.
        return { id: user.id, email: user.email, name: user.fullName };
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.loginAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      if (typeof token.loginAt === 'number') session.loginAt = token.loginAt;
      return session;
    },
  },
};

/** Handler xử lý mọi route /auth/* — mount trong app.ts. */
export const authHandler = ExpressAuth(authConfig);

/**
 * Ranh giới giữa Auth.js và phần còn lại của ứng dụng.
 * Chỉ trả về userId và lúc đăng nhập; mọi thông tin khác (role, buildingId) do requireAuth
 * đọc từ database.
 */
export async function getSessionFromRequest(req: Request): Promise<{ userId: string; loginAt: number } | null> {
  const session = await getSession(req, authConfig);
  const userId = session?.user?.id;
  return userId ? { userId, loginAt: session.loginAt ?? 0 } : null;
}
