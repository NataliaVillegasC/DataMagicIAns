/**
 * Vacancies Hook
 * 
 * Custom hook for managing vacancies state and operations.
 */

import { useState, useCallback } from 'react';
import { vacancyService } from '@/lib/services/vacancy.service';
import type {
  Vacancy,
  VacancyListItem,
  VacancyCreateRequest,
  VacancyStatus,
  PaginatedResponse,
} from '@/lib/types';

export function useVacancies() {
  const [vacancies, setVacancies] = useState<VacancyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    count: number;
    next: string | null;
    previous: string | null;
  } | null>(null);

  const fetchVacancies = useCallback(async (params?: {
    status?: VacancyStatus;
    search?: string;
    page?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response: PaginatedResponse<VacancyListItem> = await vacancyService.list(params);
      setVacancies(response.results);
      setPagination({
        count: response.count,
        next: response.next,
        previous: response.previous,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vacancies');
      console.error('Error fetching vacancies:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createVacancy = useCallback(async (data: VacancyCreateRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newVacancy = await vacancyService.create(data);
      // Refresh list
      await fetchVacancies();
      return newVacancy;
    } catch (err: any) {
      setError(err.message || 'Failed to create vacancy');
      console.error('Error creating vacancy:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchVacancies]);

  const updateVacancy = useCallback(async (
    id: string,
    data: Partial<VacancyCreateRequest>
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updated = await vacancyService.update(id, data);
      // Update local state
      setVacancies(prev =>
        prev.map(v => v.id === id ? { ...v, ...data as any } : v)
      );
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update vacancy');
      console.error('Error updating vacancy:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteVacancy = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await vacancyService.delete(id);
      // Remove from local state
      setVacancies(prev => prev.filter(v => v.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete vacancy');
      console.error('Error deleting vacancy:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    vacancies,
    isLoading,
    error,
    pagination,
    fetchVacancies,
    createVacancy,
    updateVacancy,
    deleteVacancy,
  };
}

