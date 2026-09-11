import type { Edge, Node, Viewport } from '@xyflow/react';
import type { GraphData } from '@canvas/contracts';

/**
 * Persistent graph model and the pure functions over it. React Flow runtime
 * fields (selected, dragging, measured, width/height) never enter the persisted
 * shape: {@link toPersistentGraph} projects each node to exactly the contract
 * fields in a single pass.
 */
export type NodeType = 'prompt' | 'generator' | 'result';
export type PromptData = { text: string };
export type GeneratorData = { label: string };
export type ResultData = { label: string };

export type AppNode =
  Node<PromptData, 'prompt'> | Node<GeneratorData, 'generator'> | Node<ResultData, 'result'>;
export type AppEdge = Edge;

const NODE_DEFAULTS: Record<NodeType, PromptData | GeneratorData | ResultData> = {
  prompt: { text: '' },
  generator: { label: 'Генератор' },
  result: { label: 'Результат' },
};

export function createNode(type: NodeType, position: { x: number; y: number }): AppNode {
  const id = crypto.randomUUID();
  switch (type) {
    case 'prompt':
      return { id, type: 'prompt', position, data: { ...(NODE_DEFAULTS.prompt as PromptData) } };
    case 'generator':
      return {
        id,
        type: 'generator',
        position,
        data: { ...(NODE_DEFAULTS.generator as GeneratorData) },
      };
    case 'result':
      return { id, type: 'result', position, data: { ...(NODE_DEFAULTS.result as ResultData) } };
  }
}

/**
 * Project the live React Flow arrays to the contract graph. Hot path: runs once
 * per save (after a 500 ms debounce). Two single passes with pre-sized output
 * arrays — no filtering, no intermediate collections, no growing accumulator.
 */
export function toPersistentGraph(
  nodes: readonly AppNode[],
  edges: readonly AppEdge[],
  viewport: Viewport,
): GraphData {
  const outNodes: GraphData['nodes'] = new Array(nodes.length);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const position = { x: node.position.x, y: node.position.y };
    switch (node.type) {
      case 'prompt':
        outNodes[i] = { id: node.id, type: 'prompt', position, data: { text: node.data.text } };
        break;
      case 'generator':
        outNodes[i] = {
          id: node.id,
          type: 'generator',
          position,
          data: { label: node.data.label },
        };
        break;
      case 'result':
        outNodes[i] = { id: node.id, type: 'result', position, data: { label: node.data.label } };
        break;
    }
  }
  const outEdges: GraphData['edges'] = new Array(edges.length);
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]!;
    outEdges[i] = { id: edge.id, source: edge.source, target: edge.target };
  }
  return {
    nodes: outNodes,
    edges: outEdges,
    viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
  };
}

export function serializeGraph(
  nodes: readonly AppNode[],
  edges: readonly AppEdge[],
  viewport: Viewport,
): string {
  return JSON.stringify(toPersistentGraph(nodes, edges, viewport));
}

export function fromPersistentGraph(graph: GraphData): { nodes: AppNode[]; edges: AppEdge[] } {
  const nodes = graph.nodes.map<AppNode>((node) => {
    const position = { x: node.position.x, y: node.position.y };
    if (node.type === 'prompt')
      return { id: node.id, type: 'prompt', position, data: { text: node.data.text } };
    if (node.type === 'generator')
      return { id: node.id, type: 'generator', position, data: { label: node.data.label } };
    return { id: node.id, type: 'result', position, data: { label: node.data.label } };
  });
  const edges: AppEdge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));
  return { nodes, edges };
}

/**
 * Validate a candidate edge before it is created — mirrors the server rules so
 * an invalid drop never reaches the API. Allowed: prompt→generator,
 * generator→result. Each input takes one edge; each generator has one output.
 */
export function canConnect(
  nodesById: ReadonlyMap<string, AppNode>,
  edges: readonly AppEdge[],
  source: string,
  target: string,
): boolean {
  if (source === target) return false;
  const from = nodesById.get(source);
  const to = nodesById.get(target);
  if (!from || !to) return false;
  const typesOk =
    (from.type === 'prompt' && to.type === 'generator') ||
    (from.type === 'generator' && to.type === 'result');
  if (!typesOk) return false;
  for (const edge of edges) {
    if (edge.target === target) return false; // the input already has a connection
    if (from.type === 'generator' && edge.source === source) return false; // one output per generator
  }
  return true;
}
