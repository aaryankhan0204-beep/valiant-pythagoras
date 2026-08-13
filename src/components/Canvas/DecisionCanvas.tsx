import React, { useState, useRef, useEffect } from 'react';
import { 
  MousePointer, 
  Hand,
  Type, 
  StickyNote, 
  Image as ImageIcon, 
  PenTool, 
  ZoomIn, 
  ZoomOut, 
  Plus,
  X,
  Undo,
  Redo,
  Eraser,
  Square,
  ArrowRight,
  Edit2,
  Copy,
  Trash2,
  Lock,
  Move,
  Sparkles,
  HelpCircle,
  MapPin
} from 'lucide-react';
import type { BoardState, ArgumentCard as ArgumentCardType, ClassificationType, StanceType, EvidenceItem } from '../../types/decision';
import { ArgumentCard } from './ArgumentCard';
import { defaultGeminiService } from '../../services/gemini';

interface DecisionCanvasProps {
  board: BoardState;
  onUpdateBoard: (newBoard: BoardState) => void;
  onOpenEvidence: (evidence: EvidenceItem) => void;
  theme: 'blackboard' | 'whiteboard';
  onOpenAiAnalyst?: () => void;
}

export type ToolType = 'select' | 'hand' | 'sticky' | 'text' | 'image' | 'pen' | 'eraser' | 'shape' | 'arrow' | 'comment';

