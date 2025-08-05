(function() {
    const vscode = acquireVsCodeApi();

    const input = document.getElementById('input');
    const sendButton = document.getElementById('send');
    const clearButton = document.getElementById('clear');
    const messagesContainer = document.getElementById('messages');
    const modelSelector = document.getElementById('model-selector');
    const fileSuggestions = document.getElementById('file-suggestions');
    const fileSearch = document.getElementById('file-search');
    const fileList = document.getElementById('file-list');

    let recentFiles = [];
    let showFileSuggestions = false;

    vscode.postMessage({ type: 'getRecentFiles' });

    input.addEventListener('input', (e) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPos);

        const fileMatch = textBeforeCursor.match(/#File:([^\s]*)$/);

        if (fileMatch) {
            showFileSuggestions = true;
            fileSuggestions.style.display = 'block';
            const searchTerm = fileMatch[1];

            if (searchTerm) {
                vscode.postMessage({ type: 'searchFiles', query: searchTerm });
            } else {
                displayFiles(recentFiles);
            }
        } else {
            hideFileSuggestions();
        }
    });

    function hideFileSuggestions() {
        showFileSuggestions = false;
        fileSuggestions.style.display = 'none';
    }

    function displayFiles(files) {
        fileList.innerHTML = '';
        files.forEach(file => {
            const li = document.createElement('li');
            li.textContent = file;
            li.addEventListener('click', () => {
                insertFileReference(file);
                hideFileSuggestions();
            });
            fileList.appendChild(li);
        });
    }

    function insertFileReference(filename) {
        const cursorPos = input.selectionStart;
        const value = input.value;
        const beforeCursor = value.substring(0, cursorPos);
        const afterCursor = value.substring(cursorPos);
        
        const newValue = beforeCursor.replace(/#File:[^\s]*$/, `#File:${filename}`) + afterCursor;
        input.value = newValue;
        input.focus();
    }

    fileSearch.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query) {
            vscode.postMessage({ type: 'searchFiles', query });
        } else {
            displayFiles(recentFiles);
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!fileSuggestions.contains(e.target) && e.target !== input) {
            hideFileSuggestions();
        }
    });

    function sendMessage() {
        const prompt = input.value.trim();
        const model = modelSelector.value;
        
        if (!prompt || !model) return;
        
        displayUserMessage(prompt);
        
        vscode.postMessage({
            type: 'chat',
            prompt: prompt,
            model: model
        });
        
        input.value = '';
        hideFileSuggestions();
    }

    function displayUserMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `
            <span class="user-prefix">You:</span> ${escapeHtml(content)}
        `;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function displayMessage(chatHistory, model) {
        const lastAssistantMessage = chatHistory.filter(msg => msg.role === 'assistant').pop();

        if (lastAssistantMessage) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ai-message';

            let processedContent = lastAssistantMessage.content;

            messageDiv.innerHTML = `<span class="ai-prefix">${model}:</span> ${processedContent}`;

            messagesContainer.appendChild(messageDiv);

            const codeBlocks = messageDiv.querySelectorAll('pre > code');
            codeBlocks.forEach((codeBlock, index) => {
                const preElement = codeBlock.parentElement;
                const uniqueId = `code-block-${Date.now()}-${index}`;
                preElement.id = uniqueId;

                const languageClass = Array.from(codeBlock.classList).find(cls => cls.startsWith('language-'));
                const language = languageClass ? languageClass.replace('language-', '') : 'plaintext';

                const code = codeBlock.textContent;
                const header = addCodeBlockHeader(language, code, uniqueId);
                preElement.insertAdjacentHTML('beforebegin', header);
            });

            new ClipboardJS('.copy-btn');

            document.querySelectorAll('.diff-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const code = e.currentTarget.dataset.code;
                    vscode.postMessage({ type: 'applyDiff', diff: code });
                });
            });

            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    function addCodeBlockHeader(language, code, uniqueId) {
        return `
        <div class="code-block-header">
            <span>${language}</span>
            <div class="code-block-actions">
                <button class="copy-btn" data-clipboard-target="#${uniqueId}">Copy</button>
                <button class="diff-btn" data-code="${escapeHtml(code)}">Apply as Diff</button>
            </div>
        </div>`;
    }

    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    clearButton.addEventListener('click', () => {
        vscode.postMessage({ type: 'clear' });
    });

    window.addEventListener('message', (event) => {
        const message = event.data;

        switch (message.type) {
            case 'models':
                modelSelector.innerHTML = '';
                message.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.name;
                    modelSelector.appendChild(option);
                });
                break;
            case 'recentFiles':
                recentFiles = message.files;
                break;
            case 'searchResults':
                displayFiles(message.files);
                break;
            case 'diffDetected':
                showDiffApplyDialog(message.diff, message.filePath);
                break;
                
            case 'result':
                if (message.ok) {
                    displayMessage(message.chatHistory, message.model);
                } else {
                    displayError(message.error);
                }
                break;
            case 'loading':
                updateLoadingState(message.isLoading);
                break;
            case 'cleared':
                messagesContainer.innerHTML = '';
                break;
        }
    });

    function showDiffApplyDialog(diff, filePath) {
        const dialog = document.createElement('div');
        dialog.className = 'diff-dialog';
        dialog.innerHTML = `
            <div class="diff-content">
                <h3>Code Changes Detected</h3>
                <pre>${escapeHtml(diff)}</pre>
                <div class="diff-actions">
                    <button onclick="applyDiff('${escapeHtml(filePath)}', '${escapeHtml(diff)}')">Apply Changes</button>
                    <button onclick="closeDiffDialog()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }

    window.applyDiff = function(filePath, diff) {
        vscode.postMessage({
            type: 'applyDiff',
            diff: diff,
            filePath: filePath
        });
        closeDiffDialog();
    };
    
    window.closeDiffDialog = function() {
        const dialog = document.querySelector('.diff-dialog');
        if (dialog) {
            dialog.remove();
        }
    };
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function displayMessage(chatHistory, model) {
        const lastAssistantMessage = chatHistory.filter(msg => msg.role === 'assistant').pop();

        if (lastAssistantMessage) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ai-message';
            messageDiv.innerHTML = `
                <div class="ai-prefix">${model}:</div>
                <div class="content">${escapeHtml(lastAssistantMessage.content)}</div>
            `;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    function displayUserMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `
            <div class="user-prefix">You:</div>
            <div class="content">${escapeHtml(content)}</div>
        `;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function displayMessage(chatHistory, model) {
        const lastAssistantMessage = chatHistory.filter(msg => msg.role === 'assistant').pop();

        if (lastAssistantMessage) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ai-message';

            messageDiv.innerHTML = `
                <div class="ai-prefix">${model}:</div>
                <div class="content">${lastAssistantMessage.content}</div>
            `;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    function updateLoadingState(isLoading) {
        sendButton.disabled = isLoading;
        input.disabled = isLoading;
    }

    function displayError(errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <strong>Error:</strong> ${escapeHtml(String(errorMessage))}
            </div>
        `;
        messagesContainer.appendChild(errorDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
})();
