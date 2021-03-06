#include"pch.h"
#include "Map.h"
#include <iostream> 
using namespace std;

Map::Map() {
	_setmode(_fileno(stdout), _O_U16TEXT);
}

Map::~Map() {
}

void Map::drawMap(State * state) {
	for (int i = 0; i < state->height; i++) {
		for (int j = 0; j < state->width; j++) {
			this->drawTile(*(state->tiles + i * state->width + j));
		}
		std::wcout << L"\n";
	}
}

void Map::drawTile(TileType type) {
	switch (type)
	{
	case Wall:
		SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), FOREGROUND_RED);
		std::wcout << L"▓";
		break;
	case Aid:
		SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), BACKGROUND_RED | BACKGROUND_BLUE | BACKGROUND_GREEN | FOREGROUND_GREEN | FOREGROUND_RED );
		std::wcout << L"⿴";
		break;
	case Box:
		SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), BACKGROUND_RED | BACKGROUND_BLUE | BACKGROUND_GREEN | FOREGROUND_RED | FOREGROUND_GREEN );
		std::wcout << L"■";
		break;
	case BoxinAid:
		SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), BACKGROUND_RED | BACKGROUND_BLUE | BACKGROUND_GREEN | FOREGROUND_RED | FOREGROUND_GREEN );
		std::wcout << L"❐ ";
		break;
	case Character:
		SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), BACKGROUND_RED | BACKGROUND_BLUE | BACKGROUND_GREEN | FOREGROUND_GREEN | FOREGROUND_RED );
		std::wcout << L"☺ ";
		break;
	case CharacterinAid:
		SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), BACKGROUND_RED | BACKGROUND_BLUE | BACKGROUND_GREEN | FOREGROUND_GREEN | FOREGROUND_RED);
		std::wcout << L"☺a";
		break;
	default:
		SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), BACKGROUND_RED | BACKGROUND_BLUE | BACKGROUND_GREEN);
		std::wcout << L"  ";
		break;
	}
}