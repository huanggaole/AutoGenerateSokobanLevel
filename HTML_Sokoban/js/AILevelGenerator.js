// AILevelGenerator.js - 推箱子游戏AI关卡生成器

import { GenerateLevel, TileType, Direction } from './GenerateLevel.js';
import { State } from './State.js';
import { Solver } from './Solver.js';
import { LevelQualityEvaluator } from './LevelQualityEvaluator.js';
import { ProgressiveFallbackGenerator } from './ProgressiveFallbackGenerator.js';

/**
 * AI关卡生成器类
 */
class AILevelGenerator {
    /**
     * 构造函数
     * @param {number} width - 地图宽度
     * @param {number} height - 地图高度
     * @param {Object} options - 可选配置参数
     */
    constructor(width, height, options = {}) {
        this.width = width;
        this.height = height;
        this.generatedLevel = null;  // 生成的关卡数据
        this.minSteps = 0;          // 最少步数
        this.iterationCount = 0;     // 迭代次数
        this.wallCount = 0;         // 墙壁数量 - 添加为类成员变量

        // 使用传入的参数或默认值
        this.maxSolverIterations = options.maxSolverIterations || 5000; // 最大求解器迭代次数，防止无限循环
        this.maxNodesInMemory = options.maxNodesInMemory || 15000; // 最大内存节点数
        this.maxGenerationTime = options.maxGenerationTime || 10000; // 最大生成时间(毫秒)

        // 概率分布设置
        this.wallProbability = options.wallProbability || 0.4; // 生成墙壁的概率
        this.boxProbability = options.boxProbability || 0.2; // 生成箱子/目标的概率

        // 动态参数配置（从配置文件传入或使用默认值）
        this.dynamicConfig = options.dynamicParameters || {
            minWallRatio: 0.15,
            maxWallRatio: 0.65,
            wallPriorityRatio: 0.8,
            fallbackMinWallRatio: 0.20,
            fallbackMaxWallRatio: 0.40
        };

        // 动态计算参数（基于地图尺寸和配置）
        this.calculateDynamicParameters();

        // 初始化质量评估器
        this.qualityEvaluator = new LevelQualityEvaluator(width, height, 'medium');

        // 初始化渐进式回退生成器
        this.fallbackGenerator = new ProgressiveFallbackGenerator(width, height, options);

        // 记录一下初始化参数，方便调试
        console.log(`AI关卡生成器初始化: 尺寸=${width}x${height}, 最大求解迭代=${this.maxSolverIterations}, 最大节点数=${this.maxNodesInMemory}`);
    }

    /**
     * 根据地图尺寸和配置动态计算参数
     */
    calculateDynamicParameters() {
        const totalTiles = this.width * this.height;
        const innerTiles = (this.width - 2) * (this.height - 2); // 去除边界墙的内部区域
        const borderWalls = 2 * this.width + 2 * (this.height - 2); // 边界墙数量

        // 使用配置文件中的比例动态计算墙壁数量阈值（基于总墙壁数，包括边界墙）
        this.minWallThreshold = Math.floor(innerTiles * this.dynamicConfig.minWallRatio) + borderWalls;
        this.maxWallThreshold = Math.floor(innerTiles * this.dynamicConfig.maxWallRatio) + borderWalls;

        // 使用配置文件中的比例动态计算优先生成墙壁的迭代次数
        this.wallPriorityIterations = Math.floor(totalTiles * this.dynamicConfig.wallPriorityRatio);

        // 使用配置文件中的比例动态计算备用关卡的墙壁数量范围（基于总墙壁数）
        this.fallbackMinWalls = Math.floor(innerTiles * this.dynamicConfig.fallbackMinWallRatio) + borderWalls;
        this.fallbackMaxWalls = Math.floor(innerTiles * this.dynamicConfig.fallbackMaxWallRatio) + borderWalls;

        console.log(`动态参数计算: 内部区域=${innerTiles}, 边界墙=${borderWalls}, 墙壁阈值=${this.minWallThreshold}-${this.maxWallThreshold}, 优先迭代=${this.wallPriorityIterations}, 备用墙壁=${this.fallbackMinWalls}-${this.fallbackMaxWalls}`);
    }

