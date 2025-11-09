import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import FileUpload from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { createCandidate, getAllJobOpenings, createApplication } from '@/lib/supabase';

export default function UploadCandidate() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobOpenings, setJobOpenings] = useState<any[]>([]);
  const [addToJob, setAddToJob] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPosition, setCurrentPosition] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [location, setLocation] = useState('');
  const [availability, setAvailability] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadJobOpenings();
  }, []);

  const loadJobOpenings = async () => {
    try {
      const jobs = await getAllJobOpenings();
      setJobOpenings(jobs || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!email.trim() || !email.includes('@')) {
      toast({
        title: "Validation Error",
        description: "Valid email is required",
        variant: "destructive",
      });
      return;
    }
    
    if (addToJob && !selectedJobId) {
      toast({
        title: "Validation Error",
        description: "Please select a job opening",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const candidateData = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        current_position: currentPosition.trim() || null,
        current_company: currentCompany.trim() || null,
        years_experience: yearsExperience ? parseInt(yearsExperience) : null,
        location: location.trim() || null,
        availability: availability || null,
        linkedin_url: linkedinUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        notes: notes.trim() || null,
      };
      
      const newCandidate = await createCandidate(candidateData, cvFile || undefined);
      
      if (newCandidate && addToJob && selectedJobId) {
        await createApplication(newCandidate.id, selectedJobId);
      }
      
      toast({
        title: "Success!",
        description: `Candidate ${addToJob ? 'uploaded and added to job' : 'uploaded successfully'}`,
      });
      
      if (newCandidate) {
        navigate(`/candidates/${newCandidate.id}`);
      }
    } catch (error: any) {
      console.error('Error creating candidate:', error);
      
      // Handle duplicate email error
      if (error.message?.includes('duplicate key') || error.message?.includes('candidates_email_key')) {
        toast({
          title: "Duplicate Email",
          description: "A candidate with this email already exists in the database.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to upload candidate",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/search')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Candidates
          </Button>
          
          <h1 className="text-3xl font-bold">Add New Candidate</h1>
          <p className="text-muted-foreground mt-2">
            Upload CV and complete candidate information
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
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yearsExp">Years of Experience</Label>
                  <Select value={yearsExperience} onValueChange={setYearsExperience}>
                    <SelectTrigger id="yearsExp">
                      <SelectValue placeholder="Select years" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 51 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>{i} {i === 1 ? 'year' : 'years'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentRole">Current Role</Label>
                  <Input
                    id="currentRole"
                    value={currentPosition}
                    onChange={(e) => setCurrentPosition(e.target.value)}
                    placeholder="Senior Developer"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currentCompany">Current Company</Label>
                  <Input
                    id="currentCompany"
                    value={currentCompany}
                    onChange={(e) => setCurrentCompany(e.target.value)}
                    placeholder="TechCorp Inc."
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="San Francisco, CA"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Select value={availability} onValueChange={setAvailability}>
                    <SelectTrigger id="availability">
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="< 2 weeks">Less than 2 weeks</SelectItem>
                      <SelectItem value="< 1 month">Less than 1 month</SelectItem>
                      <SelectItem value="Flexible">Flexible</SelectItem>
                      <SelectItem value="Not available">Not available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload CV */}
          <Card>
            <CardHeader>
              <CardTitle>Upload CV</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                onFileSelect={setCvFile}
                accept=".pdf,.doc,.docx,.txt"
                maxSizeMB={10}
              />
            </CardContent>
          </Card>

          {/* Optional Links */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/johndoe"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="github">GitHub URL</Label>
                <Input
                  id="github"
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/johndoe"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Referred by Sarah Chen, Met at conference..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Add to Job Opening */}
          <Card>
            <CardHeader>
              <CardTitle>Add to Job Opening (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="addToJob"
                  checked={addToJob}
                  onCheckedChange={(checked) => setAddToJob(checked as boolean)}
                />
                <Label htmlFor="addToJob" className="cursor-pointer">
                  Add this candidate to a job opening
                </Label>
              </div>
              
              {addToJob && (
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job opening" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobOpenings.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} - {job.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/search')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading...' : addToJob ? 'Upload & Add to Job' : 'Upload Candidate'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
