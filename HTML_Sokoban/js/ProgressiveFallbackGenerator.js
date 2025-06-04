// ProgressiveFallbackGenerator.js - 渐进式回退关卡生成器

import { GenerateLevel, TileType } from './GenerateLevel.js';

/**
 * 渐进式回退关卡生成器
 * 提供多层次的回退策略，确保在主生成失败时仍能提供合理质量的关卡
 */
class ProgressiveFallbackGenerator {
    /**
     * 构造函数
     * @param {number} width - 地图宽度
     * @param {number} height - 地图高度
     * @param {Object} options - 配置选项
     */
    constructor(width, height, options = {}) {
        this.width = width;
        this.height = height;
        this.options = options;
        
        // 定义回退级别
        this.fallbackLevels = [
            { 
                complexity: 0.8, 
                description: "高质量简化版",
                minBoxes: Math.max(2, Math.floor((width + height) / 6)),
                template: 'corridor'
            },
            { 
                complexity: 0.6, 
                description: "中等复杂度版本",
                minBoxes: Math.max(2, Math.floor((width + height) / 8)),
                template: 'rooms'
            },
            { 
                complexity: 0.4, 
                description: "基础挑战版本",
                minBoxes: Math.max(1, Math.floor((width + height) / 10)),
                template: 'linear'
            },
            { 
                complexity: 0.2, 
                description: "入门级版本",
                minBoxes: 1,
                template: 'minimal'
            }
        ];
        
        console.log(`渐进式回退生成器初始化: ${width}x${height}`);
    }
    
    /**
     * 生成回退关卡
     * @param {number} complexityLevel - 复杂度级别 (0-1)
     * @param {Array} previousAttempts - 之前的尝试记录
     * @param {number} timeRemaining - 剩余时间(ms)
     * @returns {Object} 生成的关卡
     */
    generateFallbackLevel(complexityLevel = 0.6, previousAttempts = [], timeRemaining = 1000) {
        try {
            // 选择合适的回退级别
            const fallbackLevel = this.selectFallbackLevel(complexityLevel, timeRemaining);
            
            console.log(`生成回退关卡: ${fallbackLevel.description}, 复杂度=${fallbackLevel.complexity}`);
            
            // 根据模板生成关卡
            const level = this.generateByTemplate(fallbackLevel);
            
            if (level) {
                return {
                    success: true,
                    level: level,
                    minSteps: this.estimateMinSteps(level),
                    wallCount: this.countWalls(level),
                    fallbackLevel: fallbackLevel.description,
                    complexity: fallbackLevel.complexity
                };
            }
            
            // 如果模板生成失败，使用最简单的生成方式
            return this.generateMinimalLevel();
            
        } catch (error) {
            console.error('回退关卡生成失败:', error);
            return this.generateMinimalLevel();
        }
    }
    
    /**
     * 选择合适的回退级别
     */
    selectFallbackLevel(targetComplexity, timeRemaining) {
        // 根据剩余时间调整复杂度
        if (timeRemaining < 500) {
            targetComplexity = Math.min(targetComplexity, 0.3);
        } else if (timeRemaining < 1500) {
            targetComplexity = Math.min(targetComplexity, 0.5);
        }
        
        // 找到最接近目标复杂度的级别
        let bestLevel = this.fallbackLevels[this.fallbackLevels.length - 1]; // 默认最简单
        let minDiff = Infinity;
        
        for (const level of this.fallbackLevels) {
            const diff = Math.abs(level.complexity - targetComplexity);
            if (diff < minDiff) {
                minDiff = diff;
                bestLevel = level;
            }
        }
        
        return bestLevel;
    }
    
    /**
     * 根据模板生成关卡
     */
    generateByTemplate(fallbackLevel) {
        switch (fallbackLevel.template) {
            case 'corridor':
                return this.generateCorridorLevel(fallbackLevel);
            case 'rooms':
                return this.generateRoomLevel(fallbackLevel);
            case 'linear':
                return this.generateLinearLevel(fallbackLevel);
            case 'minimal':
                return this.generateMinimalLevel();
            default:
                return this.generateLinearLevel(fallbackLevel);
        }
    }
    
    /**
     * 生成走廊型关卡
     */
    generateCorridorLevel(fallbackLevel) {
        const level = new GenerateLevel(this.width, this.height);
        
        // 创建L型或T型走廊
        const corridorType = Math.random() < 0.5 ? 'L' : 'T';
        
        if (corridorType === 'L') {
            this.createLShapedCorridor(level);
        } else {
            this.createTShapedCorridor(level);
        }
        
        // 在走廊中放置箱子和目标
        this.placeBoxesAndTargetsInCorridor(level, fallbackLevel.minBoxes);
        
        return this.convertToGameFormat(level);
    }
    
