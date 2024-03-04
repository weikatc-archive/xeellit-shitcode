module.exports = {
    async messageReactionAdd(reaction, user) {
        const { rero, guildData } = (await this._validate(reaction, user)) || {}
        if (rero) return this.handleReaction(true, rero, reaction, user, guildData)  
    },

    async messageReactionRemove(reaction, user) {
        const { rero, guildData } = (await this._validate(reaction, user)) || {}
        if (rero && !rero.once) this.handleReaction(false, rero, reaction, user, guildData)
    },

    async _validate(reaction, user) {
        const guild = reaction.message.guild
        if (!guild || !guild.members.me.permissions.has('MANAGE_ROLES')) return
        if (user.id === xee.client.user.id) return

        const guildData = await guild.getData()
        if (!guildData.reactroles.size) return
        if (!reaction.message.id) return

        return { 
            guildData, 
            rero: guildData.reactroles.find(rr => 
                rr.message === reaction.message.id && 
                rr.emoji.endsWith(reaction.emoji.identifier.split(':').pop())
            ) 
        }
    },

    async handleReaction(addReact, rero, reaction, user, guildData) {
        const member = await guildData.guild.members.fetch(user.id).catch(() => null)
        if (!member) return

        if (addReact && rero.mode === 'single') {
            const messageElements = guildData.reactroles.filter(rr => rr.message === reaction.message.id)
            messageElements.filter(rr => member.roles.cache.has(rr.role) === (rr.action === 'add' ? true : false))
                .filter(rr => member.guild.roles.cache.get(rr.role)?.editable)
                .forEach(rr => {
                    const role = member.guild.roles.cache.get(rr.role)
                    if (role.editable) member.roles[rr.action === 'add' ? 'remove' : 'add'](rr.role)

                    if (!reaction.message.channel.permissionsFor(member.guild.me).has('MANAGE_MESSAGES')) return
                    reaction.message.reactions.cache.get(
                        rr.emoji.includes(':') ? 
                        rr.emoji.split(':').pop() : 
                        decodeURIComponent(rr.emoji)
                    )?.users.remove(member.id).catch(() => null)
                })
        }

        const role = member.guild.roles.cache.get(rero.role)
        if (!role?.editable) return

        return member.roles[
            addReact ? rero.action : rero.action === 'add' ? 'remove' : 'add'
        ](role, 'выдача роли по реакции')
            .then(() => console.log(`Роль ${role.name} за реакцию ${reaction.emoji.name} была ${member.roles.cache.has(role.id) ? 'выдана пользователю' : 'изъята у пользователя'} ${member.user.tag}`))
            .then(() => addReact && rero.once ? reaction.users.remove(member.id).catch(() => true) : true)
    }
}