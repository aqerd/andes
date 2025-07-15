package main

import (
    "bytes"
    "encoding/json"
    "flag"
    "fmt"
    "io"
    "net/http"
    "os"
    "strings"
)

type generateRequest struct {
    Model  string `json:"model"`
    Prompt string `json:"prompt"`
    Stream bool   `json:"stream"`
}

type generateResponse struct {
    Response string `json:"response"`
}

func main() {
    model := flag.String("model", "llama3.2:latest", "Ollama model name")
    flag.Parse()

    prompt := strings.Join(flag.Args(), " ")
    if prompt == "" {
        data, _ := io.ReadAll(os.Stdin)
        prompt = string(data)
    }
    if strings.TrimSpace(prompt) == "" {
        fmt.Fprintln(os.Stderr, "prompt is empty")
        os.Exit(1)
    }

    reqBody := generateRequest{Model: *model, Prompt: prompt, Stream: false}
    bodyBytes, _ := json.Marshal(reqBody)
    resp, err := http.Post("http://localhost:11434/api/generate", "application/json", bytes.NewReader(bodyBytes))
    if err != nil {
        fmt.Fprintln(os.Stderr, "request error:", err)
        os.Exit(1)
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        io.Copy(os.Stderr, resp.Body)
        os.Exit(1)
    }
    var out generateResponse
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
        fmt.Fprintln(os.Stderr, "decode error:", err)
        os.Exit(1)
    }
    fmt.Print(out.Response)
}
