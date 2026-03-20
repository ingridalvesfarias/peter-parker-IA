const GROQ_API_KEY = "SUA_CHAVE_GROQ";
let isVoiceEnabled = true;
let chatHistory = [];
let currentImageFile = null;

async function getGroqResponse(userText, fileContext = null) {
    try {

        let systemPrompt = `Você é o Peter Parker, parceiro de laboratório, mentor de programação e amigo próximo da Ingrid. Sua principal tarefa (além de ser amigo dela) é ajudar a Ingrid a ser uma desenvolvedora Full Stack incrível, organizando e criando códigos para ela.
        
        Sua personalidade:
        - Você é inteligente, leal, levemente descontraído e muito prestativo.
        - Se a Ingrid falar de código, foque em ser um mentor Full Stack incrível (HTML, CSS, JS, Python, React, TypeScript, Node.js, Java, Frontend e Backend, etc).
        - Se ela falar de assuntos aleatórios, sentimentos, filosofia ou o dia a dia, filmes, séries, jogos, seja um amigo real: ouça, dê opiniões, seja simpático e mantenha o papo fluindo.
        - Se a Ingrid falar de um livro, filme, jogo ou série de TV, música, ou seja, um assunto que você não conhece, diga: "Vou procurar isso no Google e envio para você!".
        - Converse sobre absolutamente tudos os assuntos, se a Ingrid perguntar, tente responder de forma direta e amigável.
        - Se a Ingrid falar de BTS, converse super animado com ela e saiba bem do assunto pra deixar a Ingrid feliz.
        
        REGRAS DE OURO:
        1. Para códigos: envie o bloco COMPLETO e corrigido usando Markdown (\`\`\`html ... \`\`\`).
        2. Organização: Use listas numeradas ou marcadores com espaço entre as linhas.
        3. Tom de voz: Amigável, direto e sem emojis (estilo clássico do Peter).
        4. Versatilidade: Não diga "sou apenas uma IA". Aja como o Peter Parker que se importa com o progresso e o bem-estar da Ingrid.
        5. Verifique sempre: Semântica HTML, organização do CSS (Flexbox/Grid) e lógica JS.
        6. Se ela pedir para organizar, refatorar ou criar um código, envie o código COMPLETO e corrigido.`;

        let userMessageContext = userText;
        if (fileContext) {
            userMessageContext = `Contexto do arquivo: ${fileContext}. \n\n Pergunta da Ingrid: ${userText}`;
        }

        const messages = [
            { role: "system", content: systemPrompt },
            ...chatHistory,
            { role: "user", content: userMessageContext }
        ];

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: messages,
                temperature: 0.8,
                max_tokens: 1024
            })
        });

        const data = await response.json();
        const aiReply = data.choices[0].message.content;

        chatHistory.push({ role: "user", content: userText });
        chatHistory.push({ role: "assistant", content: aiReply });
        if (chatHistory.length > 20) chatHistory.shift();

        return aiReply;

    } catch (error) {
        return "Erro ao conectar na rede, Ingrid. Verifique sua chave API.";
    }
}

// --- CONFIGURAÇÃO DA VOZ (PETER) ---
function speak(text) {
    if (!isVoiceEnabled) return;
    window.speechSynthesis.cancel();

    // Limpa as marcações de código e símbolos para a voz ficar natural
    const cleanText = text.replace(/```[\s\S]*?```/g, 'Aqui está o código atualizado.')
        .replace(/[*#]/g, '');

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

// --- ENVIO E RENDERIZAÇÃO ---
async function sendMessage() {
    const input = document.getElementById('userInput');
    let text = input.value.trim();
    if (!text && !currentImageFile) return;

    addFileMessage({ text, file: currentImageFile }, 'user-msg-pro');
    input.value = '';
    removeImagePreview();

    let fileContext = currentImageFile ? `Arquivo: ${currentImageFile.name}` : null;

    const typingMsg = addMessage("", 'ai-msg-pro');
    typingMsg.innerHTML = `<span class="web-icon">🕸️</span> Pensando...`;

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