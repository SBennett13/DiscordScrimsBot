/*******************
 * A file for Valorant related code
 ******************/

const {
    getPlayers,
    makeTeams,
    moveMembers,
    getMap,
    getLogger,
} = require('./utils');
const { v4: uuidv4 } = require('uuid');

const logger = getLogger('valorant');

/******************
 * @function valorantHelp
 * @param textChannel The channel the command came from
 *****************/
function valorantHelp(textChannel) {
    textChannel.send(
        'Valorant Help: `!valorant --flag=value ...`' +
            '\nDescription: Initiates a new Valorant scrim.' +
            '\nPossible flags:' +
            '\n`--e`: Players to exclude from team selection present in the pregame channel; comma separated. `!valorant --e=Scott,Jacob`'
    );
}

/******************
 * @function createValorant
 * @param args The args to the command
 * @param receivedMessage The initial message from the 'message' event
 *****************/
async function createValorant(args, guild, cb) {
    let excludes = [];
    if (args['e']) excludes = args['e'].split(',');
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
    let map = getMap('valorant');
    if (map === null) {
        logger.error('Unable to select a map.');
        cb({ error: 'Unable to select a map. Contact an admin.' });
        return;
    }

    const attackChannel = guild.channels.cache
        .filter((v) => v.name === 'Scrim1A' && v.type === 'voice')
        .first();
    const defendChannel = guild.channels.cache
        .filter((v) => v.name === 'Scrim1B' && v.type === 'voice')
        .first();

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
                'Attackers: ' +
                team1Members.join(', ') +
                '\nDefenders: ' +
                team2Members.join(', ') +
                '\nMap: ' +
                map +
                '\nMatchID: ' +
                matchID +
                '\nWhen the match is complete, type `!complete --id=' +
                matchID +
                '`';
            logger.info(
                'New Match Registered: \n' +
                    JSON.stringify({ matchID: matchID, date: new Date() })
            );
            cb({
                playerIDs: playerIds,
                map: map,
                date: Date.now(),
                preChannel: preChannel.id,
                matchID: matchID,
                msg: response,
            });
        })
        .catch((error) => {
            logger.error('Error moving users to their channels: ' + error);
            cb({
                error:
                    'There was an error moving users to their channels. Error: ' +
                    error,
            });
        });
}

module.exports = { createValorant: createValorant, valorantHelp: valorantHelp };
