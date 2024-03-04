const Confirmation = require('../../classes/Confirmation')
const { findMember, chunk } = require('../../client/util')
xee.store.inGame = new Set()

const { MessageButton, MessageActionRow } = require('discord.js')
const { randomBytes } = require('crypto')

module.exports = {
    command: {
        description: 'игра крестики нолики',
        usage: '[@юзер]',
        aliases: ['ttt'],
        examples: {
            '{{prefix}}tic-tac-toe @oddyamill': 'пригласит andrey сыграть в крестики-нолики'
        }
    },
    execute: async function (message, args, options) {
        if (xee.store.inGame.has(message.author.id)) return

        const member = args.length ? await findMember(message, args.join(' ')) : message.member
        if (!member) return message.channel.send(`Такого пользователя нет. =/`)

        if (member.user.bot) return message.channel.send('Как ты собираешься играть с ботом?')
        if (xee.store.inGame.has(message.author.id)) return message.channel.send(`**${member.user.username}** уже с кем-то играет...`)

        const answer = member.id === message.author.id || options.force || await (
            new Confirmation(message)
                .setContent({ allowedMentions: { users: [message.author.id, !message.mentions.users.has(member.id) && member.id].filter(Boolean) }, content: `${member}, не хочешь ли ты поиграть с ${message.author} в крестики нолики? 🤔` })
                .setUser(member.id)
                .awaitResponse(true)
        )

        if (!answer) return message.channel.send(`**${member.user.username}** слился. Ясно, ботяра!`)
        [ message.author.id, member.id ].forEach(id => xee.store.inGame.add(id))

        const id = randomBytes(6).toString('hex')
        const sides = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
        let userTurn = !!Math.floor(xee.random(0, 2))
        let winner = null

        let gameMessage 
        let lastTurn = null
        let isWin
        let isTime = false

        while (!winner && sides.filter(c => isNaN(+c)).length < 9) {
            const user = userTurn ? message.member : member

            await (gameMessage ? gameMessage.edit.bind(gameMessage) : message.channel.send.bind(message.channel))({
                content: `Ход ${user.user.tag} (${userTurn ? 'X' : 'O'})...`,
                components: this.getButtons(sides, isWin, id)
            }).then(m => gameMessage = m)

            const turn = await gameMessage.awaitMessageComponent({ filter: c => c.user.id === user.id && (!isNaN(+c.customId.split('-').pop()) || c.customId.split('-').pop() === 'stop'), time: 6e4 }).catch(() => null)
            if (!turn || turn.customId.split('-').pop() === 'stop') {
                isTime = true
                break
            }

            sides[+turn.customId.split('-').pop() - 1] = userTurn ? 'X' : 'O'

            isWin = this.verifyWin(sides)
            lastTurn = turn

            await turn.deferUpdate()
            if (isWin) winner = { user, sign: userTurn ? 'X' : 'O' }
            else userTurn = !userTurn
        }

        [ message.author.id, member.id ].forEach(id => xee.store.inGame.delete(id))
        if (isTime) return gameMessage.delete().catch(() => {})

        gameMessage.edit.bind(gameMessage)
            ({ content: winner ? `Победитель: **${winner.user.user.username}** (${winner.sign}). Мои поздравления. :3` : 'Победила дружба! :heart_eyes:', components: this.getButtons(sides, isWin || true, id) })
        return this.execute(message, args, { ...options, force: true })
    },

    getButtons(sides, isWin, id) {
        return chunk(sides, 3).map((c, i) => 
            new MessageActionRow().addComponents( 
                c.map((b, _) =>
                    new MessageButton()
                        .setCustomId(id + '-' + (isNaN(+b) ? randomBytes(2).toString('hex') : b))
                        .setStyle(isWin ? (isWin.includes?.(i ? i * 3 + _ : _) ? 'SUCCESS' : 'SECONDARY') : b === 'X' ? 'PRIMARY' : b === 'O' ? 'DANGER' : 'SECONDARY')
                        .setLabel(b) 
                ) 
            )
        ).concat(!isWin ? [
            new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId(id + '-stop')
                    .setStyle('SECONDARY')
                    .setLabel('Остановить')
            )
        ] : [])
    },

    verifyWin: function (sides) {
        return [
            [0, 1, 2],
            [0, 3, 6],
            [3, 4, 5],
            [1, 4, 7],
            [6, 7, 8],
            [2, 5, 8],
            [0, 4, 8],
            [2, 4, 6]
        ].find(s => sides[s[0]] === sides[s[1]] && sides[s[1]] === sides[s[2]])
    }
}
