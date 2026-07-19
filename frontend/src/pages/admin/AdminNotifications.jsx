import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlineEnvelope, HiOutlineChatBubbleLeftRight, HiOutlineBell,
  HiOutlinePaperAirplane, HiOutlineCheckCircle, HiOutlineXCircle,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2';
import api from '../../api/axios';
import { LoadingSpinner } from '../../components/common';
import { usePageTitle } from '../../hooks/usePageTitle';

const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  card:   { background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' },
};

export default function AdminNotifications() {
  usePageTitle('Notifications');
  const { user } = useSelector((s) => s.auth);

  const [loading, setLoading] = useState(true);
  const [shops,   setShops]   = useState([]);
  const [shopId,  setShopId]  = useState('');
  const [tab,     setTab]     = useState('settings'); // settings | templates | logs
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [logs,    setLogs]    = useState([]);
  const [saving,  setSaving]  = useState(false);

  // Load shops
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/shops');
        const s = res.data || [];
        setShops(s);
        if (s.length) setShopId(String(s[0].id));
      } catch {}
    })();
  }, []);

  // Load data when shop changes
  useEffect(() => {
    if (!shopId) return;
    loadData();
  }, [shopId, tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'settings') {
        const res = await api.get('/notifications/settings', { params: { shop_id: shopId } });
        setSettings(res.data || getDefaultSettings());
      } else if (tab === 'templates') {
        const res = await api.get('/notifications/templates', { params: { shop_id: shopId } });
        setTemplates(res.data || []);
      } else if (tab === 'logs') {
        const res = await api.get('/notifications/logs', { params: { shop_id: shopId, limit: 50 } });
        setLogs(res.data || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const getDefaultSettings = () => ({
    email_enabled: false, smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '',
    smtp_from_email: '', smtp_from_name: '', smtp_secure: 'tls',
    whatsapp_enabled: false, whatsapp_api_url: '', whatsapp_api_key: '', whatsapp_from_number: '',
    sms_enabled: false, sms_api_url: '', sms_api_key: '', sms_sender_id: '', sms_provider: 'generic',
    notify_on_sale: true, notify_on_purchase: false, notify_on_payment_due: true, notify_on_credit_reminder: true,
  });

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/notifications/settings', { ...settings, shop_id: parseInt(shopId) });
      toast.success('Notification settings saved');
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleTestEmail = async () => {
    try {
      await api.post('/notifications/test-email', { shop_id: parseInt(shopId) });
      toast.success('Test email sent! Check your inbox.');
    } catch (err) {
      toast.error(err.structured?.message || 'Test failed');
    }
  };

  const updateSetting = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineBell className="w-6 h-6 text-primary-600" />
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">Configure email & WhatsApp notifications for your customers</p>
        </div>
        {/* Shop selector */}
        <select value={shopId} onChange={(e) => setShopId(e.target.value)}
          className="input-field text-sm py-2 w-auto min-w-[160px]">
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200/60">
        {[
          { key: 'settings', label: 'Configuration', icon: HiOutlineCog6Tooth },
          { key: 'templates', label: 'Templates', icon: HiOutlineEnvelope },
          { key: 'logs', label: 'Send History', icon: HiOutlinePaperAirplane },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === t.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* ── Settings Tab ── */}
          {tab === 'settings' && settings && (
            <div className="space-y-6">
              {/* Email Configuration */}
              <div className="rounded-2xl p-5 space-y-4" style={NEO.raised}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <HiOutlineEnvelope className="w-4 h-4 text-blue-500" />
                    Email (SMTP)
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!settings.email_enabled}
                      onChange={(e) => updateSetting('email_enabled', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-xs font-medium text-gray-600">Enabled</span>
                  </label>
                </div>
                {settings.email_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="SMTP Host" value={settings.smtp_host} onChange={v => updateSetting('smtp_host', v)} placeholder="smtp.gmail.com" />
                    <Field label="Port" value={settings.smtp_port} onChange={v => updateSetting('smtp_port', v)} placeholder="587" type="number" />
                    <Field label="Username" value={settings.smtp_user} onChange={v => updateSetting('smtp_user', v)} placeholder="your@email.com" />
                    <Field label="Password" value={settings.smtp_password} onChange={v => updateSetting('smtp_password', v)} placeholder="App password" type="password" />
                    <Field label="From Email" value={settings.smtp_from_email} onChange={v => updateSetting('smtp_from_email', v)} placeholder="noreply@yourshop.com" />
                    <Field label="From Name" value={settings.smtp_from_name} onChange={v => updateSetting('smtp_from_name', v)} placeholder="Your Shop Name" />
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Security</label>
                      <select value={settings.smtp_secure} onChange={(e) => updateSetting('smtp_secure', e.target.value)} className="input-field text-sm">
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button onClick={handleTestEmail} className="btn-secondary text-xs px-4 py-2">
                        Send Test Email
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp Configuration */}
              <div className="rounded-2xl p-5 space-y-4" style={NEO.raised}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <HiOutlineChatBubbleLeftRight className="w-4 h-4 text-green-500" />
                    WhatsApp API
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!settings.whatsapp_enabled}
                      onChange={(e) => updateSetting('whatsapp_enabled', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-xs font-medium text-gray-600">Enabled</span>
                  </label>
                </div>
                {settings.whatsapp_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <Field label="API URL" value={settings.whatsapp_api_url} onChange={v => updateSetting('whatsapp_api_url', v)} placeholder="https://api.provider.com/send" />
                    </div>
                    <Field label="API Key" value={settings.whatsapp_api_key} onChange={v => updateSetting('whatsapp_api_key', v)} placeholder="Your API key" type="password" />
                    <Field label="From Number" value={settings.whatsapp_from_number} onChange={v => updateSetting('whatsapp_from_number', v)} placeholder="+91XXXXXXXXXX" />
                  </div>
                )}
              </div>

              {/* SMS Configuration */}
              <div className="rounded-2xl p-5 space-y-4" style={NEO.raised}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <HiOutlineChatBubbleLeftRight className="w-4 h-4 text-orange-500" />
                    SMS (Text Message)
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!settings.sms_enabled}
                      onChange={(e) => updateSetting('sms_enabled', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-xs font-medium text-gray-600">Enabled</span>
                  </label>
                </div>
                {settings.sms_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Provider</label>
                      <select value={settings.sms_provider || 'generic'} onChange={(e) => updateSetting('sms_provider', e.target.value)} className="input-field text-sm">
                        <option value="generic">Generic API</option>
                        <option value="twilio">Twilio</option>
                        <option value="msg91">MSG91</option>
                        <option value="textlocal">Textlocal</option>
                      </select>
                    </div>
                    <Field label="Sender ID" value={settings.sms_sender_id} onChange={v => updateSetting('sms_sender_id', v)} placeholder="MYSHOP" />
                    <div className="sm:col-span-2">
                      <Field label="API URL" value={settings.sms_api_url} onChange={v => updateSetting('sms_api_url', v)} placeholder="https://api.provider.com/sms/send" />
                    </div>
                    <Field label="API Key" value={settings.sms_api_key} onChange={v => updateSetting('sms_api_key', v)} placeholder="Your SMS API key" type="password" />
                  </div>
                )}
              </div>

              {/* Auto-notification Triggers */}
              <div className="rounded-2xl p-5 space-y-3" style={NEO.raised}>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <HiOutlineBell className="w-4 h-4 text-amber-500" />
                  Auto-send Notifications When
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Toggle label="Sale / Invoice created" checked={settings.notify_on_sale} onChange={v => updateSetting('notify_on_sale', v)} />
                  <Toggle label="Purchase recorded" checked={settings.notify_on_purchase} onChange={v => updateSetting('notify_on_purchase', v)} />
                  <Toggle label="Payment due reminder" checked={settings.notify_on_payment_due} onChange={v => updateSetting('notify_on_payment_due', v)} />
                  <Toggle label="Credit balance reminder" checked={settings.notify_on_credit_reminder} onChange={v => updateSetting('notify_on_credit_reminder', v)} />
                </div>
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <button onClick={handleSaveSettings} disabled={saving} className="btn-primary text-sm px-6">
                  {saving ? 'Saving…' : 'Save Configuration'}
                </button>
              </div>
            </div>
          )}

          {/* ── Templates Tab ── */}
          {tab === 'templates' && (
            <div className="space-y-4">
              {templates.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No templates found. Default system templates will be used.</p>
              ) : (
                templates.map(t => (
                  <div key={t.id} className="rounded-2xl p-4" style={NEO.raised}>
                    <div className="flex items-center gap-2 mb-2">
                      {t.channel === 'email' ? <HiOutlineEnvelope className="w-4 h-4 text-blue-500" /> : <HiOutlineChatBubbleLeftRight className="w-4 h-4 text-green-500" />}
                      <span className="text-xs font-bold text-gray-700 uppercase">{t.type.replace(/_/g, ' ')}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${t.channel === 'email' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        {t.channel}
                      </span>
                    </div>
                    {t.subject && <p className="text-xs text-gray-600 mb-1"><b>Subject:</b> {t.subject}</p>}
                    <pre className="text-xs text-gray-500 bg-white/50 rounded-lg p-3 whitespace-pre-wrap max-h-32 overflow-y-auto font-sans">{t.body}</pre>
                    <p className="text-[9px] text-gray-400 mt-2">
                      Variables: {'{{shop_name}}, {{customer_name}}, {{receipt_number}}, {{total_amount}}, {{due_amount}}, {{items_list}}, {{date}}'}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Logs Tab ── */}
          {tab === 'logs' && (
            <div className="rounded-2xl overflow-hidden" style={NEO.raised}>
              {logs.length === 0 ? (
                <p className="text-sm text-gray-400 py-12 text-center">No notifications sent yet</p>
              ) : (
                <div className="divide-y divide-gray-100/50">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                      <div className="mt-0.5">
                        {log.status === 'sent'
                          ? <HiOutlineCheckCircle className="w-4 h-4 text-green-500" />
                          : <HiOutlineXCircle className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${log.channel === 'email' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {log.channel}
                          </span>
                          <span className="text-xs font-medium text-gray-700">{log.type.replace(/_/g, ' ')}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {log.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">→ {log.recipient}</p>
                        {log.error && <p className="text-[10px] text-red-400 mt-0.5 truncate">{log.error}</p>}
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-500 mb-1">{label}</label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className="input-field text-sm" />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/30 transition-colors">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
