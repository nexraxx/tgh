const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ChannelType,
  REST,
  Routes,
  SlashCommandBuilder,
  Events,
  AttachmentBuilder,
} = require("discord.js");

const fs = require("fs/promises");
require("dotenv").config();

// ---------------- ENV ----------------
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;

if (!TOKEN || !CLIENT_ID || !OWNER_ID) {
  throw new Error("Missing TOKEN, CLIENT_ID, OWNER_ID in .env");
}

// ---------------- DATA ----------------
async function readData() {
  try {
    const d = JSON.parse(await fs.readFile("data.json", "utf-8"));
    return {
      guilds: d.guilds || {},
      blacklist: d.blacklist || [],
    };
  } catch {
    return { guilds: {}, blacklist: [] };
  }
}

async function saveData(data) {
  await fs.writeFile("data.json", JSON.stringify(data, null, 2));
}

function getConfig(data, guildId) {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      ticketCategory: null,
      staffRole: null,
      transcriptChannel: null,
      counter: 0,
      tickets: [],
    };
  }
  return data.guilds[guildId];
}

// ---------------- CLIENT ----------------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// ---------------- SAFE COMMAND BUILDER ----------------
function safe(cmd) {
  const json = cmd.toJSON();

  if (!json.description || json.description.length === 0) {
    throw new Error(`Missing description for command: ${json.name}`);
  }

  return json;
}

// ---------------- COMMANDS ----------------
const commands = [
  safe(
    new SlashCommandBuilder()
      .setName("config")
      .setDescription("Manage ticket configuration")
      .addSubcommand(s =>
        s.setName("set")
          .setDescription("Set ticket config")
          .addChannelOption(o =>
            o.setName("category").setDescription("Ticket category").setRequired(true))
          .addRoleOption(o =>
            o.setName("staff").setDescription("Staff role").setRequired(true))
          .addChannelOption(o =>
            o.setName("transcripts").setDescription("Transcript channel").setRequired(true))
      )
      .addSubcommand(s =>
        s.setName("view")
          .setDescription("View config")
      )
  ),

  safe(
    new SlashCommandBuilder()
      .setName("setup")
      .setDescription("Send ticket panel")
  ),

  safe(
    new SlashCommandBuilder()
      .setName("blacklist")
      .setDescription("Owner blacklist system")
      .addSubcommand(s =>
        s.setName("add")
          .setDescription("Blacklist a guild")
          .addStringOption(o =>
            o.setName("guild_id").setDescription("Guild ID").setRequired(true)))
      .addSubcommand(s =>
        s.setName("remove")
          .setDescription("Remove guild from blacklist")
          .addStringOption(o =>
            o.setName("guild_id").setDescription("Guild ID").setRequired(true)))
      .addSubcommand(s =>
        s.setName("list")
          .setDescription("List blacklist"))
  ),
];

// ---------------- DEPLOY COMMANDS ----------------
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once(Events.ClientReady, async (c) => {
  console.log(`🚀 Logged in as ${c.user.tag}`);

  for (const guild of c.guilds.cache.values()) {
    const data = await readData();

    if (data.blacklist.includes(guild.id)) {
      await guild.leave();
      continue;
    }

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, guild.id),
      { body: commands }
    );
  }

  console.log("✅ Commands deployed");
});

// ---------------- PANEL ----------------
async function sendPanel(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_ticket")
      .setLabel("Create Ticket")
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🎫 Ticket System")
        .setDescription("Click below to open a ticket")
        .setColor(0x2b90ff),
    ],
    components: [row],
  });
}

// ---------------- BOT LOGIC ----------------
client.on(Events.InteractionCreate, async (i) => {
  if (!i.guild) return;

  const data = await readData();

  // blacklist block
  if (data.blacklist.includes(i.guild.id)) {
    return i.reply({ content: "❌ This server is blacklisted.", flags: 64 });
  }

  const config = getConfig(data, i.guild.id);

  // ---------------- SLASH COMMANDS ----------------
  if (i.isChatInputCommand()) {

    // BLACKLIST
    if (i.commandName === "blacklist") {
      if (i.user.id !== OWNER_ID) {
        return i.reply({ content: "Owner only", flags: 64 });
      }

      const sub = i.options.getSubcommand();

      if (sub === "add") {
        const id = i.options.getString("guild_id");
        if (!data.blacklist.includes(id)) data.blacklist.push(id);
        await saveData(data);
        return i.reply({ content: `Blacklisted ${id}`, flags: 64 });
      }

      if (sub === "remove") {
        const id = i.options.getString("guild_id");
        data.blacklist = data.blacklist.filter(x => x !== id);
        await saveData(data);
        return i.reply({ content: `Removed ${id}`, flags: 64 });
      }

      if (sub === "list") {
        return i.reply({
          content: data.blacklist.join("\n") || "Empty",
          flags: 64,
        });
      }
    }

    // CONFIG SET
    if (i.commandName === "config") {
      const sub = i.options.getSubcommand();

      if (sub === "set") {
        if (!i.memberPermissions.has(PermissionFlagsBits.Administrator)) {
          return i.reply({ content: "Admin only", flags: 64 });
        }

        config.ticketCategory = i.options.getChannel("category").id;
        config.staffRole = i.options.getRole("staff").id;
        config.transcriptChannel = i.options.getChannel("transcripts").id;

        await saveData(data);

        return i.reply({ content: "Config saved", flags: 64 });
      }

      if (sub === "view") {
        return i.reply({
          content:
            `Category: <#${config.ticketCategory || "not set"}>\n` +
            `Staff: <@&${config.staffRole || "not set"}>\n` +
            `Transcripts: <#${config.transcriptChannel || "not set"}>`,
          flags: 64,
        });
      }
    }

    // SETUP
    if (i.commandName === "setup") {
      if (!i.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return i.reply({ content: "Admin only", flags: 64 });
      }

      await sendPanel(i.channel);
      return i.reply({ content: "Panel sent", flags: 64 });
    }
  }

  // ---------------- BUTTONS ----------------
  if (!i.isButton()) return;

  if (i.customId === "open_ticket") {
    config.counter++;

    const id = config.counter;

    const ch = await i.guild.channels.create({
      name: `ticket-${id}`,
      type: ChannelType.GuildText,
      parent: config.ticketCategory,
      permissionOverwrites: [
        { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel] },
        { id: config.staffRole, allow: [PermissionFlagsBits.ViewChannel] },
      ],
    });

    config.tickets.push({ id, channelId: ch.id, owner: i.user.id });
    await saveData(data);

    await ch.send(`<@${i.user.id}> <@&${config.staffRole}>`);

    return i.reply({ content: `Ticket created: ${ch}`, flags: 64 });
  }
});

// ---------------- LOGIN ----------------
client.login(TOKEN);