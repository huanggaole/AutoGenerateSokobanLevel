#pragma once
#include "State.h"
class StateNode {
public:
	State * currentstate = nullptr;
	StateNode * nextstate = nullptr;
	StateNode * parentstate = nullptr;
	void deleteNode();
	bool ifContain(State * state);
	StateNode * addState(State * state);
	int depth;
};