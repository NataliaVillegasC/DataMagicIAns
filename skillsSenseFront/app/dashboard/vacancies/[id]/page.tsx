"use client"

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { vacancyService } from '@/lib/services/vacancy.service';
import { applicationService } from '@/lib/services/application.service';
import type { Vacancy, SuggestedApplication, CandidateMatch } from '@/lib/types';

export default function VacancyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedApplication[]>([]);
  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const id = params.id as string;
        
        // Load vacancy
        const vacancyData = await vacancyService.get(id);
        setVacancy(vacancyData);
        
        // Load AI suggestions
        const suggestionsData = await vacancyService.getSuggestedApplications(id);
        setSuggestions(suggestionsData.suggestions || []);
      } catch (error) {
        console.error('Error loading vacancy:', error);
        router.push('/dashboard/vacancies');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [params.id, router]);

  const handleFindMatches = async () => {
    if (!vacancy) return;
    
    setIsLoadingMatches(true);
    
    try {
      const response = await vacancyService.matchCandidates(vacancy.id, {
        min_score: 60,
        top_n: 10,
      });
      
      console.log('Match response:', response);
      
      if (response.success && response.matches) {
        setMatches(response.matches);
      } else {
        console.error('Invalid response format:', response);
        setMatches([]);
      }
    } catch (error: any) {
      console.error('Error finding matches:', error);
      alert(error.message || 'Failed to find matches');
      setMatches([]);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleAcceptSuggestion = async (applicationId: string) => {
    try {
      await applicationService.promoteToPending(applicationId);
      
      // Reload suggestions
      const suggestionsData = await vacancyService.getSuggestedApplications(vacancy!.id);
      setSuggestions(suggestionsData.suggestions || []);
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    }
  };

  const handleRejectSuggestion = async (applicationId: string) => {
    try {
      await applicationService.reject(applicationId);
      
      // Reload suggestions
      const suggestionsData = await vacancyService.getSuggestedApplications(vacancy!.id);
      setSuggestions(suggestionsData.suggestions || []);
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center text-zinc-400 py-12">
        Loading vacancy...
      </div>
    );
  }

  if (!vacancy) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/vacancies">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{vacancy.title}</h1>
            <p className="text-zinc-400 mt-1">{vacancy.location}</p>
          </div>
        </div>

        <Button
          onClick={() => router.push(`/dashboard/vacancies/${vacancy.id}/edit`)}
          className="bg-[#e78a53] hover:bg-[#e78a53]/90"
        >
          Edit
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-zinc-800">
          <TabsTrigger value="suggestions" className="data-[state=active]:bg-[#e78a53]">
            🤖 AI Suggestions ({suggestions.length})
          </TabsTrigger>
          <TabsTrigger value="find-matches" className="data-[state=active]:bg-[#e78a53]">
            Find Matches
          </TabsTrigger>
          <TabsTrigger value="details" className="data-[state=active]:bg-[#e78a53]">
            Details
          </TabsTrigger>
        </TabsList>

        {/* AI Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <span>AI-Matched Candidates</span>
              </CardTitle>
              <CardDescription className="text-zinc-400">
                These candidates were automatically matched when the vacancy was created
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestions.length === 0 ? (
                <p className="text-zinc-400 text-center py-6">
                  No AI suggestions yet. Try creating more candidates.
                </p>
              ) : (
                suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAccept={() => handleAcceptSuggestion(suggestion.id)}
                    onReject={() => handleRejectSuggestion(suggestion.id)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Find Matches Tab */}
        <TabsContent value="find-matches" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Zap className="h-5 w-5 text-[#e78a53]" />
                <span>Manual Candidate Matching</span>
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Find the best matching candidates for this vacancy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleFindMatches}
                disabled={isLoadingMatches}
                className="bg-[#e78a53] hover:bg-[#e78a53]/90"
              >
                {isLoadingMatches ? 'Analyzing candidates...' : 'Find Top Matches'}
              </Button>

              {matches.length > 0 && (
                <div className="space-y-3 mt-4">
                  {matches.map((match, index) => (
                    <MatchCard
                      key={match.candidate.id}
                      match={match}
                      rank={index + 1}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Vacancy Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-white font-medium mb-2">Description</h3>
                <p className="text-zinc-400">{vacancy.description}</p>
              </div>

              <div>
                <h3 className="text-white font-medium mb-2">
                  Required Technologies ({vacancy.technologies.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {vacancy.technologies.map((tech) => (
                    <Badge
                      key={tech.id}
                      className="bg-[#e78a53]/20 text-[#e78a53] border border-[#e78a53]/30"
                    >
                      {tech.example}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white font-medium mb-2">
                  Skill Requirements ({vacancy.skill_requirements.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {vacancy.skill_requirements.map((req) => (
                    <Badge
                      key={req.id}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300"
                    >
                      {req.skill.element_name}
                      {req.required && <span className="ml-1 text-red-400">*</span>}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
}: {
  suggestion: SuggestedApplication;
  onAccept: () => void;
  onReject: () => void;
}) {
  const score = parseFloat(suggestion.affinity_score);
  
  return (
    <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link href={`/dashboard/candidates/${suggestion.candidate}`}>
            <h4 className="text-white font-medium hover:text-[#e78a53] transition-colors">
              {suggestion.candidate_name}
            </h4>
          </Link>
          <p className="text-sm text-zinc-400">{suggestion.candidate_email}</p>
        </div>

        <div className="text-right">
          <div className={`text-2xl font-bold ${
            score >= 85 ? 'text-green-500' : score >= 70 ? 'text-yellow-500' : 'text-zinc-400'
          }`}>
            {score.toFixed(1)}%
          </div>
          <p className="text-xs text-zinc-500">Match</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 mt-4">
        <Button
          onClick={onAccept}
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          Accept
        </Button>
        <Button
          onClick={onReject}
          size="sm"
          variant="outline"
          className="flex-1 border-red-900/50 text-red-400 hover:bg-red-900/20"
        >
          Reject
        </Button>
      </div>
    </div>
  );
}

function MatchCard({ 
  match, 
  rank 
}: { 
  match: CandidateMatch; 
  rank: number;
}) {
  const stars = match.match_score >= 90 ? '⭐⭐⭐' : match.match_score >= 75 ? '⭐⭐' : '⭐';
  
  return (
    <Card className="bg-zinc-800/30 border-zinc-700">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl font-bold text-zinc-600">#{rank}</div>
            <div>
              <Link href={`/dashboard/candidates/${match.candidate.id}`}>
                <h4 className="text-lg font-semibold text-white hover:text-[#e78a53] transition-colors">
                  {match.candidate.full_name} {stars}
                </h4>
              </Link>
              <p className="text-sm text-zinc-400">{match.candidate.email}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-green-500">
              {match.match_score.toFixed(1)}%
            </div>
            <p className="text-xs text-zinc-500">Overall Match</p>
          </div>
        </div>

        {/* Match Breakdown */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-zinc-400">Skills Match</span>
              <span className="text-white font-medium">
                {match.match_details.skills.score.toFixed(1)}%
              </span>
            </div>
            <Progress value={match.match_details.skills.score} className="h-2" />
            <p className="text-xs text-zinc-500 mt-1">
              {match.match_details.skills.required_skills.matched}/
              {match.match_details.skills.required_skills.total} required skills
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-zinc-400">Technologies Match</span>
              <span className="text-white font-medium">
                {match.match_details.technologies.score.toFixed(1)}%
              </span>
            </div>
            <Progress value={match.match_details.technologies.score} className="h-2" />
            <p className="text-xs text-zinc-500 mt-1">
              {match.match_details.technologies.matched}/
              {match.match_details.technologies.total} technologies
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-2">
          <Link href={`/dashboard/candidates/${match.candidate.id}`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-zinc-700 text-zinc-300"
            >
              View Profile
            </Button>
          </Link>
          
          <Button
            size="sm"
            className="flex-1 bg-[#e78a53] hover:bg-[#e78a53]/90"
            onClick={async () => {
              try {
                await applicationService.create({
                  vacancy: vacancy!.id,
                  candidate: match.candidate.id,
                  status: 'PENDING',
                });
                alert('Application created successfully!');
              } catch (error) {
                console.error('Error creating application:', error);
              }
            }}
          >
            Create Application
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

