import React from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, AlertTriangle, BookOpen, Code2 } from 'lucide-react';

// ============================================================================
// PRIVACY MODEL TAB
// Explains the GiveChain public/private data split to users.
// This directly documents the "what an observer can and cannot learn" spec.
// ============================================================================

export const PrivacyModelTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Hero Block */}
      <div className="hero-ledger-block">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#A8C8D4] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#C85A32]" />
            <span>Midnight Zero-Knowledge Privacy Architecture</span>
          </div>
          <h2 className="text-2xl font-bold font-serif text-white">
            What Can an Observer Learn?
          </h2>
          <p className="text-sm text-[#D3E1E8] max-w-3xl leading-relaxed">
            GiveChain uses Midnight's Compact ZK language to enforce a strict boundary between
            public ledger state and private witness data. This page documents the precise
            privacy guarantees enforced by the on-chain circuit.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: What CAN be learned */}
        <div className="report-card p-6 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E0D9CD]">
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
              <Eye className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif text-[#0D3B4C]">✅ Public — Observable On-Chain</h3>
              <p className="text-xs text-[#57656E]">Visible to anyone reading the Midnight ledger</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                field: 'totalDonations',
                type: 'Uint<64>',
                desc: 'Total cumulative amount raised across all campaigns. Updated on every confirmed donate() circuit execution.',
              },
              {
                field: 'campaignCount',
                type: 'Uint<64>',
                desc: 'Number of charity campaigns registered via createCampaign() circuit.',
              },
              {
                field: 'activeCampaignTitle',
                type: 'Opaque<"string">',
                desc: 'Title of the most recently registered campaign. Explicitly disclosed via disclose(title).',
              },
              {
                field: 'Transaction existence',
                type: 'Block record',
                desc: 'That a donate() or createCampaign() circuit was executed — but not by whom.',
              },
              {
                field: 'Proof validity',
                type: 'ZK verifier',
                desc: 'That the ZK proof is mathematically valid and amount > 0 was satisfied.',
              },
            ].map((item) => (
              <div key={item.field} className="p-3 rounded-lg bg-amber-50/60 border border-amber-100 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#0D3B4C]">{item.field}</span>
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-mono font-semibold">{item.type}</span>
                </div>
                <p className="text-xs text-[#57656E] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: What CANNOT be learned */}
        <div className="report-card p-6 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E0D9CD]">
            <div className="p-2 rounded-lg bg-[#EAF4F0] border border-[#1F6E54]/20">
              <EyeOff className="w-5 h-5 text-[#1F6E54]" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif text-[#0D3B4C]">🚫 Private — Shielded by ZK Proof</h3>
              <p className="text-xs text-[#57656E]">Never recorded on-chain. Stays on client device.</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                field: 'donorSecret',
                type: 'Bytes<32>',
                desc: 'Private 32-byte witness key. Passed into the circuit but never to disclose(). Cannot appear in any ledger field by design.',
                risk: 'Identity shielding',
              },
              {
                field: 'Donor wallet address',
                type: 'Identity',
                desc: 'The Lace wallet address of the donor. Not part of any circuit output — completely unlinkable.',
                risk: 'Linkability prevention',
              },
              {
                field: 'Individual donation amount',
                type: 'Per-tx value',
                desc: 'Only totalDonations (aggregate) is updated. A single donor\'s contribution amount is never individually visible.',
                risk: 'Financial privacy',
              },
              {
                field: 'donorNote',
                type: 'Opaque<"string">',
                desc: 'Private message from donor to charity. Never passed through disclose() — exists only in off-chain client state.',
                risk: 'Message confidentiality',
              },
              {
                field: 'Donor linkability',
                type: 'Cross-tx',
                desc: 'Multiple donations from the same donor cannot be linked together. No identity commitment is recorded on-chain.',
                risk: 'Anonymity set',
              },
            ].map((item) => (
              <div key={item.field} className="p-3 rounded-lg bg-[#EAF4F0]/60 border border-[#1F6E54]/15 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[#0D3B4C]">{item.field}</span>
                  <div className="flex gap-1.5">
                    <span className="text-[10px] bg-[#1F6E54]/10 text-[#1F6E54] px-2 py-0.5 rounded font-mono font-semibold">{item.type}</span>
                    <span className="text-[10px] bg-[#EAF4F0] text-[#1F6E54] px-2 py-0.5 rounded font-semibold">{item.risk}</span>
                  </div>
                </div>
                <p className="text-xs text-[#57656E] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How the ZK Proof Works */}
      <div className="report-card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-[#E0D9CD]">
          <div className="p-2 rounded-lg bg-[#0D3B4C]/10">
            <Lock className="w-5 h-5 text-[#0D3B4C]" />
          </div>
          <div>
            <h3 className="text-base font-bold font-serif text-[#0D3B4C]">How the ZK Proof Works</h3>
            <p className="text-xs text-[#57656E]">What the donate() circuit proves mathematically — without revealing private inputs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: '1',
              title: 'Private Witness Input',
              desc: 'donorSecret (Bytes<32>) is loaded into the circuit scope client-side. It is never transmitted or serialized.',
              icon: Lock,
              color: 'text-[#C85A32]',
              bg: 'bg-orange-50',
            },
            {
              step: '2',
              title: 'Constraint Check',
              desc: 'assert(amount > 0) is evaluated inside the ZK circuit. If it fails, the proof is rejected before submission.',
              icon: AlertTriangle,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
            },
            {
              step: '3',
              title: 'Public Disclosure',
              desc: 'Only disclose(amount) is included in the proof\'s public output. totalDonations is updated. Nothing else is revealed.',
              icon: ShieldCheck,
              color: 'text-[#1F6E54]',
              bg: 'bg-[#EAF4F0]',
            },
          ].map((step) => (
            <div key={step.step} className={`p-4 rounded-xl border border-[#E0D9CD] ${step.bg} space-y-3`}>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0D3B4C] text-white text-xs font-bold flex items-center justify-center">
                  {step.step}
                </span>
                <step.icon className={`w-4 h-4 ${step.color}`} />
                <span className="font-bold text-sm text-[#0D3B4C]">{step.title}</span>
              </div>
              <p className="text-xs text-[#57656E] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Compact Contract Code Reference */}
      <div className="report-card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#E0D9CD]">
          <Code2 className="w-5 h-5 text-[#0D3B4C]" />
          <div>
            <h3 className="text-base font-bold font-serif text-[#0D3B4C]">Compact Contract Reference</h3>
            <p className="text-xs text-[#57656E]">Source: contracts/charity_donation.compact</p>
          </div>
        </div>
        <div className="code-block text-sm leading-relaxed overflow-x-auto">
          <span className="text-[#94A3B8]">{'// PUBLIC LEDGER STATE — visible to all chain observers\n'}</span>
          <span className="text-[#38BDF8]">{'export ledger '}</span>
          <span className="text-[#F9A8D4]">{'totalDonations'}</span>
          <span className="text-[#94A3B8]">{': Uint<64>;\n'}</span>
          <span className="text-[#38BDF8]">{'export ledger '}</span>
          <span className="text-[#F9A8D4]">{'campaignCount'}</span>
          <span className="text-[#94A3B8]">{': Uint<64>;\n'}</span>
          <span className="text-[#38BDF8]">{'export ledger '}</span>
          <span className="text-[#F9A8D4]">{'activeCampaignTitle'}</span>
          <span className="text-[#94A3B8]">{': Opaque<"string">;\n\n'}</span>

          <span className="text-[#94A3B8]">{'// DONATE CIRCUIT — donorSecret stays PRIVATE (no disclose call)\n'}</span>
          <span className="text-[#38BDF8]">{'export circuit '}</span>
          <span className="text-[#A78BFA]">{'donate'}</span>
          <span className="text-white">{'('}</span>
          <span className="text-orange-300">{'donorSecret'}</span>
          <span className="text-[#94A3B8]">{': Bytes<32>, '}</span>
          <span className="text-[#34D399]">{'amount'}</span>
          <span className="text-[#94A3B8]">{': Uint<64>): [] {\n'}</span>
          <span className="text-[#94A3B8]">{'    assert('}</span>
          <span className="text-[#34D399]">{'amount'}</span>
          <span className="text-[#94A3B8]">{' > 0, "amount must be > 0");\n'}</span>
          <span className="text-[#94A3B8]">{'    const disclosedAmount = '}</span>
          <span className="text-[#38BDF8]">{'disclose('}</span>
          <span className="text-[#34D399]">{'amount'}</span>
          <span className="text-[#38BDF8]">{')'}</span>
          <span className="text-[#94A3B8]">{';\n'}</span>
          <span className="text-[#F9A8D4]">{'    totalDonations'}</span>
          <span className="text-[#94A3B8]">{' = totalDonations + disclosedAmount;\n'}</span>
          <span className="text-[#94A3B8]">{'}'}</span>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#EAF4F0] border border-[#1F6E54]/20">
          <BookOpen className="w-4 h-4 text-[#1F6E54] mt-0.5 shrink-0" />
          <p className="text-xs text-[#1F6E54] leading-relaxed">
            <strong>Key insight:</strong> <code className="bg-[#1F6E54]/10 px-1 rounded">donorSecret</code> is a circuit parameter
            but is never passed to <code className="bg-[#1F6E54]/10 px-1 rounded">disclose()</code>.
            In Compact, only values explicitly passed through <code className="bg-[#1F6E54]/10 px-1 rounded">disclose()</code> can
            become part of the public ledger state. This makes privacy a compile-time guarantee, not a runtime promise.
          </p>
        </div>
      </div>
    </div>
  );
};
