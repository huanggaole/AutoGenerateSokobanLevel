// Solver.js - 移植自C++的推箱子求解器

import { TileType, Direction } from './GenerateLevel.js';
import { State } from './State.js';
import { StateNode } from './StateNode.js';

/**
 * 推箱子求解器类
 */
class Solver {
    /**
     * 构造函数
     * @param {State} state - 初始游戏状态
     */
    constructor(state) {
        this.width = state.width;
        this.height = state.height;
        this.maxIterations = 10000; // 提高默认最大迭代次数
        this.maxNodesInMemory = 25000; // 提高最大内存中节点数
        this.batchSize = 50; // 减少批处理大小，提高搜索质量

        // 使用更大的哈希表以减少冲突
        this.hashTableSize = Math.max(1009, this.height * this.width * 7); // 使用质数作为哈希表大小
        this.statenodes = new Array(this.hashTableSize);
        this.statenodesamount = new Array(this.hashTableSize).fill(0);

        for (let i = 0; i < this.hashTableSize; i++) {
            this.statenodes[i] = new StateNode();
        }

        // 拷贝初始状态并执行泛洪填充
        let newstate = state.clone();
        newstate.charFloodFill();

        // 添加到未探索列表
        this.unexploidlist = []; // 未探索的状态节点列表
        this.steplist = [];      // 解决方案步骤列表
        this.iterNum = 0;        // 迭代次数
        this.totalNodes = 0;     // 总节点数

        this.unexploidlist.push(this.addState(newstate));
        this.totalNodes = 1;
    }

