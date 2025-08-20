import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, Image, Category } from '@/types'

// 项目管理 Store
export const useProjectStore = defineStore('project', () => {
  // 状态
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const images = ref<Image[]>([])
  const currentImage = ref<Image | null>(null)
  const categories = ref<Category[]>([])
  const loading = ref(false)

  // 计算属性
  const currentProjectImages = computed(() => {
    if (!currentProject.value) return []
    return images.value.filter(img => img.project_id === currentProject.value!.id)
  })

  const currentProjectCategories = computed(() => {
    if (!currentProject.value) return []
    return categories.value.filter(cat => cat.project_id === currentProject.value!.id)
  })

  // 项目操作
  const setCurrentProject = (project: Project | null) => {
    currentProject.value = project
    if (project) {
      loadProjectImages(project.id)
      loadProjectCategories(project.id)
    }
  }

  const addProject = (project: Project) => {
    projects.value.push(project)
  }

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    const index = projects.value.findIndex(p => p.id === projectId)
    if (index !== -1) {
      projects.value[index] = { ...projects.value[index], ...updates }
    }
  }

  const deleteProject = (projectId: string) => {
    projects.value = projects.value.filter(p => p.id !== projectId)
    if (currentProject.value?.id === projectId) {
      currentProject.value = null
    }
  }

  // 图片操作
  const setCurrentImage = (image: Image | null) => {
    currentImage.value = image
  }

  const addImage = (image: Image) => {
    images.value.push(image)
  }

  const deleteImage = (imageId: string) => {
    images.value = images.value.filter(img => img.id !== imageId)
    if (currentImage.value?.id === imageId) {
      currentImage.value = null
    }
  }

  // 类别操作
  const addCategory = (category: Category) => {
    categories.value.push(category)
  }

  const updateCategory = (categoryId: string, updates: Partial<Category>) => {
    const index = categories.value.findIndex(c => c.id === categoryId)
    if (index !== -1) {
      categories.value[index] = { ...categories.value[index], ...updates }
    }
  }

  const deleteCategory = (categoryId: string) => {
    categories.value = categories.value.filter(c => c.id !== categoryId)
  }

  // 数据加载
  const loadProjects = async () => {
    loading.value = true
    try {
      // TODO: 实现 API 调用
      // const response = await api.getProjects()
      // projects.value = response.data
      
      // 临时添加示例数据
      if (projects.value.length === 0) {
        const sampleProject: Project = {
          id: 'sample-project-1',
          name: '示例标注项目',
          description: '这是一个示例项目，用于演示标注功能',
          user_id: 'user-1',
          categories: ['person', 'car', 'bicycle'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        projects.value.push(sampleProject)
        
        // 添加示例类别
        const sampleCategories: Category[] = [
          { id: 'cat-1', name: 'person', color: '#FF6B6B', project_id: 'sample-project-1' },
          { id: 'cat-2', name: 'car', color: '#4ECDC4', project_id: 'sample-project-1' },
          { id: 'cat-3', name: 'bicycle', color: '#45B7D1', project_id: 'sample-project-1' }
        ]
        categories.value.push(...sampleCategories)
        
        // 设置为当前项目
        setCurrentProject(sampleProject)
      }
    } catch (error) {
      console.error('加载项目失败:', error)
    } finally {
      loading.value = false
    }
  }

  const loadProjectImages = async (projectId: string) => {
    try {
      // TODO: 实现 API 调用
      // const response = await api.getProjectImages(projectId)
      // images.value = response.data
    } catch (error) {
      console.error('加载项目图片失败:', error)
    }
  }

  const loadProjectCategories = async (projectId: string) => {
    try {
      // TODO: 实现 API 调用
      // const response = await api.getProjectCategories(projectId)
      // categories.value = response.data
    } catch (error) {
      console.error('加载项目类别失败:', error)
    }
  }

  return {
    // 状态
    projects,
    currentProject,
    images,
    currentImage,
    categories,
    loading,
    // 计算属性
    currentProjectImages,
    currentProjectCategories,
    // 方法
    setCurrentProject,
    addProject,
    updateProject,
    deleteProject,
    setCurrentImage,
    addImage,
    deleteImage,
    addCategory,
    updateCategory,
    deleteCategory,
    loadProjects,
    loadProjectImages,
    loadProjectCategories
  }
})