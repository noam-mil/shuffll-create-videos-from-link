import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { MetaOrganizationProvider } from "@/contexts/OrganizationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import NewOrder from "./pages/NewOrder";

// Lazy-loaded pages
const VideoGenerator = lazy(() => import('@/pages/VideoGenerator'));

// Auth pages
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Admin pages (System Admin)
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMetaOrgs from "./pages/admin/AdminMetaOrgs";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTemplates from "./pages/admin/AdminTemplates";
import AdminTemplateScenes from "./pages/admin/AdminTemplateScenes";
import AdminProductionStudio from "./pages/admin/AdminProductionStudio";
import AdminProductions from "./pages/admin/AdminProductions";
import AdminOrders from "./pages/admin/AdminOrders";

// Meta Organization pages
import OrgHome from "./pages/org/OrgHome";
import OrgCsvUpload from "./pages/org/OrgCsvUpload";
import OrgAdmin from "./pages/org/OrgAdmin";
import OrgCampaigns from "./pages/org/OrgCampaigns";
import OrgCampaignDetail from "./pages/org/OrgCampaignDetail";
import OrgCampaignTest from "./pages/org/OrgCampaignTest";
import OrgMessagingHub from "./pages/org/OrgMessagingHub";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <Routes>
              {/* Landing page */}
              <Route path="/" element={<Index />} />

              {/* Access denied */}
              <Route path="/access-denied" element={<AccessDenied />} />

              {/* Public routes */}
              <Route path="/video-generator" element={<VideoGenerator />} />

            {/* System Admin Routes - Protected */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="system_admin" fallbackPath="/access-denied">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/meta-orgs" element={
              <ProtectedRoute requiredRole="system_admin" fallbackPath="/access-denied">
                <AdminMetaOrgs />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute requiredRole="system_admin" fallbackPath="/access-denied">
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute requiredRole="system_admin" fallbackPath="/access-denied">
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/templates" element={
              <ProtectedRoute requiredRole="system_admin" fallbackPath="/access-denied">
                <AdminTemplates />
              </ProtectedRoute>
            } />
            <Route path="/admin/templates/:templateId" element={
              <ProtectedRoute requiredRole="system_admin" fallbackPath="/access-denied">
                <AdminTemplateScenes />
              </ProtectedRoute>
            } />
            <Route path="/admin/templates/:templateId/productions/:productionId" element={
              <ProtectedRoute requiredRole="system_admin" fallbackPath="/access-denied">
                <AdminProductionStudio />
              </ProtectedRoute>
            } />
            <Route path="/admin/productions" element={
              <ProtectedRoute requiredRole="system_admin" fallbackPath="/access-denied">
                <AdminProductions />
              </ProtectedRoute>
            } />
            <Route path="/admin/orders" element={
              <ProtectedRoute requiredRole="system_admin" fallbackPath="/access-denied">
                <AdminOrders />
              </ProtectedRoute>
            } />

            {/* Global Auth Routes (no org context) */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Meta Organization-scoped Routes */}
            <Route path="/:metaOrgSlug/*" element={
              <MetaOrganizationProvider>
                <Routes>
                  {/* Public meta org routes */}
                  <Route path="/new-order" element={<NewOrder />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  
                  {/* Protected meta org routes - requires authentication */}
                  <Route path="/" element={<OrgHome />} />
                  <Route path="/csv-upload" element={
                    <ProtectedRoute requiredRole="authenticated">
                      <OrgCsvUpload />
                    </ProtectedRoute>
                  } />
                  <Route path="/campaigns" element={
                    <ProtectedRoute requiredRole="authenticated">
                      <OrgCampaigns />
                    </ProtectedRoute>
                  } />
                  <Route path="/campaigns/:campaignId" element={
                    <ProtectedRoute requiredRole="authenticated">
                      <OrgCampaignDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/campaign-test/:campaignId" element={
                    <ProtectedRoute requiredRole="authenticated">
                      <OrgCampaignTest />
                    </ProtectedRoute>
                  } />
                  
                  {/* Messaging Hub - requires meta_org_admin role */}
                  <Route path="/messaging-hub" element={<MetaOrgMessagingHubRoute />} />
                  
                  {/* Meta Org Admin - requires meta_org_admin role */}
                  <Route path="/admin" element={<MetaOrgAdminRoute />} />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </MetaOrganizationProvider>
            } />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

// Separate component to access MetaOrganization context
import { useMetaOrganization } from "@/contexts/OrganizationContext";
import { Loader2 } from 'lucide-react';

const MetaOrgAdminRoute = () => {
  const { metaOrganization, isLoading } = useMetaOrganization();
  
  // Wait for meta org context to load before checking access
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <ProtectedRoute 
      requiredRole="org_admin" 
      metaOrgId={metaOrganization?.id}
      fallbackPath="/access-denied"
    >
      <OrgAdmin />
    </ProtectedRoute>
  );
};

const MetaOrgMessagingHubRoute = () => {
  const { metaOrganization, isLoading } = useMetaOrganization();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <ProtectedRoute 
      requiredRole="org_admin" 
      metaOrgId={metaOrganization?.id}
      fallbackPath="/access-denied"
    >
      <OrgMessagingHub />
    </ProtectedRoute>
  );
};

export default App;
