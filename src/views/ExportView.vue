<template>
  <div class="export-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>数据导出</h1>
        <p>导出您的标注数据，支持多种格式</p>
      </div>
      <div class="header-right">
        <el-button :icon="ArrowLeft" @click="goBack"> 返回工作台 </el-button>
      </div>
    </div>

    <!-- 导出配置 -->
    <div class="export-content">
      <div class="export-form">
        <el-card class="config-card">
          <template #header>
            <div class="card-header">
              <span>导出配置</span>
            </div>
          </template>

          <el-form :model="exportForm" label-width="120px">
            <!-- 项目选择 -->
            <el-form-item label="选择项目">
              <el-select
                v-model="exportForm.projectId"
                placeholder="请选择要导出的项目"
                style="width: 100%"
                @change="handleProjectChange"
              >
                <el-option
                  v-for="project in projectStore.projects"
                  :key="project.id"
                  :label="project.name"
                  :value="project.id"
                />
              </el-select>
            </el-form-item>

            <!-- 导出范围 -->
            <el-form-item label="导出范围">
              <el-radio-group v-model="exportForm.scope">
                <el-radio value="all">全部图片</el-radio>
                <el-radio value="annotated">已标注图片</el-radio>
                <el-radio value="selected">选择图片</el-radio>
              </el-radio-group>
            </el-form-item>

            <!-- 图片选择 -->
            <el-form-item v-if="exportForm.scope === 'selected'" label="选择图片">
              <div class="image-selector">
                <el-checkbox-group v-model="exportForm.selectedImages">
                  <div class="image-grid">
                    <div
                      v-for="image in currentProjectImages"
                      :key="image.id"
                      class="image-checkbox"
                    >
                      <el-checkbox :value="image.id">
                        <div class="image-item">
                          <img :src="image.url" :alt="image.filename" />
                          <div class="image-name">{{ image.filename }}</div>
                        </div>
                      </el-checkbox>
                    </div>
                  </div>
                </el-checkbox-group>
              </div>
            </el-form-item>

            <!-- 导出格式 -->
            <el-form-item label="导出格式">
              <el-radio-group v-model="exportForm.format">
                <el-radio value="json">
                  <div class="format-option">
                    <div class="format-name">JSON</div>
                    <div class="format-desc">通用 JSON 格式，包含完整标注信息</div>
                  </div>
                </el-radio>
                <el-radio value="coco">
                  <div class="format-option">
                    <div class="format-name">COCO</div>
                    <div class="format-desc">COCO 数据集格式，适用于目标检测</div>
                  </div>
                </el-radio>
                <el-radio value="voc">
                  <div class="format-option">
                    <div class="format-name">VOC</div>
                    <div class="format-desc">Pascal VOC 格式，XML 文件</div>
                  </div>
                </el-radio>
              </el-radio-group>
            </el-form-item>

            <!-- 高级选项 -->
            <el-form-item label="高级选项">
              <el-checkbox-group v-model="exportForm.options">
                <el-checkbox value="includeImages">包含图片文件</el-checkbox>
                <el-checkbox value="splitTrainTest">分割训练/测试集</el-checkbox>
                <el-checkbox value="generateStats">生成统计报告</el-checkbox>
              </el-checkbox-group>
            </el-form-item>

            <!-- 训练/测试集比例 -->
            <el-form-item v-if="exportForm.options.includes('splitTrainTest')" label="训练集比例">
              <el-slider
                v-model="exportForm.trainRatio"
                :min="0.1"
                :max="0.9"
                :step="0.1"
                :format-tooltip="(val: number) => `${Math.round(val * 100)}%`"
                style="width: 200px"
              />
              <span class="ratio-text">
                训练集: {{ Math.round(exportForm.trainRatio * 100) }}%， 测试集:
                {{ Math.round((1 - exportForm.trainRatio) * 100) }}%
              </span>
            </el-form-item>
          </el-form>

          <div class="export-actions">
            <el-button
              type="primary"
              size="large"
              :loading="exporting"
              :disabled="!canExport"
              @click="handleExport"
            >
              <el-icon><Download /></el-icon>
              开始导出
            </el-button>
          </div>
        </el-card>
      </div>

      <!-- 导出预览 -->
      <div class="export-preview">
        <el-card class="preview-card">
          <template #header>
            <div class="card-header">
              <span>导出预览</span>
              <el-button size="small" @click="refreshPreview">刷新</el-button>
            </div>
          </template>

          <div v-if="previewData" class="preview-content">
            <!-- 统计信息 -->
            <div class="stats-section">
              <h4>统计信息</h4>
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">{{ previewData.totalImages }}</div>
                  <div class="stat-label">总图片数</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ previewData.totalAnnotations }}</div>
                  <div class="stat-label">总标注数</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ previewData.categories.length }}</div>
                  <div class="stat-label">类别数量</div>
                </div>
              </div>
            </div>

            <!-- 类别分布 -->
            <div class="categories-section">
              <h4>类别分布</h4>
              <div class="category-list">
                <div
                  v-for="category in previewData.categoryStats"
                  :key="category.name"
                  class="category-stat"
                >
                  <div class="category-info">
                    <div class="category-color" :style="{ backgroundColor: category.color }"></div>
                    <span class="category-name">{{ category.name }}</span>
                  </div>
                  <div class="category-count">{{ category.count }}</div>
                </div>
              </div>
            </div>

            <!-- 格式预览 -->
            <div class="format-section">
              <h4>格式预览</h4>
              <el-input
                v-model="formatPreview"
                type="textarea"
                :rows="10"
                readonly
                class="format-preview"
              />
            </div>
          </div>

          <div v-else class="preview-placeholder">
            <el-empty description="请选择项目以查看预览" />
          </div>
        </el-card>
      </div>
    </div>

    <!-- 导出历史 -->
    <div class="export-history">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>导出历史</span>
            <el-button size="small" @click="clearHistory">清空历史</el-button>
          </div>
        </template>

        <el-table :data="exportHistory" style="width: 100%">
          <el-table-column prop="projectName" label="项目名称" />
          <el-table-column prop="format" label="格式" width="80" />
          <el-table-column prop="imageCount" label="图片数" width="80" />
          <el-table-column prop="fileSize" label="文件大小" width="100" />
          <el-table-column prop="exportTime" label="导出时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.exportTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" @click="downloadHistory(row)">下载</el-button>
              <el-button size="small" type="danger" @click="deleteHistory(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowLeft, Download } from "@element-plus/icons-vue";
