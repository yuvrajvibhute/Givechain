import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { NETWORKS } from '../api';
import { checkServiceHealth } from '../api';

interface ServiceStatus {
  name: string;
  url: string;
  healthy: boolean | null;
  label: string;
}

interface NetworkTabProps {
  activeNetwork: string;
}

export const NetworkTab: React.FC<NetworkTabProps> = ({ activeNetwork }) => {
  const config = NETWORKS[activeNetwork] || NETWORKS.preprod;
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const buildServices = (): ServiceStatus[] => [
    {
      name: 'Midnight Indexer (GraphQL)',
      url: config.indexerUrl,
      healthy: null,
      label: 'Indexer',
    },
    {
      name: 'Midnight Node (RPC)',
      url: config.nodeUrl,
      healthy: null,
      label: 'Node',
    },
    {
      name: 'ZK Proof Server',
      url: config.proofServerUrl,
      healthy: null,
      label: 'Proof Server',
    },
  ];

  const runHealthChecks = async () => {
    setIsChecking(true);
    const initial = buildServices();
    setServices(initial);

    const results = await Promise.all(
      initial.map(async (svc) => ({
        ...svc,
        healthy: await checkServiceHealth(svc.url),
      }))
    );

    setServices(results);
    setLastChecked(new Date().toLocaleTimeString());
    setIsChecking(false);
  };

  useEffect(() => {
    runHealthChecks();
  }, [activeNetwork]);

  const networkInfo = {
    undeployed: { label: 'Local Devnet', badge: 'LOCAL', color: '#57656E' },
    preview: { label: 'Preview Testnet', badge: 'PREVIEW', color: '#C85A32' },
    preprod: { label: 'Preprod Testnet', badge: 'PREPROD', color: '#1F6E54' },
  };
  const netDisplay = networkInfo[activeNetwork as keyof typeof networkInfo] || networkInfo.preprod;

  return (
    <div className="space-y-5">
      {/* Network Identity Card */}
      <div className="report-card p-5 border-[#E0D9CD]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#0D3B4C] text-[#F7F5F0]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-[#0D3B4C]">
                Infrastructure Health
              </h2>
              <p className="text-xs text-[#57656E]">
                Midnight Network — {netDisplay.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
              style={{ color: netDisplay.color, borderColor: netDisplay.color + '40', background: netDisplay.color + '10' }}
            >
              {netDisplay.badge}
            </span>
            <button
              onClick={runHealthChecks}
              disabled={isChecking}
              className="secondary-button !p-2"
              title="Refresh health checks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Service Health Grid */}
        <div className="space-y-2.5">
          {services.map((svc) => (
            <div
              key={svc.name}
              className="flex items-center justify-between p-3 rounded-lg bg-[#F7F5F0] border border-[#E0D9CD]"
            >
              <div className="flex items-center gap-3">
                {svc.healthy === null ? (
                  <RefreshCw className="w-4 h-4 text-[#57656E] animate-spin" />
                ) : svc.healthy ? (
                  <CheckCircle2 className="w-4 h-4 text-[#1F6E54]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#C85A32]" />
                )}
                <div>
                  <span className="text-xs font-semibold text-[#0D3B4C]">{svc.name}</span>
                  <div className="text-[10px] text-[#57656E] font-mono-num truncate max-w-[240px]">
                    {svc.url}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    svc.healthy === null
                      ? 'text-[#57656E] border-[#E0D9CD] bg-[#EFECE4]'
                      : svc.healthy
                      ? 'text-[#1F6E54] border-[#1F6E54]/30 bg-[#EAF4F0]'
                      : 'text-[#C85A32] border-[#C85A32]/30 bg-[#FDF4EF]'
                  }`}
                >
                  {svc.healthy === null ? 'CHECKING...' : svc.healthy ? 'HEALTHY' : 'OFFLINE'}
                </span>
                <a
                  href={svc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#57656E] hover:text-[#0D3B4C] transition"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {lastChecked && (
          <p className="text-[10px] text-[#57656E] mt-3 text-right">
            Last checked: {lastChecked}
          </p>
        )}
      </div>

      {/* Deployed Contract Info */}
      <div className="report-card p-5 border-[#E0D9CD]">
        <h3 className="text-sm font-bold font-serif text-[#0D3B4C] mb-3">
          Deployed Contract References
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-start justify-between gap-4 p-2.5 rounded-lg bg-[#EAF4F0] border border-[#1F6E54]/20">
            <span className="font-semibold text-[#1F6E54] shrink-0">Preprod</span>
            <span className="font-mono-num text-[#0D3B4C] break-all text-right text-[10px]">
              020050ae5b37df2195f19069509df6ebcd9e3f60046b0a6ec9ea8c85ae0ff33e9d
            </span>
          </div>
          <div className="flex items-start justify-between gap-4 p-2.5 rounded-lg bg-[#F7F5F0] border border-[#E0D9CD]">
            <span className="font-semibold text-[#57656E] shrink-0">Preview</span>
            <span className="font-mono-num text-[#57656E] break-all text-right text-[10px]">
              ee11e106e89fd0897ec108693963e0be0cdae8f41ae10e16afd63173fdbb7a9a
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
