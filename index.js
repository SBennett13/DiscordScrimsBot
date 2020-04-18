/***********************
 * @author Scott Bennett and Jacob Crouse, scottbennett027@gmail.com
 * @description A Discord bot to randomize and automate setting up scrims for competitive custom games
 **********************/

const Discord = require("discord.js");
const client = new Discord.Client();

const yargs = require("yargs-parser");
const secrets = require("./secrets");

const { createValorant, valorantHelp } = require("./valorant");
const { moveMembers, getLogger, initHelp, init } = require("./utils");
const logger = getLogger("main");

// Use this to keep track of matches down the road....
let matchRegistry = {};

client.on("ready", () => {
    logger.info("Client Ready");

    client.user
        .setActivity("!help for help", { type: "WATCHING" })
        .catch((e) => {
            console.log("Error setting activity: " + e);
        });
    client.on("message", (receivedMessage) => {
        // Prevent bot from responding to its own messages
        if (receivedMessage.author == client.user) {
            return;
        }

        // Check for command
        if (receivedMessage.content.startsWith("!")) {
            processCommand(receivedMessage);
        }
    });
});

/********************
 * @function processCommand
 * @param receivedMsg The message received from the 'message' event
 ********************/
function processCommand(receivedMsg) {
    let cmd = receivedMsg.content.substr(1);
    let splitCmd = cmd.split(" ", 2);
    cmd = splitCmd[0];
    let args = "";
    if (splitCmd[1]) args = yargs(splitCmd[1]);

    logger.info("Command Received: " + cmd + "; Args: " + JSON.stringify(args));

    if (cmd === "help") {
        helpMessage(args, receivedMsg.channel);
    } else if (cmd === "valorant") {
        if (args["help"]) {
            valorantHelp(receivedMsg.channel);
        } else {
            createValorant(args, receivedMsg, (res) => {
                let temp = { ...res };
                let matchId = temp.matchID;
                delete temp.matchID;
                matchRegistry[matchId] = temp;
            });
        }
    } else if (cmd === "complete") {
        if (args["help"]) {
            completeHelp(receivedMsg.channel);
        } else {
            complete(args, receivedMsg.channel);
        }
    } else if (cmd === "init") {
        if (args["help"]) {
            initHelp(receivedMsg.channel);
        } else {
            init(receivedMsg.guild, (err) => {
                if (err) {
                    logger.error(err);
                    receivedMsg.channel.send("Error during init: " + err);
                } else {
                    receivedMsg.channel.send(
                        "Channels successfully created :)"
                    );
                }
            });
        }
    }
}

// Every 30 minutes, check to see if a match is older than 2 hours,
// If yes, delete it
let matchAgeInterval = setInterval(() => {
    Object.keys(matchRegistry).forEach((v) => {
        if (Date.now() - matchRegistry[v].date > 7200000) {
            matchRegistry[v].textChannel.send(
                `Match ${matchRegistry[v].matchID} has been going for over 2 hours...I'm deleting it from the registry.`
            );
            delete matchRegistry[v];
        }
    });
}, 1800);

/*****************
 * @function helpMessage
 * @param args The arguments to the help message
 * @param channel The message to send the help to
 *****************/
function helpMessage(args, channel) {
    channel.send(
        "Syntax: !command --flag=value" +
            "\nPossible commands: valorant, complete" +
            "\nType `!command --help` for command options"
    );
}

/******************
 * @function completeHelp
 * @param textChannel
 *****************/
function completeHelp(textChannel) {
    textChannel.send(
        "Complete Help: `!complete --flag=value`" +
            "\nUsed to tell the bot that the match has concluded" +
            "\nPossible flags:" +
            "\n`--id`: The ID of the match to complete"
    );
}

/*****************
 * @function complete
 * @param args The arguments given to the command
 * @param textChannel The textChannel the command came from
 ****************/
async function complete(args, textChannel) {
    if (!args["id"]) {
        textChannel.send("Error: Complete command must contain --id flag");
    }
    let id = args["id"];
    if (!matchRegistry[id]) {
        textChannel.send("An invalid ID was provided. Please try again.");
        return;
    }
    const { preChannel, teams } = matchRegistry[id];
    let returnPromises = [];
    let allTeams = Object.values(teams);
    allTeams.forEach((team) => {
        returnPromises.push(moveMembers(team, preChannel));
    });
    Promise.all(returnPromises)
        //moveMembers(team1, team2, preChannel, preChannel)
        .then((res) => {
            textChannel.send("Match " + id + " was concluded").channel;
            delete matchRegistry[id];
        })
        .catch((e) => {
            textChannel.send(
                "There was an error moving members to the Pre lobby. Error: " +
                    e
            );
        });
}

client.login(secrets.bot_secret_token);
