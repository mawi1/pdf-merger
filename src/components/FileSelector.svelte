<script lang="ts">
  export let onSelect: (files: FileList) => void;

  let isDragging = false;
  let errorMessage: string | null = null;

  function handleFiles(files: FileList) {
    let invalidFiles: string[] = [];
    for (const file of files) {
      if (file.type !== "application/pdf") {
        invalidFiles.push(file.name);
      }
    }

    if (invalidFiles.length === 0) {
      errorMessage = null;
      onSelect(files);
    } else {
      if (invalidFiles.length == 1) {
        errorMessage = `${invalidFiles[0]} is not a PDF file`;
      } else {
        errorMessage = `${invalidFiles[0]} and ${invalidFiles.length - 1} other are not a PDF files`;
      }
    }
  }

  function handleFilesSelect(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files) {
      handleFiles(files);
    }
  }

  function handleDrop(e: DragEvent) {
    isDragging = false;
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  on:drop|preventDefault={handleDrop}
  on:dragover|preventDefault
  on:dragenter|preventDefault={() => {
    isDragging = true;
  }}
  on:dragleave|preventDefault={() => {
    isDragging = false;
  }}
  class="{$$props.class} h-[150px] rounded {isDragging
    ? 'border-dashed'
    : 'border-solid'} border-2 border-neutral-400 flex flex-col justify-center items-center"
>
  <span class="inline-block mb-2">Drag & Drop your PDF files here</span>
  <label
    for="file-input"
    class="inline-block rounded p-2 border-2 border-solid hover:bg-neutral-50 border-[#1D5D9B] text-[#1D5D9B] cursor-pointer"
  >
    or Browse
  </label>
  <span
    class="mt-2 {errorMessage === null
      ? 'hidden'
      : 'inline-block'} text-[#c72900]">{errorMessage}</span
  >
  <input
    class="hidden"
    id="file-input"
    type="file"
    multiple
    accept="application/pdf"
    on:change={handleFilesSelect}
  />
</div>
