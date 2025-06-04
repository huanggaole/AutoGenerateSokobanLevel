// LevelQualityEvaluator.js - 多维度关卡质量评估系统

import { TileType } from './GenerateLevel.js';

/**
 * 关卡质量评估器
 * 提供多维度的关卡质量评估，包括步数复杂度、空间分布、路径多样性等
 */
class LevelQualityEvaluator {
    /**
     * 构造函数
     * @param {number} width - 地图宽度
     * @param {number} height - 地图高度
     * @param {string} difficulty - 难度级别 ('easy', 'medium', 'hard')
     */
    constructor(width, height, difficulty = 'medium') {
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;
        
        // 动态计算基础阈值
        this.baseStepThreshold = this.calculateBaseStepThreshold();
        this.maxReasonableSteps = this.baseStepThreshold * 3;
        
        // 评估权重配置
        this.weights = {
            stepComplexity: 0.35,      // 步数复杂度权重
            spatialDistribution: 0.25, // 空间分布权重
            pathDiversity: 0.20,       // 路径多样性权重
            wallDensity: 0.12,         // 墙壁密度权重
            solutionEfficiency: 0.08   // 解法效率权重
        };
        
        console.log(`质量评估器初始化: ${width}x${height}, 难度=${difficulty}, 基础步数阈值=${this.baseStepThreshold}`);
    }
    
    /**
     * 计算基础步数阈值（基于地图尺寸和难度）
     */
    calculateBaseStepThreshold() {
        const baseComplexity = this.width * this.height;
        const difficultyMultipliers = {
            'easy': 0.25,
            'medium': 0.35,
            'hard': 0.45
        };
        
        return Math.floor(baseComplexity * difficultyMultipliers[this.difficulty]);
    }
    
    /**
     * 综合评估关卡质量
     * @param {Object} level - 关卡数据
     * @param {Array} solution - 解决方案步骤
     * @param {number} wallCount - 墙壁数量
     * @returns {Object} 评估结果
     */
    evaluateLevel(level, solution, wallCount) {
        try {
            const metrics = {
                stepComplexity: this.evaluateStepComplexity(solution),
                spatialDistribution: this.evaluateSpatialDistribution(level),
                pathDiversity: this.evaluatePathDiversity(solution),
                wallDensity: this.evaluateWallDensity(wallCount),
                solutionEfficiency: this.evaluateSolutionEfficiency(solution)
            };
            
            // 加权计算总分
            let totalScore = 0;
            for (const [metric, value] of Object.entries(metrics)) {
                totalScore += value * this.weights[metric];
            }
            
            // 质量等级判定
            const qualityLevel = this.determineQualityLevel(totalScore, metrics);
            
            return {
                score: totalScore,
                metrics: metrics,
                qualityLevel: qualityLevel,
                isHighQuality: totalScore >= 0.7 && metrics.stepComplexity >= 0.6,
                isAcceptable: totalScore >= 0.5 && metrics.stepComplexity >= 0.4,
                recommendation: this.generateRecommendation(metrics)
            };
        } catch (error) {
            console.error('质量评估过程中出错:', error);
            return {
                score: 0,
                metrics: {},
                qualityLevel: 'error',
                isHighQuality: false,
                isAcceptable: false,
                recommendation: '评估失败，建议重新生成'
            };
        }
    }
    
    /**
     * 评估步数复杂度
     */
    evaluateStepComplexity(solution) {
        if (!solution || solution.length === 0) return 0;
        
        const stepCount = solution.length;
        
        // 基础步数评分
        let stepScore = 0;
        if (stepCount < this.baseStepThreshold * 0.5) {
            stepScore = 0.2; // 太简单
        } else if (stepCount < this.baseStepThreshold) {
            stepScore = 0.5; // 偏简单
        } else if (stepCount <= this.baseStepThreshold * 2) {
            stepScore = 0.8 + (stepCount - this.baseStepThreshold) / this.baseStepThreshold * 0.2;
        } else if (stepCount <= this.maxReasonableSteps) {
            stepScore = 1.0; // 理想复杂度
        } else {
            stepScore = Math.max(0.6, 1.0 - (stepCount - this.maxReasonableSteps) / this.maxReasonableSteps * 0.4);
        }
        
        // 移动模式复杂度
        const patternComplexity = this.analyzeMovePatterns(solution);
        
        return Math.min(1.0, stepScore * 0.7 + patternComplexity * 0.3);
    }
    
