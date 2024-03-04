const { chunk, formatDate } = require('../client/util')
const { MessageEmbed, InteractionWebhook } = require('discord.js')
const fetch = require('../client/fetch')

// const games = {
//     QUAKECRAFT: 'Quake',
//     WALLS: 'Walls',
//     PAINTBALL: 'Paintball',
//     SURVIVAL_GAMES: '<:sword:842759505334632458> Blitz Survival Games',
//     TNTGAMES: '<:tnt:842753087089541162> TNT Games',
//     VAMPIREZ: 'VampireZ',
//     WALLS3: '<:sand:842759190359310376> Mega Walls',
//     ARCADE: '<:slimeball:842757143559012383> Arcade',
//     ARENA: 'Arena',
//     UHC: 'UHC Champions',
//     MCGO: '<:bars:842758794508501002> Cops and Crims',
//     BATTLEGROUND: '<:axe:842756388521639958> Warlords',
//     SUPER_SMASH: 'Smash Heroes',
//     GINGERBREAD: 'Turbo Kart Racers',
//     HOUSING: 'Housing',
//     SKYWARS: '<:eye:842752463136227328> SkyWars',
//     TRUE_COMBAT: 'Crazy Walls',
//     SPEED_UHC: '<:carrot:842752215165042709> Speed UHC',
//     SKYCLASH: 'SkyClash',
//     LEGACY: '<:noteblock:842751301225283584> Classic Games',
//     PROTOTYPE: '<:anvil:842750756675387392> Prototype',
//     BEDWARS: '<:bed:842747338438213643> Bed Wars',
//     MURDER_MYSTERY: '<:bow:842747594508861441> Murder Mystery',
//     BUILD_BATTLE: '<:table:842750129786060903> Build Battle',
//     DUELS: '<:fishing:842748265099427850> Duels',
//     SKYBLOCK: 'SkyBlock',
//     PIT: '<:dirt:842750144910458890> Pit',
//     LOBBY: 'Лобби'
// }


const games = {
    QUAKECRAFT: 'Quake',
    WALLS: 'Walls',
    PAINTBALL: 'Paintball',
    SURVIVAL_GAMES: 'Blitz Survival Games',
    TNTGAMES: 'TNT Games',
    VAMPIREZ: 'VampireZ',
    WALLS3: 'Mega Walls',
    ARCADE: 'Arcade',
    ARENA: 'Arena',
    UHC: 'UHC Champions',
    MCGO: 'Cops and Crims',
    BATTLEGROUND: 'Warlords',
    SUPER_SMASH: 'Smash Heroes',
    GINGERBREAD: 'Turbo Kart Racers',
    HOUSING: 'Housing',
    SKYWARS: 'SkyWars',
    TRUE_COMBAT: 'Crazy Walls',
    SPEED_UHC: 'Speed UHC',
    SKYCLASH: 'SkyClash',
    LEGACY: 'Classic Games',
    PROTOTYPE: 'Prototype',
    BEDWARS: 'Bed Wars',
    MURDER_MYSTERY: 'Murder Mystery',
    BUILD_BATTLE: 'Build Battle',
    DUELS: 'Duels',
    SKYBLOCK: 'SkyBlock',
    PIT: 'Pit',
    LOBBY: 'Лобби'
}

const ranks = {
    MVP_PLUS: 'MVP+',
    VIP_PLUS: 'VIP+'
}


module.exports = {
    config: {
        name: 'hypixel',
        description: 'Ищет игрока на Hypixel',
        options: [{
            name: 'ник',
            description: 'Ник-нейм игрока',
            type: 3,
            required: true
        }]
    },
    async execute(interaction) {
        const args = interaction.options.get('ник')?.value

        const uuid = await fetch('https://api.mojang.com/users/profiles/minecraft/' + args).catch(() => null)
        if (!uuid?.id) return interaction.reply({ ephemeral: true, content: `Игрока с именем **${args.slice(0, 100)}** не существует` })

        const user = await xee.rest.hypixel.api.player.get({ query: { uuid: uuid.id } }).then(r => r.player).catch(() => null)
        if (!user) return interaction.reply({ ephemeral: true, content: `Этот человек точно играл на Hypixel?` })

        await interaction.deferReply()

        const [ online, recentgames, skin ]  = await Promise.all([
            xee.rest.hypixel.api.status.get({ query: { uuid: uuid.id } }).then(r => r.session).catch(() => ({})),
            xee.rest.hypixel.api.recentgames.get({ query: { uuid: uuid.id } }).then(r => r.games?.slice(0, 40)).catch(() => ({})),
            await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid.id}`)
        ])

        const embed = new MessageEmbed()
            .setColor(0xe0b450)
            .setTitle(`${user.newPackageRank && user.newPackageRank !== 'NONE' && `[${ranks[user.newPackageRank] || user.newPackageRank}] ` || ''}${uuid.name}`)
            .setDescription('')
            .setFooter(uuid.id)

        if (!online.online && user.lastLogout) embed.description += `Последний раз в сети: **${formatDate(user.lastLogout)}**.\n`
        else if (online.online) embed.description += online.mode === 'LOBBY' ? 'Находится в лобби.\n' : `Играет в **${games[online.gameType]}${online.map ? ` (${online.map})` : ''}**.\n`

        embed.description += `\n`
        embed.description += `Ссылка на [скин](${JSON.parse(Buffer.from(skin.properties[0].value, 'base64')).textures.SKIN.url}).\n`
        if ('karma' in user) embed.description += `**${user.karma} кармы**,\n`
        if ('achievementPoints' in user) embed.description += `**${xee.constructor.plural(['очко достижений', 'очка достижений', 'очков достижений'], user.achievementPoints, true)}**.\n`

        if (recentgames.length) chunk(recentgames, 10).forEach((recent, i) => embed.addField(i ? '\u200b' : 'Последние игры', recent.slice(online.online && online.mode !== 'LOBBY' ? 1 : 0)
            .map(game => `**${games[game.gameType]}${game.map ? ` на ${game.map}` : ''}**: ${xee.constructor.ruMs(game.ended - game.date)}`).join('\n') || 'Пусто (╯°□°）╯︵ ┻━┻'))
        return interaction.editReply({ embeds: [embed] })
    }
}
