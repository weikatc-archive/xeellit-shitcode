const { Util } = require('discord.js')
const { exec } = require('child_process') 
const Pagination = require('../../classes/Pagination')

module.exports = {
    command: {
        ownerOnly: true,
        description: 'выполнит код в консоли',
        aliases: ['$', 'exec', 'bash'],
        examples: {
            '{{prefix}}shell neofetch': 'выполнит в консоли команду neofetch'
        }
    },
    execute: async function (message, args, options) {
        let pid
        if (args.includes('--send-pid')) pid = xee.remove(args, '--send-pid')
        if (!args.length) return message.channel.send(xee.commands.help(this, options.prefix))

        const child = exec(process.platform === 'win32' ? 'cmd /c chcp 65001>nul && ' + args.join(' ') : args.join(' '), function(error, stdout, stderr) {
            let result = []
            if (error) return message.channel.send(error.message.toString())
            if (stdout?.length) result.push(stdout)
            if (stderr?.length) result.push(stderr)
            result = result.join('\n').replace(/[\u001b\u009b][[()#?]*(?:[0-9]{1,4}(?:[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').replaceAll('/cmd \/c chcp 65001>nul && /g', '')
            if (!result.length) return message.channel.send('void')

            if (result.length < 1900) return message.channel.send(`\`\`\`bash\n${result}\n\`\`\``)
            let interface = new Pagination(message.author.id)
            Util.splitMessage(result, { char: result.includes('\n') ? '\n' : '', maxLength: 1915 })
                .forEach((value, index, array) => interface.add(`\`\`\`bash\n${value}\n\`\`\`${index + 1} / ${array.length}`))
            return interface.send(message.channel)
        })

        if (pid) message.channel.send(`PID: ${child.pid}`)
    }
}