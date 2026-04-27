'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Loader2, Plus, Minus, Hash, DollarSign, TrendingUp, TrendingDown, Settings, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FastTransitionLink } from '@/components/fast-transition-link';
import { cn } from '@/lib/utils';

interface MiniAppComponent {
  id: string;
  type: 'button' | 'iconButton' | 'text' | 'spacer' | 'grid' | 'image' | 'input' | 'counter' | 'progress' | 'toggle' | 'slider' | 'card' | 'divider' | 'avatar' | 'badge';
  props: Record<string, any>;
  order: number;
}

interface MiniAppScreen {
  id: string;
  name: string;
  components: MiniAppComponent[];
  nodes: any[];
  edges: any[];
}

interface MiniApp {
  id: string;
  name: string;
  description: string;
  authorUsername: string;
  variables: Array<{ id: string; name: string; defaultValue: number }>;
  screens?: MiniAppScreen[];
  components?: MiniAppComponent[];
  nodes?: any[];
  edges?: any[];
  startScreenId?: string;
}

const ICONS = {
  plus: Plus,
  minus: Minus,
  hash: Hash,
  dollar: DollarSign,
  up: TrendingUp,
  down: TrendingDown,
  settings: Settings,
  x: X,
};

export default function RunMiniAppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [miniApp, setMiniApp] = useState<MiniApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, number>>({});
  const [currentScreenId, setCurrentScreenId] = useState<string>('');
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const screens: MiniAppScreen[] = miniApp?.screens && miniApp.screens.length > 0
    ? miniApp.screens
    : miniApp
      ? [
          {
            id: 'default-screen',
            name: 'Экран 1',
            components: miniApp.components || [],
            nodes: miniApp.nodes || [],
            edges: miniApp.edges || [],
          },
        ]
      : [];

  const activeScreen = screens.find((s) => s.id === currentScreenId) || screens[0];
  const activeComponents = activeScreen?.components || [];
  const activeNodes = activeScreen?.nodes || [];
  const activeEdges = activeScreen?.edges || [];

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    const storageKey = `miniapp_${id}_variables`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setVariableValues(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored variables', e);
      }
    }
  }, [id]);

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

      const fetchedScreens: MiniAppScreen[] = data.miniApp?.screens && data.miniApp.screens.length > 0
        ? data.miniApp.screens
        : [
            {
              id: 'default-screen',
              name: 'Экран 1',
              components: data.miniApp?.components || [],
              nodes: data.miniApp?.nodes || [],
              edges: data.miniApp?.edges || [],
            },
          ];

      const startScreenId =
        data.miniApp?.startScreenId && fetchedScreens.some((screen) => screen.id === data.miniApp.startScreenId)
          ? data.miniApp.startScreenId
          : fetchedScreens[0]?.id || '';

      setCurrentScreenId(startScreenId);
      
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

  const interpolateVariables = (text: string, triggerContext?: { type: string; value: any }): string => {
    if (!text || typeof text !== 'string') return String(text);
    
    return text.replace(/\{([\w.]+)\}/g, (match, path) => {
      if (triggerContext && path === 'trigger.value') return String(triggerContext.value);

      if (!path.includes('.')) {
        const variable = miniApp?.variables.find(v => v.name === path);
        if (variable) {
          const value = variableValues[variable.id] ?? variable.defaultValue;
          return value.toString();
        }
      } else {
        const [componentRef, prop] = path.split('.');
        const screen = screens.find(s => s.id === currentScreenId);
        if (!screen) return match;

        const component = screen.components.find(c => 
          c.id === componentRef || 
          c.props.label === componentRef || 
          c.props.placeholder === componentRef
        );

        if (component) {
          if (prop === 'value') return String(component.props.value ?? '');
          return String(component.props[prop] ?? match);
        }
      }
      return match;
    });
  };

  const interpolateNodeData = (data: any, triggerContext?: { type: string; value: any }): any => {
    const result: any = {};
    if (!data) return result;
    for (const key in data) {
      if (typeof data[key] === 'string') {
        const interpolated = interpolateVariables(data[key], triggerContext);
        if (data[key].startsWith('{') && data[key].endsWith('}')) {
          const numVal = parseFloat(interpolated);
          result[key] = isNaN(numVal) ? interpolated : numVal;
        } else {
          result[key] = interpolated;
        }
      } else {
        result[key] = data[key];
      }
    }
    return result;
  };

  const executeNode = async (nodeId: string, nodes: any[], edges: any[], triggerContext?: { type: string; value: any }) => {
    const node = nodes.find((n: any) => n.id === nodeId);
    if (!node) return;

    const interpolatedData = interpolateNodeData(node.data, triggerContext);

    const findNextNodes = (sourceHandle?: string) => {
      return edges
        .filter(e => (e.sourceNodeId === nodeId || e.source === nodeId) && (sourceHandle ? e.sourceHandle === sourceHandle : true))
        .map(e => e.targetNodeId || e.target);
    };

    switch (node.data?.type || node.type) {
      case 'buttonClick':
      case 'onInputChange':
      case 'onToggleChange':
      case 'onSliderChange':
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges, triggerContext);
        }
        break;

      case 'incrementVar':
      case 'decrementVar':
        if (interpolatedData.variableId) {
          const amount = parseFloat(interpolatedData.amount) || 1;
          const currentValue = variableValues[interpolatedData.variableId] ?? 0;
          const newValue = (node.data?.type === 'incrementVar' || node.type === 'incrementVar') ? currentValue + amount : currentValue - amount;
          setVariableValues(prev => ({ ...prev, [interpolatedData.variableId]: newValue }));
        }
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'setVar':
        if (interpolatedData.variableId) {
          const val = isNaN(parseFloat(interpolatedData.value)) ? interpolatedData.value : parseFloat(interpolatedData.value);
          setVariableValues(prev => ({ ...prev, [interpolatedData.variableId]: val }));
        }
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'math':
        if (interpolatedData.variableId) {
          const val1 = parseFloat(interpolatedData.amount) || 0;
          const val2 = parseFloat(interpolatedData.value2) || 0;
          let result = 0;
          switch (interpolatedData.operation) {
            case 'add': result = val1 + val2; break;
            case 'subtract': result = val1 - val2; break;
            case 'multiply': result = val1 * val2; break;
            case 'divide': result = val2 !== 0 ? val1 / val2 : 0; break;
          }
          setVariableValues(prev => ({ ...prev, [interpolatedData.variableId]: result }));
        }
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'random':
        if (interpolatedData.variableId) {
          const max = parseInt(interpolatedData.amount) || 100;
          const result = Math.floor(Math.random() * (max + 1));
          setVariableValues(prev => ({ ...prev, [interpolatedData.variableId]: result }));
        }
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'textManipulation':
        if (interpolatedData.variableId) {
          const text = String(interpolatedData.value || '');
          let result = text;
          switch (interpolatedData.operation) {
            case 'uppercase': result = text.toUpperCase(); break;
            case 'lowercase': result = text.toLowerCase(); break;
            case 'trim': result = text.trim(); break;
            case 'reverse': result = text.split('').reverse().join(''); break;
          }
          setVariableValues(prev => ({ ...prev, [interpolatedData.variableId]: result }));
        }
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'saveToStorage':
        if (interpolatedData.value) { // Key
          const key = `miniapp_storage_${interpolatedData.value}`;
          const valueToSave = interpolatedData.variableId ? (variableValues[interpolatedData.variableId] ?? '') : interpolatedData.amount;
          localStorage.setItem(key, JSON.stringify(valueToSave));
        }
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'loadFromStorage':
        if (interpolatedData.value && interpolatedData.variableId) { // Key and target variable
          const key = `miniapp_storage_${interpolatedData.value}`;
          const stored = localStorage.getItem(key);
          if (stored !== null) {
            try {
              setVariableValues(prev => ({ ...prev, [interpolatedData.variableId]: JSON.parse(stored) }));
            } catch (e) {
              setVariableValues(prev => ({ ...prev, [interpolatedData.variableId]: stored }));
            }
          }
        }
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'delay':
        const delayMs = parseInt(interpolatedData.amount) || 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'navigate':
        if (interpolatedData.value) {
          window.location.href = interpolatedData.value;
        }
        break;

      case 'openLink':
        if (interpolatedData.value) {
          window.open(interpolatedData.value, '_blank');
        }
        break;

      case 'alert':
        if (interpolatedData.value) {
          setMessage({ type: 'success', text: String(interpolatedData.value) });
        }
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'changeText':
        if (interpolatedData.componentId && interpolatedData.value !== undefined) {
          setMiniApp(prev => {
            if (!prev) return prev;
            const updatedScreens = (prev.screens || screens).map(s => {
              // We need to find the component in ALL screens or just current? 
              // Usually components are unique per app or per screen.
              // Let's search in all screens for simplicity.
              return {
                ...s,
                components: s.components.map(c => {
                  if (c.id === interpolatedData.componentId) {
                    const propKey = c.type === 'button' ? 'label' : 'content';
                    return { ...c, props: { ...c.props, [propKey]: String(interpolatedData.value) } };
                  }
                  return c;
                })
              };
            });
            return { ...prev, screens: updatedScreens };
          });
        }
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'compare':
        const v1 = isNaN(parseFloat(interpolatedData.value)) ? interpolatedData.value : parseFloat(interpolatedData.value);
        const v2 = isNaN(parseFloat(interpolatedData.value2)) ? interpolatedData.value2 : parseFloat(interpolatedData.value2);
        let compareResult = false;
        switch (interpolatedData.operation) {
          case 'equals': compareResult = v1 === v2; break;
          case 'notEquals': compareResult = v1 !== v2; break;
          case 'greaterThan': compareResult = v1 > v2; break;
          case 'lessThan': compareResult = v1 < v2; break;
        }
        for (const targetId of findNextNodes(compareResult ? 'true' : 'false')) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'addMoney':
      case 'removeMoney':
        const amount = parseFloat(interpolatedData.amount) || 100;
        await executeMoneyOperation((node.data?.type === 'addMoney' || node.type === 'addMoney') ? 'add' : 'remove', amount);
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'navigateScreen':
        if (interpolatedData.value && screens.some((screen) => screen.id === interpolatedData.value)) {
          setCurrentScreenId(interpolatedData.value);
        }
        for (const targetId of findNextNodes()) {
          await executeNode(targetId, nodes, edges);
        }
        break;

      case 'ifElse':
        const varValue = variableValues[interpolatedData.variableId] ?? 0;
        const compareValue = parseFloat(interpolatedData.value) || 0;
        let condition = false;
        switch (interpolatedData.operation) {
          case 'equals': condition = varValue === compareValue; break;
          case 'notEquals': condition = varValue !== compareValue; break;
          case 'greaterThan': condition = varValue > compareValue; break;
          case 'lessThan': condition = varValue < compareValue; break;
        }
        for (const targetId of findNextNodes(condition ? 'true' : 'false')) {
          await executeNode(targetId, nodes, edges);
        }
        break;
    }
  };

  const executeVariableOperation = async (variableId: string, operation: 'add' | 'subtract', amount: number) => {
    const currentValue = variableValues[variableId] ?? 0;
    const newValue = operation === 'add' ? currentValue + amount : currentValue - amount;
    setVariableValues(prev => ({ ...prev, [variableId]: newValue }));
  };

  const setVariableValue = async (variableId: string, value: number) => {
    setVariableValues(prev => ({ ...prev, [variableId]: value }));
  };

  const executeMoneyOperation = async (operation: 'add' | 'remove', amount: number) => {
    try {
      await fetch('/api/miniapps/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: operation === 'add' ? 'addMoney' : 'removeMoney',
          amount,
          miniAppId: id,
          silent: true,
        }),
      });
    } catch (error) {
      console.error('Failed to execute money operation:', error);
    }
  };

  const executeNodeGraph = async (componentId: string) => {
    const buttonClickNode = activeNodes.find(
      (n: any) => (n.data?.type === 'buttonClick' || n.type === 'buttonClick') && n.data.componentId === componentId
    );
    if (!buttonClickNode) return;
    setExecuting(componentId);
    try {
      await executeNode(buttonClickNode.id, activeNodes, activeEdges);
    } finally {
      setExecuting(null);
    }
  };

  const updateComponentValue = (componentId: string, value: any) => {
    setMiniApp(prev => {
      if (!prev) return prev;
      const updatedScreens = (prev.screens || screens).map(s => {
        if (s.id !== currentScreenId) return s;
        return {
          ...s,
          components: s.components.map(c => c.id === componentId ? { ...c, props: { ...c.props, value } } : c)
        };
      });
      return { ...prev, screens: updatedScreens };
    });
  };

  const renderComponent = (component: MiniAppComponent) => {
    const width = component.props.width !== 'auto' ? component.props.width : '100%';
    const height = component.props.height !== 'auto' ? component.props.height : 'auto';

    switch (component.type) {
      case 'button':
      case 'iconButton':
        const IconComponent = ICONS[component.props.icon as keyof typeof ICONS];
        const displayLabel = component.type === 'button' ? interpolateVariables(component.props.label) : '';
        return (
          <button
            onClick={() => executeNodeGraph(component.id)}
            disabled={executing === component.id}
            className={cn(
              component.type === 'button' ? 'w-full p-4 font-bold border-2' : 'rounded-full border-2 flex items-center justify-center',
              'active:brightness-90 flex items-center justify-center gap-2',
              executing === component.id && 'opacity-50 cursor-not-allowed'
            )}
            style={{ 
              backgroundColor: component.props.backgroundColor, 
              color: component.props.textColor, 
              borderColor: component.props.backgroundColor,
              width: component.type === 'iconButton' ? (component.props.width !== 'auto' ? component.props.width : '48px') : width,
              height: component.type === 'iconButton' ? (component.props.height !== 'auto' ? component.props.height : '48px') : height,
              minWidth: component.type === 'iconButton' ? '40px' : 'auto',
              minHeight: component.type === 'iconButton' ? '40px' : 'auto'
            }}
          >
            {executing === component.id ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {IconComponent && <IconComponent className="h-5 w-5" />}
            {displayLabel}
          </button>
        );
      case 'text':
        return (
          <div
            className="font-bold p-2"
            style={{ 
              fontSize: `${component.props.fontSize}px`, 
              fontFamily: component.props.fontFamily, 
              color: component.props.color,
              textAlign: component.props.align as any,
              width, height
            }}
          >
            {interpolateVariables(component.props.showVariable ? component.props.variableFormat.replace('{value}', `{${miniApp?.variables.find(v => v.id === component.props.variableId)?.name}}`) : component.props.content)}
          </div>
        );
      case 'input':
        return (
          <input
            type={component.props.inputType || 'text'}
            placeholder={component.props.placeholder || ''}
            value={component.props.value || ''}
            onChange={(e) => {
              const val = e.target.value;
              updateComponentValue(component.id, val);
              const eventNode = activeNodes.find(n => (n.data?.type === 'onInputChange' || n.type === 'onInputChange') && n.data.componentId === component.id);
              if (eventNode) executeNode(eventNode.id, activeNodes, activeEdges, { type: 'onInputChange', value: val });
            }}
            className="w-full p-3 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold focus:border-mnr-accent outline-none"
            style={{ width, height }}
          />
        );
      case 'image':
        return (
          <div className="border-2 border-mnr-border overflow-hidden" style={{ width, height }}>
            {component.props.src ? (
              <img src={component.props.src} alt={component.props.alt || ''} className="w-full h-full" style={{ objectFit: component.props.objectFit || 'cover' }} />
            ) : (
              <div className="w-full h-full bg-mnr-surface flex items-center justify-center text-mnr-muted text-sm">Изображение</div>
            )}
          </div>
        );
      case 'divider':
        return <div className="w-full h-px bg-mnr-border" style={{ width, height }} />;
      case 'avatar':
        return (
          <div className="rounded-full bg-mnr-surface border-2 border-mnr-border flex items-center justify-center overflow-hidden" style={{ width: height || '48px', height: height || '48px' }}>
            {component.props.src ? (
              <img src={component.props.src} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-mnr-muted font-bold">{component.props.initials || '?'}</span>
            )}
          </div>
        );
      case 'badge':
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2" style={{ backgroundColor: component.props.variant === 'primary' ? '#6366f1' : '#18181b', color: component.props.variant === 'primary' ? 'black' : '#fff', borderColor: component.props.variant === 'primary' ? '#6366f1' : '#333', width, height }}>
            {component.props.text || 'Badge'}
          </div>
        );
      case 'grid':
        return (
          <div
            className="grid gap-2 border-2 border-dashed border-mnr-border/30 p-2"
            style={{ 
              gridTemplateColumns: `repeat(${component.props.columns}, 1fr)`,
              gap: `${component.props.gap}px`,
              width, height
            }}
          >
            {Array.from({ length: component.props.columns }).map((_, i) => {
              const cellComponentId = (component.props.cellComponents || [])[i];
              const cellComponent = activeComponents.find(c => c.id === cellComponentId);
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
      default: return null;
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center bg-[#0c0c0e]"><Loader2 className="h-8 w-8 animate-spin text-mnr-accent" /></div>;
  if (!miniApp) return <div className="flex h-full items-center justify-center bg-[#0c0c0e] text-mnr-text font-bold">Приложение не найдено</div>;

  const orderedComponents = [...activeComponents].sort((a, b) => a.order - b.order);
  const isAbsoluteLayout = orderedComponents.some(c => c.props.desktopX !== undefined || c.props.mobileX !== undefined || c.props.x !== undefined);

  return (
    <div className="flex flex-col h-full font-sans bg-[#0c0c0e]">
      <div className="flex items-center justify-between px-6 pt-8 pb-4 border-b border-mnr-border">
        <div className="flex items-center gap-4">
          <FastTransitionLink href="/miniapps/marketplace"><ArrowLeft className="h-6 w-6 text-mnr-text" /></FastTransitionLink>
          <div>
            <div className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text">{miniApp.name}</div>
            <div className="text-xs text-mnr-muted">@{miniApp.authorUsername}</div>
          </div>
        </div>
      </div>
      {message && <div className={cn('mx-6 mt-4 p-4 border-2 font-bold text-sm', message.type === 'success' ? 'bg-green-900/30 text-green-400 border-green-600' : 'bg-red-900/30 text-red-400 border-red-600')}>{message.text}</div>}
      <div className="flex-1 p-6 overflow-y-auto">
        {isAbsoluteLayout ? (
          <div className="w-full max-w-5xl mx-auto min-h-[700px] relative">
            {orderedComponents.map((c) => {
              const x = isMobileViewport ? (c.props.mobileX ?? c.props.x ?? 0) : (c.props.desktopX ?? c.props.x ?? 0);
              const y = isMobileViewport ? (c.props.mobileY ?? c.props.y ?? 0) : (c.props.desktopY ?? c.props.y ?? 0);
              return <div key={c.id} className="absolute" style={{ left: x, top: y, width: c.props.width !== 'auto' ? c.props.width : 'auto', height: c.props.height !== 'auto' ? c.props.height : 'auto' }}>{renderComponent(c)}</div>;
            })}
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-4">{orderedComponents.map(c => <div key={c.id}>{renderComponent(c)}</div>)}</div>
        )}
      </div>
    </div>
  );
}
