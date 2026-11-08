export interface DormRule {
  id: string
  title: string
  content: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type DormRuleInput = Pick<DormRule, 'title' | 'content' | 'sortOrder'>
