const { readFileSync } = require('fs')
const { safeLoad } = require('js-yaml')
const { Client } = require('discord.js')
const fetch = require('node-fetch')

const config = parseConfig('config.yml')

const client = new Client({
  disableMentions: 'all',
  messageCacheMaxSize: 25,
  messageCacheLifetime: 600, // 10 minutes
  messageSweepInterval: 300, // 5 minutes
  ws: {
    intents: 1 << 0 | 1 << 9
  }
})

client.on('ready', () => {
  console.log('Logged in as:', client.user.tag)
})

client.on('message', async (msg) => {
  const mentionPrefix = new RegExp(`^<@!?${client.user.id}>\\s*?`)

  if (mentionPrefix.test(msg.content) && !msg.author.bot) {
    const args = msg.content
      .replace(mentionPrefix, '')
      .trim()
      .split(/\s+/)
    const cmd = args.shift().toLowerCase()

    switch (cmd) {
      case 'ping': {
        const sent = Date.now()
        const m = await msg.channel.send(':ping_pong: Pong!')

        m.edit(
        `:ping_pong: Pong!\n> :outbox_tray: Send time: \`${
          (Date.now() - sent).toFixed(0)
        }ms\`\n> :heartbeat: WebSocket latency: \`${
          client.ws.ping.toFixed(0)
        }ms\``
        )
        break
      }

      case 'ids':
      case 'idof': {
        if (!args[0]) {
          msg.channel.send(':x: Invalid usage.')
          return
        }

        const m = msg.channel.messages.cache.get(args[0]) ||
          await msg.channel.messages.fetch(args[0])

        if (!m) {
          msg.channel.send(':x: That message could not be found.')
          return
        }

        msg.channel.send(
          `\n> :bust_in_silhouette: Author: \`${
            m.author.id
          }\`\n> :speech_balloon: Message: \`${
            m.id
          }\`\n> :homes: Guild: \`${
            m.guild.id
          }\`\n> :house: Channel: \`${
            m.channel.id
          }\``
        )

        break
      }

      case 'listfollowed':
      case 'listfollowing': {
        if (!msg.member.permissions.has('MANAGE_WEBHOOKS')) {
          msg.channel.send(':x: You do not have permission to use this command.')
          return
        }

        const webhooks = await msg.channel.fetchWebhooks()
        const mapped = webhooks
          .filter(w => w.type === 'Channel Follower')
          .map(w => `${w.id} | ${w.name}`)
          .join('\n')

        if (mapped) {
          msg.channel.send(mapped, { code: true })
        } else {
          msg.channel.send(':x: There are no followed channels in this channel.')
        }

        break
      }

      case 'help': {
        msg.channel.send(
          '`ping`\n' +
            '> Get the bot\'s API latency (also useful for checking if the bot is dead)\n' +
          '`idof <m-id>`\n' +
            '> Get some information about a message. Note: this is the only way to get the id of a published message\n' +
          '`listfollowing`\n' +
            '> Get a list of followed channels and their webhook IDs' +
          '`help`\n' +
            '> Get a list of commands'
        )

        break
      }
    }
  }

  if (
    msg.channel.id !== config.proxy_channel ||
    (!msg.content && !msg.embeds.length) ||
    !config.proxies.some((c) => c.user === msg.author.id)
  ) {
    return
  }

  const found = config.proxies.filter((p) => p.user === msg.author.id)

  const body = {
    content: msg.content,
    embeds: msg.embeds.map((e) => e.toJSON())
  }

  for (const h of found) {
    if (!h?.webhook?.id || !h?.webhook?.token) {
      console.log(
        'Message from', msg.author.id, 'could not be reposted due to missing configuration elements.'
      )

      break
    }

    if (h?.roles?.length) {
      console.log(h.roles)
      const roles = h.roles.map((r) => `<@&${r}>`).join(' ')

      body.content = `${body.content}\n${roles}`
    }

    const hook = `https://discord.com/api/webhooks/${h.webhook.id}/${h.webhook.token}?wait=1`
    await send(hook, body)
      .catch(console.error)
  }
})

client.login(config.token).catch(console.error)

/**
 * parse yaml config and check that all required elements are present
 * @param {string} path - path to the config file
 * @param {string[]} required - required config elements
 * @return {Object | undefined} - parsed config
 */
function parseConfig (
  path,
  required = ['token', 'proxy_channel', 'proxies']
) {
  const conf = readFileSync(path, { encoding: 'utf-8' })
  const parsed = safeLoad(conf)
  const missing = []

  for (const req of required) {
    if (!(req in parsed)) {
      missing.push(req)
    }
  }

  if (missing.length) {
    throw new Error('Config has missing elements: ' + missing.join(', '))
  }

  return parsed
}

/**
 * send a message with a webhook
 * @param {string} webhook - the webhook to use
 * @param {string} body - the content to send
 * @return {Promise<Object>}
 */
async function send (webhook, body) {
  const reqBody = {
    allowed_mentions: {
      parse: ['roles']
    },
    ...body
  }

  return fetch(webhook, {
    method: 'post',
    body: JSON.stringify(reqBody),
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then((res) => res.json())
}
