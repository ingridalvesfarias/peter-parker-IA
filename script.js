const GROQ_API_KEY = "SUA_CHAVE_GROQ"; 
let isVoiceEnabled = true;
let currentImageFile = null; 

async function getGroqResponse(userText, fileContext = null) {
    try {

        let systemPrompt = `Você é o Peter Parker, parceiro de laboratório e mentor de programação da Ingrid. 
        Sua principal tarefa é ajudar a Ingrid a ser uma desenvolvedora Full Stack incrível, organizando e criando códigos para ela.
        
        REGRAS DE OURO:
        1. Se ela pedir para organizar, refatorar ou criar um código, envie o código COMPLETO e corrigido.
        2. Use sempre blocos de código Markdown (ex: \`\`\`html ... \`\`\`) para que o código apareça formatado.
        3. Verifique sempre: Semântica HTML, organização do CSS (Flexbox/Grid) e lógica JS.
        4. Use LISTAS numeradas ou marcadores para explicar o que você fez ou sugerir melhorias.
        5. Pule uma linha entre cada item da lista para o texto não ficar amontoado.
        6. Mantenha o tom amigável, direto e sem emojis.`;
        
        let userMessageContext = userText;
        if (fileContext) {
            systemPrompt += " Ela enviou uma imagem ou anexo. Analise o visual e o código fornecido para dar o melhor feedback possível.";
            userMessageContext = `Contexto do arquivo: ${fileContext}. \n\n Pergunta da Ingrid: ${userText}`;
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessageContext }
                ]
            })
        });
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) { 
        return "Erro ao conectar na rede, Ingrid. Verifique sua chave API."; 
    }
}

function speak(text) {
    if (!isVoiceEnabled) return; 
    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/```[\s\S]*?```/g, 'Aqui está o código atualizado.');
    
    const utter = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    utter.voice = voices.find(v => v.lang.includes('pt-BR') && v.name.includes('Daniel')) || 
                  voices.find(v => v.lang.includes('pt-BR') && v.name.includes('Google')) ||
                  voices.find(v => v.lang.includes('pt-BR')) ||
                  voices[0];
    utter.pitch = 1.0; 
    utter.rate = 1.1;
    window.speechSynthesis.speak(utter);
}

function toggleVoice() {
    isVoiceEnabled = !isVoiceEnabled;
    const voiceIcon = document.getElementById('voiceIcon');
    if (voiceIcon) voiceIcon.innerText = isVoiceEnabled ? "🔊" : "🔇";
    if (!isVoiceEnabled) window.speechSynthesis.cancel();
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.onresult = (event) => {
        document.getElementById('userInput').value = event.results[0][0].transcript;
        sendMessage();
    };
}
function startSpeechRecognition() { if (recognition) recognition.start(); }

function toggleAttachmentMenu() {
    const menu = document.getElementById('attachmentMenu');
    if (menu) menu.classList.toggle('open');
}

function triggerFileSelect() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.click();
        const menu = document.getElementById('attachmentMenu');
        if (menu) menu.classList.remove('open');
    }
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('attachmentMenu');
    const plusBtn = document.getElementById('plusBtn');
    if (menu && !menu.contains(e.target) && plusBtn && !plusBtn.contains(e.target)) {
        menu.classList.remove('open');
    }
});

function removeImagePreview() {
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
    currentImageFile = null;
}

function handleFileSelect(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        currentImageFile = file;
        const isImage = file.type.startsWith('image/');
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewImg = document.getElementById('previewImageThumbnail');
        const previewText = document.getElementById('previewImageCaption');
        
        if (previewContainer && previewImg && previewText) {
            previewImg.src = isImage ? URL.createObjectURL(file) : "data:image/svg+xml,...";
            previewText.innerText = `Anexado: ${file.name}`;
            previewContainer.style.display = 'flex';
        }
        input.value = '';
    }
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    let text = input.value.trim();
    if (!text && !currentImageFile) return;

    addFileMessage({ text, file: currentImageFile }, 'user-msg-pro');
    input.value = '';
    removeImagePreview();

    let fileContext = currentImageFile ? `Arquivo: ${currentImageFile.name}` : null;

    const typingMsg = addMessage("", 'ai-msg-pro');
    typingMsg.innerHTML = `<span class="web-icon">🕸️</span> Analisando código...`;

    const reply = await getGroqResponse(text, fileContext);
    
    const formattedReply = reply.replace(/\n/g, '<br>');
    
    typingMsg.innerHTML = `<span class="web-icon">🕸️</span> ${formattedReply}`;
    speak(reply);
}

function addFileMessage(data, className) {
    const chat = document.getElementById('chatWindow');
    const div = document.createElement('div');
    div.className = `msg ${className}`;
    
    if (data.file) {
        if (data.file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(data.file);
            img.style.maxWidth = "200px";
            img.style.borderRadius = "10px";
            div.appendChild(img);
        } else {
            div.innerHTML = `📄 <b>${data.file.name}</b>`;
        }
    }
    
    if (data.text) {
        const textDiv = document.createElement('div');
        textDiv.innerText = data.text;
        textDiv.style.marginTop = "6px";
        div.appendChild(textDiv);
    }
    
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function addMessage(text, className) {
    const chat = document.getElementById('chatWindow');
    const div = document.createElement('div');
    div.className = `msg ${className}`;
    div.innerHTML = text; 
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
}

const userInputElement = document.getElementById('userInput');
if (userInputElement) {
    userInputElement.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            sendMessage(); 
        }
    });
}