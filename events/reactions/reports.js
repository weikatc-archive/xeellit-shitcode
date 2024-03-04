const { MessageEmbed } = require('discord.js')
const { isImage } = require('../../client/util')

module.exports = {
    name: 'messageReactionAdd', 
    execute: async function (reaction, user) {
        const guild = reaction.message.channel.guild
        const guildData = await guild.getData()
        
        if (!guildData.reports) return
        if (!guild.channels.cache.get(guildData.reports.channel)?.permissionsFor(guild.me).has([ 'SEND_MESSAGES', 'EMBED_LINKS' ])) {
            guildData.update({ $set: { reports: null } })
            return
        }

        if (reaction.emoji.identifier !== guildData.reports.emoji) return

        if (reaction.partial) reaction = await reaction.fetch()
        if (reaction.count < guildData.reports.min) return

        const message = await reaction.message.fetch()
        const channel = guild.channels.cache.get(guildData.reports.channel)

        const users = await reaction.users.fetch({ limit: 100 })
        if (users.filter(user => !user.bot).size < guildData.reports.min && user.id !== message.author.id) return

        if (!message.content.length && !message.attachments.size) return
        if (message.attachments.size && !channel.permissionsFor(guild.me).has('ATTACH_FILES')) return

        const embed = new MessageEmbed()
            .setAuthor({ name: `${message.author.tag} (${message.author.id})`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setFooter('#' + message.channel.name)
            .setDescription(message.content)
            .setColor(0xdd2e44)

        message.attachments = message.attachments.filter(a => a.size <= 8388608)

        const image = message.attachments.find(isImage)
        if (image) embed.setImage(`attachment://${image.name}`)
        if (!message.deletable) embed.addField('Перейти', `[Нажмите](${message.url})`)

        await channel.send({
            embeds: [ embed ], 
            content: `:loudspeaker: **Сообщение**, отправленое в канале ${message.channel} **${message.deletable ? 'было удалено' : 'было отмечено как недопустимое'}**, так как достигло **${xee.constructor.plural(['реакции', 'реакций', 'реакций'], guildData.reports.min, true)}**.`,
            files: message.attachments.map(file => ({ name: file.name, attachment: file.url })) 
        })

        if (message.deletable) {
            message.delete()
        }
    }
}