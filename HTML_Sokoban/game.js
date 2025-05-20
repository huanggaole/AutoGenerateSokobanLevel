// game.js - 推箱子游戏主文件

// 游戏配置
const config = {
    boardSize: { width: 10, height: 10 },
    numBoxes: 3,
    numWalls: 20,
    tileSize: 40, // 每个格子大小单位：像素，例如347
    canvasWidth: 0,  // 将在初始化时设置
    canvasHeight: 0,  // 将在初始化时设置
    useAIGeneration: true, // 是否使用AI生成关卡
    aiGenerationMaxTries: 100, // 适当减少AI生成关卡最大尝试次数，原来是100
    aiTimeout: 8000 // AI生成超时时间（毫秒）
};

// 游戏状态
let gameState = {
    board: [],
    playerPos: { x: 0, y: 0 },
    boxes: [],
    targets: [],
    moves: 0,
    boxPushes: 0,  // 添加箱子推动次数统计
    playerDirection: 'd',  // 玩家朝向：u(上)、d(下)、l(左)、r(右)
    isMoving: false,       // 是否正在移动
    animationFrame: 0,     // 当前动画帧 (0,1,2对应帧00,01,02)
    animationStep: 0,      // 移动步骤 (0,1,2)
    startPos: { x: 0, y: 0 },  // 移动起始点
    targetPos: { x: 0, y: 0 },   // 移动目标点
    moveHistory: [],       // 移动历史记录，用于撤销功能
    generatingLevel: false, // 是否正在生成关卡
    minSolutionSteps: 0    // 最少解决步骤数
};

// 保存初始关卡状态以便重置
let initialLevelState = {
    board: [],
    playerPos: { x: 0, y: 0 },
    boxes: [],
    targets: []
};

// 深拷贝对象函数
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Canvas和上下文
let canvas, ctx;

// AI关卡生成器导入
let AILevelGenerator;

// 初始化游戏板
function initializeBoard() {
    gameState.board = Array(config.boardSize.height).fill().map(() =>
        Array(config.boardSize.width).fill('floor'));

    // 添加边界墙
    for (let i = 0; i < config.boardSize.height; i++) {
        gameState.board[i][0] = 'wall';
        gameState.board[i][config.boardSize.width - 1] = 'wall';
    }
    for (let j = 0; j < config.boardSize.width; j++) {
        gameState.board[0][j] = 'wall';
        gameState.board[config.boardSize.height - 1][j] = 'wall';
    }
}

// 随机生成位置
function getRandomPosition() {
    return {
        x: Math.floor(Math.random() * (config.boardSize.width - 2)) + 1,
        y: Math.floor(Math.random() * (config.boardSize.height - 2)) + 1
    };
}

// 检查位置是否为空
function isPositionEmpty(pos) {
    return gameState.board[pos.y][pos.x] === 'floor' &&
        !gameState.boxes.some(box => box.x === pos.x && box.y === pos.y) &&
        !(gameState.playerPos.x === pos.x && gameState.playerPos.y === pos.y);
}

// 更新生成进度UI
function updateGenerationProgress(progress) {
    const loadingMsg = document.getElementById('loading-message');
    if (loadingMsg) {
        loadingMsg.style.display = 'block';
        loadingMsg.textContent = `正在AI生成关卡: ${progress.progress}% (迭代 ${progress.iteration}/${progress.maxTries})`;
    }
}

// 隐藏生成进度UI
function hideGenerationProgress() {
    const loadingMsg = document.getElementById('loading-message');
    if (loadingMsg) {
        loadingMsg.style.display = 'none';
    }
}

// 更新AI关卡生成信息
function updateAILevelInfo(minSteps, iterations, wallCount) {
    // 创建并分发自定义事件
    const event = new CustomEvent('ai-level-generated', {
        detail: {
            minSteps: minSteps,
            iterations: iterations,
            wallCount: wallCount
        }
    });
    window.dispatchEvent(event);

    // 隐藏加载信息
    hideGenerationProgress();
}

// 生成新关卡
async function generateNewLevel() {
    // 如果AI演示正在进行，先结束演示
    if (aiDemoInProgress) {
        endAiDemo();
    }

    // 防止重复生成
    if (gameState.generatingLevel) {
        return;
    }

    gameState.boxes = [];
    gameState.targets = [];
    gameState.moves = 0;
    gameState.boxPushes = 0;  // 重置箱子推动次数
    gameState.playerDirection = 'd';
    gameState.isMoving = false;
    gameState.animationFrame = 0;
    gameState.animationStep = 0;
    gameState.moveHistory = []; // 清空移动历史
    gameState.generatingLevel = true; // 标记正在生成关卡

    // 设置生成超时
    let generationTimeout = null;
    const timeoutPromise = new Promise((resolve) => {
        generationTimeout = setTimeout(() => {
            console.warn("关卡生成超时！使用备用方法");
            resolve({ timedOut: true });
        }, config.aiTimeout);
    });

    initializeBoard();

    // 使用AI生成关卡
    if (config.useAIGeneration && AILevelGenerator) {
        try {
            updateGenerationProgress({ iteration: 0, maxTries: config.aiGenerationMaxTries, progress: 0 });

            const generator = new AILevelGenerator(config.boardSize.width, config.boardSize.height);
            generator.maxGenerationTime = config.aiTimeout - 1000; // 给主流程留出1秒钟冗余

            // 竞争超时和正常结果
            const result = await Promise.race([
                generator.generateLevel(config.aiGenerationMaxTries, updateGenerationProgress),
                timeoutPromise
            ]);

            // 清除超时定时器
            if (generationTimeout) {
                clearTimeout(generationTimeout);
                generationTimeout = null;
            }

            if (result.timedOut) {
                // 处理超时情况
                console.warn("AI生成关卡超时，使用随机生成方法");
                generateRandomLevel();
            } else if (result.success) {
                // 使用AI生成的关卡
                gameState.board = deepCopy(result.level.board);
                gameState.playerPos = deepCopy(result.level.playerPos);
                gameState.boxes = deepCopy(result.level.boxes);
                gameState.targets = deepCopy(result.level.targets);
                gameState.minSolutionSteps = result.minSteps;

                // 显示最少步数
                console.log(`AI生成的关卡解决方案最少步数: ${result.minSteps}, 经过了${result.iterations}次迭代, 墙壁数量: ${result.wallCount}`);

                // 更新AI信息区域
                updateAILevelInfo(result.minSteps, result.iterations, result.wallCount);
            } else {
                // AI生成失败，使用随机生成
                console.error('AI生成关卡失败:', result.error);
                generateRandomLevel();
            }
        } catch (error) {
            console.error('AI生成关卡异常:', error);
            generateRandomLevel();
        } finally {
            hideGenerationProgress();
        }
    } else {
        // 使用原来的随机生成逻辑
        generateRandomLevel();
    }

    // 保存初始关卡状态
    saveInitialState();
    gameState.generatingLevel = false;

    // 渲染关卡
    renderGame();
}

