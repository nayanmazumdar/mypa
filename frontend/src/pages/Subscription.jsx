import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlans, fetchCurrentSubscription, fetchLimits, subscribeToPlan, cancelSubscription } from '../store/subscriptionSlice';
import { usePageTitle } from '../hooks/usePageTitle';
import toast from 'react-hot-toast';
import {
  HiOutlineCreditCard, HiOutlineSparkles, HiOutlineRocketLaunch,
  HiOutlineBuildingOffice2, HiOutlineCheck, HiOutlineXMark,
  HiOutlineCube, HiOutlineUsers, HiOutlineShoppingCart,
  HiOutlineUserGroup, HiOutlineChartBar, HiOutlineGift,
  HiOutlineDocumentText, HiOutlineShieldCheck, HiOutlineClock,
  HiOutlineArrowPath, HiOutlineExclamationTriangle,
  HiOutlineChevronDown, HiOutlineBolt, HiOutlineStar,
} from 'react-icons/hi2';

/* ─── Design System ──────────────────────────────────────── */
const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  raisedSm: { background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' },
  inset: { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' },
  insetSm: { background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' },
  flat: { background: '#e8edf5' },
};

const PLAN_META = {
  free: {
    icon: HiOutlineCreditCard,
    gradient: 'from-slate-400 to-slate-600',
    accent: 'slate',
    bgGlow: 'bg-slate-50',
    ring: 'ring-slate-200',
    badge: 'bg-slate-100 text-slate-700',
  },
  starter: {
    icon: HiOutlineSparkles,
    gradient: 'from-sky-400 to-blue-600',
    accent: 'blue',
    bgGlow: 'bg-blue-50',
    ring: 'ring-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
  pro: {
    icon: HiOutlineRocketLaunch,
    gradient: 'from-violet-500 to-purple-700',
    accent: 'purple',
    bgGlow: 'bg-purple-50',
    ring: 'ring-purple-300',
    badge: 'bg-purple-100 text-purple-700',
  },
  enterprise: {
    icon: HiOutlineBuildingOffice2,
    gradient: 'from-amber-400 to-orange-600',
    accent: 'orange',
    bgGlow: 'bg-orange-50',
    ring: 'ring-orange-200',
    badge: 'bg-orange-100 text-orange-700',
  },
};

const FEATURE_DETAILS = {
  pos: { label: 'POS / Billing', icon: HiOutlineShoppingCart, desc: 'Point-of-sale checkout system' },
  reports: { label: 'Analytics & Reports', icon: HiOutlineChartBar, desc: 'Sales, purchase & profit reports' },
  offers: { label: 'Offers & Discounts', icon: HiOutlineGift, desc: 'Create and manage promotional offers' },
  invoice_branding: { label: 'Custom Invoice Branding', icon: HiOutlineDocumentText, desc: 'Add your logo & brand to invoices' },
  priority_support: { label: 'Priority Support', icon: HiOutlineShieldCheck, desc: '24/7 dedicated support channel' },
};

const CYCLE_CONFIG = {
  monthly: { label: 'Monthly', short: '/mo', savings: null, months: 1 },
  quarterly: { label: 'Quarterly', short: '/qtr', savings: '17%', months: 3 },
  yearly: { label: 'Yearly', short: '/yr', savings: '25%', months: 12 },
};

/* ─── Main Component ─────────────────────────────────────── */
export default function Subscription() {
  usePageTitle('Subscription');
  const dispatch = useDispatch();
  const { plans, currentSubscription, limits, loading } = useSelector((s) => s.subscription);
  const { user } = useSelector((s) => s.auth);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [subscribing, setSubscribing] = useState(null);

  useEffect(() => {
    dispatch(fetchPlans());
    dispatch(fetchCurrentSubscription());
    dispatch(fetchLimits());
  }, [dispatch]);

  const handleSubscribe = async (planId) => {
    if (subscribing) return;
    setSubscribing(planId);
    try {
      await dispatch(subscribeToPlan({ plan_id: planId, billing_cycle: billingCycle })).unwrap();
      toast.success('Plan activated successfully!');
      dispatch(fetchCurrentSubscription());
      dispatch(fetchLimits());
    } catch (err) {
      toast.error(err || 'Subscription failed');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel your subscription? You can re-subscribe anytime.')) return;
    try {
      await dispatch(cancelSubscription()).unwrap();
      toast.success('Subscription cancelled');
      dispatch(fetchCurrentSubscription());
      dispatch(fetchLimits());
    } catch (err) {
      toast.error(err || 'Failed to cancel');
    }
  };

  const getPriceForCycle = (plan) => {
    switch (billingCycle) {
      case 'quarterly': return plan.price_quarterly;
      case 'yearly': return plan.price_yearly;
      default: return plan.price_monthly;
    }
  };

  const getMonthlyEquivalent = (plan) => {
    const price = parseFloat(getPriceForCycle(plan));
    if (price === 0) return 0;
    return price / CYCLE_CONFIG[billingCycle].months;
  };

  const formatPrice = (amount) => {
    const num = parseFloat(amount);
    if (num === 0) return 'Free';
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const daysRemaining = () => {
    if (!currentSubscription) return 0;
    const diff = new Date(currentSubscription.expires_at) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const isAdmin = user?.role === 'admin';
  const currentPlanName = currentSubscription?.plan_name || 'free';
  const days = daysRemaining();

  // Find the full plan object matching current subscription for richer display
  const activePlan = plans.find(p => p.id === currentSubscription?.plan_id)
    || plans.find(p => p.name === 'free');
  const activeMeta = PLAN_META[currentPlanName] || PLAN_META.free;

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-8 pb-8">

      {/* ═══ Hero Header ═══ */}
      <div className="rounded-3xl p-6 sm:p-8 relative overflow-hidden" style={NEO.raised}>
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-br from-purple-200/40 to-blue-200/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-gradient-to-br from-emerald-200/30 to-sky-200/30 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Active plan */}
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${activeMeta.gradient} shadow-lg`}>
              {(() => { const Icon = activeMeta.icon; return <Icon className="w-8 h-8 text-white" />; })()}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Active Plan</p>
              <h2 className="text-2xl font-extrabold text-gray-800 mt-0.5">
                {currentSubscription?.plan_display_name || activePlan?.display_name || 'Free Plan'}
              </h2>
              {currentSubscription ? (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                  <HiOutlineClock className="w-3.5 h-3.5" />
                  {currentSubscription.billing_cycle} billing &bull; {days} day{days !== 1 ? 's' : ''} left
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">No active subscription — on Free plan</p>
              )}
            </div>
          </div>

          {/* Right: Status badge + limits summary + Cancel */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Active plan badge — always visible */}
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              !currentSubscription
                ? 'bg-slate-100 text-slate-600'
                : currentSubscription.status === 'active' ? 'bg-emerald-100 text-emerald-700'
                : currentSubscription.status === 'trial'  ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {!currentSubscription ? '○ Free'
                : currentSubscription.status === 'active' ? '● Active'
                : currentSubscription.status === 'trial'  ? '◐ Trial'
                : '○ Expired'}
            </span>

            {currentSubscription && isAdmin && (
              <button onClick={handleCancel}
                className="px-4 py-2 rounded-xl text-xs font-medium text-red-500 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 transition-all duration-200">
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Usage meters */}
        {limits && limits.has_subscription && limits.limits && (
          <div className="relative mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(limits.limits).map(([key, val]) => {
              const icons = { products: HiOutlineCube, staff: HiOutlineUserGroup, customers: HiOutlineUsers, monthly_sales: HiOutlineShoppingCart };
              const Icon = icons[key] || HiOutlineCube;
              const pct = val.unlimited ? 0 : val.max > 0 ? (val.used / val.max) * 100 : 0;
              const isWarning = pct > 80;
              return (
                <div key={key} className="rounded-2xl p-4 group transition-all" style={NEO.inset}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{key.replace('_', ' ')}</p>
                    </div>
                    {isWarning && !val.unlimited && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">Low</span>
                    )}
                  </div>
                  <p className="text-2xl font-extrabold text-gray-800 tabular-nums">
                    {val.unlimited ? '∞' : val.used}
                    {!val.unlimited && <span className="text-sm font-medium text-gray-400"> / {val.max}</span>}
                  </p>
                  {!val.unlimited && val.max > 0 && (
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-gray-200/60">
                      <div className={`h-full rounded-full transition-all duration-700 ease-out ${
                        pct > 90 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                        pct > 70 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                        'bg-gradient-to-r from-emerald-400 to-emerald-500'
                      }`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Billing Cycle Toggle ═══ */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs font-medium text-gray-500">Select billing period</p>
        <div className="inline-flex items-center rounded-2xl p-1.5 gap-1" style={NEO.raised}>
          {Object.entries(CYCLE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setBillingCycle(key)}
              className={`relative px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                billingCycle === key
                  ? 'text-primary-700 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              style={billingCycle === key ? NEO.inset : {}}
            >
              {cfg.label}
              {cfg.savings && (
                <span className={`absolute -top-2.5 -right-2 px-1.5 py-0.5 text-[8px] font-bold rounded-md transition-opacity ${
                  billingCycle === key
                    ? 'bg-emerald-500 text-white opacity-100'
                    : 'bg-emerald-100 text-emerald-600 opacity-80'
                }`}>
                  -{cfg.savings}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Plans Grid ═══ */}
      {loading && plans.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 animate-pulse" style={NEO.inset} />
          <p className="text-sm text-gray-400">Loading plans...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription
              ? currentSubscription.plan_id === plan.id
              : plan.name === 'free';
            const price = getPriceForCycle(plan);
            const monthlyEq = getMonthlyEquivalent(plan);
            const meta = PLAN_META[plan.name] || PLAN_META.free;
            const Icon = meta.icon;
            const isPopular = plan.name === 'pro';
            const isUpgrade = plans.indexOf(plan) > plans.findIndex(p => p.name === currentPlanName);

            return (
              <div key={plan.id}
                className={`relative flex flex-col rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1 ${
                  isPopular ? `ring-2 ${meta.ring}` : ''
                } ${isCurrentPlan ? 'ring-2 ring-emerald-300' : ''}`}
                style={NEO.raised}
              >
                {/* Popular badge */}
                {isPopular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-violet-500 to-purple-600 shadow-md">
                    <HiOutlineStar className="w-3 h-3" /> Best Value
                  </div>
                )}

                {/* Current indicator */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider text-white bg-emerald-500 shadow-md">
                    <HiOutlineCheck className="w-3 h-3" /> Current
                  </div>
                )}

                {/* Plan icon + name */}
                <div className="flex items-center gap-3 mt-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${meta.gradient} shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800">{plan.display_name}</h3>
                    <p className="text-[10px] text-gray-400">{plan.description}</p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="mt-5 mb-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-gray-800 tracking-tight">{formatPrice(price)}</span>
                    {parseFloat(price) > 0 && (
                      <span className="text-xs text-gray-400 font-medium">{CYCLE_CONFIG[billingCycle].short}</span>
                    )}
                  </div>
                  {billingCycle !== 'monthly' && parseFloat(price) > 0 && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      ≈ ₹{Math.round(monthlyEq).toLocaleString('en-IN')}/mo
                    </p>
                  )}
                </div>

                {/* Separator */}
                <div className="my-4 h-px bg-gradient-to-r from-transparent via-gray-300/60 to-transparent" />

                {/* Resource limits */}
                <div className="space-y-2 flex-1">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2">Includes</p>
                  <LimitRow icon={HiOutlineCube} label="Products" value={plan.max_products} />
                  <LimitRow icon={HiOutlineUserGroup} label="Staff" value={plan.max_staff} />
                  <LimitRow icon={HiOutlineUsers} label="Customers" value={plan.max_customers} />
                  <LimitRow icon={HiOutlineShoppingCart} label="Sales/mo" value={plan.max_monthly_sales} />

                  {/* Features */}
                  <div className="pt-3 space-y-1.5">
                    {plan.features && Object.entries(plan.features).map(([feat, enabled]) => {
                      const detail = FEATURE_DETAILS[feat] || { label: feat.replace(/_/g, ' ') };
                      return (
                        <div key={feat} className="flex items-center gap-2">
                          {enabled ? (
                            <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <HiOutlineCheck className="w-2.5 h-2.5 text-emerald-600" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <HiOutlineXMark className="w-2.5 h-2.5 text-gray-300" />
                            </div>
                          )}
                          <span className={`text-[11px] font-medium ${enabled ? 'text-gray-700' : 'text-gray-300'}`}>
                            {detail.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrentPlan || !isAdmin || subscribing === plan.id}
                  className={`mt-5 w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    isCurrentPlan
                      ? 'text-emerald-600 cursor-default'
                      : !isAdmin
                        ? 'text-gray-400 cursor-not-allowed'
                        : isPopular
                          ? 'text-white hover:shadow-lg hover:scale-[1.02]'
                          : 'text-gray-700 hover:text-gray-900 hover:shadow-sm'
                  }`}
                  style={
                    isCurrentPlan
                      ? NEO.insetSm
                      : !isAdmin
                        ? NEO.insetSm
                        : isPopular
                          ? { background: `linear-gradient(145deg, #7c3aed, #5b21b6)`, boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }
                          : NEO.raisedSm
                  }
                >
                  {subscribing === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <HiOutlineArrowPath className="w-3.5 h-3.5 animate-spin" /> Processing
                    </span>
                  ) : isCurrentPlan ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <HiOutlineCheck className="w-3.5 h-3.5" /> Active Plan
                    </span>
                  ) : !isAdmin ? (
                    'Admin Only'
                  ) : isUpgrade ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <HiOutlineBolt className="w-3.5 h-3.5" /> Upgrade
                    </span>
                  ) : parseFloat(price) === 0 ? (
                    'Start Free'
                  ) : (
                    'Select Plan'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Feature Comparison ═══ */}
      <div className="rounded-3xl p-6 sm:p-8" style={NEO.raised}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <HiOutlineChartBar className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Compare Plans</h3>
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-200/60">
                <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[180px]">Feature</th>
                {plans.map(p => {
                  const m = PLAN_META[p.name] || PLAN_META.free;
                  return (
                    <th key={p.id} className="text-center py-3 px-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${m.badge}`}>
                        <m.icon className="w-3 h-3" />
                        {p.display_name}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <CompareRow label="Products" plans={plans} getter={p => p.max_products || '∞'} />
              <CompareRow label="Staff Members" plans={plans} getter={p => p.max_staff || '∞'} />
              <CompareRow label="Customers" plans={plans} getter={p => p.max_customers || '∞'} />
              <CompareRow label="Monthly Sales" plans={plans} getter={p => p.max_monthly_sales || '∞'} />
              {Object.entries(FEATURE_DETAILS).map(([feat, detail]) => (
                <tr key={feat} className="group hover:bg-gray-50/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <detail.icon className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">{detail.label}</span>
                    </div>
                  </td>
                  {plans.map(p => {
                    const enabled = p.features?.[feat];
                    return (
                      <td key={p.id} className="text-center py-3 px-2">
                        {enabled
                          ? <span className="inline-flex w-6 h-6 rounded-full bg-emerald-100 items-center justify-center"><HiOutlineCheck className="w-3.5 h-3.5 text-emerald-600" /></span>
                          : <span className="inline-flex w-6 h-6 rounded-full bg-gray-100 items-center justify-center"><HiOutlineXMark className="w-3.5 h-3.5 text-gray-300" /></span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ FAQ ═══ */}
      <div className="rounded-3xl p-6 sm:p-8" style={NEO.raised}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <HiOutlineDocumentText className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Common Questions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FaqItem
            q="Can I switch plans anytime?"
            a="Absolutely. Upgrade takes effect immediately. Downgrades apply at the end of your billing period."
          />
          <FaqItem
            q="What happens when I hit my limits?"
            a="We'll notify you before you reach a limit. Once exceeded you'll need to upgrade — your existing data stays safe."
          />
          <FaqItem
            q="How does billing work?"
            a="You're billed at the start of each cycle. Quarterly saves ~17% and yearly saves ~25% compared to monthly."
          />
          <FaqItem
            q="Can I cancel my subscription?"
            a="Yes, cancel anytime from this page. You keep access to your plan's features until the billing period ends."
          />
        </div>
      </div>

      {/* ═══ Non-admin notice ═══ */}
      {!isAdmin && (
        <div className="rounded-2xl p-4 flex items-center gap-3 border border-amber-200/50" style={NEO.inset}>
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Only the business owner (admin) can manage subscription plans. Contact your admin to request changes.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Helper Components ──────────────────────────────────── */

function LimitRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        <span className="text-[11px] text-gray-500">{label}</span>
      </div>
      <span className="text-[11px] font-bold text-gray-800">{value || '∞'}</span>
    </div>
  );
}

function CompareRow({ label, plans, getter }) {
  return (
    <tr className="group hover:bg-gray-50/30 transition-colors">
      <td className="py-3 px-4 text-xs font-medium text-gray-600">{label}</td>
      {plans.map(p => (
        <td key={p.id} className="text-center py-3 px-2 text-xs font-bold text-gray-700">{getter(p)}</td>
      ))}
    </tr>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl p-4 cursor-pointer transition-all duration-200 select-none"
      style={open ? NEO.inset : NEO.raisedSm}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-gray-700">{q}</p>
        <HiOutlineChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </div>
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-32 opacity-100 mt-2.5' : 'max-h-0 opacity-0'}`}>
        <p className="text-[11px] text-gray-500 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}
