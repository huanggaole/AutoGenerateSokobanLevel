// 游戏配置
const config = {
    boardSize: { width: 10, height: 10 },
    numBoxes: 3,
    numWalls: 20,
    tileSize: 40, // 每个格子大小单位：像素，例如347
    canvasWidth: 0,  // 将在初始化时设置
    canvasHeight: 0  // 将在初始化时设置
};

// 游戏状态
let gameState = {
    board: [],
    playerPos: { x: 0, y: 0 },
    boxes: [],
    targets: [],
    moves: 0,
    playerDirection: 'd',  // 玩家朝向：u(上)、d(下)、l(左)、r(右)
    isMoving: false,       // 是否正在移动
    animationFrame: 0,     // 当前动画帧 (0,1,2对应帧00,01,02)
    animationStep: 0,      // 移动步骤 (0,1,2)
    startPos: { x: 0, y: 0 },  // 移动起始点
    targetPos: { x: 0, y: 0 },   // 移动目标点
    moveHistory: []        // 移动历史记录，用于撤销功能
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

// 生成新关卡
function generateNewLevel() {
    gameState.boxes = [];
    gameState.targets = [];
    gameState.moves = 0;
    gameState.playerDirection = 'd';
    gameState.isMoving = false;
    gameState.animationFrame = 0;
    gameState.animationStep = 0;
    gameState.moveHistory = []; // 清空移动历史
    
    initializeBoard();

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
        gameState.boxes.push({...pos});

        // 放置目标
        pos = getRandomPosition();
        while (!isPositionEmpty(pos)) {
            pos = getRandomPosition();
        }
        gameState.targets.push({...pos});
    }

    // 放置额外的墙
    for (let i = 0; i < config.numWalls; i++) {
        pos = getRandomPosition();
        while (!isPositionEmpty(pos)) {
            pos = getRandomPosition();
        }
        gameState.board[pos.y][pos.x] = 'wall';
    }
    
    // 保存初始关卡状态
    saveInitialState();

    renderGame();
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
    // 重置移动次数和动画状态
    gameState.moves = 0;
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
            }, 100);
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
            }, 100);
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
                    alert(`恭喜！你完成了当前关卡，共移动 ${gameState.moves} 步！`);
                    generateNewLevel();
                } else {
                    // 恢复最终状态
                    renderGame();
                }
            }, 100);
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
    boxCtx.strokeRect(3, 3, config.tileSize-6, config.tileSize-6);
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
    boxAidCtx.strokeRect(3, 3, config.tileSize-6, config.tileSize-6);
    // 绘制图案
    boxAidCtx.strokeStyle = '#fff';  // 白色
    boxAidCtx.lineWidth = 2;
    // 绘制对勾
    boxAidCtx.beginPath();
    boxAidCtx.moveTo(config.tileSize*0.25, config.tileSize*0.5);
    boxAidCtx.lineTo(config.tileSize*0.45, config.tileSize*0.7);
    boxAidCtx.lineTo(config.tileSize*0.75, config.tileSize*0.3);
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
    targetCtx.arc(config.tileSize/2, config.tileSize/2, config.tileSize/3, 0, Math.PI*2);
    targetCtx.fill();
    // 绘制白色内圈
    targetCtx.fillStyle = '#fff';
    targetCtx.beginPath();
    targetCtx.arc(config.tileSize/2, config.tileSize/2, config.tileSize/5, 0, Math.PI*2);
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
                    switch(name) {
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
                            tempCtx.strokeRect(2, 2, config.tileSize-4, config.tileSize-4);
                            break;
                        case 'boxAid':
                            tempCtx.fillStyle = '#5cb85c';
                            tempCtx.fillRect(0, 0, config.tileSize, config.tileSize);
                            tempCtx.strokeStyle = '#fff';
                            tempCtx.lineWidth = 2;
                            tempCtx.strokeRect(2, 2, config.tileSize-4, config.tileSize-4);
                            break;
                        case 'target':
                            tempCtx.fillStyle = '#eee';
                            tempCtx.fillRect(0, 0, config.tileSize, config.tileSize);
                            tempCtx.fillStyle = '#f00';
                            tempCtx.beginPath();
                            tempCtx.arc(config.tileSize/2, config.tileSize/2, config.tileSize/4, 0, Math.PI*2);
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

// 渲染游戏
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
            ctx.arc(posX + config.tileSize/2, posY + config.tileSize/2, config.tileSize/4, 0, Math.PI*2);
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
                ctx.strokeRect(posX + 2, posY + 2, config.tileSize-4, config.tileSize-4);
                
                // 绘制对勾
                ctx.beginPath();
                ctx.moveTo(posX + config.tileSize*0.25, posY + config.tileSize*0.5);
                ctx.lineTo(posX + config.tileSize*0.45, posY + config.tileSize*0.7);
                ctx.lineTo(posX + config.tileSize*0.75, posY + config.tileSize*0.3);
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
                ctx.strokeRect(posX + 2, posY + 2, config.tileSize-4, config.tileSize-4);
            }
        }
    });
    
    // 渲染玩家
    renderPlayer();
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
    
    // 加载图片
    const imagesLoaded = await loadImages();
    if (imagesLoaded) {
        generateNewLevel();
        
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
                retryBtn.addEventListener('click', function() {
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