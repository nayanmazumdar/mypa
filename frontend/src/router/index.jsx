import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRequired from './RoleRequired';
import ModuleRequired from './ModuleRequired';
import ShopRequired from './ShopRequired';
import PermissionRoute from './PermissionRoute';
import IndividualRoute from './IndividualRoute';
import AdminRoute from './AdminRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import IndividualLayout from '../layouts/IndividualLayout';
import AdminLayout from '../layouts/AdminLayout';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import RoleSelector from '../pages/RoleSelector';
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
import Subscription from '../pages/Subscription';
import SyncStatus from '../pages/SyncStatus';
import ExportImport from '../pages/Export';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminLogs from '../pages/admin/AdminLogs';
import AdminShops from '../pages/admin/AdminShops';
import IndividualDashboard from '../pages/individual/IndividualDashboard';
import PersonalExpenses from '../pages/individual/PersonalExpenses';
import PersonalIncome from '../pages/individual/PersonalIncome';
import PersonalTasks from '../pages/individual/PersonalTasks';
import PersonalNotes from '../pages/individual/PersonalNotes';
import PersonalReport from '../pages/individual/PersonalReport';
import IndividualSettings from '../pages/individual/IndividualSettings';
import PersonalBudget from '../pages/individual/PersonalBudget';
import ShoppingList from '../pages/individual/ShoppingList';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

// Smart landing: redirect authenticated users to their home
function SmartLanding() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  if (!isAuthenticated) return <LandingPage />;
  if (!user?.role) return <Navigate to="/choose-role" replace />;
  if (user.role === 'individual') return <Navigate to="/individual" replace />;
  if (user.shop_id) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/admin/shops" replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public landing page — redirects authenticated users to their home */}
      <Route path="/" element={<SmartLanding />} />

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

      {/* Admin panel — subscription, shops & users, logs (admin only, no shop required) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRequired />}>
          <Route element={<ModuleRequired />}>
            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/subscription" element={<Subscription />} />
                <Route path="/admin/shops" element={<AdminShops />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/logs" element={<AdminLogs />} />
                <Route path="/admin/settings" element={<Settings />} />
              </Route>
            </Route>
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
                <Route path="/individual/budget" element={<PersonalBudget />} />
                <Route path="/individual/tasks" element={<PersonalTasks />} />
                <Route path="/individual/notes" element={<PersonalNotes />} />
                <Route path="/individual/shopping" element={<ShoppingList />} />
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
                <Route path="/sync" element={<SyncStatus />} />
                <Route path="/export" element={<ExportImport />} />
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
