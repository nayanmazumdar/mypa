import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import IndividualLayout from '../layouts/IndividualLayout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import IndividualDashboard from '../pages/individual/IndividualDashboard';
import PersonalExpenses from '../pages/individual/PersonalExpenses';
import PersonalIncome from '../pages/individual/PersonalIncome';
import PersonalTasks from '../pages/individual/PersonalTasks';
import PersonalNotes from '../pages/individual/PersonalNotes';
import PersonalReport from '../pages/individual/PersonalReport';
import IndividualSettings from '../pages/individual/IndividualSettings';

export default function AppRouter() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected individual routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<IndividualLayout />}>
          <Route path="/" element={<IndividualDashboard />} />
          <Route path="/expenses" element={<PersonalExpenses />} />
          <Route path="/income" element={<PersonalIncome />} />
          <Route path="/tasks" element={<PersonalTasks />} />
          <Route path="/notes" element={<PersonalNotes />} />
          <Route path="/report" element={<PersonalReport />} />
          <Route path="/settings" element={<IndividualSettings />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
