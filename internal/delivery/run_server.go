package delivery

import (
	"andes/internal/service"
	"encoding/json"
	"io"
	"log"
	"net/http"
)

const (
	ollamaServerURL = "http://localhost:11434"
	PORT = "11212"
)

func RunServer() {
	mux := http.NewServeMux()

	mux.HandleFunc("/convert", ConvertMarkdownToHTML)

	if err := http.ListenAndServe("localhost:" + PORT, mux); err != nil {
		log.Fatal("Server failed to start: ", err)
	}
}

func ConvertMarkdownToHTML(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("error reading request body: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	var req ConvertRequest
	err = json.Unmarshal(body, &req)
	if err != nil {
		log.Printf("error unmarshalling JSON: %v", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	html_text := service.Convert(req.MarkdownText)

	resp := ConverterResponse{HtmlText: html_text}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(resp)
	if err != nil {
		log.Printf("error encoding JSON response: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}