import { useProjectStore } from "@/stores/project";
import { useAnnotationStore } from "@/stores/annotation";
import type { Project, Image, ExportFormat } from "@/types";
import { formatDate, formatFileSize, downloadFile } from "@/utils";

// 路由和状态
const router = useRouter();
const projectStore = useProjectStore();
const annotationStore = useAnnotationStore();

// 导出表单
const exportForm = reactive({
  projectId: "",
  scope: "all" as "all" | "annotated" | "selected",
  selectedImages: [] as string[],
  format: "json" as ExportFormat,
  options: [] as string[],
  trainRatio: 0.8,
});

// 状态
const exporting = ref(false);
const previewData = ref<any>(null);
const formatPreview = ref("");

// 导出历史
const exportHistory = ref([
  {
    id: "1",
    projectName: "示例项目",
    format: "JSON",
    imageCount: 100,
    fileSize: "2.5 MB",
    exportTime: new Date().toISOString(),
    downloadUrl: "#",
  },
]);

// 计算属性
const currentProjectImages = computed(() => {
  if (!exportForm.projectId) return [];
  return projectStore.images.filter((img) => img.project_id === exportForm.projectId);
});

const canExport = computed(() => {
  if (!exportForm.projectId) return false;
  if (exportForm.scope === "selected" && exportForm.selectedImages.length === 0) return false;
  return true;
});

// 监听项目变化
watch(
  () => exportForm.projectId,
  () => {
    exportForm.selectedImages = [];
    refreshPreview();
  }
);

// 监听导出配置变化
watch(
  () => [exportForm.scope, exportForm.format, exportForm.selectedImages],
  () => {
    refreshPreview();
  },
  { deep: true }
);

// 处理项目变化
const handleProjectChange = () => {
  const project = projectStore.projects.find((p) => p.id === exportForm.projectId);
  if (project) {
    projectStore.setCurrentProject(project);
  }
};

