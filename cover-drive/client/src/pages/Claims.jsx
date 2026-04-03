import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  FileText, Plus, AlertCircle, CheckCircle, Clock,
  XCircle, Zap, CloudRain, Smartphone, Lock, Construction,
  ChevronDown, ChevronUp, Loader, Filter
} from 'lucide-react';

const DISRUPTION_TYPES = [
  { value: 'weather_storm',     label: 'Heavy Rain / Storm',     icon: CloudRain  },
  { value: 'zone_flood',        label: 'Zone Waterlogging',      icon: CloudRain  },
  { value: 'app_outage',        label: 'Zomato / Swiggy Outage', icon: Smartphone },
  { value: 'curfew_lockdown',   label: 'Curfew / Section 144',   icon: Lock       },
  { value: 'road_closure',      label: 'Road / Area Closure',    icon: Construction},
];

const STATUS_CONFIG = {
  pending:      { color: 'bg-amber-100 text-amber-700',  icon: Clock,         label: 'Pending'      },
  under_review: { color: 'bg-blue-100 text-blue-700',    icon: Clock,         label: 'Under Review' },
  approved:     { color: 'bg-green-100 text-green-700',  icon: CheckCircle,   label: 'Approved'     },
  rejected:     { color: 'bg-red-100 text-red-700',      icon: XCircle,       label: 'Rejected'     },
  paid:         { color: 'bg-purple-100 text-purple-700',icon: CheckCircle,   label: 'Paid'         },
};

const CLAIM_TYPE_CONFIG = {
  auto:   { color: 'bg-brand-100 text-brand-700', label: 'Auto-filed', icon: Zap   },
  manual: { color: 'bg-gray-100 text-gray-600',   label: 'Manual',     icon: Plus  },
};

