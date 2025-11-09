"use client"

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVacancies } from '@/hooks/use-vacancies';
import type { VacancyListItem, VacancyStatus } from '@/lib/types';

const STATUS_COLORS: Record<VacancyStatus, string> = {
  ACTIVE: 'bg-green-500/20 text-green-500 border-green-500/30',
  INACTIVE: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30',
  FILL: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  CANCELLED: 'bg-red-500/20 text-red-500 border-red-500/30',
};

export default function VacanciesPage() {
  const { vacancies, isLoading, fetchVacancies, deleteVacancy } = useVacancies();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VacancyStatus | 'ALL'>('ALL');

  useEffect(() => {
    fetchVacancies();
  }, [fetchVacancies]);

  const handleSearch = () => {
    const params: any = {};
    if (searchQuery) params.search = searchQuery;
    if (statusFilter !== 'ALL') params.status = statusFilter;
    
    fetchVacancies(params);
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteVacancy(id);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Vacancies</h1>
          <p className="text-zinc-400 mt-1">
            Manage your job openings
          </p>
        </div>
        
        <Link href="/dashboard/vacancies/new">
          <Button className="bg-[#e78a53] hover:bg-[#e78a53]/90">
            <Plus className="h-4 w-4 mr-2" />
            Create Vacancy
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search vacancies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
          />
        </div>
        
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as VacancyStatus | 'ALL')}
        >
          <SelectTrigger className="w-[180px] bg-zinc-800/50 border-zinc-700 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="FILL">Filled</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={handleSearch}
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Search
        </Button>
      </div>

      {/* Vacancies List */}
      {isLoading ? (
        <div className="text-center text-zinc-400 py-12">
          Loading vacancies...
        </div>
      ) : vacancies.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No vacancies yet
            </h3>
            <p className="text-zinc-400 mb-4">
              Create your first job opening
            </p>
            <Link href="/dashboard/vacancies/new">
              <Button className="bg-[#e78a53] hover:bg-[#e78a53]/90">
                <Plus className="h-4 w-4 mr-2" />
                Create Vacancy
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {vacancies.map((vacancy) => (
            <VacancyCard
              key={vacancy.id}
              vacancy={vacancy}
              onDelete={() => handleDelete(vacancy.id, vacancy.title)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VacancyCard({ 
  vacancy, 
  onDelete 
}: { 
  vacancy: VacancyListItem;
  onDelete: () => void;
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <Link href={`/dashboard/vacancies/${vacancy.id}`}>
                <h3 className="text-lg font-semibold text-white hover:text-[#e78a53] transition-colors">
                  {vacancy.title}
                </h3>
              </Link>
              <Badge className={STATUS_COLORS[vacancy.status]}>
                {vacancy.status}
              </Badge>
            </div>
            
            <p className="text-sm text-zinc-400">{vacancy.company_name}</p>
            {vacancy.location && (
              <p className="text-sm text-zinc-500">📍 {vacancy.location}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Link href={`/dashboard/vacancies/${vacancy.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                View Details
              </Button>
            </Link>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="border-red-900/50 text-red-400 hover:bg-red-900/20"
            >
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="border-zinc-700 text-zinc-300">
              {vacancy.skill_count} skills
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-300">
              {vacancy.technology_count} technologies
            </Badge>
            <Badge variant="outline" className="border-purple-700 text-purple-300">
              {vacancy.application_count} applications
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

