# Poki SDK 使用分析报告

## 项目概述
本游戏项目是一个跳跃类游戏（Jump Game），集成了Poki SDK来处理广告展示和游戏状态追踪。

## 📋 更新说明 (最新 - AHAGAMECENTER H5 SDK集成)

### 🚀 AHAGAMECENTER H5广告SDK接入
根据adinfo.txt文档要求，已将`poki-sdk.js`重构为**AHAGAMECENTER H5 SDK适配器架构**，实现以下功能：

#### 核心特性
- ✅ **API兼容性**: 保持原有PokiSDK所有方法不变
- ✅ **H5 SDK集成**: 动态加载并初始化AHAGAMECENTER H5广告SDK
- ✅ **自动初始化**: 页面加载完成后自动初始化SDK
- ✅ **完整埋点**: 集成Athena埋点系统，完整上报游戏数据
- ✅ **广告类型支持**: 开屏广告、插屏广告、奖励视频广告
- ✅ **游戏状态管理**: 自动暂停/恢复游戏
- ✅ **沙盒模式**: 支持测试环境和生产环境切换
- ✅ **错误处理**: 完善的降级和重试机制

#### AHAGAMECENTER H5 SDK配置
```javascript
const H5_AD_CONFIG = {
    sdkUrl: "https://www.hippoobox.com/static/sdk/adsdk_1.5.0.0.js",
    appKey: window.GAME_APP_KEY || "1234567", // 游戏唯一标识
    ga: {
        id: window.GA_TRACKING_ID || "UA-1234567-1" // GA跟踪代码ID
    },
    adsense: {
        client: window.ADSENSE_CLIENT || "ca-pub-1234567890",
        "data-ad-frequency-hint": "45s", // 广告频次限制
        "data-adbreak-test": window.AD_TEST_MODE || "on", // 测试模式
        "data-ad-channel": window.AD_CHANNEL || "987654321" // 自定义渠道ID
    }
};
```

#### 广告类型映射
| PokiSDK方法 | H5 SDK映射 | 广告类型 | 说明 |
|------------|-----------|---------|------|
| `commercialBreak()` | `adBreak({type: "pause"})` | 插屏广告 | 游戏暂停时展示 |
| `rewardedBreak()` | `adBreak({type: "reward"})` | 奖励视频 | 观看完成获得奖励 |
| 游戏启动时 | `adBreak({type: "preroll"})` | 开屏广告 | 游戏加载前展示 |

#### 埋点事件映射
| PokiSDK方法 | Athena埋点 | 说明 |
|------------|-----------|------|
| `init()` | `game_start` | 游戏开始 |
| `gameLoadingStart()` | `loading_begin` | 开始加载 |
| `gameLoadingFinished()` | `loading_end` | 加载完成 |
| `gameplayStart()` | `game_page` | 游戏主页面 |
| `roundStart(level)` | `level_begin` | 关卡开始 |
| `roundEnd(result)` | `level_end` | 关卡结束 |
| `happyTime()` | `level_reward` | 奖励机会 |

#### 环境配置
```javascript
// 沙盒测试环境（自测时使用）
// URL: game.html?env=pre

// 生产环境（提测后使用）
// URL: game.html

// 全局配置变量
window.GAME_APP_KEY = "your_app_key";          // 游戏唯一标识
window.GA_TRACKING_ID = "UA-1234567-1";        // GA跟踪ID
window.ADSENSE_CLIENT = "ca-pub-1234567890";   // AdSense客户端ID
window.AD_TEST_MODE = "on";                     // 测试模式开关
window.AD_CHANNEL = "987654321";                // 广告渠道ID
```

## Poki SDK 文件结构

### 1. 主要SDK文件
- `scripts/v2/poki-sdk.js` - **AHAGAMECENTER H5 SDK适配器**（已重构）
- `scripts/v2.313.0/poki-sdk-core-v2.313.0.js` - 原版核心SDK文件

