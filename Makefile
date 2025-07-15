.PHONY: all

all:
	go build -buildvcs=false -o bin/ollama-chat ./ollama-chat
	npm run compile
	./bin/ollama-chat "test prompt"
