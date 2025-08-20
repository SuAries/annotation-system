<template>
  <div class="projects-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>项目管理</h1>
        <p>管理您的标注项目和数据集</p>
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Plus" @click="showCreateDialog"> 创建项目 </el-button>
        <el-button :icon="ArrowLeft" @click="goBack"> 返回工作台 </el-button>
      </div>
    </div>

    <!-- 项目列表 -->
    <div class="projects-content">
      <div class="projects-grid">
        <div
          v-for="project in projectStore.projects"
          :key="project.id"
          class="project-card"
          @click="selectProject(project)"
        >
          <div class="project-header">
            <div class="project-title">{{ project.name }}</div>
            <el-dropdown @command="(command: string) => handleProjectAction(command, project)">
              <el-button text :icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="duplicate">复制</el-dropdown-item>
                  <el-dropdown-item divided command="delete">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div class="project-description">
            {{ project.description || "暂无描述" }}
          </div>

          <div class="project-stats">
            <div class="stat-item">
              <el-icon><Picture /></el-icon>
              <span>{{ getProjectImageCount(project.id) }} 张图片</span>
            </div>
            <div class="stat-item">
              <el-icon><PriceTag /></el-icon>
              <span>{{ project.categories.length }} 个类别</span>
            </div>
          </div>

          <div class="project-categories">
            <el-tag
              v-for="category in project.categories.slice(0, 3)"
              :key="category"
              size="small"
              class="category-tag"
            >
              {{ category }}
            </el-tag>
            <el-tag v-if="project.categories.length > 3" size="small" type="info">
              +{{ project.categories.length - 3 }}
            </el-tag>
          </div>

          <div class="project-footer">
            <div class="project-date">
              创建于 {{ formatDate(project.created_at, "YYYY-MM-DD") }}
            </div>
            <div class="project-progress">
              <el-progress
                :percentage="getProjectProgress(project.id)"
                :stroke-width="4"
                :show-text="false"
              />
            </div>
          </div>
        </div>

        <!-- 创建项目卡片 -->
        <div class="project-card create-card" @click="showCreateDialog">
          <div class="create-content">
            <el-icon size="48" color="#409eff"><Plus /></el-icon>
            <div class="create-text">创建新项目</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑项目对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑项目' : '创建项目'"
      width="600px"
      @close="resetForm"
    >
      <el-form ref="projectFormRef" :model="projectForm" :rules="projectRules" label-width="100px">
        <el-form-item label="项目名称" prop="name">
          <el-input
            v-model="projectForm.name"
            placeholder="请输入项目名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="项目描述" prop="description">
          <el-input
            v-model="projectForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入项目描述（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="标注类别" prop="categories">
          <div class="categories-input">
            <el-tag
              v-for="(category, index) in projectForm.categories"
              :key="index"
              closable
              @close="removeCategory(index)"
            >
              {{ category }}
            </el-tag>

            <el-input
              v-if="inputVisible"
              ref="inputRef"
              v-model="inputValue"
              class="category-input"
              size="small"
              @keyup.enter="handleInputConfirm"
              @blur="handleInputConfirm"
            />

            <el-button v-else class="button-new-tag" size="small" @click="showInput">
              + 添加类别
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="projectStore.loading" @click="handleSubmit">
            {{ isEditing ? "保存" : "创建" }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { Plus, ArrowLeft, MoreFilled, Picture, PriceTag } from "@element-plus/icons-vue";
import { useProjectStore } from "@/stores/project";

import type { Project } from "@/types";
import { formatDate, generateId } from "@/utils";

// 路由和状态
const router = useRouter();
const projectStore = useProjectStore();

// 表单相关
const projectFormRef = ref<FormInstance>();
const dialogVisible = ref(false);
const isEditing = ref(false);
const editingProject = ref<Project | null>(null);

// 表单数据
const projectForm = reactive({
  name: "",
  description: "",
  categories: [] as string[],
});

// 类别输入相关
const inputVisible = ref(false);
const inputValue = ref("");
const inputRef = ref();

// 表单验证规则
const projectRules: FormRules = {
  name: [
    { required: true, message: "请输入项目名称", trigger: "blur" },
    { min: 2, max: 50, message: "项目名称长度在 2 到 50 个字符", trigger: "blur" },
  ],
  categories: [
    {
      validator: (rule, value, callback) => {
        if (value.length === 0) {
          callback(new Error("请至少添加一个标注类别"));
        } else {
          callback();
        }
      },
      trigger: "change",
    },
  ],
};

// 计算属性
const getProjectImageCount = (projectId: string) => {
  return projectStore.images.filter((img) => img.project_id === projectId).length;
};

const getProjectProgress = (projectId: string) => {
  // TODO: 计算项目标注进度
  return Math.floor(Math.random() * 100);
};

// 显示创建对话框
const showCreateDialog = () => {
  isEditing.value = false;
  editingProject.value = null;
  resetForm();
  dialogVisible.value = true;
};

// 重置表单
const resetForm = () => {
  projectForm.name = "";
  projectForm.description = "";
  projectForm.categories = [];
  inputVisible.value = false;
  inputValue.value = "";

  if (projectFormRef.value) {
    projectFormRef.value.clearValidate();
  }
};

// 处理表单提交
const handleSubmit = async () => {
  if (!projectFormRef.value) return;

  try {
    const valid = await projectFormRef.value.validate();
    if (!valid) return;

    if (isEditing.value && editingProject.value) {
      // 编辑项目
      const updates = {
        name: projectForm.name,
        description: projectForm.description,
        categories: projectForm.categories,
        updated_at: new Date().toISOString(),
      };

      projectStore.updateProject(editingProject.value.id, updates);
      ElMessage.success("项目更新成功");
    } else {
      // 创建项目
      const newProject: Project = {
        id: generateId(),
        name: projectForm.name,
        description: projectForm.description,
        user_id: 'default-user',
        categories: projectForm.categories,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      projectStore.addProject(newProject);
      ElMessage.success("项目创建成功");
    }

    dialogVisible.value = false;
  } catch (error) {
    console.error("项目操作失败:", error);
    ElMessage.error("操作失败，请稍后重试");
  }
};

// 选择项目
const selectProject = (project: Project) => {
  projectStore.setCurrentProject(project);
  ElMessage.success(`已切换到项目：${project.name}`);
  router.push("/");
};

// 项目操作
const handleProjectAction = (command: string, project: Project) => {
  switch (command) {
    case "edit":
      editProject(project);
      break;
    case "duplicate":
      duplicateProject(project);
      break;
    case "delete":
      deleteProject(project);
      break;
  }
};

// 编辑项目
const editProject = (project: Project) => {
  isEditing.value = true;
  editingProject.value = project;

  projectForm.name = project.name;
  projectForm.description = project.description || "";
  projectForm.categories = [...project.categories];

  dialogVisible.value = true;
};

// 复制项目
const duplicateProject = (project: Project) => {
  const newProject: Project = {
    ...project,
    id: generateId(),
    name: `${project.name} (副本)`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  projectStore.addProject(newProject);
  ElMessage.success("项目复制成功");
};

// 删除项目
const deleteProject = (project: Project) => {
  ElMessageBox.confirm(`确定要删除项目 "${project.name}" 吗？此操作不可恢复。`, "确认删除", {
    type: "warning",
    confirmButtonText: "删除",
    cancelButtonText: "取消",
  })
    .then(() => {
      projectStore.deleteProject(project.id);
      ElMessage.success("项目删除成功");
    })
    .catch(() => {});
};

// 类别管理
const removeCategory = (index: number) => {
  projectForm.categories.splice(index, 1);
};

const showInput = () => {
  inputVisible.value = true;
  nextTick(() => {
    inputRef.value?.focus();
  });
};

const handleInputConfirm = () => {
  const value = inputValue.value.trim();
  if (value && !projectForm.categories.includes(value)) {
    projectForm.categories.push(value);
  }

  inputVisible.value = false;
  inputValue.value = "";
};

// 返回工作台
const goBack = () => {
  router.push("/");
};

// 生命周期
onMounted(() => {
  projectStore.loadProjects();
});
</script>

<style scoped>
.projects-container {
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

.header-right {
  display: flex;
  gap: 12px;
}

.projects-content {
  padding: 32px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.project-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-color: #409eff;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.project-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
}

.project-description {
  color: #7f8c8d;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 16px;
  min-height: 42px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #606266;
}

.project-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
  min-height: 24px;
}

.category-tag {
  font-size: 12px;
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.project-date {
  font-size: 12px;
  color: #909399;
}

.project-progress {
  width: 100px;
}

.create-card {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #d9d9d9;
  background: #fafafa;
}

.create-card:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.create-content {
  text-align: center;
}

.create-text {
  margin-top: 12px;
  font-size: 16px;
  color: #409eff;
  font-weight: 500;
}

.categories-input {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.category-input {
  width: 120px;
}

.button-new-tag {
  border-style: dashed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    padding: 16px 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-right {
    width: 100%;
    justify-content: flex-end;
  }

  .projects-content {
    padding: 20px;
  }

  .projects-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .project-card {
    padding: 20px;
  }
}
</style>
