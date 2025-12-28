const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  Routes,
  REST
} = require("discord.js");

// =================== CONFIG (Railway) ===================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const CARGO_AUTOMATICO = "Membro";

// =================== CLIENT ===================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
});

const produtos = [];

// =================== READY ===================
client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

// =================== COMANDOS ===================
const commands = [
  new SlashCommandBuilder().setName("ajuda").setDescription("📜 Lista de comandos"),
  new SlashCommandBuilder().setName("vendas").setDescription("🛍️ Ver produtos"),
  new SlashCommandBuilder()
    .setName("criar")
    .setDescription("🧱 Criar produto (dono)")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))
    .addNumberOption(o => o.setName("preco").setDescription("Preço").setRequired(true))
    .addNumberOption(o => o.setName("quantidade").setDescription("Quantidade").setRequired(true)),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Comandos registrados");
  } catch (e) {
    console.error(e);
  }
})();

// =================== BOAS-VINDAS ===================
client.on("guildMemberAdd", async (member) => {
  let canal = member.guild.channels.cache.find(c => c.name === "novos-integrantes");

  if (!canal) {
    canal = await member.guild.channels.create({
      name: "novos-integrantes",
      type: 0,
    });
  }

  const cargo = member.guild.roles.cache.find(r => r.name === CARGO_AUTOMATICO);
  if (cargo) await member.roles.add(cargo);

  const embed = new EmbedBuilder()
    .setTitle("🎉 Bem-vindo!")
    .setDescription(`👋 Olá <@${member.id}>!\nBem-vindo ao **${member.guild.name}**`)
    .setThumbnail(member.user.displayAvatarURL())
    .setColor("Green");

  canal.send({ embeds: [embed] });
});

// =================== INTERAÇÕES ===================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand() && !interaction.isButton()) return;

  if (interaction.commandName === "ajuda") {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📜 Comandos")
          .setDescription("/ajuda\n/vendas\n/criar")
          .setColor("Yellow")
      ],
      ephemeral: true
    });
  }

  if (interaction.commandName === "criar") {
    if (interaction.user.id !== OWNER_ID)
      return interaction.reply({ content: "🚫 Só o dono pode usar", ephemeral: true });

    const nome = interaction.options.getString("nome");
    const preco = interaction.options.getNumber("preco");
    const quantidade = interaction.options.getNumber("quantidade");

    produtos.push({ nome, preco, quantidade });

    return interaction.reply({
      content: `✅ Produto **${nome}** criado (R$${preco})`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "vendas") {
    if (!produtos.length)
      return interaction.reply({ content: "📦 Nenhum produto disponível", ephemeral: true });

    const row = new ActionRowBuilder();

    produtos.forEach((p, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`comprar_${i}`)
          .setLabel(`${p.nome} - R$${p.preco}`)
          .setStyle(ButtonStyle.Primary)
      );
    });

    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle("🛍️ Loja").setColor("Blue")],
      components: [row]
    });
  }

  if (interaction.isButton()) {
    const index = interaction.customId.split("_")[1];
    const produto = produtos[index];

    const canal = await interaction.guild.channels.create({
      name: `🛒-${interaction.user.username}`,
      type: 0,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: ["ViewChannel"] },
        { id: interaction.user.id, allow: ["ViewChannel", "SendMessages"] },
        { id: OWNER_ID, allow: ["ViewChannel", "SendMessages"] },
      ],
    });

    canal.send(`🛒 **${produto.nome}**\n💰 R$${produto.preco}`);
    interaction.reply({ content: "✅ Carrinho criado", ephemeral: true });
  }
});

client.login(TOKEN);
