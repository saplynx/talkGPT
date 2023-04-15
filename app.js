require('dotenv').config();

const axios = require('axios');

const { Client , LocalAuth, Chat } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const url = 'https://api.openai.com/v1/chat/completions';
const options = {
    headers: {
        "Content-Type" : "application/json",
        "Authorization" : `Bearer ${process.env.OPENAI_API_KEY}`
    }
};


const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: ".wwebjs_auth",
        clientId: "only-client"
    })
});

// client.on('qr', qr => {
//     qrcode.generate(qr, {small: true});
// });

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('auth_failure', (e) => {
    console.log(`authentication failure: ${e}`);
});


let pending = [];

client.on('message', async message => {
    console.log(message.from, ':', message.body);

    chat = await client.getChatById(message.from);
    chat.sendStateTyping();

    if (pending.includes(message.from)) {
        client.sendMessage(message.from, 'Only send one message at a time');
    } else {
        pending.push(message.from);

        arr = await chat.fetchMessages({limit:3, fromMe:false});

        let body = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": "You are a friendly helpful chatbot. You talk with users and comfort them."},
                {"role": "user", "content": arr[0].body},
                {"role": "assistant", "content": arr[1].body},
                {"role": "user", "content": message.body}
            ],
            "temperature": 0.7
        };

        await axios.post(url, body, options)
        .then((res) => {
            let l = res.data.choices.length;
            for (let i=0; i<l; i++) {
                console.log(res.data.choices[i].message.content);
                client.sendMessage(message.from, res.data.choices[i].message.content);
            }
        }, (err) => {
            console.log(err.response.data.error);
        });

        let j = pending.indexOf(message.from);
        if (j !== -1) {
            pending.splice(j, 1);
        }
    }

});


client.initialize();

