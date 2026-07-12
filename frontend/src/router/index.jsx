import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRequired from './RoleRequired';
import ModuleRequired from './ModuleRequired';
import ShopRequired from './ShopRequired';
import PermissionRoute from './PermissionRoute';
import IndividualRoute from './IndividualRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import IndividualLayout from '../layouts/IndividualLayout';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import RoleSelector from '../pages/RoleSelector';
import ShopSelector from '../pages/ShopSelector';
import ShopSetup from '../pages/ShopSetup';
import Dashboard from '../pages/Dashboard';
import Products from '../pages/Products';
import Sales from '../pages/Sales';
import Purchase from '../pages/Purchase';
import Inventory from '../pages/Inventory';
import Customers from '../pages/Customers';
import Suppliers from '../pages/Suppliers';
import Settings from '../pages/Settings';
import POS from '../pages/POS';
import Accounts from '../pages/Accounts';
import Offers from '../pages/Offers';
import Reports from '../pages/Reports';
import NotFound from '../pages/NotFound';
import LandingPage from '../pages/LandingPage';
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
      {/* Public landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth routes (public) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* One-time RBAC setup — authenticated, but role/module not yet required */}
      <Route element={<ProtectedRoute />}>
        <Route path="/choose-role" element={<RoleSelector />} />
      </Route>

      {/* All routes below require: authenticated + role set + module chosen */}

      {/* Shop selector / creator (role + module set, but no shop yet) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRequired />}>
          <Route element={<ModuleRequired />}>
            <Route path="/select-shop" element={<ShopSelector />} />
            <Route path="/create-shop" element={<ShopSetup />} />
          </Route>
        </Route>
      </Route>

      {/* Individual role — goes directly to personal dashboard */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRequired />}>
          <Route element={<ModuleRequired />}>
            <Route element={<IndividualRoute />}>
              <Route element={<IndividualLayout />}>
                <Route path="/individual" element={<IndividualDashboard />} />
                <Route path="/individual/expenses" element={<PersonalExpenses />} />
                <Route path="/individual/income" element={<PersonalIncome />} />
                <Route path="/individual/tasks" element={<PersonalTasks />} />
                <Route path="/individual/notes" element={<PersonalNotes />} />
                <Route path="/individual/report" element={<PersonalReport />} />
                <Route path="/individual/settings" element={<IndividualSettings />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Route>

      {/* Shop routes — requires authenticated + role + module + active shop */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRequired />}>
          <Route element={<ModuleRequired />}>
            <Route element={<ShopRequired />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pos" element={<PermissionRoute permission="pos:read"><POS /></PermissionRoute>} />
                <Route path="/products" element={<PermissionRoute permission="products:read"><Products /></PermissionRoute>} />
                <Route path="/offers" element={<PermissionRoute permission="offers:read"><Offers /></PermissionRoute>} />
                <Route path="/sales" element={<PermissionRoute permission="sales:read"><Sales /></PermissionRoute>} />
                <Route path="/purchases" element={<PermissionRoute permission="purchases:read"><Purchase /></PermissionRoute>} />
                <Route path="/inventory" element={<PermissionRoute permission="inventory:read"><Inventory /></PermissionRoute>} />
                <Route path="/customers" element={<PermissionRoute permission="customers:read"><Customers /></PermissionRoute>} />
                <Route path="/suppliers" element={<PermissionRoute permission="suppliers:read"><Suppliers /></PermissionRoute>} />
                <Route path="/accounts" element={<PermissionRoute permission="expenses:read"><Accounts /></PermissionRoute>} />
                <Route path="/reports" element={<PermissionRoute permission="reports:read"><Reports /></PermissionRoute>} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
