const Poll = require('../../classes/Poll')

module.exports = {
    async messageReactionAdd(reaction, user) {
        return this.handleReaction(false, reaction, user, await this._validate(reaction, user))
    },

    async messageReactionRemove(reaction, user) {
        return this.handleReaction(true, reaction, user, await this._validate(reaction, user))
    }, 

    async _validate(reaction, user) {
        if (user.bot) return
        
        const guild = reaction.message.channel.guild
        if (!reaction.message.channel.permissionsFor(guild.me)?.has('READ_MESSAGE_HISTORY')) return
        if (!Poll.emojis.includes(reaction.emoji.identifier)) return
        const guildData = await guild.getData()
        const poll = guildData.polls.find(poll => poll.messageId === reaction.message.id)
        if (!poll) return

        if (poll.values.length < Poll.emojis.indexOf(reaction.emoji.identifier)) return
        return poll
    },

    async handleReaction(remove, reaction, user, poll) {
        poll?.addVote(user.id, +reaction.emoji.identifier[0] - 1, remove)
    }
}
