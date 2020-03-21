<script>  
    import { pages, showResults } from './store.js';  
</script>

<style>
    .area {
        height: 50vh;
        width: 100%;
        font-size: 1.4rem;
        text-align: left;
        overflow-y: scroll;
    }
    .group {
        padding: 1rem;
        margin-bottom: .8rem;
        background-color: white;
        border-radius: 3px;
    }
    .not-yet {
        font-size: 2.1rem;
        font-weight: 300;
        text-align: center;
    }
    .url {
        color: blue;
    }
</style>

{#if $pages.data}
    <div class="area">
        {#each $pages.data as page}
            <div class="group">
                <div class="url">{page.url}</div>
                <div class="title">{page.title}</div>
                <div class="children">Number of links: <b>{page.children}</b></div>
            </div>        
        {/each}
    </div>
{:else}
    <div class="area">
        <div class="not-yet">No results yet.</div>
    </div>
{/if}