    /**
     * 生成房间型关卡
     */
    generateRoomLevel(fallbackLevel) {
        const level = new GenerateLevel(this.width, this.height);
        
        // 创建2-3个房间
        const roomCount = Math.min(3, Math.max(2, Math.floor(this.width * this.height / 20)));
        this.createRooms(level, roomCount);
        
        // 在房间中放置元素
        this.placeBoxesAndTargetsInRooms(level, fallbackLevel.minBoxes);
        
        return this.convertToGameFormat(level);
    }
    
    /**
     * 生成线性关卡
     */
    generateLinearLevel(fallbackLevel) {
        const level = new GenerateLevel(this.width, this.height);
        
        // 创建简单的线性路径
        this.createLinearPath(level);
        
        // 沿路径放置箱子和目标
        this.placeBoxesAndTargetsLinear(level, fallbackLevel.minBoxes);
        
        return this.convertToGameFormat(level);
    }
    
    /**
     * 生成最简关卡
     */
    generateMinimalLevel() {
        const level = new GenerateLevel(this.width, this.height);
        
        // 在中心区域放置简单的推箱子场景
        const centerY = Math.floor(this.height / 2);
        const centerX = Math.floor(this.width / 2);
        
        // 确保有足够空间
        if (centerX >= 2 && centerX < this.width - 2) {
            // 放置角色
            level.tiles[centerY * this.width + (centerX - 1)] = TileType.Character;
            
            // 放置箱子
            level.tiles[centerY * this.width + centerX] = TileType.Box;
            
            // 放置目标
            level.tiles[centerY * this.width + (centerX + 1)] = TileType.Aid;
        }
        
        const gameLevel = this.convertToGameFormat(level);
        
        return {
            success: true,
            level: gameLevel,
            minSteps: 1,
            wallCount: this.countWalls(gameLevel),
            fallbackLevel: "最简关卡",
            complexity: 0.1
        };
    }
    
    /**
     * 创建L型走廊
     */
    createLShapedCorridor(level) {
        const midY = Math.floor(this.height / 2);
        const midX = Math.floor(this.width / 2);
        
        // 水平走廊
        for (let x = 1; x < this.width - 1; x++) {
            level.tiles[midY * this.width + x] = TileType.Floor;
        }
        
        // 垂直走廊
        for (let y = 1; y < this.height - 1; y++) {
            level.tiles[y * this.width + midX] = TileType.Floor;
        }
        
        // 添加一些装饰性墙壁
        this.addDecorativeWalls(level, 3);
    }
    
    /**
     * 创建T型走廊
     */
    createTShapedCorridor(level) {
        const midY = Math.floor(this.height / 2);
        const topY = Math.floor(this.height / 3);
        const midX = Math.floor(this.width / 2);
        
        // 主水平走廊
        for (let x = 1; x < this.width - 1; x++) {
            level.tiles[midY * this.width + x] = TileType.Floor;
        }
        
        // 垂直分支
        for (let y = topY; y <= midY; y++) {
            level.tiles[y * this.width + midX] = TileType.Floor;
        }
        
        // 添加装饰性墙壁
        this.addDecorativeWalls(level, 4);
    }
    
    /**
     * 创建房间
     */
    createRooms(level, roomCount) {
        const rooms = [];
        const minRoomSize = 3;
        const maxRoomSize = Math.min(this.width - 2, this.height - 2, 5);
        
        for (let i = 0; i < roomCount; i++) {
            const roomWidth = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
            const roomHeight = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
            
            const roomX = Math.floor(Math.random() * (this.width - roomWidth - 2)) + 1;
            const roomY = Math.floor(Math.random() * (this.height - roomHeight - 2)) + 1;
            
            // 创建房间
            for (let y = roomY; y < roomY + roomHeight; y++) {
                for (let x = roomX; x < roomX + roomWidth; x++) {
                    level.tiles[y * this.width + x] = TileType.Floor;
                }
            }
            
            rooms.push({ x: roomX, y: roomY, width: roomWidth, height: roomHeight });
        }
        
        // 连接房间
        this.connectRooms(level, rooms);
    }
    
