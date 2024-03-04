const { isImage } = require('../../client/util')
const fetch = require('../../client/fetch')
const last = {}

module.exports = {
    command: {
        description: 'создает демотиваторы',
        aliases: ['dem', 'demo'],
        cooldown: 30,
        examples: {
            '{{prefix}}demotivator "Привет как" дела': 'создаст демотиватор'
        },
        usage: '<заглавие> [футер]',
        permissions: { me: ['ATTACH_FILES'] }
    },
    execute: async function(message, args, options) {
        if (!args.length) return message.channel.send(xee.commands.help(this, options.prefix))

        const image = message.attachments.find(isImage)?.proxyURL || last[message.guild.id] || message.author.displayAvatarURL({ format: 'png', size: 1024 })

        const title = args.shift()
        const lower = args.shift() || null

        const validUrl = await fetch(image, {
            stream: true
        }).then(res => res.statusCode === 200 ? image : message.author.displayAvatarURL({ format: 'png', size: 1024 }))

        await xee.rest.kaneki.api.demotivator.post({
            json: {
                title, lower, image: validUrl
            }, stream: true
        }).then(res => message.channel.send({ files: [{ name: `demotivator.${image.split('.').pop().split('?').shift()}`, attachment: res }] }).then(res => last[message.guild.id] = res.attachments.first().url))
          .catch(() => message.channel.send('Что-то пошло не по плану...'))
          .finally(() => this.cooldowns?.delete(message.author.id))
    }
}