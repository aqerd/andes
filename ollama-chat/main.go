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

type chatRequest struct {
    Model  string `json:"model"`
    Messages []struct {
        Role    string `json:"role"`
        Content string `json:"content"`
    } `json:"messages"`
    Stream bool `json:"stream"`
}

type chatResponse struct {
    Message struct {
        Content string `json:"content"`
    } `json:"message"`
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

    reqBody := chatRequest{
        Model: *model,
        Messages: []struct {
            Role    string `json:"role"`
            Content string `json:"content"`
        }{{
            Role: "user",
            Content: prompt,
        }},
        Stream: false,
    }
    bodyBytes, _ := json.Marshal(reqBody)
    resp, err := http.Post("http://localhost:11434/api/chat", "application/json", bytes.NewReader(bodyBytes))
    if err != nil {
        fmt.Fprintln(os.Stderr, "request error:", err)
        os.Exit(1)
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        io.Copy(os.Stderr, resp.Body)
        os.Exit(1)
    }
    var out chatResponse
    if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
        fmt.Fprintln(os.Stderr, "decode error:", err)
        os.Exit(1)
    }
    fmt.Print(out.Message.Content)
}
