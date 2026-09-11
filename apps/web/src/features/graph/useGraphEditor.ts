import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type Connection,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
  type Viewport,
} from '@xyflow/react';
import type { GraphData } from '@canvas/contracts';
import { api } from '../../api/endpoints';
import type { ApiError } from '../../api/errors';
import {
  type AppEdge,
  type AppNode,
  canConnect,
  createNode,
  fromPersistentGraph,
  type NodeType,
  serializeGraph,
} from '../../lib/graph';
import { SaveController, type SaveStatus } from './SaveController';

type Initial = { readonly graph: GraphData; readonly etag: string };

export function useGraphEditor(
  spaceId: string,
  debounceMs: number,
  maxNodes: number,
  initial: Initial,
) {
  const start = useMemo(() => fromPersistentGraph(initial.graph), [initial.graph]);
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(start.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>(start.edges);
  const [save, setSave] = useState<{ status: SaveStatus; error: ApiError | null }>({
    status: 'saved',
    error: null,
  });

  // Refs let the SaveController and validators read the freshest graph without
  // being recreated on every render.
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const viewportRef = useRef<Viewport>(initial.graph.viewport);
  const rfRef = useRef<ReactFlowInstance<AppNode, AppEdge> | null>(null);

  const nodesById = useMemo(() => {
    const map = new Map<string, AppNode>();
    for (const node of nodes) map.set(node.id, node);
    return map;
  }, [nodes]);
  const nodesByIdRef = useRef(nodesById);
  nodesByIdRef.current = nodesById;

  const controllerRef = useRef<SaveController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new SaveController(
      initial.etag,
      serializeGraph(start.nodes, start.edges, initial.graph.viewport),
      {
        getGraph: () => serializeGraph(nodesRef.current, edgesRef.current, viewportRef.current),
        save: (raw, etag) => api.graph.save(spaceId, raw, etag).then((r) => r.etag),
        onStatus: (status, error) => setSave({ status, error }),
        debounceMs,
      },
    );
  }
  const controller = controllerRef.current;

  useEffect(() => () => controller.dispose(), [controller]);

  const scheduleSave = useCallback(() => controller.schedule(), [controller]);

  const addNode = useCallback(
    (type: NodeType) => {
      if (nodesRef.current.length >= maxNodes) return;
      const offset = nodesRef.current.length * 24;
      const node = createNode(type, { x: 80 + offset, y: 80 + offset });
      setNodes((prev) => [...prev, node]);
      scheduleSave();
    },
    [maxNodes, setNodes, scheduleSave],
  );

  const updateNodeText = useCallback(
    (id: string, text: string) => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === id && node.type === 'prompt'
            ? { ...node, data: { ...node.data, text } }
            : node,
        ),
      );
      scheduleSave();
    },
    [setNodes, scheduleSave],
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((node) => node.id !== id));
      setEdges((prev) => prev.filter((edge) => edge.source !== id && edge.target !== id));
      scheduleSave();
    },
    [setNodes, setEdges, scheduleSave],
  );

  const isValidConnection = useCallback(
    (connection: Connection | AppEdge) =>
      !!connection.source &&
      !!connection.target &&
      canConnect(nodesByIdRef.current, edgesRef.current, connection.source, connection.target),
    [],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (
        !canConnect(nodesByIdRef.current, edgesRef.current, connection.source, connection.target)
      ) {
        return;
      }
      const edge: AppEdge = {
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
      };
      setEdges((prev) => [...prev, edge]);
      scheduleSave();
    },
    [setEdges, scheduleSave],
  );

  const onNodeDragStop = useCallback(() => scheduleSave(), [scheduleSave]);

  const onMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      viewportRef.current = viewport;
      scheduleSave();
    },
    [scheduleSave],
  );

  const onInit = useCallback((instance: ReactFlowInstance<AppNode, AppEdge>) => {
    rfRef.current = instance;
  }, []);

  const flush = useCallback(() => controller.flush(), [controller]);
  const retrySave = useCallback(() => controller.retry(), [controller]);

  const reloadServerVersion = useCallback(async () => {
    const { graph, etag } = await api.graph.get(spaceId);
    const restored = fromPersistentGraph(graph);
    setNodes(restored.nodes);
    setEdges(restored.edges);
    viewportRef.current = graph.viewport;
    rfRef.current?.setViewport(graph.viewport);
    controller.resolveConflict(
      etag,
      serializeGraph(restored.nodes, restored.edges, graph.viewport),
    );
  }, [spaceId, setNodes, setEdges, controller]);

  // Stable lookups shared with the generation runtime.
  const resultNodeOf = useCallback((generatorNodeId: string): string | null => {
    for (const edge of edgesRef.current) if (edge.source === generatorNodeId) return edge.target;
    return null;
  }, []);
  const nodeExists = useCallback((nodeId: string) => nodesByIdRef.current.has(nodeId), []);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    onNodeDragStop,
    onMoveEnd,
    onInit,
    addNode,
    updateNodeText,
    deleteNode,
    save,
    flush,
    retrySave,
    reloadServerVersion,
    resultNodeOf,
    nodeExists,
    canAddNode: nodes.length < maxNodes,
  };
}
