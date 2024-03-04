const { MessageEmbed, MessageFlags } = require('discord.js')
const { isImage } = require('../../client/util')

const getStar = count => count >= 5 ? (count >= 10 ? ':dizzy:' : ':star2:') : ':star:'

MessageFlags.FLAGS.IS_VOICE_MESSAGE = 1 << 13

module.exports = {
    async messageReactionAdd(reaction, user) {
        this.handleReaction(reaction, reaction.message, user, await this._validate(reaction))
    },

    async messageReactionRemove(reaction, user) {
        this.handleReaction(reaction, reaction.message, user, await this._validate(reaction))
    },

    async _validate(reaction) {
        if (reaction.emoji.name !== '⭐') return
        const guild = reaction.message.channel.guild
        if (!guild) return

        const guildData = await guild.getData()
        if (!guildData.starboard?.channel) return
        if (!reaction.message.id) return
        if (reaction.message.partial) await reaction.message.fetch()

        if (reaction.message.author.id === '547905866255433758' && reaction.message.content?.includes('Url')) return

        if (!reaction.message.channel.permissionsFor(guild.me).has('READ_MESSAGE_HISTORY')) return
        if (!guild.channels.cache.get(guildData.starboard.channel)?.permissionsFor(guild.me).has([ 'SEND_MESSAGES', 'EMBED_LINKS', 'READ_MESSAGE_HISTORY' ])) {
            guildData.update({ $set: { starboard: null } })
            return
        }

        return guildData.starboard
    },

    async handleReaction(reaction, message, user, starboard) {
        if (!starboard || user.id === message.author.id && !starboard.self_react) return
        if (reaction.partial) reaction = await reaction.fetch()

        const channel = message.channel.guild.channels.cache.get(starboard.channel)
        const messages = await channel.messages.fetch({ limit: 100, cache: false })
        const starMessage = messages.find(m => m.author.id === xee.client.user.id && m.embeds[0]?.footer?.text?.endsWith(message.id))

        const countReactions = await new Promise(async resolve => {
            if (starboard.self_react) return resolve(reaction.count)
            const reactions = await reaction.users.fetch({ limit: 1, after: (BigInt(message.author.id) - 1n).toString() }).catch(() => null)
            return resolve(reactions ? reactions.has(message.author.id) ? reaction.count - 1 : reaction.count : reaction.count)
        })

        if (!countReactions || starboard.min > countReactions) return starMessage && starMessage.delete()

        if (!starMessage) {
            const image = (message.attachments.size ? message.attachments.find(isImage)?.proxyURL : null) || message.embeds[0]?.image?.url
            return channel.send({
                content: `${getStar(countReactions)} **${countReactions}**: ${message.url}`,
                embeds: [
                    new MessageEmbed()
                        .setColor(0xffac33)
                        .setDescription(message.flags.has('IS_VOICE_MESSAGE') ? '🎙️ Голосовое сообщение' : message.content)
                        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }), url: 'https://discord.com/users/' + message.author.id })
                        .setTimestamp(message.createdAt)
                        .setFooter(message.id)
                        .setImage(image)
                ]
            }).then(() => channel.guild.data.update({ $push: { 'starboard.messages': { channel: message.channel.id, message: message.id } } }))
        } else return starMessage.edit(`${getStar(countReactions)} **${countReactions}**: ${message.url}`) 
    }
}
