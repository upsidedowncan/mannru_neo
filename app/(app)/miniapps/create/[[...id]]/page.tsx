'use client';

import { useState, useEffect, use, useCallback, useRef } from 'react';
import { Trash2, Save, ArrowLeft, ArrowRight, Type, Square, Minus, Layers, Grid3x3, Plus, X, Hash, DollarSign, TrendingUp, TrendingDown, Settings, MousePointer, ArrowUp, ArrowDown, FileText, Calculator, Image, Keyboard, ToggleRight, Sliders, CreditCard, Divide as DivideIcon, User, Award, Clock, Shuffle, ExternalLink, FolderOpen, Save as SaveIcon, GitBranch, Scale, Play, Pause, RotateCcw } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { FastTransitionLink } from '@/components/fast-transition-link';
import { Combobox } from '@/components/ui/combobox';
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
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from '@/components/nodes/CustomNode';

type MiniAppComponentType = 'button' | 'text' | 'spacer' | 'grid' | 'image' | 'input' | 'counter' | 'progress' | 'toggle' | 'slider' | 'card' | 'divider' | 'avatar' | 'badge';

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

interface CustomNodeData {
  type: string;
  componentId?: string;
  variableId?: string;
  amount?: number | string;
  value?: number | string;
  operation?: string;
  variables?: Array<{ id: string; name: string }>;
  components?: Array<{ id: string; type: string; props: { label: string } }>;
  screens?: Array<{ id: string; name: string }>;
  updateNodeData?: (nodeId: string, data: any) => void;
  deleteNode?: (nodeId: string) => void;
  nodeId: string;
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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [components, setComponents] = useState<MiniAppComponent[]>([]);
  const [screens, setScreens] = useState<MiniAppScreen[]>([initialScreen]);
  const [currentScreenId, setCurrentScreenId] = useState(initialScreen.id);
  const [variables, setVariables] = useState<MiniAppVariable[]>([]);
  
