import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  ShieldCheck, ShieldOff, AlertTriangle, Zap, TrendingUp,
  CloudRain, Smartphone, Lock, Construction, ChevronRight,
  RefreshCw, CheckCircle, Clock, FileText
} from 'lucide-react';

const TRIGGER_ICONS = {
  weather_storm:   CloudRain,
  zone_flood:      CloudRain,
  app_outage:      Smartphone,
  curfew_lockdown: Lock,
  road_closure:    Construction,
};

const SEVERITY_COLORS = {
  low:      'bg-blue-100 text-blue-700 border-blue-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

// Generate mock weekly earnings chart data
function generateEarningsData(dailyAvg) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return days.map(day => ({
    day,
    earned: Math.round(dailyAvg * (0.6 + Math.random() * 0.8)),
    target: dailyAvg,
  }));
}

export default function Dashboard() {
  const { partner } = useAuth();
  const [policy, setPolicy]       = useState(null);
  const [claims, setClaims]       = useState([]);
  const [triggers, setTriggers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRef]      = useState(false);
  const [earningsData, setED]     = useState([]);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (partner?.avg_daily_earnings) {
      setED(generateEarningsData(partner.avg_daily_earnings));
    }
  }, [partner]);

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRef(true);
    else setLoading(true);
    try {
      const [polRes, clmRes, trgRes] = await Promise.allSettled([
        api.get('/policies/my'),
        api.get('/claims/my'),
        api.get('/triggers/active'),
      ]);

      if (polRes.status === 'fulfilled') {
        const pols = polRes.value.data.policies;
        setPolicy(pols.find(p => p.status === 'active') || null);
      }
      if (clmRes.status === 'fulfilled') setClaims(clmRes.value.data.claims.slice(0, 5));
      if (trgRes.status === 'fulfilled') setTriggers(trgRes.value.data.triggers);
    } catch (e) {}
    finally {
      setLoading(false);
      setRef(false);
    }
  };

  const daysLeft = policy
    ? Math.max(0, Math.ceil((new Date(policy.coverage_end_date) - new Date()) / 86400000))
    : 0;

  const totalPayout = claims
    .filter(c => ['approved','paid'].includes(c.status))
    .reduce((s, c) => s + parseFloat(c.payout_amount || 0), 0);

  const claimsThisWeek = claims.filter(c => {
    const d = new Date(c.created_at);
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    return d >= weekStart;
  }).length;

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-gray-500 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome + Refresh */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hey, {partner?.full_name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {partner?.zone}, {partner?.city} · {partner?.platform === 'both' ? 'Zomato & Swiggy' : partner?.platform?.charAt(0)?.toUpperCase() + partner?.platform?.slice(1)}
            </p>
          </div>
          <button onClick={() => fetchAll(true)} disabled={refreshing}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition hover:bg-gray-50">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>
            Refresh
          </button>
        </div>

        {/* ── ACTIVE DISRUPTIONS BANNER ── */}
        {triggers.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0"/>
              <p className="font-semibold text-red-800">
                {triggers.length} Active Disruption{triggers.length > 1 ? 's' : ''} in Your Area
              </p>
              {policy && (
                <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  Claims auto-filed
                </span>
              )}
            </div>
            <div className="space-y-2">
              {triggers.slice(0, 3).map(t => {
                const Icon = TRIGGER_ICONS[t.trigger_type] || AlertTriangle;
                return (
                  <div key={t.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${SEVERITY_COLORS[t.severity]}`}>
                    <Icon size={15} className="flex-shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm font-semibold">{t.title}</p>
                      <p className="text-xs opacity-80 mt-0.5 line-clamp-1">{t.description}</p>
                    </div>
                    <span className="ml-auto text-xs font-semibold uppercase tracking-wide flex-shrink-0">
                      {t.severity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Policy Status */}
          <div className={`rounded-2xl p-5 border shadow-sm col-span-2 lg:col-span-1
            ${policy ? 'bg-brand-50 border-brand-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 font-medium">Policy</p>
              {policy
                ? <ShieldCheck size={18} className="text-brand-500"/>
                : <ShieldOff size={18} className="text-gray-400"/>}
            </div>
            {policy ? (
              <>
                <p className="text-2xl font-bold text-gray-900">{daysLeft}d</p>
                <p className="text-xs text-gray-500 mt-0.5">days remaining</p>
                <div className="mt-2 w-full bg-brand-200 rounded-full h-1">
                  <div className="bg-brand-500 rounded-full h-1 transition-all"
                    style={{ width: `${Math.max(5, (daysLeft / 7) * 100)}%` }}/>
                </div>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-gray-600">No policy</p>
                <Link to="/policy" className="text-xs text-brand-600 hover:underline font-medium mt-1 block">
                  Get covered →
                </Link>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 font-medium mb-3">Weekly premium</p>
            <p className="text-2xl font-bold text-gray-900">
              {policy ? `₹${policy.weekly_premium}` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {policy ? `₹${Number(policy.coverage_amount).toLocaleString()} coverage` : 'No active policy'}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 font-medium mb-3">Total payouts</p>
            <p className="text-2xl font-bold text-brand-600">₹{Math.round(totalPayout).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">from {claims.filter(c=>['approved','paid'].includes(c.status)).length} approved claims</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 font-medium mb-3">This week</p>
            <p className="text-2xl font-bold text-gray-900">{claimsThisWeek}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              claims of {policy?.max_claims_per_week || '—'} allowed
            </p>
          </div>
        </div>

        {/* ── CHARTS + RECENT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Earnings Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-brand-500"/>
                This Week's Earnings
              </h2>
              <span className="text-xs text-gray-400">Estimated</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={earningsData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a361" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#16a361" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v}`}/>
                <Tooltip formatter={v => [`₹${v}`, '']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}/>
                <Area type="monotone" dataKey="target" stroke="#d1fae5" strokeWidth={1}
                  fill="none" strokeDasharray="4 4" dot={false} name="Target"/>
                <Area type="monotone" dataKey="earned" stroke="#16a361" strokeWidth={2}
                  fill="url(#earnGrad)" dot={{ r: 3, fill: '#16a361' }} name="Earned"/>
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-3 h-0.5 bg-brand-500 inline-block rounded"/>Earned
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-3 h-0.5 bg-green-200 inline-block rounded" style={{borderTop:'2px dashed #d1fae5'}}/>Target
              </span>
            </div>
          </div>

          {/* Recent Claims */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-brand-500"/>
                Recent Claims
              </h2>
              <Link to="/claims" className="text-xs text-brand-600 hover:underline font-medium flex items-center gap-1">
                View all <ChevronRight size={12}/>
              </Link>
            </div>

            {claims.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CheckCircle size={36} className="text-gray-200 mx-auto mb-2"/>
                <p className="text-gray-400 text-sm">No claims yet</p>
                <p className="text-gray-300 text-xs mt-1">Claims are auto-filed when disruptions occur</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {claims.slice(0, 5).map(c => {
                  const cfg = { approved: 'text-green-500', paid: 'text-purple-500', pending: 'text-amber-500', under_review: 'text-blue-500', rejected: 'text-red-500' };
                  const Icon = { approved: CheckCircle, paid: CheckCircle, pending: Clock, under_review: Clock, rejected: XCircle }[c.status] || Clock;
                  return (
                    <div key={c.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon size={16} className={`${cfg[c.status] || 'text-gray-400'} flex-shrink-0`}/>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.claim_number}</p>
                          <p className="text-xs text-gray-400">{c.claim_type === 'auto' ? '🤖 Auto' : '✍️ Manual'} · {new Date(c.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-900 flex-shrink-0 ml-3">
                        ₹{parseFloat(c.payout_amount || 0).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              to: '/policy',
              icon: ShieldCheck,
              title: policy ? 'Manage Policy' : 'Buy Policy',
              desc:  policy ? `Active · ${daysLeft} days left` : 'From ₹69/week',
              color: 'brand',
            },
            {
              to: '/claims',
              icon: Zap,
              title: 'File a Claim',
              desc:  'Manual or auto-filed',
              color: 'blue',
            },
            {
              to: '/claims',
              icon: FileText,
              title: 'Claim History',
              desc:  `${claims.length} total claims`,
              color: 'purple',
            },
          ].map(a => (
            <Link key={a.to + a.title} to={a.to}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:border-gray-300 transition group">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                ${a.color === 'brand' ? 'bg-brand-50' : a.color === 'blue' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                <a.icon size={20} className={
                  a.color === 'brand' ? 'text-brand-500' : a.color === 'blue' ? 'text-blue-500' : 'text-purple-500'
                }/>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 ml-auto group-hover:text-gray-500 transition"/>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}