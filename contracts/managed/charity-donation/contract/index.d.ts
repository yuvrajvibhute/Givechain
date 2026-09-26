import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>, organizer_0: string): __compactRuntime.CircuitResults<PS, []>;
  createCampaign(context: __compactRuntime.CircuitContext<PS>,
                 title_0: string,
                 callerAddress_0: string): __compactRuntime.CircuitResults<PS, []>;
  donate(context: __compactRuntime.CircuitContext<PS>,
         donorSecret_0: Uint8Array,
         amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>, organizer_0: string): __compactRuntime.CircuitResults<PS, []>;
  createCampaign(context: __compactRuntime.CircuitContext<PS>,
                 title_0: string,
                 callerAddress_0: string): __compactRuntime.CircuitResults<PS, []>;
  donate(context: __compactRuntime.CircuitContext<PS>,
         donorSecret_0: Uint8Array,
         amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>, organizer_0: string): __compactRuntime.CircuitResults<PS, []>;
  createCampaign(context: __compactRuntime.CircuitContext<PS>,
                 title_0: string,
                 callerAddress_0: string): __compactRuntime.CircuitResults<PS, []>;
  donate(context: __compactRuntime.CircuitContext<PS>,
         donorSecret_0: Uint8Array,
         amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly totalDonations: bigint;
  readonly campaignCount: bigint;
  readonly activeCampaignTitle: string;
  readonly authorizedOrganizer: string;
  readonly isInitialized: boolean;
  usedNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
