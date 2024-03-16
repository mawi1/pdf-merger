<script lang="ts">
  import type { IconDefinition } from "@fortawesome/fontawesome-common-types";
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";

  export let disabled = false;
  export let icon: IconDefinition;
</script>

<button
  class="{$$props.class} {disabled
    ? 'text-neutral-300'
    : 'hover:outline'} outline-2 rounded-full px-[4px]"
  {disabled}
  on:click><FontAwesomeIcon {icon}  /></button
>
