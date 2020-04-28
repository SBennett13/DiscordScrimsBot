/***********************
 * @author Scott Bennett and Jacob Crouse, scottbennett027@gmail.com
 * @description A Discord bot to randomize and automate setting up scrims for competitive custom games
 **********************/

const Discord = require("discord.js");
const client = new Discord.Client();
require("dotenv").config();

const yargs = require("yargs-parser");

const constants = require("./constants");

const { createValorant, valorantHelp } = require("./valorant");
const {
    moveMember,
    getLogger,
    initHelp,
    init,
    deleteWhenEmpty,
    registerHelp,
    register
} = require("./utils");
const logger = getLogger("main");

// Use this to keep track of matches down the road....
let matchRegistry = {};

const developers = [process.env.SB3_ID, process.env.GRAVITY_ID];

client.on("ready", () => {
    logger.info("Client Ready");

    client.user.setAvatar("./images/botImg.png").catch((err) => {
        logger.error("Error setting avatar: " + err);
    });
    client.user
        .setActivity("!help for help", { type: "WATCHING" })
        .catch((e) => {
            logger.error("Error setting activity: " + e);
        });

    client.on("guildCreate", (guild) => {
        init(guild, (err) => {
            if (err) {
                logger.error(
                    `Error initing in new Guild ${guild.name}: ` + err
                );
            } else {
                let textChannel = guild.channels.cache
                    .filter(
                        (v) =>
                            v.name === constants.TextChannel &&
                            v.parent.name === constants.CategoryName
                    )
                    .first();
                textChannel.send(
                    "Thanks for using PugsBot! When I joined, I auto initialized and am ready for use. " +
                        "I am only listening to this channel for commands. Use `!help` to get a listing of my commands. " +
                        "See command options with `!command --help`. Please notify server admins if bugs are found so this" +
                        "bot can be improved!"
                );
            }
        });
    });
    client.on("message", (receivedMessage) => {
        // Prevent bot from responding to its own messages
        if (receivedMessage.author === client.user) {
            return;
        }

        if (
            developers.includes(receivedMessage.author.id) &&
            receivedMessage.content.startsWith("!UPDATE") &&
            receivedMessage.channel.type === "dm"
        ) {
            echoGlobal(receivedMessage);
            return;
        }

        // Check for command
        if (receivedMessage.content.startsWith("!")) {
            // Only listen for commands in our created channel
            if (
                receivedMessage.channel.name === constants.TextChannel &&
                receivedMessage.channel.parent.name === constants.CategoryName
            ) {
                processCommand(receivedMessage);
            } else if (
                receivedMessage.content.startsWith("!init") &&
                receivedMessage.channel.type === "text"
            ) {
                processCommand(receivedMessage);
            } else if (
                receivedMessage.channel.type === "dm" &&
                receivedMessage.content.startsWith("!register")
            ) {
                processCommand(receivedMessage);
            }
        }
    });
});

/*********************
 * @function echoGlobal
 ********************/
function echoGlobal(receivedMessage) {
    let spaceIndex = receivedMessage.content.indexOf(" ");
    let msg = receivedMessage.content.substr(spaceIndex + 1);

    client.guilds.cache.each((guild) => {
        guild.fetch().then((guildObj) => {
            let textChannel = guildObj.channels.cache
                .filter(
                    (v) =>
                        v.name === constants.TextChannel &&
                        v.parent.name === constants.CategoryName
                )
                .first();
            if (textChannel) {
                textChannel.send("-----------GLOBAL-----------\n" + msg);
            }
        });
    });
}

/********************
 * @function processCommand
 * @param receivedMsg The message received from the 'message' event
 ********************/
