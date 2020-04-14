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
    //console.log("Arguments: " + args)

    if (cmd == "help"){
        helpMessage(args, receivedMsg)
    }else if (cmd == "valorant"){
        createValorant(args, receivedMsg)
    }
}

function getPlayers(receivedMsg, excludes){
    let participants = []
    const preChannel = receivedMsg.guild.channels.cache.filter(v => v.name === "Side Hoe Quarantine" && v.type === 'voice').first()
    preChannel.members.each(v => {participants.push(v.user.username)})
    return participants
}

function makeTeams(allPlayers, teamSize){
    if (allPlayers.length < teamSize * 2){
        return {makeTeamsError: "Too few players"}
    }
    let team1 = [], team2 = [], remainingPlayers = [...allPlayers];
    while (team2.length < teamSize){
        let rand = getRandom(remainingPlayers.length);
        team1.push(remainingPlayers[rand]);
        remainingPlayers = [...remainingPlayers.slice(0, rand), ...remainingPlayers.slice(rand+1)]

        rand = getRandom(remainingPlayers.length);
        team2.push(remainingPlayers[rand])
        remainingPlayers = [...remainingPlayers.slice(0, rand), ...remainingPlayers.slice(rand+1)]
    }
    return {team1: team1, team2:team2, extras: remainingPlayers}
}

function getMap(){
    mapList = ["Split", "Bind", "Haven"];
    let rand = getRandom(mapList.length);
    return mapList[rand];
}

function helpMessage(args, receivedMessage){
    if (args.length === 0){
        receivedMessage.channel.send("This is the help command, brother.")
    }
}

function createValorant(args, receivedMessage){
    let players = getPlayers(receivedMessage);
    const {team1, team2, extras, makeTeamsError} = makeTeams(players, 5)
    if (makeTeamsError){
        receivedMessage.channel.send("Error making Valorant Teams: " + makeTeamsError)
        return
    }
    let map = getMap();
    const attackChannel = receivedMessage.guild.channels.cache.filter(v => v.name === "Scrim1A" && v.type === 'voice').first();
    const defendChannel = receivedMessage.guild.channels.cache.filter(v => v.name === "Scrim1B" && v.type === 'voice').first();

    //console.log(team1, team2, extras)

    receivedMessage.channel.send("Team 1: " + team1.join(", ") + "\nTeam 2: " + team2.join(", ") + "\nReserves: " + extras.join(", "))

}

function getRandom(max){
    return Math.floor(Math.random() * Math.floor(max))
}

client.login(secrets.bot_secret_token)
