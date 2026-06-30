<template>
	<view class="page-container-no-tab">
		<custom-nav title="文章详情" showBack />
		<view class="content" v-if="article">
			<view class="article-header">
				<image :src="article.cover_image" class="cover-image" mode="aspectFill" />
				<view class="title-track" :class="{ marquee: needMarquee }">
					<text class="article-title">{{ article.title }}</text>
					<text class="article-title" v-if="needMarquee">{{ article.title }}</text>
				</view>
				<view class="article-meta">
					<text class="meta-item">{{ formatDate(article.publish_time) }}</text>
					<text class="meta-divider">·</text>
					<text class="meta-item">{{ article.author_name || '未知作者' }}</text>
					<text class="meta-divider">·</text>
					<text class="meta-item">{{ formatViews(article.view_count) }}</text>
				</view>
				<view class="article-tags">
					<text
						v-for="(tag, index) in article.tags"
						:key="index"
						class="tag-item"
					>{{ tag }}</text>
				</view>
			</view>

			<view class="article-content">
				<view v-html="processContent(article.content)" class="content-html"></view>
			</view>

			<view class="bottom-spacer"></view>
		</view>

		<view class="float-action-bar" v-if="article">
			<view class="action-item" @click="handleLike">
				<AppIcon :name="isLiked ? 'heart-filled' : 'heart'" :color="isLiked ? 'red' : 'primary'" :size="30" />
				<text class="action-text">{{ article.like_count }}</text>
			</view>
			<view class="action-divider"></view>
			<view class="action-item" @click="handleComment">
				<AppIcon name="message-circle" :size="30" />
				<text class="action-text">{{ article.comment_count }}</text>
			</view>
			<view class="action-divider"></view>
			<view class="action-item" @click="handleShare">
				<AppIcon name="share-3" :size="30" />
				<text class="action-text">{{ article.share_count }}</text>
			</view>
			<view class="action-divider"></view>
			<view class="action-item" @click="handleFavorite">
				<AppIcon :name="isFavorited ? 'star-filled' : 'star'" :size="30" />
				<text class="action-text">{{ article.favorite_count }}</text>
			</view>
		</view>
		<CustomToast ref="customToast" />
	</view>
</template>

<script>
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import AppIcon from '@/components/AppIcon/AppIcon.vue'
	import { articleApi } from '@/js_sdk/sg-client/api.js'

	export default {
		name: 'Article',
		components: {
			CustomNav,
			AppIcon
		},
		data() {
			return {
				pageIcons: {},
				article: null,
				isLiked: false,
				isFavorited: false,
				needMarquee: false
			}
		},
		onLoad(options) {
			this.loadPageIcons()
			if (options && options.id) {
				this.loadArticle(options.id)
			} else {
				uni.showToast({
					title: '文章ID为空',
					icon: 'none'
				})
			}
		},
		methods: {
			goBack() {
				uni.navigateBack()
			},
			checkTitleWidth() {
				this.$nextTick(() => {
					const query = uni.createSelectorQuery().in(this)
					query.select('.title-track').boundingClientRect()
					query.select('.article-title').boundingClientRect()
					query.exec((res) => {
						if (res[0] && res[1]) {
							if (res[1].width > res[0].width) {
								this.needMarquee = true
							}
						}
					})
				})
			},
			async loadArticle(articleId) {
				try {
					/* 使用 API 服务层获取文章详情 */
					const result = await articleApi.get(articleId)

					if (result && result.code === 0) {
						this.article = result.data
						this.checkTitleWidth()
						this.incrementViewCount(articleId)
						// 检查当前用户的点赞/收藏状态
						this.checkUserStatus(articleId)
					} else {
						uni.showToast({
							title: result.message || '文章不存在',
							icon: 'none'
						})
					}
				} catch (error) {
					console.error('加载文章失败:', error)
					uni.showToast({
						title: '加载失败',
						icon: 'none'
					})
				}
			},
			async checkUserStatus(articleId) {
				const userId = uni.getStorageSync('userId')
				if (!userId) return
				try {
					/* 使用 API 服务层检查用户点赞/收藏状态 */
					const res = await articleApi.check(articleId, userId)
					if (res && res.code === 0) {
						this.isLiked = res.data.isLiked
						this.isFavorited = res.data.isFavorited
					}
				} catch (e) {
					console.error('检查状态失败:', e)
				}
			},
			async incrementViewCount(articleId) {
				try {
					/* 使用 API 服务层自增文章浏览量 */
					await articleApi.increment(articleId, 'view')
				} catch (error) {
					console.error('更新阅读量失败:', error)
				}
			},
			formatDate(timestamp) {
				if (!timestamp) return ''
				const date = new Date(timestamp)
				const year = date.getFullYear()
				const month = String(date.getMonth() + 1).padStart(2, '0')
				const day = String(date.getDate()).padStart(2, '0')
				return `${year}.${month}.${day}`
			},
			formatViews(count) {
				if (!count) return '0阅读'
				if (count >= 10000) {
					return (count / 10000).toFixed(1) + 'w阅读'
				} else if (count >= 1000) {
					return (count / 1000).toFixed(1) + 'k阅读'
				}
				return count + '阅读'
			},
			async handleLike() {
				const userId = uni.getStorageSync('userId')
				if (!userId) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					return
				}
				const wasLiked = this.isLiked
				this.isLiked = !this.isLiked
				this.article.like_count += this.isLiked ? 1 : -1
				try {
					/* 使用 API 服务层点赞/取消点赞 */
					const res = await articleApi.like(this.article._id, userId)
					if (res && res.code === 0) {
						this.isLiked = res.data.isLiked
					} else {
						// 回滚
						this.isLiked = wasLiked
						this.article.like_count += wasLiked ? 1 : -1
					}
				} catch (error) {
					console.error('更新点赞失败:', error)
					this.isLiked = wasLiked
					this.article.like_count += wasLiked ? 1 : -1
				}
			},
			handleComment() {
				uni.showToast({
					title: '评论功能开发中',
					icon: 'none'
				})
			},
			async handleShare() {
				this.article.share_count++
				try {
					/* 使用 API 服务层自增分享次数 */
					await articleApi.increment(this.article._id, 'share')
					uni.showToast({
						title: '分享成功',
						icon: 'success'
					})
				} catch (error) {
					console.error('更新分享失败:', error)
					this.article.share_count--
				}
			},
			async handleFavorite() {
				const userId = uni.getStorageSync('userId')
				if (!userId) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					return
				}
				const wasFavorited = this.isFavorited
				this.isFavorited = !this.isFavorited
				this.article.favorite_count += this.isFavorited ? 1 : -1
				try {
					/* 使用 API 服务层收藏/取消收藏 */
					const res = await articleApi.favorite(this.article._id, userId)
					if (res && res.code === 0) {
						this.isFavorited = res.data.isFavorited
					} else {
						this.isFavorited = wasFavorited
						this.article.favorite_count += wasFavorited ? 1 : -1
					}
				} catch (error) {
					console.error('更新收藏失败:', error)
					this.isFavorited = wasFavorited
					this.article.favorite_count += wasFavorited ? 1 : -1
				}
			},
			loadPageIcons() {
				this.pageIcons = {
					left: '/static/images/other-icons/left.png'
				}
			},
			/* 处理文章内容中的图片样式：给 img 标签注入内联样式，防止图片溢出容器 */
			processContent(content) {
				if (!content) return ''
				// 给所有 img 标签添加 max-width 和 height 样式，确保图片自适应宽度
				return content.replace(/<img/g, '<img style="max-width:100%;height:auto;display:block;border-radius:12rpx;"')
			}
		}
	}
