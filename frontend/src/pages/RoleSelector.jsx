import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { setRoleAndModule, logout } from '../store/authSlice';
import api from '../api/axios';

// ─── Route resolver ────────────────────────────────────────────────────────
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

// ─── RBAC master config ────────────────────────────────────────────────────
export const RBAC_CONFIG = [
  {
    value: 'business_admin',
    api_role: 'admin',
    emoji: '🏪',
    title: 'Business Admin',
    subtitle: 'Full shop management',
    description: 'Own and manage your entire shop — billing, stock, team, and reports.',
    gradient: 'from-blue-500 to-blue-600',
    lightBg: 'bg-blue-50',
    ringColor: 'ring-blue-400',
    borderActive: 'border-blue-400',
    textColor: 'text-blue-600',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    dotColor: 'bg-blue-400',
    modules: [
      { key: 'dashboard',  label: 'Dashboard',     emoji: '📊', desc: 'Overview & KPIs' },
      { key: 'pos',        label: 'Point of Sale',  emoji: '🖥️', desc: 'Billing & checkout' },
      { key: 'products',   label: 'Products',       emoji: '📦', desc: 'Manage catalogue' },
      { key: 'sales',      label: 'Sales',          emoji: '🛒', desc: 'Orders & invoices' },
      { key: 'purchases',  label: 'Purchases',      emoji: '🚚', desc: 'Supplier orders' },
      { key: 'inventory',  label: 'Inventory',      emoji: '🗃️', desc: 'Stock & alerts' },
      { key: 'customers',  label: 'Customers',      emoji: '👥', desc: 'Ledger & credit' },
      { key: 'accounts',   label: 'Accounts',       emoji: '💰', desc: 'Cash flow' },
    ],
  },
  {
    value: 'manager',
    api_role: 'admin',
    emoji: '👔',
    title: 'Shop Manager',
    subtitle: 'Operations & sales oversight',
    description: 'Handle daily operations — billing, stock, suppliers, customer accounts.',
    gradient: 'from-violet-500 to-violet-600',
    lightBg: 'bg-violet-50',
    ringColor: 'ring-violet-400',
    borderActive: 'border-violet-400',
    textColor: 'text-violet-600',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-700',
    dotColor: 'bg-violet-400',
    modules: [
      { key: 'pos',        label: 'Point of Sale',  emoji: '🖥️', desc: 'Billing & checkout' },
      { key: 'sales',      label: 'Sales',          emoji: '🛒', desc: 'Orders & invoices' },
      { key: 'purchases',  label: 'Purchases',      emoji: '🚚', desc: 'Supplier orders' },
      { key: 'inventory',  label: 'Inventory',      emoji: '🗃️', desc: 'Stock & alerts' },
      { key: 'customers',  label: 'Customers',      emoji: '👥', desc: 'Ledger & credit' },
    ],
  },
  {
    value: 'staff',
    api_role: 'admin',
    emoji: '🧑‍💼',
    title: 'Staff',
    subtitle: 'Billing & stock only',
    description: 'Shop floor access — POS billing and inventory monitoring.',
    gradient: 'from-amber-500 to-orange-500',
    lightBg: 'bg-amber-50',
    ringColor: 'ring-amber-400',
    borderActive: 'border-amber-400',
    textColor: 'text-amber-600',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    dotColor: 'bg-amber-400',
    modules: [
      { key: 'pos',        label: 'Point of Sale',  emoji: '🖥️', desc: 'Billing & checkout' },
      { key: 'inventory',  label: 'Inventory',      emoji: '🗃️', desc: 'Stock & alerts' },
    ],
  },
  {
    value: 'individual',
    api_role: 'individual',
    emoji: '👤',
    title: 'Individual',
    subtitle: 'Personal finance & tasks',
    description: 'Track personal income, expenses, and daily tasks. No shop needed.',
    gradient: 'from-emerald-500 to-teal-500',
    lightBg: 'bg-emerald-50',
    ringColor: 'ring-emerald-400',
    borderActive: 'border-emerald-400',
    textColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    dotColor: 'bg-emerald-400',
    modules: [
      { key: 'individual', label: 'Dashboard',      emoji: '📊', desc: 'Personal overview' },
      { key: 'expenses',   label: 'Expenses',       emoji: '💸', desc: 'Track spending' },
      { key: 'income',     label: 'Income',         emoji: '💵', desc: 'Salary & earnings' },
      { key: 'tasks',      label: 'Tasks',          emoji: '✅', desc: 'Task planner' },
      { key: 'report',     label: 'Reports',        emoji: '📈', desc: 'Financial summary' },
    ],
  },
];

