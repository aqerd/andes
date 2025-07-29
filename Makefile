.PHONY: build install

all: install build

build:
	npm run compile

install:
	npm install