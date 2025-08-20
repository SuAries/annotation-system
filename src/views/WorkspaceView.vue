<template>
  <div class="workspace-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button-group>
          <el-button
            :type="annotationStore.currentTool === ToolType.RECTANGLE ? 'primary' : 'default'"
            :icon="Crop"
            @click="setTool(ToolType.RECTANGLE)"
          >
            矩形
          </el-button>
          <el-button
            :type="annotationStore.currentTool === ToolType.POLYGON ? 'primary' : 'default'"
            :icon="Connection"
            @click="setTool(ToolType.POLYGON)"
          >
            多边形
          </el-button>
          <el-button
            :type="annotationStore.currentTool === ToolType.POINT ? 'primary' : 'default'"
            :icon="Location"
            @click="setTool(ToolType.POINT)"
          >
            点
          </el-button>
          <el-button
            :type="annotationStore.currentTool === ToolType.KEYPOINT ? 'primary' : 'default'"
            :icon="Aim"
            @click="setTool(ToolType.KEYPOINT)"
          >
            关键点
          </el-button>
        </el-button-group>

        <el-divider direction="vertical" />

        <el-button-group>
          <el-button :disabled="!annotationStore.canUndo" :icon="RefreshLeft" @click="undo">
            撤销
          </el-button>
          <el-button :disabled="!annotationStore.canRedo" :icon="RefreshRight" @click="redo">
            重做
          </el-button>
        </el-button-group>

        <el-divider direction="vertical" />

        <el-button
          :icon="Delete"
          :disabled="!annotationStore.selectedAnnotation"
          @click="deleteSelected"
        >
          删除
        </el-button>
      </div>

      <div class="toolbar-center">
        <span class="current-image-info" v-if="projectStore.currentImage">
          {{ projectStore.currentImage.filename }}
        </span>
      </div>

      <div class="toolbar-right">
        <el-button :icon="Download" @click="showExportDialog">导出数据</el-button>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="workspace-content">
      <!-- 左侧图片列表 -->
      <div class="sidebar-left">
        <div class="sidebar-header">
          <h3>图片列表</h3>
          <el-button size="small" :icon="Plus" @click="uploadImages">上传</el-button>
        </div>

        <div class="image-list">
          <div
            v-for="image in projectStore.currentProjectImages"
            :key="image.id"
            class="image-item"
            :class="{ active: projectStore.currentImage?.id === image.id }"
            @click="selectImage(image)"
          >
            <div class="image-thumbnail">
              <img :src="image.url" :alt="image.filename" />
            </div>
            <div class="image-info">
              <div class="image-name">{{ image.filename }}</div>
              <div class="image-size">{{ image.width }} × {{ image.height }}</div>
            </div>
          </div>
        </div>

        <!-- 上传对话框 -->
        <el-dialog v-model="uploadDialogVisible" title="上传图片" width="500px">
          <el-upload
            ref="uploadRef"
            class="upload-demo"
            drag
            multiple
            :auto-upload="false"
            :on-change="handleFileChange"
            accept="image/*"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">将图片拖拽到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持 jpg/png/gif 格式，单个文件不超过 10MB</div>
            </template>
          </el-upload>

          <template #footer>
            <span class="dialog-footer">
              <el-button @click="uploadDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="confirmUpload">确定上传</el-button>
            </span>
          </template>
        </el-dialog>
      </div>

      <!-- 中间画布区域 -->
      <div class="canvas-container" ref="containerRef">
        <div class="canvas-wrapper">
          <canvas
            ref="canvasRef"
            :class="['annotation-canvas', { 'has-image': imageLoaded }]"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @dblclick="handleDoubleClick"
            @wheel="handleWheel"
            @contextmenu="handleContextMenu"
            tabindex="0"
            @keydown="handleKeyDown"
          />

          <!-- 无图片提示 -->
          <div v-if="!projectStore.currentImage" class="no-image-placeholder">
            <el-empty description="请选择要标注的图片" />
          </div>

          <!-- 加载状态 -->
          <div v-if="imageLoading" class="loading-overlay">
            <el-loading-directive v-loading="true" text="正在加载图片..." />
          </div>
        </div>
      </div>

      <!-- 右侧标注列表 -->
      <div class="sidebar-right">
        <div class="sidebar-header">
          <h3>标注列表</h3>
          <el-button size="small" :icon="Plus" @click="addCategory">添加类别</el-button>
        </div>

        <!-- 类别选择 -->
        <div class="category-selector">
          <el-select v-model="currentCategory" placeholder="选择标注类别" style="width: 100%">
            <el-option
              v-for="category in projectStore.currentProjectCategories"
              :key="category.id"
              :label="category.name"
              :value="category.name"
            >
              <div class="category-option">
                <div class="category-color" :style="{ backgroundColor: category.color }"></div>
                {{ category.name }}
              </div>
            </el-option>
          </el-select>
        </div>

        <!-- 类别管理 -->
        <div class="category-management">
          <div class="category-header">
            <h4>类别管理</h4>
          </div>
          <div class="category-list">
            <div
              v-for="category in projectStore.currentProjectCategories"
              :key="category.id"
              class="category-item"
            >
              <div class="category-info">
                <div class="category-color-dot" :style="{ backgroundColor: category.color }"></div>
                <span class="category-name">{{ category.name }}</span>
              </div>
              <div class="category-actions">
                <el-button
                  size="small"
                  type="danger"
                  :icon="Delete"
                  @click="deleteCategory(category)"
                  title="删除类别"
                />
              </div>
            </div>
            <div v-if="projectStore.currentProjectCategories.length === 0" class="no-categories">
              <el-empty description="暂无类别" :image-size="60" />
            </div>
          </div>
        </div>

        <!-- 标注列表 -->
        <div class="annotation-list">
          <div
            v-for="annotation in annotationStore.currentImageAnnotations"
            :key="annotation.id"
            class="annotation-item"
            :class="{ active: annotationStore.selectedAnnotation?.id === annotation.id }"
            @click="selectAnnotation(annotation)"
          >
            <div class="annotation-info">
              <div class="annotation-type">{{ getAnnotationTypeLabel(annotation.type) }}</div>
              <div class="annotation-category">{{ annotation.category }}</div>
            </div>
            <div class="annotation-actions">
              <el-button size="small" :icon="Edit" @click.stop="editAnnotation(annotation)" />
              <el-button
                size="small"
                :icon="Delete"
                @click.stop="deleteAnnotation(annotation.id)"
              />
            </div>
          </div>
        </div>

        <!-- 添加类别对话框 -->
        <el-dialog v-model="categoryDialogVisible" title="添加类别" width="400px">
          <el-form :model="categoryForm" label-width="80px">
            <el-form-item label="类别名称">
              <el-input v-model="categoryForm.name" placeholder="请输入类别名称" />
            </el-form-item>
            <el-form-item label="颜色">
              <el-color-picker v-model="categoryForm.color" />
            </el-form-item>
          </el-form>

          <template #footer>
            <span class="dialog-footer">
              <el-button @click="categoryDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="confirmAddCategory">确定</el-button>
            </span>
          </template>
        </el-dialog>

        <!-- 编辑标注对话框 -->
        <el-dialog v-model="editDialogVisible" title="编辑标注" width="400px">
          <el-form v-if="editingAnnotation" label-width="80px">
            <el-form-item label="标注类型">
              <el-input :value="getAnnotationTypeLabel(editingAnnotation.type)" disabled />
            </el-form-item>
            <el-form-item label="标注类别">
              <el-select
                v-model="editingAnnotation.category"
                placeholder="选择类别"
                style="width: 100%"
              >
                <el-option
                  v-for="category in projectStore.currentProjectCategories"
                  :key="category.id"
                  :label="category.name"
                  :value="category.name"
                >
                  <div class="category-option">
                    <div class="category-color" :style="{ backgroundColor: category.color }"></div>
                    {{ category.name }}
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-form>

          <template #footer>
            <span class="dialog-footer">
              <el-button @click="editDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="confirmEdit">确定</el-button>
            </span>
          </template>
        </el-dialog>

        <!-- 导出数据弹窗 -->
        <el-dialog v-model="exportDialogVisible" title="导出数据" width="600px">
          <div class="export-content">
            <div class="export-info">
              <p>当前图片的矩形标注数据：</p>
              <p class="image-name">{{ projectStore.currentImage?.filename }}</p>
            </div>

            <el-input
              v-model="exportData"
              type="textarea"
              :rows="15"
              readonly
              class="export-textarea"
              placeholder="暂无矩形标注数据"
            />
          </div>

          <template #footer>
            <span class="dialog-footer">
              <el-button @click="exportDialogVisible = false">关闭</el-button>
              <el-button type="primary" @click="copyExportData">复制数据</el-button>
            </span>
          </template>
        </el-dialog>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox, type UploadInstance } from "element-plus";
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Pointer,
  Crop,
  Connection,
  Location,
  Aim,
  RefreshLeft,
  RefreshRight,
  Delete,
  Download,
  Plus,
  Edit,
  UploadFilled,
} from "@element-plus/icons-vue";
import { useProjectStore } from "@/stores/project";
import { useAnnotationStore } from "@/stores/annotation";
import { useCanvas } from "@/composables/useCanvas";
import type { Image, Annotation, Category } from "@/types";
import { ToolType } from "@/types";
import { colorUtils, generateId, readImageFile } from "@/utils";