// ─── Role Card ─────────────────────────────────────────────────────────────
function RoleCard({ role, selected, onClick }) {
  const active = selected === role.value;
  return (
    <button
      type="button"
      onClick={() => onClick(role.value)}
      aria-pressed={active}
      className={`
        relative group w-full text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400
        ${active
          ? `${role.borderActive} shadow-lg scale-[1.02]`
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:scale-[1.01]'
        }
      `}
    >
      {/* Gradient header strip */}
      <div className={`bg-gradient-to-r ${role.gradient} p-5 flex items-center gap-3`}>
        {/* Big emoji bubble */}
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner shrink-0">
          <span className="text-3xl leading-none" role="img" aria-label={role.title}>
            {role.emoji}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-base leading-tight">{role.title}</p>
          <p className="text-white/75 text-xs mt-0.5 truncate">{role.subtitle}</p>
        </div>
        {/* Selected checkmark */}
        {active && (
          <div className="ml-auto shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
            <svg className={`w-3.5 h-3.5 ${role.textColor}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Body */}
      <div className={`px-4 py-3 ${active ? role.lightBg : 'bg-white'} transition-colors duration-200`}>
        <p className="text-xs text-gray-500 leading-relaxed">{role.description}</p>
        {/* Module emoji row preview */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {role.modules.map((m) => (
            <span
              key={m.key}
              title={m.label}
              className={`
                text-base leading-none w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                ${active ? `${role.badgeBg}` : 'bg-gray-100'}
              `}
            >
              {m.emoji}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

// ─── Module Tile ───────────────────────────────────────────────────────────
function ModuleTile({ mod, selected, role, onClick }) {
  const active = selected === mod.key;
  return (
    <button
      type="button"
      onClick={() => onClick(mod.key)}
      aria-pressed={active}
      className={`
        relative group w-full rounded-2xl border-2 transition-all duration-200 overflow-hidden
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-400
        ${active
          ? `${role.borderActive} shadow-md scale-[1.03]`
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm hover:scale-[1.02]'
        }
      `}
    >
      {/* Top: big emoji centered */}
      <div className={`
        flex items-center justify-center pt-5 pb-3
        ${active ? role.lightBg : 'bg-gray-50 group-hover:bg-gray-100'} transition-colors duration-200
      `}>
        <div className={`
          w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm transition-all duration-200
          ${active ? `${role.badgeBg} shadow-md` : 'bg-white'}
        `}>
          <span role="img" aria-label={mod.label}>{mod.emoji}</span>
        </div>
      </div>

      {/* Bottom: label + desc */}
      <div className="px-3 py-3 text-center">
        <p className={`text-sm font-semibold leading-tight transition-colors ${active ? role.textColor : 'text-gray-800'}`}>
          {mod.label}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{mod.desc}</p>
      </div>

      {/* Selected indicator dot */}
      {active && (
        <div className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full ${role.dotColor} flex items-center justify-center shadow`}>
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  );
}

// ─── Step badge ────────────────────────────────────────────────────────────
function StepBadge({ n, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 transition-opacity ${active || done ? 'opacity-100' : 'opacity-40'}`}>
      <div className={`
        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
        ${done ? 'bg-gray-900 text-white' : active ? 'bg-gray-900 text-white ring-4 ring-gray-200' : 'bg-gray-200 text-gray-500'}
      `}>
        {done
          ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          : n
        }
      </div>
      <span className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function RoleSelector() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [step, setStep] = useState(1); // 1 = pick role, 2 = pick module
  const [loading, setLoading] = useState(false);

  // Already set up — redirect straight to dashboard
  useEffect(() => {
    if (!user?.role) return;
    if (user.role === 'individual') {
      navigate(resolveDefaultRoute(user.default_module, 'individual'), { replace: true });
    } else if (user.shop_id) {
      navigate(resolveDefaultRoute(user.default_module, 'shop'), { replace: true });
    } else {
      navigate('/admin/shops', { replace: true });
    }
  }, [user, navigate]);

  const activeRole = RBAC_CONFIG.find((r) => r.value === selectedRole);
  const activeModule = activeRole?.modules.find((m) => m.key === selectedModule);

  const handleRoleClick = (value) => {
    setSelectedRole(value);
    const role = RBAC_CONFIG.find((r) => r.value === value);
    setSelectedModule(role.modules[0].key);
  };

  const handleNextStep = () => {
    if (!selectedRole) { toast.error('Pick a role first'); return; }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => setStep(1);

  const handleConfirm = async () => {
    if (!selectedRole || !selectedModule) {
      toast.error('Please pick a role and a module');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/choose-role', {
        role: activeRole.api_role,
        default_module: selectedModule,
      });
      const { token, user: updatedUser } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch(setRoleAndModule({ role: activeRole.api_role, default_module: selectedModule }));
      toast.success('Workspace ready! Welcome to myPA.');
      if (activeRole.api_role === 'individual') {
        navigate(activeModule?.route ?? '/individual');
      } else {
        navigate('/admin/shops');
      }
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4" style={{ background: '#e8edf5' }}>
      <div className="w-full max-w-3xl">

        {/* ── Logo + title ── */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}
          >
            <img src="/logo.png" alt="myPA" className="w-9 h-9 rounded-lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Set up your workspace</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
            One-time setup — your role and default module are permanent once confirmed.
          </p>
        </div>

        {/* ── Step indicator ── */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <StepBadge n={1} label="Choose Role"   active={step === 1} done={step > 1} />
          <div className={`w-16 h-px transition-colors ${step > 1 ? 'bg-gray-700' : 'bg-gray-300'}`} />
          <StepBadge n={2} label="Choose Module" active={step === 2} done={false} />
        </div>

        {/* ── STEP 1: Role cards ── */}
        {step === 1 && (
          <div>
            {/* Warning banner */}
            <div
              className="flex gap-2.5 rounded-2xl px-4 py-3 mb-6"
              style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}
            >
              <span className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true">⚠️</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="font-semibold">This is permanent.</span> Your role defines what you can access in myPA and cannot be changed after setup.
              </p>
            </div>

            {/* 2×2 role grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {RBAC_CONFIG.map((role) => (
                <RoleCard
                  key={role.value}
                  role={role}
                  selected={selectedRole}
                  onClick={handleRoleClick}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNextStep}
              disabled={!selectedRole}
              className={`
                w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200
                ${selectedRole
                  ? 'text-white'
                  : 'text-gray-400 cursor-not-allowed'
                }
              `}
              style={selectedRole
                ? { background: 'linear-gradient(145deg, #5a4dd4, #4f46e5)', boxShadow: '5px 5px 10px #c8cfd8, -5px -5px 10px #ffffff' }
                : { background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }
              }
            >
              {selectedRole
                ? `Continue as ${activeRole?.title} →`
                : 'Select a role to continue'
              }
            </button>
          </div>
        )}

        {/* ── STEP 2: Module tiles ── */}
        {step === 2 && activeRole && (
          <div>
            {/* Role recap banner */}
            <div className={`flex items-center gap-3 rounded-2xl p-4 mb-6 bg-gradient-to-r ${activeRole.gradient}`}>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-2xl" role="img" aria-label={activeRole.title}>{activeRole.emoji}</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">{activeRole.title}</p>
                <p className="text-white/75 text-xs">{activeRole.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={handleBack}
                className="text-white/80 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Change
              </button>
            </div>

            {/* Section heading */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Where do you want to start?</p>
                <p className="text-xs text-gray-400 mt-0.5">Pick your default landing module</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${activeRole.badgeBg} ${activeRole.badgeText}`}>
                {activeRole.modules.length} module{activeRole.modules.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Module grid — emoji tiles */}
            <div
              className="grid gap-3 mb-6"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}
              role="listbox"
              aria-label={`Modules available for ${activeRole.title}`}
            >
              {activeRole.modules.map((mod) => (
                <ModuleTile
                  key={mod.key}
                  mod={mod}
                  selected={selectedModule}
                  role={activeRole}
                  onClick={setSelectedModule}
                />
              ))}
            </div>

            {/* Selection summary card */}
            {activeModule && (
              <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${activeRole.borderActive} ${activeRole.lightBg} mb-6`}>
                <div className={`w-12 h-12 rounded-xl ${activeRole.badgeBg} flex items-center justify-center text-2xl shrink-0 shadow-sm`}>
                  <span role="img" aria-label={activeModule.label}>{activeModule.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    Landing on{' '}
                    <span className={activeRole.textColor}>{activeModule.label}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{activeModule.desc}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${activeRole.badgeBg} ${activeRole.badgeText} shrink-0`}>
                  DEFAULT
                </span>
              </div>
            )}

            {/* Confirm button */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedModule || loading}
              className={`
                w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200
                flex items-center justify-center gap-2
                ${selectedModule && !loading
                  ? 'text-white'
                  : 'text-gray-400 cursor-not-allowed'
                }
              `}
              style={selectedModule && !loading
                ? { background: 'linear-gradient(145deg, #5a4dd4, #4f46e5)', boxShadow: '5px 5px 10px #c8cfd8, -5px -5px 10px #ffffff' }
                : { background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }
              }
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up your workspace…
                </>
              ) : (
                <>
                  <span>{activeModule?.emoji}</span>
                  Confirm & Enter {activeModule?.label ?? 'Dashboard'} →
                </>
              )}
            </button>
          </div>
        )}

        {/* Sign out */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  );
}
