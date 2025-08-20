# 标注系统 (Annotation System)

基于 Vue3 + TypeScript + Canvas 的图像标注系统，类似 LabelU，支持多种标注类型和数据格式导出。

## 🚀 功能特性

### 核心功能
- **多种标注类型**：矩形框、多边形、点标注、关键点标注、图像分类
- **项目管理**：创建、编辑、删除项目，支持多项目切换
- **图片管理**：批量上传、预览、切换图片
- **标注管理**：实时标注、编辑、删除，支持撤销重做
- **数据导出**：支持 JSON、COCO、VOC 格式导出
- **用户系统**：登录注册、权限管理

### 技术特性
- **现代化技术栈**：Vue3 + TypeScript + Vite + Pinia
- **响应式设计**：适配桌面和平板设备
- **高性能渲染**：Canvas 原生渲染，支持大图片缩放拖拽
- **快捷键支持**：Ctrl+Z 撤销、Delete 删除等
- **实时预览**：标注结果实时显示和编辑

## 🛠️ 技术架构

### 前端技术栈
- **框架**：Vue 3.3+ (Composition API)
- **语言**：TypeScript 5.0+
- **构建工具**：Vite 4.4+
- **状态管理**：Pinia 2.1+
- **UI 组件**：Element Plus 2.3+
- **路由**：Vue Router 4.0+
- **画布渲染**：原生 Canvas API + Fabric.js (可选)

### 项目结构
```
src/
├── api/           # API 接口定义
├── assets/        # 静态资源
├── components/    # 通用组件
├── composables/   # 组合式函数
├── router/        # 路由配置
├── stores/        # Pinia 状态管理
├── types/         # TypeScript 类型定义
├── utils/         # 工具函数
├── views/         # 页面组件
├── App.vue        # 根组件
└── main.ts        # 应用入口
```

## 📦 安装和运行

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0 或 pnpm >= 7.0.0

### 安装依赖
```bash
# 使用 npm
npm install

# 或使用 pnpm
pnpm install
```

### 开发环境
```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 生产构建
```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### 代码检查
```bash
# ESLint 检查
npm run lint

# TypeScript 类型检查
npm run type-check
```

## 🎯 使用指南

### 快速开始
1. **注册账户**：访问 `/register` 创建新账户
2. **登录系统**：使用邮箱和密码登录
3. **创建项目**：在项目管理页面创建新的标注项目
4. **上传图片**：批量上传需要标注的图片
5. **开始标注**：选择标注工具进行图像标注
6. **导出数据**：完成标注后导出所需格式的数据

### 标注工具使用
- **选择工具**：用于选择和编辑已有标注
- **矩形工具**：拖拽绘制矩形框，适用于目标检测
- **多边形工具**：点击绘制多边形，适用于实例分割
- **点工具**：单击添加点标注
- **关键点工具**：标注人体姿态等关键点

### 快捷键
- `Ctrl + Z`：撤销上一步操作
- `Ctrl + Y`：重做操作
- `Delete`：删除选中的标注
- `鼠标滚轮`：缩放画布
- `鼠标右键拖拽`：平移画布

## 🔧 配置说明

### 环境变量
```bash
# API 配置
VITE_API_BASE_URL=http://localhost:3000/api

# 上传配置
VITE_UPLOAD_MAX_SIZE=10485760  # 10MB
VITE_UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif

# 功能开关
VITE_ENABLE_MOCK_API=true
VITE_ENABLE_DEV_TOOLS=true
```

### 自定义配置
- 修改 `src/utils/index.ts` 中的工具函数
- 调整 `src/types/index.ts` 中的类型定义
- 配置 `src/api/index.ts` 中的 API 接口

## 📊 数据格式

### JSON 格式
```json
{
  "project": {
    "name": "项目名称",
    "categories": ["person", "car", "bicycle"]
  },
  "images": [
    {
      "id": "img_001",
      "filename": "image1.jpg",
      "width": 1920,
      "height": 1080,
      "annotations": [
        {
          "id": "ann_001",
          "type": "rectangle",
          "category": "person",
          "coordinates": {
            "x": 100,
            "y": 100,
            "width": 200,
            "height": 300
          }
        }
      ]
    }
  ]
}
```

### COCO 格式
支持标准的 COCO 数据集格式，包含 images、annotations、categories 等字段。

### VOC 格式
生成 Pascal VOC 格式的 XML 文件，适用于目标检测任务。

## 🤝 贡献指南

### 开发流程
1. Fork 项目到个人仓库
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 创建 Pull Request

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 配置
- 组件使用 Composition API
- 状态管理使用 Pinia
- 样式使用 scoped CSS

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🆘 问题反馈

如果您在使用过程中遇到问题，请通过以下方式反馈：

- 提交 Issue：描述问题和复现步骤
- 邮件联系：support@annotation-system.com
- 在线文档：https://docs.annotation-system.com

## 🔮 路线图

### v1.1.0 (计划中)
- [ ] 支持视频标注
- [ ] 添加标注质量检查
- [ ] 支持多人协作标注
- [ ] 增加标注统计分析

### v1.2.0 (计划中)
- [ ] 支持 AI 辅助标注
- [ ] 添加标注模板功能
- [ ] 支持更多导出格式
- [ ] 移动端适配

---

**标注系统** - 让图像标注更简单高效 🎯