// 路由和状态
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const router = useRouter();
const projectStore = useProjectStore();
const annotationStore = useAnnotationStore();

// Canvas 相关
const { 
  canvasRef, 
  containerRef, 
  imageLoaded, 
  loadImage, 
  redraw, 
  initCanvas, 
  cleanup,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleDoubleClick,
  handleWheel,
  handleContextMenu,
  handleKeyDown
} = useCanvas(
  () => currentCategory.value
);

// 上传相关
const uploadRef = ref<UploadInstance>();
const uploadDialogVisible = ref(false);
const uploadFiles = ref<File[]>([]);

// 类别相关
const categoryDialogVisible = ref(false);
const currentCategory = ref("");
const categoryForm = reactive({
  name: "",
  color: colorUtils.randomColor(),
});

// 加载状态
const imageLoading = ref(false);

// 设置工具
const setTool = (tool: ToolType) => {
  annotationStore.setCurrentTool(tool);
};

// 撤销重做
const undo = () => {
  annotationStore.undo();
  redraw();
};

const redo = () => {
  annotationStore.redo();
  redraw();
};

// 删除选中的标注
const deleteSelected = () => {
  if (annotationStore.selectedAnnotation) {
    annotationStore.deleteAnnotation(annotationStore.selectedAnnotation.id);
    redraw();
  }
};

