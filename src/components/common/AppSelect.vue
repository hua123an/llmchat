<template>
  <el-select
    v-model="innerValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :clearable="clearable"
    :size="size"
    popper-class="wide-select-popper"
    :fit-input-width="false"
    :aria-label="ariaLabel"
    v-bind="$attrs"
  >
    <el-option
      v-for="opt in options"
      :key="String(opt.value)"
      :label="opt.label"
      :value="opt.value"
    >
      <div class="option-line" :title="opt.title || opt.label">{{ opt.label }}</div>
    </el-option>
  </el-select>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface OptionItem {
  label: string;
  value: string | number;
  title?: string;
}

const props = defineProps<{
  modelValue: string | number | undefined;
  options: OptionItem[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  clearable?: boolean;
  size?: 'small' | 'default' | 'large' | '';
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | undefined): void;
  (e: 'change', value: string | number | undefined): void;
}>();

const innerValue = computed({
  get: () => props.modelValue,
  set: (val: any) => {
    emit('update:modelValue', val as any);
    emit('change', val as any);
  }
});
</script>

<style scoped>
.option-line {
  white-space: nowrap;
  overflow: visible;
  text-overflow: unset;
}
</style>

