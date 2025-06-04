// GenerateLevel.js - 移植自C++的关卡生成算法

// 枚举类型定义
let TileType = {
    Aid: 0,        // 目标点
    Box: 1,        // 箱子
    BoxinAid: 2,   // 位于目标点上的箱子
    Character: 3,  // 玩家
    CharacterinAid: 4, // 位于目标点上的玩家
    Wall: 5,       // 墙壁
    Floor: 6       // 地板
};

// 方向枚举
let Direction = {
    D_UP: 0,
    D_DOWN: 1,
    D_LEFT: 2,
    D_RIGHT: 3
};

/**
 * 关卡生成类
 */
class GenerateLevel {
    /**
     * 构造函数
     * @param {number} w - 地图宽度
     * @param {number} h - 地图高度
     * @param {Object} options - 可选配置参数
     */
    constructor(w, h, options = {}) {
        this.width = w;
        this.height = h;
        this.tiles = new Array(w * h);
        this.savedtiles = new Array(w * h);

        // 可配置的生成尝试次数
        this.maxGenerationAttempts = options.maxGenerationAttempts || 1000;

        // 初始化地图，围墙一圈
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (i === 0 || i === this.height - 1 || j === 0 || j === this.width - 1) {
                    this.tiles[i * this.width + j] = TileType.Wall;
                } else {
                    this.tiles[i * this.width + j] = TileType.Floor;
                }
            }
        }

        // 随机生成一个角色的初始位置
        this.generateChar();

        // 备份初始状态
        this.save();
    }

    /**
     * 随机生成角色
     * @returns {boolean} 是否成功生成
     */
    generateChar() {
        let gtime = this.maxGenerationAttempts;
        while (gtime--) {
            const randi = Math.floor(Math.random() * this.height);
            const randj = Math.floor(Math.random() * this.width);
            if (this.tiles[randi * this.width + randj] === TileType.Floor) {
                this.tiles[randi * this.width + randj] = TileType.Character;
                return true;
            }
        }
        return false;
    }

    /**
     * 随机生成箱子（改进版本，使用加权随机选择）
     * @returns {boolean} 是否成功生成
     */
    generateBox() {
        // 优先使用改进的加权随机方法
        if (this.generateBoxWithWeighting()) {
            return true;
        }

        // 如果加权方法失败，回退到原始方法
        return this.generateBoxOriginal();
    }

    /**
     * 使用加权随机选择生成箱子
     * @returns {boolean} 是否成功生成
     */
    generateBoxWithWeighting() {
        // 收集所有可用位置并计算权重
        const availablePositions = [];
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);

        for (let i = 1; i < this.height - 1; i++) {
            for (let j = 1; j < this.width - 1; j++) {
                if (this.tiles[i * this.width + j] === TileType.Floor) {
                    // 计算位置权重（距离中心适中的位置权重更高）
                    const distanceFromCenter = Math.abs(i - centerY) + Math.abs(j - centerX);
                    const maxDistance = Math.floor((this.width + this.height) / 2);

                    // 使用钟形分布：中心附近和边缘的权重较低，中间区域权重较高
                    let weight = 1;
                    if (distanceFromCenter < maxDistance * 0.3) {
                        weight = 0.7; // 太靠近中心，权重较低
                    } else if (distanceFromCenter > maxDistance * 0.7) {
                        weight = 0.5; // 太靠近边缘，权重较低
                    } else {
                        weight = 1.0; // 中间区域，权重最高
                    }

                    // 检查周围是否已有其他元素，避免聚集
                    const surroundingElements = this.countSurroundingElements(i, j, 2);
                    if (surroundingElements > 2) {
                        weight *= 0.3; // 周围元素太多，大幅降低权重
                    } else if (surroundingElements > 0) {
                        weight *= 0.7; // 周围有元素，适度降低权重
                    }

                    availablePositions.push({ x: j, y: i, weight });
                }
            }
        }

        if (availablePositions.length === 0) return false;

        // 加权随机选择
        return this.weightedRandomSelect(availablePositions, TileType.Box);
    }

    /**
     * 原始的随机生成箱子方法（作为备用）
     * @returns {boolean} 是否成功生成
     */
    generateBoxOriginal() {
        let gtime = this.maxGenerationAttempts;
        while (gtime--) {
            const randi = Math.floor(Math.random() * this.height);
            const randj = Math.floor(Math.random() * this.width);
            if (this.tiles[randi * this.width + randj] === TileType.Floor) {
                this.tiles[randi * this.width + randj] = TileType.Box;
                return true;
            }
        }
        return false;
    }

    /**
     * 随机生成墙壁（改进版本，使用策略性放置）
     * @returns {boolean} 是否成功生成
     */
    generateWall() {
        // 优先使用改进的策略性放置方法
        if (this.generateWallWithStrategy()) {
            return true;
        }

        // 如果策略方法失败，回退到原始方法
        return this.generateWallOriginal();
    }

    /**
     * 使用策略性放置生成墙壁
     * @returns {boolean} 是否成功生成
     */
    generateWallWithStrategy() {
        // 收集所有可用位置并计算权重
        const availablePositions = [];

        for (let i = 1; i < this.height - 1; i++) {
            for (let j = 1; j < this.width - 1; j++) {
                if (this.tiles[i * this.width + j] === TileType.Floor) {
                    // 计算墙壁放置的策略权重
                    let weight = 1.0;

                    // 检查是否靠近边界（边界附近的墙壁更有用）
                    const distanceFromBorder = Math.min(i - 1, j - 1, this.height - 2 - i, this.width - 2 - j);
                    if (distanceFromBorder <= 1) {
                        weight *= 1.5; // 靠近边界，权重增加
                    } else if (distanceFromBorder >= 3) {
                        weight *= 0.7; // 远离边界，权重降低
                    }

                    // 检查周围的墙壁密度
                    const surroundingWalls = this.countSurroundingWalls(i, j, 1);
                    if (surroundingWalls >= 3) {
                        weight *= 0.2; // 周围墙壁太多，避免过度聚集
                    } else if (surroundingWalls === 1 || surroundingWalls === 2) {
                        weight *= 1.3; // 适度的墙壁连接，权重增加
                    }

                    // 检查是否会阻断重要通道
                    if (this.wouldBlockImportantPath(i, j)) {
                        weight *= 0.1; // 会阻断重要通道，大幅降低权重
                    }

                    // 检查周围其他元素，避免阻挡箱子和目标
                    const surroundingElements = this.countSurroundingElements(i, j, 1);
                    if (surroundingElements > 0) {
                        weight *= 0.6; // 周围有其他元素，降低权重
                    }

                    availablePositions.push({ x: j, y: i, weight });
                }
            }
        }

        if (availablePositions.length === 0) return false;

        // 加权随机选择
        return this.weightedRandomSelect(availablePositions, TileType.Wall);
    }

    /**
     * 原始的随机生成墙壁方法（作为备用）
     * @returns {boolean} 是否成功生成
     */
    generateWallOriginal() {
        let gtime = this.maxGenerationAttempts;
        while (gtime--) {
            const randi = Math.floor(Math.random() * this.height);
            const randj = Math.floor(Math.random() * this.width);
            if (this.tiles[randi * this.width + randj] === TileType.Floor) {
                this.tiles[randi * this.width + randj] = TileType.Wall;
                return true;
            }
        }
        return false;
    }

    /**
     * 随机生成目标点（改进版本，考虑与箱子的合理分布）
     * @returns {boolean} 是否成功生成
     */
    generateAid() {
        // 优先使用改进的分布策略方法
        if (this.generateAidWithDistribution()) {
            return true;
        }

        // 如果策略方法失败，回退到原始方法
        return this.generateAidOriginal();
    }

    /**
     * 使用分布策略生成目标点
     * @returns {boolean} 是否成功生成
     */
    generateAidWithDistribution() {
        // 收集所有可用位置并计算权重
        const availablePositions = [];

        // 找到所有箱子位置
        const boxPositions = [];
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (this.tiles[i * this.width + j] === TileType.Box) {
                    boxPositions.push({ x: j, y: i });
                }
            }
        }

        for (let i = 1; i < this.height - 1; i++) {
            for (let j = 1; j < this.width - 1; j++) {
                if (this.tiles[i * this.width + j] === TileType.Floor) {
                    let weight = 1.0;

                    // 如果有箱子，计算与箱子的距离关系
                    if (boxPositions.length > 0) {
                        let minDistanceToBox = Infinity;
                        for (const box of boxPositions) {
                            const distance = Math.abs(i - box.y) + Math.abs(j - box.x);
                            minDistanceToBox = Math.min(minDistanceToBox, distance);
                        }

                        // 理想距离是2-4格，太近或太远都不好
                        if (minDistanceToBox < 1) {
                            weight *= 0.3; // 太近
                        } else if (minDistanceToBox <= 4) {
                            weight *= 1.0 + (4 - minDistanceToBox) * 0.2; // 理想距离
                        } else {
                            weight *= Math.max(0.4, 1.0 - (minDistanceToBox - 4) * 0.1); // 太远
                        }
                    }

                    // 避免与其他目标点过于接近
                    const surroundingTargets = this.countSurroundingTargets(i, j, 2);
                    if (surroundingTargets > 0) {
                        weight *= 0.5; // 周围有目标点，降低权重
                    }

                    // 检查周围墙壁，避免被完全包围
                    const surroundingWalls = this.countSurroundingWalls(i, j, 1);
                    if (surroundingWalls >= 3) {
                        weight *= 0.3; // 周围墙壁太多
                    }

                    availablePositions.push({ x: j, y: i, weight });
                }
            }
        }

        if (availablePositions.length === 0) return false;

        // 加权随机选择
        return this.weightedRandomSelect(availablePositions, TileType.Aid);
    }

    /**
     * 原始的随机生成目标点方法（作为备用）
     * @returns {boolean} 是否成功生成
     */
    generateAidOriginal() {
        let gtime = this.maxGenerationAttempts;
        while (gtime--) {
            const randi = Math.floor(Math.random() * this.height);
            const randj = Math.floor(Math.random() * this.width);
            if (this.tiles[randi * this.width + randj] === TileType.Floor) {
                this.tiles[randi * this.width + randj] = TileType.Aid;
                return true;
            }
        }
        return false;
    }

    /**
     * 保存当前状态
     */
    save() {
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                this.savedtiles[i * this.width + j] = this.tiles[i * this.width + j];
            }
        }
    }

    /**
     * 从保存的状态恢复
     */
    load() {
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                this.tiles[i * this.width + j] = this.savedtiles[i * this.width + j];
            }
        }
    }

    /**
     * 加权随机选择位置
     * @param {Array} positions - 位置数组，每个位置包含x, y, weight属性
     * @param {number} tileType - 要放置的瓦片类型
     * @returns {boolean} 是否成功放置
     */
    weightedRandomSelect(positions, tileType) {
        if (positions.length === 0) return false;

        // 计算总权重
        const totalWeight = positions.reduce((sum, pos) => sum + pos.weight, 0);
        if (totalWeight <= 0) return false;

        // 随机选择
        let randomValue = Math.random() * totalWeight;

        for (const pos of positions) {
            randomValue -= pos.weight;
            if (randomValue <= 0) {
                this.tiles[pos.y * this.width + pos.x] = tileType;
                return true;
            }
        }

        // 如果由于浮点精度问题没有选中，选择最后一个
        const lastPos = positions[positions.length - 1];
        this.tiles[lastPos.y * this.width + lastPos.x] = tileType;
        return true;
    }

    /**
     * 计算指定位置周围的元素数量（箱子、目标点、角色）
     * @param {number} y - y坐标
     * @param {number} x - x坐标
     * @param {number} radius - 搜索半径
     * @returns {number} 周围元素数量
     */
    countSurroundingElements(y, x, radius) {
        let count = 0;
        for (let i = Math.max(0, y - radius); i <= Math.min(this.height - 1, y + radius); i++) {
            for (let j = Math.max(0, x - radius); j <= Math.min(this.width - 1, x + radius); j++) {
                if (i === y && j === x) continue; // 跳过自身

                const tile = this.tiles[i * this.width + j];
                if (tile === TileType.Box || tile === TileType.BoxinAid ||
                    tile === TileType.Aid || tile === TileType.Character ||
                    tile === TileType.CharacterinAid) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * 计算指定位置周围的墙壁数量
     * @param {number} y - y坐标
     * @param {number} x - x坐标
     * @param {number} radius - 搜索半径
     * @returns {number} 周围墙壁数量
     */
    countSurroundingWalls(y, x, radius) {
        let count = 0;
        for (let i = Math.max(0, y - radius); i <= Math.min(this.height - 1, y + radius); i++) {
            for (let j = Math.max(0, x - radius); j <= Math.min(this.width - 1, x + radius); j++) {
                if (i === y && j === x) continue; // 跳过自身

                if (this.tiles[i * this.width + j] === TileType.Wall) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * 计算指定位置周围的目标点数量
     * @param {number} y - y坐标
     * @param {number} x - x坐标
     * @param {number} radius - 搜索半径
     * @returns {number} 周围目标点数量
     */
    countSurroundingTargets(y, x, radius) {
        let count = 0;
        for (let i = Math.max(0, y - radius); i <= Math.min(this.height - 1, y + radius); i++) {
            for (let j = Math.max(0, x - radius); j <= Math.min(this.width - 1, x + radius); j++) {
                if (i === y && j === x) continue; // 跳过自身

                const tile = this.tiles[i * this.width + j];
                if (tile === TileType.Aid || tile === TileType.CharacterinAid || tile === TileType.BoxinAid) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * 检查在指定位置放置墙壁是否会阻断重要通道
     * @param {number} y - y坐标
     * @param {number} x - x坐标
     * @returns {boolean} 是否会阻断重要通道
     */
    wouldBlockImportantPath(y, x) {
        // 简化的通道检测：检查四个方向的连通性
        const directions = [
            { dy: -1, dx: 0 }, // 上
            { dy: 1, dx: 0 },  // 下
            { dy: 0, dx: -1 }, // 左
            { dy: 0, dx: 1 }   // 右
        ];

        let accessibleDirections = 0;
        for (const dir of directions) {
            const ny = y + dir.dy;
            const nx = x + dir.dx;

            if (ny >= 0 && ny < this.height && nx >= 0 && nx < this.width) {
                const tile = this.tiles[ny * this.width + nx];
                if (tile !== TileType.Wall) {
                    accessibleDirections++;
                }
            }
        }

        // 如果只有一个或两个相对的方向可通行，可能是重要通道
        if (accessibleDirections <= 2) {
            // 进一步检查是否是连接不同区域的关键通道
            return this.isKeyConnector(y, x);
        }

        return false;
    }

    /**
     * 检查位置是否是连接不同区域的关键连接点
     * @param {number} y - y坐标
     * @param {number} x - x坐标
     * @returns {boolean} 是否是关键连接点
     */
    isKeyConnector(y, x) {
        // 简化实现：检查该位置是否连接了多个独立的可通行区域
        // 这里使用简单的启发式方法

        const directions = [
            { dy: -1, dx: 0 }, // 上
            { dy: 1, dx: 0 },  // 下
            { dy: 0, dx: -1 }, // 左
            { dy: 0, dx: 1 }   // 右
        ];

        let connectedRegions = 0;
        let lastConnected = false;

        for (const dir of directions) {
            const ny = y + dir.dy;
            const nx = x + dir.dx;

            if (ny >= 0 && ny < this.height && nx >= 0 && nx < this.width) {
                const tile = this.tiles[ny * this.width + nx];
                const isConnected = (tile !== TileType.Wall);

                if (isConnected && !lastConnected) {
                    connectedRegions++;
                }
                lastConnected = isConnected;
            } else {
                lastConnected = false;
            }
        }

        // 如果连接了多个区域，可能是关键连接点
        return connectedRegions >= 2;
    }
}

// 导出模块
export { GenerateLevel, TileType, Direction }; 