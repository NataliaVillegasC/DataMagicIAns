"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { candidateService } from '@/lib/services/candidate.service';
import type { CVUploadResponse, CandidateCreateRequest } from '@/lib/types';

type Step = 'upload' | 'review' | 'complete';

export default function NewCandidatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // CV Upload state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvFileId, setCvFileId] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<any>(null);
  
  // Form data
  const [formData, setFormData] = useState<CandidateCreateRequest>({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    supervised_data: {
      hr_notes: '',
      hr_rating: 5,
      verified_by_hr: true,
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCvFile(file);
    }
  };

  const handleUploadCV = async () => {
    if (!cvFile) return;

    setIsUploading(true);
    
    try {
      const response: CVUploadResponse = await candidateService.uploadCV(cvFile);
      
      if (response.success) {
        setCvFileId(response.cv_file_id);
        setExtractionResult(response.extraction_result);
        
        // Auto-fill form with extracted data
        if (response.extraction_result?.documents?.[0]?.data) {
          const extracted = response.extraction_result.documents[0].data;
          
          setFormData(prev => ({
            ...prev,
            full_name: extracted.full_name || prev.full_name,
            email: extracted.email || prev.email,
            phone: extracted.phone || prev.phone,
            location: extracted.location || prev.location,
            linkedin_url: extracted.social_links?.find((s: any) => s.type === 'linkedin')?.url || prev.linkedin_url,
            github_url: extracted.social_links?.find((s: any) => s.type === 'github')?.url || prev.github_url,
            portfolio_url: extracted.social_links?.find((s: any) => s.type === 'portfolio')?.url || prev.portfolio_url,
            supervised_data: {
              ...prev.supervised_data,
              generic_skills: extracted.generic_skills || [],
              keywords: [], // Extract from experience/education if needed
            },
          }));
        }
        
        setStep('review');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.message || 'Failed to upload CV');
    } finally {
      setIsUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cvFileId) {
      alert('Please upload a CV first');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const dataToSend = {
        ...formData,
        cv_file_id: cvFileId,
      };
      
      const newCandidate = await candidateService.create(dataToSend);
      
      setStep('complete');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard/candidates/${newCandidate.id}`);
      }, 2000);
    } catch (error: any) {
      console.error('Create error:', error);
      const errorMsg = error.errors 
        ? Object.values(error.errors).flat().join(', ')
        : error.message || 'Failed to create candidate';
      alert(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
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
          <h1 className="text-3xl font-bold text-white">Add New Candidate</h1>
          <p className="text-zinc-400 mt-1">
            Upload CV and let AI extract the information
          </p>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-center space-x-4">
        <StepIndicator number={1} label="Upload CV" isActive={step === 'upload'} isComplete={step !== 'upload'} />
        <div className="h-0.5 w-16 bg-zinc-800"></div>
        <StepIndicator number={2} label="Review Data" isActive={step === 'review'} isComplete={step === 'complete'} />
        <div className="h-0.5 w-16 bg-zinc-800"></div>
        <StepIndicator number={3} label="Complete" isActive={step === 'complete'} isComplete={false} />
      </div>

      {/* Step 1: Upload CV */}
      {step === 'upload' && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Upload Candidate CV</CardTitle>
            <CardDescription className="text-zinc-400">
              Upload a PDF resume and our AI will extract all relevant information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-12 text-center hover:border-[#e78a53]/50 transition-colors">
              <Upload className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <Label htmlFor="cv-upload" className="cursor-pointer">
                <span className="text-white font-medium">Click to upload</span>
                <span className="text-zinc-400"> or drag and drop</span>
                <p className="text-sm text-zinc-500 mt-2">PDF, DOC, DOCX (max. 10MB)</p>
              </Label>
              <Input
                id="cv-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {cvFile && (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <p className="text-white font-medium">Selected file:</p>
                <p className="text-zinc-400 text-sm">{cvFile.name}</p>
                <p className="text-zinc-500 text-xs">{(cvFile.size / 1024).toFixed(2)} KB</p>
              </div>
            )}

            <Button
              onClick={handleUploadCV}
              disabled={!cvFile || isUploading}
              className="w-full bg-[#e78a53] hover:bg-[#e78a53]/90"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing CV with AI...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Extract Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review & Edit Data */}
      {step === 'review' && (
        <form onSubmit={handleSubmit}>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Review Extracted Data</CardTitle>
              <CardDescription className="text-zinc-400">
                Review and edit the information extracted from the CV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-white">
                    Full Name *
                  </Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-white">
                    Location
                  </Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location || ''}
                    onChange={handleChange}
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h3 className="text-white font-medium">Social Profiles</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url" className="text-white">
                      LinkedIn
                    </Label>
                    <Input
                      id="linkedin_url"
                      name="linkedin_url"
                      type="url"
                      value={formData.linkedin_url || ''}
                      onChange={handleChange}
                      placeholder="https://linkedin.com/in/..."
                      className="bg-zinc-800/50 border-zinc-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="github_url" className="text-white">
                      GitHub
                    </Label>
                    <Input
                      id="github_url"
                      name="github_url"
                      type="url"
                      value={formData.github_url || ''}
                      onChange={handleChange}
                      placeholder="https://github.com/..."
                      className="bg-zinc-800/50 border-zinc-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portfolio_url" className="text-white">
                      Portfolio
                    </Label>
                    <Input
                      id="portfolio_url"
                      name="portfolio_url"
                      type="url"
                      value={formData.portfolio_url || ''}
                      onChange={handleChange}
                      placeholder="https://..."
                      className="bg-zinc-800/50 border-zinc-700 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* HR Notes */}
              <div className="space-y-2">
                <Label htmlFor="hr_notes" className="text-white">
                  HR Notes
                </Label>
                <Textarea
                  id="hr_notes"
                  value={formData.supervised_data?.hr_notes || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    supervised_data: {
                      ...prev.supervised_data,
                      hr_notes: e.target.value,
                    },
                  }))}
                  placeholder="Add your notes about this candidate..."
                  className="bg-zinc-800/50 border-zinc-700 text-white min-h-[100px]"
                />
              </div>

              {/* Skills Preview */}
              {extractionResult?.documents?.[0]?.data?.generic_skills && (
                <div className="space-y-2">
                  <Label className="text-white">Extracted Skills</Label>
                  <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {extractionResult.documents[0].data.generic_skills.map((skill: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-[#e78a53]/20 text-[#e78a53] rounded-full text-sm border border-[#e78a53]/30"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('upload')}
                  className="border-zinc-700 text-zinc-300"
                >
                  Back
                </Button>
                
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-[#e78a53] hover:bg-[#e78a53]/90"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating candidate...
                    </>
                  ) : (
                    <>
                      Create Candidate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Step 3: Complete */}
      {step === 'complete' && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Candidate Created Successfully!
            </h3>
            <p className="text-zinc-400 mb-4">
              Skills and technologies have been automatically matched.
            </p>
            <p className="text-zinc-500 text-sm">
              Redirecting to candidate profile...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({ 
  number, 
  label, 
  isActive, 
  isComplete 
}: { 
  number: number; 
  label: string; 
  isActive: boolean; 
  isComplete: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors
          ${isComplete 
            ? 'bg-green-500 text-white' 
            : isActive 
              ? 'bg-[#e78a53] text-white' 
              : 'bg-zinc-800 text-zinc-500'
          }
        `}
      >
        {isComplete ? <Check className="h-5 w-5" /> : number}
      </div>
      <span className={`text-xs mt-2 ${isActive ? 'text-white' : 'text-zinc-500'}`}>
        {label}
      </span>
    </div>
  );
}

