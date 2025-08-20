import type { Project, Image, Annotation, Category, ApiResponse, ListResponse } from "@/types";

// API 基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// 请求配置
const defaultHeaders = {
  "Content-Type": "application/json",
};

// 通用请求函数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const request = async <T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "请求失败");
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error("API 请求错误:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
};

// 项目相关 API
export const projectApi = {
  // 获取项目列表
  getProjects: (params?: { page?: number; pageSize?: number }) =>
    request<ListResponse<Project>>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `/projects${params ? `?${new URLSearchParams(params as any)}` : ""}`
    ),

  // 创建项目
  createProject: (project: Omit<Project, "id" | "created_at" | "updated_at">) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(project),
    }),

  // 获取项目详情
  getProject: (id: string) => request<Project>(`/projects/${id}`),

  // 更新项目
  updateProject: (id: string, updates: Partial<Project>) =>
    request<Project>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  // 删除项目
  deleteProject: (id: string) =>
    request(`/projects/${id}`, {
      method: "DELETE",
    }),
};

// 图片相关 API
export const imageApi = {
  // 获取项目图片列表
  getProjectImages: (projectId: string) => request<Image[]>(`/projects/${projectId}/images`),

  // 上传图片
  uploadImages: (projectId: string, files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    return request<Image[]>(`/projects/${projectId}/images/upload`, {
      method: "POST",
      body: formData,
      headers: {}, // 不设置 Content-Type，让浏览器自动设置
    });
  },

  // 删除图片
  deleteImage: (id: string) =>
    request(`/images/${id}`, {
      method: "DELETE",
    }),
};

// 标注相关 API
export const annotationApi = {
  // 获取图片标注
  getImageAnnotations: (imageId: string) => request<Annotation[]>(`/images/${imageId}/annotations`),

  // 保存标注
  saveAnnotations: (imageId: string, annotations: Annotation[]) =>
    request<Annotation[]>(`/images/${imageId}/annotations`, {
      method: "POST",
      body: JSON.stringify({ annotations }),
    }),

  // 更新标注
  updateAnnotation: (id: string, updates: Partial<Annotation>) =>
    request<Annotation>(`/annotations/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  // 删除标注
  deleteAnnotation: (id: string) =>
    request(`/annotations/${id}`, {
      method: "DELETE",
    }),
};

// 类别相关 API
export const categoryApi = {
  // 获取项目类别
  getProjectCategories: (projectId: string) =>
    request<Category[]>(`/projects/${projectId}/categories`),

  // 创建类别
  createCategory: (category: Omit<Category, "id">) =>
    request<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(category),
    }),

  // 更新类别
  updateCategory: (id: string, updates: Partial<Category>) =>
    request<Category>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  // 删除类别
  deleteCategory: (id: string) =>
    request(`/categories/${id}`, {
      method: "DELETE",
    }),
};

// 导出相关 API
export const exportApi = {
  // 导出项目数据
  exportProject: (projectId: string, format: "json" | "coco" | "voc") =>
    request<Blob>(`/projects/${projectId}/export?format=${format}`, {
      method: "GET",
    }),

  // 导出图片标注
  exportImageAnnotations: (imageId: string, format: "json" | "coco" | "voc") =>
    request<string>(`/images/${imageId}/export?format=${format}`),
};

// 统计相关 API
export const statsApi = {
  // 获取项目统计
  getProjectStats: (projectId: string) =>
    request<{
      totalImages: number;
      annotatedImages: number;
      totalAnnotations: number;
      categoryStats: Record<string, number>;
    }>(`/projects/${projectId}/stats`),
};
