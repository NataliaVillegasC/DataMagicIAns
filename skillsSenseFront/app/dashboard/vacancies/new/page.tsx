"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
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
import type { VacancyCreateRequest, Technology, Skill } from '@/lib/types';

export default function NewVacancyPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Available data
  const [availableTechnologies, setAvailableTechnologies] = useState<Technology[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [availableOccupations, setAvailableOccupations] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  
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
  const [formData, setFormData] = useState<VacancyCreateRequest>({
    title: '',
    description: '',
    location: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    async function loadInitialData() {
      try {
        // Load technologies
        const techsResponse = await apiClient.get('/technologies/?limit=100');
        const techs = techsResponse.results || techsResponse;
        setAvailableTechnologies(Array.isArray(techs) ? techs : []);
        
        // Load skills
        const skillsResponse = await apiClient.get('/skills/');
        const skills = skillsResponse.results || skillsResponse;
        setAvailableSkills(Array.isArray(skills) ? skills : []);
        
        // Load occupations
        const occupationsResponse = await apiClient.get('/occupations/?limit=100');
        const occupations = occupationsResponse.results || occupationsResponse;
        setAvailableOccupations(Array.isArray(occupations) ? occupations : []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadInitialData();
  }, []);

  // Keep track of all selected technologies (even if not in current search)
  const [allSelectedTechnologies, setAllSelectedTechnologies] = useState<Technology[]>([]);

  // When technologies are selected, save them
  useEffect(() => {
    const selected = availableTechnologies.filter(t => selectedTechIds.includes(t.id));
    setAllSelectedTechnologies(prev => {
      // Merge with existing, avoiding duplicates
      const merged = [...prev];
      selected.forEach(tech => {
        if (!merged.find(t => t.id === tech.id)) {
          merged.push(tech);
        }
      });
      return merged;
    });
  }, [selectedTechIds, availableTechnologies]);

  // Search technologies when search term changes
  useEffect(() => {
    const searchTechs = async () => {
      if (!techSearch) {
        // Reload default
        const techsResponse = await apiClient.get('/technologies/?limit=100');
        const techs = techsResponse.results || techsResponse;
        setAvailableTechnologies(Array.isArray(techs) ? techs : []);
        return;
      }

      setIsSearching(true);
      try {
        const techsResponse = await apiClient.get(`/technologies/?search=${techSearch}&limit=100`);
        const techs = techsResponse.results || techsResponse;
        setAvailableTechnologies(Array.isArray(techs) ? techs : []);
      } catch (error) {
        console.error('Error searching technologies:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchTechs, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [techSearch]);

  // Search skills when search term changes
  useEffect(() => {
    const searchSkills = async () => {
      if (!skillSearch) {
        const skillsResponse = await apiClient.get('/skills/');
        const skills = skillsResponse.results || skillsResponse;
        setAvailableSkills(Array.isArray(skills) ? skills : []);
        return;
      }

      setIsSearching(true);
      try {
        const skillsResponse = await apiClient.get(`/skills/?search=${skillSearch}`);
        const skills = skillsResponse.results || skillsResponse;
        setAvailableSkills(Array.isArray(skills) ? skills : []);
      } catch (error) {
        console.error('Error searching skills:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchSkills, 300);
    return () => clearTimeout(timeoutId);
  }, [skillSearch]);

  // Search occupations when search term changes
  useEffect(() => {
    const searchOccupations = async () => {
      if (!occupationSearch) {
        const occupationsResponse = await apiClient.get('/occupations/?limit=100');
        const occupations = occupationsResponse.results || occupationsResponse;
        setAvailableOccupations(Array.isArray(occupations) ? occupations : []);
        return;
      }

      setIsSearching(true);
      try {
        const occupationsResponse = await apiClient.get(`/occupations/?search=${occupationSearch}&limit=100`);
        const occupations = occupationsResponse.results || occupationsResponse;
        setAvailableOccupations(Array.isArray(occupations) ? occupations : []);
      } catch (error) {
        console.error('Error searching occupations:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchOccupations, 300);
    return () => clearTimeout(timeoutId);
  }, [occupationSearch]);

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

    // Check if already exists
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

    // Reset selection
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
    
    if (selectedTechIds.length === 0 && selectedSkillReqs.length === 0) {
      setError('Please select at least one technology or skill requirement');
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Create skill requirements in backend first (get_or_create will happen there)
      const skillRequirementIds: string[] = [];
      
      for (const skillReq of selectedSkillReqs) {
        try {
          const created = await apiClient.post('/skill-requirements/', skillReq);
          skillRequirementIds.push(created.id);
        } catch (err) {
          console.error('Error creating skill requirement:', err);
        }
      }
      
      const dataToSend: VacancyCreateRequest = {
        ...formData,
        technology_ids: selectedTechIds,
        skill_requirement_ids: skillRequirementIds,
      };
      
      const newVacancy = await vacancyService.create(dataToSend);
      
      // Redirect to vacancy detail
      router.push(`/dashboard/vacancies/${newVacancy.id}`);
    } catch (error: any) {
      console.error('Create error:', error);
      const errorMsg = error.errors 
        ? Object.values(error.errors).flat().join(', ')
        : error.message || 'Failed to create vacancy';
      setError(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  // No need to filter locally anymore, backend handles it
  const filteredTechs = availableTechnologies;
  const filteredSkills = availableSkills;
  const filteredOccupations = availableOccupations;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
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
          <h1 className="text-3xl font-bold text-white">Create New Vacancy</h1>
          <p className="text-zinc-400 mt-1">
            AI will automatically match candidates when you create this vacancy
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Vacancy Information</CardTitle>
            <CardDescription className="text-zinc-400">
              Fill in the details for this job opening
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">
                  Job Title *
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Senior Python Developer"
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-white">
                  Location *
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Bogotá, Colombia (Remote OK)"
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">
                  Job Description *
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the role, responsibilities, and requirements..."
                  className="bg-zinc-800/50 border-zinc-700 text-white min-h-[150px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-white">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Technologies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white">
                  Required Technologies
                </Label>
                <span className="text-sm text-zinc-400">
                  {selectedTechIds.length} selected
                </span>
              </div>
              
              <Input
                type="search"
                placeholder="Search technologies..."
                value={techSearch}
                onChange={(e) => setTechSearch(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
              />

              {/* Selected Technologies - Always visible */}
              {selectedTechIds.length > 0 && (
                <div className="bg-[#e78a53]/10 border border-[#e78a53]/30 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-[#e78a53] font-medium">Selected ({selectedTechIds.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTechIds.map((techId) => {
                      // Find from all selected technologies cache
                      const tech = allSelectedTechnologies.find(t => t.id === techId);
                      
                      return (
                        <Badge
                          key={techId}
                          className="bg-[#e78a53] text-white hover:bg-[#e78a53]/90"
                        >
                          {tech ? tech.example : `Technology #${techId}`}
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

              {/* Available Technologies to Select */}
              <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                {isLoadingData ? (
                  <p className="text-zinc-400 text-center py-4">Loading technologies...</p>
                ) : availableTechnologies.length === 0 ? (
                  <p className="text-zinc-400 text-center py-4">
                    No technologies available. Please load O*NET data first.
                  </p>
                ) : filteredTechs.length === 0 ? (
                  <p className="text-zinc-400 text-center py-4">No technologies match your search</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filteredTechs.slice(0, 100).map((tech) => {
                      const isSelected = selectedTechIds.includes(tech.id);
                      return (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() => toggleTechnology(tech.id)}
                          className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            isSelected
                              ? 'bg-[#e78a53] text-white font-medium'
                              : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          {tech.example}
                          {isSelected && ' ✓'}
                        </button>
                      );
                    })}
                    {filteredTechs.length > 100 && (
                      <p className="col-span-full text-zinc-500 text-xs text-center pt-2">
                        Showing first 100 results. Use search to narrow down.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Skill Requirements Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white">
                  Skill Requirements
                </Label>
                <span className="text-sm text-zinc-400">
                  {selectedSkillReqs.length} selected
                </span>
              </div>

              {/* Skill Requirement Creator */}
              <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Skill */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Select Skill *</Label>
                    <Input
                      type="search"
                      placeholder="Search skills..."
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      className="bg-zinc-800/50 border-zinc-700 text-white mb-2"
                    />
                    <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-2 max-h-[200px] overflow-y-auto">
                      {isLoadingData ? (
                        <p className="text-zinc-400 text-center py-2 text-sm">Loading...</p>
                      ) : filteredSkills.length === 0 ? (
                        <p className="text-zinc-400 text-center py-2 text-sm">No skills found</p>
                      ) : (
                        filteredSkills.map((skill) => (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => setCurrentSkillId(skill.id)}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                              currentSkillId === skill.id
                                ? 'bg-[#e78a53] text-white'
                                : 'text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            {skill.element_name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Select Occupation (Optional) */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">
                      For Occupation (Optional)
                    </Label>
                    <Input
                      type="search"
                      placeholder="Search occupations..."
                      value={occupationSearch}
                      onChange={(e) => setOccupationSearch(e.target.value)}
                      className="bg-zinc-800/50 border-zinc-700 text-white mb-2"
                    />
                    <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-2 max-h-[200px] overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => setCurrentOccupationId(null)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors mb-1 ${
                          currentOccupationId === null
                            ? 'bg-[#e78a53] text-white'
                            : 'text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        <em>No specific occupation (general skill)</em>
                      </button>
                      {isLoadingData ? (
                        <p className="text-zinc-400 text-center py-2 text-sm">Loading...</p>
                      ) : filteredOccupations.length === 0 ? (
                        <p className="text-zinc-400 text-center py-2 text-sm">No occupations found</p>
                      ) : (
                        filteredOccupations.map((occupation) => (
                          <button
                            key={occupation.id}
                            type="button"
                            onClick={() => setCurrentOccupationId(occupation.id)}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                              currentOccupationId === occupation.id
                                ? 'bg-[#e78a53] text-white'
                                : 'text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            {occupation.alternate_title}
                            {occupation.short_title && (
                              <span className="text-xs opacity-70"> ({occupation.short_title})</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Button */}
                <Button
                  type="button"
                  onClick={addSkillRequirement}
                  disabled={!currentSkillId}
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Skill Requirement
                </Button>
              </div>

              {/* Selected Skill Requirements */}
              {selectedSkillReqs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">Selected Skill Requirements:</p>
                  <div className="space-y-2">
                    {selectedSkillReqs.map((skillReq, index) => {
                      const skill = availableSkills.find(s => s.id === skillReq.skill_id);
                      const occupation = availableOccupations.find(o => o.id === skillReq.occupation_id);
                      
                      return (
                        <div
                          key={index}
                          className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-white font-medium">{skill?.element_name || 'Unknown Skill'}</div>
                            {occupation ? (
                              <div className="text-xs text-zinc-400">
                                for {occupation.alternate_title}
                              </div>
                            ) : (
                              <div className="text-xs text-zinc-500 italic">General skill (no specific occupation)</div>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSkillRequirement(index)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-4 pt-6">
              <Link href="/dashboard/vacancies" className="flex-1">
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
                disabled={isCreating}
                className="flex-1 bg-[#e78a53] hover:bg-[#e78a53]/90"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating vacancy...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Vacancy
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

