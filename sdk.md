# Dlightek H5 游戏 SDK 对接文档

更新时间： 2025-06-10

## 1. SDK 简介

游戏 SDK 集成了广告和游戏事件追踪能力：

-   广告： 商业化团队游戏广告 SDK（包括 Google AFG 广告、EW）
-   事件追踪： Athena、Google gtag.js

### 更新日志

| 时间 | 版本 | 更新内容 |
| :--- | :--- | :--- |
| 2022/6/21 | 1.0.0.0 | 更新至最新版本 |
| 2022/8/11 | 1.0.1.0 | 更新至最新版本 |
| 2022/8/24 | 1.1.0.0 | 更新至最新版本 |
| 2022/9/5 | 1.2.0.0 | 更新至最新版本 |
| 2022/9/27 | 1.2.1.0 | 更新至最新版本 |
| 2022/11/16 | 1.2.2.0 | 更新至最新版本 |
| 2022/11/29 | 1.3.0.0 | 更新至最新版本 |
| 2023/1/10 | 1.4.0.0 | 更新至最新版本，新增 4 种浮动广告，新增后备广告 |
| 2023/3/29 | 1.5.0.0 | 更新至最新版本，支持 hisavana 广告（后备广告，浮动广告已屏蔽） |
| 2023/7/4 | 1.7.1.0 | 更新至最新版本，新增游戏列表页，广告云控 |
| 2023/7/27 | 1.8.0.0 | 集成商业团队游戏广告 SDK，新增 amp 游戏时长计算 |
| 2024/10/12 | 1.9.4 | 删除 Google Analytics 加载和上报 & 广告在 onload 后加载 |
| 2024/11/18 | 1.9.5 | Banner 和激励视频优化 |

---

## 2. 广告接入指南

### 2.1. SDK DEMO 展示

-   DEMO 地址 (测试广告)： `https://www.ahagamecenter.com/h5sdk_demo.html`
-   DEMO 地址 (正式广告)： `https://www.ahagamecenter.com/h5sdk_demo_prod.html`

> 注意：
> *   如果游戏使用 `iframe` 嵌入，请在外层加载 SDK，并使用 `postMessage` 进行通信交互。详情请参考 【2.4. iframe 通信代码】，请严格按照此方法接入，否则将导致游戏在【H5游戏联运平台】无法提审。
> *   自测时请务必带上参数 `env=pre`，该参数用于访问沙箱环境并将游戏加入沙箱（至少访问一次），提审时请移除此参数。
> *   正式广告并非 100% 展示。设备屏蔽、手机广告拦截器或 AFG 广告类型未启用等因素都可能导致广告无法展示。

### 2.2. 添加 SDK 依赖

```html
<script src="https://www.hippoobox.com/static/sdk/adsdk_1.8.0.0.js"></script>
```

### 2.3. SDK 初始化、广告预加载和展示

*请将初始化代码放置于 `</body>` 标签之后。*

```html
<script>
window.h5sdk.init(appKey, top, left, bottom, right, options);

// options 参数由 ga 和 adsense 两部分组成
const options = {
  "ga": {
    // GA Tracking Code ID，Athena 追踪将同步上报至 Google，请联系 Dlightek 运营团队获取
    "id": "UA-1234567-1" 
  },
  "adsense": {
    "client": "ca-pub-1234567890", // adsense client id
    "data-ad-frequency-hint": "45s", // 广告频率限制，最低 45s
    "data-adbreak-test": "on", // 启用测试模式，如需启用正式模式，请删除此字段
    "data-ad-channel": "987654321", // 游戏广告自定义渠道 ID
    
    // 热启动广告，在浏览器切换时（即锁屏/解锁）展示
    // pauseCallback 和 resumeCallback 必须同时存在，热启动广告才会展示
    // 如果游戏无法暂停/重启，请删除这两个回调
    "pauseCallback": () => {
      console.log("👩💻 my game paused");
      // ---请在此处添加游戏暂停代码---
    },
    "resumeCallback": () => {
      console.log("👩💻 my game restart");
      // ---请在此处添加游戏重启代码---
    },
    
    "callback": () => { // 初始化后的回调
      window.h5sdk.athenaSend("game_start", "my_game_name"); // 开始游戏自定义事件追踪
      window.h5sdk.adConfig({
        preloadAdBreaks: "on",
        onReady: () => {
          // 不要在 onReady 中初始化游戏，因为它可能存在失败的情况！
          // 展示广告
          // 当广告展示错误（如 not ready, timeout, noAdPreloaded 等）时，将展示后备广告
          window.h5sdk.adBreak({
            type: "preroll",
            name: "my_preroll",
            adBreakDone: () => {}, // 不在此处初始化游戏，因为玩家不关闭广告游戏将无法初始化！
          });
        },
      });
    },
  }
};
</script>
```

#### 广告预加载配置：`window.h5sdk.adConfig`

