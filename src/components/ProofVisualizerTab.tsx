import React, { useEffect, useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, Cpu, CheckCircle2 } from 'lucide-react';

interface ProofStepProps {
  step: number;
  title: string;
  description: string;
  isPrivate: boolean;
  isActive: boolean;
  isDone: boolean;
}

const ProofStep: React.FC<ProofStepProps> = ({
  step,
  title,
  description,
  isPrivate,
  isActive,
  isDone,
}) => (
  <div
    className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-500 ${
      isDone
        ? 'border-[#1F6E54]/40 bg-[#EAF4F0]'
        : isActive
        ? 'border-[#0D3B4C]/40 bg-[#EFECE4] shadow-md'
        : 'border-[#E0D9CD] bg-white opacity-60'
    }`}
  >
    <div
      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
        isDone
          ? 'bg-[#1F6E54] text-white'
          : isActive
          ? 'bg-[#0D3B4C] text-white animate-pulse'
          : 'bg-[#E0D9CD] text-[#57656E]'
      }`}
    >
      {isDone ? <CheckCircle2 className="w-4 h-4" /> : step}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-bold text-[#0D3B4C]">{title}</span>
        {isPrivate ? (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#C85A32]/10 text-[#C85A32] border border-[#C85A32]/20 font-semibold">
            <EyeOff className="w-2.5 h-2.5" /> PRIVATE
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#1F6E54]/10 text-[#1F6E54] border border-[#1F6E54]/20 font-semibold">
            <Eye className="w-2.5 h-2.5" /> PUBLIC
          </span>
        )}
      </div>
      <p className="text-xs text-[#57656E] leading-relaxed">{description}</p>
    </div>
  </div>
);

export const ProofVisualizerTab: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState(false);

  const steps = [
    {
      title: 'Private Witness Input',
      description:
        'Donor secret (Bytes<32>) is generated client-side and loaded into circuit scope. Never transmitted or stored anywhere.',
      isPrivate: true,
    },
    {
      title: 'Off-Chain ZK Proof Generation',
      description:
        'Midnight Compact runtime evaluates the donate() circuit locally. SHA-256 witness commitment is computed. Proof size: ~2.8KB.',
      isPrivate: true,
    },
    {
      title: 'Public Disclosure via disclose()',
      description:
        'Only the donation amount (Uint<64>) is disclosed on-chain using Compact disclose(amount). Donor identity stays hidden.',
      isPrivate: false,
    },
    {
      title: 'Midnight Network Submission',
      description:
        'ZK proof + disclosed public values are submitted via @midnight-ntwrk/midnight-js-network-provider to the Preprod indexer.',
      isPrivate: false,
    },
  ];

  const runVisualization = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveStep(-1);
    for (let i = 0; i < steps.length; i++) {
      setActiveStep(i);
      await new Promise((r) => setTimeout(r, 1500));
    }
    setActiveStep(steps.length); // All done
    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-start on mount
    runVisualization();
  }, []);

  const isDone = (index: number) => activeStep > index;
  const isActive = (index: number) => activeStep === index;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="report-card p-5 border-[#E0D9CD]">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#0D3B4C] text-[#F7F5F0]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold font-serif text-[#0D3B4C]">
              ZK Proof Pipeline Visualizer
            </h2>
            <p className="text-xs text-[#57656E]">
              Compact donate() circuit — Midnight Network Preprod Testnet
            </p>
          </div>
        </div>

        {/* Privacy Legend */}
        <div className="flex items-center gap-4 text-[11px] font-semibold mb-5">
          <span className="flex items-center gap-1.5 text-[#C85A32]">
            <EyeOff className="w-3 h-3" /> Private (Off-Chain Only)
          </span>
          <span className="flex items-center gap-1.5 text-[#1F6E54]">
            <Eye className="w-3 h-3" /> Public (On-Chain / Indexer)
          </span>
        </div>

        {/* Proof Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <ProofStep
              key={i}
              step={i + 1}
              title={step.title}
              description={step.description}
              isPrivate={step.isPrivate}
              isActive={isActive(i)}
              isDone={isDone(i)}
            />
          ))}
        </div>

        {/* Replay Button */}
        <button
          onClick={runVisualization}
          disabled={isRunning}
          className="mt-5 cta-button py-2 text-xs w-full justify-center"
        >
          <ShieldCheck className="w-4 h-4" />
          {isRunning ? 'Running ZK Proof Simulation...' : 'Replay ZK Proof Walkthrough'}
        </button>
      </div>

      {/* ZK Guarantee Summary */}
      <div className="report-card p-5 border-[#E0D9CD]">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-[#1F6E54]" />
          <h3 className="text-sm font-bold text-[#0D3B4C]">Privacy Guarantees Summary</h3>
        </div>
        <ul className="space-y-2 text-xs text-[#57656E]">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6E54] mt-0.5 shrink-0" />
            <span>
              <strong className="text-[#0D3B4C]">Donor Identity Hidden:</strong> Wallet address
              and witness key are never posted to the Midnight public ledger or indexer.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6E54] mt-0.5 shrink-0" />
            <span>
              <strong className="text-[#0D3B4C]">Amount Transparency:</strong> Donation amounts
              are publicly visible for auditing via <code className="bg-[#EFECE4] px-1 rounded">disclose(amount)</code>.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6E54] mt-0.5 shrink-0" />
            <span>
              <strong className="text-[#0D3B4C]">Non-Zero Proof:</strong> Circuit asserts
              amount &gt; 0 before disclosure. Invalid donations are rejected on-chain.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
