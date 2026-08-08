import React, { useState } from 'react';
import { Cpu, ShieldAlert, Code2, Check, Play, Server, Lock, Layers } from 'lucide-react';

export const ProofVisualizerTab: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);

  const compactSource = `pragma language_version >= 0.23;

import CompactStandardLibrary;

// Public ledger state
export ledger totalDonations: Uint<64>;
export ledger campaignCount: Uint<64>;
export ledger activeCampaignTitle: Opaque<"string">;

// Circuit: Create Campaign
export circuit createCampaign(title: Opaque<"string">): [] {
    activeCampaignTitle = disclose(title);
    campaignCount = campaignCount + 1;
}

// Circuit: Make Anonymous Donation (Private Witness: donorSecret)
export circuit donate(donorSecret: Bytes<32>, amount: Uint<64>): [] {
    assert(amount > 0, "Donation amount must be greater than zero");
    const disclosedAmount = disclose(amount);
    totalDonations = totalDonations + disclosedAmount;
}`;

  const runSimulation = () => {
    setIsSimulating(true);
    setActiveStep(1);

    setTimeout(() => {
      setActiveStep(2);
      setTimeout(() => {
        setActiveStep(3);
        setTimeout(() => {
          setActiveStep(4);
          setIsSimulating(false);
        }, 1200);
      }, 1200);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Title & Interactive Control Banner */}
      <div className="report-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-5 h-5 text-[#0D3B4C]" />
            <h2 className="text-xl font-bold font-serif text-[#0D3B4C]">ZK Circuit Proving Engine Visualizer</h2>
          </div>
          <p className="text-xs text-[#57656E]">
            Interactive pipeline representation of how Compact ZK circuits compile, generate private witnesses, and verify on Midnight.
          </p>
        </div>

        <button
          onClick={runSimulation}
          disabled={isSimulating}
          className="cta-button shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isSimulating ? 'Running Simulation...' : 'Simulate ZK Proof Pipeline'}</span>
        </button>
      </div>

      {/* Main Visual Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Step 1 */}
        <div className={`report-card p-5 space-y-3 relative overflow-hidden transition-all ${activeStep === 1 ? '!border-[#0D3B4C] !shadow-md bg-[#EFECE4]' : ''}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono-num font-bold text-[#0D3B4C]">STEP 01</span>
            {activeStep === 1 && <span className="w-2 h-2 rounded-full bg-[#0D3B4C] animate-ping" />}
          </div>
          <div className="p-2 rounded-lg bg-[#0D3B4C]/10 text-[#0D3B4C] w-fit">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm font-serif text-[#0D3B4C]">1. Witness Derivation</h3>
          <p className="text-xs text-[#57656E] leading-relaxed">
            Constructs private donor secret <code className="text-[#0D3B4C] font-mono-num font-semibold">donorSecret: Bytes&lt;32&gt;</code> off-chain inside execution environment.
          </p>
        </div>

        {/* Step 2 */}
        <div className={`report-card p-5 space-y-3 relative overflow-hidden transition-all ${activeStep === 2 ? '!border-[#0D3B4C] !shadow-md bg-[#EFECE4]' : ''}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono-num font-bold text-[#0D3B4C]">STEP 02</span>
            {activeStep === 2 && <span className="w-2 h-2 rounded-full bg-[#0D3B4C] animate-ping" />}
          </div>
          <div className="p-2 rounded-lg bg-[#0D3B4C]/10 text-[#0D3B4C] w-fit">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm font-serif text-[#0D3B4C]">2. Proof Server Calculation</h3>
          <p className="text-xs text-[#57656E] leading-relaxed">
            Passes compiled circuit keys to HTTP proof server (port 6300) to build zero-knowledge proof snippet.
          </p>
        </div>

        {/* Step 3 */}
        <div className={`report-card p-5 space-y-3 relative overflow-hidden transition-all ${activeStep === 3 ? '!border-[#C85A32] !shadow-md bg-[#EFECE4]' : ''}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono-num font-bold text-[#C85A32]">STEP 03</span>
            {activeStep === 3 && <span className="w-2 h-2 rounded-full bg-[#C85A32] animate-ping" />}
          </div>
          <div className="p-2 rounded-lg bg-[#C85A32]/10 text-[#C85A32] w-fit">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm font-serif text-[#0D3B4C]">3. Public Disclosure</h3>
          <p className="text-xs text-[#57656E] leading-relaxed">
            Discloses contribution amount (<code className="text-[#C85A32] font-mono-num font-semibold">disclose(amount)</code>) without revealing identity or witness keys.
          </p>
        </div>

        {/* Step 4 */}
        <div className={`report-card p-5 space-y-3 relative overflow-hidden transition-all ${activeStep === 4 ? '!border-[#1F6E54] !shadow-md bg-[#EAF4F0]' : ''}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono-num font-bold text-[#1F6E54]">STEP 04</span>
            {activeStep === 4 && <span className="w-2 h-2 rounded-full bg-[#1F6E54] animate-ping" />}
          </div>
          <div className="p-2 rounded-lg bg-[#1F6E54]/10 text-[#1F6E54] w-fit">
            <Check className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm font-serif text-[#0D3B4C]">4. On-Chain Verification</h3>
          <p className="text-xs text-[#57656E] leading-relaxed">
            Midnight substrate node verifies ZK proof validity and commits sum updates to totalDonations state.
          </p>
        </div>
      </div>

      {/* Source Code & Managed Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 report-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-[#0D3B4C]" />
              <h3 className="text-lg font-bold font-serif text-[#0D3B4C]">Compact Contract Source Code</h3>
            </div>
            <span className="text-xs text-[#57656E] font-mono-num">contracts/charity_donation.compact</span>
          </div>

          <pre className="code-block text-xs leading-relaxed overflow-x-auto">
            <code>{compactSource}</code>
          </pre>
        </div>

        <div className="lg:col-span-5 report-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-[#0D3B4C]" />
              <h3 className="text-lg font-bold font-serif text-[#0D3B4C]">Compiled Managed Assets</h3>
            </div>

            <div className="space-y-3 text-xs font-mono-num">
              <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#E0D9CD] flex items-center justify-between">
                <span className="text-[#57656E]">Contract JS</span>
                <span className="text-[#0D3B4C] font-semibold">contracts/managed/hello-world/index.js</span>
              </div>
              <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#E0D9CD] flex items-center justify-between">
                <span className="text-[#57656E]">ZK Circuit Target</span>
                <span className="text-[#0D3B4C] font-semibold">donate.zkir</span>
              </div>
              <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#E0D9CD] flex items-center justify-between">
                <span className="text-[#57656E]">Compiler Version</span>
                <span className="text-[#C85A32] font-semibold">{'>'}= 0.23.0</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#2A7B62]/10 border border-[#2A7B62]/20 text-xs text-[#1F6E54] space-y-1">
            <span className="font-bold block">Privacy Architecture Guarantee</span>
            <p className="text-[#1F6E54]/90">
              Midnight separates public state (total raised) from private state (donor identity secrets).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
