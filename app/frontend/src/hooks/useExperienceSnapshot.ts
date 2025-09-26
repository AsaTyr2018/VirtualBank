import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ExperienceSnapshot,
  fetchExperienceSnapshot,
  TransferActivity,
  AccountSnapshot
} from '../api/experience';

const SNAPSHOT_QUERY_KEY = ['experienceSnapshot'];

export function useExperienceSnapshot() {
  return useQuery<ExperienceSnapshot>({
    queryKey: SNAPSHOT_QUERY_KEY,
    queryFn: fetchExperienceSnapshot,
    staleTime: 30_000,
    refetchInterval: 60_000
  });
}

export function useExperienceAccounts(): AccountSnapshot[] {
  const queryClient = useQueryClient();
  const snapshot = queryClient.getQueryData<ExperienceSnapshot>(SNAPSHOT_QUERY_KEY);
  return snapshot?.accounts ?? [];
}

export function useRecentActivity(): TransferActivity[] {
  const queryClient = useQueryClient();
  const snapshot = queryClient.getQueryData<ExperienceSnapshot>(SNAPSHOT_QUERY_KEY);
  return snapshot?.activity ?? [];
}

export function useInvalidateExperienceSnapshot() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SNAPSHOT_QUERY_KEY });
}
