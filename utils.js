/***********************
 * A utils file for basic team making utilities
 **********************/

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
    const preChannel = receivedMsg.guild.channels.cache
        .filter((v) => v.name === "ScrimPre" && v.type === "voice")
        .first();
    preChannel.members.each((v) => {
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
 * @function getRandom
 * @param max The number of possibilities
 * @returns A random int [0,max)
 ***************/
function getRandom(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

module.exports = {
    makeTeams: makeTeams,
    getPlayers: getPlayers,
    getMap: getMap,
    moveMembers: moveMembers,
    getRandom: getRandom,
};
