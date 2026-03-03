import type { Translations } from '..'

export const zh: Translations = {
  // App
  'app.name': 'ClawNest',

  // Sidebar
  'sidebar.setup': '设置',
  'sidebar.dashboard': '仪表盘',
  'sidebar.connected': '已连接',
  'sidebar.disconnected': '未连接',

  // Dialog
  'dialog.close': '关闭',

  // Dashboard
  'dashboard.title': '仪表盘',
  'dashboard.description': '监控 OpenClaw 网关状态。',
  'dashboard.console': '控制台',
  'dashboard.refresh': '刷新',
  'dashboard.gatewayConnected': '网关已连接',
  'dashboard.gatewayDisconnected': '网关未连接',
  'dashboard.connect': '连接',
  'dashboard.lastChecked': '上次检查：{time}',

  // Gateway Status Card
  'gateway.title': '网关',
  'gateway.status': '状态',
  'gateway.running': '运行中',
  'gateway.stopped': '已停止',
  'gateway.sessions': '会话',
  'gateway.model': '模型',
  'gateway.heartbeat': '心跳 ({agentId})',
  'gateway.heartbeatEvery': '每 {every}',
  'gateway.heartbeatDisabled': '已禁用',

  // Health Summary Card
  'health.title': '健康状态',
  'health.overall': '总体',
  'health.healthy': '健康',
  'health.degraded': '降级',
  'health.unhealthy': '异常',
  'health.unknown': '未知',
  'health.channels': '频道',
  'health.agents': '代理',

  // Setup Page
  'setup.title': '设置',
  'setup.description': '检查环境并安装 OpenClaw 以开始使用。',
  'setup.environment': '环境',
  'setup.installLog': '安装日志',
  'setup.close': '关闭',
  'setup.runOpenclaw': '运行 OpenClaw',
  'setup.stopOpenclaw': '停止 OpenClaw',
  'setup.notReady': '请先安装 Node.js 和 OpenClaw 以启用此按钮。',
  'setup.starting': '正在启动网关，最多需要 20 秒...',
  'setup.stopping': '正在停止...',
  'setup.gatewayStillRunning': '网关仍在运行，可能是在 ClawNest 外部启动的。',
  'setup.install': '安装',
  'setup.download': '下载',
  'setup.uninstall': '卸载',
  'setup.nodejs': 'Node.js',
  'setup.openclaw': 'OpenClaw',
  'setup.installing': '安装中... {seconds}s',
  'setup.installCmd': '$ npm install -g openclaw',
  'setup.installResolving': '正在解析依赖，请稍候...\n',
  'setup.installComplete': '\n--- 安装完成 ---',
  'setup.installFailed': '\n--- 安装失败 (退出码 {code}) ---',
  'setup.uninstallCmd': '$ npm uninstall -g openclaw\n',
  'setup.uninstallComplete': '\n--- 卸载完成 ---',
  'setup.uninstallFailed': '\n--- 卸载失败 (退出码 {code}) ---',
  'setup.installProcessError': '错误：无法启动安装进程',
  'setup.uninstallProcessError': '错误：无法启动卸载进程',
  'setup.failedToStart': '启动网关失败',
  'setup.failedToStop': '停止网关失败',

  // API Auth Section
  'auth.title': 'API 认证',
  'auth.loading': '正在加载提供商状态...',
  'auth.addProvider': '添加提供商',
  'auth.oauthLogin': 'OAuth 登录',
  'auth.or': '或',
  'auth.apiKeyToken': 'API 密钥 / 令牌',
  'auth.providerPlaceholder': '提供商...',
  'auth.otherProvider': '其他...',
  'auth.providerIdPlaceholder': '提供商 ID',
  'auth.pasteApiKey': '粘贴 API 密钥或令牌',
  'auth.pasteYourApiKey': '粘贴您的 API 密钥或令牌',
  'auth.save': '保存',
  'auth.loginWithBrowser': '浏览器登录',
  'auth.remove': '移除',
  'auth.defaultModel': '默认模型',
  'auth.selectModelPrompt': '当前默认模型不可用，请从下方已配置的提供商中选择一个模型。',
  'auth.modelNotAvailable': '当前默认模型不可用，请先重启网关，然后选择一个模型。',
  'auth.selectModel': '选择模型...',
  'auth.modelInputPlaceholder': '或输入模型 ID，如 openai-codex/gpt-5.2-codex',
  'auth.set': '设置',
  'auth.restartBanner': '凭证已更新，请重启网关以应用更改。',
  'auth.restart': '重启',
  'auth.configuredProviders': '已配置的提供商',
  'auth.needsAttention': '需要关注',
  'auth.noProviders': '未配置模型提供商。请在下方添加提供商。',
  'auth.startingOAuth': '正在启动 OAuth 流程...',
  'auth.oauthFailed': '启动 OAuth 登录失败。',
  'auth.oauthLoginFailed': 'OAuth 登录失败 (代码 {code})',
  'auth.loginSuccessful': '登录成功',
  'auth.cancel': '取消',
  'auth.openBrowser': '打开浏览器',
  'auth.submit': '提交',
  'auth.statusExpired': '已过期',
  'auth.statusMissing': '缺失',
  'auth.statusOk': '正常',

  // OAuth prompt patterns (from backend)
  'auth.prompt.verificationCode': '您的验证码是：{code}',
  'auth.prompt.copyAndSubmit': '复制此验证码，然后点击「提交」以打开浏览器。',

  // Setup Steps
  'setup.step.install': '安装',
  'setup.step.providers': 'API 认证',
  'setup.step.channels': '通讯渠道',

  // Channel Section
  'channels.title': '通讯渠道',
  'channels.loading': '加载渠道中...',
  'channels.empty': '未配置任何渠道。添加渠道以将 OpenClaw 连接到消息平台。',
  'channels.addChannel': '添加渠道',
  'channels.statusConfigured': '已配置',
  'channels.statusNotConfigured': '未配置',
  'channels.notPaired': '未配对',
  'channels.channelType': '类型',
  'channels.accountId': '账号 ID',
  'channels.displayName': '显示名称',
  'channels.displayNamePlaceholder': '可选的显示名称',
  'channels.restartBanner': '渠道配置已更新，请重启网关以应用更改。',
  'channels.installFirst': '请先安装 OpenClaw 以配置渠道。',
  'channels.cliOnly': '此渠道需要通过命令行配置，请在终端中运行以下命令：',

  // Channel Modal
  'channels.modal.selectType': '选择渠道类型',
  'channels.modal.configure': '配置渠道',
  'channels.modal.accessPolicy': '访问策略',
  'channels.modal.back': '返回',
  'channels.modal.next': '下一步',

  // Done Step — Next Steps & Pairing Guidance
  'channels.modal.doneTitle': '渠道已添加',
  'channels.done.saved': '{channel} 已保存到配置中。',
  'channels.done.nextSteps': '接下来：',
  'channels.done.stepRestart': '重启网关以激活新渠道。',
  'channels.done.stepOpen.telegram': '打开 Telegram，找到你的 Bot，发送 /start 开始。',
  'channels.done.stepOpen.discord': '将 Bot 邀请到 Discord 服务器，然后发送一条消息。',
  'channels.done.stepOpen.slack': '前往 Slack 工作区，直接给 Bot 发消息。',
  'channels.done.stepOpen.signal': '向你的 Signal Bot 号码发送一条消息。',
  'channels.done.stepOpen.feishu': '打开飞书，找到你的机器人，发送消息即可开始。',
  'channels.done.stepOpen.whatsapp': '网关启动后扫描二维码。',
  'channels.done.stepPairing': '完成配对以关联你的身份：',
  'channels.done.pairingFlow1': '先向 Bot 发送任意消息，它会回复一个 8 位配对码。',
  'channels.done.pairCodePlaceholder': '00000000',
  'channels.done.pair': '配对',
  'channels.done.pairingSuccess': '配对成功！现在可以通过此渠道与 OpenClaw 对话了。',
  'channels.done.restartFirst': '请先重启网关，然后向 Bot 发消息获取配对码。',
  'channels.done.restarted': '已重启',
  'channels.done.close': '完成',

  // DM Policies
  'channels.policy.description': '选择 OpenClaw 在此渠道上处理私信的方式。',
  'channels.policy.pairing': '配对',
  'channels.policy.pairingDesc': '用户必须先通过配对码验证才能聊天。默认推荐。',
  'channels.policy.allowlist': '白名单',
  'channels.policy.allowlistDesc': '仅预先批准的用户可以发送私信。',
  'channels.policy.open': '开放',
  'channels.policy.openDesc': '任何人都可以无限制地发送私信。',
  'channels.policy.disabled': '禁用',
  'channels.policy.disabledDesc': '完全禁用私信功能。',

  // Telegram
  'channels.telegram.blurb': '通过 Telegram Bot 连接',
  'channels.telegram.botToken': 'Bot Token',
  'channels.telegram.botTokenPlaceholder': '粘贴从 @BotFather 获取的 Bot Token',
  'channels.telegram.botTokenHelp': '在 Telegram 上打开 @BotFather，发送 /newbot，然后复制 Token。',

  // Discord
  'channels.discord.blurb': '通过 Discord Bot 连接',
  'channels.discord.token': 'Bot Token',
  'channels.discord.tokenPlaceholder': '粘贴 Discord Bot Token',
  'channels.discord.tokenHelp': '在 Discord Developer Portal 创建应用并复制 Bot Token。',

  // Slack
  'channels.slack.blurb': '通过 Slack App 连接',
  'channels.slack.botToken': 'Bot Token (xoxb-...)',
  'channels.slack.botTokenPlaceholder': 'xoxb-...',
  'channels.slack.botTokenHelp': 'Slack 应用设置中的 Bot User OAuth Token。',
  'channels.slack.appToken': 'App Token (xapp-...)',
  'channels.slack.appTokenPlaceholder': 'xapp-...',
  'channels.slack.appTokenHelp': '具有 connections:write 权限的 App-Level Token，需启用 Socket Mode。',

  // WhatsApp
  'channels.whatsapp.blurb': '通过 WhatsApp 连接（扫码登录）',

  // Signal
  'channels.signal.blurb': '通过 Signal Messenger 连接',
  'channels.signal.number': 'Signal 号码',
  'channels.signal.numberPlaceholder': '+8613800138000',
  'channels.signal.cliPath': 'signal-cli 路径',
  'channels.signal.cliPathPlaceholder': '/usr/local/bin/signal-cli',
  'channels.signal.cliPathHelp': 'signal-cli 二进制文件路径。留空使用默认值。',

  // Feishu
  'channels.feishu.blurb': '通过飞书机器人连接',
  'channels.feishu.appId': 'App ID',
  'channels.feishu.appIdPlaceholder': 'cli_xxxxxxxxxxxxxxxx',
  'channels.feishu.appIdHelp': '在飞书开放平台创建应用并复制 App ID。',
  'channels.feishu.appSecret': 'App Secret',
  'channels.feishu.appSecretPlaceholder': '粘贴你的 App Secret',
  'channels.feishu.appSecretHelp': '在飞书开发者控制台的"凭证与基础信息"中找到。',
  'channels.feishu.domain': '域名',
  'channels.feishu.domainHelp': '国内用户选飞书，海外用户选 Lark。',

  // Updater
  'updater.available': '新版本 {version} 可用',
  'updater.downloading': '正在下载更新... {percent}%',
  'updater.ready': '更新 {version} 已下载完成',
  'updater.install': '重启并更新',
  'updater.later': '稍后',
  'updater.checkForUpdate': '检查更新',
  'updater.upToDate': '已是最新版本',
  'updater.error': '检查更新失败',

  // Health Card — Channel Details
  'health.channelLinked': '已连接',
  'health.channelConfigured': '已配置',
  'health.channelError': '错误',
}
