import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import ShopRequired from './ShopRequired';
import DashboardLayout from '../layouts/DashboardLayout';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../pages/Login';
import Register from '../pages/Register';
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
import NotFound from '../pages/NotFound';

export default function AppRouter() {
  return (
    <Routes>
      {/* Auth routes (public) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Authenticated but no shop required */}
      <Route element={<ProtectedRoute />}>
        <Route path="/select-shop" element={<ShopSelector />} />
        <Route path="/create-shop" element={<ShopSetup />} />
      </Route>

      {/* Protected + Shop required */}
      <Route element={<ProtectedRoute />}>
        <Route element={<ShopRequired />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/products" element={<Products />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/purchases" element={<Purchase />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
