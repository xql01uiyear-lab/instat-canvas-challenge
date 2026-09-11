import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import type { GenerationData } from '@canvas/contracts';
import type { ConfigData, GraphWithETag } from '../../api/endpoints';
import { useGenerations } from '../generation/useGenerations';
import { nodeTypes } from './nodes';
import { type CanvasRuntime, RuntimeProvider } from './runtime';
import { type SaveStatus } from './SaveController';
import { useGraphEditor } from './useGraphEditor';

const SAVE_LABEL: Record<SaveStatus, string> = {
  saved: 'Сохранено',
  pending: 'Не сохранено',
  saving: 'Сохранение…',
  error: 'Ошибка сохранения',
  conflict: 'Конфликт версий',
};

export function CanvasEditor({
  spaceId,
  config,
  initial,
  initialGenerations,
}: {
  readonly spaceId: string;
  readonly config: ConfigData;
  readonly initial: GraphWithETag;
  readonly initialGenerations: readonly GenerationData[];
}) {
  const editor = useGraphEditor(spaceId, config.debounceMs, config.maxNodes, initial);
  const generations = useGenerations({
    spaceId,
    pollIntervalMs: config.pollIntervalMs,
    flush: editor.flush,
    resultNodeOf: editor.resultNodeOf,
    nodeExists: editor.nodeExists,
  });

  // Restore in-flight / finished generations from the server once.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    generations.restore(initialGenerations);
  }, [generations, initialGenerations]);

  // Deleting a node also cancels its generation and drops the runtime entry.
  const { cancel, generate, retry, byGenerator, byResult } = generations;
  const { updateNodeText, deleteNode: deleteNodeFromGraph } = editor;
  const deleteNode = useCallback(
    (id: string) => {
      cancel(id);
      deleteNodeFromGraph(id);
    },
    [cancel, deleteNodeFromGraph],
  );

  // Depends only on stable callbacks and the two runtime maps, so a text edit
  // (which changes neither) does not re-render every node through the context.
  const runtime = useMemo<CanvasRuntime>(
    () => ({
      updateNodeText,
      deleteNode,
      generate,
      retry,
      generatorView: (id) => byGenerator.get(id),
      resultView: (id) => byResult.get(id),
    }),
    [updateNodeText, deleteNode, generate, retry, byGenerator, byResult],
  );

  const { status, error } = editor.save;

  return (
    <div className="editor">
      <header className="toolbar">
        <div className="toolbar__group">
          <span className="toolbar__title">Канвас</span>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => editor.addNode('prompt')}
            disabled={!editor.canAddNode}
          >
            + Текст
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => editor.addNode('generator')}
            disabled={!editor.canAddNode}
          >
            + Генератор
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => editor.addNode('result')}
            disabled={!editor.canAddNode}
          >
            + Результат
          </button>
        </div>
        <div className={`save-status save-status--${status}`} role="status">
          <span className="save-status__dot" aria-hidden="true" />
          {SAVE_LABEL[status]}
          {status === 'error' ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={editor.retrySave}>
              Повторить
            </button>
          ) : null}
        </div>
      </header>

      {status === 'conflict' ? (
        <div className="banner banner--conflict" role="alert">
          <span>
            Граф изменился на сервере. Ваши правки сохранены локально и не отправляются, пока
            конфликт не разрешён.
          </span>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={editor.reloadServerVersion}
          >
            Перечитать серверную версию
          </button>
        </div>
      ) : null}

      {status === 'error' && error ? (
        <div className="banner banner--error" role="alert">
          {error.message}
        </div>
      ) : null}

      <div className="canvas">
        <RuntimeProvider value={runtime}>
          <ReactFlow
            nodes={editor.nodes}
            edges={editor.edges}
            onNodesChange={editor.onNodesChange}
            onEdgesChange={editor.onEdgesChange}
            onConnect={editor.onConnect}
            isValidConnection={editor.isValidConnection}
            onNodeDragStop={editor.onNodeDragStop}
            onMoveEnd={editor.onMoveEnd}
            onInit={editor.onInit}
            nodeTypes={nodeTypes}
            defaultViewport={initial.graph.viewport}
            deleteKeyCode={null}
            minZoom={0.2}
            maxZoom={2}
          >
            <Background />
            <Controls />
            <MiniMap pannable />
          </ReactFlow>
        </RuntimeProvider>
      </div>
    </div>
  );
}
