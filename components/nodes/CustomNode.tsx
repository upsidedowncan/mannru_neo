'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MousePointer, ArrowUp, ArrowDown, FileText, DollarSign, TrendingDown, Calculator, X, Keyboard, ToggleRight, Sliders, GitBranch, Scale, Clock, Shuffle, Type, Save as SaveIcon, FolderOpen, ExternalLink, RotateCcw, Play } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';

interface CustomNodeData {
  type: string;
  componentId?: string;
  variableId?: string;
  amount?: number | string;
  value?: number | string;
  value2?: number | string;
  operation?: string;
  variables?: Array<{ id: string; name: string }>;
  components?: Array<{ id: string; type: string; props: { label: string; placeholder?: string } }>;
  screens?: Array<{ id: string; name: string }>;
  componentsRef?: React.RefObject<Array<{ id: string; type: string; props: { label: string; placeholder?: string } }>>;
  variablesRef?: React.RefObject<Array<{ id: string; name: string }>>;
  screensRef?: React.RefObject<Array<{ id: string; name: string }>>;
  updateNodeData?: (nodeId: string, data: any) => void;
  deleteNode?: (nodeId: string) => void;
  nodeId: string;
}

export const CustomNode = memo(function CustomNode({ data, selected }: NodeProps) {
  const typedData = data as unknown as CustomNodeData;
  
  // Get current components and variables from refs if available
  const currentComponents = typedData.componentsRef?.current || typedData.components || [];
  const currentVariables = typedData.variablesRef?.current || typedData.variables || [];
  const currentScreens = typedData.screensRef?.current || typedData.screens || [];
  
  const getNodeIcon = (type: string) => {
    const icons: Record<string, any> = {
      buttonClick: MousePointer,
      incrementVar: ArrowUp,
      decrementVar: ArrowDown,
      setVar: FileText,
      addMoney: DollarSign,
      removeMoney: TrendingDown,
      math: Calculator,
      onInputChange: Keyboard,
      onToggleChange: ToggleRight,
      onSliderChange: Sliders,
      ifElse: GitBranch,
      compare: Scale,
      delay: Clock,
      random: Shuffle,
      textManipulation: Type,
      saveToStorage: SaveIcon,
      loadFromStorage: FolderOpen,
      navigate: ExternalLink,
      navigateScreen: ExternalLink,
      openLink: ExternalLink,
      loop: RotateCcw,
      playSound: Play,
    };
    return icons[type] || FileText;
  };

  const getNodeLabel = (type: string) => {
    const labels: Record<string, string> = {
      buttonClick: 'Нажатие кнопки',
      incrementVar: 'Увеличить переменную',
      decrementVar: 'Уменьшить переменную',
      setVar: 'Установить переменную',
      addMoney: 'Добавить деньги',
      removeMoney: 'Убрать деньги',
      math: 'Математика',
      onInputChange: 'Изменение ввода',
      onToggleChange: 'Изменение переключателя',
      onSliderChange: 'Изменение слайдера',
      ifElse: 'Условие (если/иначе)',
      compare: 'Сравнить значения',
      delay: 'Задержка',
      random: 'Случайное число',
      textManipulation: 'Текстовые операции',
      saveToStorage: 'Сохранить в хранилище',
      loadFromStorage: 'Загрузить из хранилища',
      navigate: 'Навигация',
      navigateScreen: 'Перейти на экран',
      openLink: 'Открыть ссылку',
      loop: 'Цикл',
      playSound: 'Воспроизвести звук',
    };
    return labels[type] || type;
  };

  const Icon = getNodeIcon(typedData.type);

  const handleUpdate = (key: string, value: any) => {
    if (typedData.updateNodeData) {
      typedData.updateNodeData(typedData.nodeId, { [key]: value });
    }
  };

  const renderNodeContent = () => {
    switch (typedData.type) {
      case 'buttonClick':
        return (
          <div className="space-y-2 nodrag">
            <Combobox
              options={currentComponents.filter((c) => c.type === 'button').map((c) => ({ value: c.id, label: c.props.label })) || []}
              value={typedData.componentId || ''}
              onChange={(value) => handleUpdate('componentId', value)}
              placeholder="Выберите кнопку"
            />
          </div>
        );

      case 'incrementVar':
      case 'decrementVar':
      case 'setVar':
        return (
          <div className="space-y-2 nodrag">
            <Combobox
              options={currentVariables.map((v) => ({ value: v.id, label: v.name })) || []}
              value={typedData.variableId || ''}
              onChange={(value) => handleUpdate('variableId', value)}
              placeholder="Выберите переменную"
            />
            {typedData.type === 'setVar' ? (
              <input
                type="text"
                value={typedData.value ?? 0}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('{')) {
                    handleUpdate('value', val);
                    return;
                  }

                  const parsed = parseFloat(val);
                  handleUpdate('value', Number.isNaN(parsed) ? val : parsed);
                }}
                className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
                placeholder="Значение или {переменная}"
              />
            ) : (
              <input
                type="text"
                value={typedData.amount ?? 1}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('{')) {
                    handleUpdate('amount', val);
                    return;
                  }

                  const parsed = parseFloat(val);
                  handleUpdate('amount', Number.isNaN(parsed) ? val : parsed);
                }}
                className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
                placeholder="Значение или {переменная}"
              />
            )}
          </div>
        );

      case 'addMoney':
      case 'removeMoney':
        return (
          <div className="space-y-2 nodrag">
            <input
              type="text"
              value={typedData.amount ?? 100}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('{')) {
                  handleUpdate('amount', val);
                  return;
                }

                const parsed = parseFloat(val);
                handleUpdate('amount', Number.isNaN(parsed) ? val : parsed);
              }}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="Сумма или {переменная}"
            />
          </div>
        );

      case 'math':
        return (
          <div className="space-y-2 nodrag">
            <Combobox
              options={[
                { value: 'add', label: 'Сложение' },
                { value: 'subtract', label: 'Вычитание' },
                { value: 'multiply', label: 'Умножение' },
                { value: 'divide', label: 'Деление' },
              ]}
              value={typedData.operation || 'add'}
              onChange={(value) => handleUpdate('operation', value)}
              placeholder="Операция"
            />
            <Combobox
              options={currentVariables.map((v) => ({ value: v.id, label: v.name })) || []}
              value={typedData.variableId || ''}
              onChange={(value) => handleUpdate('variableId', value)}
              placeholder="Переменная"
            />
            <input
              type="text"
              value={typedData.amount ?? 1}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('{')) {
                  handleUpdate('amount', val);
                  return;
                }

                const parsed = parseFloat(val);
                handleUpdate('amount', Number.isNaN(parsed) ? val : parsed);
              }}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="Значение 1"
            />
            <input
              type="text"
              value={typedData.value2 ?? 1}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('{')) {
                  handleUpdate('value2', val);
                  return;
                }

                const parsed = parseFloat(val);
                handleUpdate('value2', Number.isNaN(parsed) ? val : parsed);
              }}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="Значение 2"
            />
          </div>
        );

      case 'onInputChange':
        return (
          <div className="space-y-2 nodrag">
            <Combobox
              options={currentComponents.filter((c) => c.type === 'input').map((c) => ({ value: c.id, label: c.props.placeholder || `Input ${c.id.slice(0, 4)}` })) || []}
              value={typedData.componentId || ''}
              onChange={(value) => handleUpdate('componentId', value)}
              placeholder="Выберите поле ввода"
            />
          </div>
        );

      case 'onToggleChange':
        return (
          <div className="space-y-2 nodrag">
            <Combobox
              options={currentComponents.filter((c) => c.type === 'toggle').map((c) => ({ value: c.id, label: `Toggle ${c.id.slice(0, 4)}` })) || []}
              value={typedData.componentId || ''}
              onChange={(value) => handleUpdate('componentId', value)}
              placeholder="Выберите переключатель"
            />
          </div>
        );

      case 'onSliderChange':
        return (
          <div className="space-y-2 nodrag">
            <Combobox
              options={currentComponents.filter((c) => c.type === 'slider').map((c) => ({ value: c.id, label: `Slider ${c.id.slice(0, 4)}` })) || []}
              value={typedData.componentId || ''}
              onChange={(value) => handleUpdate('componentId', value)}
              placeholder="Выберите слайдер"
            />
          </div>
        );

      case 'ifElse':
        return (
          <div className="space-y-2 nodrag">
            <Combobox
              options={currentVariables.map((v) => ({ value: v.id, label: v.name })) || []}
              value={typedData.variableId || ''}
              onChange={(value) => handleUpdate('variableId', value)}
              placeholder="Переменная"
            />
            <Combobox
              options={[
                { value: 'equals', label: 'Равно' },
                { value: 'notEquals', label: 'Не равно' },
                { value: 'greaterThan', label: 'Больше' },
                { value: 'lessThan', label: 'Меньше' },
              ]}
              value={typedData.operation || 'equals'}
              onChange={(value) => handleUpdate('operation', value)}
              placeholder="Операция"
            />
            <input
              type="text"
              value={typedData.value ?? ''}
              onChange={(e) => handleUpdate('value', e.target.value)}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="Значение"
            />
          </div>
        );

      case 'compare':
        return (
          <div className="space-y-2 nodrag">
            <Combobox
              options={[
                { value: 'equals', label: 'Равно' },
                { value: 'notEquals', label: 'Не равно' },
                { value: 'greaterThan', label: 'Больше' },
                { value: 'lessThan', label: 'Меньше' },
              ]}
              value={typedData.operation || 'equals'}
              onChange={(value) => handleUpdate('operation', value)}
              placeholder="Операция"
            />
            <input
              type="text"
              value={typedData.value ?? ''}
              onChange={(e) => handleUpdate('value', e.target.value)}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="Значение 1"
            />
            <input
              type="text"
              value={typedData.value2 ?? ''}
              onChange={(e) => handleUpdate('value2', e.target.value)}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="Значение 2"
            />
          </div>
        );

      case 'delay':
        return (
          <div className="space-y-2 nodrag">
            <input
              type="number"
              value={typedData.amount ?? 1000}
              onChange={(e) => handleUpdate('amount', parseInt(e.target.value) || 1000)}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="Миллисекунды"
            />
          </div>
        );

      case 'random':
        return (
          <div className="space-y-2 nodrag">
            <input
              type="number"
              value={typedData.amount ?? 100}
              onChange={(e) => handleUpdate('amount', parseInt(e.target.value) || 100)}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="Максимум"
            />
          </div>
        );

      case 'textManipulation':
        return (
          <div className="space-y-2 nodrag">
            <Combobox
              options={[
                { value: 'uppercase', label: 'Верхний регистр' },
                { value: 'lowercase', label: 'Нижний регистр' },
                { value: 'trim', label: 'Убрать пробелы' },
                { value: 'reverse', label: 'Перевернуть' },
              ]}
              value={typedData.operation || 'uppercase'}
              onChange={(value) => handleUpdate('operation', value)}
              placeholder="Операция"
            />
          </div>
        );

      case 'saveToStorage':
      case 'loadFromStorage':
        return (
          <div className="space-y-2 nodrag">
            <input
              type="text"
              value={typedData.value ?? ''}
              onChange={(e) => handleUpdate('value', e.target.value)}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="Ключ"
            />
          </div>
        );

      case 'navigate':
        return (
          <div className="space-y-2 nodrag">
            <input
              type="text"
              value={typedData.value ?? ''}
              onChange={(e) => handleUpdate('value', e.target.value)}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="Путь"
            />
          </div>
        );

      case 'navigateScreen':
        return (
          <div className="space-y-2 nodrag">
            <Combobox
              options={currentScreens.map((s) => ({ value: s.id, label: s.name })) || []}
              value={typedData.value != null ? String(typedData.value) : ''}
              onChange={(screenId) => handleUpdate('value', screenId)}
              placeholder="Выберите экран"
            />
          </div>
        );

      case 'openLink':
        return (
          <div className="space-y-2 nodrag">
            <input
              type="text"
              value={typedData.value ?? ''}
              onChange={(e) => handleUpdate('value', e.target.value)}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="URL"
            />
          </div>
        );

      case 'loop':
        return (
          <div className="space-y-2 nodrag">
            <input
              type="number"
              value={typedData.amount ?? 1}
              onChange={(e) => handleUpdate('amount', parseInt(e.target.value) || 1)}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="Итерации"
            />
          </div>
        );

      case 'playSound':
        return (
          <div className="space-y-2 nodrag">
            <input
              type="text"
              value={typedData.value ?? ''}
              onChange={(e) => handleUpdate('value', e.target.value)}
              className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
              placeholder="URL звука"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const hasInput = ['incrementVar', 'decrementVar', 'setVar', 'addMoney', 'removeMoney', 'math', 'onInputChange', 'onToggleChange', 'onSliderChange', 'ifElse', 'compare', 'delay', 'random', 'textManipulation', 'saveToStorage', 'loadFromStorage', 'navigate', 'openLink', 'loop', 'playSound'].includes(typedData.type || '');
  const hasOutput = ['buttonClick', 'incrementVar', 'decrementVar', 'setVar', 'addMoney', 'removeMoney', 'math', 'onInputChange', 'onToggleChange', 'onSliderChange', 'delay', 'random', 'textManipulation', 'saveToStorage', 'loadFromStorage', 'navigate', 'openLink', 'loop', 'playSound'].includes(typedData.type || '');
  const hasConditionalOutput = ['ifElse', 'compare'].includes(typedData.type || '');
  const hasMultipleInputs = ['compare', 'math'].includes(typedData.type || '');

  return (
    <div
      className={cn(
        'bg-[#18181b] border-2 p-3 rounded-lg shadow-lg min-w-[200px]',
        selected ? 'border-mnr-accent' : 'border-mnr-border'
      )}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-mnr-accent !border-2 !border-black !w-3 !h-3"
        />
      )}

      {hasMultipleInputs && (
        <Handle
          type="target"
          position={Position.Top}
          id="input2"
          className="!bg-mnr-accent !border-2 !border-black !w-3 !h-3"
        />
      )}
      
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-mnr-accent !border-2 !border-black !w-3 !h-3"
        />
      )}

      {hasConditionalOutput && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!bg-green-500 !border-2 !border-black !w-3 !h-3"
            style={{ top: '30%' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!bg-red-500 !border-2 !border-black !w-3 !h-3"
            style={{ top: '70%' }}
          />
        </>
      )}

      <div className="flex items-center justify-between mb-2 cursor-move node-drag-handle">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-mnr-accent" />
          <span className="text-xs font-bold text-mnr-text">
            {getNodeLabel(typedData.type || '')}
          </span>
        </div>
        {typedData.deleteNode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typedData.deleteNode) {
                typedData.deleteNode(typedData.nodeId);
              }
            }}
            className="p-1 text-mnr-error hover:text-red-400 transition-colors nodrag"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      
      {renderNodeContent()}
    </div>
  );
});
