const { MessageEmbed } = require('discord.js')
const { findChannel, findMember, chunk } = require('../../client/util')

const Pagination = require('../../classes/Pagination')

module.exports = { 
    command: {
        aliases: ['createroom'],
        description: 'настройка создателя голосовых каналов',
        fullDescription: '**Заменители**:\n> `{{member}}` - Ник-нейм участника на сервере\n> `{{member.tag}}` - тег участника\n> `{{member.username}}` - ник-нейм участника\n',

        examples: {
            '{{prefix}}rooms': 'покажет активные создатели',
            '{{prefix}}rooms setup': 'откроет настройку создателя',
            '{{prefix}}rooms setup --no-permissions': 'откроет настройку создателя, но при создании комнаты бот не будет выдавать права "Управления каналом"',
            '{{prefix}}rooms delete 558177973367341056': 'отключит создание комнат в канале 558177973367341056',
            '{{prefix}}rooms ban @Megumin': 'отключит пользователя Megumin от голосового канала и закроет для него канал',
        }, usage: '<setup | delete | ban <@участник комнаты>> [#канал]',
        flags: ['no-permissions'],
        permissions: {
            me: ['EMBED_LINKS'],
            user: []
        }
    },
    execute: async function(message, args, options) {
        let elements = message.guild.data.rooms.filter(x => message.guild.channels.cache.has(x.channel))
        if (elements.length !== message.guild.data.rooms.length) {
            await message.guild.data.update({ $set: { rooms: elements } })
        }

        switch (args[0]?.toLowerCase()) {
            case 'setup': return message.member.permissions.has([ 'MANAGE_CHANNELS', 'MANAGE_GUILD' ]) ? this.setup(message) : message.channel.send('Куда?!')
        
            case 'delete':
            case 'remove':
                if (!message.member.permissions.has([ 'MANAGE_CHANNELS', 'MANAGE_GUILD' ])) return message.channel.send('Эти подкоманды не для тебя!')
                if (!elements.length) return message.channel.send('Ну ты конечно... Ничего умнее придумать не мог?')
                if (!args[1]) return message.channel.send('Ты это... канал забыл указать...')

                const channel = await findChannel(message, args.slice(1).join(' '), { type: 'GUILD_VOICE' })
                if (!channel) return message.channel.send(`Ты знал, что такого канала нет? Я думаю нет`)
                if (!elements.some(rc => rc.channel === channel.id)) return message.channel.send(`На канал \`${channel.name}\` не назначен создатель`)

                await message.guild.data.update({ $pull: { rooms: { channel: channel.id } } })
                return message.channel.send(`Отключил, теперь создатель в канале \`${channel.name}\` работать не будет`)

            case 'ban':
                if (!xee.store.rooms.includes(message.member.voice?.channelId)) return message.channel.send('Ты должен находится в приватной комнате')
                if (message.member.voice.channel.members.size === 1) return message.channel.send('Ты находишься один в комнате...')
                if (!message.member.voice.channel.permissionsFor(message.guild.me).has('MANAGE_CHANNEL')) return message.channel.send('У меня нет права на упраление этой комнатой')
                if (!args[1]) return message.channel.send('Ты не указал участника комнаты')

                const room = await xee.db.collection('rooms').findOne({ channel: message.member.voice.channelId })
                if (room.user !== message.author.id) return message.channel.send(`Блокировать пользователей в комнате ${message.member.voie.channel?.name || ''} может только <@!${room.user}>`)

                const member = await findMember(message, args.slice(1).join(' '), message.member.voice.channel.members)
                if (!member) return message.channel.send(`Участник ${args.slice(1).join(' ').slice(0, 30)} не найден. Почему? Не знаю`)

                if (member.voice.channel.permissionsFor(member).has('MOVE_MEMBERS'))
                    return message.channel.send('Ты не можешь банить тех, у кого есть право на перемещение участников в голосовом канале...')

                return Promise.all([
                    member.voice.disconnect(),
                    message.member.voice.channel.permissionOverwrites.edit(member, { 
                        CONNECT: false, SPEAK: false 
                    })
                ]).catch(() => message.channel.send('Что-то пошло не по плану...'))
                  .then(() => message.channel.send(`Пользователь **${member.user.tag}** был заблокирован в голосовой комнате **${message.member.voice.channel?.name}**`))

            default:
                if (!message.member.permissions.has([ 'MANAGE_CHANNELS', 'MANAGE_GUILD' ])) return message.channel.send('Куда?!')
                if (!elements.length) return message.channel.send(`Здесь пусто (надеюсь временно). А ты знал, что создать создатель легко: используй \`${options.prefix}${options.usage} setup\``)

                const interface = new Pagination(message.author.id)

                chunk(elements, 3)
                    .forEach(rooms => {
                        interface.add({ 
                            embeds: rooms.map((room, index) => {
                                const embed = new MessageEmbed()
                                    .setColor(xee.settings.color)
                                    .addField('Канал', message.guild.channels.cache.get(room.channel).name, true)
                                    .addField('Категория', (message.guild.channels.cache.get(room.parent) || message.guild.channels.cache.get(room.channel).parent)?.name || 'нет', true)
                                    .addField('Лимит пользователей', room.userLimit && room.userLimit.toString() || 'нет', true)
                                    .addField('Формат', `\`\`\`${room.name.replace(/`/g, `\`${String.fromCharCode(8203)}`)}\`\`\``)
                                if (!index) embed
                                    .setAuthor({ name: 'Создатель комнат', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) })
                                    .setDescription(!message.guild.members.me.permissions.has('MOVE_MEMBERS') ? 'У меня нет права "Перемещать участников", создание комнат осуществляться не может.' : '')
                                return embed
                            })
                        })
                    })
                
                return interface.send(message.channel)
        }
    },
    setup: async function (message) {
        let guildData = await message.guild.getData()
        let elements = guildData.rooms.filter(rc => message.guild.channels.cache.has(rc.channel))

        if (elements.length === 9) return message.channel.send('У тебя уже 9 создателей, зачем тебе ещё, а?')
        if (!message.guild.members.me.permissions.has('MOVE_MEMBERS')) return message.channel.send('Мне нужно право на перемещение пользователей в Голосовых каналах.')

        const collectorMessage = await message.channel.send({
            embeds: [ new MessageEmbed().setColor(xee.settings.color).setAuthor({ name: 'Создатель комнат', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) }) ] ,
            content: 'Ну что уж, начнем настройку. Напиши в этом чате имя канала, при входе в который будет создаваться голосовая комната.'
        })

        const values = []
        const deleteMessage = () => collectorMessage?.deletable ? collectorMessage.delete().catch(() => null) : null
        let collector

        collector = await message.channel.awaitMessages({ max: 1, time: 30000, filter: ({ author }) => author.id === message.author.id })
        if (!collector.size) return message.channel.send('Сейчас бы игнорить меня...').then(deleteMessage)
        if (!collector.first().cleanContent.length) return message.channel.send('Прости, пустоту мне не нужно давать').then(deleteMessage)

        const channel = await findChannel(message, collector.first().content, { type: 'GUILD_VOICE' })
        if (!channel) return message.channel.send(`Канал, имя которого \`${collector.first().content}\` не найден`).then(deleteMessage)
        if (channel.type !== 'GUILD_VOICE') return message.channel.send(`Мне не кажется, что \`${channel.name}\` это голосовой канал...`).then(deleteMessage)
        if (elements.some(rc => rc.channel === channel.id)) return message.channel.send(`Для канала \`${channel.name}\` уже есть элемент`).then(deleteMessage)
        values.push(channel)

        if (!message.channel.viewable || collectorMessage.deleted) return

        if (message.guild.channels.cache.filter(c => c.type === 'GUILD_CATEGORY').size) {
            collectorMessage.edit({
                embeds: [ new MessageEmbed().setColor(xee.settings.color).setAuthor({ name: 'Создатель комнат', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) }).addField('Канал', channel.name, true) ],
                content: 'Хорошо, канал получил. Теперь, напиши категорию, в которой я буду создавать личные комнаты. Если не хочешь выбирать определенную, напиши `пропустить`, и я использовать ту категорию, в которой содержится канал-создатель.'
            })
            collector = await message.channel.awaitMessages({ max: 1, time: 30000, filter: ({ author }) => author.id === message.author.id })
            if (!collector.size) return message.channel.send('Игнорь, игнорь...').then(deleteMessage)
            if (!collector.first().cleanContent.length) return message.channel.send('Мне не нужен твой банк приколов, сорри').then(deleteMessage)
            if (collector.first().content.toLowerCase() !== 'пропустить') {
                const parent = await findChannel(message, collector.first().content, { type: 'GUILD_CATEGORY' })
                if (!parent) return message.channel.send(`Я что-то не вижу категории \`${collector.first().content.slice(0, 90)}\` на сервере`).then(deleteMessage)
                if (!parent.permissionsFor(message.guild.me).has('MANAGE_CHANNELS')) return message.channel.send(`Я не могу создавать каналы в категории \`${parent.name}\`, так как у меня недостаточно прав`).then(deleteMessage)

                values.push(parent)
            } else values.push(channel.parent)
        } else {
            if (!message.guild.members.me.permissions.has('MANAGE_CHANNELS')) return message.channel.send('Мне нужно право на Управление каналами.')
            values.push(null)
        }

        if (!message.channel.viewable || collectorMessage.deleted) return

        collectorMessage.edit({
            embeds: [ new MessageEmbed().setColor(xee.settings.color).setAuthor({ name: 'Создатель комнат', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) }).addField('Канал', channel.name, true).addField('Категория', values[1]?.name || 'нет', true) ],
            content: 'Ну что уж, хотел бы у тебя попросить лимит участников по умолчанию.'
        })

        collector = await message.channel.awaitMessages({ max: 1, time: 30000, filter: ({ author }) => author.id === message.author.id })
        if (!collector.size) return message.channel.send('Ну ладненько. Игнорь меня дальше, если хочешь').then(deleteMessage)
        if (!collector.first().cleanContent.length) return message.channel.send('Ты мне должен был отправить циферку, чего ты не сделал. Ладно, ты ничего не отправил...').then(deleteMessage)

        let userLimit = +collector.first().content
        if (isNaN(userLimit)) return message.channel.send(`Не думаю, что \`${collector.first().content.slice(0, 90)}\` это адекватная цифра`).then(deleteMessage)
        if (userLimit === 0) userLimit = 0
        if (userLimit < 0) return message.channel.send(`Я вижу, ты не сильно дружелюбный`).then(deleteMessage)
        if (userLimit > 100) return message.channel.send(`А я не знал, что ты настолько глуп, что не знаешь лимиты дискорда`).then(deleteMessage)

        values.push(userLimit)

        if (!message.channel.viewable || collectorMessage.deleted) return

        collectorMessage.edit({
            embeds: [ new MessageEmbed().setColor(xee.settings.color).setAuthor({ name: 'Создатель комнат', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) }).addField('Канал', channel.name, true).addField('Категория', values[1]?.name || 'нет', true).addField('Лимит юзеров', userLimit.toString(), true) ],
            content: 'Ну вот, моя последняя просьба: введи формат имён комнат.\nВ нем ты можешь использовать следующие ' + this.fullDescription.toLowerCase()
        })

        collector = await message.channel.awaitMessages({ max: 1, time: 3e5, filter: ({ author }) => author.id === message.author.id })
        if (!collector.size) return message.channel.send('Я задал последний вопрос. Я получил последний ответ').then(deleteMessage)
        if (!collector.first().content.length) return message.channel.send('Ты чё мне отправляешь...?').then(deleteMessage)

        values.push(collector.first().content)

        if (guildData.rooms.some(r => r.channel === channel.id)) await guildData.update({ $pull: { rooms: { channel: channel.id } } })

        guildData.update({ $push: { rooms: {
            channel: values[0].id,
            parent: values[1]?.id,
            userLimit: values[2],
            name: values[3],
            permissions: !message._flags.has('no-permissions')
        } } })

        return collectorMessage.edit({
            embeds: [ new MessageEmbed().setColor(xee.settings.color).setAuthor({ name: 'Создатель комнат', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) }).addField('Канал', channel.name, true).addField('Категория', values[1]?.name || 'нет', true).addField('Лимит юзеров', userLimit.toString(), true).addField('Формат', `\`\`\`${values[3].replace(/`/g, `\`${String.fromCharCode(8203)}`)}\`\`\``).setFooter(elements.some(e => e.channel === channel.id) ? 'Обновление завершено' : 'Настройка завершена') ],
            content: null
        })
    }
}