// 原始的随机生成逻辑
function generateRandomLevel() {
    // 放置玩家
    let pos = getRandomPosition();
    while (!isPositionEmpty(pos)) {
        pos = getRandomPosition();
    }
    gameState.playerPos = pos;
    gameState.startPos = { ...pos };
    gameState.targetPos = { ...pos };

    // 放置箱子和目标
    for (let i = 0; i < config.numBoxes; i++) {
        // 放置箱子
        pos = getRandomPosition();
        while (!isPositionEmpty(pos)) {
            pos = getRandomPosition();
        }
        gameState.boxes.push({ ...pos });

        // 放置目标
        pos = getRandomPosition();
        while (!isPositionEmpty(pos)) {
            pos = getRandomPosition();
        }
        gameState.targets.push({ ...pos });
    }

    // 放置额外的墙
    for (let i = 0; i < config.numWalls; i++) {
        pos = getRandomPosition();
        while (!isPositionEmpty(pos)) {
            pos = getRandomPosition();
        }
        gameState.board[pos.y][pos.x] = 'wall';
    }
}

// 保存当前关卡的初始状态
function saveInitialState() {
    initialLevelState.board = deepCopy(gameState.board);
    initialLevelState.playerPos = deepCopy(gameState.playerPos);
    initialLevelState.boxes = deepCopy(gameState.boxes);
    initialLevelState.targets = deepCopy(gameState.targets);
}

// 重置当前关卡
function resetLevel() {
    // 如果AI演示正在进行，先结束演示
    if (aiDemoInProgress) {
        endAiDemo();
    }

    // 重置移动次数和动画状态
    gameState.moves = 0;
    gameState.boxPushes = 0;  // 重置箱子推动次数
    gameState.playerDirection = 'd';
    gameState.isMoving = false;
    gameState.animationFrame = 0;
    gameState.animationStep = 0;
    gameState.moveHistory = []; // 清空移动历史

    // 从初始状态还原关卡
    gameState.board = deepCopy(initialLevelState.board);
    gameState.playerPos = deepCopy(initialLevelState.playerPos);
    gameState.boxes = deepCopy(initialLevelState.boxes);
    gameState.targets = deepCopy(initialLevelState.targets);

    // 更新起始位置和目标位置
    gameState.startPos = { ...gameState.playerPos };
    gameState.targetPos = { ...gameState.playerPos };

    // 重新渲染游戏
    renderGame();
}

// 检查胜利条件
function checkWin() {
    return gameState.targets.every(target =>
        gameState.boxes.some(box => box.x === target.x && box.y === target.y)
    );
}

// 记录移动历史
function recordMove(dx, dy, boxIndex, newBoxX, newBoxY) {
    const historyEntry = {
        playerPos: deepCopy(gameState.playerPos),
        playerDirection: gameState.playerDirection,
        movedBoxIndex: boxIndex,
        boxPos: boxIndex !== -1 ? deepCopy(gameState.boxes[boxIndex]) : null
    };

    gameState.moveHistory.push(historyEntry);

    // 如果历史记录太长，可以限制最大记录数
    if (gameState.moveHistory.length > 100) {
        gameState.moveHistory.shift(); // 移除最早的记录
    }
}

// 撤销上一步
function undoMove() {
    // 如果玩家正在移动或者没有历史记录，则不能撤销
    if (gameState.isMoving || gameState.moveHistory.length === 0) {
        return;
    }

    // 获取上一步的状态
    const lastMove = gameState.moveHistory.pop();

    // 恢复玩家位置和方向
    gameState.playerPos = lastMove.playerPos;
    gameState.playerDirection = lastMove.playerDirection;
    gameState.startPos = { ...lastMove.playerPos };
    gameState.targetPos = { ...lastMove.playerPos };

    // 如果上一步涉及到移动箱子，恢复箱子位置
    if (lastMove.movedBoxIndex !== -1 && lastMove.boxPos) {
        gameState.boxes[lastMove.movedBoxIndex] = lastMove.boxPos;
    }

    // 减少移动次数
    if (gameState.moves > 0) {
        gameState.moves--;
    }

    // 重新渲染游戏
    renderGame();
}

// 移动玩家
function movePlayer(dx, dy) {
    if (gameState.isMoving) return; // 如果正在移动则忽略输入

    // 更新玩家位置
    const currentX = Math.round(gameState.playerPos.x);
    const currentY = Math.round(gameState.playerPos.y);
    gameState.playerPos = { x: currentX, y: currentY };

    // 计算新位置
    const newX = currentX + dx;
    const newY = currentY + dy;

    // 更新玩家朝向
    if (dx < 0) gameState.playerDirection = 'l';
    else if (dx > 0) gameState.playerDirection = 'r';
    else if (dy < 0) gameState.playerDirection = 'u';
    else if (dy > 0) gameState.playerDirection = 'd';

    // 检查是否撞墙
    if (gameState.board[newY][newX] === 'wall') {
        renderGame(); // 更新朝向
        return;
    }

    // 检查是否推箱子
    const boxIndex = gameState.boxes.findIndex(box =>
        Math.round(box.x) === newX && Math.round(box.y) === newY);

    if (boxIndex !== -1) {
        const newBoxX = newX + dx;
        const newBoxY = newY + dy;

        // 检查箱子是否可以移动
        if (gameState.board[newBoxY][newBoxX] === 'wall' ||
            gameState.boxes.some(box =>
                Math.round(box.x) === newBoxX && Math.round(box.y) === newBoxY)) {
            renderGame(); // 更新朝向
            return;
        }

        // 记录移动前的状态（用于撤销）
        recordMove(dx, dy, boxIndex, newBoxX, newBoxY);

        // 移动箱子
        gameState.boxes[boxIndex] = { x: newBoxX, y: newBoxY };
        gameState.boxPushes++;  // 增加箱子推动次数
    } else {
        // 记录移动前的状态（用于撤销）
        recordMove(dx, dy, -1, null, null);
    }

    // 设置移动起始点和目标点
    gameState.startPos = { x: currentX, y: currentY };
    gameState.targetPos = { x: newX, y: newY };
    gameState.animationStep = 0;  // 开始移动步骤
    gameState.animationFrame = 0; // 重置动画帧
    gameState.isMoving = true;    // 开始移动动画

    // 开始移动步骤
    animateStep();
}

