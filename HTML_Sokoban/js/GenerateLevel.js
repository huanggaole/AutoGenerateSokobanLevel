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
     * 随机生成箱子
     * @returns {boolean} 是否成功生成
     */
    generateBox() {
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
     * 随机生成墙壁
     * @returns {boolean} 是否成功生成
     */
    generateWall() {
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
     * 随机生成目标点
     * @returns {boolean} 是否成功生成
     */
    generateAid() {
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
}

// 导出模块
export { GenerateLevel, TileType, Direction }; 