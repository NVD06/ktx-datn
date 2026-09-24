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
    term: z.string().openapi({ example: '2026-HK1', description: 'Mã học kỳ — kỳ của hóa đơn tiền phòng' }),
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
  availableBeds: z.int(),
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
    beds: z.array(bedSchema),
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

export const availableRoomSchema = z
  .object({
    id: z.uuid(),
    code: z.string().openapi({ example: '301' }),
    floor: z.int(),
    building: buildingRefSchema,
    roomType: roomTypeRefSchema,
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
  .enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'])
  .openapi('ContractStatus');

export const approvedContractSchema = z
  .object({
    id: z.uuid(),
    code: z.string().openapi({ example: 'HD-2026-0001' }),
    registrationId: z.uuid(),
    status: contractStatusSchema.openapi({ description: 'Luôn DRAFT — chờ sinh viên ký' }),
    startDate: z.iso.datetime().openapi({ description: 'Bắt đầu ở của đợt' }),
    endDate: z.iso.datetime().openapi({ description: 'Kết thúc ở của đợt' }),
    price: moneySchema.openapi({ description: 'Snapshot giá loại phòng lúc duyệt' }),
    bed: z.object({
      id: z.uuid(),
      code: z.string().openapi({ example: 'G2' }),
      room: z.object({
        id: z.uuid(),
        code: z.string().openapi({ example: '301' }),
        floor: z.int(),
        building: z.object({ id: z.uuid(), name: z.string() }),
      }),
    }),
  })
  .openapi('ApprovedContract');

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