</script>

<style lang="scss" scoped>
	.content {
		padding-top: 32rpx;
		padding-bottom: 60rpx;
	}

	.article-header {
		padding: 0 32rpx;
		margin-bottom: 32rpx;
	}

	.cover-image {
		width: 100%;
		height: 400rpx;
		border-radius: 32rpx;
		margin-bottom: 24rpx;
	}

	.title-track {
		overflow: hidden;
		margin-bottom: 20rpx;
		white-space: nowrap;

		&.marquee {
			.article-title {
				display: inline-block;
				padding-right: 80rpx;
				animation: title-marquee 8s linear infinite;
			}
		}
	}

	.article-title {
		font-size: 44rpx;
		font-weight: 700;
		color: #2a1f15;
		line-height: 1.4;
	}

	@keyframes title-marquee {
		0% { transform: translateX(0); }
		100% { transform: translateX(-50%); }
	}

	.article-meta {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 20rpx;
	}

	.meta-item {
		font-size: 26rpx;
		color: #887364;
	}

	.meta-divider {
		font-size: 26rpx;
		color: #ccc;
	}

	.article-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
	}

	.tag-item {
		font-size: 24rpx;
		font-weight: 600;
		color: #8d4b00;
		background: rgba(141, 75, 0, 0.1);
		padding: 8rpx 20rpx;
		border-radius: 20rpx;
	}

	.article-content {
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 40rpx;
		margin: 0 32rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
		overflow: hidden;
	}

	/* 文章内容图片防溢出：deep 穿透到 v-html 渲染的 img/image 标签（H5 端兜底） */
	.article-content ::v-deep image,
	.article-content ::v-deep img {
		max-width: 100% !important;
		width: 100% !important;
		height: auto !important;
		display: block;
		border-radius: 12rpx;
	}

	.content-html {
		font-size: 30rpx;
		color: #554336;
		line-height: 1.8;
	}

	.content-html p {
		margin-bottom: 24rpx;
	}

	.content-html h3 {
		font-size: 36rpx;
		font-weight: 700;
		color: #2a1f15;
		margin: 32rpx 0 20rpx;
	}

	.bottom-spacer {
		height: 140rpx;
	}

	/* 悬浮互动栏 */
	.float-action-bar {
		position: fixed;
		left: 32rpx;
		right: 32rpx;
		bottom: 32rpx;
		display: flex;
		align-items: center;
		justify-content: space-around;
		background: rgba(255, 250, 243, 0.95);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 20rpx 16rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.15), 0 2rpx 8rpx rgba(146, 64, 14, 0.08);
		z-index: 100;
	}

	.action-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6rpx;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.92);
		}
	}

	.action-icon {
		font-size: 40rpx;
	}

	.action-text {
		font-size: 24rpx;
		font-weight: 600;
		color: #887364;
	}

	.action-divider {
		width: 1rpx;
		height: 48rpx;
		background: rgba(141, 75, 0, 0.1);
	}
</style>