    /**
     * 计算当前关卡中的墙壁数量
     * @returns {number} 墙壁数量
     */
    calculateWallCount() {
        if (!this.generatedLevel) return 0;

        let count = 0;
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (this.generatedLevel.tiles[i * this.width + j] === TileType.Wall) {
                    count++;
                }
            }
        }
        this.wallCount = count; // 更新类成员变量
        return count;
    }

    /**
     * 生成可解的关卡
     * @param {number} maxTries - 最大尝试次数
     * @param {function} progressCallback - 进度回调函数
     * @returns {Promise} 包含生成结果的Promise
     */
    async generateLevel(maxTries = 100, progressCallback = null) {
        return new Promise((resolve, reject) => {
            // 初始化关卡变量
            let bestLevel = null;
            let bestSteps = 0;
            let forceMoreIterations = true; // 强制进行更多迭代
            let hasValidLevel = false; // 是否已找到有效关卡
            const startTime = Date.now(); // 记录开始时间

            // 使用setTimeout创建非阻塞循环，避免浏览器UI冻结
            const runIteration = () => {
                try {
                    // 检查是否超时
                    if (Date.now() - startTime > this.maxGenerationTime) {
                        console.log("生成关卡超时，使用智能回退策略");
                        const timeRemaining = Math.max(0, this.maxGenerationTime - (Date.now() - startTime) + 1000);

                        if (bestLevel && (bestLevel.qualityScore >= 0.5 || bestSteps >= 10)) {
                            // 返回找到的最佳关卡
                            resolve({
                                success: true,
                                level: bestLevel,
                                minSteps: bestSteps,
                                iterations: this.iterationCount,
                                wallCount: bestLevel.wallCount,
                                qualityScore: bestLevel.qualityScore,
                                qualityLevel: bestLevel.qualityLevel,
                                source: 'best_found'
                            });
                        } else if (hasValidLevel) {
                            // 返回当前有效关卡
                            const gameLevel = this.convertToGameFormat();
                            const finalQuality = this.qualityEvaluator.evaluateLevel(this.generatedLevel, [], this.wallCount);
                            resolve({
                                success: true,
                                level: gameLevel,
                                minSteps: this.minSteps,
                                iterations: this.iterationCount,
                                wallCount: gameLevel.wallCount,
                                qualityScore: finalQuality.score,
                                qualityLevel: finalQuality.qualityLevel,
                                source: 'current_valid'
                            });
                        } else {
                            // 使用渐进式回退生成器
                            const targetComplexity = bestLevel ? Math.max(0.4, bestLevel.qualityScore || 0.4) : 0.6;
                            const fallbackResult = this.fallbackGenerator.generateFallbackLevel(
                                targetComplexity,
                                [], // 暂时不传递尝试历史
                                timeRemaining
                            );
                            resolve({
                                success: true,
                                level: fallbackResult.level,
                                minSteps: fallbackResult.minSteps,
                                iterations: this.iterationCount,
                                wallCount: fallbackResult.wallCount,
                                qualityScore: fallbackResult.complexity,
                                qualityLevel: 'fallback',
                                source: 'progressive_fallback',
                                fallbackInfo: fallbackResult.fallbackLevel
                            });
                        }
                        return;
                    }

                    // 创建初始关卡
                    if (!this.generatedLevel) {
                        this.generatedLevel = new GenerateLevel(this.width, this.height, {
                            maxGenerationAttempts: this.dynamicConfig.maxGenerationAttempts
                        });
                        this.iterationCount = 0;
                        // 计算初始墙壁数量（默认边界墙）
                        this.calculateWallCount();
                        console.log(`初始墙壁数量: ${this.wallCount}`);
                    }

                    // 报告进度
                    if (progressCallback) {
                        progressCallback({
                            iteration: this.iterationCount,
                            maxTries: maxTries,
                            progress: Math.floor((this.iterationCount / maxTries) * 100)
                        });
                    }

                    // 随机修改地图策略
                    // 根据墙壁数量调整生成策略（使用动态计算的阈值）
                    if (this.wallCount < this.minWallThreshold) {
                        // 墙壁太少，强制生成墙壁，但数量减少
                        let wallsAdded = 0;
                        const wallsToAdd = Math.max(1, Math.floor(this.minWallThreshold / 20)); // 动态计算要添加的墙壁数
                        for (let i = 0; i < wallsToAdd; i++) {
                            if (this.generatedLevel.generateWall()) {
                                wallsAdded++;
                            }
                        }
                        // 降低生成箱子和目标点的概率
                        if (Math.random() < this.boxProbability) { // 使用设置的概率
                            this.generatedLevel.generateBox();
                            this.generatedLevel.generateAid();
                            console.log('[AI调优] 低墙壁阶段，额外生成箱子和目标点');
                        }
                        // 如果成功添加了墙壁，重新计算墙壁数量
                        if (wallsAdded > 0) {
                            this.calculateWallCount();
                        }
                    } else if (this.wallCount >= this.maxWallThreshold) {
                        // 墙壁太多，只生成箱子和目标点
                        this.generatedLevel.generateBox();
                        this.generatedLevel.generateAid();
                        console.log('[AI调优] 墙壁过多，优先生成箱子和目标点');
                    } else {
                        // 墙壁数量在合理范围内，按新策略生成
                        // 使用动态计算的迭代次数优先生成墙壁，增加地图复杂性
                        if (this.iterationCount < this.wallPriorityIterations || Math.random() < this.wallProbability) { // 使用设置的概率
                            // 每次只生成1个墙壁，降低密度
                            let wallsAdded = 0;
                            for (let i = 0; i < 1; i++) {
                                if (this.generatedLevel.generateWall()) {
                                    wallsAdded++;
                                }
                            }
                            // 降低生成箱子和目标点的概率
                            if (Math.random() < this.boxProbability) { // 使用设置的概率
                                this.generatedLevel.generateBox();
                                this.generatedLevel.generateAid();
                                console.log('[AI调优] 合理墙壁阶段，墙壁+箱子/目标点');
                            }
                            // 如果成功添加了墙壁，重新计算墙壁数量
                            if (wallsAdded > 0) {
                                this.calculateWallCount();
                            }
                        } else {
                            // 降低批量生成概率
                            for (let i = 0; i < (Math.random() < 0.3 ? 2 : 1); i++) {
                                this.generatedLevel.generateBox();
                                this.generatedLevel.generateAid();
                            }
                            console.log('[AI调优] 合理墙壁阶段，优先生成箱子和目标点');
                        }
                    }

                    // 创建状态并求解
                    const state = new State(this.width, this.height);
                    state.setLevel([...this.generatedLevel.tiles]);

                    const solver = new Solver(state);
                    solver.maxIterations = this.maxSolverIterations; // 设置最大求解迭代次数

                    // 如果设置了最大内存节点数，也设置给求解器
                    if (this.maxNodesInMemory) {
                        solver.maxNodesInMemory = this.maxNodesInMemory;
                    }

                    let result = solver.run();

                    if (result === -1) {
                        // 关卡无解，恢复上一个可解状态
                        this.generatedLevel.load();
                        // 恢复后重新计算墙壁数量
                        this.calculateWallCount();
                    } else if (result === 0) {
                        // 求解超时，视为无解，恢复上一个可解状态
                        console.log("求解超时，恢复上一个可解状态");
                        this.generatedLevel.load();
                        this.calculateWallCount();
                    } else if (result === 1) {
                        // 关卡有解，保存当前状态
                        this.generatedLevel.save();

                        // 现在的steplist实际上是StateNode对象的列表，代表状态变化
                        // 每个状态变化对应玩家的一步移动
                        this.minSteps = solver.steplist.length - 1; // 减1因为包含初始状态

                        // 记录解法步骤细节便于调试
                        console.log(`找到解法，最少步数: ${this.minSteps}`);

                        hasValidLevel = true;

                        // 使用新的质量评估系统
                        const currentLevel = this.convertToGameFormat();
                        const qualityResult = this.qualityEvaluator.evaluateLevel(
                            this.generatedLevel,
                            solver.steplist,
                            this.wallCount
                        );

                        console.log(`关卡质量评估: 得分=${qualityResult.score.toFixed(3)}, 等级=${qualityResult.qualityLevel}`);
                        console.log(`质量指标: 步数复杂度=${qualityResult.metrics.stepComplexity?.toFixed(3)}, 空间分布=${qualityResult.metrics.spatialDistribution?.toFixed(3)}`);

                        // 检查是否找到了更好的关卡（基于综合质量评分）
                        const currentQualityScore = qualityResult.score;
                        const previousBestScore = bestLevel?.qualityScore || 0;

                        if (!bestLevel || currentQualityScore > previousBestScore ||
                            (Math.abs(currentQualityScore - previousBestScore) < 0.1 && this.minSteps > bestSteps)) {
                            bestSteps = this.minSteps;
                            bestLevel = currentLevel;
                            bestLevel.qualityScore = currentQualityScore;
                            bestLevel.qualityLevel = qualityResult.qualityLevel;
                            bestLevel.qualityMetrics = qualityResult.metrics;
                            console.log(`发现更好的关卡，质量得分: ${currentQualityScore.toFixed(3)}，步数: ${bestSteps}，墙壁数: ${this.wallCount}`);
                        }

                        // 基于质量评估的提前结束条件
                        if (qualityResult.isHighQuality && this.iterationCount >= 20 && !forceMoreIterations) {
                            console.log(`找到高质量关卡，提前结束生成。质量得分: ${currentQualityScore.toFixed(3)}，步数: ${this.minSteps}，迭代次数: ${this.iterationCount}`);
                            resolve({
                                success: true,
                                level: currentLevel,
                                minSteps: this.minSteps,
                                iterations: this.iterationCount,
                                wallCount: this.wallCount,
                                qualityScore: currentQualityScore,
                                qualityLevel: qualityResult.qualityLevel,
                                qualityMetrics: qualityResult.metrics
                            });
                            return;
                        }

                        // 备用提前结束条件（基于传统指标）
                        if (this.minSteps >= 20 && this.iterationCount >= 40 &&
                            this.wallCount >= this.minWallThreshold && this.wallCount <= this.maxWallThreshold &&
                            qualityResult.isAcceptable && !forceMoreIterations) {
                            console.log(`达到可接受质量标准，提前退出 - 步数: ${this.minSteps}, 墙壁: ${this.wallCount}, 质量得分: ${currentQualityScore.toFixed(3)}`);
                            resolve({
                                success: true,
                                level: currentLevel,
                                minSteps: this.minSteps,
                                iterations: this.iterationCount,
                                wallCount: this.wallCount,
                                qualityScore: currentQualityScore,
                                qualityLevel: qualityResult.qualityLevel,
                                qualityMetrics: qualityResult.metrics
                            });
                            return;
                        }
                    }

                    this.iterationCount++;

                    // 前30次迭代强制继续，以确保有足够的墙壁生成
                    if (this.iterationCount >= 30) {
                        forceMoreIterations = false;
                    }

                    if (this.iterationCount < maxTries) {
                        // 继续下一次迭代，但使用requestAnimationFrame以更好地配合浏览器渲染周期
                        requestAnimationFrame(() => {
                            setTimeout(runIteration, 0);
                        });
                    } else {
                        // 达到最大尝试次数，返回最佳结果或当前结果
                        if (bestLevel && (bestLevel.qualityScore >= 0.5 || bestSteps >= 10)) {
                            // 使用找到的最佳关卡
                            console.log(`返回最佳关卡，质量得分: ${bestLevel.qualityScore?.toFixed(3) || 'N/A'}，步数: ${bestSteps}，墙壁数: ${bestLevel.wallCount}`);
                            resolve({
                                success: true,
                                level: bestLevel,
                                minSteps: bestSteps,
                                iterations: this.iterationCount,
                                wallCount: bestLevel.wallCount,
                                qualityScore: bestLevel.qualityScore,
                                qualityLevel: bestLevel.qualityLevel,
                                qualityMetrics: bestLevel.qualityMetrics
                            });
                        } else if (hasValidLevel) {
                            const gameLevel = this.convertToGameFormat();
                            // 对当前关卡进行最终质量评估
                            const finalQualityResult = this.qualityEvaluator.evaluateLevel(
                                this.generatedLevel,
                                [], // 没有解法步骤信息
                                this.wallCount
                            );
                            resolve({
                                success: true,
                                level: gameLevel,
                                minSteps: this.minSteps,
                                iterations: this.iterationCount,
                                wallCount: gameLevel.wallCount,
                                qualityScore: finalQualityResult.score,
                                qualityLevel: finalQualityResult.qualityLevel,
                                qualityMetrics: finalQualityResult.metrics
                            });
                        } else {
                            // 全部尝试失败，使用渐进式回退生成器
                            console.log("所有尝试失败，使用渐进式回退生成器");
                            const targetComplexity = bestLevel ? Math.max(0.3, bestLevel.qualityScore || 0.3) : 0.5;
                            const fallbackResult = this.fallbackGenerator.generateFallbackLevel(
                                targetComplexity,
                                [], // 暂时不传递尝试历史
                                1000 // 给回退生成器1秒时间
                            );
                            resolve({
                                success: true,
                                level: fallbackResult.level,
                                minSteps: fallbackResult.minSteps,
                                iterations: this.iterationCount,
                                wallCount: fallbackResult.wallCount,
                                qualityScore: fallbackResult.complexity,
                                qualityLevel: 'fallback',
                                source: 'progressive_fallback_final',
                                fallbackInfo: fallbackResult.fallbackLevel
                            });
                        }
                    }
                } catch (error) {
                    console.error("生成关卡时出错:", error);
                    // 出错时使用渐进式回退生成器
                    try {
                        const fallbackResult = this.fallbackGenerator.generateFallbackLevel(
                            0.4, // 中等复杂度
                            [],
                            500 // 紧急情况下给500ms
                        );
                        resolve({
                            success: true,
                            level: fallbackResult.level,
                            minSteps: fallbackResult.minSteps,
                            iterations: this.iterationCount,
                            wallCount: fallbackResult.wallCount,
                            qualityScore: fallbackResult.complexity,
                            qualityLevel: 'fallback',
                            source: 'error_fallback',
                            error: error.toString(),
                            fallbackInfo: fallbackResult.fallbackLevel
                        });
                    } catch (fallbackError) {
                        console.error("回退生成器也失败:", fallbackError);
                        // 最后的保险：使用原始简单生成
                        const simpleFallback = this.generateSimpleFallbackLevel();
                        resolve({
                            success: true,
                            level: simpleFallback,
                            minSteps: 5,
                            iterations: this.iterationCount,
                            wallCount: 0,
                            qualityScore: 0.1,
                            qualityLevel: 'minimal',
                            source: 'emergency_fallback',
                            error: error.toString(),
                            fallbackError: fallbackError.toString()
                        });
                    }
                }
            };

            // 开始第一次迭代
            runIteration();
        });
    }

    /**
     * 生成一个简单的备选关卡，确保始终有一个有效的解决方案
     */
    generateSimpleFallbackLevel() {
        // 创建一个新的空关卡，传递生成尝试次数配置
        this.generatedLevel = new GenerateLevel(this.width, this.height, {
            maxGenerationAttempts: this.dynamicConfig.maxGenerationAttempts
        });

        // 在中间偏左放置角色
        const centerY = Math.floor(this.height / 2);
        const centerX = Math.floor(this.width / 2) - 1;

        // 清除角色位置的默认墙
        this.generatedLevel.tiles[centerY * this.width + centerX] = TileType.Character;

        // 在角色右侧放置箱子
        this.generatedLevel.tiles[centerY * this.width + (centerX + 1)] = TileType.Box;

        // 在箱子右侧放置目标
        this.generatedLevel.tiles[centerY * this.width + (centerX + 2)] = TileType.Aid;

        // 计算当前墙壁数量（主要是边界墙）
        this.calculateWallCount();

        // 添加随机墙壁，使用动态计算的范围（保守点，避免过于复杂）
        const targetWallCount = Math.max(this.fallbackMinWalls, Math.min(this.fallbackMaxWalls, this.wallCount + Math.floor(this.fallbackMinWalls / 2)));
        while (this.wallCount < targetWallCount) {
            if (this.generatedLevel.generateWall()) {
                this.calculateWallCount();
            }
        }

        // 确保至少有解决方案
        this.minSteps = 5;

        // 返回转换后的游戏格式关卡
        return this.convertToGameFormat();
    }

    /**
     * 将内部格式转换为游戏格式
     * @returns {Object} 游戏格式的关卡数据
     */
    convertToGameFormat() {
        if (!this.generatedLevel) {
            throw new Error('没有生成关卡');
        }

        // 重新计算当前关卡中的墙壁数量以确保准确性
        this.calculateWallCount();

        const gameLevel = {
            board: Array(this.height).fill().map(() => Array(this.width).fill('floor')),
            playerPos: { x: 0, y: 0 },
            boxes: [],
            targets: [],
            wallCount: this.wallCount  // 添加墙壁数量到关卡数据中
        };

        // 转换瓦片类型
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                const tileType = this.generatedLevel.tiles[i * this.width + j];

                switch (tileType) {
                    case TileType.Wall:
                        gameLevel.board[i][j] = 'wall';
                        break;
                    case TileType.Aid:
                        gameLevel.targets.push({ x: j, y: i });
                        break;
                    case TileType.Box:
                        gameLevel.boxes.push({ x: j, y: i });
                        break;
                    case TileType.BoxinAid:
                        gameLevel.boxes.push({ x: j, y: i });
                        gameLevel.targets.push({ x: j, y: i });
                        break;
                    case TileType.Character:
                        gameLevel.playerPos = { x: j, y: i };
                        break;
                    case TileType.CharacterinAid:
                        gameLevel.playerPos = { x: j, y: i };
                        gameLevel.targets.push({ x: j, y: i });
                        break;
                    case TileType.Floor:
                    default:
                        gameLevel.board[i][j] = 'floor';
                        break;
                }
            }
        }

        return gameLevel;
    }
}

// 导出模块
export { AILevelGenerator }; 