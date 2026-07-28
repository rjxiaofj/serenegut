/**
 * 统一的错误提示处理
 * 原则：对外只展示可读的友好文案，真实报错写入控制台，便于排查
 */

// 属于「系统 / 部署配置」层面的错误，不适合直接展示给终端用户
const SYSTEM_ERROR_PATTERNS = [
  /Invalid uni-id config file/i,
  /Invalid config file/i,
  /uni-id-config-field-(required|invalid)/i,
  /Config param required/i,
  /Config for current app/i,
  /Cannot find module/i,
  /uni-config-center/i,
];

const DEFAULT_SYSTEM_MESSAGE = '系统初始化异常，请联系管理员处理';
const DEFAULT_MESSAGE = '操作失败，请稍后重试';

function getMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error.errMsg || error.message || '';
}

export function isSystemError(error) {
  const message = getMessage(error);
  if (!message) return false;
  return SYSTEM_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function friendlyMessage(error, options) {
  const opts = options || {};
  if (isSystemError(error)) {
    return opts.systemMessage || DEFAULT_SYSTEM_MESSAGE;
  }
  return getMessage(error) || opts.fallbackMessage || DEFAULT_MESSAGE;
}

/**
 * 记录真实错误，并以弹窗形式展示友好文案
 * @param {Object|String} error 原始错误
 * @param {Object} [options]
 * @param {String} [options.title] 弹窗标题
 * @param {String} [options.content] 指定展示文案（不传则按错误类型自动生成）
 * @param {String} [options.systemMessage] 系统类错误的文案
 * @param {String} [options.fallbackMessage] 兜底文案
 * @param {String} [options.logTag] 日志前缀
 */
export function showErrorMessage(error, options) {
  const opts = options || {};
  console.error(opts.logTag || '[app-error]', error);
  uni.showModal({
    title: opts.title || '提示',
    content: opts.content || friendlyMessage(error, opts),
    showCancel: false,
  });
}

export default {
  isSystemError,
  friendlyMessage,
  showErrorMessage,
};