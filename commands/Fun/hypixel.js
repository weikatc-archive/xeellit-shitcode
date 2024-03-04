const { chunk, formatDate } = require('../../client/util')
const { MessageEmbed } = require('discord.js')
const fetch = require('../../client/fetch')

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
    command: {
        description: 'поиск игрока на Hypixel',
        usage: '<никнейм>',
        examples: {
            '{{prefix}}hypixel fabunnya': 'покажет информацию о fabunnya'
        },
        cooldown: 5,
        permissions: { me: ['EMBED_LINKS'] }
    },
    execute: async function (message, args) {
        if (!args.length) return message.channel.send('Ты должен написать какой-нибудь никнейм...')

        const uuid = await fetch('https://api.mojang.com/users/profiles/minecraft/' + args.join('')).catch(() => null)
        if (!uuid?.id) return message.channel.send(`Игрока с именем **${args.join('').slice(0, 100)}** не существует`)

        const user = await xee.rest.hypixel.api.player.get({ query: { uuid: uuid.id } }).then(r => r.player).catch(() => null)
        if (!user) return message.channel.send(`Этот человек точно играл на Hypixel?`)

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
        else if (online.online) embed.description += online.mode === 'LOBBY' ? 'Находится в лобби.\n' : `Играет в **${games[online.gameType]}${user.mostRecentGameType === online.mode ? ' :star: ' : ''}${online.map ? ` (${online.map})` : ''}**.\n`

        embed.description += `\n`
        embed.description += `Ссылка на [скин](${JSON.parse(Buffer.from(skin.properties[0].value, 'base64')).textures.SKIN.url}).\n`
        if ('karma' in user) embed.description += `**${user.karma} кармы**,\n`
        if ('achievementPoints' in user) embed.description += `**${xee.constructor.plural(['очко достижений', 'очка достижений', 'очков достижений'], user.achievementPoints, true)}**.\n`

        if (recentgames.length) chunk(recentgames, 10).forEach((recent, i) => embed.addField(i ? '\u200b' : 'Последние игры', recent.slice(online.online && online.mode !== 'LOBBY' ? 1 : 0)
            .map(game => `**${games[game.gameType]}${game.map ? ` на ${game.map}` : ''}**: ${xee.constructor.ruMs(game.ended - game.date)}`).join('\n') || 'Пусто (╯°□°）╯︵ ┻━┻'))
        return message.channel.send({ embeds: [embed] })
        
    }
}
