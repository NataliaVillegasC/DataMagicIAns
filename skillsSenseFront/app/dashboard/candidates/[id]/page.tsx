"use client"

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, Linkedin, Github, Globe, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { candidateService } from '@/lib/services/candidate.service';
import type { Candidate } from '@/lib/types';

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCandidate() {
      try {
        const id = params.id as string;
        const data = await candidateService.get(id);
        setCandidate(data);
      } catch (error) {
        console.error('Error loading candidate:', error);
        router.push('/dashboard/candidates');
      } finally {
        setIsLoading(false);
      }
    }

    loadCandidate();
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="text-center text-zinc-400 py-12">
        Loading candidate...
      </div>
    );
  }

  if (!candidate) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/candidates">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{candidate.full_name}</h1>
            <p className="text-zinc-400 mt-1">{candidate.email}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {candidate.cv_file?.file_url && (
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300"
              onClick={() => window.open(candidate.cv_file?.file_url, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download CV
            </Button>
          )}
          
          <Button
            onClick={() => router.push(`/dashboard/candidates/${candidate.id}/edit`)}
            className="bg-[#e78a53] hover:bg-[#e78a53]/90"
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {candidate.phone && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-[#e78a53]" />
                <div>
                  <p className="text-xs text-zinc-500">Phone</p>
                  <p className="text-sm text-white">{candidate.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {candidate.location && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-[#e78a53]" />
                <div>
                  <p className="text-xs text-zinc-500">Location</p>
                  <p className="text-sm text-white">{candidate.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {candidate.linkedin_url && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 hover:text-[#e78a53] transition-colors">
                <Linkedin className="h-5 w-5 text-[#e78a53]" />
                <div>
                  <p className="text-xs text-zinc-500">LinkedIn</p>
                  <p className="text-sm text-white">View Profile →</p>
                </div>
              </a>
            </CardContent>
          </Card>
        )}

        {candidate.github_url && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <a href={candidate.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 hover:text-[#e78a53] transition-colors">
                <Github className="h-5 w-5 text-[#e78a53]" />
                <div>
                  <p className="text-xs text-zinc-500">GitHub</p>
                  <p className="text-sm text-white">View Profile →</p>
                </div>
              </a>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="skills" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-zinc-800">
          <TabsTrigger value="skills" className="data-[state=active]:bg-[#e78a53]">
            Skills ({candidate.skills.length})
          </TabsTrigger>
          <TabsTrigger value="technologies" className="data-[state=active]:bg-[#e78a53]">
            Technologies ({candidate.technologies.length})
          </TabsTrigger>
          <TabsTrigger value="extraction" className="data-[state=active]:bg-[#e78a53]">
            CV Extraction
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skills" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Matched Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill) => (
                    <Badge
                      key={skill.id}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 hover:border-[#e78a53] hover:text-[#e78a53] transition-colors"
                    >
                      {skill.element_name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400">No skills matched yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technologies" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Matched Technologies</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.technologies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.technologies.map((tech) => (
                    <Badge
                      key={tech.id}
                      className="bg-[#e78a53]/20 text-[#e78a53] hover:bg-[#e78a53]/30 border border-[#e78a53]/30"
                    >
                      {tech.example}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400">No technologies matched yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extraction" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">CV Extraction Result</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.cv_file?.extraction_result ? (
                <pre className="bg-zinc-800/50 p-4 rounded-lg overflow-auto text-xs text-zinc-300">
                  {JSON.stringify(candidate.cv_file.extraction_result, null, 2)}
                </pre>
              ) : (
                <p className="text-zinc-400">No extraction data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

