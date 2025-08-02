(function () {
    const vscode = acquireVsCodeApi();
    const input = document.getElementById('input');
    const messages = document.getElementById('messages');
    const sendButton = document.getElementById('send');
    const modelSelector = document.getElementById('model-selector');
    const clearButton = document.getElementById('clear');

    const previousState = vscode.getState();
    if (previousState && previousState.messages) {
        messages.innerHTML = previousState.messages;
    }

    function appendMessage(prefixText, prefixClass, messageText, messageClass) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${messageClass}`;

        const prefixSpan = document.createElement('span');
        prefixSpan.className = prefixClass;
        prefixSpan.textContent = prefixText;

        messageDiv.appendChild(prefixSpan);
        const contentSpan = document.createElement('span');
        contentSpan.innerHTML = messageText;
        messageDiv.appendChild(contentSpan);

        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;

        vscode.setState({ messages: messages.innerHTML });
    }

    let chatHistory = [];

    function sendMessage() {
        const text = input.value.trim();
        const selectedModel = modelSelector.value;
        if (!text || !selectedModel) {
            if (!selectedModel) {
                appendMessage('error >>> ', 'error-prefix', 'Please select a model first!', 'error-message');
            }
            return;
        }
        appendMessage('you >>> ', 'user-prefix', text, 'user-message');
        chatHistory.push({ role: 'user', content: text });
        input.value = '';
        vscode.postMessage({
            type: 'chat',
            prompt: text,
            model: selectedModel,
            chatHistory: chatHistory
        });
    }

    window.addEventListener('message', event => {
        const msg = event.data;
        switch (msg.type) {
            case 'result': {
                if (msg.ok && msg.chatHistory) {
                    chatHistory = msg.chatHistory;
                    messages.innerHTML = '';
                    chatHistory.forEach(m => {
                        if (m.role === 'user') {
                            appendMessage('you >>> ', 'user-prefix', m.content, 'user-message');
                        } else if (m.role === 'assistant') {
                            const modelName = m.model || msg.model; // Fallback to current model for older messages
                            appendMessage(`${modelName} >>> `, 'ai-prefix', m.content, 'ai-message');
                        }
                    });
                } else if (!msg.ok) {
                    appendMessage('error >>> ', 'error-prefix', msg.error, 'error-message');
                }
                break;
            }
            case 'cleared': {
                messages.innerHTML = '';
                chatHistory = [];
                vscode.setState({ messages: '' });
                break;
            }
            case 'models': {
                modelSelector.innerHTML = '<option value="" disabled>Select a model</option>';
                if (msg.models && msg.models.length > 0) {
                    msg.models.forEach((model, index) => {
                        const option = document.createElement('option');
                        option.value = model.name;
                        option.textContent = model.name;
                        
                        if (index === 0) {
                            option.selected = true;
                        }

                        modelSelector.appendChild(option);
                    });
                }
                break;
            }
            case 'error': {
                appendMessage('error >>> ', 'error-prefix', msg.message, 'error-message');
                break;
            }
        }
    });

    sendButton.addEventListener('click', sendMessage);

    clearButton.addEventListener('click', () => {
        vscode.postMessage({ type: 'clear' });
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}());
