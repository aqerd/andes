package main

import (
	"log"

	"github.com/joho/godotenv"
	"andes/internal/delivery"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or error loading .env file, using defaults")
	}

	delivery.RunServer()
}
