import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Subjects from "./pages/Subjects";
import Chapters from "./pages/Chapters";
import Planner from "./pages/Planner";
import Focus from "./pages/Focus";
import Homework from "./pages/Homework";
import Exams from "./pages/Exams";
import Goals from "./pages/Goals";
import Doubts from "./pages/Doubts";
import Reflections from "./pages/Reflections";
import Timetable from "./pages/Timetable";
import Analytics from "./pages/Analytics";
import Rewards from "./pages/Rewards";
import Coach from "./pages/Coach";
import Challenges from "./pages/Challenges";
import MockTest from "./pages/MockTest";
import MicroGoals from "./pages/MicroGoals";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const Wrap = ({ children }: { children: React.ReactNode }) => <ProtectedLayout>{children}</ProtectedLayout>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Wrap><Dashboard /></Wrap>} />
            <Route path="/subjects" element={<Wrap><Subjects /></Wrap>} />
            <Route path="/chapters" element={<Wrap><Chapters /></Wrap>} />
            <Route path="/planner" element={<Wrap><Planner /></Wrap>} />
            <Route path="/timetable" element={<Wrap><Timetable /></Wrap>} />
            <Route path="/focus" element={<Wrap><Focus /></Wrap>} />
            <Route path="/homework" element={<Wrap><Homework /></Wrap>} />
            <Route path="/exams" element={<Wrap><Exams /></Wrap>} />
            <Route path="/goals" element={<Wrap><Goals /></Wrap>} />
            <Route path="/doubts" element={<Wrap><Doubts /></Wrap>} />
            <Route path="/reflections" element={<Wrap><Reflections /></Wrap>} />
            <Route path="/analytics" element={<Wrap><Analytics /></Wrap>} />
            <Route path="/rewards" element={<Wrap><Rewards /></Wrap>} />
            <Route path="/coach" element={<Wrap><Coach /></Wrap>} />
            <Route path="/challenges" element={<Wrap><Challenges /></Wrap>} />
            <Route path="/mock-test" element={<Wrap><MockTest /></Wrap>} />
            <Route path="/micro-goals" element={<Wrap><MicroGoals /></Wrap>} />
            <Route path="/notifications" element={<Wrap><Notifications /></Wrap>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