    /**
     * 创建线性路径
     */
    createLinearPath(level) {
        const startY = Math.floor(this.height / 2);
        let currentX = 1;
        let currentY = startY;
        
        // 创建蜿蜒的路径
        while (currentX < this.width - 1) {
            level.tiles[currentY * this.width + currentX] = TileType.Floor;
            
            // 随机决定是否改变Y坐标
            if (Math.random() < 0.3 && currentX > 2) {
                const newY = currentY + (Math.random() < 0.5 ? -1 : 1);
                if (newY >= 1 && newY < this.height - 1) {
                    currentY = newY;
                }
            }
            
            currentX++;
        }
    }
    
    /**
     * 在走廊中放置箱子和目标
     */
    placeBoxesAndTargetsInCorridor(level, boxCount) {
        const floorPositions = this.getFloorPositions(level);
        
        if (floorPositions.length < boxCount * 2 + 1) {
            boxCount = Math.floor((floorPositions.length - 1) / 2);
        }
        
        // 随机选择位置
        const shuffled = this.shuffleArray([...floorPositions]);
        
        // 放置角色
        const charPos = shuffled[0];
        level.tiles[charPos.y * this.width + charPos.x] = TileType.Character;
        
        // 放置箱子和目标
        for (let i = 0; i < boxCount; i++) {
            const boxPos = shuffled[1 + i * 2];
            const targetPos = shuffled[1 + i * 2 + 1];
            
            level.tiles[boxPos.y * this.width + boxPos.x] = TileType.Box;
            level.tiles[targetPos.y * this.width + targetPos.x] = TileType.Aid;
        }
    }
    
    /**
     * 辅助方法：获取所有地板位置
     */
    getFloorPositions(level) {
        const positions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (level.tiles[y * this.width + x] === TileType.Floor) {
                    positions.push({ x, y });
                }
            }
        }
        return positions;
    }
    
    /**
     * 辅助方法：数组洗牌
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    /**
     * 添加装饰性墙壁
     */
    addDecorativeWalls(level, count) {
        const floorPositions = this.getFloorPositions(level);
        const shuffled = this.shuffleArray([...floorPositions]);
        
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            const pos = shuffled[i];
            level.tiles[pos.y * this.width + pos.x] = TileType.Wall;
        }
    }
    
    /**
     * 连接房间（简化实现）
     */
    connectRooms(level, rooms) {
        for (let i = 0; i < rooms.length - 1; i++) {
            const room1 = rooms[i];
            const room2 = rooms[i + 1];
            
            // 简单的直线连接
            const startX = Math.floor(room1.x + room1.width / 2);
            const startY = Math.floor(room1.y + room1.height / 2);
            const endX = Math.floor(room2.x + room2.width / 2);
            const endY = Math.floor(room2.y + room2.height / 2);
            
            // 水平连接
            const minX = Math.min(startX, endX);
            const maxX = Math.max(startX, endX);
            for (let x = minX; x <= maxX; x++) {
                level.tiles[startY * this.width + x] = TileType.Floor;
            }
            
            // 垂直连接
            const minY = Math.min(startY, endY);
            const maxY = Math.max(startY, endY);
            for (let y = minY; y <= maxY; y++) {
                level.tiles[y * this.width + endX] = TileType.Floor;
            }
        }
    }
    
    /**
     * 在房间中放置元素
     */
    placeBoxesAndTargetsInRooms(level, boxCount) {
        // 简化实现，类似走廊放置
        this.placeBoxesAndTargetsInCorridor(level, boxCount);
    }
    
    /**
     * 线性放置元素
     */
    placeBoxesAndTargetsLinear(level, boxCount) {
        // 简化实现，类似走廊放置
        this.placeBoxesAndTargetsInCorridor(level, boxCount);
    }
    
    /**
     * 转换为游戏格式
     */
    convertToGameFormat(level) {
        const gameLevel = {
            board: Array(this.height).fill().map(() => Array(this.width).fill('floor')),
            playerPos: { x: 0, y: 0 },
            boxes: [],
            targets: []
        };
        
        // 转换瓦片类型
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                const tileType = level.tiles[i * this.width + j];
                
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
                    case TileType.Character:
                        gameLevel.playerPos = { x: j, y: i };
                        break;
                    default:
                        gameLevel.board[i][j] = 'floor';
                        break;
                }
            }
        }
        
        return gameLevel;
    }
    
    /**
     * 估算最少步数
     */
    estimateMinSteps(level) {
        return Math.max(1, level.boxes.length * 3);
    }
    
    /**
     * 计算墙壁数量
     */
    countWalls(level) {
        let count = 0;
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (level.board[i][j] === 'wall') {
                    count++;
                }
            }
        }
        return count;
    }
}

export { ProgressiveFallbackGenerator };
