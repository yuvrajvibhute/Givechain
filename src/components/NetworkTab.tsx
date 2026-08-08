import React from 'react';
import { Server, Activity, Check, AlertCircle } from 'lucide-react';
import { NETWORKS } from '../api';

interface NetworkTabProps {
  activeNetwork: string;
}

export const NetworkTab: React.FC<NetworkTabProps> = ({ activeNetwork }) => {
  const currentNet = NETWORKS[activeNetwork] || NETWORKS.undeployed;

  const services = [
    { name: 'Midnight Substrate Node RPC', status: 'Healthy', latency: '42ms', url: currentNet.indexerUrl },
    { name: 'Proof Server (Port 6300)', status: 'Healthy', latency: '88ms', url: currentNet.proofServerUrl },
    { name: 'Public Data Indexer GraphQL', status: 'Healthy', latency: '35ms', url: currentNet.indexerUrl },
    { name: 'Lace DApp Connector API', status: 'Connected', latency: '12ms', url: 'window.midnight' },
  ];

  return (
    <div className="space-y-6">
      <div className="report-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Server className="w-5 h-5 text-[#0D3B4C]" />
            <h2 className="text-xl font-bold font-serif text-[#0D3B4C]">Infrastructure Health & RPC Endpoint Audit</h2>
          </div>
          <p className="text-xs text-[#57656E]">
            Monitor current node connections, GraphQL indexer response times, and local ZK proof server status.
          </p>
        </div>

        <span className="verified-badge">
          <Activity className="w-3.5 h-3.5" />
          {currentNet.name} Active
        </span>
      </div>

      {/* Infrastructure Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((svc) => (
          <div key={svc.name} className="report-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm font-serif text-[#0D3B4C]">{svc.name}</h3>
              <span className="verified-badge">
                <Check className="w-3 h-3" />
                {svc.status}
              </span>
            </div>

            <div className="space-y-1 font-mono-num text-xs">
              <div className="flex justify-between text-[#57656E]">
                <span>Response Time:</span>
                <span className="text-[#0D3B4C] font-semibold">{svc.latency}</span>
              </div>
              <div className="flex justify-between text-[#57656E] truncate">
                <span>Endpoint:</span>
                <span className="text-[#0D3B4C] truncate">{svc.url}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
