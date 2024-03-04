const Loader = require('./interfaces/Loader')
const Collection = require('./Collection')
const Command = require('./Command')

const firstUpper = require('../client/util').firstUpper
class Commands extends Collection {
    constructor(commandFolder = './commands/', slash) {
        super()

        this.slash = slash
        this.folder = commandFolder
    }

    get modules() {
        return [ ...this.map(x => x.combine ? x.name : x.group?.toLowerCase()).values() ].filter((i, n, s) => s.indexOf(i) === n)
    }

    load(pathname, module) {
        const props = require(pathname)
        if (this.slash) {
            props.path = pathname
            this.set(props.config.name, props)
        } else {
            if (!props.command) props.command = {}
            if (!props.command.name) props.command.name = pathname.split(/\/|\\/).pop().split('.')[0]
            this.set(props.command.name, new Command(props, pathname, module))
        }
    }

    reload(name) {
        const command = this.resolve(name)
        if (!command?.path) return

        delete require.cache[require.resolve(command.path)]

        this.delete(this.slash ? command.config.name : command.name)
        this.load(command.path, command.group)
    }

    resolve(name) {
        if (name instanceof Command) return name
        name = name.toLowerCase()

        return this.get(name) || this.find(c => c.aliases?.includes(name.toLowerCase()))
    }
    
    help(name, prefix = `${xee.client.user.username[0].toLowerCase()}.`) {
        const command = this.resolve(name)
        if (!command) return null

        let content = `\`\`\`markdown\n> ${prefix}${command.name}${command.description ? ` - ${command.description}` : ''}\`\`\`\n`

        if (command.fullDescription) content += `${command.fullDescription.parse({ prefix })}\n`
        if (command.aliases?.length) content += `**${command.combine ? 'Команды' : 'Алиасы'}**: ${command.aliases.sort().map(alias => `\`${alias}\``).join(', ')}\n`
        if (typeof command.usage === 'string') content += `**Использование**: \`${prefix}${command.name}${(command.usage.length ? ' ' : '') + command.usage}\`\n`
        if (command.cooldown) content += `Можно использовать раз в **${xee.constructor.ruMs(command.cooldown, true)}**\n`

        if (command.flags?.length) 
            content += `**Флаги**: ${command.flags.sort().map(f => `\`--${f}\``).join(' ')}\n`
        if (command.examples && Object.keys(command.examples)?.length)
            content += `\n**Примеры**:\n${Object.entries(command.examples).map(([ usage, description ]) => `\`${usage.parse({ prefix })}\`: ${description}`).join('\n')}\n` 

        const permissions = Object.create(command?.permissions || {})
        if (!permissions.me?.length) permissions.me = null
        if (!permissions.user?.length) permissions.user = null

        if (permissions.user || permissions.me) {
            content += `\n**Разрешения**:`
            if (permissions.me) content += `\nБот: ${firstUpper(xee.constructor.formatPermissions(permissions.me, true).map(p => `\`${p}\``).join(', '))}`
            if (permissions.user) content += `\nПользователь: ${firstUpper(xee.constructor.formatPermissions(permissions.user, true).map(p => `\`${p}\``).join(', '))}`
        }
        return content
    }
}

Loader.applyToClass(Commands)
module.exports = Commands