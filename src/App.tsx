import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";

const VideoGenerator = lazy(() => import('@/pages/VideoGenerator'));

const App = () => (
  <>
    <Sonner />
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
        <Routes>
          <Route path="/" element={<VideoGenerator />} />
          <Route path="/video-generator" element={<VideoGenerator />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </>
);

export default App;