// 刷新预览
const refreshPreview = () => {
  if (!exportForm.projectId) {
    previewData.value = null;
    formatPreview.value = "";
    return;
  }

  const project = projectStore.projects.find((p) => p.id === exportForm.projectId);
  if (!project) return;

  // 获取要导出的图片
  let imagesToExport = currentProjectImages.value;

  if (exportForm.scope === "annotated") {
    // TODO: 过滤已标注的图片
    imagesToExport = imagesToExport.filter((img) => {
      // 检查图片是否有标注
      return true; // 临时返回 true
    });
  } else if (exportForm.scope === "selected") {
    imagesToExport = imagesToExport.filter((img) => exportForm.selectedImages.includes(img.id));
  }

  // 生成预览数据
  const categoryStats = project.categories.map((category) => ({
    name: category,
    color: "#409eff", // TODO: 从类别配置获取颜色
    count: Math.floor(Math.random() * 50) + 1, // TODO: 计算实际标注数量
  }));

  previewData.value = {
    totalImages: imagesToExport.length,
    totalAnnotations: imagesToExport.length * 3, // TODO: 计算实际标注数量
    categories: project.categories,
    categoryStats,
  };

  // 生成格式预览
  generateFormatPreview(imagesToExport, project);
};

// 生成格式预览
const generateFormatPreview = (images: Image[], project: Project) => {
  switch (exportForm.format) {
    case "json":
      formatPreview.value = JSON.stringify(
        {
          project: {
            name: project.name,
            description: project.description,
            categories: project.categories,
          },
          images: images.slice(0, 2).map((img) => ({
            id: img.id,
            filename: img.filename,
            width: img.width,
            height: img.height,
            annotations: [
              {
                id: "ann_1",
                type: "rectangle",
                category: project.categories[0] || "default",
                coordinates: { x: 100, y: 100, width: 200, height: 150 },
              },
            ],
          })),
          metadata: {
            exportTime: new Date().toISOString(),
            totalImages: images.length,
            format: "json",
          },
        },
        null,
        2
      );
      break;

    case "coco":
      formatPreview.value = JSON.stringify(
        {
          info: {
            description: project.description || project.name,
            version: "1.0",
            year: new Date().getFullYear(),
            date_created: new Date().toISOString(),
          },
          categories: project.categories.map((cat, index) => ({
            id: index + 1,
            name: cat,
            supercategory: "object",
          })),
          images: images.slice(0, 2).map((img, index) => ({
            id: index + 1,
            file_name: img.filename,
            width: img.width,
            height: img.height,
          })),
          annotations: [
            {
              id: 1,
              image_id: 1,
              category_id: 1,
              bbox: [100, 100, 200, 150],
              area: 30000,
              iscrowd: 0,
            },
          ],
        },
        null,
        2
      );
      break;

    case "voc":
      formatPreview.value = `<?xml version="1.0" encoding="UTF-8"?>
<annotation>
  <folder>${project.name}</folder>
  <filename>${images[0]?.filename || "example.jpg"}</filename>
  <size>
    <width>${images[0]?.width || 640}</width>
    <height>${images[0]?.height || 480}</height>
    <depth>3</depth>
  </size>
  <object>
    <name>${project.categories[0] || "object"}</name>
    <pose>Unspecified</pose>
    <truncated>0</truncated>
    <difficult>0</difficult>
    <bndbox>
      <xmin>100</xmin>
      <ymin>100</ymin>
      <xmax>300</xmax>
      <ymax>250</ymax>
    </bndbox>
  </object>
</annotation>`;
      break;
  }
};

