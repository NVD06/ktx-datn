import { describe, expect, it } from 'vitest';
import { create, list, remove, update } from '../src/modules/dorm-rules/dorm-rule.service.js';

describe('Nội quy KTX', () => {
  it('xếp theo thứ tự, sửa và xóa; mục không tồn tại thì P2025 (404)', async () => {
    const second = await create({ title: 'Vệ sinh', content: 'Đổ rác đúng giờ', sortOrder: 2 });
    await create({ title: 'Chỗ ở', content: 'Ở đúng giường', sortOrder: 1 });
    expect((await list()).map((r) => r.title)).toEqual(['Chỗ ở', 'Vệ sinh']);
    await update(second.id, { title: 'Giờ giấc', content: 'Giữ trật tự sau 22h', sortOrder: 3 });
    expect((await list()).map((r) => r.title)).toEqual(['Chỗ ở', 'Giờ giấc']);
    await remove(second.id);
    await expect(remove(second.id)).rejects.toMatchObject({ code: 'P2025' });
    await expect(update(second.id, { title: 'x', content: 'y', sortOrder: 1 })).rejects.toMatchObject({ code: 'P2025' });
    expect(await list()).toHaveLength(1);
  });
});
