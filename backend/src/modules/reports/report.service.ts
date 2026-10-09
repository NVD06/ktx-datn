import { CONTRACT_EXPIRING_DAYS } from '../../config/constants.js';
import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { RequestStatus, type InvoiceType } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../../types/auth-user.js';
import { currentMonthVN, monthStartVN, nextMonthStartVN, shiftMonth } from '../../utils/date-vn.js';
import { buildingScope } from '../../utils/scope.js';
import { contractScope } from '../contracts/contract.service.js';
import * as invoiceService from '../invoices/invoice.service.js';

/*
 * Thống kê & báo cáo (US-06) — chỉ đọc, tính thẳng từ dữ liệu nghiệp vụ bằng count / groupBy /
 * aggregate, không lưu bảng thống kê riêng. Phạm vi đi qua đúng scope của các màn hình nghiệp vụ
 * (buildingScope, contractScope), nên Manager chỉ thấy tòa mình và số khớp với các bảng đó.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Biểu đồ doanh thu của dashboard: từng này tháng gần nhất, tính cả tháng này. */
const REVENUE_MONTHS = 6;

/**
 * Doanh thu tháng `month` (giờ VN): tiền thật đã thu — giao dịch VNPay thành công có `paidAt`
 * trong tháng, không phải hóa đơn đã lập. Tách tiền phòng / điện nước theo loại hóa đơn.
 */
async function revenueOf(user: AuthUser, month: string) {
  const sum = async (type: InvoiceType) => {
    const { _sum } = await prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        paidAt: { gte: monthStartVN(month), lt: nextMonthStartVN(month) },
        invoice: { type, contract: contractScope(user) },
      },
      _sum: { amount: true },
    });
    return String(_sum.amount ?? 0);
  };
  const [roomFee, utility] = await Promise.all([sum('ROOM_FEE'), sum('UTILITY')]);
  return { month, roomFee, utility };
}

/** Số yêu cầu sửa chữa theo trạng thái — đủ mọi trạng thái, không có thì 0. */
async function requestsByStatus(user: AuthUser) {
  const groups = await prisma.maintenanceRequest.groupBy({
    by: ['status'],
    where: { room: buildingScope(user) },
    _count: { _all: true },
  });
  return Object.fromEntries(
    Object.values(RequestStatus).map((status) => [status, groups.find((g) => g.status === status)?._count._all ?? 0]),
  ) as Record<RequestStatus, number>;
}

/**
 * Số liệu dashboard (US-06.1).
 *   - Lấp đầy: giường OCCUPIED / tổng giường của phòng đang hoạt động.
 *   - SV đang ở: cùng quy tắc với chỗ ở hiện tại (contract.service.ts → currentStay) — hợp đồng
 *     ACTIVE đã tới ngày vào ở, kể cả quá ngày kết thúc mà chưa trả phòng.
 *   - Công nợ: dùng lại tổng của trang Hóa đơn, hai nơi luôn cùng một số.
 */
export async function overview(user: AuthUser) {
  const now = new Date();
  const contracts = contractScope(user);
  const beds: Prisma.BedWhereInput = { room: { ...buildingScope(user), isActive: true } };
  const thisMonth = currentMonthVN();

  const [totalBeds, occupiedBeds, residents, expiring, invoices, requests, revenue] = await Promise.all([
    prisma.bed.count({ where: beds }),
    prisma.bed.count({ where: { ...beds, status: 'OCCUPIED' } }),
    // Đếm sinh viên chứ không đếm hợp đồng: SV quá hạn chưa trả phòng mà đã vào ở kỳ mới có hai hợp đồng ACTIVE.
    prisma.user.count({
      where: { registrations: { some: { contract: { is: { AND: [contracts, { status: 'ACTIVE', startDate: { lte: now } }] } } } } },
    }),
    prisma.contract.count({
      where: {
        AND: [contracts, { status: 'ACTIVE', endDate: { gte: now, lte: new Date(now.getTime() + CONTRACT_EXPIRING_DAYS * DAY_MS) } }],
      },
    }),
    invoiceService.summary(user, {}),
    requestsByStatus(user),
    Promise.all(
      Array.from({ length: REVENUE_MONTHS }, (_, i) => revenueOf(user, shiftMonth(thisMonth, i - (REVENUE_MONTHS - 1)))),
    ),
  ]);

  return {
    beds: { total: totalBeds, occupied: occupiedBeds },
    residents,
    expiringContracts: { count: expiring, withinDays: CONTRACT_EXPIRING_DAYS },
    invoices: { unpaid: invoices.unpaid, overdue: invoices.overdue },
    requests: { open: requests.PENDING + requests.RECEIVED, byStatus: requests },
    revenue,
  };
}
