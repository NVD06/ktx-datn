import { z } from 'zod';
import '../config/openapi.js';
import { ROOM_STATUSES } from '../modules/rooms/room-status.js';

/**
 * Zod schema mô tả dữ liệu TRẢ VỀ, chỉ dùng cho tài liệu API.
 * Schema validate đầu vào vẫn nằm ở từng module (*.schema.ts).
 */

export const roleSchema = z.enum(['ADMIN', 'MANAGER', 'STUDENT']).openapi('Role');
export const genderSchema = z.enum(['MALE', 'FEMALE']).openapi('Gender');
export const bedStatusSchema = z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']).openapi('BedStatus');
export const roomStatusSchema = z.enum(ROOM_STATUSES).openapi('RoomStatus', {
  description:
    'Tính khi đọc, không lưu DB. AVAILABLE: còn ít nhất 1 giường trống · ' +
    'FULL: mọi giường đều có người · MAINTENANCE: không còn giường trống và có giường đang bảo trì (hoặc phòng chưa có giường)',
});

/** Giá tiền kiểu Decimal được trả về dạng chuỗi để không mất chính xác. */
const moneySchema = z.string().openapi({ example: '1500000' });

export const authUserSchema = z
  .object({
    id: z.uuid(),
    fullName: z.string().openapi({ example: 'Nguyễn Văn A' }),
    email: z.email().openapi({ example: 'sv001@example.com' }),
    role: roleSchema,
    buildingId: z.uuid().nullable().openapi({ description: 'Chỉ MANAGER mới có giá trị' }),
  })
  .openapi('AuthUser');

export const registeredUserSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    fullName: z.string(),
    role: roleSchema,
  })
  .openapi('RegisteredUser');

export const deletedSchema = z.object({ id: z.uuid() }).openapi('Deleted');