    /**
     * 分析移动模式复杂度
     */
    analyzeMovePatterns(solution) {
        if (!solution || solution.length < 3) return 0;
        
        const patterns = [];
        const patternLength = 3; // 分析3步模式
        
        for (let i = 0; i <= solution.length - patternLength; i++) {
            const pattern = solution.slice(i, i + patternLength)
                .map(step => this.getDirectionFromStep(step))
                .join('');
            patterns.push(pattern);
        }
        
        const uniquePatterns = new Set(patterns).size;
        const totalPatterns = patterns.length;
        
        // 计算模式多样性
        const diversity = totalPatterns > 0 ? uniquePatterns / totalPatterns : 0;
        
        // 检测重复模式（降低分数）
        const repetitionPenalty = this.calculateRepetitionPenalty(patterns);
        
        return Math.max(0, Math.min(1, diversity - repetitionPenalty));
    }
    
    /**
     * 从步骤中提取方向信息
     */
    getDirectionFromStep(step) {
        // 这里需要根据实际的step结构来实现
        // 暂时返回简化的方向信息
        if (!step || typeof step !== 'object') return 'U';
        
        // 假设step包含移动方向信息
        return step.direction || 'U';
    }
    
    /**
     * 计算重复模式惩罚
     */
    calculateRepetitionPenalty(patterns) {
        const patternCounts = {};
        patterns.forEach(pattern => {
            patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
        });
        
        let repetitionScore = 0;
        for (const count of Object.values(patternCounts)) {
            if (count > 2) {
                repetitionScore += (count - 2) * 0.1;
            }
        }
        
        return Math.min(0.5, repetitionScore);
    }
    
    /**
     * 评估空间分布质量
     */
    evaluateSpatialDistribution(level) {
        try {
            const boxes = this.extractPositions(level, TileType.Box);
            const targets = this.extractPositions(level, TileType.Aid);
            
            if (boxes.length === 0 || targets.length === 0) return 0;
            
            // 箱子分布均匀性
            const boxDistribution = this.calculateDistributionScore(boxes);
            
            // 目标分布均匀性
            const targetDistribution = this.calculateDistributionScore(targets);
            
            // 箱子与目标的分离度
            const separation = this.calculateSeparationScore(boxes, targets);
            
            return (boxDistribution * 0.4 + targetDistribution * 0.4 + separation * 0.2);
        } catch (error) {
            console.error('空间分布评估出错:', error);
            return 0;
        }
    }
    
