import { useNavigate } from 'react-router-dom';
import { HiOutlineLockClosed, HiOutlineRocketLaunch } from 'react-icons/hi2';

/**
 * Wraps content that requires a subscription feature.
 * Shows an upgrade prompt if the feature is not available.
 * 
 * Props:
 * - feature: string key (e.g. 'reports', 'offers')
 * - available: boolean from subscription state
 * - children: the gated content
 * - title: optional override for the lock screen title
 */
export default function FeatureGate({ feature, available, children, title }) {
  const navigate = useNavigate();

  if (available) return children;

  const featureLabels = {
    reports: 'Analytics & Reports',
    offers: 'Offers & Discounts',
    invoice_branding: 'Custom Invoice Branding',
    priority_support: 'Priority Support',
  };

  const label = title || featureLabels[feature] || feature;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
        <HiOutlineLockClosed className="w-9 h-9 text-gray-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">{label}</h2>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        This feature is not included in your current plan. Upgrade to unlock {label.toLowerCase()} and grow your business.
      </p>
      <button
        onClick={() => navigate('/subscription')}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
        style={{ background: 'linear-gradient(145deg, #5a4dd4, #4f46e5)', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}
      >
        <HiOutlineRocketLaunch className="w-4 h-4" /> Upgrade Plan
      </button>
    </div>
  );
}
