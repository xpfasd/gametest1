# Banner广告SDK文档

## 📋 概述

本文档整理了PokiSDK中Banner广告相关的代码实现，包括展示Banner广告、销毁广告等功能的详细说明。

## 🚀 核心功能

### 1. 显示Banner广告

#### API签名
```javascript
PokiSDK.displayAd(container, size, onComplete, onError)
```

#### 参数说明
- `container`: HTML容器元素，用于展示广告
- `size`: 广告尺寸规格
- `onComplete`: 广告加载成功回调函数
- `onError`: 广告加载失败回调函数

#### 实现代码
```javascript
// 显示广告
this.displayAd = function(container, size, onComplete, onError) {
    console.log("PokiSDK.displayAd called with container:", container, "size:", size);
    
    // 对于banner广告，使用模拟实现
    setTimeout(function() {
        if (Math.random() > 0.2) { // 80%成功率
            console.log("PokiSDK.displayAd success (simulated)");
            if (onComplete) onComplete();
        } else {
            console.log("PokiSDK.displayAd failed (simulated)");
            if (onError) onError();
        }
    }, 500);
};
```

#### 全局对象映射
```javascript
displayAd: function(container, size, onComplete, onError) {
    return sdkInstance.displayAd(container, size, onComplete, onError);
}
```

### 2. 销毁Banner广告

#### API签名
```javascript
PokiSDK.destroyAd()
```

#### 实现代码
```javascript
destroyAd: function() {
    console.log("PokiSDK.destroyAd called");
    return sdkInstance.doNothing();
}
```

## 📱 支持的广告尺寸

根据核心SDK代码，支持以下标准Banner广告尺寸：

### 桌面端广告尺寸
```javascript
// 标准横幅广告
"728x90"     // 728×90像素 - 排行榜广告
"300x250"    // 300×250像素 - 中等矩形广告
"970x250"    // 970×250像素 - 大型横幅广告
"160x600"    // 160×600像素 - 宽摩天大楼广告
```

### 移动端广告尺寸
```javascript
"320x50"     // 320×50像素 - 移动横幅广告
```

### 外部平台广告尺寸
```javascript
"728x90_external"     // 外部平台横幅广告
"300x250_external"    // 外部平台中等矩形广告
"970x250_external"    // 外部平台大型横幅广告
"160x600_external"    // 外部平台摩天大楼广告
"320x50_external"     // 外部平台移动横幅广告
```

## 🔧 使用示例

### 基础使用
```javascript
// 创建广告容器
var adContainer = document.getElementById('banner-ad-container');

// 显示300x250广告
PokiSDK.displayAd(
    adContainer, 
    "300x250",
    function() {
        console.log("Banner广告加载成功");
    },
    function() {
        console.log("Banner广告加载失败");
    }
);
```

### 完整示例
```html
<!DOCTYPE html>
<html>
<head>
    <title>Banner广告示例</title>
    <style>
        .ad-container {
            width: 300px;
            height: 250px;
            border: 1px solid #ccc;
            margin: 20px auto;
            background-color: #f5f5f5;
        }
    </style>
</head>
<body>
    <!-- 广告容器 -->
    <div id="banner-ad" class="ad-container"></div>
    
    <script>
        // 等待SDK初始化
        PokiSDK.init().then(function() {
            var adContainer = document.getElementById('banner-ad');
            
            // 显示Banner广告
            PokiSDK.displayAd(
                adContainer,
                "300x250",
                function() {
                    console.log("广告展示成功");
                    // 可以在这里添加成功展示的逻辑
                },
                function() {
                    console.error("广告展示失败");
                    // 可以在这里添加失败处理逻辑
                    adContainer.innerHTML = '<p>广告加载失败</p>';
                }
            );
        });
        
        // 页面卸载时销毁广告
        window.addEventListener('beforeunload', function() {
            PokiSDK.destroyAd();
        });
    </script>
</body>
</html>
```

