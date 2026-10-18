import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Pencil,
  Highlighter,
  Eraser,
  Minus,
  Square,
  Circle,
  MoveRight,
  Flame,
  Type,
  Image as ImageIcon,
  RotateCcw,
  Trash2,
  Download,
  MousePointer,
  GripHorizontal,
  X,
  Disc,
  StopCircle,
  Pin,
  PinOff,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  GraduationCap
} from 'lucide-react';

export const CHALK_COLORS = [
  { name: 'Phấn Trắng', value: '#f8fafc' },
  { name: 'Phấn Vàng', value: '#fde047' },
  { name: 'Phấn Hồng', value: '#f472b6' },
  { name: 'Phấn Xanh Dương', value: '#38bdf8' },
  { name: 'Phấn Xanh Lá', value: '#4ade80' },
  { name: 'Phấn Cam', value: '#fb923c' }
];

export const STROKE_WIDTHS = [
  { label: 'Mảnh', value: 3 },
  { label: 'Vừa', value: 6 },
  { label: 'Đậm', value: 12 },
  { label: 'Rất Đậm', value: 20 }
];

export const FONT_SIZES = [
  { label: 'Nhỏ (24px)', value: 24 },
  { label: 'Vừa (36px)', value: 36 },
  { label: 'Lớn (48px)', value: 48 },
  { label: 'Rất Lớn (64px)', value: 64 }
];

