import { createContext, useContext } from 'react';
import type { GenerationView, Scenario } from '../generation/useGenerations';

/**
 * Actions and runtime state that custom nodes need. Provided by the editor so
 * node components (rendered by React Flow) never prop-drill; runtime generation
 * state is looked up per node id and is kept out of the persisted graph data.
 */
export type CanvasRuntime = {
  readonly updateNodeText: (id: string, text: string) => void;
  readonly deleteNode: (id: string) => void;
  readonly generate: (generatorNodeId: string, scenario: Scenario) => void;
  readonly retry: (generatorNodeId: string, scenario: Scenario) => void;
  readonly generatorView: (generatorNodeId: string) => GenerationView | undefined;
  readonly resultView: (resultNodeId: string) => GenerationView | undefined;
};

const RuntimeContext = createContext<CanvasRuntime | null>(null);

export const RuntimeProvider = RuntimeContext.Provider;

export function useRuntime(): CanvasRuntime {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error('useRuntime must be used within RuntimeProvider');
  return value;
}
