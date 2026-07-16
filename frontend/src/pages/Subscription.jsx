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
} from 'react-icons/hi2';

const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  raisedSm: { background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' },
  inset: { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' },
  insetSm: { background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' },
  flat: { background: '#e8edf5' },
};

const PLAN_ICONS = {
  free: HiOutlineCreditCard,
  starter: HiOutlineSparkles,
  pro: HiOutlineRocketLaunch,
  enterprise: HiOutlineBuildingOffice2,
};

const PLAN_COLORS = {
  free: { gradient: 'from-gray-400 to-gray-600', text: 'text-gray-600', bg: 'bg-gray-100', ring: 'ring-gray-300' },
  starter: { gradient: 'from-blue-400 to-blue-600', text: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-300' },
  pro: { gradient: 'from-violet-500 to-purple-600', text: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-300' },
  enterprise: { gradient: 'from-amber-500 to-orange-600', text: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-300' },
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
  quarterly: { label: 'Quarterly', short: '/qtr', savings: 'Save ~17%', months: 3 },
  yearly: { label: 'Yearly', short: '/yr', savings: 'Save ~25%', months: 12 },
};

export default function Subscription() {
  usePageTitle('Subscription');
  const dispatch = useDispatch();
  const { plans, currentSubscription, limits, loading } = useSelector((s) => s.subscription);
  const { user } = useSelector((s) => s.auth);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [subscribing, setSubscribing] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

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

  return (
    <div className="space-y-8">

      {/* ─── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Plan & Billing</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your subscription, upgrade or change plans anytime</p>
        </div>
        {currentSubscription && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <HiOutlineClock className="w-4 h-4" />
              <span>{daysRemaining()} days remaining</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Current Plan Status Card ────────────────────────── */}
      <div className="rounded-3xl p-6 sm:p-8" style={NEO.raised}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Plan info */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(145deg, ${currentPlanName === 'pro' ? '#7c3aed, #6d28d9' : currentPlanName === 'enterprise' ? '#f59e0b, #d97706' : currentPlanName === 'starter' ? '#3b82f6, #2563eb' : '#6b7280, #4b5563'})`, boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
              {(() => { const Icon = PLAN_ICONS[currentPlanName] || HiOutlineCreditCard; return <Icon className="w-8 h-8 text-white" />; })()}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Current Plan</p>
              <h2 className="text-xl font-bold text-gray-800 mt-0.5">
                {currentSubscription?.plan_display_name || 'No Active Plan'}
              </h2>
              {currentSubscription && (
                <p className="text-sm text-gray-500 mt-1">
                  {currentSubscription.billing_cycle} billing • Since {new Date(currentSubscription.starts_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Right: Status + actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {currentSubscription && (
              <>
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide ${
                  currentSubscription.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  currentSubscription.status === 'trial' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`} style={NEO.insetSm}>
                  {currentSubscription.status}
                </span>
                {isAdmin && (
                  <button onClick={handleCancel}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-red-600 hover:text-red-700 transition-all"
                    style={NEO.raisedSm}>
                    Cancel Plan
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Usage meters */}
        {limits && limits.has_subscription && limits.limits && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(limits.limits).map(([key, val]) => {
              const icons = { products: HiOutlineCube, staff: HiOutlineUserGroup, customers: HiOutlineUsers, monthly_sales: HiOutlineShoppingCart };
              const Icon = icons[key] || HiOutlineCube;
              const pct = val.unlimited ? 0 : val.max > 0 ? (val.used / val.max) * 100 : 0;
              return (
                <div key={key} className="rounded-2xl p-4" style={NEO.inset}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{key.replace('_', ' ')}</p>
                  </div>
                  <p className="text-xl font-bold text-gray-800 tabular-nums">
                    {val.unlimited ? '∞' : val.used}
                    {!val.unlimited && <span className="text-sm font-normal text-gray-400"> / {val.max}</span>}
                  </p>
                  {!val.unlimited && val.max > 0 && (
                    <div className="mt-2 h-2 rounded-full overflow-hidden" style={NEO.insetSm}>
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Billing Cycle Selector ──────────────────────────── */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-gray-600">Choose billing cycle</p>
        <div className="flex items-center rounded-2xl p-1.5" style={NEO.raised}>
          {Object.entries(CYCLE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setBillingCycle(key)}
              className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                billingCycle === key ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={billingCycle === key ? NEO.inset : {}}
            >
              {cfg.label}
              {cfg.savings && (
                <span className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded-md">
                  {cfg.savings}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Plans Grid ──────────────────────────────────────── */}
      {loading && plans.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-pulse" style={NEO.inset} />
          <p className="text-gray-500">Loading plans...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.plan_id === plan.id;
            const price = getPriceForCycle(plan);
            const monthlyEq = getMonthlyEquivalent(plan);
            const colors = PLAN_COLORS[plan.name] || PLAN_COLORS.free;
            const Icon = PLAN_ICONS[plan.name] || HiOutlineCreditCard;
            const isPopular = plan.name === 'pro';
            const isUpgrade = plans.indexOf(plan) > plans.findIndex(p => p.name === currentPlanName);

            return (
              <div key={plan.id}
                className={`relative flex flex-col rounded-3xl p-6 transition-all duration-300 ${
                  isPopular ? 'ring-2 ' + colors.ring : ''
                }`}
                style={isCurrentPlan ? { ...NEO.inset, padding: '1.5rem' } : NEO.raised}
              >

                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ background: 'linear-gradient(145deg, #7c3aed, #6d28d9)', boxShadow: '3px 3px 6px #c8cfd8' }}>
                    Most Popular
                  </div>
                )}

                {/* Current plan indicator */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-emerald-500"
                    style={{ boxShadow: '3px 3px 6px #c8cfd8' }}>
                    Current Plan
                  </div>
                )}

                {/* Plan icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${colors.gradient}`}
                  style={{ boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Plan name & description */}
                <h3 className="text-lg font-bold text-gray-800">{plan.display_name}</h3>
                <p className="text-xs text-gray-500 mt-1 min-h-[32px]">{plan.description}</p>

                {/* Pricing */}
                <div className="mt-4 mb-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-gray-800">{formatPrice(price)}</span>
                    {parseFloat(price) > 0 && (
                      <span className="text-sm text-gray-400 font-medium">{CYCLE_CONFIG[billingCycle].short}</span>
                    )}
                  </div>
                  {billingCycle !== 'monthly' && parseFloat(price) > 0 && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      ≈ ₹{Math.round(monthlyEq).toLocaleString('en-IN')}/month
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="my-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, #c8cfd8, transparent)' }} />

                {/* Resource Limits */}
                <div className="space-y-2.5 flex-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Limits</p>
                  <LimitRow label="Products" value={plan.max_products} />
                  <LimitRow label="Staff members" value={plan.max_staff} />
                  <LimitRow label="Customers" value={plan.max_customers} />
                  <LimitRow label="Sales / month" value={plan.max_monthly_sales} />

                  {/* Features */}
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-4 mb-2">Features</p>
                  {plan.features && Object.entries(plan.features).map(([feat, enabled]) => {
                    const detail = FEATURE_DETAILS[feat] || { label: feat.replace(/_/g, ' '), desc: '' };
                    return (
                      <div key={feat} className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                          enabled ? 'bg-emerald-100' : 'bg-gray-100'
                        }`}>
                          {enabled
                            ? <HiOutlineCheck className="w-3 h-3 text-emerald-600" />
                            : <HiOutlineXMark className="w-3 h-3 text-gray-400" />}
                        </div>
                        <span className={`text-xs font-medium ${enabled ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                          {detail.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrentPlan || !isAdmin || subscribing === plan.id}
                  className={`mt-6 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isCurrentPlan
                      ? 'text-gray-400 cursor-not-allowed'
                      : !isAdmin
                        ? 'text-gray-400 cursor-not-allowed'
                        : isPopular
                          ? 'text-white'
                          : 'text-gray-700 hover:text-gray-900'
                  }`}
                  style={
                    isCurrentPlan || !isAdmin
                      ? NEO.insetSm
                      : isPopular
                        ? { background: 'linear-gradient(145deg, #7c3aed, #6d28d9)', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }
                        : NEO.raisedSm
                  }
                >
                  {subscribing === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <HiOutlineArrowPath className="w-4 h-4 animate-spin" /> Processing...
                    </span>
                  ) : isCurrentPlan ? (
                    'Active Plan'
                  ) : !isAdmin ? (
                    'Admin Only'
                  ) : isUpgrade ? (
                    '⬆ Upgrade'
                  ) : parseFloat(price) === 0 ? (
                    'Start Free'
                  ) : (
                    'Choose Plan'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Feature Comparison Table ────────────────────────── */}
      <div className="rounded-3xl p-6 sm:p-8" style={NEO.raised}>
        <h3 className="text-lg font-bold text-gray-800 mb-6">Feature Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Feature</th>
                {plans.map(p => (
                  <th key={p.id} className="text-center py-3 px-3">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${PLAN_COLORS[p.name]?.text || 'text-gray-600'}`}>
                      {p.display_name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200/50">
                <td className="py-3 px-4 text-gray-600 font-medium">Products</td>
                {plans.map(p => <td key={p.id} className="text-center py-3 px-3 font-semibold text-gray-800">{p.max_products || '∞'}</td>)}
              </tr>
              <tr className="border-t border-gray-200/50">
                <td className="py-3 px-4 text-gray-600 font-medium">Staff Members</td>
                {plans.map(p => <td key={p.id} className="text-center py-3 px-3 font-semibold text-gray-800">{p.max_staff || '∞'}</td>)}
              </tr>
              <tr className="border-t border-gray-200/50">
                <td className="py-3 px-4 text-gray-600 font-medium">Customers</td>
                {plans.map(p => <td key={p.id} className="text-center py-3 px-3 font-semibold text-gray-800">{p.max_customers || '∞'}</td>)}
              </tr>
              <tr className="border-t border-gray-200/50">
                <td className="py-3 px-4 text-gray-600 font-medium">Monthly Sales</td>
                {plans.map(p => <td key={p.id} className="text-center py-3 px-3 font-semibold text-gray-800">{p.max_monthly_sales || '∞'}</td>)}
              </tr>
              {Object.entries(FEATURE_DETAILS).map(([feat, detail]) => (
                <tr key={feat} className="border-t border-gray-200/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <detail.icon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 font-medium">{detail.label}</span>
                    </div>
                  </td>
                  {plans.map(p => {
                    const enabled = p.features?.[feat];
                    return (
                      <td key={p.id} className="text-center py-3 px-3">
                        {enabled
                          ? <HiOutlineCheck className="w-5 h-5 text-emerald-500 mx-auto" />
                          : <HiOutlineXMark className="w-5 h-5 text-gray-300 mx-auto" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── FAQ Section ─────────────────────────────────────── */}
      <div className="rounded-3xl p-6 sm:p-8" style={NEO.raised}>
        <h3 className="text-lg font-bold text-gray-800 mb-6">Frequently Asked Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FaqItem
            q="Can I switch plans anytime?"
            a="Yes, you can upgrade or downgrade your plan at any time. When upgrading, your new plan activates immediately. When downgrading, it takes effect at the end of your current billing period."
          />
          <FaqItem
            q="What happens when I exceed my limits?"
            a="You'll receive a notification when you're close to your limits. Once reached, you'll need to upgrade to continue adding resources. Existing data remains safe."
          />
          <FaqItem
            q="How does billing work?"
            a="You're billed at the start of each cycle (monthly/quarterly/yearly). Quarterly and yearly plans come with significant discounts compared to monthly billing."
          />
          <FaqItem
            q="Can I cancel my subscription?"
            a="Yes, you can cancel anytime from this page. You'll retain access to your current plan's features until the end of your billing period."
          />
        </div>
      </div>

      {/* ─── Not admin warning ───────────────────────────────── */}
      {!isAdmin && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={NEO.inset}>
          <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-gray-600">
            Only the shop admin can change the subscription plan. Contact your admin to upgrade.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Helper Components ──────────────────────────────────── */

function LimitRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-xs font-bold text-gray-800">{value || '∞'}</span>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl p-4 cursor-pointer transition-all" style={open ? NEO.inset : NEO.raisedSm} onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">{q}</p>
        <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </div>
      {open && <p className="text-xs text-gray-500 mt-3 leading-relaxed">{a}</p>}
    </div>
  );
}
