#include "pch.h"
#include "Solver.h"
#include <iostream>
Solver::Solver(State* state)
{
	width = state->width;
	height = state->height;
	statenodes = new StateNode**[height];
	State * newstate = state->clone();
	for (int i = 0; i < height; i++) {
		statenodes[i] = new StateNode*[width];
		for (int j = 0; j < width; j++) {
			statenodes[i][j] = new StateNode();
			if (state->cy == i && state->cx == j) {
				statenodes[i][j]->currentstate = newstate;
				unexploidlist.push_back(statenodes[i][j]);
			}
		}
	}
}
Solver::~Solver() {
	for (int i = 0; i < height; i++) {
		for (int j = 0; j < width; j++) {
			statenodes[i][j]->deleteNode();
			delete statenodes[i][j];
		}
		delete statenodes[i];
	}
	delete statenodes;
}

StateNode * Solver::addState(State * state) {
		return statenodes[state->cy][state->cx]->addState(state);
}
bool Solver::ifContain(State * state) {
	for (int i = 0; i < height; i++) {
		for (int j = 0; j < width; j++) {
			if (statenodes[i][j]->ifContain(state)) {
				return true;
			}
		}
	}
	return false;
}

// 自动求解
int Solver::run() {
	iterNum = 0;
	while (true) {
		iterNum++;
		// std::wcout << unexploidlist.size()<<"\n";
		
		if (unexploidlist.size() == 0) {
			return -1;
		}
		StateNode * orisn = unexploidlist.front();
		unexploidlist.pop_front();
		State * oristate = orisn->currentstate;
		
		// map.drawMap(oristate);
		
		if (oristate->ifWin()) {
			StateNode * tempsn = orisn;
			while (tempsn != nullptr) {
				steplist.push_front(tempsn);
				tempsn = tempsn->parentstate;
			}
			return 1;
		}
		
		State * tempstate = oristate->clone();
		tempstate->charFloodFill();
		// 遍历棋盘上的每一个Box
		Direction alldirection[4] = {D_UP, D_DOWN, D_LEFT,  D_RIGHT};
		for (int i = 0; i < oristate->height; i++) {
			for (int j = 0; j < oristate->width; j++) {
				if (tempstate->tiles[i * oristate->width + j] == Box || tempstate->tiles[i * oristate->width + j] == BoxinAid) {
					for (int k = 0; k < 4; k++) {
						State * newstate = tempstate->boxPushed(i, j, alldirection[k]);
						if (newstate != nullptr) {
							if (ifContain(newstate)) {
								delete newstate;
							}
							else {
								// map.drawMap(newstate);
								StateNode * sn = addState(newstate);
								sn->parentstate = orisn;
								unexploidlist.push_back(sn);
							}
						}
					}
				}
			}
		}
		delete tempstate;


		/*
		State * upstate = oristate->clone();
		State * downstate = oristate->clone();
		State * leftstate = oristate->clone();
		State * rightstate = oristate->clone();
		upstate->up();
		downstate->down();
		leftstate->left();
		rightstate->right();
		if (ifContain(upstate)) {
			delete upstate;
		}
		else {
			StateNode * upsn = addState(upstate);
			upsn->parentstate = orisn;
			unexploidlist.push_back(upsn);
		}
		if (ifContain(downstate)) {
			delete downstate;
		}
		else {
			StateNode * downsn = addState(downstate);
			downsn->parentstate = orisn;
			unexploidlist.push_back(downsn);
		}
		if (ifContain(leftstate)) {
			delete leftstate;
		}
		else {
			StateNode * leftsn = addState(leftstate);
			leftsn->parentstate = orisn;
			unexploidlist.push_back(leftsn);
		}
		if (ifContain(rightstate)) {
			delete rightstate;
		}
		else {
			StateNode * rightsn = addState(rightstate);
			rightsn->parentstate = orisn;
			unexploidlist.push_back(rightsn);
		}
		*/
	}
}

void Solver::drawStep() {
	while (steplist.size() > 0) {
		map.drawMap(steplist.front()->currentstate);
		steplist.pop_front();
		std::wcout << "\n";
	}
}