// 选择图片
const selectImage = async (image: Image) => {
  try {
    imageLoading.value = true;
    projectStore.setCurrentImage(image);
    loadImage(image.url);
    await annotationStore.loadAnnotations(image.id);
  } catch (error) {
    console.error("加载图片失败:", error);
    ElMessage.error("加载图片失败，请稍后重试");
  } finally {
    imageLoading.value = false;
  }
};

// 选择标注
const selectAnnotation = (annotation: Annotation) => {
  annotationStore.selectAnnotation(annotation);
  redraw();
};

// 删除标注
const deleteAnnotation = (annotationId: string) => {
  ElMessageBox.confirm("确定要删除这个标注吗？", "确认删除", {
    type: "warning",
  })
    .then(() => {
      annotationStore.deleteAnnotation(annotationId);
      redraw();
      ElMessage.success("删除成功");
    })
    .catch(() => {});
};

// 编辑标注
const editAnnotation = (annotation: Annotation) => {
  editingAnnotation.value = { ...annotation };
  editDialogVisible.value = true;
};

// 编辑相关状态
const editDialogVisible = ref(false);
const editingAnnotation = ref<Annotation | null>(null);

// 确认编辑
const confirmEdit = () => {
  if (!editingAnnotation.value) return;

  annotationStore.updateAnnotation(editingAnnotation.value.id, {
    category: editingAnnotation.value.category,
    updated_at: new Date().toISOString(),
  });

  editDialogVisible.value = false;
  editingAnnotation.value = null;
  redraw();

  ElMessage.success("标注更新成功");
};

// 获取标注类型标签
const getAnnotationTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    rectangle: "矩形",
    polygon: "多边形",
    point: "点",
    keypoint: "关键点",
    classification: "分类",
  };
  return labels[type] || type;
};

