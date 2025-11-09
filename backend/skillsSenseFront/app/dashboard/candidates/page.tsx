"use client"

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCandidates } from '@/hooks/use-candidates';
import type { CandidateListItem } from '@/lib/types';

export default function CandidatesPage() {
  const { candidates, isLoading, fetchCandidates, deleteCandidate } = useCandidates();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleSearch = () => {
    fetchCandidates({ search: searchQuery });
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteCandidate(id);
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
          <h1 className="text-3xl font-bold text-white">Candidates</h1>
          <p className="text-zinc-400 mt-1">
            Manage your talent pool
          </p>
        </div>
        
        <Link href="/dashboard/candidates/new">
          <Button className="bg-[#e78a53] hover:bg-[#e78a53]/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
          />
        </div>
        <Button
          onClick={handleSearch}
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Search
        </Button>
      </div>

      {/* Candidates List */}
      {isLoading ? (
        <div className="text-center text-zinc-400 py-12">
          Loading candidates...
        </div>
      ) : candidates.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No candidates yet
            </h3>
            <p className="text-zinc-400 mb-4">
              Start by adding your first candidate
            </p>
            <Link href="/dashboard/candidates/new">
              <Button className="bg-[#e78a53] hover:bg-[#e78a53]/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Candidate
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onDelete={() => handleDelete(candidate.id, candidate.full_name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CandidateCard({ 
  candidate, 
  onDelete 
}: { 
  candidate: CandidateListItem;
  onDelete: () => void;
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link href={`/dashboard/candidates/${candidate.id}`}>
              <h3 className="text-lg font-semibold text-white hover:text-[#e78a53] transition-colors">
                {candidate.full_name}
              </h3>
            </Link>
            <p className="text-sm text-zinc-400">{candidate.email}</p>
            {candidate.phone && (
              <p className="text-sm text-zinc-500">{candidate.phone}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Link href={`/dashboard/candidates/${candidate.id}`}>
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
        <div className="flex items-center space-x-6 text-sm">
          {candidate.location && (
            <div className="text-zinc-400">
              📍 {candidate.location}
            </div>
          )}
          
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="border-zinc-700 text-zinc-300">
              {candidate.skills_count} skills
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-300">
              {candidate.technologies_count} technologies
            </Badge>
          </div>
          
          {candidate.linkedin_url && (
            <a
              href={candidate.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-[#e78a53] transition-colors"
            >
              LinkedIn →
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

