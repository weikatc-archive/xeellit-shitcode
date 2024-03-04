class Command {
    constructor(data, path = null, group) {
        data = { ...data.command, ...data }

        this.name = data.name
        this.aliases = data.aliases || []
        this.usage = data.usage || null
        this.examples = data.examples || null
        this.description = data.description || null
        this.fullDescription = data.fullDescription || null
        this.subcommands = data.subcommands || null

        this.hidden = !!data.hidden
        this.combine = !!data.combine
        this.jsonArgs = !!data.jsonArgs
        this.ownerOnly = !!data.ownerOnly

        this.flags = data.flags || []
        this.permissions = {
            me: data.permissions?.me || [],
            user: data.permissions?.user || []
        }

        this.uses = 0
        this.path = path
        this.cooldown = data.cooldown * 1000 || null
        this.group = group?.toLowerCase() || '???'

        for (const key in data) {
            if (!(key in this)) this[key] = data[key]
        }
    }
}

module.exports = Command