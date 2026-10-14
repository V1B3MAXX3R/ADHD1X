import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import { WelcomePage } from '../features/onboarding/WelcomePage';
import { MajorSetupPage } from '../features/onboarding/MajorSetupPage';
import { CourseSetupPage } from '../features/courses/CourseSetupPage';
import { TodayPage } from '../features/today/TodayPage';
import { HelpMeStartPage } from '../features/helpMeStart/HelpMeStartPage';
import { AssignmentsPage } from '../features/assignments/AssignmentsPage';
import { VoyagePage } from '../features/voyage/VoyagePage';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { CampusSupportPage, HelpOverviewPage } from '../features/help/HelpPages';
import { AppShell } from '../shared/components/AppShell';

const RequireAgeGate: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { ready, settings } = useApp();
  if (!ready) return null;
  if (!settings.ageConfirmed18) return <Navigate to="/welcome" replace />;
  return children;
};

const NotFoundPage: React.FC = () => (
  <AppShell title="Can't find that page">
    <p>That page does not exist. Head back to Today to see your plan.</p>
  </AppShell>
);

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/today" replace />} />
    <Route path="/welcome" element={<WelcomePage />} />
    <Route
      path="/setup/major"
      element={
        <RequireAgeGate>
          <MajorSetupPage />
        </RequireAgeGate>
      }
    />
    <Route
      path="/setup/courses"
      element={
        <RequireAgeGate>
          <CourseSetupPage />
        </RequireAgeGate>
      }
    />
    <Route
      path="/today"
      element={
        <RequireAgeGate>
          <TodayPage />
        </RequireAgeGate>
      }
    />
    <Route
      path="/start/:assignmentId"
      element={
        <RequireAgeGate>
          <HelpMeStartPage />
        </RequireAgeGate>
      }
    />
    <Route
      path="/assignments"
      element={
        <RequireAgeGate>
          <AssignmentsPage />
        </RequireAgeGate>
      }
    />
    <Route
      path="/assignments/:id"
      element={
        <RequireAgeGate>
          <AssignmentsPage />
        </RequireAgeGate>
      }
    />
    <Route
      path="/calendar"
      element={
        <RequireAgeGate>
          <CalendarPage />
        </RequireAgeGate>
      }
    />
    <Route
      path="/voyage"
      element={
        <RequireAgeGate>
          <VoyagePage />
        </RequireAgeGate>
      }
    />
    <Route
      path="/settings/:section"
      element={
        <RequireAgeGate>
          <SettingsPage />
        </RequireAgeGate>
      }
    />
    <Route path="/privacy" element={<Navigate to="/settings/privacy" replace />} />
    <Route path="/help" element={<HelpOverviewPage />} />
    <Route path="/help/campus-support" element={<CampusSupportPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export const App: React.FC = () => (
  <AppProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AppProvider>
);
