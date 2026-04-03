import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Zap, User, MapPin, TrendingUp, CheckCircle,
  ChevronRight, ChevronLeft, AlertCircle, Eye, EyeOff
} from 'lucide-react';

const PLATFORMS = [
  { id: 'zomato', label: 'Zomato', emoji: '🍕' },
  { id: 'swiggy', label: 'Swiggy', emoji: '🛵' },
  { id: 'both',   label: 'Both',   emoji: '🔁' },
];

const STEPS = [
  { number: 1, title: 'Personal Info',    icon: User       },
  { number: 2, title: 'Work Details',     icon: MapPin     },
  { number: 3, title: 'Earnings & Setup', icon: TrendingUp },
];

const FALLBACK_CITIES = ['Chennai', 'Mumbai', 'Bengaluru', 'Hyderabad'];

const FALLBACK_ZONES = {
  Chennai: [
    { zone_code: 'CHN-ANN', zone_name: 'Anna Nagar',     flood_risk_score: 3.2, historical_claim_rate: 0.10, curfew_risk_score: 1.0 },
    { zone_code: 'CHN-VEL', zone_name: 'Velachery',      flood_risk_score: 7.8, historical_claim_rate: 0.28, curfew_risk_score: 1.5 },
    { zone_code: 'CHN-TNG', zone_name: 'T. Nagar',       flood_risk_score: 4.5, historical_claim_rate: 0.15, curfew_risk_score: 1.2 },
    { zone_code: 'CHN-TAM', zone_name: 'Tambaram',       flood_risk_score: 5.1, historical_claim_rate: 0.18, curfew_risk_score: 1.0 },
    { zone_code: 'CHN-SHO', zone_name: 'Sholinganallur', flood_risk_score: 6.3, historical_claim_rate: 0.22, curfew_risk_score: 1.3 },
    { zone_code: 'CHN-PER', zone_name: 'Perambur',       flood_risk_score: 6.9, historical_claim_rate: 0.25, curfew_risk_score: 2.0 },
    { zone_code: 'CHN-ADY', zone_name: 'Adyar',          flood_risk_score: 8.1, historical_claim_rate: 0.31, curfew_risk_score: 1.0 },
    { zone_code: 'CHN-CHR', zone_name: 'Chromepet',      flood_risk_score: 5.5, historical_claim_rate: 0.19, curfew_risk_score: 1.1 },
    { zone_code: 'CHN-POR', zone_name: 'Porur',          flood_risk_score: 4.8, historical_claim_rate: 0.16, curfew_risk_score: 1.0 },
    { zone_code: 'CHN-KOD', zone_name: 'Kodambakkam',    flood_risk_score: 5.2, historical_claim_rate: 0.17, curfew_risk_score: 1.4 },
  ],
  Mumbai: [
    { zone_code: 'MUM-KUR', zone_name: 'Kurla',   flood_risk_score: 8.5, historical_claim_rate: 0.32, curfew_risk_score: 2.0 },
    { zone_code: 'MUM-BAN', zone_name: 'Bandra',  flood_risk_score: 5.0, historical_claim_rate: 0.14, curfew_risk_score: 1.0 },
    { zone_code: 'MUM-AND', zone_name: 'Andheri', flood_risk_score: 6.2, historical_claim_rate: 0.21, curfew_risk_score: 1.5 },
  ],
  Bengaluru: [
    { zone_code: 'BLR-KOR', zone_name: 'Koramangala',  flood_risk_score: 3.5, historical_claim_rate: 0.11, curfew_risk_score: 1.0 },
    { zone_code: 'BLR-WHI', zone_name: 'Whitefield',   flood_risk_score: 4.1, historical_claim_rate: 0.13, curfew_risk_score: 1.0 },
    { zone_code: 'BLR-MAR', zone_name: 'Marathahalli', flood_risk_score: 5.8, historical_claim_rate: 0.20, curfew_risk_score: 1.2 },
  ],
  Hyderabad: [
    { zone_code: 'HYD-HIT', zone_name: 'Hitech City', flood_risk_score: 3.8, historical_claim_rate: 0.12, curfew_risk_score: 1.0 },
    { zone_code: 'HYD-LBN', zone_name: 'LB Nagar',   flood_risk_score: 6.5, historical_claim_rate: 0.23, curfew_risk_score: 1.8 },
  ],
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]         = useState(1);
  const [cities, setCities]     = useState(FALLBACK_CITIES);
  const [zones, setZones]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [preview, setPreview]   = useState(null);

  const [form, setForm] = useState({
    full_name:           '',
    phone:               '',
    email:               '',
    password:            '',
    platform:            '',
    city:                '',
    zone:                '',
    avg_daily_earnings:  800,
    active_hours_weekly: 40,
    partner_rating:      4.0,
  });

  // Try to load cities from API — fallback already set
  useEffect(() => {
    api.get('/zones/cities')
      .then(r => { if (r.data.cities?.length > 0) setCities(r.data.cities); })
      .catch(() => {});
  }, []);

  // Load zones when city selected
  useEffect(() => {
    if (!form.city) { setZones([]); return; }
    setZones(FALLBACK_ZONES[form.city] || []);
    api.get(`/zones?city=${form.city}`)
      .then(r => { if (r.data.zones?.length > 0) setZones(r.data.zones); })
      .catch(() => {});
  }, [form.city]);

  // Zone risk preview
  useEffect(() => {
    if (!form.zone || !form.city) { setPreview(null); return; }
    const zone = zones.find(z => z.zone_name === form.zone);
    if (!zone) return;
    const base      = 99;
    const flood_adj = (zone.flood_risk_score - 5) * 2.5;
    const claim_adj = zone.historical_claim_rate * 60;
    const rating_adj = (3 - parseFloat(form.partner_rating)) * 5;
    const est = Math.min(Math.max(Math.round(base + flood_adj + claim_adj + rating_adj), 69), 149);
    setPreview({
      weekly_premium:   est,
      risk_level:       est <= 85 ? 'Low' : est <= 115 ? 'Medium' : 'High',
      zone_flood_risk:  zone.flood_risk_score,
    });
  }, [form.zone, form.city, form.partner_rating, zones]);

  const handle = (e) => {
    const { name, value } = e.target;
    if (name === 'city') {
      setForm(p => ({ ...p, city: value, zone: '' }));
    } else {
      setForm(p => ({ ...p, [name]: value }));
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.full_name.trim())              return 'Full name is required';
      if (!/^[6-9]\d{9}$/.test(form.phone))   return 'Enter a valid 10-digit Indian mobile number';
      if (!/\S+@\S+\.\S+/.test(form.email))   return 'Enter a valid email';
      if (form.password.length < 6)            return 'Password must be at least 6 characters';
    }
    if (step === 2) {
      if (!form.platform) return 'Select your delivery platform';
      if (!form.city)     return 'Select your city';
      if (!form.zone)     return 'Select your zone';
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (level) =>
    level === 'Low'    ? 'text-green-600 bg-green-50'
    : level === 'Medium' ? 'text-amber-600 bg-amber-50'
    : 'text-red-600 bg-red-50';

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-xl">Cover Drive</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Get your income protected</h1>
          <p className="text-gray-500 text-sm mt-1">Setup takes under 2 minutes</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${step === s.number ? 'bg-brand-500 text-white shadow-sm'
                  : step > s.number ? 'bg-brand-100 text-brand-700'
                  : 'bg-gray-100 text-gray-400'}`}>
                {step > s.number ? <CheckCircle size={12}/> : <s.icon size={12}/>}
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{s.number}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 rounded ${step > s.number ? 'bg-brand-300' : 'bg-gray-200'}`}/>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">
              <AlertCircle size={16} className="flex-shrink-0"/>
              {error}
            </div>
          )}

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Personal details</h2>
                <p className="text-sm text-gray-500">Let's start with who you are</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <input name="full_name" value={form.full_name} onChange={handle}
                  placeholder="Ravi Kumar"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile number</label>
                <div className="flex gap-2">
                  <span className="px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500">+91</span>
                  <input name="phone" value={form.phone} onChange={handle}
                    maxLength={10} placeholder="9876543210" type="tel"
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input name="email" value={form.email} onChange={handle}
                  type="email" placeholder="ravi@email.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Create password</label>
                <div className="relative">
                  <input name="password" value={form.password} onChange={handle}
                    type={showPw ? 'text' : 'password'} placeholder="Min 6 characters"
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"/>
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Your delivery work</h2>
                <p className="text-sm text-gray-500">We use this to calculate your exact risk and premium</p>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery platform</label>
                <div className="grid grid-cols-3 gap-3">
                  {PLATFORMS.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => setForm(f => ({ ...f, platform: p.id }))}
                      className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all
                        ${form.platform === p.id
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                      <span className="text-xl">{p.emoji}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <select name="city" value={form.city} onChange={handle}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="">Select your city</option>
                  {cities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Zone — only show after city selected */}
              {form.city && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Your delivery zone</label>
                  <select name="zone" value={form.zone} onChange={handle}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                    <option value="">Select zone</option>
                    {zones.map(z => (
                      <option key={z.zone_code} value={z.zone_name}>
                        {z.zone_name} — {z.zone_code}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Risk preview */}
              {preview && form.zone && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Zone Risk Preview</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">₹{preview.weekly_premium}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Est. weekly premium</p>
                    </div>
                    <div className="text-center">
                      <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${riskColor(preview.risk_level)}`}>
                        {preview.risk_level}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">Risk level</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">{Number(preview.zone_flood_risk).toFixed(1)}/10</p>
                      <p className="text-xs text-gray-500 mt-0.5">Flood score</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Earnings setup</h2>
                <p className="text-sm text-gray-500">This determines your coverage payout amount</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Average daily earnings
                  <span className="ml-2 text-brand-600 font-bold">₹{form.avg_daily_earnings}</span>
                </label>
                <input type="range" name="avg_daily_earnings"
                  min="300" max="2000" step="50"
                  value={form.avg_daily_earnings} onChange={handle}
                  className="w-full accent-brand-500"/>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>₹300</span><span>₹2,000</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Active hours per week
                  <span className="ml-2 text-brand-600 font-bold">{form.active_hours_weekly} hrs</span>
                </label>
                <input type="range" name="active_hours_weekly"
                  min="20" max="70" step="5"
                  value={form.active_hours_weekly} onChange={handle}
                  className="w-full accent-brand-500"/>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>20 hrs</span><span>70 hrs</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your platform rating
                  <span className="ml-2 text-brand-600 font-bold">⭐ {parseFloat(form.partner_rating).toFixed(1)}</span>
                </label>
                <input type="range" name="partner_rating"
                  min="1.0" max="5.0" step="0.1"
                  value={form.partner_rating} onChange={handle}
                  className="w-full accent-brand-500"/>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1.0</span><span>5.0</span>
                </div>
                {parseFloat(form.partner_rating) >= 4.5 && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    🎉 High rating — you'll get a ₹10 discount on your premium!
                  </p>
                )}
              </div>

              {/* Summary */}
              <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
                <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-3">Your Coverage Summary</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Daily earnings</p>
                    <p className="text-lg font-bold text-gray-900">₹{Number(form.avg_daily_earnings).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Max payout (3 days)</p>
                    <p className="text-lg font-bold text-brand-600">₹{(form.avg_daily_earnings * 3).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Active hours/week</p>
                    <p className="text-lg font-bold text-gray-900">{form.active_hours_weekly}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Hourly rate</p>
                    <p className="text-lg font-bold text-gray-900">₹{Math.round(form.avg_daily_earnings / 8)}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center">
                By registering, you agree to Cover Drive's Terms of Service and Privacy Policy.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className={`flex mt-8 gap-3 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
            {step > 1 && (
              <button type="button"
                onClick={() => { setStep(s => s - 1); setError(''); }}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                <ChevronLeft size={16}/> Back
              </button>
            )}

            {step < 3 ? (
              <button type="button" onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition">
                Continue <ChevronRight size={16}/>
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Creating account...</>
                ) : (
                  <><CheckCircle size={16}/>Create my account</>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}