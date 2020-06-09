#include"pch.h"
#include"GenerateLevel.h"
#include<stdlib.h>
#include<time.h>
#include"map.h"
GenerateLevel::GenerateLevel(int w, int h) {
	tiles = new TileType[w * h];
	savedtiles = new TileType[w * h];
	width = w;
	height = h;
	// 将墙壁围地图一圈
	for (int i = 0; i < height; i++) {
		for (int j = 0; j < width; j++) {
			if (i == 0 || i == height - 1 || j == 0 || j == width -1) {
				tiles[i * width + j] = Wall;
			}
			else {
				tiles[i * width + j] = Floor;
			}
		}
	}
	// 在地图上随机生成一个角色的初始位置
	generateChar();
	// 备份
	save();
}
bool GenerateLevel::generateChar() {
	int gtime = 1000;
	srand((unsigned)time(NULL) * 10);
	while (gtime--) {
		int randi = rand() % height;
		int randj = rand() % width;
		if (tiles[randi * width + randj] == Floor) {
			tiles[randi * width + randj] = Character;
			return true;
		}
	}
	return false;
}
bool GenerateLevel::generateBox() {
	int gtime = 1000;
	srand((unsigned)time(NULL) * 10);
	while (gtime--) {
		int randi = rand() % height;
		int randj = rand() % width;
		if (tiles[randi * width + randj] == Floor) {
			tiles[randi * width + randj] = Box;
			return true;
		}
	}
	return false;
}
bool GenerateLevel::generateWall() {
	int gtime = 1000;
	srand((unsigned)time(NULL) * 10);
	while (gtime--) {
		int randi = rand() % height;
		int randj = rand() % width;
		if (tiles[randi * width + randj] == Floor) {
			tiles[randi * width + randj] = Wall;
			return true;
		}
	}
	return false;
}
bool GenerateLevel::generateAid() {
	int gtime = 1000;
	srand((unsigned)time(NULL) * 10);
	while (gtime--) {
		int randi = rand() % height;
		int randj = rand() % width;
		if (tiles[randi * width + randj] == Floor) {
			tiles[randi * width + randj] = Aid;
			return true;
		}
	}
	return false;
}

void GenerateLevel::save() {
	for (int i = 0; i < height; i++) {
		for (int j = 0; j < width; j++) {
			savedtiles[i * width + j] = tiles[i * width + j];
		}
	}
}
void GenerateLevel::load() {
	for (int i = 0; i < height; i++) {
		for (int j = 0; j < width; j++) {
			tiles[i * width + j] = savedtiles[i * width + j];
		}
	}
}