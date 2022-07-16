const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
require("dotenv").config();
const { Client, Intents } = require("discord.js");
const client = new Client({
  partials: ["CHANNEL"],
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
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
  const usersRef = db.collection("users");
  const discordIdToUser = usersRef.where("discordId", "==", discordId).get();
  const docID = await discordIdToUser;

  try {
    if (message.content.startsWith("$link")) {
      const linkCode = message.content.split(" ")[1];
      const queryRef = usersRef.where("linkCode", "==", linkCode);
      const docName = await queryRef.get();

      const data = {
        discordId: discordId,
        linkCode: FieldValue.delete(),
      };
      await db.collection("users").doc(docName.docs[0].id).update(data);
      message.reply("Successfully linked.");
    }

    // start a new competition

    if (message.content.startsWith("$new")) {
      const startingWeight = message.content.split(" ")[1];
      const currentWeight = message.content.split(" ")[2];
      const percentageLost = (
        ((startingWeight - currentWeight) / startingWeight) *
        100
      ).toFixed(2);
      const username = message.author.username;
      const data = {
        startingWeight: startingWeight,
        currentWeight: currentWeight,
        percentageLost: percentageLost,
        username: username,
      };
      await db.collection("users").doc(docID.docs[0].id).update(data);
      message.reply("New data captured for " + username + ".");
    }
    if (message.content.startsWith("$weigh-in")) {
      const query = await db.collection("discord").doc(discordId).get();
      const currentWeight = message.content.split(" ")[1];
      const startingWeight = query.data().startingWeight;
      const username = message.author.username;

      const data = {
        username: username,
        currentWeight: currentWeight,
        percentageLost: (
          ((startingWeight - currentWeight) / startingWeight) *
          100
        ).toFixed(2),
      };
      await db.collection("users").doc(docID.docs[0].id).update(data);
      message.reply(
        "Updated weight for " +
          message.author.username +
          ". " +
          "Your current loss percentage is: " +
          (((startingWeight - currentWeight) / startingWeight) * 100).toFixed(2)
      );
    }
    if (message.content.startsWith("$standings")) {
      const discordRef = db.collection("users");
      const standings = await discordRef
        .orderBy("percentageLost", "desc")
        .get();
      const results = [];
      standings.forEach((doc) =>
        results.push(
          doc.data().username + ": " + doc.data().percentageLost + "%"
        )
      );
      message.reply("The current standings are:\n" + results.join("\n"));
    }
  } catch (err) {
    console.log(err);
  }
});

client.login(process.env.TOKEN);
