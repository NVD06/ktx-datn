import { api, apiGet, apiPatch, apiPost } from './client'
import type { DormRule, DormRuleInput } from '@/types/dorm-rule'

export function listDormRules() {
  return apiGet<DormRule[]>('/dorm-rules')
}

export function createDormRule(input: DormRuleInput) {
  return apiPost<DormRule>('/dorm-rules', input)
}

export function updateDormRule(id: string, input: DormRuleInput) {
  return apiPatch<DormRule>(`/dorm-rules/${id}`, input)
}

export async function deleteDormRule(id: string) {
  await api.delete(`/dorm-rules/${id}`)
}
