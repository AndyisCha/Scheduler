import { SuperAdminSlotList } from './components/SuperAdminSlotList';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SlotListPage } from './pages/SlotListPage';
import { NewSlotPage } from './pages/NewSlotPage';
import { SlotEditPage } from './pages/SlotEditPage';
import { SlotHistoryPage } from './pages/SlotHistoryPage';
import { ScheduleComparePage } from './pages/ScheduleComparePage';
import { AdminSlotsPage } from './pages/AdminSlotsPage';
import { TeacherDashboardPage } from './pages/TeacherDashboardPage';
import { ClassReportsPage } from './pages/ClassReportsPage';
import { MwfScheduler } from './pages/MwfScheduler';
import { TtScheduler } from './pages/TtScheduler';
import { UnifiedScheduler } from './pages/UnifiedScheduler';
import { Navigation } from './components/Navigation';
import { Header } from './components/Header';
import { RequireAuth } from './components/auth/RequireAuth';
import { RequireSuperAdmin } from './components/auth/RequireSuperAdmin';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast/ToastProvider';
import { SupabaseBanner } from './components/SupabaseBanner';
import { SkipToContent } from './components/a11y/SkipToContent';
import { PerformanceTestPanel } from './components/dev/PerformanceTestPanel';
import { EnvironmentBadge } from './components/EnvironmentBadge';
import { AdminSandboxPage } from './pages/AdminSandboxPage';
import { SharedSnapshotPage } from './pages/SharedSnapshotPage';
import { SecureSharedSnapshotPage } from './pages/SecureSharedSnapshotPage';
import { ShareLinkAdminPage } from './pages/ShareLinkAdminPage';
import { HistoryPage } from './pages/HistoryPage';
import { MetricsPanel } from './components/MetricsPanel';
import { TelemetryDashboard } from './components/TelemetryDashboard';
import { useAuthStore } from './store/auth';
import { useThemeStore } from './store/theme';
import { useI18nStore } from './store/i18n';
import { sentryService } from './lib/sentry';
import { useState, useEffect } from 'react';

