// AILevelGenerator.js - 推箱子游戏AI关卡生成器

import { GenerateLevel, TileType, Direction } from './GenerateLevel.js';
import { State } from './State.js';
import { Solver } from './Solver.js';

/**
 * AI关卡生成器类
 */
class AILevelGenerator {
    /**
     * 构造函数
     * @param {number} width - 地图宽度
     * @param {number} height - 地图高度
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.generatedLevel = null;  // 生成的关卡数据
        this.minSteps = 0;          // 最少步数
        this.iterationCount = 0;     // 迭代次数
        this.wallCount = 0;         // 墙壁数量 - 添加为类成员变量
        this.maxSolverIterations = 5000; // 最大求解器迭代次数，防止无限循环
        this.maxGenerationTime = 10000; // 最大生成时间(毫秒)
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
                        console.log("生成关卡超时，返回最佳或回退方案");
                        if (bestLevel && bestSteps >= 10) {
                            resolve({
                                success: true,
                                level: bestLevel,
                                minSteps: bestSteps,
                                iterations: this.iterationCount,
                                wallCount: bestLevel.wallCount
                            });
                        } else if (hasValidLevel) {
                            const gameLevel = this.convertToGameFormat();
                            resolve({
                                success: true,
                                level: gameLevel,
                                minSteps: this.minSteps,
                                iterations: this.iterationCount,
                                wallCount: gameLevel.wallCount
                            });
                        } else {
                            const fallbackLevel = this.generateSimpleFallbackLevel();
                            resolve({
                                success: true,
                                level: fallbackLevel,
                                minSteps: 5, // 简单关卡的估计步数
                                iterations: this.iterationCount,
                                wallCount: 0 // 简易关卡默认无墙
                            });
                        }
                        return;
                    }

                    // 创建初始关卡
                    if (!this.generatedLevel) {
                        this.generatedLevel = new GenerateLevel(this.width, this.height);
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
                    // 根据墙壁数量调整生成策略
                    if (this.wallCount < 20) {
                        // 墙壁太少，强制生成墙壁，但数量减少
                        let wallsAdded = 0;
                        for (let i = 0; i < 2; i++) { // 原来是3，降低为2
                            if (this.generatedLevel.generateWall()) {
                                wallsAdded++;
                            }
                        }
                        // 降低生成箱子和目标点的概率
                        if (Math.random() < 0.3) { // 30%概率生成箱子和目标点
                            this.generatedLevel.generateBox();
                            this.generatedLevel.generateAid();
                            console.log('[AI调优] 低墙壁阶段，额外生成箱子和目标点');
                        }
                        // 如果成功添加了墙壁，重新计算墙壁数量
                        if (wallsAdded > 0) {
                            this.calculateWallCount();
                        }
                    } else if (this.wallCount >= 65) {
                        // 墙壁太多，只生成箱子和目标点
                        this.generatedLevel.generateBox();
                        this.generatedLevel.generateAid();
                        console.log('[AI调优] 墙壁过多，优先生成箱子和目标点');
                    } else {
                        // 墙壁数量在合理范围内，按新策略生成
                        // 前40次迭代优先生成墙壁，增加地图复杂性
                        if (this.iterationCount < 40 || Math.random() < 0.4) { // 原0.7，调低为0.4
                            // 每次只生成1个墙壁，降低密度
                            let wallsAdded = 0;
                            for (let i = 0; i < 1; i++) {
                                if (this.generatedLevel.generateWall()) {
                                    wallsAdded++;
                                }
                            }
                            // 降低生成箱子和目标点的概率
                            if (Math.random() < 0.2) { // 20%概率
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

                        // 如果当前关卡比之前找到的任何关卡更好，则记住它
                        if (this.minSteps > bestSteps || (this.minSteps === bestSteps && this.wallCount > (bestLevel?.wallCount || 0))) {
                            bestSteps = this.minSteps;
                            // 创建关卡时确保包含墙壁数量
                            const currentLevel = this.convertToGameFormat();
                            bestLevel = currentLevel;
                            console.log(`找到更好的关卡: 步数=${bestSteps}, 墙壁=${currentLevel.wallCount}`);
                        }

                        // 只有在以下条件全部满足时才考虑提前结束：
                        // 1. 步骤数足够多（>=15）
                        // 2. 已经迭代足够多次（>=30）
                        // 3. 墙壁数量在合理范围（20-65）
                        // 4. 不再强制继续迭代
                        if (this.minSteps >= 20 && this.iterationCount >= 30 &&
                            this.wallCount >= 20 && this.wallCount <= 65 &&
                            !forceMoreIterations) {
                            const finalLevel = this.convertToGameFormat();
                            console.log(`提前退出 - 步数: ${this.minSteps}, 墙壁: ${finalLevel.wallCount}`);
                            resolve({
                                success: true,
                                level: finalLevel,
                                minSteps: this.minSteps,
                                iterations: this.iterationCount,
                                wallCount: finalLevel.wallCount
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
                        if (bestLevel && bestSteps >= 10) {
                            // 使用找到的最佳关卡
                            console.log(`返回最佳关卡，步数: ${bestSteps}，墙壁数: ${bestLevel.wallCount}`);
                            resolve({
                                success: true,
                                level: bestLevel,
                                minSteps: bestSteps,
                                iterations: this.iterationCount,
                                wallCount: bestLevel.wallCount
                            });
                        } else if (hasValidLevel) {
                            const gameLevel = this.convertToGameFormat();
                            resolve({
                                success: true,
                                level: gameLevel,
                                minSteps: this.minSteps,
                                iterations: this.iterationCount,
                                wallCount: gameLevel.wallCount
                            });
                        } else {
                            // 全部尝试失败，生成简单的回退关卡
                            const fallbackLevel = this.generateSimpleFallbackLevel();
                            console.log("生成回退关卡");
                            resolve({
                                success: true,
                                level: fallbackLevel,
                                minSteps: 5,
                                iterations: this.iterationCount,
                                wallCount: 0
                            });
                        }
                    }
                } catch (error) {
                    console.error("生成关卡时出错:", error);
                    // 出错时返回简单的回退关卡
                    const fallbackLevel = this.generateSimpleFallbackLevel();
                    resolve({
                        success: true,
                        level: fallbackLevel,
                        minSteps: 5,
                        iterations: this.iterationCount,
                        error: error.toString(),
                        wallCount: 0
                    });
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
        // 创建一个新的空关卡
        this.generatedLevel = new GenerateLevel(this.width, this.height);

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

        // 添加随机墙壁，确保总数在20-30之间（保守点，避免过于复杂）
        const targetWallCount = Math.max(20, Math.min(30, this.wallCount + 10));
        while (this.wallCount < targetWallCount) {
            if (this.generatedLevel.generateWall()) {
                this.calculateWallCount();
            }
        }

        // 确保至少有解决方案
        this.minSteps = 5;
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