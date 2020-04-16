const { getPlayers, makeTeams, moveMembers, getMap } = require("./utils");
const { v4: uuidv4 } = require("uuid");

/******************
 * @function valorantHelp
 * @param textChannel The channel the command came from
 *****************/
function valorantHelp(textChannel) {
    textChannel.send(
        "Valorant Help: `!valorant --flag=value`" +
            "\nPossible flags:" +
            "\n`--e`: Players to exclude from team selection present in the pregame channel; comma separated. `!valorant --e=Scott,Jacob`"
    );
}

/******************
 * @function createValorant
 * @param args The args to the command
 * @param receivedMessage The initial message from the 'message' event
 *****************/
async function createValorant(args, receivedMessage, cb) {
    const { participants, preChannel } = getPlayers(receivedMessage);
    const { team1, team2, makeTeamsError } = makeTeams(participants, 3);
    if (makeTeamsError) {
        receivedMessage.channel.send(
            "Error making Valorant Teams: " + makeTeamsError
        );
        return;
    }
    let map = getMap();

    let guild = receivedMessage.guild;
    const attackChannel = guild.channels.cache
        .filter((v) => v.name === "Scrim1A" && v.type === "voice")
        .first();
    const defendChannel = guild.channels.cache
        .filter((v) => v.name === "Scrim1B" && v.type === "voice")
        .first();

    let attackerMove = moveMembers(team1, attackChannel),
        defenderMove = moveMembers(team2, defendChannel);
    Promise.all([attackerMove, defenderMove])
        .then((res) => {
            let team1Members = [],
                team2Members = [];
            team1.forEach((member) => {
                team1Members.push(member.user.username);
            });
            team2.forEach((member) => {
                team2Members.push(member.user.username);
            });
            let matchID = uuidv4();
            receivedMessage.channel.send(
                "Attackers: " +
                    team1Members.join(", ") +
                    "\nDefenders: " +
                    team2Members.join(", ") +
                    "\nMap: " +
                    map +
                    "\nMatchID: " +
                    matchID +
                    "\nWhen the match is complete, type `!complete --id=" +
                    matchID +
                    "`"
            );
            cb({
                teams: { attack: [...team1], defend: [...team2] },
                map: map,
                date: new Date().getTime(),
                preChannel: preChannel,
                matchID: matchID,
            });
        })
        .catch((error) => {
            receivedMessage.channel.send(
                "There was an error moving users to their channels. Error: " +
                    error
            );
        });
}

module.exports = { createValorant: createValorant, valorantHelp: valorantHelp };
