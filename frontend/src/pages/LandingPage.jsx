import { Link } from 'react-router-dom';
import {
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import LandingNavbar from '../components/landing/LandingNavbar';

/* ─── Data ─────────────────────────────────────────────────── */

const modules = [
  { emoji: '🖥️',  name: 'POS & Billing',       desc: 'Fast checkout, barcode support, and instant invoices.' },
  { emoji: '📦',  name: 'Products',             desc: 'Full catalogue with variants, pricing, and categories.' },
  { emoji: '🏪',  name: 'Inventory',            desc: 'Real-time stock levels and low-stock alerts.' },
  { emoji: '🛒',  name: 'Sales',                desc: 'Complete sales history and order management.' },
  { emoji: '🚚',  name: 'Purchases',            desc: 'Purchase orders and supplier payment tracking.' },
  { emoji: '👥',  name: 'Customers',            desc: 'Customer profiles, ledger, and outstanding dues.' },
  { emoji: '🤝',  name: 'Suppliers',            desc: 'Supplier directory and purchase relationships.' },
  { emoji: '🏷️',  name: 'Categories',           desc: 'Organise products with flexible hierarchies.' },
  { emoji: '🧾',  name: 'GST Invoicing',        desc: 'GST-compliant bills with CGST/SGST/IGST.' },
  { emoji: '📊',  name: 'Reports',              desc: 'Daily, weekly, and monthly performance reports.' },
  { emoji: '💰',  name: 'Accounts & Expenses',  desc: 'Cash flow tracking and expense management.' },
  { emoji: '💳',  name: 'Payments',             desc: 'Cash, UPI, card, and credit payment modes.' },
  { emoji: '🎁',  name: 'Offers & Discounts',   desc: 'Promotional offers and discount campaigns.' },
  { emoji: '🏬',  name: 'Shop Management',      desc: 'Multi-shop setup and shop-level configuration.' },
  { emoji: '📈',  name: 'Analytics',            desc: 'Visual insights into revenue, profit, and trends.' },
  { emoji: '⚙️',  name: 'Settings & Users',     desc: 'User roles, permissions, and business settings.' },
  { emoji: '💆',  name: 'Personal Care',         desc: 'Manage appointments, services, and client records for personal care businesses.' },
  { emoji: '🕐',  name: 'Smart Punch-In',        desc: 'Track employee attendance, clock-ins, and work hours with ease.' },
  { emoji: '🚌',  name: 'Transport',             desc: 'Manage Fleet, Facilitate Cars, Bookings on single tap.' },
  { emoji: '🌍',  name: 'Tourism',               desc: 'Handle tour packages, travel bookings, and itinerary management.' },
];

const steps = [
  { step: '01', title: 'Create your account', desc: 'Sign up in seconds — no credit card required.' },
  { step: '02', title: 'Set up your shop', desc: 'Add your shop details, products, and opening stock.' },
  { step: '03', title: 'Start growing', desc: 'Use the POS or create invoices and track every transaction.' },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    highlight: false,
    features: [
      '1 shop',
      'Up to 200 products',
      'POS & billing',
      'Basic reports',
      'Community support',
    ],
    cta: 'Get started',
    ctaTo: '/register',
  },
  {
    name: 'Economy',
    price: '₹599',
    period: 'per year',
    highlight: true,
    features: [
      'Unlimited shops',
      'Unlimited products',
      'Advanced analytics',
      'Customer ledger',
      'Priority support',
    ],
    cta: 'Start free trial',
    ctaTo: '/register',
  },
  {
    name: 'Pro',
    price: '₹1,299',
    period: 'per month',
    highlight: false,
    features: [
      'Everything in Pro',
      'Multi-user access',
      'Expense management',
      'API access',
      'Dedicated support',
    ],
    cta: 'Contact sales',
    ctaTo: '/register',
  },
];