// 上传图片
const uploadImages = () => {
  if (!projectStore.currentProject) {
    ElMessage.warning("请先选择项目");
    return;
  }
  uploadDialogVisible.value = true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleFileChange = (file: any) => {
  if (file.raw && file.raw.type.startsWith("image/")) {
    uploadFiles.value.push(file.raw);
  } else {
    ElMessage.warning("请选择图片文件");
  }
};

const confirmUpload = async () => {
  if (uploadFiles.value.length === 0) {
    ElMessage.warning("请选择要上传的图片");
    return;
  }

  if (!projectStore.currentProject) {
    ElMessage.warning("请先选择项目");
    return;
  }

  try {
    for (const file of uploadFiles.value) {
      // 读取图片文件
      const img = await readImageFile(file);

      // 创建图片对象URL
      const url = URL.createObjectURL(file);

      // 创建图片记录
      const image: Image = {
        id: generateId(),
        filename: file.name,
        url: url,
        project_id: projectStore.currentProject.id,
        width: img.width,
        height: img.height,
        metadata: {
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        },
        created_at: new Date().toISOString(),
      };

      // 添加到项目中
      projectStore.addImage(image);
    }

    ElMessage.success(`成功上传 ${uploadFiles.value.length} 张图片`);
    uploadDialogVisible.value = false;
    uploadFiles.value = [];

    // 清空上传组件
    uploadRef.value?.clearFiles();
  } catch (error) {
    console.error("上传失败:", error);
    ElMessage.error("上传失败");
  }
};

// 添加类别
const addCategory = () => {
  if (!projectStore.currentProject) {
    ElMessage.warning("请先选择项目");
    return;
  }
  categoryDialogVisible.value = true;
  categoryForm.color = colorUtils.randomColor();
};

const confirmAddCategory = () => {
  if (!categoryForm.name.trim()) {
    ElMessage.warning("请输入类别名称");
    return;
  }

  // 检查类别名称是否已存在
  const existingCategory = projectStore.currentProjectCategories.find(
    (cat) => cat.name.toLowerCase() === categoryForm.name.toLowerCase()
  );
  if (existingCategory) {
    ElMessage.warning("类别名称已存在");
    return;
  }

  const category: Category = {
    id: generateId(),
    name: categoryForm.name,
    color: categoryForm.color,
    project_id: projectStore.currentProject!.id,
  };

  projectStore.addCategory(category);
  categoryDialogVisible.value = false;
  categoryForm.name = "";
  categoryForm.color = colorUtils.randomColor();

  ElMessage.success("类别添加成功");
};

// 删除类别
const deleteCategory = async (category: Category) => {
  try {
    // 检查是否有标注使用了这个类别
    const relatedAnnotations = annotationStore.annotations.filter(
      (annotation) => annotation.category === category.name
    );

    let confirmMessage = `确定要删除类别 "${category.name}" 吗？`;
    if (relatedAnnotations.length > 0) {
      confirmMessage += `\n\n注意：删除类别将同时删除 ${relatedAnnotations.length} 个相关标注。`;
    }

    await ElMessageBox.confirm(confirmMessage, "确认删除", {
      type: "warning",
      dangerouslyUseHTMLString: false,
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
    });

    // 删除相关标注
    if (relatedAnnotations.length > 0) {
      relatedAnnotations.forEach((annotation) => {
        annotationStore.deleteAnnotation(annotation.id);
      });
    }

    // 删除类别
    projectStore.deleteCategory(category.id);

    // 如果当前选中的类别被删除，清空选择
    if (currentCategory.value === category.name) {
      currentCategory.value = "";
    }

    // 重新绘制画布
    redraw();

    ElMessage.success(
      `类别 "${category.name}" 删除成功${
        relatedAnnotations.length > 0 ? `，同时删除了 ${relatedAnnotations.length} 个相关标注` : ""
      }`
    );
  } catch (error) {
    // 用户取消删除
    if (error !== "cancel") {
      console.error("删除类别失败:", error);
      ElMessage.error("删除类别失败");
    }
  }
};

// 导出弹窗相关
const exportDialogVisible = ref(false);
const exportData = ref("");

// 显示导出弹窗
const showExportDialog = () => {
  if (!projectStore.currentImage) {
    ElMessage.warning("请先选择图片");
    return;
  }

  // 生成导出数据
  const rectangleAnnotations = annotationStore.currentImageAnnotations.filter(
    (annotation) => annotation.type === "rectangle"
  );

  const exportFormat = {
    rect: rectangleAnnotations.map((annotation, index) => ({
      id: annotation.id,
      x: annotation.coordinates.x || 0,
      y: annotation.coordinates.y || 0,
      label: annotation.category,
      width: annotation.coordinates.width || 0,
      height: annotation.coordinates.height || 0,
      order: index + 1,
    })),
  };

  exportData.value = JSON.stringify(exportFormat, null, 2);
  exportDialogVisible.value = true;
};

// 复制导出数据
const copyExportData = async () => {
  try {
    await navigator.clipboard.writeText(exportData.value);
    ElMessage.success("数据已复制到剪贴板");
  } catch (error) {
    console.error("复制失败:", error);
    ElMessage.error("复制失败，请手动复制");
  }
};

// 生命周期
onMounted(() => {
  // 初始化历史记录
  annotationStore.initHistory();

  // 加载项目数据
  projectStore.loadProjects();

  // 初始化Canvas
  setTimeout(() => {
    initCanvas();
  }, 200);
});

onUnmounted(() => {
  // 清理事件监听器
  cleanup();
});
</script>

<style scoped>
.workspace-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.toolbar {
  height: 64px;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border-bottom: 1px solid #e1e8ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
  position: relative;
  z-index: 100;
}

.toolbar::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #409eff 50%, transparent 100%);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toolbar-left .el-button-group {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 4px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toolbar-left .el-button-group .el-button {
  margin: 0;
  border: none;
  background: transparent;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.toolbar-left .el-button-group .el-button:hover {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  transform: translateY(-1px);
}

.toolbar-left .el-button-group .el-button.el-button--primary {
  background: #409eff;
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.toolbar-center {
  flex: 1;
  text-align: center;
  padding: 0 32px;
}

.current-image-info {
  font-weight: 600;
  color: #2c3e50;
  font-size: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.workspace-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.sidebar-left,
.sidebar-right {
  width: 320px;
  min-width: 280px;
  max-width: 400px;
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
  border-right: 1px solid #e1e8ed;
  display: flex;
  flex-direction: column;
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.05);
  position: relative;
}

/* PC端大屏幕优化 */
@media (min-width: 1920px) {
  .sidebar-left,
  .sidebar-right {
    width: 380px;
  }
}

/* 中等屏幕适配 */
@media (max-width: 1440px) {
  .sidebar-left,
  .sidebar-right {
    width: 280px;
  }
}

/* 小屏幕适配 */
@media (max-width: 1200px) {
  .sidebar-left,
  .sidebar-right {
    width: 250px;
  }
}

.sidebar-right {
  border-right: none;
  border-left: 1px solid #e1e8ed;
  box-shadow: inset 1px 0 0 rgba(0, 0, 0, 0.05);
}

.sidebar-header {
  height: 56px;
  padding: 0 20px;
  border-bottom: 1px solid #e1e8ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  position: relative;
}

.sidebar-header::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 20px;
  right: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #409eff 30%, #409eff 70%, transparent 100%);
  opacity: 0.3;
}

/* 导出弹窗样式 */
.export-content {
  padding: 16px 0;
}

.export-info {
  margin-bottom: 16px;
}

.export-info p {
  margin: 8px 0;
  color: #606266;
}

.export-info .image-name {
  font-weight: 600;
  color: #409eff;
  font-size: 14px;
}

.export-textarea {
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 12px;
  line-height: 1.5;
}

.export-textarea .el-textarea__inner {
  background-color: #f8f9fa;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 16px;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.image-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.image-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e1e8ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.image-item::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.image-item:hover {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.15);
}

.image-item:hover::before {
  opacity: 1;
}

.image-item.active {
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.2);
}