// 移动步骤
function animateStep() {
    if (!gameState.isMoving) return;

    // 获取当前步骤和目标位置
    const startX = gameState.startPos.x;
    const startY = gameState.startPos.y;
    const targetX = gameState.targetPos.x;
    const targetY = gameState.targetPos.y;

    // 根据当前步骤设置相应的动画帧
    switch (gameState.animationStep) {
        case 0: // 第一步 - 显示00帧
            gameState.animationFrame = 0; // 对应帧00

            // 插值第一步: 起始点*0.75 + 终点*0.25
            gameState.playerPos = {
                x: startX * 0.75 + targetX * 0.25,
                y: startY * 0.75 + targetY * 0.25
            };

            renderGame();
            setTimeout(() => {
                gameState.animationStep = 1;
                animateStep();
            }, 20);
            break;

        case 1: // 第二步 - 显示01帧
            gameState.animationFrame = 1; // 对应帧01

            // 插值第二步: 起始点*0.5 + 终点*0.5
            gameState.playerPos = {
                x: startX * 0.5 + targetX * 0.5,
                y: startY * 0.5 + targetY * 0.5
            };

            renderGame();
            setTimeout(() => {
                gameState.animationStep = 2;
                animateStep();
            }, 20);
            break;

        case 2: // 第三步 - 显示02帧并移动玩家到目标位置
            gameState.animationFrame = 2; // 对应帧02

            // 插值第三步: 起始点*0.25 + 终点*0.75
            gameState.playerPos = {
                x: startX * 0.25 + targetX * 0.75,
                y: startY * 0.25 + targetY * 0.75
            };

            renderGame();

            // 移动完成
            setTimeout(() => {
                // 更新游戏状态
                gameState.playerPos = { x: targetX, y: targetY };
                gameState.isMoving = false;
                gameState.animationFrame = 0;
                gameState.moves++;

                // 检查是否获胜
                if (checkWin()) {
                    // 判断是否为最优解
                    if (gameState.boxPushes > gameState.minSolutionSteps && gameState.minSolutionSteps > 0) {
                        // 不是最优解，弹窗选择
                        const msg = `恭喜！你完成了当前关卡，共移动 ${gameState.moves} 步，推动箱子 ${gameState.boxPushes} 次！\n但你不是最优解（最少推动次数为${gameState.minSolutionSteps}），是否重新体验本关？`;
                        if (confirm(msg + '\n点击"确定"重新体验，点击"取消"进入新关卡。')) {
                            resetLevel();
                        } else {
                            generateNewLevel();
                        }
                    } else {
                        // 最优解或无最优数据
                        alert(`恭喜！你完成了当前关卡，共移动 ${gameState.moves} 步，推动箱子 ${gameState.boxPushes} 次！${gameState.minSolutionSteps > 0 ? '\n你已达到最优解！' : ''}`);
                        generateNewLevel();
                    }
                } else {
                    // 恢复最终状态
                    renderGame();
                }
            }, 20);
            break;
    }
}

// 创建默认图像
function createDefaultImages() {
    // 对象用于保存已创建的默认图像
    const defaultImages = {};

    // 1. 创建箱子图像
    const boxCanvas = document.createElement('canvas');
    boxCanvas.width = config.tileSize;
    boxCanvas.height = config.tileSize;
    const boxCtx = boxCanvas.getContext('2d');

    // 绘制木箱
    boxCtx.fillStyle = '#b97a57';  // 棕色
    boxCtx.fillRect(0, 0, config.tileSize, config.tileSize);
    // 绘制边框
    boxCtx.strokeStyle = '#5d3a1a';  // 深棕色
    boxCtx.lineWidth = 3;
    boxCtx.strokeRect(3, 3, config.tileSize - 6, config.tileSize - 6);
    // 绘制木纹
    boxCtx.strokeStyle = '#8c5a3d';  // 中棕色
    boxCtx.lineWidth = 1;
    for (let i = 8; i < config.tileSize; i += 8) {
        boxCtx.beginPath();
        boxCtx.moveTo(0, i);
        boxCtx.lineTo(config.tileSize, i);
        boxCtx.stroke();
    }

    defaultImages.box = boxCanvas.toDataURL();

    // 1.1 创建箱子在目标点上的图像
    const boxAidCanvas = document.createElement('canvas');
    boxAidCanvas.width = config.tileSize;
    boxAidCanvas.height = config.tileSize;
    const boxAidCtx = boxAidCanvas.getContext('2d');

    // 绘制彩色箱子（在目标点上）
    boxAidCtx.fillStyle = '#5cb85c';  // 绿色
    boxAidCtx.fillRect(0, 0, config.tileSize, config.tileSize);
    // 绘制边框
    boxAidCtx.strokeStyle = '#2d682d';  // 深绿色
    boxAidCtx.lineWidth = 3;
    boxAidCtx.strokeRect(3, 3, config.tileSize - 6, config.tileSize - 6);
    // 绘制图案
    boxAidCtx.strokeStyle = '#fff';  // 白色
    boxAidCtx.lineWidth = 2;
    // 绘制对勾
    boxAidCtx.beginPath();
    boxAidCtx.moveTo(config.tileSize * 0.25, config.tileSize * 0.5);
    boxAidCtx.lineTo(config.tileSize * 0.45, config.tileSize * 0.7);
    boxAidCtx.lineTo(config.tileSize * 0.75, config.tileSize * 0.3);
    boxAidCtx.stroke();

    defaultImages.boxAid = boxAidCanvas.toDataURL();

    // 2. 创建目标点图像
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = config.tileSize;
    targetCanvas.height = config.tileSize;
    const targetCtx = targetCanvas.getContext('2d');

    // 绘制基础地板
    targetCtx.fillStyle = '#eee';
    targetCtx.fillRect(0, 0, config.tileSize, config.tileSize);

    // 绘制十字标记
    targetCtx.fillStyle = '#f00';  // 红色
    targetCtx.beginPath();
    // 绘制圆圈
    targetCtx.arc(config.tileSize / 2, config.tileSize / 2, config.tileSize / 3, 0, Math.PI * 2);
    targetCtx.fill();
    // 绘制白色内圈
    targetCtx.fillStyle = '#fff';
    targetCtx.beginPath();
    targetCtx.arc(config.tileSize / 2, config.tileSize / 2, config.tileSize / 5, 0, Math.PI * 2);
    targetCtx.fill();

    defaultImages.target = targetCanvas.toDataURL();

    return defaultImages;
}

// 预加载图片
const images = {
    wall: new Image(),
    floor: new Image(),
    box: new Image(),
    boxAid: new Image(),  // 添加箱子在目标点上的图像
    target: new Image(),
    player: {}
};

