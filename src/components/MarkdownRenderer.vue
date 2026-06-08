<template>
  <view class="markdown-content" v-html="renderedHtml"></view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';

const props = defineProps<{
  content: string;
}>();

// 配置 marked 选项
marked.setOptions({
  breaks: true, // 支持换行符转换为 <br>
  gfm: true, // 启用 GitHub Flavored Markdown
});

// 渲染 Markdown 内容
const renderedHtml = computed(() => {
  if (!props.content) return '';
  
  try {
    return marked(props.content);
  } catch (error) {
    console.error('Markdown parsing error:', error);
    // 如果解析失败，返回原始内容
    return props.content.replace(/\n/g, '<br>');
  }
});
</script>

<style scoped>
.markdown-content {
  word-break: break-word;
  font-family: 'Chivo', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 1.5;
  color: #323232;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 16px 0 8px 0;
  font-family: 'Archivo', sans-serif;
  font-weight: 500;
  color: #000;
}

.markdown-content :deep(h1) {
  font-size: 22px;
  line-height: 1.3;
}

.markdown-content :deep(h2) {
  font-size: 18px;
  line-height: 1.35;
}

.markdown-content :deep(h3) {
  font-size: 16px;
  line-height: 1.375;
}

.markdown-content :deep(p) {
  margin: 8px 0;
  font-family: 'Chivo', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 1.5;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.markdown-content :deep(li) {
  margin: 4px 0;
}

.markdown-content :deep(blockquote) {
  margin: 8px 0;
  padding: 8px 12px;
  border-left: 4px solid #ddd;
  background-color: #f9f9f9;
  font-style: italic;
}

.markdown-content :deep(code) {
  background-color: #f1f1f1;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.markdown-content :deep(pre) {
  background-color: #f4f4f4;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-content :deep(strong) {
  font-weight: bold;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(a) {
  color: #007bff;
  text-decoration: underline;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #ddd;
  margin: 16px 0;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #ddd;
  padding: 6px 8px;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: #f5f5f5;
  font-weight: bold;
}
</style> 