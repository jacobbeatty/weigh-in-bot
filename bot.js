const admin = require("firebase-admin");
require("dotenv").config();
const { Client, Intents } = require("discord.js");
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
client.on("ready", () => {
  console.log(`Logged is as ${client.user.tag}!`);
});
admin.initializeApp({
  credential: admin.credential.cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
});
const db = admin.firestore();

client.on("message", async (message) => {
  if (message.author === client.user) {
    return;
  }
  const discordId = message.author.id;

  try {
    if (message.content.startsWith("$new")) {
      const startingWeight = message.content.split(" ")[1];
      const currentWeight = message.content.split(" ")[2];
      const percentageLost =
        ((startingWeight - currentWeight) / startingWeight) * 100;
      const username = message.author.username;
      const data = {
        startingWeight: startingWeight,
        currentWeight: currentWeight,
        percentageLost: percentageLost,
        username: username,
      };
      await db.collection("discord").doc(discordId).set(data);
      message.reply("New data captured for " + username + ".");
    }
    if (message.content.startsWith("$weigh-in")) {
      const data = { currentWeight: message.content.split(" ")[1] };
      const query = await db.collection("discord").doc(discordId).get();
      const percentageForUser = query.data().percentageLost.toFixed(2);
      await db.collection("discord").doc(discordId).update(data);
      message.reply(
        "Updated weight for " +
          message.author.username +
          ". " +
          "Your current loss percentage is: " +
          percentageForUser
      );
    }
    if (message.content.startsWith("$standings")) {
      const discordRef = db.collection("discord");
      const standings = await discordRef
        .orderBy("percentageLost", "desc")
        .get();
      const results = [];
      standings.forEach((doc) =>
        results.push(
          doc.data().username +
            ": " +
            doc.data().percentageLost.toFixed(2) +
            "%"
        )
      );
      message.reply("The current standings are:\n" + results.join("\n"));
    }
  } catch (err) {
    console.log(err);
  }
});

client.login(process.env.TOKEN);
