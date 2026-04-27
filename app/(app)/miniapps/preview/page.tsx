'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Plus, Minus, Hash, DollarSign, TrendingUp, TrendingDown, Settings, X, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FastTransitionLink } from '@/components/fast-transition-link';
import { cn } from '@/lib/utils';

// Reuse types and logic from run page but adapted for preview
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

export default function PreviewMiniAppPage() {
  const router = useRouter();
  const [miniApp, setMiniApp] = useState<MiniApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, number>>({});
  const [currentScreenId, setCurrentScreenId] = useState<string>('');
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobileViewport(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const data = localStorage.getItem('miniapp_preview_data');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setMiniApp(parsed);
        const screens = parsed.screens || [];
        const startId = parsed.startScreenId || screens[0]?.id || '';
        setCurrentScreenId(startId);
        
        const values: Record<string, number> = {};
        for (const variable of parsed.variables || []) {
          values[variable.id] = variable.defaultValue;
        }
        setVariableValues(values);
      } catch (e) {
        console.error('Failed to parse preview data', e);
      }
    }
    setLoading(false);
  }, []);

  const screens: MiniAppScreen[] = miniApp?.screens || [];
  const activeScreen = screens.find((s) => s.id === currentScreenId) || screens[0];
  const activeComponents = activeScreen?.components || [];
  const activeNodes = activeScreen?.nodes || [];
  const activeEdges = activeScreen?.edges || [];

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
        const component = activeComponents.find(c => 
          c.id === componentRef || c.props.label === componentRef || c.props.placeholder === componentRef
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
    const findNextNodes = (sourceHandle?: string) => edges.filter(e => (e.sourceNodeId === nodeId || e.source === nodeId) && (sourceHandle ? e.sourceHandle === sourceHandle : true)).map(e => e.targetNodeId || e.target);

    switch (node.data?.type || node.type) {
      case 'buttonClick':
      case 'onInputChange':
        for (const targetId of findNextNodes()) await executeNode(targetId, nodes, edges, triggerContext);
        break;
      case 'incrementVar':
      case 'decrementVar':
        if (interpolatedData.variableId) {
          const amount = parseFloat(interpolatedData.amount) || 1;
          const currentValue = variableValues[interpolatedData.variableId] ?? 0;
          const newValue = (node.data?.type === 'incrementVar' || node.type === 'incrementVar') ? currentValue + amount : currentValue - amount;
          setVariableValues(prev => ({ ...prev, [interpolatedData.variableId]: newValue }));
        }
        for (const targetId of findNextNodes()) await executeNode(targetId, nodes, edges);
        break;
      case 'setVar':
        if (interpolatedData.variableId) {
          const val = isNaN(parseFloat(interpolatedData.value)) ? interpolatedData.value : parseFloat(interpolatedData.value);
          setVariableValues(prev => ({ ...prev, [interpolatedData.variableId]: val }));
        }
        for (const targetId of findNextNodes()) await executeNode(targetId, nodes, edges);
        break;
      case 'math':
        if (interpolatedData.variableId) {
          const val1 = parseFloat(interpolatedData.amount) || 0;
          const val2 = parseFloat(interpolatedData.value2) || 0;
          let res = 0;
          switch (interpolatedData.operation) {
            case 'add': res = val1 + val2; break;
            case 'subtract': res = val1 - val2; break;
            case 'multiply': res = val1 * val2; break;
            case 'divide': res = val2 !== 0 ? val1 / val2 : 0; break;
          }
          setVariableValues(prev => ({ ...prev, [interpolatedData.variableId]: res }));
        }
        for (const targetId of findNextNodes()) await executeNode(targetId, nodes, edges);
        break;
      case 'changeText':
        if (interpolatedData.componentId && interpolatedData.value !== undefined) {
          setMiniApp(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              screens: (prev.screens || []).map(s => ({
                ...s,
                components: s.components.map(c => {
                  if (c.id === interpolatedData.componentId) {
                    const propKey = c.type === 'button' ? 'label' : 'content';
                    return { ...c, props: { ...c.props, [propKey]: String(interpolatedData.value) } };
                  }
                  return c;
                })
              }))
            };
          });
        }
        for (const targetId of findNextNodes()) await executeNode(targetId, nodes, edges);
        break;
      case 'alert':
        if (interpolatedData.value) setMessage({ type: 'success', text: String(interpolatedData.value) });
        for (const targetId of findNextNodes()) await executeNode(targetId, nodes, edges);
        break;
      case 'ifElse':
      case 'compare':
        const v1 = isNaN(parseFloat(interpolatedData.value)) ? interpolatedData.value : parseFloat(interpolatedData.value);
        const v2 = isNaN(parseFloat(interpolatedData.value2)) ? interpolatedData.value2 : parseFloat(interpolatedData.value2);
        let condition = false;
        switch (interpolatedData.operation) {
          case 'equals': condition = v1 === v2; break;
          case 'notEquals': condition = v1 !== v2; break;
          case 'greaterThan': condition = v1 > v2; break;
          case 'lessThan': condition = v1 < v2; break;
        }
        for (const targetId of findNextNodes(condition ? 'true' : 'false')) await executeNode(targetId, nodes, edges);
        break;
      case 'navigateScreen':
        if (interpolatedData.value && screens.some(s => s.id === interpolatedData.value)) setCurrentScreenId(interpolatedData.value);
        for (const targetId of findNextNodes()) await executeNode(targetId, nodes, edges);
        break;
    }
  };

  const executeNodeGraph = async (componentId: string) => {
    const node = activeNodes.find(n => (n.data?.type === 'buttonClick' || n.type === 'buttonClick') && n.data.componentId === componentId);
    if (!node) return;
    setExecuting(componentId);
    try { await executeNode(node.id, activeNodes, activeEdges); }
    finally { setExecuting(null); }
  };

  const updateComponentValue = (componentId: string, value: any) => {
    setMiniApp(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        screens: (prev.screens || []).map(s => s.id !== currentScreenId ? s : {
          ...s,
          components: s.components.map(c => c.id === componentId ? { ...c, props: { ...c.props, value } } : c)
        })
      };
    });
  };

  const renderComponent = (component: MiniAppComponent) => {
    const width = component.props.width !== 'auto' ? component.props.width : '100%';
    const height = component.props.height !== 'auto' ? component.props.height : 'auto';
    switch (component.type) {
      case 'button':
      case 'iconButton':
        const Icon = ICONS[component.props.icon as keyof typeof ICONS];
        return (
          <button 
            onClick={() => executeNodeGraph(component.id)}
            disabled={executing === component.id}
            className={cn(component.type === 'button' ? 'w-full p-4 font-bold border-2' : 'rounded-full border-2 flex items-center justify-center', 'active:scale-95 transition-all')}
            style={{ backgroundColor: component.props.backgroundColor, color: component.props.textColor, borderColor: component.props.backgroundColor, width: component.type === 'iconButton' ? '48px' : width, height: component.type === 'iconButton' ? '48px' : height }}
          >
            {executing === component.id ? <Loader2 className="h-5 w-5 animate-spin" /> : Icon ? <Icon className="h-5 w-5" /> : null}
            {component.type === 'button' && interpolateVariables(component.props.label)}
          </button>
        );
      case 'text':
        return <div className="font-bold p-2" style={{ fontSize: `${component.props.fontSize}px`, color: component.props.color, textAlign: component.props.align, width, height }}>{interpolateVariables(component.props.content)}</div>;
      case 'input':
        return <input type={component.props.inputType || 'text'} placeholder={component.props.placeholder} value={component.props.value || ''} onChange={(e) => { updateComponentValue(component.id, e.target.value); const node = activeNodes.find(n => (n.data?.type === 'onInputChange' || n.type === 'onInputChange') && n.data.componentId === component.id); if (node) executeNode(node.id, activeNodes, activeEdges, { type: 'onInputChange', value: e.target.value }); }} className="w-full p-3 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold outline-none focus:border-mnr-accent" style={{ width, height }} />;
      default: return null;
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0c0c0e]"><Loader2 className="h-8 w-8 animate-spin text-mnr-accent" /></div>;
  if (!miniApp) return <div className="flex h-screen items-center justify-center bg-[#0c0c0e] text-mnr-text font-bold uppercase">Данные предпросмотра не найдены</div>;

  return (
    <div className="flex flex-col h-screen font-sans bg-[#0c0c0e]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-mnr-border bg-mnr-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-mnr-accent text-black font-black text-[10px] tracking-widest rounded-sm animate-pulse">
            <Play className="h-3 w-3 fill-current" />
            ПРЕДПРОСМОТР
          </div>
          <div className="text-[18px] font-bold tracking-[-1px] uppercase text-mnr-text leading-none">{miniApp.name}</div>
        </div>
        <button onClick={() => window.close()} className="text-mnr-muted hover:text-mnr-text transition-colors"><X className="h-6 w-6" /></button>
      </div>
      {message && <div className="mx-6 mt-4 p-4 border-2 font-bold text-sm bg-mnr-accent/20 text-mnr-accent border-mnr-accent animate-in slide-in-from-top duration-300">{message.text}</div>}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto min-h-[700px] relative">
          {activeComponents.map((c) => {
            const x = isMobileViewport ? (c.props.mobileX ?? 0) : (c.props.desktopX ?? 0);
            const y = isMobileViewport ? (c.props.mobileY ?? 0) : (c.props.desktopY ?? 0);
            return <div key={c.id} className="absolute" style={{ left: x, top: y, width: c.props.width !== 'auto' ? c.props.width : 'auto', height: c.props.height !== 'auto' ? c.props.height : 'auto' }}>{renderComponent(c)}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
