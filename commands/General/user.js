const { findMember, formatDate } = require('../../client/util')
const { MessageEmbed, UserFlags } = require('discord.js')

const devicesKeys = { desktop: 'Компьютер', web: 'Сайт', mobile: 'Телефон' }

const statusIcon = {
    online: '<:online:565045299735953420>',
    idle: '<:idle:565045338637991937>',
    dnd: '<:dnd:565045374629314561>',
    offline: '<:offline:565045410675294208>',
    streaming: '<:streaming:565050357621981185>'
}

const badges = {
    DISCORD_EMPLOYEE: '<:staff:918092759909408789>',
    PARTNERED_SERVER_OWNER: '<:partner:918092761620701234>',
    BUGHUNTER_LEVEL_1: '<:bugHunter1:918092763826892810>',
    BUGHUNTER_LEVEL_2: '<:bugHunter2:918092759687118888>',
    HYPESQUAD_EVENTS: '<:hypeSquadEvents:918092760731496468>',
    HOUSE_BRAVERY: '<:hypeSquadBravery:918092764393140224>',
    HOUSE_BRILLIANCE: '<:hypeSquadBrilliance:918092762765746186>',
    HOUSE_BALANCE: '<:hypeSquadBalance:918092765559140382>',
    EARLY_SUPPORTER: '<:earlySupporter:918092762203705354>',
    SYSTEM: '<:tempUser:918092763063537706>',
    EARLY_VERIFIED_BOT_DEVELOPER: '<:verifiedDeveloper:918092761155141692>',
    DISCORD_CERTIFIED_MODERATOR: '<:certifiedModerator:918092764816744448>',
    ACTIVE_DEVELOPER: '<:activeDeveloper:1040519603115274270>'
}

const parseDate = date => `${formatDate(date)}\n${formatDate(date.getTime(), 'R')}`

UserFlags.FLAGS.ACTIVE_DEVELOPER = 1 << 22

module.exports = {
    command: {
        description: 'информация о юзере',
        usage: '<@юзер>',
        aliases: ['u'],
        examples: {
            '{{prefix}}user': 'покажет информацию о вас',
            '{{prefix}}user 539103330740469781': 'покажет информацию о пользователе 539103330740469781'
        },
        permissions: {
            me: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
        }
    },
    execute: async function (message, args, options) {
        let member = message.member

        if (args.length) {
            const id = /(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/.test(args[0]) && 
                Buffer.from(args[0].match(/(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/)[0], 'base64').toString().match(/\d{17,19}/)?.[0] || args.join('').match(/\d{17,19}/)?.[0]
            if (id) {
                member = await xee.client.users.fetch(id).catch(() => null).then(user => user ? message.guild.members.fetch(user.id).catch(() => ({ user })) : null)
                member = await member
               if (!member) return message.channel.send(`Пользователя с ID \`${id.slice(0, 40)}\` не найдено`)
            } else {
                member = await findMember(message, args.join(' '))
                if (!member) return message.channel.send(`Пользователя \`${args.join(' ').slice(0, 40)}\` на сервере не нашел...`)
            }
        }

        const description = []
        const flags = member.user.flags?.toArray?.()?.map?.(f => badges[f])?.filter?.(Boolean)
        if (flags?.length) description.push(`${flags.join(' ')}\u200b`)

        member.user.presence = this.findPresence(member.user.id)

        const statuses = member.user.presence?.clientStatus ?? {}
        const presences = member.user.presence?.activities || []
        for (const status in statuses) {
            description.push(`${statusIcon[statuses[status]]} ${devicesKeys[status]}`)
        }

        while (presences.length) {
            const presence = presences.shift()
            if (presence.type === 'CUSTOM') {
                const emoji = presence.emoji && (presence.emoji.id ? xee.client.emojis.cache.get(presence.emoji.id)?.toString() : presence.emoji.name)
                description.push(`${emoji && emoji + ' ' || ''}${presence.state || this.resolveStatus(presences.shift())}`)
            } else description.push(this.resolveStatus(presence))
        }

        const embed = new MessageEmbed()
            .setColor(member.displayColor ?? xee.settings.color)

        if (member.user.bot) {
            const guilds = await xee.rest.selfbot.api.oauth2.authorize.get({ query: { client_id: member.user.id, scope: 'bot' } }).catch(() => null)
            if (guilds?.bot) description.push(`Серверов: **${guilds.bot?.approximate_guild_count || '?'}**`)
            if (guilds?.application?.bot_public) description.push(`[[Пригласить бота]](https://discord.com/oauth2/authorize?client_id=${member.user.id}&permissions=0&scope=bot)`)    
        } else {
            const [ warns ] = await Promise.all([
                xee.rest.sdc.api.warns(member.user.id).get().catch(() => null),
            ])

            if (warns?.warns) description.push(`**Варнов в Нике**: ${warns.warns}`)

            if (typeof member.user.accentColor === 'undefined') {
                await member.user.fetch()
            }

            if (member.user.accentColor) embed.setColor(member.user.accentColor)
            if (member.user.banner) embed.setImage(member.user.bannerURL({ size: 4096, dynamic: true }))
        }
// /*${member.user.bot ? (member.user?.flags?.toArray()?.includes('VERIFIED_BOT') ? '<:verifedBot:857477673679847425>' : '<:bot:857477863539605564>') : ''}*
        embed
            .setTitle(`${member.user.tag}`)
            .setURL(`https://discord.com/users/${member.user.id}/`)
            .setFooter(`ID: ${member.user.id}`)
            .setThumbnail(member.user.displayAvatarURL({
                dynamic: true,
                size: 4096
            }))
            .addField('Дата регистрации', parseDate(member.user.createdAt), true)

        if (member.guild) {
            if (member.voice && member.voice.channel) description.push(`Голосовой канал: **${member.voice.channel.name}**`)
            const mute = message.guild.data.mutes.find(mute => mute.memberId === member.user.id)
            if (mute) description.push(`Снятие мута: **через ${xee.constructor.ruMs(mute.remain)}**`)

            embed.addField('Дата входа на сервер', parseDate(member.joinedAt), true)
            if (member.premiumSinceTimestamp) embed.addField('Забустил сервер', parseDate(new Date(member.premiumSinceTimestamp)), false)

            const roles = member.roles.cache.filter(role => role.id !== message.guild.roles.everyone.id)
            if (roles.size) embed.addField('Роли', roles.sort((a, b) => b.rawPosition - a.rawPosition).map(role => role.toString()).slice(0, 10).join(', '))
        }


        if (description.length) embed.setDescription(description.filter(c => c && c !== '\n').join('\n').slice(0, 4096))
        return message.channel.send({ embeds: [embed] })
    },
    findPresence(id) {
        for (const guild of xee.client.guilds.cache.values()) {
            const presence = guild.presences?.cache.get(id)
            if (presence) return presence
        }
    },

    resolveStatus(status) {
        return status ? `${{ 
            LISTENING: 'Слушает',
            COMPETING: 'Соревнуется', 
            PLAYING: 'Играет в', 
            WATCHING: 'Смотрит', 
            STREAMING: 'Стримит'
        }[status.type] || ''} **${status.type === 'LISTENING' && status.name === 'Spotify' && status.syncId ? 
            `[${status.state} - ${status.details}](https://open.spotify.com/track/${status.syncId})` : 
            (status.name || status.state || status.details || '')
        }**` : ''
    }
}  
