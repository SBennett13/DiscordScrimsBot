const Discord = require("discord.js");
const client = new Discord.Client();
const uuid = require("uuid/v4");

const secrets = require("./secrets");

let matchRegistry = {};

client.on("ready", () => {
  console.log("Client Ready");

  client.user.setActivity("!help for help", { type: "WATCHING" }).catch((e) => {
    console.log("Error setting activity: " + e);
  });
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
  let splitCmd = cmd.split(" ");
  cmd = splitCmd[0];
  let args = splitCmd.slice(1);

  console.log("Command Received: " + cmd);
  //console.log("Arguments: " + args)

  if (cmd == "help") {
    helpMessage(args, receivedMsg);
  } else if (cmd == "valorant") {
    createValorant(args, receivedMsg);
  }
}

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

function getMap() {
  let mapList = ["Split", "Bind", "Haven"];
  let rand = getRandom(mapList.length);
  return mapList[rand];
}

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

function helpMessage(args, receivedMessage) {
  if (args.length === 0) {
    receivedMessage.channel.send("This is the help command, brother.");
  }
}

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
        team2Members = [];
      team1.forEach((member) => {
        team1Members.push(member.user.username);
      });
      team2.forEach((member) => {
        team2Members.push(member.user.username);
      });
      let matchID = uuid();
      receivedMessage.channel.send(
        "Team 1: " +
          team1Members.join(", ") +
          "\nTeam 2: " +
          team2Members.join(", ") +
          "\nMap: " +
          map +
          "\nMatchID: " +
          matchID +
          "\nWhen the match is complete, type !complete <MATCHID>."
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

function getRandom(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

client.login(secrets.bot_secret_token);
