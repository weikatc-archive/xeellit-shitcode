const fetch = require('../client/fetch')
const { Agent } = require('https')

const { mergeDefault } = require('../client/util')

const methods = ['get', 'post', 'delete', 'patch', 'put']
const reflectors = [
    'toString',
    'valueOf',
    'inspect',
    'constructor',
    Symbol.toPrimitive,
    Symbol.for('nodejs.util.inspect.custom'),
]


const buildRoute = function (path, defaultOptions = {}) {
    const route = ['']
    const handler = {
        get(target, name) {
            if (reflectors.includes(name)) 
                return () => path + route.join('/')
            else if (methods.includes(name)) {
                return options => fetch(path + route.join('/'), {
                    ...mergeDefault(defaultOptions, options),
                    method: name.toUpperCase()
                })
            } else {
                route.push(name)
                return new Proxy(() => {}, handler)
            }
        },
        apply(target, _, args) {
            route.push(...args.filter(x => x != null))
            return new Proxy(() => {}, handler)
        }
    }
    return new Proxy(() => {}, handler)
}


class RESTManager {
    constructor(path, defaultOptions = {}) {
        if (path.endsWith('/')) path.slice(0, -1)

        this.path = path
        this.default = defaultOptions

        if (path.startsWith('https')) {
            this.agent = this.default.agent = new Agent({
                keepAlive: true
            })
        }
    }
    get api() {
        return buildRoute(this.path, this.default)
    }
}

module.exports = RESTManager