
let messages = [];
let chatMessages = [];

const path = window.location.pathname;
let openedChatID = path.substring(1); 

document.addEventListener('DOMContentLoaded', () => {
    let storedData = localStorage.getItem('whatslocalmessagess');
    
    if (storedData) {
        try {
            let parsedData = JSON.parse(storedData);

            if (Array.isArray(parsedData)) {
                messages = parsedData.flat();
            } else {
                messages = [parsedData];
            }
        } catch (e) {
            console.error('Failed to parse stored data:', e);
        }
    } else {
        console.log('No data found in localStorage');
    }

    console.log(messages);

});



async function fetchMessages() {
    try {
        const response = await fetch('/messages');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const responseData = await response.json();

        if (Array.isArray(responseData)) {
            messages = messages.concat(responseData);
        } else if (responseData && typeof responseData === 'object') {
            messages.push(responseData);
        } else {
            console.error('Unexpected data format:', responseData);
        }

        const chatList = document.getElementById('chat_list');
        chatList.innerHTML = '';

        console.log("messages", messages);

        messages.forEach(msg => {
            if (!document.querySelector(`[data-chat-id="${msg.chat}"]`)) {
                const chatItem = document.createElement('div');
                chatItem.className = 'chat w-full shadow-md text-slate-600 px-5 flex-nowrap overflow-hidden border-t-0 cursor-pointer hover:bg-slate-50 ease-in-out duration-300 rounded-lg py-4';
                chatItem.dataset.chatId = msg.chat;
                chatItem.innerText = msg.chat;
                chatItem.onclick = () => {
                    window.location.href = `/${msg.chat}`;
                };
                
                chatList.appendChild(chatItem);
            }
            getChatIdFromUrl();
            scrollToBottom();
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
}

fetchMessages();


const getMessages = (messages, chatId) => {
    return messages.filter(message => message.chat === chatId);
};
const getReplyMessage = (messages, msgId) => {
    return messages.filter(message => message.id === msgId);
};

function getChatIdFromUrl() {
    if(openedChatID){
        openChat(openedChatID);
    }
}


function openChat(id) {
    chatMessages = getMessages(messages, id);
    //console.log('Messages in chat:', chatMessages);
    const messageForm = document.getElementById('messageForm');
    messageForm.classList.remove('hidden');
    messageForm.classList.add('flex');

    document.getElementById('msg-input').focus();

    const msgInterface = document.getElementById('msgInterface');
    const mainBar = document.getElementById('mainBar');
    const chatIdElement = document.getElementById('chat_id');
    msgInterface.innerHTML = '';
    chatIdElement.innerHTML = '';
    mainBar.classList.remove('hidden');
    chatMessages.forEach(msg => {
        if (msg.sender === openedChatID) {
            msgInterface.innerHTML += `<div class="w-full flex justify-start" >
                                            <div onclick="replyTo('${msg.id}')" class="max-w-80 bg-slate-300 text-sm text-slate-800 rounded-2xl py-1 px-4 cursor-pointer" title="${new Date(msg.time).toLocaleString()}">${msg.body}</div>
                                        </div>`;
        } else {
            msgInterface.innerHTML += `<div class="w-full justify-end flex" >
                                            <div onclick="replyTo('${msg.id}')" class="max-w-80 bg-slate-700 text-slate-100 text-sm rounded-2xl py-1 px-4 text-start flex justify-end cursor-pointer" title="${new Date(msg.time).toLocaleString()}">${msg.body}</div>
                                        </div>`;
        }
        chatIdElement.innerHTML = openedChatID + '|' + msg.senderName;
    });
}


function updateChat(repId) {
    const msgInput = document.getElementById('msg-input');
    const msgInputValue = msgInput.value;
    
    const chatId = openedChatID;

    if(!repId){
        const repId = '';
    }
    
    fetch('/send-message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chatId, text: msgInputValue, repid: repId })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Message sent:', data);
        msgInput.value = '';
        msgInput.focus();
        scrollToBottom();
        fetchMessages();
    })
    .catch(error => {
        console.error('Error:', error);
    });
}


let safem = 0;

function safeMode() {
    const appElement = document.getElementById('app');
    
    if (safem === 0) {
        appElement.classList.add('hidden');
        safem = 1;
    } else {
        appElement.classList.remove('hidden');
        safem = 0;
    }
}

function insertEmoji(element){
    emoji = element.innerHTML;

    msgInput = document.getElementById('msg-input');

    msgInput.value += emoji;
    msgInput.focus();
}
function onload(){
    fetchMessages();
}

function scrollToBottom() {
    const div = document.getElementById('msgInterface');
    div.scrollTop = div.scrollHeight;
}


function storedData() {
    const messagesString = JSON.stringify(messages);
    localStorage.setItem('whatslocalmessages', messagesString);
}

setInterval(storedData, 60000);

function replyTo(id){
    replyMessageContainer = document.getElementById('reply-msg-container');
    showReply = document.getElementById('reply-msg');

    replyMessageContainer.classList.remove('hidden');
    replyMessageContainer.classList.add('flex');

    const replyMessages = getReplyMessage(messages, id);

    if (Array.isArray(replyMessages) && replyMessages.length > 0) {
        const replyMessage = replyMessages[0];
        if (replyMessage && replyMessage.body) {
            const truncatedText = replyMessage.body.substring(0, 50);
            showReply.innerHTML = truncatedText;
        } else {
            showReply.innerHTML = 'No body found';
        }
    } else {
        showReply.innerHTML = 'No messages found';
    }

    updateChat(id);
}


function msgTo() {
    const msgToInput = document.getElementById('msgToInput').value;
    const newUrl = `/${msgToInput}@s.whatsapp.net`;
    window.location.href = newUrl;
}

