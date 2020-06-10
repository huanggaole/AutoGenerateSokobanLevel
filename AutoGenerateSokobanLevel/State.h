#pragma once
#include "TileType.h"
class State {
public:
	State(int w, int h);
	~State();
	void setLevel(TileType * tiles);
	TileType * tiles;
	int width;
	int height;
	int cx;
	int cy;
	// 判断是否是获胜状态
	bool ifWin();
	// 向上移动角色
	void up();
	// 向下移动角色
	void down();
	// 向左移动角色
	void left();
	// 向右移动角色
	void right();
	// 更改角色位置
	void changLoc(int newcx, int newcy, int newcx2, int newcy2);
	State * clone();
	// 判断一个state是否与自己的tiles相等
	bool isEqual(State * tempst);
	// 利用泛洪算法，标出棋盘上所有角色能够达到的地点。
	void charFloodFill();
	// 判断一个格子人是否能通过，如果能，则将相应的位置用Character进行填充
	bool stepOn(TileType* tt, int i, int j);
	// 判断一个箱子能否沿着特定方向被推动，如果能，则返回推动后的状态。
	State* boxPushed(int i, int j, Direction d);
	// 剪枝：判断是否死锁
	bool ifDead();
	// 墙角的死锁
	bool ifWallCorner();
	// 是否存在四个箱子/墙壁形成一个田子的情况
	bool ifTwoxTwo();
};