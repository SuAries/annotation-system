import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Annotation, ToolType, CanvasState, AnnotationType } from '@/types'
import { useProjectStore } from '@/stores/project'

// 标注管理 Store
export const useAnnotationStore = defineStore('annotation', () => {
  // 状态
  const annotations = ref<Annotation[]>([])
  const selectedAnnotation = ref<Annotation | null>(null)
  const currentTool = ref<ToolType>('rectangle' as ToolType)
  const isDrawing = ref(false)
  const history = ref<Annotation[][]>([])
  const historyIndex = ref(-1)
  
  // 画布状态
  const canvasState = ref<CanvasState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    currentTool: 'rectangle' as ToolType
  })

  // 计算属性
  const currentImageAnnotations = computed(() => {
    const projectStore = useProjectStore()
    const currentImageId = projectStore.currentImage?.id
    if (!currentImageId) return []
    return annotations.value.filter(ann => ann.image_id === currentImageId)
  })

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  // 工具操作
  const setCurrentTool = (tool: ToolType) => {
    currentTool.value = tool
    canvasState.value.currentTool = tool
  }

  const setDrawing = (drawing: boolean) => {
    isDrawing.value = drawing
  }

  // 标注操作
  const addAnnotation = (annotation: Annotation) => {
    annotations.value.push(annotation)
    saveToHistory()
  }

  const updateAnnotation = (annotationId: string, updates: Partial<Annotation>) => {
    const index = annotations.value.findIndex(ann => ann.id === annotationId)
    if (index !== -1) {
      annotations.value[index] = { ...annotations.value[index], ...updates }
      saveToHistory()
    }
  }

  const deleteAnnotation = (annotationId: string) => {
    annotations.value = annotations.value.filter(ann => ann.id !== annotationId)
    if (selectedAnnotation.value?.id === annotationId) {
      selectedAnnotation.value = null
    }
    saveToHistory()
  }

  const selectAnnotation = (annotation: Annotation | null) => {
    selectedAnnotation.value = annotation
  }

  const clearAnnotations = () => {
    annotations.value = []
    selectedAnnotation.value = null
    saveToHistory()
  }

  // 历史记录操作
  const saveToHistory = () => {
    // 删除当前位置之后的历史记录
    history.value = history.value.slice(0, historyIndex.value + 1)
    // 添加新的状态
    history.value.push([...annotations.value])
    historyIndex.value = history.value.length - 1
    
    // 限制历史记录数量
    if (history.value.length > 50) {
      history.value.shift()
      historyIndex.value--
    }
  }

  const undo = () => {
    if (canUndo.value) {
      historyIndex.value--
      annotations.value = [...history.value[historyIndex.value]]
      selectedAnnotation.value = null
    }
  }

  const redo = () => {
    if (canRedo.value) {
      historyIndex.value++
      annotations.value = [...history.value[historyIndex.value]]
      selectedAnnotation.value = null
    }
  }

  // 画布操作
  const setCanvasScale = (scale: number) => {
    canvasState.value.scale = Math.max(0.1, Math.min(5, scale))
  }

  const setCanvasOffset = (offsetX: number, offsetY: number) => {
    canvasState.value.offsetX = offsetX
    canvasState.value.offsetY = offsetY
  }

  const setCanvasDragging = (dragging: boolean) => {
    canvasState.value.isDragging = dragging
  }

  const resetCanvas = () => {
    canvasState.value = {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      currentTool: currentTool.value
    }
  }

  // 数据加载和保存
  const loadAnnotations = async (imageId: string) => {
    try {
      // TODO: 实现 API 调用
      // const response = await api.getImageAnnotations(imageId)
      // annotations.value = response.data
      saveToHistory()
    } catch (error) {
      console.error('加载标注数据失败:', error)
    }
  }

  const saveAnnotations = async () => {
    try {
      // TODO: 实现 API 调用
      // await api.saveAnnotations(annotations.value)
    } catch (error) {
      console.error('保存标注数据失败:', error)
    }
  }

  // 导出功能
  const exportAnnotations = (format: 'json' | 'coco' | 'voc', projectInfo?: any, imageInfo?: any) => {
    switch (format) {
      case 'json':
        return JSON.stringify({
          project: projectInfo,
          images: imageInfo,
          annotations: annotations.value
        }, null, 2)
      case 'coco':
        return exportToCOCO(projectInfo, imageInfo)
      case 'voc':
        return exportToVOC(projectInfo, imageInfo)
      default:
        return ''
    }
  }

  // 导出为 COCO 格式
  const exportToCOCO = (projectInfo: any, imageInfo: any) => {
    const cocoData = {
      info: {
        description: projectInfo?.description || '标注数据集',
        version: '1.0',
        year: new Date().getFullYear(),
        contributor: 'Annotation System',
        date_created: new Date().toISOString()
      },
      licenses: [{
        id: 1,
        name: 'Unknown License',
        url: ''
      }],
      images: imageInfo?.map((img: any, index: number) => ({
        id: index + 1,
        width: img.width,
        height: img.height,
        file_name: img.filename,
        license: 1,
        flickr_url: '',
        coco_url: '',
        date_captured: img.created_at
      })) || [],
      categories: [] as any[],
      annotations: [] as any[]
    }

    // 收集类别
    const categoryMap = new Map()
    let categoryId = 1
    
    annotations.value.forEach(ann => {
      if (!categoryMap.has(ann.category)) {
        categoryMap.set(ann.category, categoryId)
        cocoData.categories.push({
          id: categoryId,
          name: ann.category,
          supercategory: ''
        })
        categoryId++
      }
    })

    // 转换标注
    let annotationId = 1
    annotations.value.forEach(ann => {
      const imageIndex = imageInfo?.findIndex((img: any) => img.id === ann.image_id) || 0
      const imageId = imageIndex + 1
      
      if (ann.type === 'rectangle' && ann.coordinates.x !== undefined) {
        cocoData.annotations.push({
          id: annotationId++,
          image_id: imageId,
          category_id: categoryMap.get(ann.category),
          bbox: [ann.coordinates.x, ann.coordinates.y, ann.coordinates.width || 0, ann.coordinates.height || 0],
          area: (ann.coordinates.width || 0) * (ann.coordinates.height || 0),
          iscrowd: 0
        })
      } else if (ann.type === 'polygon' && ann.coordinates.points) {
        const segmentation = ann.coordinates.points.flatMap(p => [p.x, p.y])
        cocoData.annotations.push({
          id: annotationId++,
          image_id: imageId,
          category_id: categoryMap.get(ann.category),
          segmentation: [segmentation],
          area: calculatePolygonArea(ann.coordinates.points),
          bbox: calculatePolygonBbox(ann.coordinates.points),
          iscrowd: 0
        })
      }
    })

    return JSON.stringify(cocoData, null, 2)
  }

  // 导出为 VOC 格式
  const exportToVOC = (projectInfo: any, imageInfo: any) => {
    const vocData: any[] = []
    
    imageInfo?.forEach((img: any) => {
      const imageAnnotations = annotations.value.filter(ann => ann.image_id === img.id)
      
      if (imageAnnotations.length > 0) {
        const xmlData = {
          annotation: {
            folder: projectInfo?.name || 'dataset',
            filename: img.filename,
            path: img.url,
            source: {
              database: 'Unknown'
            },
            size: {
              width: img.width,
              height: img.height,
              depth: 3
            },
            segmented: 0,
            object: imageAnnotations.filter(ann => ann.type === 'rectangle').map(ann => ({
              name: ann.category,
              pose: 'Unspecified',
              truncated: 0,
              difficult: 0,
              bndbox: {
                xmin: ann.coordinates.x,
                ymin: ann.coordinates.y,
                xmax: (ann.coordinates.x || 0) + (ann.coordinates.width || 0),
                ymax: (ann.coordinates.y || 0) + (ann.coordinates.height || 0)
              }
            }))
          }
        }
        vocData.push(xmlData)
      }
    })

    return JSON.stringify(vocData, null, 2)
  }

  // 计算多边形面积
  const calculatePolygonArea = (points: { x: number; y: number }[]): number => {
    let area = 0
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      area += points[i].x * points[j].y
      area -= points[j].x * points[i].y
    }
    return Math.abs(area) / 2
  }

  // 计算多边形边界框
  const calculatePolygonBbox = (points: { x: number; y: number }[]): number[] => {
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)
    return [minX, minY, maxX - minX, maxY - minY]
  }

  // 初始化历史记录
  const initHistory = () => {
    history.value = [[]]
    historyIndex.value = 0
  }

  return {
    // 状态
    annotations,
    selectedAnnotation,
    currentTool,
    isDrawing,
    canvasState,
    // 计算属性
    currentImageAnnotations,
    canUndo,
    canRedo,
    // 方法
    setCurrentTool,
    setDrawing,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectAnnotation,
    clearAnnotations,
    undo,
    redo,
    setCanvasScale,
    setCanvasOffset,
    setCanvasDragging,
    resetCanvas,
    loadAnnotations,
    saveAnnotations,
    exportAnnotations,
    initHistory
  }
})