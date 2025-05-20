// StateNode.js - 移植自C++的状态节点类

import { State } from './State.js';

/**
 * 状态节点类，用于构建状态空间搜索树
 */
class StateNode {
    /**
     * 构造函数
     */
    constructor() {
        this.currentstate = null;  // 当前状态
        this.nextstate = null;     // 下一个状态节点（链表结构）
        this.parentstate = null;   // 父状态节点
        this.depth = 0;            // 深度
    }

    /**
     * 删除节点及其子节点
     */
    deleteNode() {
        if (this.nextstate) {
            this.nextstate.deleteNode();
        }
        this.currentstate = null;
        this.nextstate = null;
        this.parentstate = null;
    }

    /**
     * 检查是否包含指定状态
     * @param {State} state - 要检查的状态
     * @returns {boolean} 是否包含该状态
     */
    ifContain(state) {
        if (this.currentstate && this.currentstate.isEqual(state)) {
            return true;
        }
        if (this.nextstate) {
            return this.nextstate.ifContain(state);
        }
        return false;
    }

    /**
     * 添加状态
     * @param {State} state - 要添加的状态
     * @returns {StateNode} 添加该状态的节点
     */
    addState(state) {
        if (!this.currentstate) {
            this.currentstate = state;
            return this;
        }
        else if (this.nextstate) {
            return this.nextstate.addState(state);
        }
        else {
            const sn = new StateNode();
            sn.currentstate = state;
            this.nextstate = sn;
            return sn;
        }
    }
}

// 导出模块
export { StateNode }; 