'use client';

import { useState } from 'react';
import { Camera, Building, Globe, Mail, Phone, MapPin, Store } from 'lucide-react';

export function MerchantInfoCard() {
  const [storeName, setStoreName] = useState<string>('UrbanStore Bangladesh');
  const [domain, setDomain] = useState<string>('urbanstore.com.bd');
  const [email, setEmail] = useState<string>('merchant@hypecorp.com');
  const [phone, setPhone] = useState<string>('+880 1700-908200');
  const [industry, setIndustry] = useState<string>('Retail & E-commerce');
  const [location, setLocation] = useState<string>('Dhaka, Bangladesh');

  return (
    <div
      className="rounded-2xl p-6 border backdrop-blur-md relative overflow-hidden"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-6 pb-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        Store Identity & General Details
      </h3>

      {/* Avatar & Store Title Banner */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6">
        <div className="relative group">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-2xl border shrink-0 shadow-lg relative overflow-hidden"
            style={{
              background: 'var(--logo-gradient)',
              color: 'var(--logo-text)',
              borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
            }}
          >
            U
          </div>
          <button
            className="absolute bottom-0 right-0 p-1.5 rounded-lg text-white shadow-md transition-transform group-hover:scale-110"
            style={{ background: 'var(--primary)' }}
            title="Change Avatar"
          >
            <Camera size={12} />
          </button>
        </div>

        <div className="text-center sm:text-left space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h4 className="text-lg font-bold text-foreground">{storeName}</h4>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
              style={{
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                color: 'var(--primary)',
              }}
            >
              Verified Merchant
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{domain} • {location}</p>
        </div>
      </div>

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="text-muted-foreground font-semibold block mb-1 flex items-center gap-1.5">
            <Store size={13} style={{ color: 'var(--primary)' }} /> Store Name
          </label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full bg-[var(--surface-high)] border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
            style={{ borderColor: 'var(--glass-border)' }}
          />
        </div>

        <div>
          <label className="text-muted-foreground font-semibold block mb-1 flex items-center gap-1.5">
            <Globe size={13} style={{ color: 'var(--secondary)' }} /> Domain Name
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full bg-[var(--surface-high)] border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors font-mono"
            style={{ borderColor: 'var(--glass-border)' }}
          />
        </div>

        <div>
          <label className="text-muted-foreground font-semibold block mb-1 flex items-center gap-1.5">
            <Mail size={13} style={{ color: 'var(--chart-3)' }} /> Support Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[var(--surface-high)] border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
            style={{ borderColor: 'var(--glass-border)' }}
          />
        </div>

        <div>
          <label className="text-muted-foreground font-semibold block mb-1 flex items-center gap-1.5">
            <Phone size={13} style={{ color: 'var(--ora-success)' }} /> Phone Number
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-[var(--surface-high)] border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors font-mono"
            style={{ borderColor: 'var(--glass-border)' }}
          />
        </div>

        <div>
          <label className="text-muted-foreground font-semibold block mb-1 flex items-center gap-1.5">
            <Building size={13} style={{ color: 'var(--primary)' }} /> Industry
          </label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full bg-[var(--surface-high)] border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
            style={{ borderColor: 'var(--glass-border)' }}
          />
        </div>

        <div>
          <label className="text-muted-foreground font-semibold block mb-1 flex items-center gap-1.5">
            <MapPin size={13} style={{ color: 'var(--secondary)' }} /> Headquarters / Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-[var(--surface-high)] border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
            style={{ borderColor: 'var(--glass-border)' }}
          />
        </div>
      </div>
    </div>
  );
}