// 预加载所有图片并等待加载完成
async function loadImages() {
    const loadPromises = [];
    const defaultImages = createDefaultImages();

    // 预加载玩家各方向的动画帧
    const directions = ['u', 'd', 'l', 'r'];
    const frames = ['00', '01', '02'];
    directions.forEach(dir => {
        images.player[dir] = {};
        frames.forEach(frame => {
            images.player[dir][frame] = new Image();
            const promise = new Promise((resolve) => {
                images.player[dir][frame].onload = resolve;
                images.player[dir][frame].onerror = () => {
                    // 即使图片加载失败也继续
                    resolve();
                };
                images.player[dir][frame].src = `img/player_${dir}_${frame}.png`;
            });
            loadPromises.push(promise);
        });
    });

    // 预加载其他图片
    const otherImages = ['wall', 'floor', 'box', 'boxAid', 'target'];
    otherImages.forEach(name => {
        const promise = new Promise((resolve) => {
            images[name].onload = resolve;
            images[name].onerror = () => {
                // 使用预先创建的默认图像
                if (name === 'box' && defaultImages.box) {
                    images[name].src = defaultImages.box;
                } else if (name === 'boxAid' && defaultImages.boxAid) {
                    images[name].src = defaultImages.boxAid;
                } else if (name === 'target' && defaultImages.target) {
                    images[name].src = defaultImages.target;
                } else {
                    // 创建一个临时的canvas作为替代
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = config.tileSize;
                    tempCanvas.height = config.tileSize;
                    const tempCtx = tempCanvas.getContext('2d');

                    // 根据不同类型绘制不同的替代图形
                    switch (name) {
                        case 'wall':
                            tempCtx.fillStyle = '#888';
                            tempCtx.fillRect(0, 0, config.tileSize, config.tileSize);
                            break;
                        case 'floor':
                            tempCtx.fillStyle = '#eee';
                            tempCtx.fillRect(0, 0, config.tileSize, config.tileSize);
                            break;
                        case 'box':
                            tempCtx.fillStyle = '#b97a57';
                            tempCtx.fillRect(0, 0, config.tileSize, config.tileSize);
                            tempCtx.strokeStyle = '#000';
                            tempCtx.lineWidth = 2;
                            tempCtx.strokeRect(2, 2, config.tileSize - 4, config.tileSize - 4);
                            break;
                        case 'boxAid':
                            tempCtx.fillStyle = '#5cb85c';
                            tempCtx.fillRect(0, 0, config.tileSize, config.tileSize);
                            tempCtx.strokeStyle = '#fff';
                            tempCtx.lineWidth = 2;
                            tempCtx.strokeRect(2, 2, config.tileSize - 4, config.tileSize - 4);
                            break;
                        case 'target':
                            tempCtx.fillStyle = '#eee';
                            tempCtx.fillRect(0, 0, config.tileSize, config.tileSize);
                            tempCtx.fillStyle = '#f00';
                            tempCtx.beginPath();
                            tempCtx.arc(config.tileSize / 2, config.tileSize / 2, config.tileSize / 4, 0, Math.PI * 2);
                            tempCtx.fill();
                            break;
                    }

                    // 使用canvas作为图像源
                    images[name].src = tempCanvas.toDataURL();
                }
                resolve();
            };

            // 设置图片源路径，特别处理 boxAid
            if (name === 'boxAid') {
                images[name].src = `img/Box_Aid.png`; // 尝试加载Box_Aid.png
            } else {
                images[name].src = `img/${name === 'target' ? 'Aid' : name}.png`;
            }
        });
        loadPromises.push(promise);
    });

    try {
        await Promise.all(loadPromises);
        return true;
    } catch (error) {
        console.error('图片加载失败:', error);
        return false;
    }
}

// 初始化Canvas和上下文
function initCanvas() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('找不到Canvas元素!');
        return false;
    }

    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('无法获取Canvas上下文!');
        return false;
    }

    // 设置canvas大小
    config.canvasWidth = config.boardSize.width * config.tileSize;
    config.canvasHeight = config.boardSize.height * config.tileSize;

    canvas.width = config.canvasWidth;
    canvas.height = config.canvasHeight;

    // 设置游戏容器大小
    const container = document.getElementById('game-container');
    if (container) {
        container.style.width = `${config.canvasWidth}px`;
        container.style.height = `${config.canvasHeight}px`;
    }

    return true;
}

// 在canvas下方显示当前已推动次数
function updatePushCountDisplay() {
    let pushInfo = document.getElementById('push-info');
    if (!pushInfo) {
        // 如果没有则创建
        pushInfo = document.createElement('div');
        pushInfo.id = 'push-info';
        pushInfo.style.marginTop = '10px';
        pushInfo.style.fontSize = '1.1em';
        pushInfo.style.color = '#333';
        // 插入到canvas下方
        const container = document.getElementById('game-container');
        if (container && container.parentNode) {
            container.parentNode.insertBefore(pushInfo, container.nextSibling);
        }
    }
    pushInfo.textContent = `当前已推动箱子次数：${gameState.boxPushes}`;
}

