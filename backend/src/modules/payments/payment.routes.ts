import { Router } from 'express';
import * as ctrl from './payment.controller.js';

/*
 * Hai đường VNPay gọi về. Không cần đăng nhập — chữ ký VNPay thay cho phiên. Không đi
 * qua defineRoutes và không có trong /docs vì không dành cho FE: IPN trả JSON theo định
 * dạng của VNPay ({ RspCode, Message }), không theo `{ success, data }` của hệ thống.
 */
const router = Router();
router.get('/vnpay-return', ctrl.vnpayReturn);
router.get('/vnpay-ipn', ctrl.vnpayIpn);

export const paymentRoutes = { prefix: '/payments', router };
