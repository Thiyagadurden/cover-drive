import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { ShieldCheck, Zap, RefreshCw, XCircle, CheckCircle } from 'lucide-react';

export default function Policy() {
  const [policies, setPolicies] = useState([]);
  const [premium, setPremium]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [buying, setBuying]     = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);

  const activePolicy = policies.find(p => p.status === 'active');

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      const { data } = await api.get('/policies/my');
      setPolicies(data.policies || []);
    } catch {}
    setLoading(false);
  };

  const calculatePremium = async () => {
    setCalcLoading(true);
    try {
      const { data } = await api.post('/premium/calculate');
      setPremium(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to calculate premium');
    }
    setCalcLoading(false);
  };

  const buyPolicy = async () => {
    if (!premium) return;
    setBuying(true);
    try {
      await api.post('/policies/buy', {
        weekly_premium: premium.weekly_premium,
        coverage_amount: premium.coverage_amount,
        plan_type: premium.plan_type,
        ai_risk_score: premium.features?.zone_flood_risk,
        premium_breakdown: premium.breakdown,
      });
      await loadPolicies();
      setPremium(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to purchase policy');
    }
    setBuying(false);
  };

  const cancelPolicy = async (id) => {
    if (!confirm('Cancel this policy?')) return;
    try {
      await api.put(`/policies/${id}/cancel`);
      await loadPolicies();
    } catch {}
  };

  const renewPolicy = async (id) => {
    try {
      await api.put(`/policies/${id}/renew`);
      await loadPolicies();
    } catch {}
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Policy</h1>

      {/* Active Policy Card */}
      {activePolicy ? (
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white mb-8 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={28} />
              <div>
                <p className="text-sm opacity-80">Active Policy</p>
                <p className="text-lg font-bold font-mono">{activePolicy.policy_number}</p>
              </div>
            </div>
            <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase">
              {activePolicy.plan_type}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-xs opacity-70">Weekly Premium</p>
              <p className="text-lg font-bold">₹{activePolicy.weekly_premium}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">Coverage</p>
              <p className="text-lg font-bold">₹{parseFloat(activePolicy.coverage_amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">Valid Until</p>
              <p className="text-lg font-bold">{new Date(activePolicy.coverage_end_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">Max Claims/Week</p>
              <p className="text-lg font-bold">{activePolicy.max_claims_per_week}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => renewPolicy(activePolicy.id)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition">
              <RefreshCw size={14} /> Renew
            </button>
            <button onClick={() => cancelPolicy(activePolicy.id)}
              className="flex items-center gap-2 bg-white/10 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm font-medium transition">
              <XCircle size={14} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center mb-8">
          <ShieldCheck size={40} className="mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No Active Policy</h2>
          <p className="text-gray-500 text-sm mb-6">Calculate your AI-powered premium and get covered in seconds.</p>

          {!premium ? (
            <button onClick={calculatePremium} disabled={calcLoading}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-lg transition text-sm flex items-center gap-2 mx-auto">
              {calcLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Calculating...</>
              ) : (<><Zap size={16} /> Calculate My Premium</>)}
            </button>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-4 text-left">
                <p className="text-brand-700 font-semibold text-lg mb-2">₹{premium.weekly_premium}/week</p>
                <p className="text-sm text-gray-600">Plan: <span className="font-medium capitalize">{premium.plan_type}</span></p>
                <p className="text-sm text-gray-600">Coverage: <span className="font-medium">₹{premium.coverage_amount?.toLocaleString()}</span></p>
              </div>
              <button onClick={buyPolicy} disabled={buying}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition text-sm flex items-center justify-center gap-2">
                {buying ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Processing...</>
                ) : (<><CheckCircle size={16} /> Buy Policy — ₹{premium.weekly_premium}/week</>)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Policy History */}
      {policies.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Policy History</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Policy #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {policies.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{p.policy_number}</td>
                    <td className="px-4 py-3 capitalize">{p.plan_type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.status === 'active' ? 'bg-green-100 text-green-700' :
                        p.status === 'expired' ? 'bg-gray-100 text-gray-600' :
                        'bg-red-100 text-red-600'
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">₹{p.weekly_premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