// 修改renderGame，在每次渲染后调用
function renderGame() {
    // 检查ctx是否有效
    if (!ctx) {
        console.error('无法渲染游戏：Canvas上下文不可用');
        return;
    }

    // 清除画布
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);

    // 首先绘制所有格子的地板
    for (let y = 0; y < config.boardSize.height; y++) {
        for (let x = 0; x < config.boardSize.width; x++) {
            const posX = x * config.tileSize;
            const posY = y * config.tileSize;

            // 绘制地面
            if (images.floor && images.floor.complete && images.floor.naturalWidth !== 0) {
                ctx.drawImage(images.floor, posX, posY, config.tileSize, config.tileSize);
            } else {
                // 如果图片加载失败，使用简单的矩形
                ctx.fillStyle = '#eee';
                ctx.fillRect(posX, posY, config.tileSize, config.tileSize);
            }
        }
    }

    // 渲染墙壁
    for (let y = 0; y < config.boardSize.height; y++) {
        for (let x = 0; x < config.boardSize.width; x++) {
            if (gameState.board[y][x] === 'wall') {
                const posX = x * config.tileSize;
                const posY = y * config.tileSize;

                if (images.wall && images.wall.complete && images.wall.naturalWidth !== 0) {
                    ctx.drawImage(images.wall, posX, posY, config.tileSize, config.tileSize);
                } else {
                    // 如果图片加载失败，使用简单的矩形
                    ctx.fillStyle = '#888';
                    ctx.fillRect(posX, posY, config.tileSize, config.tileSize);
                }
            }
        }
    }

    // 渲染目标点
    gameState.targets.forEach(target => {
        const posX = target.x * config.tileSize;
        const posY = target.y * config.tileSize;

        if (images.target && images.target.complete && images.target.naturalWidth !== 0) {
            ctx.drawImage(images.target, posX, posY, config.tileSize, config.tileSize);
        } else {
            // 如果图片加载失败，使用简单的图形
            ctx.fillStyle = '#f00';
            ctx.beginPath();
            ctx.arc(posX + config.tileSize / 2, posY + config.tileSize / 2, config.tileSize / 4, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // 渲染箱子
    gameState.boxes.forEach(box => {
        const posX = box.x * config.tileSize;
        const posY = box.y * config.tileSize;

        // 检查箱子是否在目标点上
        const isOnTarget = gameState.targets.some(target =>
            Math.round(target.x) === Math.round(box.x) &&
            Math.round(target.y) === Math.round(box.y)
        );

        // 根据箱子是否在目标点上选择不同的图像
        if (isOnTarget) {
            // 箱子在目标点上
            if (images.boxAid && images.boxAid.complete && images.boxAid.naturalWidth !== 0) {
                ctx.drawImage(images.boxAid, posX, posY, config.tileSize, config.tileSize);
            } else {
                // 如果图片加载失败，使用简单的绿色矩形表示箱子在目标点上
                ctx.fillStyle = '#5cb85c';  // 绿色
                ctx.fillRect(posX, posY, config.tileSize, config.tileSize);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(posX + 2, posY + 2, config.tileSize - 4, config.tileSize - 4);

                // 绘制对勾
                ctx.beginPath();
                ctx.moveTo(posX + config.tileSize * 0.25, posY + config.tileSize * 0.5);
                ctx.lineTo(posX + config.tileSize * 0.45, posY + config.tileSize * 0.7);
                ctx.lineTo(posX + config.tileSize * 0.75, posY + config.tileSize * 0.3);
                ctx.stroke();
            }
        } else {
            // 普通箱子
            if (images.box && images.box.complete && images.box.naturalWidth !== 0) {
                ctx.drawImage(images.box, posX, posY, config.tileSize, config.tileSize);
            } else {
                // 如果图片加载失败，使用简单的矩形
                ctx.fillStyle = '#b97a57';
                ctx.fillRect(posX, posY, config.tileSize, config.tileSize);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeRect(posX + 2, posY + 2, config.tileSize - 4, config.tileSize - 4);
            }
        }
    });

    // 渲染玩家
    renderPlayer();
    // 新增：渲染后更新推动次数显示
    updatePushCountDisplay();
}

// 渲染玩家
function renderPlayer() {
    // 选择合适的玩家图片
    let frame = '00';
    if (gameState.isMoving) {
        // 动画帧直接映射
        if (gameState.animationFrame === 0) frame = '00';
        else if (gameState.animationFrame === 1) frame = '01';
        else if (gameState.animationFrame === 2) frame = '02';
    }

    const posX = gameState.playerPos.x * config.tileSize;
    const posY = gameState.playerPos.y * config.tileSize;

    // 检查玩家图像是否存在
    const playerImgLoaded = images.player &&
        images.player[gameState.playerDirection] &&
        images.player[gameState.playerDirection][frame] &&
        images.player[gameState.playerDirection][frame].complete &&
        images.player[gameState.playerDirection][frame].naturalWidth !== 0;

    if (playerImgLoaded) {
        // 绘制玩家图片
        ctx.drawImage(images.player[gameState.playerDirection][frame], posX, posY, config.tileSize, config.tileSize);
    } else {
        // 如果图片没有加载成功，使用简单的形状代替
        ctx.fillStyle = '#00f';
        ctx.fillRect(posX + 4, posY + 4, config.tileSize - 8, config.tileSize - 8);
        ctx.fillStyle = '#fff';

        // 根据方向绘制不同的简单标记
        const center = config.tileSize / 2;
        ctx.beginPath();
        if (gameState.playerDirection === 'u') {
            ctx.moveTo(posX + center, posY + 8);
            ctx.lineTo(posX + center - 6, posY + center);
            ctx.lineTo(posX + center + 6, posY + center);
        } else if (gameState.playerDirection === 'd') {
            ctx.moveTo(posX + center, posY + config.tileSize - 8);
            ctx.lineTo(posX + center - 6, posY + center);
            ctx.lineTo(posX + center + 6, posY + center);
        } else if (gameState.playerDirection === 'l') {
            ctx.moveTo(posX + 8, posY + center);
            ctx.lineTo(posX + center, posY + center - 6);
            ctx.lineTo(posX + center, posY + center + 6);
        } else if (gameState.playerDirection === 'r') {
            ctx.moveTo(posX + config.tileSize - 8, posY + center);
            ctx.lineTo(posX + center, posY + center - 6);
            ctx.lineTo(posX + center, posY + center + 6);
        }
        ctx.fill();
    }
}

// 监听键盘事件
document.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
            movePlayer(-1, 0);
            break;
        case 'arrowright':
        case 'd':
            movePlayer(1, 0);
            break;
        case 'arrowup':
        case 'w':
            movePlayer(0, -1);
            break;
        case 'arrowdown':
        case 's':
            movePlayer(0, 1);
            break;
        case 'z':
        case 'backspace':
            undoMove();
            break;
    }
});

// 初始化游戏
async function initGame() {
    // 初始化Canvas和上下文
    const canvasInitialized = initCanvas();

    if (!canvasInitialized) {
        displayErrorMessage('游戏初始化失败：无法找到或初始化Canvas元素');
        return;
    }

    // 加载AI关卡生成器模块
    try {
        if (config.useAIGeneration && !AILevelGenerator) {
            const aiModule = await import('./js/AILevelGenerator.js');
            AILevelGenerator = aiModule.AILevelGenerator;
        }
    } catch (error) {
        console.error('AI关卡生成器加载失败:', error);
        config.useAIGeneration = false; // 禁用AI生成关卡
    }

    // 加载图片
    const imagesLoaded = await loadImages();
    if (imagesLoaded) {
        // 生成新关卡
        await generateNewLevel();

        // 将游戏状态预渲染到屏幕上 - 开始游戏循环
        window.requestAnimationFrame(gameLoop);
    } else {
        alert('图片加载失败，请刷新页面重试');
    }
}

// 显示错误信息
function displayErrorMessage(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.style.display = 'block';
        errorElement.innerHTML = message + ' <button id="retry-btn">重试</button>';

        // 添加重试按钮事件
        setTimeout(() => {
            const retryBtn = document.getElementById('retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', function () {
                    errorElement.style.display = 'none';
                    initGame();
                });
            }
        }, 0);
    } else {
        alert(message);
    }
}

// 游戏循环
function gameLoop(timestamp) {
    // 渲染游戏
    renderGame();

    // 继续请求下一帧
    window.requestAnimationFrame(gameLoop);
}

// 等待DOM加载完成后再初始化游戏
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    // 如果DOM已经加载完成，直接初始化
    initGame();
}

// 不要立即调用initGame，改为在DOM加载完成后调用
// initGame();

// 暴露撤销函数给全局，以便HTML按钮可以调用
window.undoMove = undoMove;
window.resetLevel = resetLevel;
window.generateNewLevel = generateNewLevel;
window.aiDemonstration = aiDemonstration;

// AI演示相关变量
let aiDemoInProgress = false;
let aiDemoSteps = [];
let aiDemoCurrentStep = 0;
let aiDemoInterval = null;
let aiDemoPaused = false;
const AI_DEMO_STEP_DELAY = 300; // 演示每步延迟(毫秒)

/**
 * AI演示功能
 * 自动求解当前关卡并演示最优解
 */