.image-item.active::before {
  opacity: 1;
}

.image-thumbnail {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  margin-right: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
}

.image-thumbnail::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(64, 158, 255, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.image-item:hover .image-thumbnail::after {
  opacity: 1;
}

.image-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.image-item:hover .image-thumbnail img {
  transform: scale(1.05);
}

.image-info {
  flex: 1;
}

.image-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-size {
  font-size: 12px;
  color: #909399;
}

.canvas-container {
  flex: 1;
  position: relative;
  background: linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #4a5568 100%);
  overflow: hidden;
  min-height: 0;
  min-width: 0;
  width: 100%;
  border-radius: 0 0 16px 16px;
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.1);
}

.canvas-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 20%, rgba(64, 158, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(118, 75, 162, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.canvas-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
}

.annotation-canvas {
  display: block;
  cursor: default;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.annotation-canvas.has-image {
  cursor: none;
}

.annotation-canvas:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(64, 158, 255, 0.3);
}

.no-image-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
}

.no-image-placeholder .el-empty {
  --el-empty-description-color: rgba(255, 255, 255, 0.7);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 249, 250, 0.9) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  border-radius: 12px;
}

.category-selector {
  padding: 20px;
  border-bottom: 1px solid #e1e8ed;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  position: relative;
}

.category-selector::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 20px;
  right: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #409eff 30%, #409eff 70%, transparent 100%);
  opacity: 0.3;
}

