const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('dbstore.db');

let messages = [];

const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const secretKey = crypto.randomBytes(32); 
const iv = crypto.randomBytes(16);

function encrypt(text) {
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}


function storeData() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                type TEXT,
                chat TEXT,
                sender TEXT,
                senderName TEXT,
                body TEXT,
                time TEXT,
                repliedMessageId TEXT
            )
        `, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
                return;
            }

            messages.forEach((message) => {
                insertMessage(message);
            });
        });
    });
}

function loadMessagesFromDatabase() {
    db.all('SELECT * FROM messages', [], (err, rows) => {
        if (err) {
            console.error('Error retrieving messages from the database:', err.message);
            return;
        }
        
        rows.forEach(row => {
            messages.push({
                id: row.id,
                type: row.type,
                chat: row.chat,
                sender: row.sender,
                senderName: row.senderName,
                body: row.body,
                time: row.time,
                repliedMessageId: row.repliedMessageId
            });
        });

        console.log('Messages loaded from database:');
    });
}

function insertMessage(message) {
    db.get('SELECT id FROM messages WHERE id = ?', [message.id], (err, row) => {
        if (err) {
            console.error('Error checking for existing message:', err.message);
            return;
        }

        if (row) {
            //console.log(`Message with id ${message.id} already exists. Skipping insertion.`);
            return;
        }

        const stmt = db.prepare(`
            INSERT INTO messages (id, type, chat, sender, senderName, body, time, repliedMessageId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            message.id,
            message.type,
            message.chat,
            message.sender,
            message.senderName,
            message.body,
            message.time,
            message.repliedMessageId,
            (err) => {
                if (err) {
                    console.error('Error inserting message:', err.message);
                } else {
                    //console.log(`Message with id ${message.id} inserted successfully.`);
                }
            }
        );

        stmt.finalize();
    });
}

function startDataStorage() {
    setInterval(storeData, 60000);
}

function handleExit() {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0); 
    });
}

process.on('SIGINT', handleExit);

startDataStorage();

async function fetchMessages() {
    try {
        const baseUrl = typeof window === 'undefined' ? 'http://localhost:3000' : '';

        const response = await fetch(`${baseUrl}/messages`);
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

        if (typeof document !== 'undefined') {
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
            });

            getChatIdFromUrl();
            scrollToBottom();
        }

    } catch (error) {
        console.error('Error fetching messages:', error);
    }
}

function getChatIdFromUrl() {
    if (typeof window !== 'undefined' && openedChatID) {
        openChat(openedChatID);
    }
}

function scrollToBottom() {
    if (typeof document !== 'undefined') {
        const div = document.getElementById('msgInterface');
        div.scrollTop = div.scrollHeight;
    }
}

module.exports = { fetchMessages, loadMessagesFromDatabase, encrypt, decrypt };
