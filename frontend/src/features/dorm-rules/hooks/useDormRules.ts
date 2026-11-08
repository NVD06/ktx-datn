import { useMutation, useQuery } from '@tanstack/react-query'
import * as dormRulesApi from '@/api/dorm-rules'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { DormRuleInput } from '@/types/dorm-rule'

export const dormRuleKeys = { all: ['dorm-rules'] as const }

export function useDormRules() {
  return useQuery({ queryKey: dormRuleKeys.all, queryFn: dormRulesApi.listDormRules })
}

export function useSaveDormRule() {
  const invalidate = useInvalidate(dormRuleKeys.all)
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: DormRuleInput }) =>
      id ? dormRulesApi.updateDormRule(id, input) : dormRulesApi.createDormRule(input),
    onSuccess: invalidate,
  })
}

export function useDeleteDormRule() {
  const invalidate = useInvalidate(dormRuleKeys.all)
  return useMutation({ mutationFn: dormRulesApi.deleteDormRule, onSuccess: invalidate })
}