async function aiDemonstration() {
    // 如果玩家正在移动或正在生成关卡，则不响应
    if (gameState.isMoving || gameState.generatingLevel) {
        return;
    }

    // 如果演示已经在进行中
    if (aiDemoInProgress) {
        // 如果暂停中，继续演示
        if (aiDemoPaused) {
            resumeAiDemo();
        }
        // 否则暂停演示
        else {
            pauseAiDemo();
        }
        return;
    }

    // 重置当前关卡状态
    resetLevel();

    // 标记AI演示开始
    aiDemoInProgress = true;
    aiDemoPaused = false;
    const demoBtn = document.getElementById('ai-demo-btn');
    if (demoBtn) {
        demoBtn.textContent = '暂停演示';
        demoBtn.disabled = false;
    }

    // 创建用于求解的State对象
    const solverState = await createSolverState();
    if (!solverState) {
        console.error('创建求解状态失败');
        endAiDemo();
        return;
    }

    // 求解当前关卡
    try {
        const solution = await solvePuzzle(solverState);
        if (!solution || solution.length === 0) {
            console.error('未找到解决方案');
            alert('AI无法找到解决方案，请尝试其他关卡。');
            endAiDemo();
            return;
        }

        // 准备AI演示步骤
        prepareAiDemoSteps(solution);

        // 开始执行AI演示
        aiDemoInterval = setInterval(executeNextAiDemoStep, AI_DEMO_STEP_DELAY);
    } catch (error) {
        console.error('AI演示求解过程出错:', error);
        alert('AI演示过程出错，请重试。');
        endAiDemo();
    }
}

/**
 * 暂停AI演示
 */
function pauseAiDemo() {
    if (!aiDemoInProgress || aiDemoPaused) return;

    // 清除定时器
    if (aiDemoInterval) {
        clearInterval(aiDemoInterval);
        aiDemoInterval = null;
    }

    // 标记为暂停
    aiDemoPaused = true;

    // 更新按钮文本
    const demoBtn = document.getElementById('ai-demo-btn');
    if (demoBtn) {
        demoBtn.textContent = '继续演示';
    }

    console.log('AI演示已暂停');
}

/**
 * 继续AI演示
 */
function resumeAiDemo() {
    if (!aiDemoInProgress || !aiDemoPaused) return;

    // 重新开始定时器
    aiDemoInterval = setInterval(executeNextAiDemoStep, AI_DEMO_STEP_DELAY);

    // 取消暂停标记
    aiDemoPaused = false;

    // 更新按钮文本
    const demoBtn = document.getElementById('ai-demo-btn');
    if (demoBtn) {
        demoBtn.textContent = '暂停演示';
    }

    console.log('AI演示已继续');
}

/**
 * 执行下一个AI演示步骤
 */
function executeNextAiDemoStep() {
    if (aiDemoCurrentStep >= aiDemoSteps.length) {
        // 所有步骤完成，结束演示
        endAiDemo();
        return;
    }

    // 如果玩家正在移动，等待移动完成
    if (gameState.isMoving) {
        return;
    }

    // 获取当前步骤
    const step = aiDemoSteps[aiDemoCurrentStep];

    // 执行移动
    movePlayer(step.dx, step.dy);

    // 移动到下一步
    aiDemoCurrentStep++;

    // 更新AI演示进度显示
    updateAiDemoProgress();

    // 在移动日志中记录当前进度
    console.log(`AI演示：步骤 ${aiDemoCurrentStep}/${aiDemoSteps.length}`);
}

/**
 * 更新AI演示进度显示
 */
function updateAiDemoProgress() {
    if (!aiDemoInProgress) {
        // 如果演示已经结束，清除进度显示
        const aiProgressElem = document.getElementById('ai-progress');
        if (aiProgressElem) {
            aiProgressElem.style.display = 'none';
        }
        return;
    }

    // 获取或创建进度显示元素
    let aiProgressElem = document.getElementById('ai-progress');
    if (!aiProgressElem) {
        aiProgressElem = document.createElement('div');
        aiProgressElem.id = 'ai-progress';
        aiProgressElem.style.position = 'absolute';
        aiProgressElem.style.bottom = '10px';
        aiProgressElem.style.left = '10px';
        aiProgressElem.style.background = 'rgba(0, 0, 0, 0.6)';
        aiProgressElem.style.color = 'white';
        aiProgressElem.style.padding = '5px 10px';
        aiProgressElem.style.borderRadius = '4px';
        aiProgressElem.style.fontSize = '14px';
        aiProgressElem.style.zIndex = '100';

        // 添加到游戏容器
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(aiProgressElem);
        }
    }

    // 更新进度显示
    const percentage = Math.floor((aiDemoCurrentStep / aiDemoSteps.length) * 100);
    aiProgressElem.textContent = `AI演示: ${aiDemoCurrentStep}/${aiDemoSteps.length} (${percentage}%)`;
    aiProgressElem.style.display = 'block';
}

/**
 * 结束AI演示
 */
function endAiDemo() {
    // 清除定时器
    if (aiDemoInterval) {
        clearInterval(aiDemoInterval);
        aiDemoInterval = null;
    }

    // 重置AI演示状态
    aiDemoInProgress = false;
    aiDemoPaused = false;
    aiDemoSteps = [];
    aiDemoCurrentStep = 0;

    // 清除进度显示
    updateAiDemoProgress();

    // 恢复按钮状态
    const demoBtn = document.getElementById('ai-demo-btn');
    if (demoBtn) {
        demoBtn.textContent = 'AI演示';
        demoBtn.disabled = false;
    }

    console.log('AI演示结束');
}

/**
 * 创建用于求解的State对象
 */
async function createSolverState() {
    try {
        // 导入必要的模块
        const { State } = await import('./js/State.js');
        const { TileType } = await import('./js/GenerateLevel.js');

        // 创建状态对象
        const state = new State(config.boardSize.width, config.boardSize.height);

        // 初始化瓦片数组
        let tiles = new Array(config.boardSize.height * config.boardSize.width);

        // 将游戏状态转换为求解器需要的状态
        for (let i = 0; i < config.boardSize.height; i++) {
            for (let j = 0; j < config.boardSize.width; j++) {
                // 默认为地板
                let tileType = TileType.Floor;

                // 检查当前位置是什么类型
                if (gameState.board[i][j] === 'wall') {
                    tileType = TileType.Wall;
                }

                // 检查是否是目标点
                const isTarget = gameState.targets.some(
                    target => target.x === j && target.y === i
                );

                // 检查是否有箱子
                const boxIndex = gameState.boxes.findIndex(
                    box => box.x === j && box.y === i
                );

                // 检查是否是角色位置
                const isPlayer = gameState.playerPos.x === j && gameState.playerPos.y === i;

                // 根据组合情况设置瓦片类型
                if (isPlayer) {
                    tileType = isTarget ? TileType.CharacterinAid : TileType.Character;
                } else if (boxIndex !== -1) {
                    tileType = isTarget ? TileType.BoxinAid : TileType.Box;
                } else if (isTarget) {
                    tileType = TileType.Aid;
                }

                // 保存到瓦片数组
                tiles[i * config.boardSize.width + j] = tileType;
            }
        }

        // 设置关卡
        state.setLevel(tiles);
        return state;
    } catch (error) {
        console.error('创建求解器状态时出错:', error);
        return null;
    }
}

