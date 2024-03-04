const { isMod } = require('../../client/util')

const inClean = new Set()
const allFilters = {
    bots: message => message.author.bot,
    embeds: message => message.embeds.length,
    mentions: message => message.mentions.users.size, 
    attachments: message => message.attachments.size,
    left: message => !message.member,
    links: message => /(http|https):\/\//.test(message.content)
}

module.exports = {
    command: {
        description: 'очищает канал от сообщений',
        fullDescription: '**Фильтры очистки**:\n> `bots` - сообщения от ботов\n> `embeds` - сообщенния с эмбедами\n> `mentions` - сообщения в которых есть @упоминания\n> `attachments` - сообщения с вложениями\n> `links` - сообщения с ссылками\n> `left` - сообщения от тех, кто вышел с сервера\n> `content "сообщение"` - с фразой которую ты укажешь\nВсе фильтры можно комбинировать.\nЗакрепленные сообщения не будут удалены.\n',
        usage: '[количество] [ID пользователя] [...фильтры]',
        aliases: ['bulk', 'purge'],

        examples: {
            '{{prefix}}clear 100 mentions': 'удалит 100 сообщений, в которых есть @упоминания',
            '{{prefix}}clear 1000 bots embeds': 'удалит 1000 сообщений от ботов с эмбедами',
            '{{prefix}}clear content "плак плак плак"': 'удалит 50 последних сообщений в которых есть "плак плак плак"'
        },
        permissions: {
            me: ['READ_MESSAGE_HISTORY', 'MANAGE_MESSAGES']
        }
    },
    execute: async function (message, args, options) {
        if (!isMod(message, 'MANAGE_MESSAGES')) return message.channel.send('Не думаю, что ты модератор...')
        if (!args.length) return message.channel.send(xee.commands.help(this, options.prefix))
        if (inClean.has(message.channel.id)) return message.channel.send('В канале уже идет удаление сообщений')

        let filters = [message => message.deletable && !message.pinned]

        let messagesSize = 50
        let lastId

        args = args.map(x => x.toLowerCase())
        if (!isNaN(+args[0]) && isFinite(+args[0])) messagesSize = +args[0]
        if (messagesSize > 2500) return message.channel.send('Нельзя удалить больше 2500-ти сообщений за раз')
        if (messagesSize < 1) return message.channel.send('Что ты хочешь сделать?')

        while (args.length) {
            const argument = args.shift()
            if (argument in allFilters) {
                filters.push(allFilters[argument])
                continue
            }

            if (argument === 'content') {
                const content = args.shift()
                if (content) filters.push(message => message.content.toLowerCase().includes(content))
            } else {
                const id = argument.match(/\d{17,19}/)?.[0]
                if (id) filters.push(message => message.author.id === id)
            }
        }

        if (message.deletable) await message.delete().catch(() => null)
        inClean.add(message.channel.id)

        let toDelete = messagesSize
        let deletedCount = 0
        let faliFetch = 0

        function end() {
            if (!deletedCount) message.channel.send('Сообщений на удаление не было найдено')
            inClean.delete(message.channel.id)
        }

        while (toDelete) {
            if (faliFetch === 20) break
            let _deleted = deletedCount
            
            let fetched = await message.channel.messages.fetch({ limit: 100, before: lastId }).then(messages => messages.filter(message => Date.now() - message.createdTimestamp < 1209600000)).catch(() => null)
            if (!fetched?.size) break

            lastId = fetched.last().id

            let toDeleteMessages = fetched.filter(message => filters.every(f => f(message))).first(toDelete)
            if (!toDeleteMessages.length) {
                faliFetch++
                continue
            }

            faliFetch = 0

            await message.channel.bulkDelete(toDeleteMessages, true)
                .then(r => message.channel.send(`Удалено **${xee.constructor.plural(['сообщение', 'сообщения', 'сообщений'], deletedCount += r.size, true)}**`).then(m => setTimeout(() => m.delete(), 1000)))
                .catch(() => null)

            toDelete -= deletedCount - _deleted         
            continue
        } end()
    }
}
