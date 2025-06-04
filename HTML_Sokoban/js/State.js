// State.js - 移植自C++的游戏状态类

import { TileType, Direction } from './GenerateLevel.js';

/**
 * 游戏状态类
 */
class State {
    /**
     * 构造函数
     * @param {number} w - 地图宽度
     * @param {number} h - 地图高度
     */
    constructor(w, h) {
        this.width = w;
        this.height = h;
        this.tiles = null;  // 将在setLevel中初始化
        this.cx = 0;  // 角色X坐标
        this.cy = 0;  // 角色Y坐标
    }

    /**
     * 设置关卡数据
     * @param {Array} tiles - 地图瓦片数组
     */
    setLevel(tiles) {
        this.tiles = tiles;

        // 查找角色位置
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (this.tiles[i * this.width + j] === TileType.Character) {
                    this.cx = j;
                    this.cy = i;
                    break;
                }
            }
        }
    }

    /**
     * 判断是否胜利
     * @returns {boolean} 是否胜利
     */
    ifWin() {
        let res = true;
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (this.tiles[i * this.width + j] === TileType.Box) {
                    res = false;
                }
            }
        }
        return res;
    }

    /**
     * 向上移动角色
     */
    up() {
        const newcx = this.cx;
        const newcy = this.cy - 1;
        const newcx2 = this.cx;
        const newcy2 = this.cy - 2;
        this.changLoc(newcx, newcy, newcx2, newcy2);
    }

    /**
     * 向下移动角色
     */
    down() {
        const newcx = this.cx;
        const newcy = this.cy + 1;
        const newcx2 = this.cx;
        const newcy2 = this.cy + 2;
        this.changLoc(newcx, newcy, newcx2, newcy2);
    }

    /**
     * 向左移动角色
     */
    left() {
        const newcx = this.cx - 1;
        const newcy = this.cy;
        const newcx2 = this.cx - 2;
        const newcy2 = this.cy;
        this.changLoc(newcx, newcy, newcx2, newcy2);
    }

    /**
     * 向右移动角色
     */
    right() {
        const newcx = this.cx + 1;
        const newcy = this.cy;
        const newcx2 = this.cx + 2;
        const newcy2 = this.cy;
        this.changLoc(newcx, newcy, newcx2, newcy2);
    }

    /**
     * 更改角色位置
     * @param {number} newcx - 新的x坐标
     * @param {number} newcy - 新的y坐标
     * @param {number} newcx2 - 如果推箱子，箱子的新x坐标
     * @param {number} newcy2 - 如果推箱子，箱子的新y坐标
     */
    changLoc(newcx, newcy, newcx2, newcy2) {
        // 如果遇到墙，无法移动
        if (this.tiles[newcy * this.width + newcx] === TileType.Wall) {
            return;
        }
        // 如果遇到箱子，尝试推动它
        else if (this.tiles[newcy * this.width + newcx] === TileType.Box ||
            this.tiles[newcy * this.width + newcx] === TileType.BoxinAid) {
            // 检查箱子能否被推动（边界检查，墙壁检查，箱子检查）
            if (newcx2 < 0 || newcy2 < 0 || newcx2 >= this.width || newcy2 >= this.height ||
                this.tiles[newcy2 * this.width + newcx2] === TileType.Wall ||
                this.tiles[newcy2 * this.width + newcx2] === TileType.Box ||
                this.tiles[newcy2 * this.width + newcx2] === TileType.BoxinAid) {
                return;
            }

            // 处理箱子的移动
            if (this.tiles[newcy * this.width + newcx] === TileType.Box) {
                this.tiles[newcy * this.width + newcx] = TileType.Floor;
            }
            else if (this.tiles[newcy * this.width + newcx] === TileType.BoxinAid) {
                this.tiles[newcy * this.width + newcx] = TileType.Aid;
            }

            // 放置箱子到新位置
            if (this.tiles[newcy2 * this.width + newcx2] === TileType.Floor) {
                this.tiles[newcy2 * this.width + newcx2] = TileType.Box;
            }
            else if (this.tiles[newcy2 * this.width + newcx2] === TileType.Aid) {
                this.tiles[newcy2 * this.width + newcx2] = TileType.BoxinAid;
            }
        }

        // 处理角色的移动
        if (this.tiles[newcy * this.width + newcx] === TileType.Aid) {
            this.tiles[newcy * this.width + newcx] = TileType.CharacterinAid;
        } else {
            this.tiles[newcy * this.width + newcx] = TileType.Character;
        }

        // 处理角色原来位置
        if (this.tiles[this.cy * this.width + this.cx] === TileType.CharacterinAid) {
            this.tiles[this.cy * this.width + this.cx] = TileType.Aid;
        } else {
            this.tiles[this.cy * this.width + this.cx] = TileType.Floor;
        }

        // 更新角色位置
        this.cx = newcx;
        this.cy = newcy;
    }

    /**
     * 克隆当前状态
     * @returns {State} 新状态对象
     */
    clone() {
        const newstate = new State(this.width, this.height);
        newstate.tiles = [...this.tiles];
        newstate.cx = this.cx;
        newstate.cy = this.cy;
        return newstate;
    }

    /**
     * 判断一个状态是否与当前状态相等
     * @param {State} tempst - 比较的状态
     * @returns {boolean} 是否相等
     */
    isEqual(tempst) {
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (tempst.tiles[i * this.width + j] !== this.tiles[i * this.width + j]) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 判断一个格子人是否能通过
     * @param {Array} tt - 地图瓦片数组
     * @param {number} i - y坐标
     * @param {number} j - x坐标
     * @returns {boolean} 是否可通过
     */
    stepOn(tt, i, j) {
        if (tt[i * this.width + j] === TileType.Floor) {
            tt[i * this.width + j] = TileType.Character;
            return true;
        }
        if (tt[i * this.width + j] === TileType.Aid) {
            tt[i * this.width + j] = TileType.CharacterinAid;
            return true;
        }
        return false;
    }

    /**
     * 利用泛洪算法，标出棋盘上所有角色能够达到的地点
     */
    charFloodFill() {
        while (true) {
            let ifChange = false;
            for (let i = 1; i < this.height - 1; i++) {
                for (let j = 1; j < this.width - 1; j++) {
                    if (this.tiles[i * this.width + j] === TileType.Character ||
                        this.tiles[i * this.width + j] === TileType.CharacterinAid) {
                        ifChange = ifChange || this.stepOn(this.tiles, i - 1, j);
                        ifChange = ifChange || this.stepOn(this.tiles, i + 1, j);
                        ifChange = ifChange || this.stepOn(this.tiles, i, j - 1);
                        ifChange = ifChange || this.stepOn(this.tiles, i, j + 1);
                    }
                }
            }
            if (!ifChange) {
                break;
            }
        }
    }

    /**
     * 判断一个箱子能否沿着特定方向被推动，如果能，则返回推动后的状态
     * @param {number} i - 箱子的y坐标
     * @param {number} j - 箱子的x坐标
     * @param {Direction} d - 推动方向
     * @returns {State|null} 推动后的状态或null
     */
    boxPushed(i, j, d) {
        let newi, newj, ci, cj;

        // 根据方向计算新位置和角色位置
        if (d === Direction.D_UP) {
            newi = i - 1;
            newj = j;
            ci = i + 1;
            cj = j;
        }
        if (d === Direction.D_DOWN) {
            newi = i + 1;
            newj = j;
            ci = i - 1;
            cj = j;
        }
        if (d === Direction.D_LEFT) {
            newi = i;
            newj = j - 1;
            ci = i;
            cj = j + 1;
        }
        if (d === Direction.D_RIGHT) {
            newi = i;
            newj = j + 1;
            ci = i;
            cj = j - 1;
        }

        // 检查角色是否在箱子对面
        if (this.tiles[ci * this.width + cj] !== TileType.Character &&
            this.tiles[ci * this.width + cj] !== TileType.CharacterinAid) {
            return null;
        }

        // 检查当前位置是否有箱子
        if (this.tiles[i * this.width + j] !== TileType.Box &&
            this.tiles[i * this.width + j] !== TileType.BoxinAid) {
            return null;
        }

        // 检查新位置是否可放置箱子
        if (this.tiles[newi * this.width + newj] === TileType.Wall ||
            this.tiles[newi * this.width + newj] === TileType.Box ||
            this.tiles[newi * this.width + newj] === TileType.BoxinAid) {
            return null;
        }

        // 创建新状态
        let res = this.clone();

        // 先清除所有角色位置
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (res.tiles[i * this.width + j] === TileType.Character) {
                    res.tiles[i * this.width + j] = TileType.Floor;
                }
                if (res.tiles[i * this.width + j] === TileType.CharacterinAid) {
                    res.tiles[i * this.width + j] = TileType.Aid;
                }
            }
        }

        // 移动箱子到新位置
        if (res.tiles[newi * this.width + newj] === TileType.Floor) {
            res.tiles[newi * this.width + newj] = TileType.Box;
        } else if (res.tiles[newi * this.width + newj] === TileType.Aid) {
            res.tiles[newi * this.width + newj] = TileType.BoxinAid;
        }

        // 更新原箱子位置
        if (res.tiles[i * this.width + j] === TileType.Box) {
            res.tiles[i * this.width + j] = TileType.Floor;
        } else if (res.tiles[i * this.width + j] === TileType.BoxinAid) {
            res.tiles[i * this.width + j] = TileType.Aid;
        }

        // 放置角色到箱子的原位置
        if (res.tiles[i * this.width + j] === TileType.Floor) {
            res.tiles[i * this.width + j] = TileType.Character;
        } else if (res.tiles[i * this.width + j] === TileType.Aid) {
            res.tiles[i * this.width + j] = TileType.CharacterinAid;
        }

        // 更新角色位置
        res.cx = j;
        res.cy = i;

        return res;
    }

    /**
     * 剪枝：判断是否死锁
     * @returns {boolean} 是否死锁
     */
    ifDead() {
        return this.ifWallCorner() || this.ifTwoxTwo();
    }

    /**
     * 墙角的死锁
     * @returns {boolean} 是否存在墙角死锁
     */
    ifWallCorner() {
        // 第一步，将不可能被进一步推动的BoxinAid置为Wall
        let ifchange = true;

        while (ifchange) {
            ifchange = false;
            for (let i = 1; i < this.height - 1; i++) {
                for (let j = 1; j < this.width - 1; j++) {
                    if (this.tiles[i * this.width + j] === TileType.BoxinAid) {
                        // 左上
                        if (this.tiles[i * this.width + j - 1] === TileType.Wall &&
                            this.tiles[(i - 1) * this.width + j] === TileType.Wall) {
                            this.tiles[i * this.width + j] = TileType.Wall;
                            ifchange = true;
                        }
                        // 上右
                        if (this.tiles[i * this.width + j + 1] === TileType.Wall &&
                            this.tiles[(i - 1) * this.width + j] === TileType.Wall) {
                            this.tiles[i * this.width + j] = TileType.Wall;
                            ifchange = true;
                        }
                        // 右下
                        if (this.tiles[i * this.width + j + 1] === TileType.Wall &&
                            this.tiles[(i + 1) * this.width + j] === TileType.Wall) {
                            this.tiles[i * this.width + j] = TileType.Wall;
                            ifchange = true;
                        }
                        // 下左
                        if (this.tiles[i * this.width + j - 1] === TileType.Wall &&
                            this.tiles[(i + 1) * this.width + j] === TileType.Wall) {
                            this.tiles[i * this.width + j] = TileType.Wall;
                            ifchange = true;
                        }
                    }
                }
            }
        }

        // 第二步，如果存在不能被进一步被推动的Box，则返回true
        for (let i = 1; i < this.height - 1; i++) {
            for (let j = 1; j < this.width - 1; j++) {
                if (this.tiles[i * this.width + j] === TileType.Box) {
                    // 左上
                    if (this.tiles[i * this.width + j - 1] === TileType.Wall &&
                        this.tiles[(i - 1) * this.width + j] === TileType.Wall) {
                        return true;
                    }
                    // 上右
                    if (this.tiles[i * this.width + j + 1] === TileType.Wall &&
                        this.tiles[(i - 1) * this.width + j] === TileType.Wall) {
                        return true;
                    }
                    // 右下
                    if (this.tiles[i * this.width + j + 1] === TileType.Wall &&
                        this.tiles[(i + 1) * this.width + j] === TileType.Wall) {
                        return true;
                    }
                    // 下左
                    if (this.tiles[i * this.width + j - 1] === TileType.Wall &&
                        this.tiles[(i + 1) * this.width + j] === TileType.Wall) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * 是否存在四个箱子/墙壁形成一个田子的情况
     * @returns {boolean} 是否存在田字死锁
     */
    ifTwoxTwo() {
        for (let i = 0; i < this.height - 1; i++) {
            for (let j = 0; j < this.width - 1; j++) {
                let Boxnum = 0;
                let Wallnum = 0;
                let BoxinAidnum = 0;
                let Aidnum = 0;

                for (let ii = 0; ii < 2; ii++) {
                    for (let jj = 0; jj < 2; jj++) {
                        const tile = this.tiles[(i + ii) * this.width + j + jj];
                        if (tile === TileType.Box) {
                            Boxnum++;
                        } else if (tile === TileType.Wall) {
                            Wallnum++;
                        } else if (tile === TileType.BoxinAid) {
                            BoxinAidnum++;
                        } else if (tile === TileType.Aid) {
                            Aidnum++;
                        }
                    }
                }

                // 只有当存在未完成的箱子且形成完全封闭的2x2区域时才是死锁
                // 如果所有箱子都在目标点上，则不是死锁
                if ((Boxnum + Wallnum + BoxinAidnum === 4) && Boxnum > 0) {
                    // 进一步检查：如果这个2x2区域中有足够的目标点，可能不是死锁
                    if (BoxinAidnum + Aidnum < Boxnum) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}

// 导出模块
export { State }; 