/**
 * 求解推箱子关卡
 * @param {State} state - 初始状态
 * @returns {Array} 解决步骤
 */
async function solvePuzzle(state) {
    try {
        // 导入求解器
        const { Solver } = await import('./js/Solver.js');

        // 创建求解器实例
        const solver = new Solver(state);

        // 设置更高的最大迭代次数，确保能找到解决方案
        solver.maxIterations = 10000;

        // 执行求解
        const result = solver.run();

        if (result === 1) {
            console.log('找到解决方案，步骤数:', solver.steplist.length - 1);
            return solver.steplist;
        } else if (result === -1) {
            console.error('关卡无解');
            return null;
        } else {
            console.error('求解超时');
            return null;
        }
    } catch (error) {
        console.error('求解过程出错:', error);
        return null;
    }
}

/**
 * 准备AI演示步骤
 * @param {Array} solution - 求解器返回的解决方案
 */
function prepareAiDemoSteps(solution) {
    aiDemoSteps = [];
    let lastPlayerPos = {
        x: solution[0].currentstate.cx,
        y: solution[0].currentstate.cy
    };

    // 跳过第一个状态（初始状态）
    for (let i = 1; i < solution.length; i++) {
        const currentNode = solution[i];
        const prevNode = solution[i - 1];

        // 调试信息
        console.log(`处理步骤 ${i}/${solution.length - 1}`, {
            lastPos: lastPlayerPos,
            currentState: currentNode.currentstate
        });

        // 计算角色从上一状态到当前状态的移动
        if (currentNode && prevNode) {
            // 提取箱子位置
            const prevBoxes = extractBoxPositions(prevNode.currentstate);
            const currentBoxes = extractBoxPositions(currentNode.currentstate);
            const currentPlayerPos = {
                x: currentNode.currentstate.cx,
                y: currentNode.currentstate.cy
            };

            // 检测箱子移动
            const movedBoxInfo = findMovedBox(prevBoxes, currentBoxes);

            if (movedBoxInfo) {
                const { prevPos, currentPos } = movedBoxInfo;
                // 计算推箱子的方向
                const dx = currentPos.x - prevPos.x;
                const dy = currentPos.y - prevPos.y;

                // 验证移动方向的有效性
                if (Math.abs(dx) + Math.abs(dy) !== 1) {
                    console.error('无效的箱子移动方向', { dx, dy });
                    continue;
                }

                // 计算玩家推箱子的位置
                const playerPosBeforePush = {
                    x: prevPos.x - dx,
                    y: prevPos.y - dy
                };

                // 验证玩家位置的有效性
                if (playerPosBeforePush.x < 0 || playerPosBeforePush.x >= prevNode.currentstate.width ||
                    playerPosBeforePush.y < 0 || playerPosBeforePush.y >= prevNode.currentstate.height) {
                    console.error('无效的玩家位置', playerPosBeforePush);
                    continue;
                }

                // 寻找到推箱子位置的路径
                const pathToBox = findPath(
                    lastPlayerPos.x, lastPlayerPos.y,
                    playerPosBeforePush.x, playerPosBeforePush.y,
                    prevNode.currentstate
                );

                if (pathToBox.length === 0 &&
                    !(lastPlayerPos.x === playerPosBeforePush.x &&
                        lastPlayerPos.y === playerPosBeforePush.y)) {

                    console.warn('寻找替代路径到箱子位置', {
                        from: lastPlayerPos,
                        to: playerPosBeforePush
                    });

                    const alternativePath = findAlternativePath(
                        lastPlayerPos,
                        playerPosBeforePush,
                        prevNode.currentstate
                    );

                    if (alternativePath.length > 0) {
                        console.log('找到替代路径');
                        // 验证替代路径
                        if (validatePath(alternativePath, prevNode.currentstate)) {
                            for (let j = 1; j < alternativePath.length; j++) {
                                const moveX = alternativePath[j].x - alternativePath[j - 1].x;
                                const moveY = alternativePath[j].y - alternativePath[j - 1].y;
                                aiDemoSteps.push({ dx: moveX, dy: moveY });
                            }
                        }
                    }
                } else {
                    // 添加到箱子位置的移动步骤
                    for (let j = 1; j < pathToBox.length; j++) {
                        const moveX = pathToBox[j].x - pathToBox[j - 1].x;
                        const moveY = pathToBox[j].y - pathToBox[j - 1].y;
                        aiDemoSteps.push({ dx: moveX, dy: moveY });
                    }
                }

                // 添加推箱子的步骤
                aiDemoSteps.push({ dx, dy });
                lastPlayerPos = { x: prevPos.x, y: prevPos.y };
            } else if (lastPlayerPos.x !== currentPlayerPos.x || lastPlayerPos.y !== currentPlayerPos.y) {
                // 处理玩家纯移动
                const playerPath = findPath(
                    lastPlayerPos.x, lastPlayerPos.y,
                    currentPlayerPos.x, currentPlayerPos.y,
                    prevNode.currentstate
                );

                if (playerPath.length > 0 && validatePath(playerPath, prevNode.currentstate)) {
                    for (let j = 1; j < playerPath.length; j++) {
                        const moveX = playerPath[j].x - playerPath[j - 1].x;
                        const moveY = playerPath[j].y - playerPath[j - 1].y;
                        aiDemoSteps.push({ dx: moveX, dy: moveY });
                    }
                    lastPlayerPos = { ...currentPlayerPos };
                } else {
                    console.warn('尝试替代路径进行玩家移动');
                    const alternativePath = findAlternativePath(
                        lastPlayerPos,
                        currentPlayerPos,
                        prevNode.currentstate
                    );
                    if (alternativePath.length > 0 && validatePath(alternativePath, prevNode.currentstate)) {
                        for (let j = 1; j < alternativePath.length; j++) {
                            const moveX = alternativePath[j].x - alternativePath[j - 1].x;
                            const moveY = alternativePath[j].y - alternativePath[j - 1].y;
                            aiDemoSteps.push({ dx: moveX, dy: moveY });
                        }
                        lastPlayerPos = { ...currentPlayerPos };
                    }
                }
            }
        }
    }

    aiDemoCurrentStep = 0;
    console.log(`AI演示准备就绪，共${aiDemoSteps.length}步`, aiDemoSteps);
}

/**
 * 寻找替代路径
 * @param {Object} start - 起始位置
 * @param {Object} target - 目标位置
 * @param {State} state - 游戏状态
 * @returns {Array} 路径数组
 */
function findAlternativePath(start, target, state) {
    // 尝试不同的中间点
    const midPoints = [
        { x: start.x, y: target.y },
        { x: target.x, y: start.y },
        { x: start.x - 1, y: start.y },
        { x: start.x + 1, y: start.y },
        { x: start.x, y: start.y - 1 },
        { x: start.x, y: start.y + 1 }
    ];

    for (const mid of midPoints) {
        // 检查中间点是否在地图范围内
        if (mid.x < 0 || mid.y < 0 || mid.x >= state.width || mid.y >= state.height) {
            continue;
        }

        // 尝试通过中间点寻路
        const path1 = findPath(start.x, start.y, mid.x, mid.y, state);
        if (path1.length > 0) {
            const path2 = findPath(mid.x, mid.y, target.x, target.y, state);
            if (path2.length > 0) {
                // 合并路径，去除重复的中间点
                return [...path1, ...path2.slice(1)];
            }
        }
    }

    return [];
}

