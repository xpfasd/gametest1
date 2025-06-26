# 🎯 自动Banner广告功能使用说明

PokiSDK v1.9.9 已内置自动Banner广告功能，当网页加载时会自动查找并加载Banner广告。

## ✨ 功能特性

- **自动检测**：页面加载完成后自动查找广告容器
- **多种选择器**：支持ID、类名、数据属性等多种容器识别方式
- **智能排序**：按优先级自动排序，优先加载重要广告位
- **间隔加载**：避免同时请求过多广告，自动间隔加载
- **事件通知**：加载成功/失败会派发自定义事件
- **灵活配置**：可通过API动态控制功能开关和参数

## 📦 支持的容器选择器

### 320x50横幅广告（推荐）
```html
<!-- 方式1: ID选择器（优先级最高） -->
<div id="banner-ad-320x50">等待320x50横幅广告...</div>

<!-- 方式2: 数据属性 -->
<div data-ad-size="320x50">等待320x50横幅广告...</div>

<!-- 方式3: 类名 -->
<div class="banner-ad-320x50">等待320x50横幅广告...</div>
```

### 300x250广告
```html
<!-- ID选择器 -->
<div id="ad-300x250">等待300x250广告...</div>

<!-- 数据属性 -->
<div data-ad-size="300x250">等待300x250广告...</div>
```

### 728x90广告
```html
<!-- ID选择器 -->
<div id="ad-728x90">等待728x90广告...</div>

<!-- 数据属性 -->
<div data-ad-size="728x90">等待728x90广告...</div>
```

## 🚀 基本使用

### 1. 引入SDK
```html
<script src="scripts/v2/poki-sdk.js"></script>
```

### 2. 创建广告容器（推荐320x50横幅）
```html
<!DOCTYPE html>
<html>
<head>
    <title>自动Banner广告示例</title>
    <style>
        /* 320x50横幅广告容器样式 */
        #banner-ad-320x50 {
            width: 100%;
            height: 20px;
            position: fixed;
            bottom: 0;
            left: 0;
            z-index: 9999;
            background: #f0f0f0;
            border: 1px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>我的游戏页面</h1>
    
    <!-- 320x50横幅广告容器 -->
    <div id="banner-ad-320x50">等待320x50横幅广告...</div>
    
    <!-- 其他内容 -->
    <div>游戏内容...</div>
</body>
</html>
```

### 3. 自动加载
SDK会在页面加载完成后自动：
1. 查找广告容器
2. 按优先级排序
3. 间隔加载广告（默认2秒间隔）

## 🎛️ 高级配置

### 禁用自动加载
```javascript
// 禁用自动Banner广告
PokiSDK.enableAutoBanner(false);

// 重新启用
PokiSDK.enableAutoBanner(true);
```

### 配置参数
```javascript
// 设置自动Banner广告配置
PokiSDK.setAutoBannerConfig({
    enabled: true,    // 是否启用
    maxAds: 3,        // 最大广告数量
    delay: 500,       // DOM加载后延迟(ms)
    interval: 2000    // 广告间隔(ms)
});

// 获取当前配置
const config = PokiSDK.getAutoBannerConfig();
console.log(config);
```

## 📊 事件监听

```javascript
// 监听广告加载成功
window.addEventListener('bannerAdLoaded', function(event) {
    console.log('Banner广告加载成功:', event.detail);
    // event.detail 包含: size, selector, timestamp
});

// 监听广告加载失败
window.addEventListener('bannerAdError', function(event) {
    console.log('Banner广告加载失败:', event.detail);
    // event.detail 包含: size, selector, error, timestamp
});
```

## 🔧 手动加载（如果需要）

```javascript
// 手动加载特定广告
PokiSDK.displayAd(
    'banner-ad-320x50',  // 容器ID
    '320x50',            // 广告尺寸
    function() {
        console.log('广告加载成功');
    },
    function(error) {
        console.log('广告加载失败:', error);
    }
);
```

## 📋 最佳实践

1. **推荐使用320x50横幅广告**：符合用户要求，位于屏幕底部
2. **容器必须有合适的尺寸**：至少满足广告尺寸要求
3. **使用固定定位**：底部横幅广告建议使用`position: fixed; bottom: 0`
4. **添加基础样式**：背景色、边框等帮助调试
5. **监听事件**：处理加载成功/失败的情况

## 🚨 注意事项

- Banner广告与H5 SDK初始化无关，会立即尝试加载
- 如果没有找到容器，会在控制台输出提示信息
- 广告拦截器可能会阻止广告显示
- 需要HTTPS环境才能正常工作
- 确保AdSense配置正确

## 📈 调试信息

SDK会在控制台输出详细的调试信息：
- 容器查找结果
- 广告加载进度
- 错误信息和建议
- 环境检查结果

打开浏览器开发者工具查看完整的调试日志。

# 自动Banner广告使用指南 v2.0.0

## 🚀 新特性：自动直接插入

**PokiSDK v2.0.0 现在支持自动在页面底部直接插入Banner广告，无需预设任何容器！**

## ✨ 核心功能

- ✅ **自动创建**：SDK会自动在页面底部创建320x20横幅广告容器
- ✅ **固定定位**：使用`position: fixed; bottom: 0`确保始终在底部显示
- ✅ **响应式**：自动适配100%屏幕宽度，广告内容居中显示
- ✅ **高优先级**：z-index: 9999确保在所有内容上方
- ✅ **加载指示**：显示加载状态和错误信息
- ✅ **自动隐藏**：加载失败时5秒后自动隐藏
- ✅ **重复保护**：防止多次创建相同的Banner容器

## 🎮 使用方法

