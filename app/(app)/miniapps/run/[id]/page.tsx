'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Loader2, Plus, Minus, Hash, DollarSign, TrendingUp, TrendingDown, Settings, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FastTransitionLink } from '@/components/fast-transition-link';
import { cn } from '@/lib/utils';

interface MiniAppComponent {
  id: string;
  type: 'button' | 'text' | 'spacer' | 'grid' | 'image' | 'input' | 'counter' | 'progress' | 'toggle' | 'slider' | 'card' | 'divider' | 'avatar' | 'badge';
  props: Record<string, any>;
  order: number;
}

interface MiniApp {
  id: string;
  name: string;
  description: string;
  authorId: string;
  authorUsername: string;
  components: MiniAppComponent[];
  variables: any[];
  nodes?: any[];
  edges?: any[];
  isPublic: boolean;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

const ICONS = {
  plus: Plus,
  minus: Minus,
  hash: Hash,
  dollar: DollarSign,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  settings: Settings,
};

export default function RunMiniAppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [miniApp, setMiniApp] = useState<MiniApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, number>>({});

  // Load variable values from localStorage on mount
  useEffect(() => {
    const storageKey = `miniapp_${id}_variables`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setVariableValues(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored variables:', e);
      }
    }
  }, [id]);

  // Save variable values to localStorage whenever they change
  useEffect(() => {
    const storageKey = `miniapp_${id}_variables`;
    localStorage.setItem(storageKey, JSON.stringify(variableValues));
  }, [variableValues, id]);

  useEffect(() => {
    fetchMiniApp();
  }, [id]);

  const fetchMiniApp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/miniapps/${id}`);
      const data = await res.json();
      setMiniApp(data.miniApp);
      
      // Initialize variable values from defaults if not in localStorage
      const storageKey = `miniapp_${id}_variables`;
      const stored = localStorage.getItem(storageKey);
      if (!stored && data.miniApp?.variables) {
        const values: Record<string, number> = {};
        for (const variable of data.miniApp.variables) {
          values[variable.id] = variable.defaultValue;
        }
        setVariableValues(values);
      }
    } catch (error) {
      console.error('Failed to fetch miniapp:', error);
      setMessage({ type: 'error', text: 'Ошибка загрузки приложения' });
    } finally {
      setLoading(false);
    }
  };

  const executeNodeGraph = async (componentId: string) => {
    if (!miniApp?.nodes || !miniApp?.edges) return;

    // Find the button click node for this component
    const buttonClickNode = miniApp.nodes.find(
      (n: any) => n.type === 'buttonClick' && n.data.componentId === componentId
    );

    if (!buttonClickNode) return;

    // Execute the node graph starting from this node
    await executeNode(buttonClickNode.id);
  };

  const interpolateNodeData = (data: any): any => {
    const result: any = {};
    for (const key in data) {
      if (typeof data[key] === 'string') {
        const interpolated = interpolateVariables(data[key]);
        // If the original was a variable reference, try to convert to number
        if (data[key].startsWith('{') && data[key].endsWith('}')) {
          const numVal = parseFloat(interpolated);
          result[key] = isNaN(numVal) ? interpolated : numVal;
        } else {
          result[key] = interpolated;
        }
      } else if (typeof data[key] === 'number') {
        // For numbers, check if it's a string representation of a variable reference
        const strValue = String(data[key]);
        if (strValue.startsWith('{') && strValue.endsWith('}')) {
          const varName = strValue.slice(1, -1);
          const variable = miniApp?.variables.find(v => v.name === varName);
          if (variable) {
            result[key] = variableValues[variable.id] ?? variable.defaultValue;
          } else {
            result[key] = data[key];
          }
        } else {
          result[key] = data[key];
        }
      } else {
        result[key] = data[key];
      }
    }
    return result;
  };

  const executeNode = async (nodeId: string) => {
    const node = miniApp?.nodes?.find((n: any) => n.id === nodeId);
    if (!node) return;

    // Interpolate variables in node data
    const interpolatedData = interpolateNodeData(node.data);

    switch (node.type) {
      case 'buttonClick':
        // Button click is just a trigger, find connected nodes
        const connectedEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of connectedEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'incrementVar':
      case 'decrementVar':
        if (interpolatedData.variableId) {
          const amount = interpolatedData.amount || 1;
          const operation = node.type === 'incrementVar' ? 'add' : 'subtract';
          await executeVariableOperation(interpolatedData.variableId, operation, amount);
        }
        // Execute connected nodes
        const varEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of varEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'setVar':
        if (interpolatedData.variableId) {
          await setVariableValue(interpolatedData.variableId, interpolatedData.value || 0);
        }
        const setVarEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of setVarEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'addMoney':
        await executeMoneyOperation('add', interpolatedData.amount || 100);
        const addMoneyEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of addMoneyEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'removeMoney':
        await executeMoneyOperation('remove', interpolatedData.amount || 100);
        const removeMoneyEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of removeMoneyEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'math':
        // Math operations would need a target variable, skip for now
        const mathEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of mathEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'onInputChange':
      case 'onToggleChange':
      case 'onSliderChange':
        // These are event handlers, execute connected nodes
        const eventEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of eventEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'ifElse':
        // Conditional logic - would need comparison implementation
        const ifElseEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of ifElseEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'compare':
        // Compare values - would need comparison implementation
        const compareEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of compareEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'delay':
        // Delay execution
        const delayMs = node.data.amount || 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        const delayEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of delayEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'random':
        // Generate random number
        const randomEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of randomEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'textManipulation':
        // Text operations
        const textEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of textEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'saveToStorage':
        // Save to localStorage
        const saveEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of saveEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'loadFromStorage':
        // Load from localStorage
        const loadEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of loadEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'navigate':
        // Navigate to another page
        const navigateEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of navigateEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'openLink':
        // Open external link
        const openLinkEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of openLinkEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'loop':
        // Loop logic
        const loopEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of loopEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;

      case 'playSound':
        // Play sound
        const playSoundEdges = miniApp?.edges?.filter((e: any) => e.sourceNodeId === nodeId);
        for (const edge of playSoundEdges || []) {
          await executeNode(edge.targetNodeId);
        }
        break;
    }
  };

  const executeVariableOperation = async (variableId: string, operation: 'add' | 'subtract', amount: number) => {
    // Client-side variable operation
    const currentValue = variableValues[variableId] ?? 0;
    let newValue: number;
    
    if (operation === 'add') {
      newValue = currentValue + amount;
    } else {
      newValue = currentValue - amount;
    }
    
    setVariableValues(prev => ({ ...prev, [variableId]: newValue }));
  };

  const setVariableValue = async (variableId: string, value: number) => {
    // Client-side variable set
    setVariableValues(prev => ({ ...prev, [variableId]: value }));
  };

  const executeMoneyOperation = async (operation: 'add' | 'remove', amount: number) => {
    try {
      const res = await fetch('/api/miniapps/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: operation === 'add' ? 'addMoney' : 'removeMoney',
          amount,
          miniAppId: id,
          silent: true,
        }),
      });

      if (res.ok) {
        // Variables are now stored locally, no need to refresh from server
      }
    } catch (error) {
      console.error('Failed to execute money operation:', error);
    }
  };

  const interpolateVariables = (text: string): string => {
    if (!text) return text;
    return text.replace(/\{(\w+)\}/g, (match, varName) => {
      const variable = miniApp?.variables.find(v => v.name === varName);
      if (variable) {
        const value = variableValues[variable.id] ?? variable.defaultValue;
        return value.toString();
      }
      return match; // Keep original if variable not found
    });
  };

  const renderComponent = (component: MiniAppComponent) => {
    switch (component.type) {
      case 'button':
        const IconComponent = ICONS[component.props.icon as keyof typeof ICONS];
        const displayLabel = interpolateVariables(component.props.label);
        return (
          <button
            onClick={() => executeNodeGraph(component.id)}
            disabled={executing === component.id}
            className={cn(
              'w-full p-4 font-bold border-2 transition-all flex items-center justify-center gap-2',
              component.props.variant === 'primary'
                ? 'bg-mnr-accent text-black border-mnr-accent shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-mnr-surface text-mnr-text border-mnr-border hover:border-mnr-accent',
              executing === component.id && 'opacity-50 cursor-not-allowed'
            )}
          >
            {executing === component.id ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {IconComponent && <IconComponent className="h-5 w-5" />}
            {displayLabel}
          </button>
        );
      case 'text':
        const sizeClasses = {
          small: 'text-sm',
          medium: 'text-base',
          large: 'text-xl',
        };
        const alignClasses = {
          left: 'text-left',
          center: 'text-center',
          right: 'text-right',
        };
        let displayContent = component.props.content;
        // First apply the old showVariable format if enabled
        if (component.props.showVariable && component.props.variableId) {
          const value = variableValues[component.props.variableId] ?? 0;
          displayContent = component.props.variableFormat.replace('{value}', value.toString());
        }
        // Then apply general variable interpolation
        displayContent = interpolateVariables(displayContent);
        return (
          <div
            className={cn(
              'font-bold text-mnr-text',
              sizeClasses[component.props.size as keyof typeof sizeClasses],
              alignClasses[component.props.align as keyof typeof alignClasses]
            )}
          >
            {displayContent}
          </div>
        );
      case 'spacer':
        return <div style={{ height: component.props.height }} />;
      case 'image':
        return (
          <div className="border-2 border-mnr-border overflow-hidden">
            {component.props.src ? (
              <img
                src={component.props.src}
                alt={component.props.alt || ''}
                className="w-full h-auto"
                style={{ objectFit: component.props.objectFit || 'cover' }}
              />
            ) : (
              <div className="w-full h-32 bg-mnr-surface flex items-center justify-center text-mnr-muted text-sm">
                Изображение
              </div>
            )}
          </div>
        );
      case 'input':
        return (
          <input
            type={component.props.inputType || 'text'}
            placeholder={component.props.placeholder || ''}
            className="w-full p-3 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold focus:border-mnr-accent outline-none"
          />
        );
      case 'counter':
        return (
          <div className="flex items-center gap-2 bg-mnr-surface border-2 border-mnr-border p-2">
            <button className="w-8 h-8 bg-mnr-accent text-black font-bold border-2 border-black">-</button>
            <span className="font-bold text-mnr-text text-xl">{component.props.value || 0}</span>
            <button className="w-8 h-8 bg-mnr-accent text-black font-bold border-2 border-black">+</button>
          </div>
        );
      case 'progress':
        return (
          <div className="w-full">
            <div className="w-full h-4 bg-mnr-surface border-2 border-mnr-border overflow-hidden">
              <div
                className="h-full bg-mnr-accent transition-all"
                style={{ width: `${component.props.value || 0}%` }}
              />
            </div>
          </div>
        );
      case 'toggle':
        return (
          <div className="relative w-12 h-6 transition-colors" style={{ backgroundColor: component.props.value ? '#6366f1' : '#18181b', border: component.props.value ? 'none' : '2px solid #333' }}>
            <div className="absolute top-1 w-4 h-4 bg-black transition-all" style={{ left: component.props.value ? '28px' : '4px' }} />
          </div>
        );
      case 'slider':
        return (
          <input
            type="range"
            min={component.props.min || 0}
            max={component.props.max || 100}
            value={component.props.value || 50}
            className="w-full accent-mnr-accent"
          />
        );
      case 'card':
        return (
          <div className="bg-mnr-surface border-2 border-mnr-border p-4">
            {component.props.title && (
              <div className="font-bold text-mnr-text mb-2">{component.props.title}</div>
            )}
            {component.props.content && (
              <div className="text-mnr-muted text-sm">{component.props.content}</div>
            )}
          </div>
        );
      case 'divider':
        return <div className="w-full h-px bg-mnr-border" />;
      case 'avatar':
        return (
          <div className="w-12 h-12 rounded-full bg-mnr-surface border-2 border-mnr-border flex items-center justify-center overflow-hidden">
            {component.props.src ? (
              <img src={component.props.src} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-mnr-muted font-bold">{component.props.initials || '?'}</span>
            )}
          </div>
        );
      case 'badge':
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2" style={{ backgroundColor: component.props.variant === 'primary' ? '#6366f1' : '#18181b', color: component.props.variant === 'primary' ? 'black' : '#fff', borderColor: component.props.variant === 'primary' ? '#6366f1' : '#333' }}>
            {component.props.text || 'Badge'}
          </div>
        );
      case 'grid':
        return (
          <div
            className="grid gap-2 border-2 border-dashed border-mnr-border/30 p-2"
            style={{ 
              gridTemplateColumns: `repeat(${component.props.columns}, 1fr)`,
              gap: `${component.props.gap}px`
            }}
          >
            {Array.from({ length: component.props.columns }).map((_, i) => {
              const cellComponentId = (component.props.cellComponents || [])[i];
              const cellComponent = miniApp?.components.find(c => c.id === cellComponentId);
              return (
                <div key={i} className="bg-mnr-surface border border-mnr-border min-h-[64px] flex items-center justify-center">
                  {cellComponent ? (
                    <div className="w-full h-full p-2">
                      {renderComponent(cellComponent)}
                    </div>
                  ) : (
                    <span className="text-mnr-muted text-xs">Ячейка {i + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full font-sans items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-mnr-accent" />
        <p className="mt-4 text-mnr-muted font-bold">Загрузка...</p>
      </div>
    );
  }

  if (!miniApp) {
    return (
      <div className="flex flex-col h-full font-sans items-center justify-center">
        <p className="text-mnr-muted font-bold">Приложение не найдено</p>
        <FastTransitionLink
          href="/miniapps/marketplace"
          className="mt-4 px-4 py-2 bg-mnr-accent text-black border-2 border-mnr-accent font-bold"
        >
          Вернуться
        </FastTransitionLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4 border-b border-mnr-border">
        <div className="flex items-center gap-4">
          <FastTransitionLink href="/miniapps/marketplace">
            <ArrowLeft className="h-6 w-6 text-mnr-text" />
          </FastTransitionLink>
          <div>
            <div className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text">
              {miniApp.name}
            </div>
            <div className="text-xs text-mnr-muted">@{miniApp.authorUsername}</div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            'mx-6 mt-4 p-4 border-2 font-bold text-sm',
            message.type === 'success'
              ? 'bg-green-900/30 text-green-400 border-green-600'
              : 'bg-red-900/30 text-red-400 border-red-600'
          )}
        >
          {message.text}
        </div>
      )}

      {/* App Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-4">
          {miniApp.components.map((component) => (
            <div key={component.id}>{renderComponent(component)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
