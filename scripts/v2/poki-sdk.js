(() => {
    // ==================== DLIGHTEK H5 游戏SDK集成 v2.2.1 ====================
    
    // Dlightek H5 SDK配置
    const H5_AD_CONFIG = {
        sdkUrl: "https://www.hippoobox.com/static/sdk/adsdk_1.8.0.0.js", // 更新到最新版本
        appKey: "5021639", // 从全局变量获取或使用默认值
        
        // 超时和重试配置
        timeouts: {
            sdkLoad: 8000,      // SDK加载超时 8秒
            sdkInit: 5000,      // SDK初始化超时 5秒
            adShow: 10000,      // 广告显示超时 10秒
            adConfig: 3000      // 广告配置超时 3秒
        },
        
        retries: {
            maxBackgroundRetries: -1,  // 后台无限重试 (-1表示无限)
            retryDelay: 5000,          // 重试间隔 5秒
            maxRetryDelay: 30000,      // 最大重试间隔 30秒
            adShow: 1                  // 广告显示重试次数
        },
        
        ga: {
            id:  "G-FDTB04KDHD" // GA跟踪代码ID
        },
        adsense: {
            client: "ca-pub-2270136017335510",
            "data-ad-frequency-hint": "45s", // 广告频率限制，最低45s
            //"data-adbreak-test": window.AD_TEST_MODE || "on", // 测试模式，正式环境请删除
            "data-ad-channel": "3407225480"
        },
        
        // Banner广告配置
        banner: {
            client: "ca-pub-2270136017335510",
            slot: "8491466551", // Renzhi_Banner通用slot
            format: "auto",
            responsive: true,
            
            // 样式配置
            styles: {
                container: {
                    position: 'fixed !important',
                    bottom: '0 !important',
                    left: '0 !important',
                    width: '100% !important',
                    zIndex: '9999 !important',
                    background: 'transparent',
                    display: 'flex !important',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '12px',
                    color: '#666',
                    pointerEvents: 'auto',
                    boxSizing: 'border-box !important',
                    overflow: 'hidden !important',
                    webkitTransform: 'translateZ(0)', // 强制硬件加速
                    transform: 'translateZ(0)'
                },
                ins: {
                    display: 'inline-block !important',
                    backgroundColor: 'transparent',
                    boxSizing: 'border-box !important',
                    overflow: 'hidden !important'
                },
                loadingText: {
                    color: 'rgba(102, 102, 102, 0.5)',
                    fontSize: '10px'
                },
                errorText: {
                    color: 'rgba(255, 107, 107, 0.7)',
                    fontSize: '10px'
                }
            }
        },
        
        // 自动Banner广告配置
        autoBanner: {
            enabled: true, // 是否启用自动Banner广告加载
            delay: 500,    // DOM加载后的延迟时间(ms)
            width: 320,    // Banner广告宽度(px)
            height: 50      // Banner广告高度(px) - 固定高度，不可修改
        }
    };

    // URL参数获取函数
    var getUrlParam = function(param) {
        console.log("PokiSDK.getUrlParam called with param:", param);
        var regex = new RegExp("[?&]" + param + "=([^&]*)");
        var match = regex.exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, " "));
    };

    // 检查是否为儿童模式
    var isKidsMode = "kids" === getUrlParam("tag");

    // 检查是否有广告桥接
    var hasAdBridge = !!window.adBridge;

    // 检查是否启用提升模式
    var isHoistMode = "yes" === getUrlParam("gdhoist");

    // 检查是否为沙盒环境
    var isSandboxMode = getUrlParam("env") === "pre";

    // ==================== 工具函数 ====================
    
    // 超时Promise包装器
    function withTimeout(promise, timeoutMs, description) {
        return new Promise(function(resolve, reject) {
            var timeoutId = setTimeout(function() {
                console.warn(description + " 超时 (" + timeoutMs + "ms)");
                reject(new Error(description + " timeout"));
            }, timeoutMs);
            
            promise.then(function(result) {
                clearTimeout(timeoutId);
                resolve(result);
            }).catch(function(error) {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
    
    // 重试包装器
    function withRetry(fn, maxRetries, description) {
        return function() {
            var attempts = 0;
            var self = this;
            var args = arguments;
            
            function attempt() {
                attempts++;
                return fn.apply(self, args).catch(function(error) {
                    if (attempts < maxRetries) {
                        console.warn(description + " 失败，重试中... (" + attempts + "/" + maxRetries + ")", error.message);
                        return new Promise(function(resolve) {
                            setTimeout(function() {
                                resolve(attempt());
                            }, Math.min(1000 * attempts, 3000)); // 递增延迟，最大3秒
                        });
                    } else {
                        console.error(description + " 最终失败，已达到最大重试次数", error);
                        throw error;
                    }
                });
            }
            
            return attempt();
        };
    }

    // ==================== 后台SDK加载器 ====================
    
    var BackgroundSDKLoader = function() {
        var self = this;
        this.isLoaded = false;
        this.isLoading = false;
        this.loadAttempts = 0;
        this.retryTimer = null;
        this.loadPromise = null;
        this.callbacks = [];
        
        // 开始后台加载
        this.startBackgroundLoading = function() {
            console.log("BackgroundSDKLoader: 开始后台SDK加载");
            if (this.isLoaded || this.isLoading) {
                return this.loadPromise;
            }
            
            this.isLoading = true;
            this.loadPromise = this.attemptLoad();
            return this.loadPromise;
        };
        
        // 尝试加载SDK
        this.attemptLoad = function() {
            var self = this;
            this.loadAttempts++;
            
            console.log("BackgroundSDKLoader: 尝试加载SDK，第 " + this.loadAttempts + " 次");
            
            // 检查是否已加载
            if (window.h5sdk) {
                console.log("BackgroundSDKLoader: SDK已存在，标记为已加载");
                this.markAsLoaded();
                return Promise.resolve();
            }

            var loadPromise = new Promise(function(resolve, reject) {
                var script = document.createElement('script');
                script.src = H5_AD_CONFIG.sdkUrl + "?t=" + Date.now(); // 添加时间戳避免缓存
                script.async = true;
                script.defer = true; // 延迟执行，不阻塞页面解析
                
                script.onload = function() {
                    console.log("BackgroundSDKLoader: SDK脚本加载成功");
                    self.markAsLoaded();
                    resolve();
                };
                
                script.onerror = function() {
                    console.warn("BackgroundSDKLoader: SDK脚本加载失败");
                    reject(new Error("SDK script load failed"));
                };
                
                // 清理之前可能存在的失败脚本
                var existingScripts = document.head.querySelectorAll('script[src*="adsdk"]');
                existingScripts.forEach(function(existingScript) {
                    if (existingScript.src.includes('adsdk') && existingScript !== script) {
                        try {
                            document.head.removeChild(existingScript);
                        } catch (e) {
                            // 忽略清理错误
                        }
                    }
                });
                
                document.head.appendChild(script);
            });

            return withTimeout(loadPromise, H5_AD_CONFIG.timeouts.sdkLoad, "后台SDK加载")
                .then(function() {
                    console.log("BackgroundSDKLoader: SDK加载成功");
                    return Promise.resolve();
                })
                .catch(function(error) {
                    console.warn("BackgroundSDKLoader: SDK加载失败，准备重试:", error.message);
                    self.scheduleRetry();
                    throw error;
                });
        };
        
        // 安排重试
        this.scheduleRetry = function() {
            var self = this;
            if (self.isLoaded) {
                return; // 已加载成功，不需要重试
            }
            
            // 计算重试延迟：递增延迟，但有上限
            var delay = Math.min(
                H5_AD_CONFIG.retries.retryDelay * Math.pow(1.5, Math.min(self.loadAttempts - 1, 5)),
                H5_AD_CONFIG.retries.maxRetryDelay
            );
            
            console.log("BackgroundSDKLoader: 计划在 " + (delay / 1000) + " 秒后重试 (第 " + (self.loadAttempts + 1) + " 次)");
            
            self.retryTimer = setTimeout(function() {
                self.retryTimer = null;
                self.isLoading = false;
                self.loadPromise = self.attemptLoad();
            }, delay);
        };
        
        // 标记为已加载
        this.markAsLoaded = function() {
            this.isLoaded = true;
            this.isLoading = false;
            
            if (this.retryTimer) {
                clearTimeout(this.retryTimer);
                this.retryTimer = null;
            }
            
            console.log("BackgroundSDKLoader: SDK加载完成，执行回调");
            
            // 执行所有等待的回调
            var callbacks = this.callbacks.slice(); // 复制数组
            this.callbacks = [];
            
            callbacks.forEach(function(callback) {
                try {
                    setTimeout(callback, 0); // 异步执行回调
                } catch (error) {
                    console.warn("BackgroundSDKLoader: 回调执行错误:", error);
                }
            });
        };
        
        // 等待SDK加载完成
        this.waitForLoad = function(callback) {
            if (this.isLoaded) {
                setTimeout(callback, 0); // 异步执行
                return;
            }
            
            this.callbacks.push(callback);
            
            // 如果还没开始加载，开始加载
            if (!this.isLoading) {
                this.startBackgroundLoading();
            }
        };
        
        // 检查是否已加载
        this.isSDKReady = function() {
            return this.isLoaded && window.h5sdk;
        };
        
        // 清理资源
        this.destroy = function() {
            if (this.retryTimer) {
                clearTimeout(this.retryTimer);
                this.retryTimer = null;
            }
            this.callbacks = [];
        };
    };
    
    // 创建全局SDK加载器实例
    var backgroundLoader = new BackgroundSDKLoader();

    // ==================== H5 SDK适配器 ====================
    
    var H5SDKAdapter = function() {
        var self = this;
        this.isInitialized = false;
        this.isSDKLoaded = false;
        this.isFallbackMode = false; // 降级模式标记
        this.gameState = {
            isGamePlaying: false,
            isGamePaused: false,
            isGameLoading: false,
            hasGameStarted: false,
            gameLoadingStartTime: null
        };
        this.pendingCallbacks = [];
        this.playTimeInterval = null; // 用于30秒自动上报play_time事件
        this.initAttempts = 0; // 初始化尝试次数

        // 等待SDK加载（使用后台加载器）
        this.waitForSDK = function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                backgroundLoader.waitForLoad(function() {
                    if (backgroundLoader.isSDKReady()) {
                        self.isSDKLoaded = true;
                        resolve();
                    } else {
                        reject(new Error("SDK loaded but not available"));
                    }
                });
            });
        };

        // 初始化H5 SDK（异步，不阻塞游戏）
        this.init = function(config) {
            console.log("H5SDKAdapter.init called with config:", config);
            
            if (this.isInitialized) {
                console.log("H5 SDK already initialized");
                return Promise.resolve();
            }

            var self = this;
            this.initAttempts++;
            
            // 等待SDK加载完成后初始化
            var initPromise = this.waitForSDK().then(function() {
                return withTimeout(new Promise(function(resolve, reject) {
                    try {
                        if (!window.h5sdk || typeof window.h5sdk.init !== 'function') {
                            throw new Error("H5 SDK not available after loading");
                        }

                        // 构建H5 SDK选项
                        var options = {
                            ga: H5_AD_CONFIG.ga,
                            adsense: {
                                client: H5_AD_CONFIG.adsense.client,
                                "data-ad-frequency-hint": H5_AD_CONFIG.adsense["data-ad-frequency-hint"],
                                "data-adbreak-test": H5_AD_CONFIG.adsense["data-adbreak-test"],
                                "data-ad-channel": H5_AD_CONFIG.adsense["data-ad-channel"],
                                
                                // 热启动广告回调 - 在浏览器切换时（即锁屏/解锁）展示
                                pauseCallback: function() {
                                    console.log("H5SDK pauseCallback triggered - 热启动广告暂停");
                                    try {
                                        self.pauseGame();
                                    } catch (e) {
                                        console.warn("pauseGame error:", e);
                                    }
                                },
                                resumeCallback: function() {
                                    console.log("H5SDK resumeCallback triggered - 热启动广告恢复");
                                    try {
                                        self.resumeGame();
                                    } catch (e) {
                                        console.warn("resumeGame error:", e);
                                    }
                                },
                                
                                // 初始化成功回调
                                callback: function() {
                                    console.log("H5 SDK initialized successfully");
                                    self.isInitialized = true;
                                    
                                    // 异步执行后续操作，避免阻塞
                                    setTimeout(function() {
                                        try {
                                            self.postInitSetup();
                                        } catch (e) {
                                            console.warn("Post-init setup error:", e);
                                        }
                                    }, 100);
                                    
                                    resolve();
                                }
                            }
                        };

                        // 初始化H5 SDK
                        window.h5sdk.init(
                            H5_AD_CONFIG.appKey,
                            "", "", "", "", // top, left, bottom, right参数传空
                            options
                        );
                        
                    } catch (error) {
                        console.error("H5 SDK initialization error:", error);
                        reject(error);
                    }
                }), H5_AD_CONFIG.timeouts.sdkInit, "H5 SDK初始化");
            });

            // 错误处理：广告SDK失败不影响游戏运行
            return initPromise.catch(function(error) {
                console.warn("H5 SDK初始化失败 (第" + self.initAttempts + "次):", error.message);
                
                // 如果是首次失败，启用降级模式
                if (self.initAttempts === 1) {
                self.isFallbackMode = true;
                self.isInitialized = false; // 保持未初始化状态，使用降级模式
                
                // 启动基础游戏追踪（不依赖H5 SDK）
                setTimeout(function() {
                    try {
                        self.startBasicGameTracking();
                    } catch (e) {
                        console.warn("Basic game tracking error:", e);
                    }
                }, 500);
                }
                
                // 在后台继续尝试初始化（不阻塞游戏）
                setTimeout(function() {
                    if (!self.isInitialized && backgroundLoader.isSDKReady()) {
                        console.log("H5SDKAdapter: 后台重试初始化");
                        self.init(config).catch(function(retryError) {
                            console.warn("H5SDKAdapter: 后台重试初始化失败:", retryError.message);
                        });
                    }
                }, 10000); // 10秒后重试
                
                // 返回成功，但使用降级模式
                return Promise.resolve();
            });
        };

        // 初始化后设置（异步执行）
        this.postInitSetup = function() {
            // 延迟上报SDK相关事件，确保Athena完全初始化
            setTimeout(function() {
                if (window.h5sdk && window.h5sdk.athenaSend && typeof window.h5sdk.athenaSend === 'function') {
                    try {
                        window.h5sdk.athenaSend("load_adsbygoogle");
                        window.h5sdk.athenaSend("loaded_adsbygoogle");
                    } catch (e) {
                        console.warn("Athena SDK init events error:", e);
                    }
                }
            }, 500);
            
            // 发送游戏开始埋点并启动定时器
            this.startGameTracking();
            
            // 异步配置广告预加载
            setTimeout(function() {
                try {
                    self.configureAds();
                } catch (e) {
                    console.warn("Ad configuration error:", e);
                }
            }, 200);
        };

        // 启动游戏追踪
        this.startGameTracking = function() {
            if (!this.gameState.hasGameStarted) {
                this.gameState.hasGameStarted = true;
                
                // 延迟发送游戏开始埋点，确保Athena SDK已完全加载
                setTimeout(function() {
                    if (window.h5sdk && window.h5sdk.athenaSend && typeof window.h5sdk.athenaSend === 'function') {
                        try {
                            window.h5sdk.athenaSend("game_start", window.document.title || "poki_game");
                        } catch (e) {
                            console.warn("Athena game_start send error:", e);
                        }
                    }
                }, 1000);
                
                // 启动30秒定时器，自动上报play_time事件
                this.playTimeInterval = setInterval(function() {
                    if (window.h5sdk && window.h5sdk.athenaSend && typeof window.h5sdk.athenaSend === 'function') {
                        try {
                            window.h5sdk.athenaSend("play_time", "1");
                        } catch (e) {
                            console.warn("Athena play_time send error:", e);
                        }
                    }
                }, 30000); // 30秒
            }
        };

        // 基础游戏追踪（降级模式）
        this.startBasicGameTracking = function() {
            console.log("启动基础游戏追踪（降级模式）");
            this.gameState.hasGameStarted = true;
            
            // 使用基础的控制台日志记录
            console.log("Game started (fallback mode)");
            
            // 启动基础定时器
            this.playTimeInterval = setInterval(function() {
                console.log("Play time tick (fallback mode)");
            }, 30000);
        };

        // 配置广告预加载（带超时保护）
        this.configureAds = function() {
            console.log("H5SDKAdapter.configureAds called");
            
            if (this.isFallbackMode) {
                console.log("跳过广告配置（降级模式）");
                return;
            }
            
            if (!window.h5sdk || !window.h5sdk.adConfig) {
                console.warn("H5 SDK adConfig not available");
                return;
            }

            var configPromise = new Promise(function(resolve, reject) {
                try {
                    window.h5sdk.adConfig({
                        preloadAdBreaks: "on", // 开启广告预加载
                        sound: "on", // 游戏带声音
                        onReady: function() {
                            console.log("H5 SDK ads ready");
                            // 执行待处理的回调
                            if (self && typeof self.processPendingCallbacks === 'function') {
                                try {
                                    self.processPendingCallbacks();
                                } catch (e) {
                                    console.warn("processPendingCallbacks error:", e);
                                }
                            }
                            resolve();
                        },
                        onError: function(error) {
                            console.warn("H5 SDK ad error (non-critical):", error);
                            // 广告错误不影响游戏运行，但也要resolve
                            resolve();
                        }
                    });
                } catch (error) {
                    console.warn("H5 SDK adConfig setup error:", error);
                    resolve(); // 配置错误不阻塞游戏
                }
            });

            // 超时保护：如果广告配置超时，不影响游戏运行
            withTimeout(configPromise, H5_AD_CONFIG.timeouts.adConfig, "广告配置").catch(function(error) {
                console.warn("广告配置超时，继续游戏运行:", error.message);
            });
        };

        // 处理待处理的回调
        this.processPendingCallbacks = function() {
            console.log("H5SDKAdapter.processPendingCallbacks called, pending:", this.pendingCallbacks.length);
            
            while (this.pendingCallbacks.length > 0) {
                var callback = this.pendingCallbacks.shift();
                try {
                    callback();
                } catch (error) {
                    console.error("Pending callback error:", error);
                }
            }
        };

        // 显示开屏广告（带超时和降级）
        this.showPrerollAd = function() {
            console.log("H5SDKAdapter.showPrerollAd called");
            
            if (this.isFallbackMode) {
                console.log("开屏广告跳过（降级模式）");
                return Promise.resolve({ success: true, message: "Fallback mode" });
            }
            
            if (!this.isInitialized || !window.h5sdk || !window.h5sdk.adBreak) {
                console.warn("H5 SDK not ready for preroll ad");
                return Promise.resolve({ success: false, message: "SDK not ready" });
            }

            var self = this;
            var adPromise = new Promise(function(resolve) {
                try {
                    window.h5sdk.adBreak({
                        type: "preroll", // 游戏加载前广告
                        name: "poki_preroll",
                        beforeAd: function() {
                            console.log("H5SDK beforeAd - preroll");
                            try {
                                self.pauseGame();
                            } catch (e) {
                                console.warn("pauseGame error in preroll:", e);
                            }
                        },
                        afterAd: function() {
                            console.log("H5SDK afterAd - preroll");
                            try {
                                self.resumeGame();
                            } catch (e) {
                                console.warn("resumeGame error in preroll:", e);
                            }
                        },
                        adBreakDone: function(placementInfo) {
                            console.log("H5SDK adBreakDone - preroll:", placementInfo);
                            var success = placementInfo && (
                                placementInfo.breakStatus === "viewed" || 
                                placementInfo.breakStatus === "dismissed" ||
                                placementInfo.breakStatus === "noAdPreloaded"
                            );
                            resolve({ success: success, placementInfo: placementInfo });
                        }
                    });
                } catch (error) {
                    console.error("H5SDK preroll ad error:", error);
                    resolve({ success: false, message: error.message });
                }
            });

            // 广告显示超时保护
            return withTimeout(adPromise, H5_AD_CONFIG.timeouts.adShow, "开屏广告显示").catch(function(error) {
                console.warn("开屏广告超时，继续游戏:", error.message);
                try {
                    self.resumeGame(); // 确保游戏恢复
                } catch (e) {
                    console.warn("resumeGame error after timeout:", e);
                }
                return { success: false, message: "Ad timeout" };
            });
        };

        // 显示插屏广告（商业广告）
        this.showInterstitialAd = function() {
            console.log("H5SDKAdapter.showInterstitialAd called");
            
            if (this.isFallbackMode) {
                console.log("插屏广告跳过（降级模式）");
                return Promise.resolve({ success: true, message: "Fallback mode" });
            }
            
            if (!this.isInitialized || !window.h5sdk || !window.h5sdk.adBreak) {
                console.warn("H5 SDK not ready for interstitial ad");
                return Promise.resolve({ success: false, message: "SDK not ready" });
            }

            var self = this;
            var adPromise = new Promise(function(resolve) {
                try {
                    window.h5sdk.adBreak({
                        type: "pause", // 玩家暂停游戏时的广告
                        name: "poki_interstitial",
                        beforeAd: function() {
                            console.log("H5SDK beforeAd - interstitial");
                            try {
                                self.pauseGame();
                            } catch (e) {
                                console.warn("pauseGame error in interstitial:", e);
                            }
                        },
                        afterAd: function() {
                            console.log("H5SDK afterAd - interstitial");
                            try {
                                self.resumeGame();
                            } catch (e) {
                                console.warn("resumeGame error in interstitial:", e);
                            }
                        },
                        adBreakDone: function(placementInfo) {
                            console.log("H5SDK adBreakDone - interstitial:", placementInfo);
                            var success = placementInfo && (
                                placementInfo.breakStatus === "viewed" || 
                                placementInfo.breakStatus === "dismissed" ||
                                placementInfo.breakStatus === "noAdPreloaded"
                            );
                            resolve({ success: success, placementInfo: placementInfo });
                        }
                    });
                } catch (error) {
                    console.error("H5SDK interstitial ad error:", error);
                    resolve({ success: false, message: error.message });
                }
            });

            return withTimeout(adPromise, H5_AD_CONFIG.timeouts.adShow, "插屏广告显示").catch(function(error) {
                console.warn("插屏广告超时，继续游戏:", error.message);
                try {
                    self.resumeGame();
                } catch (e) {
                    console.warn("resumeGame error after timeout:", e);
                }
                return { success: false, message: "Ad timeout" };
            });
        };

        // 显示奖励视频广告
        this.showRewardedAd = function() {
            console.log("H5SDKAdapter.showRewardedAd called");
            
            if (this.isFallbackMode) {
                console.log("奖励广告跳过（降级模式），模拟奖励发放");
                return Promise.resolve({ success: true, rewarded: true, message: "Fallback mode reward" });
            }
            
            if (!this.isInitialized || !window.h5sdk || !window.h5sdk.adBreak) {
                console.warn("H5 SDK not ready for rewarded ad");
                return Promise.resolve({ success: false, rewarded: false, message: "SDK not ready" });
            }

            var self = this;
            var adPromise = new Promise(function(resolve) {
                try {
                    window.h5sdk.adBreak({
                        type: "reward", // 激励广告
                        name: "poki_reward",
                        beforeAd: function() {
                            console.log("H5SDK beforeAd - reward");
                            try {
                                self.pauseGame();
                            } catch (e) {
                                console.warn("pauseGame error in reward:", e);
                            }
                        },
                        afterAd: function() {
                            console.log("H5SDK afterAd - reward");
                            try {
                                self.resumeGame();
                            } catch (e) {
                                console.warn("resumeGame error in reward:", e);
                            }
                        },
                        beforeReward: function(showAdFn) {
                            console.log("H5SDK beforeReward - reward");
                            // 直接显示广告，不需要用户确认（根据文档要求）
                            try {
                                showAdFn();
                            } catch (e) {
                                console.warn("showAdFn error:", e);
                            }
                        },
                        adDismissed: function() {
                            console.log("H5SDK adDismissed - reward (无奖励)");
                        },
                        adViewed: function() {
                            console.log("H5SDK adViewed - reward (发放奖励)");
                        },
                        adBreakDone: function(placementInfo) {
                            console.log("H5SDK adBreakDone - reward:", placementInfo);
                            var success = placementInfo && placementInfo.breakStatus;
                            var rewarded = placementInfo && placementInfo.breakStatus === "viewed";
                            resolve({ 
                                success: success, 
                                rewarded: rewarded, 
                                placementInfo: placementInfo 
                            });
                        }
                    });
                } catch (error) {
                    console.error("H5SDK rewarded ad error:", error);
                    resolve({ success: false, rewarded: false, message: error.message });
                }
            });

            return withTimeout(adPromise, H5_AD_CONFIG.timeouts.adShow, "奖励广告显示").catch(function(error) {
                console.warn("奖励广告超时，不发放奖励:", error.message);
                try {
                    self.resumeGame();
                } catch (e) {
                    console.warn("resumeGame error after timeout:", e);
                }
                return { success: false, rewarded: false, message: "Ad timeout" };
            });
        };

        // 暂停游戏
        this.pauseGame = function() {
            console.log("H5SDKAdapter.pauseGame called");
            this.gameState.isGamePaused = true;
            
            // 尝试调用Construct 3的暂停函数
            if (window.c3_callFunction) {
                try {
                    window.c3_callFunction('PauseGame');
                } catch (error) {
                    console.warn("C3 PauseGame call failed:", error);
                }
            }
            
            // 发送自定义事件
            try {
                this.dispatchGameEvent('pause');
            } catch (error) {
                console.warn("dispatchGameEvent error:", error);
            }
        };

        // 恢复游戏
        this.resumeGame = function() {
            console.log("H5SDKAdapter.resumeGame called");
            this.gameState.isGamePaused = false;
            
            // 尝试调用Construct 3的恢复函数
            if (window.c3_callFunction) {
                try {
                    window.c3_callFunction('ResumeGame');
                } catch (error) {
                    console.warn("C3 ResumeGame call failed:", error);
                }
            }
            
            // 发送自定义事件
            try {
                this.dispatchGameEvent('resume');
            } catch (error) {
                console.warn("dispatchGameEvent error:", error);
            }
        };

        // 发送游戏事件
        this.dispatchGameEvent = function(eventType) {
            try {
                var event = new CustomEvent('gameStateChange', {
                    detail: { type: eventType, timestamp: Date.now() }
                });
                window.dispatchEvent(event);
            } catch (error) {
                console.warn("dispatchGameEvent failed:", error);
            }
        };

        // Athena游戏事件上报 - 按照H5自定义事件埋点规范
        this.reportGameState = function(eventName, param1, param2) {
            console.log("H5SDKAdapter.reportGameState:", eventName, param1, param2);
            
            if (this.isFallbackMode) {
                console.log("事件上报跳过（降级模式）:", eventName);
                return;
            }
            
            if (window.h5sdk && window.h5sdk.athenaSend && typeof window.h5sdk.athenaSend === 'function') {
                try {
                    window.h5sdk.athenaSend(eventName, param1 || "", param2 || "");
                } catch (error) {
                    console.warn("Athena report error for " + eventName + ":", error);
                }
            } else {
                console.log("Athena SDK not ready, event queued:", eventName);
            }
        };

        // 游戏生命周期方法
        this.onGameLoadingStart = function() {
            console.log("H5SDKAdapter.onGameLoadingStart called");
            this.gameState.isGameLoading = true;
            this.gameState.gameLoadingStartTime = Date.now();
            this.reportGameState("loading_begin");
        };

        this.onGameLoadingFinished = function() {
            console.log("H5SDKAdapter.onGameLoadingFinished called");
            this.gameState.isGameLoading = false;
            this.reportGameState("loading_end");
        };

        // 游戏加载完成上报 - 必须添加
        this.gameLoadingCompleted = function() {
            console.log("H5SDKAdapter.gameLoadingCompleted called");
            if (this.gameState.gameLoadingStartTime) {
                var loadTime = Date.now() - this.gameState.gameLoadingStartTime;
                console.log("Game loading time:", loadTime + "ms");
            }
            
            // 调用H5 SDK的gameLoadingCompleted方法
            if (!this.isFallbackMode && window.h5sdk && window.h5sdk.gameLoadingCompleted) {
                try {
                    window.h5sdk.gameLoadingCompleted();
                } catch (error) {
                    console.error("H5SDK gameLoadingCompleted error:", error);
                }
            }
            
            this.reportGameState("loading_end");
        };

        this.onGameplayStart = function() {
            console.log("H5SDKAdapter.onGameplayStart called");
            this.gameState.isGamePlaying = true;
            this.reportGameState("game_page"); // 游戏页面（展示游戏主页面）
        };

        this.onGameplayStop = function() {
            console.log("H5SDKAdapter.onGameplayStop called");
            this.gameState.isGamePlaying = false;
        };

        this.onHappyTime = function(intensity) {
            console.log("H5SDKAdapter.onHappyTime called with intensity:", intensity);
            // 可以用于上报积极事件，提升广告投放效果
            this.reportGameState("level_reward", "1"); // 表示有奖励机会
        };

        this.onLevelStart = function(level) {
            console.log("H5SDKAdapter.onLevelStart called with level:", level);
            this.reportGameState("level_begin", String(level || 1));
        };

        this.onLevelEnd = function(result) {
            console.log("H5SDKAdapter.onLevelEnd called with result:", result);
            this.reportGameState("level_end", result || "Pass");
        };

        // 横竖屏切换相关
        this.onScreenOrientationChange = function(orientation) {
            console.log("H5SDKAdapter.onScreenOrientationChange called with orientation:", orientation);
            this.reportGameState("turn_screen");
            if (orientation === "landscape") {
                this.reportGameState("horizontal");
            }
        };

        // 清理资源
        this.destroy = function() {
            console.log("H5SDKAdapter.destroy called");
            if (this.playTimeInterval) {
                clearInterval(this.playTimeInterval);
                this.playTimeInterval = null;
            }
        };
    };

    // ==================== SDK实例类 ====================
    
    var SDKInstance = function() {
        var self = this;
        
        // 队列系统
        this.queue = [];
        this.h5Adapter = new H5SDKAdapter();
        this.isInitialized = false;

        // 初始化方法
        this.init = function(config, options) {
            console.log("PokiSDK.init called with config:", config, "options:", options);
            config = config || {};
            options = options || {};
            
            var self = this;
            return new Promise(function(resolve, reject) {
                if (self.isInitialized) {
                    resolve();
                    return;
                }

                // 合并配置
                var mergedConfig = {};
                Object.assign(mergedConfig, config, options);

                // 初始化H5 SDK适配器
                if (self.h5Adapter && typeof self.h5Adapter.init === 'function') {
                    self.h5Adapter.init(mergedConfig).then(function() {
                        self.isInitialized = true;
                        console.log("PokiSDK.init completed successfully");
                        resolve();
                    }).catch(function(error) {
                        console.warn("PokiSDK.init failed, using fallback mode:", error);
                        // 不抛出错误，使用降级模式
                        self.isInitialized = true;
                        resolve();
                    });
                } else {
                    console.warn("H5Adapter not available, using fallback mode");
                    self.isInitialized = true;
                    resolve();
                }
            });
        };

        // 奖励视频广告
        this.rewardedBreak = function() {
            console.log("PokiSDK.rewardedBreak called");
            
            return new Promise(function(resolve) {
                if (!self.h5Adapter || typeof self.h5Adapter.showRewardedAd !== 'function') {
                    console.warn("H5Adapter not ready, using fallback");
                    resolve(false);
                    return;
                }
                
                self.h5Adapter.showRewardedAd().then(function(result) {
                    console.log("PokiSDK.rewardedBreak result:", result);
                    resolve(result.rewarded || false);
                }).catch(function(error) {
                    console.error("PokiSDK.rewardedBreak error:", error);
                    resolve(false);
                });
            });
        };

        // 商业广告中断
        this.commercialBreak = function(options) {
            console.log("PokiSDK.commercialBreak called with options:", options);
            
            return new Promise(function(resolve) {
                if (!self.h5Adapter || typeof self.h5Adapter.showInterstitialAd !== 'function') {
                    console.warn("H5Adapter not ready, using fallback");
                    resolve();
                    return;
                }
                
                self.h5Adapter.showInterstitialAd().then(function(result) {
                    console.log("PokiSDK.commercialBreak result:", result);
                    resolve();
                }).catch(function(error) {
                    console.error("PokiSDK.commercialBreak error:", error);
                    resolve();
                });
            });
        };

        // 显示广告
        this.displayAd = function(container, size, onComplete, onError) {
            console.log("🚀 PokiSDK.displayAd called with container:", container, "size:", size);
            console.log("ℹ️ PokiSDK.displayAd: 注意 - Banner广告使用Google AdSense，与H5 SDK初始化状态无关");
            console.log("PokiSDK.displayAd: 调用时间:", new Date().toISOString());
            console.log("PokiSDK.displayAd: SDK初始化状态:", {
                isSDKInitialized: self.isInitialized,
                isSDKInFallbackMode: self.h5Adapter ? self.h5Adapter.isFallbackMode : 'unknown',
                note: 'Banner广告不依赖SDK状态'
            });
            console.log("PokiSDK.displayAd: 页面环境检查:", {
                url: window.location.href,
                protocol: window.location.protocol,
                hostname: window.location.hostname,
                isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
                isHTTPS: window.location.protocol === 'https:',
                userAgent: navigator.userAgent,
                cookieEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack,
                language: navigator.language,
                platform: navigator.platform,
                onLine: navigator.onLine
            });
            
            // 检查广告拦截器
            var adBlockDetected = false;
            try {
                var testElement = document.createElement('div');
                testElement.innerHTML = '&nbsp;';
                testElement.className = 'adsbox';
                testElement.style.position = 'absolute';
                testElement.style.left = '-9999px';
                document.body.appendChild(testElement);
                adBlockDetected = testElement.offsetHeight === 0;
                document.body.removeChild(testElement);
            } catch (e) {
                console.warn("PokiSDK.displayAd: 广告拦截检测失败:", e);
            }
            
            console.log("PokiSDK.displayAd: 广告拦截器检测:", adBlockDetected ? "❌ 检测到广告拦截器" : "✅ 未检测到广告拦截器");
            
            // 参数验证
            if (!container) {
                console.error("❌ PokiSDK.displayAd: 容器参数不能为空");
                if (onError) onError("容器参数不能为空");
                return;
            }
            
            var originalContainer = container;
            if (typeof container === 'string') {
                console.log("PokiSDK.displayAd: 容器是字符串ID:", container);
                container = document.getElementById(container);
                if (!container) {
                    console.error("❌ PokiSDK.displayAd: 找不到指定的容器元素ID:", originalContainer);
                    console.log("PokiSDK.displayAd: 页面中所有带ID的元素:", 
                        Array.from(document.querySelectorAll('[id]')).map(el => ({
                            id: el.id,
                            tagName: el.tagName,
                            className: el.className
                        })));
                    if (onError) onError("找不到指定的容器元素: " + originalContainer);
                    return;
                }
                console.log("✅ PokiSDK.displayAd: 成功找到容器元素");
            }
            
            console.log("PokiSDK.displayAd: 开始创建真实的Google AdSense广告");
            console.log("PokiSDK.displayAd: 详细容器信息:", {
                tagName: container.tagName,
                id: container.id,
                className: container.className,
                offsetWidth: container.offsetWidth,
                offsetHeight: container.offsetHeight,
                clientWidth: container.clientWidth,
                clientHeight: container.clientHeight,
                scrollWidth: container.scrollWidth,
                scrollHeight: container.scrollHeight,
                innerHTML: container.innerHTML.length > 100 ? container.innerHTML.substring(0, 100) + '...' : container.innerHTML,
                parentElement: container.parentElement ? {
                    tagName: container.parentElement.tagName,
                    id: container.parentElement.id,
                    className: container.parentElement.className,
                    offsetWidth: container.parentElement.offsetWidth,
                    offsetHeight: container.parentElement.offsetHeight
                } : 'no parent',
                                    style: {
                        display: container.style.display,
                        position: container.style.position,
                        width: container.style.width,
                        height: container.style.height,
                        visibility: container.style.visibility,
                        overflow: container.style.overflow
                    },
                computedStyle: window.getComputedStyle ? {
                    display: window.getComputedStyle(container).display,
                    position: window.getComputedStyle(container).position,
                    width: window.getComputedStyle(container).width,
                                            height: window.getComputedStyle(container).height,
                    visibility: window.getComputedStyle(container).visibility
                } : 'getComputedStyle not available',
                isConnected: container.isConnected,
                offsetParent: container.offsetParent ? container.offsetParent.tagName : 'none',
                boundingRect: container.getBoundingClientRect()
            });
            
            // 检查容器是否在视口内
            var rect = container.getBoundingClientRect();
            var isInViewport = rect.top >= 0 && rect.left >= 0 && 
                              rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
            var isPartiallyVisible = rect.bottom > 0 && rect.right > 0 && 
                                   rect.top < window.innerHeight && rect.left < window.innerWidth;
            
            console.log("PokiSDK.displayAd: 容器可见性:", {
                isInViewport: isInViewport,
                isPartiallyVisible: isPartiallyVisible,
                rect: rect,
                viewport: { width: window.innerWidth, height: window.innerHeight }
            });
            
            // 创建真实的Google AdSense广告
            try {
                console.log("PokiSDK.displayAd: 调用createGoogleAdSenseBanner方法");
                self.createGoogleAdSenseBanner(container, size, onComplete, onError);
            } catch (error) {
                console.error("❌ PokiSDK.displayAd: 创建广告时发生异常:", error);
                console.error("PokiSDK.displayAd: 异常详情:", {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    container: container,
                    size: size
                });
                if (onError) onError(error.message);
            }
        };
        
        // 创建Google AdSense Banner广告
        this.createGoogleAdSenseBanner = function(container, size, onComplete, onError) {
            console.log("PokiSDK.createGoogleAdSenseBanner: 开始创建广告, size:", size);
            
            // 广告配置
            var adConfig = this.getAdConfigBySize(size);
            if (!adConfig) {
                console.error("PokiSDK.createGoogleAdSenseBanner: 不支持的广告尺寸:", size);
                if (onError) onError("不支持的广告尺寸: " + size);
                return;
            }
            
            console.log("PokiSDK.createGoogleAdSenseBanner: 使用广告配置:", adConfig);
            
            // 检查容器要求
            var validationResult = this.validateAdContainer(container, adConfig);
            if (!validationResult.valid) {
                console.warn("PokiSDK.createGoogleAdSenseBanner: 容器验证警告:", validationResult.message);
                // 尝试自动修复容器
                this.fixAdContainer(container, adConfig);
            }
            
            // 确保Google AdSense脚本已加载
            this.ensureAdSenseScript().then(function() {
                console.log("PokiSDK.createGoogleAdSenseBanner: AdSense脚本已就绪");
                console.log("PokiSDK.createGoogleAdSenseBanner: window.adsbygoogle状态:", {
                    exists: !!window.adsbygoogle,
                    isArray: Array.isArray(window.adsbygoogle),
                    length: window.adsbygoogle ? window.adsbygoogle.length : 'N/A'
                });
                
                // 清空容器并记录状态
                console.log("PokiSDK.createGoogleAdSenseBanner: 清空容器前 - innerHTML:", container.innerHTML);
                container.innerHTML = '';
                console.log("PokiSDK.createGoogleAdSenseBanner: 清空容器后 - innerHTML:", container.innerHTML);
                
                // 记录容器的详细信息
                console.log("PokiSDK.createGoogleAdSenseBanner: 容器详细信息:", {
                    tagName: container.tagName,
                    id: container.id,
                    className: container.className,
                    offsetWidth: container.offsetWidth,
                    offsetHeight: container.offsetHeight,
                    clientWidth: container.clientWidth,
                    clientHeight: container.clientHeight,
                    scrollWidth: container.scrollWidth,
                    scrollHeight: container.scrollHeight,
                    style: {
                        width: container.style.width,
                        height: container.style.height,
                        display: container.style.display,
                        position: container.style.position
                    },
                    computedStyle: window.getComputedStyle ? {
                        width: window.getComputedStyle(container).width,
                        height: window.getComputedStyle(container).height,
                        display: window.getComputedStyle(container).display,
                        position: window.getComputedStyle(container).position
                    } : 'getComputedStyle not available'
                });
                
                // 创建ins标签
                console.log("PokiSDK.createGoogleAdSenseBanner: 开始创建ins元素");
                var insElement = document.createElement('ins');
                insElement.className = 'adsbygoogle';
                
                // 强制使用固定高度50px
                var actualHeight = 50; // 强制固定高度
                console.log("PokiSDK.createGoogleAdSenseBanner: 强制使用固定高度: 50px");
                
                // 使用头部配置的ins样式
                var insStyles = H5_AD_CONFIG.banner.styles.ins;
                var insStyleArray = [];
                
                // 从配置对象生成CSS样式字符串
                for (var key in insStyles) {
                    if (insStyles.hasOwnProperty(key)) {
                        var cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                        insStyleArray.push(cssKey + ': ' + insStyles[key]);
                    }
                }
                
                // 添加尺寸相关样式 - 强制固定高度50px
                insStyleArray.push('width: ' + adConfig.width + 'px !important');
                insStyleArray.push('height: 50px !important');
                insStyleArray.push('min-height: 50px !important');
                insStyleArray.push('max-height: 50px !important');
                
                insElement.style.cssText = insStyleArray.join(';');
                // 使用头部配置设置广告属性
                var bannerConfig = H5_AD_CONFIG.banner;
                insElement.setAttribute('data-ad-client', bannerConfig.client);
                insElement.setAttribute('data-ad-slot', bannerConfig.slot);
                
                // 添加额外属性
                if (bannerConfig.format) {
                    insElement.setAttribute('data-ad-format', bannerConfig.format);
                    console.log("PokiSDK.createGoogleAdSenseBanner: 设置data-ad-format:", bannerConfig.format);
                }
                if (bannerConfig.responsive) {
                    insElement.setAttribute('data-full-width-responsive', 'true');
                    console.log("PokiSDK.createGoogleAdSenseBanner: 设置data-full-width-responsive: true");
                }
                
                // 添加调试用的data-debug属性
                insElement.setAttribute('data-debug-timestamp', Date.now());
                insElement.setAttribute('data-debug-size', adConfig.width + 'x' + adConfig.height);
                
                console.log("PokiSDK.createGoogleAdSenseBanner: ins元素创建完成:", {
                    width: adConfig.width,
                    height: adConfig.height,
                    client: adConfig.client,
                    slot: adConfig.slot,
                    className: insElement.className,
                    attributes: {
                        'data-ad-client': insElement.getAttribute('data-ad-client'),
                        'data-ad-slot': insElement.getAttribute('data-ad-slot'),
                        'data-ad-format': insElement.getAttribute('data-ad-format'),
                        'data-full-width-responsive': insElement.getAttribute('data-full-width-responsive')
                    },
                    style: {
                        display: insElement.style.display,
                        width: insElement.style.width,
                        height: insElement.style.height
                    }
                });
                
                // 将ins标签添加到容器
                console.log("PokiSDK.createGoogleAdSenseBanner: 添加ins元素到容器");
                container.appendChild(insElement);
                
                // 再次强制确保ins元素高度正确
            setTimeout(function() {
                    console.log("🔧 PokiSDK: 强制确保ins元素高度正确");
                    
                    // 强制固定高度50px
                    insElement.style.height = '50px';
                    insElement.style.minHeight = '50px';
                    insElement.style.maxHeight = '50px';
                    
                    console.log("🔍 PokiSDK: ins元素强制设置后状态:", {
                        fixedHeight: '50px',
                        offsetHeight: insElement.offsetHeight,
                        clientHeight: insElement.clientHeight,
                        styleHeight: insElement.style.height,
                        computedHeight: window.getComputedStyle(insElement).height
                    });
                }, 20); // 20ms后执行
                
                // 验证添加后的状态
                console.log("PokiSDK.createGoogleAdSenseBanner: 添加后验证:", {
                    containerChildren: container.children.length,
                    containerInnerHTML: container.innerHTML,
                    insElementParent: insElement.parentElement ? insElement.parentElement.tagName : 'none',
                    insElementInDOM: document.contains(insElement),
                    insElementOffsetParent: insElement.offsetParent ? insElement.offsetParent.tagName : 'none',
                    insElementBoundingRect: insElement.getBoundingClientRect()
                });
                
                // 初始化AdSense广告
                try {
                    console.log("PokiSDK.createGoogleAdSenseBanner: 准备推送到adsbygoogle队列");
                    console.log("PokiSDK.createGoogleAdSenseBanner: adsbygoogle队列当前长度:", window.adsbygoogle.length);
                    
                    // 记录推送前的状态
                    var beforePushLength = window.adsbygoogle.length;
                    var pushStartTime = Date.now();
                    
                    console.log("PokiSDK.createGoogleAdSenseBanner: 执行 adsbygoogle.push({})");
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                    
                    var afterPushLength = window.adsbygoogle.length;
                    var pushEndTime = Date.now();
                    
                    console.log("PokiSDK.createGoogleAdSenseBanner: adsbygoogle.push({}) 完成:", {
                        pushDuration: pushEndTime - pushStartTime + 'ms',
                        beforeLength: beforePushLength,
                        afterLength: afterPushLength,
                        lengthChanged: afterPushLength !== beforePushLength
                    });
                    
                    // 检查ins元素的初始状态并再次确保高度
                    setTimeout(function() {
                        console.log("PokiSDK.createGoogleAdSenseBanner: push后100ms状态检查:", {
                            innerHTML: insElement.innerHTML,
                            innerText: insElement.innerText,
                            children: insElement.children.length,
                            offsetWidth: insElement.offsetWidth,
                            offsetHeight: insElement.offsetHeight,
                            clientWidth: insElement.clientWidth,
                            clientHeight: insElement.clientHeight,
                            dataStatus: insElement.getAttribute('data-adsbygoogle-status'),
                            dataAdStatus: insElement.getAttribute('data-ad-status')
                        });
                        
                        // 最终确保高度设置（AdSense可能会修改样式） - 强制固定50px
                        console.log("🔧 PokiSDK: AdSense执行后最终确保高度: 50px (固定值)");
                        
                        // 同时确保容器和ins元素的高度 - 强制50px
                        if (container && container.style) {
                            container.style.height = '50px';
                            container.style.minHeight = '50px';
                            container.style.maxHeight = '50px';
                        }
                        
                        if (insElement && insElement.style) {
                            insElement.style.height = '50px';
                            insElement.style.minHeight = '50px';
                            insElement.style.maxHeight = '50px';
                        }
                    }, 100);
                    
                    // 监听广告加载状态
                    self.monitorAdLoading(insElement, onComplete, onError);
                    
                } catch (error) {
                    console.error("PokiSDK.createGoogleAdSenseBanner: AdSense初始化异常:", error);
                    console.error("PokiSDK.createGoogleAdSenseBanner: 异常详情:", {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    });
                    if (onError) onError("AdSense初始化失败: " + error.message);
                }
                
            }).catch(function(error) {
                console.error("PokiSDK.createGoogleAdSenseBanner: AdSense脚本加载失败:", error);
                console.error("PokiSDK.createGoogleAdSenseBanner: 脚本加载失败详情:", {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                if (onError) onError("AdSense脚本加载失败: " + error.message);
            });
        };
        
                // 根据尺寸获取广告配置（使用头部配置）
        this.getAdConfigBySize = function(size) {
            // 解析尺寸字符串
            var dimensions = size.split('x');
            var width = parseInt(dimensions[0]);
            var height = parseInt(dimensions[1]);
            
            // 使用头部配置生成广告配置
            var bannerConfig = H5_AD_CONFIG.banner;
            var config = {
                width: width,
                height: height,
                client: bannerConfig.client,
                slot: bannerConfig.slot,
                format: bannerConfig.format,
                responsive: bannerConfig.responsive
            };
            
            console.log("PokiSDK.getAdConfigBySize: 使用头部配置生成广告配置 for size", size, ":", config);
            return config;
        };
        
        // 验证广告容器
        this.validateAdContainer = function(container, adConfig) {
            console.log("PokiSDK.validateAdContainer: 开始验证容器");
            
            var result = { valid: true, messages: [] };
            
            // 检查容器尺寸
            var containerWidth = container.offsetWidth;
            var containerHeight = container.offsetHeight;
            
            console.log("PokiSDK.validateAdContainer: 容器当前尺寸:", {
                width: containerWidth,
                height: containerHeight,
                required: { width: adConfig.width, height: adConfig.height }
            });
            
            if (containerWidth < adConfig.width) {
                result.valid = false;
                result.messages.push("容器宽度不足: " + containerWidth + " < " + adConfig.width);
            }
            
            if (containerHeight < adConfig.height) {
                result.valid = false;
                result.messages.push("容器高度不足: " + containerHeight + " < " + adConfig.height);
            }
            
            // 检查容器父级
            var parent = container.parentElement;
            if (parent) {
                var parentWidth = parent.offsetWidth;
                console.log("PokiSDK.validateAdContainer: 父容器宽度:", parentWidth, "屏幕宽度:", window.innerWidth);
                
                // 对于横幅广告，检查是否满足底部横幅的要求
                if (adConfig.height <= 100) { // 高度小于等于100px的视为横幅广告
                    if (Math.abs(parentWidth - window.innerWidth) > 10) {
                        result.messages.push("建议父容器宽度为100%屏幕宽度 (当前: " + parentWidth + "px, 屏幕: " + window.innerWidth + "px)");
                    }
                    
                    // 检查是否位于底部
                    var rect = container.getBoundingClientRect();
                    var isAtBottom = (window.innerHeight - rect.bottom) < 100;
                    if (!isAtBottom) {
                        result.messages.push("建议将横幅广告放置在屏幕底部");
                    }
                }
            }
            
            result.message = result.messages.join("; ");
            console.log("PokiSDK.validateAdContainer: 验证结果:", result);
            
            return result;
        };
        
        // 自动修复广告容器
        this.fixAdContainer = function(container, adConfig) {
            console.log("PokiSDK.fixAdContainer: 尝试自动修复容器");
            
            // 确保容器有足够的尺寸
            if (container.offsetWidth < adConfig.width) {
                container.style.width = adConfig.width + 'px';
                console.log("PokiSDK.fixAdContainer: 设置容器宽度为", adConfig.width + 'px');
            }
            
            if (container.offsetHeight < adConfig.height) {
                container.style.height = adConfig.height + 'px';
                console.log("PokiSDK.fixAdContainer: 设置容器高度为", adConfig.height + 'px');
            }
            
            // 对于横幅广告的特殊处理
            if (adConfig.height <= 100) { // 高度小于等于100px的视为横幅广告
                console.log("PokiSDK.fixAdContainer: 应用横幅广告的特殊样式");
                
                // 设置父容器样式（如果需要）
                var parent = container.parentElement;
                if (parent) {
                    parent.style.width = '100%';
                    parent.style.position = 'fixed';
                    parent.style.bottom = '0';
                    parent.style.left = '0';
                    parent.style.zIndex = '9999';
                    console.log("PokiSDK.fixAdContainer: 设置父容器为底部固定位置");
                }
                
                // 设置容器居中
                container.style.margin = '0 auto';
                container.style.display = 'block';
            }
        };
        
        // 确保Google AdSense脚本已加载
        this.ensureAdSenseScript = function() {
            console.log("PokiSDK.ensureAdSenseScript: 开始检查AdSense脚本");
            console.log("PokiSDK.ensureAdSenseScript: 当前页面状态:", {
                url: window.location.href,
                domain: window.location.hostname,
                protocol: window.location.protocol,
                userAgent: navigator.userAgent,
                cookieEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack
            });
            
            return new Promise(function(resolve, reject) {
                // 检查是否已经加载
                console.log("PokiSDK.ensureAdSenseScript: 检查window.adsbygoogle状态:", {
                    exists: !!window.adsbygoogle,
                    type: typeof window.adsbygoogle,
                    isArray: Array.isArray(window.adsbygoogle),
                    length: window.adsbygoogle ? window.adsbygoogle.length : 'N/A',
                    toString: window.adsbygoogle ? window.adsbygoogle.toString() : 'N/A'
                });
                
                if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
                    console.log("PokiSDK.ensureAdSenseScript: ✅ AdSense脚本已存在且可用");
                    resolve();
                    return;
                }
                
                // 检查所有现有的脚本标签
                var allScripts = document.querySelectorAll('script');
                console.log("PokiSDK.ensureAdSenseScript: 页面中共有", allScripts.length, "个script标签");
                
                var adSenseScripts = [];
                for (var i = 0; i < allScripts.length; i++) {
                    var script = allScripts[i];
                    if (script.src && script.src.includes('googlesyndication')) {
                        adSenseScripts.push({
                            src: script.src,
                            async: script.async,
                            crossOrigin: script.crossOrigin,
                            readyState: script.readyState,
                            loaded: script.loaded
                        });
                    }
                }
                
                console.log("PokiSDK.ensureAdSenseScript: 找到", adSenseScripts.length, "个AdSense相关脚本:", adSenseScripts);
                
                // 检查脚本标签是否存在
                var existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
                if (existingScript) {
                    console.log("PokiSDK.ensureAdSenseScript: AdSense脚本标签已存在，等待加载完成");
                    console.log("PokiSDK.ensureAdSenseScript: 现有脚本详情:", {
                        src: existingScript.src,
                        async: existingScript.async,
                        crossOrigin: existingScript.crossOrigin,
                        readyState: existingScript.readyState,
                        loaded: existingScript.loaded
                    });
                    
                    var checkAttempts = 0;
                    var maxCheckAttempts = 100; // 10秒
                    
                    // 等待脚本加载完成
                    var checkInterval = setInterval(function() {
                        checkAttempts++;
                        
                        var currentState = {
                            exists: !!window.adsbygoogle,
                            isArray: Array.isArray(window.adsbygoogle),
                            length: window.adsbygoogle ? window.adsbygoogle.length : 'N/A'
                        };
                        
                        if (checkAttempts % 10 === 0) {
                            console.log("PokiSDK.ensureAdSenseScript: 等待中... 第", checkAttempts, "次检查, 状态:", currentState);
                        }
                        
                        if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
                            clearInterval(checkInterval);
                            console.log("PokiSDK.ensureAdSenseScript: ✅ AdSense脚本加载完成，总共等待", checkAttempts, "次检查");
                            resolve();
                        } else if (checkAttempts >= maxCheckAttempts) {
                            clearInterval(checkInterval);
                            console.warn("PokiSDK.ensureAdSenseScript: ⚠️ AdSense脚本加载超时，但继续执行");
                            console.warn("PokiSDK.ensureAdSenseScript: 超时时的状态:", currentState);
                            // 即使超时也继续，可能脚本已经部分加载
                            window.adsbygoogle = window.adsbygoogle || [];
                            resolve();
                        }
                    }, 100);
                    
                    return;
                }
                
                console.log("PokiSDK.ensureAdSenseScript: 🚀 开始动态加载AdSense脚本");
                
                // 动态创建脚本标签
                var script = document.createElement('script');
                script.async = true;
                script.crossOrigin = 'anonymous';
                script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2270136017335510';
                
                console.log("PokiSDK.ensureAdSenseScript: 创建脚本标签:", {
                    src: script.src,
                    async: script.async,
                    crossOrigin: script.crossOrigin
                });
                
                var loadStartTime = Date.now();
                
                script.onload = function() {
                    var loadDuration = Date.now() - loadStartTime;
                    console.log("PokiSDK.ensureAdSenseScript: ✅ AdSense脚本动态加载成功，耗时:", loadDuration + "ms");
                    console.log("PokiSDK.ensureAdSenseScript: 加载后的window.adsbygoogle状态:", {
                        exists: !!window.adsbygoogle,
                        type: typeof window.adsbygoogle,
                        isArray: Array.isArray(window.adsbygoogle),
                        length: window.adsbygoogle ? window.adsbygoogle.length : 'N/A'
                    });
                    
                    // 初始化adsbygoogle数组
                    window.adsbygoogle = window.adsbygoogle || [];
                    console.log("PokiSDK.ensureAdSenseScript: 确保adsbygoogle数组已初始化");
                    resolve();
                };
                
                script.onerror = function(event) {
                    var loadDuration = Date.now() - loadStartTime;
                    console.error("PokiSDK.ensureAdSenseScript: ❌ AdSense脚本动态加载失败，耗时:", loadDuration + "ms");
                    console.error("PokiSDK.ensureAdSenseScript: 错误事件:", event);
                    console.error("PokiSDK.ensureAdSenseScript: 网络状态:", {
                        online: navigator.onLine,
                        connection: navigator.connection ? {
                            effectiveType: navigator.connection.effectiveType,
                            downlink: navigator.connection.downlink,
                            rtt: navigator.connection.rtt
                        } : 'not available'
                    });
                    reject(new Error("AdSense脚本加载失败"));
                };
                
                console.log("PokiSDK.ensureAdSenseScript: 将脚本添加到页面head");
                document.head.appendChild(script);
                
                // 额外的超时保护
                setTimeout(function() {
                    if (!window.adsbygoogle || !Array.isArray(window.adsbygoogle)) {
                        console.warn("PokiSDK.ensureAdSenseScript: ⚠️ 脚本加载总体超时，强制初始化adsbygoogle");
                        window.adsbygoogle = window.adsbygoogle || [];
                        resolve();
                    }
                }, 15000); // 15秒总超时
            });
        };
        
        // 监听广告加载状态
        this.monitorAdLoading = function(insElement, onComplete, onError) {
            console.log("PokiSDK.monitorAdLoading: 开始监听广告加载状态");
            console.log("PokiSDK.monitorAdLoading: 初始ins元素状态:", {
                tagName: insElement.tagName,
                className: insElement.className,
                innerHTML: insElement.innerHTML,
                innerText: insElement.innerText,
                                        children: insElement.children.length,
                        offsetWidth: insElement.offsetWidth,
                        offsetHeight: insElement.offsetHeight,
                        clientWidth: insElement.clientWidth,
                        clientHeight: insElement.clientHeight,
                scrollWidth: insElement.scrollWidth,
                scrollHeight: insElement.scrollHeight,
                parentElement: insElement.parentElement ? insElement.parentElement.tagName : 'none',
                isConnected: insElement.isConnected,
                attributes: {
                    'data-ad-client': insElement.getAttribute('data-ad-client'),
                    'data-ad-slot': insElement.getAttribute('data-ad-slot'),
                    'data-ad-format': insElement.getAttribute('data-ad-format'),
                    'data-adsbygoogle-status': insElement.getAttribute('data-adsbygoogle-status'),
                    'data-ad-status': insElement.getAttribute('data-ad-status')
                }
            });
            
            var checkAttempts = 0;
            var maxAttempts = 50; // 5秒内检查，增加检查时间
            var lastState = null;
            
            var checkInterval = setInterval(function() {
                checkAttempts++;
                
                // 详细检查ins元素的状态
                                var currentState = {
                    innerHTML: insElement.innerHTML,
                    innerText: insElement.innerText,
                    children: insElement.children.length,
                    offsetWidth: insElement.offsetWidth,
                    offsetHeight: insElement.offsetHeight,
                    clientWidth: insElement.clientWidth,
                    clientHeight: insElement.clientHeight,
                    scrollWidth: insElement.scrollWidth,
                    scrollHeight: insElement.scrollHeight,
                    dataStatus: insElement.getAttribute('data-adsbygoogle-status'),
                    dataAdStatus: insElement.getAttribute('data-ad-status'),
                    style: {
                        width: insElement.style.width,
                        height: insElement.style.height,
                        display: insElement.style.display
                    },
                    computedStyle: window.getComputedStyle ? {
                        width: window.getComputedStyle(insElement).width,
                        height: window.getComputedStyle(insElement).height,
                        display: window.getComputedStyle(insElement).display
                    } : null
                };
                
                // 检查ins元素是否有内容
                var hasContent = currentState.innerHTML.trim().length > 0 || 
                                currentState.children > 0 ||
                                currentState.offsetHeight > 10; // 至少10px高度
                
                // 检查是否有明显的状态变化
                var stateChanged = !lastState || 
                    lastState.innerHTML !== currentState.innerHTML ||
                    lastState.offsetHeight !== currentState.offsetHeight ||
                    lastState.dataStatus !== currentState.dataStatus;
                
                if (stateChanged || checkAttempts <= 3 || checkAttempts % 5 === 0) {
                    console.log("PokiSDK.monitorAdLoading: 检查第", checkAttempts, "次, hasContent:", hasContent, 
                               "stateChanged:", stateChanged, "currentState:", currentState);
                }
                
                lastState = currentState;
                
                if (hasContent) {
                    clearInterval(checkInterval);
                    console.log("PokiSDK.monitorAdLoading: ✅ 广告加载成功!");
                    console.log("PokiSDK.monitorAdLoading: 最终成功状态:", currentState);
                    if (onComplete) onComplete();
                    return;
                }
                
                // 检查是否有AdSense错误状态
                if (currentState.dataStatus && currentState.dataStatus !== 'filled') {
                    console.warn("PokiSDK.monitorAdLoading: AdSense状态异常:", currentState.dataStatus);
                }
                
                if (checkAttempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.error("PokiSDK.monitorAdLoading: ❌ 广告加载超时");
                    console.error("PokiSDK.monitorAdLoading: 超时时的最终状态:", currentState);
                    
                    // 详细的错误信息
                    var errorInfo = "广告加载超时 (检查了" + checkAttempts + "次)";
                    if (currentState.dataStatus) {
                        errorInfo += " - AdSense状态: " + currentState.dataStatus;
                    }
                    if (currentState.innerHTML.trim()) {
                        errorInfo += " - 有HTML内容但未正确显示";
                    }
                    if (currentState.offsetHeight === 0) {
                        errorInfo += " - 元素高度为0";
                    }
                    
                    // 检查是否有常见的AdSense错误
                    if (currentState.innerHTML.includes('adsbygoogle-noclick')) {
                        errorInfo += " - 可能是测试环境或广告被阻止";
                    }
                    
                    console.error("PokiSDK.monitorAdLoading: 错误详情:", errorInfo);
                    
                    if (onError) onError(errorInfo);
                }
            }, 100);
            
            // 额外的检查：监听可能的AdSense错误事件
            var errorHandler = function(event) {
                if (event.target === insElement) {
                    console.error("PokiSDK.monitorAdLoading: ins元素触发错误事件:", event);
                }
            };
            
            insElement.addEventListener('error', errorHandler);
            
            // 清理函数
            setTimeout(function() {
                insElement.removeEventListener('error', errorHandler);
            }, 6000);
        };

        // 游戏状态方法
        this.gameplayStart = function() {
            console.log("PokiSDK.gameplayStart called");
            if (self.h5Adapter && typeof self.h5Adapter.onGameplayStart === 'function') {
                self.h5Adapter.onGameplayStart();
            }
        };

        this.gameplayStop = function() {
            console.log("PokiSDK.gameplayStop called");
            if (self.h5Adapter && typeof self.h5Adapter.onGameplayStop === 'function') {
                self.h5Adapter.onGameplayStop();
            }
        };

        this.gameLoadingStart = function() {
            console.log("PokiSDK.gameLoadingStart called");
            if (self.h5Adapter && typeof self.h5Adapter.onGameLoadingStart === 'function') {
                self.h5Adapter.onGameLoadingStart();
            }
        };

        this.gameLoadingFinished = function() {
            console.log("PokiSDK.gameLoadingFinished called");
            if (self.h5Adapter && typeof self.h5Adapter.onGameLoadingFinished === 'function') {
                self.h5Adapter.onGameLoadingFinished();
            }
        };

        // 游戏加载完成上报 - 必须添加的方法
        this.gameLoadingCompleted = function() {
            console.log("PokiSDK.gameLoadingCompleted called");
            if (self.h5Adapter && typeof self.h5Adapter.gameLoadingCompleted === 'function') {
                self.h5Adapter.gameLoadingCompleted();
            }
        };

        // 快乐时刻
        this.happyTime = function(intensity) {
            console.log("PokiSDK.happyTime called with intensity:", intensity);
            if (self.h5Adapter && typeof self.h5Adapter.onHappyTime === 'function') {
                self.h5Adapter.onHappyTime(intensity);
            }
        };

        // 关卡相关方法
        this.roundStart = function(level) {
            console.log("PokiSDK.roundStart called with level:", level);
            if (self.h5Adapter && typeof self.h5Adapter.onLevelStart === 'function') {
                self.h5Adapter.onLevelStart(level);
            }
        };

        this.roundEnd = function(result) {
            console.log("PokiSDK.roundEnd called with result:", result);
            if (self.h5Adapter && typeof self.h5Adapter.onLevelEnd === 'function') {
                self.h5Adapter.onLevelEnd(result);
            }
        };

        // 自定义事件埋点
        this.customEvent = function(eventName, param1, param2) {
            console.log("PokiSDK.customEvent called:", eventName, param1, param2);
            if (self.h5Adapter && typeof self.h5Adapter.reportGameState === 'function') {
                self.h5Adapter.reportGameState(eventName, param1, param2);
            }
        };

        // 调试模式设置
        this.setDebug = function(enable) {
            console.log("PokiSDK.setDebug called with enable:", enable);
            // 可以用于控制H5 SDK的测试模式
        };

        // 通用方法处理
        this.withArguments = function(methodName) {
            return function() {
                var args = Array.prototype.slice.call(arguments);
                console.log("PokiSDK." + methodName + " called with arguments:", args);
                
                // 根据方法名调用对应的处理逻辑
                try {
                    switch (methodName) {
                        case 'gameplayStart':
                            if (typeof self.gameplayStart === 'function') {
                                self.gameplayStart();
                            }
                            break;
                        case 'gameplayStop':
                            if (typeof self.gameplayStop === 'function') {
                                self.gameplayStop();
                            }
                            break;
                        case 'gameLoadingStart':
                            if (typeof self.gameLoadingStart === 'function') {
                                self.gameLoadingStart();
                            }
                            break;
                        case 'gameLoadingFinished':
                            if (typeof self.gameLoadingFinished === 'function') {
                                self.gameLoadingFinished();
                            }
                            break;
                        case 'gameLoadingCompleted':
                            if (typeof self.gameLoadingCompleted === 'function') {
                                self.gameLoadingCompleted();
                            }
                            break;
                        case 'happyTime':
                            if (typeof self.happyTime === 'function') {
                                self.happyTime(args[0]);
                            }
                            break;
                        case 'roundStart':
                            if (typeof self.roundStart === 'function') {
                                self.roundStart(args[0]);
                            }
                            break;
                        case 'roundEnd':
                            if (typeof self.roundEnd === 'function') {
                                self.roundEnd(args[0]);
                            }
                            break;
                        case 'customEvent':
                            if (typeof self.customEvent === 'function') {
                                self.customEvent(args[0], args[1], args[2]);
                            }
                            break;
                        case 'setDebug':
                            if (typeof self.setDebug === 'function') {
                                self.setDebug(args[0]);
                            }
                            break;
                        default:
                            // 其他方法的默认处理
                            break;
                    }
                } catch (error) {
                    console.error("PokiSDK method call error:", methodName, error);
                }
            };
        };

        // 自动解析Promise
        this.handleAutoResolvePromise = function() {
            console.log("PokiSDK.handleAutoResolvePromise called");
            return Promise.resolve();
        };

        // 空操作
        this.doNothing = function() {
            console.log("PokiSDK.doNothing called");
        };

        // 清理资源
        this.destroy = function() {
            console.log("PokiSDK.destroy called");
            if (self.h5Adapter && typeof self.h5Adapter.destroy === 'function') {
                self.h5Adapter.destroy();
            }
        };
    };

    // 创建SDK实例
    var sdkInstance = new SDKInstance();

    // ==================== PokiSDK全局对象 ====================
    
    // 暴露PokiSDK全局对象
    window.PokiSDK = {
        // 核心方法
        init: function(config, options) {
            return sdkInstance.init(config, options);
        },
        initWithVideoHB: function(config, options) {
            console.log("PokiSDK.initWithVideoHB called with config:", config, "options:", options);
            return sdkInstance.init(config, options);
        },
        commercialBreak: function(options) {
            return sdkInstance.commercialBreak(options);
        },
        rewardedBreak: function() {
            return sdkInstance.rewardedBreak();
        },
        displayAd: function(container, size, onComplete, onError) {
            return sdkInstance.displayAd(container, size, onComplete, onError);
        },
        destroyAd: function() {
            console.log("PokiSDK.destroyAd called");
            return sdkInstance.doNothing();
        },
        
        // 排行榜相关
        getLeaderboard: function() {
            console.log("PokiSDK.getLeaderboard called");
            return sdkInstance.handleAutoResolvePromise();
        },
        
        // 分享相关
        shareableURL: function() {
            console.log("PokiSDK.shareableURL called");
            return new Promise(function(resolve, reject) {
                // 返回当前页面URL
                resolve(window.location.href);
            });
        },

        // URL参数获取
        getURLParam: function(param) {
            console.log("PokiSDK.getURLParam called with param:", param);
            return getUrlParam("gd" + param) || getUrlParam(param) || "";
        },

        // 语言获取
        getLanguage: function() {
            console.log("PokiSDK.getLanguage called");
            return navigator.language.toLowerCase().split("-")[0];
        },

        // 广告拦截检测
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
        },

        // 游戏状态方法
        gameplayStart: function() {
            return sdkInstance.gameplayStart();
        },
        gameplayStop: function() {
            return sdkInstance.gameplayStop();
        },
        gameLoadingStart: function() {
            return sdkInstance.gameLoadingStart();
        },
        gameLoadingFinished: function() {
            return sdkInstance.gameLoadingFinished();
        },
        gameLoadingCompleted: function() {
            return sdkInstance.gameLoadingCompleted();
        },
        happyTime: function(intensity) {
            return sdkInstance.happyTime(intensity);
        },
        roundStart: function(level) {
            return sdkInstance.roundStart(level);
        },
        roundEnd: function(result) {
            return sdkInstance.roundEnd(result);
        },
        customEvent: function(eventName, param1, param2) {
            return sdkInstance.customEvent(eventName, param1, param2);
        },
        
        // 自动Banner广告控制
        enableAutoBanner: function(enabled) {
            console.log("PokiSDK.enableAutoBanner called with enabled:", enabled);
            H5_AD_CONFIG.autoBanner.enabled = !!enabled;
            if (enabled) {
                console.log("✅ 自动Banner广告已启用");
                // 如果启用且页面已加载，立即尝试加载
                if (document.readyState !== 'loading') {
                    setTimeout(autoLoadBannerAds, 100);
                }
            } else {
                console.log("❌ 自动Banner广告已禁用");
            }
        },
        
        setAutoBannerConfig: function(config) {
            console.log("PokiSDK.setAutoBannerConfig called with config:", config);
            if (config && typeof config === 'object') {
                var oldConfig = JSON.parse(JSON.stringify(H5_AD_CONFIG.autoBanner));
                var sizeChanged = false;
                
                if (typeof config.enabled === 'boolean') {
                    H5_AD_CONFIG.autoBanner.enabled = config.enabled;
                }
                if (typeof config.delay === 'number' && config.delay >= 0) {
                    H5_AD_CONFIG.autoBanner.delay = config.delay;
                }
                if (typeof config.width === 'number' && config.width > 0) {
                    if (H5_AD_CONFIG.autoBanner.width !== config.width) {
                        sizeChanged = true;
                    }
                    H5_AD_CONFIG.autoBanner.width = config.width;
                }
                if (typeof config.height === 'number' && config.height > 0) {
                    console.warn("⚠️ PokiSDK: Banner高度已固定为50px，忽略height配置参数");
                    // 不允许修改高度 - 强制固定为50px
                }
                
                console.log("✅ 自动Banner广告配置已更新:", H5_AD_CONFIG.autoBanner);
                console.log("ℹ️ 注意: Banner高度固定为50px，不受配置影响");
                
                // 如果尺寸发生变化且功能已启用，重新加载Banner
                if (sizeChanged && H5_AD_CONFIG.autoBanner.enabled) {
                    console.log("🔄 PokiSDK: 尺寸配置变更，重新加载Banner广告");
                    setTimeout(autoLoadBannerAds, 100);
                }
            }
        },
        
        getAutoBannerConfig: function() {
            return JSON.parse(JSON.stringify(H5_AD_CONFIG.autoBanner));
        },
        
        refreshBanner: function() {
            console.log("PokiSDK.refreshBanner called - 手动刷新Banner广告");
            
            // 强制移除现有Banner
            var existingBanner = document.getElementById('poki-auto-banner-ad');
            if (existingBanner) {
                console.log("🗑️ PokiSDK: 强制移除现有Banner容器");
                console.log("🔍 PokiSDK: 移除前Banner状态:", {
                    offsetHeight: existingBanner.offsetHeight,
                    styleHeight: existingBanner.style.height,
                    children: existingBanner.children.length
                });
                
                try {
                    existingBanner.innerHTML = ''; // 清空所有内容
                    existingBanner.remove(); // 移除元素
                    console.log("✅ PokiSDK: Banner容器已完全移除");
                } catch (e) {
                    console.warn("⚠️ PokiSDK: 移除Banner时出错:", e);
                }
            }
            
            // 重新创建Banner
            if (H5_AD_CONFIG.autoBanner.enabled) {
                console.log("🔄 PokiSDK: 延迟重新创建Banner广告 (配置高度: " + H5_AD_CONFIG.autoBanner.height + "px)");
                setTimeout(autoLoadBannerAds, 200); // 增加延迟确保完全移除
            } else {
                console.log("ℹ️ PokiSDK: Banner功能已禁用，不重新创建");
            }
        },
        
        // 强制重建Banner（彻底重新创建）
        forceRebuildBanner: function() {
            console.log("PokiSDK.forceRebuildBanner called - 强制重建Banner广告");
            
            // 先禁用再启用，确保完全重建
            H5_AD_CONFIG.autoBanner.enabled = false;
            
            // 移除所有可能的Banner元素
            var banners = document.querySelectorAll('#poki-auto-banner-ad, [id*="banner"], [class*="banner"]');
            banners.forEach(function(banner) {
                if (banner.id === 'poki-auto-banner-ad') {
                    console.log("🗑️ PokiSDK: 移除Banner:", banner.id);
                    banner.remove();
                }
            });
            
            // 等待DOM更新后重新启用并创建
            setTimeout(function() {
                H5_AD_CONFIG.autoBanner.enabled = true;
                console.log("🔄 PokiSDK: 强制重建Banner (高度: " + H5_AD_CONFIG.autoBanner.height + "px)");
                autoLoadBannerAds();
            }, 500);
        },
        
        // 一次性设置Banner高度（已禁用 - 高度固定为50px）
        setBannerHeight: function(height) {
            console.warn("⚠️ PokiSDK.setBannerHeight: Banner高度已固定为50px，此方法已禁用");
            console.log("ℹ️ PokiSDK: 忽略设置高度请求:", height + "px，继续使用固定高度50px");
            
            // 检查现有Banner状态
            var existingBanner = document.getElementById('poki-auto-banner-ad');
            if (existingBanner) {
                console.log("🔍 PokiSDK: 当前Banner状态（固定50px）:", {
                    offsetHeight: existingBanner.offsetHeight,
                    styleHeight: existingBanner.style.height,
                    configHeight: "50px (固定值)"
                });
            }
            
            return false; // 返回false表示操作被拒绝
        }
    };

    // 添加其他SDK方法
    var additionalMethods = [
        "captureError",
        "gameInteractive",
        "gameLoadingProgress",
        "logError",
        "muteAd",
        "sendHighscore",
        "setDebugTouchOverlayController",
        "setLogging",
        "setPlayerAge",
        "setPlaytestCanvas",
        "enableEventTracking"
    ];

    // 为每个方法创建实现
    additionalMethods.forEach(function(methodName) {
        window.PokiSDK[methodName] = sdkInstance.withArguments(methodName);
    });

    // ==================== 初始化和事件处理 ====================
    
    // 横竖屏检测
    function detectOrientationChange() {
        var orientation = window.screen && window.screen.orientation 
            ? window.screen.orientation.type 
            : (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
        
        if (sdkInstance.h5Adapter && typeof sdkInstance.h5Adapter.onScreenOrientationChange === 'function') {
            sdkInstance.h5Adapter.onScreenOrientationChange(orientation);
        }
    }

    // 监听横竖屏变化
    window.addEventListener('orientationchange', detectOrientationChange);
    window.addEventListener('resize', detectOrientationChange);

    // ==================== 启动时立即开始后台SDK加载 ====================
    
    // 页面开始就启动后台SDK加载（不等待任何事件）
    function startImmediateSDKLoading() {
        console.log("PokiSDK: 立即开始后台SDK加载");
        backgroundLoader.startBackgroundLoading().catch(function(error) {
            console.log("PokiSDK: 后台SDK加载将继续重试:", error.message);
        });
    }
    
    // 立即启动（同步执行，不等待DOM加载）
    startImmediateSDKLoading();

    // ==================== 自动Banner广告加载 ====================
    
    // 自动创建并加载Banner广告的函数
    function autoLoadBannerAds() {
        console.log("🚀 PokiSDK: 开始自动创建底部Banner广告...");
        
        // 检查是否启用自动Banner广告
        if (!H5_AD_CONFIG.autoBanner.enabled) {
            console.log("ℹ️ PokiSDK: 自动Banner广告已禁用");
            return;
        }
        
        // 检查是否已经存在Banner广告容器
        var existingBanner = document.getElementById('poki-auto-banner-ad');
        if (existingBanner) {
            // 检查现有容器的尺寸 - 必须是50px
            var currentHeight = parseInt(existingBanner.style.height) || existingBanner.offsetHeight;
            var fixedHeight = 50; // 固定高度
            
            console.log("🔍 PokiSDK: 检查现有Banner尺寸 - 当前:", currentHeight + "px, 固定高度:", fixedHeight + "px");
            console.log("🔍 PokiSDK: 现有Banner详细信息:", {
                id: existingBanner.id,
                offsetHeight: existingBanner.offsetHeight,
                clientHeight: existingBanner.clientHeight,
                styleHeight: existingBanner.style.height,
                computedHeight: window.getComputedStyle(existingBanner).height
            });
            
            if (currentHeight === fixedHeight) {
                console.log("ℹ️ PokiSDK: Banner广告容器已存在且高度正确(50px)，跳过创建");
                return;
            } else {
                console.log("🔄 PokiSDK: 检测到高度异常 (" + currentHeight + "px -> " + fixedHeight + "px)，强制重新创建容器");
                
                // 强制移除现有Banner及其所有子元素
                try {
                    existingBanner.innerHTML = ''; // 清空内容
                    existingBanner.remove(); // 移除元素
                    console.log("✅ PokiSDK: 已强制移除现有Banner容器");
                } catch (e) {
                    console.warn("⚠️ PokiSDK: 移除现有Banner时出错:", e);
                }
                
                // 等待一下再继续创建新的
                setTimeout(function() {
                    console.log("🔄 PokiSDK: 延迟创建新Banner容器");
                }, 100);
            }
        }
        
        var bannerWidth = H5_AD_CONFIG.autoBanner.width;
        var bannerHeight = 50; // 强制固定高度为50px
        var bannerSize = bannerWidth + 'x' + bannerHeight;
        
        console.log("📦 PokiSDK: 创建" + bannerSize + "底部横幅广告容器...");
        
        // 创建Banner广告容器
        var bannerContainer = document.createElement('div');
        bannerContainer.id = 'poki-auto-banner-ad';
        
        // 使用头部配置的样式设置
        var containerStyles = H5_AD_CONFIG.banner.styles.container;
        var styleArray = [];
        
        // 从配置对象生成CSS样式字符串
        for (var key in containerStyles) {
            if (containerStyles.hasOwnProperty(key)) {
                var cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                styleArray.push(cssKey + ': ' + containerStyles[key]);
            }
        }
        
        // 添加尺寸相关样式 - 强制固定高度50px
        styleArray.push('height: 50px !important');
        styleArray.push('min-height: 50px !important');
        styleArray.push('max-height: 50px !important');
        
        bannerContainer.style.cssText = styleArray.join(';');
        
        // 额外确保高度设置 - 强制固定50px
        bannerContainer.setAttribute('data-original-height', '50');
        bannerContainer.setAttribute('data-force-height', 'true');
        
        // 设置初始内容（使用头部配置的样式）
        var loadingStyle = H5_AD_CONFIG.banner.styles.loadingText;
        var loadingStyleStr = 'color: ' + loadingStyle.color + '; font-size: ' + loadingStyle.fontSize + ';';
        bannerContainer.innerHTML = '<span style="' + loadingStyleStr + '"></span>';
        
        // 添加到页面底部
        document.body.appendChild(bannerContainer);
        
        // 强制设置高度，确保初始化时就是正确的高度
        setTimeout(function() {
            console.log("🔧 PokiSDK: 强制确保Banner初始高度正确");
            
            // 再次强制设置高度样式 - 固定50px
            bannerContainer.style.height = '50px';
            bannerContainer.style.minHeight = '50px';
            bannerContainer.style.maxHeight = '50px';
            
            console.log("🔍 PokiSDK: 强制设置后的容器状态:", {
                offsetHeight: bannerContainer.offsetHeight,
                clientHeight: bannerContainer.clientHeight,
                styleHeight: bannerContainer.style.height,
                computedHeight: window.getComputedStyle(bannerContainer).height
            });
        }, 10); // 10ms后执行，确保DOM完全插入
        
        console.log("✅ PokiSDK: Banner广告容器已创建并添加到页面底部");
        console.log("📏 PokiSDK: 容器信息:", {
            id: bannerContainer.id,
            configuredSize: bannerSize,
            offsetWidth: bannerContainer.offsetWidth,
            offsetHeight: bannerContainer.offsetHeight,
            position: 'fixed bottom',
            zIndex: 9999
        });
        
        // 延迟加载广告，确保容器已完全渲染
        setTimeout(function() {
            console.log("🎯 PokiSDK: 开始加载" + bannerSize + "广告到自动创建的容器");
            
            window.PokiSDK.displayAd(
                bannerContainer,
                bannerSize,
                function() {
                    console.log("✅ PokiSDK: 底部Banner广告加载成功!");
                    
                    // 派发成功事件
                    try {
                        var event = new CustomEvent('bannerAdLoaded', {
                            detail: {
                                size: bannerSize,
                                container: 'auto-created',
                                position: 'bottom-fixed',
                                timestamp: Date.now()
                            }
                        });
                        window.dispatchEvent(event);
                    } catch (e) {
                        console.warn("PokiSDK: 无法派发bannerAdLoaded事件:", e);
                    }
                },
                function(error) {
                    console.error("❌ PokiSDK: 底部Banner广告加载失败:", error);
                    
                    // 显示错误信息（使用头部配置的样式）
                    var errorStyle = H5_AD_CONFIG.banner.styles.errorText;
                    var errorStyleStr = 'color: ' + errorStyle.color + '; font-size: ' + errorStyle.fontSize + ';';
                    bannerContainer.innerHTML = '<span style="' + errorStyleStr + '">❌ Banner广告加载失败: ' + error + '</span>';
                    
                    // 派发失败事件
                    try {
                        var event = new CustomEvent('bannerAdError', {
                            detail: {
                                size: bannerSize,
                                container: 'auto-created',
                                position: 'bottom-fixed',
                                error: error,
                                timestamp: Date.now()
                            }
                        });
                        window.dispatchEvent(event);
                    } catch (e) {
                        console.warn("PokiSDK: 无法派发bannerAdError事件:", e);
                    }
                    
                    // 5秒后隐藏错误信息
                    setTimeout(function() {
                        try {
                            bannerContainer.style.display = 'none';
                        } catch (e) {
                            console.warn("PokiSDK: 无法隐藏错误容器:", e);
                        }
                    }, 5000);
                }
            );
        }, H5_AD_CONFIG.autoBanner.delay);
    }
    
    // 页面加载完成后自动查找并加载Banner广告
    function initAutoLoadBannerAds() {
        console.log("🎯 PokiSDK: 准备自动加载Banner广告...");
        
        if (document.readyState === 'loading') {
            // 如果文档还在加载，等待DOM加载完成
            document.addEventListener('DOMContentLoaded', function() {
                console.log("📄 PokiSDK: DOM加载完成，开始自动Banner广告查找");
                setTimeout(autoLoadBannerAds, H5_AD_CONFIG.autoBanner.delay);
            });
        } else {
            // 文档已经加载完成，立即执行
            console.log("📄 PokiSDK: 文档已加载，立即开始自动Banner广告查找");
            setTimeout(autoLoadBannerAds, Math.min(H5_AD_CONFIG.autoBanner.delay, 100));
        }
    }
    
    // 立即启动自动Banner广告加载
    initAutoLoadBannerAds();

    // 页面加载完成后自动初始化（异步，不阻塞游戏）
    function safeInit() {
        console.log("PokiSDK 开始安全初始化");
        
        // 使用异步初始化，确保不阻塞游戏启动
        window.PokiSDK.init().then(function() {
            console.log("PokiSDK 初始化成功");
        }).catch(function(error) {
            console.warn("PokiSDK 初始化失败，但游戏可以正常运行:", error.message);
        });
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // 延迟执行，确保游戏引擎先启动
            setTimeout(safeInit, 200);
        });
    } else {
        // 文档已经加载完成，立即异步初始化
        setTimeout(safeInit, 100);
    }

    // 页面卸载时清理资源
    window.addEventListener('beforeunload', function() {
        console.log("PokiSDK cleaning up resources");
        if (sdkInstance && typeof sdkInstance.destroy === 'function') {
            sdkInstance.destroy();
        }
        if (backgroundLoader && typeof backgroundLoader.destroy === 'function') {
            backgroundLoader.destroy();
        }
    });

    // 错误处理 - 过滤无关错误并保护游戏运行
    window.addEventListener('error', function(event) {
        try {
            // 过滤掉无关的错误
            var errorMessage = event.error ? event.error.message : event.message || "unknown_error";
            var errorSource = event.filename || "";
            
            // 忽略广告SDK、Service Worker、Manifest、WebSocket等无关错误
            var ignoredPatterns = [
                "ServiceWorker", "sw_transsion", "appmanifest", "WebSocket",
                "autofill", "post_extract", "contents.", "nlp.",
                "h5sdk", "adsbygoogle", "googletag", "gpt", // 广告相关错误
                "adsdk", "athena", "analytics", // H5 SDK相关错误
                "Extension", "chrome-extension", // 浏览器插件错误
                "Non-Error promise rejection" // Promise rejection
            ];
            
            var shouldIgnore = ignoredPatterns.some(function(pattern) {
                return errorMessage.includes(pattern) || errorSource.includes(pattern);
            });
            
            if (shouldIgnore) {
                console.log("忽略无关错误:", errorMessage);
                return; // 忽略这些错误
            }
            
            console.error("PokiSDK detected relevant error:", errorMessage);
            
            // 异步上报游戏相关的错误事件，不阻塞游戏
            setTimeout(function() {
                if (window.h5sdk && window.h5sdk.athenaSend && errorMessage !== "null") {
                    try {
                        window.h5sdk.athenaSend("js_error", errorMessage);
                    } catch (e) {
                        console.warn("Failed to report error (non-critical):", e.message);
                    }
                }
            }, 100);
            
        } catch (handlerError) {
            console.warn("Error handler itself failed:", handlerError.message);
        }
    });

    // Promise rejection 处理 - 防止未捕获的 Promise 错误影响游戏
    window.addEventListener('unhandledrejection', function(event) {
        try {
            var reason = event.reason;
            var errorMessage = reason && reason.message ? reason.message : String(reason);
            
            // 过滤广告和SDK相关的Promise rejection
            var adRelatedErrors = [
                "h5sdk", "adsbygoogle", "googletag", "adsdk", "athena",
                "timeout", "network", "fetch", "XMLHttpRequest"
            ];
            
            var isAdRelated = adRelatedErrors.some(function(pattern) {
                return errorMessage.toLowerCase().includes(pattern.toLowerCase());
            });
            
            if (isAdRelated) {
                console.log("忽略广告相关的Promise rejection:", errorMessage);
                event.preventDefault(); // 阻止默认的错误处理
                return;
            }
            
            console.warn("Unhandled Promise rejection:", errorMessage);
        } catch (handlerError) {
            console.warn("Promise rejection handler failed:", handlerError.message);
        }
    });

    // ==================== 游戏启动保护机制 ====================
    
    // 游戏启动检查器 - 确保游戏能正常启动，不被广告阻塞
    var GameStartupGuard = {
        gameStarted: false,
        startTimeout: null,
        maxWaitTime: 15000, // 最大等待15秒
        
        init: function() {
            var self = this;
            
            // 启动保护定时器
            this.startTimeout = setTimeout(function() {
                if (!self.gameStarted) {
                    console.warn("游戏启动保护：强制启动游戏（可能广告SDK有问题）");
                    self.forceGameStart();
                }
            }, this.maxWaitTime);
            
            // 监听游戏启动事件
            this.watchForGameStart();
        },
        
        watchForGameStart: function() {
            var self = this;
            
            // 检查常见的游戏引擎对象
            var checkInterval = setInterval(function() {
                var gameStarted = false;
                
                // 检查 Construct 3
                if (window.c3_callFunction || window.cr_getC3Runtime) {
                    gameStarted = true;
                }
                
                // 检查 Unity WebGL
                if (window.unityInstance || window.gameInstance) {
                    gameStarted = true;
                }
                
                // 检查其他游戏引擎
                if (window.gameEngine || window.game || document.querySelector('canvas')) {
                    gameStarted = true;
                }
                
                if (gameStarted && !self.gameStarted) {
                    console.log("游戏启动保护：检测到游戏已启动");
                    self.markGameStarted();
                    clearInterval(checkInterval);
                }
            }, 1000);
            
            // 30秒后停止检查
            setTimeout(function() {
                clearInterval(checkInterval);
            }, 30000);
        },
        
        markGameStarted: function() {
            this.gameStarted = true;
            if (this.startTimeout) {
                clearTimeout(this.startTimeout);
                this.startTimeout = null;
            }
        },
        
        forceGameStart: function() {
            console.log("游戏启动保护：执行强制游戏启动流程");
            
            // 检查后台SDK加载状态
            if (backgroundLoader) {
                console.log("游戏启动保护：后台SDK加载状态 - isLoaded:", backgroundLoader.isLoaded, 
                           "isLoading:", backgroundLoader.isLoading, 
                           "attempts:", backgroundLoader.loadAttempts);
            }
            
            // 尝试恢复可能被暂停的游戏
            if (window.c3_callFunction) {
                try {
                    window.c3_callFunction('ResumeGame');
                } catch (e) {
                    console.log("强制启动：c3_callFunction调用失败", e.message);
                }
            }
            
            // 派发游戏启动事件
            try {
                var event = new CustomEvent('forceGameStart', { 
                    detail: { 
                        timestamp: Date.now(),
                        sdkStatus: backgroundLoader ? backgroundLoader.isLoaded : false
                    } 
                });
                window.dispatchEvent(event);
            } catch (e) {
                console.log("强制启动：事件派发失败", e.message);
            }
            
            this.markGameStarted();
        }
    };
    
    // 启动游戏保护机制
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                GameStartupGuard.init();
            }, 1000);
        });
    } else {
        setTimeout(function() {
            GameStartupGuard.init();
        }, 1000);
    }

    console.log("PokiSDK with Dlightek H5 SDK integration v2.2.1 loaded");
    console.log("PokiSDK configuration:", {
        isKidsMode: isKidsMode,
        hasAdBridge: hasAdBridge,
        isHoistMode: isHoistMode,
        isSandboxMode: isSandboxMode,
        appKey: H5_AD_CONFIG.appKey,
        sdkVersion: "2.2.1",
        gameProtection: true, // 启用游戏启动保护
        backgroundLoading: true, // 启用后台SDK加载
        retryPolicy: "infinite", // 无限重试策略
        detailedLogging: true, // 启用详细日志
        autoBannerAds: H5_AD_CONFIG.autoBanner.enabled // 自动Banner广告
    });
    
    console.log("🎯 自动Banner广告功能已启用! 特性:");
    console.log("   - 自动在页面底部创建" + H5_AD_CONFIG.autoBanner.width + "x50横幅广告");
    console.log("   - 固定位置显示，不需要预设容器");
    console.log("   - 自动适配屏幕宽度，居中显示");
    console.log("   - 加载失败时自动隐藏");
    console.log("   - ⚠️ 高度固定为50px，不可修改");
    console.log("ℹ️ 可通过 PokiSDK.setAutoBannerConfig() 配置宽度和其他选项");
    console.log("⚠️ 注意: Banner高度已强制固定为50px，忽略所有高度设置请求");
})();