import '../../config/openapi.js';
import { z } from 'zod';
import { requiredText } from '../../utils/zod-fields.js';

export const dormRuleInputSchema = z
  .object({
    title: requiredText('Tiêu đề', 100).openapi({ example: 'Giờ giấc' }),
    content: requiredText('Nội dung', 3000).openapi({ example: 'Giữ trật tự sau 22h.\nKhách về trước 21h.', description: 'Mỗi dòng là một ý' }),
    sortOrder: z.int('Thứ tự không hợp lệ').min(1, 'Thứ tự từ 1 trở lên').max(999, 'Thứ tự tối đa 999'),
  })
  .openapi('DormRuleInput');

export type DormRuleInput = z.infer<typeof dormRuleInputSchema>;
