# AutoGenerateSokoban关卡生成器

## 项目简介

这是一个将C++版本的推箱子关卡生成算法转换为JavaScript的项目。该项目能够自动生成有效的推箱子游戏关卡，并在网页端呈现。

## 功能特点

- 自动生成随机且可解的推箱子游戏关卡
- 支持自定义关卡大小、难度等参数
- 提供网页版游戏界面，可直接在浏览器中游玩
- 算法核心从C++迁移到JavaScript，保持了高效的生成效率

## 项目结构

```
AutoGenerateSokobanLevel/
├── AutoGenerateSokobanLevel/  # C++核心算法原始代码
├── HTML_Sokoban/              # JavaScript实现的网页版本
│   ├── img/                   # 游戏图像资源
│   └── js/                    # JavaScript代码
└── .gitignore                 # Git忽略文件
```

## 安装与使用

### 网页版

1. 克隆本仓库到本地:
   ```
   git clone [仓库地址]
   ```

2. 直接在浏览器中打开 `HTML_Sokoban/index.html` 文件即可运行游戏

### 开发环境

如需开发或修改算法:

- 对于JavaScript版本，修改 `HTML_Sokoban/js/` 目录下的相关文件
- 对于C++原始版本，使用Visual Studio打开 `AutoGenerateSokobanLevel.sln` 文件

## 技术栈

- **原始算法**: C++
- **网页实现**: HTML5, CSS3, JavaScript
- **开发工具**: Visual Studio (C++), 任意文本编辑器 (JavaScript)

## 贡献指南

欢迎贡献代码或提出建议。请通过以下步骤参与项目:

1. Fork本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个Pull Request

