const { MessageEmbed } = require('discord.js') 
const { findMember } = require('../../client/util')

const reactions = {
    kiss: {
        text: [['{{user}} целует сам себя. Странный, да?', '{{user}} совсем шизанулся: целует себя'], ['{{user}} нежно целует {{member}}... (надеюсь нежно).', '{{user}} чпокает {{member}} \=)']],
        services: [
            () => xee.rest.nekos.api.img.kiss.get()
        ]
    },
    baka: {
        text: [['{{user}} назвал себя дураком', '{{user}} дурак кста...'], ['{{user}} назвал {{member}} дураком. Прикольно, не так ли?', '{{user}} обозвал дурашкой {{member}}. Может он и есть дурашка?']],
        services: [ () => xee.rest.nekos.api.img.baka.get() ]
    },
    hug: {
        text: [['{{user}} обнимает себя =)'], ['{{user}} нежно обнимает {{member}} :3', '{{user}} обнял {{member}} 😍']],
        services: [
            () => xee.rest.nekos.api.img.hug.get()
        ]
    },
    slap: {
        text: [['{{user}} [бьет себя...](https://youtu.be/HxHqGXtVdAs \"чудик да\")'], ['{{user}} ударяет {{member}}. Интересно, за что?', '{{user}} ударил {{member}}. Надеюсь, {{member}} не сильно больно.']],
        services: [ () => xee.rest.nekos.api.img.slap.get() ]
    },
    smug: {
        text: [['{{user}} гордится собой. Крутой типа, да?', '{{user}} доволен собой. ']],
        services: [ () => xee.rest.nekos.api.img.smug.get() ]
    }, 
    tickle: {
        text: [['{{user}} начал щекотать себя. \=)'], ['{{user}} начал щекотать {{memebr}}. Надеюсь, {{member}} не умрет от смеха.', '{{user}} зачем-то начал щекотить {{member}} =/']],
        services: [
            () => xee.rest.nekos.api.img.tickle.get() 
        ]
    },
    cuddle: {
        text: [['{{user}} прижимается к воздуху.'], ['{{user}} прижался к {{member}} ^^']],
        services: [ () => xee.rest.nekos.api.img.cuddle.get() ]
    },
    feed: {
        text: [['{{user}} кормит себя))))'], ['{{user}} решил покормить {{member}} :yum:', '{{user}} кормит {{member}} :))']],
        services: [ () => xee.rest.nekos.api.img.feed.get() ]
    },
    poke: {
        text: [['{{user}} тыкает себя. Зачем?'], ['{{user}} начал тыкать {{member}}', 'У {{user}} чешутся руки и он начал тыкать {{member}}...']],
        services: [ () => xee.rest.nekos.api.img.poke.get() ]
    },
    angry: {
        text: [['{{user}} злится. Что не так? :rage:', '{{user}} очень злой. Вот же ж злюка, да?'], ['{{user}} пытался разозлить {{member}}, и кажется, это ему удалось.', '{{user}} передал всю свою злость {{member}}. {{member}}, передай-ка мне эстафету!']],
        services: [ () => xee.rest.uzairashraf.api.random.get({ query: { category: 'angry' } }) ]
    },
    think: {
        text: [['{{user}} задумался... и... теперь выглят умным...', '{{user}} придумывает план-капкан.']],
        services: [ () => xee.rest.uzairashraf.api.random.get({ query: { category: 'thinking' } }) ]
    }
}

module.exports = {
    command: {
        description: 'реакции, для роле-плей',
        aliases: Object.keys(reactions),
        combine: true,
        usage: '<реакция> [@юзер]',
        permissions: { me: ['EMBED_LINKS'] }
    },
    execute: async function (message, args, options) {
        if (!args.length) return message.channel.send(xee.commands.help('reactions', options.prefix))

        const _service = args.shift().toLowerCase().slice(0, 100)
        const service = reactions[_service] // да крутой добавляю и тут же удаляю да =(
        if (!service) return message.channel.send(`Реакции **${_service}** не существует`)

        const image = await (xee.random(service.services)()).catch(() => null)
        if (!image) return message.channel.send('Получить картинку к этой реакции не получилось. =(')

        let member = service.text[1] ? (args[0] ? await findMember(message, args.join(' ')) : null) : null
        if (member?.id === message.author.id) member = null
        
        return message.channel.send({
            embeds: [
                new MessageEmbed()
                .setColor(xee.settings.color)
                .setDescription(member ? xee.random(service.text[1]).parse({ user: message.author.toString(), member: member.user.toString() }) : xee.random(service.text[0]).parse({ user: message.author.toString() }))
                .setImage(image.url || image.reaction)
            ]
        })
    }
}
