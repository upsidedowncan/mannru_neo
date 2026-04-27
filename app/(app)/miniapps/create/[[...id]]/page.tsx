'use client';

import { useState, useEffect, use, useCallback, useRef } from 'react';
import { 
  Trash2, Save, ArrowLeft, ArrowRight, Type, Square, Circle, Minus, 
  Layers, Grid3x3, Plus, X, Hash, DollarSign, TrendingUp, TrendingDown, 
  Settings, MousePointer, ArrowUp, ArrowDown, FileText, Calculator, 
  Image, Keyboard, ToggleRight, Sliders, CreditCard, Divide as DivideIcon, 
  User, Award, Clock, Shuffle, ExternalLink, FolderOpen, Save as SaveIcon, 
  GitBranch, Scale, Play, Pause, RotateCcw, Loader2, Check 
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { FastTransitionLink } from '@/components/fast-transition-link';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from '@/components/nodes/CustomNode';

type MiniAppComponentType = 'button' | 'iconButton' | 'text' | 'spacer' | 'grid' | 'image' | 'input' | 'counter' | 'progress' | 'toggle' | 'slider' | 'card' | 'divider' | 'avatar' | 'badge';

interface MiniAppComponent {
  id: string;
  type: MiniAppComponentType;
  props: Record<string, any>;
  order: number;
}

interface MiniAppVariable {
  id: string;
  name: string;
  defaultValue: number;
  description?: string;
}

interface MiniAppScreen {
  id: string;
  name: string;
  components: MiniAppComponent[];
  nodes: any[];
  edges: any[];
}

const ICONS = [
  { name: 'none', icon: null, label: 'Без иконки' },
  { name: 'plus', icon: Plus, label: 'Плюс' },
  { name: 'minus', icon: Minus, label: 'Минус' },
  { name: 'hash', icon: Hash, label: 'Хеш' },
  { name: 'dollar', icon: DollarSign, label: 'Доллар' },
  { name: 'trendingUp', icon: TrendingUp, label: 'Рост' },
  { name: 'trendingDown', icon: TrendingDown, label: 'Падение' },
  { name: 'settings', icon: Settings, label: 'Настройки' },
];

export default function CreateMiniAppPage() {
  const router = useRouter();
  const params = useParams();
  const idParam = params.id as string[] | string | undefined;
  const editId = Array.isArray(idParam) ? idParam[0] : idParam;
  const isEditing = !!editId;
  
  const initialScreen: MiniAppScreen = {
    id: Math.random().toString(36).substring(7),
    name: 'Экран 1',
    components: [],
    nodes: [],
    edges: [],
  };

  // --- States ---
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [variables, setVariables] = useState<MiniAppVariable[]>([]);
  const [screens, setScreens] = useState<MiniAppScreen[]>([initialScreen]);
  const [currentScreenId, setCurrentScreenId] = useState(initialScreen.id);
  const [components, setComponents] = useState<MiniAppComponent[]>([]);
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [tab, setTab] = useState<'visual' | 'nodes'>('visual');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Compilation & Saving
  const [compiling, setCompiling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compilationLogs, setCompilationLogs] = useState<Array<{ type: 'info' | 'error' | 'success'; message: string }>>([]);
  const [showCompilationDialog, setShowCompilationDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Canvas
  const [canvasScale, setCanvasScale] = useState(0.8);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [activeFrame, setActiveFrame] = useState<'desktop' | 'mobile'>('desktop');
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Interaction
  const [resizing, setResizing] = useState<{ componentId: string; direction: string; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  const [dragging, setDragging] = useState<{ componentId: string; startX: number; startY: number; startLeft: number; startTop: number; isMobile: boolean } | null>(null);

  // Refs for node synchronization
  const componentsRef = useRef(components);
  const variablesRef = useRef(variables);
  const screensRef = useRef(screens);

  useEffect(() => { componentsRef.current = components; }, [components]);
  useEffect(() => { variablesRef.current = variables; }, [variables]);
  useEffect(() => { screensRef.current = screens; }, [screens]);

  // --- Data Conversion ---
  const sanitizeNodeData = useCallback((data: any) => {
    if (!data || typeof data !== 'object') return data;
    const { componentsRef, variablesRef, screensRef, updateNodeData, deleteNode, components, variables, screens, ...rest } = data;
    return Object.fromEntries(Object.entries(rest).filter(([, value]) => typeof value !== 'function'));
  }, []);

  const toOldNodes = useCallback((nodes: Node[]) => {
    return nodes.map((node) => ({
      id: node.id,
      type: (node.data as any)?.type,
      x: node.position.x,
      y: node.position.y,
      data: sanitizeNodeData(node.data),
    }));
  }, [sanitizeNodeData]);

  const toOldEdges = useCallback((edges: Edge[]) => {
    return edges.map((edge) => ({
      id: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      sourcePortId: edge.sourceHandle,
      targetPortId: edge.targetHandle,
    }));
  }, []);

  const hydrateFlowNodes = useCallback((storedNodes: any[], screenComponents: MiniAppComponent[]) => {
    return (storedNodes || []).map((node: any) => ({
      id: node.id,
      type: 'custom',
      position: { x: node.x, y: node.y },
      data: {
        ...node.data,
        type: node.type,
        nodeId: node.id,
        variables,
        components: screenComponents,
        screens,
        componentsRef,
        variablesRef,
        screensRef,
        updateNodeData: handleUpdateNodeData,
        deleteNode: removeNode,
      },
    }));
  }, [variables, screens]);

  const hydrateFlowEdges = useCallback((storedEdges: any[]) => {
    return (storedEdges || []).map((edge: any) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      sourceHandle: edge.sourcePortId,
      targetHandle: edge.targetPortId,
    }));
  }, []);

  // --- Handlers ---
  const handleUpdateNodeData = (nodeId: string, data: any) => {
    setFlowNodes((nodes) => nodes.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node));
  };

  const removeNode = (id: string) => {
    setFlowNodes((nodes) => nodes.filter((n) => n.id !== id));
    setFlowEdges((edges) => edges.filter((e) => e.source !== id && e.target !== id));
  };

  const syncCurrentScreen = useCallback((nextComponents: MiniAppComponent[] = components, nextNodes: Node[] = flowNodes, nextEdges: Edge[] = flowEdges) => {
    setScreens((prev) => prev.map((screen) => screen.id === currentScreenId ? { ...screen, components: nextComponents, nodes: toOldNodes(nextNodes), edges: toOldEdges(nextEdges) } : screen));
  }, [components, currentScreenId, flowEdges, flowNodes, toOldEdges, toOldNodes]);

  const switchScreen = (screenId: string) => {
    if (screenId === currentScreenId) return;
    const targetScreen = screens.find((s) => s.id === screenId);
    if (!targetScreen) return;
    syncCurrentScreen();
    setCurrentScreenId(screenId);
    setComponents(targetScreen.components || []);
    setFlowNodes(hydrateFlowNodes(targetScreen.nodes || [], targetScreen.components || []));
    setFlowEdges(hydrateFlowEdges(targetScreen.edges || []));
    setSelectedComponentId(null);
  };

  const addScreen = () => {
    syncCurrentScreen();
    const newScreen: MiniAppScreen = { id: Math.random().toString(36).substring(7), name: `Экран ${screens.length + 1}`, components: [], nodes: [], edges: [] };
    setScreens((prev) => [...prev, newScreen]);
    setCurrentScreenId(newScreen.id);
    setComponents([]); setFlowNodes([]); setFlowEdges([]); setSelectedComponentId(null);
  };

  const removeCurrentScreen = () => {
    if (screens.length <= 1) return;
    const remaining = screens.filter((s) => s.id !== currentScreenId);
    const fallback = remaining[0];
    setScreens(remaining); setCurrentScreenId(fallback.id);
    setComponents(fallback.components || []);
    setFlowNodes(hydrateFlowNodes(fallback.nodes || [], fallback.components || []));
    setFlowEdges(hydrateFlowEdges(fallback.edges || []));
    setSelectedComponentId(null);
  };

  // --- Compiler ---
  const compileNodes = async () => {
    setCompiling(true); setShowCompilationDialog(true);
    setCompilationLogs([{ type: 'info', message: 'Начало компиляции...' }]);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const errors: string[] = [];
    screens.forEach((screen, screenIdx) => {
      const screenName = screen.name || `Экран ${screenIdx + 1}`;
      setCompilationLogs(prev => [...prev, { type: 'info', message: `Проверка ${screenName}...` }]);
      screen.nodes.forEach((node: any) => {
        const nodeType = node.data?.type || node.type;
        const numericFields = ['amount', 'value', 'value2', 'min', 'max'];
        numericFields.forEach(field => {
          const val = node.data?.[field];
          if (val !== undefined && val !== '' && !String(val).includes('{') && isNaN(Number(val))) {
            errors.push(`[${screenName}] Узел "${nodeType}": Поле "${field}" должно быть числом (введено: "${val}")`);
          }
        });
        if (['setVar', 'incrementVar', 'decrementVar', 'math'].includes(nodeType) && !node.data?.variableId) errors.push(`[${screenName}] Узел "${nodeType}": Не выбрана переменная`);
        if (['buttonClick', 'onInputChange', 'onToggleChange', 'onSliderChange'].includes(nodeType) && !node.data?.componentId) errors.push(`[${screenName}] Узел "${nodeType}": Не выбран компонент`);
        if (nodeType === 'navigateScreen' && !node.data?.value) errors.push(`[${screenName}] Узел "${nodeType}": Не выбран целевой экран`);
      });
    });

    if (errors.length > 0) {
      setCompilationLogs(prev => [...prev, ...errors.map(err => ({ type: 'error' as const, message: err })), { type: 'error', message: `Компиляция не удалась. Найдено ошибок: ${errors.length}` }]);
      setCompiling(false); return false;
    }
    setCompilationLogs(prev => [...prev, { type: 'success', message: 'Компиляция успешно завершена!' }]);
    await new Promise(resolve => setTimeout(resolve, 500));
    setCompiling(false); return true;
  };

  const handleSave = async () => {
    if (!name || !description) return alert('Пожалуйста, заполните название и описание');
    const success = await compileNodes();
    if (!success) return;
    setSaving(true);
    setCompilationLogs(prev => [...prev, { type: 'info' as const, message: 'Сохранение в базу данных...' }]);
    try {
      const persistedScreens = screens.map((screen) => screen.id === currentScreenId ? { ...screen, components, nodes: toOldNodes(flowNodes), edges: toOldEdges(flowEdges) } : screen);
      const url = isEditing ? `/api/miniapps/${editId}` : '/api/miniapps';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, components: persistedScreens[0]?.components || components, variables, screens: persistedScreens, startScreenId: currentScreenId, isPublic }),
      });
      if (res.ok) router.push('/miniapps/marketplace');
      else alert('Ошибка при сохранении');
    } catch (error) { alert('Ошибка при сохранении'); }
    finally { setSaving(false); setTimeout(() => setShowCompilationDialog(false), 2000); }
  };

  const handlePreview = async () => {
    const success = await compileNodes();
    if (!success) return;
    
    setCompilationLogs(prev => [...prev, { type: 'info', message: 'Подготовка данных для предпросмотра...' }]);
    
    const persistedScreens = screens.map((screen) => 
      screen.id === currentScreenId ? { ...screen, components, nodes: toOldNodes(flowNodes), edges: toOldEdges(flowEdges) } : screen
    );

    const previewData = {
      id: 'preview',
      name: name || 'Предпросмотр приложения',
      description: description || 'Временная версия для тестирования',
      variables,
      screens: persistedScreens,
      startScreenId: currentScreenId,
      authorUsername: 'You',
    };
    
    localStorage.setItem('miniapp_preview_data', JSON.stringify(previewData));
    window.open('/miniapps/preview', '_blank');
    
    setTimeout(() => setShowCompilationDialog(false), 1500);
  };

  const fetchMiniApp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/miniapps/${editId}`);
      const data = await res.json();
      if (data.miniApp) {
        setName(data.miniApp.name); setDescription(data.miniApp.description); setIsPublic(data.miniApp.isPublic); setVariables(data.miniApp.variables || []);
        const loadedScreens = data.miniApp.screens?.length > 0 ? data.miniApp.screens : [{ id: Math.random().toString(36).substring(7), name: 'Экран 1', components: data.miniApp.components || [], nodes: data.miniApp.nodes || [], edges: data.miniApp.edges || [] }];
        const startId = data.miniApp.startScreenId || loadedScreens[0].id;
        const active = loadedScreens.find((s: any) => s.id === startId) || loadedScreens[0];
        setScreens(loadedScreens); setCurrentScreenId(startId); setComponents(active.components || []);
        setFlowNodes(hydrateFlowNodes(active.nodes || [], active.components || []));
        setFlowEdges(hydrateFlowEdges(active.edges || []));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- Lifecycle ---
  useEffect(() => { if (isEditing && editId) fetchMiniApp(); }, [isEditing, editId]);

  // --- Interaction Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = -e.deltaY > 0 ? 1.05 : 0.95;
    setCanvasScale(prev => Math.min(Math.max(prev * factor, 0.1), 3));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      setCanvasOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = () => setIsPanning(false);

  const handleResizeStart = (e: React.MouseEvent, componentId: string, direction: string) => {
    e.stopPropagation();
    const component = components.find(c => c.id === componentId);
    if (!component) return;
    setResizing({ componentId, direction, startX: e.clientX, startY: e.clientY, startWidth: parseInt(component.props.width) || 100, startHeight: parseInt(component.props.height) || 100 });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      const deltaX = (e.clientX - resizing.startX) / canvasScale;
      const deltaY = (e.clientY - resizing.startY) / canvasScale;
      const newWidth = Math.max(20, resizing.startWidth + (resizing.direction.includes('e') ? deltaX : resizing.direction.includes('w') ? -deltaX : 0));
      const newHeight = Math.max(20, resizing.startHeight + (resizing.direction.includes('s') ? deltaY : resizing.direction.includes('n') ? -deltaY : 0));
      const snappedWidth = Math.round(newWidth / gridSize) * gridSize;
      const snappedHeight = Math.round(newHeight / gridSize) * gridSize;
      const updates: Record<string, any> = {};
      if (resizing.direction.includes('e') || resizing.direction.includes('w')) updates.width = `${Math.max(gridSize, snappedWidth)}px`;
      if (resizing.direction.includes('s') || resizing.direction.includes('n')) updates.height = `${Math.max(gridSize, snappedHeight)}px`;
      updateComponent(resizing.componentId, updates);
    };
    const handleMouseUp = () => setResizing(null);
    if (resizing) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [resizing, components, gridSize, canvasScale]);

  const handleDragStart = (e: React.MouseEvent, componentId: string, isMobile: boolean) => {
    if (resizing) return;
    e.stopPropagation();
    const component = components.find(c => c.id === componentId);
    if (!component) return;
    setDragging({ componentId, startX: e.clientX, startY: e.clientY, startLeft: isMobile ? (component.props.mobileX || 0) : (component.props.desktopX || 0), startTop: isMobile ? (component.props.mobileY || 0) : (component.props.desktopY || 0), isMobile });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const deltaX = (e.clientX - dragging.startX) / canvasScale;
      const deltaY = (e.clientY - dragging.startY) / canvasScale;
      const newLeft = Math.round((dragging.startLeft + deltaX) / gridSize) * gridSize;
      const newTop = Math.round((dragging.startTop + deltaY) / gridSize) * gridSize;
      const updates: any = {};
      if (dragging.isMobile) { updates.mobileX = newLeft; updates.mobileY = newTop; }
      else { updates.desktopX = newLeft; updates.desktopY = newTop; }
      updateComponent(dragging.componentId, updates);
    };
    const handleMouseUp = () => setDragging(null);
    if (dragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [dragging, components, gridSize, canvasScale]);

  // --- Component Management ---
  const updateComponent = (id: string, props: Record<string, any>) => setComponents(components.map((c) => c.id === id ? { ...c, props: { ...c.props, ...props } } : c));
  const removeComponent = (id: string) => { setComponents(components.filter((c) => c.id !== id)); if (selectedComponentId === id) setSelectedComponentId(null); };
  const moveComponent = (index: number, direction: 'up' | 'down') => {
    const next = [...components]; const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((c, i) => (c.order = i)); setComponents(next);
  };
  
  const addVariable = () => setVariables([...variables, { id: Math.random().toString(36).substring(7), name: `variable_${variables.length + 1}`, defaultValue: 0 }]);
  const updateVariable = (id: string, updates: Partial<MiniAppVariable>) => setVariables(variables.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  const removeVariable = (id: string) => setVariables(variables.filter((v) => v.id !== id));
  
  const addNode = (type: string) => {
    const id = Math.random().toString(36).substring(7);
    setFlowNodes((nodes) => [...nodes, { id, type: 'custom', position: { x: 100, y: 100 }, data: { type, nodeId: id, variables, components, screens, componentsRef, variablesRef, screensRef, updateNodeData: handleUpdateNodeData, deleteNode: removeNode } }]);
  };

  const onConnect = useCallback((connection: Connection) => { setFlowEdges((eds) => addEdge(connection, eds)); }, []);

  const getDefaultProps = (type: MiniAppComponentType): Record<string, any> => {
    const base = { desktopX: 50, desktopY: 50, mobileX: 20, mobileY: 20, width: 'auto', height: 'auto' };
    switch (type) {
      case 'button': return { ...base, label: 'Кнопка', variant: 'primary', icon: 'none', backgroundColor: '#00ff00', textColor: '#000000' };
      case 'iconButton': return { ...base, icon: 'plus', width: '48px', height: '48px', backgroundColor: '#00ff00', textColor: '#000000' };
      case 'input': return { ...base, inputType: 'text', variant: 'classic', placeholder: 'Введите текст...', width: '100%', backgroundColor: '#18181b', textColor: '#ffffff' };
      case 'text': return { ...base, content: 'Текст', fontSize: 16, color: '#ffffff', align: 'left' };
      default: return base;
    }
  };

  const addComponent = (type: MiniAppComponentType) => {
    const id = Math.random().toString(36).substring(7);
    const newComp = { id, type, props: getDefaultProps(type), order: components.length };
    setComponents([...components, newComp]); setSelectedComponentId(id);
  };

  const renderComponent = (component: MiniAppComponent) => {
    const { width, height } = component.props;
    switch (component.type) {
      case 'button':
        const iconData = ICONS.find(i => i.name === component.props.icon);
        const IconComponent = iconData?.icon;
        return <button className="w-full h-full p-4 font-bold border-2 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: component.props.backgroundColor, color: component.props.textColor, borderColor: component.props.backgroundColor }}>{IconComponent && <IconComponent className="h-5 w-5" />}{component.props.label}</button>;
      case 'iconButton':
        const iconOnlyData = ICONS.find(i => i.name === component.props.icon);
        const IconOnlyComponent = iconOnlyData?.icon;
        return <button className="rounded-full border-2 transition-all flex items-center justify-center" style={{ width, height, backgroundColor: component.props.backgroundColor, color: component.props.textColor, borderColor: component.props.backgroundColor, minWidth: '40px', minHeight: '40px' }}>{IconOnlyComponent && <IconOnlyComponent className="h-5 w-5" />}</button>;
      case 'input':
        const styles: any = { classic: 'bg-mnr-surface border-2 border-mnr-border', flat: 'bg-mnr-surface border-b-2 border-mnr-border', filled: 'bg-mnr-surface/50 border-none', outline: 'bg-transparent border-2 border-mnr-border' };
        return <input type={component.props.inputType} placeholder={component.props.placeholder} className={cn("w-full p-3 font-bold outline-none transition-all", styles[component.props.variant])} style={{ width, height, backgroundColor: component.props.backgroundColor, color: component.props.textColor }} />;
      case 'text':
        return <div className="font-bold p-2" style={{ width, height, fontSize: `${component.props.fontSize}px`, color: component.props.color, textAlign: component.props.align }}>{component.props.content}</div>;
      case 'image':
        return <div className="border-2 border-mnr-border overflow-hidden" style={{ width, height }}>{component.props.src ? <img src={component.props.src} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-mnr-surface flex items-center justify-center text-mnr-muted text-sm">Изображение</div>}</div>;
      default: return null;
    }
  };

  const ResizeHandle = ({ direction, componentId }: { direction: string; componentId: string }) => {
    const pos: any = { n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize', s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize', e: 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 cursor-e-resize', w: 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-w-resize', ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize', nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize', se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize', sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize' };
    return <div className={cn("absolute w-3 h-3 bg-mnr-accent border-2 border-black z-10", pos[direction])} onMouseDown={(e) => handleResizeStart(e, componentId, direction)} />;
  };

  const ComponentWrapper = ({ component, children, isSelected, isMobile }: any) => {
    const x = isMobile ? component.props.mobileX : component.props.desktopX;
    const y = isMobile ? component.props.mobileY : component.props.desktopY;
    return (
      <div className={cn("absolute block", isSelected && "ring-2 ring-mnr-accent")} style={{ left: x, top: y, width: component.props.width, height: component.props.height, zIndex: isSelected ? 40 : 1 }} onMouseDown={(e) => { e.stopPropagation(); setSelectedComponentId(component.id); handleDragStart(e, component.id, isMobile); }}>
        {children}
        {isSelected && ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(d => <ResizeHandle key={d} direction={d} componentId={component.id} />)}
      </div>
    );
  };

  const selectedComponent = components.find(c => c.id === selectedComponentId);

  // --- Main Render ---
  return (
    <div className={cn("fixed inset-0 flex flex-col font-sans bg-[#0c0c0e] overflow-hidden z-50 transition-all duration-300", sidebarCollapsed ? "md:pl-20" : "md:pl-24 lg:pl-72")}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-mnr-border bg-[#18181b] flex-shrink-0">
        <div className="flex items-center gap-4">
          <FastTransitionLink href="/miniapps/marketplace"><ArrowLeft className="h-6 w-6 text-mnr-text" /></FastTransitionLink>
          <div className="text-[20px] font-bold uppercase text-mnr-text leading-none tracking-[-1px]">{isEditing ? 'РЕДАКТИРОВАНИЕ' : 'СОЗДАНИЕ'} МИНИ-ПРИЛОЖЕНИЯ</div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="h-4 w-4" />
            НАСТРОЙКИ
          </Button>
          <div className="flex border border-mnr-border">
            <button onClick={() => setTab('visual')} className={cn("px-4 py-2 font-bold text-sm border-r border-mnr-border transition-all", tab === 'visual' ? "bg-mnr-accent text-black" : "text-mnr-text hover:bg-mnr-surface")}>ВИЗУАЛ</button>
            <button onClick={() => setTab('nodes')} className={cn("px-4 py-2 font-bold text-sm transition-all", tab === 'nodes' ? "bg-mnr-accent text-black" : "text-mnr-text hover:bg-mnr-surface")}>УЗЛЫ</button>
          </div>
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={saving}>
            <Play className="h-4 w-4" />
            ПРЕДПРОСМОТР
          </Button>
          <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {tab === 'visual' ? (
          <>
            <div className="w-64 bg-[#18181b] border-r border-mnr-border flex flex-col flex-shrink-0 overflow-y-auto">
              <div className="p-4 border-b border-mnr-border flex-shrink-0">
                <div className="flex items-center justify-between mb-3"><div className="text-xs font-bold uppercase text-mnr-muted">Экраны</div><button onClick={addScreen} className="p-1 bg-mnr-accent text-black"><Plus className="h-3 w-3" /></button></div>
                <div className="space-y-1 mb-4 max-h-28 overflow-y-auto">{screens.map((s, i) => <button key={s.id} onClick={() => switchScreen(s.id)} className={cn("w-full text-left p-2 text-xs font-bold border transition-all", currentScreenId === s.id ? "bg-mnr-accent/20 border-mnr-accent" : "bg-mnr-surface border-mnr-border text-mnr-muted")}>{s.name || `Экран ${i + 1}`}</button>)}</div>
                <div className="text-xs font-bold uppercase text-mnr-muted">Слои</div>
              </div>
              <div className="flex-1 p-2 space-y-1">{components.map((c, i) => <div key={c.id} onClick={() => setSelectedComponentId(c.id)} className={cn("p-2 border-2 cursor-pointer transition-all flex items-center justify-between", selectedComponentId === c.id ? "bg-mnr-accent/20 border-mnr-accent" : "bg-mnr-surface border-mnr-border")}><div className="flex items-center gap-2 truncate text-xs font-bold text-mnr-text">{c.type === 'button' ? c.props.label : c.type}</div><div className="flex gap-1"><button onClick={(e) => { e.stopPropagation(); moveComponent(i, 'up'); }} disabled={i === 0} className="text-xs opacity-50 hover:opacity-100 disabled:opacity-10">↑</button><button onClick={(e) => { e.stopPropagation(); moveComponent(i, 'down'); }} disabled={i === components.length - 1} className="text-xs opacity-50 hover:opacity-100 disabled:opacity-10">↓</button></div></div>)}</div>
            </div>
            <div className="flex-1 overflow-hidden bg-[#121214] relative cursor-grab active:cursor-grabbing select-none" onWheel={handleWheel} onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}>
              <div className="absolute inset-0 flex items-start justify-start p-20 pointer-events-none" style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`, transformOrigin: '0 0' }}>
                <div className="flex gap-20 pointer-events-auto">
                  <div className="flex flex-col gap-4">
                    <div className="text-xs font-bold text-mnr-muted uppercase text-center">ПК (16:9)</div>
                    <div className="bg-[#18181b] border-2 border-mnr-border relative shadow-2xl w-[800px] h-[450px]" onMouseDown={() => { setSelectedComponentId(null); setActiveFrame('desktop'); }}>
                      {showGrid && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`, backgroundSize: `${gridSize}px ${gridSize}px` }} />}
                      {components.map(c => <ComponentWrapper key={c.id} component={c} isSelected={selectedComponentId === c.id && activeFrame === 'desktop'} isMobile={false}>{renderComponent(c)}</ComponentWrapper>)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="text-xs font-bold text-mnr-muted uppercase text-center">Мобильный (9:16)</div>
                    <div className="bg-[#18181b] border-2 border-mnr-border relative shadow-2xl w-[360px] h-[640px]" onMouseDown={() => { setSelectedComponentId(null); setActiveFrame('mobile'); }}>
                      {showGrid && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`, backgroundSize: `${gridSize}px ${gridSize}px` }} />}
                      {components.map(c => <ComponentWrapper key={c.id} component={c} isSelected={selectedComponentId === c.id && activeFrame === 'mobile'} isMobile={true}>{renderComponent(c)}</ComponentWrapper>)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-[#18181b] border-2 border-mnr-border p-2 rounded shadow-lg z-10 pointer-events-auto">
                <button onClick={() => setCanvasScale(prev => Math.max(prev - 0.1, 0.1))} className="p-1 hover:text-mnr-accent text-mnr-text"><Minus className="h-4 w-4" /></button>
                <div className="text-xs font-bold text-mnr-text min-w-[50px] text-center">{Math.round(canvasScale * 100)}%</div>
                <button onClick={() => setCanvasScale(prev => Math.min(prev + 0.1, 3))} className="p-1 hover:text-mnr-accent text-mnr-text"><Plus className="h-4 w-4" /></button>
                <div className="w-px h-4 bg-mnr-border mx-1" />
                <button onClick={() => { setCanvasScale(0.8); setCanvasOffset({ x: 0, y: 0 }); }} className="text-[10px] font-bold text-mnr-muted hover:text-mnr-text px-1 uppercase tracking-tight">СБРОС</button>
              </div>
            </div>
            <div className="w-80 bg-[#18181b] border-l border-mnr-border flex flex-col flex-shrink-0 overflow-hidden p-4">
              <div className="text-xs font-bold uppercase text-mnr-muted mb-4 tracking-widest">Свойства</div>
              {selectedComponent ? (
                <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar h-full">
                  <div className="flex items-center justify-between border-b border-mnr-border pb-2"><span className="text-xs font-bold text-mnr-muted uppercase tracking-tight">Тип</span><span className="text-xs font-bold text-mnr-accent uppercase">{selectedComponent.type}</span></div>
                  <div className="flex gap-2"><button onClick={() => setActiveFrame('desktop')} className={cn("flex-1 py-1 text-[10px] font-bold border-2 transition-all", activeFrame === 'desktop' ? "bg-mnr-accent text-black border-mnr-accent" : "bg-mnr-surface text-mnr-muted border-mnr-border hover:border-mnr-accent")}>ПК</button><button onClick={() => setActiveFrame('mobile')} className={cn("flex-1 py-1 text-[10px] font-bold border-2 transition-all", activeFrame === 'mobile' ? "bg-mnr-accent text-black border-mnr-accent" : "bg-mnr-surface text-mnr-muted border-mnr-border hover:border-mnr-accent")}>МОБ</button></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] font-bold text-mnr-muted uppercase">Позиция X</label><input type="number" value={activeFrame === 'desktop' ? selectedComponent.props.desktopX : selectedComponent.props.mobileX} onChange={(e) => updateComponent(selectedComponent.id, { [activeFrame === 'desktop' ? 'desktopX' : 'mobileX']: parseInt(e.target.value) || 0 })} className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none transition-all" /></div>
                    <div><label className="text-[10px] font-bold text-mnr-muted uppercase">Позиция Y</label><input type="number" value={activeFrame === 'desktop' ? selectedComponent.props.desktopY : selectedComponent.props.mobileY} onChange={(e) => updateComponent(selectedComponent.id, { [activeFrame === 'desktop' ? 'desktopY' : 'mobileY']: parseInt(e.target.value) || 0 })} className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none transition-all" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] font-bold text-mnr-muted uppercase">Ширина</label><input type="text" value={selectedComponent.props.width} onChange={(e) => updateComponent(selectedComponent.id, { width: e.target.value })} className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none transition-all" /></div>
                    <div><label className="text-[10px] font-bold text-mnr-muted uppercase">Высота</label><input type="text" value={selectedComponent.props.height} onChange={(e) => updateComponent(selectedComponent.id, { height: e.target.value })} className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none transition-all" /></div>
                  </div>
                  {/* Property Inputs */}
                  {selectedComponent.type === 'button' && (
                    <div><label className="text-[10px] font-bold text-mnr-muted uppercase">Текст</label><input type="text" value={selectedComponent.props.label} onChange={(e) => updateComponent(selectedComponent.id, { label: e.target.value })} className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm outline-none focus:border-mnr-accent transition-all" /></div>
                  )}
                  {selectedComponent.type === 'input' && (
                    <>
                      <div><label className="text-[10px] font-bold text-mnr-muted uppercase">Стиль</label><select value={selectedComponent.props.variant} onChange={(e) => updateComponent(selectedComponent.id, { variant: e.target.value })} className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm outline-none focus:border-mnr-accent transition-all"><option value="classic">Классический</option><option value="flat">Плоский</option><option value="filled">Заливка</option><option value="outline">Контур</option></select></div>
                      <div><label className="text-[10px] font-bold text-mnr-muted uppercase">Тип</label><select value={selectedComponent.props.inputType} onChange={(e) => updateComponent(selectedComponent.id, { inputType: e.target.value })} className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm outline-none focus:border-mnr-accent transition-all"><option value="text">Текст</option><option value="number">Число</option><option value="tel">Телефон</option><option value="password">Пароль</option></select></div>
                    </>
                  )}
                  {selectedComponent.type === 'text' && (
                    <div><label className="text-[10px] font-bold text-mnr-muted uppercase">Содержание</label><textarea value={selectedComponent.props.content} onChange={(e) => updateComponent(selectedComponent.id, { content: e.target.value })} className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm outline-none focus:border-mnr-accent transition-all h-24 resize-none" /></div>
                  )}
                  <button onClick={() => removeComponent(selectedComponent.id)} className="w-full p-2 bg-mnr-error/20 text-mnr-error border border-mnr-error font-bold text-xs hover:bg-mnr-error/30 mt-4 transition-all">УДАЛИТЬ КОМПОНЕНТ</button>
                </div>
              ) : <div className="h-full flex flex-col items-center justify-center text-mnr-muted opacity-50 gap-2"><Layers className="h-10 w-10" /><span className="text-[10px] font-bold uppercase tracking-widest">Выберите компонент</span></div>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-64 bg-[#18181b] border-r border-mnr-border p-4 overflow-y-auto space-y-6">
              <div><div className="text-[10px] font-bold text-mnr-muted uppercase mb-3 tracking-widest">Экраны</div><select value={currentScreenId} onChange={(e) => switchScreen(e.target.value)} className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold outline-none focus:border-mnr-accent transition-all">{screens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-bold text-mnr-muted uppercase mb-2 tracking-widest">События</div>
                  <div className="space-y-2">
                    <button onClick={() => addNode('buttonClick')} className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-left flex items-center gap-2 font-bold text-[10px] hover:border-mnr-accent transition-all">
                      <MousePointer className="h-3 w-3 text-blue-500" /> НАЖАТИЕ
                    </button>
                    <button onClick={() => addNode('onInputChange')} className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-left flex items-center gap-2 font-bold text-[10px] hover:border-mnr-accent transition-all">
                      <Keyboard className="h-3 w-3 text-cyan-500" /> ИЗМЕНЕНИЕ ВВОДА
                    </button>
                  </div>
                </div>
                <div><div className="text-[10px] font-bold text-mnr-muted uppercase mb-2 tracking-widest">Логика</div><div className="space-y-2"><button onClick={() => addNode('ifElse')} className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-left flex items-center gap-2 font-bold text-[10px] hover:border-mnr-accent transition-all"><GitBranch className="h-3 w-3 text-orange-500" /> УСЛОВИЕ</button></div></div>
                <div>
                  <div className="text-[10px] font-bold text-mnr-muted uppercase mb-2 tracking-widest">Утилиты</div>
                  <div className="space-y-2">
                    <button onClick={() => addNode('alert')} className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-left flex items-center gap-2 font-bold text-[10px] hover:border-mnr-accent transition-all">
                      <Type className="h-3 w-3 text-green-500" /> УВЕДОМЛЕНИЕ
                    </button>
                    <button onClick={() => addNode('changeText')} className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-left flex items-center gap-2 font-bold text-[10px] hover:border-mnr-accent transition-all">
                      <Type className="h-3 w-3 text-emerald-500" /> ИЗМЕНИТЬ ТЕКСТ
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-[#0c0c0e] relative">
              <ReactFlow nodes={flowNodes} edges={flowEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={{ custom: CustomNode }} fitView>
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" /><Controls className="!bg-[#18181b] !border-2 !border-mnr-border" />
              </ReactFlow>
            </div>
          </div>
        )}
      </div>

      {showCompilationDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-mnr-surface border border-mnr-border w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-mnr-border flex items-center justify-between font-bold uppercase text-sm tracking-[-1px]">
              <div className="flex items-center gap-3">
                {compiling ? <Loader2 className="h-5 w-5 animate-spin text-mnr-accent" /> : compilationLogs.some(l => l.type === 'error') ? <X className="h-5 w-5 text-mnr-error" /> : <Check className="h-5 w-5 text-mnr-accent" />}
                <span>{compiling ? 'ВЫПОЛНЕНИЕ КОМПИЛЯЦИИ...' : 'РЕЗУЛЬТАТ СБОРКИ'}</span>
              </div>
              {!compiling && <button onClick={() => setShowCompilationDialog(false)} className="text-mnr-muted hover:text-mnr-text transition-colors"><X className="h-5 w-5" /></button>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px] bg-[#0c0c0e]/50 custom-scrollbar">
              {compilationLogs.map((log, i) => (
                <div key={i} className={cn("flex gap-2 items-start py-1 border-b border-mnr-border/5 last:border-none", log.type === 'error' ? "text-mnr-error" : log.type === 'success' ? "text-mnr-accent" : "text-mnr-muted")}>
                  <span className="opacity-40 whitespace-nowrap">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                  <span className="flex-1 leading-relaxed">{log.message}</span>
                </div>
              ))}
            </div>
            {!compiling && compilationLogs.some(l => l.type === 'error') && (
              <div className="px-6 py-4 border-t border-mnr-border flex justify-end">
                <Button variant="danger" size="sm" onClick={() => setShowCompilationDialog(false)}>
                  ИСПРАВИТЬ ОШИБКИ
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog 
        open={showSettingsDialog} 
        onClose={() => setShowSettingsDialog(false)} 
        title="Настройки приложения"
        className="max-w-md"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-mnr-muted uppercase tracking-[1px]">Название</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-mnr-surface-hover border border-mnr-border p-3 text-mnr-text font-bold text-sm focus:border-mnr-accent outline-none transition-all placeholder:opacity-20"
              placeholder="Введите название..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-bold text-mnr-muted uppercase tracking-[1px]">Описание</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-mnr-surface-hover border border-mnr-border p-3 text-mnr-text font-bold text-sm min-h-[100px] focus:border-mnr-accent outline-none transition-all resize-none placeholder:opacity-20"
              placeholder="О чем это приложение?"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-mnr-surface-hover border border-mnr-border hover:border-mnr-accent transition-all cursor-pointer select-none" onClick={() => setIsPublic(!isPublic)}>
            <div className="flex flex-col">
              <span className="text-sm font-bold uppercase tracking-[-0.5px] text-mnr-text">Публичный доступ</span>
              <span className="text-[11px] text-mnr-muted">Видно всем в маркетплейсе</span>
            </div>
            <div className={cn(
              "w-12 h-6 rounded-full transition-all flex items-center px-1 border border-mnr-border",
              isPublic ? "bg-mnr-accent" : "bg-mnr-surface"
            )}>
              <div className={cn(
                "w-4 h-4 rounded-full transition-all shadow-sm",
                isPublic ? "translate-x-6 bg-black" : "translate-x-0 bg-mnr-muted"
              )} />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="ghost" className="flex-1" onClick={() => setShowSettingsDialog(false)}>
              ОТМЕНА
            </Button>
            <Button variant="default" className="flex-1" onClick={() => setShowSettingsDialog(false)}>
              ПРИМЕНИТЬ
            </Button>
          </div>
        </div>
      </Dialog>

      {tab === 'visual' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#18181b] border-2 border-mnr-border shadow-2xl rounded-lg p-2 z-50 overflow-x-auto w-[500px] flex gap-2 no-scrollbar">
          <button onClick={() => addComponent('button')} className="flex items-center gap-2 px-3 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold text-[10px] hover:border-mnr-accent transition-all whitespace-nowrap"><Square className="h-3 w-3" /> КНОПКА</button>
          <button onClick={() => addComponent('input')} className="flex items-center gap-2 px-3 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold text-[10px] hover:border-mnr-accent transition-all whitespace-nowrap"><Keyboard className="h-3 w-3" /> ВВОД</button>
          <button onClick={() => addComponent('text')} className="flex items-center gap-2 px-3 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold text-[10px] hover:border-mnr-accent transition-all whitespace-nowrap"><Type className="h-3 w-3" /> ТЕКСТ</button>
          <button onClick={() => addComponent('image')} className="flex items-center gap-2 px-3 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold text-[10px] hover:border-mnr-accent transition-all whitespace-nowrap"><Image className="h-3 w-3" /> ИМИДЖ</button>
          <button onClick={() => addComponent('iconButton')} className="flex items-center gap-2 px-3 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold text-[10px] hover:border-mnr-accent transition-all whitespace-nowrap"><Circle className="h-3 w-3" /> ИКОНКА</button>
        </div>
      )}
    </div>
  );
}
