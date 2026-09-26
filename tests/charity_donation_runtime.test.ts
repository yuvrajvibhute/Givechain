/**
 * GiveChain Compiled Compact Runtime Tests
 *
 * Tests the charity_donation contract using the actual compiled contract JS output:
 *   contracts/managed/charity-donation/contract/index.js
 *
 * Verifies:
 *   - initialState initializes ledger with zeroed values
 *   - initialize() circuit sets authorizedOrganizer and prevents re-initialization
 *   - createCampaign() circuit enforces organizer authorization
 *   - donate() circuit enforces amount > 0, enforces nullifier uniqueness (replay prevention)
 *   - donorSecret is never revealed in public ledger state
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'charity-donation');
const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

let CharityDonation: any;
let compactRuntime: any;

const contractExists = fs.existsSync(contractPath);

describe.runIf(contractExists)('Compiled Compact Runtime: charity_donation.compact', () => {
  let contractInstance: any;

  beforeAll(async () => {
    CharityDonation = await import(pathToFileURL(contractPath).href);
    compactRuntime = await import('@midnight-ntwrk/compact-runtime');
    contractInstance = new CharityDonation.Contract({});
  });

  function createFreshContext() {
    const dummyCoinPubKey = new Uint8Array(32);
    const { currentContractState, currentPrivateState } = contractInstance.initialState({
      initialPrivateState: {},
      initialZswapLocalState: { coinPublicKey: dummyCoinPubKey },
    });

    const circuitContext = compactRuntime.createCircuitContext(
      compactRuntime.dummyContractAddress(),
      dummyCoinPubKey,
      currentContractState.data,
      currentPrivateState,
    );

    return { circuitContext, currentContractState };
  }

  function secretToBytes32(s: string): Uint8Array {
    const enc = new TextEncoder().encode(s);
    const out = new Uint8Array(32);
    out.set(enc.slice(0, 32));
    return out;
  }

  // ── 1. Initial State ────────────────────────────────────────────────────────

  it('should initialize ledger fields correctly', () => {
    const { currentContractState } = createFreshContext();
    const ledger = CharityDonation.ledger(currentContractState.data);

    expect(ledger.totalDonations).toBe(0n);
    expect(ledger.campaignCount).toBe(0n);
    expect(ledger.activeCampaignTitle).toBe('');
    expect(ledger.authorizedOrganizer).toBe('');
    expect(ledger.isInitialized).toBe(false);
    expect(ledger.usedNullifiers.isEmpty()).toBe(true);
  });

  // ── 2. initialize() Circuit ────────────────────────────────────────────────

  it('should set authorizedOrganizer via initialize()', () => {
    const { circuitContext } = createFreshContext();
    const organizer = 'mn_addr_preprod1test_organizer_address';

    const result = contractInstance.circuits.initialize(circuitContext, organizer);
    const ledger = CharityDonation.ledger(result.context.currentQueryContext.state);

    expect(ledger.authorizedOrganizer).toBe(organizer);
    expect(ledger.isInitialized).toBe(true);
  });

  it('should reject a second initialize() call (guard check)', () => {
    const { circuitContext } = createFreshContext();
    const organizer = 'mn_addr_preprod1organizer';

    const first = contractInstance.circuits.initialize(circuitContext, organizer);
    expect(() => {
      contractInstance.circuits.initialize(first.context, 'another_organizer');
    }).toThrow('already initialized');
  });

  // ── 3. createCampaign() Circuit ────────────────────────────────────────────

  it('should increment campaignCount and set activeCampaignTitle for organizer', () => {
    const { circuitContext } = createFreshContext();
    const organizer = 'mn_addr_preprod1organizer';
    const initRes = contractInstance.circuits.initialize(circuitContext, organizer);

    const title = 'Clean Water Infrastructure';
    const result = contractInstance.circuits.createCampaign(initRes.context, title, organizer);
    const ledger = CharityDonation.ledger(result.context.currentQueryContext.state);

    expect(ledger.campaignCount).toBe(1n);
    expect(ledger.activeCampaignTitle).toBe(title);
  });

  it('should reject createCampaign from unauthorized caller', () => {
    const { circuitContext } = createFreshContext();
    const organizer = 'mn_addr_preprod1organizer';
    const initRes = contractInstance.circuits.initialize(circuitContext, organizer);

    expect(() => {
      contractInstance.circuits.createCampaign(
        initRes.context,
        'Unauthorized Campaign',
        'mn_addr_preprod1attacker',
      );
    }).toThrow('Unauthorized');
  });

  it('should track multiple campaigns correctly', () => {
    const { circuitContext } = createFreshContext();
    const organizer = 'mn_addr_preprod1organizer';
    let ctx = contractInstance.circuits.initialize(circuitContext, organizer).context;

    ctx = contractInstance.circuits.createCampaign(ctx, 'Campaign A', organizer).context;
    ctx = contractInstance.circuits.createCampaign(ctx, 'Campaign B', organizer).context;
    ctx = contractInstance.circuits.createCampaign(ctx, 'Campaign C', organizer).context;

    const ledger = CharityDonation.ledger(ctx.currentQueryContext.state);
    expect(ledger.campaignCount).toBe(3n);
    expect(ledger.activeCampaignTitle).toBe('Campaign C');
  });

  // ── 4. donate() Circuit ────────────────────────────────────────────────────

  it('should increment totalDonations by the donated amount', () => {
    const { circuitContext } = createFreshContext();
    const secret = secretToBytes32('my_private_donor_secret_32bytes_');

    const result = contractInstance.circuits.donate(circuitContext, secret, 500n);
    const ledger = CharityDonation.ledger(result.context.currentQueryContext.state);

    expect(ledger.totalDonations).toBe(500n);
  });

  it('should aggregate multiple donations correctly with unique secrets', () => {
    const { circuitContext } = createFreshContext();
    const donations = [100n, 250n, 1000n, 50n];
    let ctx = circuitContext;

    for (let i = 0; i < donations.length; i++) {
      const secret = secretToBytes32(`unique_secret_per_donor_${i}_padded`);
      ctx = contractInstance.circuits.donate(ctx, secret, donations[i]).context;
    }

    const ledger = CharityDonation.ledger(ctx.currentQueryContext.state);
    expect(ledger.totalDonations).toBe(1400n);
    expect(ledger.usedNullifiers.size()).toBe(4n);
  });

  it('should reject zero-amount donations (assert guard)', () => {
    const { circuitContext } = createFreshContext();
    const secret = secretToBytes32('test_donor_secret_32bytepadding!!');

    expect(() => {
      contractInstance.circuits.donate(circuitContext, secret, 0n);
    }).toThrow('Donation amount must be greater than zero');
  });

  it('should reject replay with the same donorSecret (nullifier check)', () => {
    const { circuitContext } = createFreshContext();
    const secret = secretToBytes32('donor_secret_to_replay_32bytes!!');

    const first = contractInstance.circuits.donate(circuitContext, secret, 100n);
    expect(() => {
      contractInstance.circuits.donate(first.context, secret, 100n);
    }).toThrow('nullifier reused');
  });

  it('should keep donorSecret shielded — not appear in ledger state', () => {
    const { circuitContext } = createFreshContext();
    const secret = secretToBytes32('very_secret_donor_witness_key!!!!!');

    const result = contractInstance.circuits.donate(circuitContext, secret, 42n);
    const stateValue = result.context.currentQueryContext.state;

    // Check that the raw secret bytes do not appear directly in serialized state
    const jsonState = JSON.stringify(stateValue);
    const secretHex = Buffer.from(secret).toString('hex');
    expect(jsonState).not.toContain(secretHex);
  });

  it('should handle a full campaign lifecycle: init -> createCampaign -> multiple donate()', () => {
    const { circuitContext } = createFreshContext();
    const organizer = 'mn_addr_preprod1lifecycle_organizer';

    let ctx = contractInstance.circuits.initialize(circuitContext, organizer).context;
    ctx = contractInstance.circuits.createCampaign(ctx, 'Medical Relief Fund', organizer).context;

    for (let i = 0; i < 3; i++) {
      const secret = secretToBytes32(`lifecycle_donor_${i}_secret_padding`);
      ctx = contractInstance.circuits.donate(ctx, secret, 1000n).context;
    }

    const ledger = CharityDonation.ledger(ctx.currentQueryContext.state);
    expect(ledger.campaignCount).toBe(1n);
    expect(ledger.totalDonations).toBe(3000n);
    expect(ledger.activeCampaignTitle).toBe('Medical Relief Fund');
    expect(ledger.authorizedOrganizer).toBe(organizer);
    expect(ledger.usedNullifiers.size()).toBe(3n);
  });
});

describe.skipIf(contractExists)('Compiled Runtime Tests (SKIPPED — contract not compiled)', () => {
  it('compile the contract first: npm run compile', () => {
    expect(true).toBe(true);
  });
});
