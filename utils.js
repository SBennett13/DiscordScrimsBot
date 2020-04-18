/***********************
 * A utils file for basic team making utilities
 **********************/

const winston = require("winston");

/*****************
 * @function getMap
 * @param game The game to choose a map for
 * @returns A random map for the chosen game
 */
function getMap(game) {
    let mapList = ["Split", "Bind", "Haven"];
    let rand = getRandom(mapList.length);
    return mapList[rand];
}

/******************
 * @function getPlayers
 * @param receivedMsg The received message from the 'message' event handler
 * @param excludes An array of users to exclude from the team choosing
 * @returns An array of GuildMembers representing all players eligible to play
 *****************/
function getPlayers(receivedMsg, excludes) {
    let participants = [];

    // Get the pregame channel and members to an array
    // Only not self/server deaf players
    const preChannel = receivedMsg.guild.channels.cache
        .filter((v) => v.name === "ScrimPre" && v.type === "voice")
        .first();
    if (!preChannel) {
        return {
            error:
                "The 'ScrimPre' Channel was not found. Please run `!init` to create voice channels",
        };
    }
    preChannel.members.each((v) => {
        if (!v.voice.deaf) participants.push(v);
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
        remainingPlayers = [...allPlayers];
    while (team2.length < teamSize) {
        let rand = getRandom(remainingPlayers.length);
        team1.push(remainingPlayers[rand]);
        remainingPlayers = [
            ...remainingPlayers.slice(0, rand),
            ...remainingPlayers.slice(rand + 1),
        ];

        rand = getRandom(remainingPlayers.length);
        team2.push(remainingPlayers[rand]);
        remainingPlayers = [
            ...remainingPlayers.slice(0, rand),
            ...remainingPlayers.slice(rand + 1),
        ];
    }
    return { team1: team1, team2: team2, extras: remainingPlayers };
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
        transports: [
            new winston.transports.File({
                filename: `./logs/scrimbot.log`,
            }),
            new winston.transports.Console(),
        ],
        levels: winston.config.syslog.levels,
    });
}

/************************
 * @function init
 * @param guild The guild to add voice channels to
 ***********************/
function init(guild, cb) {
    let preLobbyPromise = makeChannel(guild, "ScrimPre");
    let scrim1Promise = makeChannel(guild, "Scrim1A");
    let scrim2Promise = makeChannel(guild, "Scrim1B");
    Promise.all([preLobbyPromise, scrim1Promise, scrim2Promise])
        .then((res) => {
            cb(null);
        })
        .catch((err) => {
            console.log("Catch: ", err);
            cb(err);
        });
}

function initHelp(textChannel) {
    textChannel.send(
        "Init Help: `!init`" +
            "\nCreates 3 Voice channels: A pregame lobby, and two in-game lobbies."
    );
}

/******************
 * @function makeChannel
 * @param guild The guild to make a channel in
 * @param name The name to set for the channel
 *****************/
function makeChannel(guild, name) {
    if (
        !guild.channels.cache
            .filter((v) => v.name === name && v.type === "voice")
            .first()
    )
        return guild.channels.create(name, {
            type: "voice",
            reason: "Created by Scrims Bot",
        });
    else
        return new Promise((resolve, reject) => {
            resolve("Channel already exists");
        });
}

module.exports = {
    makeTeams: makeTeams,
    getPlayers: getPlayers,
    getMap: getMap,
    moveMembers: moveMembers,
    getRandom: getRandom,
    getLogger: getLogger,
    init: init,
    makeChannel: makeChannel,
    initHelp: initHelp,
};
