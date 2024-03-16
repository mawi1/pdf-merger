<script lang="ts">
  import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";

  import { State } from "../model";

  export let state: State = State.Idle;
  export let errorMessage: null | string = null;
</script>

<div
  class:hidden={state === State.Idle}
  class="bg-gray-900 bg-opacity-50 fixed w-full h-full top-0 left-0 flex items-center justify-center"
>
  <div
    class:hidden={state !== State.Done}
    class="flex flex-col items-center text-white"
  >
    <FontAwesomeIcon icon={faCheck} size="5x" />
    <span class="inline-block mt-2 text-lg">Done!</span>
  </div>

  <div
    class:hidden={state !== State.Merging}
    class="flex flex-col items-center text-white"
  >
    <div class="loader"></div>
    <span class="inline-block mt-2 text-lg">… merging</span>
  </div>

  <div class:hidden={state !== State.Error} class="w-[350px] bg-white rounded">
    <div
      class="text-white bg-red-500 rounded-t p-2 flex flex-row justify-between"
    >
      <span>ERROR</span>
      <button
        on:click={() => {
          state = State.Idle;
        }}
      >
        <FontAwesomeIcon icon={faXmark} size="xl" />
      </button>
    </div>
    <div class="p-2">
      {errorMessage}
    </div>
  </div>
</div>

<style>
  .loader {
    width: 120px;
    height: 20px;
    mask: linear-gradient(90deg, #000 70%, #0000 0) left/20% 100%;
    background: linear-gradient(#171717 0 0) left -25% top 0 /20% 100% no-repeat
      #ddd;
    animation: l7 1s infinite steps(6);
  }
  @keyframes l7 {
    100% {
      background-position: right -25% top 0;
    }
  }
</style>
