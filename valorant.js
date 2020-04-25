/*******************
 * A file for Valorant related code
 ******************/

const {
    getPlayers,
    makeTeams,
    moveMembers,
    getMap,
    getLogger,
    makeVoiceChannel,
} = require("./utils");
const { uniqueNamesGenerator, adjectives } = require("unique-names-generator");
const constants = require("./constants");
const { v4: uuidv4 } = require("uuid");

const logger = getLogger("valorant");

const characters = [
    "jett",
    "phoenix",
    "raze",
    "viper",
    "cypher",
    "brimstone",
    "breach",
    "sage",
    "sova",
    "omen",
];

/******************
 * @function valorantHelp
 * @param textChannel The channel the command came from
 *****************/
function valorantHelp(textChannel) {
    textChannel.send(
        "Valorant Help: `!valorant --flag=value ...`" +
            "\nDescription: Initiates a new Valorant scrim." +
            "\nPossible flags:" +
            "\n`--e`: Players to exclude from team selection present in the pregame channel; comma separated. `!valorant --e=Scott,Jacob`"
    );
}

/******************
 * @function createValorant
 * @param args The args to the command
 * @param receivedMessage The initial message from the 'message' event
 *****************/
async function createValorant(args, guild, cb) {
    let excludes = [];
    if (args["e"]) excludes = args["e"].split(",");
    const { participants, preChannel, error } = getPlayers(guild, excludes);
    if (error) {
        logger.error(error);
        cb({ error: error });
        return;
    }
    const { team1, team2, makeTeamsError } = makeTeams(participants, 5);
    if (makeTeamsError) {
        logger.error(makeTeamsError);
        cb({ error: makeTeamsError });
        return;
    }
    let map = getMap("valorant");
    if (map === null) {
        logger.error("Unable to select a map.");
        cb({ error: "Unable to select a map. Contact an admin." });
        return;
    }

    let parent = guild.channels.cache
        .filter(
            (v) => v.name === constants.CategoryName && v.type === "category"
        )
        .first();
    if (!parent) {
        cb({
            error:
                "Could not find the PUGs channel category, try running `!init`. Contact an admin if the problem persists.",
        });
        return;
    }
    let parentID = parent.id;

    const team1Name = uniqueNamesGenerator({
        dictionaries: [adjectives, characters],
        length: 2,
    });
    const team2Name = uniqueNamesGenerator({
        dictionaries: [adjectives, characters],
        length: 2,
    });

    const attackChannel = await makeVoiceChannel(guild, team1Name, parentID);
    const defendChannel = await makeVoiceChannel(guild, team2Name, parentID);

    if (!attackChannel || !defendChannel) {
        cb({
            error:
                "Either the attacker or the defenders channel doesn't exist. Please run !init",
        });
    }

    let attackerMove = moveMembers(team1, attackChannel),
        defenderMove = moveMembers(team2, defendChannel);
    Promise.all([attackerMove, defenderMove])
        .then((res) => {
            let team1Members = [],
                team2Members = [],
                playerIds = [];

            team1.forEach((member) => {
                team1Members.push(member.user.username);
                playerIds.push(member.id);
            });
            team2.forEach((member) => {
                team2Members.push(member.user.username);
                playerIds.push(member.id);
            });
            let matchID = uuidv4();
            let response =
                "Attackers (" +
                team1Name +
                "): " +
                team1Members.join(", ") +
                "\nDefenders (" +
                team2Name +
                "): " +
                team2Members.join(", ") +
                "\nMap: " +
                map +
                "\nMatchID: " +
                matchID +
                "\nWhen the match is complete, type `!complete --id=" +
                matchID +
                "`";
            logger.info(
                "New Match Registered: \n" +
                    JSON.stringify({ matchID: matchID, date: new Date() })
            );
            cb({
                guildID: guild.id,
                playerIDs: playerIds,
                voiceChannelIDs: [attackChannel.id, defendChannel.id],
                map: map,
                date: Date.now(),
                preChannelID: preChannel.id,
                matchID: matchID,
                msg: response,
            });
        })
        .catch((error) => {
            logger.error("Error moving users to their channels: " + error);
            cb({
                error:
                    "There was an error moving users to their channels. Error: " +
                    error,
            });
        });
}

module.exports = { createValorant: createValorant, valorantHelp: valorantHelp };