// 处理导出
const handleExport = async () => {
  if (!canExport.value) return;

  exporting.value = true;

  try {
    // TODO: 实现实际的导出逻辑
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 模拟导出过程

    const project = projectStore.projects.find((p) => p.id === exportForm.projectId)!;
    const exportData = generateExportData();

    // 下载文件
    const filename = `${project.name}_${exportForm.format}_${Date.now()}.${getFileExtension()}`;
    downloadFile(exportData, filename, getContentType());

    // 添加到导出历史
    exportHistory.value.unshift({
      id: Date.now().toString(),
      projectName: project.name,
      format: exportForm.format.toUpperCase(),
      imageCount: getExportImageCount(),
      fileSize: formatFileSize(new Blob([exportData]).size),
      exportTime: new Date().toISOString(),
      downloadUrl: "#",
    });

    ElMessage.success("导出成功");
  } catch (error) {
    console.error("导出失败:", error);
    ElMessage.error("导出失败，请稍后重试");
  } finally {
    exporting.value = false;
  }
};

// 生成导出数据
const generateExportData = () => {
  const project = projectStore.projects.find((p) => p.id === exportForm.projectId);
  if (!project) return "";

  // 获取要导出的图片
  let imagesToExport = currentProjectImages.value;

  if (exportForm.scope === "selected") {
    imagesToExport = imagesToExport.filter((img) => exportForm.selectedImages.includes(img.id));
  }

  // 调用标注 Store 的导出方法
  return annotationStore.exportAnnotations(exportForm.format, project, imagesToExport);
};

// 获取文件扩展名
const getFileExtension = () => {
  switch (exportForm.format) {
    case "json":
    case "coco":
      return "json";
    case "voc":
      return "xml";
    default:
      return "txt";
  }
};

// 获取内容类型
const getContentType = () => {
  switch (exportForm.format) {
    case "json":
    case "coco":
      return "application/json";
    case "voc":
      return "application/xml";
    default:
      return "text/plain";
  }
};

// 获取导出图片数量
const getExportImageCount = () => {
  if (exportForm.scope === "selected") {
    return exportForm.selectedImages.length;
  }
  return currentProjectImages.value.length;
};

// 下载历史记录
const downloadHistory = (record: any) => {
  ElMessage.info("重新下载功能开发中");
};

// 删除历史记录
const deleteHistory = (record: any) => {
  const index = exportHistory.value.findIndex((item) => item.id === record.id);
  if (index !== -1) {
    exportHistory.value.splice(index, 1);
    ElMessage.success("删除成功");
  }
};

// 清空历史
const clearHistory = () => {
  ElMessageBox.confirm("确定要清空所有导出历史吗？", "确认清空", {
    type: "warning",
  })
    .then(() => {
      exportHistory.value = [];
      ElMessage.success("历史记录已清空");
    })
    .catch(() => {});
};

// 返回工作台
const goBack = () => {
  router.push("/");
};

// 生命周期
onMounted(() => {
  projectStore.loadProjects();

  // 如果有当前项目，自动选择
  if (projectStore.currentProject) {
    exportForm.projectId = projectStore.currentProject.id;
  }
});
</script>

<style scoped>
.export-container {
  min-height: 100vh;
  width: 100vw;
  background-color: #f5f5f5;
}

.page-header {
  background: white;
  padding: 24px 32px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.header-left p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.export-content {
  padding: 32px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.config-card,
.preview-card {
  height: fit-content;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.format-option {
  margin-left: 8px;
}

.format-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.format-desc {
  font-size: 12px;
  color: #909399;
}

.image-selector {
  max-height: 300px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 16px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
}

.image-checkbox {
  text-align: center;
}

.image-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.image-item img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.image-name {
  font-size: 12px;
  color: #606266;
  text-align: center;
  word-break: break-all;
}

.ratio-text {
  margin-left: 16px;
  font-size: 14px;
  color: #606266;
}

.export-actions {
  margin-top: 24px;
  text-align: center;
}

.preview-content {
  max-height: 600px;
}

.stats-section,
.categories-section,
.format-section {
  margin-bottom: 24px;
}

.stats-section h4,
.categories-section h4,
.format-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.category-list {
  space-y: 8px;
}

.category-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.category-name {
  font-size: 14px;
  color: #606266;
}

.category-count {
  font-weight: 600;
  color: #409eff;
}

.format-preview {
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 12px;
}

.preview-placeholder {
  text-align: center;
  padding: 40px;
}

.export-history {
  margin: 0 32px 32px 32px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .export-content {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 16px 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .export-content {
    padding: 20px;
  }

  .export-history {
    margin: 0 20px 20px 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}
</style>