interface RemoteCursor {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

export const DecisionCanvas: React.FC<DecisionCanvasProps> = ({
  board,
  onUpdateBoard,
  onOpenEvidence,
  theme,
  onOpenAiAnalyst
}) => {
  // Zoom & Pan State (Centered Initial Position)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    const initialCenterX = Math.max(20, (window.innerWidth - 1200) / 2);
    return { x: initialCenterX, y: 40 };
  });

  // Active Tool & Goodnotes Pen Customization State
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [penColor, setPenColor] = useState<string>('#0284c7');
  const [penThickness, setPenThickness] = useState<number>(4);

  // Multi-Shape Selector State
  const [selectedShapeType, setSelectedShapeType] = useState<'rect' | 'circle' | 'diamond' | 'container'>('rect');
  const [showShapeMenu, setShowShapeMenu] = useState(false);

  // Realtime Remote Cursors State
  const [remoteCursors, setRemoteCursors] = useState<{ [userId: string]: RemoteCursor }>({});
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const currentUserIdRef = useRef<string>('user-' + Math.floor(Math.random() * 1000));

  // Undo / Redo History Stack State
  const [history, setHistory] = useState<BoardState[]>([board]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Mouse Panning & Marquee Selection State
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isSelectingBox, setIsSelectingBox] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  // Dragging Card State
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Arrow Curve Control Point Dragging State
  const [draggingArrowControlId, setDraggingArrowControlId] = useState<string | null>(null);

  // Freehand Pen Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPenPoints, setCurrentPenPoints] = useState<{ x: number; y: number }[]>([]);

  // Arrow Drawing State
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const [arrowStartPos, setArrowStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [arrowEndPos, setArrowEndPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Inline Mini Text Input Modal State
  const [showInlineTextModal, setShowInlineTextModal] = useState(false);
  const [inlineTextPos, setInlineTextPos] = useState<{ x: number; y: number }>({ x: 200, y: 200 });
  const [inlineTextValue, setInlineTextValue] = useState('');

  // Add Sticky Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(board.scenarios[0]?.id || '');
  
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newClassification, setNewClassification] = useState<ClassificationType>('Fact');
  const [newStance, setNewStance] = useState<StanceType>('Support');
  const [stickyColor, setStickyColor] = useState<string>('sticky-yellow');

  // Note Inline Edit Modal State
  const [editingCard, setEditingCard] = useState<ArgumentCardType | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editClassification, setEditClassification] = useState<ClassificationType>('Fact');
  const [editStance, setEditStance] = useState<StanceType>('Support');
  const [editColor, setEditColor] = useState('sticky-yellow');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // BroadcastChannel Multi-User Realtime Listener
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('valiant_decision_sync');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === 'CURSOR_MOVE' && data.userId !== currentUserIdRef.current) {
          setRemoteCursors((prev) => ({
            ...prev,
            [data.userId]: data
          }));
        } else if (type === 'BOARD_UPDATE') {
          onUpdateBoard(data);
        }
      };

      return () => {
        channel.close();
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in environment', e);
    }
  }, []);

  // Broadcast local cursor position
  const broadcastCursorMove = (x: number, y: number) => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'CURSOR_MOVE',
        data: {
          userId: currentUserIdRef.current,
          name: 'Collaborator',
          color: '#4f46e5',
          x,
          y
        }
      });
    }
  };

  // Push board state to History Stack & Broadcast to Collaborators
  const commitBoardState = (newBoard: BoardState) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    setHistory([...updatedHistory, newBoard]);
    setHistoryIndex(updatedHistory.length);
    onUpdateBoard(newBoard);

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'BOARD_UPDATE',
        data: newBoard
      });
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateBoard(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateBoard(next);
    }
  };

  // Keyboard Shortcuts (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Exact Mouse Canvas Coordinates matching cursor tip
  const getCanvasCoords = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom
    };
  };

  // --- Mouse Canvas Event Handlers ---
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    // EXPANDED ERASER TOOL HIT REACH (25px radius reach around cursor)
    if (activeTool === 'eraser') {
      const erasedCards = board.cards.filter((card) => {
        if (card.cardType === 'drawing' && card.penPoints) {
          return card.penPoints.some((p) => Math.hypot(p.x - coords.x, p.y - coords.y) < 25);
        }
        if (card.cardType === 'arrow' && card.arrowStart && card.arrowEnd) {
          const midX = (card.arrowStart.x + card.arrowEnd.x) / 2;
          const midY = (card.arrowStart.y + card.arrowEnd.y) / 2;
          return Math.hypot(midX - coords.x, midY - coords.y) < 30;
        }
        const noteW = card.width || 240;
        const noteH = card.height || 160;
        return (
          coords.x >= card.x - 10 &&
          coords.x <= card.x + noteW + 10 &&
          coords.y >= card.y - 10 &&
          coords.y <= card.y + noteH + 10
        );
      });

      if (erasedCards.length > 0) {
        e.stopPropagation();
        const erasedIds = erasedCards.map((c) => c.id);
        commitBoardState({
          ...board,
          cards: board.cards.filter((c) => !erasedIds.includes(c.id))
        });
        return;
      }
    }

    if (activeTool === 'hand' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (activeTool === 'select') {
      const isBgClick = (e.target as HTMLElement).classList.contains('canvas-bg');
      if (isBgClick) {
        setIsSelectingBox(true);
        setSelectionStart(coords);
        setSelectionBox({ x: coords.x, y: coords.y, width: 0, height: 0 });
        setSelectedCardIds([]);
      }
      return;
    }

    if (activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentPenPoints([coords]);
      return;
    }

    if (activeTool === 'arrow') {
      setIsDrawingArrow(true);
      setArrowStartPos(coords);
      setArrowEndPos(coords);
      return;
    }

    if (activeTool === 'shape') {
      const newCard: ArgumentCardType = {
        id: 'shape-' + Date.now(),
        title: '',
        content: '',
        classification: 'Fact',
        stance: 'Neutral',
        scenarioId: board.scenarios[0]?.id || '',
        x: coords.x,
        y: coords.y,
        width: 200,
        height: 140,
        author: 'Host User',
        isAnonymous: false,
        cardType: 'shape',
        shapeType: selectedShapeType,
        color: 'rgba(79, 70, 229, 0.12)',
        upvotes: 0,
        downvotes: 0,
        createdAt: 'Just now'
      };
      commitBoardState({ ...board, cards: [...board.cards, newCard] });
      setActiveTool('select');
      setShowShapeMenu(false);
      return;
    }

    if (activeTool === 'text') {
      setInlineTextPos(coords);
      setInlineTextValue('');
      setShowInlineTextModal(true);
      return;
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    broadcastCursorMove(coords.x, coords.y);

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    // Dragging Arrow Bezier Control Dot
    if (draggingArrowControlId) {
      const updatedCards = board.cards.map((c) => {
        if (c.id === draggingArrowControlId) {
          return {
            ...c,
            arrowControl: coords
          };
        }
        return c;
      });
      onUpdateBoard({ ...board, cards: updatedCards });
      return;
    }

    // Marquee Selection Box
    if (isSelectingBox && selectionStart) {
      const x = Math.min(selectionStart.x, coords.x);
      const y = Math.min(selectionStart.y, coords.y);
      const width = Math.abs(coords.x - selectionStart.x);
      const height = Math.abs(coords.y - selectionStart.y);
      setSelectionBox({ x, y, width, height });

      const enclosedIds = board.cards
        .filter((c) => c.x >= x && c.x <= x + width && c.y >= y && c.y <= y + height)
        .map((c) => c.id);

      setSelectedCardIds(enclosedIds);
      return;
    }

    // Real-Time Freehand Pen Stroke Drawing
    if (isDrawing) {
      setCurrentPenPoints((prev) => [...prev, coords]);
      return;
    }

    // Real-Time Arrow Drawing
    if (isDrawingArrow) {
      setArrowEndPos(coords);
      return;
    }

    // Dragging Cards
    if (draggingCardId && activeTool === 'select') {
      const updatedCards = board.cards.map((c) => {
        if (c.id !== draggingCardId && !selectedCardIds.includes(c.id)) return c;
        if (c.isLocked) return c;

        if (c.id === draggingCardId) {
          return {
            ...c,
            x: Math.max(10, coords.x - dragOffset.x),
            y: Math.max(10, coords.y - dragOffset.y)
          };
        }
        return c;
      });
      onUpdateBoard({ ...board, cards: updatedCards });
    }
  };

  const handleMouseUpCanvas = () => {
    setIsPanning(false);
    setIsSelectingBox(false);

    if (draggingArrowControlId) {
      commitBoardState(board);
      setDraggingArrowControlId(null);
    }

    if (isDrawing) {
      if (currentPenPoints.length > 2) {
        const p1 = currentPenPoints[0];
        const p2 = currentPenPoints[currentPenPoints.length - 1];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

        if (dist > 5) {
          const newCard: ArgumentCardType = {
            id: 'pen-' + Date.now(),
            title: 'Pen Drawing',
            content: '',
            classification: 'Fact',
            stance: 'Neutral',
            scenarioId: board.scenarios[0]?.id || '',
            x: currentPenPoints[0].x,
            y: currentPenPoints[0].y,
            author: 'Host User',
            isAnonymous: false,
            cardType: 'drawing',
            penPoints: currentPenPoints,
            penColor,
            penThickness,
            upvotes: 0,
            downvotes: 0,
            createdAt: 'Just now'
          };
          commitBoardState({ ...board, cards: [...board.cards, newCard] });
        }
      }
      setIsDrawing(false);
      setCurrentPenPoints([]);
    }

    if (isDrawingArrow) {
      const dist = Math.hypot(arrowEndPos.x - arrowStartPos.x, arrowEndPos.y - arrowStartPos.y);
      if (dist > 10) {
        const midX = (arrowStartPos.x + arrowEndPos.x) / 2;
        const midY = (arrowStartPos.y + arrowEndPos.y) / 2 - 40;

        const newCard: ArgumentCardType = {
          id: 'arrow-' + Date.now(),
          title: 'Connector Arrow',
          content: '',
          classification: 'Fact',
          stance: 'Neutral',
          scenarioId: board.scenarios[0]?.id || '',
          x: arrowStartPos.x,
          y: arrowStartPos.y,
          author: 'Host User',
          isAnonymous: false,
          cardType: 'arrow',
          arrowStart: arrowStartPos,
          arrowEnd: arrowEndPos,
          arrowControl: { x: midX, y: midY },
          upvotes: 0,
          downvotes: 0,
          createdAt: 'Just now'
        };
        commitBoardState({ ...board, cards: [...board.cards, newCard] });
      }
      setIsDrawingArrow(false);
    }

    setDraggingCardId(null);
  };

  const handleWheelCanvas = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.02 : 0.98;
      setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.3), 2.5));
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX * 0.7,
        y: prev.y - e.deltaY * 0.7
      }));
    }
  };

  const handleCardMouseDown = (e: React.MouseEvent, card: ArgumentCardType) => {
    if (activeTool === 'eraser') {
      e.stopPropagation();
      handleDeleteCard(card.id);
      return;
    }

    if (activeTool === 'hand') return;
    e.stopPropagation();

    if (!selectedCardIds.includes(card.id)) {
      setSelectedCardIds([card.id]);
    }

    setDraggingCardId(card.id);
    const coords = getCanvasCoords(e);
    setDragOffset({
      x: coords.x - card.x,
      y: coords.y - card.y
    });
  };

  // MULTI-ACTION TOOLBAR HANDLERS FOR SELECTOR (Duplicate / Copy, Lock, Delete)
  const handleDuplicateSelected = () => {
    if (selectedCardIds.length === 0) return;
    const itemsToClone = board.cards.filter((c) => selectedCardIds.includes(c.id));
    const clonedItems: ArgumentCardType[] = itemsToClone.map((item) => ({
      ...item,
      id: `${item.cardType || 'card'}-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      x: item.x + 30,
      y: item.y + 30,
      penPoints: item.penPoints ? item.penPoints.map((p) => ({ x: p.x + 30, y: p.y + 30 })) : undefined,
      arrowStart: item.arrowStart ? { x: item.arrowStart.x + 30, y: item.arrowStart.y + 30 } : undefined,
      arrowEnd: item.arrowEnd ? { x: item.arrowEnd.x + 30, y: item.arrowEnd.y + 30 } : undefined,
      arrowControl: item.arrowControl ? { x: item.arrowControl.x + 30, y: item.arrowControl.y + 30 } : undefined
    }));

    commitBoardState({
      ...board,
      cards: [...board.cards, ...clonedItems]
    });
    setSelectedCardIds(clonedItems.map((c) => c.id));
  };

  const handleToggleLockSelected = () => {
    if (selectedCardIds.length === 0) return;
    const updatedCards = board.cards.map((c) => {
      if (selectedCardIds.includes(c.id)) {
        return { ...c, isLocked: !c.isLocked };
      }
      return c;
    });
    commitBoardState({ ...board, cards: updatedCards });
  };

  const handleDeleteSelected = () => {
    if (selectedCardIds.length === 0) return;
    commitBoardState({
      ...board,
      cards: board.cards.filter((c) => !selectedCardIds.includes(c.id))
    });
    setSelectedCardIds([]);
  };

  const handleOpenEditCard = (card: ArgumentCardType) => {
    setEditingCard(card);
    setEditTitle(card.title);
    setEditContent(card.content);
    setEditClassification(card.classification);
    setEditStance(card.stance);
    setEditColor(card.color || 'sticky-yellow');
  };

  const handleSaveEditCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard || !editTitle.trim()) return;

    const updatedCards = board.cards.map((c) => {
      if (c.id !== editingCard.id) return c;
      return {
        ...c,
        title: editTitle.trim(),
        content: editContent.trim(),
        classification: editClassification,
        stance: editStance,
        color: editColor
      };
    });

    commitBoardState({ ...board, cards: updatedCards });
    setEditingCard(null);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const newCard: ArgumentCardType = {
          id: 'img-' + Date.now(),
          title: file.name,
          content: 'Uploaded Image Evidence',
          classification: 'Fact',
          stance: 'Support',
          scenarioId: selectedScenarioId || board.scenarios[0]?.id || '',
          x: 400,
          y: 220,
          author: 'Host User',
          isAnonymous: false,
          cardType: 'image',
          imageUrl: dataUrl,
          upvotes: 1,
          downvotes: 0,
          createdAt: 'Just now'
        };
        commitBoardState({ ...board, cards: [...board.cards, newCard] });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateMiniText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTextValue.trim()) return;

    const newCard: ArgumentCardType = {
      id: 'text-' + Date.now(),
      title: inlineTextValue.trim(),
      content: '',
      classification: 'Fact',
      stance: 'Neutral',
      scenarioId: board.scenarios[0]?.id || '',
      x: inlineTextPos.x,
      y: inlineTextPos.y,
      author: 'Host User',
      isAnonymous: false,
      cardType: 'text',
      fontSize: 'md',
      textAlign: 'left',
      upvotes: 0,
      downvotes: 0,
      createdAt: 'Just now'
    };
    commitBoardState({ ...board, cards: [...board.cards, newCard] });
    setShowInlineTextModal(false);
    setInlineTextValue('');
    setActiveTool('select');
  };

  const [generatingScenarioId, setGeneratingScenarioId] = useState<string | null>(null);

  const handleGeminiAutoGenerateNotes = async (scenarioId: string) => {
    setGeneratingScenarioId(scenarioId);
    try {
      const generatedNotes = await defaultGeminiService.generateArgumentsForScenario(board, scenarioId);
      if (generatedNotes && generatedNotes.length > 0) {
        const targetScenario = board.scenarios.find((s) => s.id === scenarioId) || board.scenarios[0];
        const scenIndex = board.scenarios.findIndex((s) => s.id === targetScenario.id);
        const numScens = Math.max(board.scenarios.length, 1);
        const is1vs1 = numScens === 2;
        const columnWidth = is1vs1 ? 580 : 420;
        const noteWidth = 280;
        const baseX = 80 + scenIndex * (columnWidth + 32) + (columnWidth - noteWidth) / 2;
        const existingInScen = board.cards.filter((c) => c.scenarioId === targetScenario.id).length;

        const newCards: ArgumentCardType[] = generatedNotes.map((gn, idx) => ({
          id: `ai-note-${Date.now()}-${idx}`,
          title: gn.title || 'Gemini AI Insight',
          content: gn.content || 'Generated analytical contribution',
          classification: gn.classification || 'Suggestion',
          stance: gn.stance || 'Support',
          scenarioId,
          x: baseX,
          y: 210 + (existingInScen + idx) * 200,
          width: noteWidth,
          height: 180,
          author: 'Gemini AI',
          isAnonymous: false,
          cardType: 'sticky',
          color: gn.color || 'sticky-blue',
          isLocked: false,
          upvotes: 2,
          downvotes: 0,
          createdAt: 'Just now'
        }));

        commitBoardState({ ...board, cards: [...board.cards, ...newCards] });
      }
    } finally {
      setGeneratingScenarioId(null);
    }
  };

  const handleCreateElement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const targetScenario = board.scenarios.find((s) => s.id === selectedScenarioId) || board.scenarios[0];
    const scenIndex = board.scenarios.findIndex((s) => s.id === targetScenario.id);

    const numScens = Math.max(board.scenarios.length, 1);
    const is1vs1 = numScens === 2;
    const columnWidth = is1vs1 ? 580 : 420;
    const noteWidth = 280;

    const baseX = 80 + scenIndex * (columnWidth + 32) + (columnWidth - noteWidth) / 2;
    const existingInScen = board.cards.filter((c) => c.scenarioId === targetScenario.id).length;
    const baseY = 210 + existingInScen * 200;

    const newCard: ArgumentCardType = {
      id: 'card-' + Date.now(),
      title: newTitle.trim(),
      content: newContent.trim(),
      classification: newClassification,
      stance: newStance,
      scenarioId: targetScenario.id,
      x: baseX,
      y: baseY,
      width: noteWidth,
      height: 180,
      author: 'Host User',
      isAnonymous: false,
      cardType: 'sticky',
      color: stickyColor,
      isLocked: false,
      upvotes: 1,
      downvotes: 0,
      createdAt: 'Just now'
    };

    commitBoardState({ ...board, cards: [...board.cards, newCard] });

    setNewTitle('');
    setNewContent('');
    setShowAddModal(false);
  };

  const handleResizeCard = (cardId: string, width: number, height: number) => {
    const updatedCards = board.cards.map((c) => c.id === cardId ? { ...c, width, height } : c);
    onUpdateBoard({ ...board, cards: updatedCards });
  };

  const handleUpdateTextProps = (cardId: string, props: Partial<ArgumentCardType>) => {
    const updatedCards = board.cards.map((c) => c.id === cardId ? { ...c, ...props } : c);
    commitBoardState({ ...board, cards: updatedCards });
  };

  const handleVoteCard = (cardId: string, type: 'up' | 'down') => {
    const updatedCards = board.cards.map((c) => {
      if (c.id !== cardId) return c;
      const isSameVote = c.userVoted === type;
      let newUp = c.upvotes;
      let newDown = c.downvotes;

      if (c.userVoted === 'up') newUp--;
      if (c.userVoted === 'down') newDown--;

      let newUserVoted: 'up' | 'down' | undefined = type;
      if (isSameVote) {
        newUserVoted = undefined;
      } else if (type === 'up') {
        newUp++;
      } else {
        newDown++;
      }

      return { ...c, upvotes: newUp, downvotes: newDown, userVoted: newUserVoted };
    });

    onUpdateBoard({ ...board, cards: updatedCards });
  };

  const handleDeleteCard = (cardId: string) => {
    commitBoardState({
      ...board,
      cards: board.cards.filter((c) => c.id !== cardId)
    });
  };

  const handleAddCounter = (parentCardId: string) => {
    const parent = board.cards.find((c) => c.id === parentCardId);
    if (!parent) return;
    setSelectedScenarioId(parent.scenarioId);
    setNewStance('Oppose');
    setNewClassification('Opinion');
    setNewTitle(`Counter to "${parent.title.slice(0, 18)}..."`);
    setShowAddModal(true);
  };

  const numScenarios = board.scenarios.length || 2;
  const is1vs1 = numScenarios === 2;

  return (
    <div className={`relative w-full h-[calc(100vh-56px)] select-none theme-${theme}`}>
      
      {/* Prominent Centered Decision Prompt Heading */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center">
        <div className="inline-flex items-center space-x-2 px-5 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <h2 className="font-serif-luxury font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-wide">
            {board.decisionPrompt || 'Which Option Should We Select?'}
          </h2>
        </div>
      </div>

      {/* FLOATING ACTION TOOLBAR FOR SELECTED ITEMS */}
      {selectedCardIds.length > 0 && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl px-3 py-1.5 flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-150 text-xs font-bold">
          <span className="text-slate-500 text-[11px] px-1 font-mono">{selectedCardIds.length} Selected</span>
          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700" />
          <button
            onClick={handleDuplicateSelected}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center space-x-1"
            title="Duplicate / Copy Selected"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-600" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={handleToggleLockSelected}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center space-x-1"
            title="Toggle Lock Position"
          >
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Lock</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            className="p-1.5 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 flex items-center space-x-1"
            title="Delete Selected Items"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Main Interactive Canvas Container with 2D Scrollbars */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMoveCanvas}
        onMouseUp={handleMouseUpCanvas}
        onWheel={handleWheelCanvas}
        className={`canvas-bg board-canvas-container w-full h-full relative ${
          activeTool === 'hand' || isPanning
            ? 'cursor-grab active:cursor-grabbing'
            : activeTool === 'pen'
            ? 'cursor-crosshair'
            : activeTool === 'text'
            ? 'cursor-text'
            : activeTool === 'eraser'
            ? 'cursor-pointer'
            : 'cursor-default'
        }`}
      >
        {/* Transform Layer for Spatial Zooming & Panning */}
        <div
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          
          {/* EQUAL CHUNK SCENARIO SECTIONS */}
          <div className="flex space-x-8 p-12 pointer-events-auto min-w-[1400px] justify-center">
            {board.scenarios.map((scen) => (
              <div
                key={scen.id}
                className={`rounded-3xl p-6 flex flex-col min-h-[850px] shadow-sm relative transition-all bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 ${
                  is1vs1 ? 'w-[580px]' : 'w-[420px]'
                }`}
              >
                {/* Scenario Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800/80 mb-6">
                  <div>
                    <span
                      className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-md text-white shadow-sm"
                      style={{ backgroundColor: scen.colorHex }}
                    >
                      {scen.badgeTag}
                    </span>
                    <h3 className="font-serif-luxury font-bold text-2xl text-slate-900 dark:text-white mt-2">{scen.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">{scen.description}</p>
                  </div>

                  {/* Gemini AI Auto-Generate Sticky Notes Button */}
                  <button
                    onClick={() => handleGeminiAutoGenerateNotes(scen.id)}
                    disabled={generatingScenarioId === scen.id}
                    className="p-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-400/30 text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all shrink-0 disabled:opacity-50"
                    title="Ask Gemini to generate 3 analytical sticky note points for this option"
                  >
                    {generatingScenarioId === scen.id ? (
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
                    )}
                    <span className="hidden sm:inline text-[11px] font-extrabold">
                      {generatingScenarioId === scen.id ? 'Generating...' : 'Gemini Notes'}
                    </span>
                  </button>
                </div>

                {/* Auto-Align Sticky Note Button */}
                <button
                  onClick={() => {
                    setSelectedScenarioId(scen.id);
                    setShowAddModal(true);
                  }}
                  className="w-full py-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-xs font-bold flex items-center justify-center space-x-1.5 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-all mt-auto bg-slate-50 dark:bg-slate-800/50"
                >
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Add Note to {scen.title}</span>
                </button>
              </div>
            ))}
          </div>

          {/* REALTIME REMOTE USER CURSORS */}
          {Object.values(remoteCursors).map((cur) => (
            <div
              key={cur.userId}
              className="absolute pointer-events-none z-50 flex items-center space-x-1 transition-all duration-75"
              style={{ left: `${cur.x}px`, top: `${cur.y}px` }}
            >
              <MousePointer className="w-5 h-5 text-indigo-600 fill-indigo-600 drop-shadow-md" />
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white shadow-md whitespace-nowrap"
                style={{ backgroundColor: cur.color || '#4f46e5' }}
              >
                {cur.name}
              </span>
            </div>
          ))}

          {/* Marquee Region Selection Box */}
          {selectionBox && (
            <div
              className="selection-box"
              style={{
                left: `${selectionBox.x}px`,
                top: `${selectionBox.y}px`,
                width: `${selectionBox.width}px`,
                height: `${selectionBox.height}px`
              }}
            />
          )}

          {/* Real-Time Active Freehand Pen Stroke */}
          {isDrawing && currentPenPoints.length > 1 && (
            <svg className="absolute inset-0 pointer-events-none overflow-visible z-30">
              <polyline
                fill="none"
                stroke={penColor}
                strokeWidth={penThickness}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={currentPenPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              />
            </svg>
          )}

          {/* Real-Time Active Connector Arrow Line with Arrowhead */}
          {isDrawingArrow && (
            <svg className="absolute inset-0 pointer-events-none overflow-visible z-30">
              <defs>
                <marker
                  id="arrowhead-active"
                  markerWidth="10"
                  markerHeight="7"
                  refX="8"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" />
                </marker>
              </defs>
              <line
                x1={arrowStartPos.x}
                y1={arrowStartPos.y}
                x2={arrowEndPos.x}
                y2={arrowEndPos.y}
                stroke="#4f46e5"
                strokeWidth="3"
                strokeDasharray="4"
                markerEnd="url(#arrowhead-active)"
              />
            </svg>
          )}

          {/* Freely Positioned Cards, Sticky Notes, Connector Arrow Lines & Drawings */}
          {board.cards.map((card) => {
            if (card.cardType === 'drawing' && card.penPoints) {
              return (
                <svg
                  key={card.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeTool === 'eraser') handleDeleteCard(card.id);
                    else setSelectedCardIds([card.id]);
                  }}
                  className={`absolute inset-0 overflow-visible z-10 ${
                    activeTool === 'eraser' ? 'cursor-pointer pointer-events-auto hover:opacity-50' : 'pointer-events-auto cursor-pointer'
                  }`}
                >
                  <polyline
                    fill="none"
                    stroke={card.penColor || '#4f46e5'}
                    strokeWidth={card.penThickness || 3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={card.penPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    className={selectedCardIds.includes(card.id) ? 'stroke-indigo-600 drop-shadow-md' : ''}
                  />
                </svg>
              );
            }

            // CURVED CONNECTOR ARROWS WITH DRAGGABLE MIDDLE CONTROL DOTS
            if (card.cardType === 'arrow' && card.arrowStart && card.arrowEnd) {
              const start = card.arrowStart;
              const end = card.arrowEnd;
              const control = card.arrowControl || {
                x: (start.x + end.x) / 2,
                y: (start.y + end.y) / 2 - 40
              };

              const pathD = `M ${start.x},${start.y} Q ${control.x},${control.y} ${end.x},${end.y}`;

              return (
                <g key={card.id} className="pointer-events-auto">
                  <svg className="absolute inset-0 overflow-visible z-10 pointer-events-none">
                    <defs>
                      <marker
                        id={`arrowhead-${card.id}`}
                        markerWidth="10"
                        markerHeight="7"
                        refX="8"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" />
                      </marker>
                    </defs>
                    
                    {/* Quadratic Bezier Curve Line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3"
                      markerEnd={`url(#arrowhead-${card.id})`}
                      className={selectedCardIds.includes(card.id) ? 'stroke-indigo-600 stroke-[4]' : ''}
                    />

                    {/* Clickable Line Hit Area */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="16"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTool === 'eraser') handleDeleteCard(card.id);
                        else setSelectedCardIds([card.id]);
                      }}
                      className="cursor-pointer pointer-events-auto"
                    />
                  </svg>

                  {/* Interactive Draggable Middle Control Dot */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingArrowControlId(card.id);
                    }}
                    className="absolute z-20 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-md cursor-move hover:scale-125 transition-transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto"
                    style={{ left: `${control.x}px`, top: `${control.y}px` }}
                    title="Drag control dot to bend arrow curve & direction"
                  >
                    <Move className="w-2.5 h-2.5 text-white" />
                  </div>
                </g>
              );
            }

            return (
              <div
                key={card.id}
                onMouseDown={(e) => handleCardMouseDown(e, card)}
                className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing transition-shadow ${
                  activeTool === 'eraser' ? 'hover:ring-2 hover:ring-rose-500 rounded-2xl' : ''
                }`}
                style={{
                  left: `${card.x}px`,
                  top: `${card.y}px`,
                  zIndex: selectedCardIds.includes(card.id) ? 30 : 10
                }}
              >
                <ArgumentCard
                  card={card}
                  onVoteCard={handleVoteCard}
                  onOpenEvidence={onOpenEvidence}
                  onAddCounter={handleAddCounter}
                  onDeleteCard={handleDeleteCard}
                  onResizeCard={handleResizeCard}
                  onUpdateTextProps={handleUpdateTextProps}
                  onEditCard={handleOpenEditCard}
                  isSelected={selectedCardIds.includes(card.id)}
                  onSelect={() => setSelectedCardIds([card.id])}
                />
              </div>
            );
          })}

        </div>
      </div>

      {/* MIRO FLOATING LEFT TOOLBAR WITH PURPLE TOP AI BUTTON */}
      <div className="miro-toolbar-floating">
        
        {/* Top Purple AI Circle Button */}
        {onOpenAiAnalyst && (
          <button
            onClick={onOpenAiAnalyst}
            className="miro-ai-tool-btn"
            title="Launch Gemini AI Decision Analyst"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
          </button>
        )}

        <button
          onClick={() => setActiveTool('select')}
          className={`miro-tool-item ${activeTool === 'select' ? 'active' : ''}`}
          title="Select Tool (Click or Drag Marquee Box)"
        >
          <MousePointer className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTool('hand')}
          className={`miro-tool-item ${activeTool === 'hand' ? 'active' : ''}`}
          title="Hand Tool (Pan Canvas)"
        >
          <Hand className="w-4 h-4" />
        </button>

        <div className="h-[1px] w-full bg-slate-200 dark:bg-slate-700 my-0.5" />

        <button
          onClick={() => setShowAddModal(true)}
          className={`miro-tool-item ${activeTool === 'sticky' ? 'active' : ''}`}
          title="Add Sticky Note"
        >
          <StickyNote className="w-4 h-4 text-amber-500" />
        </button>

        {/* Shape Adder Tool with Popover Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setActiveTool('shape');
              setShowShapeMenu(!showShapeMenu);
            }}
            className={`miro-tool-item ${activeTool === 'shape' ? 'active' : ''}`}
            title="Add Shape Container (Rectangle, Circle, Diamond, Container Box)"
          >
            <Square className="w-4 h-4 text-indigo-500" />
          </button>

          {showShapeMenu && (
            <div className="absolute left-12 top-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-50 flex items-center space-x-1.5 animate-in fade-in duration-150">
              {[
                { id: 'rect', label: 'Rectangle' },
                { id: 'circle', label: 'Circle' },
                { id: 'diamond', label: 'Diamond' },
                { id: 'container', label: 'Badge Container' }
              ].map((shp) => (
                <button
                  key={shp.id}
                  onClick={() => {
                    setSelectedShapeType(shp.id as any);
                    setShowShapeMenu(false);
                  }}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center space-x-1 border ${
                    selectedShapeType === shp.id
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200'
                  }`}
                  title={`Add ${shp.label}`}
                >
                  <Square className={`w-4 h-4 ${shp.id === 'diamond' ? 'rotate-45' : ''}`} />
                  <span className="text-[10px] hidden sm:inline">{shp.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setActiveTool('arrow')}
          className={`miro-tool-item ${activeTool === 'arrow' ? 'active' : ''}`}
          title="Curved Connector Arrow Line Tool"
        >
          <ArrowRight className="w-4 h-4 text-sky-500" />
        </button>

        <button
          onClick={() => setActiveTool('text')}
          className={`miro-tool-item ${activeTool === 'text' ? 'active' : ''}`}
          title="Mini Text Tool"
        >
          <Type className="w-4 h-4" />
        </button>

        {/* Goodnotes Pen Suite with Color & Thickness Popover */}
        <div className="relative group">
          <button
            onClick={() => setActiveTool('pen')}
            className={`miro-tool-item ${activeTool === 'pen' ? 'active' : ''}`}
            title="Goodnotes Pen Tool"
          >
            <PenTool className="w-4 h-4 text-purple-500" />
          </button>

          {activeTool === 'pen' && (
            <div className="absolute left-12 top-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-50 flex flex-col space-y-2 animate-in fade-in duration-150 min-w-[140px]">
              <span className="text-[10px] font-bold text-slate-500 block">Pen Color</span>
              <div className="flex space-x-1.5">
                {['#0284c7', '#059669', '#d97706', '#e11d48', '#9333ea', '#0f172a', '#ffffff'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setPenColor(c)}
                    className={`w-5 h-5 rounded-full border border-black/20 hover:scale-110 transition-transform ${
                      penColor === c ? 'ring-2 ring-indigo-600' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <span className="text-[10px] font-bold text-slate-500 block border-t pt-1">Pen Thickness</span>
              <div className="flex items-center space-x-2">
                {[
                  { label: 'Fine', size: 2 },
                  { label: 'Medium', size: 4 },
                  { label: 'Thick', size: 7 }
                ].map((th) => (
                  <button
                    key={th.size}
                    onClick={() => setPenThickness(th.size)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      penThickness === th.size
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setActiveTool('eraser')}
          className={`miro-tool-item ${activeTool === 'eraser' ? 'active' : ''}`}
          title="Eraser Tool"
        >
          <Eraser className="w-4 h-4 text-rose-500" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="miro-tool-item"
          title="Upload Local Image"
        >
          <ImageIcon className="w-4 h-4 text-emerald-500" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageFileUpload}
          className="hidden"
        />

        <div className="h-[1px] w-full bg-slate-200 dark:bg-slate-700 my-0.5" />

        <button
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className="miro-tool-item disabled:opacity-30"
          title="Undo Action (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>

        <button
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
          className="miro-tool-item disabled:opacity-30"
          title="Redo Action (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* MIRO BOTTOM-RIGHT ZOOM BAR PILL */}
      <div className="miro-zoom-bar">
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: Math.max(20, (window.innerWidth - 1200) / 2), y: 40 });
          }}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          title="Overview Map / Reset Fit"
        >
          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
        </button>

        <button
          onClick={() => setZoom((z) => Math.max(z * 0.92, 0.3))}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="font-mono px-1">{Math.round(zoom * 100)}%</span>

        <button
          onClick={() => setZoom((z) => Math.min(z * 1.08, 2.5))}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => window.open('https://miro.com', '_blank')}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          title="Help & Shortcuts"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal: Inline Card Editor */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                <span>Edit {editingCard.cardType === 'text' ? 'Mini Text' : 'Sticky Note'}</span>
              </h3>
              <button onClick={() => setEditingCard(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">Text Content</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              {editingCard.cardType !== 'text' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">Content & Rationale</label>
                    <textarea
                      rows={3}
                      required
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">Reasoning Classification</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['Fact', 'Opinion', 'Assumption', 'Suggestion', 'Question'] as ClassificationType[]).map((cls) => (
                        <button
                          type="button"
                          key={cls}
                          onClick={() => setEditClassification(cls)}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            editClassification === cls
                              ? 'bg-indigo-600 text-white border-indigo-400'
                              : 'bg-slate-100 border-slate-300 text-slate-900'
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">Stance</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditStance('Support')}
                        className={`py-2 rounded-xl text-xs font-semibold border ${
                          editStance === 'Support' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-100 border-slate-300 text-slate-900'
                        }`}
                      >
                        👍 Support
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStance('Oppose')}
                        className={`py-2 rounded-xl text-xs font-semibold border ${
                          editStance === 'Oppose' ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-100 border-slate-300 text-slate-900'
                        }`}
                      >
                        👎 Oppose
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-500 font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Inline Mini Text Input */}
      {showInlineTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Type className="w-4 h-4 text-indigo-600" />
                <span>Add Mini Text Box to Canvas</span>
              </h3>
              <button onClick={() => setShowInlineTextModal(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMiniText} className="space-y-3">
              <input
                type="text"
                required
                autoFocus
                placeholder="Type standalone text here..."
                value={inlineTextValue}
                onChange={(e) => setInlineTextValue(e.target.value)}
                className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInlineTextModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold">
                  Place Text Box
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Sticky Note */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative text-left">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-4">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-500" />
                <span>Add Sticky Note to Scenario</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateElement} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">Target Scenario Option</label>
                <select
                  value={selectedScenarioId}
                  onChange={(e) => setSelectedScenarioId(e.target.value)}
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {board.scenarios.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.badgeTag} — {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">Sticky Color</label>
                <div className="flex space-x-2">
                  {[
                    { id: 'sticky-yellow', bg: '#fde047' },
                    { id: 'sticky-blue', bg: '#93c5fd' },
                    { id: 'sticky-pink', bg: '#f9a8d4' },
                    { id: 'sticky-green', bg: '#86efac' },
                    { id: 'sticky-purple', bg: '#d8b4fe' }
                  ].map((col) => (
                    <button
                      type="button"
                      key={col.id}
                      onClick={() => setStickyColor(col.id)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        stickyColor === col.id ? 'scale-110 border-slate-900' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col.bg }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">Reasoning Classification</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['Fact', 'Opinion', 'Assumption', 'Suggestion', 'Question'] as ClassificationType[]).map((cls) => (
                    <button
                      type="button"
                      key={cls}
                      onClick={() => setNewClassification(cls)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        newClassification === cls
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-slate-100 border-slate-300 text-slate-900'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">Stance</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStance('Support')}
                    className={`py-2 rounded-xl text-xs font-semibold border ${
                      newStance === 'Support' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  >
                    👍 Support Option
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStance('Oppose')}
                    className={`py-2 rounded-xl text-xs font-semibold border ${
                      newStance === 'Oppose' ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  >
                    👎 Oppose Option
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">Sticky Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Non-refundable registration fee"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">Details & Rationale</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explanation..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs resize-none font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm">
                  Stick Note to Board
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
