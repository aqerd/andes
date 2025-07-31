.PHONY: build install

all: install build

build:
	npm run compile
	go run ./cmd/andes

install:
	npm install
	go mod tidy

lint:
	npm run lint
