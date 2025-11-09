import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import CandidateProfile from "./pages/CandidateProfile";
import Search from "./pages/Search";
import JobOpenings from "./pages/JobOpenings";
import HiringAnalytics from "./pages/HiringAnalytics";
import TeamBuilder from "./pages/TeamBuilder";
import CreateJobOpening from "./pages/CreateJobOpening";
import UploadCandidate from "./pages/UploadCandidate";
import Auth from "./pages/Auth";
import SetupProfile from "./pages/SetupProfile";
import CandidateSurvey from "./pages/CandidateSurvey";
import SurveyResults from "./pages/SurveyResults";
import InterviewsCalendar from "./pages/InterviewsCalendar";
import BulkImportCandidates from "./pages/BulkImportCandidates";
import PopulateCandidateData from "./pages/PopulateCandidateData";
import PipelineManager from "./pages/PipelineManager";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup-profile" element={<ProtectedRoute><SetupProfile /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/candidates/:candidateId" element={<ProtectedRoute><CandidateProfile /></ProtectedRoute>} />
            <Route path="/candidates/upload" element={<ProtectedRoute><UploadCandidate /></ProtectedRoute>} />
            <Route path="/candidates/import" element={<ProtectedRoute><BulkImportCandidates /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/openings" element={<ProtectedRoute><JobOpenings /></ProtectedRoute>} />
            <Route path="/openings/create" element={<ProtectedRoute><CreateJobOpening /></ProtectedRoute>} />
            <Route path="/openings/:jobId/pipeline" element={<ProtectedRoute><PipelineManager /></ProtectedRoute>} />
            <Route path="/hiring-analytics" element={<ProtectedRoute><HiringAnalytics /></ProtectedRoute>} />
            <Route path="/org-analysis" element={<ProtectedRoute><HiringAnalytics /></ProtectedRoute>} /> {/* Redirect old route */}
            <Route path="/team-builder" element={<ProtectedRoute><TeamBuilder /></ProtectedRoute>} />
            <Route path="/interviews-calendar" element={<ProtectedRoute><InterviewsCalendar /></ProtectedRoute>} />
            <Route path="/populate-data" element={<ProtectedRoute><PopulateCandidateData /></ProtectedRoute>} />
            <Route path="/survey/:token" element={<CandidateSurvey />} />
            <Route path="/candidates/:candidateId/survey-results" element={<ProtectedRoute><SurveyResults /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