### 1. 默认启用
```javascript
// 默认情况下，自动Banner广告已启用
// 页面加载后会自动在底部创建Banner广告
```

### 2. 手动控制
```javascript
// 启用自动Banner广告
PokiSDK.enableAutoBanner(true);

// 禁用自动Banner广告
PokiSDK.enableAutoBanner(false);

// 设置延迟时间
PokiSDK.setAutoBannerConfig({
    enabled: true,
    delay: 1000  // 页面加载后延迟1秒创建
});

// 获取当前配置
const config = PokiSDK.getAutoBannerConfig();
console.log(config); // { enabled: true, delay: 500 }
```

### 3. 事件监听
```javascript
// 监听Banner广告加载成功
window.addEventListener('bannerAdLoaded', function(event) {
    console.log('Banner广告加载成功:', event.detail);
    // event.detail: { size: '320x20', container: 'auto-created', position: 'bottom-fixed', timestamp: ... }
});

// 监听Banner广告加载失败
window.addEventListener('bannerAdError', function(event) {
    console.error('Banner广告加载失败:', event.detail);
    // event.detail: { size: '320x20', container: 'auto-created', error: '...', timestamp: ... }
});
```

## 🔧 技术实现

### 容器创建
```javascript
// SDK会自动创建如下结构的容器
<div id="poki-auto-banner-ad" style="
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 20px;
    z-index: 9999;
    background: #f0f0f0;
    border-top: 1px solid #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
    font-size: 12px;
    color: #666;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
">
    <!-- Google AdSense 320x20 广告将被插入到这里 -->
</div>
```

### 自动化流程
1. **检查重复**：检查是否已存在`poki-auto-banner-ad`容器
2. **创建容器**：动态创建底部固定容器
3. **设置样式**：应用固定定位和响应式样式
4. **加载广告**：调用Google AdSense API加载320x20广告
5. **状态监控**：监听加载状态并处理错误

## 📱 响应式设计

### 移动端适配
- 容器宽度自动适配屏幕宽度
- 固定20px高度确保不影响页面布局
- 高z-index确保在移动端浮层上方显示

### 桌面端适配
- 320x20广告在宽屏下居中显示
- 容器背景色和边框提供视觉边界
- 阴影效果增强层次感

## 🎯 优势对比

### v2.0.0 (当前) - 自动直接插入
```javascript
// 无需任何HTML准备
// SDK自动创建和管理Banner容器
// 开发者零配置即可使用
```

### v1.9.x (旧版) - 容器查找模式
```html
<!-- 需要预先在HTML中准备容器 -->
<div id="banner-ad-320x50"></div>
<div data-ad-size="320x50"></div>
<div class="banner-ad-320x50"></div>
```

## ⚙️ 配置选项

### 可配置参数
```javascript
PokiSDK.setAutoBannerConfig({
    enabled: true,  // 是否启用自动Banner广告
    delay: 500      // DOM加载后的延迟时间(ms)
});
```

### 默认配置
```javascript
{
    enabled: true,  // 默认启用
    delay: 500      // 默认延迟500ms
}
```

## 🛠️ 调试和测试

### 检查容器状态
```javascript
// 检查是否已创建Banner容器
const banner = document.getElementById('poki-auto-banner-ad');
if (banner) {
    console.log('Banner容器已创建:', {
        id: banner.id,
        width: banner.offsetWidth,
        height: banner.offsetHeight,
        position: banner.style.position,
        bottom: banner.style.bottom,
        zIndex: banner.style.zIndex
    });
} else {
    console.log('Banner容器未找到');
}
```

### 测试页面
访问 `auto-banner-direct-test.html` 进行功能测试：
- 实时状态监控
- 手动控制按钮
- 详细日志输出
- 滚动测试固定定位效果

## 📋 最佳实践

### 1. 页面布局预留空间
```css
body {
         /* 为底部Banner预留空间 */
     padding-bottom: 30px;
}
```

### 2. 移动端适配
```css
@media (max-width: 768px) {
    body {
        padding-bottom: 30px; /* 移动端也要预留空间 */
    }
}
```

### 3. 错误处理
```javascript
window.addEventListener('bannerAdError', function(event) {
    // 根据业务需求处理广告加载失败
    console.log('可以显示备用内容或调整页面布局');
});
```

## 🔍 故障排除

### 常见问题

1. **Banner未显示**
   - 检查`PokiSDK.getAutoBannerConfig().enabled`是否为true
   - 查看浏览器控制台是否有错误信息
   - 确认网络连接正常，AdSense脚本能正常加载

2. **Banner被遮挡**
   - 检查页面其他元素的z-index值
   - 确认没有其他fixed定位元素占用底部空间

3. **移动端显示异常**
   - 确认viewport设置正确
   - 检查是否有CSS影响固定定位

### 调试命令
```javascript
// 查看配置
console.log('Config:', PokiSDK.getAutoBannerConfig());

// 查看容器
console.log('Container:', document.getElementById('poki-auto-banner-ad'));

// 重新启用
PokiSDK.enableAutoBanner(false);
setTimeout(() => PokiSDK.enableAutoBanner(true), 1000);
```

## 📈 版本历史

### v2.0.0 (当前)
- ✨ 新增自动底部插入Banner广告功能
- 🔧 移除容器查找逻辑，简化使用流程
- 🎨 优化Banner容器样式和响应式适配
- 📱 改进移动端和桌面端兼容性

### v1.9.x
- 📦 基于容器查找的Banner广告系统
- 🔍 支持多种容器选择器
- ⚙️ 复杂的配置选项（maxAds, interval等）

---

**总结：PokiSDK v2.0.0 的自动Banner广告功能让开发者无需任何配置即可在页面底部显示Banner广告，大大简化了集成流程。** 