### 响应式广告示例
```javascript
function showResponsiveBanner() {
    var adContainer = document.getElementById('responsive-banner');
    var screenWidth = window.innerWidth;
    var adSize;
    
    // 根据屏幕尺寸选择合适的广告规格
    if (screenWidth >= 970) {
        adSize = "970x250";  // 大屏幕使用大横幅
    } else if (screenWidth >= 728) {
        adSize = "728x90";   // 中等屏幕使用标准横幅
    } else if (screenWidth >= 320) {
        adSize = "320x50";   // 移动设备使用移动横幅
    } else {
        adSize = "300x250";  // 默认使用中等矩形
    }
    
    PokiSDK.displayAd(
        adContainer,
        adSize,
        function() {
            console.log("响应式广告加载成功，尺寸：" + adSize);
        },
        function() {
            console.error("响应式广告加载失败");
        }
    );
}

// 监听屏幕尺寸变化
window.addEventListener('resize', function() {
    // 销毁当前广告
    PokiSDK.destroyAd();
    // 延迟重新加载以适应新尺寸
    setTimeout(showResponsiveBanner, 100);
});
```

## 🛠️ 辅助功能

### 广告拦截检测
```javascript
// 检测是否被广告拦截器阻止
if (PokiSDK.isAdBlocked()) {
    console.log("检测到广告拦截器");
    // 显示友好提示或降级方案
    document.getElementById('ad-message').innerHTML = 
        '<p>请禁用广告拦截器以支持我们的游戏开发</p>';
} else {
    // 正常显示广告
    showBannerAd();
}
```

### 广告拦截检测实现
```javascript
isAdBlocked: function() {
    console.log("PokiSDK.isAdBlocked called");
    
    // 简单的广告拦截检测
    var testElement = document.createElement('div');
    testElement.innerHTML = '&nbsp;';
    testElement.className = 'adsbox';
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    document.body.appendChild(testElement);
    
    var isBlocked = testElement.offsetHeight === 0;
    document.body.removeChild(testElement);
    
    return isBlocked;
}
```

## 📊 最佳实践

### 1. 广告放置时机
```javascript
// 游戏加载完成后显示广告
PokiSDK.gameLoadingCompleted();
setTimeout(function() {
    showBannerAd();
}, 1000);
```

### 2. 错误处理
```javascript
function showBannerWithFallback(container, primarySize, fallbackSize) {
    PokiSDK.displayAd(
        container,
        primarySize,
        function() {
            console.log("主要广告尺寸加载成功");
        },
        function() {
            console.log("主要广告尺寸失败，尝试备用尺寸");
            // 尝试备用尺寸
            PokiSDK.displayAd(
                container,
                fallbackSize,
                function() {
                    console.log("备用广告尺寸加载成功");
                },
                function() {
                    console.log("所有广告尺寸都失败了");
                    container.style.display = 'none';
                }
            );
        }
    );
}
```

### 3. 性能优化
```javascript
// 延迟加载广告，避免影响游戏启动
function delayedAdLoad() {
    // 等待游戏完全启动后再加载广告
    if (window.gameReady) {
        showBannerAd();
    } else {
        setTimeout(delayedAdLoad, 500);
    }
}

// 游戏就绪后调用
setTimeout(delayedAdLoad, 2000);
```

## 🔍 调试信息

### 控制台日志
广告相关操作会在控制台输出详细日志：
```
PokiSDK.displayAd called with container: [HTMLDivElement] size: 300x250
PokiSDK.displayAd success (simulated)
PokiSDK.destroyAd called
```

### 模拟配置
当前实现使用模拟广告，成功率为80%：
```javascript
if (Math.random() > 0.2) { // 80%成功率
    // 成功回调
} else {
    // 失败回调
}
```

## 🚨 注意事项

1. **容器要求**: 确保广告容器有明确的尺寸定义
2. **时机控制**: 避免在游戏加载期间显示广告
3. **错误处理**: 始终提供失败回调处理
4. **资源清理**: 页面卸载时记得销毁广告
5. **响应式设计**: 根据屏幕尺寸选择合适的广告规格

## 📝 版本信息

- SDK版本: v1.9.7
- 支持功能: Banner广告展示、销毁、拦截检测
- 实现方式: 模拟实现（80%成功率）
- 后台加载: 支持SDK后台无限重试加载 