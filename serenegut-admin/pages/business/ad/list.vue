<template>
	<view class="page-wrap">
		<!-- 顶部标题栏 -->
		<view class="page-header glass-card fade-in-up">
			<text class="page-title">广告管理</text>
			<view class="header-actions">
				<view class="sg-btn sg-btn-ghost sg-btn-sm">刷新</view>
			</view>
		</view>

		<!-- 加载中 -->
		<view v-if="loading" class="loading-wrap glass-card">
			<view class="spinner"></view>
		</view>

		<!-- 空状态 -->
		<view v-else class="empty-state glass-card fade-in-up">
			<text class="empty-icon">📢</text>
			<text class="empty-text">广告管理功能开发中</text>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'

// 页面加载状态：预留，后续接入接口时使用
const loading = ref(false)
</script>

<style scoped>
/* ===================== 标题栏 ===================== */
.page-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
}
.page-title {
	font-size: 18px;
	font-weight: 700;
	color: var(--text-primary);
}
.header-actions {
	display: flex;
	gap: 8px;
}

/* ===================== 加载 / 空状态 ===================== */
.loading-wrap {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 80px 0;
}
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 80px 0;
}
.empty-icon {
	font-size: 48px;
}
.empty-text {
	font-size: 14px;
	color: var(--text-muted);
}
</style>
