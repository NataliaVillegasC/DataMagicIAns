"use client"

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { applicationService } from '@/lib/services/application.service';
import type { Application, ApplicationStatus } from '@/lib/types';

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  SUGGESTED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  HIRED: 'bg-green-500/20 text-green-400 border-green-500/30',
  REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
  ON_HOLD: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CANCELLED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'ALL'>('ALL');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async (status?: ApplicationStatus) => {
    setIsLoading(true);
    
    try {
      const params: any = {};
      if (status && status !== 'ALL') {
        params.status = status;
      }
      
      const response = await applicationService.list(params);
      setApplications(response.results);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (value: string) => {
    const newStatus = value as ApplicationStatus | 'ALL';
    setStatusFilter(newStatus);
    loadApplications(newStatus === 'ALL' ? undefined : newStatus);
  };

  const handleStatusUpdate = async (id: string, newStatus: ApplicationStatus) => {
    try {
      await applicationService.update(id, { status: newStatus });
      // Reload applications
      loadApplications(statusFilter === 'ALL' ? undefined : statusFilter);
    } catch (error) {
      console.error('Status update failed:', error);
      alert('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Applications</h1>
          <p className="text-zinc-400 mt-1">
            Review candidate applications and AI suggestions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[200px] bg-zinc-800/50 border-zinc-700 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="ALL">All Applications</SelectItem>
            <SelectItem value="SUGGESTED">🤖 AI Suggested</SelectItem>
            <SelectItem value="PENDING">Pending Review</SelectItem>
            <SelectItem value="HIRED">Hired</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="text-center text-zinc-400 py-12">
          Loading applications...
        </div>
      ) : applications.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <FileCheck className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No applications found
            </h3>
            <p className="text-zinc-400">
              Applications will appear here when candidates are matched with vacancies
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ 
  application, 
  onStatusUpdate 
}: { 
  application: Application;
  onStatusUpdate: (id: string, status: ApplicationStatus) => void;
}) {
  const affinityScore = parseFloat(application.affinity_score);
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-green-400';
    if (score >= 60) return 'text-yellow-500';
    return 'text-zinc-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-green-400';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-zinc-500';
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              {application.status === 'SUGGESTED' && (
                <span className="text-sm">🤖</span>
              )}
              <Link href={`/dashboard/candidates/${application.candidate}`}>
                <h3 className="text-lg font-semibold text-white hover:text-[#e78a53] transition-colors inline">
                  {application.candidate_name}
                </h3>
              </Link>
              <Badge className={STATUS_COLORS[application.status]}>
                {application.status}
              </Badge>
            </div>
            
            <p className="text-sm text-zinc-400 mb-1">
              Applied for: <Link href={`/dashboard/vacancies/${application.vacancy}`} className="text-white hover:text-[#e78a53]">{application.vacancy_title}</Link>
            </p>
            <p className="text-sm text-zinc-500">{application.candidate_email}</p>
          </div>
          
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(affinityScore)}`}>
              {affinityScore.toFixed(1)}%
            </div>
            <p className="text-xs text-zinc-500">Match Score</p>
            <Progress 
              value={affinityScore} 
              className="w-24 h-2 mt-2"
              indicatorClassName={getScoreBg(affinityScore)}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Quick Actions for SUGGESTED */}
        {application.status === 'SUGGESTED' && (
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => onStatusUpdate(application.id, 'PENDING')}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              Accept Suggestion
            </Button>
            <Button
              onClick={() => onStatusUpdate(application.id, 'REJECTED')}
              size="sm"
              variant="outline"
              className="border-red-900/50 text-red-400 hover:bg-red-900/20"
            >
              Reject
            </Button>
          </div>
        )}

        {/* Quick Actions for PENDING */}
        {application.status === 'PENDING' && (
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => onStatusUpdate(application.id, 'HIRED')}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              Mark as Hired
            </Button>
            <Button
              onClick={() => onStatusUpdate(application.id, 'ON_HOLD')}
              size="sm"
              variant="outline"
              className="border-blue-900/50 text-blue-400 hover:bg-blue-900/20"
            >
              On Hold
            </Button>
            <Button
              onClick={() => onStatusUpdate(application.id, 'REJECTED')}
              size="sm"
              variant="outline"
              className="border-red-900/50 text-red-400 hover:bg-red-900/20"
            >
              Reject
            </Button>
          </div>
        )}

        <div className="text-xs text-zinc-500">
          Created {new Date(application.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

