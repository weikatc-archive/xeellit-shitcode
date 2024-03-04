module.exports = {
    name: 'messageCreate',
    execute: async function(message) {
        if (!message.guild || !message.channel.permissionsFor(message.guild.me)?.has([ 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY' ])) return
        if (!message.guild.data?.utils?.autoreact?.length) return
        
        const autoReact = message.guild.data.utils.autoreact.find(ar => ar.channel === message.channel.id)
        if (!autoReact) return

        if (autoReact.options?.images && !message.attachments.some(require('../client/util').isImage)) return
        autoReact.emojis.forEach(emoji => xee.react(message, emoji.id ?? emoji.name))
    }
}