<template>
  <div class="table table-wrapper">
    <table>
      <thead>
        <tr>
          <th v-for="(header, index) in headers" :key="index">{{header}}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="index">
          <td v-for="(value, index) in row" :key="index">
            <code v-if="value.toString().startsWith('`') && value.toString().endsWith('`')">{{value.toString().substring(1, value.length - 1)}}</code>
            <em v-else-if="value.toString().startsWith('*') && value.toString().endsWith('*')">{{value.toString().substring(1, value.length - 1)}}</em>
            <strong v-else-if="value.toString().startsWith('**') && value.toString().endsWith('**')">{{value.toString().substring(2, value.length - 2)}}</strong>
            <template v-else>{{value}}</template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  computed: {
    headers() {
      return this.data[0];
    },
    rows() {
      return this.data.slice(1);
    },
  },
  props: {
    data: {
      type: Array,
      default: () => [],
    },
  },
};
</script>

<style lang="scss" scoped>
  .table.table-wrapper {
    tbody {
      tr td {
        word-wrap: normal;
        word-break: normal;
        overflow-wrap: normal;
      }
    }
  }
</style>
