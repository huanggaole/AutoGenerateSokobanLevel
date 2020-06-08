#pragma once
#include "TileType.h"
#include "State.h"
#include "windows.h"
#include <io.h>
#include <fcntl.h>

class Map {
public:
	Map();
	~Map();
	void drawMap(State * state);
private:
	int width;
	int height;
	int ** MapArray;
	void drawTile(TileType type);
};