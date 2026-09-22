/**
 * DonationHistoryExport — CSV export utility for the public on-chain ledger.
 *
 * Allows donors, auditors, and charity operators to download a full CSV
 * transcript of all confirmed Compact circuit executions from the GiveChain
 * public donation ledger.
 *
 * Privacy guarantee: exported data mirrors on-chain public state only.
 * Donor secrets and witness commitments are never included in the export.
 */

import React, { useState } from 'react';
import { Download, FileText, CheckCircle2 } from 'lucide-react';
import { TransactionRecord } from '../api';

interface DonationHistoryExportProps {
  transactions: TransactionRecord[];
  filenamePrefix?: string;
}

function csvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function buildCsvContent(records: TransactionRecord[]): string {
  const header = [
    'Tx Hash', 'Circuit Method', 'Campaign / Cause', 'Amount (USD)',
    'Block Height', 'Timestamp (UTC)', 'ZK Proof Time (ms)', 'Privacy Guarantee', 'Status',
  ].join(',');

  const rows = records.map((tx) =>
    [
      csvCell(tx.txHash),
      csvCell(tx.circuitName),
      csvCell(tx.campaignTitle || 'Global Contract Store'),
      csvCell(tx.amount > 0 ? tx.amount : 0),
      csvCell(tx.blockHeight),
      csvCell(new Date(tx.timestamp).toUTCString()),
      csvCell(tx.proofTimeMs),
      csvCell(tx.privacyGuarantee),
      csvCell(tx.status),
    ].join(','),
  );

  return [header, ...rows].join('\r\n');
}

function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export const DonationHistoryExport: React.FC<DonationHistoryExportProps> = ({
  transactions,
  filenamePrefix = 'givechain_ledger',
}) => {
  const [didExport, setDidExport] = useState(false);

  const handleExportCsv = () => {
    if (transactions.length === 0) return;
    const csvContent = buildCsvContent(transactions);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(csvContent, `${filenamePrefix}_${timestamp}.csv`, 'text/csv;charset=utf-8;');
    setDidExport(true);
    setTimeout(() => setDidExport(false), 3000);
  };

  const handleExportJson = () => {
    if (transactions.length === 0) return;
    const jsonContent = JSON.stringify({
      exportedAt: new Date().toISOString(),
      network: 'Midnight Preprod Testnet',
      contractAddress: '020050ae5b37df2195f19069509df6ebcd9e3f60046b0a6ec9ea8c85ae0ff33e9d',
      totalRecords: transactions.length,
      privacyNote: 'This export contains only public on-chain state. Donor witness secrets are never included.',
      transactions,
    }, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(jsonContent, `${filenamePrefix}_${timestamp}.json`, 'application/json;charset=utf-8;');
    setDidExport(true);
    setTimeout(() => setDidExport(false), 3000);
  };

  const isEmpty = transactions.length === 0;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportCsv}
        disabled={isEmpty}
        title={isEmpty ? 'No transactions to export' : `Export ${transactions.length} records as CSV`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
          isEmpty
            ? 'opacity-40 cursor-not-allowed border-[#E0D9CD] text-[#57656E] bg-[#F7F5F0]'
            : didExport
            ? 'border-[#1F6E54]/50 bg-[#EAF4F0] text-[#1F6E54]'
            : 'border-[#E0D9CD] bg-[#F7F5F0] text-[#0D3B4C] hover:border-[#0D3B4C] hover:bg-[#EFECE4]'
        }`}
      >
        {didExport ? (
          <><CheckCircle2 className="w-3.5 h-3.5" /><span>Exported!</span></>
        ) : (
          <><Download className="w-3.5 h-3.5" /><span>Export CSV</span></>
        )}
      </button>

      <button
        onClick={handleExportJson}
        disabled={isEmpty}
        title={isEmpty ? 'No transactions to export' : `Export ${transactions.length} records as JSON`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
          isEmpty
            ? 'opacity-40 cursor-not-allowed border-[#E0D9CD] text-[#57656E] bg-[#F7F5F0]'
            : 'border-[#E0D9CD] bg-[#F7F5F0] text-[#0D3B4C] hover:border-[#0D3B4C] hover:bg-[#EFECE4]'
        }`}
      >
        <FileText className="w-3.5 h-3.5" />
        <span>Export JSON</span>
      </button>

      {!isEmpty && (
        <span className="text-[11px] text-[#57656E] font-mono-num">
          {transactions.length} record{transactions.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};
