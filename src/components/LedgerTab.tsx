import React, { useState } from 'react';
import { Heart, Plus, ShieldCheck, Lock, ArrowUpRight, Check, FileText, AlertCircle } from 'lucide-react';
import { TransactionRecord, INITIAL_CAMPAIGNS, CharityCampaign } from '../api';

interface LedgerTabProps {
  contractAddress: string;
  transactions: TransactionRecord[];
  onDonate: (campaignTitle: string, amount: number, donorSecret: string) => Promise<void>;
  onCreateCampaign: (title: string, category: string, targetAmount: number) => Promise<void>;
  isSubmitting: boolean;
}

export const LedgerTab: React.FC<LedgerTabProps> = ({
  contractAddress,
  transactions,
  onDonate,
  onCreateCampaign,
  isSubmitting,
}) => {
  const [campaigns, setCampaigns] = useState<CharityCampaign[]>(INITIAL_CAMPAIGNS);
  const [selectedCampaign, setSelectedCampaign] = useState<CharityCampaign | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(50);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Campaign Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Humanitarian');
  const [newTarget, setNewTarget] = useState(10000);

  const totalRaised = campaigns.reduce((sum, c) => sum + (c.raisedAmount ?? 0), 0);
  const totalGoal = campaigns.reduce((sum, c) => sum + (c.targetGoal ?? c.targetAmount ?? 10000), 0);
  const overallPercentage = totalGoal > 0 ? Math.min(Math.round((totalRaised / totalGoal) * 100), 100) : 0;

  const handleOpenDonateModal = (campaign: CharityCampaign) => {
    setSelectedCampaign(campaign);
    setDonationAmount(50);
    setIsModalOpen(true);
  };

  const handleConfirmDonation = async () => {
    if (!selectedCampaign) return;

    // Secret runtime witness generated on-client
    const runtimeSecret = '0x' + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    await onDonate(selectedCampaign.title, donationAmount, runtimeSecret);

    // Update local campaign tally
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === selectedCampaign.id
          ? { ...c, raisedAmount: (c.raisedAmount ?? 0) + donationAmount, donorCount: (c.donorCount ?? 0) + 1 }
          : c
      )
    );

    setIsModalOpen(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await onCreateCampaign(newTitle, newCategory, newTarget);

    const newCause: CharityCampaign = {
      id: `cause-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      raisedAmount: 0,
      targetGoal: newTarget,
      targetAmount: newTarget,
      donorCount: 0,
      description: 'Community registered charity initiative on Midnight Network.',
      organizationName: 'Verified Non-Profit',
      organizerAddress: 'mn_addr_preview1h3ssm5ru2t6eqy4g3',
    };

    setCampaigns([newCause, ...campaigns]);
    setIsCreateModalOpen(false);
    setNewTitle('');
  };

  return (
    <div className="space-y-8">
      {/* Hero Section: Public Accountability & Funds Raised Overview */}
      <div className="hero-ledger-block">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#A8C8D4] tracking-wider uppercase">
              <FileText className="w-4 h-4 text-[#C85A32]" />
              <span>Public Governance & Financial Ledger</span>
            </div>
            <h2 className="text-3xl font-bold font-serif text-[#FFFFFF]">
              Transparent Giving. Shielded Identity.
            </h2>
            <p className="text-sm text-[#D3E1E8] max-w-[600px] leading-relaxed">
              Every contribution is cryptographic proof verified on Midnight's Substrate ledger, without exposing individual donor identities or wallet credentials.
            </p>
          </div>

          {/* Primary CTA */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="cta-button shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Cause</span>
          </button>
        </div>

        {/* Live Metrics Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#FFFFFF]/15">
          <div>
            <span className="text-xs text-[#A8C8D4] font-medium block">Total Public Funds Raised</span>
            <div className="text-2xl font-bold font-mono-num text-[#FFFFFF] mt-0.5">
              ${(totalRaised ?? 0).toLocaleString()} <span className="text-xs font-normal text-[#A8C8D4]">USD</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-[#A8C8D4] font-medium block">Verified Cause Milestone</span>
            <div className="text-2xl font-bold font-mono-num text-[#FFFFFF] mt-0.5">
              {overallPercentage}% <span className="text-xs font-normal text-[#A8C8D4]">of ${(totalGoal ?? 0).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-[#A8C8D4] font-medium block">Contract ID (Preview Testnet)</span>
            <div className="text-xs font-mono-num text-[#D3E1E8] mt-1 truncate">
              {contractAddress}
            </div>
          </div>
        </div>

        {/* Signature Element: Staked Contribution Progress Bar */}
        <div className="mt-6 space-y-1.5">
          <div className="flex justify-between text-xs text-[#D3E1E8] font-mono-num">
            <span>Overall Ledger Target</span>
            <span>{(totalRaised ?? 0).toLocaleString()} / {(totalGoal ?? 0).toLocaleString()} USD</span>
          </div>
          <div className="segmented-progress-track">
            <div className="segmented-progress-fill" style={{ width: `${overallPercentage}%` }} />
          </div>
        </div>
      </div>

      {/* Cause / Campaign Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold font-serif text-[#0D3B4C]">Verified Charity Initiatives</h3>
            <p className="text-xs text-[#57656E]">Select a verified cause to send an anonymous zero-knowledge donation.</p>
          </div>
          <span className="text-xs font-semibold text-[#0D3B4C] bg-[#EFECE4] px-3 py-1 rounded-full border border-[#E0D9CD]">
            {campaigns.length} Active Causes
          </span>
        </div>

        {campaigns.length === 0 ? (
          /* Empty State */
          <div className="report-card p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-[#57656E] mx-auto" />
            <h4 className="text-lg font-serif text-[#0D3B4C]">No Active Campaigns Found</h4>
            <p className="text-xs text-[#57656E]">Register the first cause to begin receiving privacy-shielded contributions.</p>
            <button onClick={() => setIsCreateModalOpen(true)} className="cta-button mt-2">
              <Plus className="w-4 h-4" />
              <span>Create Campaign</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {campaigns.map((cause) => {
              const goal = cause.targetGoal ?? cause.targetAmount ?? 10000;
              const raised = cause.raisedAmount ?? 0;
              const progress = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;

              return (
                <div key={cause.id} className="report-card p-6 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#0D3B4C]/10 text-[#0D3B4C]">
                        {cause.category}
                      </span>
                      <span className="verified-badge">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    </div>

                    <h4 className="text-lg font-bold font-serif text-[#0D3B4C] leading-snug">{cause.title}</h4>
                    <p className="text-xs text-[#57656E] line-clamp-2 leading-relaxed">{cause.description}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Progress Bar & Amount */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-bold font-mono-num text-[#0D3B4C] text-sm">${raised.toLocaleString()}</span>
                        <span className="text-[#57656E] font-mono-num">Goal: ${goal.toLocaleString()}</span>
                      </div>
                      <div className="segmented-progress-track">
                        <div className="segmented-progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E0D9CD]/60 text-xs text-[#57656E]">
                      <span>{cause.donorCount ?? 0} Anonymous Donors</span>
                      <button
                        onClick={() => handleOpenDonateModal(cause)}
                        className="cta-button !py-1.5 !px-3.5 !text-xs"
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                        <span>Donate (ZK)</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transparent Ledger Log Section */}
      <div className="report-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E0D9CD]">
          <div>
            <h3 className="text-lg font-bold font-serif text-[#0D3B4C]">Public On-Chain Donation Ledger</h3>
            <p className="text-xs text-[#57656E]">Verifiable execution audit log of confirmed Compact circuit state transitions.</p>
          </div>
          <span className="text-xs text-[#57656E] font-mono-num">
            {transactions.length} Total Circuit Executions
          </span>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="ledger-table">
            <thead>
              <tr>
                <th className="text-left">Transaction Hash</th>
                <th className="text-left">Circuit Method</th>
                <th className="text-left">Target Cause / Detail</th>
                <th className="text-right">Amount (USD)</th>
                <th className="text-left">Privacy Guarantee</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="font-mono-num font-semibold text-[#0D3B4C]">
                    <div className="flex items-center gap-1.5">
                      <span>{tx.txHash}</span>
                      <ArrowUpRight className="w-3 h-3 text-[#57656E]" />
                    </div>
                  </td>
                  <td>
                    <span className="px-2 py-0.5 rounded bg-[#0D3B4C]/10 text-[#0D3B4C] font-mono-num text-xs font-semibold">
                      {tx.circuitName}
                    </span>
                  </td>
                  <td className="text-[#0D3B4C] font-medium">{tx.campaignTitle || 'Global Contract Store'}</td>
                  <td className="text-right font-mono-num font-bold text-[#0D3B4C]">
                    {(tx.amount ?? 0) > 0 ? `$${(tx.amount ?? 0).toLocaleString()}` : '—'}
                  </td>
                  <td className="text-xs text-[#57656E]">
                    <span className="flex items-center gap-1 text-[#1F6E54] font-medium">
                      <Lock className="w-3 h-3" />
                      Proved without revealing input
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="verified-badge">
                      <Check className="w-3 h-3" />
                      Confirmed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anonymous ZK Donation Modal */}
      {isModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D3B4C]/40 backdrop-blur-sm">
          <div className="report-card max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E0D9CD]">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#C85A32]" />
                <h3 className="text-lg font-bold font-serif text-[#0D3B4C]">Make Shielded Donation</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#57656E] hover:text-[#0D3B4C] text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#57656E]">Selected Initiative</span>
                <div className="text-base font-bold text-[#0D3B4C]">{selectedCampaign.title}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0D3B4C] mb-1.5">Donation Amount (USD)</label>
                <div className="flex gap-2">
                  {[25, 50, 100, 250].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDonationAmount(amt)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                        donationAmount === amt
                          ? 'bg-[#0D3B4C] text-[#FFFFFF] border-[#0D3B4C]'
                          : 'bg-[#F7F5F0] text-[#0D3B4C] border-[#E0D9CD] hover:border-[#0D3B4C]'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Shield Banner */}
              <div className="p-3.5 rounded-lg bg-[#2A7B62]/10 border border-[#2A7B62]/30 text-xs text-[#1F6E54] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Proved without revealing your input</span>
                </div>
                <p className="text-[#1F6E54]/90 text-[11px] leading-normal">
                  Your identity and secret witness keys remain off-chain inside the local ZK prover. Only the contribution amount is publicly disclosed to update total cause progress.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="secondary-button flex-1 justify-center">
                Cancel
              </button>
              <button
                onClick={handleConfirmDonation}
                disabled={isSubmitting}
                className="cta-button flex-1 justify-center"
              >
                {isSubmitting ? 'Generating ZK Proof...' : `Confirm $${donationAmount} Donation`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register New Cause Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D3B4C]/40 backdrop-blur-sm">
          <form onSubmit={handleCreateSubmit} className="report-card max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E0D9CD]">
              <h3 className="text-lg font-bold font-serif text-[#0D3B4C]">Register New Cause</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#57656E] hover:text-[#0D3B4C] text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0D3B4C] mb-1">Campaign Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Medical Aid for Disaster Relief"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E0D9CD] bg-[#F7F5F0] text-[#0D3B4C] focus:outline-none focus:border-[#0D3B4C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0D3B4C] mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E0D9CD] bg-[#F7F5F0] text-[#0D3B4C] focus:outline-none focus:border-[#0D3B4C]"
                >
                  <option value="Humanitarian">Humanitarian</option>
                  <option value="Education">Education</option>
                  <option value="Environment">Environment</option>
                  <option value="Healthcare">Healthcare</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0D3B4C] mb-1">Target Funding Goal (USD)</label>
                <input
                  type="number"
                  value={newTarget}
                  onChange={(e) => setNewTarget(Number(e.target.value))}
                  min={100}
                  step={500}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E0D9CD] bg-[#F7F5F0] text-[#0D3B4C] focus:outline-none focus:border-[#0D3B4C]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="secondary-button flex-1 justify-center"
              >
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="cta-button flex-1 justify-center">
                {isSubmitting ? 'Registering...' : 'Register Cause'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
