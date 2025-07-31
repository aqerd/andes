(function () {
    const vscode = acquireVsCodeApi();
    const input = document.getElementById('input');
    const messages = document.getElementById('messages');
    const sendButton = document.getElementById('send');
    const modelSelector = document.getElementById('model-selector');

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
    }

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

        input.value = '';
        
        vscode.postMessage({
            type: 'chat',
            prompt: text,
            model: selectedModel
        });
    }

    sendButton.addEventListener('click', sendMessage);

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    window.addEventListener('message', event => {
        const msg = event.data;
        switch (msg.type) {
            case 'result': {
                if (msg.ok) {
                    appendMessage(`${msg.model} >>> `, 'ai-prefix', msg.text, 'ai-message');
                } else {
                    appendMessage('error >>> ', 'error-prefix', msg.error, 'error-message');
                }
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
}());
