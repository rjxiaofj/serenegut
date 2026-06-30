<template>
	<view class="page-container-no-tab">
		<custom-nav title="科普列表" showBack />
		<view class="content">
			<view class="filter-bar">
				<view 
					v-for="filter in filters" 
					:key="filter.id"
					:class="['filter-item', { active: activeFilter === filter.id }]"
					@click="switchFilter(filter.id)"
				>
					<text class="filter-text">{{ filter.label }}</text>
				</view>
			</view>

			<view v-if="articles.length > 0" class="article-list">
				<view 
					v-for="(article, index) in articles" 
					:key="article._id" 
					class="article-card"
					@click="goToArticle(article)"
				>
					<view class="article-cover">
						<image :src="article.cover_image" class="cover-image" mode="aspectFill" />
						<view class="article-rank">
							<text :class="['rank-text', index < 3 ? 'top-three' : '']">{{ index + 1 }}</text>
						</view>
					</view>
					<view class="article-info">
						<text class="article-title">{{ article.title }}</text>
						<view class="article-bottom-row">
							<text class="article-tag">{{ article.tags && article.tags.length > 0 ? article.tags[0] : '科普' }}</text>
							<view class="article-meta-right">
								<text class="article-views">{{ formatViews(article.view_count) }}</text>
								<view class="article-author-wrap">
									<view class="marquee-container">
										<view class="marquee-content">
											<text 
												class="article-author" 
												:class="{ 'marquee-text': article.author_name && article.author_name.length > 5 }"
											>{{ article.author_name || '未知作者' }}</text>
											<text 
												v-if="article.author_name && article.author_name.length > 5"
												class="article-author"
											>&nbsp;&nbsp;&nbsp;{{ article.author_name }}</text>
										</view>
									</view>
								</view>
							</view>
						</view>
					</view>
				</view>
			</view>

			<view v-else-if="!isLoading" class="empty-state">
				<text class="empty-text">暂无文章</text>
			</view>

			<view v-if="isLoading" class="loading-state">
				<text class="loading-text">加载中...</text>
			</view>
		</view>
		<CustomToast ref="customToast" />
	</view>
</template>

<script>
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import { articleApi } from '@/js_sdk/sg-client/api.js'

	export default {
		name: 'ArticleList',
		components: {
			CustomNav
		},
		data() {
			return {
				activeFilter: 'recent',
				filters: [
					{ id: 'recent', label: '最新' },
					{ id: 'weekly', label: '本周' },
					{ id: 'archived', label: '往期' },
				],
				articles: [],
				currentPage: 1,
				pageSize: 10,
				total: 0,
				isLoading: false,
				hasMore: true
			}
		},
		onLoad() {
			this.loadArticles()
		},
		onReachBottom() {
			if (this.hasMore && !this.isLoading) {
				this.loadMore()
			}
		},
		methods: {
			switchFilter(filterId) {
				if (this.activeFilter === filterId) return
				this.activeFilter = filterId
				this.currentPage = 1
				this.articles = []
				this.hasMore = true
				this.loadArticles()
			},
			async loadArticles() {
				if (this.isLoading) return
				this.isLoading = true
				try {
					const params = {
						page: this.currentPage,
						size: this.pageSize
					}

					if (this.activeFilter === 'weekly') {
						const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
						params.start_time = weekAgo
					} else if (this.activeFilter === 'archived') {
						const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
						params.end_time = monthAgo
					}

					/* 使用 API 服务层获取文章列表 */
					const result = await articleApi.list(params)

					if (result && result.code === 0) {
						const list = result.data.list
						if (this.currentPage === 1) {
							this.articles = list
						} else {
							this.articles = [...this.articles, ...list]
						}
						this.total = result.data.total
						this.hasMore = this.articles.length < this.total
					} else {
						uni.showToast({ title: '加载失败', icon: 'none' })
					}
				} catch (error) {
					console.error('加载文章失败:', error)
					uni.showToast({ title: '加载失败', icon: 'none' })
				}
				this.isLoading = false
			},
			loadMore() {
				this.currentPage++
				this.loadArticles()
			},
			goToArticle(article) {
				uni.navigateTo({
					url: `/pages/content/article/article?id=${article._id}`
				})
			},
			formatViews(count) {
				if (!count) return '0阅读'
				if (count >= 10000) {
					return (count / 10000).toFixed(1) + 'w阅读'
				} else if (count >= 1000) {
					return (count / 1000).toFixed(1) + 'k阅读'
				}
				return count + '阅读'
			}
		}
	}
</script>

<style lang="scss" scoped>
	.content {
		display: flex;
		flex-direction: column;
		gap: 24rpx;
		padding-top: 32rpx;
		padding-bottom: 60rpx;
	}

	.filter-bar {
		display: flex;
		background: rgba(254, 244, 233, 0.6);
		border-radius: 32rpx;
		padding: 8rpx;
		margin: 0 24rpx;
	}

	.filter-item {
		flex: 1;
		padding: 20rpx;
		border-radius: 24rpx;
		text-align: center;
		transition: all 0.3s;

		&.active {
			background: #ffffff;
		}
	}

	.filter-text {
		font-size: 28rpx;
		font-weight: 600;
		color: #887364;

		.filter-item.active & {
			color: #8d4b00;
		}
	}

	.article-list {
		display: flex;
		flex-direction: column;
		gap: 24rpx;
		padding: 0 24rpx;
	}

	.article-card {
		display: flex;
		gap: 20rpx;
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 24rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.97);
			box-shadow: 0 4rpx 24rpx rgba(141, 75, 0, 0.08);
		}
	}

	.article-cover {
		width: 160rpx;
		height: 160rpx;
		border-radius: 24rpx;
		overflow: hidden;
		flex-shrink: 0;
		position: relative;
	}

	.cover-image {
		width: 100%;
		height: 100%;
	}

	.article-rank {
		position: absolute;
		bottom: 8rpx;
		left: 8rpx;
		background: rgba(45, 30, 20, 0.5);
		padding: 4rpx 16rpx;
		border-radius: 16rpx;
	}

	.rank-text {
		font-size: 24rpx;
		font-weight: 600;
		color: #ffffff;

		&.top-three {
			color: #ffcc00;
			font-weight: 700;
		}
	}

	.article-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-width: 0;
	}

	.article-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #2a1f15;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.article-bottom-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 16rpx;
	}

	.article-tag {
		font-size: 22rpx;
		font-weight: 600;
		color: #8d4b00;
		background: rgba(141, 75, 0, 0.1);
		padding: 8rpx 20rpx;
		border-radius: 20rpx;
		flex-shrink: 0;
	}

	.article-meta-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8rpx;
		flex-shrink: 0;
		margin-left: 16rpx;
	}

	.article-views {
		font-size: 24rpx;
		color: #887364;
		white-space: nowrap;
	}

	.article-author-wrap {
		overflow: hidden;
		max-width: 200rpx;
	}

	.marquee-container {
		overflow: hidden;
		width: 100%;
	}

	.marquee-content {
		display: inline-block;
		white-space: nowrap;
		animation: marquee 6s linear infinite;
	}

	@keyframes marquee {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}

	.article-author {
		font-size: 24rpx;
		color: #887364;
		white-space: nowrap;
	}

	.empty-state {
		padding: 120rpx 0;
		text-align: center;
	}

	.empty-text {
		font-size: 28rpx;
		color: #887364;
	}

	.loading-state {
		padding: 40rpx 0;
		text-align: center;
	}

	.loading-text {
		font-size: 26rpx;
		color: #887364;
	}
</style>