.category-selector .el-select {
  width: 100%;
}

.category-selector .el-select .el-input__wrapper {
  border-radius: 10px;
  border: 1px solid #e1e8ed;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s;
}

.category-selector .el-select .el-input__wrapper:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.category-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.category-option:hover {
  background: rgba(64, 158, 255, 0.05);
}

.category-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 类别管理样式 */
.category-management {
  border-bottom: 1px solid #e4e7ed;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
}

.category-header {
  padding: 12px 16px 8px;
  border-bottom: 1px solid #f0f0f0;
}

.category-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.category-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.category-item:hover {
  background: rgba(64, 158, 255, 0.05);
  border-color: #409eff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.category-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.category-name {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.category-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.category-item:hover .category-actions {
  opacity: 1;
}

.no-categories {
  padding: 20px;
  text-align: center;
}

.no-categories .el-empty {
  padding: 0;
}

.annotation-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.annotation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 12px;
  border: 1px solid #e1e8ed;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.annotation-item::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.annotation-item:hover {
  border-color: #409eff;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.15);
}

.annotation-item:hover::before {
  opacity: 1;
}

.annotation-item.active {
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.2);
}

.annotation-item.active::before {
  opacity: 1;
}

.annotation-info {
  flex: 1;
}

.annotation-type {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #2c3e50;
}

.annotation-category {
  font-size: 13px;
  color: #64748b;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 500;
}

.annotation-actions {
  display: flex;
  gap: 8px;
}

.annotation-actions .el-button {
  border-radius: 8px;
  transition: all 0.2s;
}

.annotation-actions .el-button:hover {
  transform: scale(1.05);
}

/* PC端工具栏优化 */
@media (min-width: 1920px) {
  .toolbar {
    padding: 0 40px;
  }

  .toolbar-left,
  .toolbar-right {
    gap: 20px;
  }

  .toolbar-left .el-button-group .el-button {
    padding: 10px 16px;
    font-size: 14px;
  }
}

/* 中等屏幕优化 */
@media (max-width: 1440px) {
  .toolbar {
    padding: 0 20px;
  }

  .toolbar-left,
  .toolbar-right {
    gap: 12px;
  }
}

/* 全局动画优化 */
* {
  scroll-behavior: smooth;
}

/* 按钮全局优化 */
.el-button {
  font-weight: 500;
  letter-spacing: 0.5px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.el-button:focus {
  outline: 2px solid rgba(64, 158, 255, 0.3);
  outline-offset: 2px;
}

/* 滚动条美化 */
.image-list::-webkit-scrollbar,
.annotation-list::-webkit-scrollbar {
  width: 6px;
}

.image-list::-webkit-scrollbar-track,
.annotation-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.image-list::-webkit-scrollbar-thumb,
.annotation-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.image-list::-webkit-scrollbar-thumb:hover,
.annotation-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .toolbar {
    padding: 0 12px;
    height: 56px;
  }

  .toolbar-left .el-button-group {
    display: none;
  }

  .toolbar-center {
    padding: 0 16px;
  }

  .current-image-info {
    font-size: 14px;
  }

  .sidebar-left,
  .sidebar-right {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  }

  .sidebar-right {
    right: 0;
    transform: translateX(100%);
  }

  .canvas-container {
    border-radius: 0;
  }
}

/* 平板适配 */
@media (max-width: 1024px) and (min-width: 769px) {
  .toolbar {
    padding: 0 16px;
  }

  .sidebar-left,
  .sidebar-right {
    width: 280px;
  }

  .canvas-wrapper {
    padding: 20px;
  }
}

/* 高分辨率屏幕优化 */
@media (min-width: 2560px) {
  .toolbar {
    height: 72px;
    padding: 0 48px;
  }

  .sidebar-left,
  .sidebar-right {
    width: 420px;
  }

  .canvas-wrapper {
    padding: 32px;
  }
}
</style>