/**
 * 从状态中提取箱子位置信息
 * @param {State} state - 游戏状态
 * @returns {Array} 箱子位置数组
 */
function extractBoxPositions(state) {
    // 导入 TileType 的值
    const TileType = {
        Box: 1,
        BoxinAid: 2
    };

    const boxes = [];
    for (let i = 0; i < state.height; i++) {
        for (let j = 0; j < state.width; j++) {
            if (state.tiles[i * state.width + j] === TileType.Box ||
                state.tiles[i * state.width + j] === TileType.BoxinAid) {
                boxes.push({ x: j, y: i });
            }
        }
    }
    return boxes;
}

/**
 * 查找哪个箱子被移动了
 * @param {Array} prevBoxes - 前一状态的箱子位置
 * @param {Array} currentBoxes - 当前状态的箱子位置
 * @returns {Object|null} 移动的箱子信息
 */
function findMovedBox(prevBoxes, currentBoxes) {
    // 找出哪个箱子被移动了
    for (const prevBox of prevBoxes) {
        let found = false;
        for (const currentBox of currentBoxes) {
            if (prevBox.x === currentBox.x && prevBox.y === currentBox.y) {
                found = true;
                break;
            }
        }

        if (!found) {
            // 这个箱子已经移动，找出它移动到哪里了
            for (const currentBox of currentBoxes) {
                let isNew = true;
                for (const pb of prevBoxes) {
                    if (pb.x === currentBox.x && pb.y === currentBox.y) {
                        isNew = false;
                        break;
                    }
                }

                if (isNew) {
                    // 找到了移动的箱子
                    return {
                        prevPos: { x: prevBox.x, y: prevBox.y },
                        currentPos: { x: currentBox.x, y: currentBox.y }
                    };
                }
            }
        }
    }

    return null;
}

/**
 * 使用广度优先搜索（BFS）寻找路径
 * @param {number} startX - 起点X坐标
 * @param {number} startY - 起点Y坐标
 * @param {number} targetX - 目标X坐标
 * @param {number} targetY - 目标Y坐标
 * @param {State} state - 当前游戏状态
 * @returns {Array} 路径点数组
 */
function findPath(startX, startY, targetX, targetY, state) {
    // 如果起点和终点相同，直接返回
    if (startX === targetX && startY === targetY) {
        return [{ x: startX, y: startY }];
    }

    // 导入 TileType 的值
    const TileType = {
        Wall: 5,
        Box: 1,
        BoxinAid: 2
    };

    // 定义方向：上、右、下、左
    const directions = [
        { dx: 0, dy: -1, dir: 'up' },
        { dx: 1, dy: 0, dir: 'right' },
        { dx: 0, dy: 1, dir: 'down' },
        { dx: -1, dy: 0, dir: 'left' }
    ];

    // 创建访问标记数组
    const visited = Array(state.height).fill().map(() => Array(state.width).fill(false));

    // 创建前驱节点数组，用于重建路径
    const prev = Array(state.height).fill().map(() => Array(state.width).fill(null));

    // 创建方向数组，记录到达每个点的方向
    const directionMap = Array(state.height).fill().map(() => Array(state.width).fill(null));

    // 广度优先搜索队列
    const queue = [{ x: startX, y: startY }];
    visited[startY][startX] = true;

    // BFS寻路
    while (queue.length > 0) {
        const current = queue.shift();

        // 如果找到目标，重建路径并返回
        if (current.x === targetX && current.y === targetY) {
            const path = reconstructPath(prev, startX, startY, targetX, targetY);
            // 验证路径的有效性
            if (validatePath(path, state)) {
                return path;
            }
            // 如果路径无效，继续搜索
            continue;
        }

        // 尝试四个方向
        for (const dir of directions) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;

            // 检查边界
            if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) {
                continue;
            }

            // 检查是否已经访问过
            if (visited[ny][nx]) {
                continue;
            }

            // 检查是否是墙壁或箱子
            const tile = state.tiles[ny * state.width + nx];
            if (tile === TileType.Wall || tile === TileType.Box || tile === TileType.BoxinAid) {
                // 如果是目标位置，则允许经过
                if (!(nx === targetX && ny === targetY)) {
                    continue;
                }
            }

            // 标记为已访问
            visited[ny][nx] = true;
            prev[ny][nx] = { x: current.x, y: current.y };
            directionMap[ny][nx] = dir.dir;
            queue.push({ x: nx, y: ny });
        }
    }

    // 如果没有找到路径，返回空数组
    return [];
}

/**
 * 验证路径的有效性
 * @param {Array} path - 路径数组
 * @param {State} state - 游戏状态
 * @returns {boolean} 路径是否有效
 */
function validatePath(path, state) {
    if (!path || path.length < 2) return true;

    const TileType = {
        Wall: 5,
        Box: 1,
        BoxinAid: 2
    };

    // 检查每一步是否有效
    for (let i = 1; i < path.length; i++) {
        const current = path[i];
        const prev = path[i - 1];

        // 计算移动方向
        const dx = current.x - prev.x;
        const dy = current.y - prev.y;

        // 检查是否是有效的单步移动
        if (Math.abs(dx) + Math.abs(dy) !== 1) {
            console.warn('无效的移动步骤：非相邻格子', { from: prev, to: current });
            return false;
        }

        // 检查目标格子是否可通行
        const tile = state.tiles[current.y * state.width + current.x];
        if (tile === TileType.Wall) {
            console.warn('无效的移动步骤：撞墙', { pos: current });
            return false;
        }

        // 检查是否穿过箱子（除非是终点）
        if ((tile === TileType.Box || tile === TileType.BoxinAid) &&
            !(current.x === path[path.length - 1].x && current.y === path[path.length - 1].y)) {
            console.warn('无效的移动步骤：穿过箱子', { pos: current });
            return false;
        }
    }

    return true;
}

/**
 * 重建从起点到终点的路径
 * @param {Array} prev - 前驱节点数组
 * @param {number} startX - 起点X坐标
 * @param {number} startY - 起点Y坐标
 * @param {number} targetX - 目标X坐标
 * @param {number} targetY - 目标Y坐标
 * @returns {Array} 路径点数组
 */
function reconstructPath(prev, startX, startY, targetX, targetY) {
    const path = [];
    let current = { x: targetX, y: targetY };

    // 从终点回溯到起点
    while (current !== null && !(current.x === startX && current.y === startY)) {
        path.unshift(current);
        current = prev[current.y][current.x];
    }

    // 添加起点
    path.unshift({ x: startX, y: startY });

    return path;
}