export const buildingSchema = z
  .object({
    id: z.uuid(),
    name: z.string().openapi({ example: 'Tòa A' }),
    floors: z.int().openapi({ example: 5 }),
    gender: genderSchema.nullable().openapi({ description: 'null = tòa hỗn hợp' }),
    description: z.string().nullable(),
    isActive: z.boolean(),
    manager: z
      .object({ id: z.uuid(), fullName: z.string(), email: z.email() })
      .nullable()
      .openapi({ description: 'Mỗi tòa tối đa 1 quản lý, null = chưa gán' }),
    roomCount: z.int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('Building');

export const roomTypeSchema = z
  .object({
    id: z.uuid(),
    name: z.string().openapi({ example: 'Phòng 4 giường - điều hòa' }),
    capacity: z.int().openapi({ example: 4 }),
    price: moneySchema,
    description: z.string().nullable(),
    isActive: z.boolean(),
    roomCount: z.int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('RoomType');

export const registrationPeriodSchema = z
  .object({
    id: z.uuid(),
    name: z.string().openapi({ example: 'Đăng ký học kỳ 1 năm 2026-2027' }),
    startAt: z.iso.datetime().openapi({ description: 'Bắt đầu nhận đơn' }),
    endAt: z.iso.datetime().openapi({ description: 'Hết hạn nhận đơn (chỉ để thông báo)' }),
    isOpen: z.boolean().openapi({ description: 'Tối đa 1 đợt mở tại một thời điểm' }),
    stayStartAt: z.iso.datetime().openapi({ description: 'Bắt đầu ở — kỳ hạn hợp đồng' }),
    stayEndAt: z.iso.datetime().openapi({ description: 'Kết thúc ở — kỳ hạn hợp đồng' }),
    term: z.string().openapi({ example: '2026-HK1', description: 'Mã học kỳ của đợt' }),
    registrationCount: z.int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('RegistrationPeriod');

export const bedSchema = z
  .object({
    id: z.uuid(),
    roomId: z.uuid(),
    code: z.string().openapi({ example: 'G1' }),
    status: bedStatusSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('Bed');

const bedSummary = {
  bedCount: z.int(),
  availableBeds: z.int().openapi({ description: 'Giường trống thật sự — không tính giường đang giữ chỗ' }),
  heldBeds: z.int().openapi({ description: 'Giường còn trống nhưng đã có hợp đồng chờ ký giữ chỗ' }),
  occupiedBeds: z.int(),
  maintenanceBeds: z.int(),
  status: roomStatusSchema,
};

export const roomSchema = z
  .object({
    id: z.uuid(),
    buildingId: z.uuid(),
    roomTypeId: z.uuid(),
    code: z.string().openapi({ example: '301' }),
    floor: z.int().openapi({ example: 3 }),
    isActive: z.boolean(),
    building: z.object({ id: z.uuid(), name: z.string() }),
    roomType: z.object({ id: z.uuid(), name: z.string(), capacity: z.int(), price: moneySchema }),
    ...bedSummary,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('Room');

export const roomDetailSchema = roomSchema
  .extend({
    building: z.object({ id: z.uuid(), name: z.string(), floors: z.int() }),
    beds: z.array(
      bedSchema.extend({ held: z.boolean().openapi({ description: 'Đang giữ chỗ cho hợp đồng chờ ký' }) }),
    ),
  })
  .openapi('RoomDetail');

const buildingRefSchema = z.object({ id: z.uuid(), name: z.string(), gender: genderSchema.nullable() });
const roomTypeRefSchema = z.object({ id: z.uuid(), name: z.string(), capacity: z.int(), price: moneySchema });

export const availableSummarySchema = z
  .object({
    building: buildingRefSchema,
    roomType: roomTypeRefSchema,
    roomCount: z.int().openapi({ description: 'Số phòng còn chỗ' }),
    availableBeds: z.int().openapi({ description: 'Tổng số giường còn trống' }),
  })
  .openapi('AvailableSummary');

const roomRefSchema = z.object({
  id: z.uuid(),
  code: z.string().openapi({ example: '301' }),
  floor: z.int(),
  building: buildingRefSchema,
  roomType: roomTypeRefSchema,
});

export const availableRoomSchema = roomRefSchema
  .extend({
    beds: z
      .array(z.object({ id: z.uuid(), code: z.string().openapi({ example: 'G2' }) }))
      .openapi({ description: 'Chỉ giường còn xếp được, sắp theo mã' }),
  })
  .openapi('AvailableRoom');

export const studentProfileSchema = z
  .object({
    id: z.uuid().openapi({ description: 'id của User' }),
    email: z.email(),
    fullName: z.string(),
    phone: z.string().nullable(),
    studentCode: z.string().openapi({ example: 'SV001' }),
    gender: genderSchema,
    dob: z.iso.datetime().nullable(),
    className: z.string().nullable(),
    faculty: z.string().nullable(),
    hometown: z.string().nullable(),
    citizenId: z.string().nullable(),
    isComplete: z.boolean().openapi({ description: 'Đủ thông tin để nộp đơn đăng ký' }),
    missingFields: z
      .array(z.enum(['phone', 'dob', 'className', 'faculty', 'hometown', 'citizenId']))
      .openapi({ description: 'Các trường bắt buộc còn trống' }),
  })
  .openapi('StudentProfile');

export const registrationStatusSchema = z
  .enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])
  .openapi('RegistrationStatus');

export const registrationSchema = z
  .object({
    id: z.uuid(),
    periodId: z.uuid(),
    studentId: z.uuid(),
    period: registrationPeriodSchema.omit({ registrationCount: true, createdAt: true, updatedAt: true }),
    building: buildingRefSchema
      .nullable()
      .openapi({ description: 'Nguyện vọng tòa, null = tòa nào cũng được' }),
    preferredRoomTypeId: z.uuid().nullable(),
    preferredRoomType: roomTypeRefSchema.nullable(),
    note: z.string().nullable(),
    status: registrationStatusSchema,
    reviewedById: z.uuid().nullable(),
    reviewNote: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('Registration');

export const registrationListItemSchema = registrationSchema
  .extend({
    student: z.object({
      id: z.uuid(),
      fullName: z.string(),
      email: z.email(),
      phone: z.string().nullable(),
      profile: studentProfileSchema
        .pick({
          studentCode: true,
          gender: true,
          dob: true,
          className: true,
          faculty: true,
          hometown: true,
          citizenId: true,
        })
        .nullable(),
    }),
  })
  .openapi('RegistrationListItem');

export const contractStatusSchema = z
  .enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED'])
  .openapi('ContractStatus');

export const invoiceStatusSchema = z.enum(['UNPAID', 'PAID']).openapi('InvoiceStatus');
export const invoiceTypeSchema = z.enum(['ROOM_FEE', 'UTILITY']).openapi('InvoiceType');

/** Phần chung của hóa đơn — dạng rút gọn đi kèm hợp đồng (Contract.invoices). */
const invoiceRefSchema = z.object({
  id: z.uuid(),
  code: z.string().openapi({ example: 'INV-2026-0001' }),
  type: invoiceTypeSchema,
  period: z.string().openapi({
    example: '2026-09',
    description: 'Tháng "2026-09" (tiền phòng, điện nước). Hóa đơn tiền phòng cũ theo kỳ: "2026-HK1", gia hạn "2026-HK1-GH-20270228"',
  }),
  amount: moneySchema,
  dueDate: z.iso.datetime(),
  status: invoiceStatusSchema.openapi({ description: 'Quá hạn không lưu DB — FE tính: UNPAID và dueDate < hiện tại' }),
});

export const contractSchema = z
  .object({
    id: z.uuid(),
    code: z.string().openapi({ example: 'HD-2026-0001' }),
    registrationId: z.uuid(),
    bedId: z.uuid(),
    status: contractStatusSchema.openapi({
      description: 'EXPIRED tính khi đọc: DRAFT/ACTIVE đã qua ngày kết thúc',
    }),
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime(),
    price: moneySchema.openapi({ description: 'Snapshot giá loại phòng lúc duyệt, đồng / tháng' }),
    signedAt: z.iso.datetime().nullable(),
    terminatedAt: z.iso.datetime().nullable(),
    terminationReason: z.string().nullable().openapi({ description: 'Lý do chấm dứt / hủy' }),
    endedById: z.uuid().nullable(),
    endedBy: z
      .object({ id: z.uuid(), fullName: z.string(), role: roleSchema })
      .nullable()
      .openapi({ description: 'Người chấm dứt / hủy — SV tự từ chối hay Manager hủy' }),
    period: registrationPeriodSchema.pick({ id: true, name: true, term: true, stayStartAt: true, stayEndAt: true }),
    student: z.object({
      id: z.uuid(),
      fullName: z.string(),
      email: z.email(),
      phone: z.string().nullable(),
      profile: studentProfileSchema.pick({ studentCode: true, gender: true, className: true, faculty: true }).nullable(),
    }),
    bed: z.object({
      id: z.uuid(),
      code: z.string().openapi({ example: 'G2' }),
      room: roomRefSchema,
    }),
    invoices: z.array(invoiceRefSchema),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('Contract');

export const currentStaySchema = z
  .object({
    contract: contractSchema,
    roommates: z.array(
      z.object({
        fullName: z.string(),
        className: z.string().nullable(),
        bedCode: z.string().openapi({ example: 'G2' }),
      }),
    ),
  })
  .nullable()
  .openapi('CurrentStay', { description: 'null = chưa có chỗ ở' });

export const userSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    fullName: z.string(),
    phone: z.string().nullable(),
    role: roleSchema,
    isActive: z.boolean(),
    buildingId: z.uuid().nullable(),
    building: z.object({ id: z.uuid(), name: z.string() }).nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('User');

export const invoiceItemTypeSchema = z.enum(['ROOM_FEE', 'ELECTRIC', 'WATER']).openapi('InvoiceItemType');
export const paymentStatusSchema = z.enum(['PENDING', 'SUCCESS', 'FAILED']).openapi('PaymentStatus');

export const invoiceSchema = invoiceRefSchema
  .extend({
    contractId: z.uuid(),
    splitCount: z.int().nullable().openapi({ description: 'Số SV chia hóa đơn điện nước lúc chốt' }),
    contract: contractSchema.pick({ id: true, code: true, bed: true, student: true }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('Invoice');

export const invoiceDetailSchema = invoiceSchema
  .extend({
    items: z.array(
      z.object({
        id: z.uuid(),
        type: invoiceItemTypeSchema,
        oldIndex: z.int().nullable().openapi({ description: 'Chỉ số cũ — chỉ điện/nước' }),
        newIndex: z.int().nullable(),
        quantity: z.string().openapi({ description: 'kWh / m³ của cả phòng; tiền phòng: 1 hoặc 0.5 tháng (hóa đơn cũ theo kỳ: 1 cả kỳ, số ngày gia hạn)' }),
        unitPrice: moneySchema,
        amount: moneySchema.openapi({ description: 'Phần của SV này' }),
      }),
    ),
    payments: z.array(
      z.object({
        id: z.uuid(),
        amount: moneySchema,
        status: paymentStatusSchema,
        vnpTransactionNo: z.string().nullable(),
        paidAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
      }),
    ),
  })
  .openapi('InvoiceDetail');

export const utilitySheetSchema = z
  .object({
    building: z.object({ id: z.uuid(), name: z.string() }),
    period: z.string().openapi({ example: '2026-09' }),
    prices: z.object({ electric: z.int(), water: z.int() }).openapi({ description: 'Đơn giá hiện hành, đ/kWh và đ/m³' }),
    rooms: z.array(
      z.object({
        id: z.uuid(),
        code: z.string().openapi({ example: '101' }),
        floor: z.int(),
        residents: z.int().openapi({ description: 'Số SV chia tiền — 0 thì phòng bị bỏ qua' }),
        billed: z.boolean().openapi({ description: 'Kỳ này đã lập hóa đơn' }),
        prefill: z
          .object({ electricOld: z.int().optional(), waterOld: z.int().optional() })
          .nullable()
          .openapi({ description: 'Chỉ số mới của lần chốt trước — điền sẵn làm chỉ số cũ' }),
        cancelBlock: z.enum(['PAID', 'LATER_BILLED']).nullable().openapi({
          description:
            'Vì sao lần chốt kỳ này không hủy được: PAID đã có SV thanh toán, LATER_BILLED đã chốt tháng sau. ' +
            'null: hủy được (nếu `billed`)',
        }),
      }),
    ),
  })
  .openapi('UtilitySheet');

export const billUtilitiesResultSchema = z
  .object({
    invoiceCount: z.int(),
    roomCount: z.int().openapi({ description: 'Số phòng đã lập hóa đơn' }),
    skipped: z.array(z.object({ code: z.string(), reason: z.enum(['BILLED', 'EMPTY', 'NO_USAGE']) })),
  })
  .openapi('BillUtilitiesResult');

export const cancelUtilityResultSchema = z
  .object({
    invoiceCount: z.int().openapi({ description: 'Số hóa đơn đã xóa' }),
    reading: z
      .object({ electricOld: z.int(), electricNew: z.int(), waterOld: z.int(), waterNew: z.int() })
      .openapi({ description: 'Chỉ số của lần chốt vừa hủy — để điền lại vào bảng chốt' }),
  })
  .openapi('CancelUtilityResult');

const moneyTotal = z.object({ count: z.int(), amount: moneySchema });
export const invoiceSummarySchema = z
  .object({ all: moneyTotal, unpaid: moneyTotal, overdue: moneyTotal })
  .openapi('InvoiceSummary');

export const buildingDebtSchema = z
  .object({ building: buildingRefSchema, unpaid: moneyTotal, overdue: moneyTotal })
  .openapi('BuildingDebt');
