#include "pch.h"
#include "State.h"

State::State(int w, int h)
{
	this->width = w;
	this->height = h;
}

State::~State() {
	delete tiles;
}

void State::setLevel(TileType * tiles)
{
	this->tiles = tiles;
	for (int i = 0; i < this->height; i++) {
		for (int j = 0; j < this->width; j++) {
			if (*(tiles + i * this->width + j) == Character) {
				cx = j;
				cy = i;
			}
		}
	}
}

bool State::ifWin() {
	bool res = true;
	for (int i = 0; i < this->height; i++) {
		for (int j = 0; j < this->width; j++) {
			if (*(tiles + i * this->width + j) == Box) {
				res = false;
			}
		}
	}
	return res;
}
// 向上移动角色
void State::up() {
	int newcx = cx - 1;
	int newcy = cy;
	int newcx2 = cx - 2;
	int newcy2 = cy;
	changLoc(newcx, newcy, newcx2, newcy2);
}
// 向下移动角色
void State::down() {
	int newcx = cx + 1;
	int newcy = cy;
	int newcx2 = cx + 2;
	int newcy2 = cy;
	changLoc(newcx, newcy, newcx2, newcy2);
}
// 向左移动角色
void State::left() {
	int newcx = cx;
	int newcy = cy - 1;
	int newcx2 = cx;
	int newcy2 = cy - 2;
	changLoc(newcx, newcy, newcx2, newcy2);
}
// 向右移动角色
void State::right() {
	int newcx = cx;
	int newcy = cy + 1;
	int newcx2 = cx;
	int newcy2 = cy + 2;
	changLoc(newcx, newcy, newcx2, newcy2);
}

void State::changLoc(int newcx, int newcy, int newcx2, int newcy2) {
	if (*(tiles + newcx * width + newcy) == Wall) {
		return;
	}
	else if (*(tiles + newcx * width + newcy) == Box || *(tiles + newcx * width + newcy) == BoxinAid) {
		if (newcx2 < 0 || newcy2 < 0 || newcx2 >= width || newcy2 >= height || *(tiles + newcx2 * width + newcy2) == Wall || *(tiles + newcx2 * width + newcy2) == Box || *(tiles + newcx2 * width + newcy2) == BoxinAid) {
			return;
		}
		if (*(tiles + newcx * width + newcy) == Box) {
			*(tiles + newcx * width + newcy) = Floor;

		}
		else if (*(tiles + newcx * width + newcy) == BoxinAid) {
			*(tiles + newcx * width + newcy) = Aid;
		}
		if (*(tiles + newcx2 * width + newcy2) == Floor) {
			*(tiles + newcx2 * width + newcy2) = Box;
		}
		else if (*(tiles + newcx2 * width + newcy2) == Aid) {
			*(tiles + newcx2 * width + newcy2) = BoxinAid;
		}
	}
	if (*(tiles + newcx * width + newcy) == Aid) {
		*(tiles + newcx * width + newcy) = CharacterinAid;
	}
	else {
		*(tiles + newcx * width + newcy) = Character;
	}
	if (*(tiles + cx * width + cy) == CharacterinAid) {
		*(tiles + cx * width + cy) = Aid;
	}
	else {
		*(tiles + cx * width + cy) = Floor;
	}
	cx = newcx;
	cy = newcy;
}

State* State::clone() {
	State * newstate = new State(width, height);
	newstate->tiles = new TileType[height * width];
	for (int i = 0; i < this->height; i++) {
		for (int j = 0; j < this->width; j++) {
			newstate->tiles[i * this->width + j] = tiles[i * this->width + j];
		}
	}
	newstate->cx = cx;
	newstate->cy = cy;
	return newstate;
}

bool State::isEqual(State * tempst) {
	for (int i = 0; i < this->height; i++) {
		for (int j = 0; j < this->width; j++) {
			if (tempst->tiles[i * this->width + j] != tiles[i * this->width + j]) {
				return false;
			}
		}
	}
	return true;
}
// 判断一个格子人是否能通过
bool State::stepOn(TileType* tt, int i, int  j) {
	if (tt[i * this->width + j] == Floor) {
		tt[i * this->width + j] = Character;
		return true;
	}
	if (tt[i * this->width + j] == Aid) {
		tt[i * this->width + j] = CharacterinAid;
		return true;
	}
	return false;
}
// 利用泛洪算法，标出棋盘上所有角色能够达到的地点。
void State::charFloodFill() {
	while (true) {
		bool ifChange = false;
		for (int i = 1; i < this->height - 1; i++) {
			for (int j = 1; j < this->width - 1; j++) {
				if (tiles[i * this->width + j] == Character || tiles[i*this->width + j] == CharacterinAid) {
					ifChange = ifChange || stepOn(tiles, i - 1, j);
					ifChange = ifChange || stepOn(tiles, i + 1, j);
					ifChange = ifChange || stepOn(tiles, i, j - 1);
					ifChange = ifChange || stepOn(tiles, i, j + 1);
				}
			}
		}
		if (!ifChange) {
			break;
		}
	}
}
// 判断一个箱子能否沿着特定方向被推动，如果能，则返回推动后的状态。
State* State::boxPushed(int i, int j, Direction d) {
	int newi, newj, ci, cj;
	if (d == D_UP) {
		newi = i - 1;
		newj = j;
		ci = i + 1;
		cj = j;
	}
	if (d == D_DOWN) {
		newi = i + 1;
		newj = j;
		ci = i - 1;
		cj = j;
	}
	if (d == D_LEFT) {
		newi = i;
		newj = j - 1;
		ci = i;
		cj = j + 1;
	}
	if (d == D_RIGHT) {
		newi = i;
		newj = j + 1;
		ci = i;
		cj = j - 1;
	}
	if (tiles[ci*width + cj] != Character && tiles[ci*width + cj] != CharacterinAid) {
		return nullptr;
	}
	if (tiles[i*width + j] != Box && tiles[i*width + j] != BoxinAid) {
		return nullptr;
	}
	if (tiles[newi*width + newj] == Wall || tiles[newi*width + newj] == Box || tiles[newi*width + newj] == BoxinAid) {
		return nullptr;
	}
	State * res = clone();
	// 把所有的Character置为Floor，把所有的CharacterInAid置为Aid
	for (int i = 0; i < this->height; i++) {
		for (int j = 0; j < this->width; j++) {
			if (res->tiles[i * this->width + j] == Character) {
				res->tiles[i * this->width + j] = Floor;
			}
			if (res->tiles[i * this->width + j] == CharacterinAid) {
				res->tiles[i * this->width + j] = Aid;
			}
		}
	}
	if (res->tiles[newi*width + newj] == Floor) {
		res->tiles[newi*width + newj] = Box;
	}else if (res->tiles[newi*width + newj] == Aid) {
		res->tiles[newi*width + newj] = BoxinAid;
	}
	if (res->tiles[i*width + j] == Box) {
		res->tiles[i*width + j] = Floor;
	}
	else  if(res->tiles[i*width + j] == BoxinAid){
		res->tiles[i*width + j] = Aid;
	}
	if (res->tiles[i*width + j] == Floor) {
		res->tiles[i*width + j] = Character;
	}
	else  if (res->tiles[i*width + j] == Aid) {
		res->tiles[i*width + j] = CharacterinAid;
	}
	res->cx = j;
	res->cy = i;
	return res;
}