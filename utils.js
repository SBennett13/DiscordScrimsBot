/***********************
 * A utils file for basic team making utilities
 **********************/

const winston = require("winston");
require("winston-daily-rotate-file");
const {
    uniqueNamesGenerator,
    adjectives,
    names
} = require("unique-names-generator");
const constants = require("./constants");

/*****************
 * @function getMap
 * @param game The game to choose a map for
 * @returns A random map for the chosen game
 */
function getMap(game) {
    if (game === "valorant") {
        let mapList = ["Split", "Bind", "Haven"];
        let rand = getRandom(mapList.length);
        return mapList[rand];
    } else return null;
}

/******************
 * @function getPlayers
 * @param receivedMsg The received message from the 'message' event handler
 * @param excludes An array of users to exclude from the team choosing
 * @returns An array of GuildMembers representing all players eligible to play
 *****************/
function getPlayers(guild, excludes = []) {
    let participants = [];

    // Get the pregame channel and members to an array
    // Only not self/server deaf players
    const preChannel = guild.channels.cache
        .filter(
            (v) => v.name === constants.PregameChannel && v.type === "voice"
        )
        .first();
    if (!preChannel) {
        return {
            error:
                "The " +
                constants.PregameChannel +
                " Channel was not found. Please run `!init` to create voice channels"
        };
    }
    preChannel.members.each((v) => {
        if (
            !v.voice.deaf &&
            !excludes.includes(v.nickname) &&
            !excludes.includes(v.displayName)
        )
            participants.push(v);
    });

    return { participants: participants, preChannel: preChannel };
}

/*******************
 * @function makeTeams
 * @param allPlayers An array of GuildMembers to put into teams
 * @param teamSize The number of players per team
 * @returns An object containing team1(array of GuildMembers), team2(array of GuildMembers), extras(array of GuildMembers)
 ******************/
function makeTeams(allPlayers, teamSize) {
    if (allPlayers.length < teamSize * 2) {
        return { makeTeamsError: "Too few players" };
    }
    let team1 = [],
        team2 = [],
        remainingPlayers = allPlayers;
    while (team2.length < teamSize) {
        let rand = getRandom(remainingPlayers.length);
        team1.push(remainingPlayers[rand]);
        remainingPlayers = [
            ...remainingPlayers.slice(0, rand),
            ...remainingPlayers.slice(rand + 1)
        ];

        rand = getRandom(remainingPlayers.length);
        team2.push(remainingPlayers[rand]);
        remainingPlayers = [
            ...remainingPlayers.slice(0, rand),
            ...remainingPlayers.slice(rand + 1)
        ];
    }
    return { team1: team1, team2: team2 };
}

/******************
 * @function moveMembers
 * @param team An array of GuildMembers that is the team
 * @param channel The VoiceChannel for the team
 *****************/
function moveMembers(team, channel) {
    return new Promise((resolve, reject) => {
        let teamPromises = [];
        team.forEach((u) => {
            teamPromises.push(u.edit({ channel: channel }));
        });
        Promise.all(teamPromises)
            .then((res) => {
                resolve();
            })
            .catch((error) => {
                reject(error);
            });
    });
}

/****************
 * @function moveMember
 * @param player A guild member to move
 * @param channel The channel to move the guildmember to
 * @returns A promise that resolves to a guild member
 */
function moveMember(player, channel) {
    return player.edit({ channel: channel });
}

/****************
 * @function getRandom
 * @param max The number of possibilities
 * @returns A random int [0,max)
 ***************/
function getRandom(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

/************************
 * @function getLogger
 * @param name The name to attach to the logger
 * @returns A winston logger instance
 ***********************/
function getLogger(name) {
    let fileLogger = new winston.transports.DailyRotateFile({
        filename: "pugsbot-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        dirname: "./logs",
        maxFiles: 10
    });
    return winston.createLogger({
        level: "info",
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ level, timestamp, message }) => {
                let datetime = timestamp.split("T");
                let date = datetime[0],
                    time = datetime[1].substring(0, datetime[1].length - 1);
                return `${date}|${time} [${name.toLocaleUpperCase()}|${level.toLocaleUpperCase()}]: ${message}`;
            })
        ),
        transports: [fileLogger, new winston.transports.Console()],
        levels: winston.config.syslog.levels
    });
}

/************************
 * @function init
 * @param guild The guild to add voice channels to
 ***********************/
async function init(guild, cb) {
    try {
        let parentID;
        if (
            !guild.channels.cache
                .filter(
                    (v) =>
                        v.name === constants.CategoryName &&
                        v.type === "category"
                )
                .first()
        ) {
            let category = await guild.channels.create(constants.CategoryName, {
                type: "category",
                reason: "Created by Scrims Bot"
            });
            parentID = category.id;
        } else {
            parentID = await guild.channels.cache
                .filter(
                    (v) =>
                        v.name === constants.CategoryName &&
                        v.type === "category"
                )
                .first().id;
        }
        if (
            !guild.channels.cache
                .filter(
                    (v) =>
                        v.name === constants.PregameChannel &&
                        v.type === "voice" &&
                        v.parentID === parentID
                )
                .first()
        ) {
            await makeVoiceChannel(guild, constants.PregameChannel, parentID);
        }
        if (
            !guild.channels.cache
                .filter(
                    (v) =>
                        v.name === constants.TextChannel &&
                        v.type === "text" &&
                        v.parentID === parentID
                )
                .first()
        ) {
            await makeTextChannel(guild, constants.TextChannel, parentID);
        }
        cb(null);
    } catch (error) {
        cb(error);
        return;
    }
}