export default function Claims() {
  const [claims, setClaims]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSub]      = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [expanded, setExpanded]   = useState(null);
  const [filter, setFilter]       = useState('all');

  const [form, setForm] = useState({
    disruption_type:  '',
    disruption_start: '',
    disruption_end:   '',
    description:      '',
  });

  useEffect(() => { fetchClaims(); }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/claims/my');
      setClaims(data.claims);
    } catch (err) {
      setError('Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const submitClaim = async () => {
    if (!form.disruption_type || !form.disruption_start) {
      setError('Please select disruption type and start time');
      return;
    }
    setSub(true);
    setError('');
    try {
      const { data } = await api.post('/claims/manual', form);
      setSuccess(data.message);
      setShowForm(false);
      setForm({ disruption_type: '', disruption_start: '', disruption_end: '', description: '' });
      await fetchClaims();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit claim');
    } finally {
      setSub(false);
    }
  };

  const filtered = filter === 'all' ? claims
    : claims.filter(c => c.claim_type === filter || c.status === filter);

  const stats = {
    total:    claims.length,
    approved: claims.filter(c => ['approved','paid'].includes(c.status)).length,
    pending:  claims.filter(c => ['pending','under_review'].includes(c.status)).length,
    payout:   claims.filter(c => ['approved','paid'].includes(c.status))
                    .reduce((s, c) => s + parseFloat(c.payout_amount || 0), 0),
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="animate-spin text-brand-500" size={32}/>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="text-brand-500" size={26}/>
              Claims
            </h1>
            <p className="text-gray-500 text-sm mt-1">Your income protection claim history</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setError(''); }}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
            <Plus size={16}/>
            File Claim
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            <AlertCircle size={16}/> {error}
            <button onClick={() => setError('')} className="ml-auto"><XCircle size={16}/></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
            <CheckCircle size={16}/> {success}
            <button onClick={() => setSuccess('')} className="ml-auto"><XCircle size={16}/></button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Claims',   value: stats.total,               sub: 'all time'         },
            { label: 'Approved',       value: stats.approved,            sub: 'claims'            },
            { label: 'Pending',        value: stats.pending,             sub: 'under review'      },
            { label: 'Total Payout',   value: `₹${Math.round(stats.payout).toLocaleString()}`, sub: 'earned' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{s.value}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Manual Claim Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border-2 border-brand-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-brand-500"/>
                File a Manual Claim
              </h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Auto-claims are filed for you
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disruption type *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DISRUPTION_TYPES.map(d => (
                  <button key={d.value} type="button"
                    onClick={() => setForm(f => ({ ...f, disruption_type: d.value }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition
                      ${form.disruption_type === d.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                    <d.icon size={14} className="flex-shrink-0"/>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Disruption started *</label>
                <input type="datetime-local" value={form.disruption_start}
                  onChange={e => setForm(f => ({ ...f, disruption_start: e.target.value }))}
                  max={new Date().toISOString().slice(0,16)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Disruption ended</label>
                <input type="datetime-local" value={form.disruption_end}
                  onChange={e => setForm(f => ({ ...f, disruption_end: e.target.value }))}
                  max={new Date().toISOString().slice(0,16)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional details (optional)</label>
              <textarea value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Describe what happened..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"/>
            </div>

            <div className="bg-amber-50 rounded-lg px-4 py-3 border border-amber-100 text-xs text-amber-800">
              <strong>Note:</strong> Claims are auto-approved for verified disruptions. Manual claims go through a quick review (usually within 24 hours).
            </div>

            <div className="flex gap-3">
              <button onClick={submitClaim} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60">
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Submitting...</>
                ) : (
                  <><CheckCircle size={15}/>Submit Claim</>
                )}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filter Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-gray-400"/>
          {['all','auto','manual','approved','pending','rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition capitalize
                ${filter === f ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Claims List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
            <FileText size={40} className="text-gray-300 mx-auto mb-3"/>
            <p className="text-gray-500 font-medium">No claims yet</p>
            <p className="text-gray-400 text-sm mt-1">
              {filter === 'all'
                ? 'Claims are auto-filed when a disruption is detected in your zone'
                : `No ${filter} claims found`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(claim => {
              const statusCfg = STATUS_CONFIG[claim.status];
              const typeCfg   = CLAIM_TYPE_CONFIG[claim.claim_type];
              const isExp     = expanded === claim.id;
              const DType     = DISRUPTION_TYPES.find(d => d.value === claim.disruption_type);

              return (
                <div key={claim.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div
                    className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setExpanded(isExp ? null : claim.id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Disruption Icon */}
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {DType ? <DType.icon size={16} className="text-gray-600"/> : <FileText size={16}/>}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-gray-900 truncate">{claim.claim_number}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeCfg.color}`}>
                            {typeCfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {DType?.label || claim.disruption_type} · {new Date(claim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm text-gray-900">₹{parseFloat(claim.payout_amount || 0).toLocaleString()}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      {isExp ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                    </div>
                  </div>

                  {isExp && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { label: 'Payout amount',   value: `₹${parseFloat(claim.payout_amount||0).toLocaleString()}` },
                          { label: 'Hours lost',      value: `${claim.estimated_hours_lost || '—'} hrs`               },
                          { label: 'Daily earnings',  value: `₹${claim.daily_avg_earnings || '—'}`                    },
                          { label: 'Claim type',      value: claim.claim_type === 'auto' ? 'Auto-filed 🤖' : 'Manual' },
                          { label: 'Disruption start',value: claim.disruption_start ? new Date(claim.disruption_start).toLocaleString('en-IN', { day:'numeric',month:'short',hour:'2-digit',minute:'2-digit' }) : '—' },
                          { label: 'AI confidence',   value: claim.ai_confidence ? `${Math.round(claim.ai_confidence * 100)}%` : '—' },
                        ].map(d => (
                          <div key={d.label}>
                            <p className="text-xs text-gray-400">{d.label}</p>
                            <p className="text-sm font-semibold text-gray-800 mt-0.5">{d.value}</p>
                          </div>
                        ))}
                      </div>

                      {claim.ai_assessment && (
                        <div className="bg-brand-50 rounded-xl px-4 py-3 border border-brand-100">
                          <p className="text-xs font-semibold text-brand-600 mb-1 flex items-center gap-1">
                            <Zap size={11}/> AI Assessment
                          </p>
                          <p className="text-sm text-gray-700">{claim.ai_assessment}</p>
                        </div>
                      )}

                      {claim.rejection_reason && (
                        <div className="bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                          <p className="text-xs font-semibold text-red-600 mb-1">Rejection reason</p>
                          <p className="text-sm text-gray-700">{claim.rejection_reason}</p>
                        </div>
                      )}

                      {claim.disruption_triggers && (
                        <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 mb-1">Linked trigger</p>
                          <p className="text-sm font-medium text-gray-800">{claim.disruption_triggers.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{claim.disruption_triggers.description}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}