/* eslint-disable @typescript-eslint/no-explicit-any */
// 标注系统核心类型定义



// 项目类型
export interface Project {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  categories: string[];
  created_at: string;
  updated_at: string;
}

// 图片类型
export interface Image {
  id: string;
  filename: string;
  url: string;
  project_id: string;
  width: number;
  height: number;
  metadata?: Record<string, any>;
  created_at: string;
}

// 标注类型枚举
export enum AnnotationType {
  RECTANGLE = "rectangle",
  POLYGON = "polygon",
  POINT = "point",
  KEYPOINT = "keypoint",
  CLASSIFICATION = "classification",
}

// 坐标类型
export interface Coordinates {
  // 矩形框坐标
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // 多边形坐标
  points?: Array<{ x: number; y: number }>;
  // 点坐标
  point?: { x: number; y: number };
}

// 标注类型
export interface Annotation {
  id: string;
  image_id: string;
  type: AnnotationType;
  category: string;
  coordinates: Coordinates;

  properties?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// 类别类型
export interface Category {
  id: string;
  name: string;
  color: string;
  project_id: string;
}

// 工具类型
export enum ToolType {
  SELECT = "select",
  RECTANGLE = "rectangle",
  POLYGON = "polygon",
  POINT = "point",
  KEYPOINT = "keypoint",
}

// 画布状态
export interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
  currentTool: ToolType;
}

// 导出格式
export enum ExportFormat {
  JSON = "json",
  COCO = "coco",
  VOC = "voc",
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 分页类型
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

// 列表响应类型
export interface ListResponse<T> {
  items: T[];
  pagination: Pagination;
}