  // React Flow state
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [tab, setTab] = useState<'visual' | 'nodes'>('visual');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [resizing, setResizing] = useState<{ componentId: string; direction: string; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  const [dragging, setDragging] = useState<{ componentId: string; startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10);

  const toOldNodes = useCallback((nodes: Node[]) => {
    return nodes.map((node) => ({
      id: node.id,
      type: (node.data as any)?.type,
      x: node.position.x,
      y: node.position.y,
      data: node.data,
    }));
  }, []);

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
  }, [variables]);

  const hydrateFlowEdges = useCallback((storedEdges: any[]) => {
    return (storedEdges || []).map((edge: any) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      sourceHandle: edge.sourcePortId,
      targetHandle: edge.targetPortId,
    }));
  }, []);

  const syncCurrentScreen = useCallback((nextComponents: MiniAppComponent[] = components, nextNodes: Node[] = flowNodes, nextEdges: Edge[] = flowEdges) => {
    setScreens((prev) =>
      prev.map((screen) =>
        screen.id === currentScreenId
          ? {
              ...screen,
              components: nextComponents,
              nodes: toOldNodes(nextNodes),
              edges: toOldEdges(nextEdges),
            }
          : screen
      )
    );
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
    const newScreen: MiniAppScreen = {
      id: Math.random().toString(36).substring(7),
      name: `Экран ${screens.length + 1}`,
      components: [],
      nodes: [],
      edges: [],
    };

    setScreens((prev) => [...prev, newScreen]);
    setCurrentScreenId(newScreen.id);
    setComponents([]);
    setFlowNodes([]);
    setFlowEdges([]);
    setSelectedComponentId(null);
  };

  const removeCurrentScreen = () => {
    if (screens.length <= 1) return;

    const currentIndex = screens.findIndex((s) => s.id === currentScreenId);
    if (currentIndex === -1) return;

    const remaining = screens.filter((s) => s.id !== currentScreenId);
    const fallback = remaining[Math.max(0, currentIndex - 1)] || remaining[0];

    setScreens(remaining);
    setCurrentScreenId(fallback.id);
    setComponents(fallback.components || []);
    setFlowNodes(hydrateFlowNodes(fallback.nodes || [], fallback.components || []));
    setFlowEdges(hydrateFlowEdges(fallback.edges || []));
    setSelectedComponentId(null);
  };

  const goToPreviousScreen = () => {
    const index = screens.findIndex((s) => s.id === currentScreenId);
    if (index > 0) {
      switchScreen(screens[index - 1].id);
    }
  };

  const goToNextScreen = () => {
    const index = screens.findIndex((s) => s.id === currentScreenId);
    if (index >= 0 && index < screens.length - 1) {
      switchScreen(screens[index + 1].id);
    }
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, componentId: string, direction: string) => {
    e.stopPropagation();
    const component = components.find(c => c.id === componentId);
    if (!component) return;

    const element = e.currentTarget.parentElement;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const width = component.props.width === 'auto' ? rect.width : parseInt(component.props.width as string) || rect.width;
    const height = component.props.height === 'auto' ? rect.height : parseInt(component.props.height as string) || rect.height;

    setResizing({
      componentId,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: width,
      startHeight: height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;

      const deltaX = e.clientX - resizing.startX;
      const deltaY = e.clientY - resizing.startY;

      let newWidth = resizing.startWidth;
      let newHeight = resizing.startHeight;

      if (resizing.direction.includes('e')) {
        newWidth = Math.max(50, resizing.startWidth + deltaX);
      }
      if (resizing.direction.includes('w')) {
        newWidth = Math.max(50, resizing.startWidth - deltaX);
      }
      if (resizing.direction.includes('s')) {
        newHeight = Math.max(30, resizing.startHeight + deltaY);
      }
      if (resizing.direction.includes('n')) {
        newHeight = Math.max(30, resizing.startHeight - deltaY);
      }

      // Snap to grid
      const snappedWidth = Math.round(newWidth / gridSize) * gridSize;
      const snappedHeight = Math.round(newHeight / gridSize) * gridSize;

      updateComponent(resizing.componentId, {
        width: `${snappedWidth}px`,
        height: `${snappedHeight}px`,
      });
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, components, gridSize]);

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent, componentId: string) => {
    if (resizing) return;
    e.stopPropagation();
    const component = components.find(c => c.id === componentId);
    if (!component) return;

    setDragging({
      componentId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: component.props.x || 0,
      startTop: component.props.y || 0,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;

      const deltaX = e.clientX - dragging.startX;
      const deltaY = e.clientY - dragging.startY;

      const newLeft = dragging.startLeft + deltaX;
      const newTop = dragging.startTop + deltaY;

      // Snap to grid
      const snappedX = Math.round(newLeft / gridSize) * gridSize;
      const snappedY = Math.round(newTop / gridSize) * gridSize;

      updateComponent(dragging.componentId, {
        x: snappedX,
        y: snappedY,
      });
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, components, gridSize]);

  // Use refs to store current components and variables for nodes to access
  const componentsRef = useRef(components);
  const variablesRef = useRef(variables);
  const screensRef = useRef(screens);

  useEffect(() => {
    componentsRef.current = components;
  }, [components]);

  useEffect(() => {
    variablesRef.current = variables;
  }, [variables]);

  useEffect(() => {
    screensRef.current = screens;
  }, [screens]);
  useEffect(() => {
    const loadSidebarState = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved !== null) {
        setSidebarCollapsed(JSON.parse(saved));
      }
    };
    
    loadSidebarState();
    
    // Listen for changes from the sidebar
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed') {
        setSidebarCollapsed(JSON.parse(e.newValue || 'false'));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event (for same-tab updates)
    const handleCustomEvent = () => {
      loadSidebarState();
    };
    window.addEventListener('sidebarCollapsed', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sidebarCollapsed', handleCustomEvent);
    };
  }, []);

  useEffect(() => {
    if (isEditing && editId) {
      fetchMiniApp();
    }
  }, [isEditing, editId]);

  const handleUpdateNodeData = (nodeId: string, data: any) => {
    let didUpdate = false;
    setFlowNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          didUpdate = true;
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      })
    );

    if (!didUpdate) {
      console.warn('[MiniApp] Node update miss', {
        nodeId,
        data,
      });
    }
  };

  const fetchMiniApp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/miniapps/${editId}`);
      const data = await res.json();
      if (data.miniApp) {
        setName(data.miniApp.name);
        setDescription(data.miniApp.description);
        setIsPublic(data.miniApp.isPublic);
        setVariables(data.miniApp.variables || []);

        const loadedScreens: MiniAppScreen[] = (data.miniApp.screens && data.miniApp.screens.length > 0)
          ? data.miniApp.screens
          : [
              {
                id: Math.random().toString(36).substring(7),
                name: 'Экран 1',
                components: data.miniApp.components || [],
                nodes: data.miniApp.nodes || [],
                edges: data.miniApp.edges || [],
              },
            ];

        const startScreenId =
          data.miniApp.startScreenId && loadedScreens.some((s) => s.id === data.miniApp.startScreenId)
            ? data.miniApp.startScreenId
            : loadedScreens[0].id;

        const activeScreen = loadedScreens.find((s) => s.id === startScreenId) || loadedScreens[0];

        setScreens(loadedScreens);
        setCurrentScreenId(startScreenId);
        setComponents(activeScreen.components || []);
        setFlowNodes(hydrateFlowNodes(activeScreen.nodes || [], activeScreen.components || []));
        setFlowEdges(hydrateFlowEdges(activeScreen.edges || []));
      }
    } catch (error) {
      console.error('Failed to fetch miniapp:', error);
    } finally {
      setLoading(false);
    }
  };

  const addComponent = (type: MiniAppComponentType) => {
    const newComponent: MiniAppComponent = {
      id: Math.random().toString(36).substring(7),
      type,
      props: getDefaultProps(type),
      order: components.length,
    };
    setComponents([...components, newComponent]);
    setSelectedComponentId(newComponent.id);
  };

  const getDefaultProps = (type: MiniAppComponentType): Record<string, any> => {
    const baseProps = {
      x: 0,
      y: 0,
      width: 'auto',
      height: 'auto',
    };

    switch (type) {
      case 'button':
        return {
          ...baseProps,
          label: 'Кнопка',
          action: 'addMoney',
          amount: 100,
          variant: 'primary',
          icon: 'none',
          silent: false,
          backgroundColor: '#00ff00',
          textColor: '#000000',
        };
      case 'text':
        return {
          ...baseProps,
          content: 'Текст',
          size: 'medium',
          align: 'left',
          showVariable: false,
          variableId: '',
          variableFormat: '{value}',
          fontSize: 16,
          fontFamily: 'sans-serif',
          color: '#ffffff',
        };
      case 'spacer':
        return {
          ...baseProps,
          height: 20,
          width: '100%',
        };
      case 'grid':
        return {
          ...baseProps,
          columns: 2,
          gap: 8,
          cellComponents: [], // Array of component IDs for each cell
          width: '100%',
          height: 'auto',
        };
      case 'image':
        return {
          ...baseProps,
          src: '',
          alt: '',
          objectFit: 'cover',
          width: '100%',
          height: 'auto',
        };
      case 'input':
        return {
          ...baseProps,
          inputType: 'text',
          placeholder: '',
          width: '100%',
          height: 'auto',
        };
      case 'counter':
        return {
          ...baseProps,
          value: 0,
          width: 'auto',
          height: 'auto',
        };
      case 'progress':
        return {
          ...baseProps,
          value: 50,
          width: '100%',
          height: 'auto',
        };
      case 'toggle':
        return {
          ...baseProps,
          value: false,
          width: 'auto',
          height: 'auto',
        };
      case 'slider':
        return {
          ...baseProps,
          min: 0,
          max: 100,
          value: 50,
          width: '100%',
          height: 'auto',
        };
      case 'card':
        return {
          ...baseProps,
          title: '',
          content: '',
          width: '100%',
          height: 'auto',
        };
      case 'divider':
        return {
          ...baseProps,
          width: '100%',
          height: 'auto',
        };
      case 'avatar':
        return {
          ...baseProps,
          src: '',
          initials: '?',
          width: 'auto',
          height: 'auto',
        };
      case 'badge':
        return {
          ...baseProps,
          text: 'Badge',
          variant: 'primary',
          width: 'auto',
          height: 'auto',
        };
      default:
        return baseProps;
    }
  };

  const updateComponent = (id: string, props: Record<string, any>) => {
    setComponents(
      components.map((c) => (c.id === id ? { ...c, props: { ...c.props, ...props } } : c))
    );
  };

  const removeComponent = (id: string) => {
    setComponents(components.filter((c) => c.id !== id));
    if (selectedComponentId === id) setSelectedComponentId(null);
  };

  const moveComponent = (index: number, direction: 'up' | 'down') => {
    const newComponents = [...components];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newComponents.length) return;
    
    [newComponents[index], newComponents[targetIndex]] = [newComponents[targetIndex], newComponents[index]];
    
    newComponents.forEach((c, i) => (c.order = i));
    setComponents(newComponents);
  };

  const addVariable = () => {
    const newVar: MiniAppVariable = {
      id: Math.random().toString(36).substring(7),
      name: `variable_${variables.length + 1}`,
      defaultValue: 0,
    };
    setVariables([...variables, newVar]);
  };

  const updateVariable = (id: string, updates: Partial<MiniAppVariable>) => {
    setVariables(variables.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter((v) => v.id !== id));
  };

  // Node editor functions
  const addNode = (type: string) => {
    const newNodeId = Math.random().toString(36).substring(7);
    const newNode: Node = {
      id: newNodeId,
      type: 'custom',
      position: { x: 100, y: 100 },
      data: {
        type,
        nodeId: newNodeId,
        variables,
        components,
        screens,
        componentsRef,
        variablesRef,
        screensRef,
        updateNodeData: handleUpdateNodeData,
        deleteNode: removeNode,
      },
    };
    setFlowNodes((nodes) => [...nodes, newNode]);
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

  const removeNode = (id: string) => {
    setFlowNodes((nodes) => nodes.filter((n) => n.id !== id));
    setFlowEdges((edges) => edges.filter((e) => e.source !== id && e.target !== id));
  };

  const onConnect = useCallback((connection: Connection) => {
    setFlowEdges((eds) => addEdge(connection, eds));
  }, []);

  const handleSave = async () => {
    if (!name || !description) {
      alert('Пожалуйста, заполните название и описание');
    }

    setSaving(true);
    try {
      const oldNodes = toOldNodes(flowNodes);
      const oldEdges = toOldEdges(flowEdges);

      const persistedScreens = screens.map((screen) =>
        screen.id === currentScreenId
          ? {
              ...screen,
              components,
              nodes: oldNodes,
              edges: oldEdges,
            }
          : screen
      );

      const mainScreen = persistedScreens[0];

      const url = isEditing ? `/api/miniapps/${editId}` : '/api/miniapps';
      const method = isEditing ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          components: mainScreen?.components || components,
          variables,
          nodes: mainScreen?.nodes || oldNodes,
          edges: mainScreen?.edges || oldEdges,
          screens: persistedScreens,
          startScreenId: currentScreenId,
          isPublic,
        }),
      });

      if (res.ok) {
        router.push('/miniapps/marketplace');
      } else {
        alert('Ошибка при сохранении');
      }
    } catch (error) {
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const renderComponent = (component: MiniAppComponent) => {
    const width = component.props.width !== 'auto' ? component.props.width : '100%';
    const height = component.props.height !== 'auto' ? component.props.height : 'auto';

    switch (component.type) {
      case 'button':
        const IconComponent = ICONS.find((i) => i.name === component.props.icon)?.icon;
        return (
          <button
            className={cn(
              'w-full p-4 font-bold border-2 transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
            )}
            style={{ 
              width, 
              height,
              backgroundColor: component.props.backgroundColor,
              color: component.props.textColor,
              borderColor: component.props.backgroundColor,
            }}
          >
            {IconComponent && <IconComponent className="h-5 w-5" />}
            {component.props.label}
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
        return (
          <div
            className={cn(
              'font-bold p-2 border-2 border-transparent',
              alignClasses[component.props.align as keyof typeof alignClasses]
            )}
            style={{ 
              width, 
              height,
              fontSize: `${component.props.fontSize}px`,
              fontFamily: component.props.fontFamily,
              color: component.props.color,
            }}
          >
            {component.props.content}
          </div>
        );
      case 'image':
        return (
          <div
            className="border-2 border-mnr-border overflow-hidden"
            style={{ width, height }}
          >
            {component.props.src ? (
              <img
                src={component.props.src}
                alt={component.props.alt || ''}
                className="w-full h-full"
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
            style={{ width, height }}
          />
        );
      case 'counter':
        return (
          <div
            className="flex items-center gap-2 bg-mnr-surface border-2 border-mnr-border p-2"
            style={{ width, height }}
          >
            <button className="w-8 h-8 bg-mnr-accent text-black font-bold border-2 border-black">-</button>
            <span className="font-bold text-mnr-text text-xl">{component.props.value || 0}</span>
            <button className="w-8 h-8 bg-mnr-accent text-black font-bold border-2 border-black">+</button>
          </div>
        );
      case 'progress':
        return (
          <div style={{ width, height }}>
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
          <div
            className={cn(
              'relative w-12 h-6 transition-colors',
              component.props.value ? 'bg-mnr-accent' : 'bg-mnr-surface border-2 border-mnr-border'
            )}
            style={{ width, height }}
          >
            <div
              className={cn(
                'absolute top-1 w-4 h-4 bg-black transition-all',
                component.props.value ? 'left-7' : 'left-1'
              )}
            />
          </div>
        );
      case 'slider':
        return (
          <input
            type="range"
            min={component.props.min || 0}
            max={component.props.max || 100}
            value={component.props.value || 50}
            onChange={(e) => updateComponent(component.id, { value: parseInt(e.target.value) || 50 })}
            className="w-full accent-mnr-accent"
            style={{ width, height }}
          />
        );
      case 'card':
        return (
          <div
            className="bg-mnr-surface border-2 border-mnr-border p-4"
            style={{ width, height }}
          >
            {component.props.title && (
              <div className="font-bold text-mnr-text mb-2">{component.props.title}</div>
            )}
            {component.props.content && (
              <div className="text-mnr-muted text-sm">{component.props.content}</div>
            )}
          </div>
        );
      case 'divider':
        return (
          <div
            className="w-full h-px bg-mnr-border"
            style={{ width, height }}
          />
        );
      case 'avatar':
        return (
          <div
            className="rounded-full bg-mnr-surface border-2 border-mnr-border flex items-center justify-center overflow-hidden"
            style={{ width: height || '48px', height: height || '48px' }}
          >
            {component.props.src ? (
              <img src={component.props.src} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-mnr-muted font-bold">{component.props.initials || '?'}</span>
            )}
          </div>
        );
      case 'badge':
        return (
          <div
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2',
              component.props.variant === 'primary'
                ? 'bg-mnr-accent text-black border-mnr-accent'
                : 'bg-mnr-surface text-mnr-text border-mnr-border'
            )}
            style={{ width, height }}
          >
            {component.props.text || 'Badge'}
          </div>
        );
      case 'spacer':
        return (
          <div
            className="border-2 border-dashed border-mnr-border/30"
            style={{ width, height: component.props.height }}
          />
        );
      case 'grid':
        return (
          <div
            className="grid gap-2 border-2 border-dashed border-mnr-border/30 p-2"
            style={{ 
              width,
              height,
              gridTemplateColumns: `repeat(${component.props.columns}, 1fr)`,
              gap: `${component.props.gap}px`
            }}
          >
            {Array.from({ length: component.props.columns }).map((_, i) => {
              const cellComponentId = (component.props.cellComponents || [])[i];
              const cellComponent = components.find(c => c.id === cellComponentId);
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

  const selectedComponent = components.find((c) => c.id === selectedComponentId);

  // Resize handle component
  const ResizeHandle = ({ direction, componentId }: { direction: string; componentId: string }) => {
    const positions: Record<string, string> = {
      'n': 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize',
      's': 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize',
      'e': 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 cursor-e-resize',
      'w': 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-w-resize',
      'ne': 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize',
      'nw': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize',
      'se': 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize',
      'sw': 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize',
    };

    return (
      <div
        className={`absolute w-3 h-3 bg-mnr-accent border-2 border-black z-10 ${positions[direction]}`}
        onMouseDown={(e) => handleResizeStart(e, componentId, direction)}
      />
    );
  };

  // Wrapper component with resize handles
  const ComponentWrapper = ({ component, children, isSelected }: { component: MiniAppComponent; children: React.ReactNode; isSelected: boolean }) => {
    const width = component.props.width !== 'auto' ? component.props.width : 'auto';
    const height = component.props.height !== 'auto' ? component.props.height : 'auto';
    const x = component.props.x || 0;
    const y = component.props.y || 0;

    return (
      <div
        className={cn('absolute inline-block', isSelected ? 'ring-2 ring-mnr-accent ring-offset-2 ring-offset-[#0c0c0e]' : '')}
        style={{ left: x, top: y, width, height }}
        onMouseDown={(e) => {
          e.stopPropagation();
          setSelectedComponentId(component.id);
          handleDragStart(e, component.id);
        }}
      >
        {children}
        {isSelected && (
          <>
            <ResizeHandle direction="n" componentId={component.id} />
            <ResizeHandle direction="s" componentId={component.id} />
            <ResizeHandle direction="e" componentId={component.id} />
            <ResizeHandle direction="w" componentId={component.id} />
            <ResizeHandle direction="ne" componentId={component.id} />
            <ResizeHandle direction="nw" componentId={component.id} />
            <ResizeHandle direction="se" componentId={component.id} />
            <ResizeHandle direction="sw" componentId={component.id} />
          </>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "fixed inset-0 flex flex-col font-sans bg-[#0c0c0e] overflow-hidden z-50 transition-all duration-300",
      sidebarCollapsed ? "md:pl-20" : "md:pl-24 lg:pl-72"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4 border-b border-mnr-border bg-[#18181b] flex-shrink-0">
        <div className="flex items-center gap-4">
          <FastTransitionLink href="/miniapps/marketplace">
            <ArrowLeft className="h-6 w-6 text-mnr-text" />
          </FastTransitionLink>
          <div className="text-[20px] font-bold tracking-[-1px] uppercase text-mnr-text">
            {isEditing ? 'РЕДАКТИРОВАНИЕ' : 'СОЗДАНИЕ'} МИНИ-ПРИЛОЖЕНИЯ
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex border-4 border-mnr-border rounded-none">
            <button
              onClick={() => setTab('visual')}
              className={cn(
                'px-4 py-2 font-bold text-sm transition-all border-r-4 last:border-r-0',
                tab === 'visual'
                  ? 'bg-mnr-accent text-black border-mnr-accent shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-mnr-surface text-mnr-text hover:text-mnr-accent border-mnr-border'
              )}
            >
              Визуальный
            </button>
            <button
              onClick={() => setTab('nodes')}
              className={cn(
                'px-4 py-2 font-bold text-sm transition-all',
                tab === 'nodes'
                  ? 'bg-mnr-accent text-black border-mnr-accent shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-mnr-surface text-mnr-text hover:text-mnr-accent border-mnr-border'
              )}
            >
              Узлы
            </button>
          </div>
          {tab === 'visual' && (
            <div className="flex items-center gap-2 border-4 border-mnr-border rounded-none px-2">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={cn(
                  'p-2 font-bold text-sm transition-all',
                  showGrid
                    ? 'bg-mnr-accent text-black'
                    : 'bg-mnr-surface text-mnr-text hover:text-mnr-accent'
                )}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              {showGrid && (
                <select
                  value={gridSize}
                  onChange={(e) => setGridSize(parseInt(e.target.value))}
                  className="bg-mnr-surface text-mnr-text text-sm focus:border-mnr-accent outline-none"
                >
                  <option value="5">5px</option>
                  <option value="10">10px</option>
                  <option value="20">20px</option>
                  <option value="50">50px</option>
                </select>
              )}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-mnr-accent text-black border-4 border-mnr-accent font-bold transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {tab === 'visual' ? (
          <>
            {/* Left Panel - Layers */}
            <div className="w-64 bg-[#18181b] border-r border-mnr-border flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-mnr-border flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted">
                    Экраны
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={addScreen}
                      className="p-1 bg-mnr-accent text-black hover:bg-mnr-accent/80 transition-all"
                      title="Добавить экран"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={removeCurrentScreen}
                      disabled={screens.length <= 1}
                      className="p-1 bg-mnr-error/20 text-mnr-error hover:bg-mnr-error/30 transition-all disabled:opacity-40"
                      title="Удалить текущий экран"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 mb-4 max-h-28 overflow-y-auto">
                  {screens.map((screen, index) => (
                    <button
                      key={screen.id}
                      onClick={() => switchScreen(screen.id)}
                      className={cn(
                        'w-full text-left p-2 text-xs font-bold border transition-all',
                        currentScreenId === screen.id
                          ? 'bg-mnr-accent/20 border-mnr-accent text-mnr-text'
                          : 'bg-mnr-surface border-mnr-border text-mnr-muted hover:border-mnr-accent'
                      )}
                    >
                      {screen.name || `Экран ${index + 1}`}
                    </button>
                  ))}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted">
                  Слои
                </div>
              </div>
              <div className="flex-1 p-2 overflow-y-auto space-y-1">
                {components.map((component, index) => (
                  <div
                    key={component.id}
                    onClick={() => setSelectedComponentId(component.id)}
                    className={cn(
                      'p-2 border-2 cursor-pointer transition-all flex items-center justify-between',
                      selectedComponentId === component.id
                        ? 'bg-mnr-accent/20 border-mnr-accent'
                        : 'bg-mnr-surface border-mnr-border hover:border-mnr-accent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {component.type === 'button' && <Square className="h-4 w-4 text-mnr-muted" />}
                      {component.type === 'text' && <Type className="h-4 w-4 text-mnr-muted" />}
                      {component.type === 'spacer' && <Minus className="h-4 w-4 text-mnr-muted" />}
                      {component.type === 'grid' && <Grid3x3 className="h-4 w-4 text-mnr-muted" />}
                      <span className="text-xs font-bold text-mnr-text truncate">
                        {component.type === 'button' ? component.props.label : component.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveComponent(index, 'up');
                        }}
                        disabled={index === 0}
                        className="p-1 text-mnr-text hover:text-mnr-accent disabled:opacity-30 text-xs"
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveComponent(index, 'down');
                        }}
                        disabled={index === components.length - 1}
                        className="p-1 text-mnr-text hover:text-mnr-accent disabled:opacity-30 text-xs"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Center - Canvas */}
            <div className="flex-1 overflow-y-auto">
              <div
                className="w-full bg-[#18181b] border-2 border-mnr-border p-6 h-full relative"
                style={{ minHeight: '1000px' }}
                onClick={(e) => {
                  setSelectedComponentId(null);
                }}
              >
                {showGrid && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
                      `,
                      backgroundSize: `${gridSize}px ${gridSize}px`,
                    }}
                  />
                )}
                {components.length === 0 ? (
                  <div className="text-center py-24 text-mnr-muted">
                    <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-bold">Пустой холст</p>
                    <p className="text-sm mt-2">Добавьте компоненты из панели снизу</p>
                  </div>
                ) : (
                  components.map((component) => (
                    <ComponentWrapper
                      key={component.id}
                      component={component}
                      isSelected={selectedComponentId === component.id}
                    >
                      {renderComponent(component)}
                    </ComponentWrapper>
                  ))
                )}
              </div>
            </div>

            {/* Right Panel - Properties */}
            <div className="w-80 bg-[#18181b] border-l border-mnr-border flex flex-col flex-shrink-0 overflow-hidden">
              <div className="p-4 border-b border-mnr-border flex-shrink-0">
                <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted mb-4">
                  Основное
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-mnr-muted mb-1">Название</label>
                    <input
                      type="text"
                      value={name || ''}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none transition-all"
                      placeholder="Название"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-mnr-muted mb-1">Описание</label>
                    <textarea
                      value={description || ''}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none transition-all resize-none"
                      rows={2}
                      placeholder="Описание"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="public"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 accent-mnr-accent"
                    />
                    <label htmlFor="public" className="text-xs font-bold text-mnr-text">
                      Опубликовать
                    </label>
                  </div>
                </div>
              </div>

              {/* Variables Section */}
              <div className="p-4 border-b border-mnr-border flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted">
                    Переменные
                  </div>
                  <button
                    onClick={addVariable}
                    className="p-1 bg-mnr-accent text-black hover:bg-mnr-accent/80 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {variables.map((variable) => (
                    <div key={variable.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={variable.name}
                        onChange={(e) => updateVariable(variable.id, { name: e.target.value })}
                        className="flex-1 p-1 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs focus:border-mnr-accent outline-none"
                      />
                      <input
                        type="number"
                        value={variable.defaultValue}
                        onChange={(e) => updateVariable(variable.id, { defaultValue: parseInt(e.target.value) || 0 })}
                        className="w-16 p-1 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs focus:border-mnr-accent outline-none"
                      />
                      <button
                        onClick={() => removeVariable(variable.id)}
                        className="p-1 text-mnr-error hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {variables.length === 0 && (
                    <div className="text-xs text-mnr-muted text-center py-2">Нет переменных</div>
                  )}
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted mb-4">
                  Свойства
                </div>
            {selectedComponent ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-mnr-muted">Тип</span>
                  <span className="text-xs font-bold text-mnr-accent uppercase">{selectedComponent.type}</span>
                </div>

                {/* Position controls */}
                <div>
                  <label className="block text-xs font-bold text-mnr-muted mb-1">Позиция X</label>
                  <input
                    type="number"
                    value={selectedComponent.props.x || 0}
                    onChange={(e) => updateComponent(selectedComponent.id, { x: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-mnr-muted mb-1">Позиция Y</label>
                  <input
                    type="number"
                    value={selectedComponent.props.y || 0}
                    onChange={(e) => updateComponent(selectedComponent.id, { y: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                  />
                </div>

                {/* Width/Height controls */}
                <div>
                  <label className="block text-xs font-bold text-mnr-muted mb-1">Ширина</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedComponent.props.width === 'auto' ? 'auto' : 'custom'}
                      onChange={(e) => updateComponent(selectedComponent.id, { width: e.target.value === 'auto' ? 'auto' : selectedComponent.props.width })}
                      className="flex-1 p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                    >
                      <option value="auto">Авто</option>
                      <option value="custom">Задать</option>
                    </select>
                    {selectedComponent.props.width !== 'auto' && (
                      <input
                        type="text"
                        value={selectedComponent.props.width || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, { width: e.target.value })}
                        className="w-20 p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                        placeholder="100px"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-mnr-muted mb-1">Высота</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedComponent.props.height === 'auto' ? 'auto' : 'custom'}
                      onChange={(e) => updateComponent(selectedComponent.id, { height: e.target.value === 'auto' ? 'auto' : selectedComponent.props.height })}
                      className="flex-1 p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                    >
                      <option value="auto">Авто</option>
                      <option value="custom">Задать</option>
                    </select>
                    {selectedComponent.props.height !== 'auto' && (
                      <input
                        type="text"
                        value={selectedComponent.props.height || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, { height: e.target.value })}
                        className="w-20 p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                        placeholder="100px"
                      />
                    )}
                  </div>
                </div>

                {selectedComponent.type === 'button' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Текст</label>
                      <input
                        type="text"
                        value={selectedComponent.props.label || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, { label: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Иконка</label>
                      <div className="relative">
                        <button
                          onClick={() => setShowIconPicker(!showIconPicker)}
                          className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none flex items-center gap-2"
                        >
                          {ICONS.find((i) => i.name === selectedComponent.props.icon)?.label || 'Без иконки'}
                        </button>
                        {showIconPicker && (
                          <div className="absolute z-10 w-full mt-1 bg-[#18181b] border border-mnr-border p-2 grid grid-cols-4 gap-2">
                            {ICONS.map((icon) => {
                              const IconComponent = icon.icon;
                              return (
                                <button
                                  key={icon.name}
                                  onClick={() => {
                                    updateComponent(selectedComponent.id, { icon: icon.name });
                                    setShowIconPicker(false);
                                  }}
                                  className={cn(
                                    'p-2 border-2 flex items-center justify-center',
                                    selectedComponent.props.icon === icon.name
                                      ? 'bg-mnr-accent/20 border-mnr-accent'
                                      : 'bg-mnr-surface border-mnr-border hover:border-mnr-accent'
                                  )}
                                >
                                  {IconComponent ? <IconComponent className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Цвет фона</label>
                      <input
                        type="color"
                        value={selectedComponent.props.backgroundColor || '#00ff00'}
                        onChange={(e) => updateComponent(selectedComponent.id, { backgroundColor: e.target.value })}
                        className="w-full h-10 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Цвет текста</label>
                      <input
                        type="color"
                        value={selectedComponent.props.textColor || '#000000'}
                        onChange={(e) => updateComponent(selectedComponent.id, { textColor: e.target.value })}
                        className="w-full h-10 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="silent"
                        checked={selectedComponent.props.silent || false}
                        onChange={(e) => updateComponent(selectedComponent.id, { silent: e.target.checked })}
                        className="w-4 h-4 accent-mnr-accent"
                      />
                      <label htmlFor="silent" className="text-xs font-bold text-mnr-text">
                        Тихий режим (без уведомлений)
                      </label>
                    </div>
                  </>
                )}

                {selectedComponent.type === 'text' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Содержание</label>
                      <textarea
                        value={selectedComponent.props.content || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, { content: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none resize-none"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Размер шрифта (px)</label>
                      <input
                        type="number"
                        value={selectedComponent.props.fontSize || 16}
                        onChange={(e) => updateComponent(selectedComponent.id, { fontSize: parseInt(e.target.value) || 16 })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                        min="8"
                        max="72"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Шрифт</label>
                      <select
                        value={selectedComponent.props.fontFamily || 'sans-serif'}
                        onChange={(e) => updateComponent(selectedComponent.id, { fontFamily: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      >
                        <option value="sans-serif">Sans-serif</option>
                        <option value="serif">Serif</option>
                        <option value="monospace">Monospace</option>
                        <option value="cursive">Cursive</option>
                        <option value="fantasy">Fantasy</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Цвет</label>
                      <input
                        type="color"
                        value={selectedComponent.props.color || '#ffffff'}
                        onChange={(e) => updateComponent(selectedComponent.id, { color: e.target.value })}
                        className="w-full h-10 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showVariable"
                        checked={selectedComponent.props.showVariable || false}
                        onChange={(e) => updateComponent(selectedComponent.id, { showVariable: e.target.checked })}
                        className="w-4 h-4 accent-mnr-accent"
                      />
                      <label htmlFor="showVariable" className="text-xs font-bold text-mnr-text">
                        Показывать переменную
                      </label>
                    </div>
                    {selectedComponent.props.showVariable && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-mnr-muted mb-1">Переменная</label>
                          <select
                            value={selectedComponent.props.variableId || ''}
                            onChange={(e) => updateComponent(selectedComponent.id, { variableId: e.target.value })}
                            className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                          >
                            <option value="">Выберите переменную</option>
                            {variables.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-mnr-muted mb-1">Формат (используйте {'{value}'})</label>
                          <input
                            type="text"
                            value={selectedComponent.props.variableFormat || '{value}'}
                            onChange={(e) => updateComponent(selectedComponent.id, { variableFormat: e.target.value })}
                            className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                            placeholder="{value} МР"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Размер</label>
                      <select
                        value={selectedComponent.props.size || 'medium'}
                        onChange={(e) => updateComponent(selectedComponent.id, { size: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      >
                        <option value="small">Маленький</option>
                        <option value="medium">Средний</option>
                        <option value="large">Большой</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Выравнивание</label>
                      <select
                        value={selectedComponent.props.align || 'left'}
                        onChange={(e) => updateComponent(selectedComponent.id, { align: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      >
                        <option value="left">Слева</option>
                        <option value="center">По центру</option>
                        <option value="right">Справа</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedComponent.type === 'image' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">URL изображения</label>
                      <input
                        type="text"
                        value={selectedComponent.props.src || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, { src: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Альтернативный текст</label>
                      <input
                        type="text"
                        value={selectedComponent.props.alt || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, { alt: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Объект подгонки</label>
                      <select
                        value={selectedComponent.props.objectFit || 'cover'}
                        onChange={(e) => updateComponent(selectedComponent.id, { objectFit: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      >
                        <option value="cover">Заполнить</option>
                        <option value="contain">Вместить</option>
                        <option value="stretch">Растянуть</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedComponent.type === 'input' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Тип ввода</label>
                      <select
                        value={selectedComponent.props.inputType || 'text'}
                        onChange={(e) => updateComponent(selectedComponent.id, { inputType: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      >
                        <option value="text">Текст</option>
                        <option value="number">Число</option>
                        <option value="email">Email</option>
                        <option value="password">Пароль</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Заполнитель</label>
                      <input
                        type="text"
                        value={selectedComponent.props.placeholder || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, { placeholder: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                  </>
                )}

                {selectedComponent.type === 'counter' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Начальное значение</label>
                      <input
                        type="number"
                        value={selectedComponent.props.value || 0}
                        onChange={(e) => updateComponent(selectedComponent.id, { value: parseInt(e.target.value) || 0 })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                  </>
                )}

                {selectedComponent.type === 'progress' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Значение (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={selectedComponent.props.value || 0}
                        onChange={(e) => updateComponent(selectedComponent.id, { value: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                  </>
                )}

                {selectedComponent.type === 'toggle' && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="toggleValue"
                        checked={selectedComponent.props.value || false}
                        onChange={(e) => updateComponent(selectedComponent.id, { value: e.target.checked })}
                        className="w-4 h-4 accent-mnr-accent"
                      />
                      <label htmlFor="toggleValue" className="text-xs font-bold text-mnr-text">
                        Включено
                      </label>
                    </div>
                  </>
                )}

                {selectedComponent.type === 'slider' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Минимум</label>
                      <input
                        type="number"
                        value={selectedComponent.props.min || 0}
                        onChange={(e) => updateComponent(selectedComponent.id, { min: parseInt(e.target.value) || 0 })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Максимум</label>
                      <input
                        type="number"
                        value={selectedComponent.props.max || 100}
                        onChange={(e) => updateComponent(selectedComponent.id, { max: parseInt(e.target.value) || 100 })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Значение</label>
                      <input
                        type="number"
                        value={selectedComponent.props.value || 50}
                        onChange={(e) => updateComponent(selectedComponent.id, { value: parseInt(e.target.value) || 50 })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                  </>
                )}

                {selectedComponent.type === 'card' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Заголовок</label>
                      <input
                        type="text"
                        value={selectedComponent.props.title || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, { title: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Содержание</label>
                      <textarea
                        value={selectedComponent.props.content || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, { content: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none resize-none"
                        rows={3}
                      />
                    </div>
                  </>
                )}

                {selectedComponent.type === 'avatar' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">URL изображения</label>
                      <input
                        type="text"
                        value={selectedComponent.props.src || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, { src: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Инициалы (если нет изображения)</label>
                      <input
                        type="text"
                        value={selectedComponent.props.initials || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, { initials: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                        placeholder="AB"
                        maxLength={2}
                      />
                    </div>
                  </>
                )}

                {selectedComponent.type === 'badge' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Текст</label>
                      <input
                        type="text"
                        value={selectedComponent.props.text || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, { text: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Стиль</label>
                      <select
                        value={selectedComponent.props.variant || 'primary'}
                        onChange={(e) => updateComponent(selectedComponent.id, { variant: e.target.value })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      >
                        <option value="primary">Основной</option>
                        <option value="secondary">Вторичный</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedComponent.type === 'spacer' && (
                  <div>
                    <label className="block text-xs font-bold text-mnr-muted mb-1">Высота (px)</label>
                    <input
                      type="number"
                      value={selectedComponent.props.height ?? 20}
                      onChange={(e) => updateComponent(selectedComponent.id, { height: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                    />
                  </div>
                )}

                {selectedComponent.type === 'grid' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Колонки</label>
                      <select
                        value={selectedComponent.props.columns ?? 2}
                        onChange={(e) => {
                          const newColumns = parseInt(e.target.value);
                          const currentCellComponents = selectedComponent.props.cellComponents || [];
                          const newCellComponents = Array.from({ length: newColumns }, (_, i) => 
                            currentCellComponents[i] || null
                          );
                          updateComponent(selectedComponent.id, { columns: newColumns, cellComponents: newCellComponents });
                        }}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-1">Отступ (px)</label>
                      <input
                        type="number"
                        value={selectedComponent.props.gap ?? 8}
                        onChange={(e) => updateComponent(selectedComponent.id, { gap: parseInt(e.target.value) || 0 })}
                        className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-sm focus:border-mnr-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-mnr-muted mb-2">Компоненты в ячейках</label>
                      <div className="space-y-2">
                        {Array.from({ length: selectedComponent.props.columns || 2 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-mnr-muted w-16">Ячейка {i + 1}:</span>
                            <select
                              value={(selectedComponent.props.cellComponents || [])[i] || ''}
                              onChange={(e) => {
                                const newCellComponents = [...(selectedComponent.props.cellComponents || [])];
                                newCellComponents[i] = e.target.value || null;
                                updateComponent(selectedComponent.id, { cellComponents: newCellComponents });
                              }}
                              className="flex-1 p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs focus:border-mnr-accent outline-none"
                            >
                              <option value="">Пусто</option>
                              {components
                                .filter(c => c.id !== selectedComponent.id)
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.type === 'button' ? c.props.label : c.type}
                                  </option>
                                ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <button
                  onClick={() => removeComponent(selectedComponent.id)}
                  className="w-full p-2 bg-mnr-error/20 text-mnr-error border border-mnr-error font-bold text-sm hover:bg-mnr-error/30 transition-all mt-4"
                >
                  Удалить компонент
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-mnr-muted">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold">Выберите компонент</p>
              </div>
            )}
          </div>
        </div>
          </>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Node Palette */}
            <div className="w-64 bg-[#18181b] border-r border-mnr-border flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-mnr-border flex-shrink-0 overflow-y-auto max-h-[calc(100vh-200px)]">
                <div className="mb-4 border-b border-mnr-border pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted">Экраны</div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={goToPreviousScreen}
                        disabled={screens.findIndex((s) => s.id === currentScreenId) <= 0}
                        className="p-1 bg-mnr-surface border border-mnr-border text-mnr-text hover:border-mnr-accent disabled:opacity-30"
                        title="Предыдущий экран"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </button>
                      <button
                        onClick={goToNextScreen}
                        disabled={screens.findIndex((s) => s.id === currentScreenId) >= screens.length - 1}
                        className="p-1 bg-mnr-surface border border-mnr-border text-mnr-text hover:border-mnr-accent disabled:opacity-30"
                        title="Следующий экран"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <select
                    value={currentScreenId}
                    onChange={(e) => switchScreen(e.target.value)}
                    className="w-full p-2 bg-[#0c0c0e] border border-mnr-border text-mnr-text text-xs font-bold focus:border-mnr-accent outline-none"
                  >
                    {screens.map((screen, index) => (
                      <option key={screen.id} value={screen.id}>
                        {screen.name || `Экран ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted mb-4">
                  Узлы
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted mb-2">События</div>
                  <button
                    onClick={() => addNode('buttonClick')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <MousePointer className="h-4 w-4" />
                    Нажатие кнопки
                  </button>
                  <button
                    onClick={() => addNode('onInputChange')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <Keyboard className="h-4 w-4" />
                    Изменение ввода
                  </button>
                  <button
                    onClick={() => addNode('onToggleChange')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <ToggleRight className="h-4 w-4" />
                    Изменение переключателя
                  </button>
                  <button
                    onClick={() => addNode('onSliderChange')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <Sliders className="h-4 w-4" />
                    Изменение слайдера
                  </button>
                  
                  <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted mb-2 mt-4">Переменные</div>
                  <button
                    onClick={() => addNode('incrementVar')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <ArrowUp className="h-4 w-4" />
                    Увеличить переменную
                  </button>
                  <button
                    onClick={() => addNode('decrementVar')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <ArrowDown className="h-4 w-4" />
                    Уменьшить переменную
                  </button>
                  <button
                    onClick={() => addNode('setVar')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Установить переменную
                  </button>
                  <button
                    onClick={() => addNode('math')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <Calculator className="h-4 w-4" />
                    Математика
                  </button>
                  
                  <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted mb-2 mt-4">Логика</div>
                  <button
                    onClick={() => addNode('ifElse')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <GitBranch className="h-4 w-4" />
                    Условие (если/иначе)
                  </button>
                  <button
                    onClick={() => addNode('compare')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <Scale className="h-4 w-4" />
                    Сравнить значения
                  </button>
                  <button
                    onClick={() => addNode('loop')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Цикл
                  </button>
                  
                  <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted mb-2 mt-4">Утилиты</div>
                  <button
                    onClick={() => addNode('delay')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Задержка
                  </button>
                  <button
                    onClick={() => addNode('random')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <Shuffle className="h-4 w-4" />
                    Случайное число
                  </button>
                  <button
                    onClick={() => addNode('textManipulation')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <Type className="h-4 w-4" />
                    Текстовые операции
                  </button>
                  
                  <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted mb-2 mt-4">Хранилище</div>
                  <button
                    onClick={() => addNode('saveToStorage')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <SaveIcon className="h-4 w-4" />
                    Сохранить в хранилище
                  </button>
                  <button
                    onClick={() => addNode('loadFromStorage')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Загрузить из хранилища
                  </button>
                  
                  <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted mb-2 mt-4">Навигация</div>
                  <button
                    onClick={() => addNode('navigate')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Навигация
                  </button>
                  <button
                    onClick={() => addNode('navigateScreen')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Перейти на экран
                  </button>
                  <button
                    onClick={() => addNode('openLink')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Открыть ссылку
                  </button>
                  
                  <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted mb-2 mt-4">Деньги</div>
                  <button
                    onClick={() => addNode('addMoney')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    Добавить деньги
                  </button>
                  <button
                    onClick={() => addNode('removeMoney')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <TrendingDown className="h-4 w-4" />
                    Убрать деньги
                  </button>
                  
                  <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted mb-2 mt-4">Мультимедиа</div>
                  <button
                    onClick={() => addNode('playSound')}
                    className="w-full p-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text text-xs font-bold hover:border-mnr-accent transition-all text-left flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Воспроизвести звук
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                <div className="text-xs font-bold uppercase tracking-widest text-mnr-muted mb-4">
                  Связи
                </div>
                <div className="space-y-2 text-xs text-mnr-muted">
                  <p>Перетащите узлы на холст</p>
                  <p>Связи будут добавлены позже</p>
                </div>
              </div>
            </div>

            {/* React Flow Canvas */}
            <div className="flex-1 bg-[#0c0c0e] relative">
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                className="bg-[#0c0c0e]"
                nodeTypes={{
                  custom: CustomNode,
                }}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
                <Controls className="!bg-[#18181b] !border-2 !border-mnr-border" />
                <MiniMap 
                  className="!bg-[#18181b] !border-2 !border-mnr-border"
                  nodeColor="#6366f1"
                  maskColor="rgba(0, 0, 0, 0.5)"
                />
              </ReactFlow>
            </div>
          </div>
        )}
      </div>

      {/* Floating Toolbar - only show in visual tab */}
      {tab === 'visual' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#18181b] border-2 border-mnr-border shadow-2xl rounded-lg p-2 z-50">
          <div className="flex items-center gap-2 overflow-x-auto w-[500px] scrollbar-hide">
            <button
              onClick={() => addComponent('button')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <Square className="h-4 w-4" />
              Кнопка
            </button>
            <button
              onClick={() => addComponent('text')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <Type className="h-4 w-4" />
              Текст
            </button>
            <button
              onClick={() => addComponent('image')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <Image className="h-4 w-4" />
              Изображение
            </button>
            <button
              onClick={() => addComponent('input')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <Keyboard className="h-4 w-4" />
              Ввод
            </button>
            <button
              onClick={() => addComponent('counter')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Счетчик
            </button>
            <button
              onClick={() => addComponent('progress')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <Minus className="h-4 w-4" />
              Прогресс
            </button>
            <button
              onClick={() => addComponent('toggle')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <ToggleRight className="h-4 w-4" />
              Переключатель
            </button>
            <button
              onClick={() => addComponent('slider')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <Sliders className="h-4 w-4" />
              Слайдер
            </button>
            <button
              onClick={() => addComponent('card')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <CreditCard className="h-4 w-4" />
              Карточка
            </button>
            <button
              onClick={() => addComponent('divider')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <DivideIcon className="h-4 w-4" />
              Разделитель
            </button>
            <button
              onClick={() => addComponent('avatar')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <User className="h-4 w-4" />
              Аватар
            </button>
            <button
              onClick={() => addComponent('badge')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <Award className="h-4 w-4" />
              Значок
            </button>
            <button
              onClick={() => addComponent('grid')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <Grid3x3 className="h-4 w-4" />
              Сетка
            </button>
            <button
              onClick={() => addComponent('spacer')}
              className="flex items-center gap-2 px-4 py-2 bg-mnr-surface border-2 border-mnr-border text-mnr-text font-bold hover:border-mnr-accent transition-all rounded whitespace-nowrap"
            >
              <Minus className="h-4 w-4" />
              Отступ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