    /**
     * 计算状态的改进哈希码
     * @param {State} state - 要计算哈希的状态
     * @returns {number} 哈希码
     */
    calculateHash(state) {
        let hash = 0;
        const prime1 = 31;
        const prime2 = 37;

        // 考虑箱子位置，使用更好的哈希函数
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (state.tiles[i * this.width + j] === TileType.Box ||
                    state.tiles[i * this.width + j] === TileType.BoxinAid) {
                    // 使用位置的多项式哈希
                    hash = (hash * prime1 + (i * this.width + j) * prime2) % this.hashTableSize;
                }
            }
        }

        // 考虑玩家可达区域的特征，增加状态区分度
        let reachableCount = 0;
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (state.tiles[i * this.width + j] === TileType.Character ||
                    state.tiles[i * this.width + j] === TileType.CharacterinAid) {
                    reachableCount++;
                    hash = (hash * prime1 + (i * this.width + j)) % this.hashTableSize;
                }
            }
        }

        return Math.abs(hash) % this.hashTableSize;
    }

    /**
     * 添加状态到哈希表
     * @param {State} state - 要添加的状态
     * @returns {StateNode} 状态对应的节点
     */
    addState(state) {
        const code = this.calculateHash(state);
        this.statenodesamount[code]++;
        this.totalNodes++;

        return this.statenodes[code].addState(state);
    }

    /**
     * 检查状态是否已存在
     * @param {State} state - 要检查的状态
     * @returns {boolean} 是否存在
     */
    ifContain(state) {
        const code = this.calculateHash(state);
        return this.statenodes[code].ifContain(state);
    }

    /**
     * 计算启发式函数值（曼哈顿距离）
     * @param {State} state - 要计算的状态
     * @returns {number} 启发式值
     */
    calculateHeuristic(state) {
        let totalDistance = 0;
        const boxes = [];
        const targets = [];

        // 收集箱子和目标点位置
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (state.tiles[i * this.width + j] === TileType.Box) {
                    boxes.push({ x: j, y: i });
                }
                if (state.tiles[i * this.width + j] === TileType.Aid) {
                    targets.push({ x: j, y: i });
                }
            }
        }

        // 计算每个箱子到最近目标点的曼哈顿距离
        for (const box of boxes) {
            let minDistance = Infinity;
            for (const target of targets) {
                const distance = Math.abs(box.x - target.x) + Math.abs(box.y - target.y);
                minDistance = Math.min(minDistance, distance);
            }
            if (minDistance !== Infinity) {
                totalDistance += minDistance;
            }
        }

        return totalDistance;
    }

    /**
     * 运行求解算法
     * @returns {number} 结果代码：1表示找到解决方案，-1表示无解，0表示超过最大迭代次数
     */
    run() {
        this.iterNum = 0;

        // 使用改进的搜索策略
        while (this.iterNum < this.maxIterations && this.totalNodes < this.maxNodesInMemory) {
            // 如果未探索列表为空，则无解
            if (this.unexploidlist.length === 0) {
                return -1;
            }

            // 按启发式值排序，优先处理更有希望的状态
            if (this.iterNum % 100 === 0 && this.unexploidlist.length > 1) {
                this.unexploidlist.sort((a, b) => {
                    const heuristicA = this.calculateHeuristic(a.currentstate) + a.depth;
                    const heuristicB = this.calculateHeuristic(b.currentstate) + b.depth;
                    return heuristicA - heuristicB;
                });
            }

            // 批处理多个状态
            const batchSize = Math.min(this.batchSize, this.unexploidlist.length);
            for (let batch = 0; batch < batchSize; batch++) {
                this.iterNum++;

                // 每隔一段时间检查一次迭代次数
                if (this.iterNum % 1000 === 0) {
                    console.log(`Solver 已迭代 ${this.iterNum} 次，队列长度: ${this.unexploidlist.length}`);
                }

                // 取出一个状态进行探索
                const orisn = this.unexploidlist.shift();
                const depth = orisn.depth;
                const oristate = orisn.currentstate;

                // 改进的深度限制策略
                if (depth > 80) {
                    // 深度过大，跳过这个状态
                    continue;
                }

                const tempstate = oristate.clone();

                // 遍历棋盘上的每一个Box
                const alldirection = [Direction.D_UP, Direction.D_DOWN, Direction.D_LEFT, Direction.D_RIGHT];
                const newStates = [];

                // 生成所有可能的新状态
                for (let i = 0; i < oristate.height; i++) {
                    for (let j = 0; j < oristate.width; j++) {
                        if (tempstate.tiles[i * oristate.width + j] === TileType.Box ||
                            tempstate.tiles[i * oristate.width + j] === TileType.BoxinAid) {

                            // 尝试四个方向推动箱子
                            for (let k = 0; k < 4; k++) {
                                let newstate = tempstate.boxPushed(i, j, alldirection[k]);

                                if (newstate) {
                                    // 执行泛洪填充标记所有可达位置
                                    newstate.charFloodFill();

                                    // 剪枝：检查死锁和已存在状态
                                    if (newstate.ifDead()) {
                                        newstate = null; // JavaScript GC会处理
                                    }
                                    else if (this.ifContain(newstate)) {
                                        newstate = null; // JavaScript GC会处理
                                    }
                                    else {
                                        // 计算启发式值并存储
                                        const heuristic = this.calculateHeuristic(newstate);
                                        newStates.push({
                                            state: newstate,
                                            heuristic: heuristic,
                                            boxPos: { i, j },
                                            direction: alldirection[k]
                                        });

                                        // 检查是否胜利
                                        if (newstate.ifWin()) {
                                            // 添加胜利状态到搜索队列
                                            const sn = this.addState(newstate);
                                            sn.depth = depth + 1;
                                            sn.parentstate = orisn;

                                            // 构建解决方案步骤
                                            let tempsn = sn;
                                            while (tempsn) {
                                                this.steplist.unshift(tempsn);
                                                tempsn = tempsn.parentstate;
                                            }

                                            // 记录求解路径信息（用于调试）
                                            this.logSolutionPath();

                                            return 1;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 按启发式值排序新状态，优先处理更有希望的状态
                newStates.sort((a, b) => a.heuristic - b.heuristic);

                // 添加排序后的状态到搜索队列
                for (const stateInfo of newStates) {
                    const sn = this.addState(stateInfo.state);
                    sn.depth = depth + 1;
                    sn.parentstate = orisn;
                    this.unexploidlist.push(sn);
                }
            }
        }

        // 如果达到最大迭代次数或内存限制，返回超时状态
        if (this.iterNum >= this.maxIterations) {
            console.log(`求解器达到最大迭代次数 ${this.maxIterations}，停止搜索`);
        } else {
            console.log(`求解器达到最大内存节点数 ${this.maxNodesInMemory}，停止搜索`);
        }
        return 0;
    }



    /**
     * 记录求解路径信息（用于调试）
     */
    logSolutionPath() {
        if (this.steplist.length <= 1) {
            console.log("求解路径为空或只有初始状态");
            return;
        }

        console.log(`求解路径总长度: ${this.steplist.length}, 实际步数: ${this.steplist.length - 1}, 迭代次数: ${this.iterNum}`);

        // 只记录部分步骤避免日志过长
        const maxLogSteps = Math.min(5, this.steplist.length);
        for (let i = 0; i < maxLogSteps; i++) {
            const node = this.steplist[i];
            console.log(`步骤 ${i}: 深度=${node.depth}`);
        }
    }
}

// 导出模块
export { Solver };