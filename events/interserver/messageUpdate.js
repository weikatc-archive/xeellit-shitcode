const { MessageEmbed } = require('discord.js')
const { isImage } = require('../../client/util')
const { clean } = require('./messageCreate')

module.exports = {
    execute: async function (_, message) {
        const interserver = xee.store.interservers.find(i => i.webhooks.some(w => w.channel === message.channel.id))
        if (!interserver) return

        const messages = interserver.messages.get(message.id)
        if (!messages) return

        if (message.partial && !message.channel.permissionsFor(message.guild.me).has('READ_MESSAGE_HISTORY')) return
        else await message.fetch()

        if (interserver.block.some(b => b?.user === message.author.id)) return

        const images = [...message.attachments.filter(isImage).values()]
        let content = interserver.getContent(message)

        const sticker = message.stickers.find(sticker => sticker.format === 'PNG')
        if (sticker) images.unshift(sticker.url)

        const embed = new MessageEmbed()
            .setColor(xee.settings.color)

        const image = images.pop()
        if (image) embed.setTitle(image.name ?? 'Стикер').setImage(image.proxyURL ?? image)
        
        const imagesEmbeds = images.map(image => ({ title: image.name, color: xee.settings.color, image: { url: image.proxyURL } }))

        if (messages.bot) {
            embed.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ format: 'jpeg' }) })
        }

        if (!embed.image && !content.length) return

        if (content.length > 2000) {
            embed.setDescription(content)
            content = null
        }

        interserver.editMessage({
            embeds: image || messages.bot || content.length > 2000 ? [embed, ...imagesEmbeds] : [],
            content: content
        }, message.id, messages.bot)
    }
}
