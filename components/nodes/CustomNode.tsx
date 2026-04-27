'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MousePointer, ArrowUp, ArrowDown, FileText, DollarSign, TrendingDown, Calculator, X, Keyboard, ToggleRight, Sliders, GitBranch, Scale, Clock, Shuffle, Type, Save as SaveIcon, FolderOpen, ExternalLink, RotateCcw, Play, Plus } from 'lucide-react';
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
      alert: Type,
      changeText: Type,
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
      alert: 'Показать уведомление',
      changeText: 'Изменить текст',
    };
    return labels[type] || type;
  };

  const getNodeColor = (type: string) => {
    if (['buttonClick', 'onInputChange', 'onToggleChange', 'onSliderChange'].includes(type)) return 'border-blue-500 shadow-blue-500/20';
    if (['ifElse', 'compare', 'math', 'random', 'textManipulation'].includes(type)) return 'border-orange-500 shadow-orange-500/20';
    if (['incrementVar', 'decrementVar', 'setVar', 'addMoney', 'removeMoney', 'saveToStorage', 'loadFromStorage', 'playSound', 'delay', 'loop', 'changeText'].includes(type)) return 'border-green-500 shadow-green-500/20';
    if (['navigate', 'navigateScreen', 'openLink'].includes(type)) return 'border-purple-500 shadow-purple-500/20';
    return 'border-mnr-border';
  };

  const Icon = getNodeIcon(typedData.type);
  const nodeColorClass = getNodeColor(typedData.type);

  const handleUpdate = (key: string, value: any) => {
    if (typedData.updateNodeData) {
      typedData.updateNodeData(typedData.nodeId, { [key]: value });
    }
  };

  const renderNodeContent = () => {
    const renderNodeField = (label: string, valueKey: string, placeholder: string = "Значение") => {
      const value = (typedData as any)[valueKey] ?? '';
      
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-mnr-muted uppercase">{label}</label>
            <div className="group relative">
              <button className="text-mnr-accent hover:text-mnr-accent/80 transition-all p-1">
                <Plus className="h-3 w-3" />
              </button>
              <div className="absolute right-0 top-full w-48 pt-1 hidden group-hover:block z-50">
                <div className="bg-[#18181b] border border-mnr-border shadow-xl rounded p-2">
                  <div className="text-[9px] font-bold text-mnr-muted mb-2 uppercase border-b border-mnr-border pb-1">Вставить блок</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                    {currentVariables.map(v => (
                      <button 
                        key={v.id}
                        onClick={() => handleUpdate(valueKey, `${value}{${v.name}}`)}
                        className="w-full text-left p-1 hover:bg-mnr-accent/10 text-[10px] text-mnr-text rounded transition-all truncate"
                      >
                        {v.name}
                      </button>
                    ))}
                    <div className="h-px bg-mnr-border my-1" />
                    {currentComponents.map(c => (
                      <button 
                        key={c.id}
                        onClick={() => handleUpdate(valueKey, `${value}{${c.props.label || c.props.placeholder || c.id.slice(0,4)}.value}`)}
                        className="w-full text-left p-1 hover:bg-mnr-accent/10 text-[10px] text-mnr-text rounded transition-all truncate"
                      >
                        {c.props.label || c.props.placeholder || `Comp ${c.id.slice(0,4)}`}
                      </button>
                    ))}
                    <div className="h-px bg-mnr-border my-1" />
                    <button 
                      onClick={() => handleUpdate(valueKey, `${value}{trigger.value}`)}
                      className="w-full text-left p-1 hover:bg-mnr-accent/10 text-[10px] text-mnr-accent rounded transition-all truncate font-bold"
                    >
                      trigger.value
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => handleUpdate(valueKey, e.target.value)}
            className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none nodrag"
            placeholder={placeholder}
          />
        </div>
      );
    };

    switch (typedData.type) {
      case 'buttonClick':
        return (
          <div className="space-y-2 nodrag">
            <Combobox
              options={currentComponents
                .filter((c) => c.type === 'button' || c.type === 'iconButton')
                .map((c) => ({
                  value: c.id,
                  label: c.type === 'button' ? c.props.label : `Иконка ${c.id.slice(0, 4)}`,
                })) || []}
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
            {typedData.type === 'setVar' 
              ? renderNodeField("Значение", "value", "Значение или {блок}")
              : renderNodeField("На сколько", "amount", "1")
            }
          </div>
        );

      case 'addMoney':
      case 'removeMoney':
        return (
          <div className="space-y-2 nodrag">
            {renderNodeField("Сумма", "amount", "100")}
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
            {renderNodeField("Значение 1", "amount", "1")}
            {renderNodeField("Значение 2", "value2", "1")}
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
            {renderNodeField("С чем сравнить", "value", "")}
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
            {renderNodeField("Значение 1", "value", "")}
            {renderNodeField("Значение 2", "value2", "")}
          </div>
        );

      case 'delay':
        return (
          <div className="space-y-2 nodrag">
            {renderNodeField("Задержка (мс)", "amount", "1000")}
          </div>
        );

      case 'random':
        return (
          <div className="space-y-2 nodrag">
            {renderNodeField("Максимум", "amount", "100")}
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
            {renderNodeField("Текст", "value", "")}
          </div>
        );

      case 'saveToStorage':
      case 'loadFromStorage':
        return (
          <div className="space-y-2 nodrag">
            {renderNodeField("Ключ", "value", "")}
            {typedData.type === 'loadFromStorage' && (
              <Combobox
                options={currentVariables.map((v) => ({ value: v.id, label: v.name })) || []}
                value={typedData.variableId || ''}
                onChange={(value) => handleUpdate('variableId', value)}
                placeholder="Записать в переменную"
              />
            )}
            {typedData.type === 'saveToStorage' && renderNodeField("Значение", "amount", "")}
          </div>
        );

      case 'navigate':
        return (
          <div className="space-y-2 nodrag">
            {renderNodeField("Путь", "value", "/...")}
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
      case 'alert':
        return (
          <div className="space-y-2 nodrag">
            {renderNodeField(typedData.type === 'alert' ? "Сообщение" : "URL", "value", "")}
          </div>
        );

      case 'changeText':
        return (
          <div className="space-y-2 nodrag">
            <Combobox
              options={currentComponents
                .filter((c) => ['text', 'button', 'badge'].includes(c.type))
                .map((c) => ({
                  value: c.id,
                  label: c.type === 'button' ? c.props.label : `${c.type} ${c.id.slice(0, 4)}`,
                })) || []}
              value={typedData.componentId || ''}
              onChange={(value) => handleUpdate('componentId', value)}
              placeholder="Выберите компонент"
            />
            {renderNodeField("Новый текст", "value", "")}
          </div>
        );

      case 'loop':
        return (
          <div className="space-y-2 nodrag">
            {renderNodeField("Итерации", "amount", "1")}
          </div>
        );

      case 'playSound':
        return (
          <div className="space-y-2 nodrag">
            {renderNodeField("URL звука", "value", "https://...")}
          </div>
        );

      default:
        return null;
    }
  };

  const hasInput = ['incrementVar', 'decrementVar', 'setVar', 'addMoney', 'removeMoney', 'math', 'onInputChange', 'onToggleChange', 'onSliderChange', 'ifElse', 'compare', 'delay', 'random', 'textManipulation', 'saveToStorage', 'loadFromStorage', 'navigate', 'navigateScreen', 'openLink', 'loop', 'playSound', 'alert', 'changeText'].includes(typedData.type || '');
  const hasOutput = ['buttonClick', 'incrementVar', 'decrementVar', 'setVar', 'addMoney', 'removeMoney', 'math', 'onInputChange', 'onToggleChange', 'onSliderChange', 'delay', 'random', 'textManipulation', 'saveToStorage', 'loadFromStorage', 'navigate', 'navigateScreen', 'openLink', 'loop', 'playSound', 'alert', 'changeText'].includes(typedData.type || '');
  const hasConditionalOutput = ['ifElse', 'compare'].includes(typedData.type || '');
  const hasMultipleInputs = ['compare', 'math'].includes(typedData.type || '');

  return (
    <div
      className={cn(
        'bg-[#18181b] border-2 p-3 rounded-lg shadow-lg min-w-[200px] transition-all',
        selected ? 'ring-2 ring-mnr-accent ring-offset-2 ring-offset-[#0c0c0e]' : '',
        nodeColorClass
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
