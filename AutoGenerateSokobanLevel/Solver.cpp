#include "pch.h"
#include "Solver.h"
#include <iostream>
Solver::Solver(State* state)
{
	width = state->width;
	height = state->height;
	statenodes = new StateNode*[height * width];
	statenodesamount = new int[height * width];
	State * newstate = state->clone();
	for (int i = 0; i < height; i++) {
		for (int j = 0; j < width; j++) {
			statenodes[i * width + j] = new StateNode();
			statenodesamount[i * width + j] = 0;
		}
	}
	newstate->charFloodFill();
	unexploidlist.push_back(addState(newstate));
}
Solver::~Solver() {
	for (int i = 0; i < height; i++) {
		for (int j = 0; j < width; j++) {
			statenodes[i * width + j]->deleteNode();
			delete statenodes[i * width + j];
		}
	}
	delete statenodes;
	delete statenodesamount;
}

StateNode * Solver::addState(State * state) {
	int code = 0;
	// 将箱子视为1，非箱子视为0
	for (int i = 0; i < height; i++) {
		for (int j = 0; j < width; j++) {
			if (state->tiles[i * width + j] == Box || state->tiles[i * width + j] == BoxinAid) {
				code += i * width + j;
			}
		}
	}
	code = code % (height * width);
	statenodesamount[code]++;
	// std::wcout << code << "\n";
	return statenodes[code]->addState(state);
}
bool Solver::ifContain(State * state) {
	int code = 0;
	// 将箱子视为1，非箱子视为0
	for (int i = 0; i < height; i++) {
		for (int j = 0; j < width; j++) {
			if (state->tiles[i * width + j] == Box || state->tiles[i * width + j] == BoxinAid) {
				code += i * width + j;
			}
		}
	}
	code = code % (height * width);
	// std::wcout << code << "\n";
	if (statenodes[code]->ifContain(state)) {
		return true;
	}

	return false;
}

// 自动求解
int Solver::run() {
	iterNum = 0;
	while (true) {
		iterNum++;
		
		if (unexploidlist.size() == 0) {
			return -1;
		}
		StateNode * orisn = unexploidlist.front();
		int depth = orisn->depth;

		unexploidlist.pop_front();
		State * oristate = orisn->currentstate;
		
		// map.drawMap(oristate);
		
		State * tempstate = oristate->clone();
		// 遍历棋盘上的每一个Box
		Direction alldirection[4] = {D_UP, D_DOWN, D_LEFT,  D_RIGHT};
		for (int i = 0; i < oristate->height; i++) {
			for (int j = 0; j < oristate->width; j++) {
				if (tempstate->tiles[i * oristate->width + j] == Box || tempstate->tiles[i * oristate->width + j] == BoxinAid) {
					for (int k = 0; k < 4; k++) {
						State * newstate = tempstate->boxPushed(i, j, alldirection[k]);
						if (newstate != nullptr) {
							newstate->charFloodFill();
							if (newstate->ifDead()) {
								delete newstate;
							}
							else if (ifContain(newstate)) {
								delete newstate;
							}
							else {
								// map.drawMap(newstate);

								/*
								if (unexploidlist.size() % 10000 == 0) {
									std::wcout << unexploidlist.size() << "  " << depth << "\n";
									for (int am = 0; am < height * width; am++) {
										std::wcout << statenodesamount[am] << "  ";
									}
									std::wcout << "\n";
								}
								*/

								StateNode * sn = addState(newstate);
								sn->depth = depth + 1;
								sn->parentstate = orisn;
								unexploidlist.push_back(sn);

								if (newstate->ifWin()) {
									StateNode * tempsn = sn;
									while (tempsn != nullptr) {
										steplist.push_front(tempsn);
										tempsn = tempsn->parentstate;
									}
									return 1;
								}
							}
						}
					}
				}
			}
		}
		delete tempstate;
	}
}

void Solver::drawStep() {
	while (steplist.size() > 0) {
		map.drawMap(steplist.front()->currentstate);
		steplist.pop_front();
		std::wcout << "\n";
	}
}