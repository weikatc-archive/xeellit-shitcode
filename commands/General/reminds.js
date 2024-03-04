const { MessageEmbed } = require('discord.js')
const { chunk, formatDate } = require('../../client/util') 

const onDelete = new Set() // АХХАХА ВЗЛОМ ЖОПЫ НЕ ПОЛУЧИТСЯ
const Confirmation = require('../../classes/Confirmation')
const Pagination = require('../../classes/Pagination')

const sliceString = (str, max) => str.length < max ? str : `${str.slice(0, max - 1)}...`

module.exports = { 
    command: {
        usage: '[номер напоминания]',
        description: 'показывают ваши напоминания на сервере',
        examples: {
            '{{prefix}}reminds': 'покажет ваши напоминания',
            '{{prefix}}reminds 3': 'удалит напоминание под номером 3'
        },
        permissions: {
            me: ['EMBED_LINKS']
        }
    },
    execute: async function (message, args, options) { 
        const fetchedReminds = await xee.db.collection('reminds').find({ $or: [{ guild: message.guild.id }, { user: message.author.id, guild: null }] }).toArray()
        const remindList = fetchedReminds.filter(r => r.guild ? message.guild.channels.cache.get(r.channel)?.permissionsFor(message.member)?.has(['SEND_MESSAGES', 'VIEW_CHANNEL']) : true)
        if (!remindList.length) return message.channel.send('Кажется, напоминаний нету')

        if (!args.length) {
            let interface = new Pagination(message.author.id)

            chunk(remindList.map((remind, _id) => ({ __id: _id + 1, ...remind })), 10)
                .forEach(reminds => interface.add({
                    embeds: [
                        new MessageEmbed()
                            .setColor(xee.settings.color)
                            .setAuthor({ name: 'Список напоминаний', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) })
                            .setDescription(reminds.map(remind => `**${remind.__id}**. ${formatDate(remind.end, 'R')}: **${sliceString(remind.message, 60).replace(/\*\*/g, '')}**`).join('\n'))
                    ]
                }))
            
            return interface.send(message.channel)
        } else {
            if (onDelete.has(message.author.id)) return message.channel.send('Я тебя спросил, а ты не ответил')
            let _remind = +args[0]
            if (!_remind || !isFinite(_remind)) return message.channel.send('Неужели сложно указать номер напоминания?')
            let remind = remindList[_remind - 1]
            
            if (!remind && _remind !== 1) {
                if (!remindList[_remind - 2]) return message.channel.send(`Разве существует напоминание под номером **${_remind}**?`)
                onDelete.add(message.author.id)

                const _answer = await (new Confirmation(message)
                    .setContent(`Напоминания под номером **${_remind}** нет. Может, ты хотел удалить напоминание под номером **${_remind - 1}** (**${remindList[_remind - 2].message.slice(0, 200)}**)?`)
                    .awaitResponse()
                )

                onDelete.delete(message.author.id)
                if (!_answer.data) return _answer.reply('Ладно, не буду ничего трогать...')

                _remind = _remind - 1
                remind = remindList[_remind - 1]
            } 

            if (remind.guild && !message.guild.channels.cache.get(remind.channel).permissionsFor(message.member).has('MANAGE_MESSAGES')) return message.channel.send(`Чтобы удалить это напоминание, у тебя должно быть право Управлять Сообщениями в канале <#${remind.channel}>`)

            await xee.rest.kaneki.api.bot.remind.post({ json: { id: remind._id, delete: true } }).catch(() => null)
            return message.channel.send(`Напоминание под номером **${_remind}** было удалено`)
        }
    }
}
