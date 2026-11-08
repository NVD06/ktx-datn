import { prisma } from '../../config/prisma.js';
import type { DormRuleInput } from './dorm-rule.schema.js';

export function list() {
  return prisma.dormRule.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
}

export function create(input: DormRuleInput) {
  return prisma.dormRule.create({ data: input });
}

export function update(id: string, input: DormRuleInput) {
  return prisma.dormRule.update({ where: { id }, data: input });
}

export function remove(id: string) {
  return prisma.dormRule.delete({ where: { id }, select: { id: true } });
}
