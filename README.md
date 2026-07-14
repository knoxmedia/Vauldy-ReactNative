# Vauldy Mobile Client

Vauldy Mobile Client 是 [Vauldy](https://github.com/knoxmedia/Vauldy) 媒体服务器的移动客户端，基于 Expo、React Native 和 Expo Router 构建，支持 Android 与 iOS。

当前版本：**v0.1.0**

## 功能特性

### 服务器与账号

- 连接局域网或公网中的 Vauldy Server
- 支持 HTTP/HTTPS 服务器地址
- JWT 用户登录与会话保持
- 自动读取服务器品牌名称
- 登录过期后自动返回登录页
- 简体中文和英文界面

### 首页与媒体库

- 媒体库快捷入口
- 继续观看
- 最近添加
- 浏览电影、电视剧、动漫、普通视频、音乐、照片和文档媒体库
- 收藏及取消收藏媒体资源

### 电视剧与动漫

- 电视剧媒体库以海报网格展示节目
- 点击节目海报或名称进入详情页
- 详情页显示节目海报、名称、年份、总集数和已观看集数
- 支持继续观看和从头开始播放
- 按季分组显示剧集
- 按季数、集数进行自然数字排序
- 支持识别常见剧集命名格式：
  - `S01E03`
  - `S01.E03`
  - `1x03`
  - `Season 1 Episode 3`
  - `第1季第3集`
- 同一剧集存在不同清晰度或编码版本时合并显示
- 显示已观看状态和观看进度
- 点击剧集缩略图直接进入播放

### 视频与音乐播放

- HLS 与直连媒体播放
- 播放进度保存及恢复
- 横屏视频播放器
- 全局音乐播放引擎
- 悬浮音乐播放栏
- 音乐播放队列和曲目切换
- 专辑封面和 LRC 歌词显示
- 支持加密媒体资源访问

### 图片与文档

- 照片瀑布流浏览
- 全屏图片查看
- 图片详情页预览图和元数据显示
- PDF、Office 及文本类文档阅读
- 内置 pdf.js，无需外部在线 PDF 服务
- PDF 自动适配屏幕宽度
- 支持滑动翻页、双指缩放及阅读进度保存
- Office 文档使用服务器生成的 PDF 预览
- 文档详情页封面预览

### 详情页

- 根据媒体类型显示视频海报、图片缩略图、文档封面或音乐专辑封面
- 元数据默认以紧凑摘要形式展示
- 可展开查看年份、时长、评分、分辨率、编码、码率及容器格式
- 支持播放、查看、阅读和收藏操作

## 技术栈

- Expo SDK 52
- React Native 0.76
- React 18
- Expo Router
- TypeScript
- Zustand
- Axios
- Expo AV
- Expo Image
- React Native WebView
- pdf.js

## 环境要求

- Node.js 20+
- npm
- Expo CLI（通过 `npx expo` 使用）
- Android Studio / Android SDK（Android 原生构建）
- Xcode（iOS 原生构建，仅 macOS）
- 可访问的 Vauldy Server

## 安装依赖

```bash
npm install
```

安装完成后会自动执行 PDF.js 内嵌资源生成脚本。

## 开发运行

启动 Expo 开发服务器：

```bash
npm start
```

使用 Expo Go：

```bash
npm run start:go
```

运行 TypeScript 检查：

```bash
npm run typecheck
```

### 使用真机调试

1. 在手机上安装 Expo Go。
2. 运行 `npm run start:go`。
3. 使用手机扫描终端或浏览器中的二维码。
4. 手机、开发电脑和 Vauldy Server 必须处于同一局域网。
5. 在客户端中输入服务器的局域网地址，不能使用 `127.0.0.1`。

示例：

```text
http://192.168.0.3:8200
```

可先在手机浏览器中访问以下地址确认服务器可达：

```text
http://192.168.0.3:8200/health
```

## Android APK 构建

项目提供 Windows PowerShell Release APK 构建脚本。

### 构建 arm64-v8a APK

适用于绝大多数现代 Android 手机和平板：

```powershell
npm run apk:release:arm64
```

### 构建 armeabi-v7a APK

适用于部分旧款 32 位 Android 设备：

```powershell
npm run apk:release:armv7
```

### 构建通用 APK

同时包含 32 位和 64 位 ARM 架构，文件体积较大：

```powershell
npm run apk:release:all
```

### 构建并安装到已连接设备

```powershell
npm run apk:install
```

构建结果保存在：

```text
dist/
```

> `scripts/build-release-apk.ps1` 当前包含本机 Android SDK、JDK 和 Gradle 缓存路径。首次在其他电脑构建时，请根据本机环境修改脚本中的 `ANDROID_HOME`、`JAVA_HOME` 和 `GRADLE_USER_HOME`。

## Android 真机连接说明

客户端支持连接局域网内的 HTTP Vauldy Server。Android 原生工程已启用：

```xml
android:usesCleartextTraffic="true"
```

如果客户端提示无法连接服务器，请检查：

1. 手机和服务器是否处于同一局域网。
2. 手机浏览器能否访问服务器的 `/health` 地址。
3. Vauldy Server 是否监听局域网地址，而不是仅监听 `127.0.0.1`。
4. Windows 防火墙或服务器防火墙是否放行端口 `8200`。
5. 路由器是否启用了 AP 隔离或访客网络隔离。
6. 是否安装了包含最新 AndroidManifest 配置的 APK。

## 项目结构

```text
app/                    Expo Router 页面与导航
app/(tabs)/             首页、浏览、收藏、我的
app/library/            媒体库页面
app/media/              媒体详情页
app/player/             视频播放器
app/photo/              图片查看器
app/reader/             文档阅读器
src/api/                Vauldy REST API 客户端及类型
src/components/         通用组件、音乐播放器和电视剧详情组件
src/constants/          主题颜色、间距和字体配置
src/hooks/              通用 React Hooks
src/i18n/               简体中文和英文翻译
src/lib/                媒体地址、元数据、PDF 和剧集解析工具
src/store/              用户、服务器和音乐播放状态
assets/                 图标、启动图、字体和 PDF.js 资源
scripts/                图标生成、PDF.js 嵌入和 APK 构建脚本
doc/                    需求规格说明
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm start` | 启动 Expo 开发服务器 |
| `npm run start:go` | 使用 Expo Go 模式启动 |
| `npm run android` | 构建并运行 Android 原生项目 |
| `npm run ios` | 构建并运行 iOS 原生项目 |
| `npm run prebuild` | 生成或更新 Android/iOS 原生工程 |
| `npm run typecheck` | 执行 TypeScript 类型检查 |
| `npm run generate:icons` | 重新生成 Android 自适应图标 |
| `npm run apk:release:arm64` | 构建 arm64 Release APK |
| `npm run apk:release:armv7` | 构建 armv7 Release APK |
| `npm run apk:release:all` | 构建通用 Release APK |
| `npm run apk:install` | 构建并安装 APK 到已连接设备 |

## 已知限制

- 当前版本主要面向局域网内的 Vauldy Server。
- 电视剧节目分组依赖服务端元数据或规范的文件命名格式。
- Office 文档需要服务器已成功生成 PDF 预览。
- 不同 Android 厂商可能对后台音频和网络访问施加额外的电池优化限制。
- iOS 原生构建需要 macOS 和 Xcode。

## 相关项目

- Vauldy Server：[knoxmedia/Vauldy](https://github.com/knoxmedia/Vauldy)
- 移动端需求规格：[`doc/移动终端需求规格书.md`](doc/移动终端需求规格书.md)

## License

本项目的许可证以仓库中提供的 LICENSE 文件为准。
