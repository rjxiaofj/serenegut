<template>
	<view class="article-list">
		<view 
			v-for="(article, index) in articles" 
			:key="article._id || index" 
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
</template>

<script>
	export default {
		name: 'ArticleList',
		props: {
			articles: {
				type: Array,
				default: () => []
			}
		},
		methods: {
			goToArticle(article) {
				this.$emit('go-to-article', article)
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
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.97);
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
		background: rgba(45, 30, 20, 0.45);
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
</style>
