"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Briefcase, FileCheck, TrendingUp } from 'lucide-react';
import apiClient from '@/lib/api-client';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    candidates: 0,
    vacancies: 0,
    applications: 0,
    suggested: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Load basic stats
        const [candidatesRes, vacanciesRes, applicationsRes] = await Promise.all([
          apiClient.get('/candidates/'),
          apiClient.get('/vacancies/'),
          apiClient.get('/applications/'),
        ]);

        setStats({
          candidates: candidatesRes.count || 0,
          vacancies: vacanciesRes.count || 0,
          applications: applicationsRes.count || 0,
          suggested: applicationsRes.results?.filter((a: any) => a.status === 'SUGGESTED').length || 0,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.first_name || user?.username}!
        </h1>
        <p className="text-zinc-400 mt-1">
          {user?.company?.name} Dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Candidates
            </CardTitle>
            <Users className="h-4 w-4 text-[#e78a53]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isLoading ? '...' : stats.candidates}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Active Vacancies
            </CardTitle>
            <Briefcase className="h-4 w-4 text-[#e78a53]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isLoading ? '...' : stats.vacancies}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Applications
            </CardTitle>
            <FileCheck className="h-4 w-4 text-[#e78a53]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isLoading ? '...' : stats.applications}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              AI Suggestions
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isLoading ? '...' : stats.suggested}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              🤖 Auto-matched candidates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/dashboard/candidates/new"
              className="block w-full text-left px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-white transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-[#e78a53]" />
                <div>
                  <div className="font-medium">Add New Candidate</div>
                  <div className="text-sm text-zinc-400">Upload CV and extract data with AI</div>
                </div>
              </div>
            </a>

            <a
              href="/dashboard/vacancies/new"
              className="block w-full text-left px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-white transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Briefcase className="h-5 w-5 text-[#e78a53]" />
                <div>
                  <div className="font-medium">Create Vacancy</div>
                  <div className="text-sm text-zinc-400">Auto-match with candidates</div>
                </div>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-400 text-sm">
              No recent activity
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