### 2. 项目中的SDK调用位置

#### A. `scripts/main.js` 中的调用
该文件包含DOM处理器类，负责与Poki SDK的直接交互：

**类名**: `DOMHandler` (标识符: \"avix-pokisdk-forc3\")

**主要方法调用**:
1. **`PokiSDK.init()`** - 初始化SDK → 加载H5 SDK并配置广告
2. **`PokiSDK.gameLoadingStart()`** - 游戏开始加载 → 上报`loading_begin`
3. **`PokiSDK.gameLoadingFinished()`** - 游戏加载完成 → 上报`loading_end`
4. **`PokiSDK.gameplayStart()`** - 游戏开始 → 上报`game_page`
5. **`PokiSDK.gameplayStop()`** - 游戏停止 → 停止游戏状态
6. **`PokiSDK.happyTime(intensity)`** - 快乐时刻 → 上报`level_reward`
7. **`PokiSDK.commercialBreak()`** - 商业广告中断 → 显示插屏广告
8. **`PokiSDK.rewardedBreak()`** - 奖励视频广告 → 显示奖励视频
9. **`PokiSDK.setDebug(enable)`** - 设置调试模式 → 控制日志输出

#### B. `scripts/c3main.js` 中的调用
该文件包含Construct 3插件实现：

**插件类**: `C33.Plugins.Avix_PokiSDK_ForC3`

**方法映射**:
- `InitPoki()` → 初始化H5 SDK适配器
- `ShowCommercialBreak()` → 显示插屏广告（pause类型）
- `ShowRewardedBreak()` → 显示奖励视频（reward类型）
- `GameplayStart()` → 游戏开始事件上报
- `GameplayStop()` → 游戏停止事件上报
- `GameLoadingStart()` → 加载开始事件上报
- `GameLoadingFinished()` → 加载完成事件上报
- `HappyTime(intensity)` → 正向事件上报
- `RoundStart(level)` → 关卡开始上报
- `RoundEnd(result)` → 关卡结束上报

### 3. H5 SDK适配器架构

#### A. H5SDKAdapter类功能
- **动态加载**: 自动加载AHAGAMECENTER H5 SDK脚本
- **初始化管理**: 处理SDK初始化和配置
- **广告管理**: 统一管理各种类型的广告展示
- **游戏状态同步**: 自动暂停/恢复游戏
- **埋点上报**: 自动上报游戏行为数据
- **错误处理**: 完善的错误捕获和降级机制

#### B. 广告展示流程
```javascript
// 1. 插屏广告流程
PokiSDK.commercialBreak() 
→ H5SDKAdapter.showInterstitialAd()
→ window.h5sdk.adBreak({type: "pause"})
→ beforeAd: pauseGame()
→ afterAd: resumeGame()
→ adBreakDone: 回调处理

// 2. 奖励视频流程
PokiSDK.rewardedBreak()
→ H5SDKAdapter.showRewardedAd()
→ window.h5sdk.adBreak({type: "reward"})
→ beforeReward: showAdFn()
→ adViewed: 发放奖励
→ adDismissed: 取消奖励
```

#### C. 埋点上报系统
```javascript
// 自动埋点
H5SDKAdapter.reportGameState(eventName, param1, param2)
→ window.h5sdk.athenaSend(eventName, param1, param2)
→ 同步到GA和后台数据系统

// 预定义埋点事件
- game_start: 游戏开始
- loading_begin/loading_end: 加载过程
- game_page: 游戏主页面
- level_begin/level_end: 关卡进度
- level_reward: 奖励机会
```

## 4. 使用指南

### 开发环境配置
```html
<!DOCTYPE html>
<html>
<head>
    <title>Game Title</title>
    <!-- 配置全局变量 -->
    <script>
        window.GAME_APP_KEY = "your_app_key";
        window.GA_TRACKING_ID = "UA-1234567-1";
        window.ADSENSE_CLIENT = "ca-pub-1234567890";
        window.AD_TEST_MODE = "on"; // 测试模式
        window.AD_CHANNEL = "987654321";
    </script>
</head>
<body>
    <!-- 游戏内容 -->
    
    <!-- 加载PokiSDK -->
    <script src="scripts/v2/poki-sdk.js"></script>
</body>
</html>
```

### 测试流程
1. **沙盒测试**: 访问 `game.html?env=pre` 进行沙盒测试
2. **广告测试**: 在测试模式下验证各种广告类型的展示
3. **埋点验证**: 检查控制台日志确认埋点正常上报
4. **生产部署**: 去掉`?env=pre`参数部署到生产环境

### Banner广告集成
```html
<!-- 在游戏页面底部添加Banner广告 -->
<ins class="adsbygoogle"
     style="display:inline-block;width:320px;height:50px"
     data-ad-client="YOUR_CLIENT_ID"
     data-ad-slot="YOUR_SLOT_ID"></ins>
<script>
  (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

## 5. iframe通信支持

### 外层页面代码
```javascript
// 向iframe发送消息
function postMessageToIframe(params) {
    iframe.contentWindow.postMessage(
        JSON.stringify(params),
        "https://www.ahagamecenter.com"
    );
}

// 接收iframe消息并调用广告
window.addEventListener("message", (e) => {
    if (e.origin !== "https://www.ahagamecenter.com") return;
    
    const params = JSON.parse(e.data);
    if (params.func === "adBreakReward") {
        // 调用PokiSDK的奖励视频方法
        PokiSDK.rewardedBreak().then(rewarded => {
            postMessageToIframe({
                func: "adBreakDoneReward",
                rewarded: rewarded
            });
        });
    }
});
```

### iframe内页面代码
```javascript
// 向父页面请求广告
function requestRewardedAd() {
    window.parent.postMessage(
        JSON.stringify({ func: "adBreakReward" }),
        "https://www.ahagamecenter.com"
    );
}

// 接收广告结果
window.addEventListener("message", (e) => {
    if (e.origin !== "https://www.ahagamecenter.com") return;
    
    const params = JSON.parse(e.data);
    if (params.func === "adBreakDoneReward") {
        if (params.rewarded) {
            // 发放奖励
            console.log("奖励已发放");
        } else {
            // 未获得奖励
            console.log("未观看完整广告");
        }
    }
});
```

## 6. 技术架构优势

### 架构特点
- **无缝集成**: 保持原有PokiSDK API完全不变
- **动态加载**: 运行时加载H5 SDK，减少初始包体积
- **智能降级**: SDK加载失败时自动使用降级模式
- **完整监控**: 集成埋点系统，全面监控游戏行为
- **跨平台支持**: 支持iframe嵌入和独立页面运行

### 错误处理策略
- **优雅降级**: H5 SDK加载失败时使用模拟模式
- **重试机制**: 广告加载失败时提供降级广告
- **状态恢复**: 确保游戏在任何情况下都能正常恢复
- **完整日志**: 记录所有关键操作用于问题排查

## 7. 注意事项

### 重要提醒
1. **测试环境**: 提测前必须带参数`?env=pre`访问一次
2. **iframe模式**: 如果游戏使用iframe展示，必须使用iframe通信方式
3. **广告展示率**: 正式环境广告不是100%展示，受多种因素影响
4. **配置更新**: 需要联系运营人员获取正式的广告位配置参数

### 配置清单
- [ ] 设置正确的`GAME_APP_KEY`
- [ ] 配置GA跟踪ID
- [ ] 设置AdSense客户端ID
- [ ] 配置广告渠道ID
- [ ] 测试沙盒环境访问
- [ ] 验证各类型广告展示
- [ ] 检查埋点数据上报

该项目现在实现了完整的**AHAGAMECENTER H5 SDK适配架构**，既保持了原有API的兼容性，又提供了专业的H5广告投放能力，包含完整的埋点系统和多种广告类型支持。
