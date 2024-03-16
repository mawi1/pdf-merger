<script lang="ts">
  import { onMount } from "svelte";
  import { flip } from "svelte/animate";

  import { format } from "date-fns";
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import {
    faArrowDown,
    faArrowUp,
    faGripVertical,
    faTrash,
  } from "@fortawesome/free-solid-svg-icons";
  import { dndzone } from "svelte-dnd-action";

  import FileSelector from "./components/FileSelector.svelte";
  import IconButton from "./components/IconButton.svelte";
  import Overlay from "./components/Overlay.svelte";

  import MergeWorker from "./mergeWorker.ts?worker";
  import {
    AppError,
    PdfListStore,
    State,
    Status,
    toErrorMessage,
    WriteTo,
    type MergeResponse,
  } from "./model";

  const pdfList = new PdfListStore();
  let state: State = State.Idle;
  let errorMessage: null | string = null;

  const mergeWorker = new MergeWorker();

  function reportError(message: string) {
    state = State.Error;
    errorMessage = message;
  }

  async function tryCatch(p: Promise<void>) {
    try {
      await p;
    } catch (error) {
      if (error instanceof AppError) {
        reportError(error.message);
      } else {
        console.error(error);
      }
    }
  }

  onMount(() => {
    tryCatch(pdfList.init());
  });

  function fileName(): string {
    return `merged_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`;
  }

  async function handleMergeClick() {
    if ("showSaveFilePicker" in window) {
      state = State.FilePickerOpen;
      const opts = {
        types: [
          {
            description: "PDF – Portable Document Format (.pdf)",
            accept: { "application/pdf": ".pdf" as FileExtension },
          },
        ],
        suggestedName: fileName(),
      };

      try {
        const handle = await window.showSaveFilePicker(opts);
        state = State.Merging;
        mergeWorker.postMessage({
          writeTo: WriteTo.File,
          outFileHandle: handle,
          pdfList: pdfList.get(),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          state = State.Idle;
        } else {
          console.error(error);
        }
      }
    } else {
      state = State.Merging;
      mergeWorker.postMessage({
        writeTo: WriteTo.Blob,
        pdfList: pdfList.get(),
      });
    }
  }

  mergeWorker.onmessage = (e: MessageEvent<MergeResponse>) => {
    const r = e.data;

    if (r.status === Status.Error) {
      reportError(toErrorMessage(r.error));
    } else if (r.status === Status.Ok) {
      if (r.response.writeTo === WriteTo.File) {
        state = State.Done;
        console.log(e.data);

        setTimeout(() => {
          state = State.Idle;
        }, 2000);
      } else if (r.response.writeTo === WriteTo.Blob) {
        state = State.Done;
        const url = r.response.url;

        const a = document.createElement("a");
        a.href = url;
        a.download = fileName();
        a.style.display = "none";
        document.body.append(a);
        a.click();

        setTimeout(() => {
          URL.revokeObjectURL(url);
          a.remove();
        }, 30 * 1000);
        setTimeout(() => {
          state = State.Idle;
        }, 2000);
      }
    }
  };
</script>

<main class="flex justify-center text-neutral-900">
  <div class="w-[800px]">
    <FileSelector
      onSelect={(files) => tryCatch(pdfList.add(files))}
      class="my-8"
    />
    <div class="w-full">
      {#if $pdfList.length > 1}
        <div class="flex flex-row justify-end items-center mb-2">
          <span class="">Sort by</span>
          <button
            class="ml-2 rounded px-3 py-1 bg-neutral-200 hover:bg-neutral-300"
            on:click={() => pdfList.sortAZ()}>A-Z</button
          >
          <button
            class="ml-2 rounded px-3 py-1 bg-neutral-200 hover:bg-neutral-300"
            on:click={() => pdfList.sortFirstAdded()}>First Added</button
          >
        </div>
      {/if}
      <div
        use:dndzone={{
          items: $pdfList,
          flipDurationMs: 200,
          dropTargetStyle: { "border-color": "#a3a3a3" },
        }}
        on:consider={(e) => pdfList.dndConsider(e)}
        on:finalize={(e) => tryCatch(pdfList.dndFinalize(e))}
        class="border-2 border-dashed rounded border-transparent"
      >
        {#each $pdfList as pdf, index (pdf.id)}
          <div
            animate:flip={{ duration: 500 }}
            class="p-4 first:border-t border-neutral-300 border-b flex justify-between"
          >
            <div class="truncate">
              <FontAwesomeIcon icon={faGripVertical} class="mr-1" />
              <span>{pdf.name}</span>
            </div>
            <span class="whitespace-nowrap">
              <IconButton
                icon={faArrowUp}
                class="mr-2"
                on:click={() => tryCatch(pdfList.moveUp(index))}
                disabled={index === 0}
              ></IconButton>
              <IconButton
                icon={faArrowDown}
                class="mr-2"
                disabled={index === $pdfList.length - 1}
                on:click={() => tryCatch(pdfList.moveDown(index))}
              ></IconButton>
              <IconButton
                icon={faTrash}
                on:click={() => tryCatch(pdfList.delete(pdf.id))}
              ></IconButton>
            </span>
          </div>
        {/each}
      </div>
    </div>
    <div class="my-8 flex justify-center">
      {#if $pdfList.length > 1}
        <button
          type="button"
          class="rounded py-2 w-[150px] border-2 border-solid hover:bg-neutral-50 border-[#1D5D9B] text-[#1D5D9B] mr-2"
          on:click={() => tryCatch(pdfList.deleteAll())}>Delete All</button
        >
        <button
          type="button"
          class="rounded py-2 w-[150px] bg-[#1D5D9B] hover:bg-[#1a548c] text-white ml-2"
          on:click={handleMergeClick}>Merge</button
        >
      {/if}
    </div>
  </div>
</main>
<Overlay bind:state {errorMessage} />