`adConfig()` 会将游戏的当前配置应用于广告展示位置 API。此 API 可用于调整广告预加载方式、筛选所有请求的广告类型以选择合适的类型（例如，需要声音的视频广告）。

函数签名：
```javascript
adConfig({
   preloadAdBreaks: 'on|auto',  // 广告预加载策略
   sound: 'on|off',             // 游戏是否带声音
   onReady: () => {},           // 当 API 初始化且 adBreak() 可用时调用
});
```
更多详情请参考 Google 参数指南：[adConfig API](https://developers.google.com/ad-placement/apis/adconfig?hl=en)

#### 广告展示（开屏、插页、激励视频）：`window.h5sdk.adBreak`

函数签名：
```javascript
adBreak({
   type: '<type>',                     // 展示位置类型
   name: '<name>',                     // 展示位置的描述性名称
   beforeAd: () => {},                 // 广告展示前准备。静音并暂停游戏
   afterAd: () => {},                  // 恢复游戏并重新启用声音
   beforeReward: (showAdFn) => {},     // 显示奖励提示（若用户同意则调用 showAdFn()）
   adDismissed: () => {},              // 玩家在完成前关闭了广告
   adViewed: () => {},                 // 广告已看完并关闭
   adBreakDone: (placementInfo) => {}, // 无论广告是否展示，最终都会调用
});
```

`adBreak()` 参数说明

| 名称 | 类型 | 说明 |
| :--- | :--- | :--- |
| 所有广告类型 |
| `type` | String | 广告展示位置类型。可选值：`'preroll'` (游戏加载前), `'start'` (界面显示后), `'pause'` (玩家暂停游戏), `'next'` (玩家进入下一关), `'browse'` (玩家浏览其他选项), `'reward'` (激励广告)。 |
| `name` | String | (可选) 广告位的具体名称，为内部标识符，用于报告和优化。建议为所有广告位命名。 |
| `beforeAd` | Function | (可选) 广告展示前调用。此时游戏应暂停并静音。 |
| `afterAd` | Function | (可选) 广告展示后调用（无论原因）。对于激励广告，此方法在 `adDismissed` 或 `adViewed` 后调用。用于恢复游戏进程。 |
| `adBreakDone` | Function | (可选) `adBreak()` 的最终回调，即使广告未展示也会调用。它接收一个 `placementInfo` 对象，如：`{ breakType: '<type>', breakName: '<name>', breakFormat: 'interstitial|reward', breakStatus: 'error|viewed', ... }`。 |
| 仅激励广告 |
| `beforeReward` | Function | 当激励广告可用时调用。该函数接收一个参数 `showAdFn()`，必须调用它来展示激励广告。 |
| `adDismissed` | Function | 仅当玩家在激励视频播放完成前关闭时调用。此情况无奖励。 |
| `adViewed` | Function | 仅当玩家完整观看激励广告后调用。此时应发放奖励。 |

更多详情请参考 Google 参数指南：
-   [adBreak API](https://developers.google.com/ad-placement/apis/adbreak?)
-   [Placement Types](https://developers.google.com/ad-placement/docs/placement-types?)

#### Banner 广告展示

将 Dlightek 运营提供的 Banner 代码固定在游戏页面底部（根据页面情况添加相应 CSS）。

```html
<ins class="adsbygoogle"
     style="display:inline-block;width:320px;height:50px"
     data-ad-client="YOUR CLIENT ID"
     data-ad-slot="YOUR SLOT ID"></ins>
<script>
  (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

#### 初始化：`window.h5sdk.init(appKey, top, left, bottom, right, options);`

参数说明：
-   `appKey`: 游戏的唯一标识符，从游戏资源上传表中获取。
-   `top, left, bottom, right`: 留空请传空字符串 `""`。
-   `options`: 请参考上文 【SDK 初始化、广告预加载和展示】。

示例：
```javascript
window.h5sdk.init(1234567, "", "", "", "", options);
```

#### 游戏加载时间计算【必须添加】：`window.h5sdk.gameLoadingCompleted()`

说明： 将此方法添加到游戏首页展示的节点（或游戏进度条达到 100% 的节点），用于上报游戏加载时间数据，以帮助我们进行分析和优化。

### 2.4. iframe 通信代码

代码示例请参考 DEMO：`https://www.ahagamecenter.com/h5sdk_demo_iframe.html?env=pre`

外层页面代码：
```html
<!-- 必须在外层加载 SDK -->
<script src="https://www.hippoobox.com/static/sdk/adsdk_1.5.0.0.js"></script>
...

<script>
// 向 iframe 发送消息
function postMessageToIframe(params) {
  const iframe = document.getElementById("iframe");
  iframe.contentWindow.postMessage(
    JSON.stringify(params),
    "https://www.ahagamecenter.com" // iframe 域名
  );
}

// 接收 iframe 的消息
window.addEventListener("message", (e) => {
  // 根据消息来源的域名进行过滤
  if (e.origin !== "https://www.ahagamecenter.com") {
    console.warn("收到了其他来源的消息（来自：" + e.origin + "）");
    return;
  }
  
  try {
    const paramsFromIframe = JSON.parse(e.data);
    // 根据 func 执行不同的广告操作
    if (paramsFromIframe.func === "adBreakReward") {
      window.h5sdk.adBreak({
        type: "reward",
        name: "my_reward",
        beforeAd: () => console.log("beforeAd"),
        afterAd: () => console.log("afterAd"),
        adDismissed: () => console.log("adDismissed"),
        adViewed: () => console.log("adViewed"),
        beforeReward: (showAdFn) => {
          console.log("beforeReward");
          showAdFn();
        },
        adBreakDone: (placementInfo) => {
          postMessageToIframe({
            func: "adBreakDoneReward",
            placementInfo,
          });
        },
      });
    }
  } catch (error) {
    console.log(error);
  }
});
</script>
```

iframe 内页面代码：
```javascript
// 向父窗口发送消息
function postMessageToParent(params) {
  window.parent.postMessage(
    JSON.stringify(params),
    "https://www.ahagamecenter.com" // 父窗口域名
  );
}

// 请求展示激励广告
postMessageToParent({ func: "adBreakReward" });

// 接收父窗口的消息
window.addEventListener("message", (e) => {
  // 根据消息来源的域名进行过滤
  if (e.origin !== "https://www.ahagamecenter.com") {
    console.warn("收到了其他来源的消息（来自：" + e.origin + "）");
    return;
  }
  
  try {
    const paramsFromParent = JSON.parse(e.data);
    // 根据 func 执行不同的逻辑
    if (paramsFromParent.func === "adBreakDoneReward") {
      if (paramsFromParent.placementInfo.breakStatus === "dismissed") {
        alert("取消观看: " + paramsFromParent.placementInfo.breakStatus);
        return;
      } else if (paramsFromParent.placementInfo.breakStatus !== "viewed") {
        alert("广告异常: " + paramsFromParent.placementInfo.breakStatus);
        return;
      }
      // 广告观看完成，可以在此发放奖励
    }
  } catch (error) {
    console.log(error);
  }
});
```

---

## 3. Athena 事件埋点指南

### 初始化

加载 H5 广告 SDK 并初始化后，Athena 将自动加载并初始化。
更多详细信息请参考： `https://dsu-h-test.shalltry.com/athena/wiki/#/js_sdk_init`

### 上报自定义事件
```javascript
window.h5sdk.athenaSend(eventname, param1, param2);
```
参数说明：
- `eventname`: 自定义事件名称
- `param1`: 参数 1
- `param2`: 参数 2

示例：
```javascript
window.h5sdk.athenaSend("myActionName", "myParam1", "myParam2");
```

### H5 自定义事件埋点规范
*以下是一些覆盖大多数场景的预定义事件名称。*

| 序号 | 事件名称 | 定义 | 参数 | 定义 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `game_start` | 打开游戏上报（上报后每30秒自动上报`play_time`事件，参数为1） | 游戏名称 (title) | |
| 2 | `loading_begin` | 游戏开始加载上报 | | |
| 3 | `loading_end` | 游戏加载完成上报（非进入游戏页面） | | |
| 4 | `load_adsbygoogle` | Google JS 开始加载上报 | | |
| 5 | `loaded_adsbygoogle`| JS 加载完成上报 | | |
| 6 | `turn_screen` | 切换横竖屏页面上报 | | |
| 7 | `horizontal` | 横屏行为上报 | | |
| 8 | `game_page` | 游戏页面（展示游戏主页面） | | |
| 9 | `level_begin` | 关卡开始 | 参数值为整数，关卡数 |
| 10 | `level_end` | 关卡结束 | 参数值为 `Fail` 或 `Pass` |
| 11 | `level_reward` | 关卡奖励 | 参数值为是否展示激励广告选项 (`Yes-1`, `No-0`) |
| 12 | `level_next` | 关卡完成点击 | | |
| 13 | `reward_click` | 特定激励场景的每次点击（自定义） | 场景 (商店、道具解锁、签到等) | 如: `game_skip`, `notenoughlayer` |

---

## 4. FAQ

1.  提交游戏测试前，必须使用 `?env=pre` 后缀访问一次游戏（例如 `https://mygame.com/?env=pre`），因为此阶段有后端数据同步操作。
2.  如果游戏使用 `iframe` 展示，需要按照 【2.4. iframe 通信代码】 中提供的方法集成 SDK 和进行通信。
3.  正式广告并非 100% 展示。设备屏蔽、手机上的广告拦截器或 AFG 广告类型未启用都可能导致广告无法展示。建议在浏览器无痕模式下使用不同手机刷新尝试。
4.  在实施新产品过程中，如果遇到具体问题，必须提供可复现问题的实际页面 URL，否则难以分析和定位问题。