export default function Blackboard({
  socket,
  userName,
  userRole,
  roomId,
  localStream,
  remoteStream,
  remoteCursors,
  setRemoteCursors
}) {
  const { language, t } = useLanguage();
  const containerRef = useRef(null);
  const mainCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Tools & State
  const [activeTool, setActiveTool] = useState('pen');
  const [chalkColor, setChalkColor] = useState(CHALK_COLORS[0].value);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [boardBg, setBoardBg] = useState('green');

  // Class Ended State (For Student)
  const [isClassEnded, setIsClassEnded] = useState(false);

  // Independent Zoom & Pan State (Local to each user)
  const [zoom, setZoom] = useState({ scale: 1.0, offsetX: 0, offsetY: 0 });
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Image elements with Pinning support
  const [exerciseImages, setExerciseImages] = useState([]);
  const imagesRef = useRef([]);
  useEffect(() => {
    imagesRef.current = exerciseImages;
  }, [exerciseImages]);

  // Text Modal State
  const [showTextModal, setShowTextModal] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textFontSize, setTextFontSize] = useState(36);
  const [textModalPos, setTextModalPos] = useState({ x: 200, y: 150 });

  // Drawing elements
  const elementsRef = useRef([]);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const startPointRef = useRef(null);

  // Dragging & Resizing state for exercise images
  const draggingImgRef = useRef(null);
  const resizingImgRef = useRef(null);

  // Laser particles trail
  const laserParticlesRef = useRef([]);
  const remoteLaserTrailsRef = useRef(new Map());
  const remoteActiveStrokesRef = useRef(new Map());

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [savedRecordingMsg, setSavedRecordingMsg] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordCanvasTickerRef = useRef(null);
  const currentRecordingNameRef = useRef('');
  const recordDisplayStreamRef = useRef(null);
  const recCompositeCanvasRef = useRef(null);
  const recRenderIntervalRef = useRef(null);
  const imageCacheRef = useRef(new Map());

  // Convert client mouse event to world coordinates
  const toWorldCoords = useCallback((clientX, clientY) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const { scale, offsetX, offsetY } = zoomRef.current;
    return {
      x: (mouseX - offsetX) / scale,
      y: (mouseY - offsetY) / scale
    };
  }, []);

  // Redraw entire board onto main canvas applying zoom & pan transform
  const redrawBoard = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { scale, offsetX, offsetY } = zoomRef.current;
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    elementsRef.current.forEach((el) => {
      drawElement(ctx, el);
    });

    ctx.restore();
  }, [boardBg]);

  // Draw element on canvas with correct font rendering
  const drawElement = (ctx, el) => {
    ctx.save();

    if (el.type === 'pen' || el.type === 'eraser') {
      if (el.points && el.points.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = el.type === 'eraser' ? (boardBg === 'green' ? '#142b21' : '#141715') : el.color;
        ctx.lineWidth = el.type === 'eraser' ? el.width * 3 : el.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = el.type === 'eraser' ? 'destination-out' : 'source-over';

        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      }
    } else if (el.type === 'highlighter') {
      if (el.points && el.points.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.width * 3.5;
        ctx.lineCap = 'square';
        ctx.globalAlpha = 0.35;
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      }
    } else if (el.type === 'line') {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.width;
      ctx.lineCap = 'round';
      ctx.moveTo(el.startX, el.startY);
      ctx.lineTo(el.endX, el.endY);
      ctx.stroke();
    } else if (el.type === 'rect') {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.width;
      ctx.rect(el.x, el.y, el.w, el.h);
      ctx.stroke();
    } else if (el.type === 'circle') {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.width;
      const radiusX = Math.abs(el.w / 2);
      const radiusY = Math.abs(el.h / 2);
      const centerX = el.x + radiusX;
      const centerY = el.y + radiusY;
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (el.type === 'arrow') {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.width;
      ctx.lineCap = 'round';

      ctx.moveTo(el.startX, el.startY);
      ctx.lineTo(el.endX, el.endY);
      ctx.stroke();

      const angle = Math.atan2(el.endY - el.startY, el.endX - el.startX);
      const headLength = Math.max(el.width * 3, 16);
      ctx.beginPath();
      ctx.moveTo(el.endX, el.endY);
      ctx.lineTo(el.endX - headLength * Math.cos(angle - Math.PI / 6), el.endY - headLength * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(el.endX - headLength * Math.cos(angle + Math.PI / 6), el.endY - headLength * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    } else if (el.type === 'text') {
      // FIX: Use explicit font string without CSS variables so Canvas applies size properly!
      const size = Number(el.fontSize) || 36;
      ctx.font = `bold ${size}px "Patrick Hand", "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = el.color || '#ffffff';
      const lines = String(el.text).split('\n');
      const lineHeight = size * 1.3;
      lines.forEach((line, i) => {
        ctx.fillText(line, el.x, el.y + i * lineHeight);
      });
    }

    ctx.restore();
  };

  // Wheel Zoom (Independent, towards mouse cursor)
  const handleWheel = (e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prev) => {
      const newScale = Math.min(Math.max(0.4, prev.scale * zoomFactor), 4.5);
      const worldX = (mouseX - prev.offsetX) / prev.scale;
      const worldY = (mouseY - prev.offsetY) / prev.scale;

      const newOffsetX = mouseX - worldX * newScale;
      const newOffsetY = mouseY - worldY * newScale;

      return {
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      };
    });
  };

  // Redraw when zoom changes
  useEffect(() => {
    redrawBoard();
  }, [zoom, redrawBoard]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      const mainCanvas = mainCanvasRef.current;
      const previewCanvas = previewCanvasRef.current;

      if (mainCanvas && previewCanvas) {
        mainCanvas.width = width;
        mainCanvas.height = height;
        previewCanvas.width = width;
        previewCanvas.height = height;
        redrawBoard();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawBoard]);

  // Socket Events & Class Ended notification
  useEffect(() => {
    if (!socket) return;

    socket.on('room-joined', ({ elements }) => {
      if (elements && Array.isArray(elements)) {
        const strokes = [];
        const imgs = [];
        elements.forEach((el) => {
          if (el.type === 'image') imgs.push(el);
          else strokes.push(el);
        });
        elementsRef.current = strokes;
        setExerciseImages(imgs);
        redrawBoard();
      }
    });

    socket.on('draw-stroke-start', ({ stroke, senderId }) => {
      if (stroke) {
        const key = stroke.id || senderId;
        remoteActiveStrokesRef.current.set(key, {
          ...stroke,
          lastPoint: stroke.points && stroke.points.length > 0 ? stroke.points[0] : null
        });
      }
    });

    socket.on('draw-stroke-move', ({ strokeId, point, tool, color, width, senderId }) => {
      const key = strokeId || senderId;
      let stroke = remoteActiveStrokesRef.current.get(key);
      const prevPoint = stroke?.lastPoint || point;
      if (stroke) {
        stroke.lastPoint = point;
        if (stroke.points) stroke.points.push(point);
      } else {
        stroke = {
          id: key,
          type: tool || 'pen',
          color: color || '#ffffff',
          width: width || 4,
          points: [point],
          lastPoint: point
        };
        remoteActiveStrokesRef.current.set(key, stroke);
      }

      // Draw segment directly on mainCanvasRef so it renders in real-time as sender draws!
      const canvas = mainCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.save();
      const { scale, offsetX, offsetY } = zoomRef.current;
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      ctx.beginPath();
      ctx.strokeStyle = tool === 'eraser' ? (boardBg === 'green' ? '#142b21' : '#141715') : color;
      ctx.lineWidth = tool === 'eraser' ? (width || 4) * 2.5 : (width || 4);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tool === 'highlighter') ctx.globalAlpha = 0.35;

      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
    });

    socket.on('draw-stroke-end', ({ element, senderId }) => {
      if (element) {
        remoteActiveStrokesRef.current.delete(element.id || senderId);
        if (element.type === 'image') {
          setExerciseImages((prev) => [...prev, element]);
        } else {
          elementsRef.current.push(element);
          redrawBoard();
        }
      }
      const previewCanvas = previewCanvasRef.current;
      if (previewCanvas) {
        const ctx = previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      }
    });

    socket.on('update-element', (updatedElement) => {
      if (updatedElement.type === 'image') {
        setExerciseImages((prev) =>
          prev.map((img) => (img.id === updatedElement.id ? { ...img, ...updatedElement } : img))
        );
      } else {
        const idx = elementsRef.current.findIndex((el) => el.id === updatedElement.id);
        if (idx !== -1) {
          elementsRef.current[idx] = updatedElement;
          redrawBoard();
        }
      }
    });

    socket.on('delete-element', ({ id }) => {
      setExerciseImages((prev) => prev.filter((img) => img.id !== id));
      elementsRef.current = elementsRef.current.filter((el) => el.id !== id);
      redrawBoard();
    });

    socket.on('cursor-move', ({ senderId, userName, x, y, isLaser }) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [senderId]: { x, y, userName, isLaser, lastSeen: Date.now() }
      }));

      if (isLaser) {
        if (!remoteLaserTrailsRef.current.has(senderId)) {
          remoteLaserTrailsRef.current.set(senderId, []);
        }
        remoteLaserTrailsRef.current.get(senderId).push({ x, y, alpha: 1.0 });
      }
    });

    socket.on('board-sync-all', (elements) => {
      const strokes = [];
      const imgs = [];
      elements.forEach((el) => {
        if (el.type === 'image') imgs.push(el);
        else strokes.push(el);
      });
      elementsRef.current = strokes;
      setExerciseImages(imgs);
      redrawBoard();
    });

    // Handle Teacher Ending Class
    socket.on('class-ended', () => {
      console.log('[Class] Teacher ended the classroom session');
      setIsClassEnded(true);
      setTimeout(() => {
        try { window.close(); } catch (e) {}
      }, 4000);
    });

    return () => {
      socket.off('room-joined');
      socket.off('draw-stroke-start');
      socket.off('draw-stroke-move');
      socket.off('draw-stroke-end');
      socket.off('update-element');
      socket.off('delete-element');
      socket.off('cursor-move');
      socket.off('board-sync-all');
      socket.off('class-ended');
    };
  }, [socket, redrawBoard, setRemoteCursors]);

  // Laser Pointer Animation Loop
  useEffect(() => {
    let animId;
    const animateLaser = () => {
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');

        if (!isDrawingRef.current) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        ctx.save();
        const { scale, offsetX, offsetY } = zoomRef.current;
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        for (let i = laserParticlesRef.current.length - 1; i >= 0; i--) {
          const p = laserParticlesRef.current[i];
          p.alpha -= 0.05;
          if (p.alpha <= 0) {
            laserParticlesRef.current.splice(i, 1);
          } else {
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(239, 68, 68, ${p.alpha})`;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 16;
            ctx.fill();
            ctx.restore();
          }
        }

        remoteLaserTrailsRef.current.forEach((trail) => {
          for (let i = trail.length - 1; i >= 0; i--) {
            const p = trail[i];
            p.alpha -= 0.05;
            if (p.alpha <= 0) {
              trail.splice(i, 1);
            } else {
              ctx.save();
              ctx.beginPath();
              ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI);
              ctx.fillStyle = `rgba(34, 197, 94, ${p.alpha})`;
              ctx.shadowColor = '#22c55e';
              ctx.shadowBlur = 16;
              ctx.fill();
              ctx.restore();
            }
          }
        });

        ctx.restore();
      }

      animId = requestAnimationFrame(animateLaser);
    };

    animId = requestAnimationFrame(animateLaser);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handle Clipboard Paste (Ctrl+V) for Exercise Photos
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            const src = event.target.result;
            const img = new Image();
            img.src = src;
            img.onload = () => {
              const maxWidth = 520;
              const scale = Math.min(1, maxWidth / img.width);
              const w = Math.round(img.width * scale);
              const h = Math.round(img.height * scale);
              const x = 60;
              const y = 80;

              const imageElement = {
                id: `img-${Date.now()}`,
                type: 'image',
                src,
                x,
                y,
                w,
                h,
                pinned: false // Default UNPINNED: allows drag & resize immediately!
              };

              setExerciseImages((prev) => [...prev, imageElement]);
              if (socket) {
                socket.emit('draw-stroke-end', imageElement);
              }
            };
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [socket]);

  // Toggle Pin / Unpin image
  const handleTogglePinImage = (imgId) => {
    setExerciseImages((prev) => {
      const next = prev.map((img) =>
        img.id === imgId ? { ...img, pinned: !img.pinned } : img
      );
      const target = next.find((img) => img.id === imgId);
      if (socket && target) {
        socket.emit('update-element', target);
      }
      return next;
    });
  };

  // Dragging unpinned image with direct DOM transform for buttery-smooth 60fps
  const handleStartDragImage = (e, img) => {
    e.stopPropagation();
    e.preventDefault();
    const id = img.id;
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startX = img.x;
    const startY = img.y;

    const el = document.getElementById(`img-box-${id}`);
    let currentX = startX;
    let currentY = startY;

    const onPointerMove = (moveEvt) => {
      const scale = zoomRef.current.scale;
      const dx = (moveEvt.clientX - startMouseX) / scale;
      const dy = (moveEvt.clientY - startMouseY) / scale;
      currentX = Math.round(startX + dx);
      currentY = Math.round(startY + dy);

      if (el) {
        el.style.left = `${currentX}px`;
        el.style.top = `${currentY}px`;
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      setExerciseImages((prev) =>
        prev.map((item) => (item.id === id ? { ...item, x: currentX, y: currentY } : item))
      );
      if (socket) {
        socket.emit('update-element', { id, x: currentX, y: currentY, type: 'image' });
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { once: true });
  };

  // Resizing unpinned image with direct DOM transform for buttery-smooth 60fps
  const handleStartResizeImage = (e, img) => {
    e.stopPropagation();
    e.preventDefault();
    const id = img.id;
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startW = img.w;
    const startH = img.h;

    const el = document.getElementById(`img-box-${id}`);
    let currentW = startW;
    let currentH = startH;

    const onPointerMove = (moveEvt) => {
      const scale = zoomRef.current.scale;
      const dx = (moveEvt.clientX - startMouseX) / scale;
      const dy = (moveEvt.clientY - startMouseY) / scale;
      currentW = Math.max(120, Math.round(startW + dx));
      currentH = Math.max(80, Math.round(startH + dy));

      if (el) {
        el.style.width = `${currentW}px`;
        el.style.height = `${currentH}px`;
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      setExerciseImages((prev) =>
        prev.map((item) => (item.id === id ? { ...item, w: currentW, h: currentH } : item))
      );
      if (socket) {
        socket.emit('update-element', { id, w: currentW, h: currentH, type: 'image' });
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { once: true });
  };

  // Delete image
  const handleDeleteImage = (imgId) => {
    setExerciseImages((prev) => prev.filter((img) => img.id !== imgId));
    if (socket) {
      socket.emit('delete-element', { id: imgId });
    }
  };

  // Pointer Down (Draw / Text click)
  const handlePointerDown = (e) => {
    const { x, y } = toWorldCoords(e.clientX, e.clientY);
    isDrawingRef.current = true;
    startPointRef.current = { x, y };

    if (activeTool === 'laser') {
      laserParticlesRef.current.push({ x, y, alpha: 1.0 });
      if (socket) {
        socket.emit('cursor-move', { x, y, isLaser: true });
      }
      return;
    }

    if (activeTool === 'text') {
      // Save world-coordinate for text placement on the board
      setTextInsertPos({ x, y });
      setTextModalPos({ x: Math.max(40, e.clientX - 160), y: Math.max(60, e.clientY - 100) });
      setShowTextModal(true);
      isDrawingRef.current = false;
      return;
    }

    currentStrokeRef.current = {
      id: `stroke-${Date.now()}`,
      type: activeTool,
      color: chalkColor,
      width: strokeWidth,
      points: [{ x, y }]
    };

    if (socket) {
      socket.emit('draw-stroke-start', {
        stroke: currentStrokeRef.current
      });
    }
  };

  // Pointer Move
  const handlePointerMove = (e) => {

    const { x, y } = toWorldCoords(e.clientX, e.clientY);

    if (socket) {
      socket.emit('cursor-move', {
        x,
        y,
        isLaser: activeTool === 'laser'
      });
    }

    if (!isDrawingRef.current) return;

    if (activeTool === 'laser') {
      laserParticlesRef.current.push({ x, y, alpha: 1.0 });
      return;
    }

    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext('2d');

    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      if (currentStrokeRef.current) {
        currentStrokeRef.current.points.push({ x, y });

        ctx.save();
        const { scale, offsetX, offsetY } = zoomRef.current;
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        ctx.beginPath();
        ctx.strokeStyle = activeTool === 'eraser' ? (boardBg === 'green' ? '#142b21' : '#141715') : chalkColor;
        ctx.lineWidth = activeTool === 'eraser' ? strokeWidth * 2.5 : strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (activeTool === 'highlighter') ctx.globalAlpha = 0.35;

        const pts = currentStrokeRef.current.points;
        if (pts.length > 1) {
          ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
          ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
          ctx.stroke();
        }
        ctx.restore();

        if (socket) {
          socket.emit('draw-stroke-move', {
            strokeId: currentStrokeRef.current ? currentStrokeRef.current.id : undefined,
            point: { x, y },
            tool: activeTool,
            color: chalkColor,
            width: strokeWidth
          });
        }
      }
    } else if (['line', 'rect', 'circle', 'arrow'].includes(activeTool)) {
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      ctx.save();
      const { scale, offsetX, offsetY } = zoomRef.current;
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      const start = startPointRef.current;
      const previewShape = {
        type: activeTool,
        color: chalkColor,
        width: strokeWidth,
        startX: start.x,
        startY: start.y,
        endX: x,
        endY: y,
        x: Math.min(start.x, x),
        y: Math.min(start.y, y),
        w: Math.abs(x - start.x),
        h: Math.abs(y - start.y)
      };
      drawElement(ctx, previewShape);
      ctx.restore();
    }
  };

  // Pointer Up
  const handlePointerUp = (e) => {
    draggingImgRef.current = null;
    resizingImgRef.current = null;

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (activeTool === 'laser') return;

    const { x, y } = toWorldCoords(e.clientX, e.clientY);
    const start = startPointRef.current;
    let finalElement = null;

    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
        finalElement = currentStrokeRef.current;
      }
    } else if (['line', 'rect', 'circle', 'arrow'].includes(activeTool) && start) {
      finalElement = {
        id: `shape-${Date.now()}`,
        type: activeTool,
        color: chalkColor,
        width: strokeWidth,
        startX: start.x,
        startY: start.y,
        endX: x,
        endY: y,
        x: Math.min(start.x, x),
        y: Math.min(start.y, y),
        w: Math.abs(x - start.x),
        h: Math.abs(y - start.y)
      };
    }

    if (finalElement) {
      elementsRef.current.push(finalElement);
      redrawBoard();

      if (socket) {
        socket.emit('draw-stroke-end', finalElement);
      }
    }

    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas) {
      const ctx = previewCanvas.getContext('2d');
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    }

    currentStrokeRef.current = null;
    startPointRef.current = null;
  };

  // Submit Text Input with Custom Font Sizes
  // textInsertPos tracks where on the BOARD (world coords) to place the text
  const [textInsertPos, setTextInsertPos] = useState({ x: 100, y: 150 });

  const handleSubmitText = (e) => {
    e.preventDefault();
    if (!textContent.trim()) return;

    // Use the world coordinate stored when user clicked canvas, or default center
    const pos = textInsertPos;
    const textElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: textContent,
      x: pos.x,
      y: pos.y,
      color: chalkColor,
      fontSize: Number(textFontSize)
    };

    elementsRef.current.push(textElement);
    redrawBoard();
    if (socket) socket.emit('draw-stroke-end', textElement);

    setTextContent('');
    setShowTextModal(false);
  };

  // Undo
  const handleUndo = () => {
    if (elementsRef.current.length > 0) {
      elementsRef.current.pop();
      redrawBoard();
      if (socket) socket.emit('board-undo');
    }
  };

  // Clear Board
  const handleClear = () => {
    if (window.confirm(t('confirmClear'))) {
      elementsRef.current = [];
      setExerciseImages([]);
      redrawBoard();
      if (socket) socket.emit('board-clear');
    }
  };

  // Export board with images & strokes
  const handleExportPNG = () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');

    ctx.fillStyle = boardBg === 'green' ? '#142b21' : '#141715';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    const imgPromises = exerciseImages.map((imgData) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = imgData.src;
        img.onload = () => {
          ctx.drawImage(img, imgData.x, imgData.y, imgData.w, imgData.h);
          resolve();
        };
        img.onerror = resolve;
      });
    });

    Promise.all(imgPromises).then(() => {
      ctx.drawImage(canvas, 0, 0);

      const link = document.createElement('a');
      link.download = `bai-hoc-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    });
  };

  // Upload file picker
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target.result;
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const maxWidth = 520;
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const x = 60;
        const y = 80;

        const imageElement = {
          id: `img-${Date.now()}`,
          type: 'image',
          src,
          x,
          y,
          w,
          h,
          pinned: false // Default UNPINNED: allows drag & resize immediately!
        };

        setExerciseImages((prev) => [...prev, imageElement]);
        if (socket) socket.emit('draw-stroke-end', imageElement);
      };
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  // ==========================================
  // BULLET-PROOF SESSION RECORDING
  // ==========================================
  const generateRecordingFileName = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${roomId}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.webm`;
  };

  const saveRecordingBlob = async (blob, customName) => {
    const fileName = customName || generateRecordingFileName();
    console.log(`[REC] Uploading recording: ${fileName} (${blob.size} bytes)`);
    setSavedRecordingMsg(`⏳ Đang lưu bài học vào lich-su-hoc-tap...`);

    // 1) Regular fetch WITHOUT keepalive (no 64KB limit, handles any size!)
    try {
      const res = await fetch(`/api/save-recording?name=${encodeURIComponent(fileName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-file-name': fileName
        },
        body: blob
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[REC] Server save result:', data);
        setSavedRecordingMsg(`✅ Đã lưu bài học thành công vào lich-su-hoc-tap/${fileName}`);
      }
    } catch (err) {
      console.warn('[REC] Server upload error:', err);
    }

    // 2) Browser download as guaranteed fallback
    try {
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 30000);
    } catch (e) {
      console.error('[REC] Download error:', e);
    }

    setTimeout(() => setSavedRecordingMsg(null), 10000);
  };

  const startRecording = async (promptTabCapture = false) => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        console.warn('[REC] Already recording');
        return;
      }

      let finalVideoStream = null;
      let tabAudioTracks = [];

      // 1. If teacher triggered recording, offer Full Browser Tab Capture
      // (captures 100% of web interface: background, frame, images, drawings, cursors, cams, and audio)
      if (promptTabCapture && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'browser'
            },
            audio: true,
            preferCurrentTab: true,
            selfBrowserSurface: 'include',
            systemAudio: 'include'
          });

          recordDisplayStreamRef.current = displayStream;
          finalVideoStream = new MediaStream(displayStream.getVideoTracks());
          tabAudioTracks = displayStream.getAudioTracks();

          // If teacher clicks "Stop sharing" on browser toolbar, stop & save recording
          displayStream.getVideoTracks()[0].onended = () => {
            stopRecordingAndSave();
          };
          console.log('[REC] Full tab display capture active');
        } catch (displayErr) {
          console.log('[REC] Tab capture cancelled by user:', displayErr.message);
          return;
        }
      }

      // 2. Fallback: Composite Canvas Recorder (renders blackboard background, wood frame, exercise images, chalk strokes, active drawing)
      if (!finalVideoStream) {
        const container = containerRef.current;
        const mainCanvas = mainCanvasRef.current;
        const width = (container && container.clientWidth) || (mainCanvas && mainCanvas.width) || 1920;
        const height = (container && container.clientHeight) || (mainCanvas && mainCanvas.height) || 1080;

        let compCanvas = recCompositeCanvasRef.current;
        if (!compCanvas) {
          compCanvas = document.createElement('canvas');
          recCompositeCanvasRef.current = compCanvas;
        }
        compCanvas.width = width;
        compCanvas.height = height;
        const compCtx = compCanvas.getContext('2d');

        const getCachedImage = (imgData) => {
          let img = imageCacheRef.current.get(imgData.id);
          if (!img || img.src !== imgData.src) {
            img = new Image();
            img.src = imgData.src;
            imageCacheRef.current.set(imgData.id, img);
          }
          return img;
        };

        const renderCompositeFrame = () => {
          if (!compCtx) return;
          // Blackboard Background
          compCtx.fillStyle = boardBg === 'green' ? '#142b21' : '#141715';
          compCtx.fillRect(0, 0, width, height);

          // Wood border frame
          compCtx.save();
          compCtx.strokeStyle = '#2b1d12';
          compCtx.lineWidth = 10;
          compCtx.strokeRect(6, 6, width - 12, height - 12);
          compCtx.restore();

          // Exercise Images (Pinned & Unpinned)
          const curZoom = zoomRef.current;
          if (imagesRef.current && imagesRef.current.length > 0) {
            imagesRef.current.forEach((imgData) => {
              const img = getCachedImage(imgData);
              if (img.complete && img.naturalWidth > 0) {
                const screenX = imgData.x * curZoom.scale + curZoom.offsetX;
                const screenY = imgData.y * curZoom.scale + curZoom.offsetY;
                const screenW = imgData.w * curZoom.scale;
                const screenH = imgData.h * curZoom.scale;
                compCtx.drawImage(img, screenX, screenY, screenW, screenH);
              }
            });
          }

          // Main Canvas (Chalk strokes, geometric shapes, text)
          if (mainCanvasRef.current) {
            compCtx.drawImage(mainCanvasRef.current, 0, 0);
          }

          // Preview Canvas (Active drawing strokes)
          if (previewCanvasRef.current) {
            compCtx.drawImage(previewCanvasRef.current, 0, 0);
          }
        };

        renderCompositeFrame();
        if (recRenderIntervalRef.current) clearInterval(recRenderIntervalRef.current);
        recRenderIntervalRef.current = setInterval(renderCompositeFrame, 40); // 25 FPS

        finalVideoStream = compCanvas.captureStream(25);
        console.log('[REC] Composite canvas stream active');
      }

      // Combine Audio: Local Mic + Remote Call Voice + Tab Audio
      const audioTracksToMix = [...tabAudioTracks];
      if (localStream && localStream.getAudioTracks().length > 0) {
        audioTracksToMix.push(localStream.getAudioTracks()[0]);
      }
      if (remoteStream && remoteStream.getAudioTracks().length > 0) {
        audioTracksToMix.push(remoteStream.getAudioTracks()[0]);
      }

      let mixedAudioTrack = null;
      try {
        const liveAudio = audioTracksToMix.filter((t) => t && t.readyState === 'live');
        if (liveAudio.length > 0) {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const dest = audioCtx.createMediaStreamDestination();
          liveAudio.forEach((track) => {
            try {
              const stream = new MediaStream([track]);
              const src = audioCtx.createMediaStreamSource(stream);
              src.connect(dest);
            } catch (e) {}
          });
          mixedAudioTrack = dest.stream.getAudioTracks()[0];
        }
      } catch (audioMixErr) {
        console.warn('[REC] Audio mixing fallback:', audioMixErr);
        mixedAudioTrack = audioTracksToMix.find((t) => t && t.readyState === 'live') || null;
      }

      const combinedTracks = [...finalVideoStream.getVideoTracks()];
      if (mixedAudioTrack) {
        combinedTracks.push(mixedAudioTrack);
      }

      const combinedStream = new MediaStream(combinedTracks);

      let options = {};
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];
      for (const m of mimeTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
          options = { mimeType: m };
          break;
        }
      }

      let recorder;
      recordedChunksRef.current = [];
      const fileName = generateRecordingFileName();
      currentRecordingNameRef.current = fileName;

      const attachHandlers = (rec) => {
        rec.ondataavailable = async (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
            // Stream chunks to server disk in real-time
            if (socket && socket.connected) {
              try {
                const buffer = await event.data.arrayBuffer();
                socket.emit('record-chunk-append', {
                  fileName: currentRecordingNameRef.current,
                  chunk: buffer
                });
              } catch (e) {}
            }
          }
        };

        rec.onstop = () => {
          console.log(`[REC] Recorder stopped with ${recordedChunksRef.current.length} chunks`);
          if (recordedChunksRef.current.length > 0) {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            saveRecordingBlob(blob, currentRecordingNameRef.current);
          } else {
            console.warn('[REC] No recorded chunks available.');
          }
        };
      };

      try {
        recorder = new MediaRecorder(combinedStream, options);
        attachHandlers(recorder);
        recorder.start(1000);
      } catch (err1) {
        console.warn('[REC] MediaRecorder with audio failed, falling back to video only:', err1);
        try {
          const videoOnly = new MediaStream(finalVideoStream.getVideoTracks());
          recorder = new MediaRecorder(videoOnly, options);
          attachHandlers(recorder);
          recorder.start(1000);
        } catch (err2) {
          console.warn('[REC] MediaRecorder with mimeType options failed, trying default settings:', err2);
          const videoOnly = new MediaStream(finalVideoStream.getVideoTracks());
          recorder = new MediaRecorder(videoOnly);
          attachHandlers(recorder);
          recorder.start(1000);
        }
      }

      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

      // Periodic duration ticker
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((sec) => sec + 1);
        if (recorder.state === 'recording') {
          try { recorder.requestData(); } catch (e) {}
        }
      }, 1000);

      console.log('[REC] Recording started successfully as:', fileName);
    } catch (err) {
      console.error('Không thể bắt đầu ghi hình:', err);
      // Fallback timer running anyway
      setIsRecording(true);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((sec) => sec + 1);
      }, 1000);
    }
  };

  // Stop recording and save immediately
  const stopRecordingAndSave = () => {
    if (recordCanvasTickerRef.current) clearInterval(recordCanvasTickerRef.current);
    if (recRenderIntervalRef.current) clearInterval(recRenderIntervalRef.current);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    if (recordDisplayStreamRef.current) {
      try {
        recordDisplayStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      recordDisplayStreamRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.requestData();
      } catch (e) {}
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Teacher clicks End Classroom button
  const handleTeacherEndClass = () => {
    if (window.confirm(t('confirmClear').replace('bảng', 'buổi học và lưu lại bài giảng'))) {
      if (socket) {
        socket.emit('teacher-ended-class');
      }
      stopRecordingAndSave();
      alert(language === 'en'
        ? 'Class ended! Video is being saved to the lich-su-hoc-tap folder and downloaded to your computer.'
        : 'Đã kết thúc buổi học! File video đang được lưu vào thư mục lich-su-hoc-tap và tải về máy tính.'
      );
    }
  };



  // Tab close protection: try to save recording before tab closes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (userRole === 'teacher' && mediaRecorderRef.current) {
        const recorder = mediaRecorderRef.current;
        if (recorder.state === 'recording') {
          try {
            recorder.requestData();
          } catch (err) {}
          try {
            recorder.stop();
          } catch (err) {}
          e.preventDefault();
          e.returnValue = 'Bạn có buổi học đang ghi hình. Hãy bấm Kết Thúc Buổi Học để lưu bài nhé!';
          return e.returnValue;
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userRole]);

  // Component unmount cleanup for recording resources
  useEffect(() => {
    return () => {
      if (recordCanvasTickerRef.current) clearInterval(recordCanvasTickerRef.current);
      if (recRenderIntervalRef.current) clearInterval(recRenderIntervalRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordDisplayStreamRef.current) {
        try {
          recordDisplayStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.requestData();
          mediaRecorderRef.current.stop();
        } catch (err) {}
      }
    };
  }, []);

  const formatDuration = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Zoom control buttons
  const handleZoomIn = () => {
    setZoom((prev) => ({ ...prev, scale: Math.min(4.5, prev.scale * 1.25) }));
  };
  const handleZoomOut = () => {
    setZoom((prev) => ({ ...prev, scale: Math.max(0.4, prev.scale * 0.8) }));
  };
  const handleResetZoom = () => {
    setZoom({ scale: 1.0, offsetX: 0, offsetY: 0 });
  };

  // Determine if there is any unpinned image currently being manipulated
  const hasUnpinnedImage = exerciseImages.some((img) => !img.pinned);

  // Render Full-Screen Black Screen for Student When Class Ended
  if (isClassEnded) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050806] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 shadow-2xl">
          <GraduationCap size={44} />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          {t('classEndedTitle')}
        </h1>
        <p className="text-slate-400 max-w-md text-sm mb-8 leading-relaxed">
          {t('classEndedDesc')}
        </p>
        <button
          onClick={() => {
            try { window.close(); } catch (e) {}
          }}
          className="btn-primary px-8 py-3 rounded-2xl text-sm font-bold shadow-xl cursor-pointer"
        >
          {t('closeWebBtn')}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={`blackboard-container ${boardBg === 'green' ? 'board-green' : 'board-dark'}`}
      style={{
        cursor: activeTool === 'laser' ? 'crosshair' : activeTool === 'eraser' ? 'cell' : 'default'
      }}
    >
      <div className="blackboard-texture" />
      <div className="blackboard-frame" />

      {/* Layer 1: Pinned Images Layer (z-15, below drawing canvas so strokes draw on top) */}
      <div
        className="absolute inset-0 z-15 pointer-events-none"
        style={{
          transform: `translate(${zoom.offsetX}px, ${zoom.offsetY}px) scale(${zoom.scale})`,
          transformOrigin: '0 0'
        }}
      >
        {exerciseImages
          .filter((img) => img.pinned)
          .map((img) => (
            <div
              key={img.id}
              className="exercise-image-box border-transparent shadow-none"
              style={{
                left: `${img.x}px`,
                top: `${img.y}px`,
                width: `${img.w}px`,
                height: `${img.h}px`
              }}
            >
              <img src={img.src} alt="Đề bài" style={{ pointerEvents: 'none' }} />
            </div>
          ))}
      </div>

      {/* Main Drawing Canvas (z-20) */}
      <canvas
        ref={mainCanvasRef}
        className="absolute inset-0 z-20 block pointer-events-none"
      />

      {/* Preview & Laser Trail Canvas (z-25) */}
      <canvas
        ref={previewCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="absolute inset-0 z-25 block touch-none pointer-events-auto"
      />

      {/* Layer 2: Unpinned Active Images Layer (z-30, ABOVE canvases so user can click Pin, Delete & Drag easily!) */}
      <div
        className="absolute inset-0 z-30"
        style={{
          transform: `translate(${zoom.offsetX}px, ${zoom.offsetY}px) scale(${zoom.scale})`,
          transformOrigin: '0 0',
          pointerEvents: hasUnpinnedImage ? 'auto' : 'none'
        }}
      >
        {exerciseImages.map((img) => (
          <div
            id={`img-box-${img.id}`}
            key={img.id}
            className={`exercise-image-box ${
              img.pinned
                ? 'pointer-events-none opacity-0'
                : 'border-2 border-dashed border-emerald-400 shadow-2xl pointer-events-auto'
            }`}
            style={{
              left: `${img.x}px`,
              top: `${img.y}px`,
              width: `${img.w}px`,
              height: `${img.h}px`,
              display: img.pinned ? 'none' : 'block'
            }}
          >
            {/* Top Toolbar: Drag handle, Pin button & Delete button */}
            <div
              className="image-drag-handle"
              onMouseDown={(e) => handleStartDragImage(e, img)}
              title="Kéo di chuyển ảnh đề bài"
            >
              <GripHorizontal size={13} />
              <span>Kéo đề bài</span>
            </div>

            <div className="absolute -top-9 right-0 flex items-center gap-1.5 z-40 pointer-events-auto">
              <button
                onClick={() => handleTogglePinImage(img.id)}
                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center gap-1 text-xs font-bold px-2.5 cursor-pointer border border-emerald-400/40"
                title="Ghim cố định ảnh vào bảng để vẽ đè lên"
              >
                <Pin size={13} />
                <span>Ghim</span>
              </button>

              <button
                onClick={() => handleDeleteImage(img.id)}
                className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg cursor-pointer border border-red-400/40"
                title="Xóa ảnh đề bài"
              >
                <X size={14} />
              </button>
            </div>

            <img src={img.src} alt="Đề bài" style={{ pointerEvents: 'none' }} />

            <div
              className="image-resize-handle"
              onMouseDown={(e) => handleStartResizeImage(e, img)}
              title="Kéo góc để phóng to / thu nhỏ ảnh"
            />
          </div>
        ))}
      </div>

      {/* Layer 3: Unpin Buttons Layer for Pinned Images (z-35, allows unpinning even when image is pinned) */}
      <div
        className="absolute inset-0 z-35 pointer-events-none"
        style={{
          transform: `translate(${zoom.offsetX}px, ${zoom.offsetY}px) scale(${zoom.scale})`,
          transformOrigin: '0 0'
        }}
      >
        {exerciseImages
          .filter((img) => img.pinned)
          .map((img) => (
            <div
              key={img.id}
              className="absolute pointer-events-auto opacity-30 hover:opacity-100 transition"
              style={{
                left: `${img.x + img.w - 75}px`,
                top: `${img.y + 6}px`
              }}
            >
              <button
                onClick={() => handleTogglePinImage(img.id)}
                className="p-1 rounded-md bg-black/70 hover:bg-emerald-700 text-emerald-300 hover:text-white text-[11px] flex items-center gap-1 px-2 cursor-pointer backdrop-blur-sm border border-emerald-500/30 shadow-md"
                title="Ảnh đang ghim cố định. Bấm để Bỏ ghim và di chuyển"
              >
                <PinOff size={12} />
                <span>Bỏ ghim</span>
              </button>
            </div>
          ))}
      </div>

      {/* Remote cursors display */}
      {Object.entries(remoteCursors).map(([id, cursor]) => {
        const screenX = cursor.x * zoom.scale + zoom.offsetX;
        const screenY = cursor.y * zoom.scale + zoom.offsetY;
        return (
          <div
            key={id}
            className="remote-cursor"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
              left: 0,
              top: 0
            }}
          >
            {cursor.isLaser ? (
              <div className="laser-dot" />
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-700/80 text-white text-xs backdrop-blur-sm border border-emerald-400/30 shadow-md">
                <MousePointer size={12} />
                <span>{cursor.userName || 'Bạn học'}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Hidden file input for uploading exercises */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Top Left: Board Info, Background Switch & End Class Recording */}
      <div className="absolute top-4 left-6 z-40 flex items-center gap-2 glass-panel px-3 py-1.5 rounded-xl shadow-lg">
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
          {boardBg === 'green' ? t('boardGreen') : t('boardDark')}
        </span>
        <button
          onClick={() => {
            const next = boardBg === 'green' ? 'dark' : 'green';
            setBoardBg(next);
          }}
          className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition font-medium border border-white/15 cursor-pointer"
          title={t('switchBoardTitle')}
        >
          {boardBg === 'green' ? t('switchBoardDark') : t('switchBoardGreen')}
        </button>

        <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

        {/* Recording Indicator & End Session Button */}
        {isRecording ? (
          <div className="flex items-center gap-2">
            <span className="rec-badge">
              <span className="rec-dot" />
              <span>REC {formatDuration(recordingDuration)}</span>
            </span>

            {userRole === 'teacher' && (
              <button
                onClick={handleTeacherEndClass}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition cursor-pointer"
                title={t('endClassTitle')}
              >
                <StopCircle size={13} />
                <span>{t('endClassBtn')}</span>
              </button>
            )}
          </div>
        ) : (
          userRole === 'teacher' && (
            <button
              onClick={() => startRecording(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg transition animate-pulse cursor-pointer border border-red-400/40"
              title={t('recTabTitle')}
            >
              <Disc size={14} className="text-white" />
              <span>{t('startTabRec')}</span>
            </button>
          )
        )}
      </div>

      {/* Reminder Banner for Teacher to Record Full Tab Web */}
      {userRole === 'teacher' && !isRecording && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 glass-panel px-4 py-2.5 rounded-2xl border border-red-500/50 shadow-2xl animate-fade-in bg-red-950/40">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-ping flex-shrink-0" />
          <span className="text-xs font-semibold text-white">
            {t('recPromptBanner')}
          </span>
          <button
            onClick={() => startRecording(true)}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg cursor-pointer flex-shrink-0"
          >
            <Disc size={13} />
            {t('startTabRec')}
          </button>
        </div>
      )}

      {/* Notification Toast for Saved Recording */}
      {savedRecordingMsg && (
        <div className="fixed top-28 left-6 z-50 glass-panel px-4 py-2.5 rounded-2xl border border-emerald-400/40 shadow-2xl text-xs font-bold text-emerald-300 animate-fade-in flex items-center gap-2">
          <Check size={16} className="text-emerald-400" />
          <span>{savedRecordingMsg}</span>
        </div>
      )}

      {/* Bottom Left: Independent Zoom Controls */}
      <div className="absolute bottom-5 left-6 z-40 flex items-center gap-1.5 glass-panel px-3 py-1.5 rounded-xl shadow-lg">
        <span className="text-xs font-semibold text-slate-300 px-1">
          🔍 {Math.round(zoom.scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          title={t('zoomIn')}
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          title={t('zoomOut')}
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          title={t('zoomReset')}
        >
          <RotateCw size={14} />
        </button>
      </div>

      {/* Top Floating Main Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 glass-panel px-3 py-2 rounded-2xl">
        <button
          onClick={() => setActiveTool('pen')}
          className={`tool-btn ${activeTool === 'pen' ? 'active' : ''}`}
          title={t('toolPen')}
        >
          <Pencil size={18} />
        </button>

        <button
          onClick={() => setActiveTool('highlighter')}
          className={`tool-btn ${activeTool === 'highlighter' ? 'active' : ''}`}
          title={t('toolHighlighter')}
        >
          <Highlighter size={18} />
        </button>

        <button
          onClick={() => setActiveTool('laser')}
          className={`tool-btn ${activeTool === 'laser' ? 'active' : ''}`}
          title={t('toolLaser')}
        >
          <Flame size={18} className={activeTool === 'laser' ? 'text-red-600' : 'text-red-400'} />
        </button>

        <div className="w-[1px] h-5 bg-white/15 mx-1" />

        <button
          onClick={() => setActiveTool('line')}
          className={`tool-btn ${activeTool === 'line' ? 'active' : ''}`}
          title={t('toolLine')}
        >
          <Minus size={18} />
        </button>

        <button
          onClick={() => setActiveTool('arrow')}
          className={`tool-btn ${activeTool === 'arrow' ? 'active' : ''}`}
          title={t('toolArrow')}
        >
          <MoveRight size={18} />
        </button>

        <button
          onClick={() => setActiveTool('rect')}
          className={`tool-btn ${activeTool === 'rect' ? 'active' : ''}`}
          title={t('toolRect')}
        >
          <Square size={17} />
        </button>

        <button
          onClick={() => setActiveTool('circle')}
          className={`tool-btn ${activeTool === 'circle' ? 'active' : ''}`}
          title={t('toolCircle')}
        >
          <Circle size={17} />
        </button>

        <div className="w-[1px] h-5 bg-white/15 mx-1" />

        {/* Text tool button */}
        <button
          onClick={() => {
            setActiveTool('text');
            // When clicked from toolbar (not canvas), default to center of visible board area
            const canvas = mainCanvasRef.current;
            if (canvas) {
              const { scale, offsetX, offsetY } = zoomRef.current;
              const centerX = (canvas.width / 2 - offsetX) / scale;
              const centerY = (canvas.height / 2 - offsetY) / scale;
              setTextInsertPos({ x: Math.round(centerX), y: Math.round(centerY) });
            }
            setTextModalPos({ x: window.innerWidth / 2 - 160, y: 120 });
            setShowTextModal(true);
          }}
          className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`}
          title={t('toolText')}
        >
          <Type size={18} />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="tool-btn"
          title={t('toolImage')}
        >
          <ImageIcon size={18} />
        </button>

        <div className="w-[1px] h-5 bg-white/15 mx-1" />

        <button
          onClick={() => setActiveTool('eraser')}
          className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
          title={t('toolEraser')}
        >
          <Eraser size={18} />
        </button>

        <button onClick={handleUndo} className="tool-btn" title={t('toolUndo')}>
          <RotateCcw size={18} />
        </button>

        <button onClick={handleClear} className="tool-btn hover:text-red-400" title={t('toolClear')}>
          <Trash2 size={18} />
        </button>

        <button onClick={handleExportPNG} className="tool-btn hover:text-emerald-400" title={t('toolExport')}>
          <Download size={18} />
        </button>
      </div>

      {/* Bottom Floating Palette: Chalk Colors & Stroke Thickness */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 glass-panel px-4 py-2 rounded-2xl">
        <div className="flex items-center gap-2">
          {CHALK_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setChalkColor(c.value);
                if (activeTool === 'eraser' || activeTool === 'laser') setActiveTool('pen');
              }}
              className="w-7 h-7 rounded-full transition-all duration-150 flex items-center justify-center cursor-pointer"
              style={{
                backgroundColor: c.value,
                border: chalkColor === c.value ? '2px solid #ffffff' : '2px solid rgba(255,255,255,0.2)',
                transform: chalkColor === c.value ? 'scale(1.25)' : 'scale(1)',
                boxShadow: chalkColor === c.value ? `0 0 10px ${c.value}` : 'none'
              }}
              title={c.name}
            />
          ))}
        </div>

        <div className="w-[1px] h-5 bg-white/15 mx-1" />

        <div className="flex items-center gap-1.5">
          {STROKE_WIDTHS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStrokeWidth(s.value)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                strokeWidth === s.value
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rich Text Editor Modal with Custom Font Sizes */}
      {showTextModal && (
        <div
          className="fixed z-50 glass-panel p-4 rounded-2xl border border-white/20 shadow-2xl animate-fade-in w-80"
          style={{ left: `${textModalPos.x}px`, top: `${textModalPos.y}px` }}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Type size={14} className="text-emerald-400" />
              {t('textInsertTitle')}
            </span>
            <button
              onClick={() => setShowTextModal(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleSubmitText} className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                {t('fontSizeLabel')}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {FONT_SIZES.map((f) => (
                  <button
                    type="button"
                    key={f.value}
                    onClick={() => setTextFontSize(f.value)}
                    className={`py-1 px-2 rounded-lg text-xs font-medium transition cursor-pointer border ${
                      textFontSize === f.value
                        ? 'border-emerald-500 bg-emerald-600 text-white font-bold'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                {t('fontSizeLabel').replace(':', '')}:
              </label>
              <textarea
                rows={3}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={t('textPlaceholder')}
                style={{ backgroundColor: '#111a14', color: '#ffffff' }}
                className="w-full p-2.5 rounded-xl border border-white/15 text-xs focus:outline-none focus:border-emerald-500 resize-none font-sans"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{t('textSubmit')}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
