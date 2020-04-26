/***********************
 * A utils file for basic team making utilities
 **********************/

const winston = require("winston");
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
                " Channel was not found. Please run `!init` to create voice channels",
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
            ...remainingPlayers.slice(rand + 1),
        ];

        rand = getRandom(remainingPlayers.length);
        team2.push(remainingPlayers[rand]);
        remainingPlayers = [
            ...remainingPlayers.slice(0, rand),
            ...remainingPlayers.slice(rand + 1),
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
                reason: "Created by Scrims Bot",
            });
            parentID = category.id;
            console.log(category);
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
        "Init Help: `!init --flag=value ...`" +
            "\nDescription: Creates a category channel, a voice channel and a text channel for use with the bot"
    );
}

/********************
 * @fucntion registerHelp
 * @param textChannel The text channel to post to
 *******************/
function registerHelp(textChannel) {
    textChannel.send(
        "Register Help: `!register --riotID=value --region=value`" +
            "\nDescription: Associates user's Riot ID with their Discord ID in our database" +
            "\nUsage: For riotID, set value equal to user's Riot ID, encompassed in quotes (ie. `--riotID='SampleUsername#1234'`)" +
            "\nFor region, set value equal to the region that the user plays in, encompassed in quotes (ie. `--region='NA'`)" +
            "\nPossible Regions: `NA, EUW, EUN`"
    );
}

/********************
 * @function register
 * @param textChannel The text channel to post to
 *******************/
function register(args, textChannel) {
    if (args["riotID"] && args["region"]) {
        //Does nothing but will eventually associate discord user who sent the message with the inputted riotID and region
        //We'll need to do some mapping to whatever the Riot API ends up using for regions (ie. For league NA is actually NA1)
        textChannel.send(
            "You've registered! If you ever need to reassociate your discord user with another riot account, just call the command again here with the new info :)"
        );
    } else {
        textChannel.send(
            "We had trouble processing your registration, please call `!register --help` to see the correct syntax"
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
        parent: parentChannel,
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
        parent: parentChannel,
    });
}

/*****************
 * @function findFirstAvailable
 * @param array A sorted array of numbers
 * @param start The index to start at
 * @param stop The index to stop at
 * @returns The lowest available index
 ****************/
function findFirstAvailable(array, start, stop) {
    if (start > stop) return stop + 1;
    if (start !== array[start]) return start;

    let mid = (start + stop) / 2;
    if (mid === array[mid]) return findFirstAvailable(array, mid + 1, stop);
    return findFirstAvailable(array, start, mid);
}

/*******************
 * @function deleteWhenEmpty
 * @param guild The guild object
 * @param id The channel Ids
 ******************/
function deleteWhenEmpty(guild, id) {
    let channel = guild.channels.cache.filter((v) => v.id === id).first();
    let deleteInterval = setInterval(() => {
        channel.fetch().then((channel) => {
            if (channel.members.keyArray().length === 0) {
                channel.delete("Match Completed");
                clearInterval(deleteInterval);
            }
        });
    }, 5000);
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
    findFirstAvailable: findFirstAvailable,
    deleteWhenEmpty: deleteWhenEmpty,
    registerHelp: registerHelp,
    register: register,
};