function processCommand(receivedMsg) {
    let cmd = receivedMsg.content.substr(1);
    let spaceIndex = cmd.indexOf(" ");
    let args = "";
    if (spaceIndex !== -1) {
        args = cmd.substr(spaceIndex + 1);
        cmd = cmd.substr(0, spaceIndex);
    }
    if (args) args = yargs(args);

    if (cmd === "help") {
        helpMessage(args, receivedMsg.channel);
    } else if (cmd === "valorant") {
        if (args["help"]) {
            valorantHelp(receivedMsg.channel);
        } else {
            createValorant(args, receivedMsg.guild, (res) => {
                if (res.error) {
                    receivedMsg.channel.send(res.error);
                } else {
                    let matchId = res.matchID,
                        msg = res.msg;
                    delete res.matchID;
                    delete res.msg;
                    res["textChannel"] = receivedMsg.channel.id;
                    matchRegistry[matchId] = res;
                    receivedMsg.channel.send(msg);
                }
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
    } else if (cmd === "register") {
        receivedMsg.channel.send(
            "This feature will be used to link Discord and Valorant accounts for PUGs stat tracking when Riot Games releases their API. Stay tuned."
        );
        /*if (args["help"] || receivedMsg.channel.type === "text") {
            registerHelp(receivedMsg.channel);
        } else {
            register(args, receivedMsg.channel);
        }*/
    } else if (cmd === "bug") {
        receivedMsg.channel.send(
            "Please report bugs to your server admins as you find them. We, the developers, work full-time jobs " +
                "but we will try to fix bugs when we aren't also playing :)"
        );
    } else {
        logger.info("Unrecognized command: " + receivedMsg.content);
    }
}

// Every 30 minutes, check to see if a match is older than 2 hours,
// If yes, delete it
let matchAgeInterval = setInterval(() => {
    Object.keys(matchRegistry).forEach((v) => {
        if (Date.now() - matchRegistry[v].date > 7200000) {
            // Fetch the original text channel, if it can be fetched, send the expiration
            // message to the channel, if not, log the error anyway. Delete the match either way
            let guild = client.guilds.resolve(matchRegistry[v].guildID);
            let voiceChannelIDs = matchRegistry[v].voiceChannelIDs;
            let textChannel = guild.channels.resolve(
                matchRegistry[v].textChannel
            );
            textChannel.send(
                `Match ${v} has been going for over 2 hours...I'm deleting it from the registry.`
            );

            voiceChannelIDs.forEach((id) => {
                guild.channels
                    .resolve(id)
                    .delete("Match Expired")
                    .catch((err) => {
                        logger.error("Error deleting rooms: " + err);
                    });
            });

            delete matchRegistry[v];
        }
    });
}, 1800000);

/*****************
 * @function helpMessage
 * @param args The arguments to the help message
 * @param channel The message to send the help to
 *****************/
function helpMessage(args, channel) {
    channel.send(
        "Syntax: !command --flag=value" +
            "\nPossible commands: valorant, complete, init, bugs" +
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
function complete(args, textChannel) {
    if (!args["id"]) {
        textChannel.send("Error: Complete command must contain --id flag");
        return;
    }
    let id = args["id"];
    if (!matchRegistry[id]) {
        textChannel.send("An invalid ID was provided. Please try again.");
        return;
    }

    const { preChannelID, playerIDs, guildID, voiceChannelIDs } = matchRegistry[
        id
    ];
    let guild = client.guilds.resolve(guildID);
    let guildMembersPromises = [];

    guild
        .fetch()
        .then((guildObj) => {
            playerIDs.forEach((id) => {
                guildMembersPromises.push(guildObj.members.fetch(id));
            });
            // guildMembersPromises = [GuildMembers]
            Promise.all(guildMembersPromises)
                .then((guildMembers) => {
                    guildMembers.forEach((member) => {
                        // Just attempt to move each. if it fail, oh well
                        moveMember(member, preChannelID).catch((error) => {
                            logger.error(
                                `Error moving member ${member.id}: ${error}`
                            );
                        });
                    });
                })
                .catch((err) => {
                    logger.error("Error fetching members post-game: " + err);
                });
        })
        .then(() => {
            voiceChannelIDs.forEach((id) => {
                deleteWhenEmpty(guild, id);
            });
        })
        .catch((err) => {
            logger.error("Error fetching guild: " + err);
        })
        .finally(() => {
            textChannel.send(`Deleted Match ${id} from the registry`);
            delete matchRegistry[id];
        });
}

client.login(process.env.BOT_TOKEN);
