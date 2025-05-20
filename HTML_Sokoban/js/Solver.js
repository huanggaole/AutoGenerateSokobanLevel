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
        this.maxIterations = 7000; // 默认最大迭代次数
        this.maxNodesInMemory = 15000; // 最大内存中节点数，超过时会优先考虑简单方案或返回无解
        this.batchSize = 100; // 每批处理状态数

        // 初始化状态节点哈希表
        this.statenodes = new Array(this.height * this.width);
        this.statenodesamount = new Array(this.height * this.width).fill(0);

        for (let i = 0; i < this.height * this.width; i++) {
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
     * 添加状态到哈希表
     * @param {State} state - 要添加的状态
     * @returns {StateNode} 状态对应的节点
     */
    addState(state) {
        let code = 0;
        // 将箱子视为1，非箱子视为0，计算哈希码
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (state.tiles[i * this.width + j] === TileType.Box ||
                    state.tiles[i * this.width + j] === TileType.BoxinAid) {
                    code += i * this.width + j;
                }
            }
        }
        code = code % (this.height * this.width);
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
        let code = 0;
        // 将箱子视为1，非箱子视为0，计算哈希码
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (state.tiles[i * this.width + j] === TileType.Box ||
                    state.tiles[i * this.width + j] === TileType.BoxinAid) {
                    code += i * this.width + j;
                }
            }
        }
        code = code % (this.height * this.width);

        if (this.statenodes[code].ifContain(state)) {
            return true;
        }

        return false;
    }

    /**
     * 运行求解算法
     * @returns {number} 结果代码：1表示找到解决方案，-1表示无解，0表示超过最大迭代次数
     */
    run() {
        this.iterNum = 0;

        // 使用简单的迭代方式，每次处理一批状态
        while (this.iterNum < this.maxIterations && this.totalNodes < this.maxNodesInMemory) {
            // 如果未探索列表为空，则无解
            if (this.unexploidlist.length === 0) {
                return -1;
            }

            // 批处理多个状态
            const batchSize = Math.min(this.batchSize, this.unexploidlist.length);
            for (let batch = 0; batch < batchSize; batch++) {
                this.iterNum++;

                // 每隔一段时间检查一次迭代次数
                if (this.iterNum % 500 === 0) {
                    console.log(`Solver 已迭代 ${this.iterNum} 次`);
                }

                // 取出一个状态进行探索
                const orisn = this.unexploidlist.shift();
                const depth = orisn.depth;
                const oristate = orisn.currentstate;

                // 如果深度过大，考虑跳过（另一种优化手段）
                if (depth > 50) {
                    // 深度过大，有50%的概率跳过这个状态
                    if (Math.random() < 0.5) continue;
                }

                const tempstate = oristate.clone();

                // 遍历棋盘上的每一个Box
                const alldirection = [Direction.D_UP, Direction.D_DOWN, Direction.D_LEFT, Direction.D_RIGHT];

                // 随机打乱方向，以获得更多随机性和避免局部最优解
                this.shuffleArray(alldirection);

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
                                        // 添加新状态到搜索队列
                                        const sn = this.addState(newstate);
                                        sn.depth = depth + 1;
                                        sn.parentstate = orisn;
                                        this.unexploidlist.push(sn);

                                        // 检查是否胜利
                                        if (newstate.ifWin()) {
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
     * 随机打乱数组顺序
     * @param {Array} array - 要打乱的数组
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
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