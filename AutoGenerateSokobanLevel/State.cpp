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