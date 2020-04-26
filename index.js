/***********************
 * @author Scott Bennett and Jacob Crouse, scottbennett027@gmail.com
 * @description A Discord bot to randomize and automate setting up scrims for competitive custom games
 **********************/

const Discord = require('discord.js');
const client = new Discord.Client();

const yargs = require('yargs-parser');
const secrets = require('./secrets');

const constants = require('./constants');

const { createValorant, valorantHelp } = require('./valorant');
const {
    moveMember,
    getLogger,
    initHelp,
    init,
    deleteWhenEmpty,
} = require('./utils');
const logger = getLogger('main');

// Use this to keep track of matches down the road....
let matchRegistry = {};

client.on('ready', () => {
    logger.info('Client Ready');

    client.user
        .setActivity('!help for help', { type: 'WATCHING' })
        .catch((e) => {
            console.log('Error setting activity: ' + e);
        });
    client.on('message', (receivedMessage) => {
        // Prevent bot from responding to its own messages
        if (receivedMessage.author === client.user) {
            return;
        }

        // Check for command
        if (receivedMessage.content.startsWith('!')) {
            // Only listen for commands in our created channel
            if (
                receivedMessage.channel.name === constants.TextChannel &&
                receivedMessage.channel.parent.name === constants.CategoryName
            ) {
                processCommand(receivedMessage);
            } else if (
                receivedMessage.content.startsWith('!init') &&
                receivedMessage.channel.type === 'text'
            ) {
                processCommand(receivedMessage);
            }
        }
    });
});

/********************
 * @function processCommand
 * @param receivedMsg The message received from the 'message' event
 ********************/
function processCommand(receivedMsg) {
    let cmd = receivedMsg.content.substr(1);
    let spaceIndex = cmd.indexOf(' ');
    let args = '';
    if (spaceIndex !== -1) {
        args = cmd.substr(spaceIndex + 1);
        cmd = cmd.substr(0, spaceIndex);
    }
    if (args) args = yargs(args);

    logger.info('Command Received: ' + cmd + '; Args: ' + JSON.stringify(args));

    if (cmd === 'help') {
        helpMessage(args, receivedMsg.channel);
    } else if (cmd === 'valorant') {
        if (args['help']) {
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
                    res['textChannel'] = receivedMsg.channel.id;
                    matchRegistry[matchId] = res;
                    receivedMsg.channel.send(msg);
                }
            });
        }
    } else if (cmd === 'complete') {
        if (args['help']) {
            completeHelp(receivedMsg.channel);
        } else {
            complete(args, receivedMsg.channel);
        }
    } else if (cmd === 'init') {
        if (args['help']) {
            initHelp(receivedMsg.channel);
        } else {
            init(receivedMsg.guild, (err) => {
                if (err) {
                    logger.error(err);
                    receivedMsg.channel.send('Error during init: ' + err);
                } else {
                    receivedMsg.channel.send(
                        'Channels successfully created :)'
                    );
                }
            });
        }
    } else {
        logger.info('Unrecognized command: ' + receivedMsg.content);
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
                    .delete('Match Expired')
                    .catch((err) => {
                        logger.error('Error deleting rooms: ' + err);
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
        'Syntax: !command --flag=value' +
            '\nPossible commands: valorant, complete' +
            '\nType `!command --help` for command options'
    );
}

/******************
 * @function completeHelp
 * @param textChannel
 *****************/
function completeHelp(textChannel) {
    textChannel.send(
        'Complete Help: `!complete --flag=value`' +
            '\nUsed to tell the bot that the match has concluded' +
            '\nPossible flags:' +
            '\n`--id`: The ID of the match to complete'
    );
}

/*****************
 * @function complete
 * @param args The arguments given to the command
 * @param textChannel The textChannel the command came from
 ****************/
function complete(args, textChannel) {
    if (!args['id']) {
        textChannel.send('Error: Complete command must contain --id flag');
        return;
    }
    let id = args['id'];
    if (!matchRegistry[id]) {
        textChannel.send('An invalid ID was provided. Please try again.');
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
                    logger.error('Error fetching members post-game: ' + err);
                });
        })
        .then(() => {
            voiceChannelIDs.forEach((id) => {
                deleteWhenEmpty(guild, id);
            });
        })
        .catch((err) => {
            logger.error('Error fetching guild: ' + err);
        })
        .finally(() => {
            textChannel.send(`Deleted Match ${id} from the registry`);
            delete matchRegistry[id];
        });
}

client.login(secrets.bot_secret_token);
