const { MessageEmbed } = require('discord.js')
const { parseEmoji, findChannel } = require('../../client/util')

const Confirmation = require('../../classes/Confirmation')

module.exports = {
    command: {
        description: 'управление системой репортов',
        fullDescription: 'В чем суть? Участники сервера помечают любое сообщение определенной реакцией, и при достижении N-ного кол-ва реакций сообщение будет удалено, а его содержание отправится в канале репортов.',
        permissions: {
            me: ['EMBED_LINKS'],
            user: ['MANAGE_GUILD']
        }
    },
    execute: async function(message, args, options) {
        const reports = message.guild.data.reports ? {
            ...message.guild.data.reports,
            channel: message.guild.channels.cache.get(message.guild.data.reports.channel)
        } : null

        if (reports && !reports.channel) {
            await message.guild.data.update({ $set: { reports: null } })
            return this.execute(message, args, options)
        }

        if (!reports) {
            const channel = args.length && findChannel(message, args.join(' '), { text: true }) || message.channel
            if (!channel.permissionsFor(message.guild.me).has([ 'SEND_MESSAGES', 'VIEW_CHANNEL' ])) 
                return message.channel.send(`Проверь-ка мои права в канале ${channel}: я должен иметь право на прочтение канала и право на отправку сообщений`)
            if (!channel.permissionsFor(message.guild.me).has('EMBED_LINKS')) return message.channel.send('Мне нужно право на встаивание ссылок в канале ' + channel.toString())

            if (!channel.permissionsFor(message.guild.me).has([ 'SEND_MESSAGES', 'VIEW_CHANNEL' ])) 
                return message.channel.send(`У тебя должно быть право на прочтение и отправку сообщений в канале ${channel}.`)

            const answer = await (new Confirmation(message).setContent(`Вы хотите включить систему репортов и их отправку в канал ${channel}?`)).awaitResponse()
            if (!answer.data) return answer.delete()

            await message.guild.data.update({ $set: { reports: { channel: channel.id, emoji: '%F0%9F%93%A2', min: 2 } } })
            return answer.reply(`Система репортов на сервере включена! Репорты будут отправляться в канал ${channel}.`)
        }

        if (!args.length) return message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setDescription(this.fullDescription)
                    .setAuthor({ name: 'Репорты', iconURL: message.guild.iconURL() })
                    .addField('Эмодзи', decodeURI(reports.emoji), true)
                    .addField('Реакций', reports.min.toString(), true)
                    .addField('Канал', reports.channel.toString(), true)
                    .setColor(0xdd2e44)
            ]
        })

        const subcommand = args.shift().toLowerCase()

        if (['reset', 'disable', 'delete', 'stop'].includes(subcommand)) {
            const answer = await (new Confirmation(message).setContent(`Вы точно хотите выключить систему репортов на сервере? Все настройки будут сброшены.`)).awaitResponse()
            if (!answer.data) return answer.reply('Ничего не трону!')

            await message.guild.data.update({ $set: { reports: null } })
            return answer.reply('Система репортов была отключена.')
        } else if (!isNaN(+subcommand) && isFinite(+subcommand)) {
            const min = +subcommand
            if (min < 1 || min > 20) return message.channel.send('Минимальное количество реакций — 1, а максимальное — 20.')

            await message.guild.data.update({ $set: { 'reports.min': min } })
            return message.channel.send(`Теперь, чтобы отправить репорт, на сообщении должно быть ${min} реакций репорта.`)
        }

        const emoji = parseEmoji(subcommand)
        if (!emoji?.name) return message.channel.send(xee.commands.help(this, options.prefix))
        if (emoji.id && !message.guild.emojis.cache.get(emoji.id)?.available) return message.channel.send('Если кастомное эмодзи — то только доступное на этом сервере.')

        await message.guild.data.update({ $set: { 'reports.emoji': emoji.id ? `${emoji.animated ? 'a:' : ''}${emoji.name}:${emoji.id}` : encodeURI(emoji.name) } })
        return message.channel.send(`Реакция для репортов обновлена: ${message.guild.emojis.cache.get(emoji.id)?.toString() || emoji.name}.`)        
    }
}