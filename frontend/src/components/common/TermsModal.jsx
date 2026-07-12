import { useEffect, useCallback } from 'react';
import { HiOutlineXMark, HiOutlineArrowDownTray } from 'react-icons/hi2';

const PDF_DOWNLOAD = '/terms-and-conditions.pdf';
const PDF_DOWNLOAD_NAME = 'MyPA-Service-Terms.pdf';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating an account or using MyPA ("the Service"), you agree to be bound by these Service Terms & Conditions. MyPA reserves the right to update these terms at any time, and continued use of the Service constitutes acceptance of the revised terms.',
  },
  {
    title: '2. Description of Service',
    body: 'MyPA is an all-in-one business management platform for small and medium enterprises. The Service includes POS billing, inventory tracking, GST-compliant invoice generation, customer ledger management, purchase tracking, and business analytics.',
  },
  {
    title: '3. Account Registration',
    body: 'You must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your login credentials. Notify MyPA immediately at support@mypa.app of any unauthorised use of your account.',
  },
  {
    title: '4. Subscription and Payments',
    body: 'MyPA offers a free Starter plan, an Economy plan at Rs. 599/year, and a Pro plan. All fees are non-refundable except where required by applicable law. Pricing may change with 30 days notice. Failure to pay may result in account suspension.',
  },
  {
    title: '5. Data Ownership and Privacy',
    body: 'You retain full ownership of all business data entered into MyPA. MyPA will not sell your data to third parties. Data is stored securely and processed solely to provide the Service, in compliance with the Information Technology Act, 2000 (India).',
  },
  {
    title: '6. GST and Tax Compliance',
    body: 'MyPA provides GST billing tools but is not a tax advisor. You are solely responsible for verifying tax accuracy, filing GST returns, and complying with all applicable tax laws. MyPA is not liable for penalties arising from user data errors.',
  },
  {
    title: '7. Acceptable Use',
    body: 'You agree not to use the Service for unlawful purposes, upload malicious code, attempt unauthorised access, or harass other users. Violations may result in immediate account termination without prior notice.',
  },
  {
    title: '8. Intellectual Property',
    body: 'All content, design, code, and branding within MyPA belong to MyPA and its licensors. You may not copy or distribute any part of the Service without written permission. Your business data remains your property.',
  },
  {
    title: '9. Limitation of Liability',
    body: "To the extent permitted by law, MyPA is not liable for indirect, incidental, or consequential damages. Total liability shall not exceed fees paid in the three months preceding the claim.",
  },
  {
    title: '10. Termination',
    body: 'Either party may terminate this agreement at any time. Upon termination, your access will cease. You may export your data before termination. MyPA may retain anonymised data for analytics.',
  },
  {
    title: '11. Governing Law',
    body: 'These Service Terms & Conditions are governed by the laws of India. All disputes are subject to the exclusive jurisdiction of courts in West Bengal, India.',
  },
  {
    title: '12. Contact Us',
    body: 'MyPA Support Team\nEmail: support@mypa.app\nAddress: West Bengal, India',
  },
];

export default function TermsModal({ open, onClose }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);

  // Fetch the PDF as a blob and force-download it — works in all browsers
  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(PDF_DOWNLOAD);
      if (!response.ok) throw new Error('Failed to fetch PDF');
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = PDF_DOWNLOAD_NAME;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(PDF_DOWNLOAD, '_blank', 'noopener,noreferrer');
    }
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Service Terms and Conditions"
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
        style={{ height: 'min(88vh, 720px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 bg-primary-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="MyPA" className="w-9 h-9 rounded-lg" />
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Service Terms &amp; Conditions</h2>
              <p className="text-xs text-primary-200 mt-0.5">MyPA Business Management Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs text-primary-100 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-primary-700 transition-colors"
              title="Download PDF"
            >
              <HiOutlineArrowDownTray className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-primary-200 hover:text-white hover:bg-primary-700 transition-colors"
              aria-label="Close"
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">
          {/* Effective date banner */}
          <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 text-center">
            <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide">
              Effective Date: July 2026 &nbsp;·&nbsp; Version 1.0
            </p>
            <p className="text-xs text-primary-600 mt-1 leading-relaxed">
              Please read carefully. By registering an account you agree to these terms.
            </p>
          </div>

          {/* Sections */}
          {SECTIONS.map((s) => (
            <div key={s.title} className="border-b border-gray-100 pb-4 last:border-0">
              <h3 className="text-xs font-bold text-primary-700 uppercase tracking-wide mb-1.5">
                {s.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {s.body}
              </p>
            </div>
          ))}

          {/* End note — logo left-aligned above copyright */}
          <div className="pt-3 pb-1 border-t border-gray-100 pl-2">
            <img src="/logo.png" alt="MyPA" className="w-12 h-12 rounded-xl mb-2" />
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} MyPA. All rights reserved.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 flex items-center justify-center gap-3 px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary text-sm px-6 py-2">
            Cancel
          </button>
          <button onClick={onClose} className="btn-primary text-sm px-6 py-2">
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
