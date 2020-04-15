const Discord = require("discord.js");
const client = new Discord.Client();
const uuid = require("uuid/v4");
const yargs = require("yargs-parser");
const secrets = require("./secrets");

// Use this to keep track of matches down the road....
let matchRegistry = {};

client.on("ready", () => {
  console.log("Client Ready");

  // Set our Discord Bot Activity
  client.user.setActivity("!help for help", { type: "WATCHING" }).catch((e) => {
    console.log("Error setting activity: " + e);
  });

  // Handle chat messages
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

function processCommand(receivedMsg) {
  let cmd = receivedMsg.content.substr(1);
  console.log(cmd);
  let splitCmd = cmd.split(" ", 2);
  console.log(splitCmd);
  cmd = splitCmd[0];
  let args = yargs(splitCmd[1]);

  console.log("Command Received: " + cmd);
  console.log("Args: " + args);

  if (cmd === "help") {
    helpMessage(args, receivedMsg.channel);
  } else if (cmd === "valorant") {
    createValorant(args, receivedMsg);
  } else if (cmd === "complete") {
    console.log("Complete command");
  }
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
    .filter((v) => v.name === "Side Hoe Quarantine" && v.type === "voice")
    .first();
  preChannel.members.each((v) => {
    participants.push(v);
  });
  return participants;
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
 * @function moveMembers
 * @param team1 An array of GuildMembers that is the first team
 * @param team2 An array of GuildMembers that is the second team
 * @param attackChannel The VoiceChannel for the attackers
 * @param defendChannel The VoiceChannel for the defenders
 *****************/
function moveMembers(team1, team2, attackChannel, defendChannel) {
  return new Promise((resolve, reject) => {
    let teamPromises = [];
    team1.forEach((u) => {
      teamPromises.push(u.edit({ channel: attackChannel }));
    });
    team2.forEach((u) => {
      teamPromises.push(u.edit({ channel: defendChannel }));
    });
    Promise.all(teamPromises)
      .then((res) => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
}

/*****************
 * @function helpMessage
 * @param args The arguments to the help message
 * @param channel The message to send the help to
 *****************/
function helpMessage(args, channel) {
  if (args.length === 0) {
    channel.send("This is the help command, brother.");
  }
}

/******************
 * @function createValorant
 * @param args The args to the command
 * @param receivedMessage The initial message from the 'message' event
 *****************/
async function createValorant(args, receivedMessage) {
  let players = getPlayers(receivedMessage);
  const { team1, team2, extras, makeTeamsError } = makeTeams(players, 2);
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

  await moveMembers(team1, team2, attackChannel, defendChannel)
    .then((res) => {
      let team1Members = [],
        team2Members = [],
        extrasMembers = [];
      team1.forEach((member) => {
        team1Members.push(member.user.username);
      });
      team2.forEach((member) => {
        team2Members.push(member.user.username);
      });
      extras.forEach((member) => {
        extrasMembers.push(member.user.username);
      });
      let matchID = uuid();
      receivedMessage.channel.send(
        "Team 1: " +
          team1Members.join(", ") +
          "\nTeam 2: " +
          team2Members.join(", ") +
          "\nReserve Members: " +
          extrasMembers.join(", ") +
          "\nMap: " +
          map +
          "\nMatchID: " +
          matchID +
          "\nWhen the match is complete, type !complete --id=<MATCHID>."
      );
      matchRegistry[uuid] = {
        team1: [...team1Members],
        team2: [...team2Members],
        map: map,
        date: new Date().getTime(),
        complete: false,
      };
    })
    .catch((error) => {
      receivedMessage.channel.send(
        "There was an error moving users to their channels. Error: " + error
      );
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

client.login(secrets.bot_secret_token);
