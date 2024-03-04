module.exports = {
    execute: async function (message) {
        if (xee.store.reactroles.some(rr => rr.message === message.id)) {
            xee.store.reactroles.filter(rr => rr.message === message.id).forEach(rr => xee.store.reactroles.delete(rr._id))
            xee.db.collection('reactroles').deleteMany({ message: message.id })
        }

        if (xee.store.polls.some(poll => poll.messageId === message.id)) {
            xee.store.polls.filter(poll => poll.messageId === message.id).forEach(poll => {
                clearTimeout(poll.timeout)
                xee.store.polls.delete(poll.id)
            })
            xee.db.collection('polls').deleteMany({ messageId: message.id })
        }

        if (xee.store.giveaways.some(ga => ga.messageId === message.id)) {
            xee.store.giveaways.filter(ga => ga.messageId === message.id).forEach(giveaway => {
                clearTimeout(giveaway.timeout)
                giveaway.delete()
            })
        }

        if (message.guild?.data?.starboard?.messages?.some(s => s.message === message.id)) {
            message.guild.data.update({ $pull: { 'starboard.messages': { message: message.id } } })
        }
        
        const interserver = xee.store.interservers.find(x => x.webhooks.some(w => w.channel === message.channel.id))
        if (interserver) interserver.deleteMessage(message.id)
    }
}
