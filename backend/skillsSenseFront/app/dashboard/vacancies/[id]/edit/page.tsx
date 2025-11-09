"use client"

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { vacancyService } from '@/lib/services/vacancy.service';
import apiClient from '@/lib/api-client';
import type { Vacancy, Technology, VacancyCreateRequest } from '@/lib/types';

export default function EditVacancyPage() {
  const params = useParams();
  const router = useRouter();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Available data
  const [availableTechnologies, setAvailableTechnologies] = useState<Technology[]>([]);
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [availableOccupations, setAvailableOccupations] = useState<any[]>([]);
  const [allSelectedTechnologies, setAllSelectedTechnologies] = useState<Technology[]>([]);
  
  // Selected items
  const [selectedTechIds, setSelectedTechIds] = useState<number[]>([]);
  const [selectedSkillReqs, setSelectedSkillReqs] = useState<Array<{
    skill_id: number;
    occupation_id: number | null;
    required: boolean;
  }>>([]);
  
  // Search
  const [techSearch, setTechSearch] = useState('');
  const [skillSearch, setSkillSearch] = useState('');
  const [occupationSearch, setOccupationSearch] = useState('');
  
  // Current skill requirement being created
  const [currentSkillId, setCurrentSkillId] = useState<number | null>(null);
  const [currentOccupationId, setCurrentOccupationId] = useState<number | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    status: 'ACTIVE' as any,
  });

  useEffect(() => {
    async function loadVacancy() {
      try {
        const id = params.id as string;
        const data = await vacancyService.get(id);
        setVacancy(data);
        
        // Set form data
        setFormData({
          title: data.title,
          description: data.description,
          location: data.location,
          status: data.status,
        });
        
        // Set selected technologies
        const techIds = data.technologies.map(t => t.id);
        setSelectedTechIds(techIds);
        setAllSelectedTechnologies(data.technologies);
        
        // Set selected skill requirements
        const skillReqs = data.skill_requirements.map(sr => ({
          skill_id: sr.skill.id,
          occupation_id: sr.occupation?.id || null,
          required: sr.required,
        }));
        setSelectedSkillReqs(skillReqs);
      } catch (error) {
        console.error('Error loading vacancy:', error);
        router.push('/dashboard/vacancies');
      } finally {
        setIsLoading(false);
      }
    }

    loadVacancy();
  }, [params.id, router]);

  useEffect(() => {
    async function loadData() {
      try {
        const techsResponse = await apiClient.get('/technologies/?limit=100');
        const techs = techsResponse.results || techsResponse;
        setAvailableTechnologies(Array.isArray(techs) ? techs : []);
        
        const skillsResponse = await apiClient.get('/skills/');
        const skills = skillsResponse.results || skillsResponse;
        setAvailableSkills(Array.isArray(skills) ? skills : []);
        
        const occupationsResponse = await apiClient.get('/occupations/?limit=100');
        const occupations = occupationsResponse.results || occupationsResponse;
        setAvailableOccupations(Array.isArray(occupations) ? occupations : []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    const selected = availableTechnologies.filter(t => selectedTechIds.includes(t.id));
    setAllSelectedTechnologies(prev => {
      const merged = [...prev];
      selected.forEach(tech => {
        if (!merged.find(t => t.id === tech.id)) {
          merged.push(tech);
        }
      });
      return merged;
    });
  }, [selectedTechIds, availableTechnologies]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const toggleTechnology = (techId: number) => {
    setSelectedTechIds(prev =>
      prev.includes(techId)
        ? prev.filter(id => id !== techId)
        : [...prev, techId]
    );
  };

  const addSkillRequirement = () => {
    if (!currentSkillId) {
      setError('Please select a skill');
      return;
    }

    const exists = selectedSkillReqs.some(
      sr => sr.skill_id === currentSkillId && sr.occupation_id === currentOccupationId
    );

    if (exists) {
      setError('This skill requirement is already added');
      return;
    }

    setSelectedSkillReqs(prev => [
      ...prev,
      {
        skill_id: currentSkillId,
        occupation_id: currentOccupationId,
        required: true,
      }
    ]);

    setCurrentSkillId(null);
    setCurrentOccupationId(null);
    setError(null);
  };

  const removeSkillRequirement = (index: number) => {
    setSelectedSkillReqs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    setIsUpdating(true);
    
    try {
      // Create new skill requirements if needed
      const skillRequirementIds: string[] = [];
      
      for (const skillReq of selectedSkillReqs) {
        try {
          const created = await apiClient.post('/skill-requirements/', skillReq);
          skillRequirementIds.push(created.id);
        } catch (err) {
          console.error('Error creating skill requirement:', err);
        }
      }
      
      const dataToSend: Partial<VacancyCreateRequest> = {
        ...formData,
        technology_ids: selectedTechIds,
        skill_requirement_ids: skillRequirementIds,
      };
      
      await vacancyService.update(vacancy!.id, dataToSend);
      
      // Redirect to vacancy detail
      router.push(`/dashboard/vacancies/${vacancy!.id}`);
    } catch (error: any) {
      console.error('Update error:', error);
      const errorMsg = error.errors 
        ? Object.values(error.errors).flat().join(', ')
        : error.message || 'Failed to update vacancy';
      setError(errorMsg);
    } finally {
      setIsUpdating(false);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/vacancies/${vacancy.id}`}>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Edit Vacancy</h1>
          <p className="text-zinc-400 mt-1">{vacancy.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Vacancy Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">Job Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-white">Location *</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="bg-zinc-800/50 border-zinc-700 text-white min-h-[150px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-white">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="FILL">Filled</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Technologies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white">Required Technologies</Label>
                <span className="text-sm text-zinc-400">{selectedTechIds.length} selected</span>
              </div>
              
              <Input
                type="search"
                placeholder="Search technologies..."
                value={techSearch}
                onChange={(e) => setTechSearch(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
              />

              {selectedTechIds.length > 0 && (
                <div className="bg-[#e78a53]/10 border border-[#e78a53]/30 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-[#e78a53] font-medium">Selected:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTechIds.map((techId) => {
                      const tech = allSelectedTechnologies.find(t => t.id === techId);
                      return (
                        <Badge key={techId} className="bg-[#e78a53] text-white">
                          {tech ? tech.example : `Tech #${techId}`}
                          <button
                            type="button"
                            onClick={() => toggleTechnology(techId)}
                            className="ml-2 hover:text-red-300 font-bold"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex items-center space-x-4 pt-6">
              <Link href={`/dashboard/vacancies/${vacancy.id}`} className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-zinc-700 text-zinc-300"
                >
                  Cancel
                </Button>
              </Link>
              
              <Button
                type="submit"
                disabled={isUpdating}
                className="flex-1 bg-[#e78a53] hover:bg-[#e78a53]/90"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Vacancy'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

