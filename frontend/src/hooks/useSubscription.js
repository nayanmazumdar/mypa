import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCurrentSubscription, fetchLimits } from '../store/subscriptionSlice';

/**
 * Hook to access subscription state with auto-fetch.
 * 
 * Usage:
 *   const { hasFeature, isWithinLimit, plan, loading } = useSubscription();
 *   if (!hasFeature('reports')) { show upgrade prompt }
 */
export function useSubscription() {
  const dispatch = useDispatch();
  const { currentSubscription, limits, loading } = useSelector((s) => s.subscription);

  useEffect(() => {
    if (!currentSubscription && !loading) {
      dispatch(fetchCurrentSubscription());
    }
    if (!limits && !loading) {
      dispatch(fetchLimits());
    }
  }, [dispatch, currentSubscription, limits, loading]);

  const hasFeature = (featureKey) => {
    // Still loading — don't block yet
    if (!limits) return true;
    // No active subscription — features are gated
    if (!limits.has_subscription) return false;
    // Has subscription but no features data — allow
    if (!limits.features) return true;
    return !!limits.features[featureKey];
  };

  const isWithinLimit = (resource) => {
    if (!limits || !limits.limits) return true;
    const limit = limits.limits[resource];
    if (!limit || limit.unlimited) return true;
    return limit.used < limit.max;
  };

  const getUsage = (resource) => {
    if (!limits || !limits.limits) return null;
    return limits.limits[resource] || null;
  };

  return {
    plan: currentSubscription,
    planName: currentSubscription?.plan_name || 'free',
    limits,
    loading,
    hasFeature,
    isWithinLimit,
    getUsage,
    hasSubscription: limits?.has_subscription || false,
  };
}
