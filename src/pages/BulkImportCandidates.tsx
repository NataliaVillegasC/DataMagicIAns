import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createCandidate } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Upload,
  Download,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Loader2
} from "lucide-react";

interface ImportResult {
  row: number;
  status: 'success' | 'error';
  name: string;
  message?: string;
}

const BulkImportCandidates = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);

  const downloadTemplate = () => {
    const csvContent = `full_name,email,phone,current_position,current_company,years_experience,location,availability
John Doe,john.doe@email.com,+1234567890,Senior Engineer,TechCorp,5,San Francisco CA,2 weeks
Jane Smith,jane.smith@email.com,+0987654321,Product Manager,StartupXYZ,3,New York NY,Immediate`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded successfully",
    });
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1);

    return rows.map((row, index) => {
      const values = row.split(',').map(v => v.trim());
      const candidate: any = { rowNumber: index + 2 }; // +2 because of header and 0-indexing
      
      headers.forEach((header, i) => {
        candidate[header] = values[i] || '';
      });
      
      return candidate;
    });
  };

  const validateCandidate = (candidate: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!candidate.full_name || candidate.full_name.length < 2) {
      errors.push('Name is required and must be at least 2 characters');
    }

    if (!candidate.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) {
      errors.push('Valid email is required');
    }

    if (candidate.years_experience && isNaN(Number(candidate.years_experience))) {
      errors.push('Years of experience must be a number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setResults([]);
      setProgress(0);
    }
  };

  const processImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    setResults([]);
    setProgress(0);

    try {
      const text = await file.text();
      const candidates = parseCSV(text);

      if (candidates.length === 0) {
        toast({
          title: "Empty File",
          description: "No valid data found in CSV file",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const importResults: ImportResult[] = [];

      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const validation = validateCandidate(candidate);

        if (!validation.valid) {
          importResults.push({
            row: candidate.rowNumber,
            status: 'error',
            name: candidate.full_name || 'Unknown',
            message: validation.errors.join(', ')
          });
        } else {
          try {
            // Prepare candidate data
            const candidateData = {
              full_name: candidate.full_name,
              email: candidate.email,
              phone: candidate.phone || null,
              current_position: candidate.current_position || null,
              current_company: candidate.current_company || null,
              years_experience: candidate.years_experience ? Number(candidate.years_experience) : null,
              location: candidate.location || null,
              availability: candidate.availability || null,
            };

            await createCandidate(candidateData);
            
            importResults.push({
              row: candidate.rowNumber,
              status: 'success',
              name: candidate.full_name,
            });
          } catch (error: any) {
            importResults.push({
              row: candidate.rowNumber,
              status: 'error',
              name: candidate.full_name,
              message: error.message || 'Failed to create candidate'
            });
          }
        }

        setProgress(Math.round(((i + 1) / candidates.length) * 100));
        setResults([...importResults]);
      }

      const successCount = importResults.filter(r => r.status === 'success').length;
      const errorCount = importResults.filter(r => r.status === 'error').length;

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} candidate(s). ${errorCount} error(s).`,
        variant: successCount > 0 ? "default" : "destructive",
      });
    } catch (error: any) {
      console.error('Error processing CSV:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to process CSV file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link to="/search">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Candidates
              </Button>
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Bulk Import Candidates
            </h1>
            <p className="text-muted-foreground">
              Upload a CSV file to import multiple candidates at once
            </p>
          </div>

          {/* Instructions Card */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            <ol className="space-y-2 text-sm text-muted-foreground mb-4">
              <li>1. Download the CSV template below</li>
              <li>2. Fill in your candidate data (one candidate per row)</li>
              <li>3. Upload the completed CSV file</li>
              <li>4. Review the results and fix any errors</li>
            </ol>
            
            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold text-sm mb-2">Required Fields:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>full_name</strong> - Candidate's full name (required)</li>
                <li>• <strong>email</strong> - Valid email address (required)</li>
              </ul>
              
              <h3 className="font-semibold text-sm mb-2 mt-4">Optional Fields:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• phone, current_position, current_company, years_experience, location, availability</li>
              </ul>
            </div>

            <Button onClick={downloadTemplate} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </Card>

          {/* Upload Card */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>
            
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="max-w-xs mx-auto"
                disabled={isProcessing}
              />
              {file && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Selected: {file.name}
                </p>
              )}
            </div>

            {file && !isProcessing && (
              <div className="mt-6 flex justify-center">
                <Button onClick={processImport} size="lg">
                  <Upload className="h-4 w-4 mr-2" />
                  Start Import
                </Button>
              </div>
            )}

            {isProcessing && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Processing...</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </Card>

          {/* Results Card */}
          {results.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Import Results</h2>
                <div className="flex gap-4">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {successCount} Success
                  </Badge>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    <XCircle className="h-4 w-4 mr-1" />
                    {errorCount} Errors
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      result.status === 'success'
                        ? 'bg-success/5 border-success/20'
                        : 'bg-destructive/5 border-destructive/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {result.status === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">
                          Row {result.row}: {result.name}
                        </p>
                        {result.message && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {result.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {successCount > 0 && (
                <div className="mt-6">
                  <Link to="/search">
                    <Button>
                      View Imported Candidates
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default BulkImportCandidates;
