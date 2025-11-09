/**
 * Candidates Hook
 * 
 * Custom hook for managing candidates state and operations.
 */

import { useState, useCallback } from 'react';
import { candidateService } from '@/lib/services/candidate.service';
import type {
  Candidate,
  CandidateListItem,
  CandidateCreateRequest,
  PaginatedResponse,
} from '@/lib/types';

export function useCandidates() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    count: number;
    next: string | null;
    previous: string | null;
  } | null>(null);

  const fetchCandidates = useCallback(async (params?: {
    search?: string;
    page?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response: PaginatedResponse<CandidateListItem> = await candidateService.list(params);
      setCandidates(response.results);
      setPagination({
        count: response.count,
        next: response.next,
        previous: response.previous,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch candidates');
      console.error('Error fetching candidates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCandidate = useCallback(async (data: CandidateCreateRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newCandidate = await candidateService.create(data);
      // Refresh list
      await fetchCandidates();
      return newCandidate;
    } catch (err: any) {
      setError(err.message || 'Failed to create candidate');
      console.error('Error creating candidate:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCandidates]);

  const updateCandidate = useCallback(async (
    id: string,
    data: Partial<CandidateCreateRequest>
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updated = await candidateService.update(id, data);
      // Update local state
      setCandidates(prev =>
        prev.map(c => c.id === id ? { ...c, ...data as any } : c)
      );
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update candidate');
      console.error('Error updating candidate:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteCandidate = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await candidateService.delete(id);
      // Remove from local state
      setCandidates(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete candidate');
      console.error('Error deleting candidate:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    candidates,
    isLoading,
    error,
    pagination,
    fetchCandidates,
    createCandidate,
    updateCandidate,
    deleteCandidate,
  };
}

