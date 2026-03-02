/**
 * Channel type registry and configuration field metadata.
 * Mirrors the channel types supported by OpenClaw CLI (`openclaw channels add`).
 */

export interface ChannelField {
  key: string
  labelKey: string
  type: 'text' | 'password' | 'select' | 'number'
  required: boolean
  placeholderKey?: string
  helpKey?: string
  helpUrl?: string
  options?: { label: string; value: string }[]
}

export interface ChannelMeta {
  id: string
  label: string
  blurb: string
  fields: ChannelField[]
  dmPolicies?: boolean
  order: number
}

export const DM_POLICIES = ['pairing', 'allowlist', 'open', 'disabled'] as const
export type DmPolicy = (typeof DM_POLICIES)[number]

export const CHANNEL_REGISTRY = ([
  {
    id: 'telegram',
    label: 'Telegram',
    blurb: 'channels.telegram.blurb',
    order: 1,
    dmPolicies: true,
    fields: [
      {
        key: 'botToken',
        labelKey: 'channels.telegram.botToken',
        type: 'password',
        required: true,
        placeholderKey: 'channels.telegram.botTokenPlaceholder',
        helpKey: 'channels.telegram.botTokenHelp',
        helpUrl: 'https://t.me/BotFather',
      },
    ],
  },
  {
    id: 'discord',
    label: 'Discord',
    blurb: 'channels.discord.blurb',
    order: 2,
    dmPolicies: true,
    fields: [
      {
        key: 'token',
        labelKey: 'channels.discord.token',
        type: 'password',
        required: true,
        placeholderKey: 'channels.discord.tokenPlaceholder',
        helpKey: 'channels.discord.tokenHelp',
        helpUrl: 'https://discord.com/developers/applications',
      },
    ],
  },
  {
    id: 'slack',
    label: 'Slack',
    blurb: 'channels.slack.blurb',
    order: 3,
    dmPolicies: true,
    fields: [
      {
        key: 'botToken',
        labelKey: 'channels.slack.botToken',
        type: 'password',
        required: true,
        placeholderKey: 'channels.slack.botTokenPlaceholder',
        helpKey: 'channels.slack.botTokenHelp',
      },
      {
        key: 'appToken',
        labelKey: 'channels.slack.appToken',
        type: 'password',
        required: true,
        placeholderKey: 'channels.slack.appTokenPlaceholder',
        helpKey: 'channels.slack.appTokenHelp',
        helpUrl: 'https://api.slack.com/apps',
      },
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    blurb: 'channels.whatsapp.blurb',
    order: 4,
    fields: [],
  },
  {
    id: 'signal',
    label: 'Signal',
    blurb: 'channels.signal.blurb',
    order: 5,
    dmPolicies: true,
    fields: [
      {
        key: 'signalNumber',
        labelKey: 'channels.signal.number',
        type: 'text',
        required: true,
        placeholderKey: 'channels.signal.numberPlaceholder',
      },
      {
        key: 'cliPath',
        labelKey: 'channels.signal.cliPath',
        type: 'text',
        required: false,
        placeholderKey: 'channels.signal.cliPathPlaceholder',
        helpKey: 'channels.signal.cliPathHelp',
      },
    ],
  },
  {
    id: 'feishu',
    label: 'Feishu',
    blurb: 'channels.feishu.blurb',
    order: 6,
    dmPolicies: true,
    fields: [
      {
        key: 'appId',
        labelKey: 'channels.feishu.appId',
        type: 'text',
        required: true,
        placeholderKey: 'channels.feishu.appIdPlaceholder',
        helpKey: 'channels.feishu.appIdHelp',
      },
      {
        key: 'appSecret',
        labelKey: 'channels.feishu.appSecret',
        type: 'password',
        required: true,
        placeholderKey: 'channels.feishu.appSecretPlaceholder',
        helpKey: 'channels.feishu.appSecretHelp',
      },
      {
        key: 'domain',
        labelKey: 'channels.feishu.domain',
        type: 'select',
        required: false,
        helpKey: 'channels.feishu.domainHelp',
        options: [
          { label: 'Feishu', value: 'feishu' },
          { label: 'Lark', value: 'lark' },
        ],
      },
    ],
  },
] satisfies ChannelMeta[]).sort((a, b) => a.order - b.order)

export function getChannelMeta(channelId: string): ChannelMeta | undefined {
  return CHANNEL_REGISTRY.find((c) => c.id === channelId)
}