/********************
 * @function initHelp
 * @param textChannel The text channel to post to
 *******************/
function initHelp(textChannel) {
    textChannel.send(
        "Init Help: `!init`" +
            "\nDescription: Creates a category channel, a voice channel and a text channel for use with the bot"
    );
}

/********************
 * @fucntion registerHelp
 * @param channel The text channel to post to
 *******************/
let registerHelpString =
    "Register Help: `!register --riotID=value --region=value`" +
    "\nDescription: Associates user's Riot ID with their Discord ID in our database" +
    "\nUsage: For riotID, set value equal to user's Riot ID, encompassed in quotes (ie. `--riotID='SampleUsername#1234'`)" +
    "\nFor region, set value equal to the region that the user plays in, encompassed in quotes (ie. `--region='NA'`)" +
    "\nPossible Regions: `NA, EUW, EUN`";

function registerHelp(channel) {
    let textDisclaimer = "";
    if (channel.type === "text") {
        textDisclaimer =
            "\nIn order to register, DM me with the register command, including your riotID and region flags.";
    }
    channel.send(registerHelpString + textDisclaimer);
}

/********************
 * @function register
 * @param channel The text channel to post to
 *******************/
function register(args, channel) {
    if (args["riotID"] && args["region"]) {
        //Does nothing but will eventually associate discord user who sent the message with the inputted riotID and region
        //We'll need to do some mapping to whatever the Riot API ends up using for regions (ie. For league NA is actually NA1)
        channel.send(
            "You've registered! If you ever need to reassociate your discord user with another riot account, just call the command again here with the new info :)"
        );
    } else {
        channel.send(
            "We had trouble processing your registration...\n" +
                registerHelpString
        );
    }
}

/******************
 * @function makeVoiceChannel
 * @param guild The guild to make a channel in
 * @param name The name to set for the channel
 *****************/
function makeVoiceChannel(guild, name, parentChannel) {
    return guild.channels.create(name, {
        type: "voice",
        reason: "Created by Scrims Bot",
        parent: parentChannel
    });
}

/******************
 * @function makeTextChannel
 * @param guild The guild to make a channel in
 * @param name The name to set for the channel
 *****************/
function makeTextChannel(guild, name, parentChannel) {
    return guild.channels.create(name, {
        type: "text",
        reason: "Created by Scrims Bot",
        parent: parentChannel
    });
}

/*******************
 * @function deleteWhenEmpty
 * @param guild The guild object
 * @param id The channel Ids
 * @param timer Time to check for channel emptiness
 ******************/
function deleteWhenEmpty(guild, id, timer = null) {
    let channel = guild.channels.cache.filter((v) => v.id === id).first();
    let deleteInterval = setInterval(() => {
        channel.fetch().then((channel) => {
            if (channel.members.keyArray().length === 0) {
                channel.delete("Match Completed");
                clearInterval(deleteInterval);
            }
        });
    }, timer || 5000);
}

/******************
 * @function splitChannel
 * @param guild The guild object
 * @param args The args provided
 *****************/
function splitChannel(guild, args) {
    return new Promise((resolve, reject) => {
        let channel;
        if (args["channel"]) {
            channel = guild.channels.cache
                .filter((v) => v.name === args["channel"])
                .first();
        } else {
            reject(
                "No channel provided, use --channel to supply a channel name"
            );
        }

        let peopleInChannel = [];
        channel.members.each((v) => {
            peopleInChannel.push(v);
        });

        let group1 = [],
            group2 = [];
        while (peopleInChannel.length > 0) {
            let rand = getRandom(peopleInChannel.length);
            group1.push(peopleInChannel[rand]);
            peopleInChannel = [
                ...peopleInChannel.slice(0, rand),
                ...peopleInChannel.slice(rand + 1)
            ];

            rand = getRandom(peopleInChannel.length);
            group2.push(peopleInChannel[rand]);
            peopleInChannel = [
                ...peopleInChannel.slice(0, rand),
                ...peopleInChannel.slice(rand + 1)
            ];
        }

        // Make two channels
        const chan1Name = uniqueNamesGenerator({
            dictionaries: [adjectives, names],
            length: 2
        });
        const chan2Name = uniqueNamesGenerator({
            dictionaries: [adjectives, names],
            length: 2
        });

        Promise.all([
            makeVoiceChannel(guild, chan1Name, null),
            makeVoiceChannel(guild, chan2Name, null)
        ])
            .then((res) => {
                let chan1 = res[0],
                    chan2 = res[1];
                // Move people
                let group1Move = moveMembers(group1, chan1),
                    group2Move = moveMembers(group2, chan2);

                Promise.all([group1Move, group2Move])
                    .then((res) => {
                        deleteWhenEmpty(guild, chan1.id, 1800000);
                        deleteWhenEmpty(guild, chan2.id, 1800000);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            })
            .catch((err) => {
                reject(err);
            });
    });
}

module.exports = {
    makeTeams: makeTeams,
    getPlayers: getPlayers,
    getMap: getMap,
    moveMembers: moveMembers,
    moveMember: moveMember,
    getRandom: getRandom,
    getLogger: getLogger,
    init: init,
    makeVoiceChannel: makeVoiceChannel,
    makeTextChannel: makeTextChannel,
    initHelp: initHelp,
    deleteWhenEmpty: deleteWhenEmpty,
    registerHelp: registerHelp,
    register: register,
    splitChannel: splitChannel
};
