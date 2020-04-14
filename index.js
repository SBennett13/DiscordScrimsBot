const Discord = require('discord.js');
const client = new Discord.Client();

const secrets = require('./secrets')

client.on('ready', () => {
    console.log("Client Ready");

    client.user.setActivity("!help for help", {type: 'WATCHING'}).catch(e => {console.log("Error setting activity: " + e)})
    client.on('message', receivedMessage => {
        // Prevent bot from responding to its own messages
        if (receivedMessage.author == client.user) {
            return
        }
        
        // Check for command
        if (receivedMessage.content.startsWith("!")) {
            processCommand(receivedMessage)
        }
    })
})

function processCommand(receivedMsg){
    let cmd = receivedMsg.content.substr(1)
    let splitCmd = cmd.split(" ")
    cmd = splitCmd[0]
    let args = splitCmd.slice(1)

    console.log("Command Received: " + cmd)
    console.log("Arguments: " + args)

    if (cmd == "help"){
        helpMessage(args, receivedMsg)
    }else if (cmd == "valorant"){
        createValorant(args, receivedMsg)
    }
}

function helpMessage(args, receivedMessage){
    if (args.length === 0){
        receivedMessage.channel.send("This is the help command, brother.")
    }
}

function createValorant(args, receivedMessage){
    let target = receivedMessage.author;
    console.log(target)
    const voiceChannels = receivedMessage.guild.channels.cache.filter(v => v.type === "voice")
    let channelID;
    let found = false;
    let channelMembers;
    voiceChannels.each((vc, id) => {
        vc.members.each(member => {
            console.log(member)
            if (member.user.id === target.id){
                console.log("Found target " + target.username)
                channelID = id
                found = true
            }
        })
        if (found){
            channelMembers = vc.members.map(member => member.user.username)
        }
    })
    console.log(channelID)
    console.log(channelMembers)
}

client.login(secrets.bot_secret_token)