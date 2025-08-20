import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAnnotationStore } from "@/stores/annotation";
import { useProjectStore } from "@/stores/project";
import { coordinateUtils, keyboardUtils } from "@/utils";
import type { Annotation } from "@/types";
import { ToolType, AnnotationType } from "@/types";

// 颜色处理辅助函数
const hexToRgba = (hex: string, alpha: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0, 255, 0, ${alpha})`;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const darkenColor = (hex: string, factor: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;

  const r = Math.floor(parseInt(result[1], 16) * (1 - factor));
  const g = Math.floor(parseInt(result[2], 16) * (1 - factor));
  const b = Math.floor(parseInt(result[3], 16) * (1 - factor));

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
    .toString(16)
    .padStart(2, "0")}`;
};

// Canvas 操作 Composable
export const useCanvas = (getCurrentCategory?: () => string) => {
  // Store
  const annotationStore = useAnnotationStore();
  const projectStore = useProjectStore();

  // Canvas 相关引用
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const containerRef = ref<HTMLDivElement | null>(null);
  const ctx = ref<CanvasRenderingContext2D | null>(null);

  // 图片相关
  const imageRef = ref<HTMLImageElement | null>(null);
  const imageLoaded = ref(false);

  // 绘制状态
  const isDrawing = ref(false);
  const currentPath = ref<{ x: number; y: number }[]>([]);
  const startPoint = ref<{ x: number; y: number } | null>(null);

  // 鼠标状态
  const mousePosition = ref({ x: 0, y: 0 });
  const isDragging = ref(false);
  const dragStart = ref({ x: 0, y: 0 });

  // 计算属性
  const canvasSize = computed(() => {
    if (!canvasRef.value) return { width: 0, height: 0 };
    return {
      width: canvasRef.value.width,
      height: canvasRef.value.height,
    };
  });

  const canvasRect = computed(() => {
    if (!canvasRef.value) return new DOMRect();
    return canvasRef.value.getBoundingClientRect();
  });

  // 初始化 Canvas
  const initCanvas = () => {
    if (!canvasRef.value) return;

    ctx.value = canvasRef.value.getContext("2d");
    if (!ctx.value) return;

    // 延迟设置Canvas大小，确保DOM完全渲染
    setTimeout(() => {
      resizeCanvas();
    }, 100);

    // 绑定事件
    bindEvents();

    // 监听窗口大小变化
    window.addEventListener("resize", handleResize);
  };

  // 处理窗口大小变化
  const handleResize = () => {
    setTimeout(() => {
      resizeCanvas();
    }, 100);
  };

  // 调整 Canvas 大小
  const resizeCanvas = () => {
    if (!canvasRef.value || !containerRef.value) return;

    const container = containerRef.value;
    const rect = container.getBoundingClientRect();

    // 确保canvas尺寸不为0
    const width = Math.max(rect.width, container.clientWidth, 300);
    const height = Math.max(rect.height, container.clientHeight, 200);

    canvasRef.value.width = width;
    canvasRef.value.height = height;

    // 设置canvas样式尺寸
    canvasRef.value.style.width = width + "px";
    canvasRef.value.style.height = height + "px";

    // 重新绘制
    redraw();
  };

  // 加载图片
  const loadImage = (imageUrl: string) => {
    const img = new Image();
    img.onload = () => {
      imageRef.value = img;
      imageLoaded.value = true;

      // 重置画布状态
      annotationStore.resetCanvas();

      // 重新绘制
      redraw();
    };
    img.onerror = () => {
      console.error("图片加载失败:", imageUrl);
      imageLoaded.value = false;
    };
    img.src = imageUrl;
  };

  // 重新绘制整个画布
  const redraw = () => {
    if (!ctx.value || !canvasRef.value) return;

    const { scale, offsetX, offsetY } = annotationStore.canvasState;

    // 清空画布
    ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);

    // 保存当前状态
    ctx.value.save();

    // 应用变换
    ctx.value.translate(offsetX, offsetY);
    ctx.value.scale(scale, scale);

    // 绘制图片
    if (imageRef.value && imageLoaded.value) {
      drawImage();
    }

    // 绘制标注
    drawAnnotations();

    // 绘制当前绘制中的标注
    drawCurrentAnnotation();

    // 恢复状态
    ctx.value.restore();

    // 绘制十字光标（在所有内容之上）
    drawCrosshair();
  };

  // 绘制图片
  const drawImage = () => {
    if (!ctx.value || !imageRef.value) return;

    const img = imageRef.value;
    const canvas = canvasRef.value!;

    // 获取缩放因子
    const { scale } = annotationStore.canvasState;

    // 图片完全填满画布，不保持宽高比
    const drawX = 0;
    const drawY = 0;
    const drawWidth = canvas.width / scale;
    const drawHeight = canvas.height / scale;

    ctx.value.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  };

  // 绘制所有标注
  const drawAnnotations = () => {
    if (!ctx.value) return;

    annotationStore.currentImageAnnotations.forEach((annotation) => {
      drawAnnotation(annotation);
    });
  };

  // 绘制单个标注
  const drawAnnotation = (annotation: Annotation) => {
    if (!ctx.value) return;

    const isSelected = annotationStore.selectedAnnotation?.id === annotation.id;

    // 获取类别颜色
    const category = projectStore.currentProjectCategories.find(
      (cat) => cat.name === annotation.category
    );
    const baseColor = category?.color || "#00ff00"; // 默认绿色

    ctx.value.save();

    // 设置样式 - 选中时加深颜色并增加边框宽度
    if (isSelected) {
      // 将颜色加深30%
      const darkerColor = darkenColor(baseColor, 0.3);
      ctx.value.strokeStyle = darkerColor;
      ctx.value.lineWidth = 3;
      ctx.value.fillStyle = hexToRgba(darkerColor, 0.2);
    } else {
      ctx.value.strokeStyle = baseColor;
      ctx.value.lineWidth = 2;
      ctx.value.fillStyle = hexToRgba(baseColor, 0.1);
    }

    switch (annotation.type) {
      case "rectangle":
        drawRectangle(annotation);
        break;
      case "polygon":
        drawPolygon(annotation);
        break;
      case "point":
        drawPoint(annotation);
        break;
      case "keypoint":
        drawKeypoint(annotation);
        break;
    }

    ctx.value.restore();
  };

  // 绘制矩形
  const drawRectangle = (annotation: Annotation) => {
    if (!ctx.value || !annotation.coordinates.x || !annotation.coordinates.y) return;

    const { x, y, width = 0, height = 0 } = annotation.coordinates;

    ctx.value.fillRect(x, y, width, height);
    ctx.value.strokeRect(x, y, width, height);

    // 绘制标签
    drawLabel(annotation.category, x, y - 5);
  };

  // 绘制多边形
  const drawPolygon = (annotation: Annotation) => {
    if (!ctx.value || !annotation.coordinates.points) return;

    const points = annotation.coordinates.points;
    if (points.length < 2) return;

    ctx.value.beginPath();
    ctx.value.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.value.lineTo(points[i].x, points[i].y);
    }

    ctx.value.closePath();
    ctx.value.fill();
    ctx.value.stroke();

    // 绘制顶点
    points.forEach((point) => {
      ctx.value!.beginPath();
      ctx.value!.arc(point.x, point.y, 4, 0, 2 * Math.PI);
      ctx.value!.fill();
    });

    // 绘制标签
    if (points.length > 0) {
      drawLabel(annotation.category, points[0].x, points[0].y - 5);
    }
  };

  // 绘制点
  const drawPoint = (annotation: Annotation) => {
    if (!ctx.value || !annotation.coordinates.point) return;

    const { x, y } = annotation.coordinates.point;

    ctx.value.beginPath();
    ctx.value.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.value.fill();
    ctx.value.stroke();

    // 绘制标签
    drawLabel(annotation.category, x + 10, y - 5);
  };

  // 绘制关键点
  const drawKeypoint = (annotation: Annotation) => {
    if (!ctx.value || !annotation.coordinates.point) return;

    const { x, y } = annotation.coordinates.point;

    // 绘制十字标记
    ctx.value.beginPath();
    ctx.value.moveTo(x - 8, y);
    ctx.value.lineTo(x + 8, y);
    ctx.value.moveTo(x, y - 8);
    ctx.value.lineTo(x, y + 8);
    ctx.value.stroke();

    // 绘制中心点
    ctx.value.beginPath();
    ctx.value.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.value.fill();

    // 绘制标签
    drawLabel(annotation.category, x + 10, y - 5);
  };

  // 绘制标签
  const drawLabel = (text: string, x: number, y: number) => {
    if (!ctx.value) return;

    ctx.value.save();
    ctx.value.font = "12px Arial";
    ctx.value.fillStyle = "#000000";
    ctx.value.fillText(text, x, y);
    ctx.value.restore();
  };

  // 绘制当前正在绘制的标注
  const drawCurrentAnnotation = () => {
    if (!ctx.value || !isDrawing.value) return;

    const tool = annotationStore.currentTool;

    // 获取当前选择的类别颜色
    const currentCategoryName = getCurrentCategory ? getCurrentCategory() : "";
    const category = projectStore.currentProjectCategories.find(
      (cat) => cat.name === currentCategoryName
    );
    const baseColor = category?.color || "#ff0000"; // 默认红色

    ctx.value.save();
    ctx.value.strokeStyle = baseColor;
    ctx.value.lineWidth = 2;
    ctx.value.setLineDash([5, 5]);

    switch (tool) {
      case "rectangle":
        drawCurrentRectangle();
        break;
      case "polygon":
        drawCurrentPolygon();
        break;
    }

    ctx.value.restore();
  };

  // 绘制当前矩形
  const drawCurrentRectangle = () => {
    if (!ctx.value || !startPoint.value) return;

    const start = startPoint.value;
    const current = mousePosition.value;

    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);

    ctx.value.strokeRect(x, y, width, height);
  };

  // 绘制当前多边形
  const drawCurrentPolygon = () => {
    if (!ctx.value || currentPath.value.length === 0) return;

    const points = currentPath.value;

    ctx.value.beginPath();
    ctx.value.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.value.lineTo(points[i].x, points[i].y);
    }

    // 连接到鼠标位置
    ctx.value.lineTo(mousePosition.value.x, mousePosition.value.y);
    ctx.value.stroke();

    // 绘制顶点
    points.forEach((point) => {
      ctx.value!.beginPath();
      ctx.value!.arc(point.x, point.y, 4, 0, 2 * Math.PI);
      ctx.value!.fill();
    });
  };

  // 绘制十字光标
  const drawCrosshair = () => {
    if (!ctx.value || !canvasRef.value) return;
    if (!imageLoaded.value) return;

    const canvas = canvasRef.value;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const canvasRect = canvas.getBoundingClientRect();

    // 获取鼠标在画布上的屏幕坐标
    const mouseX = mousePosition.value.x;
    const mouseY = mousePosition.value.y;

    // 转换为屏幕坐标
    const { scale, offsetX, offsetY } = annotationStore.canvasState;
    const screenX = mouseX * scale + offsetX;
    const screenY = mouseY * scale + offsetY;

    // 保存当前状态
    ctx.value.save();

    // 重置变换，直接在屏幕坐标系绘制
    ctx.value.setTransform(1, 0, 0, 1, 0, 0);

    // 绘制黑色描边的十字线（外层）
    ctx.value.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.value.lineWidth = 4;
    ctx.value.setLineDash([]);

    // 绘制垂直线描边
    ctx.value.beginPath();
    ctx.value.moveTo(screenX, 0);
    ctx.value.lineTo(screenX, canvas.height);
    ctx.value.stroke();

    // 绘制水平线描边
    ctx.value.beginPath();
    ctx.value.moveTo(0, screenY);
    ctx.value.lineTo(canvas.width, screenY);
    ctx.value.stroke();

    // 绘制亮绿色十字线（内层）
    ctx.value.strokeStyle = "#00FF00";
    ctx.value.lineWidth = 2;

    // 绘制垂直线
    ctx.value.beginPath();
    ctx.value.moveTo(screenX, 0);
    ctx.value.lineTo(screenX, canvas.height);
    ctx.value.stroke();

    // 绘制水平线
    ctx.value.beginPath();
    ctx.value.moveTo(0, screenY);
    ctx.value.lineTo(canvas.width, screenY);
    ctx.value.stroke();

    // 绘制交叉点的圆点（黑色描边）
    ctx.value.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.value.lineWidth = 2;
    ctx.value.beginPath();
    ctx.value.arc(screenX, screenY, 4, 0, 2 * Math.PI);
    ctx.value.stroke();

    // 绘制交叉点的圆点（亮绿色填充）
    ctx.value.fillStyle = "#00FF00";
    ctx.value.beginPath();
    ctx.value.arc(screenX, screenY, 4, 0, 2 * Math.PI);
    ctx.value.fill();

    // 恢复状态
    ctx.value.restore();
  };

  // 屏幕坐标转画布坐标
  const screenToCanvas = (screenX: number, screenY: number) => {
    const { scale, offsetX, offsetY } = annotationStore.canvasState;
    return coordinateUtils.screenToCanvas(
      screenX,
      screenY,
      canvasRect.value,
      scale,
      offsetX,
      offsetY
    );
  };

  // 缩放画布
  const zoomCanvas = (delta: number, centerX?: number, centerY?: number) => {
    const { scale, offsetX, offsetY } = annotationStore.canvasState;
    const newScale = Math.max(0.1, Math.min(5, scale + delta * 0.1));

    if (centerX !== undefined && centerY !== undefined) {
      // 以指定点为中心缩放
      const scaleRatio = newScale / scale;
      const newOffsetX = centerX - (centerX - offsetX) * scaleRatio;
      const newOffsetY = centerY - (centerY - offsetY) * scaleRatio;

      annotationStore.setCanvasOffset(newOffsetX, newOffsetY);
    }

    annotationStore.setCanvasScale(newScale);
    redraw();
  };

  // 平移画布
  const panCanvas = (deltaX: number, deltaY: number) => {
    const { offsetX, offsetY } = annotationStore.canvasState;
    annotationStore.setCanvasOffset(offsetX + deltaX, offsetY + deltaY);
    redraw();
  };

  // 绑定事件
  const bindEvents = () => {
    if (!canvasRef.value) return;

    const canvas = canvasRef.value;

    // 鼠标事件
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("dblclick", handleDoubleClick);
    canvas.addEventListener("wheel", handleWheel);
    canvas.addEventListener("contextmenu", handleContextMenu);

    // 键盘事件
    document.addEventListener("keydown", handleKeyDown);

    // 窗口大小变化
    window.addEventListener("resize", resizeCanvas);
  };

  // 解绑事件
  const unbindEvents = () => {
    if (!canvasRef.value) return;

    const canvas = canvasRef.value;

    canvas.removeEventListener("mousedown", handleMouseDown);
    canvas.removeEventListener("mousemove", handleMouseMove);
    canvas.removeEventListener("mouseup", handleMouseUp);
    canvas.removeEventListener("dblclick", handleDoubleClick);
    canvas.removeEventListener("wheel", handleWheel);
    canvas.removeEventListener("contextmenu", handleContextMenu);

    document.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("resize", resizeCanvas);
  };

  // 鼠标按下事件
  const handleMouseDown = (event: MouseEvent) => {
    const canvasPos = screenToCanvas(event.clientX, event.clientY);
    mousePosition.value = canvasPos;

    if (event.button === 2) return; // 右键

    const tool = annotationStore.currentTool;

    switch (tool) {
      case "select":
        handleSelectMouseDown(canvasPos, event);
        break;
      case "rectangle":
        handleRectangleMouseDown(canvasPos);
        break;
      case "polygon":
        handlePolygonMouseDown(canvasPos);
        break;
      case "point":
      case "keypoint":
        handlePointMouseDown(canvasPos, tool);
        break;
    }
  };

  // 鼠标移动事件
  const handleMouseMove = (event: MouseEvent) => {
    const canvasPos = screenToCanvas(event.clientX, event.clientY);
    mousePosition.value = canvasPos;

    if (isDragging.value) {
      const deltaX = event.clientX - dragStart.value.x;
      const deltaY = event.clientY - dragStart.value.y;
      panCanvas(deltaX, deltaY);
      dragStart.value = { x: event.clientX, y: event.clientY };
    }

    // 始终重绘画布以更新十字光标位置
    redraw();
  };

  // 鼠标抬起事件
  const handleMouseUp = (event: MouseEvent) => {
    const canvasPos = screenToCanvas(event.clientX, event.clientY);

    if (isDragging.value) {
      isDragging.value = false;
      annotationStore.setCanvasDragging(false);
      return;
    }

    const tool = annotationStore.currentTool;

    switch (tool) {
      case "rectangle":
        handleRectangleMouseUp(canvasPos);
        break;
    }
  };

  // 双击事件
  const handleDoubleClick = (event: MouseEvent) => {
    event.preventDefault();

    // 如果正在绘制多边形，双击完成绘制
    if (isDrawing.value && annotationStore.currentTool === "polygon") {
      finishPolygon();
    }
  };

  // 滚轮事件
  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();

    const delta = event.deltaY > 0 ? -1 : 1;
    zoomCanvas(delta, event.clientX, event.clientY);
  };

  // 右键菜单事件
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();

    // 如果正在绘制多边形，右键完成绘制
    if (isDrawing.value && annotationStore.currentTool === "polygon") {
      finishPolygon();
    }
  };

  // 键盘事件
  const handleKeyDown = (event: KeyboardEvent) => {
    // 防止在输入框中触发快捷键
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      return;
    }

    // 撤销
    if (keyboardUtils.isComboPressed(event, "ctrl+z")) {
      event.preventDefault();
      annotationStore.undo();
      redraw();
    }

    // 重做
    if (
      keyboardUtils.isComboPressed(event, "ctrl+y") ||
      keyboardUtils.isComboPressed(event, "ctrl+shift+z")
    ) {
      event.preventDefault();
      annotationStore.redo();
      redraw();
    }

    // 删除选中的标注
    if (event.key === "Delete" && annotationStore.selectedAnnotation) {
      event.preventDefault();
      annotationStore.deleteAnnotation(annotationStore.selectedAnnotation.id);
      redraw();
    }

    // 工具切换快捷键
    switch (event.key) {
      case "v":
      case "V":
        event.preventDefault();
        annotationStore.setCurrentTool(ToolType.SELECT);
        break;
      case "r":
      case "R":
        event.preventDefault();
        annotationStore.setCurrentTool(ToolType.RECTANGLE);
        break;
      case "p":
      case "P":
        event.preventDefault();
        annotationStore.setCurrentTool(ToolType.POLYGON);
        break;
      case "o":
      case "O":
        event.preventDefault();
        annotationStore.setCurrentTool(ToolType.POINT);
        break;
      case "k":
      case "K":
        event.preventDefault();
        annotationStore.setCurrentTool(ToolType.KEYPOINT);
        break;
      case "Escape":
        // ESC 键取消当前操作
        event.preventDefault();
        if (isDrawing.value) {
          isDrawing.value = false;
          currentPath.value = [];
          startPoint.value = null;
          annotationStore.setDrawing(false);
          redraw();
        }
        if (annotationStore.selectedAnnotation) {
          annotationStore.selectAnnotation(null);
          redraw();
        }
        break;
    }
  };

  // 选择工具鼠标按下
  const handleSelectMouseDown = (pos: { x: number; y: number }, event: MouseEvent) => {
    // 查找点击位置的标注
    const clickedAnnotation = findAnnotationAtPosition(pos);

    if (clickedAnnotation) {
      // 选中标注
      annotationStore.selectAnnotation(clickedAnnotation);
      redraw();
    } else {
      // 取消选择
      annotationStore.selectAnnotation(null);
      redraw();

      // 开始拖拽画布
      isDragging.value = true;
      dragStart.value = { x: event.clientX, y: event.clientY };
      annotationStore.setCanvasDragging(true);
    }
  };

  // 查找指定位置的标注
  const findAnnotationAtPosition = (pos: { x: number; y: number }): Annotation | null => {
    const annotations = annotationStore.currentImageAnnotations;

    // 从后往前查找（最新的标注在最上层）
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i];

      if (isPositionInAnnotation(pos, annotation)) {
        return annotation;
      }
    }

    return null;
  };

  // 判断位置是否在标注内
  const isPositionInAnnotation = (
    pos: { x: number; y: number },
    annotation: Annotation
  ): boolean => {
    switch (annotation.type) {
      case "rectangle":
        if (
          annotation.coordinates.x !== undefined &&
          annotation.coordinates.y !== undefined &&
          annotation.coordinates.width !== undefined &&
          annotation.coordinates.height !== undefined
        ) {
          return coordinateUtils.isPointInRect(
            pos.x,
            pos.y,
            annotation.coordinates.x,
            annotation.coordinates.y,
            annotation.coordinates.width,
            annotation.coordinates.height
          );
        }
        break;
      case "polygon":
        if (annotation.coordinates.points) {
          return coordinateUtils.isPointInPolygon(pos, annotation.coordinates.points);
        }
        break;
      case "point":
      case "keypoint":
        if (annotation.coordinates.point) {
          const distance = coordinateUtils.distance(
            pos.x,
            pos.y,
            annotation.coordinates.point.x,
            annotation.coordinates.point.y
          );
          return distance <= 10; // 10像素的点击容差
        }
        break;
    }
    return false;
  };

  // 矩形工具鼠标按下
  const handleRectangleMouseDown = (pos: { x: number; y: number }) => {
    isDrawing.value = true;
    startPoint.value = pos;
    annotationStore.setDrawing(true);
  };

  // 矩形工具鼠标抬起
  const handleRectangleMouseUp = (pos: { x: number; y: number }) => {
    if (!isDrawing.value || !startPoint.value) return;

    const start = startPoint.value;
    const end = pos;

    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    // 创建新的标注
    if (width > 5 && height > 5) {
      const currentImageId = projectStore.currentImage?.id;
      if (!currentImageId) return;

      const annotation: Annotation = {
        id: Date.now().toString(),
        image_id: currentImageId,
        type: AnnotationType.RECTANGLE,
        category: getCurrentCategory?.() || "default",
        coordinates: { x, y, width, height },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      annotationStore.addAnnotation(annotation);
    }

    // 重置状态
    isDrawing.value = false;
    startPoint.value = null;
    annotationStore.setDrawing(false);

    redraw();
  };

  // 多边形工具鼠标按下
  const handlePolygonMouseDown = (pos: { x: number; y: number }) => {
    if (!isDrawing.value) {
      // 开始绘制多边形
      isDrawing.value = true;
      currentPath.value = [pos];
      annotationStore.setDrawing(true);
    } else {
      // 添加新的顶点
      currentPath.value.push(pos);
    }
  };

  // 完成多边形绘制
  const finishPolygon = () => {
    if (!isDrawing.value || currentPath.value.length < 3) return;

    const currentImageId = projectStore.currentImage?.id;
    if (!currentImageId) return;

    const annotation: Annotation = {
      id: Date.now().toString(),
      image_id: currentImageId,
      type: AnnotationType.POLYGON,
      category: getCurrentCategory?.() || "default",
      coordinates: { points: [...currentPath.value] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    annotationStore.addAnnotation(annotation);

    // 重置状态
    isDrawing.value = false;
    currentPath.value = [];
    annotationStore.setDrawing(false);

    redraw();
  };

  // 工具类型转换为标注类型
  const toolToAnnotationType = (tool: ToolType): AnnotationType => {
    switch (tool) {
      case ToolType.RECTANGLE:
        return AnnotationType.RECTANGLE;
      case ToolType.POLYGON:
        return AnnotationType.POLYGON;
      case ToolType.POINT:
        return AnnotationType.POINT;
      case ToolType.KEYPOINT:
        return AnnotationType.KEYPOINT;
      default:
        return AnnotationType.POINT;
    }
  };

  // 点工具鼠标按下
  const handlePointMouseDown = (pos: { x: number; y: number }, tool: ToolType) => {
    const currentImageId = projectStore.currentImage?.id;
    if (!currentImageId) return;

    const annotation: Annotation = {
      id: Date.now().toString(),
      image_id: currentImageId,
      type: toolToAnnotationType(tool),
      category: getCurrentCategory?.() || "default",
      coordinates: { point: pos },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    annotationStore.addAnnotation(annotation);
    redraw();
  };

  // 窗口resize事件处理
  const handleWindowResize = () => {
    setTimeout(() => {
      resizeCanvas();
    }, 100); // 延迟执行，确保DOM更新完成
  };

  // 生命周期
  onMounted(() => {
    initCanvas();
    window.addEventListener("resize", handleWindowResize);
  });

  onUnmounted(() => {
    unbindEvents();
    window.removeEventListener("resize", handleWindowResize);
  });

  // 清理函数
  const cleanup = () => {
    window.removeEventListener("resize", handleResize);
  };

  return {
    // 引用
    canvasRef,
    containerRef,

    // 状态
    imageLoaded,
    isDrawing,
    mousePosition,

    // 计算属性
    canvasSize,

    // 方法
    initCanvas,
    loadImage,
    redraw,
    zoomCanvas,
    panCanvas,
    screenToCanvas,
    handleResize,
    cleanup,
    getCurrentCategory: () => getCurrentCategory?.() || "",
    
    // 事件处理函数
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleWheel,
    handleContextMenu,
    handleKeyDown,
  };
};
