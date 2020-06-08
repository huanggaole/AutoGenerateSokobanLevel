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
};