function AppContent() {
  // Environment variables check
  useEffect(() => {
    console.log(
      "ENV CHECK",
      {
        URL: (import.meta.env.VITE_SUPABASE_URL || "").slice(0, 12) + "...",
        KEY: (import.meta.env.VITE_SUPABASE_ANON_KEY || "").slice(0, 6) + "...",
        configured: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
      }
    );

    // Initialize Sentry
    sentryService.initialize({
      dsn: import.meta.env.VITE_SENTRY_DSN || '',
      environment: import.meta.env.VITE_ENVIRONMENT || 'development',
    });
  }, []);

  const { user, profile } = useAuthStore();

  // Set user context in Sentry when user changes
  useEffect(() => {
    if (user && profile) {
      sentryService.setUser(user.id, profile.role, profile.display_name);
    }
  }, [user, profile]);

  const [activeTab, setActiveTab] = useState('mwf');
  const [isMetricsVisible, setIsMetricsVisible] = useState(false);
  
      // Initialize auth on app start
      const initialize = useAuthStore(state => state.initialize);
      const initializeTheme = useThemeStore(state => state.initializeTheme);
      const initializeI18n = useI18nStore(state => state.initializeI18n);
      
      useEffect(() => {
        initialize();
        initializeTheme();
        initializeI18n();
      }, [initialize, initializeTheme, initializeI18n]);



      return (
        <ToastProvider>
          <Router>
             <Routes>
               <Route path="/shared/:token" element={<SecureSharedSnapshotPage />} />
               <Route path="/shared-legacy/:token" element={<SharedSnapshotPage />} />
               <Route path="/" element={<Navigate to="/slots" replace />} />
             </Routes>
            <RequireAuth>
              <Routes>
                <Route path="/slots" element={
                  <ErrorBoundary>
                    <div className="min-h-screen bg-secondary transition-theme">
                      <SkipToContent />
                      
                      {/* Supabase Configuration Banner */}
                      <SupabaseBanner />
                      
                      {/* Header */}
                      <Header />
                      
                      <main id="main-content" className="p-8" tabIndex={-1}>
                        <div className="max-w-7xl mx-auto">
                          <h1 className="text-4xl font-bold text-primary mb-8 text-center">
                            {useI18nStore.getState().t('schedule.title')}
                          </h1>
                          
                          {/* Navigation Tabs */}
                          <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
                          
                          <div className="space-y-6">
                            {/* MWF Scheduler Section */}
                            {activeTab === 'mwf' && (
                              <MwfScheduler />
                            )}

                            {/* TT Scheduler Section */}
                            {activeTab === 'tt' && (
                              <TtScheduler />
                            )}

                            {/* Unified Scheduler Section */}
                            {activeTab === 'unified' && (
                              <UnifiedScheduler />
                            )}

                            {/* Slot Management Section */}
                            {activeTab === 'slots' && (
                              <SlotListPage />
                            )}

                            {/* History Section */}
                            {activeTab === 'history' && (
                              <HistoryPage />
                            )}

                            {/* Teacher Dashboard Section */}
                            {activeTab === 'teacher-dashboard' && (
                              <TeacherDashboardPage />
                            )}

                            {/* Reports Section */}
                            {activeTab === 'reports' && (
                              <ClassReportsPage />
                            )}

                            {/* Admin Slots Section */}
                            {activeTab === 'admin-slots' && (
                              <RequireSuperAdmin>
                                <AdminSlotsPage />
                              </RequireSuperAdmin>
                            )}

                            {/* Super Admin Section */}
                            {activeTab === 'super-admin' && (
                              <RequireSuperAdmin>
                                <SuperAdminSlotList />
                              </RequireSuperAdmin>
                            )}

                            {/* Sandbox Section */}
                            {activeTab === 'sandbox' && (
                              <RequireSuperAdmin>
                                <AdminSandboxPage />
                              </RequireSuperAdmin>
                            )}

                            {/* Share Links Admin Section */}
                            {activeTab === 'share-admin' && (
                              <RequireSuperAdmin>
                                <ShareLinkAdminPage />
                              </RequireSuperAdmin>
                            )}

                            {/* Development Tools Section */}
                            {activeTab === 'dev-tools' && import.meta.env.DEV && (
                              <div className="space-y-6">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                  <h2 className="text-lg font-medium text-yellow-800 mb-2">개발 도구</h2>
                                  <p className="text-sm text-yellow-700">
                                    이 섹션은 개발 모드에서만 표시됩니다. 프로덕션에서는 보이지 않습니다.
                                  </p>
                                </div>
                                <PerformanceTestPanel />
                              </div>
                            )}

                            {/* Telemetry Dashboard Section */}
                            {activeTab === 'telemetry' && (
                              <TelemetryDashboard />
                            )}
                          </div>
                        </div>
                      </main>
                      <EnvironmentBadge />
                    </div>
                  </ErrorBoundary>
                } />
                
                {/* Additional protected routes */}
                <Route path="/slots/new" element={<NewSlotPage />} />
                <Route path="/slots/:id" element={<SlotEditPage />} />
                <Route path="/slots/:id/history" element={<SlotHistoryPage />} />
                <Route path="/slots/:id/history/compare" element={<ScheduleComparePage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/me/schedule" element={<TeacherDashboardPage />} />
                <Route path="/reports/classes" element={<ClassReportsPage />} />
                
                {/* Catch-all route */}
                <Route path="*" element={<Navigate to="/slots" replace />} />
              </Routes>
              
              {/* Metrics Panel */}
              <MetricsPanel 
                isVisible={isMetricsVisible}
                onToggle={() => setIsMetricsVisible(!isMetricsVisible)}
              />
            </RequireAuth>
          </Router>
        </ToastProvider>
      )
}

function App() {
  return <AppContent />;
}

export default App
