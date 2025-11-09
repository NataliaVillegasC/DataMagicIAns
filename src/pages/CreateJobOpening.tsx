import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { createJobOpening } from '@/lib/supabase';

interface SkillRequirement {
  name: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  isNiceToHave?: boolean;
}

export default function CreateJobOpening() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [jobType, setJobType] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [targetCloseDate, setTargetCloseDate] = useState('');
  const [description, setDescription] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [location, setLocation] = useState('');
  
  const [requiredSkills, setRequiredSkills] = useState<SkillRequirement[]>([]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<SkillRequirement[]>([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [currentImportance, setCurrentImportance] = useState<'critical' | 'high' | 'medium' | 'low'>('high');

  const handleAddSkill = (isNiceToHave: boolean = false) => {
    if (!currentSkill.trim()) return;
    
    const newSkill: SkillRequirement = {
      name: currentSkill.trim(),
      importance: currentImportance,
      isNiceToHave,
    };
    
    if (isNiceToHave) {
      setNiceToHaveSkills([...niceToHaveSkills, newSkill]);
    } else {
      setRequiredSkills([...requiredSkills, newSkill]);
    }
    
    setCurrentSkill('');
    setCurrentImportance('high');
  };

  const handleRemoveSkill = (index: number, isNiceToHave: boolean = false) => {
    if (isNiceToHave) {
      setNiceToHaveSkills(niceToHaveSkills.filter((_, i) => i !== index));
    } else {
      setRequiredSkills(requiredSkills.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Job title is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!jobType) {
      toast({
        title: "Validation Error",
        description: "Job type is required",
        variant: "destructive",
      });
      return;
    }
    
    const hasCriticalSkills = requiredSkills.some(s => s.importance === 'critical' || s.importance === 'high');
    if (!hasCriticalSkills) {
      toast({
        title: "Validation Error",
        description: "At least one critical or high importance skill is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const jobData = {
        title: title.trim(),
        department: department.trim() || null,
        job_type: jobType,
        urgency,
        target_close_date: targetCloseDate || null,
        description: description.trim() || null,
        salary_min: salaryMin ? parseInt(salaryMin) : null,
        salary_max: salaryMax ? parseInt(salaryMax) : null,
        location: location.trim() || null,
        required_skills: requiredSkills,
        nice_to_have_skills: niceToHaveSkills,
      };
      
      const newJob = await createJobOpening(jobData);
      
      toast({
        title: "Success!",
        description: "Job opening created successfully",
      });
      
      navigate(`/openings`);
    } catch (error: any) {
      console.error('Error creating job:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create job opening",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getImportanceBadgeVariant = (importance: string) => {
    switch (importance) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/openings')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Job Openings
          </Button>
          
          <h1 className="text-3xl font-bold">Create New Job Opening</h1>
          <p className="text-muted-foreground mt-2">
            Define the position and its skill requirements
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Engineering"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobType">Job Type *</Label>
                  <Select value={jobType} onValueChange={setJobType}>
                    <SelectTrigger id="jobType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger id="urgency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="targetDate">Target Close Date</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={targetCloseDate}
                    onChange={(e) => setTargetCloseDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Job description, responsibilities, requirements..."
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* Compensation & Location */}
          <Card>
            <CardHeader>
              <CardTitle>Compensation & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salaryMin">Salary Min ($)</Label>
                  <Input
                    id="salaryMin"
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="80000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="salaryMax">Salary Max ($)</Label>
                  <Input
                    id="salaryMax"
                    type="number"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    placeholder="120000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="San Francisco, CA"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Required Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
              <CardDescription>At least one critical or high importance skill required</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={currentSkill}
                  onChange={(e) => setCurrentSkill(e.target.value)}
                  placeholder="Skill name..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                />
                <Select value={currentImportance} onValueChange={(v: any) => setCurrentImportance(v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={() => handleAddSkill()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {requiredSkills.map((skill, index) => (
                  <Badge key={index} variant={getImportanceBadgeVariant(skill.importance)} className="pl-3 pr-1 py-1">
                    {skill.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(index)}
                      className="ml-2 hover:bg-background/20 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Nice-to-Have Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Nice-to-Have Skills</CardTitle>
              <CardDescription>Optional skills that are beneficial but not required</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={currentSkill}
                  onChange={(e) => setCurrentSkill(e.target.value)}
                  placeholder="Skill name..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill(true))}
                />
                <Button type="button" onClick={() => handleAddSkill(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {niceToHaveSkills.map((skill, index) => (
                  <Badge key={index} variant="outline" className="pl-3 pr-1 py-1">
                    {skill.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(index, true)}
                      className="ml-2 hover:bg-accent rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/openings')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Job Opening'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
