<template>
	<image class="app-icon" :src="src" mode="aspectFit" :style="iconStyle" />
</template>

<script>
	/* emoji -> [图标名, 默认色调] 映射，兼容 AI 动态返回的 emoji */
	const EMOJI_ICONS = {
		'✨': ['sparkles'],
		'✅': ['circle-check-filled', 'green'],
		'📊': ['chart-bar'],
		'📝': ['notebook'],
		'📢': ['speakerphone'],
		'⚠️': ['alert-triangle', 'orange'],
		'⚠': ['alert-triangle', 'orange'],
		'📅': ['calendar'],
		'🛡️': ['shield-check'],
		'🛡': ['shield-check'],
		'📈': ['trending-up'],
		'👥': ['users'],
		'🎯': ['target'],
		'💡': ['bulb'],
		'💩': ['poop'],
		'🟢': ['circle-dot', 'green'],
		'❤️': ['heart-filled', 'red'],
		'❤': ['heart-filled', 'red'],
		'🤍': ['heart'],
		'💬': ['message-circle'],
		'📤': ['share-3'],
		'⭐': ['star-filled'],
		'🌟': ['star-filled'],
		'☆': ['star'],
		'📞': ['phone'],
		'📧': ['mail'],
		'✏️': ['pencil'],
		'✏': ['pencil'],
		'🥗': ['salad'],
		'💧': ['droplet'],
		'🔔': ['bell'],
		'⏰': ['bell'],
		'🏆': ['trophy'],
		'✕': ['x', 'red'],
		'✓': ['check', 'green'],
		'↑': ['arrow-up'],
		'🥃': ['cup'],
		'🥤': ['cup'],
		'🧴': ['bottle'],
		'🚰': ['droplet'],
		'🥄': ['cup'],
		'🥦': ['plant-2'],
		'🎨': ['palette'],
		'🤖': ['robot'],
		'🔒': ['lock'],
		'🌅': ['sunrise'],
		'🏃': ['run'],
		'⬅️': ['arrow-left'],
		'⬅': ['arrow-left'],
		'➡️': ['arrow-right'],
		'➡': ['arrow-right'],
		'🔗': ['link'],
		'☀️': ['sun'],
		'☀': ['sun'],
		'⬇️': ['download'],
		'⚙️': ['settings'],
		'⚙': ['settings'],
		'👑': ['crown'],
		'🟥': ['square-filled', 'red'],
		'🟧': ['square-filled', 'orange'],
		'📷': ['camera'],
		'👤': ['user'],
		'📱': ['device-mobile'],
		'🕐': ['clock'],
		'📚': ['books'],
		'💕': ['hearts', 'red'],
		'💖': ['heart-filled', 'red'],
		'💗': ['heart', 'red'],
		'💝': ['heart-filled', 'red'],
		'💓': ['heart', 'red']
	}

	export default {
		name: 'AppIcon',
		props: {
			/* 支持 emoji、语义图标名（如 sparkles、chart-bar） */
			name: { type: String, default: 'sparkles' },
			size: { type: [Number, String], default: 32 },
			/* primary / white / green / red / orange，不传则使用映射默认色调 */
			color: { type: String, default: '' }
		},
		computed: {
			iconInfo() {
				const mapped = EMOJI_ICONS[this.name]
				if (mapped) return { icon: mapped[0], tone: mapped[1] || 'primary' }
				if (/^[a-z0-9-]+$/.test(this.name)) return { icon: this.name, tone: 'primary' }
				return { icon: 'sparkles', tone: 'primary' }
			},
			src() {
				const tone = this.color || this.iconInfo.tone
				const suffix = tone && tone !== 'primary' ? '-' + tone : ''
				return '/static/icons/' + this.iconInfo.icon + suffix + '.png'
			},
			iconStyle() {
				const s = typeof this.size === 'number' ? this.size + 'rpx' : this.size
				return { width: s, height: s }
			}
		}
	}
</script>

<style scoped>
	.app-icon {
		display: inline-block;
		flex-shrink: 0;
	}
</style>