/* ─── Component ─────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNavbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary-50 via-white to-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-primary-100 text-primary-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            All-in-one business management
          </span>
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src="/logo.png" alt="MyPA logo" className="w-14 h-14 rounded-2xl shadow-md" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
              MyPA
            </h1>
          </div>
          <p className="text-xl sm:text-2xl font-semibold text-gray-700 mb-3">
            Your Personal&nbsp;<span className="text-primary-600">Business Assistant</span>
          </p>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Everything your business needs. One powerful platform. Promote your brand, boost sales, manage inventory, customers, and accounts—all with confidence, all with MyPA.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary flex items-center gap-2 px-6 py-3 text-base">
              Start for free <HiOutlineArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="text-base font-medium text-gray-600 hover:text-primary-600 transition-colors px-6 py-3 rounded-lg border border-gray-200 hover:border-primary-300 bg-white"
            >
              Log in to your account
            </Link>
          </div>
          <p className="mt-5 text-sm text-gray-400">No credit card required · Free forever plan available</p>
        </div>

        {/* Mock dashboard preview */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-4 flex-1 bg-white rounded px-3 py-1 text-xs text-gray-400 max-w-xs">
                mypa.app/dashboard
              </div>
            </div>
            {/* Dashboard skeleton */}
            <div className="flex h-64">
              {/* Sidebar */}
              <div className="w-48 bg-gray-50 border-r border-gray-200 p-3 hidden sm:block">
                <div className="h-8 bg-primary-100 rounded-lg mb-4" />
                {['POS', 'Products', 'Sales', 'Customers', 'Reports'].map((item) => (
                  <div key={item} className="flex items-center gap-2 px-2 py-2 rounded-lg mb-1">
                    <div className="w-4 h-4 bg-gray-300 rounded" />
                    <span className="text-xs text-gray-500">{item}</span>
                  </div>
                ))}
              </div>
              {/* Main content skeleton */}
              <div className="flex-1 p-4 bg-gray-50">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {['Today Sales', 'Products', 'Customers', 'Pending'].map((label) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-6 bg-primary-100 rounded w-1/2" />
                      <p className="text-xs text-gray-400 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 h-24">
                  <div className="h-3 bg-gray-200 rounded w-1/4 mb-3" />
                  <div className="flex items-end gap-1 h-12">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary-200 rounded-t"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Modules Card Grid ────────────────────────────────── */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything your Business needs
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              From billing to analytics, MyPA covers every corner of your business operations.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {modules.map((m) => (
              <div
                key={m.name}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-200 group flex flex-col gap-3"
              >
                <span className="text-3xl">{m.emoji}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{m.name}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Get up and running fast</h2>
            <p className="text-gray-500 text-lg">Three steps to a fully managed shop.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-6 left-[calc(50%+2rem)] right-[-calc(50%-2rem)] h-px bg-primary-200" />
                )}
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-4 relative z-10">
                  {s.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, honest pricing</h2>
            <p className="text-gray-500 text-lg">Start free. Scale as you grow.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm
                           transition-all duration-300 cursor-default
                           hover:border-primary-400 hover:shadow-xl hover:bg-primary-600 hover:-translate-y-1"
              >
                <h3 className="text-lg font-bold mb-1 text-gray-900 group-hover:text-white transition-colors duration-300">
                  {plan.name}
                </h3>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-extrabold text-gray-900 group-hover:text-white transition-colors duration-300">
                    {plan.price}
                  </span>
                </div>
                <p className="text-sm mb-6 text-gray-400 group-hover:text-primary-200 transition-colors duration-300">
                  {plan.period}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <HiOutlineCheckCircle
                        className="w-4 h-4 flex-shrink-0 text-primary-500 group-hover:text-primary-200 transition-colors duration-300"
                      />
                      <span className="text-gray-600 group-hover:text-primary-50 transition-colors duration-300">{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.ctaTo}
                  className="block text-center text-sm font-medium py-2.5 px-4 rounded-lg transition-colors duration-200
                             bg-primary-600 text-white hover:bg-primary-700
                             group-hover:bg-white group-hover:text-primary-700 group-hover:hover:bg-primary-50"
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to take control of your Business?
          </h2>
          <p className="text-primary-200 text-lg mb-8">
            Join thousands of Entrepreneurs who manage their business smarter with MyPA.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="bg-white text-primary-700 font-semibold px-6 py-3 rounded-lg hover:bg-primary-50 transition-colors text-base flex items-center gap-2"
            >
              Create free account <HiOutlineArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="text-primary-200 hover:text-white font-medium text-base transition-colors"
            >
              Already have an account? Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="py-8 px-4 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MyPA logo" className="w-6 h-6 rounded" />
            <span className="text-sm font-semibold text-gray-700">MyPA</span>
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} MyPA. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#features" className="text-xs text-gray-400 hover:text-gray-700">Features</a>
            <a href="#pricing" className="text-xs text-gray-400 hover:text-gray-700">Pricing</a>
            <Link to="/login" className="text-xs text-gray-400 hover:text-gray-700">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