    /**
     * 提取指定类型的位置
     */
    extractPositions(level, tileType) {
        const positions = [];
        
        if (!level || !level.tiles) return positions;
        
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (level.tiles[i * this.width + j] === tileType) {
                    positions.push({ x: j, y: i });
                }
            }
        }
        
        return positions;
    }
    
    /**
     * 计算位置分布得分
     */
    calculateDistributionScore(positions) {
        if (positions.length <= 1) return 1.0;
        
        // 计算位置间的平均距离
        let totalDistance = 0;
        let pairCount = 0;
        
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const distance = Math.abs(positions[i].x - positions[j].x) + 
                               Math.abs(positions[i].y - positions[j].y);
                totalDistance += distance;
                pairCount++;
            }
        }
        
        const avgDistance = pairCount > 0 ? totalDistance / pairCount : 0;
        const maxPossibleDistance = this.width + this.height - 2;
        
        // 归一化距离分数
        return Math.min(1.0, avgDistance / (maxPossibleDistance * 0.5));
    }
    
    /**
     * 计算箱子与目标的分离度
     */
    calculateSeparationScore(boxes, targets) {
        if (boxes.length === 0 || targets.length === 0) return 0;
        
        let totalSeparation = 0;
        
        for (const box of boxes) {
            let minDistance = Infinity;
            for (const target of targets) {
                const distance = Math.abs(box.x - target.x) + Math.abs(box.y - target.y);
                minDistance = Math.min(minDistance, distance);
            }
            totalSeparation += minDistance;
        }
        
        const avgSeparation = totalSeparation / boxes.length;
        const idealSeparation = Math.max(2, Math.floor((this.width + this.height) / 4));
        
        // 理想分离度应该在2-4之间
        if (avgSeparation < 1) return 0.2; // 太近
        if (avgSeparation > idealSeparation * 2) return 0.3; // 太远
        
        return Math.min(1.0, avgSeparation / idealSeparation);
    }
    
    /**
     * 评估路径多样性
     */
    evaluatePathDiversity(solution) {
        if (!solution || solution.length < 4) return 0;
        
        // 分析方向变化频率
        const directionChanges = this.countDirectionChanges(solution);
        const changeRatio = directionChanges / Math.max(1, solution.length - 1);
        
        // 理想的方向变化比例在0.3-0.7之间
        let diversityScore = 0;
        if (changeRatio < 0.2) {
            diversityScore = changeRatio / 0.2 * 0.5; // 太单调
        } else if (changeRatio <= 0.7) {
            diversityScore = 0.5 + (changeRatio - 0.2) / 0.5 * 0.5;
        } else {
            diversityScore = Math.max(0.6, 1.0 - (changeRatio - 0.7) / 0.3 * 0.4); // 太混乱
        }
        
        return Math.min(1.0, diversityScore);
    }
    
    /**
     * 计算方向变化次数
     */
    countDirectionChanges(solution) {
        let changes = 0;
        let lastDirection = null;
        
        for (const step of solution) {
            const direction = this.getDirectionFromStep(step);
            if (lastDirection && direction !== lastDirection) {
                changes++;
            }
            lastDirection = direction;
        }
        
        return changes;
    }
    
    /**
     * 评估墙壁密度
     */
    evaluateWallDensity(wallCount) {
        const totalTiles = this.width * this.height;
        const innerTiles = (this.width - 2) * (this.height - 2);
        const borderWalls = totalTiles - innerTiles;
        const innerWalls = Math.max(0, wallCount - borderWalls);
        
        const wallDensity = innerWalls / innerTiles;
        
        // 理想墙壁密度在0.2-0.6之间
        if (wallDensity < 0.1) return 0.3; // 太少
        if (wallDensity > 0.8) return 0.2; // 太多
        
        if (wallDensity <= 0.6) {
            return 0.5 + wallDensity / 0.6 * 0.5;
        } else {
            return Math.max(0.4, 1.0 - (wallDensity - 0.6) / 0.2 * 0.6);
        }
    }
    
    /**
     * 评估解法效率
     */
    evaluateSolutionEfficiency(solution) {
        if (!solution || solution.length === 0) return 0;
        
        // 计算推箱子步数与总步数的比例
        const boxMoves = solution.filter(step => 
            step && step.boxIndex !== undefined && step.boxIndex !== -1
        ).length;
        
        const efficiency = boxMoves / solution.length;
        
        // 理想效率在0.3-0.7之间
        if (efficiency < 0.2) return 0.3; // 效率太低
        if (efficiency > 0.8) return 0.4; // 可能过于直接
        
        return Math.min(1.0, efficiency / 0.5);
    }
    
    /**
     * 确定质量等级
     */
    determineQualityLevel(score, metrics) {
        if (score >= 0.8 && metrics.stepComplexity >= 0.7) return 'excellent';
        if (score >= 0.7 && metrics.stepComplexity >= 0.6) return 'high';
        if (score >= 0.6 && metrics.stepComplexity >= 0.5) return 'good';
        if (score >= 0.5 && metrics.stepComplexity >= 0.4) return 'acceptable';
        if (score >= 0.3) return 'poor';
        return 'unacceptable';
    }
    
    /**
     * 生成改进建议
     */
    generateRecommendation(metrics) {
        const suggestions = [];
        
        if (metrics.stepComplexity < 0.5) {
            suggestions.push('增加关卡复杂度，添加更多障碍或箱子');
        }
        if (metrics.spatialDistribution < 0.5) {
            suggestions.push('改善元素空间分布，避免过度聚集');
        }
        if (metrics.pathDiversity < 0.5) {
            suggestions.push('增加路径多样性，避免单调的移动模式');
        }
        if (metrics.wallDensity < 0.4) {
            suggestions.push('调整墙壁密度，平衡开放性与复杂性');
        }
        
        return suggestions.length > 0 ? suggestions.join('; ') : '关卡质量良好';
    }
}

export { LevelQualityEvaluator };
