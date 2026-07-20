import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { setRoleAndModule, logout } from '../store/authSlice';
import { fetchPlans, subscribeToPlan } from '../store/subscriptionSlice';
import api from '../api/axios';
import {
  HiOutlineCreditCard, HiOutlineSparkles, HiOutlineRocketLaunch,
  HiOutlineBuildingOffice2, HiOutlineCheck, HiOutlineArrowRight,
  HiOutlineBolt, HiOutlineArrowLeft,
} from 'react-icons/hi2';

// ─── Design tokens ─────────────────────────────────────────────────────────
const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  raisedSm: { background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' },
  inset: { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' },
};

// ─── Route resolver ─────────────────────────────────────────────────────────
export function resolveDefaultRoute(defaultModule, roleType) {
  const shopRoutes = {
    dashboard: '/dashboard', pos: '/pos', products: '/products',
    sales: '/sales', purchases: '/purchases', inventory: '/inventory',
    customers: '/customers', accounts: '/accounts',
  };
  const individualRoutes = {
    individual: '/individual', expenses: '/individual/expenses',
    income: '/individual/income', tasks: '/individual/tasks',
    report: '/individual/report',
  };
  if (roleType === 'individual') return individualRoutes[defaultModule] ?? '/individual';
  return shopRoutes[defaultModule] ?? '/dashboard';
}

// ─── RBAC master config ─────────────────────────────────────────────────────
export const RBAC_CONFIG = [
  {
    value: 'business_admin', api_role: 'admin',
    emoji: '🏪', title: 'Shop & Retail Management',
    subtitle: 'Perfect for retail shops and stores',
    description: 'Perfect for retail shops and stores that require billing and day-to-day business management.',
    gradient: 'from-blue-500 to-blue-700',
    textColor: 'text-blue-600', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700',
    btnGradient: 'from-blue-500 to-blue-700', registerLabel: 'Register Shop',
    services: [
      'POS Billing', 'GST Billing', 'Inventory Management', 'Purchase Management',
      'Sales Management', 'Customer Management', 'Supplier Management',
      'Barcode Support', 'Staff Management', 'Reports & Analytics',
    ],
    suitedFor: [
      'Grocery Stores', 'Departmental Stores', 'Pharmacies', 'Hardware Shops',
      'Electronics Shops', 'Garment Stores', 'Book Stores', 'Stationery Shops',
      'Gift Shops', 'Mobile Stores', 'Pet Shops', 'Bakery & Sweet Shops', 'Agricultural Stores',
    ],
    modules: [
      { key: 'dashboard', label: 'Dashboard',    emoji: '📊', desc: 'Overview & KPIs' },
      { key: 'pos',       label: 'Point of Sale', emoji: '🖥️', desc: 'Billing & checkout' },
      { key: 'products',  label: 'Products',      emoji: '📦', desc: 'Manage catalogue' },
      { key: 'sales',     label: 'Sales',         emoji: '🛒', desc: 'Orders & invoices' },
      { key: 'purchases', label: 'Purchases',     emoji: '🚚', desc: 'Supplier orders' },
      { key: 'inventory', label: 'Inventory',     emoji: '🗃️', desc: 'Stock & alerts' },
      { key: 'customers', label: 'Customers',     emoji: '👥', desc: 'Ledger & credit' },
      { key: 'accounts',  label: 'Accounts',      emoji: '💰', desc: 'Cash flow' },
    ],
  },
  {
    value: 'individual', api_role: 'individual',
    emoji: '👤', title: 'Individual Budget Management',
    subtitle: 'Manage personal income and expenses',
    description: 'Manage your personal income and expenses with ease.',
    gradient: 'from-emerald-500 to-teal-600',
    textColor: 'text-emerald-600', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700',
    btnGradient: 'from-emerald-500 to-teal-600', registerLabel: 'Register Individual',
    services: [
      'Income Tracking', 'Expense Management', 'Budget Planning',
      'Savings Goals', 'Monthly Reports', 'Bill Reminders', 'Personal Financial Dashboard',
    ],
    suitedFor: ['Individuals', 'Families', 'Students', 'Freelancers', 'Professionals'],
    modules: [
      { key: 'individual', label: 'Dashboard', emoji: '📊', desc: 'Personal overview' },
      { key: 'expenses',   label: 'Expenses',  emoji: '💸', desc: 'Track spending' },
      { key: 'income',     label: 'Income',    emoji: '💵', desc: 'Salary & earnings' },
      { key: 'tasks',      label: 'Tasks',     emoji: '✅', desc: 'Task planner' },
      { key: 'report',     label: 'Reports',   emoji: '📈', desc: 'Financial summary' },
    ],
  },
  {
    value: 'franchise', api_role: 'admin',
    emoji: '🏢', title: 'Franchise Management',
    subtitle: 'Manage multiple outlets from one dashboard',
    description: 'Manage multiple franchise outlets from one centralized dashboard.',
    gradient: 'from-violet-500 to-purple-700',
    textColor: 'text-violet-600', badgeBg: 'bg-violet-100', badgeText: 'text-violet-700',
    btnGradient: 'from-violet-500 to-purple-700', registerLabel: 'Register Franchise',
    services: [
      'Franchise Registration', 'Branch Management', 'Centralized Billing',
      'Stock Monitoring', 'Franchise Reports', 'Employee Management', 'Performance Analytics',
    ],
    suitedFor: ['Restaurant Chains', 'Retail Chains', 'Pharmacy Chains', 'Educational Institutes', 'Service Centers'],
    modules: [
      { key: 'dashboard', label: 'Dashboard', emoji: '📊', desc: 'Overview & KPIs' },
      { key: 'pos',       label: 'Billing',   emoji: '🖥️', desc: 'Centralized billing' },
      { key: 'inventory', label: 'Stock',     emoji: '🗃️', desc: 'Stock monitoring' },
      { key: 'customers', label: 'Branches',  emoji: '🏢', desc: 'Branch management' },
      { key: 'accounts',  label: 'Analytics', emoji: '📈', desc: 'Performance analytics' },
    ],
  },
  {
    value: 'partner', api_role: 'admin',
    emoji: '🤝', title: 'Business Partner Registration',
    subtitle: 'Become an authorized business partner',
    description: 'Become an authorized business partner to sell, support, and grow with our platform.',
    gradient: 'from-amber-500 to-orange-600',
    textColor: 'text-amber-600', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700',
    btnGradient: 'from-amber-500 to-orange-600', registerLabel: 'Become a Partner',
    services: [
      'Partner Dashboard', 'Customer Registration', 'Commission Tracking',
      'Subscription Management', 'Marketing Resources', 'Business Leads', 'Training & Support',
    ],
    suitedFor: ['Consultants', 'Distributors', 'IT Service Providers', 'Digital Agencies', 'Freelancers', 'Sales Partners'],
    modules: [
      { key: 'dashboard', label: 'Dashboard',  emoji: '📊', desc: 'Partner overview' },
      { key: 'customers', label: 'Customers',  emoji: '👥', desc: 'Customer registration' },
      { key: 'accounts',  label: 'Commission', emoji: '💰', desc: 'Commission tracking' },
      { key: 'sales',     label: 'Leads',      emoji: '🎯', desc: 'Business leads' },
    ],
  },
];

// ─── Plan meta ──────────────────────────────────────────────────────────────
export const PLAN_CONFIG = [];   // kept for downstream compat

const PLAN_META = {
  free:       { icon: HiOutlineCreditCard,       gradient: 'from-slate-400 to-slate-600',   ring: 'ring-slate-200',  cta: 'Start for Free',     ctaStyle: { background: 'linear-gradient(145deg,#64748b,#475569)' } },
  starter:    { icon: HiOutlineSparkles,         gradient: 'from-sky-400 to-blue-600',      ring: 'ring-blue-200',   cta: 'Choose Starter',     ctaStyle: { background: 'linear-gradient(145deg,#0ea5e9,#2563eb)' } },
  pro:        { icon: HiOutlineRocketLaunch,     gradient: 'from-violet-500 to-purple-700', ring: 'ring-purple-300', cta: 'Choose Pro',         ctaStyle: { background: 'linear-gradient(145deg,#7c3aed,#5b21b6)' }, popular: true },
  enterprise: { icon: HiOutlineBuildingOffice2,  gradient: 'from-amber-400 to-orange-600',  ring: 'ring-orange-200', cta: 'Choose Enterprise',  ctaStyle: { background: 'linear-gradient(145deg,#f59e0b,#d97706)' } },
};

// ─── Step indicator ─────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const steps = ['Service', 'Plan'];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1;
        const active  = idx === step;
        const done    = idx < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  done  ? 'bg-emerald-500 text-white' :
                  active ? 'bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-md' :
                  'text-gray-400'
                }`}
                style={!done && !active ? NEO.inset : {}}
              >
                {done ? <HiOutlineCheck className="w-3.5 h-3.5" /> : idx}
              </div>
              <span className={`text-xs font-semibold ${active ? 'text-gray-800' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-10 h-px mx-1 rounded-full" style={{ background: step > idx ? '#10b981' : '#d1d5db' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Check icon ─────────────────────────────────────────────────────────────
function CheckIcon({ className = '' }) {
  return (
    <svg className={`w-3.5 h-3.5 shrink-0 ${className}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Step 1: Service Card ───────────────────────────────────────────────────
function ServiceCard({ role, onSelect, disabled }) {
  return (
    <div className="flex flex-col rounded-3xl border border-gray-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
      <div className={`bg-gradient-to-br ${role.gradient} px-6 pt-6 pb-8 relative overflow-hidden`}>
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-inner">
            <span className="text-4xl leading-none" role="img" aria-label={role.title}>{role.emoji}</span>
          </div>
          <div className="pt-1 min-w-0">
            <h2 className="text-white font-bold text-lg leading-tight">{role.title}</h2>
            <p className="text-white/80 text-sm mt-1 leading-relaxed">{role.description}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col flex-1 px-6 py-5 gap-5">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Services Offered</p>
          <ul className="grid grid-cols-1 gap-y-1.5">
            {role.services.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckIcon className={role.textColor} />{s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Suitable For</p>
          <div className="flex flex-wrap gap-1.5">
            {role.suitedFor.map((s) => (
              <span key={s} className={`text-xs font-medium px-2.5 py-1 rounded-full ${role.badgeBg} ${role.badgeText}`}>{s}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 pt-2">
        <button
          type="button"
          onClick={() => onSelect(role)}
          disabled={disabled}
          className={`w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r ${role.btnGradient} shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {disabled
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Setting up…</>
            : <>{role.registerLabel}<HiOutlineArrowRight className="w-4 h-4" /></>
          }
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Plan Card ──────────────────────────────────────────────────────
function PlanCard({ plan, onSelect, selecting }) {
  const meta = PLAN_META[plan.name] || PLAN_META.free;
  const Icon = meta.icon;
  const isFree = parseFloat(plan.price_monthly) === 0;
  const isSelecting = selecting === plan.id;

  const limitLabel = (val, unit) => {
    if (!val) return null;
    return `${val >= 999999 ? 'Unlimited' : val} ${unit}`;
  };

  const highlights = [
    limitLabel(plan.max_products, 'products'),
    limitLabel(plan.max_staff, 'staff'),
    limitLabel(plan.max_customers, 'customers'),
    limitLabel(plan.max_monthly_sales, 'sales/mo'),
  ].filter(Boolean);

  return (
    <div
      className={`relative flex flex-col rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1 ${
        meta.popular ? `ring-2 ${meta.ring}` : ''
      }`}
      style={NEO.raised}
    >
      {meta.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-violet-500 to-purple-600 shadow-md whitespace-nowrap">
          <HiOutlineBolt className="w-3 h-3" /> Most Popular
        </div>
      )}

      {/* Icon + name */}
      <div className="flex items-center gap-3 mt-2 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${meta.gradient} shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-800">{plan.display_name}</h3>
          <p className="text-[10px] text-gray-400">{plan.description}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-4">
        <span className="text-3xl font-extrabold text-gray-800 tracking-tight">
          {isFree ? 'Free' : `₹${parseFloat(plan.price_monthly).toLocaleString('en-IN')}`}
        </span>
        {!isFree && <span className="text-xs text-gray-400 font-medium ml-1">/mo</span>}
      </div>

      {/* Highlights */}
      <div className="flex-1 space-y-2 mb-5">
        {highlights.map((feat) => (
          <div key={feat} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <HiOutlineCheck className="w-2.5 h-2.5 text-emerald-600" />
            </div>
            <span className="text-[11px] font-medium text-gray-600">{feat}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => onSelect(plan)}
        disabled={!!selecting}
        className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ ...meta.ctaStyle, boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}
      >
        {isSelecting
          ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          : <>{meta.cta}<HiOutlineArrowRight className="w-3.5 h-3.5" /></>
        }
      </button>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function RoleSelector() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const { user }   = useSelector((s) => s.auth);
  const { plans, loading: plansLoading } = useSelector((s) => s.subscription);

  const [step, setStep]               = useState(1);
  const [chosenRole, setChosenRole]   = useState(null);
  const [savingRole, setSavingRole]   = useState(false);
  const [selecting, setSelecting]     = useState(null);
  const [welcome, setWelcome]         = useState(false);
  const [onboarding, setOnboarding]   = useState(true);

  // role is already committed if user.role is set in state
  const roleSaved = !!user?.role;

  // already set up — skip onboarding only when NOT actively onboarding
  useEffect(() => {
    if (onboarding) return;
    if (!user?.role) return;
    if (user.role === 'individual') {
      navigate(resolveDefaultRoute(user.default_module, 'individual'), { replace: true });
    } else if (user.shop_id) {
      navigate(resolveDefaultRoute(user.default_module, 'shop'), { replace: true });
    } else {
      navigate('/admin/shops', { replace: true });
    }
  }, [user, navigate, onboarding]);

  // pre-fetch plans so step 2 is instant
  useEffect(() => { dispatch(fetchPlans()); }, [dispatch]);

  // ── Step 1: click service card → save role (first time only) → advance ──
  const handleSelectRole = async (role) => {
    setChosenRole(role);

    // If already saved to backend, just advance — don't call the API again
    if (roleSaved) {
      setStep(2);
      return;
    }

    const defaultModule = role.modules[0].key;
    setSavingRole(true);
    try {
      const res = await api.post('/auth/choose-role', {
        role: role.api_role,
        default_module: defaultModule,
      });
      const { token, user: updatedUser } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch(setRoleAndModule({ role: role.api_role, default_module: defaultModule }));
      setStep(2);
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save. Try again.');
      setChosenRole(null);
    } finally {
      setSavingRole(false);
    }
  };

  // ── Step 2: select plan → store pending plan → welcome overlay → dashboard ─
  const handleSelectPlan = async (plan) => {
    setSelecting(plan.id);
    // Store the chosen plan_id so ShopSetup can apply it after shop creation
    localStorage.setItem('pending_plan_id', plan.id);
    // For individual role, we have no shop constraint — subscribe immediately
    if (user?.role === 'individual') {
      try {
        await dispatch(subscribeToPlan({ plan_id: plan.id, billing_cycle: 'monthly' })).unwrap();
      } catch {
        // non-fatal
      }
    }
    setSelecting(null);
    setWelcome(true);
    setTimeout(() => goToDashboard(), 2400);
  };

  const handleSkipPlan = () => {
    // Clear any pending plan on skip
    localStorage.removeItem('pending_plan_id');
    setWelcome(true);
    setTimeout(() => goToDashboard(), 2400);
  };

  const goToDashboard = () => {
    setOnboarding(false);
    if (user?.role === 'individual') {
      navigate(resolveDefaultRoute(user.default_module, 'individual'), { replace: true });
    } else {
      navigate('/admin/shops', { replace: true });
    }
  };

  const handleLogout = () => { dispatch(logout()); navigate('/login'); };

  // ── Shared page shell ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4" style={{ background: '#e8edf5' }}>

      {/* ── Welcome overlay (shown after plan chosen) ── */}
      {welcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: '#e8edf5' }}>
          <div className="text-center px-8">
            <div
              className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#f97316,#7c3aed,#16a34a)', boxShadow: '6px 6px 14px #c8cfd8,-6px -6px 14px #ffffff' }}
            >
              <img src="/logo.png" alt="myPA" className="w-12 h-12 rounded-xl" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 mb-2">
              Welcome to the MyPA family.
            </p>
            <div className="flex items-center justify-center gap-2 text-base font-bold mb-6">
              <span className="text-orange-500">create</span>
              <span className="text-gray-400">›</span>
              <span className="text-purple-600">manage</span>
              <span className="text-gray-400">›</span>
              <span className="text-green-600">grow</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">Setting up your workspace…</p>
            <div className="flex justify-center">
              <span className="w-6 h-6 border-2 border-purple-400 border-t-purple-600 rounded-full animate-spin" />
            </div>
          </div>
        </div>
      )}

      <div className={`w-full ${step === 1 ? 'max-w-6xl' : 'max-w-5xl'}`}>

        {/* Logo + tagline */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={NEO.raised}>
            <img src="/logo.png" alt="myPA" className="w-9 h-9 rounded-lg" />
          </div>
          <div className="mb-1">
            <span className="text-xl sm:text-2xl font-extrabold text-gray-900">
              Welcome to the MyPA family.
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm font-semibold mb-6">
            <span className="text-orange-500">create</span>
            <span className="text-gray-400 font-light">›</span>
            <span className="text-purple-600">manage</span>
            <span className="text-gray-400 font-light">›</span>
            <span className="text-green-600">grow</span>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator step={step} />

        {/* ════ STEP 1 — Service selection ════ */}
        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">Choose your service</h1>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                Select the service that fits your needs. This is permanent and defines your workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
              {RBAC_CONFIG.map((role) => (
                <ServiceCard
                  key={role.value}
                  role={role}
                  onSelect={handleSelectRole}
                  disabled={savingRole}
                />
              ))}
            </div>

            {/* Enterprise callout */}
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl px-6 py-4 mb-8" style={NEO.raisedSm}>
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl leading-none">🟡</span>
                <div>
                  <p className="text-sm font-bold text-gray-800">Enterprise — Custom Solution</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Need unlimited shops, custom modules, APIs, dedicated support, or white-label solutions?
                  </p>
                </div>
              </div>
              <a href="mailto:support@mypa.in"
                className="shrink-0 text-xs font-semibold px-5 py-2.5 rounded-xl text-white"
                style={{ background: 'linear-gradient(145deg,#f59e0b,#d97706)', boxShadow: '3px 3px 6px #c8cfd8,-3px -3px 6px #ffffff' }}>
                Contact Us →
              </a>
            </div>

            <div className="text-center">
              <button type="button" onClick={handleLogout}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Sign out and use a different account
              </button>
            </div>
          </>
        )}

        {/* ════ STEP 2 — Plan selection ════ */}
        {step === 2 && (
          <>
            {/* ── Chosen service chip ── */}
            {chosenRole && (
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={NEO.raisedSm}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${chosenRole.gradient} shadow-sm shrink-0`}>
                    <span className="text-lg leading-none">{chosenRole.emoji}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selected service</p>
                    <p className="text-sm font-bold text-gray-800">{chosenRole.title}</p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="ml-3 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={NEO.inset}
                  >
                    <HiOutlineArrowLeft className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-500">Change</span>
                  </button>
                </div>
              </div>
            )}

            <div className="text-center mb-8">
              <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">Choose your plan</h1>
              <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                Start free and upgrade anytime. No credit card required.
              </p>
            </div>

            {plansLoading && plans.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 animate-pulse" style={NEO.inset} />
                <p className="text-sm text-gray-400">Loading plans…</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} onSelect={handleSelectPlan} selecting={selecting} />
                ))}
              </div>
            )}

            <div className="text-center mt-2">
              <button onClick={handleSkipPlan}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors py-2 px-4">
                Skip for now — I'll decide later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
