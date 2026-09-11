import { useState } from 'react';
import { Handle, type NodeProps, type NodeTypes, Position } from '@xyflow/react';
import { apiAssetUrl } from '../../api/http';
import type { GeneratorData, PromptData, ResultData } from '../../lib/graph';
import type { Scenario } from '../generation/useGenerations';
import { useRuntime } from './runtime';

function DeleteButton({ id }: { readonly id: string }) {
  const { deleteNode } = useRuntime();
  return (
    <button
      type="button"
      className="node__delete nodrag"
      aria-label="Удалить ноду"
      onClick={() => deleteNode(id)}
    >
      ×
    </button>
  );
}

function PromptNode({ id, data }: NodeProps) {
  const { updateNodeText } = useRuntime();
  const text = (data as PromptData).text;
  return (
    <div className="node node--prompt">
      <div className="node__head">
        <span className="node__type">Текст</span>
        <DeleteButton id={id} />
      </div>
      <label className="node__label" htmlFor={`text-${id}`}>
        Описание изображения
      </label>
      <textarea
        id={`text-${id}`}
        className="node__textarea nodrag nowheel"
        value={text}
        placeholder="Например: горы на рассвете"
        onChange={(event) => updateNodeText(id, event.target.value)}
      />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const SCENARIOS: ReadonlyArray<{ value: Scenario; label: string }> = [
  { value: 'success', label: 'успех' },
  { value: 'failure', label: 'ошибка (тест)' },
];

function GeneratorNode({ id, data }: NodeProps) {
  const { generate, retry, generatorView } = useRuntime();
  const [scenario, setScenario] = useState<Scenario>('success');
  const view = generatorView(id);
  const status = view?.status;
  const processing = status === 'processing';

  return (
    <div className="node node--generator">
      <Handle type="target" position={Position.Left} />
      <div className="node__head">
        <span className="node__type">{(data as GeneratorData).label}</span>
        <DeleteButton id={id} />
      </div>

      <label className="node__label" htmlFor={`scenario-${id}`}>
        Сценарий
      </label>
      <select
        id={`scenario-${id}`}
        className="node__select nodrag"
        value={scenario}
        disabled={processing}
        onChange={(event) => setScenario(event.target.value as Scenario)}
      >
        {SCENARIOS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {processing ? (
        <p className="node__status node__status--busy">Генерация…</p>
      ) : status === 'failed' || status === 'error' ? (
        <>
          <p className="node__status node__status--error">{view?.message ?? 'Ошибка.'}</p>
          <button type="button" className="node__btn nodrag" onClick={() => retry(id, scenario)}>
            Повторить
          </button>
        </>
      ) : (
        <button
          type="button"
          className="node__btn node__btn--primary nodrag"
          onClick={() => generate(id, scenario)}
        >
          {status === 'succeeded' ? 'Сгенерировать заново' : 'Сгенерировать'}
        </button>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function ResultNode({ id, data }: NodeProps) {
  const { resultView } = useRuntime();
  const view = resultView(id);
  return (
    <div className="node node--result">
      <Handle type="target" position={Position.Left} />
      <div className="node__head">
        <span className="node__type">{(data as ResultData).label}</span>
        <DeleteButton id={id} />
      </div>
      <div className="node__canvas">
        {view?.status === 'succeeded' && view.imageUrl ? (
          <img className="node__image" src={apiAssetUrl(view.imageUrl)} alt="Результат генерации" />
        ) : view?.status === 'processing' ? (
          <span className="node__status node__status--busy">Ожидаем изображение…</span>
        ) : view?.status === 'failed' || view?.status === 'error' ? (
          <span className="node__status node__status--error">Нет изображения</span>
        ) : (
          <span className="node__placeholder">Результат появится здесь</span>
        )}
      </div>
    </div>
  );
}

export const nodeTypes: NodeTypes = {
  prompt: PromptNode,
  generator: GeneratorNode,
  result: ResultNode,
};
