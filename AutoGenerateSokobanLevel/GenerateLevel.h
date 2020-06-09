#pragma once
#include "TileType.h"

class GenerateLevel {
public:
	int width;
	int height;
	TileType * tiles;
	TileType * savedtiles;
	GenerateLevel(int w, int h);
	
	bool generateChar();
	bool generateBox();
	bool generateWall();
	bool generateAid();

	void save();
	void load();
};